# Design — cache-point-before-recall

## The problem this design solves

A request that carries recall's block makes the provider rewrite the turn's prefix instead of reading it, because pi's cache point sits on the block recall appended (`M1`; `research-chidi` verdict 1). The fix is a payload edit at `before_provider_request`: two message-level cache points, placed so the request reads the prefix before the block and the next turn reaches an entry the recalling turn wrote (`M4`, `M5`, `N3`–`N8`). The dollar rule moves with it, because the figure can never show the loss by itself (`M2`, `M9`).

What the change is, and what it deliberately leaves out, is in `proposal.md`. What must be true when it lands is in `specs/tail-recall/`, `specs/context-figures/` and `specs/development-checks/`. This file settles how: where each construct lives, what its contracts are, how it fails, how it is proven, and how it ships and rolls back.

Evidence labels are as they appear in `michael-orientation.md` (M1–M9), `research-chidi.md` (Chidi #n), `research-eleanor.md`, `research-attribution-guard.md`, and Michael's probe round in `.pi/marbleization/cache-point-before-recall/michael/` (N1–N8). `owner-rulings.md` binds above all of it.

## Decisions

**D1 — One predicate decides which payloads may change.** Covered means: provider `anthropic`, api `anthropic-messages`, baseUrl on api.anthropic.com; or provider `openrouter`, api `anthropic-messages`, model id beginning `anthropic/`. The payload must also carry a `messages` array. Everything else is a no-op, including an undefined `ctx.model`, a proxy baseUrl, OpenRouter's `openai-completions` path, Bedrock and the other Anthropic-format gateways (`research-chidi` 5(b)–(c); `owner-rulings.md` Q3(a); ruling "route predicate"). `payload.model === ctx.model.id` is deliberately not required: Joel's transport sends `policy.modelId` from `normalizedAnthropicModelId`, and compaction and summary requests never reach the hook (ruling "route predicate").

**D2 — Two message-level points, inside a counted budget.** Taiknr wants a **before** point on the block just before recall's block, and a **carry** on the last block of the carrier message on a handoff request. Both are deep copies of pi's own message marker object, `ttl` included, because a bare `{type:"ephemeral"}` is a 400 under 1h retention and Joel's guard rejects a marker that is not a copy of pi's (`research-attribution-guard.md`; `N8`; Chidi "Mixing different TTLs"). The budget is 4 minus every marker on the payload except pi's last-message marker. Wanted points over budget means the payload goes out unchanged; room for one more means pi's marker stays; otherwise it is removed, and it is the only existing marker taiknr may remove apart from D3 (ruling "marker allowance"). A fifth point is a 400, not a silent drop (Chidi #2).

**D3 — One carve-out, on pi's OAuth shape.** Where system carries two marked blocks, the first block's marker goes on every request of an active session, tools stay marked, nothing else in system changes, and the byte-identical promise holds except for that marker (`N6`; Chidi #4; ruling "carve-out"). It cannot be toggle-per-request, because system and tools markers are inside pi's thread hash (Chidi #4). Joel's route marks one system block, so the carve-out never fires there (`anthropic-attribution.ts:1329-1354`; `N7`).

**D4 — Two facts, two writers, neither behind a switch.** (a) *The block this request carries*: its exact text, written by the context handler into a per-session cell and cleared at every `context_with_system`. (b) *Where the last request's carrier sat*: its payload message index plus a fingerprint of the block just before recall's block, rewritten from every payload the handler handles. The publisher's `baseline` stays the pricing home in context coordinates and the payload handler never reads it (ruling "state homes"; C1, R4). With `jeffersonInstruments` false the edit still runs.

**D5 — Identification is exact, and payload-coordinate.** The carrier is the `role:user` message whose last block is a text block equal to (a) after pi's lone-surrogate removal. pi-ai does not export `sanitizeSurrogates` from its index, so one local copy of that regex is kept; a drift in pi's rule only means no match, which is safe. A carry is placed only where the message at the recorded index ends with a block equal to the recorded fingerprint. No prefix matching and no identifier visible to the provider (ruling "state homes"; Chidi #4; `sanitize-unicode.js:21-24`). The consequence is accepted: compaction, `/tree`, `/new` and merged or shifted messages cost the carry, and never edit the wrong message.

**D6 — The handler is a function of three inputs.** The payload, cell (a) and record (b). It consumes nothing per request, so a cache-warmer replay yields the same edit twice and a retry (which reuses the payload without re-firing the hook) changes nothing. Compaction and summaries never reach the hook; classifier calls go through `modelRegistry.classify`; a payload with no pi message marker is left alone and does not touch the record (ruling "handler inputs"; Chidi #4).

**D7 — The rewrite charge is an estimate that starts where the provider now rewrites.** On a request the edit was applied to, the charged suffix is the text after the carrier's own content through the end of what the last priced request carried, with the block excluded. On every other request the rule is today's. Measuring from the response was declined: it needs a counterfactual new tail and a TTL discriminator (ruling "rewrite sizing"; ZO-3, CR-6, C7 weighed and declined).

**D8 — Recall's block has one pricing rule.** Where pi's marker stayed on the block, or no edit was made, today's rule stands. Where the handler removed pi's marker, the block is charged at input on that request, write on the next request that carries it, read after that (`N3`; ruling "block pricing"). The placement is derived from the finished payload and reaches the publisher as a deferred reading. No new Jefferson field and no publisher getter.

**D9 — The warm gate stays.** The living spec already rules that a cold request's expiry is not taiknr's to charge. Replacing `warm` with "a previous priced request exists" would charge an idle gap past the TTL (ruling "warm gate"; T18; C4 declined).

**D10 — Recall's block only.** The carry does not target fresh settlement stubs. After a recalling turn the carry sits earlier than every fresh stub, stub-only losses are unmeasured, and the class becomes a follow-up card (§9) rather than scope (ruling "settlement stubs"; M1).

## Module & File Placement

The layout follows `ARCHITECTURE.md` §1: `domain` holds pure rules, `use-cases` orchestrates and declares the ports it needs, `infra` translates the host and provider shapes, `app/extension` composes. No layer boundary moves.

| File | Layer | Change | Single responsibility |
|---|---|---|---|
| `src/infra/pi-event-handlers/before-provider-request.ts` | infra, handlers | **Create** | Register `before_provider_request` through the gate and return the edited clone or `undefined`. No rules in it. |
| `src/infra/adapters/anthropic-cache-payload.ts` | infra, adapters | **Create** | The route predicate (D1) and the edit (D2, D3, D5), plus the applied result derived from the finished clone. Owns every provider-shape fact, including the local lone-surrogate rule. |
| `src/app/extension/payload-cache-state.ts` | app, composition | **Create** | The per-session cell (a) and record (b), each with one writer, plus the applied result the publisher reads. Composed in `taiknr.ts` beside `recallCache`. |
| `src/infra/pi-event-handlers/context.ts` | infra, handlers | **Modify** | Write cell (a) after recall returns; clear it at every `context_with_system`. |
| `src/app/extension/taiknr.ts` | app, composition | **Modify** | Create the state and compose and register the new handler. |
| `src/domain/recall.ts` | domain | **Modify** | The recall block's markers, plus the exact-equality test the adapter uses on a candidate block. |
| `src/domain/savings-dollars.ts` | domain | **Modify** | The block's one pricing rule (D8), the rewrite charge's start (D7), and the placement on `PricedRequest`. Pi-free. |
| `src/use-cases/instruments-publisher.ts` | use-cases | **Modify** | Take the deferred applied reading, choose the rewrite start and the block charge, keep the `baseline` as the pricing home. |
| `src/app/extension/instruments-holder.ts` | app, composition | **Modify** | The no-op publisher gains the new method, so publishing off still costs no host read. |
| `src/infra/pi-event-handlers/instruments-response.ts` | infra, handlers | **Modify** | Include the applied reading in the deferred reading it hands the publisher at `message_end`. |
| `tests/infra/pi-event-handlers/before-provider-request.test.ts`, `tests/infra/adapters/anthropic-cache-payload.test.ts`, `tests/app/extension/payload-cache-state.test.ts`, `tests/infra/pi-event-handlers/context.test.ts`, `tests/domain/savings-dollars.test.ts`, `tests/use-cases/instruments-publisher.test.ts`, `tests/app/extension/taiknr.test.ts` | tests | **Create / Modify** | Mirrors of the layers above. `taiknr.test.ts` pins the registration list, so it changes with the new registration. |
| `test-cache-point-live.mjs` | root | **Create** | The live check of §7.2, outside lint, tsc and vitest, like the live scripts `AGENTS.md` describes. |

Two files the proposal's first draft missed are here because the change cannot land without them: `context.ts`, which writes cell (a), and `tests/app/extension/taiknr.test.ts`, which pins the registration list (ruling "documentation targets"; C9).

Documentation is not a task and does not appear in `tasks.md`: `README.md`:40 and :112 plus the under-reporting record, `docs/adr/0009`, `ARCHITECTURE.md`:46-47 and `AGENTS.md`:42's registration counts, and `.gitignore`:12 which is already in place. They are in §9 and in the docs pass (ruling "documentation targets"; C8, R12).

## Contracts and data flow

### 4.1 The handler

```text
register(pi, state)                      // through the handler gate, one event
onBeforeProviderRequest(event, ctx) -> unknown | undefined
```

`event.payload` arrives mutable from earlier handlers, so the edit works on a clone and returns it; `undefined` means no edit and leaves the payload untouched. The handler never throws: pi's runner swallows a handler's throw and the request goes out unmodified anyway, so the fail-open path is the whole safety story (Chidi #4; `michael-orientation.md` §2). The gate stays the only inertness mechanism: with `enabled` false or a rejected config, the handler is never called.

### 4.2 The state

```text
recallBlock:   string | null      // cell (a): the exact block text this request carries
carrier:       { index: number; fingerprint: string } | null   // record (b)
applied:       { carry: boolean; blockMarker: "kept" | "removed" } | null
```

One writer each: `context.ts` writes `recallBlock` and clears it at every `context_with_system`; the adapter writes `carrier` and `applied` from the payload it just handled. The publisher reads `applied` through a deferred reading, never the first two. Nothing here is persisted, so `/reload`, `/new` and a session replacement start empty and need no reconciling.

### 4.3 The edit, in order

1. If the payload is not covered (D1) or carries no messages, return `undefined`.
2. Count the markers on the payload except pi's last-message marker, to get the budget (D2).
3. If this is a handoff — `carrier` is set and the message at its index no longer ends with its fingerprint — place the carry on that message's last block, provided it still ends with its own content rather than recall's block.
4. If `recallBlock` is set, find the carrier message by exact equality after pi's surrogate rule. With fewer than two blocks or no match, skip. Otherwise place the before point on the block before recall's block; where that message's content is a string, skip rather than convert it.
5. If the wanted points exceed the budget, return `undefined` and write no record.
6. Remove pi's last-message marker only if the budget had room for no more point; apply D3's carve-out on a two-system-marker payload.
7. Rewrite `carrier` and `applied` from the finished clone, and return it.

Every step is idempotent on the same input, which is what makes a warm replay harmless (D6).

### 4.4 What reaches the figures

`applied` travels as part of the deferred reading the `message_end` registrar already hands the publisher, so a fault in it lands in that registrar and not in the payload handler. The publisher turns it into two facts for `netDollars`: where the rewrite charge starts (D7) and how the block is charged (D8). `PricedRequest` gains one placement field; nothing else in the domain changes shape, and no Jefferson field is added (`AGENTS.md` Conventions; ADR 0008).

## Boundaries, failure modes, observability

### 5.1 Boundary cases

| Case | Behaviour |
|---|---|
| No block on this message's predecessor | No before point; the request goes out with the carry alone if one applies |
| Recall's block is the first block of its message | No before point |
| Message content is a string where a point would go | Skip the point; never convert content |
| A user pasted `<recalled_context` | No exact match, so no point and no record written |
| A lone surrogate inside the block | The comparison is done after pi's rule, so it matches; a drift in pi's rule means no match and no edit |
| `cacheRetention` none, so pi marked nothing | Nothing to copy, so `undefined` |
| Four points already present | The budget decides: pi's last-message marker yields, or nothing moves |
| Another extension's marker present | Subtracted from the budget and sent byte-identical |
| Empty or system-role messages in the payload | Ignored: the carrier is a `role:user` message with at least two blocks |
| `ctx.model` undefined, or a route outside D1 | `undefined` |
| Payload not an object, or `messages` not an array | `undefined` |
| The same payload twice (warm replay) | The same edit twice, no second carry |

### 5.2 Failure behaviour

Every failure is a silent no-op and nothing throws (D6). The request goes out as it arrived, which is today's payload and today's loss. This is deliberate: a handler's throw reaches pi's error channel with an unedited request anyway, and taiknr has no logging channel of its own (`michael-orientation.md` §2; C10).

### 5.3 How a maintainer triages it

No new log line, notice or instrument field: Joel's field table stays total and finite, and the once-per-session recall notice is recall's own (ruling "how scenarios are proven"; C10). Triage is:

- the per-request `cacheRead` and `cacheWrite` in the session JSONL, read request by request;
- re-running `probe2.ts` from `.pi/marbleization/cache-point-before-recall/michael/`, which appends a block the way the adapter does and edits markers the way the handler does;
- one known blind spot, recorded rather than fixed: an extension running after taiknr can add a fifth point, and taiknr cannot prevent it, because pi dispatches a boundary's handlers in load order and each sees the previous one's payload.

## The figures

### 6.1 The rewrite charge

Today's rule prices a suffix from the changed message to the end of what the last priced request carried, and charges `suffixEstimate × max(0, write − read)` when the request is warm (`savings-dollars.ts:59`; `instruments-publisher.ts:184-203`). The change keeps that rule for every request the edit did not reach, and for a request it did reach starts the suffix after the carrier's own content, excluding the block (D7).

Measured on N3's handoff request: write 1,236 tokens against the block's 2,597 input — the write is turn 1's twelve tool exchanges plus the new prompt, and the block is billed as input, outside the charge. The same split appears on N5 (1,022 / 2,597), N7 (916 / 2,597) and N8 (1,244).

### 6.2 The block's charge

| Placement | Request | Charge |
|---|---|---|
| pi's marker kept, or no edit | inside what the last priced request carried, warm | read rate |
| pi's marker kept, or no edit | cold | write rate |
| pi's marker removed | the request that carries it first | input rate (2,597 on N3) |
| pi's marker removed | the next request that carries it | write rate (2,682 on N3) |
| pi's marker removed | later requests in the turn | read rate (91 written per step) |

`applied` is what selects the row, and it is derived from the finished payload, so a fail-open handler prices the kept-marker rows rather than claiming a move it did not make (D8).

### 6.3 What still under-reports

Recorded in the README, not corrected here: the routes outside D1, fail-open requests, requests taiknr itself makes read zero (a pre-block prefix below the model's minimum, for example Haiku 4.5's 4,096 against pi's 2,020-token system and tools over an API key), and partial-prefix reads (ruling "under-reporting home"; Chidi #2; `michael-orientation.md` §3 trap 9).

## How it is proven

### 7.1 Automated, at the handler and the adapter

Payload shape is testable with no network and no model call, and these are the tests: the route table with one row per provider the spec names (D1); marker positions and count ≤ 4; the `ttl` copy; no fit, so unchanged; a string-content message; a pasted `<recalled_context`; a surrogate inside the block; a block that is first in its message; a stale carrier; replay idempotence; inertness with `enabled` false and with a rejected config; publishing off and the edit still applied.

The figures are driven at the handler with scripted `usage` and `cost`, because the session harness rewrites every response's usage to characters ÷ 4 at zero cost (`AGENTS.md` Traps). The composition test gains the new registration.

### 7.2 Live, at Validate, with an owner per route

The billing scenarios are inequalities, not recorded numbers: the next turn's first request reads at least the prefix through the carrier's own content, and its write is no more than the previous turn's content plus the new prompt and tail plus a margin. Each run checks the cache-minimum precondition first, so a short prefix cannot produce a false zero (ruling "read guarantees"; R6).

| Route | Run by | Where the key comes from |
|---|---|---|
| Anthropic direct, API key | Derek | `CLAUDE_API_KEY` from `.envrc` |
| OpenRouter, `anthropic/claude-haiku-4.5` | Derek | the environment |
| Anthropic direct, OAuth | Joel | his subscription, his session |
| Joel's attribution route | Joel | his subscription, his session |

Joel's two runs are his to observe and are never ticked by the implementer (`owner-rulings.md` Q1(a); ruling "how scenarios are proven").

### 7.3 The live script

`test-cache-point-live.mjs` follows the pattern `AGENTS.md` gives for live scripts: it sits at the root, outside `biome.json`'s allowlist, `tsconfig.json`'s program and vitest's include, takes its key from the environment, and exits non-zero when the key is absent. It is committed because Derek's two routes need it twice and a maintainer re-runs it for triage (§5.3). `AGENTS.md`'s trap naming `jev-context-poc.ts`, `test-jev-poc.mjs` and `test-recall-live.mjs` describes files that are not in the tree; the docs pass corrects it (ruling "how scenarios are proven").

## Alternatives weighed

- **Measure the rewrite from the response's cache split.** It would price the real rewrite on every route and needs no state from the handler (CR-6, C7, ZO-3, and Michael's own earlier lean). Declined: it needs a counterfactual new tail and a TTL discriminator, and a retried or replayed request makes it noisier (ruling "rewrite sizing").
- **Gate the rewrite on "a previous priced request exists" instead of warm.** Simpler, and it charges the zero-read case. Declined: it charges an idle gap past the TTL, which the living spec already refuses (C4, CAT-3, CC-4; ruling "warm gate").
- **Share the publisher's `baseline`.** No new state. Declined: it is a no-op behind the instruments switch, and its index is in context coordinates while pi reshapes the message array (`instruments-holder.ts:7-17`; `instruments-session-start.ts:20`; CR-4, R4).
- **Copy pi's marker and nothing else, leaving pi's last-message point on the block** — the measured "add" strategy. Declined: over an API key, two recalling turns in a row need five points, which is a 400 (Chidi #2; CR-1).
- **Toggle the tools marker on the handoff request**, as M5 measured. Declined: tools markers are inside pi's thread hash, the spec forbids a per-request toggle, and Joel's guard throws on it (Chidi #4; `research-attribution-guard.md`; C3, R2).
- **Extend the carry to fresh settlement stubs.** Same class of change, so it looks free. Declined and deferred, because the frequency is unmeasured (CAT-2; ruling "settlement stubs").
- **Add a log line, a notice or an instrument field so the edit is visible.** Declined: no new surface, and the field table stays total (C10, CR-12; ruling "how scenarios are proven").
- **A second handler on `context` for the figures, or a cache manager of taiknr's own.** Declined: `context` rebuilds the head (ADR 0007), and a manager would duplicate what the publisher already owns (ZO-5).

## Migration Plan

**Joel's guard is already relaxed.** `research-attribution-guard.md` records it: his extension has `assertMessageCacheControlsCopied` (`:1040-1052`), its protected topology hash excludes message paths (`:1020-1027`), and the 4-point limit is enforced. The change therefore ships nothing for his route and waits for nothing.

**Order.**

1. **Joel's guard edit: landed.** Against unchanged taiknr it is a no-op, because taiknr edits no payload today.
2. **taiknr merges.** From then on, every covered route carries the edit; his route is covered because his guard already permits message points.
3. **Joel's acceptance session** on his attribution route, and his OAuth session: his to run, his to report (§7.2).

**Rollback, in reverse:** revert taiknr first, keep his guard. His relaxed guard on an unchanged taiknr is a no-op, so that order never leaves a session failing. The opposite order — reverting his guard while taiknr stays installed — would reject every recalling request on his route, because his guard's assertion runs after the `onPayload` chain, outside taiknr's try/catch (R1; `anthropic-attribution.ts:3218-3233`).

**No migration state.** Nothing is persisted, no session entry type is added, no config field is added, and no host file is written, so a rollback leaves no residue to reconcile (ADR 0004; ADR 0008).

**Merge-time facts.** `.envrc` is `.gitignore`:12, committed in `1b773fe`; the entry stays as it is. ADRs 0001–0008 exist, so the new record is `docs/adr/0009`, and ADR 0007's body is not touched (`AGENTS.md` Conventions; ruling "documentation targets").

**After the merge, in the docs pass:** `README.md`:40 and :112 plus the under-reporting record in its instruments section; `docs/adr/0009`; `ARCHITECTURE.md`:46-47 and `AGENTS.md`:42's registration counts (thirteen over nine events becomes fourteen over ten); and `AGENTS.md`'s stale live-script trap (§7.3). Documents never block a feature (Joel, standing).

**Follow-up, not this card:** a card for stub-only lookback losses, which the payload guard does not cover (D10). Its frequency is unmeasured; before recall merged, stub-only losses ran 2k–18k (M1).

## Risks and residuals

- **A later extension can push a request to five points.** Concrete case: an extension registered after taiknr adds a point to a request taiknr filled to four, and Anthropic returns 400. taiknr cannot see or prevent it, because handlers run in load order over each other's payloads. Recorded, not fixed (§5.3).
- **A moved carrier means the carry is lost.** Concrete case: a `/tree` jump or a compaction renumbers the message array, the fingerprint no longer matches, and that turn's first request rewrites the block-free prefix — today's behaviour, not worse.
- **A prefix below the model's minimum reads zero.** Concrete case: Haiku 4.5 over an API key with pi's 2,020-token system and tools; the edit is right and the provider caches nothing. It is under-reporting in the figure, and it is in the README (Chidi #2).
- **A TTL expiry that coincides with taiknr's change is under-charged.** Concrete case: an entry expires during an idle gap and the next request is cold, so the warm gate charges nothing, which is the living spec's own rule (D9).
- **Joel's route before his guard landed would have failed.** Concrete case: a recalling request rejected with "protected cache-control topology changed" and no tokens spent. His edit is in place, and the rollback order protects it (§9).
- **The estimate still understates on uncovered routes.** Concrete case: a Bedrock session rewriting 139,169 tokens after a recalling turn, charged only its suffix. Recorded per Joel's Q3(a) (ruling "rewrite sizing").
- **pi's marking could drift.** Concrete case: a pi release marks a different block. The adapter then finds no exact match, places nothing, and `applied` is false, so the figures price the kept-marker rows — today's behaviour with today's numbers.
- **One cell of the probe round is missing.** pi's own OAuth with a 36-block recalling turn under this exact strategy was not run; `N7` covers the same endpoint and auth, lookback is a backend property, and the carry sits at distance 0 (ruling "probe round").

## Questions this design leaves open

- None about behaviour. The one open item is administrative: whether `test-cache-point-live.mjs` stays in the repository after Validate or is deleted once Derek's two runs are recorded. This design commits it, because §5.3's triage needs it.
