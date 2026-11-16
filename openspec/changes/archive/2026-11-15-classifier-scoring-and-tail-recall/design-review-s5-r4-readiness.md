{
  "mode": "review",
  "lens": "council-readiness",
  "paraphrase_proposes": "The change implements tail recall for taiknr. A handler on `context_with_system` extracts the latest user prompt and works out a character budget from pi's window, reserve and message estimate. It reads the branch for eligible archived ids and calls a use case that scores eligible stubs with one bounded classifier call per key. The use case ranks and prefix-fits whole items, then appends one guarded `<recalled_context>` block to the latest user message for that request only. Failure fails open with one notice per session. `tasks.md` orders nine groups: domain formatter, config field, archive eligibility, context adapter, notifier, scorer plus shared test guard, use case, handler plus session tests, and a live script run once.",
  "paraphrase_existing": "At `main` 22113ac every recall body throws `Not implemented`. `registerContextHandler` registers an empty `context` handler and takes a `notifier` dependency. The composition root passes a placeholder `notifyOnce`. `createOncePerSessionNotifier` sets `warned` before it notifies. `TaiknrConfig` has five fields. `readArchiveBatchesFromBranch` and `InMemoryArchiveStore` exist, and `createGatedPi` wraps only `on`. The baseline is 16 test files. I confirmed this against the live sources: the files, stubs, signatures and test layout all match what `tasks.md` cites.",
  "recommendation": "Pass. I verified the file boundary against disk: every Create path is absent and every Modify path exists. The `taiknr.test.ts`, `handler-gate.test.ts` and `session-config.test.ts` literals match what `tasks.md` names, and the 16-file count matches. Group order is dependency-clean and each group leaves the suite green. Non-red tasks (6.2, 8.1) say so. The pi-ai subpath export, `ProviderClassifier.classify`, `ModelRegistry.findOfType`/`classify`/`registerProvider`, `estimateTokens` handling the `system` role, and `ContextUsage`'s shape all exist as the tasks use them. Two minor test-coverage gaps remain; neither requires a design decision.",
  "findings": [
    {
      "id": "readiness-s5r4-RDY4-1",
      "severity": "minor",
      "location": "tasks.md 4.1 (boundary cases) against design.md decision 3 'Text'",
      "finding": "Design decision 3 fixes that an array content's text blocks are joined with `\\n`, and that join feeds both `promptText` and the key. 4.1 asserts a string content, an array content, an image, an empty text and a trailing custom message. It names no message with two or more text blocks.",
      "rationale": "The separator is observable behaviour: it sets the classifier's prompt and the cache key. Replacing `join(\"\\n\")` with `join(\"\")` or `join(\" \")` leaves every listed 4.1 assertion green, so the test does not fail when the behaviour is deleted (standard §3).",
      "concrete_case": "Message `{role:\"user\", timestamp: 5, content:[{type:\"text\",text:\"a\"},{type:\"text\",text:\"b\"}]}`. The design requires `promptText === \"a\\nb\"` and `promptKey === \"5|a\\nb\"`. An implementation using `join(\"\")` returns `\"ab\"` and passes all of 4.1 as written.",
      "recommendation": "Add one boundary case to 4.1: two text blocks around an image block yield `a\\nb` for the text and `${timestamp}|a\\nb` for the key."
    },
    {
      "id": "readiness-s5r4-RDY4-2",
      "severity": "minor",
      "location": "tasks.md 7.1 (boundary cases) against design.md decision 9 'On a new key' step 5 and 'Failure and cancel'",
      "finding": "Decision 9 says a successful scoring always records the token, even when no item is kept. That covers every score below the threshold, and a highest item alone over budget. 7.1 lists a threshold-equal case and a 'highest-probability item alone over budget (nothing recalled)' case. It does not say either asserts that the token was recorded and that the same key then makes no second `score` call. The 'success records the token and kept ids' line reads as the non-empty case.",
      "rationale": "One classifier call per key is the design's cost guarantee (Q6). If the implementation records the token only when ids are kept, 7.1 as written stays green. Every request under a key with nothing to recall would then re-call the classifier and spend again. A deleted behaviour that costs money should fail a named test.",
      "concrete_case": "Threshold 0.5, scores `{a: 0.1, b: 0.2}`. The first request returns `[]`. The design requires `cache.lastPromptKey` to equal `${size}|${key}` with `lastRecalledIds` empty, so the second request under that key makes no `score` call. A `if (kept.length > 0) record()` implementation scores again on request 2 and passes the current 7.1 list.",
      "recommendation": "Add one 7.1 boundary case: every score below the threshold, and separately the first item alone over budget. Each asserts `[]`, the token recorded with empty ids, and a second call under the same key making zero `score` calls."
    },
    {
      "id": "readiness-s5r4-RDY4-3",
      "severity": "minor",
      "location": "tasks.md 8.3 (opening and completion lines) against 6.2 and 8.1",
      "finding": "6.2 and 8.1 each say they are not red-first and say what shows the check catching a mistake. 8.3 writes the session-level tests after 8.2 has already implemented the handler and says nothing about whether they are red. It also names no mutation that fails them.",
      "rationale": "Standard §3 asks that a task relying on a test to catch a mistake say how that test is shown catching one. 8.3 cannot be red once 8.2 lands. The tasks it sits beside state this explicitly, so a coder could read 8.3 as owing a failing run it cannot produce, or could skip any check that the test fails.",
      "concrete_case": "8.3 case 1 passes on its first run because 8.2's handler exists. If `registerContextHandler` registered `context` instead of `context_with_system`, case 1's 'system message stays in place' assertion should fail. Nothing in 8.3 asks the coder to confirm that.",
      "recommendation": "Add one sentence to 8.3: these are characterisation tests that pass once 8.2 lands. They are shown catching a mistake by temporarily registering `context` in place of `context_with_system` and confirming case 1 fails, then restoring it."
    }
  ],
  "assumptions": [
    {
      "assumption": "Every path marked Create in the File Boundary is absent on disk and every Modify path exists. The tests directory lists 16 test files, matching the baseline.",
      "status": "verified"
    },
    {
      "assumption": "The current stubs and signatures match what `tasks.md` cites: `formatRecalledContext`, `recallRelevantContext`, `createPiJevScorerAdapter`, the context adapter functions, `createOncePerSessionNotifier` (flag set before notify), and `registerContextHandler` with its `notifier` dependency.",
      "status": "verified"
    },
    {
      "assumption": "Adding the required `classifierTimeoutMs` breaks only the `TaiknrConfig` literals in session-config.test.ts, handler-gate.test.ts and taiknr-config.test.ts. The other tests spread `DEFAULT_TAIKNR_CONFIG`.",
      "status": "verified"
    },
    {
      "assumption": "pi-ai's `./api/*` subpath export, its `classify` export, `ProviderClassifier.classify`, `ModelRegistry.findOfType`/`classify`/`registerProvider`, `estimateTokens` handling `system` messages, and the `ContextUsage` shape match the tasks' use of them.",
      "status": "verified"
    },
    {
      "assumption": "`taiknr.test.ts`'s Proxy throws on any `ExtensionAPI` member other than `on` at factory time. Decision 2 reads `pi.getSettings()` only at event time, so the registration change stays compatible.",
      "status": "verified"
    },
    {
      "assumption": "An extension-registered provider is visible to a session built with an explicit `ModelRuntime` in `sessionHarness`.",
      "status": "unverified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "Pi runtime behaviour: the session route's provider visibility, the measured timeout and retry figures, and `_limitsModel()`. These belong to Chidi and are settled in research.",
    "The `ProviderConfig` to `ProviderConfigInput` assignability on the unit route. A mismatch fails at typecheck, loudly.",
    "The live script's real-run behaviour and OpenRouter tool support, which only 9.2 can prove.",
    "Findings in the settled list. I did not reopen any of them."
  ]
}