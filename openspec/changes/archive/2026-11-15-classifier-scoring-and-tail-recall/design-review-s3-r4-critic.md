{
  "mode": "review",
  "lens": "council-critic",
  "paraphrase_proposes": "",
  "paraphrase_existing": "",
  "recommendation": "Approve, with one optional minor wording fix and no mechanism change. The round-3 fix (critic-r3-CRIT-R3-1) is in everywhere. Decision 2's 'The measured case', the Risks row and the README hand-off bullet now say raising `decisionThreshold` shrinks the block and raising `reserveTokens` only moves the case. Spec L127/L132-137 and proposal L20 match that. The only remaining 'lever' sentence is the T9 undercount row, where it is correct. The probe numbers check out against the stated inputs. The one new problem is in the replacement wording itself: 'No setting removes the case while recall is on' (design L126, proposal L20) and the spec's 'no setting SHALL avoid that while recall is on' (L127) are not true. Setting pi's own `compaction.enabled: false` removes the case, at the price of turning off all of pi's auto-compaction. The spec also states this host fact as a SHALL.",
  "findings": [
    {
      "id": "CRIT-R4-1",
      "severity": "minor",
      "location": "design.md decision 2 'The measured case' (L126, sentence 'No setting removes the case while recall is on.'); specs/tail-recall/spec.md L127 ('and no setting SHALL avoid that while recall is on') and the scenario title 'Neither setting avoids it' (L134); proposal.md L20 ('no setting avoids it while recall is on')",
      "finding": "The wording added in round 3 says no setting avoids recall-caused compactions while recall is on. pi's own `compaction.enabled: false` does avoid them. `shouldCompact` returns false when `!settings.enabled` (`compaction.js` L173-175). That function serves both the pre-step check (`agent-session.js` L476) and the post-run threshold check (L2602). `_checkCompaction` also returns early on `!settings.enabled` (L2488-2490). The design itself says 'The bound applies whatever `compaction.enabled` says' (decision 2, 'The reserve'), so it already knows the setting exists, yet it says no setting removes the case. The spec makes this worse by writing a host fact as a normative SHALL ('no setting SHALL avoid that'). That clause binds nothing taiknr does. A later change that adds headroom or a `session_before_compact` handler would technically break it, even though both were only set aside by Joel's ruling, not forbidden as behaviour. The scenario title 'Neither setting avoids it' is also too strong for `decisionThreshold`. The design's own text says raising it shrinks the block whenever it drops kept items, and that can take a conversation out of the exposure range.",
      "rationale": "Standard §6 asks that caveats be calibrated and name the operator decision they drive. Consider an operator on the 40,960-token model, where the Risks row says a compaction follows nearly every large-item recall. Reading 'no setting avoids it', they would conclude their only choice is turning taiknr off. In fact pi's auto-compaction toggle is a second, separate trade: no recall-caused compactions, but also no threshold compaction and no overflow recovery, since `_checkCompaction` returns false before both. The design may reasonably decline to recommend that toggle, but it should not say it does not exist. This sentence is new in round 3, so it is in scope under the settled CRIT-1 condition ('the narrowed wording is present and consistent').",
      "concrete_case": "pi 1.5.2, a 40,960-token window, `reserveTokens` 16,384, a 9,384-token conversation, a 12,800-token item recalled, then a 3,000-token tool step: 9,384 + 12,800 + 3,000 = 25,184 > 24,576, so the threshold compaction fires (Michael's round-3 probe row). Repeat with `compaction.enabled: false` in pi's settings. Recall still fits, because decision 2's budget ignores `enabled`. At the pre-step check `shouldCompact` returns false at L174, so no compaction is persisted. The case is avoided while recall is on, which contradicts design L126, spec L127 and proposal L20.",
      "recommendation": "Change wording only; leave the mechanism and Joel's ruling text alone.\n\n- design.md L126: replace 'No setting removes the case while recall is on.' with 'No taiknr setting removes the case while recall is on. pi's own `compaction.enabled: false` does, because `shouldCompact` and `_checkCompaction` return early on it (`compaction.js` L173-175; `agent-session.js` L2488-2490). But it also turns off pi's threshold and overflow compactions for every request, so this design does not recommend it.'\n- spec L127: replace ', and no setting SHALL avoid that while recall is on' with a non-normative sentence after the citation: 'No taiknr setting avoids it while recall is on.' This keeps the SHALL on the bound only.\n- spec L134: retitle the scenario to 'Neither setting removes it'.\n- proposal L20: change 'no setting avoids it while recall is on' to 'no taiknr setting avoids it while recall is on'.\n\nAdd this to the CRIT-R2-1 and CRIT-R3-1 corrections the conductor already names to Joel at PL2."
    }
  ],
  "assumptions": [
    {
      "assumption": "The round-3 fix to critic-r3-CRIT-R3-1 is in. design.md L126, the L395 Risks row and the L428 README bullet no longer call `reserveTokens` the lever for recall-caused compactions. Spec L127/L136-137 and proposal L20 say raising `reserveTokens` moves the case. The only remaining 'lever' sentence is the T9 undercount row (L394), where it is correct. Checked by grep for 'lever|reserveTokens' across design.md, proposal.md and specs/.",
      "status": "verified"
    },
    {
      "assumption": "Decision 2's 40,960-token probe rows are consistent with the stated inputs. 9,384 + 9,000 + 3,000 = 21,384, under 24,576 (no compaction) and over 20,960 (compaction). 9,384 + 12,800 = 22,184 fits at reserve 16,384, compacts after the step (25,184 > 24,576), and does not fit at 20,000 (22,184 > 20,960). The control, 12,384, does not compact.",
      "status": "verified"
    },
    {
      "assumption": "pi 1.5.2's `shouldCompact` and `_checkCompaction` both return early when `compaction.enabled` is false, so disabling auto-compaction removes both the pre-step and post-run threshold compactions and overflow recovery. Read in node_modules/@earendil-works/pi-coding-agent/dist/core/compaction/compaction.js L173-177 and agent-session.js L476, L2487-2604.",
      "status": "verified"
    },
    {
      "assumption": "The Risks row's corrected frequency (critic-r2-CRIT-R2-1) is unchanged since round 3: the exposure is as wide as the block, roughly the top 7% on the 1,000,000-token windows, over a quarter on the 262,144-token windows, and one large item on the 40,960-token model.",
      "status": "verified"
    },
    {
      "assumption": "The live classifier scores prompt 3's emit_marker item at or above 0.5 and prompt 2's below it. Carried over from round 2; nothing measures it.",
      "status": "unverified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "I ran nothing. The `compaction.enabled` finding comes from reading pi 1.5.2's dist source, not from a probe run.",
    "I did not re-read research-chidi.md, research-eleanor.md, council.md or michael-council-rulings.json in full. Per michael-resolve-s3-r3.json, only the CRIT-R3-1 sentences changed since round 3.",
    "The settled findings stay closed: CRIT-1's mechanism, CRIT-2, CRIT-3, STR-1, STR-2 and structural-r2-STR-1. For CRIT-1 I checked only its wording and frequency, and found only CRIT-R4-1.",
    "Carried over: whether pi's keepRecentTokens keeps the latest user message after a mid-run threshold compaction, which would be T11's no-user-message case."
  ]
}