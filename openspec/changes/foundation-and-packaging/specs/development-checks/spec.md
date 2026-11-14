# Spec Delta

## Purpose

Defines the local commands that verify the package — lint, type-check and test — the files each must and must not cover, and the working tree they run in.

## ADDED Requirements

### Requirement: One check command runs lint, type-check and test

`package.json` SHALL expose `lint`, `typecheck`, `test` and `check` scripts, and `check` SHALL run Biome, `tsc --noEmit` and the test runner in that order, failing if any of them fails (Q3(b); Chidi addendum §5).

#### Scenario: Check fails on a lint error

- **WHEN** a file violates a Biome rule
- **THEN** `npm run check` exits non-zero

#### Scenario: Check fails on a type error

- **WHEN** a source file has a type error
- **THEN** `npm run check` exits non-zero

#### Scenario: Check fails on a failing test

- **WHEN** a test fails
- **THEN** `npm run check` exits non-zero

### Requirement: Type-check covers source and tests and excludes the proof of concept

`tsconfig.json` SHALL include `src/**/*.ts` and `tests/**/*.ts`, SHALL exclude the root `jev-context-poc.ts`, and SHALL set `module` and `moduleResolution` to `nodenext` with `strict` and `noEmit` (S2; D6; Trap 2; Trap 4).

#### Scenario: Proof of concept excluded

- **WHEN** `tsc --noEmit` runs
- **THEN** `jev-context-poc.ts` is not part of the program

#### Scenario: `.js` specifiers resolve

- **WHEN** `tsc --noEmit` runs over `src/`
- **THEN** the `.js` specifiers on `.ts` files resolve with zero errors

### Requirement: The test command does not execute the proof-of-concept files

The test command SHALL run only files under `tests/` and SHALL NOT execute `test-jev-poc.mjs` or `jev-context-poc.ts`, which call a live model (Trap 4; Chidi addendum §4).

#### Scenario: Proof of concept not run

- **WHEN** `npm test` runs
- **THEN** no live model or classifier call is made

#### Scenario: Tests under `tests/` are found

- **WHEN** a `tests/**/*.test.ts` file exists
- **THEN** `npm test` runs it

### Requirement: Domain and use-case tests run without a Pi runtime

At least one test SHALL import a `src/domain/` or `src/use-cases/` module through its `.js` specifier chain and assert the behavior of an existing pure function, with no Pi extension loader or Pi session present (S6; ADR 0001 Consequences; D3).

#### Scenario: Plain test run

- **WHEN** the test suite runs
- **THEN** the domain or use-case test passes without Pi's extension loader or a Pi session

### Requirement: Biome configuration follows community practice

The Biome configuration SHALL follow what is typical in the community rather than a bespoke or sibling-copied configuration (Joel's ruling, `owner-rulings.md`, 2026-11-14). Which community sets the baseline is open in the proposal; the design settles it.

#### Scenario: Every non-default setting is justified

- **WHEN** the Biome configuration is reviewed
- **THEN** each setting that differs from the `biome init` output traces to a named community source recorded in the design

#### Scenario: The chosen baseline is recorded

- **WHEN** the design is read
- **THEN** it names the community baseline the configuration follows

### Requirement: The import boundary is not lint-enforced in this change

No lint rule SHALL enforce ADR 0001's import boundary in this change, and the design SHALL record the enforcement as deferred rather than satisfied (S7).

#### Scenario: No boundary rule

- **WHEN** the Biome configuration is inspected
- **THEN** it contains no rule restricting `@earendil-works/pi-*` imports in `src/domain/` or `src/use-cases/`

#### Scenario: Deferral recorded

- **WHEN** the design is read
- **THEN** the boundary lint is listed as deferred

### Requirement: A fresh install leaves the working tree clean

`.gitignore` SHALL ignore `node_modules/`, `*.tgz` and `.DS_Store`, and SHALL NOT add a `.pi/` entry, which is already excluded locally and owned by the conductor (S3; Trap 5).

#### Scenario: Install does not dirty the tree

- **WHEN** `npm install` runs in the checkout
- **THEN** `git status` reports no new untracked files

#### Scenario: `.pi/` is not re-decided

- **WHEN** `.gitignore` is read
- **THEN** it contains no `.pi/` entry
