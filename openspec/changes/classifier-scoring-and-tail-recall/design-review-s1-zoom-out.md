{
  "mode": "review",
  "lens": "council-zoom-out",
  "paraphrase_proposes": "",
  "paraphrase_existing": "",
  "recommendation": "Pass with one minor altitude cleanup. The design solves the missing recall path using existing modules and host primitives, keeps dependencies inward, and adds no speculative source modules, dependencies, or neighboring features. The approved council rulings remain intact.",
  "findings": [
    {
      "id": "ZO-S1-1",
      "severity": "minor",
      "location": "openspec/changes/classifier-scoring-and-tail-recall/design.md:171 and 240 (Decisions 6 and 9)",
      "finding": "The design drops from contracts into implementation mechanics: it spells out the classifier timing statements and prescribes growing and repeatedly formatting a prefix item by item.",
      "rationale": "Zoom Out Standard §4 explicitly keeps pseudocode, helper internals, and loop mechanics out of design.md. The required architectural decisions are already clear: infra supplies elapsed time and native timeout options, while the use case chooses the longest ranked whole-item prefix using the domain formatter's size. Neither requires prescribing local variables or an iteration strategy. This is a document-altitude issue, not a challenge to rulings 2, 4, or 5.",
      "concrete_case": "An implementation that measures elapsed time with different local statements, or computes the same longest fitting prefix without repeatedly formatting every candidate prefix, meets the approved contracts but unnecessarily differs from the design's step-by-step recipe.",
      "recommendation": "Keep the native classify options, elapsed-time notice rule, longest-prefix contract, whole-item restriction, and owning modules in design.md. Move the literal timing statements and prefix-growth mechanics into tasks.md or leave them to implementation."
    }
  ],
  "assumptions": [
    {
      "assumption": "The recall seams already exist and are unimplemented, so this change completes a missing feature rather than introducing a parallel subsystem. Verified directly in src/domain/recall.ts, src/use-cases/recall-relevant-context.ts, src/infra/adapters/pi-context-adapter.ts, src/infra/adapters/pi-jev-scorer-adapter.ts, and src/infra/pi-event-handlers/context.ts.",
      "status": "verified"
    },
    {
      "assumption": "The proposed source placement follows the repository's existing Clean Architecture structure: formatting in domain, recall policy in the use case, Pi translation and event-time reads in infra, configuration validation in config, and session state wiring in app/extension. Verified against the src tree and existing handler and adapter implementations.",
      "status": "verified"
    },
    {
      "assumption": "Eligibility can reuse readArchiveBatchesFromBranch and its existing persisted-item validation rather than introducing another archive parser. Verified directly in src/infra/adapters/pi-archive-adapter.ts.",
      "status": "verified"
    },
    {
      "assumption": "The design's native timeout, request-budget, and branch-access mechanisms follow the approved platform research and council rulings; this review does not independently remeasure those platform facts.",
      "status": "verified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "No source files were edited, and no tests, live classifier calls, or verification scripts were run.",
    "Did not independently inspect or execute Pi's installed runtime; platform judgments use research-chidi.md and the approved council evidence.",
    "Did not reassess settled cache collisions, notifier placement, timeout behavior, host floor, or request-time redactor bypass. The documented latency, authentication-bound, and token-estimation risks remain."
  ]
}