# Eleanor Research — Configuration loader

## Question and Scope

Answer the four Eleanor questions in `.pi/marbleization/configuration-loader/brief-research.md`: inspect pi-jefferson's config pipeline and tests; determine pi-omlx config/settings use; map pi-taiknr config state and binding documentation; summarize taiknr test conventions. This is repository inspection, not a design ruling. References below use repository-relative paths; line numbers refer to checked-out files.

## Sources / Files Examined

- `pi-jefferson/extensions/jefferson/configuration.ts`, `extensions/jefferson/startup.ts`, `tests/configuration.test.ts`, `tests/jefferson.test.ts`.
- `pi-omlx/src/config.ts`, `src/catalog.ts` (searched), `docs/CONFIGURATION.md`.
- `pi-taiknr/AGENTS.md`, `ARCHITECTURE.md`, `docs/adr/0001-*.md` through `0003-*.md`, living `openspec/specs/extension-packaging/spec.md` and `development-checks/spec.md`, `src/config/taiknr-config.ts`, `src/app/extension/taiknr.ts`, config-reference search results, `tests/app/extension/taiknr.test.ts`, and `package.json`.

## Findings

### 1. pi-jefferson configuration path

**Paths and inputs.** In `extensions/jefferson/configuration.ts:352-356`, `configurationPaths(cwd)` returns `join(getAgentDir(), "pi-jefferson.json")` and `join(cwd, CONFIG_DIR_NAME, "pi-jefferson.json")`. `getAgentDir` and `CONFIG_DIR_NAME` are imported from the host package (`configuration.ts:12-17`). The project directory is the supplied cwd plus Pi's config-dir constant; it is not independently discovered here.

**Selection and precedence.** `readConfiguration` accepts both resolved paths plus `projectTrusted` and theme. At `configuration.ts:365-369`, it chooses the project path only if trusted and it exists; otherwise it chooses agent path. It selects one whole document; its doc comment (`:359-363`) explicitly says project replaces agent, rather than field-merging. Missing chosen path returns a default row/gap and no warning (`:369`). Therefore an absent selected project config falls back to agent config; the project file does not partially merge.

**Read, parse, validation and diagnostics.** The chosen file is synchronously read as UTF-8 and `JSON.parse`d (`:371-380`). Any read or parse exception results in default row and warning `pi-jefferson: <path> could not be read or parsed; rendering the default row`. Parsed data is normalized/validated (`:383-401`); `RejectedConfiguration` generates a warning `pi-jefferson: <path> was rejected (<reason>); rendering the default row` and default row, while unexpected exceptions propagate. Guard helpers and normalization perform hand-written checks (e.g. `isAlign`, `isDistribution`, `readInstruments`, `normalizeRow`, `normalizeDocument`); messages identify invalid values/fields. The extension does not throw for normal rejected user config; it warns and continues with defaults.

**Call flow and lifecycle.** `extensions/jefferson/startup.ts:51-63` registers `session_start`, skips non-TUI mode, then resolves paths with `ctx.cwd`, checks trust with `ctx.isProjectTrusted()`, supplies theme, and synchronously reads configuration. It reads before creating the feed because the configured notice time is needed (`:56-70`). At `:73` a returned warning is surfaced via `ctx.ui.notify(warning, "warning")`, then installs the footer. Configuration is thus loaded per session start, not once in extension factory.

**Tests.** `tests/configuration.test.ts:1-45` uses `node:test`, strict `assert`, temp directories/files, and a helper that passes explicit paths to `readConfiguration`; `:78-87` tests missing files produce defaults without warning. This file has many focused normalization/invalid-document tests. `tests/jefferson.test.ts:295-330` has end-to-end checks: trusted project replaces agent config; rejected configuration notifies warning and still installs defaults. `:198-215` establishes a temp agent dir through `PI_CODING_AGENT_DIR` and helpers write agent/project JSON. These tests demonstrate whole-document precedence and warning/fallback behavior, but are not evidence of the intended taiknr contract.

### 2. pi-omlx configuration/settings

`src/config.ts` is not a JSON-file loader: it resolves OMLX base URL/key from Pi's stored credential and environment variables (`resolveOmlx`, env constants); see `src/config.ts` definitions and `docs/CONFIGURATION.md` sections “Where credentials live” and “Environment variables when nothing is saved.” Credentials are Pi-owned `~/.pi/agent/auth.json`, read through host credential plumbing, not a pi-omlx-owned config file.

There is a separate, optional JSON model-metadata overlay. `docs/CONFIGURATION.md`, “Model metadata overlay,” documents `~/.omlx/model_settings.json` and `OMLX_MODEL_SETTINGS_PATH` override. `src/catalog.ts:507-551` considers, parses and validates the `models` object and applies known model values; default-path helper at `:602`. The docs describe accepted keys and ignored extra keys. So “no config file” would be inaccurate: no general connection config file, but a model-settings JSON overlay exists, alongside Pi auth and environment settings. This pattern does not establish a taiknr decision.

### 3. pi-taiknr current config and binding records

`src/config/taiknr-config.ts` defines `TaiknrConfig` with four fields; defaults are threshold `0.5`, model `~typesafe/jev-latest`, provider `openrouter`, archive minimum `600`. `ConfigPaths` has `agentConfigPath` and `projectConfigPath`. `loadTaiknrConfig(_paths)` currently throws `Not implemented: loadTaiknrConfig`.

All code references found by searching the four identifiers: `TaiknrConfig` is imported by `src/infra/adapters/pi-jev-scorer-adapter.ts`, `src/infra/pi-event-handlers/turn-end.ts`, and `src/infra/pi-event-handlers/context.ts`; the latter two hold it in handler option contracts. `DEFAULT_TAIKNR_CONFIG` is imported only by `src/app/extension/taiknr.ts`, where `const config = DEFAULT_TAIKNR_CONFIG` is passed to turn-end and context handler registrations. `loadTaiknrConfig` and `ConfigPaths` have no callers in `src/` or tests. The composition root currently does not resolve paths or invoke a loader.

Binding project docs: `ARCHITECTURE.md:12-13` describes `src/config/` as schema/defaults/agent-project JSON loader; `:37-38` says configuration resolves the four fields by merging optional agent/project overrides over built-in defaults; `:49` records optional paths `~/.pi/agent/pi-taiknr.json` and `<cwd>/.pi/pi-taiknr.json`, loaded at startup over defaults. These are existing architecture statements, but do not specify error behavior or validation rules.

`AGENTS.md` says repo is stub-stage and names tests as `tests/` mirroring `src/`, `.js` specifiers, explicit vitest imports and the `npm run check` chain. ADR 0001 keeps domain/use-cases free of Pi imports and directs host-specific wiring into adapters/composition roots; it does not settle config semantics. ADR 0002 covers archiving/recall, not config. ADR 0003 adopts Biome, tsc and vitest but says nothing about config behavior. Living `extension-packaging` spec fixes manifest entry, host package dependency, loading, signatures/import boundary and ESM; no configuration requirement. Living `development-checks` spec fixes check tooling/scope and tests; no config semantics.

### 4. pi-taiknr tests and conventions

`AGENTS.md` test convention is `tests/` mirroring `src/`, `*.test.ts`; only `tests/**/*.test.ts` is collected. Imports use `.js` specifiers and tests explicitly import `expect` and `test` from vitest (no globals). `tests/app/extension/taiknr.test.ts` follows this: imports `expect, test` from `vitest`, imports entry via `.js`, invokes it with a recording Proxy fake, and asserts exact event registration. `tests/domain/archived-output.test.ts` is the other existing suite; there are currently no `tests/config/` tests or config-loader tests. Thus config tests would naturally mirror `src/config/` at `tests/config/` and exercise exported config module using Vitest conventions. `package.json` scripts are lint/typecheck/test/check; check is lint then typecheck then test.

## Assumptions, Differences, and Unknowns

- pi-jefferson's `getAgentDir()` and `CONFIG_DIR_NAME` originate from host imports; this report did not independently establish host semantics (Chidi's seam). Jefferson's behavior is evidence about that repository only.
- Jefferson picks one complete trusted project file over agent file; that differs from the taiknr architecture text's “merging ... overrides” statement, which suggests layered field merge. The owner-rulings file says the card is a proposal and proposal claims are not rulings. No decision is inferred here.
- Jefferson treats malformed or rejected files as warning + fallback, rather than a thrown/rejection error. The proposed taiknr behavior says errors loudly; exact behavior is unsettled in the inspected taiknr binding sources.
- pi-omlx has several configuration mechanisms (Pi auth, env, and model metadata JSON); the distinctions matter when describing its practice.
- The brief asks for code quotations with line numbers. Exact key code is summarized above with references; code excerpts for Jefferson selection/read and startup are at `configuration.ts:352-401` and `startup.ts:51-85`.
- No tests or commands were run; no source/config files were changed. The report itself is the requested artifact.
