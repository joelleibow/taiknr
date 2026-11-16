# Research — Chidi — classifier-scoring-and-tail-recall

Evidence only; no design or recommendation. Nothing was run against the network; neither PoC script was run.

## Question and Scope

Against pi-coding-agent **1.5.2** as installed, report exact types, payloads, return shapes and file:line citations for:

1. the `context` event (firing, payload, return, persistence, composition, `context_with_system`, prefix-cache effect);
2. user messages in that payload (shape, timestamp, steering/follow-up, identical prompts);
3. calling a classifier from an extension (`ctx.modelRegistry`, `classify`, `bool`, batching, abort, errors, usage/cost, `~typesafe/jev-latest`);
4. `ctx.ui.notify`;
5. no-network testing seams.

## Sources / Files Examined

Root `PI` = `/Users/joelleibow/.local/share/fnm/node-versions/v26.8.1/installation/lib/node_modules/@earendil-works/pi-coding-agent`. `AI` = `PI/node_modules/@earendil-works/pi-ai/dist`. `CORE` = `PI/node_modules/@earendil-works/pi-agent-core/dist`.

- `PI/docs/extensions.md` (≈L340-430 hooks and composition, L815-840 `context`/`context_with_system`, L1161-1230 ctx), `docs/models.md` L142-185, `docs/codemode.md` L60-135, `docs/custom-provider.md` L90-130, `docs/llama-cpp.md` L99, `docs/rpc-extension-ui.md` L97-111, `docs/virtual-models.md` L112
- `PI/dist/core/extensions/types.d.ts` (L70-100, L225-265, L699-711, L1102-1104, L1242-1243), `runner.js` (L90-106, L128-140, L203, L355-356, L404-405, L621-660, L1014-1060)
- `PI/dist/core/sdk.js` L277-282; `PI/dist/core/agent-session.js` (L1510-1527, L1568-1573, L1744-1760, L1879-1906, L3197-3225); `PI/dist/core/model-registry.d.ts` L27-70, `model-registry.js` L27-30, L88-94; `PI/dist/core/model-runtime.js` L459-492, L568-580; `PI/dist/core/usage-totals.js`; `PI/dist/modes/print-mode.js` L55-62; `PI/dist/extensions/codemode/execute.js` L441-442, L700-708
- `CORE/agent-loop.js` (L89-130, L185-210, L266-285), `CORE/agent.js` (L141-142, L187-214, L263-288, L340-342)
- `AI/types.d.ts` (L24-25, L48-73, L224-231, L273-277, L377-381, L486-525), `AI/models.d.ts` (L40-60, L205-265), `AI/providers/faux.d.ts`, `AI/providers/faux.js` (no classify), `AI/utils/model-operations.js` L26-52, `AI/providers/data/openrouter.json` (entry `~typesafe/jev-latest`)
- taiknr: `jev-context-poc.ts`, `test-jev-poc.mjs` (API names only), `tests/app/extension/archive-session.test.ts` L100-160, `owner-rulings.md`

## Findings

### 1. The `context` event

- **Wiring.** `createAgentSession` sets the Agent's `transformContext` to `runner.emitContext(messages)` (`PI/dist/core/sdk.js` L277-282). The agent loop calls `config.transformContext(messages, signal)` at the top of `streamAssistantResponse`, before `convertToLlm` (`CORE/agent-loop.js` L266-270). That function runs once per assistant request, so `context` fires **before every LLM call**, including each step of a tool loop (each turn → one `streamAssistantResponse`). Docs: "Fired before each LLM call" (`docs/extensions.md` L817).
- **Retries.** Auto-retry waits and then `agent.continue()` is called in the post-run loop (`agent-session.js` L1514-1526; backoff at L3197-3225). `continue()` re-enters `runLoop` → `streamAssistantResponse`, so `context` fires again for a retried request. Inferred from the call path; I did not find a doc sentence that says so. The `_omitRecoveryAttempt` call (L3210-3212) says the failed attempt is "durably omitted from model projection", so the retry sees the transcript without it.
- **Payload.** `interface ContextEvent { type: "context"; messages: AgentMessage[] }` (`types.d.ts` L699-702). The runner hands each handler `structuredClone(messages)` with system messages filtered out (`runner.js` L1016, L1020-1022). Docs: "deep copy without system messages, safe to modify" (`extensions.md` L822-824). Handler signature `(event, ctx: ExtensionContext)`; may be async (`runner.js` L1023 awaits it).
- **Return.** `interface ContextEventResult { messages?: AgentMessage[] }` (`types.d.ts` L1102-1104). Returning nothing, or an array identical element-by-element to the visible snapshot, leaves the request unchanged. In-place edits of `event.messages` are also honoured (`runner.js` L1025-1026, comment "Handlers may return a new list or edit event.messages in place").
- **Per-request only.** `emitContext` clones the input and the result feeds only that provider call. Docs say "Modify messages non-destructively" (`extensions.md` L817). The session branch/`agent.state.messages` are untouched. Docs also say later `context` mutations are not visible to `getSystemPrompt`-type queries (`extensions.md` L1309, L1335).
- **Composition.** Handlers run sequentially in extension load order, then registration order; each handler receives the output of the previous (`extensions.md` L414-420, "Chained transformation … `context` …"; `runner.js` L1017-1029, `currentMessages` carried forward). A handler that throws is caught, reported via `emitError({event:"context"})`, and the chain continues with the previous messages (`runner.js` L1031-1040). So an uncaught throw in one handler leaves the request unmodified by that handler.
- **System messages when the list changes.** If the returned list differs from the snapshot, `restoreSystemMessages` returns `[getCurrentSystemMessage(current), ...returned]` (`runner.js` L101-105): the visible messages are replaced and the prompt/tool state is replayed into **one leading system message**. If unchanged, "every system message" stays in place (`runner.js` L93-100; `extensions.md` L827: "An unchanged list keeps mid-conversation system messages in place, so models that accept them retain their cached prefix"). System messages a handler adds are kept after Pi's head (`extensions.md` L827).
- **`context_with_system`.** `interface ContextWithSystemEvent { type; messages: AgentMessage[] }` (`types.d.ts` L708-711); fires "before each LLM call, after every `context` handler has run and Pi has restored the prompt and tool state"; `messages` includes the leading system message and mid-conversation patches; returned list is sent as-is; same `ContextEventResult` return type (`types.d.ts` L1243; `extensions.md` L829-840; `runner.js` L1043-1060). Order in the request: `context` → `context_with_system` → `before_provider_headers` → `before_provider_request` (`extensions.md` L354-359).
- **Prefix bytes.** Pi documents no byte-identity guarantee for a changed list. What the code shows: (a) the message array is rebuilt, but earlier user/assistant/tool-result messages are cloned values and are passed through unchanged by a handler that edits only the tail; (b) once the list is "changed", mid-conversation system messages in the original array are dropped and a single replayed head system message is used (`runner.js` L101-105), which can differ in form from an unchanged-list request on models that accept mid-conversation system messages (`extensions.md` L827). Whether the provider-serialised prefix is byte-identical, and whether it hits the provider cache, is not stated in any doc I read and was not tested.
- **Role caveat.** `event.messages` is `AgentMessage[]`, not only `Message`. A `role: "custom"` message (custom messages from `pi.sendMessage`, `before_agent_start` results; `agent-session.js` L1576-1584) is converted to a user-role LLM message later by `convertToLlm` (`extensions.md` L748: a `custom_message` "contributes a user-role model message"). So `findLast(m => m.role === "user")` is the last `role:"user"` AgentMessage, not necessarily the last user-role message the provider receives.
- **ctx in handler.** `ctx: ExtensionContext` (`types.d.ts` L231-266) has `modelRegistry`, `ui`, `hasUI`, `signal` ("current abort signal, or undefined when the agent is not streaming", L259-260), `sessionManager`. `emitContext` creates it with `this.createContext()` (`runner.js` L1015).

### 2. User messages

- `interface UserMessage { role: "user"; content: string | (TextContent | ImageContent)[]; timestamp: number }` (`AI/types.d.ts` L377-381). `TextContent {type:"text"; text; textSignature?}`; `ImageContent {type:"image"; data: string; mimeType: string}` (L259-277).
- **Initial prompt.** Built as `{ role:"user", content: [{type:"text", text}, ...normalizedImages], timestamp: Date.now() }` (`agent-session.js` L1568-1573). Content is an **array**, with one text block first (the text has image `hints` appended when there are images, L1566-1567). `CORE/agent.js` L288 also builds `{role:"user", content, timestamp: Date.now()}` for direct `Agent.prompt(string)`; there `content` can be a string (shape depends on caller; the PoC's `extractText` handles both).
- **Steering / follow-up.** Both `_queueSteer` and `_queueFollowUp` create a **new** `UserMessage` `{ role:"user", content:[{type:"text", text}, ...images], timestamp: Date.now() }` with its own timestamp (`agent-session.js` L1879-1906) and enqueue it (`agent.steer` / `agent.followUp`, `CORE/agent.js` L187-192). A queued message is drained at the next loop iteration, pushed onto `currentContext.messages`, and emitted as `message_start`/`message_end` before the next assistant request (`CORE/agent-loop.js` L112-125; steering polled at L89-91, L191; follow-ups L197-201). So a mid-run steering message appears as an additional `role:"user"` entry in `event.messages`, after the assistant/tool-result messages, with a fresh `Date.now()` timestamp. Nothing indicates it shares the original prompt's timestamp.
- **Identical prompts.** Two "continue" prompts are separate messages with separate `Date.now()` millisecond timestamps, so `timestamp + text` distinguishes them in practice. Timestamp resolution is 1 ms; I found no uniqueness guarantee (no id on `UserMessage`; the session entry id is on the branch entry, not on the event message).
- `structuredClone` in `emitContext` preserves `timestamp` and content blocks; images stay as `ImageContent` blocks in the array.
- When `settingsManager.getBlockImages()` is on, image blocks are replaced by text in `convertToLlm` (`dist/bundle/chunks/chunk-VEJDBY3O.js`, `convertToLlmWithBlockImages`), after `context`.

### 3. Calling a classifier from an extension

- **API on `ctx.modelRegistry: ModelRegistry`** (`model-registry.d.ts`):
  - `findOfType<TType extends ModelType>(type, provider, modelId): ModelTypeMap[TType] | undefined` — comment: `findOfType("classifier", "typesafe", "jev-latest")` (L27-30). Same as `getModelOfType(type, provider, modelId)` (`model-registry.js` L88-90). Both are synchronous catalog lookups, not auth checks.
  - `getAvailableOfType(type, provider?, options?)` → `Promise<readonly …[]>` "whose provider has working credentials" (`docs/codemode.md` L72-74 wording; `models.md` L142-160).
  - `hasConfiguredAuth(model)`, `getProviderAuthStatus(provider)`.
  - `classify(model: ClassifierModel<ClassifierApi>, context: ClassifierContext, options?: ModelsClassifierOptions): Promise<ClassifierResult>`; comment "Classify structured state with request-time authentication. Never rejects." (`model-registry.d.ts` L47; `.js` L91-94). Docs: "Extensions call classifiers through `ctx.modelRegistry.classify()`, without codemode" (`models.md` L185; `extensions.md` L1228).
- **Real name:** `classify`. The codemode doc names it `models.classify(model, context)` and says "`classify()` … use only the `provider` and `id` of `model`" (`codemode.md` L93) — that is the script binding; the registry method takes a `ClassifierModel` object (from `findOfType`).
- **Context type** (`AI/types.d.ts` L486-492): `ClassifierContext { state: JsonObject; images?: ImageContent[]; questions: Record<string, ClassifierQuestion> }`. Docs variant (`codemode.md` L100-106): `state: Record<string, unknown>`; the `.d.ts` says `JsonObject`.
- **Bool question** (L474-484): `{ type: "bool"; instructions: string; criteria: { true: string; false: string } }`. Others: `choice` (`criteria: Record<string,string>`), `score` (`criteria: string[]`).
- **Answer**: `ClassifierBoolAnswer { type: "bool"; probability: number }` — "Probability of `true`" (`codemode.md` L128; `AI/types.d.ts` L507-510). Choice: `{choice, probabilities, confidence}`; score: `{score, confidence}`.
- **Result** (`AI/types.d.ts` L513-523): `ClassifierResult { api; provider; model; answers: Record<string, ClassifierAnswer>; usage?: Usage; stopReason: "stop"|"error"|"aborted"; errorMessage?: string; timestamp }`. Docs variant (`codemode.md` L111-120) omits `api` and `timestamp` and types `usage` as `{input, output, totalTokens, cost:{total}}`; the `.d.ts` uses pi-ai `Usage`.
- **Batching.** "Questions by ID. One call answers all of them." (`codemode.md` L104). `questions` is a map, so many bool questions share one `state` in one call. The PoC builds one question per archived id this way. Codemode (script) limits concurrency to four parallel classify calls (`codemode.md` L93); no such limit is documented for `ctx.modelRegistry.classify`. I found no documented cap on question count or state size for OpenRouter/Jev; `contextWindow` for `~typesafe/jev-latest` is 262144 (`AI/providers/data/openrouter.json`).
- **Abort.** `ModelsClassifierOptions = ClassifierOptions & ModelsRequestTransforms` (`AI/models.d.ts` L58); `ClassifierOptions extends ProviderRequestOptions` which carries `signal?: AbortSignal`, `apiKey`, `fetch`, `env`, `onPayload`, `onResponse`, plus `temperature?` (`AI/types.d.ts` L48-73, L224-231). `ctx.signal` is `AbortSignal | undefined` (`types.d.ts` L259-260). An aborted call returns `stopReason:"aborted"` (`classifierErrorResult(model, error, options?.signal?.aborted)`, `model-operations.js` L42-52).
- **Errors never throw.** `ModelRuntime.classify` wraps everything in try/catch and returns `classifierErrorResult` with `answers: {}`, `stopReason:"error"|"aborted"`, `errorMessage` (`model-runtime.js` L568-580). Specific causes, all surfaced as `stopReason:"error"` + `errorMessage`:
  - non-classifier model → `assertClassifierModel` throws;
  - images with a model whose `input` lacks `"image"` → `Model … does not accept image input` (`model-operations.js` L26-30);
  - unknown provider → `Unknown provider: <id>`; no credentials → `Provider is not configured: <id>` (`model-runtime.js` L459-469);
  - provider without classify → `Provider … does not support classification` (L573-575).
  - **Missing model**: `findOfType` returns `undefined` (not an error) — the caller must handle it before calling `classify` (`classify`'s `model` param is non-optional).
  - HTTP/provider failures come back through the provider's own error mapping (same `stopReason:"error"`); not inspected per provider.
- **Usage and cost.** `result.usage` carries tokens and cost "when the service reports token counts, as all System One services do"; cost uses catalog price, so `openrouter` `~typesafe/jev-latest` has `cost.input 0.042` and `output 0` per the catalog (`models.md` L183; `openrouter.json`). **Counting toward the session total:** docs state only that "Pi adds the usage of a *script's* classifier calls to the `codemode` tool result, so it counts toward the session cost" (`models.md` L183; `codemode.md` L93; implemented at `codemode/execute.js` L441-442, L706-708). `getSessionStats` sums `usage` session entries, assistant message usage, tool-result `usage`, and compaction/branch-summary `usage` (`agent-session.js` ≈L3558-3576; `usage-totals.js` L42-62). A direct `ctx.modelRegistry.classify()` call from an extension handler writes none of these, so its `result.usage` is **not** added to the session total by the code I read. I found no extension API to append a `usage` entry (searched `types.d.ts` for usage-recording methods; not exhaustive). The only `type:"usage"` entry in the docs is `kind:"cache_warm"` (`docs/session-format.md` L118).
- **Addressing Jev through OpenRouter.** `provider: "openrouter"`, id `~typesafe/jev-latest`, `type:"classifier"`, `api:"typesafe-system-one"`, `baseUrl:"https://openrouter.ai/api/v1"`, `input:["text","image"]`, `contextWindow:262144`, `compat.imageInput:"state-image-urls"` (`openrouter.json`). Other openrouter ids: `typesafe/jev-1.13`, `typesafe/jev-1.14`, `cloudflare/clef*` (`models.md` L148). Auth: `OPENROUTER_API_KEY` or `/login` (`models.md` L148; `providers.md` L120: "Image and classifier models are not filtered" by the key's `/models/user` list). Direct alternative: provider `typesafe`, id `jev-latest`, `TYPESAFE_API_KEY` (`models.md` L146).

### 4. `ctx.ui.notify`

- Signature: `notify(message: string, type?: "info" | "warning" | "error"): void` (`types.d.ts` L91). RPC mode docs: `notifyType` defaults to `"info"` (`rpc-extension-ui.md` L97-111).
- **hasUI false.** `ctx.hasUI` "`true` in TUI and RPC modes. `false` in print mode (`-p`) and JSON mode" (`extensions.md` L1177). The runner's default UI is `noOpUIContext` with `notify: () => {}` (`runner.js` L132-137, L203); `hasUI()` is `uiContext !== noOpUIContext` (L404-405). Print/JSON mode calls `session.bindExtensions({mode, commandContextActions, …})` with no UI context in the snippet I read (`print-mode.js` L55-62), so `notify` there is a **silent no-op** (no stderr/stdout output). `extensions.md` L1177 lists `notify` among methods that "work in both TUI and RPC modes" and says to guard on `ctx.hasUI`.
- `ctx.ui` getter throws if the runner is no longer active (`runner.js` L626-629, `assertActive`) — relevant to a stale `ctx`; the context passed to a handler during a live request is active.
- Callable from a `context` handler: `ExtensionContext.ui` is the same object for all handlers, and `context` handlers receive `ctx` (`runner.js` L1015, L1023). The docs show `notify` in event handlers (`extensions.md` L481, L492, L948, L1296). No doc restriction on `context` handlers was found. In TUI it routes to `showExtensionNotify` (`interactive-mode.js` L2176); `notify` is synchronous fire-and-forget.
- Mode field: `ctx.mode: "tui" | "rpc" | "json" | "print"` (`types.d.ts` L231-236).

### 5. Testing without the network

- **Faux provider has no classifier support.** `AI/providers/faux.d.ts` exports `fauxProvider()`, `fauxText`, `fauxThinking`, `fauxToolCall`, `fauxAssistantMessage`; its handle has `provider, api, models, getModel(), state{callCount,…}, setResponses, appendResponses, getPendingResponseCount`. `grep classif` on `faux.js` and `faux.d.ts` finds nothing. Responses are scripted as `AssistantMessage` or `FauxResponseFactory = (context: TranscriptContext, options, state, model) => AssistantMessage | Promise<AssistantMessage>` — a factory sees the transcript actually sent to the chat provider (after `context` handlers), which exposes the tail-appended text.
- **Seam for the classifier.** `createProvider({ id, auth, models, classifiers: { [api]: { classify(model, context, options) } } })` accepts a `ProviderClassifier` implementation keyed by `model.api` (`AI/models.d.ts` L225-263; `ProviderClassifier` at `AI/types.d.ts` L219-222). Models can be `type:"classifier"` entries in `models`. `ModelRuntime.registerNativeProvider(provider)` registers it (`model-runtime.d.ts` L115). The extension-level equivalent is `pi.registerProvider(name, { models:[{type:"classifier", id, api, baseUrl, input, cost, contextWindow}], classifiers:{ [api]: { classify } } })` (`docs/custom-provider.md` L101-117). A provider with a classifier lacking an implementation returns an error result (`AI/models.js` L654-660).
- **Existing taiknr harness.** `tests/app/extension/archive-session.test.ts` L104-157 builds a real `AgentSession` with `ModelRuntime.create({authPath, modelsPath:null, allowModelNetwork:false, refreshOnCreate:false})`, `modelRuntime.registerNativeProvider(faux.provider)`, `SettingsManager.inMemory`, `DefaultResourceLoader` with `extensionFactories`, `SessionManager.inMemory`, and `session.bindExtensions({onError})`. Prompting that session drives `context` for real (`transformContext` wiring above). A second native provider with id `openrouter` and a classifier model `~typesafe/jev-latest` would be reachable through `ctx.modelRegistry.findOfType`; I did not run this, and I did not verify the `ProviderAuth` shape needed for `createProvider` (see Unknowns).
- Calling `emitContext` directly is possible via `session.extensionRunner.emitContext(messages)` (`sdk.js` L281 shows the method; `agent-session.js` exposes `extensionRunner`) — not verified as public API.
- `ExtensionRunner.emit()`/`emitContext` use real clones, so a unit test that calls the handler directly with a hand-built `ctx` (`modelRegistry.findOfType`/`classify` stubs) is also structurally valid: `ExtensionContext` is a plain interface.

## Assumptions, Differences, and Unknowns

**Differences from the card's assumptions**
- Card: classify "one `bool` question per archived stub" — matches the API (`questions` is a map, "One call answers all of them", `codemode.md` L104); the card says "one question per stub", not "one call per stub". Both are permitted by the API.
- Card: "preserving any attached images or non-text blocks". The initial prompt is an array `[text, ...images]` (`agent-session.js` L1568-1573); the PoC overwrites `content` with a plain string, which would drop images. The type allows `string | (TextContent | ImageContent)[]`.
- Card: "fails open and notifies once per session via `ctx.ui.notify`". `classify` never rejects; failure is `stopReason !== "stop"` with `errorMessage`. A missing model is `undefined` from `findOfType`. In print and JSON modes `notify` is a silent no-op, so the notification is not visible there.
- Card: cost. Direct extension `classify` usage is not added to session totals by any code I found; only codemode's is (see §3).
- Card: "mid-run steering" key change — steering is a new user message with its own `Date.now()` timestamp (see §2), consistent with a changing key. A *new tool-loop step* does not change the latest `role:"user"` message.
- Docs vs `.d.ts`: `ClassifierContext.state` is `Record<string, unknown>` in docs, `JsonObject` in the `.d.ts`; `ClassifierResult` docs omit `api` and `timestamp`; `usage` type differs (`ModelUsage` in docs vs pi-ai `Usage`).

**Unknowns / unverified**
- Whether a changed `context` list keeps the provider-visible prefix byte-identical and cache-hitting: no doc statement; code shows the head system message is replayed and mid-conversation system messages are collapsed when the list changes (`runner.js` L101-105). Not tested.
- Retry re-firing of `context` is inferred from the call path, not documented.
- No documented limit on questions per classify call or state size for the OpenRouter Jev route.
- Whether any extension API can record classifier `usage` into session totals: none found; search was not exhaustive.
- `ProviderAuth` shape for `createProvider` and the exact way `registerNativeProvider` handles a second provider named `openrouter` alongside the built-in one: not read, not run.
- `session.extensionRunner.emitContext` as a public test entry point: not confirmed.
- OpenRouter-specific HTTP failure messages (rate limit, 4xx) for the classifier route: not inspected.

## Addendum — measured Jev round trip

Model: `openrouter` / `~typesafe/jev-latest` via `modelRuntime.classify` (from `createAgentSessionServices({cwd:"/tmp"})`, the same path as `test-jev-poc.mjs`). Run with `direnv exec`. One request per call, one `bool` question per archived output; stubs 180-370 chars of synthetic stub text; the user prompt differed per call. Calls were sequential: 5 at 5 outputs, then 5 at 30 outputs (10 total). Wall-clock was measured with `Date.now()` around the `classify` call. All 10 returned `stopReason:"stop"` with every question answered.

| Outputs | Durations (ms) | Median | Max | Input tokens | Output tokens | Cost / call (USD) |
|---|---|---|---|---|---|---|
| 5 | 361, 241, 237, 249, 230 | 241 | 361 | 1032 | 94 | 0.000043 |
| 30 | 240, 264, 253, 248, 231 | 248 | 264 | 4737 | 565 | 0.000199 |

- Token counts and cost were identical across the calls at each size. Cost has `totalFromProvider: false`, so it is computed from the catalog price (input 0.042/M, output 0), not reported by the provider.
- Errors: none. Retries: pi's own retry could not be observed directly, because `classify` is a single call and exposes no retry counter. No error was returned, and every call took under 400 ms. A hidden retry is unlikely at those durations, but I cannot prove it.
- Caveat: the first call at 5 outputs (361 ms) may include connection warm-up. Home network, 10 samples, a single time of day. This is not a tail-latency estimate; no timeout value is recommended.
- The throwaway script was deleted afterwards. No repository files were edited.

## Addendum — size bound and branch access

Installed pi 1.5.2, root `PI` = `.../pi-coding-agent`. No model calls. Quotes are from `PI/dist`. "Not found" means a search of types, agent-session.js and docs found nothing.

### 1a. Request token estimate from inside a handler

- Declaration (`core/extensions/types.d.ts` L217-223, L267-268):
  ```ts
  export interface ContextUsage {
      /** Estimated context tokens, or null if unknown (e.g. right after compaction, before next LLM response). */
      tokens: number | null;
      contextWindow: number;
      /** Context usage as percentage of context window, or null if tokens is unknown. */
      percent: number | null;
  }
  /** Get current context usage for the active model. */
  getContextUsage(): ContextUsage | undefined;
  ```
  It is on `ExtensionContext`, so a `context_with_system` handler gets it as `ctx.getContextUsage()`.
- Implementation (`core/agent-session.js` L2926, L3607-3641). It returns `undefined` when there is no model or `contextWindow <= 0`. Otherwise it reads the **session store**, not the handler's message list:
  - `projection = this.sessionManager.buildSessionProjection(); branch = this.sessionManager.getBranch();`
  - If the branch has a compaction entry and no non-aborted, non-error assistant with usage > 0 follows it, it returns `{ tokens: null, contextWindow, percent: null }`.
  - Otherwise `estimate = estimateProjectedContextTokens(projection, branch)` and it returns `{ tokens: estimate.tokens, contextWindow, percent: tokens / contextWindow * 100 }`.
- When the figure is provider usage and when it is an estimate (`core/compaction/compaction.js` L65-67, L110-169):
  - `estimateContextTokens(messages)` finds the last assistant message with usage. `tokens = calculateContextTokens(usage) + sum(estimateTokens(m) for messages after it)`, where `calculateContextTokens` = `usage.totalTokens || input + output + cacheRead + cacheWrite`. With no usage, every message is estimated.
  - `estimateTokens` is `Math.ceil(chars / 4)` per message (L201-240). Chars come from system content and sections, `JSON.stringify(toolsAdded)`, user/custom/toolResult text and image-char helper, and assistant text, thinking and `name + JSON.stringify(arguments)`.
  - `estimateProjectedContextTokens` (L137-169) **discards the usage-based figure** when the usage-bearing assistant entry sits at or before the latest `context_edit` or `compaction` entry on the branch (`latestInvalidatingEntryIndex`). It then returns a pure chars/4 estimate over `projection.messages`, with the current system message counted once.
  - So the figure is provider-reported usage plus a chars/4 estimate of trailing messages, or all chars/4 after any context edit or compaction.
- **What it does not cover.** The input is the persisted session projection. It does not include anything a `context` or `context_with_system` handler has added or removed for this request, nor a pending steering message not yet in the session. I found no accessor that returns the in-flight request's size. `ContextWithSystemEvent` carries only `{ type, messages }` (`types.d.ts` L708-711), with no token field. A handler can call the exported `estimateTokens`-style logic only if it imports it itself; none is exposed on `ctx` or `pi`.
- `_limitsModel()` (`agent-session.js` L365-367) = `this.routedModel?.model ?? this.model`: the window comes from the routed (virtual-model) physical model when there is one.

### 1b. `reserveTokens` / the threshold

- **Pi's threshold function** (`core/compaction/compaction.js` L173-177):
  ```js
  export function shouldCompact(contextTokens, contextWindow, settings) {
      if (!settings.enabled) return false;
      return contextTokens > contextWindow - settings.reserveTokens;
  }
  ```
  Callers: `agent-session.js` L476 (`_exceedsCompactionThreshold`: `shouldCompact(estimateProjectedContextTokens(projection, this.sessionManager.getBranch()).tokens, model.contextWindow, this.settingsManager.getCompactionSettings(this.model))`) and L2602 (post-response check, `shouldCompact(contextTokens, contextWindow, settings)`).
- **Settings resolution** (`core/settings-manager.js` L660-683): `getCompactionReserveTokens(model)` → `getCompactionTokenSetting("reserveTokens", model)` = `compaction.modelOverrides["<provider>/<id>"].reserveTokens ?? compaction.reserveTokens ?? DEFAULT`. Defaults: `reserveTokens: 16384` (`settings-defaults.js` L10; `compaction.js` L55). `enabled` is part of the same object, and when false `shouldCompact` is always false.
- **Reachability from an extension:**
  - `ctx` (`ExtensionContext`) has no settings accessor and no threshold accessor: not found in `types.d.ts` L233-273.
  - `pi.getSettings(): Settings` is declared "Get a copy of the effective settings (global and project settings merged, with overrides)" (`types.d.ts` L1330-1331), backed by `settingsManager.getSettings()` = `structuredClone(this.settings)` (`agent-session.js` L2897; `settings-manager.js` L329-331). It returns the **raw** `compaction` object (`enabled`, `reserveTokens`, `keepRecentTokens`, `modelOverrides` as stored, with absent keys left undefined). It does not apply the default (16384) or the per-model override resolution; an extension would have to repeat the `modelOverrides` → `reserveTokens` → default chain itself. `getCompactionSettings(model)` is on `SettingsManager`, which is not exposed on `ctx` or `pi` (not found).
  - Note the branch-summary setting `branchSummary.reserveTokens` is separate (`settings-manager.js` L685-688) and is not the compaction threshold.
- No resolved "compaction threshold" value is exposed anywhere an extension can reach: not found.

### 1c. Active model `contextWindow`

- `ctx.model: Model<any> | undefined` (`types.d.ts` L247). `Model` has `contextWindow: number` (declarations at L1541, L1558 are the provider-model definitions; the `Model` type is pi-ai's). `ContextUsage.contextWindow` (above) also returns it.
- Caveat: `ctx.model` is the selected model, while `getContextUsage()` and Pi's own threshold use `_limitsModel()` (`routedModel?.model ?? model`) at L365-367 for the usage window. `_exceedsCompactionThreshold(model, …)` takes the model passed by its callers; the virtual-model comment at L478 says a virtual selection is checked "against the model the request is routed to".

### 2. Branch access at request time

- **`ctx.sessionManager.getBranch()`.** `ExtensionContext.sessionManager: ReadonlySessionManager` (`types.d.ts` L243). `ReadonlySessionManager = Pick<SessionManager, "getCwd" | "getSessionDir" | "getSessionId" | "getSessionFile" | "getLeafId" | "getLeafEntry" | "getEntry" | "getLabel" | "getBranch" | "buildContextEntries" | "buildSessionProjection" | "getHeader" | "getEntries" | "getTree" | "getSessionName">` (`session-manager.d.ts` L178). `getBranch(fromId?: string): SessionEntry[]` (L318). It is the live session manager (`runner.js` L170, L205, L642-644), with no restriction by event; the docs show no handler-specific limit that I found. `buildSessionProjection()` (returning `SessionProjection { entries: ProjectedSessionEntry[]; messages; thinkingLevel; model }`) is also available.
- **`context_edit` entries are included.** `SessionEntry` is a union that includes `ContextEditEntry { type: "context_edit"; targetId: string; replacement: { content } | null }` (`session-manager.d.ts` L119-128). `getBranch()` returns raw append-only entries, and Pi itself scans `branchEntries[i].type === "context_edit"` in `estimateProjectedContextTokens` (L152-157). `getEntries()` returns all entries.
- **`ProjectedSessionEntry`** (L140-145): `{ sourceEntry: SessionEntry; messages: AgentMessage[] }`. "Raw append-only entry that owns this projected contribution", "Model-visible messages after context edits. Empty for state-only entries and omissions."
- **Is the branch at that moment the branch the request was built from?** Evidence only:
  - The in-flight request's messages come from `agent.state.messages` plus whatever `context`/`context_with_system` handlers do (`sdk.js` L277-282; `agent-loop.js` L266-270). Persistence is a separate step: on `message_end` the message is appended to the session (`agent-session.js` L819-826, after `_emitExtensionEvent`, L807). On `turn_end` boundary commits, `_commitBoundaryDrafts` appends the drafts to the session manager and then `_refreshFinalizedContext()` sets `this.agent.state.messages = projection.messages` (L625-632, L664-668), i.e. agent state is rebuilt from the same branch projection after edits. So at the start of the next request the agent state and `getBranch()` project the same entries by construction.
  - Not found: any statement or lock guaranteeing equality at the instant a `context_with_system` handler runs. Differences that code shows are possible: (1) a steering/follow-up user message dequeued into agent context in `agent-loop.js` L112-125 gets `message_end` persistence after it is emitted, so a handler runs after that message is in the request; I did not verify the ordering of `appendMessage` against the next request build; (2) `context` handlers can change the request list without changing the branch (non-destructive, §1 of the report); (3) a handler that mutates the session mid-run would diverge them.
  - Branch navigation (`/tree`) during a run: not examined.
- **Does the event payload carry source entries?** No. `ContextWithSystemEvent` is `{ type: "context_with_system"; messages: AgentMessage[] }` (`types.d.ts` L708-711); `ContextEvent` is `{ type: "context"; messages: AgentMessage[] }` (L695-702). Neither has `contextEntries`, `sourceEntry`, or entry ids. `AgentMessage`s in the list are `structuredClone`s, so they cannot be matched to entries by object identity.
- **`turn_end` does** carry them: `TurnEndEvent extends BoundaryState` with `entries: SessionBoundaryDraft[]`, `continue`, `context: BoundaryContextPreview`, `outcome`, plus `turnIndex`, `message`, `toolResults`, `messageEntryId`, `toolResultEntryIds` (`types.d.ts` L806-811, L848-855). `BoundaryContextPreview` = `{ contextEntries: ProjectedSessionEntry[]; contextMessages: AgentMessage[]; llmMessages: Message[]; pendingMessages: AgentMessage[]; canContinue: boolean }` (L798-805), built from `SessionManager.inMemory(..., [header, ...this.sessionManager.getBranch()])` with the drafts applied (`agent-session.js` L656-690). `agent_before_settle` has the same `BoundaryState`.
- **Matching messages to entries from inside `context_with_system`:** the only handles an extension has are `ctx.sessionManager.buildSessionProjection()` (entries with their `messages`) or `getBranch()`, then compare content/timestamps, since entry ids are absent from the event. `UserMessage.timestamp` and the message objects' fields survive the clone (report §2).

### Differences from earlier assumptions

- Earlier report said `ctx.signal`/`hasUI` only; `getContextUsage` is also on `ctx` and is session-based, so it is not the size of what this request will send after handler edits.
- `getContextUsage().tokens` can be `null` (after compaction before a new assistant response) and the whole result can be `undefined`.

### Not found / unverified

- Any accessor for the in-flight request's token estimate that includes handler edits: not found.
- Any `ctx`-level access to resolved `reserveTokens`, `enabled`, or the threshold: not found (only raw `pi.getSettings()`).
- A guarantee that `getBranch()` equals the branch the in-flight request was built from at `context_with_system` time: not found; construction suggests they match except for handler-made request changes. Not run.
- Whether `pi.getSettings()` is callable from inside a handler without restriction: declared on `ExtensionAPI` with no restriction noted; not run.

## Addendum — main model for the live script

Catalog: `.../pi-ai/dist/providers/data/openrouter.json` (installed pi 1.5.2). It is a nested JSON: `"openai-completions"` → `"chat:openai/gpt-4.1-nano"` → entry (the file is one long line, so there is no line number; cite by key path). The catalog has 403 chat entries.

**1. Pick: provider `openrouter`, model id `openai/gpt-4.1-nano`** (not Anthropic). Catalog entry: `"type":"chat"`, `"api":"openai-completions"`, `"baseUrl":"https://openrouter.ai/api/v1"`, `"provider":"openrouter"`, `"reasoning":false`, `"input":["text","image"]`, `"cost":{"input":0.1,"output":0.4,"cacheRead":0.03,"cacheWrite":0}`, `"contextWindow":1047576`, `"maxTokens":942818`. Non-reasoning, so no thinking-level handling in the script. Cheaper-input alternative: `openai/gpt-5-nano` (`cost.input 0.05`, `output 0.4`, `reasoning:true`, `contextWindow 400000`); also `openai/gpt-4o-mini` (0.15/0.6).

**2. Tool-call support in the catalog: no field.** The key set across all 403 OpenRouter chat entries is exactly `type, id, name, api, baseUrl, provider, reasoning, input, cost, contextWindow, maxTokens, compat (399), inputLimits (292), thinkingLevelMap (240)`. The `compat` keys seen are `thinkingFormat, supportsStrictMode, sendSessionAffinityHeaders, supportsDeveloperRole, forceAdaptiveThinking, cacheControlFormat, requiresReasoningContentOnAssistantMessages, supportsMidConvoSystemMessages, supportsTemperature, supportsMidConvoEffort`. None says "tools". The nearest catalog signals for `openai/gpt-4.1-nano` are `"compat":{"thinkingFormat":"openrouter","supportsStrictMode":true,"sendSessionAffinityHeaders":true}` and `"api":"openai-completions"`; `supportsStrictMode` concerns strict function schemas but is not a tool-support flag. So catalog tool support is **implicit** (pi uses the chat completions API with tools for every chat entry; no per-model gate was found). Live evidence that is explicit, from OpenRouter's own `GET /api/v1/models` for this id: `"supported_parameters":["max_completion_tokens","response_format","seed","structured_outputs","temperature","tool_choice","tools","top_p"]`, which includes `"tools"` and `"tool_choice"`. The same holds for `openai/gpt-5-nano` and `openai/gpt-4o-mini`.

**3. Reachability: yes.** Commands, all via `direnv exec /Users/joelleibow/Projects/taiknr`:
- `OPENROUTER_API_KEY` is set in that environment (checked non-empty; value not printed).
- `GET https://openrouter.ai/api/v1/models/user` with the key → HTTP 200, 432 models, and it lists `openai/gpt-4.1-nano`. `GET /api/v1/models` → HTTP 200, 432.
- One model call: `POST /api/v1/chat/completions`, `{"model":"openai/gpt-4.1-nano","max_tokens":1,"messages":[{"role":"user","content":"hi"}]}` → HTTP 200, `provider:"Azure"`, `finish_reason:"stop"`, usage `prompt_tokens 8, completion_tokens 10, cost 0.0000048`. The upstream provider ignored `max_tokens:1` (10 completion tokens), so do not rely on that cap. Model calls made: 1 of the 2 allowed. The tool-call path itself was not exercised.

Not done: no tool-call round trip; the catalog entry was not cross-checked against other provider routes (OpenRouter can route to different upstreams, which differ in tool behaviour). No repository files were edited; the downloaded model lists were written to /tmp and then deleted.
