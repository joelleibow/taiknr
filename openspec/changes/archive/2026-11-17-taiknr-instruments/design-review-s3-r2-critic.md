{
  "mode": "review",
  "lens": "council-critic",
  "paraphrase_proposes": "",
  "paraphrase_existing": "",
  "recommendation": "Nearly ready, with one major fix before tasks. The round-1 fixes landed correctly: the suffix is bounded at `previousLength`, the block is priced by `latestUser.index`, `reportRecalled` is deferred, the session-start order is read-then-register, the response uses its own pair, `/tree` keeps live entries, row (4) adds the zero-estimate guard, and the `deciding` rows and the table's rate line are in. I re-checked rows 1, 2, 3, 6, 7, 8, 10, 13, 14 and 15 by hand and all match. The one major defect: the rewrite baseline (the previous stub set, the kept block and `previousLength`) advances at every `requestBuilt`, including requests whose response is never priced. pi auto-retries by default, and an Esc during recall's classifier call aborts the request. In both cases the next priced request has nothing pending, so the settlement's rewrite is charged zero times and a new recall block is priced at the read rate. That undoes OD1 (a) on those paths and contradicts the spec's 'the first warm request after any change … is charged'. Three minor findings tighten `requestBuilt`'s take-and-clear order, the cost claim at start and `/tree`, and two spec sentences that OD3 (a) left stale.",
  "findings": [
    {
      "id": "CR-S3-R2-1",
      "severity": "major",
      "location": "design.md §D8 'Which message taiknr changed' (the 'Recall's block', 'The suffix' and 'No baseline' bullets) and the response-state table, row (4)",
      "finding": "The publisher's rewrite baseline is 'the previous request's' stub set, kept block and `previousLength`, and it is replaced at every `requestBuilt`. That includes a request whose response row (4) never prices (aborted or errored), and a request that gets no `message_end` at all. The next priced request is then compared against an attempt that was never priced. The change taiknr made shows as already carried, so nothing is pending, and the new user message sits below `previousLength`, so its recall block is priced at the read rate.",
      "rationale": "Auto-retry is on by default in pi: `settings-defaults.js` sets `retry.enabled: true` and `maxRetries: 3`. `_handlePostAgentRun` calls `_prepareRetry`, which calls `_omitRecoveryAttempt`, and then `agent.continue()` (agent-session.js:1604–1607, 3192–3224). The retried request goes through `emitContext` again (runner.js:1014–1073). Because the failed attempt is left out of the projection, its message list is identical to the failed one's. The context-figures spec says 'the first warm request after any change taiknr made to an earlier message is charged the suffix it re-wrote'. Under row (4) the failed attempt is never priced, so the rewrite is charged zero times and the spec's SHALL fails on the retry path. The same baseline rule brings back CR-S3-2's 12× under-price of a new recall block, which OD1 (a) was ruled to remove.",
      "concrete_case": "A run ends with a settlement. Joel sends a new prompt, recall appends a 3,000-token block to it, and Anthropic answers with a retryable overload error. pi retries 2 s later. The retried request finds nothing pending, because the baseline is the failed attempt, which carried the same stubs and block. Its block has `latestUser.index < previousLength` and is priced at the read rate: −$0.00450 (row 14) instead of −$0.05625 (row 13), and row 1's rewrite charge of 600 × 17.25/M = $0.01035 is never subtracted. The per-request net reads about $0.062 too favourable. A second path does the same: Joel presses Esc while recall's classifier call is running (`deciding` is on screen). `requestBuilt` has already advanced the baseline, the request never reaches the provider, and the next prompt again loses the settlement's rewrite charge.",
      "recommendation": "Store the candidate baseline (this request's stub set, its block identity and its length) in the pending request. Promote it to the baseline only when a response prices that request (rows (1) and (2)); rows (3) and (4) leave the last priced baseline as it was. Every rewrite is then charged exactly once, on the first priced request after it, whether or not the unpriced attempt wrote cache, because that attempt adds nothing to the net. Indices stay valid, since pi only appends and omits a failed attempt from the projection. Add one clause to row (4) ('the rewrite baseline stays at the last priced request') and one publisher test: a settlement, an errored response, then a retried request that is charged row 1's rewrite and prices its block at the write rate."
    },
    {
      "id": "CR-S3-R2-2",
      "severity": "minor",
      "location": "design.md §D3, the deferred-reading paragraph ('The real publisher calls `read()` once, at the start of the method … `requestBuilt` … takes it, clears it and evaluates it')",
      "finding": "The design does not order `requestBuilt`'s two readings. If its own request reading is evaluated 'at the start of the method' and throws before the stored recall reading is taken and cleared, that stale closure stays stored. The next `requestBuilt` then evaluates it for a request that carries no block.",
      "rationale": "OD2 (a) made a stored closure part of the publisher's state across a handler boundary, and a fault in `requestBuilt` must not leave it behind. Under the spec's *A figure that cannot be computed*, 'the last posted value stands'; a fault must not make the next request report a block it does not carry.",
      "concrete_case": "At request N recall reports a 3,000-token block. `readRequest` throws (say, `getContextUsage` throws on a transient host fault), so `requestBuilt` exits before it reaches the stored reading. At request N+1 recall takes one of its five early returns and reports nothing. `requestBuilt` takes N's stored reading and publishes `recalled` = 3,000 × k, plus a kept block whose text never matches. It also prices a −3,000-token recall term into N+1's saving.",
      "recommendation": "State that `requestBuilt` takes and clears the stored recall reading as its first statement, before it evaluates either reading. Extend D9's publisher test: after a `requestBuilt` whose request reading throws, a following request with no `reportRecalled` publishes `recalled` 0."
    },
    {
      "id": "CR-S3-R2-3",
      "severity": "minor",
      "location": "design.md §Risks, row 'A projection is rebuilt on every publishing event'; §D7 Calibration step 4",
      "finding": "The revised row says each publishing event builds two projections. `session_start` and `session_tree` also build one `buildSessionProjection(getBranch(), message.parentId)` per pair present on the branch to seed the ratio table. Those two events therefore build 2 + P projections, not 2.",
      "rationale": "Standard §6 requires a cost claim to match the code it describes. CR-S3-8 was fixed with the same omission, so the row is still short of the cost it accepts under ruling 18.",
      "concrete_case": "A virtual selection that routed among three pairs on Joel's 14.4 MB session builds 5 projections at start and at every `/tree`, about 4 ms at the measured 0.32–0.80 ms each, against the stated ~1.6 ms.",
      "recommendation": "Say in the row that `session_start` and `session_tree` add one seed projection per pair on the branch, inferred from D7 step 4 and not measured, and that the cost is still accepted (ruling 18)."
    },
    {
      "id": "CR-S3-R2-4",
      "severity": "minor",
      "location": "specs/context-figures/spec.md, the requirement 'A character estimate becomes a token figure…' and its scenario 'When k is reseeded'",
      "finding": "OD3 (a) changed two rules, but only design.md was edited. The design keeps live entries at `/tree` and, at a valid `message_end`, uses the response's own pair. The spec still says k is 'the newest valid response from the current provider and model' and that at a `/tree` jump 'k is reseeded there'.",
      "rationale": "Tasks and tests are written from the spec scenarios. A test that follows the spec's wording asserts behaviour that Joel overruled on 2026-11-16 (owner-rulings.md, OD3 → (a)). Standard §1 keeps one home per fact, and the two homes now disagree.",
      "concrete_case": "A coder writes a test from 'When k is reseeded': a live sample on pair A, a `/tree` jump on A, then assert k equals A's seed and the flag is on. The design-correct implementation keeps the live k with the flag off, so the test fails. Under OD3 (a) the implementation is right and the test is wrong.",
      "recommendation": "Amend the scenario to 'a `/tree` jump reseeds the pairs with no live sample in this run, and keeps live ones'. Amend the requirement to say that at a valid response the update uses that response's own pair."
    }
  ],
  "assumptions": [
    {
      "assumption": "pi auto-retry is on by default with 3 retries (settings-defaults.js `retry.enabled: true`, `maxRetries: 3`). A retryable error drops the failed attempt from the projection, and `agent.continue()` builds a new request (agent-session.js:1604–1607, 3192–3224).",
      "status": "verified"
    },
    {
      "assumption": "`emitContext` runs each extension's `context_with_system` handlers as one group, in registration order (`snapshotEventHandlers`). Taiknr's request registrar therefore always runs right after recall's handler, with no other extension in between (runner.js:1043–1068).",
      "status": "verified"
    },
    {
      "assumption": "The retried request goes through `emitContext` again. This rests on `agent.continue()` running the agent loop's transform per request; I did not trace pi-agent-core's loop line by line.",
      "status": "unverified"
    },
    {
      "assumption": "A retryable error emits an assistant `message_end` with `stopReason: \"error\"` before the retry, so row (4) consumes the pending request. CR-S3-R2-1 holds either way, because the baseline advances at `requestBuilt`.",
      "status": "unverified"
    },
    {
      "assumption": "Dollar-table rows 1, 2, 3, 6, 7, 8, 10, 13, 14 and 15 reproduce by hand at the stated rates (−$0.00311, −$0.02190, +$0.09300, +$0.01500, +$0.09300, −$0.01931, +$0.09300, −$0.05625, −$0.00450, −$0.04440).",
      "status": "verified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "Whether a provider writes cache for an attempt that later errors. CR-S3-R2-1's remedy is correct either way, but the size of the current error depends on it.",
    "Whether an Esc during recall's classifier call stops the request before it is sent, or sends it with an aborted signal.",
    "Whether Jefferson repaints, or coalesces repaints, across the roughly 17 synchronous reports a `message_end` emits.",
    "Cache-marker placement and `cacheWrite` reporting for providers other than Anthropic.",
    "Whether `agent_settled` fires after an aborted run with the boundary committed, beyond T15 as cited."
  ]
}