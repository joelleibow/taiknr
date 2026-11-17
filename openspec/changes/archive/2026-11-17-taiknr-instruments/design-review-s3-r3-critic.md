{
  "mode": "review",
  "lens": "council-critic",
  "paraphrase_proposes": "",
  "paraphrase_existing": "",
  "recommendation": "Nearly ready, with one major fix before tasks. Every round-2 fix landed as ruled:\n- OD4: the baseline is the last priced request, rows (1) and (2) promote the candidate, and row (4) keeps the baseline. Spec lines 152 and 161 are amended, and the retry test is in.\n- OD5: `compacted` and `treeJumped` exist, and the no-seed `/tree` rule is stated.\n- OD6: `requestBuilt` takes and clears the stored reading first, the Risks row counts projections per event, and the D2 cells are trimmed.\n- STRUCT-R2-2 and STRUCT-R2-3 are applied, and CR-S3-R2-4's four spec lines match OD3 (a).\n\nI re-derived the retry figure by hand: 4,960 × 1.50/M − 3,000 × 18.75/M − 600 × 17.25/M = −$0.05916. It matches.\n\nThe one remaining defect is in the reading shapes OD5 made explicit. `SettledReadings`, `CompactedReadings` (`{ projectionEstimate, contextWindow }`) and `TreeJumpedReadings` carry no current pair. Yet D7 says every token figure at every event uses the current pair's entry, from `ctx.model` or, under a virtual selection, from the branch. The pending request, the only other place a pair is held, has already been consumed or cleared at those events. So at settle, compact and `/tree` the publisher either has no pair, or falls back on a remembered one that D7 never defines. The new `/tree` test ('no valid sample for the current pair … posting k = 1') cannot be written against that reading.",
  "findings": [
    {
      "id": "CR-S3-R3-1",
      "severity": "major",
      "location": "design.md §D3, the deferred-reading paragraph ('`CompactedReadings` is `{ projectionEstimate, contextWindow }`, `TreeJumpedReadings` is `CompactedReadings` plus the branch's usage samples per pair'); §D2, reading cells for `agent_settled`, `session_compact` and `session_tree`; §D7 Calibration steps 1 and 5 ('Every token figure at every event uses the current pair's entry'); the `instruments-tree.test.ts` row",
      "finding": "Three of the six event readings carry no current pair:\n- the settled reading ('the projection's estimate and the window');\n- `CompactedReadings`;\n- `TreeJumpedReadings`.\n\nD7 still requires those events to post `totalContext`, `archiveWithheld`, `archiveStubbed` and `uncalibrated` from the current pair's entry, where the current pair is `ctx.model`'s `(provider, id)` or, under `pi-virtual`, the newest valid assistant message on the branch. That is a host read that only the session-start and request readings make.\n\nThe pending request, the only other place a pair is held, is consumed at every `message_end` (D8, 'consumes the pending request in every case'). `session_compact` and `session_tree` clear it (D2). So when settle, compact or `/tree` fires, the publisher holds no pair. Read literally, step 5 then gives 'k is 1 … there is no such pair'. Otherwise the implementer must invent a 'last known pair' that D7 never defines.",
      "rationale": "Standard §3 requires the input shape at a boundary to be explicit. OD5 (a) made `CompactedReadings` a closed shape, which turns the omission into a contract.\n\nUnder a virtual selection, the jump itself changes the current pair (ruling 13), so no remembered pair is right at `/tree`. Without a virtual selection, a `/model` switch fires no taiknr event (taiknr registers no `model_select`). Only a reading taken at the event sees the switch.",
      "concrete_case": "Three paths:\n1. **Literal reading.** In Joel's Anthropic session, pair A has a live k of 0.62. Auto-compaction fires: `compacted` clears the pending request, and no pair is in its reading, so step 5 posts `totalContext` at k = 1 with the flag on. The figure jumps 61 % at every compaction and settlement, which is the jump this change exists to remove.\n2. **Remembered pair, virtual selection.** The implementer has the publisher remember the last request's pair. With a virtual model routing between A (live, 0.62) and B (seed, 0.95), Joel runs `/tree` to a branch whose newest valid assistant message is B's. The update posts A's k with the flag off, where D7 requires B's seed with the flag on: about 35 % low, and labelled calibrated.\n3. **Remembered pair, `/model` switch.** Joel switches from A to deepseek with `/model`, then runs `/tree` before sending anything. The update posts A's 0.62 with the flag off, where D7 requires k = 1 with the flag on.\n\nThe tree test D2 lists for case 2 cannot be built from `TreeJumpedReadings` as declared.",
      "recommendation": "Add `pair: Pair | undefined` (D7 step 1) to the settled reading, `CompactedReadings` and `TreeJumpedReadings`, produced in `pi-instrument-readings.ts` by the same function `readRequest` and `readSessionStart` use. Under `pi-virtual` it costs one `getBranch()` walk and no projection, so the Risks row's counts are unchanged.\n\nAdd 'the current pair' to the three D2 reading cells. Add one `pi-instrument-readings.test.ts` case: under `pi-virtual`, `readTreeJumped` returns the new branch's newest valid assistant pair. Add one publisher test: after a response consumes the pending request, `settled` posts that pair's live k with the flag off, not k = 1."
    }
  ],
  "assumptions": [
    {
      "assumption": "The round-2 resolutions landed in design.md and in specs/context-figures/spec.md:\n- OD4 (a): D8 baseline and candidate, rows (1)–(4), spec lines 152 and 161, and the retry test.\n- OD5 (a): `compacted` and `treeJumped`, the step 5 no-seed rule, and the two tree tests.\n- OD6 (a): take and clear first, the per-event projection counts, and the trimmed D2 cells.\n- STRUCT-R2-2 and STRUCT-R2-3.\n- CR-S3-R2-4: spec lines 11, 31, 36 and 60.",
      "status": "verified"
    },
    {
      "assumption": "The retry test's figure reproduces by hand at row 1's rates. 4,960 × 1.50/M − 3,000 × 18.75/M − 600 × 17.25/M = 0.00744 − 0.05625 − 0.01035 = −$0.05916.",
      "status": "verified"
    },
    {
      "assumption": "No reading other than `SessionStartedReadings` ('the model pair') and `RequestReading` (`pair`) carries the current pair. The D2 cells and D3's `CompactedReadings` and `TreeJumpedReadings` definitions show this.",
      "status": "verified"
    },
    {
      "assumption": "pi fires no event that taiknr registers when the user switches model with `/model` between requests. This rests on D2's six events and ruling 10's 13 registrations; I did not trace pi's `model_select` emission.",
      "status": "unverified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "Whether pi's virtual router can choose a different pair for the retried request than for the errored attempt. OD4's baseline is unaffected, because pricing uses the response's own pair.",
    "Whether pi auto-compaction emits `session_compact` mid-run, between a response and the next request of the same run. I took this from D2 as stated.",
    "Whether Jefferson repaints, or coalesces repaints, across the roughly 17 synchronous reports a `message_end` emits.",
    "Cache-marker placement and `cacheWrite` reporting for providers other than Anthropic."
  ]
}