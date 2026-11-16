# Research — Eleanor — classifier-scoring-and-tail-recall

## Question and Scope

Repository: `/Users/joelleibow/Projects/taiknr` (`joelleibow/taiknr`, package `pi-taiknr`). Scope: current recall-related source path, proof-of-concept comparison, config/archive contracts, tests/specs/ADRs, and repository guidance. Read the assigned research brief in full. No source/config files were changed; this report is the only intended write.

## Sources / Files Examined

- `AGENTS.md`, `ARCHITECTURE.md`, `README.md`, `package.json`, `vitest.config.ts`.
- `openspec/changes/classifier-scoring-and-tail-recall/owner-rulings.md`; `.pi/marbleization/classifier-scoring-and-tail-recall/brief-research-chidi.md` (consulted only for task context, not as codebase evidence).
- Recall path: `src/domain/recall.ts`, `src/use-cases/recall-relevant-context.ts`, `src/use-cases/ports.ts`, `src/infra/adapters/pi-context-adapter.ts`, `src/infra/adapters/pi-jev-scorer-adapter.ts`, `src/infra/adapters/pi-notifier-adapter.ts`, `src/infra/pi-event-handlers/context.ts`, `src/app/extension/taiknr.ts`.
- Archive/config: `src/domain/archived-output.ts`, `src/infra/adapters/pi-archive-adapter.ts`, `src/config/taiknr-config.ts`.
- `jev-context-poc.ts`, `test-jev-poc.mjs`, `tests/app/extension/archive-session.test.ts`, `tests/support/fake-pi.ts`, `tests` tree, living specs under `openspec/specs/`, and ADRs 0001–0006.
- Ran `npm run test`; did not run either PoC file.

## Findings

### Current feature path and exact current stubs

1. `src/app/extension/taiknr.ts` creates the session config holder, gated API, `InMemoryArchiveStore`, pending archive state, and `RecallCache = { lastPromptKey: "", lastRecalledIds: [] }`. It registers context through the gate and supplies config/store/cache plus a placeholder notifier. That notifier's `notifyOnce` is an empty body with a comment that per-session `createOncePerSessionNotifier(getCtx)` belongs inside the context handler.
2. `src/infra/pi-event-handlers/context.ts` registers `_pi.on("context", () => {});`; it has no behavior and does not currently call an adapter/use case.
3. Intended adapter path: `extractLatestUserPrompt` in `pi-context-adapter.ts` returns `ExtractedUserPrompt` (`messageIndex`, `promptKey`, `promptText`); `appendRecalledContextToMessages` appends formatted recall while preserving non-text content. Both are not implemented.
4. Use case `recallRelevantContext` takes prompt key/text, threshold, optional `AbortSignal`, and dependencies (`ArchiveStore`, `RelevanceScorer`, `FailureNotifier`, cache). It is not implemented. `selectRecalledIds` already selects scores with probability `>= decisionThreshold`; `formatRecalledContext` is not implemented.
5. `createPiJevScorerAdapter` is typed as a `RelevanceScorer` adapter over `ExtensionContext` and `TaiknrConfig`; its `score` body throws `Error("Not implemented: PiJevScorerAdapter.score")`.
6. `createOncePerSessionNotifier` already maintains a closure-local `warned` flag and calls `getCtx().ui.notify(message, "warning")` once.

Exact declarations and `Not implemented` bodies in those files:

```ts
export interface RelevanceScore {
	id: string;
	probability: number;
}

export interface RecalledOutput {
	id: string;
	toolName: string;
	argsSummary: string;
	rawText: string;
}

export function selectRecalledIds(scores: RelevanceScore[], decisionThreshold: number): string[] {
	return scores.filter((s) => s.probability >= decisionThreshold).map((s) => s.id);
}

export function formatRecalledContext(_outputs: RecalledOutput[]): string {
	throw new Error("Not implemented: formatRecalledContext");
}
```

```ts
export interface RecallRelevantContextInput {
	promptKey: string;
	promptText: string;
	decisionThreshold: number;
	signal?: AbortSignal;
}

export interface RecallCache {
	lastPromptKey: string;
	lastRecalledIds: string[];
}

export async function recallRelevantContext(
	_input: RecallRelevantContextInput,
	_deps: {
		store: ArchiveStore;
		scorer: RelevanceScorer;
		notifier: FailureNotifier;
		cache: RecallCache;
	},
): Promise<RecalledOutput[]> {
	throw new Error("Not implemented: recallRelevantContext");
}
```

```ts
export interface ExtractedUserPrompt {
	messageIndex: number;
	promptKey: string;
	promptText: string;
}

export function extractLatestUserPrompt(_messages: ContextEvent["messages"]): ExtractedUserPrompt | undefined {
	throw new Error("Not implemented: extractLatestUserPrompt");
}

export function appendRecalledContextToMessages(
	_messages: ContextEvent["messages"],
	_userMessageIndex: number,
	_recalledOutputs: RecalledOutput[],
): ContextEvent["messages"] {
	throw new Error("Not implemented: appendRecalledContextToMessages");
}
```

```ts
export function createPiJevScorerAdapter(_ctx: ExtensionContext, _config: TaiknrConfig): RelevanceScorer {
	return {
		async score(
			_promptText: string,
			_archivedStubs: Record<string, string>,
			_signal?: AbortSignal,
		): Promise<RelevanceScore[] | undefined> {
			throw new Error("Not implemented: PiJevScorerAdapter.score");
		},
	};
}
```

```ts
_pi.on("context", () => {});
```

Relevant ports are `ArchiveStore.size/get/getAll/addBatch/replaceAll/clear`; `RelevanceScorer.score(promptText, archivedStubs, signal?) => Promise<RelevanceScore[] | undefined>`; and `FailureNotifier.notifyOnce(message): void`.

### Archive, config, POC behavior

`ArchivedToolOutput` is `{ id: string; toolName: string; argsSummary: string; isError: boolean; stub: string; rawText: string }`. The `ArchiveStore` read API is `size()`, `get(id)`, `getAll()`. `InMemoryArchiveStore` implements these using a map keyed by id. Branch persistence is custom type `taiknr-side-store`; `readArchiveBatchesFromBranch(entries)` returns valid, non-empty batches in branch order and validates the complete item shape (unknown extra keys accepted).

Classifier-relevant `TaiknrConfig` fields/defaults: `decisionThreshold: 0.5`, `defaultDecisionModel: "~typesafe/jev-latest"`, `defaultDecisionModelProvider: "openrouter"`. Other fields/defaults are `minCharsToArchive: 600`, `enabled: true`.

PoC `jev-context-poc.ts`: classifier lookup via `ctx.modelRegistry.findOfType("classifier", "openrouter", "~typesafe/jev-latest")`, fallback id `typesafe/jev-1.14`; builds a `bool` question per stored item, state `{ userPrompt, archivedToolOutputs: archiveSummary }`, and threshold `0.5`; calls `ctx.modelRegistry.classify(jev, request, { signal: ctx.signal })`; only uses answers when `stopReason === "stop"`. Cache key is *prompt text only* (`lastScoredUserPrompt`), not timestamp plus text; IDs cache separately. Injection is a string replacement of user content and uses `[Recalled full output for ID (tool args)]:\nrawText` inside `<recalled_context>`. It extracts text from blocks but converts whole content to a string, so does not preserve user image/non-text blocks in its returned message. Missing classifier silently skips recall; there is no try/catch, so classify errors propagate; no notification/fail-open handling. `test-jev-poc.mjs` independently calls `modelRuntime.classify` with similar questions/threshold, builds tail recall in a standalone experiment, and prints answers/usage/cost/model comparisons; it is live-model code and was not run.

Compared with current production path, the PoC has its own `jev-side-store` records and synthetic `tc_N` IDs, fixed archive threshold/model values, direct host API calls, text-only cache key, replacement injection, no image preservation/failure notification. Current production has the corresponding seams/contracts but they are stubs; the accepted archive uses `taiknr-side-store` and persisted entry IDs.

### Test layout and baseline

Tests mirror the source structure: app/extension, config, domain, infra/adapters and handlers, use-cases, plus `tests/support/fake-pi.ts`. Vitest includes only `tests/**/*.test.ts`. `fake-pi.ts` records handler registrations; `archive-session.test.ts` uses a real Pi `AgentSession`, in-memory `SessionManager`, a faux provider registered to a `ModelRuntime` with network disabled, isolated temporary `PI_CODING_AGENT_DIR` and cwd, and inline extensions to test dispatch/boundary behavior. This harness currently exercises archive/stubbing, not recall classification.

`npm run test` baseline: **16 test files passed; 221 tests passed**.

### Living specs referencing recall/classifier/context

- `openspec/specs/archive-stubbing/spec.md`: recalls outputs in an enabled context around line 223; also archive-side context/edit and no-recall-while-off behavior. This is the living archive requirement with recall-dependent behavior.
- `openspec/specs/configuration/spec.md`: `enabled=false` means no recall/classifier calls; scenarios explicitly deferred/verified by archive and recall cards; requires config holder supplied to context handler and read at event-time (around lines 208–251).
- `openspec/specs/development-checks/spec.md`: root PoC files excluded from tests/type program; pure helper test acceptance names `selectRecalledIds` (around lines 35–63).
- `openspec/specs/extension-packaging/spec.md`: registers `context` among lifecycle names and documents `registerContextHandler` dependency config type transition (around lines 49–58).
- `openspec/specs/branch-hydration/spec.md` and `configuration/spec.md` may refer to these concepts indirectly, but the case-insensitive direct search found no recall/classifier/context match in branch hydration.

### ADRs and repository statements

- `docs/adr/0001-keep-domain-and-use-cases-free-of-pi-types.md` — Accepted. Core/domain/use cases must not depend on Pi types; host translation belongs in infra adapters/handlers, enabling reuse and isolated tests.
- `docs/adr/0002-deterministic-settlement-stubbing-and-tail-recall.md` — Accepted. Deterministic settlement stubs, branch-persisted raw outputs, per-user-message-key classifier recall appended only at message tail, preserving non-text blocks, and fail-open notification.
- `docs/adr/0003-gate-development-with-biome-tsc-and-vitest-under-npm.md` — Accepted. Biome, `tsc --noEmit`, and vitest under npm scripts with committed lockfile and fixed include set.
- `docs/adr/0004-persist-side-store-records-as-bare-item-arrays.md` — Accepted. Complete item arrays in `taiknr-side-store`; strict required fields, extra keys tolerated, invalid batches skipped whole.
- `docs/adr/0005-yield-to-any-existing-edit-of-a-tool-result.md` — Accepted. Drop pending archival if tool result is off-branch or has any existing context edit; silently, before drafting.
- `docs/adr/0006-treat-a-tool-result-entry-id-as-an-opaque-string.md` — Accepted. IDs are opaque strings; pair results by call ID rather than positional assumptions; no legacy PoC format compatibility.

`AGENTS.md` says archive/config/stubbing works end to end, while recall/status/commands and the context handler are still stubs. It identifies the gate and requires event-time config reads. `ARCHITECTURE.md` says recall is not implemented and `context` is a no-op, describes intended recall as classifier scoring of one bool question per stub and tail injection preserving images, cache-key and fail-open behavior, and notes the whole-branch archive is available after hydration.

## Assumptions, Differences, and Unknowns

- Pi API behavior was not independently evaluated; the Eleanor scope here is the repository code and contracts. Refer to Chidi for host API evidence and citations.
- The requested reports of all classifier error/abort semantics and provider behavior cannot be confirmed from the production code because the scorer, use case, and context handler are unimplemented.
- Possible exact discrepancy in the brief's baseline expectation: live command run reports 221 tests, not any earlier count shown in README examples.
- No acceptance report/design judgment is made here; findings describe repository state only.
