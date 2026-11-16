{
  "mode": "council",
  "lens": "council-codebase",
  "paraphrase_proposes": "",
  "paraphrase_existing": "",
  "recommendation": "Proceed to design. I verified every current-state citation in the proposal against the tree at 22113ac and all hold except one: `selectRecalledIds` has no test anywhere under `tests/`, so the proposal's \"keeps ... its pure test\" is false and that test is a Create, not a keep. Four seams the design must settle are already forced by live contracts rather than free choices: the once-per-session notifier cannot be built in the composition root (no ctx is reachable there and the context registrar's deps are frozen), a classifier timeout arrives as `stopReason: \"aborted\"` exactly like the user's Escape while the port has only one hole, the compaction bound's only host source is nullable (`tokens: null` on the first request after a compaction, `undefined` with no model), and adding `classifierTimeoutMs` breaks four named test/source sites the plan does not list. None of the behaviour Joel ruled is reopened; the debuggability points are consequences to state, not decisions to revisit.",
  "findings": [
    {
      "id": "CB-1",
      "severity": "major",
      "location": "proposal.md \"What Changes\" bullet *The once-per-session failure notice* and Impact line for `src/app/extension/taiknr.ts`; `src/infra/pi-event-handlers/context.ts` L6-16; `src/use-cases/ports.ts` L27-31; `openspec/specs/extension-packaging/spec.md` L53-58",
      "finding": "The proposal says `createOncePerSessionNotifier` is wired into the composition root \"with its `getCtx` the current event's\", which cannot be built: the composition root (`taiknr.ts` L30-58) runs once per factory call and receives only `pi`, and `ExtensionAPI` has no member that yields an `ExtensionContext` (`dist/core/extensions/types.d.ts` L1228-1300 — every entry is `on(...)`, `registerTool`, `registerCommand`, ...). The `FailureNotifier` port has one member, `notifyOnce(message)`, so nothing can be set on it later; the context registrar's deps object `{config, store, notifier, recallCache}` is frozen against HEAD by the living spec (\"the other members of both objects unchanged\"), so the handler cannot be handed a ctx holder either. `taiknr.test.ts` L6-11 additionally throws on any factory-time `ExtensionAPI` member but `on`.",
      "rationale": "This is O1, but the proposal does not leave it open — it pre-decides a wiring that has no legal implementation. A coder following the proposal produces either a notifier that warns on every provider request (three per tool-loop turn, since `context_with_system` fires before each LLM call) or one whose `getCtx()` was never assigned, which throws on the first failure inside the fail-open path and then, because the flag is already set, is silent for the rest of the session.",
      "concrete_case": "Mistyped `defaultDecisionModel`. Composition root creates `createOncePerSessionNotifier(() => currentCtx)`; no code path can ever assign `currentCtx`, so `getCtx().ui` reads `undefined.ui` and throws. The throw escapes `recallRelevantContext`'s fail-open branch, `emitContext` catches it and reports `event: \"context_with_system\"` through Pi's extension-error channel, and the required message naming the provider, model, `defaultDecisionModel` and reason never appears — nor does it ever appear again for that session.",
      "recommendation": "Settle O1 as: keep `registerContextHandler`'s deps unchanged, drop the `taiknr.ts` impact line, and have `src/infra/pi-event-handlers/context.ts` call `createOncePerSessionNotifier(() => currentCtx)` once at registration with a `let currentCtx` it assigns from each event before any work — flag per factory call (D13) and ctx per event both hold, and the injected `notifier` dep stays unused for signature compatibility. State that in the design so no task asks for the composition-root wiring."
    },
    {
      "id": "CB-2",
      "severity": "major",
      "location": "specs/tail-recall/spec.md *The classifier and its timeout come from the session's config at event time* (scenario *The timeout bounds the wait*) and *A failure fails open, with one notice in the session* (scenarios *A cancel is not reported*, *An error answer*); `src/use-cases/ports.ts` L21-27; pi-ai `dist/utils/model-operations.js` L42-52",
      "finding": "A timeout and the user's Escape are indistinguishable in the classifier result. `ModelRuntime.classify` returns `classifierErrorResult(model, error, options?.signal?.aborted)` (`model-runtime.js` L568-580), and that helper sets `stopReason: aborted ? \"aborted\" : \"error\"` with `answers: {}`. An adapter that aborts through a timeout signal therefore yields `stopReason: \"aborted\"` — the same value the spec reserves for \"report nothing\". The locked port `RelevanceScore[] | undefined` has one hole and must express both outcomes.",
      "rationale": "O3 names the mapping but only in terms of \"missing model, error answer and abort\", which reads as if a timeout lands in the error bucket. It does not. Whoever implements `score` will naturally map `stopReason !== \"stop\"` to `undefined` and silence both, satisfying the cancel scenario and silently violating the timeout scenario — the one case Joel's Q2 exists to make visible. The mismatch also has an operational edge: a timeout is the failure a user is most likely to hit and the least likely to be told about.",
      "concrete_case": "`classifierTimeoutMs: 8000`, Jev hangs behind a slow connection. `classify` returns `{answers:{}, stopReason:\"aborted\", errorMessage:\"The operation was aborted\"}` after 8 s. `score` maps aborted to `undefined`; the use case treats `undefined` as cancel and calls nothing, so the request goes out with no recall and no notice, and the user's next four turns behave the same way — all silent.",
      "recommendation": "Pin the mapping in the design and name the mechanism: the adapter records its own `timedOut` boolean, maps a timeout to `undefined` (a failure, so the use case notifies) and maps a user cancel to `[]` (scored nothing, so the use case stays silent). Add the two boundary cases to the adapter test — combined signal via `AbortSignal.any([ctx.signal, AbortSignal.timeout(ms)])`, one case where `ctx.signal.aborted` is true and one where only the timeout fired."
    },
    {
      "id": "CB-3",
      "severity": "major",
      "location": "specs/tail-recall/spec.md *Recall stops before the host's compaction threshold*; proposal.md bullet *Recall stops before the host's compaction threshold*; `src/use-cases/recall-relevant-context.ts` L6-24 (deps carry no budget); pi `dist/core/extensions/types.d.ts` L217-223 and L256-260, `dist/core/agent-session.js` L3607-3637",
      "finding": "The spec's size bound is unconditional but the host's only size source is nullable in two reachable cases, and the plan names no source at all. `ctx.getContextUsage()` returns `undefined` when there is no model or `model.contextWindow <= 0`, and returns `{tokens: null, window, percent: null}` on the first request after a compaction with no post-compaction assistant usage (`agent-session.js` L3618-3631). The use case's deps `{store, scorer, notifier, cache}` carry neither the context window nor the budget, and `RecallRelevantContextInput` has no budget field, so the bound can only be applied if the handler computes one and passes it. The proposal's Impact list mentions no file that computes it.",
      "rationale": "The behaviour Joel chose (Q3(b)) exists to prevent one persisted compaction followed by a failed turn. Both unknown-size cases are exactly the moments when a large recall is most tempting and least bounded: right after a compaction taiknr's archive is at its fullest (D5), and `decisionThreshold: 0` is a valid setting. Left unstated, the coder either re-derives a chars/4 estimate in the use case (the same shortcut D2 exists to assess) or treats unknown as zero and recalls everything.",
      "concrete_case": "Session compacts with `keepRecentTokens: 0`; the user's next prompt is scored with `decisionThreshold: 0` against Joel's 266,619-char archive. `getContextUsage()` returns `tokens: null`, the bound cannot be computed, and the first request carries the whole archive inside `<recalled_context>` — passing the threshold, triggering Pi's overflow recovery, persisting a compaction and then failing the turn.",
      "recommendation": "Have the design name Pi's own primitives instead of a local estimate: compute the budget in the pi-aware layer with `ctx.getContextUsage()` and Pi's exported `shouldCompact(contextTokens, contextWindow, settings)` / `DEFAULT_COMPACTION_SETTINGS.reserveTokens` (16384), size the candidate block with Pi's exported `estimateTokens`, and pass one plain budget number into the use case (the input shape is not among the shapes D15 freezes). Add a scenario and adapter test for `tokens === null` and `undefined` and state the behaviour (see owner question)."
    },
    {
      "id": "CB-4",
      "severity": "major",
      "location": "proposal.md bullet *Selection is the existing threshold rule*; `src/domain/recall.ts` L13-15; `tests/` (whole tree, case-insensitive `ecall` grep: no matches)",
      "finding": "The proposal says `selectRecalledIds` \"keeps its `>=` and its pure test\". The function's body is real at `src/domain/recall.ts` L13-15, but no test anywhere under `tests/` mentions `selectRecalledIds`, `formatRecalledContext` or `recallRelevantContext`. The only domain test is `tests/domain/archived-output.test.ts`.",
      "rationale": "The `development-checks` requirement satisfied today is \"at least one\" pure function test, and `shouldArchive` fills it. So the selection rule's `>=`, its `decisionThreshold: 0` case and the \"probability at the threshold\" scenario in the delta spec have no coverage to preserve — a coder told to keep a test will look for one and find nothing, and the zero-decision rule is broken by a claim the plan cannot verify. Under the ready-before-implemented rule this is also the cheapest red-first test in the change.",
      "concrete_case": "A coder writes `recallRelevantContext` and asserts selection inline. Nothing pins `>=` versus `>`: a later refactor to `>` silently drops an item whose probability equals `decisionThreshold`, which the delta spec's first selection scenario forbids, and `decisionThreshold: 0` no longer selects a scored item with probability 0.",
      "recommendation": "Correct the proposal sentence and make `tests/domain/recall.test.ts` a Create whose first cases are the three the delta spec lists (equal to the threshold selected, one below not selected, threshold 0 selects everything), plus `formatRecalledContext`'s delimiter case. Do not touch `selectRecalledIds`'s body."
    },
    {
      "id": "CB-5",
      "severity": "major",
      "location": "proposal.md Impact (\"New tests beside the layer each exercises\") and Deliberately-not-in-this-change; `src/config/taiknr-config.ts` L3-9, L11-20, L45-58, L70-80; `tests/app/extension/handler-gate.test.ts` L6-14; `tests/config/session-config.test.ts` L8-15; `tests/config/taiknr-config.test.ts` L188-203; `tests/app/extension/taiknr.test.ts` L19-27",
      "finding": "Adding `classifierTimeoutMs` and moving the registration to `context_with_system` break four existing test files that the Impact list does not name as Modify targets. (1) `TaiknrConfig` is a closed interface with a `FIELD_RULES` mapped type over `keyof TaiknrConfig` and an explicit object literal in `loadTaiknrConfig`, so the new field forces edits in `src/config/taiknr-config.ts` at three places — good, but the *tests* break too: `handler-gate.test.ts` L6-14 and `session-config.test.ts` L8-15 declare `const config: TaiknrConfig = {...}` with five fields (typecheck fails), and `taiknr-config.test.ts` L188-203 asserts `toEqual({decisionThreshold, defaultDecisionModel, defaultDecisionModelProvider, minCharsToArchive, enabled})` on a loaded config (runtime failure once the sixth key arrives). (2) `taiknr.test.ts` L19-27 asserts the sorted event list contains `\"context\"`, so it fails the moment S1 lands.",
      "rationale": "`npm run check` runs lint, then typecheck, then tests, so a plan that misses these files fails the gate in the middle of a task group and leaves the tree red between commits. The readiness standard requires every Modify target to be marked; these are Modify, not Create.",
      "concrete_case": "Task group lands `src/config/taiknr-config.ts` with the new field and new tests beside it. `tsc --noEmit` fails on `handler-gate.test.ts:6` and `session-config.test.ts:8` (\"property 'classifierTimeoutMs' is missing\"), and once those are patched `vitest run` fails `taiknr-config.test.ts` L188's `toEqual`. Separately, the registration move fails `taiknr.test.ts` before any recall code exists.",
      "recommendation": "Add four Modify rows to the design's file boundary: `tests/app/extension/taiknr.test.ts` (expected list gains `context_with_system`, loses `context`, and the test name's \"seven\" stays true), `tests/app/extension/handler-gate.test.ts` and `tests/config/session-config.test.ts` (config literal gains the field), `tests/config/taiknr-config.test.ts` (the `toEqual` literal, plus rejection rows for `0`, `-1`, `1.5`, `1e999`, `\"8000\"` and the default/override/layering cases). Note in the design that the `FIELD_RULES` mapped type is a compile-time forcing function for the new validation rule, so the rule cannot be forgotten."
    },
    {
      "id": "CB-6",
      "severity": "major",
      "location": "`src/infra/adapters/pi-notifier-adapter.ts` L5-14; specs/tail-recall/spec.md *A failure fails open, with one notice in the session*; proposal.md bullets *The notice keeps the channel Joel chose* and *Recall writes nothing*",
      "finding": "The session's only diagnostic is consumed by the first failure of any kind, and the existing notifier can burn it without ever showing a message. `createOncePerSessionNotifier` sets `warned = true` *before* `getCtx().ui.notify(...)`; `ctx.ui` asserts the runner is active (`runner.js` L626-629), so a throw from that call leaves the flag set and the notice unsent. Separately, the message content is the only place a failure reason can reach a human — `ClassifierResult.errorMessage` is the sole carrier of it (`model-operations.js` L42-52) and the locked `RelevanceScore[] | undefined` discards it — while nothing is logged, nothing is persisted, and the timeout is bounded by a config default measured on ten calls.",
      "rationale": "Joel ruled one notice per session (Q4 a) and no logging (D11), so I am not reopening either. But the combination makes the first failure decisive for the whole session: a tight or unlucky `classifierTimeoutMs` default, a 429, or a transient network error at 09:00 silences a genuine misconfiguration at 10:00 for the rest of the session, with no log, no session entry and no spend line to look at (Chidi §3: a direct `classify` usage is never added to session totals). Two of the three improvements cost nothing and belong inside existing shapes.",
      "concrete_case": "First request of a session times out at the configured 250 ms because of a cold TLS handshake (the measured max was 361 ms on a warm connection). The warning appears once. The user then typo-fixes nothing, `/reload`s nothing, and every later turn recalls nothing silently; `RecallCache.lastRecalledIds` reads `[]`, which is identical to \"scored and selected nothing\".",
      "recommendation": "Three cheap pins for the design: (1) compose the notice from the values that exist at failure time — provider, model id, the literal config field name (`classifierTimeoutMs` when a timeout fired, `defaultDecisionModel` when the catalog lookup missed), the timeout value in ms, and `errorMessage` forwarded through whatever channel the design picks for O3 — plus one clause saying later failures this session stay silent; (2) set `warned` after the `notify` call returns, so a throw cannot consume the notice; (3) pick a default with headroom over the measured 361 ms max and say so, because an over-tight default is silent forever after the first turn."
    },
    {
      "id": "CB-7",
      "severity": "minor",
      "location": "specs/tail-recall/spec.md *Recall yields to edits taiknr did not write and to items off the branch*; `src/infra/adapters/pi-archive-adapter.ts` L55-65 (taiknr's own replacement shape) and L123-133 (`readArchiveBatchesFromBranch`); pi `dist/core/session-manager.d.ts` L17-22 and L119-126",
      "finding": "S9's check cannot use author metadata: `ContextEditEntry extends SessionEntryBase`, which carries only `type`, `id`, `parentId` and `timestamp` — no extension name or author. So \"the latest `context_edit` is the stub taiknr wrote\" must be a content comparison, and the comparison is not against the replacement as a whole: taiknr writes `[{type:\"text\", text: item.stub}, ...non-text blocks]` (`toSettlementDrafts` L62-74), so a tool result that carried an image has a replacement whose first block is the stub and whose length is greater than one. There is also no existing helper that returns the latest edit per `targetId`; `readArchiveBatchesFromBranch` yields batches only.",
      "rationale": "O5 is open, and its phrasing (\"read the active branch per scored key, and compare the latest edit with `item.stub`\") hides these two details. A naive whole-content comparison drops every item that had an image, which is the case `archive-session.test.ts` L199-224 already exercises for the write side.",
      "concrete_case": "A `big_out` result carrying a 700-char text and a PNG is archived; its `context_edit.replacement.content` is `[{text: STUB}, IMAGE]`. The recall path compares `replacement.content` to `item.stub` with `===` or `JSON.stringify`, gets a mismatch, and never recalls any item that had a non-text block — silently, per S9.",
      "recommendation": "In the design, state the check as: the id is present in `getBranch()`, and the branch's latest `context_edit` for that `targetId` has a non-null `replacement` whose text block equals `item.stub` — text block, not the array. Name where that helper lives (a new export beside `readArchiveBatchesFromBranch`), and mention Pi's exported `projectContextEntry`/`buildSessionProjection` as the alternative if the design prefers to compare the projected content instead of the edit."
    },
    {
      "id": "CB-8",
      "severity": "minor",
      "location": "specs/tail-recall/spec.md *Recall writes nothing*; `src/use-cases/recall-relevant-context.ts` L12-15 (`RecallCache`); proposal.md bullet *Recall writes nothing* (deferred status readout)",
      "finding": "`RecallCache {lastPromptKey, lastRecalledIds}` cannot distinguish the three states an operator needs: not yet scored, scored and selected nothing, and scored and failed. All three read as `lastRecalledIds: []`, and a key that is written only on success makes \"not scored\" and \"failed\" identical too. Nothing else is written — no session entry, no log, no printed line — and the classification of a request is not derivable after the fact from any surface.",
      "rationale": "T14 and D11 are settled, so this is not an argument for logging. It is the minimum needed for the deferred Status card to answer \"was recall even attempted?\" without a persistence change, and the cheapest version of it is a contract on *when* the cache key is written — a rule the use case's own body owns and no spec constrains.",
      "concrete_case": "A user reports \"recall never works\". With the key written only on success, `lastPromptKey` is empty and `lastRecalledIds` is empty whether the handler never ran, the classifier failed, or every probability sat below the threshold. The status card cannot tell them apart, so triage falls back to reading the source.",
      "recommendation": "State in the use case's contract that `cache.lastPromptKey` is set on every scored request, including a failed one, and `lastRecalledIds` is set to the selected ids on success and left as the empty list on failure. One sentence, no shape change, no persistence."
    },
    {
      "id": "CB-9",
      "severity": "minor",
      "location": "`tests/support/fake-pi.ts` L43-52 (`createContextStub`); `tests/app/extension/archive-session.test.ts` L104-158 (harness), L245-262, L334-341; `src/app/extension/taiknr.ts` L42-50",
      "finding": "The two harnesses that the recall tests must extend lack the seams S7 assumes. `createContextStub` provides only `cwd`, `isProjectTrusted` and `sessionManager` — no `ui.notify`, no `modelRegistry`, no `getContextUsage` — so a handler-level recall test cannot assert the notice without extending it. The session harness registers only the faux chat provider, writes no agent config file (tests write the *project* file at L363-364; the agent path is `resolve(getAgentDir(), CONFIG_FILE_NAME)`, `session-start.ts` L18, so `<agentDirectory>/pi-taiknr.json`), and scrubs no credentials — verified that `modelsPath: null` still loads the builtin catalog and `allowModelNetwork: false` gates only catalog refresh (`model-runtime.js` L97-100), not `classify`, so `OPENROUTER_API_KEY` in the shell would bill a live Jev call from L245 and L334 as T2 says.",
      "rationale": "S7's shape (\"the classifier comes from `pi.registerProvider` in an inline extension, plus an agent config file naming that provider\") is right, but two of its three pieces do not exist yet in the files it names, and both are Modify targets the plan does not list. Recording the existing gap saves a coder from discovering it mid-task.",
      "concrete_case": "A coder adds a scripted classifier to `sessionHarness` but no agent config file, so `defaultDecisionModelProvider` stays `openrouter`; `findOfType(\"classifier\", \"openrouter\", \"~typesafe/jev-latest\")` resolves from the builtin catalog and the test bills a live call while appearing to use the scripted provider.",
      "recommendation": "Mark `tests/support/fake-pi.ts` and `tests/app/extension/archive-session.test.ts` as Modify in the file boundary. In `sessionHarness`, add an `agentConfig?: string` option written to `join(agentDirectory, CONFIG_FILE_NAME)` before `bindExtensions`, remove `OPENROUTER_API_KEY`/`TYPESAFE_API_KEY` from `process.env` in the module's `beforeEach` and restore them in `afterEach`, and add a scripted classifier provider plus the config naming it. Notice scenarios belong in the handler test, where `createContextStub` needs a recording `ui.notify`."
    }
  ],
  "assumptions": [
    {
      "assumption": "All four recall-path stubs are unimplemented exactly as described: `formatRecalledContext` and `recallRelevantContext` throw, both `pi-context-adapter` exports throw, `PiJevScorerAdapter.score` throws, and `registerContextHandler` registers `_pi.on(\"context\", () => {})`",
      "status": "verified"
    },
    {
      "assumption": "The composition root passes a placeholder `notifyOnce` with an empty body, holds the single `RecallCache`, and registers six handlers through `createGatedPi` while `session_start` uses the raw `pi`",
      "status": "verified"
    },
    {
      "assumption": "`createOncePerSessionNotifier(getCtx)` keeps `warned` in a closure and calls `getCtx().ui.notify(message, \"warning\")` once, setting the flag before the call",
      "status": "verified"
    },
    {
      "assumption": "`selectRecalledIds` is implemented with `>=`; `decisionThreshold` defaults to 0.5; the other defaults are `~typesafe/jev-latest`, `openrouter`, 600, `true`",
      "status": "verified"
    },
    {
      "assumption": "No test under `tests/` references `selectRecalledIds`, `formatRecalledContext` or `recallRelevantContext` (so the proposal's \"its pure test\" is false)",
      "status": "verified"
    },
    {
      "assumption": "`taiknr.test.ts` asserts the sorted seven-event list containing `\"context\"` and throws on any factory-time `ExtensionAPI` member other than `on`",
      "status": "verified"
    },
    {
      "assumption": "Adding a `TaiknrConfig` field breaks `FIELD_RULES`'s mapped type, `loadTaiknrConfig`'s literal, and three test sites (`handler-gate.test.ts` L6, `session-config.test.ts` L8, `taiknr-config.test.ts` L188)",
      "status": "verified"
    },
    {
      "assumption": "`vitest.config.ts` includes only `tests/**/*.test.ts` and `biome.json`'s `files.includes` is `src/**`, `tests/` and four root config files, so a root-level live script is neither collected, linted nor type-checked",
      "status": "verified"
    },
    {
      "assumption": "`ExtensionAPI` exposes no member returning an `ExtensionContext`, so the composition root cannot obtain a per-event ctx",
      "status": "verified"
    },
    {
      "assumption": "`context_with_system` handlers receive the real `currentMessages` array and the same `createContext()` ctx, are awaited, and do not go through `restoreSystemMessages`, so appending one block to the latest user message keeps every system message in place",
      "status": "verified"
    },
    {
      "assumption": "`classifierErrorResult` sets `stopReason: aborted ? \"aborted\" : \"error\"` from `options.signal.aborted`, so a timeout abort is reported as `\"aborted\"`",
      "status": "verified"
    },
    {
      "assumption": "`ctx.getContextUsage()` returns `undefined` with no model or a non-positive context window, and `{tokens: null}` on the first request after a compaction with no post-compaction assistant usage",
      "status": "verified"
    },
    {
      "assumption": "`allowModelNetwork: false` gates only catalog refresh, and `modelsPath: null` still loads the builtin provider catalog, so a Jev call would use `OPENROUTER_API_KEY` from the shell in the existing suite",
      "status": "verified"
    },
    {
      "assumption": "`SessionEntryBase` carries no author or extension name, so a `context_edit` cannot be attributed to taiknr by metadata",
      "status": "verified"
    },
    {
      "assumption": "The living `extension-packaging` spec freezes the two registrar deps objects except the config member's type, and names `createPiJevScorerAdapter(ctx, config: TaiknrConfig)` and the port contracts as unchanged",
      "status": "verified"
    },
    {
      "assumption": "`tests/support/fake-pi.ts`'s `createContextStub` provides `cwd`, `isProjectTrusted` and `sessionManager` only",
      "status": "verified"
    }
  ],
  "owner_questions": [
    {
      "question": "When the host cannot report the request's current context size — the first request after a compaction (`getContextUsage()` returns `tokens: null`) or a main model with no usable context window (`undefined`) — what should recall do?",
      "options": [
        "(a) Recall nothing for that request and say nothing; recall resumes on the next scored turn",
        "(b) Recall a conservative fixed allowance (for example the largest item under a fraction of the model's window), accepting the overflow risk Joel's Q3 rejected",
        "(c) Recall anyway, since the archive's own size is the only bound left"
      ],
      "recommended_option": "(a)",
      "why": "It is the same reasoning Joel used to pick Q3(b) — a missed recall is recoverable, a persisted compaction followed by a failed turn is not — and both unknown-size cases land exactly where the archive is fullest. It costs one scenario and one adapter test, and it leaves option (b) available later if the live check shows recall is being skipped too often."
    }
  ],
  "not_checked": [
    "The Anthropic request bytes and whether the recalled tail actually hits the provider's prefix cache (relies on Chidi's transcript-layout measurement and Pi's own doc sentence)",
    "Whether `pi.registerProvider` from an inline extension reaches `ctx.modelRegistry.findOfType` in the existing `sessionHarness` — Chidi measured it in a separate probe, I did not run it",
    "The exact `@types/node` version the lockfile resolves, so whether `AbortSignal.any`/`AbortSignal.timeout` type-check under `types: [\"node\"]`",
    "Jev's latency, tail latency and recall quality under the real question wording — those spend model calls",
    "How RPC mode renders `notify`, and the print/JSON extension-error wording",
    "A real recall large enough to trip Pi's overflow recovery",
    "OpenRouter's per-error messages for the classifier route (429, 4xx), which an eventual notice would carry",
    "Whether a second native provider named `openrouter` composes cleanly with the builtin one in the test harness (I recommend a distinct provider id, which avoids the question)"
  ]
}