# Design Review

The four-stage fresh-context review of `design.md`, resolved by Michael as retained Oracle. Every finding below is reported as the lens that raised it made it, and every resolution as Michael's. Joel's rulings are quoted only in `owner-rulings.md` and are pointed to, never restated.

The run raised 61 findings across the four stages. Michael resolved all 61 with `propose_fix`; none was contested, escalated, declined outright or sent to a prototype. Stage 3 ran six rounds, past the five-round cap under Joel's 2026-11-17 cap ruling, and ended at round 6, the first round with no blocking or major finding needing a fix.

## Stage 1: Initial Zoom Out

`council-zoom-out` against `zoom-out-standard.md`. Recommendation: **request changes**. Four findings, two major and two minor.

| ID | Severity | Finding |
|---|---|---|
| S1-ZO-1 | major | §4.3 step 3 tested the opposite fingerprint relationship from D5 and the binding "state homes" ruling, so the ordinary `[U,R]→[U]` handoff received no carry while a shifted message did. |
| S1-ZO-2 | major | The ordered algorithm counted the budget before the OAuth carve-out and returned unchanged on no-fit, so the carve-out never ran and the measured two-point OAuth strategy could not apply. |
| S1-ZO-3 | minor | The design added a no-op publisher method although the existing `responseReceived(response, read)` boundary already defers every response reading and evaluates none when publishing is off. |
| S1-ZO-4 | minor | §4.3's seven-step clone/edit/return recipe dropped from boundary contracts to implementation altitude, duplicating D2–D6 and already disagreeing with them on the fingerprint test, the carve-out order and the record commit. |

The lens verified three assumptions: the recall-text cell and payload-coordinate carrier record are binding choices; the handler and adapter belong in the existing infra directories with pricing in domain and publication in use cases; and no existing payload-cache editor or installed dependency should replace the small provider-specific adapter. One assumption was left unverified: that Joel's attribution route exposes `ctx.model.baseUrl` on `api.anthropic.com`. That was measured in Stage 3 round 1 and settled there.

Michael resolved all four with `propose_fix` (`zo1-1`–`zo1-4`). `zo1-4` replaced §4.3's recipe with a single adapter contract covering inputs, output, untouched payloads, covered payloads, commit and replays.

## Stage 2: Comprehension Test

`council-comprehension`, strictly document-only over `design.md` alone. Recommendation: **revise before implementation** to make marker identification, pricing inputs, failure-state cleanup and live validation reproducible from the document. Eight findings, six major and two minor.

**What this proposes (naive paraphrase):**

> The design adds a provider-request handler that copies and edits cache markers on eligible Anthropic-format requests, placing one before a recalled block and another on the preceding carrier when a later request hands off. It keeps per-session state to identify those locations and passes the finished placement to the existing savings publisher so the estimated rewrite and block charges reflect the edit. The handler fails open, and automated and live checks are intended to verify payload shape and caching behavior.

**How the existing system works, per design.md:**

> According to the document, recall appends a block to a user message and pi places its message cache marker on that block, causing a later request to rewrite a prefix rather than read the desired cache entry. The existing publisher estimates rewrite costs from a baseline in context coordinates and uses a warm gate to avoid charging for cold cache expiry. Provider requests already pass through a gated handler system, while the response registrar supplies deferred readings to the publisher.

| ID | Severity | Finding |
|---|---|---|
| CC-1 | major | The design never said how to identify pi's last-message marker or tell it from another extension's. |
| CC-2 | major | The stated `applied` value did not explain how the publisher locates the new rewrite boundary in its context-coordinate baseline. |
| CC-3 | major | The three-request block-pricing transition was not defined in terms of the available state and the new `PricedRequest` field. |
| CC-4 | major | The fail-open contract did not say how state is reset if an exception interrupts the adapter before its commit step. |
| CC-5 | major | Carrier selection and marker placement were underspecified when exact matches are not unique or a target block is already marked. |
| CC-6 | major | The live validation and triage procedure was not reproducible from the design. |
| CC-7 | minor | The mechanism that resets per-session in-memory state on `/new`, `/reload` or session replacement was not stated. |
| CC-8 | minor | Settlement stubs, Joel's attribution route and the Jefferson/instruments role were used without enough context to understand scope and validation. |

Michael resolved all eight with `propose_fix` (`cc2-1`–`cc2-8`). `cc2-1` replaced position-based marker recognition with a count-based rule; `cc2-2` supplied the context-coordinate mapping through `applied.carrierRead`; `cc2-3` replaced the block rule with a two-state transition carried on the publisher's baseline; `cc2-4` made the adapter one pure function with the commit after it returns; `cc2-6` rewrote the live procedure as a committed script; `cc2-8` added a Terms paragraph.

## Stage 3: Critic Review Loop

`council-critic` and `council-structural` against `feature-spec-standard.md`, looping with Michael as Resolver and Bambadjan patching `design.md`.

**Convergence.** Six rounds. The five-round cap was passed under Joel's 2026-11-17 cap ruling, which drops the two-consecutive-clean-rounds requirement and ends the loop at the first round with no blocking or major finding needing a fix. Round 2's churn was settled under Joel's standing churn rule: 9 of its 12 fixes landed on sections round 1 had patched, all wording or consistency follow-ups to Michael's own remedies. Round 6 is that first round.

| Round | Critic | Structural | Major | Minor | Total | Outcome |
|---|---|---|---|---|---|---|
| 1 | 11 | 7 | 3 | 15 | 18 | needs_fixes |
| 2 | 7 | 5 | 2 | 10 | 12 | needs_fixes (churn) |
| 3 | 4 | 3 | 1 | 6 | 7 | needs_fixes |
| 4 | 4 | 3 | 2 | 5 | 7 | needs_fixes |
| 5 | 1 | 2 | 2 | 1 | 3 | needs_fixes |
| 6 | 1 | 1 | 0 | 2 | 2 | clean |
| **Total** | **28** | **21** | **10** | **39** | **49** | |

**Round 1 — 18 findings, 3 major.** The critic's two majors were that record (b) was committed inside the payload hook, so pi's auto-retry, the strict-tools fallback and a warm replay each dropped the carry on the handoff request the change exists to fix (CR-1), and that Joel's two live routes could not force recall to fire because nothing set `decisionThreshold: 0` for them (CR-2). The structural major was that §4.3 stated two opposite rules for when the carrier record is rewritten (S3-STRUCT-1). The fifteen minors covered the `applied` derivation on a coincident carry, the depth of the marker count, the budget-1 tail cost, a false `/model` claim in a spec scenario, the attribution route's `baseUrl`, virtual models, two proposal statements the design had made false, the discrimination run's assertion order, non-text fingerprints, the state module's type home, the split surrogate rule, the budget rule's four homes, the `blockUncached` fold point, header numbering and the `applied` write-read window.

**Round 2 — 12 findings, 2 major.** The critic's major was that the context-figures delta still required the block-pricing defect D8 says it fixes (CR2-1). The structural major was that the placement table gave D7's rewrite-charge start to `savings-dollars.ts` while D7 and §5.4 compute it in the publisher's `rewriteOf` (S3R2-STRUCT-1). The ten minors covered two unread `AppliedPlacement` fields, a replay scenario contradicting §5.3 (6), the surrogate row on Joel's route, the live script's relative extension path against a temporary cwd, the carve-out stripping a foreign system marker, two inflated claims in D5 and §11, the §5.1 contract block showing one `register` for two events, a D4 residual, the budget formula's two homes and an unresolvable "design D8, row 11" citation.

**Round 3 — 7 findings, 1 major.** The critic's major was that a tail-recall billing scenario said every request carrying recall's block bills it as input, which holds only on a handoff that also recalls (CR3-1). The six minors covered the marker walk counting `cache_control` keys that are not markers, two overlapping `before_provider_request` emissions writing the single `nextCarrier`/`applied` cells, D1's unstated `baseUrl` matching rule, the §5.2 field count, a misdirected inertness citation and an unanchored "measured" claim in §8.2.

**Round 4 — 7 findings, 2 major.** The critic's major was that the new "In-turn requests" scenario contradicted its own evidence: a second request after a handoff that also recalls writes the block as well as the step (CR4-1). The structural major was that count-based recognition edits a payload pi marked nowhere whenever another extension's lone message-level marker is present, diverging from ruling 1 and two spec scenarios with the divergence recorded nowhere (S3R4-STRUCT-1). The five minors covered missing proof for the before-point-only request, D8's null-`block` wording against §11, the budget-1 tail cost and a provider that never calls `onPayload`, §12 naming an item it had already decided, and the docs pass correcting `AGENTS.md`'s stale live-script trap but not `ARCHITECTURE.md`'s copy of the same claim.

**Round 5 — 3 findings, 2 major.** The critic's major was that a top-level `cache_control` is automatic caching, so the budget-1 example the design used actually leaves the block and tail cached, and the figure would over-charge where §7.3 and the README recorded an under-report (CR5-1). The structural major was that §4 changed the frozen public signature of `registerInstrumentsResponseHandler` while `AGENTS.md:23` fixes those signatures with one enumerated exception (S3R5-STRUCT-1). The minor was that the §8.1 ordering test asserted "leaves `carrier` unchanged", which is vacuous for that handler.

**Round 6 — 2 findings, 0 major.** Both lenses passed. The critic's minor was that no §8.1 test pinned D8's new `carried === undefined` clause (CR6-1). The structural minor was that D5 restates in full the carrier-identification mechanics §5.3 (4) owns (S3R6-STRUCT-1). Michael resolved both with `propose_fix` and recorded the round as `clean`.

## Stage 4: Intermediate Zoom Out

`council-zoom-out` auditing the Stage 2–3 edits for bloat or altitude drops. Recommendation: **pass with no new actionable findings**. Zero findings.

The lens confirmed that the Stage 2–3 edits retain one provider-specific adapter, thin gated lifecycle handlers, use-case-owned plain contracts, inline composition-root state and the existing deferred publisher reading. It found that the added commit boundary addresses measured retry and replay behaviour rather than introducing a cache-management layer, and that the detailed contracts and acceptance procedure implement settled remedies without adding speculative abstractions, configuration, dependencies or neighbouring scope. It verified that the Stage 1 fingerprint and normalization-order regressions are corrected, that placement follows the inspected repository, that `payload-cache-commit.ts` and `nextCarrier` have a concrete measured reason to exist, that reuse of `responseReceived`, `rewriteOf` and the pricing baseline is preserved, and that scope remains bounded by `owner-rulings.md` and `michael-council-rulings.json`. It recorded the accepted residuals — later-extension marker overflow, budget-1 tail cost, late warm-replay state overwrite and estimate under-reporting — and recommended no new guard, synchronization layer or neighbouring feature.

## Michael's Resolutions

All 61 findings were resolved `propose_fix`. None was `contest`, `escalate`, `decline` or `prototype`, and no finding reached Joel as an owner decision.

| Stage | Findings | propose_fix | Other |
|---|---|---|---|
| Stage 1 | 4 | 4 | 0 |
| Stage 2 | 8 | 8 | 0 |
| Stage 3 | 49 | 49 | 0 |
| Stage 4 | 0 | 0 | 0 |

**Michael corrected his own earlier rulings twice.** In round 1 he found that his "handler inputs" ruling had cited "retries reuse the payload without re-firing the hook" as a `before_provider_request` fact when that sentence sits under `before_provider_headers`, and that the cited code contradicts it; the commit moved to a valid assistant `message_end` as a result. In round 2 he found that his `cc2-3` ruling had replaced the block rule in `design.md` but was never carried into the context-figures spec, so the spec still required the defect D8 fixes.

**Parts of findings were declined inside a `propose_fix` disposition.** Michael declined moving cell (a)'s clear in `context.ts` (round 1), because once the commit moves the clear's position stops mattering. He declined copying Joel's agent directory for the live runs (round 1), because a token refresh during the run would land in the copy; a symlinked `auth.json` was measured and adopted instead. He declined a second normalization rule for lone surrogates (round 2), because nothing measured needs one. He declined widening `InstrumentsHolder` to carry the payload state (round 5), because two settled rulings keep payload state out of the publisher; the signature exception was enumerated in `AGENTS.md` instead.

**Michael measured rather than assumed wherever a finding turned on behaviour.** The runs he made and cited are `dr-s1-harness.log`, `dr-s1-replay.mjs`, `dr-s2-harness.mjs`, `dr-s2-blockrate.py` (132 of 132 requests), `dr-s3-commit.log`, `dr-s3-peek.log`, `dr-s3-r2.log`, `dr-s3-r3-walk.log`, `dr-s3-r3-url.log`, `dr-s3-r3-auth.log`, `dr-s3-r4-lone.log`, `dr-s3-r5-topmark.ts` and `s-key-h45-top.log` (N10), `dr-s3-r5-toolmark.ts` and `s-key-h45-tool.log` (N11), `dr-s3-r5-reset.log`, and the live probe runs N1–N11. The round-6 publisher test was run against today's code in a throwaway worktree, where it fails at the read rate as expected.

## Settled Findings

**Handoff identification.** A carry is placed only where the message at the recorded payload index ends with a block equal to the recorded fingerprint, which is the block that sat just before recall's block. A mismatch places no carry. Identification is exact and payload-coordinate; the adapter owns the whole comparison, applying pi's lone-surrogate rule to both sides. The fingerprint and every comparison against it ignore `cache_control` at every depth. The exact-match, payload-coordinate strategy was never reopened. (Stage 1 `zo1-1`; Stage 3 rounds 1, 2 and 6.)

**The OAuth carve-out.** On every covered payload whose system carries two marked blocks, the first block's marker is removed before any message-point budgeting, and it stays removed when the wanted points do not fit. The carve-out unmarks the first of two marked system blocks whoever placed it, and that exception is recorded rather than the shape test narrowed. (Stage 1 `zo1-2`; Stage 3 round 2.)

**Marker recognition and the budget.** pi's message marker is recognised by count: exactly one message-level marker on the normalized clone, wherever it sits. A marker is a `cache_control` key whose value is an object with `type` `"ephemeral"`, found by a recursive walk that does not descend into a tool definition's `input_schema` or a `tool_use` block's `input`, and a marker nested in a `tool_result`'s content is still found. Zero, or two or more, message-level markers means provenance is unknown, so no message-level edit is made. The budget is four minus every marker on the normalized clone except pi's last-message marker. (Stage 2 `cc2-1`; Stage 3 rounds 1, 3 and 4.)

**A lone foreign message marker.** Where pi marked nothing and another extension placed exactly one message-level marker, that marker is indistinguishable from pi's and is treated as pi's: copied, and removed on a spent budget. This narrows council ruling 1 and is recorded as an accepted residual, not guarded, because provenance is not observable from the payload. (Stage 3 round 4, `dr-s3-r4-lone.log`.)

**The route predicate.** A route is covered when `ctx.model` names provider `anthropic` with api `anthropic-messages` and a baseUrl whose `new URL(baseUrl).hostname` is exactly `api.anthropic.com`, or OpenRouter with an `anthropic/` model id. A missing or unparsable baseUrl is uncovered. Joel's attribution route reports the same provider, api and baseUrl as pi's own, measured with no model call. Virtual models are outside the predicate by construction, because coverage follows `ctx.model` and the payload event carries no model; their under-reporting is recorded, not fixed. (Stage 3 rounds 1 and 3.)

**State homes and commit timing.** Four fields, three writers, one writer per field: `context.ts` writes `recallBlock`, the payload handler writes `nextCarrier` and `applied`, and a new commit handler writes `carrier`. The state's plain, pi-free types live in a new `src/use-cases/payload-cache.ts` and the instance is an inline literal in `taiknr.ts` beside `recallCache`. Record (b) is committed only at a valid assistant `message_end` (`validUsage`), so auto-retry, the strict-tools rebuild and warm replays never commit, and every re-fire before that commit computes the same edit and next record. A replay sent after the commit may place no carry. (Stage 3 rounds 1 and 2.)

**The adapter's failure order.** The adapter is one pure function that mutates nothing it was given. The handler calls it inside `try`, writes both state values only after it returns, and in `catch` sets `applied` to null, resets `nextCarrier` to `carrier` and returns `undefined`. (Stage 2 `cc2-4`; Stage 3 round 5.)

**`applied` and the publisher.** `AppliedPlacement` is `{ carrierRead, block }`, both derived from the finished clone for every covered payload carrying exactly one message-level marker, including one where nothing was placed or the wanted points did not fit. `block` is null when no carrier is found, which includes a request carrying no block, and null prices the cached rows. A top-level `cache_control` is automatic caching, so its breakpoint lands on the last eligible block at or after recall's block and `block` is then "cached". The publisher never receives a payload index: `carrierRead` tells it whether this request reads through the baseline carrier's own content, and `rewriteOf` starts at `carried.index + 1` when it does. (Stage 2 `cc2-2`, `cc2-3`; Stage 3 rounds 1, 2, 4 and 5.)

**Block pricing.** One rule, taken from the finished payload and the last priced request: uncached is the input rate; cached and new, changed, or left uncached by the last priced request is the write rate; cached otherwise and warm is the read rate; cold is the write rate. `PricedRequest` gains one field, `blockUncached`, and `blockInNewTail` gains the `carried === undefined` clause. The rule matched 132 of 132 measured requests across six runs, and the `carried === undefined` clause is pinned by a publisher test that fails at the read rate against today's code. (Stage 2 `cc2-3`; Stage 3 rounds 2 and 6.)

**The live procedure.** `test-cache-point-live.mjs` is committed at the repository root and run per covered route at Validate. It resolves the extension as an absolute path from its launch directory, runs every route with `PI_CODING_AGENT_DIR` and cwd set to fresh temporary directories, and for the two OAuth routes symlinks `auth.json` to Joel's real file so a token refresh writes through. It evaluates every assertion and prints each with both sides before exiting. The before-point-only request is bounded on `input`, not `write`, because the turn's own table is written wherever pi's marker sits. (Stage 2 `cc2-6`; Stage 3 rounds 1, 2, 4 and 5.)

**Recorded residuals, not guarded.** Budget 1 bills the in-turn tail as input, and only for a block-level foreign marker; a top-level marker leaves the tail cached. A late warm replay can overwrite this request's `nextCarrier` and `applied` when another extension's async handler holds it open. A provider that never calls `options.onPayload` prices with stale state. A coincidental fingerprint match after a compaction or `/tree` jump places a harmless extra point, priced correctly from `applied.block`, with today's rewrite start because both events reset the baseline. (Stage 3 rounds 1, 3, 4 and 5.)

**The docs pass.** It corrects `AGENTS.md`'s registration counts and its stale live-script trap, adds the `message_end` instruments registrar's third parameter to `AGENTS.md:23`'s enumerated signature exceptions, and corrects `ARCHITECTURE.md:5`'s sentence naming two files that are not in the tree. (Stage 3 rounds 4 and 5.)

## Owner Decisions Required

None. No finding in any stage was marked `escalate` or `joel`, and every `owner_questions` list in the lens reports and Michael's resolution records is empty. The two rulings that shaped the run's shape — the standing churn rule and the 2026-11-17 cap ruling — are recorded in `owner-rulings.md` and were applied as written.
