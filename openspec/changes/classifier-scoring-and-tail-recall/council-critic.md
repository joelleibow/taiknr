{
  "assumptions": [
    {
      "assumption": "`context_with_system` handlers receive the per-request `structuredClone` (`currentMessages`), so editing in place cannot leak into `agent.state.messages` (runner.js L1014-1016, L1041-1045).",
      "status": "verified"
    },
    {
      "assumption": "pi-ai's `timeoutMs`/`maxRetries` pass from `ctx.modelRegistry.classify` through `ModelRuntime.prepareRequest` to `postClassifierRequest` unchanged (model-registry.js L92-94; model-runtime.js L470-471).",
      "status": "verified"
    },
    {
      "assumption": "The Jev route uses `postClassifierRequest`, so the native timeout applies (system-one-shared.js L136).",
      "status": "verified"
    },
    {
      "assumption": "Threshold compaction estimates from the persisted projection when context edits exist (agent-session.js L2580-2585), so request-only recall pushes it over the threshold only on sessions with no projected `context_edit`. Overflow recovery remains reachable either way.",
      "status": "verified"
    },
    {
      "assumption": "Node's `AbortSignal.timeout` clamps or rejects delays above 2^31-1 the way `setTimeout` does.",
      "status": "unverified"
    },
    {
      "assumption": "Jev latency grows with the number of archived items beyond 30.",
      "status": "unverified"
    },
    {
      "assumption": "`pi.getSettings()` is callable from inside a gated handler at event time (the gate Proxy passes every member except `on` straight through; handler-gate.ts).",
      "status": "verified"
    }
  ],
  "findings": [
    {
      "concrete_case": "Say the adapter passes `{ signal: AbortSignal.any([ctx.signal, AbortSignal.timeout(cfg.classifierTimeoutMs)]) }` and Jev hangs. At the timeout the result is `stopReason: \"aborted\"`. The use case then treats it as a user cancel and shows no warning, which violates 'a call abandoned at its timeout SHALL ... report at most one ctx.ui.notify warning'. Second case: a provider whose credential resolution makes a network call (OAuth refresh, credential command) can stall before the timeout starts, which breaks 'goes out without recall after that timeout rather than after the host's own limits'.",
      "finding": "How the timeout is carried decides whether the spec can be met. pi-ai already has a per-attempt `timeoutMs` and `maxRetries` in `ProviderRequestOptions` (pi-ai types.d.ts L92-105). That native timeout produces a TimeoutError, which comes back as `stopReason: \"error\"`. If the adapter builds the timeout itself, by combining `AbortSignal.timeout(ms)` with `ctx.signal` and passing the result as `signal`, it comes back as `stopReason: \"aborted\"`. Separately, request-time auth resolution (`prepareRequest`, which calls `getAuth`, at model-runtime.js L459-469) runs before `postClassifierRequest`. `timeoutMs` therefore does not cover it.",
      "id": "C1",
      "location": "specs/tail-recall/spec.md 'The classifier and its timeout come from the session's config at event time' and 'A failure fails open' (timeout vs cancel); pi-ai dist/api/classifier-shared.js L47-70; system-one-shared.js L145-148",
      "rationale": "system-one-shared.js L146 sets `stopReason = options.signal.aborted ? \"aborted\" : \"error\"`. classifier-shared.js L63-64 throws `Request timed out after Nms` only when the timeout fired and the caller's own signal did not. S4 maps `aborted` to 'no notice'.",
      "recommendation": "Specify that `score` passes `{ signal: ctx.signal, timeoutMs: config.classifierTimeoutMs, maxRetries: 0 }` and never builds its own timeout signal. Then a timeout is an `error` with a message that names the bound, and only a real Escape is `aborted`. The design should either state that auth resolution is unbounded (fine for openrouter with an environment key, where it is instant) or add an outer guard. Test the mapping with a scripted classifier that never resolves.",
      "severity": "major"
    },
    {
      "concrete_case": "`defaultDecisionModel: \"~typesafe/jev-latset\"`. The adapter returns `undefined`. The use case knows only 'no scores', so it can show neither the model name nor `defaultDecisionModel`. The scenario cannot pass without a contract change the specs do not list.",
      "finding": "The spec requires the notice to name the provider, the model, the config field and the reason. The locked port `RelevanceScorer.score(...) → Promise<RelevanceScore[] | undefined>` cannot carry any of that to the use case, which is where fail-open and `notifyOnce` live (S10). `createPiJevScorerAdapter(ctx, config)` gets no notifier, so the adapter cannot send the notice itself either.",
      "id": "C2",
      "location": "specs/tail-recall/spec.md Scenario 'The notice says what to fix'; src/use-cases/ports.ts (RelevanceScorer, FailureNotifier); src/use-cases/recall-relevant-context.ts; proposal O3",
      "rationale": "D15 and the `extension-packaging` requirement fix adapter and port contracts against `HEAD`. A single `undefined` already loses the cancel/failure distinction (T4), and it also loses the reason text. The reason is only known in the adapter: `findOfType` returned undefined, `errorMessage`, or 'Request timed out after N ms'.",
      "recommendation": "For O3, choose a mapping that keeps the port's type. `score` resolves `undefined` only on cancel. On every failure it rejects with an Error whose message the adapter builds, naming provider, model, field (`defaultDecisionModel` or `classifierTimeoutMs`) and reason. The use case catches it and calls `notifyOnce(err.message)`. A rejected promise fits `Promise<RelevanceScore[] | undefined>`, so no port delta is needed. The use case also does not write a cancelled key to the cache, so a later request under the same key can still score.",
      "severity": "major"
    },
    {
      "concrete_case": "Case 1: Joel sets `compaction.modelOverrides[\"anthropic/claude-opus-5-5\"].reserveTokens = 60000`, and the design reads only `compaction.reserveTokens` or hardcodes 16384. Recall then fills about 44k tokens past pi's real threshold. Case 2: on the first prompt after a compaction, `getContextUsage().tokens` is null, so the budget is undefined. Case 3: a request near 90% of the window, mostly JSON at about 3 chars per token, is underestimated by about 25%. The recall then overflows the window, and pi persists a compaction for a request whose recall was meant to be request-only.",
      "finding": "The size bound has no defined inputs, and the claim 'no request this change builds triggers the host's overflow recovery' is stronger than any chars/4 estimate can support. Four gaps: (a) `reserveTokens` is not on `ExtensionContext`. pi resolves it as `compaction.modelOverrides[\"provider/id\"].reserveTokens` → `compaction.reserveTokens` → 16384 (settings-manager.js L654-683), and it is reachable only through `pi.getSettings()`. (b) `ctx.getContextUsage()` returns `tokens: null` after a compaction until the next response, and `undefined` when there is no model or the context window is 0 (agent-session.js L3607-3636). (c) That figure is estimated from the persisted projection, not from the request taiknr is building. (d) pi's own chars/4 estimate (compaction.js L201-248) undercounts tokenizer-dense code and JSON.",
      "id": "C3",
      "location": "specs/tail-recall/spec.md 'Recall stops before the host's compaction threshold'; proposal 'Recall stops before the host's compaction threshold'",
      "rationale": "Joel's Q3(b) asks for a bound before the threshold. A bound computed from a guessed reserve, or from a stale or null usage figure, either recalls nothing or overshoots. Overshooting into the window gives an explicit overflow, then `_runAutoCompaction(\"overflow\")`, which persists a compaction (agent-session.js L2529-2570).",
      "recommendation": "The design should name each input. Context window: `ctx.model.contextWindow`. Reserve: from `pi.getSettings()` with the same override chain. Current size: estimated from the event's own `messages`, system messages included, so it covers this request. Add an explicit safety margin, and define the behaviour when there is no model, no window, or no estimate: recall nothing. Change 'never triggers' to 'stays under the threshold by pi's own estimate, with margin M'. Put the fit rule in a pure domain function that the use case calls with a budget passed in. `appendRecalledContextToMessages`'s locked signature leaves no room for it in the adapter.",
      "severity": "major"
    },
    {
      "concrete_case": "Opus 5.5 at 900k estimated tokens. The first request recalls items A, B and C (40k). A tool step adds 30k of output. If the bound is re-run, C is dropped, the block at U changes, and about 70k tokens after U are written to cache again at $5/M. If it is not re-run, the request reaches about 970k and passes the threshold of window minus reserve.",
      "finding": "The spec says nothing on whether the size bound is applied once per key or on every request. Within a key's tool loop, each request is larger than the one before. If the bound is recomputed per request, the recalled set can shrink part-way through the turn. The bytes at the latest user message then change, the cached prefix diverges there, and the whole turn after it is written to cache again. The model also loses content it was working from. If the bound is applied only on the first request, later steps can grow past the threshold with the recall still attached.",
      "id": "C4",
      "location": "specs/tail-recall/spec.md Scenarios 'One turn's requests score once' and 'An archive larger than the budget'; proposal O2",
      "rationale": "T1 and S1 exist to protect the cached prefix. A recall block that changes between requests under one key reintroduces the same cost one message later. 'Each of the three requests carries the recall built for that key' implies the block is stable, but the bound requirement does not say so.",
      "recommendation": "The design should pick one rule and state its trade-off. Recommended: fix the recalled ids and the block's bytes when the key is first scored, and reuse them on every request under that key. Drop the whole block (never just part of it) only when a later request would otherwise pass the threshold. Record the cost as one cache rewrite at that point. Write a use-case test where the second request under a key is larger than the first.",
      "severity": "major"
    },
    {
      "concrete_case": "A secrets-scrubbing extension masks `sk-…` patterns in tool results on every `context` event. A `cat .env` output is archived raw at turn_end. The run settles and the output is stubbed. Next turn, the classifier selects it, and taiknr appends the unmasked raw text after the scrubber has run. The key goes to the main provider in the user role.",
      "finding": "Under S1, taiknr's recall runs in the `context_with_system` phase, after every extension's `context` handler has already run (runner.js emitContext: the `context` loop runs first, then the `context_with_system` loop). A request-time redactor that scrubs tool output on `context` therefore never sees the raw text taiknr appends. S9's branch check covers persisted `context_edit` redactions only. 'Another extension's redaction is never undone' is broader than what the design delivers.",
      "id": "C5",
      "location": "proposal 'Recall yields to edits taiknr did not write'; specs/tail-recall/spec.md 'Recall yields to edits taiknr did not write and to items off the branch'; pi runner.js L1014-1060",
      "rationale": "Moving to `context_with_system` is settled and justified (T1), but it fixes taiknr's place in the chain after all `context` transforms. Under `context` that place depended on load order. Under `context_with_system` it is guaranteed, so the bypass is guaranteed too.",
      "recommendation": "Don't reopen S1. Narrow the claim in the proposal, the spec and the new ADR to 'persisted `context_edit` redactions are never undone; request-time `context` transforms by other extensions do not see recalled text'. Record it as a known limitation and an operator decision: users who run a request-time redactor should know recall bypasses it. Docs pass: also add it to ARCHITECTURE.md §7.",
      "severity": "major"
    },
    {
      "concrete_case": "The default is set to 1000 ms. At 250 archived items, Jev takes about 1.2 s. Every new prompt waits 1 s, then goes out without recall. The user sees one warning on the first prompt and nothing after it. Recall is effectively off for the session with no further signal.",
      "finding": "The default is to come from 10 sequential calls at 5 and 30 items, with a maximum of 361 ms, measured at home at one time of day. Latency against archive size is not measured past 30 items, about 4.7k input tokens. Q6 itself projects 300 items, about 48k tokens. A default tight to the measured maximum will time out more and more as the branch grows. After the single notice, every later key fails silently. A persistently hung classifier also adds the full timeout to every new user message for the rest of the session.",
      "id": "C6",
      "location": "specs/configuration/spec.md 'The classifier call's timeout is a field…'; research-chidi.md Addendum",
      "rationale": "Joel accepted one call per new user message (Q6) and one notice per session (Q4). The latency cost of a classifier that keeps failing is not stated anywhere.",
      "recommendation": "Choose a default with an order of magnitude of headroom over the measured maximum, or take one more measurement at about 300 items before settling the number. The failure notice should name `classifierTimeoutMs` so the user can raise it. The design should state the per-message latency cost when the classifier is down (see owner question).",
      "severity": "minor"
    },
    {
      "concrete_case": "A custom classifier returns `{stopReason:\"stop\", answers:{}}`. If the adapter maps a missing answer to probability 0, then with `decisionThreshold: 0` the `>=` rule selects every item, and the whole archive is recalled for an unscored key.",
      "finding": "The classifier's answers come from outside taiknr. For Jev, pi-ai's System One parser already turns a missing or non-bool answer into `stopReason: \"error\"`. But `defaultDecisionModelProvider` can be any registered provider, including the one the tests register, and a custom `classify` can return `stopReason: \"stop\"` with answers missing, or with a probability that is not a finite number in [0, 1].",
      "id": "C7",
      "location": "specs/tail-recall/spec.md 'Selection is the threshold rule over the answers' (threshold 0 selects every scored item); pi-ai system-one-shared.js parseAnswers L13-60",
      "rationale": "Joel's standing ruling is no fallback to defaults. Validation belongs at the trust boundary, and `decisionThreshold: 0` is valid.",
      "recommendation": "The adapter keeps only answers of the form `{type:\"bool\", probability}` with a finite probability in [0, 1], for ids it asked about. The design decides whether any missing or invalid answer fails the whole call (with the notice) or only drops that item. A missing answer must never become probability 0. Write one adapter test with a partial answer at threshold 0.",
      "severity": "minor"
    },
    {
      "concrete_case": "`classifierTimeoutMs: 3000000000` passes validation. Every classify call then fails with 'Request timed out after 3000000000ms' after about 1 ms, and recall never works.",
      "finding": "The rejection list catches 0, -1, 1.5, 1e999 and \"8000\". It has no upper bound. `Number.isInteger(1e21)` is true. Node timers clamp a delay above 2147483647 to 1 ms. I did not run it, but expect `AbortSignal.timeout` to behave the same way: a huge accepted value would make every call time out almost at once.",
      "id": "C8",
      "location": "specs/configuration/spec.md Scenario 'A value that is not a positive integer'",
      "rationale": "A strict edge should not accept a value that silently turns into 'always fail'.",
      "recommendation": "Also reject values above 2147483647 (or require `Number.isSafeInteger` and at most 2^31-1), and add that case to the rejection scenario.",
      "severity": "minor"
    },
    {
      "concrete_case": "A local-only oMLX user with `OPENROUTER_API_KEY` set in their shell runs `cat .env`. The stub's preview holds the first line, `API_KEY=…`, and that line goes to OpenRouter on every later prompt in the session.",
      "finding": "The disclosure claim overstates what is kept back. Each stub carries `argsSummary` (up to 120 units) and a preview of the raw text's first three lines (up to 180 units). Every new user message sends the prompt plus every stub on the branch to OpenRouter. That includes sessions whose main model is local, because `enabled: true` and `openrouter` are the defaults.",
      "id": "C9",
      "location": "proposal 'One classifier call per key…' ('never the archived payload'); src/domain/archived-output.ts buildStub",
      "rationale": "Feature-spec §6 asks for calibrated claims. T13 flagged the data flow, and ARCHITECTURE §7 will need the exact boundary.",
      "recommendation": "Keep S2. Reword the claim as 'the prompt and each stub: tool name, a 120-unit argument summary and a 180-unit preview of the raw text; never the full raw text'. Docs pass: README and ARCHITECTURE §7 should say plainly that prompts leave the machine by default.",
      "severity": "minor"
    }
  ],
  "lens": "council-critic",
  "mode": "council",
  "not_checked": [
    "Jev latency or answer quality above 30 archived items (needs a model call)",
    "Whether pi's compaction summarization call also triggers `context` / `context_with_system` handlers",
    "How Node actually behaves with `AbortSignal.timeout` above 2^31-1 (not run)",
    "Anthropic cache-breakpoint placement against a trailing recall block (no serialized payload inspected)",
    "What RPC mode does with `notify`",
    "Whether `estimateTokens` is exported from the package root for use in an infra adapter"
  ],
  "owner_questions": [
    {
      "options": [
        "(a) Keep calling on every new key. A transient failure recovers on its own, but a hung classifier adds up to `classifierTimeoutMs` to every new prompt, silently after the first notice.",
        "(b) Stop calling for the rest of the session after the first failure. No repeated latency cost, but a single network blip turns recall off until the session reloads."
      ],
      "question": "After the classifier fails once in a session (timeout or error), should later new keys keep calling it?",
      "recommended_option": "(a), with the latency cost stated in the design",
      "why": "It needs no new state and matches Joel's rulings: no retry per key (Q2), one notice per session (Q4). It is reversible once the Status card can show failures. The design must still state the per-prompt latency cost, because users will see it."
    }
  ],
  "paraphrase_existing": "",
  "paraphrase_proposes": "",
  "recommendation": "Nothing blocks. The approach can run on pi 1.5.2. The design still has to settle five things before it can be drafted: (1) how the timeout is carried, so a timeout is not mistaken for a user cancel; (2) how the failure reason reaches the notice through the locked port; (3) where the size budget's numbers come from, and how much safety margin it keeps; (4) keeping the recall block byte-identical across all requests that share one prompt; (5) narrowing the 'redaction is never undone' claim. Recall now runs after every `context` handler, so request-time redactors never see the recalled text. The timeout default, answer validation, the timeout's upper bound and the claim about what is sent to OpenRouter are minor fixes in the design."
}