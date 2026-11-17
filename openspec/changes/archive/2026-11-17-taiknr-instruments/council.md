# Council Synthesis

Seven lenses (`zoom-out`, `critic`, `comprehension`, `structural`, `readiness`, `codebase`, `catalyst`) reported, and Michael settled 22 contradictions and open questions. All 22 are `settled`; none is `joel`. Every lens claim a ruling covers is accepted or set aside below exactly as he ruled, and the ruling is named. Findings no ruling covers are marked as such and carry the lens's own reason.

## Question and Scope

### The design question

How does taiknr publish the figures Joel asked for — the tokens and stubs in the archive, whether a classifier decision is in flight, and the token and dollar savings — on pi-jefferson's published provider contract, and how does it become the number a user watches instead of pi's 38–41 % low figure after every settlement (M1), without changing pi or Jefferson (J1–J4; T1)?

### What binds the design

- **Joel's rulings** (`owner-rulings.md`, 2026-11-15/16, bound as J1–J15 in `michael-orientation.md` §1): four instruments (J14), six figures with recalled published as its own (J9), one switch on by default (J8), `enabled` still stops everything (J15), always a number with an estimate flag beside it (J11), savings per request and since start in tokens and dollars net of cache rewrites (J12), the in-flight indicator with its item count (J13), one reader of the switch (`configuration` and `jefferson-instruments` deltas; Michael §2), placement and the bar as ordinary Jefferson configuration (J5, J7), no Jefferson change (J4), and Joel's own look as the acceptance (J2). Q1(a)–Q5(a) fix the total's lifetime, the classifier spend inside the net, registering nothing when off, recall's budget untouched, and the user placing the rows.
- **The approved specs and records:** exactly seven registered events and frozen registrar and port contracts (`extension-packaging`), one handler per lifecycle event and the gate as the only inertness (`AGENTS.md`), domain and use cases importing no pi package (ADR 0001), recall unchanged in return, budget, key and eligibility (`tail-recall`; ADR 0007), the store as an optimistic cache (`branch-hydration`), a record's shape never versioned (ADR 0004), and `npm run check` as the gate (ADR 0003).
- **The evidence of the traps:** T1–T23 in `michael-orientation.md` §3 and the measurements M1–M6 in §0. The two that decide the arithmetic: the request-to-request prediction error is about 340 tokens at the median against a median settlement saving of about 1,200 (M3), and one ratio serves whole requests but not one settlement (T8).

### Evidence the council read

`research-chidi.md` and `research-eleanor.md`; `proposal.md`; the five deltas under `specs/`; `michael-orientation.md` (M1–M6, J1–J15, T1–T23, S1–S8, §O1–O9, §4 Q1–Q5); `owner-rulings.md`; the living specs, `AGENTS.md` and the ADRs as cited. The seven lens reports are `council-<lens>.md`; Michael's rulings are `michael-council-rulings.json`.

### What the change does not do

The deliberate exclusions are in `proposal.md` §"What this change deliberately does not do" and are not restated here. The council adds no exclusion to that list; ruling 18 adds one accepted cost, not a new exclusion.

### Questions still open after the council

Named as questions, not settled quietly:

- **The field set, names, default formats and the flag's name** (§O4). No lens and no ruling decided them; they are the design's.
- **The switch's name** (§O5). The configuration delta says "named by the design".
- **The exact dollar rule's edges** (§O6): the rate a zero-token component takes, tiers, mixed short and one-hour cache writes. Ruling 15 keeps it the design's and asks for a table of cases with numbers (R13).
- **Whether Jefferson repaints while the classifier call is in flight**, and **whether it accepts the registration and every update**: unverifiable from taiknr's side (T10); Joel's live look decides (J2). Sources: zoom-out, critic, readiness and codebase `not_checked`, all four of which declined to reproduce it.
- **Whether an extension's `console.error` reaches pi's TUI**: untraced (codebase `not_checked`). Ruling 11 does not depend on it.
- **How provider APIs other than Anthropic and OpenAI-completions normalize `input`, `cacheRead` and `cacheWrite`**: unread (T5; critic and readiness `not_checked`). The measured ratios are Anthropic's and deepseek's.

## Lens Findings & Trade-offs

### What the lenses agreed on

- **The change is buildable as proposed and warrants new code** (zoom-out, codebase, structural). Codebase checked every file area the proposal names and found it matching live `abaa6b0`: seven handlers, a `session_start` with no `await`, `readEligibleArchivedIds`, the frozen scorer adapter, the notifier built inside the context handler, `pi.events` on `ExtensionAPI`, and 22 test files.
- **No parallel accounting pipeline and no telemetry framework** (zoom-out, catalyst). The reusable inputs already exist: the store, the request bridge, `formatRecalledContext`, `estimateTokens`, `buildSessionProjection`.
- **The deltas contain contradictions that must be fixed before design, not during it** (comprehension C1 as blocking; zoom-out, critic, catalyst all reaching the same scenario from different sides).
- **The largest gap is not arithmetic but wiring:** where the switch is read, where the classifier's cost is observed, where new state lives, and what proves each of them (critic, readiness, codebase, structural — the same five items stated four ways).

### The contradictions across the lenses

Two lenses named the same defect independently, and it is the one blocking finding:

- **C1 (comprehension, blocking):** "context in turn is the request as sent, including recall" cannot coexist with "'Recalled stands on its own' … is not folded into context in turn", and the savings equation subtracts a term from the figure it is excluded from. **CAT-1 (catalyst, major)** reaches it as a false compromise and proposes the same resolution from the other side: segmentation, not exclusive buckets.
- **Related, and separately ruled:** CR3 (the saving mixing a measured term with an estimated one), CR4 (re-anchoring total context to usage folds recall's block back in and creates a smaller copy of the jump), and CR13 (a since-start token total that reads as a context reduction).

### Mechanics a coder would otherwise decide mid-implementation

- **The switch's gate** (CR1, CB-6, R1): with `enabled` true and the switch off, gated publishing handlers still run and emit, and Jefferson refuses each update with a warning — breaking J8's "only the instruments are absent". The proposal's Impact line puts "the second condition in `src/app/extension/`", which is the gate, and a gate condition would stop staging, settlement, hydration and recall (CB-6).
- **The classifier's cost** (CR2, CB-5, ZO-1): Q2(a) needs `ClassifierResult.usage`, which only exists inside the adapter, and no permitted difference carried it.
- **The frozen-signature list** (CB-1 blocking, R5, ZO-1): differences (1)–(4) already exist at `abaa6b0`, so the scenario cannot pass as written, and the list is not closed — the `SessionConfig` interface, `TaiknrConfig`, three dependency objects and the scorer adapter are all outside it.
- **New cross-event state** (R8, STRUCT-2): the ratio's lifecycle and the in-flight request's estimate have no named holder, no writer per event and no reset.
- **Re-registration** (R4): whether pi emits `session_shutdown` before every `session_start` was untraced, and Jefferson refuses a duplicate instrument name.
- **Containment** (R6, CR14): "publishing is contained" was specified as an outcome with no mechanism, no reporting destination, and the dangerous emit sitting in a `finally`.
- **Proof gaps** (R9, R10, CB-4): the shared `createFakePi` has no `events`, the context stub has no projection, and three scenarios rest on the phrase "the review reads for it".

### Minor findings the lenses raised

CR7 (the window needs a sentinel), CR8 (a seeded ratio is biased, because the persisted projection lacks the block), CR9 (a virtual model never matches `ctx.model`), CR10 (`verbatimModuleSyntax` would enforce the type-only import), CR11 (a typed field table would make an undeclared field a compile error), CR12 (the cost of rebuilding the projection per event), CR13 (the "since start" label), C6 (a timing bound the sample cannot support), STRUCT-3 (the same enumeration copied into two or three deltas), STRUCT-4 (the README never says what the savings are net of or that they are signed), R11 (the devDependency's range and the live checkout's version skew), R12 (Joel's observations mixed into coder-ticked tasks), R13 (the dollar rule deferred wholesale), CB-8 (a second characters-÷-4 rule beside pi's `ceil`), CB-9 (`message_end` fires for every role, and a returned message replaces pi's), CB-10 (installing the devDependency from Joel's checkout writes a `file:` spec), CB-11 (no way for a user to triage a blank, a stale and a wrong instrument).

### Reuse and trade-offs the lenses weighed

- **Keep:** the store, the request bridge, the recall formatter and pi's estimator (zoom-out). Recall's port, use case, cache and budget (zoom-out, codebase). The existing handler files and the gate.
- **Rejected as unnecessary scope:** a general telemetry framework or a parallel accounting pipeline (zoom-out); a progress port on the use case (zoom-out, ZO-1); a source-scanning test where a compiler flag will do (ruling 17 against R10's first option); a persistence of the running total (Q1(a)); a fix to recall's budget (Q4(a)).
- **Accepted costs:** every dollar figure is a counterfactual estimate that goes negative sometimes (M4, T19); the in-flight indicator only flashes (T23, reworded under ruling 8); publishing costs a projection build even when nobody listens (ruling 18).

## Synthesis & Recommendation

### The recommended direction

Publish from taiknr's own handlers through one per-session publisher, with the arithmetic free of host code:

- **Six publishing registrars**, one file each in `src/infra/pi-event-handlers/`, registered through the gated pi after the existing handler whose outcome each reads: `session_start`, `context_with_system`, `message_end`, `agent_settled`, `session_compact` and `session_tree`. `turn_end` and `agent_before_settle` publish nothing (ruling 9).
- **One publisher per session**, reached through a holder built in `taiknr.ts` and starting as a no-op. The `session_start` registrar builds the real one when the switch is on and leaves the no-op otherwise, so no other handler reads the switch and the figure arithmetic never runs for nobody (ruling 6, ruling 14). `handler-gate.ts`, `SessionConfig` and `isActive()` are unchanged.
- **The classifier is observed at the scorer adapter**, through an optional third parameter that sees `result.usage` on the line after the call and before every branch (ruling 8). No port member, no wrapper.
- **The figures are estimates times one ratio**, the request's saving is computed from estimates only, and the measured prompt is published as context in turn alone (rulings 2 and 5). Recalled overlaps context in turn rather than being bucketed out of it (ruling 1).
- **Failure has no new channel.** A publishing registrar does not catch; pi's per-handler catch reports it on the extension error channel. Recall's two observer emits go through one bus adapter that catches silently (ruling 11).

Layering follows ADR 0001 and §O3: arithmetic in `src/domain/` and `src/use-cases/`, pi usage and the persisted projection and the Jefferson bus in `src/infra/`, and the switch, the holder and the registration in `src/config/` and `src/app/extension/`.

### Why this and not the alternatives

It is the smallest set of additions that satisfies J1–J15 and leaves recall, stubbing and hydration untouched. Each alternative the lenses weighed fails on a decision already made: a gate condition stops everything (J8); a switch test in every handler breaks the one-home rule; a wrapper or a port member cannot see the classifier's usage, and a port member widens a frozen contract for nothing; a measured-minus-estimated saving is mostly the 340-token prediction error (M3); a re-anchored total context hands back the jump this change exists to remove; a second observable channel spends recall's only notice (ADR 0002).

### What design.md must still answer

§O4 (the field set, names, formats and the flag's name), §O5 (the switch's name), §O6 (the dollar table of cases with numbers, per R13), the Migration Plan rows ruling 19 asks for, the file list including `tests/support/fake-pi.ts` as Modify (ruling 16) and `tsconfig.json` (ruling 17), and the §O1 event list as ruling 9 fixed it. `design.md` is not written in this pass.

### Amendments the rulings require

`proposal.md` and the specs are not amended in this pass; these are the edits the rulings require, for the pass that applies them. Ruling numbers refer to `## Michael's Rulings` below.

| # | File | Requirement / scenario | Amendment | Ruling |
|---|---|---|---|---|
| A1 | `specs/context-figures/spec.md` | Six figures… / *Recalled stands on its own* | The block's size is published as its own figure and context in turn still includes it; the figures overlap, and recalled is a part of context in turn rather than a bucket taken out of it | 1 |
| A2 | `specs/context-figures/spec.md` | A request's saving… | The identity history before − context in turn = withheld − stubbed − recalled holds, provided every term comes from the same estimator and the same k | 1 |
| A3 | `specs/context-figures/spec.md` | Calibration and the dollar figures are tested at the handler | Add a scenario: a request carrying recall asserts the two forms of the saving give the same number | 1 |
| A4 | `specs/context-figures/spec.md` | A request's saving…, and Six figures… / *Context in turn, before and after the response* | The per-request token saving is k × (withheld − stubbed − recalled), all three as estimates, with one k — the k sampled from that request's own response. It never subtracts a measured context in turn from an estimated history before; the measured value is published only as context in turn itself | 2 |
| A5 | `specs/context-figures/spec.md` | The cumulative saving counts from the current start | The since-start token total is the sum of those savings, and its default label says *tokens not sent since start*; the total counts tokens not sent, so a stub counts once for every request that carries it and the total can exceed the context size | 2 |
| A6 | `specs/context-figures/spec.md` | Dollar savings are net… / replace *Two savings figures become known at different moments* | The per-request pair of tokens and dollars and both since-start totals update together, at the valid assistant response of that request at `message_end`; between responses the instrument keeps the last completed pair; the in-flight estimates go out at `context_with_system`; an aborted, errored or zero-usage response adds nothing and publishes no pair | 3 |
| A7 | `specs/context-figures/spec.md` | Six figures… / *Context in turn before the session's first request* | Before this run's first request, context in turn carries total context's value with the same flag; delete "which number it is … is the design's (§O7)" | 3 |
| A8 | `specs/context-figures/spec.md` | Every figure is a finite number with the estimate flag beside it | One boolean, shared by every figure, meaning *uncalibrated*: on while k = 1, on while k has only been seeded from persisted usage, off at the first valid live sample for the current model, on again when the model changes to one with no live sample. Delete the sentence that makes *measured* versus *estimate* the flag's meaning, and replace the *A measured figure* scenario | 4 |
| A9 | `specs/context-figures/spec.md` | A character estimate… / *A resumed session seeds k* | The seed stays, because it is far closer than k = 1, and the flag stays on while it is the only sample, because the persisted projection lacks the recall block and the system prompt of that time | 4 |
| A10 | `specs/context-figures/spec.md` | Six figures… / *Total context comes from the persisted projection* | "Re-anchored at each response" means k is refreshed from that response: total context is always k × the estimate of the persisted history after taiknr's edits, counting the system message as the request-side estimate does, and never the measured prompt. Add a scenario: on a recall turn, total context does not include recalled | 5 |
| A11 | `specs/context-figures/spec.md` | A character estimate… / *One ratio per model* | The current pair is pi's own rule — `ctx.model`'s (provider, id), or under a virtual selection the (provider, model) of the newest valid response. Each k is held with the pair it came from and used only while that pair is current; otherwise k reseeds from the branch's newest valid assistant message of the current pair, or is 1, flag on. Reseed at `session_start` and `session_tree`; `session_compact` keeps k; `ctx.model` undefined means k = 1 and the flag on | 13 |
| A12 | `specs/context-figures/spec.md` | A character estimate… / *An invalid response is not a sample* | Add: malformed persisted usage at `session_start` — non-finite, or `input + cacheRead + cacheWrite` not above 0 — is not a sample and never a NaN | 9 |
| A13 | `specs/context-figures/spec.md` | A character estimate… / *An invalid response is not a sample* | The validity rule applies to assistant messages only, and the handler returns nothing, because a returned message replaces pi's | 9 |
| A14 | `specs/context-figures/spec.md` | Calibration and the dollar figures are tested at the handler | Add scenarios: an aborted, an errored, a zero-usage and a no-pending response, and recall returning nothing. Handler tests assert on the shared fake's recorder, and a recorder no test asserts on is a finding at the gate | 14, 16 |
| A15 | `specs/context-figures/spec.md` | Dollar savings are net… and *A warm request after a settlement* | "Net of cache rewrites" means every rewrite taiknr causes: the first warm request after any change taiknr made to an earlier message — a settlement's stubs, or a previous turn's recall block now missing from its user message. A cold request's rewrite is still not charged. The exact rule stays §O6's, as a table of cases with numbers | 15 |
| A16 | `specs/context-figures/spec.md` | Dollar savings are net… / *The edges the design decides* | Name the table of cases with numbers as the design's deliverable, so each edge has a row and an expected finite output | 15 |
| A17 | `specs/jefferson-instruments/spec.md` | The documentation explains what stubbing does to pi's measurement | Reword: taiknr's context figure gives a figure to watch that does not jump; pi's own pre-run compaction check still runs on pi's estimate, so it runs low after a settled run; how large the gap is depends on the model — about 40 % on Anthropic, a few percent on deepseek. The instrument resolves the confusing reading, not pi's calculation | 21 |
| A18 | `specs/jefferson-instruments/spec.md` | The documentation explains what stubbing does… | Add a scenario: the README says the savings figures are net of the rewrite charges and of recall's reported classifier spend, are signed, and can go negative early in a session | 20 |
| A19 | `specs/jefferson-instruments/spec.md` | The documentation explains what stubbing does… | Add: the README says these figures overlap and are not to be added together | 1 |
| A20 | `specs/jefferson-instruments/spec.md` | The documentation explains what stubbing does… | Add: every token figure is a calibrated estimate except context in turn after its response, and the dollar figures are counterfactual estimates | 4 |
| A21 | `specs/jefferson-instruments/spec.md` | The context instrument offers a bar… / *No window* | The window is an input field, not one of the six figures, so the *never a placeholder* rule does not apply to it. It posts 0 when `ctx.getContextUsage()` is undefined, and the bar returns `null` for a window ≤ 0, which draws an unfilled track | 22 |
| A22 | `specs/jefferson-instruments/spec.md` | The decision indicator… / *It only flashes* | "For as long as the call runs, up to `classifierTimeoutMs`"; the measured timings are a sample, not a bound | 8 |
| A23 | `specs/jefferson-instruments/spec.md` | Publishing cannot cost stubbing or recall | A publishing registrar does not catch a throw raised while computing or posting figures; pi's runner catches it per handler and reports it on the extension error channel. Recall's two observer emits, and every other emit, go through one Jefferson bus adapter that catches silently with a one-line comment citing `loader.js`. Recall's once-per-session notifier (ADR 0002) is untouched. Reword *A figure that cannot be computed* accordingly | 11 |
| A24 | `specs/jefferson-instruments/spec.md` | Nothing registers while taiknr is off or unconfigured / *The switch is read in one place* | The one reader is a new `session_start` publishing registrar, registered through the gated pi after `registerSessionStartHandler`: with the switch on it builds the real publisher, emits the registration, posts every field and installs the publisher in the per-session holder; with the switch off the holder keeps its no-op. No other handler tests the switch | 6 |
| A25 | `specs/jefferson-instruments/spec.md` | Nothing registers while taiknr is off or unconfigured | Add a scenario: with the switch off, fire every publishing event and assert no emit | 6 |
| A26 | `specs/jefferson-instruments/spec.md` | Instruments are registered… | Add a scenario: pi tears down and rebuilds the runtime before every new session, unsubscribing the old instance's bus listeners, so this registration is always the first in a fresh Jefferson and the in-memory figures are fresh per factory — no guard, and no `session_shutdown` handler | 12 |
| A27 | `specs/jefferson-instruments/spec.md` | Instruments are registered… / *Jefferson is not installed* | State that the cost of computing figures with no listener is accepted, with no guard, because the bus has no reply channel and cannot say whether anyone is listening | 18 |
| A28 | `specs/jefferson-instruments/spec.md` | Every declared field carries a value… | Add: total context and the archive are re-posted at `session_compact` and `session_tree`, after re-hydration | 9 |
| A29 | `specs/extension-packaging/spec.md` | Handler signatures and the import boundary are preserved / *Signatures unchanged* | Compare against `abaa6b0`; state (1)–(4) as already in the baseline and unchanged; replace (5) with this change's closed list, all additions: (a) the publishing registrars, one file each in `src/infra/pi-event-handlers/`; (b) `registerContextHandler`'s dependency object gaining the per-session instruments holder; (c) `createPiJevScorerAdapter` gaining an optional third parameter, the classifier observer; (d) `TaiknrConfig` and its default gaining the switch. Delete the stale clause "`TaiknrConfig` itself gains `enabled`" | 7 |
| A30 | `specs/extension-packaging/spec.md` | The extension entry loads without error | Name the six publishing events and that `turn_end` and `agent_before_settle` publish nothing; one registrar per event, registered through the gated pi after the existing handler whose outcome it reads. AGENTS.md's line is one event per registrar, not one registrar per event | 9 |
| A31 | `specs/extension-packaging/spec.md` | The extension entry loads without error / retitle *Seven events registered* | The scenario becomes the sorted list of every registration, duplicates kept: 13 entries — `session_start`, `context_with_system`, `session_compact` and `session_tree` twice each, `agent_settled` and `message_end` once each, plus the existing `agent_before_settle`, `tool_call` and `turn_end`. A set would hide an accidental double registration; folding publishing into the existing handlers would widen the signature revision | 10 |
| A32 | `specs/extension-packaging/spec.md` | The extension entry loads without error | The load test's fake that allows only `on` also proves the factory touches nothing but `on`, because registration happens at `session_start` and the factory never reads `pi.events` | 16 |
| A33 | `specs/extension-packaging/spec.md` | The Jefferson contract is a type-only development dependency / *The type keyword is the only thing that keeps it out* | Reword: add `"verbatimModuleSyntax": true` to `tsconfig.json`, which makes a value import of a type-only export a compile error; the existing `git archive` load check, which has no `node_modules`, is the runtime backstop; and the rule's real source is Jefferson's contract — plain Node will not strip types under `node_modules`, so a provider imports it with `import type`. Drop the claim that the `type` keyword is the only thing keeping it out. The boundary and one-reader scenarios stay `rg` checks in review | 17 |
| A34 | `specs/tail-recall/spec.md` | The classifier call is observable to the instruments | The seam is `createPiJevScorerAdapter(ctx, config, observer?)`: `observer.started(ids.length)` immediately before `ctx.modelRegistry.classify`, and `observer.finished(result.usage)` on the line after the await, before the aborted, error and validation branches. `classify` never rejects, so that one call point covers every exit and no `finally` is needed; a catalog miss throws before any call and observes nothing | 8 |
| A35 | `specs/tail-recall/spec.md` | The classifier call is observable… / *A new port member is one more difference* | Delete the scenario: the `RelevanceScorer` port and `recallRelevantContext` are unchanged, and there is no port member and no wrapper | 8 |
| A36 | `specs/tail-recall/spec.md` | The classifier call is observable… / *Every exit returns the value* | Note that one call point covers every exit, and add the tests: an aborted, an error, a timeout-shaped and a malformed-answer result each leave the indicator not running and each pass its usage on | 8 |
| A37 | `specs/tail-recall/spec.md` | The classifier call is observable… | `finished()` records the cost for that request's net dollars, subtracted at the response; absent usage counts as 0 | 8 |
| A38 | `specs/configuration/spec.md` | The instruments switch turns publishing on and off… / *One reader* | Keep the scenario and cite `jefferson-instruments`' *The switch is read in one place* for the reader's identity — the `session_start` publishing registrar — so the fact has one home | 6 |
| A39 | `proposal.md` | Impact — Code | The switch's home is not "the second condition in `src/app/extension/`": it is the `session_start` publishing registrar and the holder built in `taiknr.ts`, and `handler-gate.ts`, `SessionConfig` and `isActive()` are unchanged | 6 |
| A40 | `proposal.md` | Impact — Contracts | §O2 is answered at the scorer adapter, so no port changes: correct the line that leaves it open | 7, 8 |

Four rulings require no text in `proposal.md` or the specs and land in `design.md` instead: ruling 19 (two Migration Plan rows), ruling 14 (the publisher's holder and its single writer per event), ruling 16 (`tests/support/fake-pi.ts` on the file list as Modify, with its recorder and its throwing-emit option) and ruling 18 (the accepted cost, stated once).

## Accepted & Rejected Feedback

| Lens | Findings | Disposition | Ruling or reason |
|---|---|---|---|
| comprehension | C1 | Adopted, as blocking | 1 — context in turn includes the block; recalled is published as its own overlapping figure |
| catalyst | CAT-1 | Adopted, and its "reporting segmentation" naming is what ruling 1 describes | 1 |
| critic | CR3 | Adopted | 2 — the saving is computed from estimates only, one k |
| critic | CR13 | Adopted | 2 — the label says *tokens not sent since start* |
| zoom-out | ZO-2 | Adopted | 3 — the pair publishes together at the response |
| comprehension | C3 | The problem adopted; C3's own remedy — a status or request-identity field — set aside | 3 — publishing the pair at the response removes the only case that field would mark |
| comprehension | C2, C5 | Adopted | 4 — one boolean, meaning uncalibrated, on while seeded |
| critic | CR8 | Adopted, on its first option | 4 — the seed stays and keeps the flag on; seeding from a median was not taken |
| critic | CR4 | Adopted | 5 — re-anchoring refreshes k, never the measured prompt |
| codebase | CB-3 | The gap adopted; its remedy — find and test a home for pi's projection rule — set aside | 5 — taiknr never uses pi's last-usage-plus-trailing-estimate figure, so nothing of it is reimplemented |
| critic, codebase | CR1, CB-6 | Adopted | 6 — a null publisher chosen once; CB-6's "correct the proposal's Impact line" is A39 |
| readiness | R1 | The gap adopted; its remedy — a second gate, a new `SessionConfig` member or a parameter on `createGatedPi` — set aside | 6 — one reader, and `handler-gate.ts`, `SessionConfig` and `isActive()` unchanged |
| critic, codebase, zoom-out | CR2, CB-5, ZO-1 | Adopted | 7 (c) and 8 — the scorer adapter gains an optional observer that sees `result.usage` |
| codebase | CB-1 | Adopted, as blocking | 7 — (1)–(4) are the baseline; the list is closed as (a)–(d) |
| readiness | R5 | Adopted | 7 — the list becomes closed; its own remedy, a second gate on the `SessionConfig` interface, set aside. Its reading of AGENTS.md as one registrar per event is set aside by 9 |
| readiness | R3 | Adopted | 9 and 6 — the `session_start` registrar seeds, registers and posts with no await, after `registerSessionStartHandler` |
| critic | CR5 | Adopted | 9 — `session_compact` and `session_tree` re-post total context and the archive |
| critic | CR12 | Adopted | 18 (cost accepted) and 9 (six events, not every `message_end` of every role) |
| structural | STRUCT-1 | Adopted as a question; its recommended option (a), the set of distinct names, set aside | 10 — the test keeps its form and lists every registration, 13 entries |
| readiness | R4 | Answered, and the test it asked for dropped | 12 — pi never sends a second `session_start` into the same Jefferson state, so the two-`session_start` test tests a sequence pi never produces |
| readiness, critic, codebase | R7, CR9, CB-7 | Adopted | 13 — pi's own current-pair rule; reseed at `session_tree` |
| readiness | R8 | Adopted; its "reset at `session_start`" set aside | 14 — the factory runs again, so there is nothing to reset; the writer moves to the `context_with_system` registrar so recall's early returns cannot leave the slot stale |
| structural | STRUCT-2 | Adopted, option (a) | 14 |
| critic | CR6 | Adopted | 15 — the charge covers every rewrite taiknr causes |
| readiness | R13 | Adopted | 15 — the exact rule is the design's, as a table of cases with numbers |
| codebase, readiness | CB-4, R9 | Adopted | 16 — `tests/support/fake-pi.ts` gains a recorder, a throwing-emit option and the projection |
| critic, readiness | CR10, R10 | Adopted, on the compiler-flag option | 17 — `verbatimModuleSyntax` in `tsconfig.json`; R10's source-scanning test and CR10's "fix any existing imports it flags" remain untested assumptions the design and the gate settle |
| readiness | owner question: bound the cost when Jefferson is absent | Adopted, as "accept the cost" | 18 — the bus has no reply channel, and a projection build takes under 1 ms |
| readiness | R2 | Adopted | 19 — two Migration Plan rows, no task and no code |
| structural | STRUCT-4 | Adopted | 20 — one documentation scenario for netting and sign |
| comprehension | C4 | Adopted | 21 — documentation wording only, so minor |
| critic | CR7 | Adopted | 22 — the window is an input field, posting 0, with the bar `null` below 1 |
| critic | CR14 | Adopted | 11 — every emit, the reset included, goes through one adapter that catches silently |
| readiness | R6 | Adopted, with its "classify rejects" case dropped | 11 — no new reporting channel, and `classify` never rejects |
| codebase | CB-2 | Adopted | 11 — not Joel's: no new user-facing notice |
| codebase | CB-9 | Adopted | 9 — assistant messages only, and the handler returns nothing |
| codebase | CB-8 | Adopted in substance | 1 — the identity holds only if every term comes from the same estimator; the one text→tokens helper is the design's way to keep it so |
| critic | CR11 | Accepted, as design guidance | No ruling. Lens's own reason: `Report.value` is not tied to the declared field, so one `as const` field table with a typed post makes an undeclared field a compile error and leaves only finiteness to tests. It lands in the design's answer to §O4 and needs no delta amendment, because the delta already requires the assertion |
| readiness | R11 | Accepted, as design guidance | No ruling. Lens's own reason: the types come from npm 0.14.0 while Joel's pi loads his checkout, so a contract drift is invisible to `npm run check` and shows only as a TUI warning. The design pins the range and the live look is re-run on any bump |
| readiness | R12 | Accepted | No ruling. Lens's own reason: a task only Joel can observe is marked his and never ticked by a coder. `tasks.md` ends with a *Joel observes* group |
| codebase | CB-10 | Set aside for the delta | No ruling. Lens's own reason: a `file:` spec from Joel's checkout would break a clean install. `extension-packaging`'s *The lockfile carries it* already fixes the outcome — the committed lockfile carries `pi-jefferson` and `lodash-es` — and which install command produces it belongs on the design's file list |
| codebase | CB-11 | Set aside for this change | No ruling. Lens's own reason: a user cannot tell a blank instrument from a stale one. The README sentences the delta requires are written in the docs pass, which Joel's standing ruling keeps ungated, and they can carry the triage rows without a new scenario |
| structural | STRUCT-3 | Set aside for this change | No ruling. Lens's own reason: the same enumeration copied into two or three deltas drifts when a later change adds an exit. Each copy is correct today, and deduplicating them means rewriting requirements the rulings above already settled — an edit for whichever change next touches the exits |

Every lens's own `not_checked` items are carried into *Questions still open after the council* rather than accepted or rejected here.

## Michael's Rulings

All 22 are `settled`; none is `joel`. Each entry is his ruling and what decided it, as he recorded it in `michael-council-rulings.json`.

### 1. Recall's block is part of context in turn

**Dispute:** the delta defines context in turn as the request as sent with the block in it, while *Recalled stands on its own* says the block is not folded into it and the saving subtracts it (C1 blocking; CAT-1 major).

**Ruled:** context in turn is the whole request as sent, with recall's block in it. Recalled is published as its own field — a part of context in turn, not a bucket taken out of it. The identity history before − context in turn = withheld − stubbed − recalled holds, provided every term comes from the same estimator and the same k. The README says the figures overlap and are not to be added together. A handler test asserts the two forms of the saving give the same number.

**Decided by:** Joel's own definitions in `owner-rulings.md` §The figures — context in turn is "the size of the resolved context for just this turn", and recalled is a "published figure", which asks for a figure of its own and not for exclusion. The provider's measured prompt always contains the block, so excluding it would force a measured value to subtract an estimate.

### 2. The per-request saving never mixes a measured term with an estimated one

**Dispute:** after the response, context in turn is measured while history before stays k × estimate, so the saving absorbs the error of predicting one request from the last (CR3 major).

**Ruled:** the saving is k × (withheld − stubbed − recalled), all three as estimates — equivalently the estimate of history before minus the estimate of context in turn. One k serves every term: the k sampled from that request's own valid response. It never subtracts a measured context in turn from an estimated history before; the measured value is published only as context in turn itself. The since-start total is the sum of these savings, counts tokens not sent, can exceed the context size, and is labelled *tokens not sent since start*.

**Decided by:** M3 — the request-to-request prediction error is about 340 tokens at the median against a median settlement saving of about 1,200, 21 % of the saving at the median and 130 % at p90. Mixing a measured term with an estimated one turns the saving into that error.

### 3. The savings pair publishes together at the response, with no status field

**Dispute:** the delta posts the token saving at the request and the dollars at the response, against S4 (ZO-2 major); C3 (major) asks for a status or request-identity field; §O7 was still open for what context in turn shows before the first request.

**Ruled:** the pair and both since-start totals update together at the valid assistant response (`message_end`); between responses the instrument keeps the last completed pair; the in-flight estimates go out at `context_with_system`; an aborted, errored or zero-usage response publishes nothing. No status field and no request-identity field — the *Two savings figures become known at different moments* scenario is replaced. Before the run's first request, context in turn carries total context's value with the same flag, because zero would claim an empty request beside a non-empty history.

**Decided by:** orientation S4 ("together with that request's token savings") and T21; J11 ("it should be a number, always"). Jefferson's variables read only the extension's own fields (`ReadingsView`), so a pending state would need a new field, and publishing at the response removes the only case it would mark.

### 4. One estimate flag, and it means uncalibrated

**Dispute:** the delta gives one boolean two meanings (C2 major), and a k seeded at resume is biased because the persisted projection lacks the recall block (C5 major; CR8 minor).

**Ruled:** one boolean, shared by every figure, meaning *uncalibrated*: no valid response in this run has calibrated k for the current model. It is on while k = 1, stays on while k has only been seeded from persisted usage, turns off at the first valid live sample for the current model, and turns back on when the model changes to one with no live sample. It never means *measured*. The README says every token figure is a calibrated estimate except context in turn after its response, and the dollar figures are counterfactual estimates. The seed stays, because it is far closer than k = 1, and keeps the flag on because the request it divides by is a reconstruction. The sentence making *measured* versus *estimate* the flag's meaning is deleted.

**Decided by:** J11; orientation S1 and T8 (the flag means not yet calibrated, never exact); T4 (the block is never persisted). `instrument-contract.ts` v0.14.0 takes one `ReadingsView` for all four instruments and k is one session value, so every figure shares the calibration state.

### 5. Total context is k × the persisted history, never the measured prompt

**Dispute:** the delta defines total context as the persisted history yet also re-anchors it at each response's usage, which includes the block and would make the bar saw-tooth (CR4 major); the re-anchor rule is pi's unexported `estimateProjectedContextTokens` (CB-3 major).

**Ruled:** "re-anchored at each response" means k is refreshed from that response. Total context is always k × the estimate of the persisted history after taiknr's edits, counting the system message as the request-side estimate does, and never the measured prompt, so a recall block never enters it. A scenario is added: on a recall turn, total context does not include recalled. The bar is total context ÷ window × 100. taiknr never uses pi's last-usage-plus-trailing-estimate figure, so nothing of that rule is reimplemented and CB-3's remedy is not needed.

**Decided by:** Joel's "we know the size of the new message history, we report this as total context usage"; T4. The host root exports `buildSessionProjection` and `estimateTokens`, which is all k × estimate needs, and the pair takes 0.32–0.80 ms on Joel's largest sessions.

### 6. A null publisher, chosen once

**Dispute:** where the instruments switch's gate lives — a real-or-no-op publisher at `session_start` (CR1, CB-6 major), a second gate condition (R1 major), or the proposal's "second condition in `src/app/extension/`".

**Ruled:** one new `session_start` publishing registrar, registered through the gated pi after `registerSessionStartHandler`, is the switch's only reader. With the switch on it builds the real publisher, emits the registration, posts every field and installs the publisher in a per-session holder built in `taiknr.ts`; with the switch off the holder keeps its no-op. Every other publishing handler calls the holder's current publisher and never tests the switch, and the arithmetic sits behind the publisher so the no-op computes nothing. `handler-gate.ts`, `SessionConfig` and `isActive()` are unchanged, there is no second gate condition, the proposal's Impact line is corrected, and a test fires every publishing event with the switch off and asserts no emit.

**Decided by:** J8 (only the instruments are absent); Q3(a) (register nothing); Jefferson v0.14.0 refusing an update from an unregistered extension. Jefferson dedupes that refusal per session rather than per update, which narrows R1's warning claim but does not remove it, so Q3(a) still holds.

### 7. The frozen-signature list becomes closed, measured against `abaa6b0`

**Dispute:** all four listed differences already exist at `abaa6b0` (CB-1 blocking); the list is not closed (R5 major); nothing on it lets the recall block or the classifier's cost reach the publisher (ZO-1, CB-5, CR2 major); CB-2 asks whether difference (5) may cover the cost.

**Ruled:** the scenario compares against `abaa6b0` and states (1)–(4) as part of the baseline and unchanged. This change's differences are a closed list, all additions: (a) the publishing registrars, one file each in `src/infra/pi-event-handlers/`; (b) `registerContextHandler`'s dependency object gaining the per-session instruments holder; (c) `createPiJevScorerAdapter` gaining an optional third parameter, the classifier observer; (d) `TaiknrConfig` and its default gaining the switch, which replaces the stale clause "`TaiknrConfig` itself gains `enabled`". Everything else stays as at `abaa6b0`. The MODIFIED requirement replaces the living spec's stale wording when the change is archived, so no separate edit is needed. CB-2's question is not Joel's: the freeze is a contract Michael approved, so the narrow revision is his to make.

**Decided by:** `AGENTS.md`'s "public signatures are fixed for the cards implementing behind them"; the living `extension-packaging` spec citing his own earlier rulings 3, 6 and 12; and `rg` over every archived `owner-rulings.md` finding no ruling on signatures. Q2(a) needs the classifier's usage, which exists only inside the adapter.

### 8. The classifier is observed at the scorer adapter

**Dispute:** §O2's seam — an infra wrapper around `RelevanceScorer`, a port member, or an observer on the adapter (ZO-1, CB-5, CR2 major); the reset's placement (R6, CR14); C6's "a few hundred milliseconds at most".

**Ruled:** `createPiJevScorerAdapter(ctx, config, observer?)` calls `observer.started(ids.length)` immediately before `ctx.modelRegistry.classify` and `observer.finished(result.usage)` on the line after the await, before the aborted, error and validation branches. `classify` never rejects, so that one line runs before every exit and no `finally` is needed; a catalog miss throws before any call and observes nothing. The `RelevanceScorer` port and `recallRelevantContext` are unchanged — no port member, no wrapper. `finished()` records the cost for that request's net dollars, subtracted at the response, absent usage counting as 0. *It only flashes* becomes "for as long as the call runs, up to `classifierTimeoutMs`". Tests: an aborted, an error, a timeout-shaped and a malformed-answer result each leave the indicator not running and each pass its usage on.

**Decided by:** Q2(a); J13; `model-runtime.js:568-580`, where `classify` turns every throw into a `classifierErrorResult`; and `ClassifierResult.usage?: Usage`.

### 9. Six publishing events, one registrar each

**Dispute:** §O1's events (CR5 major, R5 major, STRUCT-1, R3 major, CR12).

**Ruled:** six publishing events, each its own registrar, registered through the gated pi after the existing handler whose outcome it reads. `session_start` seeds k from the branch, registers and posts every field with no await, and malformed persisted usage is not a sample and never a NaN. `context_with_system` runs after recall's handler, publishes the request figures and records the pending request. `message_end` handles assistant messages only and returns nothing, because a returned message would replace pi's; it is the earliest point where the response's usage exists. `agent_settled` posts total context and the archive after the boundary commits. `session_compact` and `session_tree` re-post total context and the archive after re-hydration, and `session_tree` also reseeds k. `turn_end` and `agent_before_settle` publish nothing. AGENTS.md's "a handler registers exactly its one lifecycle event" means one event per registrar, not one registrar per event, so R5's reading is wrong.

**Decided by:** pi's `docs/extensions.md` (:420 the chained request hooks, :665 `agent_settled` for status integrations, :756-758 `message_end` firing for every role and a returned message replacing it, :350-359 the request-hook order), plus a scratch session that measured the order, that a second `context_with_system` handler sees the first's output, and that a throwing handler's error reaches `bindExtensions` `onError` while the request still carries the earlier handler's edit. The projection plus estimate took 0.32–0.80 ms on Joel's two largest sessions, so CR12's cost is negligible.

### 10. The packaging test keeps its form and lists every registration

**Dispute:** STRUCT-1, raised as an owner question — the set of distinct names, one entry per `on()` call with publishing folded in, or left to the design.

**Ruled:** none of the three. The test keeps its existing form and lists every `on()` call, duplicates kept: 13 entries — `session_start`, `context_with_system`, `session_compact` and `session_tree` twice each, `agent_settled` and `message_end` once each, plus the existing `agent_before_settle`, `tool_call` and `turn_end`. The scenario's wording becomes "the sorted list of every registration". A set would hide an accidental double registration; folding would widen the signature revision and put a publish throw inside recall's and hydration's handlers. Not Joel's.

**Decided by:** the test's existing form (`tests/app/extension/taiknr.test.ts` L5-22, which pushes each `on` call and compares the sorted list, through a Proxy that throws on any member but `on`) and ruling 9.

### 11. No new reporting channel

**Dispute:** where a caught publish failure reports (CB-2 major, as an owner question); one wrapping function (R6 major); a throw from an emit in a `finally` replacing recall's return (CR14).

**Ruled:** no new reporting channel and no new notifier; not Joel's, and no new user-facing notice. Publishing registrars do not catch — pi's runner catches per handler and reports on the extension error channel, which is the house convention, and recall's result, a boundary's drafts and hydration are untouched because they belong to other handlers. The only taiknr emits on recall's path are the classifier observer's two, and they, like every other emit, go through one Jefferson bus adapter that catches silently with a one-line comment citing `loader.js`: `pi.events.emit` can throw only from `assertActive` on a stale instance, and a notice's `ctx.ui` is stale in the same case, so there is nobody and nowhere to report to. Recall's once-per-session notifier (ADR 0002) is untouched. Tests: an emit that throws during the observer leaves recall's messages intact, and a throwing publishing registrar is recorded by the session harness's `onError` with the request still carrying recall's block. R6's "classify rejects" case is dropped: it cannot happen.

**Decided by:** `AGENTS.md`'s extension-error-channel convention; `event-bus.js` wrapping every listener in a try/catch; `loader.js:117-120` and `:426-430` (`events.emit` calling `assertActive`); `runner.js:626-628` (the stale `ui` getter); and `teardownCurrent` settling the active run before `session_shutdown` and invalidation.

### 12. pi never re-registers into the same Jefferson state

**Dispute:** R4 — it is unproven that pi emits `session_shutdown` before every `session_start`; if it does not, Jefferson refuses the duplicate instrument names and the instruments freeze.

**Ruled:** pi never sends a second `session_start` into the same Jefferson state. `/new`, `/resume`, `/fork` and import run `teardownCurrent` (abort, then `session_shutdown`, then dispose); `/reload` emits `session_shutdown` then invalidates, and invalidation unsubscribes every bus listener the old instance added; pi then builds a new runtime whose resource loader runs every extension factory again. So taiknr's registration is always the first in a fresh Jefferson, its in-memory state is fresh per factory with no reset code, the design states this and adds no guard, R4's two-`session_start` test is dropped because it tests a sequence pi never produces, and Joel's live `/reload` stays the acceptance check.

**Decided by:** pi's source — `agent-session-runtime.js:102-112` and `:147-172`, `agent-session-services.js:69`, `agent-session.js:3103-3104`, and `loader.js:146-155`.

### 13. "Current model" is pi's own rule

**Dispute:** keying the ratio by the request's pair (R7 major), the newest valid response (CR9), or reseeding at `/tree` (CB-7 major).

**Ruled:** pi's rule. The current pair is normally `ctx.model`'s (provider, id); under a virtual selection it is the (provider, model) of the newest valid response — pi's `routedModel` rule, with a shortcut comment on the `ctx.model.api === "pi-virtual"` literal because pi does not export `isVirtualModel`. Each k is held with the pair of the response it came from and used only while that pair is current; otherwise k reseeds from the branch's newest valid assistant message of the current pair, or is 1, flag on either way. Reseed at `session_start` and `session_tree`; `session_compact` keeps k, because the ratio belongs to the model. With `ctx.model` undefined, k is 1 and the flag is on.

**Decided by:** `agent-session.js:365-367` and `:1119-1124`, `virtual-models.js:6-10`, and Chidi C's ratios of 0.58–0.70 against 0.90–0.99, which show a model switch voids k. `ctx.model` resolves through `getModel()`, which is the virtual model under a virtual selection.

### 14. One publisher holds the state, with one writer per event

**Dispute:** the slot pairing a request's estimate with its response (R8 major), and where k and the in-flight estimate live (STRUCT-2 major, as an owner question).

**Ruled:** STRUCT-2's option (a), with the writer moved out of recall's handler. The real publisher holds k and its pair, the pending request, the recall block recall last reported, the last classifier usage and the since-start totals, with one writer per event; it is built per session by the `session_start` registrar and reached through the holder in `taiknr.ts`. The `context_with_system` registrar runs for every request after recall's handler whatever recall returned, overwrites the pending request every time with its estimate, the current pair, the recalled size and the classifier cost, then clears the reported block. The next assistant `message_end` consumes the pending request whether or not the response is valid and samples k only from a valid one; a request with no `message_end` is overwritten by the next; a `message_end` with nothing pending samples nothing; there is no reset at `session_start` because the factory runs again. Tests: an aborted, an errored, a zero-usage and a no-pending response, and recall returning nothing. Not Joel's.

**Decided by:** one fact, one place; the runner chaining `context_with_system` handlers (`runner.js:1040-1068`; `docs/extensions.md:420`); the factory running again per session; and `context.ts`'s five early returns, which all precede the next handler in the runner's loop.

### 15. Net dollars charge every rewrite taiknr causes

**Dispute:** the dollar requirement charges only the first warm request after a settlement, but recall's block is never persisted, so the next user turn re-writes the cache from that message onward (CR6 major).

**Ruled:** "net of cache rewrites" means every rewrite taiknr causes: the first warm request after any change taiknr made to an earlier message — a settlement's stubs, or a previous turn's recall block now missing from its user message. The requirement and its *A warm request after a settlement* scenario are reworded. The exact rule stays §O6's, worked out as a table of cases with numbers (R13). A cold request's rewrite is still not charged (T18).

**Decided by:** J12 ("Dollars too, net of cache rewrites"), and the fact that the block is appended to the latest user message and nothing persists it. The orientation's M4 left recall out, so its +$2.55 covers settlements only.

### 16. The shared test fake gains a bus

**Dispute:** CB-4 and R9 major — `createFakePi` has no `events`, so a broken publish passes every handler test silently, and the context stub has no projection.

**Ruled:** `tests/support/fake-pi.ts` goes on the design's file list as Modify, with an `events.emit` that records every `{ channel, data }` in call order, an option that makes `emit` throw, and `buildSessionProjection` — plus `getEntries` if the design reads it. The load test keeps its fake that allows only `on`, which now also proves the factory touches nothing but `on`. Handler tests assert on the recorder, and a recorder no test asserts on is a finding at the gate.

**Decided by:** the existing fakes and the load test's "touches nothing else".

### 17. `verbatimModuleSyntax`

**Dispute:** R10 major and CR10 — nothing automated proves the import-type and boundary rules, and Biome only warns.

**Ruled:** add `"verbatimModuleSyntax": true` to `tsconfig.json`, with no test scanning the source. The existing git-archive load check, which has no `node_modules`, is named as the runtime backstop. The delta's claim that the `type` keyword is the only thing keeping Jefferson out at runtime is corrected: pi's loader already erases a non-`type` import used only as a type, and the rule's real source is Jefferson's contract — plain Node will not strip types under `node_modules`, so a provider imports it with `import type`. The boundary and one-reader scenarios stay `rg` checks in review.

**Decided by:** a measurement in a mktemp copy — with the flag on and `tsconfig.json` Biome-formatted, `npm run check` passes at 22 files and 328 tests; `import { Registration }` fails `tsc` with TS1484 while `import type` passes; and loads from bare copies with no `node_modules` succeed for `import type` and for a non-`type` import used only as a type, while a namespace import used as a value fails to load. Plus `instrument-contract.ts` v0.14.0's header.

### 18. The publishing cost is accepted

**Dispute:** readiness's owner question — bound the cost when Jefferson is absent, or accept it; CR12 also flags the unmeasured projection rebuild.

**Ruled:** not Joel's; accept the cost with no guard. Jefferson has no reply channel, so taiknr cannot know whether anyone is listening; building and estimating the projection takes under 1 ms on Joel's largest sessions; and taiknr publishes only at the six events of ruling 9, not at every `message_end` of every role.

**Decided by:** the measurement (0.32–0.80 ms per projection plus estimate on 14 MB sessions) and `research-chidi` A3.

### 19. Rollback and version skew are recorded, not fixed

**Dispute:** R2 major — an older taiknr rejects any config file that sets the new key, which turns taiknr off for that session.

**Ruled:** this is inherent in the rule that rejects unknown keys and in Joel's ruling that a rejected file turns taiknr off. `design.md`'s Migration Plan records two things: the key must be removed before a downgrade, and a rollback leaves Jefferson's "not a known instrument" warning for each `taiknr.*` row. Neither is a task and neither needs code, and the README's row for the field stays because the configuration delta requires it.

**Decided by:** Joel's 2026-11-14 ruling that a malformed file means nothing for that session, and the configuration spec's rule rejecting unknown keys.

### 20. The README says what the savings are net of, and that they are signed

**Dispute:** STRUCT-4, as an owner question — whether the README must state what the savings figures net and that they are signed.

**Ruled:** not Joel's. One scenario is added to the documentation requirement: the README says the savings figures are net of the rewrite charges and of recall's reported classifier spend, are signed, and can go negative early in a session. It is minor, it does not hold the gate, and Bambadjan writes the text in the docs pass.

**Decided by:** J10 ("don't misinform users"), J12 and Q2(a) making netting ruled behavior, T19, and Joel's standing ruling that documentation never blocks. M4's running total was −$0.007 mid-session.

### 21. The documentation requirement says what the instrument resolves, and how far

**Dispute:** C4 major — the requirement says taiknr's instrument "resolves" pi's measurement and calculation issue, while pi's compaction check is unchanged and the size of the gap depends on the model.

**Ruled:** the instrument resolves the confusing reading and does not change pi's calculation. The requirement is reworded: taiknr's context figure gives a figure to watch that does not jump; pi's own pre-run compaction check still runs on pi's estimate and so runs low after a settled run (T2); how large the gap is depends on the model, about 40 % on Anthropic and a few percent on deepseek. In effect documentation wording, so minor.

**Decided by:** J6, T2 (`agent-session.js:2576-2579`), and Chidi C's per-model ratios.

### 22. The window is an input field, and zero means unknown

**Dispute:** CR7 minor — the bar needs the window as a posted field; a report cannot carry null, and the delta forbids placeholders.

**Ruled:** the window is an input field, not one of the six figures, so the "never a placeholder" rule does not apply to it. When `ctx.getContextUsage()` is undefined it posts 0, and the bar returns `null` for a window ≤ 0, which draws an unfilled track. The delta's *No window* scenario states this.

**Decided by:** `instrument-contract.ts` v0.14.0's `bar` comment ("`null` draws the track unfilled, `undefined` is unknown") and `research-chidi` A1 (a report cannot carry null).

## Owner Decisions Required

None. All 22 of Michael's rulings are `settled`, and he marked none `joel`. Every owner question the lenses raised was answered in a ruling: STRUCT-1 by ruling 10, STRUCT-2 by ruling 14, STRUCT-4 by ruling 20, readiness's publishing-cost question by ruling 18, and codebase's two by rulings 11 and 7 — the last with his explicit note that the signature freeze is his own contract to revise, not Joel's. Every lens finding no ruling covers was a minor one the lens disposed of on its own reason, above. Nothing here needs Joel before `design.md` is drafted, so the PL2 gate opens on this document.
