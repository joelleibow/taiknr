# AGENTS.md

`pi-taiknr` is a Clean Architecture Pi extension that replaces large tool outputs with deterministic one-line stubs and recalls the raw blocks at the tail of a user message. Configuration loading, stubbing and recall work end to end: staging, settlement, the `taiknr-side-store` record, branch hydration, and the recall block a request carries. The status readout and the `/taiknr` commands are still stubs.

The current shape is in `ARCHITECTURE.md`. Decisions are in `docs/adr/`. Usage and the config file's fields are in `README.md`. None of the three is restated here.

## Commands

| Command | Does |
|---|---|
| `npm install` | Install the tooling. The committed `package-lock.json` fixes the versions |
| `npm run check` | The gate: `lint`, then `typecheck`, then `test`, stopping at the first failure |
| `npm run lint` | Biome lint and formatting over the allowlist; never writes |
| `npm run typecheck` | `tsc --noEmit` over `src/` and `tests/` |
| `npm run test` | `vitest run` over `tests/**/*.test.ts` |
| `npx biome check --write .` | Fix formatting and import order. The only writer, and never part of `check` |

## Conventions

- Tests live at `tests/`, in the mirror of the `src/` layer they exercise, named `*.test.ts`. The runner collects nothing outside `tests/**/*.test.ts`, so a test written anywhere else never runs. A fixture two test files share has one home under `tests/support/`, where it is still linted and type-checked.
- Imports name their target with a `.js` specifier even though the file on disk is `.ts`. The package is ESM and `nodenext` resolves the chain with no build step.
- Tests import `expect` and `test` from `vitest`. There are no globals.
- A handler registers exactly its one lifecycle event, in `src/infra/pi-event-handlers/`, and keeps the parameter name it already has. The public signatures are fixed for the cards implementing behind them, with one enumerated exception: the `session_start` registration takes the session's config holder as a third parameter, and so uses its `pi`. Nothing else may be added to them.
- Handlers read the session's config from the holder at event time. The factory runs before any session start, so a `TaiknrConfig` captured there is the state from before the files were read.
- Decisions live in `docs/adr/`, one per file, numbered in the order they were accepted. An accepted record's body is never edited: narrow it in a new record, or supersede it.
- A handler finishes its reads and builds every value before it mutates anything, so an unexpected throw reaches Pi's extension error channel with no partial state.
- Hydration reads `sessionManager.getBranch()`, the raw root-to-leaf path, and never the compaction-bounded projection: the whole branch is what keeps pre-compaction outputs archived.
- Text that has to be one line goes through the one domain helper that turns line separators into spaces and never cuts a surrogate pair. A local `slice` or `replace` beside it drifts.

## Traps

- **The lint allowlist fails open.** `biome.json`'s `files.includes` names `src/`, `tests/` and the four root configuration files Biome reads. A new top-level directory is silently unlinted until it is added there, and Markdown, `openspec/` and `.pi/` are outside the scope by design.
- **Formatting is part of the gate.** `npm run check` fails on style alone, so a hand-wrapped line over 120 columns turns it red. Fix it with `npx biome check --write .`, which the same allowlist scopes.
- **A failed extension load does not fail the command.** `pi --no-session --help` exits 0 whether or not the extension loaded. The failure is the text `Failed to load extension` on stderr, so assert on that text and never on the exit code.
- **The host package belongs in `peerDependencies` only.** Adding `@earendil-works/pi-coding-agent` to `dependencies` makes Pi print a host-provided-package warning at load, and the host already supplies it at runtime. The `devDependencies` copy exists for `tsc` alone.
- **The lockfile is committed on purpose.** Ignoring `package-lock.json` lets the compiler and the test runner drift majors under a green check.
- **The manifest has no `version`.** Packing is the publishing card's job; `npm pack` has nothing to name a tarball with until that card writes the metadata. Loading the package from this checkout does not need it.
- **`jev-context-poc.ts`, `test-jev-poc.mjs` and `test-recall-live.mjs` call a live model.** They are outside the type-check program, the test include and the lint allowlist for that reason. Run them by hand and expect to spend model and classifier calls; `test-recall-live.mjs` takes `OPENROUTER_API_KEY` from the environment and exits 2 without it.
- **A request edit belongs on `context_with_system`, not `context`.** A returned list that differs from the snapshot under `context` makes the host rebuild the head, folding every mid-conversation system message into one replayed message and losing the cached prefix; `context_with_system` sends the returned list as it is, so each system message stays where the host put it (ADR 0007).
- **`getContextUsage().tokens` is not this request's size.** It reads the persisted session: the provider usage of the last request, that request's recall block included, plus an estimate of what followed. So it counts text that was never persisted, it is null right after a compaction, and it cannot see what a handler is about to append (measured at 11,399 against a true 1,386). Recall takes `contextWindow` from that call and estimates `event.messages` itself (ADR 0007).
- **The gate hides a handler from a careless test.** The six non-`session_start` handlers register through a gated `pi` that calls a handler only while the session's config is ready and `enabled`. A test that registers through it and fires the event sees nothing until it assigns a ready state to the holder. Inertness lives in that gate and nowhere else, so no handler tests `enabled` itself.
- **`session_start` stays on the raw host API.** Registering it through the gate would leave a session that started rejected or turned off with no way back, because no gated handler runs while the session is inactive.
- **The loader does not check trust.** It reads whatever paths the caller hands it, so passing `projectConfigPath: undefined` is the only thing that keeps a project file in an untrusted project from being opened. The trust check belongs to the caller that builds the paths.
- **`event.entries` at a boundary holds only what earlier handlers returned.** Pi dispatches a boundary's handlers one at a time in load order, so a `context_edit` proposed by an extension registered after taiknr is invisible to taiknr: that edit wins in model context while the unedited item stays in the store and in the `taiknr-side-store` record.
- **A tool result that is off the branch, or that already carries a `context_edit`, is off limits.** Settling either would overwrite another extension's redaction or resurrect a result Pi omitted during retry recovery with a null replacement, so both drop silently (ADR 0005).
- **The results of one turn pair with their entries by `toolCallId`, not by position.** `toolResultEntryIds` is `flatMap`-filtered, so a positional read attaches a stub to the neighbouring result; use position only when both lengths agree. An id itself is opaque, eight hex characters or a 36-character UUID, so never slice it or match a pattern (ADR 0006).
- **A `tool_call` handler may never throw.** Pi turns its throw into an error tool result and the user's call never runs, and `event.input` arrives mutable from earlier handlers, so a `BigInt`, a circular reference or a throwing `toJSON` has to record `""` instead.
- **A settlement's store write is not persistence.** Pi commits a boundary after every handler returns, with no callback and no transaction, and one throwing draft discards the whole boundary, so a green test of the store says nothing about what reached the JSONL.
- **A session-level test has to isolate `PI_CODING_AGENT_DIR` and `cwd`.** The suite that drives a real `AgentSession` otherwise reads the developer's own `~/.pi/agent/pi-taiknr.json` and stops being repeatable. A test in a file that scores recall also has to take the shared classifier guard from `tests/support/`: `OPENROUTER_API_KEY` is in the shell of anyone running it, so a forgotten guard bills a live classifier call instead of failing.
