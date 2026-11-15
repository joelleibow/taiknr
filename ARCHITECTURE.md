# ARCHITECTURE.md

`pi-taiknr` is a Clean Architecture Pi extension that shrinks active prompt context while keeping the session prompt prefix byte-identical for KV cache reuse. It replaces large tool outputs with deterministic one-line stubs after an agent run settles, stores raw outputs in session entries, and recalls relevant raw blocks at the tail of the current user message using a decision classifier.

Configuration loading and the archive half work. Both config files are read and validated at every session start, and the session's resolved state gates the six other handlers. Behind that gate, staging, settlement, the `taiknr-side-store` record and branch hydration run end to end, so a tool output at or above the session's threshold is stubbed once its run settles and the in-memory archive rebuilds from the active branch. Recall, the status readout and the `/taiknr` commands do not exist yet, and `context` is the one handler still registering a no-op. `jev-context-poc.ts` and `test-jev-poc.mjs` preserve the original proof of concept.

## 1. Project Structure

```text
src/
  app/
    extension/       Pi extension composition root wiring config, adapters, use cases, and hooks
  config/            Configuration schema, defaults, the agent/project JSON loader, and the per-session config holder
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

- **Extension composition root (`src/app/extension/`):** Registers the extension with Pi, holds the per-session state its handlers share (§4), and wires configuration, adapters, use cases, and event handlers. It creates the session's config holder and the gate the other six registrations pass through, so a handler runs only while the session has a valid config with `enabled` true. V1 scopes `src/app/` to the Pi extension only.
- **Configuration (`src/config/`):** Resolves one session's `TaiknrConfig` from a built-in default per field, overlaid field by field by an optional agent-level JSON file and then by an optional project-level one, validating each value on the way. A present file that cannot be read or parsed, or a value that fails its rule, is a closed failure: it is reported with the file, the field where one applies and the reason, and taiknr does nothing for that session until the file is fixed, with no fallback to the defaults and none to the other file. The loader is synchronous, imports nothing from the host and takes its paths from its caller, so another entry point can reuse it. Beside it sits the per-session holder that carries the outcome to the handlers; `README.md` is the reference to the fields and their rules.
- **Domain (`src/domain/`):** Defines core types (`ToolOutputCandidate`, `ArchivedToolOutput`, `RelevanceScore`, `RecalledOutput`) and pure rules for archival eligibility, deterministic one-line stub rendering, the single-line normalization that stubs and argument summaries share, threshold filtering, and `<recalled_context>` block formatting. Contains zero Pi imports.
- **Use cases (`src/use-cases/`):** Orchestrates staging large tool outputs, committing settled batches into the archive store, hydrating the store from branch history, and caching/scoring relevance recall with fail-open handling. Depends only on domain types and port interfaces.
- **Adapters (`src/infra/adapters/`):** Translates Pi-specific event DTOs and runtime objects into use-case contracts and back—mapping `TurnEndEvent` results into candidates, converting committed batches into `context_edit` (preserving non-text blocks) and `custom` boundary drafts, reading branch entries, invoking Pi's classifier registry, appending tail recall blocks while preserving user image blocks, and emitting once-per-session failure warnings.
- **Pi event handlers (`src/infra/pi-event-handlers/`):** Subscribes to `session_start`, `session_tree`, `session_compact`, `tool_call`, `turn_end`, `agent_before_settle`, and `context`. Five of the six gated handlers carry bodies: the tool-call boundary records one top-level call's single-line argument summary, the turn boundary stages the results that turn persisted whatever its outcome, the settle boundary commits the pending items the branch still admits, and the tree and compaction boundaries rebuild the archive from the branch. `context` stays a no-op until recall lands. Six register through the gate; `session_start` registers on the host API directly, because the config has to resolve even when the session that just ended was rejected or turned off. It loads the config, records the outcome on the holder, and throws the report when the load is rejected; once the config is ready and the session active, it also rebuilds the archive from the branch.

## 4. Data Stores

- **Pi session branch entries (`custom` type `taiknr-side-store`):** Persists archived raw tool outputs inside the session's JSONL tree at `agent_before_settle`, one entry per settlement, as a bare array of complete items; a shape that cannot be read that way later gets a new custom type rather than a version field (ADR 0004). Read from `getBranch()` on session start, tree navigation, and compaction, so branches and forks remain self-contained and pre-compaction outputs stay in the archive. The model never sees these entries, and the raw text they carry duplicates the text in the tool result they archive.
- **In-memory archive store:** Holds the active branch's archived items keyed by the entry id of the tool result they replace. It is an optimistic cache over the branch rather than a record of truth: Pi commits a boundary only after every handler returns and may discard one, so the store can run ahead of the branch until the next hydration replaces its contents whole.
- **Ephemeral run buffers:** Per-session maps holding tool-call argument summaries, staged candidates awaiting a settled run, and the original content of the staged tool results. An item staged in a run that never settled waits here for the next settled run, and all of it dies with the extension runtime: `/reload`, a new session or a session replacement loses whatever was still pending.
- **Configuration files (optional):** `pi-taiknr.json` in Pi's agent directory (by default `~/.pi/agent/`, and wherever `PI_CODING_AGENT_DIR` points when it is set), and the same file name in Pi's project config directory at the session's working directory, `.pi/` in a standard install. Both paths are built from Pi's helpers, never written as literals. They are read afresh at every session start — a new process, `/new`, `/resume`, `/fork` or `/reload` — and the project file only when the host reports the project trusted. No parent directory is searched, and a file may state only the fields that differ from the defaults.

## 5. External Integrations

- **Pi Coding Agent host (`@earendil-works/pi-coding-agent`):** Provides lifecycle hooks, `SessionManager` branch state, `context_edit` / `custom` boundary drafts, `ctx.modelRegistry` classifier lookup and execution, and `ctx.ui.notify`. Declared as a peer/dev dependency only and imported exclusively inside `src/app/` and `src/infra/`.
- **Decision classifier (`openrouter` / `~typesafe/jev-latest` by default):** Invoked through Pi's `ModelRegistry.classify` API with one `bool` question per archived stub against `{ userPrompt, archivedToolOutputs }`. Fails open on missing model or runtime error, notifying the user at most once per session.

## 6. Deployment & Infrastructure

Runs inside the local Pi Node.js process as a Pi extension package loaded from its local checkout, named under `packages` in `~/.pi/agent/settings.json` (relative paths there resolve from `~/.pi/agent`). The manifest's `"pi": { "extensions": [...] }` names the single entry inside `src/app/extension/`, and Pi loads nothing else from the package. Nothing is published: `package.json` carries no `version`, `license` or `files` yet, so `npm pack` fails until the publishing card writes them. Requires no standalone daemon or database service.

## 7. Security

- Raw tool outputs remain local in the user's Pi session JSONL files unless recalled into a model prompt or sent as 1-line deterministic stubs to the configured classifier provider.
- Stubbing hides an output from the model and from nothing else: the raw text stays in the session JSONL, in the terminal UI and in exports, and the side-store record holds a second copy of it. taiknr is not a redaction or deletion tool, and a branch navigated to from before a stub shows the model the raw output again.
- Classifier invocation inherits Pi's existing provider authentication (`auth.json`); `pi-taiknr` stores no credentials of its own.
- On classifier absence or failure, the extension fails open and leaves prompts unaltered rather than blocking user work or leaking raw failure internals into model context.
- A project's config file is read only when Pi reports that project trusted, so opening a repository cannot reconfigure taiknr or turn it off. The agent-level file is read on the user's own account, since only the user can write it.

## 8. Development & Testing

The package is wired for local work. Six files at the root carry the tooling: `package.json`, `package-lock.json`, `tsconfig.json`, `biome.json`, `vitest.config.ts` and `.gitignore`. The lockfile is committed, so a fresh checkout resolves the versions this repository was checked against: Biome 2.6.7, TypeScript 7.0.2, vitest 5.1.0 and `@earendil-works/pi-coding-agent` 1.5.2.

Three tools gate the code, in one chain behind `npm run check`:

- **Lint and format (`npm run lint`):** Biome over the allowlist `biome.json` declares, which is `src/`, `tests/` and the four root configuration files Biome reads. The run is read-only, and formatting is part of the gate, at 120 columns.
- **Types (`npm run typecheck`):** `tsc --noEmit` over `src/` and `tests/` under `nodenext` resolution, so the `.js` specifiers on `.ts` files resolve without a build step. The proof-of-concept files at the root sit outside the program.
- **Tests (`npm run test`):** vitest, collecting only `tests/**/*.test.ts`.

Tests live at the root under `tests/`, each file mirroring the `src/` layer it exercises. Pi loads only the entries its manifest names, so a root test directory is never loaded as an extension; it sits there because the sibling packages keep their suites at the root.

Two levels. Layer tests drive one handler or one use case against an in-memory branch. The suite under `tests/app/extension/` drives a real `AgentSession` over an in-memory branch and a faux model provider, so the abort, `/tree`, competing-extension and compaction paths run against the host's own dispatch with no network and no model call.

No check enforces ADR 0001's import boundary. Only the review half of that ADR's Consequences clause is in force, and nothing in `src/domain/` or `src/use-cases/` imports a Pi package today. Enforcement is deferred to a later card, as either a Biome rule or a check of its own.

Loading the extension for local use takes the `packages` entry described in §6. `AGENTS.md` carries the commands, conventions and traps a contributor runs into; this section does not repeat them. ADR 0003 records why the toolchain is shaped this way.

## 9. Future Considerations

- **Additional entry points (`src/app/cli/`, `src/app/mcp/`):** Planned discrete applications reusing `src/domain/` and `src/use-cases/` with filesystem/memory archive stores and standalone classifier adapters (see ADR 0001).
- **Status readout and `/taiknr` command:** Deferred past v1 (`ctx.ui.setStatus` indicators and interactive stub/score inspection). The session toggle's seam exists: the holder can flip `enabled` in memory for the rest of the session, and refuses while no valid config is loaded. Still open are the command and the readout. A mid-session flip also leaves the archive stale, because hydration runs only at a session start, a tree navigation or a compaction: a `/tree` jump taken while taiknr was off leaves a store the branch no longer matches, and the next of those events repairs it.
- **Archive scaling and threshold calibration:** Every archived item costs its raw text twice, once in the tool result and once in its side-store record, and pre-compaction `getBranch()` hydration grows the classifier input payload over very long sessions; capping or pruning stale entries and calibrating thresholds remain open future work.

## 10. Project Identification

- **Name:** `pi-taiknr` (project name: `taiknr`)
- **Owner:** Joel Leibow

## 11. Glossary

- **Stub:** A deterministic, one-line summary (`toolName`, `argsSummary`, `status`, size, and 3-line/180-char head preview) that replaces a large tool output in active session history.
- **Tail recall:** Appending relevant archived raw outputs inside `<recalled_context>` at the end of the current user message for a single provider request, leaving earlier history byte-identical.
- **Side store (`taiknr-side-store`):** The Pi `custom` session entry carrying one settlement's archived raw outputs, as a bare array, along a branch (ADR 0004).
- **Entry id:** The identifier Pi persists for a session entry — eight hexadecimal characters normally, a 36-character UUID when it has to — carried whole and never parsed (ADR 0006).
- **Settlement (`agent_before_settle`):** The Pi lifecycle boundary after an agent run finishes where staged tool outputs are converted into persistent `context_edit` and `custom` entries.
- **Session config holder:** One session's config state — unresolved before its first session start, rejected carrying the error, or ready carrying the resolved config — created once per extension load so that two sessions never share it.
- **Hydration:** Replacing the whole in-memory archive with the items the active branch's side-store entries carry, at a session start, a tree navigation or a compaction.
- **Carry-forward:** Items staged in a run that never settled, held in the extension's runtime and committed by the next settled run that still finds them on the branch.
- **Gate:** The wrapper the six non-`session_start` handlers are registered through. It calls a handler only while the session's config is ready and `enabled`, so a single check at registration serves every handler.
