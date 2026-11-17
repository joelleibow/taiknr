# Spec Delta — development-checks

## MODIFIED Requirements

### Requirement: A fresh install leaves the working tree clean

`.gitignore` SHALL ignore `node_modules/`, `*.tgz`, `.DS_Store` and `.envrc`, and SHALL NOT add a `.pi/` entry, which is already excluded locally and owned by the conductor (S3; Trap 5; owner-rulings.md 2026-11-17). `.envrc` exports a provider key and was never tracked (`michael-orientation.md` §1). `package-lock.json` SHALL be committed and SHALL NOT be ignored (R4).

#### Scenario: Install does not dirty the tree

- **WHEN** `npm install` runs on a clean checkout that contains the committed `package-lock.json`
- **THEN** `git status` reports no changes (R4)

#### Scenario: The lockfile is committed

- **WHEN** the repository is inspected
- **THEN** `package-lock.json` is tracked and `.gitignore` contains no entry for it (R4)

#### Scenario: `.envrc` stays out of the repository

- **WHEN** a `.envrc` exporting `CLAUDE_API_KEY` sits at the repository root
- **THEN** `.gitignore` names it and `git status` reports nothing for it, because the file was never tracked and must not start being one (owner-rulings.md 2026-11-17; `michael-orientation.md` §1)

#### Scenario: `.pi/` is not re-decided

- **WHEN** `.gitignore` is read
- **THEN** it contains no `.pi/` entry
