{
  "mode": "review",
  "lens": "council-zoom-out",
  "paraphrase_proposes": "",
  "paraphrase_existing": "",
  "recommendation": "Pass with one minor documentation cleanup. The design solves the package's core missing behavior inside existing domain, use-case, infrastructure and wiring boundaries, reuses the current store and gate, and introduces no unnecessary production module, dependency or neighboring feature. Preserve M1–M11 and proceed to task breakdown.",
  "findings": [
    {
      "id": "ZO-S1-1",
      "severity": "minor",
      "location": "openspec/changes/archive-stubbing-and-branch-hydration/design.md — Decision 4, especially the surrogate-boundary cut mechanics",
      "finding": "The rendering decision drops below design altitude into helper implementation mechanics: it specifies the boundary code-unit inspection, the max-minus-one adjustment and the exact normalization call. The required single-line, well-formed UTF-16 output and length limits are design contracts; the cutting algorithm belongs in tasks or implementation.",
      "rationale": "Zoom Out Standard §4 keeps helper internals out of high-level design. M9's accepted behavior and helper ownership do not need reconsideration, but repeating its implementation recipe here makes the design another place to maintain the same algorithm.",
      "concrete_case": "For the documented input of 179 ASCII characters followed by a rocket emoji, the observable requirement is a preview no longer than 180 UTF-16 units that does not split the pair. An implementation satisfying that requirement through a different boundary-safe algorithm would unnecessarily disagree with this high-level document's max-minus-one recipe.",
      "recommendation": "Keep the separator class, length units and limits, verbatim raw-text contract, well-formedness guarantee, shared helper ownership and M9 citation here. Move the boundary-inspection and normalization-call recipe into tasks.md or implementation tests; do not change M9's settled behavior."
    }
  ],
  "assumptions": [
    {
      "assumption": "Existing archive seams and the composition-root state holders are sufficient; no new production module or signature change is needed.",
      "status": "verified"
    },
    {
      "assumption": "The existing Map-backed InMemoryArchiveStore already supplies ordered last-write-wins replacement, so hydration needs no separate deduplication mechanism.",
      "status": "verified"
    },
    {
      "assumption": "The composition-root gate already wraps all six non-start handlers, leaving session_start as the only archive handler requiring an explicit active-session guard.",
      "status": "verified"
    },
    {
      "assumption": "No existing production single-line or truncation helper is available to reuse; the proposed pure helper belongs in the existing archived-output domain module.",
      "status": "verified"
    },
    {
      "assumption": "Pi 1.5.2 lifecycle, persistence and rejection behavior works as recorded by Chidi and Michael; this review did not independently execute those platform paths.",
      "status": "unverified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "No files edited, tests or checks executed, model calls made, or live TUI inspected. Repository placement, existing archive seams, store behavior, shared fixture and gate were inspected directly alongside the required artifacts and both research reports.",
    "No independent runtime verification of Pi boundary persistence or the faux-provider harness. The documented optimistic-cache divergence, runtime-only carry-forward and unbounded branch archive remain accepted risks, not new mechanisms to add in this change."
  ]
}