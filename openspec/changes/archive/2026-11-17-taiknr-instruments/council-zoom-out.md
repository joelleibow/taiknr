{
  "mode": "council",
  "lens": "council-zoom-out",
  "paraphrase_proposes": "",
  "paraphrase_existing": "",
  "recommendation": "Proceed to design after reconciling the two contract issues below. The requested instruments warrant new code, but not a parallel accounting pipeline or a general telemetry framework. Preserve the existing store, request bridge, recall formatter and host estimator. Keep arithmetic in domain/use cases, pi DTO translation and Jefferson declarations/emission in infra, and session-owned state and dependency composition in src/app/extension/. For O1, prefer message_end for final response usage and agent_settled for post-commit context publication; those additions have concrete freshness/consistency reasons. For O2, observe classifier lifecycle and cost at the existing scorer adapter, without adding progress semantics to recall's domain-facing port. Permit the narrow dependency changes needed to wire that observation explicitly.",
  "findings": [
    {
      "id": "ZO-1",
      "severity": "major",
      "location": "openspec/changes/taiknr-instruments/specs/extension-packaging/spec.md — “Signatures unchanged”, exception (5); src/infra/pi-event-handlers/context.ts:32–86; src/infra/adapters/pi-jev-scorer-adapter.ts:26–99; src/use-cases/ports.ts:13–19",
      "finding": "The new exception permits publishing registrars and possibly a progress-port member, but still explicitly freezes the existing registrar dependency shapes and scorer-adapter signature. That excludes the smallest explicit integration needed to observe the actual recall block and classifier cost.",
      "rationale": "The existing context handler constructs its scorer internally, owns the returned recalled outputs, and has no publishing dependency. The scorer adapter receives classify's result but discards usage before returning RelevanceScore[]. An outer RelevanceScorer wrapper can observe running/count, but cannot recover the reported classifier cost. Preserving these signatures literally encourages extra handlers, host-object interception or hidden shared state rather than putting observation beside the operation that owns the data. Sources: direct inspection of the cited code; owner-rulings.md Orientation Q2(a); zoom-out-standard.md §§2–3.",
      "concrete_case": "A classify call reports $0.002 usage cost, then returns malformed answers. The scorer throws and recall fails open. A wrapper around the unchanged RelevanceScorer sees only the throw; neither it nor a new lifecycle registrar can subtract the $0.002 required by Q2(a). Similarly, a separate request observer does not directly receive the outputs returned inside registerContextHandler.",
      "recommendation": "Replace the over-restrictive publishing exception with an explicit allowance for narrowly enumerated dependency additions to existing handlers and the scorer adapter. Let the existing adapter observe classify start/end and reported usage before result validation, and let the existing request bridge expose its final recalled block/request observation. Wire these dependencies in taiknr.ts; retain the RelevanceScorer result contract and recall behavior. Do not introduce a domain progress port or generic event framework solely to avoid changing these local signatures."
    },
    {
      "id": "ZO-2",
      "severity": "major",
      "location": "openspec/changes/taiknr-instruments/specs/context-figures/spec.md — “Two savings figures become known at different moments”; michael-orientation.md — S4 and T21",
      "finding": "The delta requires publishing the new request's token savings separately before its response, leaving the displayed dollars associated with the preceding request. This contradicts settled S4, which publishes the token/dollar pair together at the response.",
      "rationale": "The feature's root purpose is to make taiknr understandable without misleading users. A single per-request savings instrument containing values for two different requests defeats that purpose. S4 already supplies the simpler resolution; adding request identities, pending states or another presentation mechanism would be unnecessary scope introduced to repair this delta. Source: the changed scenario versus orientation S4, “How it is published: together with that request's token savings”, and T21's warning.",
      "concrete_case": "Request A completes with +1,200 tokens and +$0.004 savings. Request B begins with a large recall block and −5,000 estimated tokens. Under the scenario, the savings instrument can show −5,000 tokens beside +$0.004 throughout B's response, although B's dollars are not yet known.",
      "recommendation": "Align the scenario with S4: update the per-request savings pair from one completed response, keeping the previous completed pair while another request runs. The separate context instrument can still show the in-flight context estimate. Update cumulative savings from the same completed-request accounting boundary; no request-ID mechanism or new setting is needed."
    }
  ],
  "assumptions": [
    {
      "assumption": "The latest owner rulings fix four instruments, one default-on switch, in-memory since-start totals, net classifier spend, no Jefferson edits, and no recall-budget correction in this change.",
      "status": "verified"
    },
    {
      "assumption": "No existing src module implements calibration, dollar accounting or Jefferson publication; existing reusable inputs are ArchiveStore, the context bridge, formatRecalledContext, and pi's estimateTokens.",
      "status": "verified"
    },
    {
      "assumption": "Jefferson contract behavior and pi event timing are as documented in research-chidi.md and michael-orientation.md; platform execution was not independently reproduced in this pass.",
      "status": "unverified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "No files were edited; no test, compiler, loader or live provider/classifier command was run.",
    "Jefferson rendering, repaint during classification, and Joel's live acceptance remain unchecked.",
    "Provider normalization and virtual-model request/response pairing were not independently traced; dollar savings remain counterfactual estimates."
  ]
}