{
  "assumptions": [
    {
      "assumption": "The Module & File Placement table's C/M labels and paths match the repository tree: every Modify row names an existing file and every Create row names a path that does not exist today (including the absent tests/infra/pi-event-handlers/context.test.ts mirror and the single file in tests/domain/).",
      "status": "verified"
    },
    {
      "assumption": "The frozen shapes the design relies on match HEAD: RecallCache {lastPromptKey, lastRecalledIds}, RecallRelevantContextInput's four existing fields, the context registrar's {config, store, notifier, recallCache} dependency object, the throwing recall bodies, the notifier's warned-before-notify bug, and the _pi.on(\"context\", () => {}) registration.",
      "status": "verified"
    },
    {
      "assumption": "estimateTokens and DEFAULT_COMPACTION_SETTINGS are exported from the pi package root, as decision 2's budget requires.",
      "status": "verified"
    },
    {
      "assumption": "Decision 10's exact block string is 381 UTF-16 code units and the first item alone is 263, as asserted.",
      "status": "verified"
    },
    {
      "assumption": "Decision 6's sample stub string matches buildStub's output format in src/domain/archived-output.ts.",
      "status": "verified"
    },
    {
      "assumption": "A root-level .mjs stays outside the vitest include (tests/**/*.test.ts), biome's files.includes and tsconfig's program, as decision 13 claims.",
      "status": "verified"
    },
    {
      "assumption": "Docs-pass targets exist: docs/adr ends at 0006 so 0007 is next, README carries the field table, ARCHITECTURE.md has §3/§5/§7, and AGENTS.md line 3 is the opening paragraph naming recall a stub.",
      "status": "verified"
    },
    {
      "assumption": "pi runtime behaviours cited by the design (context_with_system send-as-is, timeout arriving as stopReason \"error\", the noul wire type, the reserve resolution chain's keys, maxRetries defaulting to 2) hold as described.",
      "status": "unverified"
    },
    {
      "assumption": "The mktemp probe measurements behind decisions 2, 12 and 13 (pi's next-check compaction, the fetch-stub guard, the additionalExtensionPaths load order) hold as recorded.",
      "status": "unverified"
    }
  ],
  "findings": [
    {
      "concrete_case": "An implementer picking up the \"Load check passes\" scenario opens this change's design.md decision 6 and finds the System One question map and timeout path; the git-archive load-check procedure appears in no decision of this design.md, so the scenario's setup has no home in the change's own artifacts.",
      "finding": "The scenario's setup cites \"(design.md Decision 6)\", inherited verbatim from the living spec, where it refers to the packaging change's design document. Read inside this change, it resolves to this change's design.md decision 6, which is the classifier-call protocol; the load-check procedure appears in no decision of this design.md.",
      "id": "structural-r2-STR-1",
      "location": "specs/extension-packaging/spec.md, requirement \"The extension entry loads without error\", scenario \"Load check passes\" (the parenthetical \"(design.md Decision 6)\")",
      "rationale": "The feature-spec standard requires coherent cross-references between specs/ and design.md. A MODIFIED delta restates the requirement's full scenario text including its citations, and a citation that resolves to unrelated content inside the change's own artifacts misdirects anyone verifying that scenario.",
      "recommendation": "In the delta, qualify the parenthetical to name the artifact it actually cites (the packaging change's design.md under openspec/changes/archive/), or drop it and let the living spec carry it. The requirement text, the scenario's WHEN/THEN, and every other part of the delta stay as written; this is a citation-qualification edit only.",
      "severity": "minor"
    }
  ],
  "lens": "council-structural",
  "mode": "review",
  "not_checked": [
    "pi's dist internals beyond the package-root export check (runner.js, settings-manager.js, agent-session.js, system-one-shared.js) — relied on Chidi's citations and the rulings' evidence",
    "tasks.md — not on this brief's read list; STR-2's guard-home naming check belongs to Stage 5",
    "michael-orientation.md itself — cited throughout but not on this brief's read list; its D/S/T/O codes are taken as defined by council.md and the design's citations",
    "Any execution: the suite, the live script and the probes were not run; this pass is read-only inspection",
    "Round-1 findings outside the settled list whose sections did not change"
  ],
  "owner_questions": [],
  "paraphrase_existing": "",
  "paraphrase_proposes": "",
  "recommendation": "Approve from the structural lens: no blocking or major findings; one minor cross-reference fix in the extension-packaging delta (the load-check scenario's \"design.md Decision 6\" citation resolves to the classifier-call decision inside this change). The placement table matches the repository exactly, layering holds with pi types confined to infra, each rule and constant has one home, every spec requirement maps to a decision, and claims are calibrated. All five settled findings' round-2 conditions were verified present and consistent; none is reopened."
}