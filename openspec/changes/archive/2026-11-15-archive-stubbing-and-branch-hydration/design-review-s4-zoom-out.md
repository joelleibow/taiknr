{
  "mode": "review",
  "lens": "council-zoom-out",
  "paraphrase_proposes": "",
  "paraphrase_existing": "",
  "recommendation": "Pass with one non-blocking documentation cleanup. Stages 2 and 3 add necessary failure handling and test coverage without introducing production layers, dependencies, signature changes or neighboring features. Proceed to task breakdown while preserving the approved rulings.",
  "findings": [
    {
      "id": "ZO-S4-1",
      "severity": "minor",
      "location": "openspec/changes/archive-stubbing-and-branch-hydration/design.md — Module & File Placement, Tests table (archive-session.test.ts row), and Decision 12",
      "finding": "The expanded session-test row now repeats Decision 12's harness recipe: bindExtensions/onError, temporary-directory isolation, persisted-entry versus private-store assertions, and the no-prototype-spies constraint. The row has become a second test-strategy section rather than a concise file-to-responsibility map.",
      "rationale": "Zoom Out Standard §4 asks the intermediate pass to catch post-edit bloat and keep implementation mechanics out of high-level design. The Stage 3 fixes are justified, particularly avoiding access to the composition root's private store; duplicating their full instructions in both the placement table and Decision 12 adds maintenance without additional coverage. Sources: michael-resolve-s3-r2.json and michael-resolve-s3-r3.json require the coverage and observation boundaries, not a new abstraction.",
      "concrete_case": "When archive-session.test.ts is implemented, its bindExtensions error capture and PI_CODING_AGENT_DIR/cwd isolation are specified independently in the table and Decision 12. Updating the harness instructions in only one location would leave two competing recipes even though the test's responsibility and required observable outcomes have not changed.",
      "recommendation": "Keep the table row to the session-level scenarios and a reference to Decision 12. State the shared harness and observation constraints once in Decision 12, and put the executable setup sequence in tasks.md. Preserve every approved scenario, isolation requirement, error assertion and non-spy observation boundary; add no test helper abstraction merely to shorten the document."
    }
  ],
  "assumptions": [
    {
      "assumption": "The existing production module set is sufficient: domain owns rendering, use cases own staging/commit/hydration, infrastructure owns Pi translation and lifecycle bridges, and the existing composition root owns state and gating.",
      "status": "verified"
    },
    {
      "assumption": "InMemoryArchiveStore.replaceAll already supplies whole replacement and ordered last-write-wins behavior through Map.set, so no additional deduplication service is needed.",
      "status": "verified"
    },
    {
      "assumption": "The composition root already supplies all archive state and registers non-start handlers through createGatedPi; SessionConfig supplies the active-state predicate and in-memory toggle without changes.",
      "status": "verified"
    },
    {
      "assumption": "No existing production single-line or surrogate-safe truncation helper was found under src; the proposed shared pure helper fits the existing archived-output domain module.",
      "status": "verified"
    },
    {
      "assumption": "Pi lifecycle and boundary-persistence mechanics behave as recorded in Chidi's research and Michael's measured rulings; this pass did not independently execute those paths.",
      "status": "unverified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "Read the required artifacts, both research reports, Stage 1 Zoom Out report and Stage 2/3 resolutions; inspected source layout, archive seams, store, gate, config state and shared fixture. No files edited, tests or checks run, model calls made, or live TUI inspected.",
    "Accepted risks remain: optimistic-cache divergence until hydration, runtime-only carry-forward, duplicated persisted raw text and uncapped whole-branch archive growth. No new mitigation or neighboring feature is requested."
  ]
}