# Research — Eleanor — taiknr-instruments

## Question and Scope

Repository: `/Users/joelleibow/Projects/taiknr`, existing project at the requested HEAD (`abaa6b0`, per brief). Scope: code/config/spec/tooling touchpoints required to expose taiknr instrument data through the current extension contract. This is repository reconnaissance; no source/config files were changed. Read `.pi/marbleization/taiknr-instruments/brief-research-eleanor.md` in full and `openspec/changes/taiknr-instruments/owner-rulings.md` first.

## Sources / Files Examined

`AGENTS.md`, `ARCHITECTURE.md`, `README.md`; `src/app/extension/taiknr.ts`, `handler-gate.ts`; session config and taiknr config; archive/context/scorer adapters; archive ports/use cases, settlement/staging/hydration/recall; all seven event handler files; `package.json`, `package-lock.json`, `tsconfig.json`, `biome.json`, Vitest config; `tests/app/extension/taiknr.test.ts`, config tests, handlers and their mirrored test tree; all living specs under `openspec/specs/`; ADR 0001–0007; owner rulings. Ran `npm run test`.

## Findings

### 1. Data inputs and feature path (HEAD)

- Archive record shape is `ArchivedToolOutput` in `src/domain/archived-output.ts`: `id`, `toolName`, `argsSummary`, `isError`, `stub`, `rawText`. `ArchiveStore` in `src/use-cases/ports.ts` exposes `size()`, `get(id)`, `getAll()`, `addBatch`, `replaceAll`, `clear`. `InMemoryArchiveStore` in `src/infra/adapters/pi-archive-adapter.ts` implements these with a map keyed by item id (declaration begins line 13; read APIs lines 17–25). `readArchiveBatchesFromBranch` validates and extracts complete `taiknr-side-store` arrays; `readEligibleArchivedIds` only admits branch-present tool-result entries whose latest context edit is the taiknr stub (adapter lines 149 onward).
- Settlement data is prepared at `turn_end`: `toToolOutputCandidates` pairs results to persisted entry IDs, extracts text blocks joined by newline, and carries tool name/error and recorded args (archive adapter lines 52–82). `stageToolOutputs` filters on nonempty raw text and threshold, then calls `buildStub` and retains the raw text (use case `stage-tool-outputs.ts`, lines 8–22). `registerTurnEndHandler` (lines 17 onward) reads the per-session `minCharsToArchive`, stages, stores original content and pushes pending records. At `agent_before_settle`, the handler filters pending items to branch-present and non-edited results, prepares custom side-store plus context-edit drafts, commits to in-memory store, and returns the entries (`agent-before-settle.ts`, lines 14 onward; `toSettlementDrafts` in archive adapter lines 91–112). Thus per-item raw and stub strings are already available from settlement onward; no recorded token-size fields exist.
- Hydration: `hydrateArchiveStore(batches, store)` replaces store contents with flattened batches (`src/use-cases/hydrate-archive-store.ts`, lines 4–7). `session_start` reads branch batches after config resolves; tree/compact hooks also hydrate. The store count is therefore active in-memory branch archive count, not a durable counter.
- Recall: `registerContextHandler` subscribes to `context_with_system` (`src/infra/pi-event-handlers/context.ts`, line 39), sets current context, reads `event.messages`, and extracts latest user prompt (`pi-context-adapter.ts`, `extractLatestUserPrompt`, lines 21–27: last user message index, timestamp-plus-text cache key, text). Its current pipeline estimates request size from `event.messages`, reads eligible archive IDs from `ctx.sessionManager.getBranch()`, builds scorer and awaits `recallRelevantContext`, then appends output to that message while preserving non-text blocks (`appendRecalledContextToMessages`, lines 29 onward). Recall use case filters store items by eligible IDs, builds `{id: stub}` classifier input, ranks threshold-selected answers, and returns whole raw outputs within character budget (`recall-relevant-context.ts`, lines 20–108). `recalled` can be observed at this append boundary; request messages are available in event payload.
- Classifier timing/count: `createPiJevScorerAdapter.score(promptText, archivedStubs)` in `src/infra/adapters/pi-jev-scorer-adapter.ts` computes `ids = Object.keys(archivedStubs)` before questions, starts `Date.now()` immediately before `modelRegistry.classify`, awaits classification, then records elapsed time (lines 32–66). The count of items asked about is `ids.length`; the use case has candidate records before the call. It passes `ctx.signal`, `classifierTimeoutMs`, `maxRetries: 0`. Abort returns `undefined`; other stop outcomes and malformed/missing answers throw.

### 2. Lifecycle sequencing

`registerSessionStartHandler` registers raw `pi.on("session_start", ...)` in `src/infra/pi-event-handlers/session-start.ts` (registration line 16). Its callback synchronously resolves agent/project config paths, calls synchronous `loadTaiknrConfig`, assigns ready/rejected state, optionally synchronously reads branch and hydrates. It has **no `await`** before returning; in particular there is no prior asynchronous operation that would violate a before-first-await registration requirement. The entry passes raw `pi` directly to this registrar (`src/app/extension/taiknr.ts`, line 23), intentionally not through gate. No `session_shutdown` handler is registered: the seven registrations in the composition root are session_start, session_tree, session_compact, tool_call, turn_end, agent_before_settle, context_with_system.

### 3. Composition, gate, config, and frozen registration contract

`taiknr.ts` constructs one `SessionConfig`, gated Pi, store, maps, pending list and recall cache, then calls the seven registrars (lines 18–34). `createGatedPi` lives in `src/app/extension/handler-gate.ts`; per AGENTS and architecture it makes the six non-start handlers inert unless the session holder is ready and enabled. `SessionConfig` in `src/config/session-config.ts` is a per-factory holder with unresolved/ready/rejected state, `assign`, `isActive`, and `setEnabled`; event-time state is read by handlers.

`TaiknrConfig` and `DEFAULT_TAIKNR_CONFIG` are in `src/config/taiknr-config.ts` (lines 3–22). The loader's exhaustive mapped `FIELD_RULES` starts line 50; `loadTaiknrConfig` layers defaults, agent file, then optional project file (lines 69 onward); it rejects unknown keys and invalid values. To add a field, current code requires type, default, field rule, and explicit field in returned object (`loadTaiknrConfig` lines 78–86); tests are `tests/config/taiknr-config.test.ts`, and holder tests are `tests/config/session-config.test.ts`. Owner ruling specifies one new enable-instrument switch, default on; existing `enabled` controls all taiknr processing and is not equivalent to this requested additional switch.

`tests/app/extension/taiknr.test.ts` asserts exactly the seven registered lifecycle events. The living `openspec/specs/extension-packaging/spec.md` freezes the one named extension entry, peer-only host dependency, ESM `.js` specifiers, seven event registrations, existing registrar signatures/ports and import boundary; it has explicit scenario for `context_with_system` with no `context` registration. A change adding event(s) or a registration must reconcile this contract/spec and test. `README.md`, `AGENTS.md`, architecture and ADR 0007 all state request-time recall attaches on `context_with_system`, not `context`.

### 4. Other event candidates / specs

There is no current `message_end` subscription in source or the seven-event integration assertion. Living tail-recall / extension-packaging specs constrain recall to `context_with_system`; ADR 0007 says additional event/settlement-linked alternatives were considered and declined in that design context. Adding a new event for an instrument must explicitly update spec and test rather than treating it as already supported. `tests/app/extension/taiknr.test.ts` is the direct enumerated registration test; extension-packaging spec also repeats that exact list.

### 5. Package and tooling

`package.json` declares ESM; peer dependency `@earendil-works/pi-coding-agent: "*"`; dev dependencies Biome 2.6.7, host types ^1.5.2, Node types, TS ^7.0.2, Vitest ^5.1.0. Scripts: lint, typecheck, test, check (lint then typecheck then test). `tsconfig.json` strict NodeNext/noEmit and includes `src/**/*.ts`, `tests/**/*.ts`. Biome allowlist is `src/**`, `tests/**`, and four root configs; 120-column formatting. A devDependency addition requires updating committed `package-lock.json` (`npm install` convention in AGENTS.md); do not add host package to runtime dependencies.

### 6. Tests, living specs, ADRs, and context/observability docs

`tests/` mirrors source layers; Vitest collects only `tests/**/*.test.ts`. Baseline command `npm run test`: **22 files passed, 328 tests passed**. This is the observed current checkout count, not README's old example (220).

Living specs present: `archive-stubbing`, `branch-hydration`, `configuration`, `development-checks`, `extension-packaging`, `tail-recall`. The directly relevant existing contract is extension packaging and tail recall; configuration governs holder/default/validation; archive-stubbing and hydration govern archive source and branch consistency.

ADRs:
- `docs/adr/0001-keep-domain-and-use-cases-free-of-pi-types.md` — keeps domain/use cases host-independent; Pi translations belong in infra.
- `docs/adr/0002-deterministic-settlement-stubbing-and-tail-recall.md` — deterministic stubs, persisted side store, bounded tail recall and fail-open policy.
- `docs/adr/0003-gate-development-with-biome-tsc-and-vitest-under-npm.md` — establishes npm/lockfile, Biome, TypeScript and Vitest gate.
- `docs/adr/0004-persist-side-store-records-as-bare-item-arrays.md` — side-store records are bare item arrays with validation.
- `docs/adr/0005-yield-to-any-existing-edit-of-a-tool-result.md` — do not overwrite another tool-result edit.
- `docs/adr/0006-treat-a-tool-result-entry-id-as-an-opaque-string.md` — IDs are opaque; pair by call ID, not guessed format/position.
- `docs/adr/0007-recall-on-the-whole-request-inside-its-own-bound.md` — recall on `context_with_system`, destination-specific disclosure and own request budget; accepts downstream compaction exposure.

`README.md` explains that stubbing does not lower pi's persisted context measurement as a simple substitute for token usage; it describes why context may jump around recall/compaction, and explicitly says classifier costs are invisible in pi footer/`/session` because extension classifier calls record no provider usage there. `ARCHITECTURE.md` §5 names host context usage, settings reserve and estimated request messages as recall-budget inputs; status/readout does not yet exist. `AGENTS.md` warns `getContextUsage().tokens` is persisted-session/provider usage and not the request currently being built (including recalled block), and explains the context event/cache-prefix trap. README says the only observable sign recall ran is the model reply; no status/readout prints decisions or cost.

## Assumptions, Differences, and Unknowns

- This is repository evidence only; Jefferson provider contract/platform sequencing was delegated to Chidi. The report does not establish external instrument API details.
- The requested instrument values are not implemented. No token figure accounting/calibration is currently stored; item lengths are JavaScript string lengths, and host token usage is not a per-item token ledger.
- Exact instrument lifecycle timing/meaning for history-before, withheld, stubbed, context-in-turn, total-context and savings cannot be inferred solely from current hooks; design judgment belongs to Michael per brief.
- `session_shutdown` is absent from both composition and handler inventory. No runtime shutdown behavior is evidenced.
- Existing README/architecture describe status readout as absent; new instruments must not be confused with an already implemented user-facing status surface.
