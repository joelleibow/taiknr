# Verification Report: configuration-loader

Using change: `configuration-loader` (schema `marbleization`). Head commit verified: `469abe2` on branch `configuration-loader` (PR #2; `gh pr view` reports the same head). The base for diffs is `85ef6a5`, the commit before the implementation commit `1e54542`.

## Summary

| Dimension | Status |
|---|---|
| Completeness | 24/24 tasks ticked, and groups 0 and 9 re-proved independently. 15 ADDED requirements plus 1 MODIFIED requirement, all with implementation found. |
| Correctness | 16/16 ADDED and MODIFIED requirements covered. 2 scenarios are delegated by the spec to later cards and are not checkable here. 1 scenario has no behavioural test (see W1). |
| Coherence | The design is followed. 1 suggestion on a design-promised property that is verified by compile only. |

Requirement counts: `specs/configuration` has 14 ADDED requirements. `specs/extension-packaging` has 1 MODIFIED requirement. No REMOVED or RENAMED entries.

## Checks run (read-only, scratch outside the repo, removed afterwards)

| Check | Result |
|---|---|
| `git archive HEAD` into `mktemp -d`, committed as a clean repo, then `npm install && git status --short` | Prints nothing. The install leaves no tracked or untracked change, so the lockfile is consistent. |
| `npm run check` in that copy | Green. Biome checked 33 files. `tsc` is clean. Vitest ran 6 files and 79 tests, all passed, none skipped. |
| `git status --short` after the check | Prints nothing. |
| 9.2: `git diff --stat 85ef6a5 HEAD -- tests/app/extension/taiknr.test.ts` | Empty. The entry test is unchanged and green. |
| 9.3: handler-file and `ConfigPaths` diff against `85ef6a5` | `session-start.ts` has the new third parameter, a used `pi`, and a replaced body. `turn-end.ts` and `context.ts` change only the `config` type and its import. The other four handler files are untouched. The `ConfigPaths` hunk is the `string \| undefined` change. |
| 9.4: `git grep` against `HEAD` | `src/config` has no `@earendil-works/pi-` import. `src/domain` and `src/use-cases` have none. No `.pi` or `~/.pi` literal in `src/`. The control grep over `src/infra` prints hits. |
| 9.5: manual load in a `git archive` copy with its own `settings.json` and `PI_CODING_AGENT_DIR` pointing at the copy (Pi 1.5.2) | The clean run prints Pi's usage header and no `Failed to load extension` or host-provided warning. The control, with `session-start.ts` replaced by a throw, prints `1`. After restoring it the run is clean again. `~/.pi/agent` was not touched. |
| 9.6: `git diff --name-status 85ef6a5 HEAD -- src tests` | Exactly the 12 File Boundary paths: 7 `A` and 5 `M`, no `D` or `R`. |
| 9.6: `jev-context-poc.ts`, `test-jev-poc.mjs`, `package.json`, `package-lock.json`, `biome.json`, `tsconfig.json`, `vitest.config.ts`, `.gitignore` | Empty diff. No model was called. |
| `src/` since the 9.1 commit `1e54542` | Byte-identical, as task 2.4 required. The follow-up commit `e219e88` adds only the one test. |
| Live checkout `git status --short` before and after | Clean. |

## Completeness

**Task completion:** 24/24 complete. The apply `progress` is complete 24, remaining 0. No incomplete tasks.

The group 9 proof tasks hold on re-run: 9.2 through 9.6, and the 9.1 commit carrying exactly the twelve paths. Task 2.4's added test exists and asserts `0.2`. The `src/` files did not move afterwards.

**Spec coverage:** every ADDED or MODIFIED requirement has an implementation:

| Requirement | Evidence |
|---|---|
| Two host-resolved paths | `session-start.ts:14-15` uses `getAgentDir()`, `CONFIG_DIR_NAME` and `resolve`. There is no parent search. |
| Layering default, agent, project | `taiknr-config.ts` `layered()` and `loadTaiknrConfig`. |
| Validation and named rejections | `FIELD_RULES` and `validateDocument`: root check, `Object.hasOwn` unknown-key check, BOM strip, parse conversion. |
| Unreadable file is a rejection | `readDocument` and `entryExists`: the read plus `lstat` classification, and project `ENOTDIR` is absent. |
| Broken file stops the session | `session-start.ts:19-25` assigns `rejected`, then throws with the recovery line and `cause`. |
| Trusted project only | `ctx.isProjectTrusted() ? … : undefined`. The loader never opens an undefined path. |
| Re-read at every session start | The handler reads on each call, `assign` replaces the state whole, and there is no watcher. |
| `enabled` fully off | `enabled` field, default `true`, `SessionConfig.isActive()`, and `createGatedPi` over six of the seven registrations. |
| Loader synchronous and host-free | `node:fs` only. The grep proves it. |
| Resolved config reaches handlers | `taiknr.ts` passes `session` as `config` to turn-end and context. |
| `setEnabled` seam | `session-config.ts`. No command or tool is registered. |
| Tests without a Pi session | Test tree mirrors `src/`, one shared fake under `tests/support/`. |
| Packaging MODIFIED: signatures preserved | See 9.3 above. All three enumerated differences are present and nothing else differs. |

## Correctness

**Requirement mapping:** no divergence found.

I checked these edge behaviours against the code and the test names:
- `-0` is accepted and kept.
- `1e999` gives `must be a number` for the threshold and `must be an integer >= 0` for the length.
- `toString`, `__proto__` and integer-like keys are rejected with the unknown-field reason, and `Object.keys` order decides which key is named.
- A dangling symlink gives `cannot be read: ENOENT`.
- `ENOTDIR` is absent for the project layer and a rejection for the agent layer.
- The agent file is validated completely before the project path is read.
- Layering happens only after both files validate.

**Scenario coverage:** 62 test cases cover the scenarios. Each of the listed rejection inputs has its own case, as does the `session-start` ordering, and so on. The specific coverage gaps:

- Scenarios deferred by the spec itself: "A project file turns taiknr off for one project" and "Stubs made before the switch stay stubbed" are marked "verified by the archive and recall cards". The handlers are no-ops today, so this is expected and not counted against the change.
- "Report reaches a mode with no UI": evidenced by ruling 5's earlier live measurement, which no task here re-runs. This change's test asserts the throw only, so I could not re-verify the stderr and JSON-mode claim without a model-backed session.

## Coherence

**Design adherence:** every decision D1 to D13 is implemented as written:
- D1 holder with three states and a `setEnabled` that refuses outside `ready`.
- D2 `projectConfigPath: string | undefined`.
- D3 single gate with the one `as unknown as LooseOn` cast, in `handler-gate.ts` only.
- D4 hand-written rule table with the exact reason strings.
- D5 four-step bridge, assign before throw.
- D6 read classification.
- D7 BOM strip.
- D8 no console output. The test spies `log`, `info`, `warn` and `error`.
- D9 seam.
- D10 thin bridge.
- D11 test layout.
- D12 no injected `CONFIG_DIR_NAME`.
- D13 unknown keys rejected.

No contradiction found. The docs pass (`README.md`, `AGENTS.md`, `ARCHITECTURE.md`) matches the shipped behaviour: the third parameter, the raw `pi` for `session_start`, the holder and gate, and the field table with its defaults.

**Code pattern consistency:** naming, `.js` import specifiers, tab indentation and the layer boundaries match the repo. Biome is clean. The holder sits in `src/config/`, in the same inward direction as `RecallCache`. No new `src/infra` to `src/app` edge was added.

## Issues by priority

### CRITICAL

None.

### WARNING

**W1. Scenario "A file's value reaches a handler" has no runtime proof of the wiring.**
- The `session-start` test proves the holder receives the value. The entry test proves seven registrations.
- Nothing observes that `taiknr.ts` gives the *same* holder to `registerSessionStartHandler`, to the turn-end and context deps and to `createGatedPi`. A later edit that creates a second `createSessionConfig()` for one of them would pass every test and silently break inertness.
- The design and task 8.2 acknowledge this: the handlers are no-ops today, so it is "review of the diff" only.
- Recommendation: this is accepted by the artifacts, so it is a warning and not a defect. Once the archive or recall card gives a handler a body, add a test there that drives `taiknr(fake)` through `session_start`, then fires a gated event and observes it.

### SUGGESTION

**S1. The "no fallback to the other layer" scenario has no handler-level case.**
- The loader's mixed-rejection test shows the agent file's rejection wins. The `session-start` test shows a rejected agent file leaves the holder `rejected`.
- A rejected trusted *project* file at session start is not exercised with a valid agent file beside it, although it follows from the code (`loadTaiknrConfig` throws before any assignment).
- Recommendation: add one case in `tests/infra/pi-event-handlers/session-start.test.ts`, a valid agent file plus a malformed trusted project file, asserting `rejected` and not `ready`.

Not a requirement miss: the `lstat`-failed-with-non-`ENOENT` branch in `entryExists` is deliberately untested per task 4.2, since it needs a race.

## Final assessment

No critical issues found. All checks that apply ran, and none was skipped: the clean `git archive` copy with `npm install`, `git status --short` and `npm run check` is green, and tasks, specs, design and code agree. 1 warning (W1, a limit the artifacts already record) and 1 suggestion to consider. Ready for archive (with noted improvements).

Not verified: the live print, JSON and RPC-mode delivery of the thrown report (ruling 5's earlier measurement, not re-run here, as it needs a model-backed Pi session), and the two scenarios the spec hands to the archive and recall cards.
