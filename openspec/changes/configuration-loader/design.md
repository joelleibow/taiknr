# Design

## Context

`loadTaiknrConfig` throws `Not implemented`, and `src/app/extension/taiknr.ts:19` pins `const config = DEFAULT_TAIKNR_CONFIG` by value into the turn-end and context handler dependencies (research-eleanor §3; council-codebase). No file is read, no path is resolved, no trust is checked, no logging exists anywhere under `src/`, and all seven handlers are no-op registrations whose only contract today is the entry test's assertion of exactly seven `pi.on` calls (research-eleanor §4). `proposal.md` carries the motivation; this document carries the approach.

Four facts about the host shape everything below, each measured in `michael-orientation.md` and its addendum:

- `ExtensionAPI` exposes neither a working directory nor a project-trust state; both arrive only on the event context (`types.d.ts` L241, L258; Trap 1). So a factory-time read would need `process.cwd()` and could not check trust.
- Pi's loader caches the module *factory*, not the instance, and runs the factory on every `loadExtension` (`loader.js` L470–500, L519). A factory-local holder is therefore per session; module-level state would leak across session replacement (ruling 1).
- Session replacement (`/new`, `/resume`, `/fork`, `/reload`) emits `session_shutdown`, loads a replacement runtime, and emits `session_start` again (`docs/extensions.md` L376–392; Trap 8), so a per-session read must be idempotent and re-run every time.
- A throw from a `session_start` handler is caught per handler, reported on a channel every mode carries, and does not stop the other six events from firing (`runner.js` L821–848; `print-mode.js` L86; `rpc-mode.js` L267; `interactive-mode.js` `showExtensionError`). That is why rejection needs a state, not only a throw (ruling 5).

The pinned constraints are in `council.md` "Question and Scope"; the eighteen rulings that bind this design are in `council.md` "Michael's Rulings". Joel's own rulings are in `owner-rulings.md`.

## Goals / Non-Goals

**Goals:**

- Resolve taiknr's config from the agent file and the trusted project file at every `session_start`, layered field by field, validated with named rejections (`specs/configuration/spec.md`).
- Leave the session inert — no staging, settlement, hydration, recall or classifier call — when a file is rejected or `enabled` is false, through one enforcement point every later card reuses.
- Hand the session's resolved state to the turn-end and context handlers in place of the constant, without moving the other four registrars' contracts.
- Leave one assignable seam for the deferred `/taiknr on|off` command: the holder's `setEnabled(boolean): boolean`.
- Keep the loader synchronous, host-free and callable from another composition root; change no tooling file and not `package.json`.
- Leave a test suite that fails when any of the above breaks, laid out the way the repository mirrors `src/`.

**Non-Goals:**

- `/taiknr on` and `/taiknr off`, environment-variable overrides, a UI status readout, any writer of a config file, and per-field provenance (D10; rulings 15, 14).
- A file watcher (`docs/extensions.md` L254; Trap 13), and hydration of the archive store, which lands with the archive card.
- Behavioural enforcement inside handler bodies: the handlers are no-ops and the gate is the inertness mechanism (Trap 12; rulings 4, 17).
- Any resolution record or log, and any output on a successful or absent file (ruling 14).
- Constructing the scorer adapter; it has no call site at HEAD and the recall card builds it (ruling 16).
- The docs pass. `ARCHITECTURE.md` §3/§4/§9, `AGENTS.md` and any ADR are brought in line after implementation, and nothing in it blocks the feature (D4; S9, S15).

## Module & File Placement

### Files

| File | Change | The one responsibility it owns |
|---|---|---|
| `src/config/taiknr-config.ts` | Modified | The configuration's shape, its defaults, the per-field validation rules, the layering of two parsed documents, and the error a rejection throws. Host-free: `node:fs`, `node:path` and nothing else. |
| `src/config/session-config.ts` | New | The per-session holder: one state machine over `unresolved` / `rejected` / `ready`, and the three operations the session and the command seam use. Host-free like the rest of `src/config/`. |
| `src/app/extension/handler-gate.ts` | New | Wrapping an `ExtensionAPI` so that a registered handler runs only while the holder is active. |
| `src/app/extension/taiknr.ts` | Modified | The composition root: create the holder and the gate, pass them to the registrars, hand the turn-end and context registrations the holder instead of `DEFAULT_TAIKNR_CONFIG`. |
| `src/infra/pi-event-handlers/session-start.ts` | Modified | The session-time bridge: build the two paths from the event context, gate on trust, call the loader, assign the holder, rethrow on rejection. |
| `src/infra/pi-event-handlers/turn-end.ts` | Modified (type only) | The `config` member of the deps object becomes the holder; the registrar's parameters and the object's other members are unchanged. |
| `src/infra/pi-event-handlers/context.ts` | Modified (type only) | Same as turn-end. |
| `tests/config/taiknr-config.test.ts` | New | The host-free loader: layering, every rejection class, the read-error classification, the boundary values. |
| `tests/config/session-config.test.ts` | New | The holder's three states and its three operations. |
| `tests/app/extension/handler-gate.test.ts` | New | The gate invokes a registered handler only while active, and forwards everything else untouched. |
| `tests/infra/pi-event-handlers/session-start.test.ts` | New | Paths from a fake context, the trust gate, the assign-then-throw order, and the re-read on a second call with a different working directory. |
| `tests/support/fake-pi.ts` | New | One handler-capturing `ExtensionAPI` fake plus a context stub, shared by the holder, gate and session-start tests. Not collected (the include is `tests/**/*.test.ts`), still linted and type-checked (`tests/**`). |

Unchanged: the four other handler files under `src/infra/pi-event-handlers/`, `src/infra/adapters/pi-jev-scorer-adapter.ts`, `tests/app/extension/taiknr.test.ts`, `src/domain/`, `src/use-cases/`, `package.json`, `biome.json`, `tsconfig.json`, `vitest.config.ts`, `.gitignore` (ruling 6, 9, 12, 16; D5, D7).

### Why the two new units are new files

**The holder.** It cannot be a field on `TaiknrConfig`: the ready config is the *payload* of one state, and the rejected state must carry an error instead — the representation `TaiknrConfig` cannot hold (ruling 1; CR-1). It cannot sit in `src/app/extension/`: the infra handlers name it in their contracts, and the composition root is the top of the graph — `ARCHITECTURE.md` §3 keeps `src/app/` to the Pi extension only — so nothing may depend on it, and a type-only import would still leave the handler un-type-checkable without `src/app/` (Michael's consult, revising the placement half of ruling 1; `research-eleanor.md` addendum). It lives at `src/config/session-config.ts`, inward, in the house precedent `RecallCache` sets: declared in `src/use-cases/recall-relevant-context.ts:11`, imported as a type by `src/infra/pi-event-handlers/context.ts:4`, and instantiated in `src/app/extension/taiknr.ts`. The unit is still created once per factory call and still never module-level: Pi caches the factory and re-runs it per load, so module state would survive session replacement while a factory-local holder does not (ruling 1).

**The gate.** It wraps the host's registration API for the composition root's benefit (ruling 4), so it belongs in the layer that wires. It is a separate file from the holder because it changes for a different reason: the holder changes when the session's state machine changes, the gate when the host's `on` typing does.

### Dependency direction

`src/config/` imports only Node built-ins and its own members, so any composition root — `cli/`, `mcp/` — can call the loader and create the holder with its own paths (ADR 0001; ruling 2).

`src/app/extension/` imports the holder's factory and the loader from `src/config/`, and the registrars from `src/infra/pi-event-handlers/`; it imports the host as types only.

`src/infra/pi-event-handlers/session-start.ts`, `turn-end.ts` and `context.ts` import the holder's type from `src/config/`, in the same direction `turn-end.ts:2` and `context.ts:2` already import `TaiknrConfig`. `session-start.ts` also imports the host's `getAgentDir` and `CONFIG_DIR_NAME` as values — the boundary `ARCHITECTURE.md` §5 draws for host imports, and the reason those two `join`s live there rather than in `src/config/` (ruling 10).

This change adds no `src/infra/` → `src/app/` edge. Nothing written anywhere forbids one — ADR 0001 forbids only Pi imports in `src/domain/` and `src/use-cases/`, and `ARCHITECTURE.md` §8 and ADR 0003 record that boundary as review-held, not checked (`research-eleanor.md` addendum) — but the graph has no such edge at HEAD and this change does not create the first, so the holder sits inward where `RecallCache` sits.

### Types and signatures

Written out once, here; `specs/extension-packaging/spec.md` cites this list by member rather than restating it (ruling 6).

```ts
// src/config/taiknr-config.ts

export type TaiknrConfig = {
	decisionThreshold: number;
	defaultDecisionModel: string;
	defaultDecisionModelProvider: string;
	minCharsToArchive: number;
	enabled: boolean; // new
};

export const CONFIG_FILE_NAME = "pi-taiknr.json";

export const DEFAULT_TAIKNR_CONFIG: TaiknrConfig = {
	decisionThreshold: 0.5,
	defaultDecisionModel: "~typesafe/jev-latest",
	defaultDecisionModelProvider: "openrouter",
	minCharsToArchive: 600,
	enabled: true, // new
};

export type ConfigPaths = {
	agentConfigPath: string;
	projectConfigPath: string | undefined; // was string
};

export class TaiknrConfigError extends Error {
	readonly filePath: string;
	readonly field: string | undefined;
	readonly reason: string;
	constructor(filePath: string, field: string | undefined, reason: string);
}

export function loadTaiknrConfig(paths: ConfigPaths): TaiknrConfig; // throws TaiknrConfigError
```

```ts
// src/config/session-config.ts

import type { TaiknrConfig, TaiknrConfigError } from "./taiknr-config.js";

export type ResolvedSessionConfig =
	| { readonly status: "ready"; readonly config: TaiknrConfig }
	| { readonly status: "rejected"; readonly error: TaiknrConfigError };

export type SessionConfigState =
	| { readonly status: "unresolved" }
	| ResolvedSessionConfig;

export type SessionConfig = {
	readonly state: SessionConfigState;
	assign(next: ResolvedSessionConfig): void;
	isActive(): boolean;
	setEnabled(enabled: boolean): boolean;
};

export function createSessionConfig(): SessionConfig;
```

```ts
// src/app/extension/handler-gate.ts

import type { SessionConfig } from "../../config/session-config.js";

// Module-local, not exported: the loose signature Pi's overloaded `on` is cast to.
type LooseOn = (
	event: string,
	handler: (eventArg: unknown, ctx: unknown) => unknown,
) => () => void;

export function createGatedPi(pi: ExtensionAPI, session: SessionConfig): ExtensionAPI;
```

```ts
// src/infra/pi-event-handlers/session-start.ts  — signature only; the four body steps are under Decision D5

export function registerSessionStartHandler(
	pi: ExtensionAPI,
	store: ArchiveStore,
	session: SessionConfig, // new third parameter
): void;
```

The turn-end and context deps objects change in one member each — `config: TaiknrConfig` becomes `config: SessionConfig` — and nowhere else (ruling 6).

## Decisions

### D1 — A three-state holder, created per factory call, with three operations

`SessionConfigState` is `unresolved` (from factory time until the first `session_start`), `rejected` carrying the `TaiknrConfigError`, or `ready` carrying the resolved `TaiknrConfig`. `assign` replaces the state whole, so a fixed file clears a prior rejection; `isActive()` is `ready && config.enabled`; `setEnabled` succeeds only from `ready`. `state` is a readonly property, the read every consumer uses at event time; it is data, not a fourth operation. (Ruling 1.)

*Alternatives weighed.* Filling one shared `TaiknrConfig` in place: it cannot represent `rejected`, it needs an initial value that is exactly the defaults Joel's Q1(b) forbids running on, and it hands a command a mutable value typed as plain data (CR-1; STR-2; ruling 1). Two states `inactive | ready`: the rejected state must carry the error, both for the seam's refusal message and for the Status card's readout (CAT-1 vs ruling 1). Four states with a separate user-off: `enabled` is a field of the ready config, and a fourth state adds a case no operation needs (ruling 1).

### D2 — `ConfigPaths.projectConfigPath` becomes `string | undefined`

The key stays required, so the caller has to state the trust decision; `undefined` means "no project layer". The loader never opens, parses or validates a file it was not given, which is what makes "an untrusted project file is never read" true by construction rather than by convention. (Ruling 2, 3; CR-2; ZO-1; STR-1; R1; CC-6; CAT-2.)

*Alternatives weighed.* An ordered list of layer paths: the deferred environment layer is not a file path, so the list would need a union of kinds for one future layer (ruling 2). A `projectTrusted` boolean beside both paths: the loader would then decide policy it has no business deciding, and it would still receive the untrusted path. A sentinel path such as `""`: non-Pi callers would have to guess it (CAT-2).

### D3 — One gate at the composition root, not a predicate in each handler

`createGatedPi(pi, session)` returns a proxy whose only intercepted member is `on`: it registers a wrapper that returns `undefined` while `!session.isActive()` and the handler's own result once active, and forwards every other member with `Reflect.get`. The six non-session-start registrars receive the gated `pi`; `registerSessionStartHandler` receives the raw `pi`, because the config must resolve even while the previous state was inactive. Later cards add no per-handler check. (Ruling 4; R4; CAT-1; STR-3.)

*Alternatives weighed.* A shared predicate called first in each handler body: four of the six registrars have no config parameter, so it forces a signature change in each later card, against D6 and `AGENTS.md`, and it is untestable today (ruling 4; CR-6 vs ruling 4). Unregistering and re-registering handlers on a flip, through the disposers `pi.on` returns: it moves the seven-registration invariant to session time, breaks the entry test's premise, and makes `/taiknr on` re-register mid-session (Trap 11b; S10).

*The one recorded cast.* Pi's `on` has only per-event overloads and no `event: string` catch-all (`types.d.ts` L1231–1266), so the wrapper needs one cast — measured as `(target.on as unknown as LooseOn)(event, wrapper)`; without it `tsc` reports `TS2769`. That cast is the only place this change bypasses the host's typing, and the gate is the only place it lives. Handlers read `session.state` at event time and never capture a `TaiknrConfig` at factory time (ruling 4).

### D4 — Validation by hand, in one per-field rule table, with one error class

`loadTaiknrConfig` reads each path, strips a leading U+FEFF, parses, checks the root is a plain JSON object, then walks the *known-key list* over the parsed object — rejecting unknown keys and checking each field's rule — and finally layers the three sources field by field. The rules and their provenance:

| Field | Rule | Source of the value |
|---|---|---|
| `decisionThreshold` | `Number.isFinite` then `0 <= x <= 1` | The comparand is a probability (`src/domain/recall.ts:13`; ADR 0002 mechanism 3; D8) |
| `minCharsToArchive` | `Number.isInteger` then `>= 0` | The comparand is a text length, 0 meaning archive everything (`src/domain/archived-output.ts:20`; D8) |
| `defaultDecisionModel`, `defaultDecisionModelProvider` | strings with `trim().length > 0` | Only non-emptiness is checkable here; registry resolution is the classifier card's (Trap 10; ruling 12) |
| `enabled` | `typeof === "boolean"` | Joel's suggested field and default (`owner-rulings.md` "An on/off switch"; Trap 16) |
| any key outside the known-field list | rejected, naming the key | `Object.hasOwn` / a `Set`, so `toString` and `__proto__` are rejected (ruling 12) |

The reasons this change uses, pinned so a test can assert them: `unknown field`, `must be <= 1`, `must be >= 0`, `must be an integer >= 0`, `must be a number`, `must be a non-empty string`, `must be a boolean`, `root must be an object`, `cannot be parsed: <parser message>`, `cannot be read: <errno>`. The first violation found is the one reported; one field per error is the smallest sufficient report. `TaiknrConfigError`'s `field` is `undefined` for parse, root and read failures, so "names the file, and the field where one applies" is true by type (ruling 5, 12; CB-3; CC-3).

*Alternatives weighed.* typebox: a new `peerDependencies` entry, a message formatter still needed for its two-entry unknown-key output, and a host-mapped import inside the layer that must be callable with no Pi runtime, which a future `cli/` or `mcp/` entry point would not resolve (ruling 12; Trap 9; R12). Spreading the parsed objects into a defaults object: `__proto__` survives a spread as an own key, so the unknown-key check and the merge both iterate names instead (ruling 12).

### D5 — The rejection is one throw from the session-start handler, after the holder is assigned

The session-start handler's body is four steps, in this order:

1. Build `agentConfigPath = join(getAgentDir(), CONFIG_FILE_NAME)` and `projectConfigPath = ctx.isProjectTrusted() ? join(ctx.cwd, CONFIG_DIR_NAME, CONFIG_FILE_NAME) : undefined`.
2. Call `loadTaiknrConfig({ agentConfigPath, projectConfigPath })` inside try/catch.
3. `session.assign(...)` — `{ status: "ready", config }` on success, `{ status: "rejected", error }` on a `TaiknrConfigError`.
4. Rethrow on rejection. Then the hydration slot a later card fills, only when `session.isActive()`.

There is no `ctx.ui.notify`, and nothing else is emitted. The message is `<absolute file path>: <field>: <reason>`, or `<absolute file path>: <reason>` when `field` is undefined, ending with `fix the file, then run /reload or start a new session`. The host already prefixes the extension path, so the message carries no `pi-taiknr:` prefix. (Ruling 5; CR-7; CB-2; R10; CC-1.)

*Alternatives weighed.* `ctx.ui.notify(..., "error")`: invisible where `hasUI` is false, i.e. print and JSON (Trap 6; Chidi Q3). A factory throw: it would require reading at factory time, which has neither cwd nor trust (Trap 1; Q1(c)). A list of every failing file and field in one message (CR-7's suggestion): one field per error is the smaller sufficient report, and the message names the recovery step, so the second mistake surfaces on the next `/reload` rather than making the message a diagnostics dump (ruling 12's one-violation choice).

### D6 — Read errors are classified before "absent" is concluded

The loader attempts the read and catches. `ENOENT` is not immediately absent: it runs `lstatSync` on the path. If `lstat` also fails with `ENOENT` the file is absent and silent; if the read failed `ENOTDIR` — `<cwd>/<CONFIG_DIR_NAME>` is not a directory — the file is absent too; if `lstat` succeeds the entry exists and is unreadable, so it is a rejection. `EISDIR`, `EACCES` and every other read failure are rejections naming the file with no field and the errno in the reason. (Ruling 8; CR-5; R3; CC-4.)

*Alternatives weighed.* `existsSync` then `readFileSync`: it cannot tell a missing file from a dangling symlink, and it races a deletion (R3). Treating every read error as absent: it silently runs the defaults over a file the user put in place, which is the case Joel's Q1(b) exists to prevent.

### D7 — A leading BOM is stripped before parsing

One line, no Pi import, and the closest thing to community practice available: Pi strips the BOM before every JSON config read it performs — thirteen sites measured in `dist/` (ruling 7; CR-4). `""` and `" "` stay rejections. *Alternative weighed:* leaving Trap 7's Node fact as the contract, which would make taiknr stricter than the host on the same kind of file for no gain.

### D8 — Nothing is emitted on success or absence; no resolution record

There is no logger to emit to: Pi ships no extension logging API, and `console.*` either draws over the TUI or lands on JSON mode's stderr, where it would violate "nothing is reported" for an absent file (ruling 14; CR-9; R9; CB-6; CAT-3). The observable state this change has is the holder's: `rejected` carries the absolute path, field and reason, `ready` carries the config. Two hand-offs are recorded rather than papered over: "present but untrusted project file, ignored" is indistinguishable from "absent" until the Status card decides what to expose (CB-4), and the orientation's O5 bar is met here by the rejection path alone.

*Alternatives weighed.* A `ConfigResolution` record on the holder: its only consumer in this change would be its own tests (ruling 14). `console.error` on success: it breaks the spec's "Neither file exists → nothing is reported" (CAT-3). `pi.appendEntry`: it writes an entry to the session file on every start and reload, which is a record with no reader (CR-9).

### D9 — The command seam is `setEnabled(boolean): boolean`

It returns false and changes nothing unless the state is `ready`, so a fixed-but-unreloaded rejection stays closed until `/reload` or a new session — which is why the rejection message names that recovery step. Its effect lasts until the next `session_start`, which re-reads the files. It does not hydrate: a session that started inert skipped hydration, and turning on mid-session is the Status card's hazard to handle when it wires the command. Nothing else is built here; no command is registered. (Ruling 15; CR-6; R11; S13.)

### D10 — No separate resolution orchestrator; the session-start handler stays a bridge

After D5 the handler is four steps. Validation and layering live in `src/config/`, the state machine in the holder, the gate in the composition root, so the handler is the thin bridge `ARCHITECTURE.md` §3 describes. The Status card's re-validation before writing calls `loadTaiknrConfig` directly. (Ruling 18; STR-6.)

### D11 — Tests mirror the layer each one exercises, with one shared fake

There is no "config test" that drives the host: the loader is tested where it lives, the holder and gate where they live, and the session-start handler where it lives. The existing entry test keeps its seven-event assertion unchanged, and it stays green because the gated `pi` touches the fake only through `on` (ruling 9; R7; ZO-3; STR-5).

*Alternatives weighed.* Everything under `tests/config/`: it exercises `src/app/` and `src/infra/` from the wrong directory and loses the host-free boundary (ZO-3). Extending `tests/app/extension/taiknr.test.ts`: that file is a registration assertion with a fake that records only names and cannot supply a context, so it would need a second purpose (R7; ruling 9).

### D12 — `CONFIG_DIR_NAME` is not injected

It is `pkg.piConfig?.configDir || ".pi"` evaluated at module load (`config.js` L492), so a test cannot vary it without mocking the host. The scenario is instead worded to what is observable — the project path is built from the constant and no literal `.pi` path segment appears in `src/` — and the agent-path scenario is driven for real by pointing `PI_CODING_AGENT_DIR` at a `mkdtemp` directory, measured working under vitest. (Ruling 10; R5.)

*Alternative weighed.* A pure `resolveConfigPaths({ agentDir, configDirName, cwd, projectTrusted })` in `src/infra/`: it would exist only to make an unobservable scenario testable, so it fails the deletion test (ruling 10).

### D13 — Unknown keys are rejected, and the consequence is recorded rather than mitigated

An unknown top-level key is a rejection naming the file and the key with the reason `unknown field` (Joel's Q1b). No version string is printed: `package.json` has no `version` and Pi's exported `VERSION` is Pi's, so there is nothing true to print. No deprecation window is designed now; it belongs to the card that removes a field, if one ever does. The cost is in Risks (ruling 11; R6.)

## Risks / Trade-offs

- **A newer shared project file stops an older taiknr.** A committed `<cwd>/<CONFIG_DIR_NAME>/pi-taiknr.json` carrying a field added after this version is rejected on an older install, and the session goes inert with a message that cannot say "upgrade" (R6). → Mitigation: `unknown field` plus the file and key, the recovery line, and the publishing card's job to document each field against the version that introduced it. Not mitigated further by choice: nothing true can be printed today (ruling 11).
- **Rollback makes `enabled: false` stop working.** Reverting to a pre-loader build ignores the file entirely — the loader is a stub there — so taiknr runs unconfigured and, effectively, always on (ruling 11). → Mitigation: recorded here and in the Migration Plan; a rollback is a plain revert with no data to restore, because this change writes nothing.
- **A forgotten project-level `enabled: false` leaves taiknr doing nothing with no hint.** Joel ruled the valid off silent (O7 → (a)), and "present but untrusted, ignored" is invisible too (CB-4). → Mitigation: none in this change by ruling; the Status card's readout is the release valve, and the design records that the holder already carries the state it needs to report.
- **One bad field in the agent file disables taiknr for the session, including the values the project file would have supplied.** That is Joel's Q1(b) with no fallback. → Mitigation: the message names the file, the field and the reason, and the recovery step; the first violation is reported, so the second surfaces on the next `/reload`.
- **A user who scrolls past the stderr line sees taiknr do nothing.** In print and JSON modes the line is on stderr, not stdout; the session itself is not blocked (ruling 5, measured). → Mitigation: the recovery line is part of the message; anything more is the Status card's UI.
- **`<cwd>/<CONFIG_DIR_NAME>` being a regular file is treated as an absent project layer.** A user who creates a file named `.pi` where they meant a directory gets silence. → Mitigation: accepted, and it is what `ENOTDIR` means; the stray file is visible in their tree, and treating it as a rejection would reject sessions in directories taiknr was never configured for (ruling 8).
- **Re-enabling mid-session does not hydrate the archive store.** A session that starts with `enabled: false` skips hydration, so a later `/taiknr on` could recall from an empty or stale store (R11; CR-6). → Mitigation: `setEnabled` does not pretend to fix it; the hazard is handed to the Status card, which owns the command and can trigger hydration.
- **An in-flight classifier call is not cancelled by turning off.** → Mitigation: out of scope by ruling; the Status card owns the toggle's full semantics, and the gate stops new events, not work already started (R4 caveat).
- **The gate is the only inertness mechanism, and it is invisible in the handler files.** A later card could add a handler that bypasses the gated `pi`. → Mitigation: the gate is created in `taiknr.ts` and every non-session-start registration takes the gated value; the spec's enabled requirement says a handler other than session-start does not run while inert, and the gate test asserts it (ruling 4, 17).
- **The one cast over `pi.on` could hide a host-typing change.** → Mitigation: it is recorded here, lives in one line of `handler-gate.ts`, and the entry test still asserts the exact seven events through the gated value.
- **Two `lstat` calls per session start on a missing file**, and a synchronous read of up to two small files. → Mitigation: none needed; the critic measured the cost as two small synchronous reads per session start, and `enabled: false` removes classifier spend.

## Migration Plan

Nothing is persisted and nothing is written, so there is no data migration and no schema version to migrate (readiness' first finding).

**Deploy.**

1. Merge the change; `npm run check` green before merge is the only gate, and no tooling file or `package.json` entry changes (D7; ruling 12).
2. Nothing else to install or enable. A user with no config file sees today's behaviour plus the `enabled` field's default.
3. The new behaviour takes effect at the next session start after the code lands: `/reload`, `/new`, `/resume`, `/fork`, or a new process (Trap 13).

**Rollback.** Revert the commit. A pre-loader build ignores `pi-taiknr.json` entirely, so a rollback runs unconfigured and `enabled: false` stops working — the recorded consequence, with nothing to restore because no file is written.

**Post-merge hand-offs**, each after the PR merges:

- **Docs pass** (D4): `ARCHITECTURE.md` §1's `src/config/` line gains the per-session holder; §3's merge wording and §4's literal `~/.pi/agent` and `.pi` paths and its "loaded at startup" phrase; §9's note that the toggle flips `enabled` through the holder; `AGENTS.md`'s "the behavior behind them does not" sentence, once config behaviour exists. No ADR is required for this change's decisions: they are configuration semantics recorded here, not a structural choice between alternatives with a lasting architectural trade-off.
- **Status readout and `/taiknr` command card**: the seam is `setEnabled`; the command must handle hydration on off→on and may add the resolution record and the disabled readout this change deliberately omits (rulings 14, 15; R11).
- **Archive and recall cards**: verify the two deferred "off" scenarios through the composition-root gate, with no per-handler check (ruling 17; CR-10).
- **Recall card**: constructs `createPiJevScorerAdapter(ctx, config)` from the holder's ready config inside the context handler; its signature stays as at HEAD (ruling 16).
- **Publishing card**: document each configuration field against the version that introduced it, once a version exists (ruling 11; R6).

## Open Questions

None. Every question this change raised is settled in `council.md` "Michael's Rulings", and Joel's one item is ruled in `owner-rulings.md`. What remains is deferred work, not an open question, and it is named in the Non-Goals and the post-merge hand-offs above.
