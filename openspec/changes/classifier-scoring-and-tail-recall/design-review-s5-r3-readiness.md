{
  "mode": "review",
  "lens": "council-readiness",
  "paraphrase_proposes": "tasks.md splits the recall build into nine groups, each landing its own tests and leaving the 221-test baseline green. Order: the domain formatter, the `classifierTimeoutMs` config field, the eligibility reader, the context adapter, the once-per-factory-call notifier, the scorer adapter plus the shared classifier guard, the use case, then the `context_with_system` handler with composition-root removal and session-level tests. The last group is the implementation gate and a live paid-call script that the coder runs. The file boundary, public names, test cases and exact strings come from design decisions 1-13.",
  "paraphrase_existing": "The repo at `main` 22113ac has stubs that throw `Not implemented` for `formatRecalledContext`, `recallRelevantContext`, both context-adapter functions and the scorer's `score`. `registerContextHandler` registers `context` and does nothing, and `taiknr.ts` passes a placeholder notifier. `createOncePerSessionNotifier` sets `warned` before it calls `notify`. Config validation is a module-local `FIELD_RULES` map. Handlers are gated by `createGatedPi`. `tests/support/fake-pi.ts` has no `getSettings`, `contextWindow`, `modelRegistry` or `notify` seam, and no tests exist yet at the new mirror paths.",
  "recommendation": "Pass at Stage 5 round 3. I read the settled list and did not reopen any of it. The paths, symbols and test runners the tasks cite exist as described, and nothing in the plan leaves a design choice to Derek. One minor gap remains: the cache-hit path with an empty recorded id list is untested, and task 1.1 says no recall path calls the formatter with zero items. Fold it into 1.1 and 7.1 or leave it.",
  "findings": [
    {
      "id": "RDY3-1",
      "severity": "minor",
      "location": "tasks.md 1.1 (\"empty list (`none` — no recall path calls the formatter with zero items …)\") and 7.1 boundary cases; design.md decision 9 cache-hit step 3",
      "finding": "Task 1.1 says no recall path calls the formatter with zero items. On a cache hit, design decision 9 step 3 runs `formatRecalledContext(items).length <= budgetCharacters` after the filtering in step 2. That list is empty whenever `lastRecalledIds` is empty (a failure key, or a key where nothing was selected or fit) or every cached id was filtered out. Task 7.1 lists no case for that path, and the zero-item output is specified only implicitly, by design decision 10's three-line frame.",
      "rationale": "Failure and nothing-selected outcomes record `lastRecalledIds` as `[]`, and the next request under that key takes the cache-hit branch. An implementation could call the formatter with `[]`, get a header-only frame and reach the fit check, or short-circuit first. Both return `[]` to the handler. The task's factual claim is wrong, though, and no test pins that an empty cached list returns `[]` with no `score` call. A coder who instead returns the formatter's output for the empty case, or reuses the new-key prefix loop, ends up with a header-only block on the request.",
      "concrete_case": "Request 1 under key K: `score` rejects, the notice fires, `lastPromptKey` is `${size}|K` and `lastRecalledIds` is `[]`. Request 2 under K is a cache hit with zero ids. `recallRelevantContext` must return `[]`, and the handler must return `undefined`. No test in 7.1 asserts the returned value on this exact path. The listed case \"a rejection followed by the same key (no second score)\" asserts only the second-score absence.",
      "recommendation": "In 7.1, extend the \"rejection followed by the same key\" case to assert the use case returns `[]`. Add a boundary case for a cache hit whose recorded ids are all dropped by the store or eligibility filters, which also returns `[]`. In 1.1, replace the \"no recall path calls the formatter with zero items\" claim with \"the use case returns `[]` before calling the formatter on an empty item list\". Alternatively, drop the claim and keep `none`."
    }
  ],
  "assumptions": [
    {
      "assumption": "All cited source paths and symbols exist and match the tasks' description of current state: the stubs, the `_pi.on(\"context\", …)` registration, the placeholder notifier, the `warned`-before-`notify` order, `FIELD_RULES` and `DEFAULT_TAIKNR_CONFIG`, `readArchiveBatchesFromBranch`, and `createGatedPi` forwarding non-`on` members.",
      "status": "verified"
    },
    {
      "assumption": "Pi 1.5.2 exposes what the guard and handler tasks use: root exports `ModelRegistry`, `ModelRuntime`, `estimateTokens` and `DEFAULT_COMPACTION_SETTINGS`; the `ProviderConfig` extension type; `pi.on(\"context_with_system\")`; `getSettings`; `ModelRegistry.findOfType`, `classify` and `registerProvider(name, config)`; `maxRetries` and `timeoutMs` in classifier options; the `@earendil-works/pi-ai/api/*` export; `SessionManager.inMemory`, `appendContextEdit` and `appendCustomEntry`.",
      "status": "verified"
    },
    {
      "assumption": "The faux provider's model has a 128,000-token context window, so the session-level recall tests in 8.3 clear the handler's `getContextUsage` and budget skips. `estimateTokens` counts system messages, as 8.2 case 4 requires.",
      "status": "verified"
    },
    {
      "assumption": "`taiknr.test.ts`'s throwing Proxy permits `_pi.on` only at registration, so the handler must read `pi.getSettings()` at event time only. The design and tasks do that.",
      "status": "verified"
    },
    {
      "assumption": "A `ProviderConfig` value is assignable to the `ProviderConfigInput` that `ModelRegistry.registerProvider` takes, so the unit route type-checks. Both interfaces list the same fields in what I read, but I did not compile it.",
      "status": "unverified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "I ran no tests, no `npm run check` and no live script. Every runtime claim in 6.2 (3 attempts in 1,430 ms without `maxRetries: 0`) and 8.3 rests on the plan's cited measurements, not a rerun by me.",
    "Whether `registerProvider` calls made at extension load, from the guard's inline extension, are queued until binding in `sessionHarness`. The plan's guard design relies on it.",
    "Whether `pi.setActiveTools` throws at load (8.3 case 1). That item is declined and settled, so I did not reopen it.",
    "The Biome lint and format result for the new tests and support files.",
    "Whether a `session_compact` or `session_tree` hydration sequence changes the store size between two requests under one key inside the 8.3 session tests. Decision 4 covers this by design."
  ]
}