# Eleanor research — Foundation and packaging

## Question and Scope

Inventory of `pi-taiknr` at the checked-out `HEAD`, comparison with `pi-jefferson` and `pi-omlx`, Joel's local Pi settings and dotfiles source, architecture/ADR claims, and the extension composition path. This is repository reconnaissance only; I did not install dependencies, run npm/Pi, or modify repository state other than writing this report. Brief reviewed in full: `.pi/marbleization/foundation-and-packaging/brief-research.md`.

## Sources / Files Examined

- `pi-taiknr`: `ARCHITECTURE.md`; both `docs/adr/0001-keep-domain-and-use-cases-free-of-pi-types.md` and `docs/adr/0002-deterministic-settlement-stubbing-and-tail-recall.md`; all tracked `src/` files (imports/exports inspected); `openspec/changes/foundation-and-packaging/owner-rulings.md`; repository index at HEAD.
- `pi-jefferson`: `package.json`, `tsconfig.json`, `.gitignore`, `AGENTS.md`; checked whether `vitest.config.ts`, `biome.json`, `.npmignore`, and `CONTRIBUTING.md` exist.
- `pi-omlx`: `package.json`, `tsconfig.json`, `vitest.config.ts`, `biome.json`, `.gitignore`, `.npmignore`, `AGENTS.md`, `CONTRIBUTING.md`.
- `/Users/joelleibow/.pi/agent/settings.json` and `/Users/joelleibow/dotfiles/home/dot_pi/private_agent/settings.json`.

## Findings

### 1. pi-taiknr files and stubs

At HEAD, tracked project files are `ARCHITECTURE.md`, two ADRs, `jev-context-poc.ts`, `test-jev-poc.mjs`, `openspec/config.yaml`, `openspec/specs/.gitkeep`, `openspec/changes/archive/.gitkeep`, and these `src/` files:

- `src/app/extension/taiknr.ts`
- `src/config/taiknr-config.ts`
- `src/domain/archived-output.ts`, `src/domain/recall.ts`
- `src/use-cases/commit-archived-batch.ts`, `hydrate-archive-store.ts`, `ports.ts`, `recall-relevant-context.ts`, `stage-tool-outputs.ts`
- `src/infra/adapters/pi-archive-adapter.ts`, `pi-context-adapter.ts`, `pi-jev-scorer-adapter.ts`, `pi-notifier-adapter.ts`
- `src/infra/pi-event-handlers/agent-before-settle.ts`, `context.ts`, `session-compact.ts`, `session-start.ts`, `session-tree.ts`, `tool-call.ts`, `turn-end.ts`.

The root has no tracked `package.json`, `tsconfig.json`, test directory/harness, or `AGENTS.md`. This means no local project TypeScript setup exists to establish a passing type-check. I did not install anything or attempt a type-check, so whether these stubs actually type-check remains unverified (and depends on the eventual compiler/config/dependency types).

Imports and exports at a glance: domain exports `ToolOutputCandidate`, `ArchivedToolOutput`, `shouldArchive`, `buildStub`, `RelevanceScore`, `RecalledOutput`, `selectRecalledIds`, `formatRecalledContext`; it imports no Pi package. Configuration exports `TaiknrConfig`, `DEFAULT_TAIKNR_CONFIG`, `ConfigPaths`, `loadTaiknrConfig`; no imports. Use cases import only local domain/port types and export operations and relevant input/cache interfaces. All infra adapters and event handlers import type(s) from `@earendil-works/pi-coding-agent` as well as local contracts; notably Pi imports include `SessionEntry`, `ContextEvent`, `ExtensionContext`, and `ExtensionAPI`. The entry `taiknr.ts` imports `ExtensionAPI` as a type and local config/domain/adapter/handler/cache symbols, then default-exports `taiknr(pi: ExtensionAPI): void`.

The stubs are largely declarations/signatures with placeholder bodies; source reads alone cannot prove correctness of the Pi API names/events against version 1.5.2. Architecture documents the intended event names, but that is not compiler evidence.

### 2. Sibling reference packages

**pi-jefferson** (`package.json`): name `pi-jefferson`; keywords include `pi-package`; `pi.extensions` points to `./extensions/jefferson.ts`; scripts are `test: node --test` and `typecheck: tsc --noEmit` (no `check`). Pi host packages `@earendil-works/pi-coding-agent` and `pi-tui` appear in `peerDependencies` (`*`) and also `devDependencies` (version `^1.4.0`). It has a runtime `lodash-es` dependency. TypeScript is strict, NodeNext module/resolution, `noEmit`, includes `extensions/**/*.ts` and `tests/**/*.ts`; its tests are in root `tests/` and execute TS directly using Node's type stripping per AGENTS.md. `.gitignore` ignores node_modules, `.DS_Store`, tgz, `.pi/`. `AGENTS.md` exists and describes commands/conventions. `vitest.config.ts`, `biome.json`, `.npmignore`, `CONTRIBUTING.md` are absent.

**pi-omlx** (`package.json`): name `pi-omlx`; keywords include `pi-package`; `pi.extensions` points to `./index.ts`; scripts include `check` (Biome + `tsc --noEmit` + `vitest run`), `format`, `typecheck`, `test`, watch, release. Pi AI and coding-agent packages are peer `*` and dev dependencies pinned by compatible ranges (`^1.5.2`); no production dependencies listed. TypeScript uses strict ESNext/bundler resolution, allows TS extensions, and includes root, `src`, `test`, and `scripts` TypeScript. Vitest config runs `test/**/*.test.ts` under Node and configures global/worker isolation setup in `test/isolation/`. Biome config enables formatter/linter and respects VCS ignore. `.gitignore` contains node_modules, env files and local/generated paths; `.npmignore` excludes development/docs/test/config assets. `AGENTS.md` and `CONTRIBUTING.md` both exist, documenting checks/setup and isolation conventions.

Differences: Jefferson uses Node's built-in test runner, TS executed without a build, `tests/` plural, TypeScript NodeNext, and ships a runtime dependency; OMLX uses Vitest, `test/` singular, has Biome and a combined `check`, uses ESM/bundler TS config, and isolates agent-directory side effects. Jefferson's peer/dev versions correspond to Pi 1.4 while OMLX is aligned with 1.5.2. These are observed choices, not a ruling on which taiknr should adopt.

### 3. Joel's Pi settings

The active settings file and dotfiles source have the same settings content, including the checkout entries, and the source is a plain JSON settings file at the supplied path (`private_agent/settings.json`), not a visibly templated file. Under `extensions`, `../../Projects/thinking-box/src/thinking-box.ts` is an extension-entry path. Under `packages`, the two maintained checkout entries are bare package directory strings `../../Projects/pi-jefferson` and `../../Projects/pi-omlx` (alongside object-form npm package records and npm package strings). No `pi-taiknr` entry is currently present. The supplied relative strings are recorded exactly; path resolution semantics belong to Chidi's Pi-docs seam.

### 4. Architecture and ADR evidence (line references)

- `ARCHITECTURE.md` lines 5–17 describes the stub-stage repository and tree: `tests/` outside `src/app/extension/`; lines 19–31 show event flow and component boundaries; lines 33–40 state the extension composition role and Pi API boundaries; lines 46–48 identify the Pi host integration as peer/dev only and imported in app/infra; lines 54–56 state the local checkout is loaded via package manifest; lines 66–68 say packaging/type-check/test harness are queued and tests should be root `tests/` external to extension entry directory. These are the project's intended architecture, not proof of Pi's loading behavior.
- ADR 0001: lines 15–18 establish the Clean Architecture boundary and Pi-specific handlers/adapters, lines 22–32 explain testing/reuse consequences. It does not prescribe package.json dependency placement.
- ADR 0002: lines 15–21 specify deterministic settlement stubs, in-session archive persistence, tail recall, and fail-open behavior. It does not set packaging or test-runner policy.

### 5. Extension feature path / load-check coverage

`src/app/extension/taiknr.ts` is the composition root. It receives `ExtensionAPI`, selects `DEFAULT_TAIKNR_CONFIG`, constructs `InMemoryArchiveStore`, per-session maps/buffers and recall cache, then registers handlers in this order: session start/tree/compact → tool call → turn end → agent-before-settle → context. The entry directly composes adapters/handlers and types (`ArchivedToolOutput`, `RecallCache`); handler bodies and downstream adapters/usages are separate files listed above. A load check of this entry would at minimum exercise module resolution of its transitive imports and evaluate its top-level imports; registering behavior would require invoking its default export with Pi's extension API. This does not establish the exact Pi loader behavior or whether a one-off check invokes all hooks.

## Assumptions, Differences, and Unknowns

- Type-check status is unknown because no package manifest, TS config, dependency install, or compiler run exists in this checkout at HEAD. No claims about actual Pi type compatibility are made.
- Pi's precise rules for package manifests, package vs extension path resolution, extension auto-discovery, test-file loading, warnings, and `pi -e` are outside this Scout evidence; Chidi's installed-doc research is needed. In particular, this report does not validate the card's premise that test files are auto-executed by Pi.
- Settings path resolution base and whether local package entries are discovered through their manifests require Pi documentation; only the literal keys/values are reported.
- Jefferson and OMLX illustrate distinct established test setups. Their configs differ significantly, so a selected convention remains for product/owner decision rather than inference from precedent.
- No `pi-taiknr` `AGENTS.md` was present in the root at HEAD. The current worktree had the untracked change directory (including the provided owner ruling); no source or configuration was changed by this research.
