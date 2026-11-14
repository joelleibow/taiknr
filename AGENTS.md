# AGENTS.md

`pi-taiknr` is a Clean Architecture Pi extension that replaces large tool outputs with deterministic one-line stubs and recalls the raw blocks at the tail of a user message. The repository is still at the stub stage: the boundaries and contracts exist, the behavior behind them does not.

The current shape is in `ARCHITECTURE.md`. Decisions are in `docs/adr/`. Neither is restated here.

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

- Tests live at `tests/`, in the mirror of the `src/` layer they exercise, named `*.test.ts`. The runner collects nothing outside `tests/**/*.test.ts`, so a test written anywhere else never runs.
- Imports name their target with a `.js` specifier even though the file on disk is `.ts`. The package is ESM and `nodenext` resolves the chain with no build step.
- Tests import `expect` and `test` from `vitest`. There are no globals.
- A handler registers exactly its one lifecycle event, in `src/infra/pi-event-handlers/`, and keeps the parameter name it already has. The public signatures are fixed for the cards implementing behind them.
- Decisions live in `docs/adr/`, one per file, numbered in the order they were accepted. An accepted record's body is never edited: narrow it in a new record, or supersede it.

## Traps

- **The lint allowlist fails open.** `biome.json`'s `files.includes` names `src/`, `tests/` and the four root configuration files Biome reads. A new top-level directory is silently unlinted until it is added there, and Markdown, `openspec/` and `.pi/` are outside the scope by design.
- **Formatting is part of the gate.** `npm run check` fails on style alone, so a hand-wrapped line over 120 columns turns it red. Fix it with `npx biome check --write .`, which the same allowlist scopes.
- **A failed extension load does not fail the command.** `pi --no-session --help` exits 0 whether or not the extension loaded. The failure is the text `Failed to load extension` on stderr, so assert on that text and never on the exit code.
- **The host package belongs in `peerDependencies` only.** Adding `@earendil-works/pi-coding-agent` to `dependencies` makes Pi print a host-provided-package warning at load, and the host already supplies it at runtime. The `devDependencies` copy exists for `tsc` alone.
- **The lockfile is committed on purpose.** Ignoring `package-lock.json` lets the compiler and the test runner drift majors under a green check.
- **The manifest has no `version`.** Packing is the publishing card's job; `npm pack` has nothing to name a tarball with until that card writes the metadata. Loading the package from this checkout does not need it.
- **`jev-context-poc.ts` and `test-jev-poc.mjs` call a live model.** They are outside the type-check program and the test include for that reason. Run them by hand and expect to spend a model call.
