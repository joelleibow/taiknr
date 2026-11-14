{
  "mode": "review",
  "lens": "council-zoom-out",
  "paraphrase_proposes": "",
  "paraphrase_existing": "",
  "recommendation": "Pass with one minor clarification: retain the existing module layout and minimal tooling plan, but explicitly keep the test's expected event names independent of production registrations.",
  "findings": [
    {
      "id": "ZO-S1-1",
      "severity": "minor",
      "location": "openspec/changes/foundation-and-packaging/design.md — Module & File Placement, “The event mapping”; Decision 6",
      "finding": "“One canonical table, which the seven stub bodies and the entry test both read” can imply a shared executable mapping, despite the explicit plan for no new source module and literal event registrations.",
      "rationale": "The existing handler modules already own their event registrations. A shared executable table adds unnecessary production indirection and, if it also supplies the test's expected names, defeats the independent wrong-event guard required by Decision 6 and ruling R6. The document's Markdown table is sufficient as a design reference.",
      "concrete_case": "An implementer makes the handlers and expected-name assertion read the same mapping, then changes session_tree to the valid Pi event session_before_tree in that mapping. Both production and the assertion change together, so the entry test passes instead of detecting the wrong event.",
      "recommendation": "Say this is a documentation reference table only. Keep each handler's event literal local and spell out the seven expected event names independently in the entry test; do not add a shared mapping module."
    }
  ],
  "assumptions": [
    {
      "assumption": "Root tooling configuration and mirrored tests are the only new file responsibilities; no additional production module is necessary.",
      "status": "verified"
    },
    {
      "assumption": "Existing handler modules own Pi lifecycle registration, while src/app/extension/taiknr.ts remains the composition root and domain/use-case code stays Pi-independent.",
      "status": "verified"
    },
    {
      "assumption": "Tool compatibility and manual Pi load behavior are supported by the recorded research and Michael's measurements; they were not independently executed during this read-only review.",
      "status": "unverified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "No commands, installations, tests, formatter passes, or Pi load checks were run, as required by the brief.",
    "No implementation diff exists in scope; lockfile reproducibility and final check results remain implementation acceptance risks."
  ]
}