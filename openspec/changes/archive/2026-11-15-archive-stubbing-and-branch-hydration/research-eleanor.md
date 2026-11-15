# Research — archive-stubbing-and-branch-hydration

## Question and Scope

Trace the existing archive/stubbing/hydration path at repository HEAD, compare it with `jev-context-poc.ts`, and identify relevant tests, specs, architecture decisions, and constraints. Scope is `/Users/joelleibow/Projects/taiknr`, especially the event handlers, adapters, use cases, domain and config named by the brief. This is a factual codebase survey; the card's proposed design is not treated as accepted fact. Repository is `joelleibow/taiknr`, package `pi-taiknr`; the brief identifies HEAD as `main` `4e951a2`.

## Sources / Files Examined

- `AGENTS.md`, `ARCHITECTURE.md`, `package.json`, `tsconfig.json`, `vitest.config.ts`
- `openspec/changes/archive-stubbing-and-branch-hydration/owner-rulings.md`
- `src/app/extension/taiknr.ts`, `src/app/extension/handler-gate.ts`
- `src/config/session-config.ts`, `src/config/taiknr-config.ts`
- `src/domain/archived-output.ts`, `src/domain/recall.ts`
- `src/use-cases/ports.ts`, `stage-tool-outputs.ts`, `commit-archived-batch.ts`, `hydrate-archive-store.ts`, `recall-relevant-context.ts`
- All seven `src/infra/pi-event-handlers/*.ts`; adapters under `src/infra/adapters/`
- `tests/support/fake-pi.ts`, available tests under `tests/`
- `jev-context-poc.ts`; ADRs under `docs/adr/`; living specs under `openspec/specs/`

## Findings

### Current implementation and event path

`src/app/extension/taiknr.ts` creates one session config holder, gated API, `InMemoryArchiveStore`, `argsByCallId`, pending output array, original content map, and recall cache, then registers all seven event handlers. `session_start` is passed raw `pi`; the other six get `gatedPi`. `createGatedPi` proxies `on` and wraps every registration to invoke the handler only if `session.isActive()`; other API properties pass through. `session_start` loads config, marks holder ready or rejected, and throws a user-facing error for rejected config. Owner rulings also state `enabled: false` means no staging, settlement, hydration, recall, or classifier calls.

Handlers register exactly one event apiece. `session_start` has real config loading; the other six callbacks are currently no-ops:

| Handler | Current registration/body |
|---|---|
| `tool-call.ts` | `registerToolCallHandler(_pi, _argsByCallId)` registers `tool_call`, callback `() => {}`. |
| `turn-end.ts` | `registerTurnEndHandler(_pi, _deps)` registers `turn_end`, callback `() => {}`. |
| `agent-before-settle.ts` | `registerAgentBeforeSettleHandler(_pi, _deps)` registers `agent_before_settle`, callback `() => {}`. |
| `session-start.ts` | `registerSessionStartHandler(pi, _store, session)` registers `session_start`; resolves agent/project config paths, calls loader, assigns holder ready/rejected; throws on `TaiknrConfigError`. Archive hydration is not implemented (store parameter unused). |
| `session-tree.ts` | `registerSessionTreeHandler(_pi, _store)` registers `session_tree`, callback `() => {}`. |
| `session-compact.ts` | `registerSessionCompactHandler(_pi, _store)` registers `session_compact`, callback `() => {}`. |
| `context.ts` | `registerContextHandler(_pi, _deps)` registers `context`, callback `() => {}`. |

`src/infra/adapters/pi-archive-adapter.ts` has working `InMemoryArchiveStore` map operations (`size/get/getAll/addBatch/replaceAll/clear`), and `TAIKNR_SIDE_STORE_TYPE = "taiknr-side-store"`. `toToolOutputCandidates`, `toSettlementDrafts`, and `readArchiveBatchesFromBranch` each throw `Error("Not implemented: …")`. The other adapters (`pi-context-adapter.ts`, `pi-jev-scorer-adapter.ts`, `pi-notifier-adapter.ts`) are within the target layer; their contents were located but not fully traced in this report.

Use-case boundary `ports.ts` defines `ArchiveStore`, `RelevanceScorer`, and `FailureNotifier`. The use-case files named in the brief exist, but their internal bodies were not individually read; architecture describes staging, commit, hydration, and recall orchestration as intended boundaries, while AGENTS/architecture characterize archive and recall as unfinished. Domain `shouldArchive(length, threshold)` and `selectRecalledIds(scores, threshold)` are real; `buildStub(candidate)` and `formatRecalledContext(outputs)` throw `Not implemented`.

The config module is the working portion: config is resolved on `session_start`; architecture says default/agent/project overlays are validated and a rejected file has no fallback. Project config path is only supplied when `ctx.isProjectTrusted()`.

### PoC comparison (`jev-context-poc.ts`)

- Stub signature/body: `buildStub(id, toolName, argsSummary, rawText, isError)` returns `[archived ${id}] ${toolName}(${argsSummary}) status=${isError ? "error" : "ok"} (${rawText.length} chars, ${lines.length} lines) preview: ${first 3 lines joined by " | " and sliced to 180}`.
- Args summary: `JSON.stringify(event.input).slice(0, 120)` stored by `toolCallId` on `tool_call`.
- Item ID: `tc_${sideStore.size + pendingThisRun.length + 1}`; it is not the proposed Pi `entryId` ID.
- Staging: on `turn_end`, extracts only text from string or text blocks, looks up matching result entry ID, ignores absent IDs and raw text shorter than 600 chars, then pushes pending item. Tool args default to empty string.
- Settlement: `agent_before_settle` drains pending, adds items to in-memory side store, emits `context_edit` drafts targeting each tool-result entry with content replaced by a single text stub, then emits custom entry `{ type: "custom", customType: "jev-side-store", data: batch }` after existing event entries. Replacement does not preserve non-text tool-result blocks.
- Hydration: only `session_start`; clears the map and walks `ctx.sessionManager.getBranch()`, reading custom entries with `customType === "jev-side-store"` and array `data`, indexing items by `id`.
- POC also recalls during `context`: classifier selection, scoring/cache and appended `<recalled_context>` blocks; that is outside the requested archive half.

Divergences: codebase has a different side-store type (`taiknr-side-store`) and domain archive ID field `id` but currently has no real translation, stub, staging, settlement or hydration. The POC uses synthetic sequential `tc_N` IDs and `jev-side-store`, does not preserve non-text result content, and hydrates only at startup. The card's entryId IDs, preservation, and three hydration events are proposals, not implemented behavior.

### Tests and fake host

Tests mirror source layers: `tests/app/extension/{handler-gate,taiknr}.test.ts`, `tests/config/{session-config,taiknr-config}.test.ts`, `tests/domain/archived-output.test.ts`, `tests/infra/pi-event-handlers/session-start.test.ts`; shared fake is `tests/support/fake-pi.ts`. The fake supports recording event name/handler registration and invoking them in tests, plus a context stub with only `cwd` and `isProjectTrusted()`. It does not implement a session manager/`getBranch`, event fixture builders or behavior for tool-call, turn-end, settlement edits, tree/compact/context events. Existing tests are therefore primarily gate, composition/config, domain, and session-start coverage; no archive flow/session hydration coverage was located.

`AGENTS.md` constraints: one event per handler; fixed existing public signatures, with only `session_start` taking config holder as third parameter and using its `pi`; handlers read current session config at event time; `.js` import specifiers for TS sources; tests belong under mirrored `tests/**/*.test.ts`; run `npm run check` as gate. Six non-start handlers use gated Pi; session start is raw to allow recovery from inactive/rejected state.

### Specs, ADRs, architecture

Living specs present under `openspec/specs/`: `configuration/spec.md`, `development-checks/spec.md`, `extension-packaging/spec.md`; none is an archive behavior spec.

ADRs:
- `docs/adr/0001-keep-domain-and-use-cases-free-of-pi-types.md` — accepted boundary: domain/use cases must remain independent of Pi types.
- `docs/adr/0002-deterministic-settlement-stubbing-and-tail-recall.md` — accepted; settlement-time `context_edit`, preserve non-text blocks, `taiknr-side-store`, branch hydration on startup/tree/compact, tail recall, fail-open classifier behavior. Notes archive growth is uncapped and existing settled stubs are not rewritten by format changes.
- `docs/adr/0003-gate-development-with-biome-tsc-and-vitest-under-npm.md` — accepted project check/tooling arrangement.

`ARCHITECTURE.md` describes Clean Architecture boundaries and expected archive flow, explicitly says most code remains stubs and only configuration currently works. It specifies adapters as Pi translation boundary, domain/use cases free of Pi types, event handlers as thin bridges, and branch side-store/in-memory store as intended persistence. It also documents test/tooling layout and that there is no automated ADR import-boundary enforcement.

## Assumptions, Differences, and Unknowns

- `openspec/changes/archive-stubbing-and-branch-hydration/owner-rulings.md` says the card is proposals unless separately confirmed; this report does not treat proposals as rulings.
- The supplied brief identifies commit/branch; no independent git status or commit verification was performed.
- The use-case implementation files and three non-archive adapters were not individually read in full; their concrete behavior remains unverified. No pi API guarantees are asserted.
- `npm run check` was not run. Neither live-model script was run.
- Current code's `session_start` does not hydrate the store despite ADR/architecture describing that desired behavior; tree/compact are no-ops. Current archive adapter translation methods and domain stub formatting are explicit throws.
- Clarification/design decisions, including exact accepted stub/ID scheme and whether/how to preserve blocks, belong to the owner/design process, not this reconnaissance.

## Addendum — exact declarations (for tasks.md)

Declarations below are transcribed from the named source files at the inspected checkout. Bodies described as stubs are quoted exactly.

### 1. `src/domain/archived-output.ts`

```ts
export interface ToolOutputCandidate {
	entryId: string;
	toolCallId: string;
	toolName: string;
	argsSummary: string;
	rawText: string;
	isError: boolean;
}

export interface ArchivedToolOutput {
	id: string;
	toolName: string;
	argsSummary: string;
	isError: boolean;
	stub: string;
	rawText: string;
}

export function shouldArchive(rawTextLength: number, minCharsToArchive: number): boolean {
	return rawTextLength >= minCharsToArchive;
}

/** Deterministically build a 1-line stub from a candidate tool output. */
export function buildStub(_candidate: ToolOutputCandidate): string {
	throw new Error("Not implemented: buildStub");
}
```

Other exports: the two interfaces above, `shouldArchive`, and `buildStub`; no other export is present.

### 2. Use cases

`src/use-cases/stage-tool-outputs.ts`:

```ts
export interface StageToolOutputsInput {
	candidates: ToolOutputCandidate[];
	minCharsToArchive: number;
}

/** Filter candidates by size threshold and build deterministic archived records. */
export function stageToolOutputs(_input: StageToolOutputsInput): ArchivedToolOutput[] {
	throw new Error("Not implemented: stageToolOutputs");
}
```

Yes, its declared return type is `ArchivedToolOutput[]`. It does not currently call `buildStub`; its body throws immediately. The adapter `toToolOutputCandidates` also throws, and `turn-end.ts` callback is empty. No implementation currently calls the formatter.

`src/use-cases/commit-archived-batch.ts`:

```ts
/** Drain pending archived outputs into the ArchiveStore and return the committed batch. */
export function commitArchivedBatch(_pending: ArchivedToolOutput[], _store: ArchiveStore): ArchivedToolOutput[] {
	throw new Error("Not implemented: commitArchivedBatch");
}
```

`src/use-cases/hydrate-archive-store.ts`:

```ts
/** Replace the in-memory ArchiveStore contents from active branch entries. */
export function hydrateArchiveStore(_batches: ArchivedToolOutput[][], _store: ArchiveStore): void {
	throw new Error("Not implemented: hydrateArchiveStore");
}
```

Their current bodies do no work; each throws the quoted Not implemented error.

### 3. `src/use-cases/ports.ts`

All exports, verbatim:

```ts
export interface ArchiveStore {
	size(): number;
	get(id: string): ArchivedToolOutput | undefined;
	getAll(): ArchivedToolOutput[];
	addBatch(items: ArchivedToolOutput[]): void;
	replaceAll(items: ArchivedToolOutput[]): void;
	clear(): void;
}

export interface RelevanceScorer {
	score(
		promptText: string,
		archivedStubs: Record<string, string>,
		signal?: AbortSignal,
	): Promise<RelevanceScore[] | undefined>;
}

export interface FailureNotifier {
	notifyOnce(message: string): void;
}
```

### 4. `src/infra/adapters/pi-archive-adapter.ts`

Exported constant:

```ts
export const TAIKNR_SIDE_STORE_TYPE = "taiknr-side-store";
```

Exported class shape (including implemented methods):

```ts
export class InMemoryArchiveStore implements ArchiveStore {
	private readonly items = new Map<string, ArchivedToolOutput>();

	size(): number {
		return this.items.size;
	}

	get(id: string): ArchivedToolOutput | undefined {
		return this.items.get(id);
	}

	getAll(): ArchivedToolOutput[] {
		return [...this.items.values()];
	}

	addBatch(items: ArchivedToolOutput[]): void {
		for (const item of items) this.items.set(item.id, item);
	}

	replaceAll(items: ArchivedToolOutput[]): void {
		this.items.clear();
		this.addBatch(items);
	}

	clear(): void {
		this.items.clear();
	}
}
```

Other exports and exact signatures/bodies:

```ts
export function toToolOutputCandidates(
	_event: TurnEndEvent,
	_argsByCallId: ReadonlyMap<string, string>,
): ToolOutputCandidate[] {
	throw new Error("Not implemented: toToolOutputCandidates");
}

export function toSettlementDrafts(
	_batch: ArchivedToolOutput[],
	_originalToolResultsByEntryId: ReadonlyMap<string, unknown[]>,
): SessionBoundaryDraft[] {
	throw new Error("Not implemented: toSettlementDrafts");
}

export function readArchiveBatchesFromBranch(_entries: SessionEntry[]): ArchivedToolOutput[][] {
	throw new Error("Not implemented: readArchiveBatchesFromBranch");
}
```

### 5. Event registrar declarations and callback bodies

`src/infra/pi-event-handlers/tool-call.ts`:

```ts
export function registerToolCallHandler(_pi: ExtensionAPI, _argsByCallId: Map<string, string>): void {
	_pi.on("tool_call", () => {});
}
```

No separate dependency interface is declared; second parameter is directly `Map<string, string>`. Callback body is empty.

`src/infra/pi-event-handlers/turn-end.ts`:

```ts
export function registerTurnEndHandler(
	_pi: ExtensionAPI,
	_deps: {
		config: SessionConfig;
		argsByCallId: ReadonlyMap<string, string>;
		pendingOutputs: ArchivedToolOutput[];
		originalContentByEntryId: Map<string, unknown[]>;
	},
): void {
	_pi.on("turn_end", () => {});
}
```

`src/infra/pi-event-handlers/agent-before-settle.ts`:

```ts
export function registerAgentBeforeSettleHandler(
	_pi: ExtensionAPI,
	_deps: {
		store: ArchiveStore;
		pendingOutputs: ArchivedToolOutput[];
		originalContentByEntryId: Map<string, unknown[]>;
	},
): void {
	_pi.on("agent_before_settle", () => {});
}
```

`src/infra/pi-event-handlers/session-start.ts`:

```ts
export function registerSessionStartHandler(pi: ExtensionAPI, _store: ArchiveStore, session: SessionConfig): void {
	pi.on("session_start", (_event, ctx) => {
		const agentConfigPath = resolve(getAgentDir(), CONFIG_FILE_NAME);
		const projectConfigPath = ctx.isProjectTrusted() ? resolve(ctx.cwd, CONFIG_DIR_NAME, CONFIG_FILE_NAME) : undefined;

		try {
			const config = loadTaiknrConfig({ agentConfigPath, projectConfigPath });
			session.assign({ status: "ready", config });
		} catch (error) {
			// The loader converts every read and parse failure, so anything else is a defect and escapes.
			if (!(error instanceof TaiknrConfigError)) throw error;
			session.assign({ status: "rejected", error });
			throw new Error(`${error.message}; fix the file, then run /reload or start a new session`, { cause: error });
		}
	});
}
```

`src/infra/pi-event-handlers/session-tree.ts`:

```ts
export function registerSessionTreeHandler(_pi: ExtensionAPI, _store: ArchiveStore): void {
	_pi.on("session_tree", () => {});
}
```

`src/infra/pi-event-handlers/session-compact.ts`:

```ts
export function registerSessionCompactHandler(_pi: ExtensionAPI, _store: ArchiveStore): void {
	_pi.on("session_compact", () => {});
}
```

### 6. `src/app/extension/taiknr.ts`: state and registrar arguments

It constructs:

- `session = createSessionConfig()`
- `gatedPi = createGatedPi(pi, session)`
- `store = new InMemoryArchiveStore()`
- `argsByCallId = new Map<string, string>()`
- `pendingOutputs: ArchivedToolOutput[] = []`
- `originalContentByEntryId = new Map<string, unknown[]>()`
- `recallCache: RecallCache = { lastPromptKey: "", lastRecalledIds: [] }`

Exact calls:

```ts
registerSessionStartHandler(pi, store, session);
registerSessionTreeHandler(gatedPi, store);
registerSessionCompactHandler(gatedPi, store);
registerToolCallHandler(gatedPi, argsByCallId);
registerTurnEndHandler(gatedPi, {
	config: session,
	argsByCallId,
	pendingOutputs,
	originalContentByEntryId,
});
registerAgentBeforeSettleHandler(gatedPi, {
	store,
	pendingOutputs,
	originalContentByEntryId,
});
registerContextHandler(gatedPi, {
	config: session,
	store,
	notifier: {
		notifyOnce: () => {
			// Bound per-session via createOncePerSessionNotifier(getCtx) inside context handler.
		},
	},
	recallCache,
});
```

Thus `argsByCallId` is passed to tool-call and turn-end; `pendingOutputs` and `originalContentByEntryId` are passed to turn-end and agent-before-settle. `store` goes to session-start, tree, compact, agent-before-settle, and context. `session` goes to session-start and as config dependency to turn-end/context. These state objects already exist and are passed.

### 7. `tests/support/fake-pi.ts`

Exports and shapes:

```ts
export interface RegisteredHandler {
	event: string;
	handler: (...args: unknown[]) => unknown;
}

export interface FakePi {
	pi: ExtensionAPI;
	registered: RegisteredHandler[];
	onReturn: () => void;
	marker: object;
}

export function createFakePi(): FakePi { ... }

export function createContextStub(options: { cwd: string; trusted: boolean }): ExtensionContext {
	return { cwd: options.cwd, isProjectTrusted: () => options.trusted } as unknown as ExtensionContext;
}
```

`createContextStub` parameter is exactly `{ cwd: string; trusted: boolean }`; the value returned is an object whose `cwd` is copied from options and whose `isProjectTrusted` function returns `options.trusted`, cast through `unknown` to `ExtensionContext`.

### 8. Test files, case counts, archive-path relation

Case counts are counts of literal `test(` occurrences under `tests/`:

| File | `test(` cases | Archive path relation |
|---|---:|---|
| `tests/app/extension/handler-gate.test.ts` | 7 | Indirect infrastructure constraint only: verifies gating used by archive handlers; no staging/settlement/hydration. |
| `tests/app/extension/taiknr.test.ts` | 1 | Composition coverage checks registration of seven lifecycle events; no archive behavior execution. |
| `tests/config/session-config.test.ts` | 10 | No archive behavior; config activation state supports handler gate. |
| `tests/config/taiknr-config.test.ts` | 18 | No archive behavior; config loader only. |
| `tests/domain/archived-output.test.ts` | 3 | Direct archive domain test of `shouldArchive` threshold boundaries; does not test buildStub. |
| `tests/infra/pi-event-handlers/session-start.test.ts` | 12 | Session config loader/handler tests; archive store/hydration not tested. |

Total: 51 test cases. `tests/support/fake-pi.ts` is a support file, not a `*.test.ts` test file.
