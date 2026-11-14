# Proposal

## Why

`pi-taiknr` has a complete stub-stage source tree, an `ARCHITECTURE.md` and two accepted ADRs, but no `package.json`, no `tsconfig.json`, no test harness and no `.gitignore` (Eleanor §1). Nothing can be loaded by Pi, type-checked or tested, so every later card on the taiknr board waits behind this one. Joel ruled on 2026-11-14 to run the board's first card, **Foundation and packaging**, through Conductor Janet (`owner-rulings.md`).

## What Changes

- Add `package.json`: name `pi-taiknr`, `"type": "module"`, the `pi-package` keyword, `pi.extensions` naming `./src/app/extension/taiknr.ts`, `@earendil-works/pi-coding-agent` in `peerDependencies` as `"*"` and in `devDependencies` as `^1.5.2`, and no `dependencies` (S1; Chidi §1; Trap 3).
- Add `tsconfig.json` serving `tsc --noEmit` only: `nodenext` module and resolution, `strict`, `noEmit`, `skipLibCheck`, `types: ["node"]`, `include` of `src/**/*.ts` and `tests/**/*.ts`, with the root proof-of-concept file excluded (S2; D6; Trap 2, Trap 4).
- Add `.gitignore` with `node_modules/`, `*.tgz` and `.DS_Store`, and no `.pi/` entry (S3; Trap 5).
- Replace each of the seven handler stubs' `throw` with a no-op `pi.on("<event>", () => {})` registration, so the extension loads and the seven event names are type-checked against Pi 1.5.2 (Q1(a); Trap 1).
- Add Biome and vitest as the lint and test tooling, with `lint`, `typecheck`, `test` and an aggregate `check` script (Q3(b); Chidi addendum §5).
- Add a first test under `tests/` that imports a `src/domain/` or `src/use-cases/` module through its `.js` specifier chain and asserts an existing pure function's behavior (S6).

**Not in this change:** archival, config-loading or classifier-recall logic; the `cli/` and `mcp/` entry points (D5); any edit to Joel's `~/.pi/agent/settings.json` or its dotfiles source (Q2(a)); any change to the handler public signatures or the adapter/port contracts; deletion or editing of `jev-context-poc.ts` and `test-jev-poc.mjs`; a package-root `index.ts` or an `extensions/` directory; and lint enforcement of ADR 0001's import boundary (S7).

## Capabilities

### New Capabilities

- `extension-packaging`: how the package is shaped and declared so Pi loads it as a local package, and what its single extension entry point must do when loaded.
- `development-checks`: the local lint, type-check and test commands, the files each covers, and the working tree they run in.

### Modified Capabilities

None. `openspec list --specs` reports no living specs, so every capability here is new.

## Impact

- **Files added at the repository root:** `package.json`, `tsconfig.json`, `.gitignore`, `biome.json`, a vitest configuration if the design needs one, and a first test under `tests/`.
- **Files edited:** the seven `src/infra/pi-event-handlers/*.ts` files, one stub body each.
- **No runtime behavior is implemented.** The extension registers no-op handlers and nothing else.
- **No dependency on Joel's settings or dotfiles.** The load check and the duplicate-dependency check both run against a throwaway `PI_CODING_AGENT_DIR` (Q2(a); Trap 3).
- **Docs pass:** corrects `ARCHITECTURE.md` §8's stated reason for a root `tests/` directory, which is false for a manifest-driven layout (S8; Trap 7), and records the import-boundary lint as deferred (S7). `ARCHITECTURE.md` §5/§6/§8 restate the card's Pi-platform claims in the card's own words; Chidi's report is the first provenance for them (Michael §1, provenance note).

## Open Questions

**Which community sets the Biome configuration.** Joel ruled: "Whatever the community is doing for typical biome config is what we're going with. Our decisions need to reflect the communities preferences so we're well aligned for adoption." (`owner-rulings.md`, 2026-11-14). Chidi's addendum reports three readings of "community" without choosing between them:

- **Biome's own `biome init` output and documented defaults** — tab indentation, `indentWidth` 2, `lineWidth` 80, double quotes, the `recommended` preset, no `files.includes`, VCS integration off (Chidi addendum §1).
- **Pi's own repository and published `pi-package` extensions** — Pi sets `indentWidth` 3 and `lineWidth` 120 with style overrides, and the four Biome-using extensions Chidi checked copy Pi's block (Chidi addendum §3).
- **Broad GitHub prevalence** — `useIgnoreFile: true` in about half of configs, explicit `space` indentation outnumbering explicit `tab` about 3:1, `files.includes` in about half (Chidi addendum §2).

The three disagree on indentation width, line width and VCS integration. **This proposal does not choose.** The council and the design settle it, and the design records which baseline it followed.

The same standing principle covers the rest of the tooling: script names and the test glob follow the same community evidence (Chidi addendum §4, §5), and the design names the source for each.
