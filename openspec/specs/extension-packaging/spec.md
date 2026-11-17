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

The extension entry SHALL load under Pi 1.5.2 without throwing, and each handler registrar SHALL register a handler for its lifecycle event instead of throwing. The six publishing registrars SHALL add one publishing event each, through the gated pi and after the handler whose outcome each reads; `turn_end` and `agent_before_settle` publish nothing. No registrar SHALL register a second event (Q1(a); R3; ruling 9; the events are named by *Every registration is listed*).

#### Scenario: Load check passes

- **WHEN** `pi --no-session --help` runs with `PI_CODING_AGENT_DIR` pointing at a throwaway directory that is a `git archive HEAD` copy of the repository and whose `settings.json` lists that copy under `packages` (design.md Decision 6)
- **THEN** stderr contains no `Failed to load extension` line and no host-provided-package warning. `--help` exits 0 whether or not an extension loaded, so the assertion is on the text, never on the exit code (R6)

#### Scenario: Seven events registered

- **WHEN** `tests/app/extension/taiknr.test.ts` invokes the entry's default export with a recording fake whose only member is `on`
- **THEN** every registration that predates this change is still in the list — `session_start`, `session_tree`, `session_compact`, `tool_call`, `turn_end`, `agent_before_settle` and `context_with_system` — each unchanged (R6; S1; ruling 9)

#### Scenario: Every registration is listed

- **WHEN** `tests/app/extension/taiknr.test.ts` invokes the entry's default export with a recording fake whose only member is `on`
- **THEN** the sorted list of every registration, duplicates kept, equals exactly 13 entries — `session_start`, `context_with_system`, `session_compact` and `session_tree` twice each; `agent_settled` and `message_end` once each; and the existing `agent_before_settle`, `tool_call` and `turn_end` — because a set would hide an accidental double registration, and folding publishing into the existing handlers would widen the signature revision (R6; S1; ruling 9; ruling 10)

#### Scenario: The factory touches nothing but `on`

- **WHEN** the entry's default export runs against the load test's fake, which throws on any member other than `on`
- **THEN** the factory still loads, because registration happens at `session_start` and the factory never reads `pi.events` (ruling 16)

#### Scenario: Recall subscribes to the system-inclusive event

- **WHEN** a session whose request carries a mid-conversation system message is scored, and that session's next request is built with recall
- **THEN** recall reaches the request through the `context_with_system` registration, no handler is registered for `context`, and the payload and result types the registration declares are unchanged from `HEAD` (S1; T1; `tail-recall` spec)

### Requirement: Handler signatures and the import boundary are preserved

The `register*Handler(pi, …)` signatures and the adapter and port contracts SHALL stay fixed at `abaa6b0` apart from the closed list of additions *Signatures unchanged* enumerates. No `@earendil-works/pi-*` or `pi-jefferson` import MAY enter `src/domain/` or `src/use-cases/`, and formatter whitespace MAY change in those files (ADR 0001; O1; O3; D5; Michael §2; rulings 3, 6, 7, 12).

#### Scenario: Signatures unchanged

- **WHEN** the seven handler files are compared with `abaa6b0`, and `ConfigPaths` in `src/config/taiknr-config.ts` is compared with `abaa6b0`
- **THEN** (1)–(4) are already in that baseline and stay unchanged — (1) `registerSessionStartHandler` takes the per-session configuration holder as its third parameter, after its `pi` and store parameters in that order, (2) the `config` member of `registerTurnEndHandler`'s and `registerContextHandler`'s dependency objects is the per-session configuration holder, with the other members of both objects as they are apart from (4), (3) `ConfigPaths.projectConfigPath` is `string | undefined`, and (4) `registerContextHandler`'s dependency object has no `notifier` member while its `config`, `store` and `recallCache` members stay as they are, because the notifier is built in the handler (none of (3) and (4) is a registrar signature or an adapter contract, listed here so a reviewer has one baseline to read; rulings 2, 6, 3, 12) — and this change's contract differences are a closed list, all additions: (a) the publishing registrars, one file each in `src/infra/pi-event-handlers/`; (b) `registerContextHandler`'s dependency object gaining the per-session instruments holder; (c) `createPiJevScorerAdapter` gaining an optional third parameter, the classifier observer; and (d) `TaiknrConfig` and its default gaining the switch under the `configuration` spec (O1; O2; ruling 7); everything else is unchanged against `abaa6b0` — the other six registrars' exported names, parameter order, types and return types, `createPiJevScorerAdapter(ctx, config: TaiknrConfig, observer?)` being (c) and nothing more, and the port contracts, `RelevanceScorer`'s included — apart from each stub body replaced by its implementation (a used parameter may drop its `_` prefix) and formatter whitespace, while the rest of `src/config/taiknr-config.ts` is governed by the `configuration` spec

#### Scenario: A rename under O8

- **WHEN** the design renames `context.ts` or `registerContextHandler`
- **THEN** that rename is one further difference on the same list, and nothing else moves: `createPiJevScorerAdapter`, `extractLatestUserPrompt`, `appendRecalledContextToMessages` and `createOncePerSessionNotifier` keep their signatures, `RecallCache` keeps its shape, and the port contracts stay (ruling 12)

#### Scenario: Boundary holds

- **WHEN** `src/domain/` and `src/use-cases/` are searched for `@earendil-works/pi-` and `pi-jefferson` imports
- **THEN** none are found (ADR 0001; O3)

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

### Requirement: The Jefferson contract is a type-only development dependency

`package.json` SHALL declare `pi-jefferson` in `devDependencies` only, never in `dependencies` or `peerDependencies`, and every import of its contract SHALL be `import type` from `pi-jefferson/instruments`, with `"verbatimModuleSyntax": true` in `tsconfig.json` making a value import of a type-only export a compile error (S7; M5; M6; T13; `research-chidi` A4; ruling 17).

#### Scenario: Loading without the package installed

- **WHEN** the extension is loaded from a checkout whose `node_modules` holds no `pi-jefferson`
- **THEN** it loads with stderr unchanged, because a type-only import is erased and nothing reaches the runtime (M5; `research-chidi` A4)

#### Scenario: The lockfile carries it

- **WHEN** `npm install` runs on a clean checkout
- **THEN** `git status` reports no changes and the committed `package-lock.json` carries `pi-jefferson` and the packages it brings (M5; `development-checks` spec)

#### Scenario: What stops a value import

- **WHEN** a value import of one of Jefferson's type-only exports is written, with the `type` keyword dropped
- **THEN** `npm run check` fails with TS1484, because `"verbatimModuleSyntax": true` in `tsconfig.json` makes it a compile error rather than a Biome warning, and the runtime backstop is the existing `git archive` load check, which has no `node_modules` (M5; M6; T13; ruling 17)

#### Scenario: Where the rule comes from

- **WHEN** the reason for the `type` keyword is asked
- **THEN** it is Jefferson's contract rather than the load: plain Node will not strip types under `node_modules`, so a provider imports the contract with `import type`, and pi's loader erases a non-`type` import that is used only as a type either way (`research-chidi` A4; ruling 17)
