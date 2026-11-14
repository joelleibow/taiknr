# Spec Delta

## Purpose

Defines how the taiknr package is shaped and declared so Pi loads it as a local package, and what its single extension entry point must do when loaded.

## ADDED Requirements

### Requirement: Package manifest declares a single extension entry point

`package.json` SHALL declare the extension entry under `pi.extensions` as `./src/app/extension/taiknr.ts`. The package root SHALL NOT gain an `index.ts` or an `extensions/` directory, because either would change which files Pi's fallback discovery considers (Chidi §1, §4; Michael §2).

#### Scenario: Manifest names the entry

- **WHEN** Pi resolves the package's resources
- **THEN** it loads only the entry named in `pi.extensions` and does not scan the conventional resource directories

#### Scenario: No competing entry point

- **WHEN** the package root is inspected
- **THEN** it contains no `index.ts` and no `extensions/` directory

### Requirement: Host-provided Pi packages are peer dependencies

The package SHALL declare `@earendil-works/pi-coding-agent` in `peerDependencies` with the range `"*"`, SHALL NOT declare it in `dependencies`, and MAY declare it in `devDependencies` for local type-checking only (Chidi §1; Trap 3; Trap 9).

#### Scenario: No duplicate-dependency warning

- **WHEN** the package is loaded through a `packages` entry in a throwaway agent directory
- **THEN** Pi prints no host-provided-package warning

#### Scenario: Type-check resolves the Pi types

- **WHEN** `tsc --noEmit` runs after `npm install`
- **THEN** the Pi types resolve from `devDependencies` and the check reports no missing module

### Requirement: The extension entry loads without error

The extension entry SHALL load under Pi 1.5.2 without throwing. Each of the seven handler registrars SHALL register a no-op handler for its lifecycle event instead of throwing, and SHALL register nothing else (Q1(a); Trap 1).

#### Scenario: Load check passes

- **WHEN** `pi -ne -e <repo> --help` runs against the checkout
- **THEN** no extension load error is reported

#### Scenario: Seven events registered

- **WHEN** the entry's default export is invoked with Pi's extension API
- **THEN** it registers handlers for `session_start`, `session_tree`, `session_compact`, `tool_call`, `turn_end`, `agent_before_settle` and `context`

### Requirement: Handler signatures and the import boundary are preserved

The change SHALL NOT alter the `register*Handler(pi, …)` signatures or the adapter and port contracts, and SHALL NOT introduce a `@earendil-works/pi-*` import into `src/domain/` or `src/use-cases/` (D3; Michael §2).

#### Scenario: Signatures unchanged

- **WHEN** the seven handler files are compared with `HEAD`
- **THEN** only the stub bodies differ

#### Scenario: Boundary holds

- **WHEN** `src/domain/` and `src/use-cases/` are searched for `@earendil-works/pi-` imports
- **THEN** none are found

### Requirement: The package is ESM with `.js` specifiers

`package.json` SHALL set `"type": "module"`, and source imports SHALL keep `.js` specifiers on `.ts` files (D6; S1).

#### Scenario: ESM resolution without a build step

- **WHEN** a test imports a `src/` module through its `.js` specifier chain
- **THEN** Node resolves the chain to the `.ts` sources without a build step

### Requirement: Load verification uses a throwaway agent directory

The change SHALL NOT modify `~/.pi/agent/settings.json` or its dotfiles source. Every load and warning check SHALL run against a throwaway `PI_CODING_AGENT_DIR` (Q2(a); Trap 3).

#### Scenario: Acceptance checks are self-contained

- **WHEN** the acceptance checks run
- **THEN** they pass with a throwaway agent directory and Joel's settings file is unchanged
