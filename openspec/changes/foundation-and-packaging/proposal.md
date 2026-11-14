# Proposal

## Why

`pi-taiknr` has a complete stub-stage source tree, an `ARCHITECTURE.md` and two accepted ADRs, but no `package.json`, no `tsconfig.json`, no test harness and no `.gitignore` (Eleanor §1). Nothing can be loaded by Pi, type-checked or tested, so every later card on the taiknr board waits behind this one. Joel ruled on 2026-11-14 to run the board's first card, **Foundation and packaging**, through Conductor Janet (`owner-rulings.md`).

## What Changes

- Add `package.json`: name `pi-taiknr`, `"type": "module"`, `pi.extensions` naming `./src/app/extension/taiknr.ts`, `@earendil-works/pi-coding-agent` in `peerDependencies` as `"*"` and in `devDependencies` as `^1.5.2`, no `dependencies`, and `lint`, `typecheck`, `test` and an aggregate `check` script. Publishing metadata (`version`, `keywords`, `description`, `license`, `files`, `private`, `engines`) is omitted because nothing in this change reads it; the publishing card adds it with real values (S1; Chidi §1; Trap 3; Chidi addendum §5).
- Add `package-lock.json` and commit it, so the tool versions every check runs are fixed to what was measured (R4; R7).
- Add `tsconfig.json` serving `tsc --noEmit` only: `nodenext` module and resolution, `strict`, `noEmit`, `skipLibCheck`, `types: ["node"]`, `include` of `src/**/*.ts` and `tests/**/*.ts`, with the root proof-of-concept file excluded (S2; D6; Trap 2, Trap 4).
- Add `.gitignore` with `node_modules/`, `*.tgz` and `.DS_Store`, no `.pi/` entry and no `package-lock.json` entry (S3; Trap 5; R4).
- Add `biome.json` as the `@biomejs/biome` 2.6.7 `biome init` output plus VCS integration, a `files.includes` allowlist scoped to `src/**`, `tests/**` and the root configuration files, and `lineWidth` 120 (R1; R2; OD-1; Chidi addendum §1).
- Add `vitest.config.ts` setting `test.include` to `tests/**/*.test.ts` and nothing else (R10; Chidi addendum §4).
- Run a one-time Biome format pass over `src/` before any other source edit, so `npm run check` is green on the code as committed; at `lineWidth` 120 it reflows four files (R3; R1).
- Replace each of the seven handler stubs' `throw` with a no-op `pi.on("<event>", () => {})` registration, so the extension loads and the seven event names are type-checked against Pi 1.5.2 (Q1(a); Trap 1; R3).
- Add a first test under `tests/` that imports a `src/domain/` module through its `.js` specifier chain and asserts an implemented pure function's behavior (`shouldArchive`, `selectRecalledIds`) (S6; R5).
- Add `tests/app/extension/taiknr.test.ts`, which invokes the entry's default export with a recording fake and asserts exactly the seven registered event names, so the load path has an automated pass/fail signal inside `npm run check` (R6).

**Not in this change:** archival, config-loading or classifier-recall logic; the `cli/` and `mcp/` entry points (D5); any edit to Joel's `~/.pi/agent/settings.json` or its dotfiles source (Q2(a)); any change to the handler public signatures or the adapter/port contracts; deletion or editing of `jev-context-poc.ts` and `test-jev-poc.mjs`; a package-root `index.ts` or an `extensions/` directory; and lint enforcement of ADR 0001's import boundary (S7).

## Capabilities

### New Capabilities

- `extension-packaging`: how the package is shaped and declared so Pi loads it as a local package, and what its single extension entry point must do when loaded.
- `development-checks`: the local lint, type-check and test commands, the files each covers, and the working tree they run in.

### Modified Capabilities

None. `openspec list --specs` reports no living specs, so every capability here is new.

## Impact

- **Files added at the repository root:** `package.json`, `package-lock.json`, `tsconfig.json`, `.gitignore`, `biome.json`, `vitest.config.ts`, and two tests under `tests/` (`tests/app/extension/taiknr.test.ts`, `tests/domain/archived-output.test.ts`).
- **Files edited:** the seven `src/infra/pi-event-handlers/*.ts` files, one stub body each, and the four files the one-time format pass reflows at `lineWidth` 120: `src/infra/adapters/pi-archive-adapter.ts`, `src/infra/adapters/pi-jev-scorer-adapter.ts`, `src/infra/pi-event-handlers/tool-call.ts` (which is also one of the seven handlers) and `src/use-cases/commit-archived-batch.ts`. The format pass changes formatter whitespace only; at `lineWidth` 80 it would reflow eleven `src/` files instead (R1; R3).
- **No runtime behavior is implemented.** The extension registers no-op handlers and nothing else.
- **No dependency on Joel's settings or dotfiles.** The load check and the duplicate-dependency check both run against a throwaway `PI_CODING_AGENT_DIR` (Q2(a); Trap 3).
- **Docs pass:** corrects `ARCHITECTURE.md` §8's stated reason for a root `tests/` directory, which is false for a manifest-driven layout (S8; Trap 7), and records the import-boundary lint as deferred (S7). `ARCHITECTURE.md` §5/§6/§8 restate the card's Pi-platform claims in the card's own words; Chidi's report is the first provenance for them (Michael §1, provenance note).

## Open Questions

None. Joel's standing principle plus measurement narrowed the Biome question to one knob, and Michael's rulings settled everything around it: the baseline is the `biome init` 2.6.7 output with VCS integration and a scoped `files.includes` (R1, R2). Joel then ruled the one open knob, `lineWidth` 120 (`owner-rulings.md`, "Biome line width"). The design writes every configuration file verbatim.
