# development-checks Specification

## Purpose

Defines the local commands that verify the package — lint, type-check and test — the files each must and must not cover, and the working tree they run in.

## Requirements

### Requirement: One check command runs lint, type-check and test

`package.json` SHALL expose `lint`, `typecheck`, `test` and `check` scripts, and `check` SHALL run Biome, `tsc --noEmit` and the test runner in that order, failing if any of them fails (Q3(b); Chidi addendum §5). No script in the chain SHALL pass `--write` to Biome (R2).

#### Scenario: Check fails on a lint error

- **WHEN** a file in the lint scope violates an error-severity Biome rule or is not formatted
- **THEN** `npm run check` exits non-zero (R9)

#### Scenario: Check fails on a type error

- **WHEN** a source file has a type error
- **THEN** `npm run check` exits non-zero

#### Scenario: Check fails on a failing test

- **WHEN** a test fails
- **THEN** `npm run check` exits non-zero

#### Scenario: Check never writes

- **WHEN** `npm run check` runs
- **THEN** the working tree is unchanged and no script in the chain passes `--write` to Biome (R2)

### Requirement: Type-check covers source and tests and excludes the proof of concept

`tsconfig.json` SHALL include `src/**/*.ts` and `tests/**/*.ts`, SHALL NOT bring the root `jev-context-poc.ts` into the program, and SHALL set `module` and `moduleResolution` to `nodenext` with `strict` and `noEmit` (S2; D6; Trap 2; Trap 4).

#### Scenario: Proof of concept excluded

- **WHEN** `tsc --noEmit` runs
- **THEN** `jev-context-poc.ts` is not part of the program

#### Scenario: `.js` specifiers resolve

- **WHEN** `tsc --noEmit` runs over `src/`
- **THEN** the `.js` specifiers on `.ts` files resolve with zero errors

### Requirement: The test command does not execute the proof-of-concept files

`vitest.config.ts` SHALL set `test.include` to `["tests/**/*.test.ts"]` and nothing else, so the test command runs only files under `tests/` and never executes `test-jev-poc.mjs` or `jev-context-poc.ts`, which call a live model (Trap 4; Chidi addendum §4; R10).

#### Scenario: Proof of concept not collected

- **WHEN** `npm test` runs
- **THEN** its collected file set contains no file outside `tests/`, so no live model or classifier call is made

#### Scenario: Tests under `tests/` are found

- **WHEN** a `tests/**/*.test.ts` file exists
- **THEN** `npm test` runs it

### Requirement: Domain and use-case tests run without a Pi runtime

At least one test SHALL import a `src/domain/` or `src/use-cases/` module through its `.js` specifier chain and assert the behavior of an implemented pure function (`shouldArchive`, `selectRecalledIds`), with no Pi extension loader or Pi session present (S6; R5; ADR 0001 Consequences; D3).

#### Scenario: Plain test run

- **WHEN** the test suite runs
- **THEN** the domain or use-case test passes without Pi's extension loader or a Pi session

#### Scenario: The import exercises the `.js` chain

- **WHEN** the domain test imports its module
- **THEN** the specifier it uses ends in `.js` and resolves to the `.ts` source (R5)

### Requirement: Biome configuration follows the `biome init` baseline with a scoped file list

`biome.json` SHALL be the `@biomejs/biome` 2.6.7 `biome init` output — tab indentation, double quotes, the `recommended` preset, `organizeImports` on, no rule overrides — plus `vcs.enabled`, `vcs.clientKind: "git"`, `vcs.useIgnoreFile: true`, a scoped `files.includes` allowlist and `lineWidth` 120 (R1; R2; OD-1; `owner-rulings.md` "Biome line width"; Chidi addendum §1).

#### Scenario: Every non-default setting is justified

- **WHEN** `biome.json` is reviewed
- **THEN** each setting that differs from the `biome init` 2.6.7 output traces to a named source recorded in the design

#### Scenario: The chosen baseline is recorded

- **WHEN** the design is read
- **THEN** it names the `biome init` 2.6.7 baseline and records `lineWidth` 120 as the one governed deviation

### Requirement: Lint covers only the package's own sources

`biome.json` SHALL set `files.includes` to an allowlist of `src/**`, `tests/**`, `package.json`, `tsconfig.json`, `biome.json` and `vitest.config.ts`, so no lint finding comes from the proof-of-concept files, the documentation, the change directory or the conductor's `.pi/` directory (R2; CR-1; Trap 5).

#### Scenario: Files outside the package's own sources are not linted

- **WHEN** `npm run lint` runs
- **THEN** it reports nothing under `jev-context-poc.ts`, `test-jev-poc.mjs`, `docs/`, `openspec/` or `.pi/`

#### Scenario: A new source file is inside the scope

- **WHEN** a file is added under `src/` or `tests/`
- **THEN** it is covered by `files.includes` without editing `biome.json`

### Requirement: The import boundary is not lint-enforced in this change

No lint rule SHALL enforce ADR 0001's import boundary in this change, and the design SHALL record the enforcement as deferred rather than satisfied (S7).

#### Scenario: No boundary rule

- **WHEN** the Biome configuration is inspected
- **THEN** it contains no rule restricting `@earendil-works/pi-*` imports in `src/domain/` or `src/use-cases/`

#### Scenario: Deferral recorded

- **WHEN** the design is read
- **THEN** the boundary lint is listed as deferred

### Requirement: A fresh install leaves the working tree clean

`.gitignore` SHALL ignore `node_modules/`, `*.tgz`, `.DS_Store` and `.envrc` — the list is the entries this change is answerable for, not the whole file — and SHALL NOT add a `.pi/` entry, which is already excluded locally and owned by the conductor (S3; Trap 5; owner-rulings.md 2026-11-17). `.envrc` exports a provider key and was never tracked (`michael-orientation.md` §1). `package-lock.json` SHALL be committed and SHALL NOT be ignored (R4).

#### Scenario: Install does not dirty the tree

- **WHEN** `npm install` runs on a clean checkout that contains the committed `package-lock.json`
- **THEN** `git status` reports no changes (R4)

#### Scenario: The lockfile is committed

- **WHEN** the repository is inspected
- **THEN** `package-lock.json` is tracked and `.gitignore` contains no entry for it (R4)

#### Scenario: `.envrc` stays out of the repository

- **WHEN** a `.envrc` exporting `CLAUDE_API_KEY` sits at the repository root
- **THEN** `.gitignore` names it at line 12 and `git status` reports nothing for it, because the file was never tracked and must not start being one (owner-rulings.md 2026-11-17; `.gitignore:12`; `1b773fe`)

#### Scenario: `.pi/` is not re-decided

- **WHEN** `.gitignore` is read
- **THEN** it contains no `.pi/` entry
