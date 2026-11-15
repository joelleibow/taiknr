{
  "mode": "council",
  "lens": "council-readiness",
  "paraphrase_proposes": "",
  "paraphrase_existing": "",
  "recommendation": "No migration risk in the data sense: no file is written, no persisted schema exists, and rollback is a plain revert. The risks are in what the design must settle so Derek makes no choices. (1) The loader cannot say 'skip the project file' under the unchanged `ConfigPaths` signature. (2) The per-session holder needs three states (uninitialized, ready, rejected), so a rejected file is never representable as `enabled:false` and a later `/taiknr on` cannot override it. (3) The rejection error class and its shape are unnamed. (4) The `enabled` check's home (O6) should be one gating wrapper at the composition root over `pi.on`, because that is the only option testable today. (5) `CONFIG_DIR_NAME` is an import-time constant, so path building needs a pure named resolver for the spec's non-`.pi` scenario to be testable. (6) Strict unknown-key rejection makes every future field addition a version-skew break for teammates sharing a committed project file. (7) Spec test locations contradict the `tests/` mirror rule. My picks: hand-written validation (O2), a holder with `isActive()` plus a gating `pi` Proxy (O1/O6), a throw from session_start after the holder is set (O3), and silent `enabled:false` (O7, one owner question).",
  "findings": [
    {
      "id": "R1",
      "severity": "major",
      "location": "specs/configuration/spec.md 'The project file is honoured only in a trusted project' and 'The loader is synchronous…'; src/config/taiknr-config.ts `ConfigPaths`",
      "finding": "The loader signature is frozen as `loadTaiknrConfig(paths: ConfigPaths)` with both paths required strings, yet an untrusted project must not have its file used. Nothing says how the loader is told to skip the project file, or whether an untrusted file is even read.",
      "rationale": "The coder must invent either an optional `projectConfigPath`, a trust flag, or a caller trick (pointing at a nonexistent path). Each is a public-contract choice. Reading and parsing the untrusted file also matters: a malformed untrusted file would make taiknr inert for a project the user never trusted.",
      "concrete_case": "Untrusted project with `.pi/pi-taiknr.json` containing `{bad`. If the caller still passes the path, the loader throws and taiknr goes inert. The spec only says 'ignored'.",
      "recommendation": "The design should state the one `ConfigPaths` revision: `projectConfigPath: string | undefined`, with undefined meaning 'not honoured'. The resolver sets undefined when `ctx.isProjectTrusted()` is false, and the file is never opened. Add it to the MODIFIED extension-packaging exception list, since it currently names only the session-start registration and the dependency types. Add a test row: untrusted + malformed project file → resolved config from agent file over defaults, no throw."
    },
    {
      "id": "R2",
      "severity": "major",
      "location": "proposal.md O1/O6/O3; specs/configuration 'A present but malformed or invalid file stops taiknr' and 'A clean seam…'",
      "finding": "The design must fix the holder's type, its state set and its method names. A rejected file has no representation in a plain `TaiknrConfig`, so the rejected state cannot be folded into `enabled:false`, and the initial state before the first `session_start` is unspecified.",
      "rationale": "If rejection is stored as `enabled=false`, a later `/taiknr on` (assigning `enabled`) silently resurrects taiknr over a broken file, contradicting Q1(b). In-place `Object.assign` on the shared `TaiknrConfig` has the same flaw, because the object cannot carry 'rejected'. The holder must also be per factory call, never a module-level singleton, because Pi re-runs the factory per session replacement and the entry test calls the factory repeatedly.",
      "concrete_case": "Session start with a rejected project file. Holder → `enabled=false`. The Status card's command sets `enabled=true`. Handlers become active on a config that never validated.",
      "recommendation": "The design names one file, `src/app/extension/session-config.ts`, exporting `createSessionConfig()` which returns an object with `state` ('uninitialized' | 'ready' | 'rejected'). Its methods are `get(): TaiknrConfig` (throws unless ready), `isActive(): boolean` (ready and enabled), `set(config)`, `reject(error)` and `setEnabled(value)` (a no-op returning false unless ready). The initial state is 'uninitialized', which is inactive. The session-start handler replaces the whole state on every call, so a fixed file clears a prior rejection. Name `setEnabled` as the Status card's seam in one sentence."
    },
    {
      "id": "R3",
      "severity": "major",
      "location": "specs/configuration 'Every field is validated and every rejection names the file and the field'",
      "finding": "The error shape is undecided: the class, its fields, whether the first or all violations are reported, and what 'field' means for unparsable JSON, a non-object root, and I/O failures.",
      "rationale": "The spec requires 'names the file and the field' for every rejection, but a `SyntaxError` and a root of `[]` have no field. Tests need stable assertions (`error.filePath`, `error.field`) rather than substring matches on prose. `ENOENT` must be silent, but a directory at the path (EISDIR) or EACCES is a present-but-unreadable file with no stated outcome.",
      "concrete_case": "`.pi/pi-taiknr.json` is a directory, or mode 000. `readFileSync` throws a non-ENOENT error and the spec is silent on the outcome. An existsSync-then-read pair also races with deletion.",
      "recommendation": "The design states `export class TaiknrConfigError extends Error { filePath: string; field: string | undefined; reason: string }` in `src/config/taiknr-config.ts`. Rules: first violation only; `field` is undefined for syntax and root errors; message format `<filePath>: <field>: <reason>`. Read with try/catch, where only ENOENT means absent and every other fs error is a `TaiknrConfigError` (field undefined). Add EISDIR to the test rows."
    },
    {
      "id": "R4",
      "severity": "major",
      "location": "proposal.md O6; Trap 12 in michael-orientation.md",
      "finding": "Left as 'one guard or each handler reads the holder', O6 gives three later cards three ways to do it. The guard has no behavioural test today, because every handler is a no-op.",
      "rationale": "Zero-decision requires one named mechanism. Rejection and uninitialized must also be inert, so the predicate must be `isActive()`, not `enabled`. Seven hand-written `if` lines in no-op bodies would be untestable and would be the very thing Trap 12 warns against.",
      "concrete_case": "The archive card writes `if (!config.enabled) return` in `turn-end` but not in `context`. A rejected session then still recalls, and nothing fails.",
      "recommendation": "The composition root passes the six non-session-start registrars a gating `pi`: `new Proxy(pi, { get: (t, p) => p === 'on' ? (event, handler) => t.on(event, (e, c) => session.isActive() ? handler(e, c) : undefined) : Reflect.get(t, p) })`. `register*Handler(pi, …)` signatures are unchanged and the entry test's fake is still touched only via `on`. `registerSessionStartHandler` gets the raw `pi`. This is testable now: register a spy through the gated `pi` and assert it is not called while inactive and is called once active. Record in the design that handlers must never capture a `TaiknrConfig` at factory time and must read `session.get()` at event time. Caveat for the design: an in-flight async classifier call is not cancelled by `/taiknr off`, which is the Status card's concern."
    },
    {
      "id": "R5",
      "severity": "major",
      "location": "specs/configuration 'The project path follows Pi's config-dir constant'; proposal.md 'Impact' (path-resolution site 'in taiknr.ts or src/infra/')",
      "finding": "The path-resolution site is not pinned, and `CONFIG_DIR_NAME` is a module-load constant read from Pi's package.json (`config.js` L492). The scenario 'CONFIG_DIR_NAME is a value other than `.pi`' cannot be driven from a test unless the constant is injected or the host module is mocked.",
      "rationale": "The coder would have to choose between `vi.mock` of the host and an injected parameter, and choose a file location. Injection avoids mocking.",
      "concrete_case": "A test that wants `<cwd>/.custom/pi-taiknr.json` has no way to change `CONFIG_DIR_NAME` under vitest without `vi.mock('@earendil-works/pi-coding-agent')`.",
      "recommendation": "Name `src/infra/config-paths.ts` exporting a pure `resolveConfigPaths(input: { agentDir: string; configDirName: string; cwd: string; projectTrusted: boolean }): ConfigPaths`. The session-start handler (or the root) passes `getAgentDir()`, `CONFIG_DIR_NAME`, `ctx.cwd` and `ctx.isProjectTrusted()`. Tests: `tests/infra/config-paths.test.ts` with `.custom`, plus one root-level test with `PI_CODING_AGENT_DIR` set to a mkdtemp directory (save and restore the variable in afterEach; never touch `~/.pi/agent`). The host value import is confined to `src/app/` or `src/infra/` and never enters `src/config/`."
    },
    {
      "id": "R6",
      "severity": "major",
      "location": "specs/configuration 'Every field is validated…' (unknown top-level key) with Migration Plan implications",
      "finding": "Q1(b) plus Q1b (reject unknown keys, fail closed) makes every future field addition or removal a breaking change for any user whose project file is committed to a repo and shared across teammates on different pi-taiknr versions. Nothing states the policy or the message.",
      "rationale": "No data migrates and rollback is a plain revert (nothing is written), so the real skew exposure is file-vs-version. A later version adds field X. A teammate still on this version has a trusted project file with X and goes fully inert, with a message that does not say 'newer file, older taiknr'. This is not reopening Q1b; it is what the design's Migration Plan must say.",
      "concrete_case": "Version N+1 adds `recallLimit`. A project file is committed with it. A teammate on version N sees a rejection naming `recallLimit` and has no hint that upgrading fixes it.",
      "recommendation": "The design's Migration Plan states: (a) each added field is documented as requiring the version that introduces it; (b) there is no `version` key in the file (not needed yet); (c) the unknown-key message includes the installed package version and 'unknown to this version of pi-taiknr', and a removed field is kept as a named deprecation rejection for one release; (d) rollback to the pre-loader version simply ignores the file (taiknr runs unconfigured; `enabled:false` would stop working on rollback, so record that in the rollback note); (e) mid-flight: a session already running keeps its resolved config, and upgrades take effect at the next session start."
    },
    {
      "id": "R7",
      "severity": "major",
      "location": "specs/configuration 'Config loading is tested without a Pi session'; openspec/specs/development-checks mirror rule (D7)",
      "finding": "The spec puts everything under `tests/config/`, including the trust gate and the `session_start` re-read 'with the recording fake at the composition root'. Those exercise `src/app/` and `src/infra/`, and the repository mirrors `src/` under `tests/` (`tests/app/extension/taiknr.test.ts` exists). The existing fake returns a push count from `on` and records only names, so it cannot call handlers or supply a `ctx`.",
      "rationale": "The coder must guess the file layout and invent a handler-capturing fake. The scenario 'Signatures unchanged: compared with HEAD' is a review step, not a runnable failing test.",
      "concrete_case": "The session_start re-read test needs `{ cwd, isProjectTrusted }` as a context. The current Proxy fake gives only an event list.",
      "recommendation": "The design lists exact test files. `tests/config/taiknr-config.test.ts` covers layering and every rejection class and uses only mkdtemp. `tests/infra/config-paths.test.ts` covers path building and the trust gate. `tests/infra/pi-event-handlers/session-start.test.ts` covers session_start, re-read, reject → holder state and the throw. `tests/app/extension/session-config.test.ts` covers the holder. `tests/app/extension/taiknr.test.ts` keeps its existing seven-event test unchanged and adds the gating test. The shared fake lives at `tests/support/fake-pi.ts` (captures handlers per event, returns a no-op disposer, throws on any other member) and is faked only at the host boundary. Reword the spec scenario 'Signatures unchanged' to be satisfied by `npm run typecheck` plus the unchanged entry test."
    },
    {
      "id": "R8",
      "severity": "minor",
      "location": "specs/configuration 'Every field is validated…'; Trap 7",
      "finding": "Validation boundary cases are incomplete: `1e999` (parses to Infinity), `-0`, whitespace-only model strings (`\" \"` counts as non-empty), a literal `__proto__` key, and the second property of two bad fields.",
      "rationale": "`JSON.parse('{\"decisionThreshold\":1e999}')` yields Infinity, which only a finiteness check catches. `JSON.parse('{\"__proto__\":{}}')` makes an own key that a spread or `in` check can mishandle. Whether `\" \"` is valid is a choice the coder would make.",
      "concrete_case": "`{\"decisionThreshold\":1e999}`; `{\"defaultDecisionModel\":\" \"}`; `{\"__proto__\":{\"enabled\":false}}`.",
      "recommendation": "Pin: `Number.isFinite` then the range check; model strings must have `trim().length > 0` (whitespace-only is rejected); unknown-key detection and merging iterate `Object.keys` over an allow-list, never spread the parsed object. Add those three rows to the rejection-class list, and state `-0` as 'accepted, none' (a boundary note, no behaviour)."
    },
    {
      "id": "R9",
      "severity": "minor",
      "location": "proposal.md O5; specs/configuration (no logging requirement)",
      "finding": "The observability bar (entry, decision and outcome fields at the session-start entry point) has no named channel. Nothing under `src/` is a logger, and Pi extensions have no log API.",
      "rationale": "Leaving 'where it goes' to the coder breaks the zero-decision rule and risks stray `console.log` (which corrupts TUI and JSON-mode output).",
      "concrete_case": "Coder adds `console.log` of resolved paths in the session_start handler. It prints into JSON mode's stdout stream.",
      "recommendation": "The design states: no logger is added; the resolver returns a `ConfigResolution { agentConfigPath, projectConfigPath | undefined, agentPresent, projectPresent, projectTrusted, outcome: 'ready' | 'rejected' }`, which is asserted in tests and stored on the holder (`session.resolution`) for the Status card to read. The only emitted output is the rejection throw. `console` is never used."
    },
    {
      "id": "R10",
      "severity": "minor",
      "location": "proposal.md O3; Trap 6",
      "finding": "The order inside the session-start handler is not fixed, and whether a throw reaches print/JSON output is read from the source but not observed.",
      "rationale": "A throw skips the rest of the handler; under Q1(b) the rest is inert anyway. The holder must be set to 'rejected' before the throw, or the gate would see 'uninitialized' (inactive, so safe) but `resolution` would be missing. The 'report reaches a mode with no UI' scenario cannot be a unit test and is only provable by a live run.",
      "concrete_case": "The handler throws before `session.reject(err)`. Gated handlers stay inert via 'uninitialized', but the Status card finds no recorded reason.",
      "recommendation": "Fix the order: resolve paths → load in try/catch → `session.set(config)` or `session.reject(error)` → rethrow the error on rejection → (a later card's hydration follows only on success). Unit-test the throw and the holder state. Mark the live check 'run Pi in print mode with a malformed file and confirm the error appears' as a Joel-observed task, never ticked by the coder."
    },
    {
      "id": "R11",
      "severity": "minor",
      "location": "specs/configuration 'The enabled switch turns taiknr fully off'; S13",
      "finding": "With hydration gated, a session that starts with `enabled:false` skips hydration of the side store. A later `/taiknr on` therefore flips to active over an empty or stale store, and the seam `setEnabled` alone is not enough.",
      "rationale": "This is a hand-off hazard for the Status card, not for this change, but the design says it names the seam and should not promise more than it delivers.",
      "concrete_case": "Session starts off (project file `enabled:false`), the user runs `/taiknr on` mid-session, and recall runs over an empty store though the session has archived entries.",
      "recommendation": "The design's Migration Plan or 'Not doing' section records: `setEnabled(true)` does not hydrate; the Status card must trigger hydration on off→on. No code in this change."
    },
    {
      "id": "R12",
      "severity": "minor",
      "location": "proposal.md O2",
      "finding": "O2 is open but cheap to close: choose hand-written guards.",
      "rationale": "Four flat scalars plus one boolean. typebox needs a new `peerDependencies` entry, changes `package.json`, and would put a host-provided dependency inside `src/config/`, where a future `cli/` or `mcp/` composition root (ADR 0001) does not have the host's module mapping. Pi-jefferson validates by hand, so this matches sibling community practice (D2).",
      "concrete_case": "A `cli/` entry importing `src/config/` would fail to resolve `typebox` outside Pi's jiti mapping.",
      "recommendation": "Close O2 as hand-written. `package.json` stays untouched and a deletion test shows no behaviour lost."
    }
  ],
  "assumptions": [
    {
      "assumption": "`getAgentDir()` and `CONFIG_DIR_NAME` are exported from `@earendil-works/pi-coding-agent` and `getAgentDir()` honours the `*_CODING_AGENT_DIR` environment variable (verified in node_modules `index.d.ts` and `config.js` L492–514).",
      "status": "verified"
    },
    {
      "assumption": "HEAD has `loadTaiknrConfig` throwing 'Not implemented', `ConfigPaths` with two required strings, `registerSessionStartHandler(_pi, _store)` with a no-op body, and turn-end and context deps typed with `config: TaiknrConfig` (verified by reading the files).",
      "status": "verified"
    },
    {
      "assumption": "The entry test fake throws on any `ExtensionAPI` member other than `on`, so the factory may not touch other members and the gating Proxy forwards only on access (verified in tests/app/extension/taiknr.test.ts).",
      "status": "verified"
    },
    {
      "assumption": "Only two test files exist (`tests/app/extension/taiknr.test.ts`, `tests/domain/archived-output.test.ts`) and there is no shared test support directory, so `tests/support/fake-pi.ts` is a new path (verified by find).",
      "status": "verified"
    },
    {
      "assumption": "A throw from a session_start handler is surfaced in print and JSON modes (from `runner.emit` error reporting per Michael's orientation, not observed).",
      "status": "unverified"
    },
    {
      "assumption": "A value import of the host in `src/app/` or `src/infra/` loads under vitest with `tsc` and Biome clean (Michael measured this in a copy; not re-measured by me).",
      "status": "unverified"
    },
    {
      "assumption": "Pi re-runs the extension factory on `/new`, `/resume`, `/fork` and `/reload`, so a per-factory holder is per session (Michael's Trap 8, from docs; not observed).",
      "status": "unverified"
    }
  ],
  "owner_questions": [
    {
      "question": "When `enabled` is false (from a file), should taiknr say so once at session start, or stay silent until the Status card adds a readout?",
      "options": [
        "Stay silent: the config rejection is the only report; the Status card owns any 'taiknr is off' readout",
        "Show one `ctx.ui.notify` per session when `enabled` is false and a UI is present",
        "Show the notice in every mode, including print and JSON"
      ],
      "recommended_option": "Stay silent: the config rejection is the only report; the Status card owns any 'taiknr is off' readout",
      "why": "No ruling settles this. Silence is the smallest change and honours the card boundary Joel set (readout is the Status card's). The risk: a user who forgot a project-level `enabled:false` sees taiknr do nothing with no hint, so the design should record that the Status card must expose it."
    }
  ],
  "not_checked": [
    "No code was run: vitest, tsc and Biome behaviour of the proposed Proxy gate and of the host value import were not measured.",
    "Whether Pi surfaces a session_start handler throw in print and JSON modes was not observed; only Michael's source reading exists.",
    "`design.md` and `tasks.md` do not exist yet, so zero-decision and test-first checks on tasks are deferred to the review-mode pass.",
    "Pi's behaviour for a project file inside a symlinked directory and for Windows paths was not checked.",
    "Whether `ARCHITECTURE.md` or ADRs need a docs-pass edit was not checked (Bambadjan owns the docs pass)."
  ]
}