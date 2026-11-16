{
  "mode": "review",
  "lens": "council-codebase",
  "paraphrase_proposes": "The plan fills in recall in nine ordered groups: `formatRecalledContext` and the threshold rule in the domain; the `classifierTimeoutMs` field with default 5000 and its rule in the module-local `FIELD_RULES`; `readEligibleArchivedIds` beside `readArchiveBatchesFromBranch`; the prompt extractor and the trailing-block appender; the notifier's `warned`-after-`notify` body; the bounded System One call with its four-fact notice plus a shared offline classifier guard created in 6.2; the use case scoring once per `${store.size()}|${promptKey}` and fitting whole items to a character budget; the `context_with_system` handler, the composition-root change, `fake-pi.ts` additions and session-level recall tests; and a root-level live script whose two runs are recorded under task 9.2. Every group is test-first or explicitly labelled preparation, names its boundary cases and completion command, and leaves the suite green. Files are marked Create/Modify with none deleted, and the docs pass is listed separately and excluded.",
  "paraphrase_existing": "At `main` `22113ac` the archive half works end to end (staging, settlement, the `taiknr-side-store` entry, `context_edit` stubs, hydration) while every recall body throws `Not implemented`: `formatRecalledContext`, `recallRelevantContext`, `extractLatestUserPrompt`, `appendRecalledContextToMessages` and `PiJevScorerAdapter.score`. `src/infra/pi-event-handlers/context.ts` registers `_pi.on(\"context\", () => {})` with a dependency object carrying `config` (the holder), `store`, `notifier` and `recallCache`; `src/app/extension/taiknr.ts` feeds a placeholder `notifyOnce` plus a frozen `notifier` member and keeps seven `register*Handler` calls; `createOncePerSessionNotifier` sets `warned` before calling `notify`. `src/config/taiknr-config.ts` validates five fields through a module-local, unexported `FIELD_RULES`; `src/use-cases/recall-relevant-context.ts` declares exactly `promptKey`, `promptText`, `decisionThreshold` and `signal`; the six non-`session_start` handlers register through `createGatedPi`, and `tests/support/` holds only `fake-pi.ts` with `createFakePi()` taking no arguments and `createContextStub` carrying `cwd`, `trusted` and `branch`.",
  "recommendation": "Ready for implementation: the file boundary is exact and complete, every existing path, symbol and signature the plan cites as current state resolves on disk, and the round-3 rewrite closed the earlier blocking item (2.1 no longer asserts through the unexported `FIELD_RULES`, the guard is created in 6.2 ahead of its consumers, 9.2 records inside `tasks.md`, and 8.2 asserts only observable boundary effects). Two minor nits remain, each a one-line edit: design decision 6's `- 1` code comment is produced by no task, and `writeClassifierAgentConfig` is specified against the literal `pi-taiknr.json` where the repository already exports `CONFIG_FILE_NAME`.",
  "findings": [
    {
      "id": "CB-R3-1",
      "severity": "minor",
      "location": "tasks.md §6.1 (the implementation sentence for `createPiJevScorerAdapter(ctx, config).score`) against design.md decision 6 step 3 and decision 7's timeout row",
      "finding": "Design decision 6 binds a code comment that no task produces: \"The `- 1` in decision 7's timeout row carries a one-line code comment stating that reason.\" Task 6.1 names the notice template, the four field rules, the answer validation and the abort branch, but never the comment. This is a third instance of the class the settled codebase-s5r1-CB-5 covered (the `resolveReserveTokens` `shortcut:` comment, now in 8.2, and the `lastPromptKey` doc comment); it is not one of the two comments CB-5 named, so it is raised once here rather than re-opened.",
      "rationale": "`npm run check` cannot hold a comment to anything, so the tolerance is the one measured fact in the adapter that lives only in code. `elapsed >= config.classifierTimeoutMs - 1` encodes a clock-truncation measurement (3 of 200 timeouts at a 20 ms bound read 19 ms); without the one-line note a later reader \"simplifies\" it to `>=`, and nothing on disk says why the `- 1` exists.",
      "concrete_case": "Derek writes `const timedOut = elapsed >= config.classifierTimeoutMs - 1;` with no comment. A later change drops the `- 1`, and 6.1's assertions still pass because its stub resolves at the bound exactly and never at bound-minus-one. From then on a slow non-timeout provider error that returns at 4999 ms under the 5000 ms default is labelled `field=classifierTimeoutMs`, pointing the operator at the wrong config field.",
      "recommendation": "Add one clause to 6.1: `score` carries a one-line comment on the `- 1` stating that Node's timer clock and `Date.now()` each count whole milliseconds, so a real timeout can read the bound minus one. If the conductor prefers, decline it under the round-1 CB-5 settlement and the gap is accepted, not missed."
    },
    {
      "id": "CB-R3-2",
      "severity": "minor",
      "location": "tasks.md §6.2 (`writeClassifierAgentConfig` … \"which writes `<agentDirectory>/pi-taiknr.json`\") against `CONFIG_FILE_NAME` at src/config/taiknr-config.ts L12 and its existing use at tests/app/extension/archive-session.test.ts L44 and L48",
      "finding": "The shared guard is specified against the literal filename, while `src/config/taiknr-config.ts` exports `CONFIG_FILE_NAME` and the one test that already writes a config file builds its path from it (`join(workDirectory, CONFIG_DIR_NAME, CONFIG_FILE_NAME)`). `writeClassifierAgentConfig` would be the second place to hardcode the name, and the plan does not say to use the constant.",
      "rationale": "Readiness standard §2/§3 and AGENTS.md: `tests/support/` is the one home for a fixture two test files share, and an existing exported constant is the reuse the repo already models. The failure is silent rather than loud, which is what makes the choice worth settling: a drifted literal still writes a well-formed file, and the loader simply never reads it.",
      "concrete_case": "The filename constant changes in a later card. `writeClassifierAgentConfig` keeps writing `pi-taiknr.json`; `archive-session.test.ts` then resolves `DEFAULT_TAIKNR_CONFIG` (`openrouter` / `~typesafe/jev-latest`), so 8.3 item 3's `classifierTimeoutMs: 50` override stops applying and every session-level recall test runs under a config it never set. Nothing fails, because the guard's stubbed `fetch` answers under either provider and no test in that file asserts the resolved config.",
      "recommendation": "Say in 6.2 that `writeClassifierAgentConfig` writes `join(agentDirectory, CONFIG_FILE_NAME)` and imports `CONFIG_FILE_NAME` from `src/config/taiknr-config.js`, the way `archive-session.test.ts` already does."
    }
  ],
  "assumptions": [
    {
      "assumption": "Every Create path is absent and every Modify path exists: `tests/domain/recall.test.ts`, `tests/use-cases/recall-relevant-context.test.ts`, the four `tests/infra/adapters/*-adapter.test.ts` for context/jev-scorer/notifier, `tests/infra/pi-event-handlers/context.test.ts`, `tests/support/classifier-guard.ts` and root `test-recall-live.mjs` do not exist; `tests/support/fake-pi.ts`, `tests/infra/adapters/pi-archive-adapter.test.ts`, `tests/app/extension/taiknr.test.ts`, `tests/app/extension/handler-gate.test.ts`, `tests/config/session-config.test.ts`, `tests/config/taiknr-config.test.ts` and `tests/app/extension/archive-session.test.ts` do, and `tests/infra/pi-event-handlers/` has no `context.test.ts` today.",
      "status": "verified"
    },
    {
      "assumption": "The current-state claims hold as written: `formatRecalledContext` throws `Not implemented: formatRecalledContext`; `selectRecalledIds` uses `>=`; `RecallRelevantContextInput` has exactly `promptKey`, `promptText`, `decisionThreshold`, `signal`; `pi-context-adapter.ts` exports both stubs; `createOncePerSessionNotifier` sets `warned = true` before `notify`; `context.ts` registers `context` with an empty handler and a `notifier` dep; `taiknr.ts` passes the placeholder `notifier` and makes seven `register*Handler` calls with one `RecallCache` instance; `FIELD_RULES` is module-local with five entries; `minCharsToArchive: 600` sits at `taiknr-config.ts` L18; `turn-end.ts` L17-19 reads `deps.config.state` and returns unless `status === \"ready\"`.",
      "status": "verified"
    },
    {
      "assumption": "The only `TaiknrConfig` object literals in `tests/` are `tests/config/session-config.test.ts` L9-15, `tests/app/extension/handler-gate.test.ts` L8-14 and `tests/config/taiknr-config.test.ts` (its `toEqual` at L196-202) — exactly the three task 2.1 names — and every other test spreads `DEFAULT_TAIKNR_CONFIG`, so adding the required field cannot break an unnamed file. The `rejectedInputs` row format is `[text, field, reason]` consumed by `test.each`.",
      "status": "verified"
    },
    {
      "assumption": "`archive-session.test.ts` L4-5 is the `shortcut:` comment the guard copies; `sessionHarness` builds `extensionFactories` from `beforeTaiknr`/`taiknr`/`afterTaiknr`/`helperExtension`; `agentDirectory`, `sideStoreBatches` and `contextEdits` exist; the two post-settlement prompts are `\"what did you see?\"` and `\"one more\"`; `writeClassifierAgentConfig`'s target constant `CONFIG_FILE_NAME` is exported from `src/config/taiknr-config.ts`.",
      "status": "verified"
    },
    {
      "assumption": "`createFakePi()` currently takes no arguments and `createContextStub` takes `{cwd, trusted, branch}`, so task 8.2's defaults leave all six existing handler test files compiling unchanged; `createGatedPi` and `SessionConfig.setEnabled` behave as the plan states.",
      "status": "verified"
    },
    {
      "assumption": "The guard's literals are type-legal and exported where the plan reaches: `ProviderConfig` is re-exported from the pi-coding-agent root; `ProviderConfigInput.classifiers` and `ProviderClassifier.classify` match `classify` from `@earendil-works/pi-ai/api/typesafe-system-one` via the package's `./api/*` exports map; `\"typesafe-system-one\"` is a `KnownClassifierApi`; `ProviderClassifierModelConfig` requires exactly `type: \"classifier\"`, `contextWindow`, `input`, `cost`, `id`, `name`, and `ModelCost` is the four rate fields; `pi.registerProvider(name, config)` exists on `ExtensionAPI`.",
      "status": "verified"
    },
    {
      "assumption": "The scorer's assertions are type-legal: `ModelRegistry` has a public `constructor(runtime: ModelRuntime)`, `registerProvider(name, config)`, `findOfType(type, provider, modelId)` and a never-rejecting `classify(model, context, options)`; `ModelsClassifierOptions` inherits `timeoutMs` and `maxRetries` from `ProviderRequestOptions`; `ClassifierContext` is `{state, questions}` and `ClassifierBoolAnswer` is `{type: \"bool\", probability}`.",
      "status": "verified"
    },
    {
      "assumption": "`estimateTokens(message: AgentMessage)` and `DEFAULT_COMPACTION_SETTINGS` are exported from the pi-coding-agent root, `DEFAULT_COMPACTION_SETTINGS.reserveTokens` is 16384, and `estimateTokens` counts a `system` message's content (plus sections and tool declarations), so task 8.2 case 4's system-message assertion is real.",
      "status": "verified"
    },
    {
      "assumption": "`pi.getSettings()` reaches the handler safely through `createGatedPi`'s Proxy: the loader assigns it as an arrow function (`getSettings: () => this.settingsManager.getSettings()` in `agent-session.js` L2897), so `Reflect.get` plus a Proxy `this` cannot break private-field access. This closes round 2's unverified assumption about the gate being the first handler to read a non-`on` member.",
      "status": "verified"
    },
    {
      "assumption": "`UserMessage.timestamp` is a required `number`, so the `${timestamp}|${text}` key is well typed, and `role: \"custom\"` is in `AgentMessage` via pi-coding-agent's module augmentation (`messages.d.ts` L52-59), so task 4.1's trailing-custom-message case compiles.",
      "status": "verified"
    },
    {
      "assumption": "`ContextEditEntry.replacement` is `{content: ContextEditableContent} | null` and `SessionManager.appendContextEdit(targetId, replacement)` accepts null, so task 3.1's null-replacement boundary and its fixtures are expressible; the existing adapter test already builds branches with `SessionManager.inMemory()` plus `appendContextEdit` and `appendCustomEntry`.",
      "status": "verified"
    },
    {
      "assumption": "The faux provider's default model carries `contextWindow: 128000` (`providers/faux.js` L337), so `ctx.getContextUsage()` returns a window in `sessionHarness` and 8.3's recall cases are not vacuous; with `DEFAULT_COMPACTION_SETTINGS.reserveTokens` at 16384 the 700-character fixture item fits.",
      "status": "verified"
    },
    {
      "assumption": "Root `test-recall-live.mjs` stays outside every gate: `vitest.config.ts` includes only `tests/**/*.test.ts`, `tsconfig` includes only `src/**/*.ts` and `tests/**/*.ts`, `biome.json` includes `src/**`, `tests/**` and four root config files, and `test-jev-poc.mjs` is the working precedent at that path; `docs/adr/` holds 0001-0006, so `0007-*.md` is free.",
      "status": "verified"
    },
    {
      "assumption": "The 16-file / 221-test baseline at `22113ac` and a green `npm run check`; only the 16-file count was confirmed by listing `tests/`.",
      "status": "unverified"
    },
    {
      "assumption": "The builtin openrouter catalog carries `~typesafe/jev-latest` as a `classifier` model, so 6.2's guard-catches-a-mistake test can find it under `modelsPath: null`. `pi-ai/dist/providers/data/openrouter.json` is a single minified line I could not read whole, and T3's measurements imply it exists.",
      "status": "unverified"
    },
    {
      "assumption": "Chidi's measured wire facts: the `.../systemone` URL on `openrouter`, the public `bool`-to-`noul` mapping, and 3 attempts / ~1.43 s without `maxRetries: 0`. Taken from `research-chidi.md`, not re-run.",
      "status": "unverified"
    },
    {
      "assumption": "`pi.registerProvider` called from an inline extension in `sessionHarness`'s `extensionFactories` lands in the same `ModelRuntime` the session's `ctx.modelRegistry` wraps, before `createAgentSession`. Round 2 recorded the same assumption as verified from `agent-session-services.js` / `agent-session.js`; I did not re-check those line ranges.",
      "status": "unverified"
    },
    {
      "assumption": "`pi.getSettings()` exposes a raw `compaction` with no defaults applied and no resolved accessor exists on `ExtensionAPI`/`ExtensionContext`, which is what the `resolveReserveTokens` `shortcut:` comment claims; only the raw `Settings` type and the absence of any compaction accessor on the extension API were checked.",
      "status": "verified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "Did not run `npm test`, `npm run check`, `npm run typecheck`, `npx biome check --write .` or the live script, so the 221-test baseline, the guard's offline behaviour and every task's completion command are unconfirmed.",
    "Did not read `council.md` or `michael-council-rulings.json`; rulings 1-18 are taken as quoted in `design.md` and `tasks.md`.",
    "Did not read `README.md`, `ARCHITECTURE.md` or the ADR 0001-0006 bodies; the docs-pass rows and the ADR numbering are unchecked beyond `docs/adr/` listing 0001-0006.",
    "Did not verify the live script's OpenRouter main-model tool support, the `before_provider_request` payload shape, RPC-mode `notify`, or `DefaultResourceLoader`'s load order for `additionalExtensionPaths` against `extensionFactories`.",
    "Did not attempt to read `pi-ai/dist/providers/data/openrouter.json` in full (one minified line), so the default classifier model's catalog entry is unverified.",
    "Did not re-open any settled item: not decision 10's 381/263 bytes or guard, not decision 9's failure branch or decision 11's notifier wiring, not the `FIELD_RULES`/spec-shape/marker-guard/copy-not-mutate rules, not 8.2's fixture choices or the `branch` seam, and not the `gains context_with_system` shorthand."
  ]
}