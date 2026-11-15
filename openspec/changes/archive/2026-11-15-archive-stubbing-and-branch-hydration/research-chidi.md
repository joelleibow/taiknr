# Research — Chidi — archive-stubbing-and-branch-hydration

## Question and Scope

Against pi 1.5.2 (`@earendil-works/pi-coding-agent`), what do the docs and type declarations provide for: (1) `tool_call` / `turn_end`; (2) `agent_before_settle`; (3) `context_edit`; (4) `custom` entries (`appendEntry`); (5) `session_start` / `session_tree` / `session_compact` and `getBranch()` including compaction behaviour; (6) session-level extension testing without a model call. Not in scope: design, recommendations, codebase questions.

Root `PI` = `/Users/joelleibow/.local/share/fnm/node-versions/v26.8.1/installation/lib/node_modules/@earendil-works/pi-coding-agent/` (package.json version `1.5.2`; the repo's own `node_modules` copy is also 1.5.2).

## Sources / Files Examined

- `PI/docs/extensions.md` (lifecycle, events, `appendEntry`, State Management)
- `PI/docs/session-format.md` (ContextEditEntry, Context Building)
- `PI/docs/compaction.md`
- `PI/docs/sdk.md`, `PI/examples/sdk/06-extensions.ts`, `PI/docs/message-types.md`
- `PI/dist/core/extensions/types.d.ts`, `PI/dist/core/session-manager.d.ts` (+ `.js` for behaviour), `PI/dist/core/agent-session.js`, `PI/dist/core/compaction/*.js`
- `PI/node_modules/@earendil-works/pi-ai/dist/providers/faux.d.ts`
- `/Users/joelleibow/Projects/taiknr/jev-context-poc.ts` (only to pick API names)

## Findings

### 1. `tool_call` and `turn_end`

**`tool_call`** (`ToolCallEvent`, types.d.ts ~L951–1000): `{ type:"tool_call", toolCallId: string, parentToolCallId?: string, toolName, input }`. Built-in tools have typed `input`; `CustomToolCallEvent.input: Record<string, unknown>`. `input` is mutable. Return `ToolCallEventResult { block?, reason?, terminate? }`. It carries **no result and no entry id**. Nested calls (made by another tool, e.g. codemode) get `toolCallId = "<parent id>/<n>"`; these never appear in the transcript as tool results. Unknown tool / invalid args skip `tool_call` (extensions.md ~L369).

**`turn_end`** (`TurnEndEvent extends BoundaryState`, types.d.ts L848):
`{ type:"turn_end", turnIndex:number, message:AgentMessage, toolResults: ToolResultMessage[], messageEntryId:string, toolResultEntryIds:string[], outcome:"completed"|"aborted"|"error", entries: SessionBoundaryDraft[], continue:boolean, context: BoundaryContextPreview }`.
- `ToolResultMessage` (message-types.md L164): `{ role:"toolResult", toolCallId, toolName, content:(TextContent|ImageContent)[], details?, usage?, nestedCalls?, isError, timestamp }`. So tool name, call id, content blocks (text + images) and `isError` are on `toolResults[i]`; **arguments are not** (hence needing `tool_call`/`tool_result.input` to record them). The separate `tool_result` event (`ToolResultEventBase`) does carry `toolCallId, input, content, isError, structuredContent?`.
- Entry ids ARE available at `turn_end`: docs say it "runs after the assistant and tool-result messages have been persisted" (extensions.md ~L746). Form: `generateId` in session-manager.js L21 = `randomUUID().slice(0,8)` (8 hex chars), re-rolled on collision against the session's `byId`; **fallback to a full 36-char UUID** after 100 collisions. So "8 chars" is the normal case, not guaranteed. Ids are unique within a session file (byId check), not globally.
- Return type `TurnEndEventResult = BoundaryResult { entries?: SessionBoundaryDraft[]; continue?: boolean }`.
- **Alignment caveat (source, agent-session.js L556–559):** `toolResultEntryIds = toolResults.flatMap(r => id ? [id] : [])`. If an id cannot be resolved the array is silently shorter, so index-by-position alignment with `toolResults` is not guaranteed by the implementation. Docs do not mention this. The POC indexes `toolResultEntryIds[i]` by position. If `messageEntryId` cannot be resolved, `turn_end` handlers are not called and an extension error is emitted ("turn_end could not resolve the persisted assistant entry ID").
- `turn_end` fires for each turn even when `outcome` is "aborted"/"error"; docs example guards on `outcome === "completed"`.

### 2. `agent_before_settle`

- Name exists in 1.5.2: `AgentBeforeSettleEvent extends BoundaryState { type:"agent_before_settle" }` (types.d.ts L818). Result `AgentBeforeSettleEventResult = BoundaryResult`.
- Payload (BoundaryState): `entries: SessionBoundaryDraft[]` (proposals so far), `continue:boolean`, `context: BoundaryContextPreview { contextEntries, contextMessages, llmMessages, pendingMessages, canContinue }`, `outcome: AgentActivityOutcome`.
- Fires: "final actionable boundary" after `agent_end` and after any retry / final-attempt recovery / compaction-retry / queued-message work; if continuation is requested the run restarts at `agent_start` (lifecycle diagram, extensions.md ~L320–336, L665). It sees the repaired projection after recovery. **Skipped when the run is aborted** (`agent_end` → `agent_settled`); if abort happens *during* handlers, valid returned entries are still committed but continuation is suppressed (extensions.md L695). Source: `_runBeforeSettleBoundary` returns early with no handlers; `agent-session.js` L1631–1650.
- Can return: `{ entries?, continue? }`. Allowed draft types: `custom`, `custom_message`, `context_edit`, `compaction` (`SessionBoundaryDraft`). "Returning `entries` or `continue` replaces only that field" — so a handler that returns `entries` **replaces** the proposal list; the docs' pattern is `entries: [...event.entries, ...mine]` to keep earlier handlers' proposals. Handlers run in load/registration order; each sees prior proposals. The whole proposal is validated, then appended in list order after all handlers finish; "persistence is not transactional" (a draft that throws in `appendContextEdit` partway leaves earlier drafts appended). A handler error is reported and later handlers still run.
- `continue:true` ensures exactly one next provider request (satisfied by pending tool results/queued messages); unconditional `continue:true` can loop.
- `agent_settled` is notification-only, after which `ctx.isIdle()` is true; `AgentSettledEvent { aborted:boolean }`.
- The same `BoundaryResult` shape works on `turn_end`, so staging/edit drafts can be returned from either boundary; the POC uses `turn_end` for staging and `agent_before_settle` for edits.

### 3. `context_edit`

- It is a **session entry type** (`ContextEditEntry`, session-manager.d.ts L119): `{ type:"context_edit", id, parentId, timestamp, targetId:string, replacement: { content: ContextEditableContent } | null }`. Extensions create it by returning a **draft** `ContextEditEntryDraft { type:"context_edit"; targetId; replacement }` in `entries` from `turn_end`/`agent_before_settle`. Pi calls `SessionManager.appendContextEdit(targetId, replacement)` (agent-session.js L644). `appendContextEdit` is also on the full `SessionManager`, but **not** on `ReadonlySessionManager` (the type of `ctx.sessionManager`: `Pick<…"getCwd"|"getSessionDir"|"getSessionId"|"getSessionFile"|"getLeafId"|"getLeafEntry"|"getEntry"|"getLabel"|"getBranch"|"buildContextEntries"|"buildSessionProjection"|"getHeader"|"getEntries"|"getTree"|"getSessionName">`). There is no other documented extension API to append one outside the boundary events.
- `ContextEditableContent = UserMessage["content"] | AssistantMessage["content"] | ToolResultMessage["content"] | CustomMessage["content"]` (string or block array).
- Targets: `custom_message` entries or `message` entries with role user/assistant/toolResult; others throw `Entry X does not contribute editable model content`. Target must exist and be **on the active branch** (else throws "not on the active branch"). Invalid replacement (not null / no string-or-array `content`) throws. (session-manager.js L974–1007.)
- **Granularity: whole-content replacement, not per-block.** `replacement.content` replaces the target message's entire content; `projectContextEntry` does `{ ...message, content: replacement.content }` (session-manager.js L236–255); docs: "replaces only the target message content" (session-format.md L146). There is no block-index/patch form. To keep image blocks on a toolResult the extension must itself include them in `replacement.content` (toolResult `content` is `(TextContent|ImageContent)[]`; the current blocks are available as `event.toolResults[i].content`). A string replacement for assistant/toolResult is normalized to one text block. Metadata (`toolCallId`, `toolName`, `isError`, `details`, …) is retained since only `content` is spread over.
- `replacement: null` omits the target from model context.
- Latest edit per target on the active branch wins. Edits are **branch-relative**: navigating before the edit reveals the original. The edit does not modify the raw target entry, UI, exports or accounting (session-format.md L141–147).
- **Persistence:** it is a normal appended entry (written to the session JSONL once the session file exists — `_persist` defers writing until the session has a user/assistant message, session-manager.d.ts ~L255). `_commitBoundaryDrafts` appends then calls `_refreshFinalizedContext()` which sets `agent.state.messages` to the new projection (agent-session.js L690–695, L640), so the edit takes effect for the next provider request in the same run. `entry_appended` event is emitted per appended entry.
- **Prompt cache:** pi docs/types do **not** state the cache behaviour of `context_edit`. What is documented: editing the transcript changes the serialized messages from the edited position onward (the edit replaces content in the middle of the history; the implementation builds the next request from the new projection). Pi explicitly describes cache effects only for system-prompt/tool changes (extensions.md L657, L2653) and for an unchanged `context` list keeping mid-conversation system messages ("retain their cached prefix", L827). Pi's own token accounting treats a `context_edit`/`compaction` as invalidating prior usage figures (compaction.js L150–160, agent-session.js L2576). Whether providers see a byte-identical prefix up to the edited entry is therefore an inference from implementation, not documented; no pi docs promise byte-identical prefix. **Gap — no pi-stated guarantee.**
- Compaction interplay: preparation won't advance the kept boundary when a replacement edit affects the candidate input or summarised prefix (compaction.md L138). Branch summarization honours latest edits per target (branch-summarization.js L123–132).

### 4. `custom` session entries

- Write: `pi.appendEntry<T>(customType: string, data?: T): void` (types.d.ts L1317). Implementation: `sessionManager.appendCustomEntry(customType, data)` then emits `entry_appended` (agent-session.js L2879–2885). Appended as a child of the current leaf. Calls `assertActive()`; throws if the extension runtime is stale/invalidated.
- Alternative from boundary handlers: `CustomEntryDraft { type:"custom"; customType:string; data?:unknown }` returned in `entries`. (Ordering vs. other drafts is list order.)
- Read back: `ctx.sessionManager.getEntries()` (all, including abandoned branches) or `getBranch()` (active path root→leaf); filter `entry.type === "custom" && entry.customType === …`; `CustomEntry<T> { type:"custom", customType, data?:T }` + `id/parentId/timestamp`. Docs recommend rebuilding from `getBranch()` rather than all entries because abandoned branches are alternative histories (extensions.md L2176) — the docs' own `appendEntry` example at L1693 uses `getEntries()`, so the docs are inconsistent between the two examples.
- Model visibility: **not sent to the model** ("Does NOT participate in LLM context (ignored by buildSessionContext)", session-manager.d.ts; extensions.md L1685; session-format "usage and custom -> no context message"). Contrast `custom_message` / `pi.sendMessage`, which are sent.
- `data` is arbitrary JSON; no documented size limit found.

### 5. Session events and `getBranch()`

- **`session_start`** (`SessionStartEvent { reason: "startup"|"reload"|"new"|"resume"|"fork"; previousSessionFile? }`, types.d.ts L595). Fires when the extension runtime is (re)loaded for a session: process start, `/reload`, `/new`, `/resume`, `/fork`/`/clone`. These replace the runtime; `session_shutdown` precedes with `reason: "quit"|"reload"|"new"|"resume"|"fork"` (extensions.md L376–393). Handler signature `(event, ctx)`; `ctx.sessionManager` is the new session's.
- **`session_tree`** (`SessionTreeEvent { newLeafId:string|null; oldLeafId:string|null; summaryEntry?:BranchSummaryEntry; fromExtension?:boolean }`, types.d.ts L684). Fires after `/tree` navigation, *after* the leaf has moved and `_refreshFinalizedContext()` ran (agent-session.js ~L3490–3515), so `ctx.sessionManager.getBranch()` reflects the new leaf. It does not replace the runtime (so `session_start` does not fire). May be preceded by `session_before_tree` (cancellable). With a summary, a `branch_summary` entry is appended; with `newLeafId === null` the leaf is reset to root.
- **`session_compact`** (`SessionCompactEvent { compactionEntry: CompactionEntry; fromExtension:boolean; reason:"manual"|"threshold"|"overflow"; willRetry:boolean }`, types.d.ts L633). Fires after a successful compaction (manual `/compact`, threshold or overflow), after the `compaction` entry is appended and the context refreshed (agent-session.js L2395–2406, L2690). `session_before_compact` precedes it (can cancel/customize); `session_compact_failed` on failure. It does not replace the runtime. `CompactionEntry { summary, firstKeptEntryId, tokensBefore, details?, usage?, fromHook?, systemMessage? }`.
- **`getBranch(fromId?)`**: `SessionEntry[]`, **root → leaf, raw** (walks `parentId` chain; session-manager.js L1074–1084). It is **not** compaction-aware: it includes entries before `firstKeptEntryId`, the `compaction` entry, `custom`, `context_edit`, `label`, `usage`, `branch_summary`, etc. — everything on the path. Docs: "Walk from entry to root, returning all entries in path order. Includes all entry types… Use buildSessionContext() to get the resolved messages." Compaction-aware variants: `buildContextEntries()` and `buildSessionProjection()` (both on `ReadonlySessionManager`). `getEntries()` returns every non-header entry across all branches. Note the old docs/POC naming: no 1.5.2 rename of `getBranch`.
- **Compaction and earlier entries:** raw entries are retained in the file/tree. `buildContextEntries` (session-manager.js L201–229) = `[latest compaction] + entries from firstKeptEntryId up to the compaction (system messages dropped) + entries after the compaction`. Entries before `firstKeptEntryId` are omitted from model context but "remain stored" (compaction.md ~L138 "Omitted raw entries remain stored"). `custom` entries do not contribute to context either way; they remain in the branch and in `getBranch()`/`getEntries()` after compaction. `context_edit` entries before `firstKeptEntryId` are dropped from the projection (the edit map in `buildSessionProjection` is built only from `contextEntries`), but the target is also dropped; edits inside the kept range and after the compaction continue to apply. Compaction recalculates `tokensBefore` from the context-edited projection (compaction.md). Compaction uses edited (stubbed) content for summarisation (compaction.js L583ff).
- **Branch switch:** `context_edit` and `custom` entries are tree children, so they're visible on a branch iff they are on that leaf's root path. A switched-to branch that diverges before an edit/custom entry does not contain them (`getBranch()` excludes them; `appendContextEdit` rejects targets off the active branch). An extension that wants per-branch state must rebuild on `session_tree` (docs example, extensions.md L2151–2158, does this on `session_start` and `session_tree`). Docs do not list `session_compact` as a rebuild trigger for state (not needed for raw `getBranch()` since compaction doesn't remove entries from it; this is an inference from the implementation, not a doc statement).
- Fork: `session_start` with `reason:"fork"` — the forked session's `getBranch()` is that of the new session (details of what entries a fork copies not examined).

### 6. Testing without a model call

- **In-memory session manager:** `SessionManager.inMemory(cwd?, options?, entries?: FileEntry[])` (session-manager.d.ts L393); documented in sdk.md (L44–52). `entries` allows pre-seeding a transcript (pi itself uses this for boundary previews, agent-session.js `_createBoundaryPreviewManager`).
- **SDK harness:** `createAgentSession({ sessionManager, resourceLoader, … })` with `new DefaultResourceLoader({ cwd, agentDir, extensionFactories: [(pi) => {…}], additionalExtensionPaths })`, `await resourceLoader.reload()`; `session.prompt()`, `session.subscribe()`, `session.dispose()`; SDK sessions need `session.bindExtensions()` for `session_start` for some extensions (stated for MCP, sdk.md L116). Example: `PI/examples/sdk/06-extensions.ts` (inline extension factory + in-memory manager), also `11-sessions.ts` (create/open/continue/fork), `13-session-runtime.ts` (`AgentSessionRuntime`: `newSession`, `switchSession`, `fork`, `importFromJsonl`; subscriptions must be rebound after replacement), `12-full-control.ts`. `InlineExtension` type is accepted by `extensionFactories` (sdk.md L110).
- **Scripted model without network:** `@earendil-works/pi-ai` exports `registerFauxProvider`-family API (`providers/faux.d.ts`, re-exported at `index.d.ts` L21): `FauxProviderRegistration { api, models, getModel(), state:{callCount,…}, setResponses(), appendResponses(), getPendingResponseCount(), unregister() }`; helpers `fauxText`, `fauxThinking`, `fauxToolCall(name, args, {id})`, `fauxAssistantMessage(content, {stopReason, …})`; `FauxResponseFactory(context, options, state, model)` receives the transcript context (so a test can assert what the "model" would see). Docs for faux were not found in `docs/`; evidence is the `.d.ts` only. How to select the faux model in `createAgentSession` was not confirmed here (`02-custom-model.ts` / `12-full-control.ts` not read).
- **Unit-level:** `projectContextEntry`, `buildSessionProjection`, `buildContextEntries`, `buildSessionContext`, `loadEntriesFromFile`, `parseSessionEntries`, `migrateSessionEntries` are exported (session-manager.d.ts; marked "Exported for testing" for the last three) so projection/compaction effects of drafted entries can be checked against pure entry arrays. Nothing in pi's docs describes a test harness specific to extensions; pi ships no tests in the installed package (not found under PI).
- Extensions can be invoked directly as `(pi: ExtensionAPI) => void` factories; `ExtensionRunner.emitBoundary(baseEvent, buildContext)` is the documented host-side dispatch for `turn_end`/`agent_before_settle` (extensions.md ~L750).

## Assumptions, Differences, and Unknowns

Comparison with the card's proposals:

- *"`tool_call` records short argument summaries"* — supported: `event.toolCallId` + `event.input`; `turn_end.toolResults[i].toolCallId` joins them. (`toolResults` has no args.)
- *"`turn_end` stages … using Pi's 8-char `entryId`"* — entry ids are available at `turn_end` as `toolResultEntryIds`; normally 8 hex chars of a UUID, **but fall back to a full UUID on 100 collisions**, and the array can be shorter than `toolResults` (flatMap drops unresolved) → positional pairing is not guaranteed. Alternatives found in source: `ctx.sessionManager.getBranch()` entries whose `message.toolCallId` matches (entry.message identity is how pi resolves it).
- *"`agent_before_settle` emits `context_edit` replacements alongside a `taiknr-side-store` custom entry"* — supported (`entries` of draft types `context_edit` and `custom`); return must spread `event.entries`; it is **skipped on aborted runs**, so items staged in a run that is aborted are not archived by that boundary (they'd need a later boundary). `turn_end` can also return the same drafts.
- *"`context_edit` replaces archived text while preserving any non-text blocks"* — **no per-block patch**: the replacement is the whole `content` array. Preserving images means the extension builds `[stubTextBlock, ...originalImageBlocks]` from `toolResults[i].content`.
- *"hydration on `session_start`, `session_tree`, `session_compact` using `getBranch()` so pre-compaction items remain scorable"* — `getBranch()` is the raw root→leaf path and keeps pre-compaction entries and custom entries, so pre-compaction custom entries are still readable. `session_compact` does not change `getBranch()` contents other than adding the compaction entry. Whether archived items from before `firstKeptEntryId` should still be recalled is a design question (those tool results are no longer in model context). `session_start` also fires on `reload`, `new`, `resume`, `fork`.
- Doc-vs-`.d.ts` disagreement: extensions.md's `appendEntry` restore example uses `getEntries()` while the State Management section says to rebuild from `getBranch()`. Types agree with both (both exist). No other doc/type conflicts found for the examined APIs.

Unknowns / not verified:
- Prompt-cache byte-identical prefix behaviour of `context_edit` is not documented by pi; only inferable from code. Provider-side behaviour not examined.
- Whether `context_edit` in a `turn_end` boundary (mid-run) alters the in-flight turn's messages vs only the next request: code shows `agent.state.messages` is replaced immediately after commit; effect on a request already sent is none.
- Exact meaning/size limits of `custom` entry `data`: none found.
- How to attach a faux model to `createAgentSession` for a full prompt run was not confirmed.
- Fork semantics (which entries/branch are copied) not examined.
- `entry_appended` event is emitted in source (`agent-session.js`) but its public type was not examined.

## Addendum — session-test mechanics (for tasks.md)

Paths: `PI` = `/Users/joelleibow/.local/share/fnm/node-versions/v26.8.1/installation/lib/node_modules/@earendil-works/pi-coding-agent`. `PI-AI` = `PI/node_modules/@earendil-works/pi-ai`; `CORE` = `PI/node_modules/@earendil-works/pi-agent-core`. The repo copy `/Users/joelleibow/Projects/taiknr/node_modules/@earendil-works/pi-coding-agent/dist` and `.../pi-ai/dist` are byte-identical to the global ones (`diff -rq` printed nothing; all `@earendil-works/*` package.json = 1.5.2; pi-ai/agent-core are hoisted at the repo top level). Line numbers below are in the global `dist` files.

**Correction to the first report (§6):** I wrote that pi-ai has a "`registerFauxProvider`-family API". There is **no** `registerFauxProvider` function. The only factory is `fauxProvider(options?)` (`PI-AI/dist/providers/faux.d.ts:102`, `faux.js:487`); `FauxProviderRegistration` / `RegisterFauxProviderOptions` are only types. Details in item 3.

### 1. Aborting a run programmatically

**Entry point** — `AgentSession.abort(): Promise<void>` (`PI/dist/core/agent-session.d.ts:678`; also `waitForIdle(): Promise<void>` at :679). `AgentSession` is exported: `PI/dist/index.d.ts:3` `export { AgentSession, … } from "./core/agent-session.ts"`. It is the object returned as `session` by `createAgentSession` (`sdk.d.ts`: `CreateAgentSessionResult { session: AgentSession; extensionsResult; modelFallbackMessage? }`). Source (`agent-session.js:2073–2084`):
```js
async abort() {
    if (this._isAgentRunActive) { this._agentRunAbortRequested = true; }
    this.abortRetry(); this.abortCompaction(); this.abortBranchSummary();
    if (this._isBeforeSettle) this._abortDuringBeforeSettle = true;
    this.agent.abort();
    await this.waitForIdle();
}
```
Docs: sdk.md: "`abort()` stops the active operation and waits for the session to become idle."

**Does `turn_end` fire with `outcome: "aborted"`?** Depends on where the abort lands; outcome is derived from the *assistant message's* `stopReason`, not from the abort flag (`agent-session.js:542–544`):
```js
async _dispatchTurnEndBoundary(message, toolResults) {
    this._lastActivityOutcome =
        message.stopReason === "aborted" ? "aborted" : message.stopReason === "error" ? "error" : "completed";
```
- *Abort while the model is streaming* (assistant message ends `stopReason: "aborted"`): agent-core `agent-loop.js:148–156`:
```js
if (message.stopReason === "error" || message.stopReason === "aborted") {
    lastCompletedTurn = { message, toolResults: [], context: currentContext, newMessages };
    await config.finishTurn?.(lastCompletedTurn, signal);
    await emit({ type: "turn_end", message, toolResults: [] });
    await emit({ type: "agent_end", messages: newMessages });
    return;
}
```
`finishTurn` is pi's `_dispatchTurnEndBoundary` (`agent-session.js:575–581`), so extension `turn_end` fires with `outcome:"aborted"` and `toolResults: []` — no tool results exist for that turn.
- *Abort while a tool is executing* (assistant message already complete, `stopReason` e.g. `"toolUse"`): the loop finishes the batch, then `agent-loop.js:171–178` runs `finishTurn` → `turn_end` with the real `toolResults`; `outcome` is computed from the assistant message, i.e. `"completed"`, **not** `"aborted"`. (Sequential batch: `agent-loop.js:~407–412` `if (signal?.aborted) break;` after emitting the tool-result message; parallel batch gives later calls `createErrorToolResult("Operation aborted")`, `agent-loop.js:435–446`.) I did not find a code path that sets `outcome:"aborted"` for this case. "not found" for an "aborted" outcome with non-empty `toolResults`.
- Tool-result persistence: `agent-session.js:813–827` (in the `_handleAgentEvent` path): on `message_end`, roles `system|user|assistant|toolResult` are `this.sessionManager.appendMessage(event.message)` and `this._entryIdsByMessage.set(event.message, entryId)`. Tool results are emitted via `emitToolResultMessage` (`agent-loop.js:~404`) before `turn_end`, so a completed tool result is already a `message`/`toolResult` entry when `turn_end` fires; `toolResultEntryIds` is resolved from those (`agent-session.js:556–559`). Its `content` is whatever the tool returned (>600 chars text is kept as-is). Source does not special-case aborts when persisting, so a result produced before/while abort is persisted; a result for a call skipped by abort is the `"Operation aborted"` error result (short text).

**Is `agent_before_settle` skipped?** Yes. `_startRun` loop (`agent-session.js:1513–1527`):
```js
await this.agent.prompt(messages);
while (!this._agentRunAbortRequested) {
    if (await this._handlePostAgentRun()) { if (this._agentRunAbortRequested) break; await this.agent.continue(); continue; }
    if (this._agentRunAbortRequested || !(await this._runBeforeSettleBoundary())) break;
    if (this._agentRunAbortRequested) break;
    await this.agent.continue();
}
```
`_runBeforeSettleBoundary` (`:1630–1651`) is only reachable when `_agentRunAbortRequested` is false. After the loop, `_emitAgentSettled()` emits `agent_settled` with `aborted: this._agentRunAbortRequested` (`:743–745`). Docs (extensions.md ~L336): "An aborted run skips `agent_before_settle` and goes from `agent_end` to `agent_settled`." If abort arrives *during* `agent_before_settle` handlers, `_abortDuringBeforeSettle` suppresses continuation but valid returned entries are committed (`:2080–2081`, extensions.md L695).
Abort is only honoured when `_isAgentRunActive`; `abort()` on an idle session just calls `agent.abort()` and returns after `waitForIdle()`.
How a test triggers the abort mid-run (a tool `execute` that calls `session.abort()`, a `tool_call`/`turn_end` handler, or a faux response factory) — "not found" in docs/examples; no example calls `abort()` programmatically.

### 2. A short session that actually compacts

**Settings** — `SettingsManager.inMemory(settings?: Partial<Settings>, options?: SettingsManagerCreateOptions): SettingsManager` (`settings-manager.d.ts:70`; impl `settings-manager.js:251–256`; `SettingsManagerCreateOptions { projectTrusted?: boolean }` :24–26). Exported from `PI/dist/index.d.ts:22` (`SettingsManager`). Compaction field names (`settings-schema.d.ts:88–96`):
```ts
compaction: Type.TOptional<Type.TObject<{
    enabled: TOptional<TBoolean>; reserveTokens: TOptional<TInteger>; keepRecentTokens: TOptional<TInteger>;
    modelOverrides: TOptional<TRecord<"^.*$", TObject<{ reserveTokens?: TInteger; keepRecentTokens?: TInteger }>>>;
}>>
```
Example shape that satisfies the type: `SettingsManager.inMemory({ compaction: { enabled: true, keepRecentTokens: 1, reserveTokens: … } })`. Validation (`settings-manager.js:654–658`): values must be non-negative safe integers (`ordinary < 0` throws "Invalid compaction.<field> setting"), so `keepRecentTokens: 0` is allowed. Defaults (`settings-defaults.js:8–12`): `enabled: true, reserveTokens: 16384, keepRecentTokens: 20000`. Resolution order: `modelOverrides["<provider>/<id>"]` → ordinary → default (`:660–662`). `getCompactionSettings(model)` returns `{ enabled, reserveTokens, keepRecentTokens }` (`:678–684`).

**`session.compact`** — `compact(customInstructions?: string): Promise<CompactionResult>` (`agent-session.d.ts:750`). `CompactionResult<T> { summary: string; firstKeptEntryId: string; tokensBefore: number; estimatedTokensAfter?: number; usage?: Usage; details?: T }` (`compaction.d.ts:18–26`). Source `agent-session.js:2316–2420`:
- Starts with `await this.abort();` (so it aborts any in-flight run) and emits `compaction_start` `{reason:"manual"}`.
- Throws `formatNoModelSelectedMessage()` if `!this.model`.
- `prepareCompaction(this.sessionManager.getBranch(), settings)` — if it returns `undefined`: throws `"Already compacted"` when the last entry is a `compaction`, else `"Nothing to compact (session too small)"`. `prepareCompaction` (`compaction.js:609–660`) returns `undefined` when the last path entry is a compaction, when no `firstKeptEntryId` resolves, or when `messagesToSummarize.length === 0 && turnPrefixMessages.length === 0`; the cut point comes from `findProjectedCutPoint(…, settings.keepRecentTokens)`. Valid cut points are user/assistant/bashExecution/custom/branchSummary/compactionSummary messages, never toolResult (compaction.js `isCutPointMessage`; docs compaction.md "Cut Point Rules").
- If an extension handles `session_before_compact` and returns `{ compaction: CompactionResult }` (`SessionBeforeCompactResult { cancel?: boolean; compaction?: CompactionResult }`, `types.d.ts:1157–1160`), pi uses that summary, `firstKeptEntryId`, `tokensBefore`, `usage`, `details` and **makes no model call** (`:2349–2358`); `fromExtension = true`. Otherwise `_runDefaultCompaction` → `compact(preparation, model, apiKey, headers, …, this.agent.streamFunction, …)` (`:2303–2306`).
- Default path, model calls: `compact()` (`compaction.js:688–725`) makes one summarisation call (`generateSummaryWithUsage`) when `!isSplitTurn`; when `isSplitTurn && turnPrefixMessages.length > 0` it makes a history call (only if `messagesToSummarize.length > 0`) plus one turn-prefix call (`generateTurnPrefixSummary`). Each call goes through `this.agent.streamFunction`, so with the faux provider each consumes one queued faux response; an empty queue produces an error assistant message `"No more faux responses queued"` (`faux.js:366–371`) which `getSummarizationFailure` turns into a thrown error ("Summarization …"). The summary text is `contentText(response.content)`; a response containing a `toolCall` block throws ("…attempted to call a tool", `compaction.js:741–743`). Queue the response with `faux.appendResponses([fauxAssistantMessage("summary text")])` (or `setResponses`), declared at `faux.d.ts` (`FauxProviderHandle.setResponses/appendResponses`). Summaries also append file-operation lists (`formatFileOperations`, `compaction.js:714`).
- On success: `sessionManager.appendCompaction(summary, firstKeptEntryId, tokensBefore, details, fromExtension, usage)`, `_refreshFinalizedContext()`, then emit (`agent-session.js:2395–2406`):
```js
await this._extensionRunner.emit({ type: "session_compact", compactionEntry: savedCompactionEntry, fromExtension, reason: "manual", willRetry: false });
```
Payload type `SessionCompactEvent { type:"session_compact"; compactionEntry: CompactionEntry; fromExtension: boolean; reason: "manual"|"threshold"|"overflow"; willRetry: boolean }` (`types.d.ts:633–641`). Manual → `reason:"manual"`, `willRetry:false`.
- On failure `session_compact_failed` fires (`:2429–2443`, `aborted`/`errorMessage`).
- Auth for the summary request: `_getSummarizationRequestAuth` (`:275–…`). For a non-default `streamFunction`: if `runtimeStreamFunctions.get(this.agent.streamFunction) === this._modelRuntime` it returns `{ model, thinkingLevel }` without an API key (`:287–289`); `sdk.js:290` calls `markRuntimeStreamFunction(agent.streamFunction, modelRuntime)` for sessions created by `createAgentSession`. Whether `apiKey` is needed for faux: its `auth.apiKey.resolve` returns `{ auth: {} }` (`faux.js:491`).
- "A session small enough to compact" vs "too small": determined by `keepRecentTokens` and the token estimate (≈ chars/4, compaction.js `estimateTokens`; images 4800 chars); the exact minimum entry count for a given `keepRecentTokens` is "not found" in docs — only derivable from `findProjectedCutPoint`.
- Automatic compaction is separate (`_checkCompaction` / `_runAutoCompaction`, `agent-session.js`; `settings.enabled`, `contextTokens > contextWindow - reserveTokens`, `compaction.js` `shouldCompact`); `AgentSession.setAutoCompactionEnabled(enabled: boolean)` / `get autoCompactionEnabled` exist (`agent-session.d.ts`).

### 3. Wiring the faux model into `createAgentSession`

**`createAgentSession`** — `export declare function createAgentSession(options?: CreateAgentSessionOptions): Promise<CreateAgentSessionResult>` (`sdk.d.ts`), exported `PI/dist/index.d.ts:20`. Options (`sdk.d.ts`):
```ts
export interface CreateAgentSessionOptions {
    cwd?: string; agentDir?: string; modelRuntime?: ModelRuntime; model?: Model<any>;
    thinkingLevel?: ThinkingLevel; scopedModels?: Array<{ model: Model<any>; thinkingLevel?: ThinkingLevel }>;
    noTools?: "all" | "builtin"; tools?: string[]; excludeTools?: string[]; customTools?: ToolDefinition[];
    resourceLoader?: ResourceLoader; sessionManager?: SessionManager; settingsManager?: SettingsManager;
    sessionStartEvent?: SessionStartEvent;
}
```
(`Model` is from `@earendil-works/pi-ai/compat`.)
Defaults when omitted (`sdk.js:69–77`): `modelRuntime ?? await ModelRuntime.create({ authPath, modelsPath })` (authPath/modelsPath are `undefined` unless `agentDir` is passed, then default files under the default agent dir are used); `settingsManager ?? SettingsManager.create(cwd, agentDir)`; `sessionManager ?? SessionManager.create(cwd, getDefaultSessionDir(cwd, agentDir))` (i.e. persistent); `resourceLoader ?? new DefaultResourceLoader({ cwd, agentDir, settingsManager })` (discovers on-disk extensions/resources).
**Model selection** — the `model` option: `let model = options.model;` (`sdk.js:87`); when omitted: restored from the session's `model_change` if present and `hasConfiguredAuth`, else `findInitialModel({ … defaultProvider/defaultModelId from settingsManager, modelRuntime })` (`:93–120`). No resolver option exists on `CreateAgentSessionOptions`.

**`ModelRuntime.create`** — `static create(options?: CreateModelRuntimeOptions): Promise<ModelRuntime>` (`model-runtime.d.ts:56`). Exported `PI/dist/index.d.ts:15`. Options (`model-runtime.d.ts:4–25`):
```ts
interface CreateModelRuntimeOptions {
  credentials?: CredentialStore;      // "Credential storage. Defaults to the file at authPath."
  authPath?: string; modelsPath?: string | null; modelsStore?: ModelsStore; modelsStorePath?: string;
  allowModelNetwork?: boolean;        // "Defaults to false."
  modelRefreshTimeoutMs?: number; catalogBaseUrl?: string; signal?: AbortSignal;
  refreshOnCreate?: boolean;          // "Skip initial catalog and availability refresh. Static models remain available."
}
```
An in-memory `CredentialStore` implementation: "not found" in the files I read (the `CredentialStore` type is imported from pi-ai at `model-runtime.d.ts:1`; `runtime-credentials.d.ts` defines a runtime-key wrapper around a `CredentialStore`). Without `credentials`, `create` reads the default auth file.
**`registerNativeProvider(provider: Provider): void`** (`model-runtime.d.ts:115`) — pass `faux.provider` from `fauxProvider()`. (There is also `registerProvider(providerId, config: ProviderConfigInput)` :~119 and `unregisterProvider`.) Provider interface: `PI-AI/dist/models.d.ts:72–` (`id`, `name`, `baseUrl?`, `headers?`, `auth: ProviderAuth` "at least one of `apiKey`/`oauth`", `getModels()`, …).
**`setRuntimeApiKey(providerId: string, apiKey: string, options?: AuthOperationOptions): Promise<void>`** (`model-runtime.d.ts:93`; counterpart `removeRuntimeApiKey`). Whether it is *required* for faux: the faux provider is built with `auth: { apiKey: { name: "Faux", resolve: async () => ({ auth: {} }) } }` (`faux.js:489–491`), i.e. resolves as configured with no key; `session.prompt` checks `hasConfiguredAuth(provider) || (await checkAuth(provider)) !== undefined` (`agent-session.js:1766–1767`). Whether `hasConfiguredAuth` is already true right after `registerNativeProvider` without an API key (`markProvisionallyConfigured` is a private method, `model-runtime.d.ts:~117–121`) was not verified by execution; "not found" in docs.
**Faux API** (exports from `@earendil-works/pi-ai` root: `PI-AI/dist/index.d.ts:21` `export * from "./providers/faux.ts"`; also path `@earendil-works/pi-ai/providers/*` export map):
```ts
export declare function fauxText(text: string): TextContent;
export declare function fauxThinking(thinking: string): ThinkingContent;
export declare function fauxToolCall(name: string, arguments_: ToolCall["arguments"], options?: { id?: string }): ToolCall;
export declare function fauxAssistantMessage(content: string | FauxContentBlock | FauxContentBlock[],
   options?: { stopReason?: AssistantMessage["stopReason"]; deferred?: DeferredHandle; errorMessage?: string; responseId?: string; timestamp?: number }): AssistantMessage;
export type FauxResponseFactory = (context: TranscriptContext, options: SimpleStreamOptions | undefined, state: FauxProviderState, model: Model<string>) => AssistantMessage | Promise<AssistantMessage>;
export type FauxResponseStep = AssistantMessage | FauxResponseFactory;
export interface FauxModelDefinition { id: string; name?; reasoning?; input?: ("text"|"image")[]; inputLimits?; cost?; contextWindow?: number; maxTokens?: number }
export interface RegisterFauxProviderOptions { api?: string; provider?: string; models?: FauxModelDefinition[]; deferred?; tokensPerSecond?: number; tokenSize?: { min?: number; max?: number } }
export interface FauxProviderHandle { provider: Provider; api: string; models: [Model<string>, ...Model<string>[]]; getModel(): Model<string>; getModel(modelId: string): Model<string> | undefined; state: FauxProviderState; setResponses(r: FauxResponseStep[]): void; appendResponses(r: FauxResponseStep[]): void; getPendingResponseCount(): number }
export declare function fauxProvider(options?: RegisterFauxProviderOptions): FauxProviderHandle;
```
(`faux.d.ts:3–102`.) Defaults (`faux.js:5–9`): provider id `"faux"`, model id `"faux-1"`, name `"Faux Model"`, baseUrl `"http://localhost:0"`; `api` defaults to a random id `randomId("faux")` (`faux.js:319`). Responses are shifted from a queue, one per `stream` call (`faux.js:360–363`); `FauxProviderState { callCount, deferredFetchCount, cancelledDeferred }`. The faux stream honours `signal.aborted` and yields an assistant message with `stopReason:"aborted"`, `errorMessage:"Request was aborted"` (`faux.js:221–222, 235–298`). To script a tool call: `fauxAssistantMessage([fauxToolCall("tool_name", {…}, { id })], { stopReason: "toolUse" })` — the `stopReason` value `"toolUse"` is my reading of the `AssistantMessage["stopReason"]` type; I did not check the union in `types.d.ts`. The named tool must exist in the session (`customTools?: ToolDefinition[]` option above, or a tool registered by the extension via `pi.registerTool`); an unknown tool skips `tool_call` and yields an error result (extensions.md ~L369).
**`bindExtensions`** — `bindExtensions(bindings: ExtensionBindings): Promise<void>` (`agent-session.d.ts:798`), with (`agent-session.d.ts:168–175`):
```ts
export interface ExtensionBindings {
    uiContext?: ExtensionUIContext; mode?: ExtensionMode; commandContextActions?: ExtensionCommandContextActions;
    abortHandler?: () => void; shutdownHandler?: ShutdownHandler; onError?: ExtensionErrorListener;
}
```
All fields optional (`bindExtensions({})` type-checks). It emits `this._sessionStartEvent` — default `{ type: "session_start", reason: "startup" }` (`agent-session.js:226`, `:2776`) — so `session_start` fires at `bindExtensions`, with `sessionStartEvent` on `CreateAgentSessionOptions` able to override the payload. `onError` is the hook that receives extension handler errors (e.g. boundary failures) — `ExtensionErrorListener` type not quoted here.
**Extension loading in tests** — `DefaultResourceLoader({ cwd, agentDir, extensionFactories: [(pi) => {…}], … })` then `await resourceLoader.reload()` (sdk.md; `examples/sdk/06-extensions.ts`; `extensionFactories?: InlineExtension[]` at `resource-loader.d.ts:81`). A bare `DefaultResourceLoader` still discovers on-disk extensions/skills under `cwd`/`agentDir` unless restricted (e.g. `noExtensions`, mentioned in sdk.md ~L112); the exact option set to isolate was not enumerated here.
**Doc example shape** (pi-ai doc comment, `faux.d.ts:96–102`, for the `Models` collection API, not `ModelRuntime`): `const faux = fauxProvider(); models.setProvider(faux.provider); faux.setResponses([fauxAssistantMessage("hi")]);` — pi-coding-agent docs do not show faux with `createAgentSession`; "not found".

### 4. Navigation

`navigateTree(targetId: string, options?: { summarize?: boolean; customInstructions?: string; replaceInstructions?: boolean; label?: string }): Promise<{ editorText?: string; cancelled: boolean; aborted?: boolean; summaryEntry?: BranchSummaryEntry }>` (`agent-session.d.ts:893–903`). Source behaviours (`agent-session.js:3363–3520`):
- Throws if `this.isStreaming || this._promptPreflightCount > 0` ("Wait for the current response to finish…") or `this.isCompacting`.
- `if (targetId === oldLeafId) return { cancelled: false };` — no event fires for a no-op.
- `summarize: true` requires `this.model` (else throws "No model available for summarization") and invokes summarisation (a model call); the default `summarize` is `false` (`options.summarize ?? false`), so no model call and no `branch_summary` entry. `session_before_tree` fires first (cancellable; may supply a summary).
- Throws `Entry ${targetId} not found` for unknown ids. After moving the leaf (`sessionManager.branch(newLeafId)` / `resetLeaf()` when the target is null-ish) it calls `_refreshFinalizedContext()` then emits `{ type:"session_tree", newLeafId: this.sessionManager.getLeafId(), oldLeafId, summaryEntry, fromExtension }` (`:3510–3518`). Note: for a user-message target pi returns `editorText` and moves the leaf to the user message's parent (behaviour beyond the quoted lines; I did not read the earlier branch of that function in full — check `:3403–3490` if the test targets a user entry).
**Getting an entry id** (`ReadonlySessionManager`/`SessionManager`; `session-manager.d.ts`): `session.sessionManager` is the `SessionManager` (`agent-session.d.ts:225` `readonly settingsManager`; `sessionManager` is the same on the session) with `getLeafId(): string | null`, `getBranch(fromId?): SessionEntry[]`, `getEntries()`, `getEntry(id)`, `getTree()`, `getChildren(parentId)`, `getLeafEntry()`; entry ids are the 8-char ids from §1 of the main report. `SessionManager.inMemory(cwd?, options?, entries?: FileEntry[])` (`session-manager.d.ts:393`). Public `SessionManager.branch(id)`/`resetLeaf()` exist on the manager (used at `agent-session.js:3492–3497`) but navigating through `session.navigateTree` is what emits `session_tree`; calling the manager's `branch()` directly does not emit it (no emit in `branch()` per the call sites I read — "not verified in session-manager.js").
`session.sessionManager` property declaration on `AgentSession` — I confirmed `settingsManager` (`:225`) and that source uses `this.sessionManager.*` throughout; the `.d.ts` line for `sessionManager` itself was not quoted.

### Not found / not verified (this addendum)
- A documented in-memory `CredentialStore` for `ModelRuntime.create({ credentials })`.
- Any example/doc of `abort()` driven from a test; any path producing `turn_end.outcome === "aborted"` with non-empty `toolResults`.
- Execution-level confirmation that faux + `registerNativeProvider` yields a configured provider without `setRuntimeApiKey`.
- Minimum session size for `session.compact()` to find a cut point at a given `keepRecentTokens`.
- The `AssistantMessage["stopReason"]` union text (assumed `"toolUse"`).
