{
  "mode": "review",
  "lens": "council-critic",
  "paraphrase_proposes": "",
  "paraphrase_existing": "",
  "recommendation": "Approve after one wording fix (minor). Nothing has changed since round 5. Decision 2's text and its line numbers are the same: design.md L126 and L394-395, spec L127 and L134, proposal L20. The four conditions on the settled critic-r1-CRIT-1 entry still hold. The narrowed wording is consistent. The Risks row keeps the corrected frequency. `lever` appears only in the T9 overflow row. The full statement of what settings can do lives only in decision 2.\n\nOne new minor finding, CRIT-R6-1, does not reopen the mechanism. It concerns what happens after the compaction Joel accepted. On a cache hit, decision 9 re-applies the whole-block fit to the post-compaction request. On the 40,960-token model this often drops the block for the rest of the turn. The compaction then buys nothing, and the item it was caused by is lost. The Risks row's closing sentence, 'Archived outputs stay recallable across a compaction', implies the opposite. Add one sentence to that row, and carry the fact to PL2 with the other three premise corrections.",
  "findings": [
    {
      "id": "CRIT-R6-1",
      "severity": "minor",
      "location": "design.md, Risks / Trade-offs, the 'A recall that fills most of its budget…' row (L395), read with decision 9's cache-hit step 3 (whole-block fit) and decision 4 (the token is store size plus key)",
      "finding": "The row says what happens up to the compaction recall causes, but not the next request under the same key. Hydration on `session_compact` keeps the store's size, so the token matches and decision 9's cache hit runs. Its step 3 appends the cached block only if it fits the post-compaction budget whole. The block fitted the pre-compaction budget, so it fails the check whenever the compaction freed fewer tokens than the step added. On small windows, pi's default `keepRecentTokens` of 20,000 (compaction.js L56) keeps the whole conversation, so that is the usual result. The row ends 'Archived outputs stay recallable across a compaction', which reads as if this turn's recall survives. Only the next user message scores again.",
      "rationale": "Feature-spec standard §6 says a claim must match the mechanism, and a caveat must name the operator decision it drives.\n\nHere is the mechanism. `findCutPoint` (compaction.js L334-360) keeps everything from the first message when the conversation adds up to less than `keepRecentTokens`, so the compaction frees little or nothing. The block lives only in the request (spec 'Recall writes nothing'), so the summary never sees it.\n\nOn the 40,960-token model, recalling a large item therefore costs:\n- one request that carries it;\n- a compaction and a summarisation call on the main model;\n- the rest of the turn without the item.\n\nThis changes what Joel accepted at PL2. He accepted 'recall can cause a compaction', not 'the compaction recall causes also removes the recall'. It is the same kind of missed recall decision 9 already accepts, never a wrong one, so the severity is minor.",
      "concrete_case": "The setup is the Risks row's own example:\n- model `mlx-community--Qwen3-0.6B-4bit`, `reserveTokens` 16,384, so the threshold is 24,576;\n- a 10,000-token conversation;\n- a 12,800-token item recalled (51,200+ characters, inside a budget of 4 × 14,576 = 58,304);\n- a 2,000-token tool step.\n\nPi's check sees about 24,800 tokens and compacts. `keepRecentTokens` is 20,000 and the conversation is about 12,000, so the cut point keeps everything. `session_compact` re-hydrates the store at the same size. The next request under the same key is a cache hit.\n\nThe new budget is 4 × (24,576 − ~12,000 − the summary) ≈ 50,000 characters or less. The 51,200-character block no longer fits, so step 3 appends nothing. Every later step of that tool loop runs without the item, and no notice is shown.",
      "recommendation": "Change wording only, not the mechanism. Append one sentence to the row's mitigation cell, along these lines:\n\n'Within the same user message, the next request is a cache hit, and decision 9 re-applies the whole-block fit. Where the compaction freed less than the step added, the block no longer fits, and the rest of that turn runs without it. This is the 40,960-token case, whose default `keepRecentTokens` of 20,000 keeps the whole conversation. The next user message scores again.'\n\nKeep 'stay recallable', but scope it to later user messages. The conductor should add this to the PL2 carry-forward list, next to the three existing premise corrections. Change no spec SHALL."
    }
  ],
  "assumptions": [
    {
      "assumption": "The design text under review matches round 5. Grep for 'lever|compaction.enabled|No taiknr setting|Neither setting' returns the same lines round 5 cited: design L120, L126 and L394, spec L127 and L134, proposal L20. michael-resolve-s3-r5.json records the round as clean, with no resolutions.",
      "status": "verified"
    },
    {
      "assumption": "pi 1.5.2's `DEFAULT_COMPACTION_SETTINGS.keepRecentTokens` is 20000 (compaction.js L56). `findCutPoint` defaults to keeping from the first valid cut point when the accumulated estimate never reaches `keepRecentTokens` (compaction.js L334-360). Read in node_modules/@earendil-works/pi-coding-agent/dist/core/compaction/compaction.js.",
      "status": "verified"
    },
    {
      "assumption": "A threshold compaction in that state still fires `session_compact`, which re-hydrates the store at the same size, so the next request is a cache hit under decision 4's token. This follows from design.md's 'What recall reads from the archive half' and from the round-4 probe recording 'recalled and compacted' on the 40,960-token case. I did not run anything to see whether the block was appended after the compaction.",
      "status": "unverified"
    },
    {
      "assumption": "pi's estimateTokens counts `system` messages (compaction.js L204-235), so decision 2's estimate over `event.messages`, system messages included, is pi's own rule.",
      "status": "verified"
    },
    {
      "assumption": "Carried over from earlier rounds: the live classifier scores prompt 3's emit_marker item at or above 0.5 and prompt 2's below it. Nothing measures this.",
      "status": "unverified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "I ran nothing. CRIT-R6-1 rests on reading compaction.js and on the design's own numbers, not on a probe that records the post-compaction request.",
    "Whether pi makes a summarisation call, or skips compaction, when the cut point keeps everything. That changes the cost of the case, not the fact that the block is dropped on the cache hit.",
    "I did not re-read research-chidi.md, research-eleanor.md, council.md or michael-council-rulings.json in full. Round 5 was clean and none of the artifacts under review changed. I read the whole of design.md, the tail-recall spec and owner-rulings.md.",
    "I checked the settled findings only against their stated conditions: critic-r1-CRIT-1 (its four conditions hold), CRIT-R2-1, CRIT-R2-2, CRIT-2, CRIT-3, STR-1, STR-2 and structural-r2-STR-1.",
    "Carried over: whether keepRecentTokens keeps the latest user message after a mid-run threshold compaction on large windows, where it does cut. If it does not, that is T11's no-user-message case."
  ]
}