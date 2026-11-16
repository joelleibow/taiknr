{
  "mode": "review",
  "lens": "council-codebase",
  "paraphrase_proposes": "`tasks.md` fills recall in nine ordered groups: the pure block formatter and threshold rule in the domain; the `classifierTimeoutMs` field with default 5000 and its rejection reason in the module-local `FIELD_RULES`; `readEligibleArchivedIds` beside `readArchiveBatchesFromBranch`; the prompt extractor and the trailing-block appender; the notifier's `warned`-after-`notify` body; the bounded System One call with its four-fact notice plus a shared offline guard created in 6.2 ahead of its consumers; the use case scoring once per `${store.size()}|${promptKey}` with a whole-item prefix fit; the `context_with_system` handler with the composition-root change, `fake-pi.ts` additions and session-level tests; and a root-level live script with two recorded runs. Each group is test-first or explicitly labelled preparation, names its boundary cases and completion command, and leaves the suite green. Every path is marked Create or Modify with none deleted, and the docs pass is listed separately and excluded.",
  "paraphrase_existing": "At `main` `22113ac` the archive half works end to end while every recall body throws `Not implemented`: `formatRecalledContext`, `recallRelevantContext`, `extractLatestUserPrompt`, `appendRecalledContextToMessages` and `PiJevScorerAdapter.score`. `src/infra/pi-event-handlers/context.ts` registers `_pi.on(\"context\", () => {})` with `config` (the holder), `store`, `notifier` and `recallCache`; `src/app/extension/taiknr.ts` feeds a placeholder `notifyOnce` and keeps seven `register*Handler` calls plus one `RecallCache`; `createOncePerSessionNotifier` sets `warned` before calling `notify`. `src/config/taiknr-config.ts` validates five fields through a module-local, unexported `FIELD_RULES` and builds its result with one `layered(...)` line per field; `RecallRelevantContextInput` declares exactly `promptKey`, `promptText`, `decisionThreshold` and `signal`; the six non-`session_start` handlers register through `createGatedPi`, and `tests/support/` holds only `fake-pi.ts`.",
  "recommendation": "Pass. I re-verified the file boundary and every current-state citation I could check against disk and found no blocking or major gap: every Create path is absent, every Modify path exists, and the three `TaiknrConfig` literals that a new required field breaks are exactly the three task 2.1 names. The line-level citations the plan leans on are exact (`turn-end.ts` L17-19, `pi-archive-adapter.ts` L12 and L144, `commit-archived-batch.ts` L8, `hydrate-archive-store.ts` L6, `session-start.ts` L31, `archived-output.ts` L10 and L48, `jev-context-poc.ts` L110, `settings-manager.js` L654-683, `agent-session.js` L2897, `archive-session.test.ts` L4-5), as are the host types the tasks use (`ContextWithSystemEvent`, `ContextEventResult {messages?}`, `ContextUsage`, `ctx.signal`, `ModelRegistry.findOfType`/`classify`/`registerProvider`, `ProviderConfig.classifiers`, `ProviderClassifierModelConfig`, `ClassifierResult`, the `./api/*` export of `classify`, `DEFAULT_COMPACTION_SETTINGS.reserveTokens` 16384, and an all-optional `Settings.compaction`). One new minor remains: a row in 3.1 asserts a state no implementation can violate. No settled row was reopened.",
  "findings": [
    {
      "id": "CB-R4-1",
      "severity": "minor",
      "location": "tasks.md §3.1 (the third of the five `readEligibleArchivedIds` cases: \"an item whose entry is off the active branch is ineligible\") against design.md decision 5 and the `tail-recall` scenario \"An item from a branch the user left\"",
      "finding": "That case cannot fail on its own. `readEligibleArchivedIds(entries)` reads only the branch it is handed and derives its items from `readArchiveBatchesFromBranch(entries)`, so an item whose entry is off the branch is not represented in `entries` at all: the row is `expect(set.has(id)).toBe(false)` on an array that never mentions `id`, and it passes for every implementation, including one that skips the `context_edit` comparison entirely (that one fails rows 2 and 4, not this row). The behaviour the spec scenario describes — a store item whose entry is off the branch is not recalled — is produced by the use case filtering `store.getAll()` against `eligibleIds`, which 7.1 already asserts as \"a cached id no longer eligible (skipped)\". As written, the adapter row asks Derek for a test that proves nothing, and the observable proof of the spec scenario sits one layer away.",
      "rationale": "Implementation-readiness standard §3: every named case must assert observable state that fails when the behaviour is deleted. A row that cannot be the sole reason a suite goes red is dead weight in a five-case list that the design and the spec both describe as the rule's coverage, and it invites the coder to believe the adapter alone proves the off-branch rule.",
      "concrete_case": "Derek writes the row by calling `readEligibleArchivedIds(branch)` where `branch` holds one tool-result message and one `taiknr-side-store` custom entry for id `aaaa1111`, and asserts `expect(readEligibleArchivedIds(branchWithoutTheItem).has(\"aaaa1111\")).toBe(false)`. Any implementation — including `return new Set(readArchiveBatchesFromBranch(entries).flat().map((item) => item.id))` — returns `false`, so the case adds a green line and no coverage.",
      "recommendation": "Reword 3.1's third case to what the helper can actually prove, e.g. \"a branch that carries no batch for an id omits it from the set, which is how the store's off-branch item is dropped by the `eligibleIds` filter\", and leave the observable assertion where it already is (7.1's new-key filter over `store.getAll()` and its \"a cached id no longer eligible (skipped)\"). Alternatively say in 3.1 that four cases are asserted directly and the fifth is the use-case-side filter, so no row claims a proof it cannot carry."
    }
  ],
  "assumptions": [
    {
      "assumption": "Every path marked Create is absent on disk and every Modify path exists: no `tests/domain/recall.test.ts`, `tests/use-cases/recall-relevant-context.test.ts`, `tests/infra/adapters/pi-context-adapter.test.ts`, `pi-jev-scorer-adapter.test.ts`, `pi-notifier-adapter.test.ts`, `tests/infra/pi-event-handlers/context.test.ts`, `tests/support/classifier-guard.ts` or root `test-recall-live.mjs`; the sixteen existing test files include every Modify row, and `tests/` holds exactly 16 test files.",
      "status": "verified"
    },
    {
      "assumption": "The current-state claims hold as written, including the stubs that throw `Not implemented`, `selectRecalledIds`'s `>=`, `RecallRelevantContextInput`'s four fields, `context.ts` registering `context` with a `notifier` dep, `taiknr.ts`'s placeholder `notifyOnce` plus seven registrations and one `RecallCache`, `createOncePerSessionNotifier` setting `warned` before `notify`, `FIELD_RULES` unexported with five entries, and `registerContextHandler` called through the gated `pi`.",
      "status": "verified"
    },
    {
      "assumption": "The only `TaiknrConfig` object literals in `tests/` are `tests/config/session-config.test.ts` L9-15, `tests/app/extension/handler-gate.test.ts` L8-14 and `tests/config/taiknr-config.test.ts`'s `toEqual` (L196-202) — the three task 2.1 names; `session-start.test.ts` and `turn-end.test.ts` spread `DEFAULT_TAIKNR_CONFIG`, so the new required field breaks nothing unnamed. `tests/config/taiknr-config.test.ts`'s `rejectedInputs` is a `[text, field, reason]` table consumed by `test.each`.",
      "status": "verified"
    },
    {
      "assumption": "The cited line numbers and behaviour resolve exactly: `turn-end.ts` L17-19 reads `deps.config.state` and returns unless ready; `pi-archive-adapter.ts` L12 opens `InMemoryArchiveStore` and L144 `readArchiveBatchesFromBranch`; `commit-archived-batch.ts` L8 is `store.addBatch(batch)`; `hydrate-archive-store.ts` L6 is `store.replaceAll(batches.flat())`; `session-start.ts` L31 is the hydrate call; `archived-output.ts` L10 is `ArchivedToolOutput` and L48 the 180-unit preview; `jev-context-poc.ts` L110 is the `${id}` template literal; `settings-manager.js` L654-683 is the override → ordinary → default chain; `agent-session.js` L2897 is the arrow-function `getSettings`; `archive-session.test.ts` L4-5 is the `shortcut:` comment; `taiknr-config.ts` L12 exports `CONFIG_FILE_NAME` and L18 holds `minCharsToArchive: 600`.",
      "status": "verified"
    },
    {
      "assumption": "The host surface the tasks reach exists and matches their use: `ContextWithSystemEvent {type, messages}`, `ContextEventResult {messages?}`, `ContextUsage {tokens, contextWindow, percent}`, `ctx.signal: AbortSignal | undefined`, `ExtensionAPI.getSettings(): Settings` with `compaction` and its fields all optional, `ModelRegistry` with `findOfType`, never-rejecting `classify` and `registerProvider(name, config)`, `ProviderConfig.classifiers`, `ProviderClassifierModelConfig` (`type: \"classifier\"`, `contextWindow`, no `maxTokens`), `ClassifierResult {answers, stopReason, errorMessage?}`, `ClassifierBoolAnswer {type: \"bool\", probability}`, `DEFAULT_COMPACTION_SETTINGS.reserveTokens === 16384`, and `classify` exported from the installed `@earendil-works/pi-ai/api/typesafe-system-one` through the package's `./api/*` export map.",
      "status": "verified"
    },
    {
      "assumption": "Root `test-recall-live.mjs` stays outside every gate: `vitest.config.ts` includes only `tests/**/*.test.ts`, `tsconfig.json` only `src/**/*.ts` and `tests/**/*.ts`, `biome.json`'s `files.includes` lists `src/**`, `tests/**` and four root config files; `test-jev-poc.mjs` is the working precedent at that path; `docs/adr/` holds 0001-0006 so `0007-*.md` is free; `README.md` has the field table the docs-pass row extends and `ARCHITECTURE.md` has §3, §5 and §7.",
      "status": "verified"
    },
    {
      "assumption": "A real `SessionManager.inMemory()` branch can reach the handler tests through `createContextStub`'s existing `branch?: SessionEntry[]` option, with `session-start.test.ts` L324-329 as the precedent (`createContextStub({..., branch: manager.getBranch()})`), so task 8.2 case 7's \"over a real branch\" needs no unlisted helper option.",
      "status": "verified"
    },
    {
      "assumption": "`getSettings` survives `createGatedPi`'s Proxy because the host assigns it as an arrow function (`agent-session.js` L2897), so `Reflect.get` with the Proxy as receiver cannot break private-field access; and `taiknr.test.ts`'s Proxy throws on any member but `on` at factory time only, which the event-time `getSettings()` call does not touch.",
      "status": "verified"
    },
    {
      "assumption": "The 16-file / 221-test baseline at `22113ac` and a green `npm run check`; only the 16-file count was confirmed by listing `tests/`.",
      "status": "unverified"
    },
    {
      "assumption": "The builtin openrouter catalog carries `~typesafe/jev-latest` as a `classifier` model so 6.2's guard-catches-a-mistake test can find it under `modelsPath: null`; `pi-ai/dist/providers/data/openrouter.json` is one minified line, and I could only confirm that the file contains `classifier:` entries, not the entry's `baseUrl`, so the exact `https://openrouter.ai/api/v1/systemone` URL rests on Michael's recorded measurement.",
      "status": "unverified"
    },
    {
      "assumption": "Chidi's measured wire facts — the `.../systemone` URL on `openrouter`, the public `bool`-to-`noul` mapping, and 3 attempts / ~1.43 s without `maxRetries: 0` — taken from `research-chidi.md` and `michael-council-rulings.json`, not re-run.",
      "status": "unverified"
    },
    {
      "assumption": "`pi.registerProvider` called from an inline extension in `sessionHarness`'s `extensionFactories` lands in the same `ModelRuntime` the session's `ctx.modelRegistry` wraps, before `createAgentSession`; the readiness lens records this as unverified for this round too, and I did not re-check `agent-session-services.js`.",
      "status": "unverified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "Did not run `npm test`, `npm run check`, `npm run typecheck`, `npx biome check --write .` or the live script, so the 221-test baseline, the guard's offline behaviour and every task's completion command are unconfirmed.",
    "Did not read `council.md` or `michael-council-rulings.json` in full; rulings 1-18 are taken as quoted in `design.md`, `tasks.md` and the quoted evidence excerpts.",
    "Did not read the bodies of ADR 0001-0006, `ARCHITECTURE.md` §3/§5/§7 or the `development-checks` spec beyond what `tasks.md` quotes, so the docs-pass destinations are unchecked beyond their existence.",
    "Did not verify the live script's pi loader behaviour, OpenRouter main-model tool support, the `before_provider_request` payload shape or RPC-mode `notify` — pi behaviour belongs to Chidi.",
    "Did not attempt to read `pi-ai/dist/providers/data/openrouter.json` in full (one minified line), so the default classifier model's catalog entry and `baseUrl` stay unverified.",
    "Did not re-open any settled row: not decision 10's 381/263 bytes or its guard, not decision 9's failure branch or decision 11's notifier wiring, not the `FIELD_RULES`/spec-shape/marker-guard/copy-not-mutate rules, not 8.2/8.3's test-local fixtures or the `branch` seam, not the `gains context_with_system` shorthand, and not this round's readiness findings (4.1's missing multi-text join, 7.1's empty-kept case, 8.3's red-first framing)."
  ]
}