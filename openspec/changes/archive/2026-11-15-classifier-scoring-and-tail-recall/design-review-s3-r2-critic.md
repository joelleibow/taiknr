{
  "mode": "review",
  "lens": "council-critic",
  "paraphrase_proposes": "",
  "paraphrase_existing": "",
  "recommendation": "Approve after two minor wording fixes; no mechanism changes. Joel's ruling (a) on CRIT-1 is applied everywhere it was required, and each copy matches the others: the spec has the renamed requirement and a new one, \"The bound covers only the request recall builds\", with its scenario; proposal.md's lead and its added sentence are in; design.md decision 2 has the new paragraph, the measured case and the two new alternatives; the coverage table, the Risks row, the README and ADR rows and both hand-off bullets are all present. Fixes: (1) the new Risks row says the compaction can only happen when pi would compact within a step or two anyway. That overstates it: it can happen whenever the conversation is within the size of the recalled block plus one step of pi's threshold, and the row leaves out Joel's 40,960-token models, where that is the usual case. (2) One of the live script's setup checks, read literally, always exits 2. I re-checked against pi 1.5.2's source and still agree with decision 2's estimate, reserve chain and threshold direction, and decision 10's 381- and 263-character counts are right.",
  "findings": [
    {
      "id": "CRIT-R2-1",
      "severity": "minor",
      "location": "design.md Risks / Trade-offs, second row (the new row for 'a recall that fills most of its budget'), its Mitigation cell",
      "finding": "The new row's mitigation says that on Joel's models 'the case arises only when the conversation is already within one step's growth of pi's threshold, where pi would compact within a step or two anyway.' That is wrong. pi's next check counts the conversation plus the recalled block plus the step's growth. So the case arises whenever the conversation is within the recalled block's size plus one step of the threshold, and without the block pi would not compact there. The row also names only the 1,000,000- and 262,144-token windows. Michael's own CRIT-1 evidence (michael-resolve-s3-r1.json) names the 40,960-token oMLX models too, and they are in ~/.pi/agent/models-store.json (e.g. L22096, cost 0).",
      "rationale": "Standard §6 says to cut inflated claims. Joel accepted the mechanism, so the acceptance stands either way. But this row is what an operator reads to judge how often the accepted compaction happens and when to raise reserveTokens. As written it describes a recall-caused compaction as one pi was about to do anyway, and on the small-window models it is neither rare nor something pi would have done anyway.",
      "concrete_case": "Case 1: a 262,144-token window with the default reserveTokens of 16,384 puts the threshold at 245,760. The conversation estimates at 190,000 tokens, decisionThreshold is 0, and the archive holds about 67k tokens (T9). Recall fits a 50,000-token block, so the request is 240,000, which is under the threshold. The model makes one tool call whose result is under 600 characters, so it is not archived. Before step 2 pi counts step 1's usage, about 240,000, plus about 6,000, which is over 245,760, so it runs a threshold compaction. Without recall the conversation would be at 196,000, about 50,000 tokens under the threshold and many steps away from compacting. Case 2: a 40,960-token oMLX model puts the threshold at 24,576. A 10,000-token conversation gives a budget of 58,304 characters, which holds T9's largest item (51,064 characters, about 12,800 tokens). The request is about 22,800 tokens, and a 2,000-token step then pushes pi's next check over 24,576. That compaction follows nearly every recall of a large item on this model.",
      "recommendation": "Replace the sentence with a correct one: 'The case arises when the conversation is within the recalled block's size plus one step's growth of pi's threshold. On the 1,000,000-token windows that needs a conversation near 900k tokens; on the 40,960-token oMLX models one large item is enough, and raising reserveTokens or decisionThreshold is the lever.' Add the 40,960 window to the list of Joel's models. Do not change the mechanism or the spec."
    },
    {
      "id": "CRIT-R2-2",
      "severity": "minor",
      "location": "design.md decision 13, '(6) Setup checks' (third check: 'the marker appears in any message before prompt 3'); src/infra/pi-event-handlers/agent-before-settle.ts (commit at end of run)",
      "finding": "Read literally, the setup check 'the marker appears in any message before prompt 3 → exit 2' fires on every run. taiknr stubs only at agent_before_settle, at the end of the run (agent-before-settle.ts; the design's own 'taiknr's own edits land only at agent_before_settle'). So prompt 1's second provider request, the one that carries the tool result before the model replies 'done', contains emit_marker's raw text and therefore the marker. The inline probe records every request, so a coder who checks 'any recorded message before prompt 3' always exits 2, and the script can never tick the verification task.",
      "rationale": "Under Joel's Q5(a) this script is the only thing that ticks verification. The check is meant to prove that the stub replaced the raw text before prompt 3, but its wording does not limit it to the requests that come after settlement. Exit 2 means 'the setup proves nothing', so the coder would read the failure as a broken harness.",
      "concrete_case": "Prompt 1: the model calls emit_marker. Its result of at least 600 characters is staged at turn_end but not stubbed. pi sends request 2 of prompt 1 with the full toolResult, marker included, and the inline probe records it. agent_before_settle then commits the stub. At prompt 3 the script checks whether the marker appears in any message recorded before prompt 3, finds it in prompt 1's request 2, and exits 2. It does this on every run, including a correct one.",
      "recommendation": "Reword the check to cover only what it is meant to prove. For example: 'in any request of prompt 2, or in prompt 3's pre snapshot, the marker appears in a message other than the recall block'. That shows the context_edit stub replaced the raw text after prompt 1 settled. No other change."
    }
  ],
  "assumptions": [
    {
      "assumption": "In pi 1.5.2, estimateTokens handles role 'system' (content, sections, toolsAdded), so decision 2's sum over event.messages, system messages included, is well-defined. estimateProjectedContextTokens counts only the current system message, so where the session has mid-conversation system messages the design's sum is the same or larger than pi's projection estimate. Recall is stricter there, never looser.",
      "status": "verified"
    },
    {
      "assumption": "pi's threshold check keys reserveTokens on this.model (getCompactionSettings(this.model)) and the window on the routed model when there is one (agent-session.js L476, L535). So decision 2's ctx.model override key and its _limitsModel() window match what pi itself does.",
      "status": "verified"
    },
    {
      "assumption": "shouldCompact uses a strict '>' (compaction.js L173-177), so decision 9's '<=' fit is 'at or under' the threshold, as the spec states.",
      "status": "verified"
    },
    {
      "assumption": "Decision 10's example strings are 381 characters for two items and 263 for one (counted by hand from the stated lines and the guard's added backslash).",
      "status": "verified"
    },
    {
      "assumption": "Joel's 40,960-token models are used as main models in sessions with large archives. They are in models-store.json, but how often Joel uses them is not measured.",
      "status": "unverified"
    },
    {
      "assumption": "The live classifier scores prompt 3's emit_marker item at or above 0.5 and prompt 2's at or below. The script's pass conditions depend on it, and nothing in the evidence measures it.",
      "status": "unverified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "I did not re-read research-chidi.md or research-eleanor.md in full. I spot-checked ctx.signal, estimateTokens, shouldCompact and the reserve keying against pi 1.5.2's source.",
    "The virtual or routed-model path through prepareRequest at agent-session.js L535, beyond confirming which model it reads the window and the reserve from.",
    "Whether compaction's keepRecentTokens keeps the latest user message after a mid-run threshold compaction. If it does not, step 2 falls into T11's no-user-message case.",
    "I ran nothing; all findings come from reading the design artifacts, the repository and pi's dist source.",
    "Settled findings CRIT-1 to CRIT-3, STR-1 and STR-2 were not reopened. Decision 7's table and template and decision 10's guard text are the same as in round 1."
  ]
}