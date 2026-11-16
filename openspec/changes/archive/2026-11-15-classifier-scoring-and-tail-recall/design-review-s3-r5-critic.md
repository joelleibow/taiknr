{
  "mode": "review",
  "lens": "council-critic",
  "paraphrase_proposes": "",
  "paraphrase_existing": "",
  "recommendation": "Approve with no findings. All four parts of Michael's round-4 fix for critic-r4-CRIT-R4-1 are in:\n- design.md L126 now says 'No taiknr setting removes the case while recall is on'. It names pi's global `compaction.enabled: false` as the one host setting that does remove it. It cites the code and the round-4 probe, and it says the design does not recommend that setting.\n- spec L127 keeps its SHALL on the bound alone. 'No taiknr setting avoids it while recall is on (design decision 2)' is now a plain sentence with no SHALL.\n- The spec scenario at L134 is renamed 'Neither setting removes it'.\n- proposal L20 says 'no taiknr setting avoids it'.\n\nI checked the four conditions the settled critic-r1-CRIT-1 entry lists:\n- The narrowed wording is present and consistent across design.md, the spec and the proposal.\n- The Risks row still gives the corrected frequency from critic-r2-CRIT-R2-1.\n- `reserveTokens` is called a 'lever' in only one place: the T9 undercount row (L394), where that is correct.\n- The full statement of what settings can do lives only in decision 2. The Risks row and the README bullet name only `decisionThreshold` and `reserveTokens`, as Michael's resolution meant.\n\nThe line numbers cited for pi 1.5.2 match the installed source: compaction.js L174, agent-session.js L2489 and docs/compaction.md L437. Nothing outside the paragraph patched in round 4 changed.",
  "findings": [],
  "assumptions": [
    {
      "assumption": "All four parts of the round-4 required_change from michael-resolve-s3-r4.json are applied:\n- design.md L126 has the replacement text with the `compaction.enabled: false` statement and its probe citation.\n- spec L127 has the clause with no SHALL.\n- The spec scenario at L134 is retitled.\n- proposal L20 says 'no taiknr setting'.\nChecked by reading design.md, proposal.md and specs/tail-recall/spec.md, and by grep for 'setting|lever|compaction.enabled|reserveTokens'.",
      "status": "verified"
    },
    {
      "assumption": "The pi 1.5.2 citations in decision 2 match the installed package:\n- `shouldCompact`'s `if (!settings.enabled)` is at compaction.js L174, inside the cited L173-175.\n- `_checkCompaction`'s early return is at agent-session.js L2489, inside L2487-2490.\n- 'Disable auto-compaction with \"enabled\": false' is at docs/compaction.md L437.\nChecked by grep in node_modules/@earendil-works/pi-coding-agent.",
      "status": "verified"
    },
    {
      "assumption": "No SHALL in the spec still forbids a later headroom mechanism or a `session_before_compact` mechanism. The remaining 'The bound SHALL cover only the request recall builds' limits what the bound claims; it does not forbid a mechanism. A later headroom change would have to change this requirement's 'Pi's next check can compact' scenario anyway, so it would arrive as an ordinary MODIFIED delta, not as a breach of a false host-fact SHALL like the one round 4 removed. I judge this sufficient, so I raise no finding.",
      "status": "verified"
    },
    {
      "assumption": "Outside the T9 undercount row (L394), where it is correct, no artifact of this change calls `reserveTokens` the lever for recall-caused compactions. The Risks row and the README bullet say raising it 'only moves' the case.",
      "status": "verified"
    },
    {
      "assumption": "The live classifier scores prompt 3's emit_marker item at or above 0.5 and prompt 2's below it. Carried over from earlier rounds; nothing measures it.",
      "status": "unverified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "I ran nothing. The `compaction.enabled` behaviour rests on Michael's round-4 probe and on the source lines I grepped.",
    "I did not re-read research-chidi.md, research-eleanor.md, council.md, michael-council-rulings.json or owner-rulings.md in full. Per michael-resolve-s3-r4.json, only the CRIT-R4-1 sentences changed since round 4, and I read all of design.md, the tail-recall spec and the proposal.",
    "The settled findings stay closed: CRIT-1's mechanism, CRIT-2, CRIT-3, STR-1, STR-2 and structural-r2-STR-1. For CRIT-1 I checked only the four listed conditions.",
    "The README and ADR 0007 hand-off bullets do not mention `compaction.enabled: false`, so an operator reading only the README will not learn that this host setting exists. Decision 2 holds the full statement and does not recommend the setting, as settled. If Joel wants operators told, he should say so at PL2.",
    "Carried over: whether pi's keepRecentTokens keeps the latest user message after a mid-run threshold compaction. If it does not, that would be T11's no-user-message case."
  ]
}