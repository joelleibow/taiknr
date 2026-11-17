{
  "assumptions": [
    {
      "assumption": "All 15 Modify paths exist on disk and match the plan's current-state descriptions: src/app/extension/taiknr.ts wires seven registrars (registerSessionStartHandler on raw pi, the rest through createGatedPi); registerContextHandler's deps are exactly {config, store, recallCache} (context.ts:37-41); createPiJevScorerAdapter takes two parameters (pi-jev-scorer-adapter.ts:24); fake-pi has no events/emitted/emitThrows/buildSessionProjection and createContextStub's model is {provider, id} without api; taiknr.test.ts asserts exactly the 7 sorted events against a proxy that throws on any member but on; tsconfig.json carries no verbatimModuleSyntax; package.json holds no pi-jefferson and check is lint → typecheck → test; taiknr-config.ts uses the FIELD_RULES/layered/returned-object pattern 11.1 describes; the TaiknrConfig literals sit at session-config.test.ts:9 and handler-gate.test.ts:8; the known-fields test spans taiknr-config.test.ts:228-241",
      "status": "verified"
    },
    {
      "assumption": "All 30 Create paths are absent at abaa6b0 (find over src/** and tests/**), so every 'not an existing path' claim and the whole Create table hold",
      "status": "verified"
    },
    {
      "assumption": "handler-gate.ts's wrapper tests session.isActive() and calls the handler synchronously in the same tick as emit, so a gated session_start registration emits before its first await — D1's and 13.1's ordering claim",
      "status": "verified"
    },
    {
      "assumption": "The named reuse sites exist: formatRecalledContext exported from src/domain/recall.ts, classifier-guard at tests/support/classifier-guard.ts, ArchiveStore with size()/getAll() and no added member in src/use-cases/ports.ts, and archive-session.test.ts's harness exposes extensionFactories, so 14.3's listener extension is realizable exactly as described",
      "status": "verified"
    },
    {
      "assumption": "Counts and arithmetic recompute: D5's table is 17 fields; the 13-entry registration list is 8 duplicates + 5 singles; Create=30 and Modify=15 in tasks.md match design.md's Module & File Placement one-for-one; D8 row 1 gives −$0.00311 and 6.4's retry sequence gives −$0.05916 at row 1's rates; the 7 base assertion failures in taiknr-config.test.ts decompose as default + 2 layering orders + 3 rejection values + the known-fields test's unknown field",
      "status": "verified"
    },
    {
      "assumption": "Round 1's five findings are remedied in the current text: 14.1 names each registrar's placement ('immediately after' its hydration/outcome registrar; response and settled have none), 8.1 drops the unachievable 328 criterion, the fixed-names bullet is reworded to the Interfaces block (which lists InstrumentPublisher), the two scope scenarios name 14.4's diff check as proof, and 12.2 records the Gaps-4 messageIndex supersession beside its A9 citation",
      "status": "verified"
    },
    {
      "assumption": "The 22-file/328-test baseline, the red totals (323 collected of 323+11 import failures), and the red/green labels A1–A12 are as redgreen-derek.md and the settled rulings record them; I did not re-run the suite",
      "status": "unverified"
    },
    {
      "assumption": "pi-jefferson@0.14.0 contract internals and the pi 1.5.2 line citations (loader.js, runner.js:1040-1068, agent-session.js, model-registry.js:91, compaction.js, types.d.ts:306) are as research-chidi and the settled findings state; I did not read the host packages' sources",
      "status": "unverified"
    },
    {
      "assumption": "npm install --save-exact writes the caret-free pin exactly as Gaps 5 recorded; not re-run",
      "status": "unverified"
    }
  ],
  "findings": [
    {
      "concrete_case": "Coder finishes 11.1's Code line (taiknr-config.ts gains the type member, the default, the field rule, the returned-object member), runs npm run check: typecheck fails 'TS2741: Property \\'jeffersonInstruments\\' is missing in type \\'{ decisionThreshold: number; …; enabled: boolean; }\\' but required in type \\'TaiknrConfig\\'' at session-config.test.ts:9 and handler-gate.test.ts:8. The 11.1 text they just satisfied still says those tests are 'unchanged and green', and no task's Code or Verified field mentions either file; only the Modify table does.",
      "finding": "11.1's Code line names only src/config/taiknr-config.ts, and its Verified line claims 'every other test in the three files unchanged and green' — but adding the required jeffersonInstruments member to TaiknrConfig makes the `const config: TaiknrConfig = { … }` literals at tests/config/session-config.test.ts:9 and tests/app/extension/handler-gate.test.ts:8 fail typecheck with TS2741. Two of the three files must therefore change inside 11.1 itself for that task's own gate to end green, and no task's Code or Verified field names that edit; only the File Boundary's Modify rows carry it.",
      "id": "STRUCT-S5-R2-1",
      "location": "tasks.md §11.1 ('Verified' field); File Boundary Modify rows for tests/config/session-config.test.ts and tests/app/extension/handler-gate.test.ts",
      "rationale": "The readiness standard's zero-decision rule survives — the Modify table gives the exact member and value and TS2741 itself names the missing property — but the plan's verification sentence reads against its own File Boundary: a literal coder or a later gate pass can read 'unchanged' as 'no edit in those files', then hit a red typecheck with no task telling them the fix belongs in this group. One home for the fact exists (the Modify table); the task that forces the edit just does not point at it.",
      "recommendation": "One line in 11.1: name the two test-literal gains as part of the task (the File Boundary's Modify rows state them exactly), or reword Verified to 'no test case in the three files changes; the two `TaiknrConfig` literals gain `jeffersonInstruments: true` (TS2741), as the Modify rows state'. No design, order or assertion moves.",
      "severity": "minor"
    }
  ],
  "lens": "council-structural",
  "mode": "review",
  "not_checked": [
    "No test, typecheck, lint or load check was run: this lens is read-only, and the 22-file/328-test baseline, the red totals and the A1–A12 labels are accepted as redgreen-derek.md's record and the settled rulings.",
    "pi-jefferson@0.14.0's source, Joel's checkout and the pi 1.5.2 host internals behind the line citations (loader.js, runner.js, agent-session.js, model-registry.js, compaction.js, types.d.ts): relied on research-chidi and the settled findings, not re-read.",
    "docs/adr numbering for the ADRs the docs pass will assign, and the README/ARCHITECTURE/AGENTS.md updates: docs-pass scope, excluded from tasks.md by rulings 20-21 and so outside this review.",
    "proposal.md, council.md, michael-*.json and the archived changes under openspec/changes/archive/: pointer-only provenance artifacts, taken as cited and not re-derived.",
    "The living specs under openspec/specs/ beyond the boundaries the extension-packaging delta freezes: the ruling-7 closed list is settled and was not re-audited file by file.",
    "Whether a mid-session off or a live /tree or /compact behaves as the docs describe: host behaviour Joel's group (15.x) observes, not exercisable here."
  ],
  "owner_questions": [],
  "paraphrase_existing": "Today taiknr registers seven lifecycle handlers in src/app/extension/taiknr.ts behind a session-config gate — session_start on the raw pi, the rest through createGatedPi — stages and settles archived tool outputs (stub + rawText) into an in-memory store re-hydrated from branch side-store entries, and appends one recall block to the latest user message inside context_with_system under a chars÷4-inverted budget scored by createPiJevScorerAdapter. Nothing publishes, no token figure exists, the suite is 22 test files / 328 tests green at abaa6b0, tsconfig.json carries no verbatimModuleSyntax, and package.json holds no pi-jefferson entry. The gate wrapper tests session.isActive() and calls the handler in the same tick as emit.",
  "paraphrase_proposes": "tasks.md proposes implementing the approved design in 15 ordered groups: pin pi-jefferson@0.14.0 exactly with verbatimModuleSyntax on; four domain modules (token estimate, six figures, calibration, dollars) under one estimator and one ratio table; the per-session publisher use case holding all cross-event state behind one deferred reading per event; the no-op holder in composition; the shared fake's bus recorder; the Jefferson declaration and bus adapters; the readings; the jeffersonInstruments switch with one reader; the scorer-adapter observer on recall's path; six publishing registrars after the handlers whose outcome they read; the wiring with three review checks; and Joel's live acceptance group. Every task names its failing test first or says why it has none, cites a red/green label, ends with npm run check green, and the Scenario coverage section maps each of the five deltas' scenarios to a task and a proving test or recorded check. The end state is design.md's own file list: 30 created, 15 modified, nothing deleted, no Markdown outside the change.",
  "recommendation": "Approve for implementation: round 2 finds no blocking or major structural defect. All five round-1 findings are remedied in the current text; the file boundary verifies against the live tree in both directions (all 15 Modify paths exist exactly as described, all 30 Create paths are absent); task order is dependency-sound; every fact has one home (one estimator, one field table tied by the satisfies clause, one switch reader, one ratio table, one rounding rule); and the numeric claims I could recompute (13 registrations, 17 fields, D8's row arithmetic, the 7 base assertion failures, the 228-241 citation) all check out. One minor cross-reference defect remains — 11.1's 'unchanged and green' wording contradicts its own Modify table's TS2741 literal gains in two test files — fixable by a one-line plan edit and blocking nothing: the Modify table plus the compiler error leave no decision for Derek to invent."
}