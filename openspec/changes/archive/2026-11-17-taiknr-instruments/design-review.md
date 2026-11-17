# Design Review

The review ran over `design.md` in four stages with fresh contexts: a zoom-out, a comprehension test, a critic loop with Michael as Resolver, and a second zoom-out over the edits the first three stages made. Every finding and every resolution is in this directory under `design-review-s*.md` and `michael-resolve-*.json`; Joel's own rulings are quoted in `owner-rulings.md`.

## Stage 1: Initial Zoom Out

`council-zoom-out` read `design.md` against `zoom-out-standard.md`, covering simplicity, YAGNI, Clean Architecture layer flow, module placement and TRIZ contradictions. Its recommendation was to revise two things and proceed: "The feature is justified, its proposed files have named owning layers, and it reuses the archive, recall bridge and host estimator without introducing a parallel telemetry system."

**ZO-S1-1 (major) — the switch-off path still computes.** The no-op publisher is selected correctly, but `pi-instrument-readings.ts` sits upstream of it with nothing saying how its evaluation is deferred. D2 had the registrars read request and projection estimates before calling the publisher, and D3 named only the sink and observer as outside interfaces. Choosing a no-op would then suppress posts but not instrument-only estimation and projection work, against D1 and approved ruling 6. The switch-off test asserted only that no emit reached the bus, so it could not catch this. The lens recommended a deferred plain-reading callback the no-op never invokes, with the disabled-path test extended to assert the readings are not evaluated.

**ZO-S1-2 (minor) — the cumulative token label loses its meaning.** The proposed default format rendered `savedTokensSinceStart` as "since … tok" under "taiknr save", where ruling 2 and `specs/context-figures/spec.md` require the default label to say "tokens not sent since start". A cumulative count repeatedly credits the same stub and can exceed the whole context window. The fix is one format string, with no new field.

Three of the lens's assumptions were verified (the existing store, recall formatter and host estimator supply the inputs; the proposed directories match the repository's ownership and dependency conventions; the approved council rulings were not reconsidered). One was left unverified: that the disabled path could defer its host readings at all, which the design did not then specify. It ran no tests and made no edits.

## Stage 2: Comprehension Test

`council-comprehension` read `design.md` alone, with no access to research, rulings, specs or source, and paraphrased it first.

**What this proposes (naive paraphrase):**

> The design adds four Jefferson instruments that report estimated context, archived material, savings and classifier activity. A per-session publisher reads host data at six lifecycle events, calibrates estimates against response usage, and models token and dollar savings. A default-on switch controls whether the publisher is installed; the existing archive and recall behavior are intended to remain unchanged.

**How the existing system works, per design.md:**

> Taiknr stores original tool output alongside replacement stubs, reconstructs that store from the session branch, and can append recalled material to a user message. Pi's own context figure can fall back to a character-based estimate after an edit, and the document reports that this underestimated actual prompts in one session. Jefferson accepts instrument registrations and updates, but does not tell an extension whether anyone is listening; taiknr currently records no token sizes and publishes no instruments.

The lens's recommendation was to "revise the design to make calibration, event data flow, reporting, and failure isolation implementable from the document alone."

**Unstated assumptions and undefined terms it flagged.** Eleven findings, two of them blocking:

| Id | Severity | Flagged |
|---|---|---|
| C1 | major | The archive and lifecycle vocabulary (settlement, stub, boundary, hydration, branch, projection, recall) is used before the document explains it, and citation keys (J, T, M, ruling-N, CR, CB, R, ZO) have no key. |
| C2 | blocking | Calibration seeding and model-pair transitions are not implementable: the pair's members, a historical sample's denominator, which sample wins, the fallback k, and the reset rule are all unstated. |
| C3 | major | Nothing says how a response's new k and measured `contextInTurn` reconcile with the request-only figures, so the on-screen identity breaks after every response. |
| C4 | blocking | The data and matching rules for a vanished recall block and for new stubs are incomplete: `{ estimate, messageIndex }` cannot tell whether the next request still carries that block, and duplicate or moved stubs have no rule. |
| C5 | major | A partial `Publication` cannot make a missing figure a compile error, contrary to D3's claim, and the update payload's completeness scope is unstated. |
| C6 | major | Failure isolation on recall's path is asserted but not assigned: no layer is responsible for catching a throw from the observer or from `reportRecalled`. |
| C7 | major | The classifier observer's completion and spend lifecycle is undefined for rejection, for several calls in one request, and for clearing between requests. |
| C8 | major | The system message's source at each event, and the delivery of recall's modified messages to the request registrar, are not explained. |
| C9 | major | Invalid and incomplete response and cost data are only partly specified; there is no stated outcome for a valid usage with a bad cost, or a response with nothing pending. |
| C10 | major | The switch's file and layering are unstated, and the runtime Jefferson listener is not separated from the types-only devDependency. |
| C11 | minor | The design delegates its exclusions and the frozen-contract list to unnamed external content. |

Its own assumptions: the doc-only brief (verified); Jefferson requiring the field-completeness behaviour the design states (unverified); host handler ordering and error isolation behaving as the design claims (unverified). It raised no owner questions.

## Stage 3: Critic Review Loop

Five rounds. `council-critic` and `council-structural` ran against `feature-spec-standard.md` in each, Michael resolved every finding, and the loop stopped at two consecutive clean rounds: rounds 4 and 5. That is one round short of the five-round cap, and no round hit a churn stop. Thirty findings were raised in Stage 3; no round re-opened a finding Michael had already settled.

| Round | `council-critic` | `council-structural` | Michael |
|---|---|---|---|
| 1 | 10 (CR-S3-1…10): four major — the warm rewrite charge running to the end of the request; a new recall block priced at the read rate; a fault in the instruments dropping recall's block or spending its once-per-session notice; `tests/infra/pi-event-handlers/context.test.ts` left out so `npm run check` goes red. Six minor. | 5 minor (STRUCT-R1-1…5): D2 drifting from D5's field list; a response state left unplaced; unstated inputs in dollar row 8; a hedge on a file that exists; an uncited measurement. | `needs_fixes` |
| 2 | 4 (CR-S3-R2-1…4): one major — the rewrite baseline advancing at every `requestBuilt`, so a retried or aborted request leaves the next priced request with nothing pending; three minor. | 4 (STRUCT-R2-1…4): one major — one `rehydrated` method serving two events with different readings and different writes; three minor. | `needs_fixes` |
| 3 | 1 major (CR-S3-R3-1): the settled, compacted and tree-jumped readings carry no current pair, and the pending request is the only other place one is held. | 3 minor (STRUCT-R3-1…3): the delta's rewrite baseline one ruling behind; `Pair`'s declaring module unstated; the docs pass citing a delta that carries no documentation requirement. | `needs_fixes` |
| 4 | 1 minor (CR-S3-R4-1): the pending request's stored pair has no reader, and two sentences still point at it. | 1 minor (STRUCT-R4-1): the Context calibration claim states one session's error at the scope of four, understating the worst. | `clean` |
| 5 | none. | 1 minor (STRUCT-R5-1): switch-off silence listed as content of a use-case test that cannot hold it. | `clean` |

Michael escalated his own churn three times. Stage 2's remedies for C4, C6 and C9, and the Stage 1 amendment, were the source of several round-1 findings, so each fix that landed on that patched scope went to Joel as C8, OD1–OD3 and OD4–OD6. After Joel's standing rule of 2026-11-16, a churn fix Michael had measured and stated as his pick was settled by that pick, which closed OD3's successors and rounds 3–5 without a further escalation.

## Stage 4: Intermediate Zoom Out

`council-zoom-out` audited the edits Stages 2 and 3 made and found nothing. Its verdict: "The Stage 2 and Stage 3 corrections add necessary contracts and regression cases, not new architectural layers or neighboring features. The design retains the existing archive and recall inputs, inward dependency flow, six approved publishing registrars and one per-session publisher; no material altitude regression warrants another design revision."

It verified six things in reaching that. The proposed locations still match the repository's directories and ADR 0001's direction; the store, recall formatter and request bridge still supply the inputs with no parallel accounting pipeline; the Stage 1 disabled-path concern is answered by deferred plain-data readings the no-op never evaluates, with the disabled-path checks in the registrar tests rather than the use-case test; the Stage 1 label concern is answered by a default format that says "tokens not sent since start"; the later corrections stay inside the approved behaviour (response-owned pairs, per-event pair readings, live-ratio retention, the deferred recall calculation, and a baseline promoted only by a priced response); and the added reading shapes, response-state table and numerical regression examples are boundary contracts, with the `compacted`/`treeJumped` split adding no file or layer. It ran nothing: no test, no load check, no dependency install.

## Michael's Resolutions

Forty-three findings across the four stages. Michael applied 29 as `propose_fix`, declined one, and escalated 13 as seven questions; no finding was contested and none was sent to `prototype`. The applied fixes went to `design.md`, and to `specs/context-figures/spec.md` where the finding named the delta.

**Applied to the artifacts (`propose_fix`, 29).** Stage 1's two, Stage 2's nine, and 18 from Stage 3. The ones that changed the design's substance rather than its wording, each with the evidence Michael cited:

- **C1** added an "existing flow the instruments read" table and a citation key, pointing at `ARCHITECTURE.md` §11 for the definitions rather than restating them.
- **C2** added D7's Calibration block: the pair, sample validity, the live sample, the branch seed, the per-pair ratio table and the flag. Measured in a faux session: at `agent_settled` the persisted estimate matched the request's own, and the branch held a `system` entry.
- **C3** fixed the identity across a response by re-posting every k-scaled field with the new k, and cited a 100,000-pair `Math.round` run for the rounding claim.
- **C4** made the request a plain-data reading and gave the recall block and stub matching exact rules, measured against the real formatter, extractor and stub builder.
- **C5** replaced the compile-error claim with what the compiler does catch (a misspelt key anywhere, a missing key where the value is typed `FigureValues`), measured with `tsc`.
- **C6** stated the recall-path catch boundary and corrected ruling 11's test.
- **C7** stated that `classify` never rejects, so `finished` covers every exit, and replaced "the last classifier spend" with `unchargedSpend`.
- **C9** added D8's response-state table, one row per assistant `message_end` state.
- **C10** stated the switch's file and layering and separated the runtime listener from the types-only devDependency.
- **CR-S3-4** added the omitted `context.test.ts` row and narrowed ruling 11's second test, since no real input makes a publishing registrar throw.
- **CR-S3-5** reordered `sessionStarted` to read, build, register and post, so a throwing reading leaves the visible "not a known instrument" state instead of four blank rows.
- **CR-S3-8** and **CR-S3-R2-3** restated the projection cost per event, after the request reading stopped paying for a window.
- **CR-S3-9** fixed what `finished` leaves in `decidingItems`.
- **CR-S3-10** and **STRUCT-R1-3**/**-4** completed dollar row 8's inputs, added the table's rates line, and removed a hedge on a file the tree settles.
- **STRUCT-R1-1** made D2 point at D5's "Written at" column instead of restating it.
- **CR-S3-R2-4** conformed four lines of `specs/context-figures/spec.md` to the ruling on live ratios and response pairs.
- **STRUCT-R2-2** dropped the request reading's dead window, and **STRUCT-R2-3** placed `FigureKey`, `FigureValues` and `Publication` in the use case.
- **CR-S3-R3-1** gave every event reading a `pair` from one `readPair(ctx)`, measured in a faux session: `session_tree` fires after the branch moves, and at `agent_settled` the reply is on the branch.
- **STRUCT-R3-1** conformed the delta's rewrite baseline to "the last priced request".
- **STRUCT-R3-2** declared `Pair` in `src/domain/calibration.ts`.
- **STRUCT-R3-3** cited the deltas that actually carry the documentation requirements.
- **CR-S3-R4-1** removed the pending request's unread pair and keyed the live sample on the response's own, modelled over a routed pair change.
- **STRUCT-R4-1** restated the Context calibration claim to match `research-chidi.md`'s table: medians 0.02–0.04 % and a worst of 5.62 % over four long sessions, 8.83 % over three short ones.
- **STRUCT-R5-1** deleted the switch-off phrase from the use-case test row, where the fact already has two homes.

**Declined (1).** **C11**, which asked the design to restate `proposal.md`'s exclusions and the `extension-packaging` delta's closed list. `feature-spec-standard` §1 keeps one home per fact, and the design already names both documents; C11's other half, the unexplained identifiers, was closed by C1's citation key.

**Contested and accepted-risk items.** No finding was contested with evidence against it. Four were closed as accepted risk, recorded under Settled Findings: ruling 11's second test getting no taiknr file, a reading that cannot be tested from taiknr's side, and the two spec-level facts Michael established rather than amended.

## Settled Findings

**Carried through every round, not re-opened.** ZO-S1-1 did not re-open rulings 6–9: the holder and its no-op shape, the switch's single reader in `instruments-session-start.ts`, the six publishing registrars and the scorer-adapter observer all stand. The Stage 1 fix was only the deferred reading, plus declaring the holder's interface in the use case.

**Closed by evidence, so no artifact states them as open:**

- `classify` never rejects — `model-registry.js:91` documents it and `model-runtime.js` wraps the call in a `try`/`catch` returning `classifierErrorResult`. The observer's `finished`, on the line after the `await`, therefore runs on every exit, and needs no rejection path and no `finally`.
- pi 1.5.2 persists the system prompt as a `role: "system"` message entry. `context_with_system`'s `event.messages` and `buildSessionProjection().messages` carry the same system messages, measured identical in a faux session, so no separate system-prompt source and no `getSystemPrompt()` read is needed.
- Archived stubs are unique, because each embeds its entry id (`src/domain/archived-output.ts:52`). Duplicate stubs are not a matching case.
- `reportRecalled` takes `read: () => ({ estimate })`, the unread `messageIndex` having been dropped as a field with no consumer. The recall block's identity comes from the request reading's `latestUser`, which receives recall's returned list, and the block's message from that reading's `latestUser.index`. The real `reportRecalled` stores that reading, and `requestBuilt` takes and clears it as its first statement before evaluating it.
- Total context at `message_end` includes the response that just landed — Joel's ruling of 2026-11-16, `owner-rulings.md`, "Design review escalation — total context at the response". The persisted estimate there is Σ `estimateTokens` over `buildSessionProjection().messages` plus `estimateTokens(event.message)`.
- A request estimate is a positive integer, because `estimateTokens` returns `Math.ceil(chars / 4)` (`compaction.js:201–251`). `Math.round((prompt ÷ estimate) × estimate) === prompt` therefore holds for every integer prompt below 2^51, and a denormal estimate is not a case.
- pi 1.5.2 retries a retryable assistant error by default (`settings-defaults.js:17–20`). It omits the failed attempt from the projection with a null `context_edit` (`agent-session.js:902–925`, `3212`) and sends the retry through `context_with_system` with an identical message list. Measured in a faux session in a `mktemp -d` copy of `abaa6b0` (pi 1.5.2, Node v26.8.1, vitest 5.1.0).
- The publisher remembers no current pair between events. Each event's reading carries the current pair, taken at that event by one `readPair(ctx)`. pi emits `session_tree` after `sessionManager.branch(newLeafId)` (`agent-session.js:3500–3517`), and at `agent_settled` the reply is on the branch; both were measured in a faux session.
- The pending request stores no pair (CR-S3-R4-1). The live sample is keyed on the response's own pair, its message's `provider` and `model`, passed eagerly.
- `Pair` is declared in `src/domain/calibration.ts` and imported inward by the use case, the infra readings and the tests (STRUCT-R3-2; ADR 0001).
- `ctx.getContextUsage()` stays the source of the window: `ctx.model.contextWindow` would be the virtual model's window under a virtual selection, where pi reads `_limitsModel()` (`agent-session.js:365–367`). The request reading does not read the window.
- `tests/infra/adapters/pi-jev-scorer-adapter.test.ts` exists at `abaa6b0`.
- Switch-off silence is tested in the six publishing-registrar tests' switch-off pairs and in the no-op's own test in `tests/app/extension/instruments-holder.test.ts`. It is never tested in the use-case publisher test, because the no-op lives with the holder in `src/app/extension/` and the switch has one reader (STRUCT-R5-1).

**Accepted risk.** Ruling 11's second test, a throwing publishing registrar recorded by `onError`, gets no taiknr file. No real input makes a publishing registrar throw, and what the test would check is pi's per-handler catch, measured in the council's scratch session. The review also carries limits no artifact can close: Jefferson's repainting and registration acceptance are Joel's own live check, and provider cache-marker behaviour beyond Anthropic was not audited.

**Rulings on escalated findings.** OD1–OD6, in Owner Decisions Required below.

## Owner Decisions Required

None open. Seven questions were escalated to Joel during this review and he ruled on all seven on 2026-11-16, each choosing option (a). His words are quoted in `owner-rulings.md`; this section records Michael's recommendation, which is what the ruling followed.

**Stage 2, C8 — does total context at `message_end` include the reply?** Michael recommended (a), include it, and land the rest of C8's fix with it: D2 states that pi hands each `context_with_system` handler the previous handler's returned `messages`, and D7 defines the persisted estimate as the projection plus `estimateTokens(event.message)`. He escalated because his own Stage 1 remedy had added the projection estimate to that reading without measuring when pi persists the reply. **Ruled → (a)**, recorded under "Design review escalation — total context at the response".

**OD1, from CR-S3-1 and CR-S3-2 — should the rewrite charge cover only what the previous request had cached, and should a new recall block be priced at the write rate?** Michael recommended (a): `suffixEstimate` = Σ `messageEstimates[start, previousLength)`, with the block at the write rate when its message is in the new tail. Measured on Joel's `…01a1dd10`: the current rule charged $0.5356 over 34 warm settlements against $0.2382, and the new tail being charged had a median of 1,427 tokens. He also declined the critic's own remedy, which prices a block that changed on a carried message twice. **Ruled → (a)**, under "Stage 3 round 1, OD1–OD3".

**OD2, from CR-S3-3 — should a fault in the instruments' own computation stay off recall's result?** Michael recommended (a): `reportRecalled` stores its reading and `requestBuilt` evaluates it, so a throw lands in the publishing registrar, which pi's runner catches on its own, after recall's messages have been returned. No new catch and no signature change. He declined widening the bus adapter's catch, which would silence a defect at every event. **Ruled → (a)**, same section.

**OD3, from CR-S3-6, CR-S3-7, STRUCT-R1-2 and STRUCT-R1-5 — four minor corrections to the previous round's text.** Michael recommended (a), all four: the response uses its own pair's k and flag; `session_tree` keeps live ratio entries and reseeds the rest; D8 row (4) covers a pending estimate not above 0; and the rounding claim gets its citation. Each corrects an error in his own Stage 2 remedy against a decision already in play. **Ruled → (a)**, same section.

**OD4, from CR-S3-R2-1 — should the rewrite baseline move only when a response prices its request?** Michael recommended (a): `requestBuilt` stores a candidate and only response rows (1) and (2) promote it, so a rewrite is charged exactly once, on the first priced request after it. Measured in a faux session: a retryable error was retried, `context_with_system` ran twice with identical lists, and the stop reasons were `error` then `stop`. The two rules over that sequence differ by $0.0621. **Ruled → (a)**, under "Stage 3 round 2, OD4–OD6, and a standing rule".

**OD5, from STRUCT-R2-1 — should `rehydrated` split into `compacted` and `treeJumped`, and what happens to a seeded ratio whose pair has no seed on the new branch?** Michael recommended (a): one method per event, six in all, with a pair holding neither a live entry nor a new seed losing its entry, so its k is 1 and its flag is on. Neither part was new — ruling 14 and the `context-figures` spec's *One ratio per model* already decided them. **Ruled → (a)**, same section.

**OD6, from CR-S3-R2-2, CR-S3-R2-3 and STRUCT-R2-4 — three minor corrections to the previous round's text.** Michael recommended (a), all three: `requestBuilt` takes and clears the stored recall reading first; the Risks row counts projections per event; and D2's compact and tree cells state only what changes, with D4 and D7 owning what is kept. Run as a model, the ordering fix changed a stale `recalled` of 3000 to 0 on the following request. **Ruled → (a)**, same section.

Joel's answer to OD4–OD6 also set a standing rule for the rest of this change: a churn fix Michael has measured and states as his pick is settled by that pick, while a question about product behaviour, a user-facing contract, scope or cost still comes to Joel. Rounds 3–5 were resolved under it.
