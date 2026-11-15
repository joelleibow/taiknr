# Tasks

Every task below is executable without a design decision: the shapes, signatures, reason strings and the rejection throw are given verbatim from `design.md`, and where this list points at a decision it names it. `design.md` is the authority for every constraint cited here.

## File Boundary

| Path | Change | What changes and why |
|---|---|---|
| `src/config/session-config.ts` | Create | The per-session holder: three states, three operations, one factory. Host-free (`design.md` D1). |
| `src/app/extension/handler-gate.ts` | Create | `createGatedPi`, the proxy that runs a registered handler only while the holder is active (`design.md` D3). |
| `tests/config/taiknr-config.test.ts` | Create | The host-free loader: layering, every rejection class, the read-error classification, the boundary values (`design.md` D4, D6, D11). |
| `tests/config/session-config.test.ts` | Create | The holder's three states and three operations (`design.md` D1, D11). |
| `tests/app/extension/handler-gate.test.ts` | Create | The gate invokes a handler only while active and forwards everything else untouched (`design.md` D3, D11). |
| `tests/infra/pi-event-handlers/session-start.test.ts` | Create | Path building from a fake context, the trust gate, the assign-then-throw order, the re-read, the relative `PI_CODING_AGENT_DIR` case (`design.md` D5, D11). |
| `tests/support/fake-pi.ts` | Create | One handler-capturing `ExtensionAPI` fake plus a context stub, shared by the gate and session-start tests. Not collected (the include is `tests/**/*.test.ts`); still linted and type-checked (`tests/**`). |
| `src/config/taiknr-config.ts` | Modify | `enabled` on `TaiknrConfig` and `DEFAULT_TAIKNR_CONFIG`, the `CONFIG_FILE_NAME` and `TaiknrConfigError` exports, `ConfigPaths.projectConfigPath: string \| undefined`, the per-field rule table, the read-error classification, and the loader body. `interface` is kept. |
| `src/infra/pi-event-handlers/session-start.ts` | Modify | The four-step bridge: two `resolve` path builds, the trust gate, the loader call, the holder assignment, the thrown report. `_pi` becomes `pi` because the body registers through it; `_store` keeps its prefix because this card's body does not read the store — the archive card wires it. Not a signature change. |
| `src/infra/pi-event-handlers/turn-end.ts` | Modify (type only) | The `config` member of the deps object becomes `SessionConfig`. Nothing else changes. |
| `src/infra/pi-event-handlers/context.ts` | Modify (type only) | Same as turn-end. |
| `src/app/extension/taiknr.ts` | Modify | The composition root: create the holder and the gated `pi`, pass them to the registrars, replace the pinned `DEFAULT_TAIKNR_CONFIG` with the holder. |

**Delete: none.**

Untouched by this card, and verified as untouched in group 9: the four other handler files under `src/infra/pi-event-handlers/`, `src/infra/adapters/pi-jev-scorer-adapter.ts`, `tests/app/extension/taiknr.test.ts`, everything under `src/domain/` and `src/use-cases/`, `jev-context-poc.ts`, `test-jev-poc.mjs`, `package.json`, `biome.json`, `tsconfig.json`, `vitest.config.ts` and `.gitignore` (`design.md` ruling 6, 9, 12, 16; orientation D5, D7).

### Verification rules for this card

- **A proof of "the tree is clean after X" runs on the final committed tree.** The source-search proofs (9.4), the `HEAD` diff (9.3) and the untouched-file checks (9.6) assert against `HEAD` with `git grep`/`git diff`, or against a `git archive HEAD` copy, so they are meaningless while the work is uncommitted. They are the last group for that reason. Derek commits the work — the File Boundary's twelve paths and nothing else — before group 9, as the first step of 9.1; `HEAD` in 9.3–9.6 then means that commit and `$BASE` the pre-change tree.
- **A manual check runs in a `mktemp -d` `git archive` copy, never in the live checkout** (9.5).
- **Nothing in this card runs `test-jev-poc.mjs` or `jev-context-poc.ts`, and nothing calls a model.** Both are outside the type-check program and the test include for that reason (`AGENTS.md` "Traps").
- **Ruling 5's live print/JSON measurement is the evidence for the spec's "report reaches a mode with no UI" scenario.** No task here re-runs it: the throw it measured is the mechanism this card builds, and the handler test asserts the throw itself.
- Each group lands its own tests and ends with the suite green. Where a group's change has no observable behaviour — the deps-member type and the composition-root wiring, because every handler is a no-op (Trap 12; ruling 17) — the failing check stated is the compile-time one, which is the only provable check that exists.

## 0. The base commit

- [ ] 0.1 Record the base: `BASE=$(git rev-parse HEAD)` and write the hash into the task report; every `git diff` in group 9 compares `$BASE` to the committed result.
  - Verification: the task report carries the hash `BASE` printed, and it is the tree before any File Boundary path changed.

## 1. Shared test fixtures

- [ ] 1.1 Create `tests/support/fake-pi.ts` with the two fixtures the later groups use: a handler-capturing `ExtensionAPI` fake and a context stub. The fake's required surface is `on(event, handler)`, which records each pair in call order and returns the target's own return value (a distinct sentinel is enough for the tests to compare), plus one non-`on` member (a marker value) the gate test can compare by identity through `Reflect.get`. The context stub carries `cwd: string` and `isProjectTrusted(): boolean` and nothing else. Both fixtures are typed with one test-side cast each, the way the entry test already does (`{} as ExtensionAPI`): the fake as `ExtensionAPI`, the stub as `unknown as ExtensionContext`. Test code only; production has exactly the one cast in `handler-gate.ts`. Field and parameter names inside the file are a local choice; the file has no behaviour of its own and is not a `*.test.ts`, so `vitest` never collects it.
  - Failing behavioural test before this code: none — it is a test fixture for a host boundary (`ExtensionAPI` is the external boundary; §3 of the readiness standard permits faking it).
  - Verification: `npm run typecheck` and `npm run lint` pass (both cover `tests/**`), and `npm run test` reports the two existing test files (entry and domain) and no new one, proving the fixture is not collected.

## 2. The config shape, its defaults, and the layering

- [ ] 2.1 Create `tests/config/taiknr-config.test.ts` with the failing tests for the resolved shape and the layering. Every fixture directory comes from `mkdtempSync`, is removed in `afterEach`, and every config file is written as text — `JSON.stringify` cannot express `1e999`, which is why those fixtures are literal strings. The cases: (a) `projectConfigPath: undefined` and a nonexistent agent path → every field holds its default and `enabled` is `true`; (b) the agent file alone sets `defaultDecisionModel` → that value over the defaults; (c) a trusted project file holding `{"minCharsToArchive": 100}` with an agent file holding `{"decisionThreshold": 0.9}` → 100, 0.9, defaults elsewhere; (d) the project file holds only `{"enabled": false}` → the agent file's other values survive; (e) a file exists at the would-be project path but `projectConfigPath` is `undefined` → the project layer is absent.
  - Boundary cases: no file, one file, both files, an empty object `{}` in each layer (`none` of the other kinds is possible here).
  - Verification: `npx vitest run tests/config/taiknr-config.test.ts` fails, because `loadTaiknrConfig` still throws `Not implemented` and `enabled` does not exist yet.

- [ ] 2.2 Modify `src/config/taiknr-config.ts` to carry the declarations below, verbatim. The `// new` and `// was string` markers are design annotations and do not go into the file. `TaiknrConfigError`'s constructor assigns the three readonly fields and passes the built message to `super(...)`: `<filePath>: <field>: <reason>` when `field` is set, `<filePath>: <reason>` when it is `undefined` (`design.md` D5). `loadTaiknrConfig` keeps its `Not implemented` body for now.

  ```ts
  export interface TaiknrConfig {
  	decisionThreshold: number;
  	defaultDecisionModel: string;
  	defaultDecisionModelProvider: string;
  	minCharsToArchive: number;
  	enabled: boolean;
  }

  export const CONFIG_FILE_NAME = "pi-taiknr.json";

  export const DEFAULT_TAIKNR_CONFIG: TaiknrConfig = {
  	decisionThreshold: 0.5,
  	defaultDecisionModel: "~typesafe/jev-latest",
  	defaultDecisionModelProvider: "openrouter",
  	minCharsToArchive: 600,
  	enabled: true,
  };

  export interface ConfigPaths {
  	agentConfigPath: string;
  	projectConfigPath: string | undefined;
  }

  export class TaiknrConfigError extends Error {
  	readonly filePath: string;
  	readonly field: string | undefined;
  	readonly reason: string;
  	constructor(filePath: string, field: string | undefined, reason: string);
  }

  export function loadTaiknrConfig(paths: ConfigPaths): TaiknrConfig; // throws TaiknrConfigError
  ```

  The last two lines are signatures, not source: the constructor gets the body described above and `loadTaiknrConfig` keeps `throw new Error("Not implemented: loadTaiknrConfig")` until 2.3.

  - Failing behavioural test: 2.1's file, still red.
  - Verification: `npm run typecheck` passes (the declarations are complete and the `interface` keyword is kept), and 2.1 still fails, now only on the loader's `Not implemented`.

- [ ] 2.3 Implement the read → BOM-strip → parse → layering pipeline in `loadTaiknrConfig` (`design.md` D4, D7): read a path only when it is defined, strip one leading U+FEFF, `JSON.parse`, and layer each known field default → agent → project so that a project value wins when the project file sets it. A path whose read fails `ENOENT` and whose `lstatSync` also fails `ENOENT` is absent and silent. The root check, the per-field rules and the remaining read-error classes are groups 3 and 4; leave them out.
  - Failing behavioural test: 2.1's file.
  - Verification: `npx vitest run tests/config/taiknr-config.test.ts` passes; `npm run typecheck` passes.

## 3. The per-field rule table and every named rejection

- [ ] 3.1 Add failing tests to `tests/config/taiknr-config.test.ts` for each rule and each reason string, asserting `TaiknrConfigError`'s `filePath`, `field` and `reason` and the message format. The exact mapping is `design.md` D4's table, and the reason strings are fixed as: `unknown field`, `must be <= 1`, `must be >= 0`, `must be an integer >= 0`, `must be a number`, `must be a non-empty string`, `must be a boolean`, `root must be an object`, `cannot be parsed: <parser message>`, `cannot be read: <errno>`. Cases: `decisionThreshold` 0.5 and `-0` accepted (`Object.is(value, -0)` for the second), `2` → `must be <= 1`, `-0.1` → `must be >= 0`, `"0.5"` and `1e999` → `must be a number`; `minCharsToArchive` 600 and `0` accepted, `-1`, `1.5`, `"600"` and `1e999` → `must be an integer >= 0`; each model field `""`, `" "` and a non-string → `must be a non-empty string`; `enabled` `"false"`, `0` and `null` → `must be a boolean`; a root of `[]`, of `null`, of `5`, of `"x"` and of `true` → `root must be an object` with `field` undefined; `{"decisionTreshold": 0.9}` → `unknown field` naming `decisionTreshold`; `{"toString": 1}` and `{"__proto__": 1}` → `unknown field`; `""` and `" "` → `cannot be parsed: ` plus the parser's message (assert the prefix, never the parser's wording); a UTF-8 BOM before `{}` → accepted with the defaults; the two-key file `{"decisionTreshold":0.9,"enabled":"no"}` → the error names `decisionTreshold`, because `Object.keys` visits it first; agent file and project file both broken, mixed-class (agent `decisionThreshold: 2`, project path a directory) → the error names the agent file, because it is read and validated first; every rejection's `message` starts with the absolute file path.
  - Boundary cases: empty string, whitespace-only string, `[]`, `null`, `0`, `-0`, `1e999`, integer-like and prototype-member keys, a BOM, and the two-file ordering case.
  - Verification: `npx vitest run tests/config/taiknr-config.test.ts` fails on the new cases.

- [ ] 3.2 Implement the rule table in `src/config/taiknr-config.ts` next to the defaults (`design.md` D4): reject a root that is not a plain JSON object (`root must be an object`); walk `Object.keys(parsed)` of the agent file, then of the project file, checking each key against the known-key set (a `Set` or `Object.hasOwn`, never a spread, so `toString` and `__proto__` are rejected) and then against its rule; stop at the first failing key in that order and report it; layer only after both files validate. Convert a `JSON.parse` failure into `cannot be parsed: <parser message>` with `field` undefined.
  - Failing behavioural test: 3.1's cases.
  - Verification: `npx vitest run tests/config/taiknr-config.test.ts` passes; `npm run check` passes.

## 4. Read-error classification

- [ ] 4.1 Add failing tests to `tests/config/taiknr-config.test.ts` for every read outcome (`design.md` D6). Cases, all under `mkdtempSync` directories: a path with no entry at all → absent and silent; a symlink at the agent path whose target does not exist → rejection, `field` undefined, reason `cannot be read: ENOENT` (the errno of the failed read is what turns `lstat` succeeding into a rejection rather than an absence); the agent path is a directory → `cannot be read: EISDIR`; the agent file is unreadable (its containing directory `chmod 000`, restored in `afterEach` so the temp directory can be removed) → `cannot be read: EACCES`, skipping this case with a named reason when `process.getuid?.() === 0`; the project path is `<file>/pi-taiknr.json` where `<file>` is a regular file → the project layer is absent and nothing is thrown; the agent path is `<file>/pi-taiknr.json` for the same regular file → `cannot be read: ENOTDIR`, because an `ENOTDIR` on the agent path is a rejection. Assert in every rejection case that no raw `fs` error escapes and that the message starts with the absolute path.
  - Boundary cases: missing file, dangling symlink, directory, permission-denied file, a non-directory parent on each path.
  - Verification: `npx vitest run tests/config/taiknr-config.test.ts` fails on the new cases.

- [ ] 4.2 Complete the read helper in `src/config/taiknr-config.ts` with the classification above: only read `ENOENT` plus `lstat` `ENOENT`, and a read `ENOTDIR` on the *project* path, are absent; `lstat` succeeding, `lstat` failing with anything but `ENOENT`, and every other read failure are `TaiknrConfigError`s with `field` undefined and the reason `cannot be read: <errno>`. The `lstat`-fails-otherwise branch is deliberately untested: it needs a race.
  - Failing behavioural test: 4.1's cases.
  - Verification: `npx vitest run tests/config/taiknr-config.test.ts` passes; `npm run check` passes.

## 5. The per-session holder

- [ ] 5.1 Create `tests/config/session-config.test.ts` with the failing tests for the holder (`design.md` D1). Cases: a fresh holder's `state` is `{ status: "unresolved" }` and `isActive()` is `false`; `isActive()` is `false` for a `rejected` state and for a `ready` state with `enabled: false`, and `true` for a `ready` state with `enabled: true`; `assign` replaces the state whole, so assigning `ready` over `rejected` clears the rejection; `setEnabled(false)` from `ready` returns `true`, and the new `state.config` is a different object with `enabled: false` while the object read before the call is unchanged in identity and value; `setEnabled` with the value already held returns `true` and still yields a new config object; `setEnabled` from `unresolved` and from `rejected` returns `false` and leaves `state` the same reference; two `createSessionConfig()` calls yield holders whose `assign` on one leaves the other `unresolved`. The test uses a plain `TaiknrConfig` literal and the real factory — no Pi fake, because the holder is host-free.
  - Boundary cases: uninitialised, rejected, ready-and-enabled, ready-and-disabled, the already-held value, a refused call from each non-ready state.
  - Verification: `npx vitest run tests/config/session-config.test.ts` fails to import the module.

- [ ] 5.2 Create `src/config/session-config.ts` verbatim from the block below, with `createSessionConfig()` returning a closure over one state variable: `state` is a readonly getter over it, `assign` replaces it, `isActive()` is `state.status === "ready" && state.config.enabled`, and `setEnabled` returns `false` from `unresolved` or `rejected` and otherwise assigns `{ status: "ready", config: { ...state.config, enabled } }` and returns `true`. The file imports `node:` nothing and `@earendil-works/pi-*` nothing.

  ```ts
  import type { TaiknrConfig, TaiknrConfigError } from "./taiknr-config.js";

  export type ResolvedSessionConfig =
  	| { readonly status: "ready"; readonly config: TaiknrConfig }
  	| { readonly status: "rejected"; readonly error: TaiknrConfigError };

  export type SessionConfigState =
  	| { readonly status: "unresolved" }
  	| ResolvedSessionConfig;

  export interface SessionConfig {
  	readonly state: SessionConfigState;
  	assign(next: ResolvedSessionConfig): void;
  	isActive(): boolean;
  	setEnabled(enabled: boolean): boolean;
  }

  export function createSessionConfig(): SessionConfig;
  ```

  - Failing behavioural test: 5.1's cases.
  - Verification: `npx vitest run tests/config/session-config.test.ts` passes; `npm run check` passes.

## 6. The handler gate

- [ ] 6.1 Create `tests/app/extension/handler-gate.test.ts` with the failing tests for the gate (`design.md` D3), using 1.1's fake and a real holder. Cases: while the holder is `unresolved`, a handler registered through the gated `pi` is not called and the wrapper returns `undefined`; after `assign` makes it `ready` with `enabled: true`, the same handler is called once with the same two arguments and the wrapper returns the handler's own result; a `ready` holder with `enabled: false` and a `rejected` holder both leave the handler uncalled; `gated.on` returns the value the fake's own `on` returned; a non-`on` member read through the gated `pi` is identical to the fake's (proving `Reflect.get` forwarding); two handlers registered for two different events are gated independently.
  - Boundary cases: unresolved, rejected, ready-and-disabled, ready-and-enabled, an inactive-to-active transition on an already-registered handler, a non-`on` member.
  - Verification: `npx vitest run tests/app/extension/handler-gate.test.ts` fails to import the module.

- [ ] 6.2 Create `src/app/extension/handler-gate.ts` verbatim from the block below. `createGatedPi` returns a `Proxy` whose only `get` trap intercepts `"on"`; for `on` it registers `(event, wrapper)` through `(target.on as unknown as LooseOn)(event, wrapper)`, where `wrapper` returns `undefined` while `!session.isActive()` and `handler(eventArg, ctx)` once active; it returns whatever the target's `on` returned. Every other property is `Reflect.get(target, property, receiver)`. The cast is the only place this change bypasses the host's typing and lives in this file alone; no other file may cast `pi.on`.

  ```ts
  import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
  import type { SessionConfig } from "../../config/session-config.js";

  // Module-local, not exported: the loose signature Pi's overloaded `on` is cast to.
  type LooseOn = (
  	event: string,
  	handler: (eventArg: unknown, ctx: unknown) => unknown,
  ) => () => void;

  export function createGatedPi(pi: ExtensionAPI, session: SessionConfig): ExtensionAPI;
  ```

  - Failing behavioural test: 6.1's cases.
  - Verification: `npx vitest run tests/app/extension/handler-gate.test.ts` passes; `npx vitest run tests/app/extension/taiknr.test.ts` still passes unchanged; `npm run check` passes.

## 7. The session-start bridge

- [ ] 7.1 Create `tests/infra/pi-event-handlers/session-start.test.ts` with the failing tests for the bridge (`design.md` D5), using 1.1's fake and context stub, `mkdtempSync` directories, with `PI_CODING_AGENT_DIR` and the working directory captured in `beforeEach` and restored in `afterEach`. Project fixture paths are built with the imported `CONFIG_DIR_NAME`, never a literal `.pi`. The archive store is passed as `{} as ArchiveStore` — the body does not read it in this change, and no production code is changed to accommodate that. Cases: an agent file under `PI_CODING_AGENT_DIR` sets a field → the holder is `ready` with that value and exactly one `session_start` registration was recorded; `isProjectTrusted()` false with a malformed `<cwd>/<CONFIG_DIR_NAME>/pi-taiknr.json` present → no throw and the agent/default values, proving the project path was never built; `isProjectTrusted()` true with `<cwd>/<CONFIG_DIR_NAME>/pi-taiknr.json` → the project value wins; a trusted session whose parent directory holds a malformed `pi-taiknr.json` (at `<tmp>/pi-taiknr.json` and at `<tmp>/<CONFIG_DIR_NAME>/pi-taiknr.json`) while `<cwd>/<CONFIG_DIR_NAME>/` holds none, with `cwd` = `<tmp>/child` → `ready` with the agent/default values and nothing thrown (spec "No parent-directory search"; Joel's Q2 clarification); a rejected file → the holder's state is `rejected` carrying the `TaiknrConfigError`, the thrown error's message ends with `; fix the file, then run /reload or start a new session`, and its `cause` is that same error object (this is the assign-then-throw order); a second call on the same holder with a different `cwd` → the new project values, proving the re-read, with `session.setEnabled(false)` called between the first and second call so that after the second call `state.config.enabled` is the files' value, proving the flip ends at the next session start; a relative `PI_CODING_AGENT_DIR` (change into the temp directory, set it to `agent`, create `<tmp>/agent/pi-taiknr.json`) → the rejection message's path is absolute; no file anywhere → `ready` with the defaults and nothing thrown. The registered handler is a synchronous `(_event, ctx)` function (D5's four steps); the test takes the recorded `session_start` handler from the fake and calls it directly with an event stub and the context stub, asserting with `toThrow`.
  - Boundary cases: missing files, a malformed untrusted project file, a malformed file in a parent directory, a rejected file, a second call with a moved working directory, a relative agent directory, no file at all.
  - Verification: `npx vitest run tests/infra/pi-event-handlers/session-start.test.ts` fails on the holder-state assertions: HEAD's registrar ignores the third argument and never assigns.

- [ ] 7.2 Modify `src/infra/pi-event-handlers/session-start.ts` to the signature and body below, and create the holder at the composition root so the tree still compiles: in `src/app/extension/taiknr.ts` add `const session = createSessionConfig()` (imported from `../../config/session-config.js`) and pass it as the third argument. Group 8 completes that wiring.
  - The four body steps, in this order (`design.md` D5): (1) `agentConfigPath = resolve(getAgentDir(), CONFIG_FILE_NAME)` and `projectConfigPath = ctx.isProjectTrusted() ? resolve(ctx.cwd, CONFIG_DIR_NAME, CONFIG_FILE_NAME) : undefined`, with `resolve` from `node:path`; (2) `loadTaiknrConfig({ agentConfigPath, projectConfigPath })` inside `try`; (3) `session.assign({ status: "ready", config })` on success and `session.assign({ status: "rejected", error })` in the `catch` for a `TaiknrConfigError`, letting anything else propagate unassigned, a branch that is deliberately untested because it is a defect path (D5 step 3); (4) on rejection, throw exactly:

  ```ts
  throw new Error(
  	`${error.message}; fix the file, then run /reload or start a new session`,
  	{ cause: error },
  );
  ```

  - The handler is synchronous; no `async`. The boundary's error behaviour is that one throw. There is no `ctx.ui.notify` and no `console.*`: this change has no log fields, because Pi offers extensions no logging channel and nothing is emitted on success or absence (`design.md` D8; ruling 14). The hydration slot a later card fills is not built here.
  - Signature (`_pi` becomes `pi` because the body registers through it; `_store` keeps its prefix because this card's body does not read the store — the archive card wires it. Not a signature change):

  ```ts
  export function registerSessionStartHandler(
  	pi: ExtensionAPI,
  	_store: ArchiveStore,
  	session: SessionConfig,
  ): void;
  ```

  - Failing behavioural test: 7.1's cases.
  - Verification: `npx vitest run tests/infra/pi-event-handlers/session-start.test.ts` passes; `npm run typecheck` passes; `npx vitest run tests/app/extension/taiknr.test.ts` still passes.

## 8. The composition root and the two deps types

- [ ] 8.1 Modify `src/infra/pi-event-handlers/turn-end.ts` and `src/infra/pi-event-handlers/context.ts` so the `config` member of each deps object is `SessionConfig`: the `import type { TaiknrConfig } from "../../config/taiknr-config.js"` line is replaced by `import type { SessionConfig } from "../../config/session-config.js"` so no import is left unreferenced. Nothing else changes in either file: not the registrar's name, parameter list, parameter names or return type, and not the deps objects' other members.
  - Failing behavioural test: none — no behaviour is observable, because every handler is a no-op (Trap 12; ruling 17). The provable check is the compile-time one this edit produces: the composition root still passes a `TaiknrConfig`, which no longer satisfies `SessionConfig`.
  - Verification: `npm run typecheck` fails in `src/app/extension/taiknr.ts` and nowhere else.

- [ ] 8.2 Modify `src/app/extension/taiknr.ts` to complete the wiring: create `const gatedPi = createGatedPi(pi, session)`, pass `gatedPi` to the six non-session-start registrars (`session_tree`, `session_compact`, `tool_call`, `turn_end`, `agent_before_settle`, `context`), keep `registerSessionStartHandler(pi, store, session)` on the raw `pi`, set both deps objects' `config` to `session`, and drop the `DEFAULT_TAIKNR_CONFIG` import because nothing references it (an unused import is a Biome `noUnusedImports` warning — `check` stays green, measured — but the plan leaves no dead import). Every registrar's parameter names and order stay as they are.
  - Failing check: 8.1's compile error in this file, which is the only provable check — the handlers are no-ops, so the wiring is invisible to behaviour (Trap 12; ruling 17). The entry test is the guard that it stays correct: it must be green before and after this task and must not be edited.
  - Verification: `npm run typecheck` passes; `npx vitest run tests/app/extension/taiknr.test.ts` passes with the file unmodified; `npm run check` passes.

## 9. Whole-tree verification, on the final committed tree

- [ ] 9.1 Commit the work first — the File Boundary's twelve paths and nothing else — so the tree group 9 measures is committed rather than in flight, then run `npm run check` (Biome lint, `tsc --noEmit`, `vitest run`) on that tree and record it green. Any formatting failure is fixed with `npx biome check --write .`, never by hand.
  - Verification: the commit carries the twelve paths and the command's own output is green.

- [ ] 9.2 Prove the entry test is unchanged and still green: `git diff --stat $BASE HEAD -- tests/app/extension/taiknr.test.ts` prints nothing, and `npx vitest run tests/app/extension/taiknr.test.ts` passes with seven registrations observed on the entry test's fake: six through the gated `pi`, `session_start` on the raw `pi`.
  - Verification: an empty diff and a green run.

- [ ] 9.3 Check the `extension-packaging` scenario against `HEAD` on the final tree: `git diff $BASE HEAD -- src/infra/pi-event-handlers src/config/taiknr-config.ts` shows the three enumerated differences, each stub body replaced by its implementation (a used parameter may drop its `_` prefix), and formatter whitespace — and nothing else. `ConfigPaths` is compared within that same diff; the rest of `taiknr-config.ts` is the `configuration` spec's.
  - Verification: In the seven handler files every hunk is one of the three enumerated items, a stub body replaced by its implementation, the import lines those items require, or formatter whitespace. In `taiknr-config.ts` the `ConfigPaths` hunk is item 3; every other hunk there maps to a requirement of `specs/configuration/spec.md`.

- [ ] 9.4 Run the two source-search scenarios against the committed tree, never against the working copy: `git grep -n '@earendil-works/pi-' HEAD -- src/config` prints nothing; `git grep -n '@earendil-works/pi-' HEAD -- src/domain src/use-cases` prints nothing; `git grep -n -e '\.pi\b' -e '~/\.pi' HEAD -- src` prints nothing (measured empty on the pre-change `src/`, so any hit is new), proving the project path is built from `CONFIG_DIR_NAME` and no literal path segment is written anywhere in `src/`.
  - Verification: three empty results.

- [ ] 9.5 Run the manual load check in a throwaway copy with the foundation card's recorded recipe, in one shell session from the repository root after the group-9 commit. Pi loads packages only from the agent directory's `settings.json`, so the copy writes its own `settings.json` naming itself under `packages` and `PI_CODING_AGENT_DIR` points at the copy; there is no `node_modules` symlink and no `npx` (first change design Decision 6; archived `tasks.md` 6.1–6.4, measured green with two controls). Without that entry nothing from the copy loads, so `Failed to load extension` could never appear, and with the real `~/.pi/agent/settings.json` in play the run would exercise the live checkout instead.

  ```
  R=$(pwd); D=$(mktemp -d)
  git archive HEAD | tar -x -C "$D"
  cd "$D"
  printf '{"packages":[%s]}' "$(node -p 'JSON.stringify(process.argv[1])' "$D")" > "$D/settings.json"
  PI_CODING_AGENT_DIR="$D" pi --no-session --help > out.txt 2>&1
  head -1 out.txt
  rg -c 'Failed to load extension|Host-provided extension packages' out.txt
  ```

  - **Pass:** `head -1` prints Pi's usage header, the proof Pi ran, and `rg -c` prints nothing (exit 1). The exit code is never asserted on — `pi --no-session --help` exits 0 whether or not the extension loaded (`AGENTS.md` "Traps").
  - **Control:** in `$D/src/infra/pi-event-handlers/session-start.ts` replace the body with `throw new Error("control");`, re-run the `pi` line, and require `rg -c 'Failed to load extension' out.txt` to print `1`; then undo with `git -C "$R" archive HEAD | tar -x -C "$D"` and re-run to confirm the clean result.
  - **Finish:** `cd "$R"; rm -rf "$D"; git status --short` prints nothing.
  - Record `pi --version` (1.5.2) in the task report. This is the only check that exercises the two host value imports `session-start.ts` now makes at runtime.
  - Verification: `rg -c` prints nothing on the clean run and `1` on the control run. Run it in the `mktemp -d` copy, never in the live checkout.

- [ ] 9.6 Prove nothing outside the File Boundary moved and no model was called: `git diff --stat $BASE HEAD` lists exactly the twelve File Boundary paths, `git diff --stat $BASE HEAD -- jev-context-poc.ts test-jev-poc.mjs package.json biome.json tsconfig.json vitest.config.ts .gitignore` prints nothing, and neither `test-jev-poc.mjs` nor `jev-context-poc.ts` was run at any point in this card.
  - Verification: the two diffs as stated.
