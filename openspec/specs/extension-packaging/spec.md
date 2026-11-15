# extension-packaging Specification

## Purpose

Defines how the taiknr package is shaped and declared so Pi loads it as a local package, and what its single extension entry point must do when loaded.

## Requirements

### Requirement: Package manifest declares a single extension entry point

`package.json` SHALL declare the extension entry under `pi.extensions` as `./src/app/extension/taiknr.ts`. The package root SHALL NOT gain an `index.ts` or an `extensions/` directory. When a manifest carries any resource field, Pi uses only the entries it names and does not scan the conventional resource directories, so the single named entry is what Pi loads (Chidi §1, §4; Michael §2; R11).

#### Scenario: Manifest names the entry

- **WHEN** `package.json` is inspected
- **THEN** `pi.extensions` equals `["./src/app/extension/taiknr.ts"]`

#### Scenario: No competing entry point

- **WHEN** the package root is inspected
- **THEN** it contains no `index.ts` and no `extensions/` directory

### Requirement: Host-provided Pi packages are peer dependencies

The package SHALL declare `@earendil-works/pi-coding-agent` in `peerDependencies` with the range `"*"`, SHALL NOT declare it in `dependencies`, and MAY declare it in `devDependencies` for local type-checking only (Chidi §1; Trap 3; Trap 9).

#### Scenario: No duplicate-dependency warning

- **WHEN** the package is loaded through a `packages` entry in a throwaway agent directory, with no `-ne` flag, which would disable configured packages
- **THEN** Pi prints no host-provided-package warning

#### Scenario: Type-check resolves the Pi types

- **WHEN** `tsc --noEmit` runs after `npm install`
- **THEN** the Pi types resolve from `devDependencies` and the check reports no missing module

### Requirement: The extension entry loads without error

The extension entry SHALL load under Pi 1.5.2 without throwing. Each of the seven handler registrars SHALL register a no-op handler for its lifecycle event instead of throwing, and SHALL register nothing else (Q1(a); Trap 1; R3).

#### Scenario: Load check passes

- **WHEN** `pi --no-session --help` runs with `PI_CODING_AGENT_DIR` pointing at a throwaway directory that is a `git archive HEAD` copy of the repository and whose `settings.json` lists that copy under `packages` (design.md Decision 6)
- **THEN** stderr contains no `Failed to load extension` line and no host-provided-package warning. `--help` exits 0 whether or not an extension loaded, so the assertion is on the text, never on the exit code (R6)

#### Scenario: Seven events registered

- **WHEN** `tests/app/extension/taiknr.test.ts` invokes the entry's default export with a recording fake whose only member is `on`
- **THEN** the sorted list of registered event names equals exactly `session_start`, `session_tree`, `session_compact`, `tool_call`, `turn_end`, `agent_before_settle` and `context` (R6)

### Requirement: Handler signatures and the import boundary are preserved

The `register*Handler(pi, …)` signatures and the adapter and port contracts SHALL stay fixed, except the three differences enumerated in `Signatures unchanged`, which carry the session's configuration (O1; ruling 6). Everything else in those contracts SHALL stay unchanged against `HEAD`, no `@earendil-works/pi-*` import MAY enter `src/domain/` or `src/use-cases/` (ADR 0001; D5; Michael §2), and formatter whitespace MAY change in those files (R3).

#### Scenario: Signatures unchanged

- **WHEN** the seven handler files are compared with `HEAD`, and `ConfigPaths` in `src/config/taiknr-config.ts` is compared with `HEAD`
- **THEN** the only contract differences are (1) `registerSessionStartHandler` gaining the per-session configuration holder as a third parameter while keeping its `pi` and store parameters in their order, (2) the `config` member of `registerTurnEndHandler`'s and `registerContextHandler`'s dependency objects changing type from `TaiknrConfig` to the per-session configuration holder with the other members of both objects unchanged, and (3) `ConfigPaths.projectConfigPath` changing type from `string` to `string | undefined` (neither a registrar signature nor an adapter contract, listed here so a reviewer has one list of every permitted difference; rulings 2, 6); everything else is unchanged against `HEAD` — the other four registrars' exported names, parameter order, types and return types, `createPiJevScorerAdapter(ctx, config: TaiknrConfig)` (its signature; `TaiknrConfig` itself gains `enabled` under the `configuration` spec), and the port contracts — apart from each stub body replaced by its implementation (a used parameter may drop its `_` prefix) and formatter whitespace, while the rest of `src/config/taiknr-config.ts` is governed by the `configuration` spec

#### Scenario: Boundary holds

- **WHEN** `src/domain/` and `src/use-cases/` are searched for `@earendil-works/pi-` imports
- **THEN** none are found

### Requirement: The package is ESM with `.js` specifiers

`package.json` SHALL set `"type": "module"`, and source imports SHALL keep `.js` specifiers on `.ts` files (D6; S1).

#### Scenario: Test runner resolution without a build step

- **WHEN** a test imports a `src/` module through its `.js` specifier chain
- **THEN** the test runner resolves the chain to the `.ts` sources without a build step (R10)

### Requirement: Load verification uses a throwaway agent directory

The change SHALL NOT modify `~/.pi/agent/settings.json` or its dotfiles source. Every load and warning check SHALL run against a throwaway `PI_CODING_AGENT_DIR` (Q2(a); Trap 3).

#### Scenario: Acceptance checks are self-contained

- **WHEN** the acceptance checks run
- **THEN** they pass with a throwaway agent directory and Joel's settings file is unchanged
