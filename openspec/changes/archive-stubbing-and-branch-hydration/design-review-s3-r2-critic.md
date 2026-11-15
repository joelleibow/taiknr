{
  "mode": "review",
  "lens": "council-critic",
  "paraphrase_proposes": "",
  "paraphrase_existing": "",
  "recommendation": "Approve after one major fix. The round-1 fix for CR-S3-1 is correct against Pi 1.5.2. Decisions 4, 5 and 11 now make `tool_call` total with a try/catch around `JSON.stringify`. Decision 11 now says correctly that `emitToolCall` (runner.js:965-979) has no catch, while `emitBoundary` and `emit` catch and report (runner.js:767-865). The newly added test cases for the R-12 toggle in `tests/app/extension/archive-session.test.ts` cannot be built as written. `src/app/extension/taiknr.ts` creates the `SessionConfig` inside the factory closure and never exposes it. Nothing in `src/` calls `setEnabled` (grep finds only its definition). The design also keeps `taiknr.ts` unchanged. So a test that goes through the composition root cannot call `setEnabled(false)` or `setEnabled(true)`. The case where taiknr starts off also needs a config file. Without a throwaway agent directory, that test reads the developer's real `~/.pi/agent/pi-taiknr.json`. The handler-level re-enable cases in session-tree and session-compact work, because those tests build their own holder and gate. No ruling from M1 to M11 is shown to be unworkable.",
  "findings": [
    {
      "id": "CR-S3-R2-1",
      "severity": "major",
      "location": "design.md § Module & File Placement → Tests table, `tests/app/extension/archive-session.test.ts` row (the `enabled` toggle cases added in round 1); § Risks / Trade-offs → 'Inertness can regress silently'",
      "finding": "The row says this session-level test, which drives the composition root, pins three cases: outputs produced while `enabled: false` stay raw; outputs stubbed before `setEnabled(false)` stay stubbed while new outputs stay raw; and a run that settles after `setEnabled(true)` stages and commits. `taiknr(pi)` creates `const session = createSessionConfig()` as a local (src/app/extension/taiknr.ts:20) and registers no command. `setEnabled` has no caller anywhere in `src/` (grep: only src/config/session-config.ts:13,30). The `/taiknr` command that will call it is out of scope (D10). The design keeps `taiknr.ts` unchanged, or allows changes only to the seven `pi.on` registrations. So a test that loads the real extension has no handle for flipping `enabled` mid-session. The only lever it has is the config files that `session_start` reads (session-start.ts:14-15: `getAgentDir()` and `ctx.cwd/.pi`).",
      "rationale": "Standard §6: a stated test must match what the code allows. The 'Inertness can regress silently' risk now cites this file as one of the things that pins re-enabling. If the case cannot be written, the cited mitigation does not exist. The implementer is also pushed toward one of two bad fixes: exporting or injecting `session` from `taiknr.ts`, which breaks D7 and the 'Signatures unchanged' requirement, or quietly hand-wiring the registrars, which stops testing the composition root while the table still claims it does.",
      "concrete_case": "The Stage 5 task says: 'In archive-session.test.ts, after one settled stub, call setEnabled(false), produce a large output, assert it stays raw; call setEnabled(true), settle, assert it is stubbed.' The test loads `taiknr` as an extension factory into `createAgentSession`. It has no reference to the closure's `SessionConfig`, so it cannot call `setEnabled`. Separately, the off-at-start case run on a machine whose `~/.pi/agent/pi-taiknr.json` sets `enabled: false` or is malformed puts the session in `ready`/off or `rejected`. Every positive assertion in the file (full settlement with an image, abort → /tree → settle, competing drafts, compaction hydration) then fails, and the test has also read `~/.pi/agent/`, which the Migration Plan forbids.",
      "recommendation": "Rewrite the row as follows. (1) archive-session.test.ts covers only cases where `enabled` is fixed when the session starts, driven by config files in a throwaway agent directory (set `PI_CODING_AGENT_DIR` per test; getAgentDir honours it at config.js:510-515) and a temp `cwd`. Every test in the file uses that directory, not only the off case. (2) The mid-session cases (stubs made before the switch stay stubbed, new output stays raw while off, a settle after re-enabling commits) move to a handler-level test that wires `createSessionConfig()` and `createGatedPi` itself, the way handler-gate.test.ts already does. Alternatively, defer them to the Status card, which adds the `/taiknr` caller of `setEnabled`. Update the 'Inertness can regress silently' risk to cite wherever these cases actually land. `taiknr.ts` needs no change either way."
    }
  ],
  "assumptions": [
    {
      "assumption": "In Pi 1.5.2, `ExtensionRunner.emitToolCall` has no try/catch, `_beforeToolCall` rethrows, and `emitBoundary` and `emit` catch handler throws into `emitError` (runner.js:767-865, 965-979; agent-session.js:381-401).",
      "status": "verified"
    },
    {
      "assumption": "`SessionConfig` is local to the `taiknr(pi)` closure, and nothing in `src/` calls `setEnabled` (src/app/extension/taiknr.ts:20; grep over `src/`).",
      "status": "verified"
    },
    {
      "assumption": "`getAgentDir()` honours `PI_CODING_AGENT_DIR`, so a session-level test can isolate config from `~/.pi/agent/` without production changes (config.js:494-515).",
      "status": "verified"
    },
    {
      "assumption": "The handler-level session-tree and session-compact re-enable cases can be built with `createSessionConfig()`, `createGatedPi(fake.pi, session)` and `setEnabled(true)`, as handler-gate.test.ts already does.",
      "status": "verified"
    },
    {
      "assumption": "`String.prototype.toWellFormed` type-checks under the current tsconfig with TS 7.0.2 (carried over from round 1; tsc was not run).",
      "status": "unverified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "Whether `createAgentSession` resolves the extension's `ctx.cwd` and `isProjectTrusted()` so that a temp project directory can carry a project config in the session-level test",
    "The cost of running `JSON.stringify` on very large `tool_call` inputs (for example a multi-MB `write`) only to keep 120 characters; I judged it negligible next to Pi's own serialization, but did not measure it",
    "Sections untouched since round 1 and the five settled findings were not re-reviewed",
    "No tests, tsc or model calls were run; this was a read-only review"
  ]
}