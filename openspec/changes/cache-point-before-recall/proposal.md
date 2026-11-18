# Proposal

## Why

On every route measured, a request carrying recall's block makes the provider rewrite the turn's prefix back to the newest entry still within reach instead of reading it. In Joel's own session, eleven turn starts read only the 35,731-token system/tools entry and rewrote 41k–143k tokens each (`michael-orientation.md` M1). That surplus is real money — about $5.77 of excess writes in one post-compaction hour, against the $0.35 the dollar model charged (`M9`) — and it is why his own words are "this session has cost $.81 more than it would have otherwise" (`owner-rulings.md`, 2026-11-17).

The savings figure cannot show this. Its rewrite charge starts at the recalling message while the real rewrite starts a prefix earlier, so that charge understates the real rewrite by about 16× (`M9`). Fixing the payload alone leaves the figure dishonest; fixing the rule alone charges for a rewrite that still happens.

## What Changes

- **A recall block stops costing the turn its cached prefix.** On the routes the predicate covers, a request carrying the block gets a cache point on the block just before recall's block, and the first request after a recalling turn gets one on the last block of the message that carried the previous request's block, so the next turn reaches an entry the recalling turn wrote — including turns longer than the provider's lookback and turns longer than an entry's remaining lifetime (`M1`; `M4`; `N3`; `N2`; `N4`). Message text and order are unchanged: only message-level cache markers move (`ADR 0007`). The payload shape is the guarantee; a read or a write is the consequence of an entry that exists, is above the model's minimum, is inside its TTL and met an applied edit (ruling "read guarantees").
- **The edit works inside an enumerated allowance and a budget.** At most two points, both deep copies of pi's own message marker, inside a four-point budget; when they do not fit, no message-level edit is made and the carve-out still applies. pi's last-message marker is the one existing marker taiknr may remove apart from the carve-out below (ruling "marker allowance"; `research-attribution-guard.md`).
- **One carve-out, on pi's own OAuth payload only.** Where system carries two marked blocks, the first block's marker is removed on every request of an active session and nothing else in system changes; tools stay marked and Joel's route never matches the shape (ruling "carve-out"; `N6`).
- **Only the routes the predicate covers change.** Provider `anthropic` with api `anthropic-messages` and a baseUrl on api.anthropic.com, or provider `openrouter` on the same api with an `anthropic/` model id, and the payload has a `messages` array. Joel's attribution route is covered: his guard relaxation has already landed, so taiknr never does anything it forbids (`owner-rulings.md` Q1(a); `research-attribution-guard.md`; `N7`). Bedrock, the other Anthropic-format gateways, OpenRouter's `openai-completions` path, a proxy baseUrl and an undefined model keep byte-identical payloads (ruling "route predicate"; `owner-rulings.md` Q3(a)).
- **The net dollars charge the rewrite as an estimate that starts where the provider now rewrites.** On a request the edit was applied to, the charge starts after the carrier's own content and recall's block is not in it; on every other request the rule is today's (`M9`; `N3`; ruling "rewrite sizing"). Recall's block is priced by one rule, taken from where the handler left pi's marker: today's rule where pi's marker stayed, and input on the request that removes it, write on the next, read after that (ruling "block pricing"). The figure may still read negative, because it does not depend on the read/write split (`M2`; `owner-rulings.md` Q2(a)).
- **The README explains a real negative figure, names `decisionThreshold` as the lever, and records where the charge runs low** — the routes the edit does not reach, fail-open requests, taiknr-caused zero reads and partial-prefix reads (`owner-rulings.md` Q2(a), Q3(a); ruling "under-reporting home").
- **The standing record that is measured false is narrowed, not edited.** ADR 0007's consequence and `README.md`'s recall paragraph both say the provider rewrites the recalling turn once, from its user message; the measurement shows the block billed as input on the request that moves pi's marker and written on the next (`M1`; `N3`; `michael-orientation.md` §1). An accepted record's body is never edited, so `docs/adr/0009` narrows it (`AGENTS.md`).
- **`.envrc` is ignored by git** (`.gitignore:12`, committed in `1b773fe`). It was never tracked, so this change keeps the entry rather than adding it (`owner-rulings.md`, 2026-11-17).

Acceptance is the real read/write split measured in a live session of the real extension on each covered route, not the figure: the figure cannot move with the fix on its own (`M2`; `michael-orientation.md` §3, trap 1). Derek runs the API-key and OpenRouter runs; Joel runs pi's own OAuth route and his attribution route (ruling "how scenarios are proven").

**Deliberately not in this change:**

- Cost-aware recall, any credit to recall, and any clamp on a negative figure (`owner-rulings.md` Q2(a); ADR 0008).
- Bedrock and the other gateways with no measured result — no credentials exist, and their behaviour stays as it is (`owner-rulings.md` Q3(a)).
- Measuring the rewrite from the response's cache split, which needs a counterfactual new tail and a TTL discriminator (ruling "rewrite sizing").
- A carry point on fresh settlement stubs: stub-only lookback losses are unmeasured and become a follow-up card in `design.md`, not tasks (ruling "settlement stubs").
- Recall's disclosure split, size bound, cache key, eligibility rule and fail-open notice; the classifier and its timeout; stubbing and settlement (`michael-orientation.md` §2).
- Any new config field, instrument, log line, notice or session entry type, and any change to the publisher's Jefferson field table (ruling "how scenarios are proven"; `owner-rulings.md`, instruments).
- Joel's `anthropic-attribution` extension, which lives outside this repository. Its relaxation is a dependency for his route, and it has already landed (`owner-rulings.md` Q1(a); `research-attribution-guard.md`).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `tail-recall`: a request carrying recall's block no longer costs the turn its cached prefix on the routes the predicate covers, and every other route keeps today's payload; the edit works inside an enumerated marker allowance with one carve-out.
- `context-figures`: the rewrite the net dollars charge starts where the provider now rewrites, recall's block has one pricing rule, and why a figure can honestly read negative — and where the charge runs low — is documented beside it.
- `development-checks`: `.gitignore` also ignores `.envrc`, at line 12.

## Impact

- **Payload path:** two new handlers under `src/infra/pi-event-handlers/`, a payload adapter under `src/infra/adapters/`, the per-session state declared as pi-free types under `src/use-cases/` and created in `src/app/extension/taiknr.ts`, registered through the existing session gate; the request handler writes that state, so `src/infra/pi-event-handlers/context.ts` changes too (`research-eleanor`; ruling "state homes").
- **Figures:** the rewrite and block terms in `src/use-cases/instruments-publisher.ts` and the rule in `src/domain/savings-dollars.ts` (`research-eleanor`; ruling "block pricing").
- **Tests:** under `tests/`, mirroring those layers, including `tests/app/extension/taiknr.test.ts`, which pins the registration list. Payload shape is tested at the handler and adapter; billing is proven by a live run per route, because the session harness rewrites every response's usage (`AGENTS.md` Traps; ruling "how scenarios are proven").
- **Documentation:** `README.md`:40 and :112 plus the under-reporting record in its instruments section, one new record at `docs/adr/0009`, and `.gitignore`. `ARCHITECTURE.md`'s registration count and `AGENTS.md`'s count follow in the docs pass (ruling "documentation targets").
- **Provider-facing behaviour:** on covered routes a payload differs from today's in message-level cache markers, plus the one system marker the carve-out removes on pi's OAuth shape; on every other route it is byte-identical. Requests stay on `context_with_system` and recall keeps writing nothing (`ADR 0007`).
- **Outside the repository:** Joel's `anthropic-attribution` extension's relaxation, already in place, is what lets his route be served like pi's own provider (`owner-rulings.md` Q1(a); `research-attribution-guard.md`).
