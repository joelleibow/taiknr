{
  "assumptions": [
    {
      "assumption": "All twelve File Boundary paths verify against the live tree: the seven Create paths do not exist, and the five Modify targets match the described HEAD state (four-field TaiknrConfig with the Not-implemented loader, pinned DEFAULT_TAIKNR_CONFIG in taiknr.ts, _pi/_store no-op registrars, config: TaiknrConfig deps in turn-end/context)",
      "status": "verified"
    },
    {
      "assumption": "The toolchain surfaces the tasks name exist as claimed: npm scripts check/typecheck/lint/test, vitest include tests/**/*.test.ts, biome files.includes covers tests/**, tsconfig includes src/**/*.ts and tests/**/*.ts",
      "status": "verified"
    },
    {
      "assumption": "The entry test's fake throws on any ExtensionAPI member other than on, and the gate reads only target.on through it, so the entry test stays green unedited after 8.2 (six registrations through the gated pi, session_start through the raw pi)",
      "status": "verified"
    },
    {
      "assumption": "An unused import is a noUnusedImports warning under Biome 2.6.7's recommended preset and biome check exits 0, so a dead import cannot fail npm run check (measured in the archived first change, same biome.json)",
      "status": "verified"
    },
    {
      "assumption": "Whether Biome 2.6.7's recommended preset includes an unused-function-parameter rule, and at what severity, is unmeasured; if it fires at error severity, 7.2's bare unused store parameter fails npm run check at 8.2/9.1",
      "status": "unverified"
    },
    {
      "assumption": "Whether noUnusedImports flags a type-only unused import is unmeasured (the recorded case was a value import); it can at most warn",
      "status": "unverified"
    },
    {
      "assumption": "new Error(msg, { cause }) and Object.hasOwn type-check under the committed tsconfig.json (Error-cause was measured in a git-archive copy at stage 3 and closed as settled)",
      "status": "verified"
    },
    {
      "assumption": "The session-start test's host value imports (getAgentDir, CONFIG_DIR_NAME) resolve under vitest with the installed host package, and PI_CODING_AGENT_DIR is read at call time so a test can set it (settled orientation measurement)",
      "status": "verified"
    }
  ],
  "findings": [
    {
      "concrete_case": "The coder implements 7.2 verbatim: registerSessionStartHandler(pi, store, session) with the four-step body paths -> load -> assign -> throw; store is never referenced, so the unused parameter (if Biome's recommended preset carries the rule at error severity) turns npm run check red at 8.2, and the plan's own 9.3 wording 'a used parameter may drop its _ prefix' stops describing the diff.",
      "finding": "7.2's signature block and the File Boundary row say \"`_pi`/`_store` lose the prefix because the body now uses them\", but the four-step body never reads `store`; task 7.1 in the same document states \"the body does not read it in this change\". Only `pi` is used (it registers the handler).",
      "id": "STR-S5R1-1",
      "location": "tasks.md § File Boundary, `src/infra/pi-event-handlers/session-start.ts` row; § 7.2 signature block",
      "rationale": "Zero-decision rule and the repository's own convention: every untouched handler keeps `_`-prefixed unused parameters (session-tree.ts `_pi`/`_store`, tool-call.ts `_pi`/`_argsByCallId`, agent-before-settle.ts, session-compact.ts), and the settled extension-packaging scenario permits \"a used parameter [to] drop its `_` prefix\" — an unused one is outside that allowance. Nothing settled mandates the rename (critic-r1-1 recorded it as permitted, not required); the stated justification is false either way.",
      "recommendation": "Drop the prefix on `pi` alone and keep `_store`, in both 7.2's signature block and the File Boundary row, with the rationale \"`pi` loses its prefix because the body registers through it; `_store` keeps its prefix — this card's body does not read the store, the archive card wires it\". Safe under every outcome of the unmeasured Biome rule.",
      "severity": "major"
    },
    {
      "concrete_case": "After 8.1, each of turn-end.ts and context.ts carries `import type { TaiknrConfig }` with zero references; `npm run check` stays green (warnings exit 0), so a coder following 8.1's \"nothing else changes\" ships the dead imports, and 9.3's diff shows import hunks none of the three enumerated differences covers.",
      "finding": "8.1 retypes the `config` member to `SessionConfig` and commands the new type import but leaves `import type { TaiknrConfig }` — whose only reference was that member — dead in both files; and 8.2 justifies dropping `DEFAULT_TAIKNR_CONFIG` with \"(Biome fails the gate on an unused import)\", which contradicts the measured behavior: `noUnusedImports` fires as a warning and `biome check` exits 0, so the gate does not fail.",
      "id": "STR-S5R1-2",
      "location": "tasks.md § 8.1 (\"Modify ... so the `config` member ... is `SessionConfig`\"); § 8.2 parenthetical",
      "rationale": "Calibrated claims: a plan statement about toolchain behavior must match the recorded measurement (archived first change, michael-resolve-s5-r1.json readiness-r1-2 — unused import, warning, check exit 0). The dead imports cannot fail the gate, but they are diagnostics the plan writes into two files without naming, and the false parenthetical teaches the coder that the gate enforces import hygiene it does not enforce.",
      "recommendation": "8.1 should command the import replacement (\"the `TaiknrConfig` import is removed; `SessionConfig` replaces it\"), and 8.2's parenthetical should cite the measured warning or drop the claim and keep \"because nothing references it\".",
      "severity": "minor"
    },
    {
      "concrete_case": "The coder runs 9.3 on the final tree; the diff over `src/config/taiknr-config.ts` shows the `enabled` field, `CONFIG_FILE_NAME` and `TaiknrConfigError` hunks, and the handler-file diffs show import lines — none map to any of the extension-packaging list's three items, so the check as worded fails on the tree the plan itself produces.",
      "finding": "9.3's verification \"every hunk maps to an item in `specs/extension-packaging/spec.md`'s list\" is unsatisfiable as written: the same diff over `src/config/taiknr-config.ts` necessarily contains the `enabled` field, the `enabled: true` default, `CONFIG_FILE_NAME`, `TaiknrConfigError` and the loader body — governed by the `configuration` spec, not the extension-packaging list — plus import-line hunks in the handler files that no enumerated difference names.",
      "id": "STR-S5R1-3",
      "location": "tasks.md § 9.3 (\"Check the extension-packaging scenario against HEAD ...\" and its Verification line)",
      "rationale": "Structural completeness of an acceptance criterion: the preceding sentence (\"the rest of `taiknr-config.ts` is the `configuration` spec's\") already carves the rest out, so the criterion contradicts its own setup, and a literal coder concludes the final check fails.",
      "recommendation": "Reword the verification to scope the mapping: every hunk in the three handler files and in `ConfigPaths` maps to the list's three items; import lines are the mechanical accompaniment of items 1–2; the remaining `taiknr-config.ts` hunks map to the `configuration` spec's requirements.",
      "severity": "minor"
    },
    {
      "concrete_case": "The coder finishes 8.2 green and runs group 9 without committing: `git grep -n '@earendil-works/pi-' HEAD -- src/config` prints nothing because the old tree is also clean, and `git archive HEAD | tar -x` loads the pre-change extension, so 9.5's pass condition is met by code that never ran the new loader.",
      "finding": "Group 9's proofs assert against HEAD (git grep, git diff, git archive), but no task commands the commit that puts the work into HEAD; run uncommitted, 9.4's three greps and 9.5's archive examine the pre-change tree and pass vacuously, proving nothing about the new code.",
      "id": "STR-S5R1-4",
      "location": "tasks.md § Verification rules for this card, first bullet; § 9.4, § 9.5",
      "rationale": "Dependency order: group 9 depends on a state change (the commit) that no task creates. The Verification-rules paragraph states the rule (\"runs on the final committed tree ... last group for that reason\") but leaves the step implicit, and 9.5's pass condition is indistinguishable from vacuous when the tree is uncommitted.",
      "recommendation": "Add one line before 9.1: \"Commit the work — the File Boundary's twelve paths and nothing else — then run this group against the committed tree\" (or fold it into 9.1).",
      "severity": "minor"
    },
    {
      "concrete_case": "Before 7.2, the suite imports cleanly, calls registerSessionStartHandler(fake, {}, session), and fails on expect(session.state.status).toBe(\"ready\") — the state is still `unresolved` because the body never assigns — not on any import.",
      "finding": "7.1's verification says the run \"fails to import the third parameter\", but `vitest run` does not typecheck: the three-argument call to the two-parameter registrar imports and executes, and the run fails on the holder-state assertions instead.",
      "id": "STR-S5R1-5",
      "location": "tasks.md § 7.1 Verification line",
      "rationale": "Calibrated claims: the stated failure mechanism does not match the observable one. Red-first still holds (the run does fail), but a coder watching for an import error sees assertion failures and may misread the check as broken.",
      "recommendation": "Reword to \"fails on the holder-state assertions (HEAD's registrar ignores the third argument and never assigns)\".",
      "severity": "minor"
    }
  ],
  "lens": "council-structural",
  "mode": "review",
  "not_checked": [
    "No command was executed (read-only review): tsc, biome and vitest were not run; all green/red claims are derived from the plan's own commands plus the settled measurements.",
    "Pi host internals cited from michael-orientation.md (types.d.ts, loader.js, runner.js, print-mode.js line numbers) were not re-read; taken as settled stage-3 measurements.",
    "Settled findings were not re-opened: design-review.md, michael-council-rulings.json and michael-resolve-s3-*.json — including the LooseOn cast spelling, the holder's placement in src/config/, D5's verbatim throw block (Error cause measured type-checking), the ENOTDIR/absent classification, and the 'a used parameter may drop its _ prefix' scenario wording. STR-S5R1-1 targets the tasks' mandate and rationale, not the settled permission.",
    "proposal.md was not re-read in full; its facts are carried by design.md per the change's own pointers.",
    "Markdown documentation surfaces (ARCHITECTURE.md, AGENTS.md, ADRs) were not reviewed; the readiness standard excludes them from tasks.md.",
    "Sibling round-1 reports (design-review-s5-r1-codebase.md, design-review-s5-r1-readiness.md) were not reviewed for overlap; findings were filed independently from the artifacts under review.",
    "Biome's organize-imports assist enforcement and the exact diagnostics text of noUnusedImports/noUnusedFunctionParameters under 2.6.7 were not verified against the installed binary (grep is gitignore-scoped away from node_modules)."
  ],
  "owner_questions": [],
  "paraphrase_existing": "",
  "paraphrase_proposes": "",
  "recommendation": "Revisions required before implementation — one major and four minor, all textual. The plan's structure verifies green: the File Boundary's twelve paths all check out against the live tree (seven creates absent, five modifies matching HEAD exactly), the new units sit in the layers the settled design justifies, dependencies point inward (no infra-to-app edge, src/config host-free), the verbatim blocks match design.md without drift, each group lands its own red-first tests and leaves the gate green, and the settled Error-cause measurement closes the throw block's compile question. Fix before the coder starts: keep `_store`'s underscore in 7.2 (STR-S5R1-1, major — the stated rationale is false, it contradicts 7.1 and the repo's underscore convention, and it risks a red npm run check under an unmeasured Biome rule), name 8.1's import replacement and correct 8.2's false 'Biome fails the gate' claim (STR-S5R1-2), scope 9.3's hunk-mapping criterion (STR-S5R1-3), make group 9's commit explicit (STR-S5R1-4), and reword 7.1's failure mode (STR-S5R1-5)."
}