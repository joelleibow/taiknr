{
  "mode": "review",
  "lens": "council-structural",
  "paraphrase_proposes": "tasks.md implements the approved archive design in thirteen ordered groups: the shared fake-pi fixture first, then the domain's buildStub/summarizeSingleLine, the staging, commit and hydration use cases, the archive adapter's three translations, the tool_call, turn_end and agent_before_settle bodies, hydration on the three session events, a zero-network session-level test file, and whole-tree boundary verification. Everything lands inside a 24-path File Boundary (10 Create, 14 Modify, no Delete, no production file created), gated by npm run check, with tasks.md the only Markdown in the implementation diff.",
  "paraphrase_existing": "At main 4e951a2 every archive body throws Not implemented — buildStub, the three use cases, and the adapter's three translations — and six of the seven handler callbacks are empty; only session_start's config loading is live. The composition root already constructs the store, argsByCallId, pendingOutputs and originalContentByEntryId, registers all seven events (six through the composition-root gate), and the suite stands at six test files and 80 cases.",
  "recommendation": "Pass. Derek can execute every group in order without a design decision: file paths, signatures, prefix renames, import directions, drop conditions, draft order and draft shapes are pinned to the live tree, dependency order holds, and the id chain from candidate.entryId to the context_edit targetId is coherent end to end. Two minor calibration fixes, neither blocking.",
  "findings": [
    {
      "id": "ST-S5-R2-1",
      "severity": "minor",
      "location": "design.md § Decisions, Decision 12, first sentence; cf. tasks.md 1.1 and 9.2; tests/infra/pi-event-handlers/session-start.test.ts",
      "finding": "Design says 'eight existing session-start cases resolve enabled: true and would otherwise fail with a TypeError (Trap 1)'. The live file holds eleven cases; exactly six end ready with enabled: true. Eight cases end ready, but two of those — 'a trusted project file wins over the agent file' and 'a valid off is silent' — end enabled: false, return before session.isActive() permits hydration, and cannot fail with a TypeError. tasks.md 1.1 and 9.2 both correctly say 'six'.",
      "rationale": "Cross-artifact calibration: the binding design states a count the repository contradicts, so a reader reconciling design.md against tasks.md hits an apparent contradiction between the two documents.",
      "concrete_case": "Implement 9.2, then delete the sessionManager member from createContextStub per 9.2's own verification: six cases fail with TypeError, not eight — the two enabled: false cases stay green because the isActive() guard returns before the branch read.",
      "recommendation": "Correct design.md Decision 12's 'eight' to 'six' as a one-word rationale fix in this round's edits, or record that tasks.md's count governs. No requirement, decision or task changes."
    },
    {
      "id": "ST-S5-R2-2",
      "severity": "minor",
      "location": "tasks.md § 9.1, final case and its verification line",
      "finding": "9.1 says 'no case appends a session entry or calls console.log, console.info, console.warn or console.error, asserted with vi.spyOn on all four' — the four spies assert only the printing half. Session-entry appends are not asserted in this fixture: createContextStub's sessionManager exposes only getBranch, so the no-append invariant holds only implicitly (an append attempt would throw TypeError and fail the case), which the sentence does not state. Compare 9.3/9.5, where the same invariant is asserted properly by comparing getEntries().length before and after on a real SessionManager.",
      "rationale": "Calibrated claims: a stated verification must match what the named mechanism can actually observe; attributing the append check to the console spies overstates the test.",
      "concrete_case": "A future session_start body that appended through any surface other than ctx.sessionManager would pass 9.1's spies; only the stub's missing member — not any assertion — catches it.",
      "recommendation": "Reword 9.1's case to: 'nothing is printed, asserted with the four console spies; the stub context exposes no append surface, so any append attempt fails the case with a TypeError'. Cosmetic; no executable step changes."
    }
  ],
  "assumptions": [
    {
      "assumption": "The File Boundary's 24 paths (10 Create, 14 Modify, no Delete), signatures and throwing bodies match the live tree per Eleanor — Addendum §1–§8",
      "status": "verified"
    },
    {
      "assumption": "0.1's baseline of 6 test files and 80 cases: 50 test() invocations + 1 test.skipIf + a 27-row and a 2-row test.each table = 80 collected cases across exactly six tests/**/*.test.ts files",
      "status": "verified"
    },
    {
      "assumption": "session-start.test.ts holds eleven existing cases, of which six resolve enabled: true (tasks 1.2, 9.1, 9.2)",
      "status": "verified"
    },
    {
      "assumption": "0.1's clean-precondition is satisfiable: .pi/ is excluded via .git/info/exclude so the orchestration files never dirty git status --short",
      "status": "verified"
    },
    {
      "assumption": "11.1's Biome --write allowlist claim: biome.json files.includes is exactly src/**, tests/** and the four root configuration files",
      "status": "verified"
    },
    {
      "assumption": "11.3's gates: src contains no console.* today and src/infra does import @earendil-works/pi-*, so the empty result and its control both hold",
      "status": "verified"
    },
    {
      "assumption": "Group 10 harness: noExtensions:true does not suppress extensionFactories (resource-loader.js:263-264, 424); appendMessage, appendCompaction, appendCustomEntry and static inMemory are public on SessionManager (session-manager.d.ts:268-393); package-lock.json:667 is the hoisted node_modules/@earendil-works/pi-ai entry",
      "status": "verified"
    },
    {
      "assumption": "Round-1-verified session-harness steps (RD-S5-R1-8): faux-provider registration without setRuntimeApiKey, abort timing inside tool execute, the two-summary compaction queue",
      "status": "unverified"
    },
    {
      "assumption": "Untouched-list files (taiknr.ts, handler-gate.ts, context.ts, the three non-archive adapters, the config module) are unchanged at BASE",
      "status": "unverified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "michael-orientation.md, council.md and proposal.md — the citation targets of M1–M11, D/S/O/Trap and CR-*/R-* codes — were not in this brief's read list; cited rulings and measurements are taken as recorded.",
    "The round-1-verified pi runtime behaviours (faux provider wiring, abort semantics, compaction response queueing) were accepted as already verified, not re-measured.",
    "npm run check was not executed (no shell available); the 80-case baseline is a static count, not a vitest run, and lint/typecheck were not run.",
    "Joel's 12.1 check is his own by design and was not evaluated."
  ]
}