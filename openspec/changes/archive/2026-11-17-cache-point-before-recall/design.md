# Design — cache-point-before-recall

## 1 The problem this design solves

A request that carries recall's block makes the provider rewrite the turn's prefix instead of reading it, because pi's cache point sits on the block recall appended (`M1`; `research-chidi` verdict 1). The fix is a payload edit at `before_provider_request`: two message-level cache points, placed so the request reads the prefix before the block and the next turn reaches an entry the recalling turn wrote (`M4`, `M5`, `N3`–`N8`). The dollar rule moves with it, because the figure can never show the loss by itself (`M2`, `M9`).

What the change is, and what it deliberately leaves out, is in `proposal.md`. What must be true when it lands is in `specs/tail-recall/`, `specs/context-figures/` and `specs/development-checks/`. This file settles how: where each construct lives, what its contracts are, how it fails, how it is proven, and how it ships and rolls back.

Evidence labels are as they appear in `michael-orientation.md` (M1–M9), `research-chidi.md` (Chidi #n), `research-eleanor.md`, `research-attribution-guard.md`, and Michael's probe round in `.pi/marbleization/cache-point-before-recall/michael/` (N1–N11). `owner-rulings.md` binds above all of it.

## 2 Terms

Three terms decide scope and acceptance, and each is defined once here so the rest of this file can use it.

- **Settlement stub:** the one-line stub that replaces a large tool output, committed when the run that produced it settles (`agent_before_settle`), so the next turn's request carries the stub where the raw output was (`README.md` §Stubbing).
- **Joel's attribution route:** Joel's own `~/.pi/agent/extensions/anthropic-attribution.ts`, which re-registers provider `anthropic` with its own transport for his OAuth subscription. It places one system marker, one tools marker and one message marker, and rejects payload middleware that changes system, tools or top-level markers, or that invents a message marker (`research-attribution-guard.md`). It reports the same provider, api and baseUrl as pi's own route (measured: `ctx.model` with and without his extension loaded reads the same provider, api and `https://api.anthropic.com`, `dr-s3-peek.log`), so D1 covers both without telling them apart, and rules 1–3 of §5.3 are what keep his guard satisfied.
- **Jefferson and the instruments:** pi-jefferson renders taiknr's four `taiknr.*` instruments. `jeffersonInstruments` switches publishing only. The payload edit is gated only by `enabled`, through the handler gate, so it runs with publishing off, and then `applied` is written and nothing reads it.

## 3 Decisions

**D1 — One predicate decides which payloads may change.** Covered means: provider `anthropic`, api `anthropic-messages`, and a baseUrl whose `new URL(baseUrl).hostname` is exactly `api.anthropic.com`; or provider `openrouter`, api `anthropic-messages`, and a model id beginning `anthropic/`. A missing baseUrl, or one `new URL` cannot parse, is uncovered, and so is a host that merely starts with or contains `api.anthropic.com`, because host equality is exact and that host is a proxy. The payload must also carry a `messages` array. Everything else is a no-op, including an undefined `ctx.model`, a proxy baseUrl, OpenRouter's `openai-completions` path, Bedrock and the other Anthropic-format gateways (`research-chidi` 5(b)–(c); `owner-rulings.md` Q3(a); ruling "route predicate"). `payload.model === ctx.model.id` is deliberately not required: Joel's transport sends `policy.modelId` from `normalizedAnthropicModelId`, and compaction and summary requests never reach the hook (ruling "route predicate").

**D2 — Two message-level points, inside a counted budget.** Taiknr wants a **before** point on the block just before recall's block, and a **carry** on the last block of the carrier message on a handoff request. Both are deep copies of pi's own message marker object, `ttl` included, because a bare `{type:"ephemeral"}` is a 400 under 1h retention and Joel's guard rejects a marker that is not a copy of pi's (`research-attribution-guard.md`; `N8`; Chidi "Mixing different TTLs"). The marker taiknr copies is pi's alone, and it is recognised by count. The budget is counted on the normalized clone, so D3's system marker never spends it and a handoff that also recalls keeps its two points where a budget counted on the payload as it arrived would have refused them. A fifth point is a 400, not a silent drop (Chidi #2). The marker walk, the budget formula and recognition are §5.3 (4); the no-fit outcome is the spec's "The budget decides, and pi's marker yields" and "The budget is spent, so nothing moves" scenarios. The order these rules run in is §5.3.

**D3 — One carve-out, on pi's OAuth shape.** Where system carries two marked blocks, the first block's marker goes on every request of an active session, tools stay marked, nothing else in system changes, and the byte-identical promise holds except for that marker (`N6`; Chidi #4; ruling "carve-out"). It cannot be toggle-per-request, because system and tools markers are inside pi's thread hash (Chidi #4). It is the adapter's first act on a covered payload and applies whether or not a point is wanted, so the budget is counted on the normalized payload (§5.3). Joel's route marks one system block, so the carve-out never fires there (`anthropic-attribution.ts:1329-1354`; `N7`). `/model` changes `ctx.model` within a session, so D1 is evaluated per request from `ctx.model`: record (b) carries across and is checked against its fingerprint, a carry on a request with no matching entry adds no cost, and the first request on a newly selected model is cold, so no rewrite is charged (`runner.js:650`; prompt-caching docs: "Adding more `cache_control` breakpoints doesn't increase your costs", `pc.md:607`).

**D4 — Two facts, two writers, neither behind a switch.** (a) *The block this request carries*: its exact text, written by the context handler into a per-session cell and cleared at every `context_with_system`. (b) *Where the last request's carrier sat*: its payload message index, a fingerprint of the block just before recall's block, and recall's block text as it stood then. Its next value follows §5.3 (5), and it is committed only at a valid assistant `message_end` (§5.1, §5.3 (6)). The publisher's `baseline` stays the pricing home in context coordinates and the payload handler never reads it (ruling "state homes"; C1, R4). With `jeffersonInstruments` false the edit still runs.

**D5 — Identification is exact, and payload-coordinate.** The adapter owns the whole comparison: pi's lone-surrogate rule applied to both cell (a) and the candidate payload block, then exact equality. The carrier, the handoff test and the fingerprint are found as §5.3 (4) states. pi-ai does not export `sanitizeSurrogates` from its index, so one local copy of that regex is kept; a drift in pi's rule only means no match, which is safe, and on Joel's route a lone surrogate fails the match the same way (§6.1). D7's `carrierRead` against `carried.text` compares context-side text on both sides and applies no rule. No prefix matching and no identifier visible to the provider (ruling "state homes"; Chidi #4; `sanitize-unicode.js:21-24`). The consequence is accepted: compaction, `/tree`, `/new` and merged or shifted messages cost the carry, and a mismatch never edits a message. A rare coincidental match after a compaction or a `/tree` jump places an extra point. On a handoff that also recalls, that point displaces pi's marker, so that request bills the block as input and is priced so from `applied.block`. Its rewrite start is today's, because both events reset the publisher's baseline.

**D6 — The handler is a function of its inputs.** The payload, cell (a) and record (b) are the whole state it reads, and it consumes nothing per request. A replay is derived from its payload and the record the previous request left, so record (b) is idempotent under replay while the edit may differ from the original's (§5.3). Compaction and summaries never reach the hook; classifier calls go through `modelRegistry.classify`; a payload whose message markers do not number exactly one leaves record (b) as it is (§5.3 (5); ruling "handler inputs"; Chidi #4). The hook fires again for one logical request — pi's auto-retry, the strict-tools fallback and a warm replay — and pi's docs sentence "retries reuse the same headers rather than re-firing the hook" sits under `before_provider_headers` (`docs/extensions.md:862`), not this hook. §5.3 (6) states why every re-fire computes the same edit.

**D7 — The rewrite charge is an estimate that starts where the provider now rewrites.** On a request the edit was applied to, the charged suffix is the text after the carrier's own content through the end of what the last priced request carried, with the block excluded. On every other request the rule is today's. The publisher never receives a payload index: it already names the previous carrier in context coordinates, as `baseline.block`, and the adapter tells it only whether this request reads through that carrier's own content. So in `rewriteOf`, when `blockChanged` holds and `applied?.carrierRead` equals `carried.text`, the start is `carried.index + 1`; otherwise it is `carried.index`, today's rule. Both strings are the block text as recall built it, on the context side, so the comparison is exact. When the boundary cannot be determined — no baseline block, no carry or before point on the carrier, an unpriced request in between, which makes the texts differ — today's start applies, and the cost is overcharging the carrier's own content, which is today's behaviour. Measuring from the response was declined: it needs a counterfactual new tail and a TTL discriminator (ruling "rewrite sizing"; ZO-3, CR-6, C7 weighed and declined).

**D8 — Recall's block has one pricing rule.** The rule is a two-state transition carried in the publisher's existing baseline, with block identity taken from the existing change test. `applied.block` is derived from the finished clone on every covered payload carrying exactly one message-level marker (§5.3 (4)), including one where nothing was placed or the wanted points did not fit: `"uncached"` when no marker sits on recall's block or on any block after it in payload order and the finished clone carries no top-level `cache_control`; a top-level marker is automatic caching, whose breakpoint lands on the last eligible block, so it is at or after recall's block (`pc.md`:48, :509, :538; N10); `"cached"` otherwise; null when no carrier is found, which includes a request carrying no block. `responseReceived` takes `readings.applied` from the `message_end` reading and sets `PricedRequest.blockUncached` and the stored baseline's `blockUncached` from the same value (§5.4), so the baseline remembers it, and `PricedRequest` gains `blockUncached: boolean`. `netDollars` becomes `blockRate = blockUncached ? inputRate : (warm && !blockInNewTail ? readRate : writeRate)`, and the publisher computes `blockInNewTail = block !== undefined && (carried === undefined || blockChanged || block.index >= previousLength || baseline.blockUncached)`. A block is the same block exactly when the existing `blockChanged` test — timestamp plus tail text — says unchanged. An unpriced request does not move the baseline, so the next priced request inherits the transition, which is correct because an unbilled request cached nothing. An unedited request (`applied` null) counts as cached. The rows are the spec's "The block's charge, by placement and request", which §7.2 points to, and the rule also fixes a latent defect: a block that changes on a message the last request carried has `index < previousLength`, so today it is priced at the read rate although no request ever cached it (132 of 132 measured requests match; ruling "block pricing"). The placement reaches the publisher as a deferred reading, and there is no new Jefferson field and no publisher getter.

**D9 — The warm gate stays.** The living spec already rules that a cold request's expiry is not taiknr's to charge. Replacing `warm` with "a previous priced request exists" would charge an idle gap past the TTL (ruling "warm gate"; T18; C4 declined).

**D10 — Recall's block only.** The carry does not target fresh settlement stubs. After a recalling turn the carry sits earlier than every fresh stub, stub-only losses are unmeasured, and the class becomes a follow-up card (§9) rather than scope (ruling "settlement stubs"; M1).

## 4 Module & File Placement

The layout follows `ARCHITECTURE.md` §1: `domain` holds pure rules, `use-cases` orchestrates and declares the ports it needs, `infra` translates the host and provider shapes, `app/extension` composes. No layer boundary moves.

| File | Layer | Change | Single responsibility |
|---|---|---|---|
| `src/infra/pi-event-handlers/before-provider-request.ts` | infra, handlers | **Create** | Register `before_provider_request` through the gate and return the edited clone or `undefined`. No rules in it. |
| `src/infra/pi-event-handlers/payload-cache-commit.ts` | infra, handlers | **Create** | Register `message_end` through the gate; for an assistant message whose usage is valid, commit `state.carrier = state.nextCarrier`. No rules in it. |
| `src/infra/adapters/anthropic-cache-payload.ts` | infra, adapters | **Create** | The route predicate (D1) and the whole edit (§5.3), plus the applied result and the next record derived from the finished clone. Owns every provider-shape fact, including the local lone-surrogate rule and the whole comparison of D5. |
| `src/use-cases/payload-cache.ts` | use-cases | **Create** | The pi-free types `CarrierRecord`, `AppliedPlacement` and `PayloadCacheState`. No instance and no logic. |
| `src/infra/pi-event-handlers/context.ts` | infra, handlers | **Modify** | Write cell (a) after recall returns; clear it at every `context_with_system`. It takes the state as a `payloadCache: PayloadCacheState` field of its existing deps object, as the instruments card added `holder` there (402bc0c). Its `(pi, deps)` signature does not change, so `AGENTS.md`:23 needs no exception for it. |
| `src/app/extension/taiknr.ts` | app, composition | **Modify** | Create the state as an inline literal beside `recallCache`, and compose and register the two new handlers. |
| `src/domain/savings-dollars.ts` | domain | **Modify** | The block's one pricing rule (D8): `PricedRequest` gains `blockUncached: boolean`, which selects the input rate over read or write. The rewrite term and its inputs are unchanged. Pi-free. |
| `src/use-cases/instruments-publisher.ts` | use-cases | **Modify** | `ResponseReadings` gains `applied`, imported as the plain pi-free `AppliedPlacement` type from `payload-cache.ts`; fold it in at `responseReceived` as §5.4 says; `rewriteOf` is the home of D7's start; keep the `baseline` as the pricing home. No publisher method is added. |
| `src/infra/pi-event-handlers/instruments-response.ts` | infra, handlers | **Modify** | `registerInstrumentsResponseHandler(pi, holder, state)` takes the payload state as a third parameter, passed from `taiknr.ts`. This is a second enumerated exception to `AGENTS.md`:23's fixed signatures, beside `session_start`'s. The registrar has no deps object to widen, and the holder is not widened to carry the state (rulings "state homes", "no publisher getter"). It also adds `applied` to the read closure it hands the publisher at `message_end`. |
| `src/infra/adapters/pi-instrument-readings.ts` | infra, adapters | **Modify** | `readResponse` returns `CompactedReadings`; the `message_end` registrar adds `applied` from the state to form `ResponseReadings`. |
| `tests/infra/pi-event-handlers/before-provider-request.test.ts`, `tests/infra/pi-event-handlers/payload-cache-commit.test.ts`, `tests/infra/adapters/anthropic-cache-payload.test.ts`, `tests/infra/pi-event-handlers/context.test.ts`, `tests/infra/pi-event-handlers/instruments-response.test.ts`, `tests/infra/pi-event-handlers/session-start.test.ts`, `tests/support/fake-pi.ts`, `tests/domain/savings-dollars.test.ts`, `tests/use-cases/instruments-publisher.test.ts`, `tests/infra/pi-event-handlers/instruments-compact.test.ts`, `tests/infra/pi-event-handlers/instruments-tree.test.ts`, `tests/infra/pi-event-handlers/instruments-request.test.ts`, `tests/app/extension/taiknr.test.ts` | tests | **Create / Modify** | Mirrors of the layers above. `taiknr.test.ts` pins the registration list, so it changes with the new registrations; `instruments-response.test.ts` is the registrar's, and it gains the `applied` reading; `payload-cache-commit.test.ts` is the commit handler's; `instruments-compact.test.ts` and `instruments-tree.test.ts` hand readings to `responseReceived`, which now carry `applied`; and `instruments-request.test.ts` does the same, plus it builds the context handler's deps, which now carry the payload state. `fake-pi.ts` is the harness: `createContextStub`'s `model` option gains `baseUrl?: string` (§8.1), so a covered `ctx.model` can be built at all. `session-start.test.ts` gains one pin, that the session's config is read at session start only: a file edited afterwards changes nothing until the next start. |
| `test-cache-point-live.mjs` | root | **Create** | The live check of §8.2, outside lint, tsc and vitest, like the live scripts `AGENTS.md` describes. |

The adapter, both handlers and the instruments registrar import their types from `src/use-cases/payload-cache.ts`, so no layer imports `app/extension` and the state's one declaration serves all of them.

Three files the proposal's first draft missed are here because the change cannot land without them: `context.ts`, which writes cell (a); `tests/app/extension/taiknr.test.ts`, which pins the registration list; and `pi-instrument-readings.ts`, whose `readResponse` stops returning `ResponseReadings` once `applied` is the registrar's to add (ruling "documentation targets"; C9).

Documentation is not a task and does not appear in `tasks.md`: `README.md`:40 and :112 plus the under-reporting record, `docs/adr/0009`, `ARCHITECTURE.md`:46-47 and `AGENTS.md`:42's registration counts, and `.gitignore`:12 which is already in place. They are in §10 and in the docs pass (ruling "documentation targets"; C8, R12).

## 5 Contracts and data flow

### 5.1 The handler

```text
// before-provider-request.ts
registerBeforeProviderRequestHandler(pi, state)   // through the gate, before_provider_request only
onBeforeProviderRequest(event, ctx) -> unknown | undefined

// payload-cache-commit.ts
registerPayloadCacheCommitHandler(pi, state)      // through the gate, message_end only
onMessageEnd(event, ctx) -> void
```

`event.payload` arrives mutable from earlier handlers, so the edit works on a clone and returns it; `undefined` means no edit and leaves the payload untouched. A payload can hold any value, and a function or a symbol makes `structuredClone` throw (measured in Node 26: `structuredClone({ messages: [], leftover: () => 1 })` throws `DOMException … could not be cloned`). So the handler computes everything first and commits after, which is the `AGENTS.md` convention:

1. Call `edit` (§5.3 (5)) inside `try`.
2. Only after it returns, write `state.nextCarrier` and `state.applied` from its result. For the untouched payloads of §5.3 (3) and the zero-or-two-or-more case of §5.3 (4), `edit` returns the committed carrier unchanged as the next value, so a later commit is idempotent.
3. In `catch`, set `state.applied = null` and `state.nextCarrier = state.carrier` — the fingerprint check guards the carry — and return `undefined`.

That order is what keeps a failed call from leaving the previous request's placement behind to price an unedited request. The handler never throws out: pi's runner catches a handler's throw and keeps the previous payload, and the request goes out unmodified anyway, so the fail-open path is the whole safety story (Chidi #4; `runner.js:1074-1100`; `michael-orientation.md` §2). The gate stays the only inertness mechanism: with `enabled` false or a rejected config, the handler is never called.

The commit handler is the other half. It registers `message_end` through the same gate and returns nothing. When the message is an assistant message and `validUsage(message.stopReason, usage)` holds, it sets `state.carrier = state.nextCarrier`; `src/domain/calibration.ts:50` is the one home of "a valid response". It reads nothing the instruments registrar writes, and the registrar reads only `applied`, so the two `message_end` handlers are order-independent.

### 5.2 The state

```text
recallBlock:   string | null                       // cell (a): the exact block text this request carries
carrier:       CarrierRecord | null                // record (b), the committed one
nextCarrier:   CarrierRecord | null                // the next record the last payload call computed
applied:       AppliedPlacement | null

CarrierRecord    = { index: number; fingerprint: string; block: string }
AppliedPlacement = { carrierRead: string | null; block: "cached" | "uncached" | null }
```

Four fields and three writers, each field with exactly one: `context.ts` writes `recallBlock`, cleared at every `context_with_system`; the payload handler writes `nextCarrier` and `applied` on every call; the commit handler writes `carrier`. `applied.carrierRead` is record (b)'s `block` — the record as it stood before this call computes the next one — when the finished clone carries a marker on the block at the recorded index that equals the recorded fingerprint, which covers the carry and a before point on the same message; otherwise it is null. `applied.block` and record (b)'s `block` are derived as D8 and §5.3 (5) say. `CarrierRecord`, `AppliedPlacement` and `PayloadCacheState` are declared in the new pi-free `src/use-cases/payload-cache.ts`, and `instruments-publisher.ts` imports `AppliedPlacement` from it for `ResponseReadings`. The publisher reads `applied` through the deferred reading the `message_end` registrar already passes, never `recallBlock`, `carrier` or `nextCarrier`, and no publisher method is added.

The state is created in `taiknr.ts`'s factory as an inline literal beside `recallCache`, typed `PayloadCacheState`, and pi re-runs the factory for every session it starts, reloads, switches to or forks (pi `docs/extensions.md`:512, :529, :1520-1530). That is the boundary that gives the instruments holder its one cell per session. Within a session nothing is reset. Cell (a) is cleared at every `context_with_system`, `applied` and `nextCarrier` are rewritten on every payload call, record (b) is committed only at a valid assistant `message_end`, and it is checked against the recorded fingerprint before it is used.

### 5.3 The adapter contract

The route predicate plus the edit, in `anthropic-cache-payload.ts`, is specified once, here. D2, D3, D5 and D6 keep the decision and its reason and point here for the mechanics.

**1. Inputs.** The payload, `ctx.model`, cell (a) and record (b).

**2. Output.** Either `undefined`, meaning no change, or an edited deep clone. The input is never mutated, so every marker another extension placed survives in the clone.

**3. Untouched payloads.** These return `undefined` and leave record (b) as it is, and they are the only three cases: a payload D1 does not cover; a payload that is not an object; a payload carrying no `messages` array. Every other covered payload is normalized and then edited as below, whatever its message markers.

**4. Covered payloads.**

- **Normalization first.** Where system carries two marked blocks, the first system block's marker is removed. That is D3's carve-out, and it runs on every covered payload whose system carries two marked blocks, whatever that payload's message markers. It runs whether or not a point is wanted, and every count below reads the normalized clone.
- **A marker, and pi's message marker.** A marker is a `cache_control` key whose value is an object with `type` `"ephemeral"`, found by a recursive walk that does not descend into a tool definition's `input_schema` or a `tool_use` block's `input`, which are data and not markable positions (prompt-caching docs, "What can be cached"; `ephemeral` is the only cache type). A marker nested in a `tool_result`'s content is still found. Message-level markers are those found anywhere under `messages`, nested content included, and the budget counts every marker on the normalized clone by the same walk. pi's message marker is recognised only when the normalized clone carries exactly one message-level `cache_control`, wherever it sits. pi and Joel's transport each place exactly one (`anthropic-messages.js:1408-1432`; `anthropic-attribution.ts:1619-1629`), and it measured clean on 152 requests over 5 routes, every one with exactly one. Position is deliberately not checked, because pi appends empty `role:system` effort messages after the marked message (`:1439-1448`). A lone message-level marker placed by another extension on a payload pi marked nowhere is indistinguishable from pi's and is treated as pi's: copied, and on a spent budget removed (§11).
- **Zero, or two or more, message markers.** Provenance cannot be established, so taiknr places, moves and removes no message-level marker. The output is the normalized clone, or `undefined` when normalization changed nothing; `applied` is null, and record (b)'s next value is the committed record unchanged (§5.3 (5)).
- **The wanted points.** The before point, on the block just before recall's block, found by exact equality with cell (a) after pi's lone-surrogate rule; and the carry, by the handoff rule below. The **carrier** is the highest-index `role:user` message whose last block is a text block equal to cell (a) after that rule, because recall appends only to the newest user message, so an earlier exact copy is never chosen. Fewer than two blocks, no match, or a string-content message skips the before point rather than converting the content.
- **A target that already carries pi's recognised marker** is already in place: nothing is placed on it, it is not counted among the wanted points, and pi's marker stays. Only the carry target can be in this state, when the carrier is the last message and lost its block in place. A target carrying any other marker never arises, because a second message-level marker stops every message-level edit above.
- **The budget** is four minus every marker on the normalized clone except pi's last-message marker. Wanted points over budget place no message-level point at all and leave pi's marker where it was; what goes out is the spec's "The budget decides, and pi's marker yields" and "The budget is spent, so nothing moves" scenarios, and the carve-out still applies.
- **Nothing wanted.** Where no point is wanted at all, the output is the normalized clone when normalization changed something and `undefined` when it changed nothing.
- **pi's last marker** stays where pi put it when the wanted points plus one fit the budget, and is otherwise removed. Apart from the carve-out it is the only marker taiknr removes.

**When a handoff occurs.** Record (b) is set, and the payload message at the recorded index:

- is a `role:user` message with array content;
- ends with a block equal to the recorded fingerprint, which is the block that sat just before recall's block. The fingerprint, and every comparison against it, ignore `cache_control` at every depth: a text block is compared by its text, any other block by its canonical JSON with `cache_control` removed.

**The carry** is then a deep copy of pi's message marker, `ttl` included, placed on that last block.

**When no carry is placed.** Anything else at the index edits no message: an index out of range, a message that is not `role:user`, string content, recall's block still last, or any other last block.

**5. Commit.** The adapter is one pure function, `edit(payload, model, recallBlock, carrier) → { output, nextCarrier, applied }`, that mutates nothing it was given. `applied` is derived from the finished clone for every covered payload carrying exactly one message-level marker (§5.3 (4)), including one where nothing was placed or the wanted points did not fit. It is null only for the untouched payloads of (3), for zero-or-two-or-more message markers, and after a throw. Its derivation: `carrierRead` is as §5.2 says; `block` is as D8 says, null when no carrier is found, which includes a request carrying no block.

For a covered payload carrying exactly one message-level marker, no-fit included, the next record is that payload's carrier when the finished clone carries a marker on the carrier's fingerprint block: the before point, or pi's marker coinciding with it. Otherwise it is null: no carrier found, or a no-fit request where nothing marks that block. For the untouched payloads of (3), for zero-or-two-or-more message markers, and after a throw, the next record is the committed record unchanged. Neither `nextCarrier` nor `applied` is written until `edit` has returned; §5.1 gives the order and the failure path. Record (b) is committed only at a valid assistant `message_end` (§5.1, §5.3 (6)); an errored, aborted or replayed attempt never commits.

The carry is one hop. A handoff request carries no block, so its next record is null and nothing is carried after it. Once the block has left, the prefix carries no block, and pi's own marker reaches each previous request's entry as it does without taiknr (N3 turn 3: the second request read 9,274 and wrote 81 with no carry). A later recalling turn records its own carrier.

**6. Replays and retries.** A replay is derived from its payload and the record the previous request left, so record (b) is idempotent under replay. The edit may differ: a replay sent after a handoff places no carry, and it reads the entries the original wrote.

The hook fires again for one logical request on three paths: pi's auto-retry (`agent-session.js:1604`, on by default), the strict-tools fallback (`anthropic-messages.js:623-666`), and a warm replay (`cache-warmer.js:147-196`), which emits no `message_end`. Until a request's valid `message_end` commits, every re-fire reads the same messages, cell (a) and record (b), so it computes the same `applied` and next record, and `applied` at `message_end` is always the request's own — unless an await, such as another extension's asynchronous `before_provider_request` handler loaded before taiknr, holds a warm replay of the previous request's chain open until after this request's taiknr call (§11). The warmer's next run starts only at the next request's `streamFn` (`sdk.js:268-269`).

### 5.4 What reaches the figures

`applied` travels as part of the deferred reading the `message_end` registrar already hands the publisher, so a fault in it lands in that registrar and not in the payload handler. The publisher never receives a payload index: it already names the previous carrier in context coordinates, as `baseline.block`, and the adapter tells it only whether this request reads through that carrier's own content, as `applied.carrierRead`. From that it turns `applied` into two facts for `netDollars`: where the rewrite charge starts (D7) and how the block is charged (D8), the second carried on as `blockUncached` in the publisher's existing baseline so the next priced request inherits it.

`responseReceived` takes `readings.applied` from the `message_end` reading, passes it to `rewriteOf` (the start, D7, and `blockInNewTail`), and sets `PricedRequest.blockUncached` and the stored baseline's `blockUncached` from the same value: `baseline = { ...request.candidate, blockUncached: readings.applied?.block === "uncached" }`. `requestBuilt` does not set it. `PricedRequest` gains one field, `blockUncached`; nothing else in the domain changes shape, and no Jefferson field is added (`AGENTS.md` Conventions; ADR 0008).

## 6 Boundaries, failure modes, observability

### 6.1 Boundary cases

| Case | Behaviour |
|---|---|
| No block on this message's predecessor | No before point; the request goes out with the carry alone if one applies |
| Recall's block is the first block of its message | No before point |
| Message content is a string where a point would go | Skip the point; never convert content |
| A user pasted `<recalled_context` | The highest-index exact match is recall's carrier, so an earlier copy is never chosen and gets no point |
| Two messages end with the block's exact text | The higher index is chosen |
| The carrier is the last message and lost its block in place | The point is already there: pi's marker stays, nothing is placed on it, and it is not counted among the wanted points |
| A lone surrogate inside the block | On pi's own routes pi's rule removes it on both sides, so the block matches. On Joel's attribution route his transport writes U+FFFD in its place (`anthropic-attribution.ts:1584-1604`), so there is no match: that request gets no before point and no record, and the turn's loss is today's. A drift in pi's rule means no match and no edit |
| `cacheRetention` none, so pi marked nothing | No message-level edit, unless another extension placed a lone message-level marker, which is taken for pi's (below); the output is the normalized clone when the carve-out applied and `undefined` when it did not |
| A lone message-level marker that is not pi's, where pi marked nowhere | Treated as pi's, so the edit runs and copies it, and the marker is removed when the wanted points plus one do not fit (§11) |
| Four points already present | The budget decides: pi's last-message marker yields, or nothing moves |
| Another extension's top-level, system or tools marker | Counted in the budget and sent byte-identical, except the first of two marked system blocks, which D3's carve-out unmarks whoever placed it |
| A second message-level marker | Provenance is unknown, so no message-level edit is made, and both markers go out byte-identical |
| Empty or system-role messages in the payload | Ignored: the carrier is a `role:user` message with at least two blocks |
| `ctx.model` undefined, or a route outside D1 | `undefined` |
| Payload not an object, or `messages` not an array | `undefined` |
| A payload carrying a value `structuredClone` cannot copy | `edit` throws before anything is committed: `applied` becomes null, `nextCarrier` is reset to the committed carrier, and the handler returns `undefined` |
| The same payload twice (warm replay) | The same next record twice; the edit may differ, because the replay reads the entries the original wrote, and no `message_end` is emitted so nothing commits |

### 6.2 Failure behaviour

Every failure is a silent no-op and nothing throws out of the handler (D6). The request goes out as it arrived, which is today's payload and today's loss. This is deliberate: a handler's throw reaches pi's error channel with an unedited request anyway, and taiknr has no logging channel of its own (`michael-orientation.md` §2; C10).

One failure does change taiknr's own state, and the order in §5.1 is what keeps it safe. A payload holding a value `structuredClone` cannot copy — a function, a symbol, a throwing getter — makes `edit` throw before anything is committed. The handler then sets `applied` to null, resets `nextCarrier` to the committed carrier, and returns `undefined`, so the failed request goes out as earlier handlers left it and prices with today's rule rather than with the previous request's placement.

### 6.3 How a maintainer triages it

No new log line, notice or instrument field: Joel's field table stays total and finite, and the once-per-session recall notice is recall's own (ruling "how scenarios are proven"; C10). Triage is:

- the per-request `cacheRead` and `cacheWrite` in the session JSONL, read request by request;
- re-running `test-cache-point-live.mjs` with the route named, as §8.2 gives it. The scratch probe the design was measured with is not shipped, and `.pi/` is outside the repository (`.git/info/exclude:7`);
- one known blind spot, recorded rather than fixed: an extension running after taiknr can add a fifth point, and taiknr cannot prevent it, because pi dispatches a boundary's handlers in load order and each sees the previous one's payload.

## 7 The figures

### 7.1 The rewrite charge

Today's rule prices a suffix from the changed message to the end of what the last priced request carried, and charges `suffixEstimate × max(0, write − read)` when the request is warm (`savings-dollars.ts:59`; `instruments-publisher.ts:184-203`). The change keeps that rule for every request the edit did not reach, and for a request it did reach starts the suffix after the carrier's own content, excluding the block (D7).

Measured on N3's handoff request: write 1,236 tokens against the block's 2,597 input — the write is turn 1's twelve tool exchanges plus the new prompt, and the block is billed as input, outside the charge. The same split appears on N5 (1,022 / 2,597), N7 (916 / 2,597) and N8 (1,244).

The measured fit for the start itself: H's write equals turn 1's content after U₁ plus the new prompt, within 83–162 tokens on N3, N4, N5, N7 and N8 — 105 on N3, 162 on N4, 127 on N5, 83 on N7 and 104 on N8 — and H's read equals U₁'s own content. Today's start at the carrier's own index would also have charged the carrier's 6,811–15,321 tokens.

### 7.2 The block's charge

The rows' one home is the spec scenario "The block's charge, by placement and request" (`specs/context-figures/spec.md`). This section points there rather than restating them, and what follows is what the design adds to that table.

`applied.block` together with the baseline is what selects the row, and both are derived from the finished clone and the last priced request, so a fail-open handler prices the cached rows rather than claiming a move it did not make (D8). The rule fits 132 of 132 measured requests across six runs (s-key-h45, s-or-h45, s-attr-h45, s-key-h45-long, s-oauth-h45, s-key-h55): each handoff that also recalled billed the block as input, the next request wrote it, and later requests read it.

### 7.3 What still under-reports

Recorded in the README, not corrected here: the routes outside D1, including any virtual model (`pi.registerVirtualModel`), because coverage follows `ctx.model`, which names the virtual selection and not the physical model the router picks (`docs/extensions.md:2117`), and the payload event carries no model (`sdk.js:224-229`); fail-open requests; requests taiknr itself makes read zero (a pre-block prefix below the model's minimum, for example Haiku 4.5's 4,096 against pi's 2,020-token system and tools over an API key); requests where another extension's block-level marker leaves budget 1: each in-turn step re-sends the turn's tool-result tail as input, and the figure charges only the block (§11); and partial-prefix reads (ruling "under-reporting home"; Chidi #2; `michael-orientation.md` §3 trap 9).

## 8 How it is proven

### 8.1 Automated, at the handler and the adapter

Payload shape is testable with no network and no model call. The adapter's tests, named for the contract in §5.3:

- the route table, one row per provider the spec names (D1), and never more than four markers in a request; a proxy host that merely starts with or contains `api.anthropic.com` gives `undefined` (`https://api.anthropic.com.corp-proxy.internal` and `https://gw.corp/api.anthropic.com/`), a missing baseUrl gives `undefined`, and `https://api.anthropic.com` is edited;
- the handoff: `[U,R]` recorded and then `[U]` at the same index places the carry on that block, with `ttl` copied;
- a carrier `[image, R]` recorded, then `[image]` at the same index carrying pi's marker: the carry is recognised as already in place;
- a carrier `[image, R]` recorded, then `[image]` unmarked at the same index: the carry is placed;
- a different last block at the recorded index places no carry, and the payload equals the input on a three-point route;
- a carrier that still ends with recall's block places no carry, so only the before point is placed;
- a handoff that recalls nothing records null, and the request after it places no carry;
- over an API key, cell (a) set and record (b) null, so only the before point is wanted: the output carries the before point on the block before recall's block, pi's marker stays on recall's block, there are four markers in all, and `applied.block` is "cached";
- over an API key, with a top-level marker, cell (a) set and record (b) null: pi's marker is removed, the before point is placed, and `applied.block` is "cached";
- the same with a second tools marker in place of the top-level one: `applied.block` is "uncached";
- cell (a) set and no payload block equal to it: `applied.block` is null, and no before point is placed;
- on pi's OAuth shape, a handoff that also recalls places the carry and the before point, leaves `system[1]` and tools marked, leaves `system[0]` unmarked and removes pi's last-message marker;
- on that shape, a no-fit request carrying a top-level marker places no message-level point, leaves pi's last-marker where pi put it and leaves `system[0]` unmarked;
- on that shape, a request with no block and no handoff is identical to its input except for `system[0]`'s marker;
- a covered request followed by an uncovered one leaves `applied` null afterwards, so no request prices with the previous request's placement;
- no message marker on pi's OAuth shape: only `system[0]`'s marker is removed;
- a foreign message marker beside pi's: no message-level edit, and both markers go out equal to the input;
- a `cache_control` on a text block inside a `tool_result`'s `content`, beside pi's marker: no message-level edit, and the payload goes out equal to the input on a three-point route;
- over an API key, a tool whose `input_schema` has a `cache_control` property: a handoff that also recalls still places both the carry and the before point;
- a `tool_use` block whose `input` carries `cache_control`: the message-level edit is still made;
- pi's marker followed by an empty `role:system` effort message: recognised, and the point is placed normally;
- a coincident carry, where the carrier already carries pi's marker: the output deep-equals the input;
- a duplicate exact match, where two messages end with the block's text: the higher index is chosen;
- a covered payload with two message markers, followed by a handoff request: the carry is placed from the record committed before the two-marker request;
- a no-fit handoff-plus-recall request on a single-request turn, followed by the next handoff: no carry, and `carrierRead` is null;
- a string-content message; a pasted `<recalled_context`; a surrogate inside the block; a block that is first in its message; a stale carrier; a replay's record being the one the previous request left;
- inertness with `enabled` false and with a rejected config; publishing off, with the edit still applied.

The ordering in §5.1 has its own test, through the gated fake pi: assign `state.applied` a non-null value and `state.nextCarrier` a record different from `state.carrier`, as an attempt whose `message_end` was an error leaves it, fire `before_provider_request` on a covered `ctx.model` with a payload carrying a function value, and assert that the handler returns `undefined`, does not throw, sets `applied` to null, leaves `state.nextCarrier` deep-equal to `state.carrier`, and leaves `carrier` unchanged. Every symbol in it is reachable, because the test builds the state and passes it to `registerBeforeProviderRequestHandler`.

The commit handler's tests run through the gated fake pi with a ready holder and the test's own state:

- (a) `before_provider_request` fired twice with the same handoff payload and no `message_end` between: the second output carries the carry;
- (b) an assistant `message_end` with stopReason "error", and one with "aborted": `state.carrier` unchanged;
- (c) a `before_provider_request` with no `message_end` after it: `state.carrier` unchanged;
- (d) a valid assistant `message_end`: `carrier` equals the previous `nextCarrier`.

`createContextStub`'s `model` option (`tests/support/fake-pi.ts:63`) gains `baseUrl?: string`, so a covered `ctx.model` can be built.

The publisher and the domain rule are tested against the same numbers:

- a carry whose `carrierRead` matches, so the rewrite start excludes the carrier;
- a block that changed on the same message, with a before point on it, so the start also excludes the carrier;
- `carrierRead` naming a different block than the baseline, where today's start applies;
- a coincident carry, where pi's marker sits on the fingerprint block at the recorded index and nothing is placed: `carrierRead` equals the record's block, and the rewrite start excludes the carrier;
- the three-request sequence — input, write, read — on the block's charge;
- a cold uncached request, charged at input;
- a block that changed on the same message the last priced request carried, charged at write rather than at read;
- a block that first appears on a message the last priced request carried with no block — recall returned nothing and set no token (`recall-relevant-context.ts`:76-77, :90-91) — is charged at write: `carried` is undefined, `blockChanged` is false and `block.index < previousLength`, so only the `carried === undefined` clause makes `blockInNewTail` true. Driven as: request 1 builds `latestUser {index 0, timestamp 7, tailText "why?"}` with no `reportRecalled` and is priced; request 2 reports a 40-token block, builds `latestUser {index 0, timestamp 7, tailText "block"}` and expects `savedDollarsRequest` of −0.7 × 40 × write.

The figures are driven at the handler with scripted `usage` and `cost`, because the session harness rewrites every response's usage to characters ÷ 4 at zero cost (`AGENTS.md` Traps). The composition test gains the new registrations.

Run status: the foreign-marker test ran against the measured logic (`dr-s2-harness.mjs` case (c)), and so did the coincident carry and the duplicate match (cases (a) and (b)) and the failure ordering as a schematic (case (d)). The rest are design statements and are not run, because the code they describe does not exist yet — except the first-appearance case, which ran against today's code in a copy and failed at the read rate as expected, so it goes green only with D8's `carried === undefined` clause. The commit timing (a)–(d), the nested-marker case, the `[image]` fingerprint cases and the two record-rule cases are design statements for the same reason; the commit timing was run against probe2's measured logic (`dr-s3-commit.log`), not against the code. Two rules ran as references this round: the baseUrl rule, one row per host (`dr-s3-r3-url.log`), and the marker walk, on a payload carrying pi's three API-key markers beside a `cache_control` property in a tool's `input_schema` and a `cache_control` key in a `tool_use` input (`dr-s3-r3-walk.log`); the adapter that applies them does not exist yet.

### 8.2 Live, at Validate, with an owner per route

The billing scenarios are inequalities, not recorded numbers, computable from usage alone, with margins taken from what the script itself sent. Against the logs this change holds, they pass every fixed run and fail the measured broken run (M4). Each run checks its preconditions before it asserts, so a short prefix or a turn too short to leave the lookback cannot produce a false result (ruling "read guarantees"; R6).

**Invocation:** `direnv exec . node test-cache-point-live.mjs <route>`, one route per run.

How many calls turn 2 makes is the model's choice: twelve were made in 5 of 9 runs on `anthropic-key` and `openrouter`, with or without the question about the output (redgreen-derek.md L2–L5 and its earlier `anthropic-key` run; `michael/rg-v0-key-1`, `rg-v1-key-1..3`). A run that exits 3 on "turn 2 made at least 12 requests" and on no other precondition proves nothing, and is re-run from the start, keeping every attempt's printed table. A route's acceptance is the first run that passes every precondition. Three such exits in a row on one route is a Validate finding, not a pass.

| Route | Run by | Key and model |
|---|---|---|
| `anthropic-key` | Derek | `ANTHROPIC_API_KEY` from `CLAUDE_API_KEY`, model `claude-haiku-4-5` |
| `openrouter` | Derek | `OPENROUTER_API_KEY`, model `openrouter/anthropic/claude-haiku-4.5` |
| `anthropic-oauth` | Joel | his subscription; a temporary agent directory whose `auth.json` is a symlink to `~/.pi/agent/auth.json` |
| `attribution` | Joel | as above, plus `-e ~/.pi/agent/extensions/anthropic-attribution.ts` |

Both of Derek's routes need `OPENROUTER_API_KEY` as well, because it serves recall's classifier, and the script exits 2 when a key it needs is missing.

All four routes run with `PI_CODING_AGENT_DIR` and cwd set to fresh `mktemp -d` directories, removed at exit, and the agent directory holds the same test `pi-taiknr.json` `{"decisionThreshold": 0, "jeffersonInstruments": false}`, where threshold 0 selects every scored item (`src/domain/recall.ts:14`). For `anthropic-oauth` and `attribution`, the script also creates `auth.json` in that directory as a symlink to `~/.pi/agent/auth.json`. pi locks and writes the resolved file, so a token refresh lands in Joel's real file (`auth-storage.js:50,92`), and removing the directory removes only the link. `attribution` adds `-e ~/.pi/agent/extensions/anthropic-attribution.ts`, which reads `~/.claude.json` from the home directory (`anthropic-attribution.ts:1095-1101`). The script writes nothing inside `~/.pi/agent`. Joel's runs are his to observe and are never ticked by the implementer (`owner-rulings.md` Q1(a); ruling "how scenarios are proven").

**Discrimination, once at Validate:** `git worktree add --detach <mktemp -d>/base <base commit>`, then `cd <mktemp>/base && direnv exec <repo> node <repo>/test-cache-point-live.mjs anthropic-key`, then `git worktree remove` it. direnv takes the repo's `.envrc`, and the extension comes from the worktree. Record the printed `read_H` line against its bound (§8.3).

**Run status.** The script ran live on `anthropic-key` and `openrouter`, failing seven assertions on the base commit and passing all eleven on the change (redgreen-derek.md L2–L5). Every precondition and assertion also holds on N9, the one probe log with the script's turn structure. M4, M5, N3, N5 and N7 recalled from their first turn, so their turns sit one earlier than the script's and the turn-1 preconditions do not apply to them. The credential check and the symlink semantics were measured with no model call (`dr-s3-r3-auth.log`: `pi auth check --provider anthropic --no-refresh` prints `ready` through the symlink; a write through a symlink lands in its target; removing the directory leaves the target). No OAuth model call was run. The script ran from the spike's copy of the project rather than from this checkout, so its invocation, its preconditions and its printed output are measured rather than planned, and `anthropic-key`'s run on the change exited 3 on the request-count precondition (L4), so under the rule above that route's acceptance is a fresh run rather than that one.

### 8.3 The live script

`test-cache-point-live.mjs` follows the pattern `AGENTS.md` gives for live scripts: it sits at the root, outside `biome.json`'s allowlist, `tsconfig.json`'s program and vitest's include, takes its key from the environment, and exits non-zero when the key is absent. It is committed because Derek's two routes need it and a maintainer re-runs it for triage (§6.3).

**The command:** `pi -p --no-session -ne -e <absolute path to src/app/extension/taiknr.ts> -e <observer> --model <m> --thinking off <three prompts>`. Before it spawns pi, the script resolves the extension as `path.resolve(process.cwd(), "src/app/extension/taiknr.ts")`, the checkout it was launched from, and exits 3 with `extension not found: <path>` when that file is missing. The command passes that absolute path to `-e`, because a relative path is resolved against the temporary cwd the run sets and fails to load there. The observer is written into the temp directory. It wraps `fetch` to log each wire payload's markers and the length of any `<recalled_context` block, prints `ctx.model.provider`, `api` and `baseUrl` on the first request, logs each assistant message's usage at `message_end`, and makes no edits.

**The three prompts:**

- Turn 1: an 800-entry lookup table, so the prefix clears Haiku 4.5's 4,096-token minimum, and one bash call to `seq 1 3000`, which settlement stubs.
- Turn 2: a second 800-entry table, a question about the output, and twelve sequential calls, `echo s1` through `echo s12`, to exceed the 20-position lookback.
- Turn 3: `echo three`. At threshold 0 recall fires again, so H, turn 3's first request, is the two-point handoff.

**Preconditions.** Exit 3 with the reason if any fails: turn 1's second request reads more than 0 (6,769–6,896 on N9 and on every live run, redgreen-derek.md L2–L5); every request of turns 2 and 3 carries a user message ending with a `<recalled_context` text block; no request of turn 1 carries a `<recalled_context` text block; turn 2 made at least 12 requests; D1 holds for the model `ctx.model` reports, otherwise exit 3 with `precondition failed: D1 covers the route ctx.model reports (<provider>/<api>/<baseUrl>)`; and for the two OAuth routes, `pi auth check --provider anthropic --no-refresh` run against the temporary agent directory prints `ready`, otherwise exit 3 with "no OAuth credential reachable through the symlink".

**Assertions on turn 2, request 1.** Evaluated and printed like H's:

- at most 4 markers;
- a marker on recall's block in turn 2's user message;
- a marker on the block before it;
- `input_R1(turn 2) < ⌈chars(turn 2's block) / 8⌉`, which passes on N9's turn 2, request 1 (3 against 1,040).

Turn 1 carries no block (a precondition). So this request is a recalling request after a turn that recalled nothing: record (b) is null and no carry is wanted, and the before point plus pi's marker fit the budget on every covered route (on pi's OAuth shape, after the carve-out). The provider therefore writes the block (spec "A recalling request after a turn that recalled nothing"; N9: 3 input, `m[26][0]` and `m[26][1]` marked). N3, N5, N7, M4 and M5 recalled from their first turn, so their second turn opens on a handoff and is not this case.

**Assertions on H.** The script evaluates every assertion on H, prints each with both sides and pass or fail, and exits 1 if any failed:

- at most 4 markers;
- a marker on the last block of turn 2's user message;
- a marker on the block before recall's block in turn 3's user message;
- no marker on recall's block or any block after it;
- `read_H ≥ read_R1(turn 2) + ⌈chars(turn 2's own text) / 8⌉`, which fails on the base commit (6,852 against 6,852 + 1,314 over an API key; 6,769 against 6,769 + 1,314 through OpenRouter; 0 against 6,852 + 1,307 when turn 2 made 13 requests) and passes on the change (11,885 against 6,852 + 1,314; 11,775 against 6,771 + 1,314) and on N9 (8,130 against 8,030 + 29). ⌈chars / 8⌉ is a lower bound for the script's table, which tokenises at about 2 characters a token: turn 2's first request wrote 5,030 tokens beside its 6,133-token block, against a margin of 1,314 (redgreen-derek.md L2–L5; `michael/rg-v1-key-1.out`);
- `write_H ≤ Σ write of turn 2's later requests + output of turn 2's last request + ⌈chars(turn 3's own text) / 2⌉ + 256`, which fails on the base (11,287 against 401; 11,246 against 383) and passes on the change (131 against 401; 953 against 1,223) and on N9 (1,144 against 1,390);
- `input_H ≥ ⌈chars(turn 3's block) / 8⌉`: 6,133 and 6,136 on the change against 1,297, and 3 on the base.

**Output:** a table with one row per request — turn, request, wire markers, block characters, input, read, write, output — and a failure prints both sides of the failing assertion.

From N1, Haiku 4.5 never continues a thread, so every payload is on the wire. `AGENTS.md`'s trap naming `jev-context-poc.ts`, `test-jev-poc.mjs` and `test-recall-live.mjs` describes files that are not in the tree; the docs pass corrects it (ruling "how scenarios are proven").

## 9 Alternatives weighed

- **Measure the rewrite from the response's cache split.** It would price the real rewrite on every route and needs no state from the handler (CR-6, C7, ZO-3, and Michael's own earlier lean). Declined: it needs a counterfactual new tail and a TTL discriminator, and a retried or replayed request makes it noisier (ruling "rewrite sizing").
- **Gate the rewrite on "a previous priced request exists" instead of warm.** Simpler, and it charges the zero-read case. Declined: it charges an idle gap past the TTL, which the living spec already refuses (C4, CAT-3, CC-4; ruling "warm gate").
- **Share the publisher's `baseline`.** No new state. Declined: it is a no-op behind the instruments switch, and its index is in context coordinates while pi reshapes the message array (`instruments-holder.ts:7-17`; `instruments-session-start.ts:20`; CR-4, R4).
- **Copy pi's marker and nothing else, leaving pi's last-message point on the block** — the measured "add" strategy. Declined: over an API key, two recalling turns in a row need five points, which is a 400 (Chidi #2; CR-1).
- **Toggle the tools marker on the handoff request**, as M5 measured. Declined: tools markers are inside pi's thread hash, the spec forbids a per-request toggle, and Joel's guard throws on it (Chidi #4; `research-attribution-guard.md`; C3, R2).
- **Extend the carry to fresh settlement stubs.** Same class of change, so it looks free. Declined and deferred, because the frequency is unmeasured (CAT-2; ruling "settlement stubs").
- **Add a log line, a notice or an instrument field so the edit is visible.** Declined: no new surface, and the field table stays total (C10, CR-12; ruling "how scenarios are proven").
- **A second handler on `context` for the figures, or a cache manager of taiknr's own.** Declined: `context` rebuilds the head (ADR 0007), and a manager would duplicate what the publisher already owns (ZO-5).

## 10 Migration Plan

**Joel's guard is already relaxed.** `research-attribution-guard.md` records it: his extension has `assertMessageCacheControlsCopied` (`:1040-1052`), its protected topology hash excludes message paths (`:1020-1027`), and the 4-point limit is enforced. The change therefore ships nothing for his route and waits for nothing.

**Order.**

1. **Joel's guard edit: landed.** Against unchanged taiknr it is a no-op, because taiknr edits no payload today.
2. **taiknr merges.** From then on, every covered route carries the edit; his route is covered because his guard already permits message points.
3. **Joel's acceptance session** on his attribution route, and his OAuth session: his to run, his to report (§8.2).

**Rollback, in reverse:** revert taiknr first, keep his guard. His relaxed guard on an unchanged taiknr is a no-op, so that order never leaves a session failing. The opposite order — reverting his guard while taiknr stays installed — would reject every recalling request on his route, because his guard's assertion runs after the `onPayload` chain, outside taiknr's try/catch (R1; `anthropic-attribution.ts:3218-3233`).

**No migration state.** Nothing is persisted, no session entry type is added, no config field is added, and no host file is written, so a rollback leaves no residue to reconcile (ADR 0004; ADR 0008).

**Merge-time facts.** `.envrc` is `.gitignore`:12, committed in `1b773fe`; the entry stays as it is. ADRs 0001–0008 exist, so the new record is `docs/adr/0009`, and ADR 0007's body is not touched (`AGENTS.md` Conventions; ruling "documentation targets").

**After the merge, in the docs pass:** `README.md`:40 and :112 plus the under-reporting record in its instruments section; `docs/adr/0009`; the registration counts — `ARCHITECTURE.md`:46's "Thirteen registrations over nine events" becomes fifteen over ten, because `before_provider_request` is a new event with one handler and `message_end` gains a second; `ARCHITECTURE.md`:47's "of the twelve gated registrations" becomes "of the fourteen"; `AGENTS.md`:42's "twelve non-`session_start` registrations" becomes fourteen; `AGENTS.md`:23's enumeration gains the `message_end` instruments registrar's third parameter, the payload state; `AGENTS.md`:39's live-script trap names `test-cache-point-live.mjs`, beside the removal of the files that are not in the tree (§8.3), and `ARCHITECTURE.md`:5's sentence naming `jev-context-poc.ts` and `test-jev-poc.mjs` is corrected the same way. Documents never block a feature (Joel, standing).

**Follow-up, not this card:** a card for stub-only lookback losses, which the payload guard does not cover (D10). Its frequency is unmeasured; before recall merged, stub-only losses ran 2k–18k (M1).

## 11 Risks and residuals

- **A later extension can push a request to five points.** Concrete case: an extension registered after taiknr adds a point to a request taiknr filled to four, and Anthropic returns 400. taiknr cannot see or prevent it, because handlers run in load order over each other's payloads. Recorded, not fixed (§6.3).
- **Budget 1 bills the in-turn tail as input.** Concrete case: another extension marks a second tool over an API key, leaving budget 1. The before-point-only request bills the block as input, and every in-turn step re-sends the growing tail as input, measured at 2,597, then 2,688 → 3,689 with 0 written (N11). A top-level marker does not do this: automatic caching puts its breakpoint on the last eligible block, so the tail stays cached (N10: 3 input, 2,726 written, then 88–91 per step). Over a 12-step turn with a 30k tail that is roughly ten times today's read-equivalent cost. No measured route reaches budget 1; it needs a foreign marker, and the ruling stands.
- **A lone foreign message marker is taken for pi's.** Concrete case: `cacheRetention` none, so pi marks nothing; an extension loaded before taiknr places one message-level marker, with foreign top-level, system and tools markers leaving budget 1. taiknr copies that marker as its before point and removes the original as pi's last-message marker, so the other extension loses its entry (`dr-s3-r4-lone.log`). Provenance is not observable from the payload, and the trigger needs an explicit caching opt-out plus that extension, so it is recorded and not guarded.
- **A no-fit request records no carrier** (§5.3 (5)), so the next handoff never claims a read of an entry nobody wrote.
- **A moved carrier means the carry is lost.** Concrete case: a `/tree` jump or a compaction renumbers the message array, the fingerprint no longer matches, and that turn's first request rewrites the block-free prefix — today's behaviour, not worse.
- **A late warm replay can overwrite this request's state.** Concrete case: a replay of turn 2's last request stalls behind an earlier extension's async handler while turn 3's handoff H runs taiknr. The replay's taiknr call then writes `nextCarrier = null` and an `applied` whose `block` is null. H's `message_end` commits null and prices H's block on the cached rows. The cost is one lost carry, which is today's loss on turn 4's first request, and one mispriced request. It needs a slow foreign async handler and a replay timer firing within one emission of H, so it is recorded and not guarded (`runner.js:1074-1102`; `cache-warmer.js:119-196`).
- **A provider that never calls `onPayload` prices with stale state.** Concrete case: a covered handoff that also recalls leaves `applied = { block: "uncached", carrierRead: R }`, then `/model` switches to an extension-registered provider whose `streamSimple` ignores `options.onPayload`. That request's block is priced at the input rate, and its baseline stores `blockUncached: true`, so the next request is charged the write rate for a read. pi requires custom streams to call it (`docs/custom-provider.md:195`), and every built-in API does. Recorded, not guarded: a guard would be a second writer to `applied`.
- **A prefix below the model's minimum reads zero.** Concrete case: Haiku 4.5 over an API key with pi's 2,020-token system and tools; the edit is right and the provider caches nothing. It is under-reporting in the figure, and it is in the README (Chidi #2).
- **A TTL expiry that coincides with taiknr's change is under-charged.** Concrete case: an entry expires during an idle gap and the next request is cold, so the warm gate charges nothing, which is the living spec's own rule (D9).
- **Joel's route before his guard landed would have failed.** Concrete case: a recalling request rejected with "protected cache-control topology changed" and no tokens spent. His edit is in place, and the rollback order protects it (§10).
- **The estimate still understates on uncovered routes.** Concrete case: a Bedrock session rewriting 139,169 tokens after a recalling turn, charged only its suffix. Recorded per Joel's Q3(a) (ruling "rewrite sizing").
- **A virtual model gets no edit.** Concrete case: a router sending implementation turns to Anthropic over OAuth gets no edit, because coverage follows `ctx.model`, which names the virtual selection and not the physical model, and the payload event carries no model (`docs/extensions.md:2117`; `sdk.js:224-229`). Recorded in the README.
- **pi's marking could drift.** Concrete case: a pi release marks a different block. The adapter then finds no exact match, places nothing, and `applied.block` is null, so the figures price the cached rows — today's behaviour with today's numbers.
- **One cell of the probe round is missing.** pi's own OAuth with a 36-block recalling turn under this exact strategy was not run; `N7` covers the same endpoint and auth, lookback is a backend property, and the carry sits at distance 0 (ruling "probe round").

## 12 Questions this design leaves open

- None. `test-cache-point-live.mjs` is committed (§8.3), because §6.3's triage needs it.
