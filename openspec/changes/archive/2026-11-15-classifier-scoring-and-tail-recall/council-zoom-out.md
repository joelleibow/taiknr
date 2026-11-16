{
  "mode": "council",
  "lens": "council-zoom-out",
  "paraphrase_proposes": "",
  "paraphrase_existing": "",
  "recommendation": "Proceed with the existing recall seams and no new dependency or parallel subsystem. Before design approval, explicitly permit the minimal contract changes needed for request budgeting, and distinguish cached classification from request-local branch eligibility and capacity checks. The proposal otherwise places formatting, host translation, classification, orchestration and wiring in their existing owning layers and keeps neighboring cards out of scope.",
  "findings": [
    {
      "id": "ZO-1",
      "severity": "major",
      "location": "proposal.md §Impact (recall-relevant-context.ts); specs/extension-packaging/spec.md §The extension entry loads without error; openspec/specs/extension-packaging/spec.md §Handler signatures and the import boundary are preserved; src/use-cases/recall-relevant-context.ts:4–31",
      "finding": "The proposal assigns context-budget enforcement to the use case but leaves its contract unable to receive the request's available capacity, while the packaging delta does not relax the existing contract freeze.",
      "rationale": "RecallRelevantContextInput currently contains only promptKey, promptText, decisionThreshold and signal; its dependencies expose only archive, scorer, notifier and cache. None exposes the current request, model window or reserved tokens. The same archive and prompt therefore supply identical use-case inputs even when available capacity differs. Fetching Pi state from the use case would violate the settled inward dependency boundary; hiding it in the archive or scorer would mix responsibilities. This is a contract issue to settle explicitly, not a reason to introduce a new budget subsystem. Source: inspected use-case and port declarations, the approved packaging contract freeze, and the proposal's assignment of the size bound to the use case.",
      "concrete_case": "A prompt initially has room for an 8k-token recalled item. Subsequent tool-loop messages consume that headroom while the prompt key and archive remain unchanged. With the currently declared use-case inputs, recall cannot distinguish that later request from the first or enforce the owner's request-size bound.",
      "recommendation": "Enumerate a minimal additional contract exception in the packaging delta for host-neutral request-budget input or an equivalent narrow use-case seam. Obtain host estimates in infra and pass only the data the recall policy needs inward. Reuse Pi's existing context-usage/estimation facilities rather than writing a second tokenizer or importing Pi into the use case. Reapply the capacity bound on each request, including scoring-cache hits."
    },
    {
      "id": "ZO-2",
      "severity": "major",
      "location": "proposal.md §Open Questions O5; michael-orientation.md §Open O5; specs/tail-recall/spec.md §Recall yields to edits taiknr did not write and to items off the branch; src/use-cases/recall-relevant-context.ts:11–14",
      "finding": "Checking branch admission only 'per scored key' is insufficient for the unconditional requirement that recalled items remain eligible on the current branch. Classification reuse must not also freeze admission.",
      "rationale": "The scoring key describes a user message, not the branch's latest edits. The existing cache holds lastRecalledIds, so a straightforward cache-hit implementation can return those items without revisiting the edit that now governs their visibility. A foreign edit need not alter the archive, so the spec's 'while the archive is unchanged' cache qualification does not resolve this. This does not reopen settled S9: it identifies the smallest separation needed to implement it correctly. Source: O5's suggested read frequency, the new recall eligibility requirement, the inspected cache shape, and ADR 0005's competing-edit principle as documented in the research.",
      "concrete_case": "After an initial request recalls item X, another extension places a redacting context_edit for X on the active branch before a later provider request under the same latest-user key. The in-memory archive still holds X unchanged. Reusing cached recalled IDs after only a per-scored-key branch check restores X's raw text despite the newer redaction.",
      "recommendation": "Cache classifier decisions, not permission to expose raw text. Read current branch eligibility before each request's append, including cache hits, and silently remove ineligible IDs without another classifier call. Keep Pi entry/edit interpretation in the existing infra adapter/handler boundary; do not add branch revisions, store-write hooks or changes to archive handlers merely to invalidate this check. Add one same-key, unchanged-archive test with a newly introduced foreign edit."
    }
  ],
  "assumptions": [
    {
      "assumption": "The existing source tree already provides appropriate owners: domain/recall.ts for pure formatting/selection, use-cases/recall-relevant-context.ts for recall orchestration, infra/adapters for Pi translation/classification/notification, and app/extension/taiknr.ts for composition.",
      "status": "verified"
    },
    {
      "assumption": "No new runtime dependency is needed: Pi already supplies classifier lookup/calls and context-size facilities; the repository already supplies the archive, cache seam, notifier, gate and mirrored test layout.",
      "status": "verified"
    },
    {
      "assumption": "The timeout remains a configurable positive integer with no retries, as Joel ruled; ten measured calls establish a baseline around 245 ms but not a tail-latency guarantee.",
      "status": "verified"
    },
    {
      "assumption": "The high-level design will explicitly define cache state sufficient to preserve scoring and recompute request-local admission rather than treating lastRecalledIds as the complete classification result.",
      "status": "unverified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "No files were edited, and no tests, model calls or classifier calls were run in this council pass.",
    "Did not independently validate serialized provider-prefix bytes, actual overflow recovery, or Jev recall quality.",
    "Did not choose the timeout default or design the detailed cache/error mapping; these remain design work within the recorded rulings.",
    "Risk: contract-preserving workarounds must not leak Pi state into the use case or let cached IDs bypass current redaction and capacity checks."
  ]
}