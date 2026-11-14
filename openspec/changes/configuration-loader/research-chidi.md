# Research (Chidi) — configuration-loader

## Question and Scope

Answer the five "Chidi's questions" in `.pi/marbleization/configuration-loader/brief-research.md` about Pi's documented behaviour and ecosystem practice: agent dir and cwd resolution, extension-config conventions, how errors surface, host-provided validation (typebox), and read-once vs per-session loading. No design recommendations. Pi version examined: `@earendil-works/pi-coding-agent` 1.5.2 (typebox 1.3.27).

`PI` below = `/Users/joelleibow/.local/share/fnm/node-versions/v26.8.1/installation/lib/node_modules/@earendil-works/pi-coding-agent`.

## Sources / Files Examined

- `PI/docs/extensions.md` (sections: Factory/Async factory, Long-lived resources, `ctx.cwd`, `ctx.isProjectTrusted()`, events/lifecycle, `session_start`, Error Handling, host-provided imports table ~L161)
- `PI/docs/configuration.md`, `PI/docs/environment-variables.md` (L81), `PI/docs/security.md` (project trust), `PI/docs/packages.md` (L110–114)
- `PI/dist/config.js` L494–516 (`getAgentDir`), `PI/dist/index.d.ts` L2 (exports), `PI/dist/config.d.ts` L116
- `PI/dist/core/extensions/loader.js` L519–547; `runner.js` L497–; `PI/dist/main.js` L72–78, L702–712; `PI/dist/modes/interactive/interactive-mode.js` L1648, L2503; `PI/dist/modes/print-mode.js` L86
- `PI/dist/core/extensions/types.d.ts` (`ExtensionAPI.getSettings`, ~L1331)
- `PI/examples/extensions/preset.ts` (L1–120)
- Experiment: `Value.Errors` from `typebox` 1.3.27 run from `/tmp/tb.mjs` (no install; read-only import of an existing copy).
- Web: xRyul/pi-show-diffs PR #1; aliou/pi-utils-settings `config-loader.ts`; huggingface/pi-llama PR #20; graelo/pi-ext-config; @henryqw/pi-config-store; pi-ohm docs; zigai/pi-extension-settings; gotgenes/pi-packages pi-permission-system migration guide; earendil-works/pi issue #4981.

## Findings

### Q1. Agent dir and cwd

- Agent dir: `getAgentDir()` returns `expandTildePath($PI_CODING_AGENT_DIR)` if set, else `join(homedir(), CONFIG_DIR_NAME, "agent")` (`PI/dist/config.js` L510–516). `ENV_AGENT_DIR` is built as `${APP_NAME.toUpperCase()}_CODING_AGENT_DIR` (L495), so a rebranded distribution changes the variable name. The documented override is `PI_CODING_AGENT_DIR` or the SDK `agentDir` option (`docs/configuration.md` L9; `docs/environment-variables.md` L81).
- Exported helpers: `CONFIG_DIR_NAME`, `getAgentDir`, `getDocsPath`, `getPackageDir`, `VERSION`, … from the package root (`dist/index.d.ts` L2). `docs/extensions.md` (`ctx.cwd` section) says to use `CONFIG_DIR_NAME` rather than hard-coding `.pi`.
- Note: the card's literal paths `~/.pi/agent/pi-taiknr.json` and `<cwd>/.pi/pi-taiknr.json` are hard-coded `.pi`; Pi's guidance is `getAgentDir()` + `CONFIG_DIR_NAME`. A hard-coded path would diverge from Pi if `PI_CODING_AGENT_DIR` is set (the pi-show-diffs PR #1 was exactly this bug).
- cwd: `ctx.cwd` is documented as "Current working directory" on the event context (`extensions.md`, `### ctx.cwd`), with a worked example reading `join(ctx.cwd, CONFIG_DIR_NAME, "my-extension.json")` inside a `session_start` handler. In 1.5.2 `ExtensionContext`/event contexts carry `cwd` (types.d.ts, several `cwd: string`). The factory receives only `pi: ExtensionAPI`. `createExtensionAPI(extension, runtime, cwd, eventBus)` receives cwd internally (`loader.js` L195, L521) but I found no `cwd` property exposed on `ExtensionAPI` (grep of loader.js shows cwd only used for `pi.exec`, L337). So at factory time the cwd is available only via `process.cwd()`; per event it is `ctx.cwd`. Unverified: whether `process.cwd()` always equals the session cwd under the SDK (the SDK allows other cwds).
- `ctx.sessionManager.getCwd()` also exists (extensions.md `ctx.sessionManager`).
- Project trust: `docs/security.md` L37–45 lists `.pi/settings.json`, `.pi/extensions` etc. as trust-protected; a bare `.pi` dir needs no trust. `extensions.md` documents `ctx.isProjectTrusted()` as "Use this before reading project-local extension configuration that should only be honored for trusted projects." That is a documented expectation that bears on `<cwd>/.pi/pi-taiknr.json`.

### Q2. Convention for extension-owned config

- No documented naming/location/format/precedence convention for extension-owned files. `docs/configuration.md` lists the files Pi owns in `<agent-dir>` and `.pi/` (settings.json, keybindings.json, mcp.json, models.json, …) with nothing for extensions. The only prescriptions are `getAgentDir()`/`CONFIG_DIR_NAME` and `ctx.isProjectTrusted()`.
- `docs/extensions.md` L2809 mentions "the extension's own settings" in passing (MCP registration), without defining them.
- No settings API for extensions in 1.5.2: `ExtensionAPI.getSettings()` returns Pi's own effective `Settings` (global+project merged), not a namespace for extensions (types.d.ts ~L1331). Issue earendil-works/pi#4981 (`pi.settings.register`) was auto-closed; maintainer badlogic replied "this will change in the refactor to be more sensibe" (2026-05-26); a July 2026 commenter says extensions still hand-read `settings.json`. So a host settings API is a stated possibility, not shipped.
- Pi's own example `examples/extensions/preset.ts` uses exactly the card's pattern: `join(getAgentDir(), "presets.json")` and `join(cwd, CONFIG_DIR_NAME, "presets.json")`, project overrides global; `existsSync` guard; malformed JSON is caught and `console.error`'d (tolerant, not fail-loud); shallow `{...global, ...project}` merge.
- Ecosystem practice varies on filename: `<agentDir>/pi-llama.json` + `<cwd>/.pi/pi-llama.json` (huggingface/pi-llama PR #20, noting it "matches pi-sandbox"); `<agentDir>/extensions/<name>.json` + `<project>/.pi/extensions/<name>.json` (aliou/pi-utils-settings); `.pi/extensions/<name>/config.json` (graelo/pi-ext-config); `<cwd>/.pi/ohm.json` + `${PI_CODING_AGENT_DIR:-~/.pi/agent}/ohm.json` (pi-ohm). The flat `pi-<name>.json` in agent dir and `.pi/` is one of several conventions, shared by at least pi-llama, pi-sandbox and (per the card) pi-jefferson.

### Q3. How errors surface

- Factory throws: `initializeExtension` calls `load.discard()` and rethrows; `loadExtension` catches and returns `{extension: null, error: "Failed to load extension: <message>"}` (`loader.js` L519–547). `main.js` L702–712 turns each into a startup diagnostic `type:"error"`, `Failed to load extension "<path>": <error>`, printed by `reportDiagnostics` as red `Error: …` (L72–78). The extension is not loaded (its tools/commands/handlers are discarded); Pi itself and other extensions continue. Observed from source reading only; I did not run Pi.
- Event handler throws: `docs/extensions.md` "Error Handling": "Extension errors are logged, agent continues"; `tool_call` handler errors block the tool; `user_bash` handler errors block the command. Handler errors go through `runner.emitError`, shown in interactive mode by `showExtensionError` as red text `Extension "<path>" error: <msg>` plus a dim stack trace in the chat container (`interactive-mode.js` L2503–2514), and as `Extension error (<path>): <msg>` on stderr in print mode (`print-mode.js` L86). The session is not blocked (except the tool_call/user_bash cases above). `session_start` handler errors: documented only by the general rule; I did not find a specific exception.
- `ctx.ui.notify(msg, "error")`: levels `"info"|"warning"|"error"` (extensions.md ~L2837); non-blocking toast/message. `ctx.hasUI` is false in print and JSON modes, where notify-style methods are not usable as UI ("guard … fire-and-forget methods (`notify`, …)" per `ctx.hasUI` section), so an error reported only via notify can be invisible in print/JSON mode.
- Summary: a throw in the factory is the loudest documented path (extension fails to load, visible startup error); a throw in a handler is loud but non-blocking; neither stops the session.

### Q4. Validation tooling

- Host-provided: `typebox`, `typebox/compile`, `typebox/value` (extensions.md ~L161, documented as "Schema definitions for tool parameters"); also listed in `docs/packages.md` L110. Declare in `peerDependencies` with `"*"`, do not put in `dependencies` (packages.md L112–114). Pi maps these imports to its own copies; legacy `@sinclair/typebox` maps to the same module (extensions.md ~L166). Version in Pi 1.5.2: `typebox` 1.3.27 (`PI/package.json`).
- Error quality (tested in `/tmp/tb.mjs`, typebox 1.3.27 from the existing `pi-taiknr/node_modules/typebox`): for schema `Object({decisionThreshold: Number({minimum:0,maximum:1}), minCharsToArchive: Integer({minimum:0})}, {additionalProperties:false})` and input `{decisionThreshold:2, minCharsToArchive:-1, x:1}`, `Value.Check` returns false and `Value.Errors` yields entries with `keyword`, `instancePath`, `schemaPath`, `params`, `message`, e.g. `{instancePath:"/decisionThreshold", message:"must be <= 1", params:{comparison:"<=",limit:1}}`, `{instancePath:"/minCharsToArchive", message:"must be >= 0"}`, and `{keyword:"additionalProperties", message:"must not have additional properties"}` (plus a redundant `schema is false` entry at `/x`). Usable messages with JSON-pointer paths; the caller must format them. Imports resolved by file path in my test; the package-name import `typebox/value` is what docs list. Pi's tool validation uses a different engine (`@earendil-works/pi-schema`), not `typebox/value`.
- Locally, typebox is present in `pi-taiknr/node_modules` but `package.json` does not list it (only the Pi peer/dev dependency); it arrives transitively. Adding it as a `peerDependency: "*"` is what the docs prescribe.
- Ecosystem evidence (sample, not a survey; no prevalence counts available):
  - Pi's own example `preset.ts`: no validation, `JSON.parse` + `console.error`.
  - `@henryqw/pi-config-store`: bring-your-own hand-written parser that throws `Error("Invalid config")` (README example).
  - `zenobi-us/pi-extension-config`: optional custom parser, "byo schema like Zod/Typebox/Arktype".
  - `zigai/pi-extension-settings`: TypeBox schema drives defaults, validation, JSON schema.
  - `gotgenes/pi-permission-system`: zod source of truth → JSON Schema; migrated from tolerant (drop bad field) to strict (reject malformed config), documented as a breaking change.
  - `axnic/pi-extension-settings`: own schema SDK.
  I did not find a count; the sample shows hand-written guards, zod and typebox all in use.

### Q5. Load once vs per session

- Documented lifecycle (extensions.md "Lifecycle", L378–393, L473–530): `session_start` fires with `reason: "startup"|"reload"|"new"|"resume"|"fork"`. On new/resume/fork Pi "emits `session_shutdown` for the old extension instance, reloads and rebinds extensions for the new session, then emits `session_start`"; "Do cleanup work in `session_shutdown`, then reestablish any in-memory state in `session_start`." `/reload` and `ctx.reload()` also re-run `session_start` with `reason: "reload"` (L1514–1530). `project_trust` "can run again when session replacement enters a new working directory" (L393).
- Because the factory is re-run on session replacement (the instance is rebound), a factory-time read is repeated then too; but docs explicitly say factories "may run in invocations that never start a session" (L256) and advise deferring resource work to `session_start`. The doc's own `ctx.cwd` example reads project config in `session_start` (L1190–1191). The factory has no `ctx`, hence no documented cwd or `isProjectTrusted()` at that point.
- `preset.ts` takes `cwd` as a parameter to `loadPresets(cwd)`; I did not verify which event calls it (output truncated; the file is 440 lines and I read L1–120).
- Async factories are awaited before `session_start` (L213), so file I/O at factory time is permitted.

## Assumptions, Differences, and Unknowns

Differences from the card's assumptions:
- The card hard-codes `.pi` and `~/.pi/agent`; Pi exposes `getAgentDir()` (honours `PI_CODING_AGENT_DIR`) and `CONFIG_DIR_NAME`.
- "Fail loudly": in Pi this means different things by location: factory throw = startup `Error:` diagnostic + extension not loaded; handler throw = red non-blocking extension error; `ctx.ui.notify("error")` = non-blocking and UI-dependent.
- Docs say project-local extension configuration should be honored only when `ctx.isProjectTrusted()`; the card does not mention trust.
- Pi's own preset example is tolerant of malformed JSON (logs and continues), unlike the card.
- The card's "pi-jefferson precedence rules" were not examined (Eleanor's seam).

Unknowns / gaps:
- Bash tool failed mid-session (working directory `pi-taiknr` reported missing), so I could not re-run checks after the web phase or confirm `process.cwd()` vs session cwd empirically, or read `preset.ts`'s call site. Findings on error surfacing are from source reading, not a live Pi run.
- `ExtensionAPI` having no cwd: inferred from grep of `loader.js` and the docs; not exhaustively confirmed against `types.d.ts`.
- No quantified prevalence for config-validation approaches in `pi-package` extensions; evidence is a handful of named repos.
- Whether `session_start` handler errors are reported identically to other handler errors was not separately verified.
- Status of the host settings refactor mentioned by maintainers is unknown.
