{
  "mode": "review",
  "lens": "council-critic",
  "paraphrase_proposes": "",
  "paraphrase_existing": "",
  "recommendation": "Revise before tasks. The architecture holds: the no-op holder, the six registrars, the deferred readings, the scorer-adapter observer and the per-pair ratio table all trace to rulings and to live code. Three major defects remain. (1) D8's warm pricing misstates dollars in two concrete ways: the rewrite suffix runs to the end of the request, so it charges the new tail that would have been written anyway; and a recall block on the request that introduces it is priced at the read rate, although pi's cache marker sits on that block, so it is written. (2) D9 lets a fault in the instruments code drop recall's block, or spend recall's once-per-session notice. That contradicts the spec's 'Publishing SHALL cost neither recall's return value' and D9's own reason for rejecting its alternative. (3) The file list leaves out `tests/infra/pi-event-handlers/context.test.ts`, which stops compiling once the holder is a required dependency, and that test is where ruling 11's emit-throw test has to live. The minor findings tighten partial-failure order at session start, the pair used at the response, the `/tree` reseed and some loose claims.",
  "findings": [
    {
      "id": "CR-S3-1",
      "severity": "major",
      "location": "design.md §D8, the `rewriteCharge` bullet and the 'Which message taiknr changed' / 'The suffix' bullets",
      "finding": "`suffixEstimate` is defined as 'the sum of `messageEstimates` from that index' to the end of this request. It therefore includes the new tail since the previous request (the new user message, recall's new block, or the last turn's assistant message and tool results). Without taiknr that tail would also have been written to cache, so charging it at `writeRate − readRate` overstates the rewrite cost taiknr caused.",
      "rationale": "Without taiknr, the previous request's prefix is read and the new tail is written. With taiknr, the prefix up to the change is read, the stretch from the change to the previous request's end is re-written, and the new tail is written. The only extra is (previous length − change index) × (write − read). The spec says 're-writes the suffix from that message onward', and only the part that was cached before is a re-write. Ruling 15 leaves the exact rule to the design (§O6), so tightening it reopens nothing.",
      "concrete_case": "A settlement stubs results at index 40. The last request of the previous run ended at index 80. The next run's first request is warm and adds a 1,500-token user message at index 81. At read $1.50/M and write $18.75/M the published rewrite charge includes 1,500 × 17.25/M = $0.0259 that taiknr did not cause, about 8× row 1's whole net of −$0.00311.",
      "recommendation": "Keep the message count of the previous request in the publisher. It already keeps that request's stub set and kept block. Define `suffixEstimate` as the sum of `messageEstimates[start .. previousLength)`. Add a dollar-table row with a non-trivial new tail and a publisher test for it."
    },
    {
      "id": "CR-S3-2",
      "severity": "major",
      "location": "design.md §D8, the `grossDollars` bullet; dollar table rows 1–5",
      "finding": "`grossDollars = savingTokens × (warm ? readRate : writeRate)` prices the recall term of the saving at the read rate on every warm request. On the request that first carries a block, the block is not in the cached prefix: pi's Anthropic adapter puts `cache_control` on the last block of the last user message, and that block is recall's (pi-ai `anthropic-messages.js:1408–1430`). So the block is written at the write rate. The rule understates recall's cost by about 12× on that request.",
      "rationale": "The block is charged correctly only when CR-S3-1's extra charge happens to cover it, which is when an earlier block or new stubs set `rewritePending`. With nothing pending, nothing covers it. The same comparison the design already makes (the kept block against this request's `latestUser.tailText`) tells a new block from a repeated one, so the correct rate costs no new state. J10 and Joel's 'don't misinform users' make the size of this error matter.",
      "concrete_case": "A warm request, with no new stubs and no block on the previous request, gets a 3,000-token recall block. The rule publishes −3,000 × 1.50/M = −$0.0045. The block was actually cache-written: 3,000 × 18.75/M = $0.0563 of extra spend. The per-request dollar figure understates taiknr's cost by $0.0518. On the next request in the same tool loop the block is read, and the read rate is right there.",
      "recommendation": "Split the warm price: `withheld − stubbed` at `readRate`, and `recalled` at `writeRate` when this request's block is new (it differs from the kept block, or there was none), or at `readRate` when it repeats on the same message. Add a dollar-table row for 'warm, new recall block, nothing pending'. Fix CR-S3-1 together with this finding, because the current suffix rule's overcharge sometimes masks this undercharge."
    },
    {
      "id": "CR-S3-3",
      "severity": "major",
      "location": "design.md §D9 'Recall's path'; §D3 (`read()` is evaluated at the start of each method)",
      "finding": "The real `reportRecalled` evaluates its reading inside `context.ts`, after `appendRecalledContextToMessages` and before the `return`. A throw there makes pi's runner drop recall's result for that request (runner.js:1043–1068). A throw in `started` or `finished` (report building in `sink.post`) lands in `scorer.score`. `recallRelevantContext` catches it, spends the once-per-session notice, and writes `lastRecalledIds = []` under that prompt's key, so every later request on the same prompt recalls nothing too.",
      "rationale": "The jefferson-instruments spec says 'Publishing SHALL cost neither recall's return value' and, under *A figure that cannot be computed*, 'nothing else in the session is affected'. D9 rejects the wrapping alternative because it 'spends recall's once-per-session notice', yet the chosen path spends that notice on an instruments fault. Ruling 11 covers emit throws, which the bus adapter catches. It does not cover computation throws on recall's path.",
      "concrete_case": "A defect in `tokenEstimate` or the block reading (a regression in `token-estimate.ts`, say) throws during `reportRecalled`. The request goes out without the recall block, although recall scored and selected it. Or `finished`'s post throws: the user gets recall's 'did not score this prompt' notice naming `defaultDecisionModelProvider`, the wrong field, and the prompt's cache is poisoned until the store grows.",
      "recommendation": "Make the real `reportRecalled` store the thunk and evaluate it in `requestBuilt`, the very next handler. Any throw then lands in the publishing registrar, where pi catches it apart from recall's already-returned messages. This needs no catch and changes no signature. For `started` and `finished`, either let the bus adapter's `try` cover report building too, or state in D9 that a fault there costs recall for that prompt and is accepted against the spec's SHALL. Add a test that a throwing reading leaves the request carrying the block."
    },
    {
      "id": "CR-S3-4",
      "severity": "major",
      "location": "design.md §Module & File Placement, the 'Modified' table",
      "finding": "`tests/infra/pi-event-handlers/context.test.ts` is not listed. It calls `registerContextHandler(createGatedPi(fake.pi, session), { config: session, store, recallCache })` (context.test.ts:107). When the dependency object gains the holder (ruling 7 (b)) that call fails `tsc` with a missing property, so `npm run check` fails. Nothing assigns the test file for the Risks row's ruling-11 test either: the fake's `emit` throwing during `started` and `finished` while recall still returns its block.",
      "rationale": "feature-spec-standard §2 requires the file list to name every module that changes. ADR 0003 makes `npm run check` the gate. The test that proves 'publishing cannot cost recall' has no home in the file plan.",
      "concrete_case": "A coder follows the file list, adds `holder` as a required member, and leaves `context.test.ts` alone. `tsc` reports TS2345 at context.test.ts:107 and the gate is red. The ruling-11 test either lands in an unplanned file or is never written.",
      "recommendation": "Add `tests/infra/pi-event-handlers/context.test.ts` to Modified. Its rows: pass a holder; recall reports its block; the throwing-emit-during-observer case; the reportRecalled case from CR-S3-3. Name the file for ruling 11's other test, 'a throwing publishing registrar is recorded by `onError` with the request still carrying recall's block' (presumably `archive-session.test.ts`)."
    },
    {
      "id": "CR-S3-5",
      "severity": "minor",
      "location": "design.md §D1 (order: emit the registration, then `sessionStarted`, then `install()`); §D3",
      "finding": "The registration is emitted before the opening reading is evaluated, and `install()` comes after it. If the session-start reading throws (the seed projection, `getContextUsage`, or taiknr's own seed and calibration code), Jefferson holds a registration with no posted field. The holder stays a no-op, so nothing posts again until the next `session_start`.",
      "rationale": "Standard §4 asks the design to state failure behaviour for partial writes. This is the design's one partial-write path, and it is unstated. The spec requirement 'Every declared field carries a value from the moment it is declared' is broken there.",
      "concrete_case": "A seed bug throws on a branch whose newest assistant message has odd usage. All four `taiknr.*` rows render blank for the whole session with no Jefferson warning; the only trace is the extension error channel. If the read came first, the user would see Jefferson's 'not a known instrument' warning: the Q3(a) state, which is visible.",
      "recommendation": "Inside `sessionStarted`, evaluate `read()` and build the full `FigureValues` before `sink.register()`, then register, post and install. The order stays synchronous, so T11 still holds. State the resulting behaviour in D1 or D9."
    },
    {
      "id": "CR-S3-6",
      "severity": "minor",
      "location": "design.md §D7 'Calibration', steps 1 and 5; 'The response re-posts every k-scaled figure'",
      "finding": "At `message_end` the design says two things that disagree: re-post every field 'with that sample's k', and use 'the current pair's entry' at every event. Under a virtual selection the current pair is the newest valid assistant message on the branch, but the response that just landed is not persisted yet at `message_end`, so the current pair there is the previous response's. The same happens if `ctx.model` changed while the request was in flight.",
      "rationale": "When the router sends request N to pair B after N−1 went to A, the live sample updates B. The re-post then uses A's k and recomputes `uncalibrated` from A, so `contextInTurn` (B's measured prompt) and `historyBefore` (k_A × estimate) break the ruling 1 and 2 identity on screen.",
      "concrete_case": "A virtual model routes to deepseek (k ≈ 0.93) after a claude turn (k ≈ 0.61). At `message_end`, `historyBefore` and the archive figures are re-posted about 34 % low against the measured `contextInTurn`, and the flag reads off for the wrong pair.",
      "recommendation": "State that at an assistant `message_end` the response's pair is the current pair for that update, so its sample's k and flag are what get posted. Add one calibration test for a virtual-routed pair change."
    },
    {
      "id": "CR-S3-7",
      "severity": "minor",
      "location": "design.md §D7 'Calibration', step 5 ('`session_tree` replace[s] the whole table with those seeds, each `live: false`')",
      "finding": "Replacing the whole table at `/tree` throws away live entries from this run. The flag then turns on and k falls back to a seed biased by the missing recall block (CR8), with the model unchanged. The spec defines the flag as 'no valid response in this run has calibrated k for the current model' and turns it back on only 'when the model changes to one with no live sample'.",
      "rationale": "Ruling 13 reseeds at `/tree` because the new branch's newest usage may be another model's (CB-7). A per-pair table already covers that, because a live entry for pair X stays valid for X on any branch. Merging seeds only into pairs with no live entry satisfies ruling 13's reason and matches the spec's flag rule.",
      "concrete_case": "Joel runs 10 live claude responses (flag off, live k 0.61), then does `/tree` to an earlier node on the same model. Every token figure switches to the seed's k, a reconstruction without that turn's block, and `~` reappears until the next response.",
      "recommendation": "At `session_tree`, keep live entries and reseed only pairs with no live entry. `session_start` still replaces the table, because the factory is fresh. If Michael reads ruling 13 as requiring a full replace, say so in D7 and drop 'in this run' from the flag's definition."
    },
    {
      "id": "CR-S3-8",
      "severity": "minor",
      "location": "design.md §Risks, 'A projection is rebuilt on every publishing event' row; §D2 readings",
      "finding": "Each reading also calls `ctx.getContextUsage()` for the window. pi's `getContextUsage` builds its own `buildSessionProjection()` and runs `estimateProjectedContextTokens` (agent-session.js:3607–3635). Every publishing event therefore pays two projections and two estimates, not the one that ruling 18's 0.32–0.80 ms measurement covers.",
      "rationale": "Standard §6: every claim must match the evidence. The cost is still small, about 1.6 ms worst case, so this is only a correction to the accepted cost.",
      "concrete_case": "On Joel's 14 MB session, a `message_end` does the reading's projection plus estimate and `getContextUsage`'s projection plus estimate: about 1.6 ms, not the stated ≤0.8 ms.",
      "recommendation": "Restate the Risks row as two projections per event, or note the doubled cost under ruling 18. Do not switch to `ctx.model.contextWindow`, which is wrong under a virtual selection (agent-session.js:365–367)."
    },
    {
      "id": "CR-S3-9",
      "severity": "minor",
      "location": "design.md §D5 field table (`decidingItems`) and the `deciding` rendering bullet; §D4",
      "finding": "After `finished`, the design does not say whether `decidingItems` resets to 0 or keeps the last call's count. The spec fixes only 'no call yet → 0' and 'running → the count'.",
      "rationale": "Without that rule, the publisher test cannot assert exactly which fields D5 says `finished` writes (D3 point 4), and a user's `$decidingItems` format shows a value with no defined meaning between calls.",
      "concrete_case": "A user's format `rec $decidingItems` shows `12` long after the call ended. Or a coder resets it to 0, and the publisher test written from D5 has no ground truth either way.",
      "recommendation": "State it in D5. Recommended: `finished` posts `deciding: false` and keeps `decidingItems` as the last call's count (the field reads 'how many ids that call asks about'), and the `deciding` variable renders `idle`."
    },
    {
      "id": "CR-S3-10",
      "severity": "minor",
      "location": "design.md §D8 dollar table row 8; §Modified, the `tests/infra/adapters/pi-jev-scorer-adapter.test.ts` row",
      "finding": "Row 8's arithmetic subtracts '1,000 × 20.0625/M', but its Inputs give no suffix, no `cacheRead > 0` (warm) and no pending rewrite, so the row cannot be checked by hand as the table promises. Separately, the scorer-adapter row hedges 'If the file is absent at `abaa6b0`, it is created', but the file exists (tests/infra/adapters/pi-jev-scorer-adapter.test.ts, 14 call sites).",
      "rationale": "Standard §6: claims must be calibrated to evidence. The table is the design's §O6 deliverable (ruling 15; R13), and each row has to stand on its own inputs.",
      "concrete_case": "A coder writing the row-8 test from Inputs alone builds a cold request and expects −$0.01931, but the rule then gives +500 × 21.5625/M = +$0.01078.",
      "recommendation": "Add 'warm (cacheRead > 0), suffix 1,000 tok, rewrite pending' to row 8's Inputs. Delete the absent-file hedge."
    }
  ],
  "assumptions": [
    {
      "assumption": "pi's Anthropic adapter puts `cache_control` on the last block of the last user or system message, so a just-appended recall block is cache-written on its first request (pi-ai anthropic-messages.js:1408–1430).",
      "status": "verified"
    },
    {
      "assumption": "`ctx.getContextUsage()` builds its own projection and runs `estimateProjectedContextTokens` on every call (agent-session.js:3607–3635).",
      "status": "verified"
    },
    {
      "assumption": "pi's generic `emit`, `emitMessageEnd` and `emitContext` catch each handler on its own and report on the extension error channel, so a publishing registrar's throw does not reach other handlers (runner.js:821–847, 872–902, 1043–1068).",
      "status": "verified"
    },
    {
      "assumption": "pi awaits the whole `session_start` emission before `resources_discover` (agent-session.js:3130–3132), so a second `session_start` registrar still registers in time.",
      "status": "verified"
    },
    {
      "assumption": "pi's cache warmer replays the transformed context through `streamSimple`, outside `emitContext` and with no `message_end`, and writes only a `usage` entry of kind `cache_warm` (cache-warmer.js:174–190; sdk.js:269–281). It never touches the pending request or the samples.",
      "status": "verified"
    },
    {
      "assumption": "`tests/infra/pi-event-handlers/context.test.ts:107` calls `registerContextHandler` with exactly `{ config, store, recallCache }`.",
      "status": "verified"
    },
    {
      "assumption": "A settlement's context_edit puts the stub as the first text block and keeps non-text blocks (pi-archive-adapter.ts `toSettlementDrafts`), so matching on `firstText` is sound and `withheld` correctly leaves images out.",
      "status": "verified"
    },
    {
      "assumption": "pi's auto-retry after an errored response runs `transformContext`, and so `context_with_system`, again, so the retried response finds a pending request.",
      "status": "unverified"
    },
    {
      "assumption": "Providers that report no cache writes (OpenAI-style automatic prefix caching) show the same block-underpricing pattern under the input-rate fallback.",
      "status": "unverified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "Whether Jefferson repaints, or coalesces repaints, across the ~16 synchronous reports a `message_end` emits.",
    "Whether pi's retry path runs `context_with_system` again before the retried request.",
    "Cache-marker placement and `cacheWrite` reporting for providers other than Anthropic.",
    "Whether a request whose `context_with_system` ran but which never reached the provider (an abort between transform and send) leaves the rewrite baseline wrong. Taking the baseline from an unsent request could under-charge the next rewrite.",
    "Whether `agent_settled` fires after an aborted run with the boundary committed, beyond T15 as cited."
  ]
}