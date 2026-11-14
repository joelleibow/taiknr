# ARCHITECTURE.md

`pi-taiknr` is a Clean Architecture Pi extension that shrinks active prompt context while keeping the session prompt prefix byte-identical for KV cache reuse. It replaces large tool outputs with deterministic one-line stubs after an agent run settles, stores raw outputs in session entries, and recalls relevant raw blocks at the tail of the current user message using a decision classifier.

The repository is currently at the stub stage: `src/` defines the module boundaries and contracts as TypeScript stubs pending implementation through the project board cards, while `jev-context-poc.ts` and `test-jev-poc.mjs` preserve the original proof of concept.

## 1. Project Structure

```text
src/
  app/
    extension/       Pi extension composition root wiring config, adapters, use cases, and hooks
  config/            Configuration schema, built-in defaults, and agent/project JSON override loader
  domain/            Pure archival policies, deterministic stub formatting, and recall selection rules
  use-cases/         Application ports and use cases for staging, settlement, hydration, and recall
  infra/
    adapters/        Translators between Pi DTOs / APIs and domain/use-case contracts
    pi-event-handlers/ Thin Pi lifecycle hook registrations bridging events to adapters and use cases
tests/               Test suite, mirroring the src/ layer layout
docs/
  adr/               Architecture Decision Records
```

## 2. High-Level System Diagram

```mermaid
flowchart LR
    pi["Pi Host"] -->|lifecycle events| handlers["Pi Event Handlers"]
    handlers -->|Pi DTOs| adapters["Infra Adapters"]
    adapters -->|domain contracts| usecases["Use Cases & Domain"]
    adapters -->|context_edit + custom entries| session[("Pi Session Branch")]
    adapters -->|classify stubs + prompt| jev["Decision Classifier (Jev)"]
```

## 3. Core Components

- **Extension composition root (`src/app/extension/`):** Registers the extension with Pi, holds per-session ephemeral state (in-flight tool call arguments, staged outputs, recall cache), and wires configuration, adapters, use cases, and event handlers. V1 scopes `src/app/` to the Pi extension only.
- **Configuration (`src/config/`):** Resolves `TaiknrConfig` (`decisionThreshold`, `defaultDecisionModel`, `defaultDecisionModelProvider`, `minCharsToArchive`) by merging optional agent-level and project-level JSON overrides over built-in defaults.
- **Domain (`src/domain/`):** Defines core types (`ToolOutputCandidate`, `ArchivedToolOutput`, `RelevanceScore`, `RecalledOutput`) and pure rules for archival eligibility, deterministic one-line stub rendering, threshold filtering, and `<recalled_context>` block formatting. Contains zero Pi imports.
- **Use cases (`src/use-cases/`):** Orchestrates staging large tool outputs, committing settled batches into the archive store, hydrating the store from branch history, and caching/scoring relevance recall with fail-open handling. Depends only on domain types and port interfaces.
- **Adapters (`src/infra/adapters/`):** Translates Pi-specific event DTOs and runtime objects into use-case contracts and back—mapping `TurnEndEvent` results into candidates, converting committed batches into `context_edit` (preserving non-text blocks) and `custom` boundary drafts, reading branch entries, invoking Pi's classifier registry, appending tail recall blocks while preserving user image blocks, and emitting once-per-session failure warnings.
- **Pi event handlers (`src/infra/pi-event-handlers/`):** Subscribes to `session_start`, `session_tree`, `session_compact`, `tool_call`, `turn_end`, `agent_before_settle`, and `context`. Every handler registers a no-op callback for its own event today; the delegation to adapters and use cases arrives with the later board cards.

## 4. Data Stores

- **Pi session branch entries (`custom` type `taiknr-side-store`):** Persists archived raw tool outputs inside the session's JSONL tree at `agent_before_settle`. Hydrated from `getBranch()` on session start, tree navigation, and compaction so branches and forks remain self-contained and pre-compaction outputs stay scorable.
- **In-memory archive store (`InMemoryArchiveStore`):** Holds the active branch's archived items keyed by Pi's 8-character `entryId` for fast lookup during a session.
- **Ephemeral run buffers and recall cache:** Per-session maps holding tool-call argument summaries, staged candidates awaiting settlement, original non-text tool result blocks, and the latest user-message recall key (`timestamp` + text) so multi-step tool loops reuse recall results without breaking intra-run prompt caching.
- **Configuration files (optional):** Agent-level `~/.pi/agent/pi-taiknr.json` and project-level `<cwd>/.pi/pi-taiknr.json`, loaded at startup over built-in defaults.

## 5. External Integrations

- **Pi Coding Agent host (`@earendil-works/pi-coding-agent`):** Provides lifecycle hooks, `SessionManager` branch state, `context_edit` / `custom` boundary drafts, `ctx.modelRegistry` classifier lookup and execution, and `ctx.ui.notify`. Declared as a peer/dev dependency only and imported exclusively inside `src/app/` and `src/infra/`.
- **Decision classifier (`openrouter` / `~typesafe/jev-latest` by default):** Invoked through Pi's `ModelRegistry.classify` API with one `bool` question per archived stub against `{ userPrompt, archivedToolOutputs }`. Fails open on missing model or runtime error, notifying the user at most once per session.

## 6. Deployment & Infrastructure

Runs inside the local Pi Node.js process as a Pi extension package loaded from its local checkout, named under `packages` in `~/.pi/agent/settings.json` (relative paths there resolve from `~/.pi/agent`). The manifest's `"pi": { "extensions": [...] }` names the single entry inside `src/app/extension/`, and Pi loads nothing else from the package. Nothing is published: `package.json` carries no `version`, `license` or `files` yet, so `npm pack` fails until the publishing card writes them. Requires no standalone daemon or database service.

## 7. Security

- Raw tool outputs remain local in the user's Pi session JSONL files unless recalled into a model prompt or sent as 1-line deterministic stubs to the configured classifier provider.
- Classifier invocation inherits Pi's existing provider authentication (`auth.json`); `pi-taiknr` stores no credentials of its own.
- On classifier absence or failure, the extension fails open and leaves prompts unaltered rather than blocking user work or leaking raw failure internals into model context.

## 8. Development & Testing

The package is wired for local work. Six files at the root carry the tooling: `package.json`, `package-lock.json`, `tsconfig.json`, `biome.json`, `vitest.config.ts` and `.gitignore`. The lockfile is committed, so a fresh checkout resolves the versions this repository was checked against: Biome 2.6.7, TypeScript 7.0.2, vitest 5.1.0 and `@earendil-works/pi-coding-agent` 1.5.2.

Three tools gate the code, in one chain behind `npm run check`:

- **Lint and format (`npm run lint`):** Biome over the allowlist `biome.json` declares, which is `src/`, `tests/` and the four root configuration files Biome reads. The run is read-only, and formatting is part of the gate, at 120 columns.
- **Types (`npm run typecheck`):** `tsc --noEmit` over `src/` and `tests/` under `nodenext` resolution, so the `.js` specifiers on `.ts` files resolve without a build step. The proof-of-concept files at the root sit outside the program.
- **Tests (`npm run test`):** vitest, collecting only `tests/**/*.test.ts`.

Tests live at the root under `tests/`, each file mirroring the `src/` layer it exercises. Pi loads only the entries its manifest names, so a root test directory is never loaded as an extension; it sits there because the sibling packages keep their suites at the root.

No check enforces ADR 0001's import boundary. Only the review half of that ADR's Consequences clause is in force, and nothing in `src/domain/` or `src/use-cases/` imports a Pi package today. Enforcement is deferred to a later card, as either a Biome rule or a check of its own.

Loading the extension for local use takes the `packages` entry described in §6. `AGENTS.md` carries the commands, conventions and traps a contributor runs into; this section does not repeat them. ADR 0003 records why the toolchain is shaped this way.

## 9. Future Considerations

- **Additional entry points (`src/app/cli/`, `src/app/mcp/`):** Planned discrete applications reusing `src/domain/` and `src/use-cases/` with filesystem/memory archive stores and standalone classifier adapters (see ADR 0001).
- **Status readout and `/taiknr` command:** Deferred past v1 (`ctx.ui.setStatus` indicators, interactive stub/score inspection, and session toggling).
- **Archive scaling and threshold calibration:** Pre-compaction `getBranch()` hydration grows the classifier input payload over very long sessions; capping or pruning stale entries and calibrating thresholds remain open future work.

## 10. Project Identification

- **Name:** `pi-taiknr` (project name: `taiknr`)
- **Owner:** Joel Leibow

## 11. Glossary

- **Stub:** A deterministic, one-line summary (`toolName`, `argsSummary`, `status`, size, and 3-line/180-char head preview) that replaces a large tool output in active session history.
- **Tail recall:** Appending relevant archived raw outputs inside `<recalled_context>` at the end of the current user message for a single provider request, leaving earlier history byte-identical.
- **Side store (`taiknr-side-store`):** The Pi `custom` session entry carrying raw `ArchivedToolOutput` batches along a branch.
- **Settlement (`agent_before_settle`):** The Pi lifecycle boundary after an agent run finishes where staged tool outputs are converted into persistent `context_edit` and `custom` entries.
