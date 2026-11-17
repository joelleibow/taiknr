{
  "mode": "review",
  "lens": "council-critic",
  "paraphrase_proposes": "",
  "paraphrase_existing": "",
  "recommendation": "Ready for tasks. One minor wording fix is optional, and nothing blocks.\n\nEvery round-3 resolution landed as Michael ruled:\n- **CR-S3-R3-1.** Every event reading except `RequestReading`'s own block carries `pair: Pair | undefined`, all produced by one `readPair(ctx)`. `CompactedReadings` is `{ pair, projectionEstimate, contextWindow }`. The eager values now include the response's `provider` and `model`. D7 step 5 says the publisher remembers no pair between events. D2's four cells name the current pair, the Risks row adds the `getBranch()` cost, and the readings and publisher tests were added.\n- **STRUCT-R3-1.** spec.md lines 152 and 161 now read \"the last priced request\" and \"the first request priced … when it is warm\".\n- **STRUCT-R3-2.** `Pair` is declared in `src/domain/calibration.ts`.\n- **STRUCT-R3-3.** design.md line 111 cites the `configuration` and `jefferson-instruments` deltas.\n\nI checked pi-ai: every provider writes `model: model.id` on the assistant message and keeps any fallback in a separate `responseModel` field (anthropic-messages.js:564, 683–685; openai-completions.js:161, 347). So a response's pair and `ctx.model`'s `(provider, id)` key the same ratio-table entry, and the per-event pair rule is consistent.\n\nThe one leftover is a word problem. After this round's fix, the pending request still stores a `pair`, and two sentences say \"the pair it was requested under\". Under `pi-virtual`, that stored pair is the previous response's pair, not the routed model's, so an implementer could key a live sample on the wrong pair.",
  "findings": [
    {
      "id": "CR-S3-R4-1",
      "severity": "minor",
      "location": "design.md §D2, `context_with_system` row, \"Writes\" cell (\"overwrites the pending request: estimate, pair, recalled, …\"); §D7, \"One k per request\" paragraph (\"carries the pair it was requested under\"); Risks, model-switch row (\"or at a response the pair it was requested under\")",
      "finding": "After CR-S3-R3-1, no rule reads the pending request's stored `pair`:\n- response rows (1) and (2) use the response's own pair, passed eagerly as `provider` and `model` (D3);\n- rows (3) and (4) use the reading's `pair` (D7 step 5);\n- the request figures use `RequestReading.pair` at the request itself.\n\nD2 still has `requestBuilt` write `pair` into the pending request. D7 and the Risks row still call the response's pair \"the pair it was requested under\". Read together, these point an implementer at `pending.pair` as the key for the live sample.",
      "rationale": "Standard §3 asks for one canonical home per rule and explicit state shapes. State that nothing reads, next to a phrase that names it, is how the wrong source gets wired in.\n\nUnder a virtual selection, `RequestReading.pair` comes from `readPair`, which returns the newest valid assistant message's pair on the branch (D7 step 1). At the request, that is the previous response's pair, not the model the router is about to choose.",
      "concrete_case": "Joel uses a virtual model that routes between pair A (live, k = 0.62) and pair B (seed, 0.95).\n\n1. The previous reply was A's, so `readRequest` returns `pair` A, and `requestBuilt` stores A in the pending request.\n2. The router sends this request to B. The response's `provider` and `model` are B's.\n3. The implementer keys the live sample on `pending.pair`, following \"the pair it was requested under\". B's k of about 0.95 is written into A's entry, and `uncalibrated` is posted off for A.\n4. At the next `agent_settled`, `readPair` returns B, whose entry is still the seed, so the flag is on. Every later A request is scaled about 53 % high (0.95 ÷ 0.62).\n\nD3 and D7 do say \"the response's own pair\", so a careful reader avoids this. But the publisher test has no case that fails on the wrong key: its only response cases have the request pair equal to the response pair.",
      "recommendation": "Make three wording changes:\n- Drop `pair` from D2's `context_with_system` Writes cell. Nothing reads it.\n- In D7's \"One k per request\" paragraph, change \"carries the pair it was requested under\" to \"carries its own pair, its message's `provider` and `model`\".\n- Make the same change in the Risks row.\n\nAdd one publisher test: a request whose reading `pair` is A, answered by a valid response whose own pair is B. The test asserts that B's entry turns live and A's entry is unchanged."
    }
  ],
  "assumptions": [
    {
      "assumption": "The round-3 resolutions are in design.md and in specs/context-figures/spec.md:\n- CR-S3-R3-1: the D3 readings, the eager values, D7 step 5, the D2 cells, the Risks row, and the readings and publisher tests;\n- STRUCT-R3-1: spec lines 152 and 161;\n- STRUCT-R3-2: `Pair` in `src/domain/calibration.ts`;\n- STRUCT-R3-3: design.md line 111.",
      "status": "verified"
    },
    {
      "assumption": "pi-ai writes the assistant message's `model` from `model.id` and keeps a fallback model in a separate `responseModel` field. So a response's pair matches `ctx.model`'s `(provider, id)` for a physical model. Source: anthropic-messages.js:564, 683–685; openai-completions.js:161, 347; node_modules/@earendil-works/pi-ai at abaa6b0.",
      "status": "verified"
    },
    {
      "assumption": "Under `pi-virtual`, the assistant message carries the routed physical model's provider and model, not the virtual model's. Ruling 13 relies on this, and I did not trace pi's virtual router.",
      "status": "unverified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "Whether pi's virtual router can route the retried request to a different pair than the errored attempt.",
    "Whether Jefferson repaints, or coalesces repaints, across the roughly 17 synchronous reports a `message_end` emits.",
    "Cache-marker placement and `cacheWrite` reporting for providers other than Anthropic.",
    "I re-read no research report or ruling for sections this round left unchanged."
  ]
}