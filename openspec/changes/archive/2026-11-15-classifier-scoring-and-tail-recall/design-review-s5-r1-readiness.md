{
  "mode": "review",
  "lens": "council-readiness",
  "paraphrase_proposes": "tasks.md lays out nine groups. Pure formatter, config field, eligibility reader, context adapter, notifier, scorer, use case, then the event bridge with a shared classifier guard, then a live script. Every group names its red tests, its boundary cases and its completion command. A file-boundary table lists exact paths: nine production files to modify, new and modified tests, and one root `.mjs`. Group 8 registers `context_with_system`, drops the placeholder notifier, and the suite stays offline through a `fetch`-stubbing guard. Group 9 creates and runs a paid live script once.",
  "paraphrase_existing": "At `22113ac` every recall body throws `Not implemented`. `context.ts` registers `_pi.on(\"context\", () => {})`, `taiknr.ts` passes a placeholder notifier, and `createOncePerSessionNotifier` sets `warned` before `notify`. The archive half works: settlement writes the side-store entry and `context_edit` stubs, and hydration fills `InMemoryArchiveStore`. The six non-session-start handlers register through a gate that calls a handler only while the config is ready and enabled. The suite has 16 test files; I counted 16 on disk, but could not run the 221-test baseline. `archive-session.test.ts` drives real `AgentSession`s over a faux model and an isolated agent dir. `tests/support/` holds only `fake-pi.ts`.",
  "recommendation": "Not ready. Every path and host symbol I checked exists as cited: the stub bodies, the `pi-ai` classifier types, `context_with_system`, `estimateTokens`, `DEFAULT_COMPACTION_SETTINGS`, `findOfType` and `getSettings`. Task order breaks in one place (F1). Fix F1 to F6 before Derek starts. F1: task 6.2 uses the shared guard that 8.1 creates, and 8.1's own tests cannot trigger a classifier call until 8.2. F2: the guard's and fake host's interfaces are unnamed. F3: no suite-level test shows recall working through a real session. F4: the notice's reason sentences are left to the coder. F5: 6.2 is conditional and cannot be red. F6: the timeout field test compares a wall-clock `Date.now` delta to the bound, so it can flake. F7 to F12 are minor test-boundary gaps. Zero-decision and test-first hold elsewhere.",
  "findings": [
    {
      "id": "RDY-1",
      "severity": "blocking",
      "location": "tasks.md §6.2 and §8.1",
      "finding": "Task order does not hold. 6.2 needs the machinery that 8.1 creates later. 8.1's own red tests and scripted \"no\" cannot be triggered by any code that exists at 8.1.",
      "rationale": "6.2 says to register a test provider mapped to pi-ai's System One `classify` and to stub global `fetch`. That is exactly `tests/support/classifier-guard.ts`, which 8.1 creates after it. So the coder must reorder or duplicate it, and that is a design choice. 8.1 also says to take the guard and script a \"no\" for the two post-settlement prompts. It adds a test that the stub records the `.../systemone` URL and `noul` questions. But 8.1 runs \"before the handler is registered\". The `context` stub is still a no-op, so no classifier call happens in 8.1. The scripted \"no\" changes nothing, and the guard-catches-a-mistake test has no caller to drive it. It cannot be red, and it cannot pass for the right reason.",
      "concrete_case": "Derek reaches 6.2 and the guard file does not exist. If he writes it inline, then 8.1 \"creates\" a second copy. If he jumps to 8.1, the `.../systemone` assertion never sees a request until 8.2's handler exists.",
      "recommendation": "Move the guard's creation to its own task immediately before 6.1, and have 6.2, 8.1 and 8.2 consume it. Move 8.1's \"guard catches a mistake\" test either into 6.2 (drive `createPiJevScorerAdapter` on a real registry under the default openrouter config with a dummy key) or into 8.2 (a real session prompt). Keep the archive-session `\"no\"` scripting in 8.2, once a call is possible."
    },
    {
      "id": "RDY-2",
      "severity": "major",
      "location": "tasks.md §8.1, §8.2 and the Tests table (`tests/support/classifier-guard.ts`, `tests/support/fake-pi.ts`)",
      "finding": "The shared test helpers have no stated interface. Several tasks depend on them: the guard (6.2, 8.1, 8.2, archive-session) and the fake host (8.2).",
      "rationale": "The tasks never name the guard's export, how a test scripts per-id probabilities or a hang, or how it hands back the recorded requests. They never say how an inline extension gets a real `ModelRegistry` and `ctx`. The stub must answer with the ids in the request, because tests only learn the entry id at runtime (`latestToolResultEntryId`). For `fake-pi.ts`, 8.2 says only \"recording ui.notify, plus the modelRegistry seam\". The handler also reads `pi.getSettings()`, `ctx.getContextUsage()`, `ctx.model`, `ctx.signal`, `ctx.sessionManager.getBranch()`, `ctx.modelRegistry.findOfType` and `.classify`. Today `createFakePi` has only `on` and `marker`, and `createContextStub` has only `cwd`, `isProjectTrusted` and `getBranch`.",
      "concrete_case": "Two tasks pick different shapes for the guard (a function returning a handle versus `beforeEach` side effects), and 8.2 cannot call `pi.getSettings()` on the fake. Either way Derek invents a boundary mid-task.",
      "recommendation": "State the guard's exported function or class, its options (answers: a `(ids) => probability map` or a constant; mode `answer` or `hang`), and the returned handle (`requests`, `restore`). State the fake-pi additions: `createFakePi({settings})` giving `getSettings`, and a context-stub factory taking `contextWindow`, `model`, `signal`, `branch`, `notify`, `findOfType`, `classify`."
    },
    {
      "id": "RDY-3",
      "severity": "major",
      "location": "tasks.md §8.1, §8.2 (no group covers it); `specs/tail-recall/spec.md`",
      "finding": "No task adds a session-level test where recall actually reaches the request. The tail-recall spec's session-level scenarios have no named test: system messages untouched, nothing written, inert while off, a foreign edit mid-turn, one call across a turn's requests, stubbing unaffected after a failure.",
      "rationale": "Group 8 adds a guard and one wire-shape test, and handler tests built on stubs. The only end-to-end proof is the live script, which spends money and runs once. The spec says the default suite SHALL drive recall with a scripted classifier, and session-level recall tests take the guard. The spec has an `enabled:false` scenario (\"no classifier call is made\"). The design's table says the gate covers it, and the tasks add no test that proves the gate and the registered `context_with_system` handler compose.",
      "concrete_case": "A mistake such as registering the handler on the ungated `pi`, or an `estimateTokens` input that breaks on a real `AgentMessage`, passes every stub-based unit test. The first real signal is the paid live run.",
      "recommendation": "Add a task after 8.2, in `archive-session.test.ts` or a new session test, with the guard answering \"yes\". Assert the faux transcript's latest user message ends with one `<recalled_context>` block and the leading system message is unchanged. Assert the branch and store are unchanged after the request, with `enabled:false` giving no stub request, and a failure notice when the classifier hangs."
    },
    {
      "id": "RDY-4",
      "severity": "major",
      "location": "tasks.md §6.1; design.md decision 7",
      "finding": "The notice's `<reason>` sentences for adapter-originated failures are not written, yet 6.1 asserts the notice's exact content.",
      "rationale": "Decision 7 says `<reason>` is pi's `errorMessage` where there is one and the adapter's own sentence \"where the answer set is what failed\". The cases with no sentence are: `findOfType` undefined, `stopReason:\"error\"` with `errorMessage` undefined (the type is optional), a missing answer, a wrong `type`, and a bad or non-finite probability. 6.1's tests assert the message \"names the provider, the model, the field and the reason\", so each wording is the coder's call. The error shape, a user-facing string, is decided at the coder's keyboard.",
      "concrete_case": "`findOfType` returns `undefined` and the task lists no `<reason>`. Derek writes \"model not found\", Michael's review wants a different wording, and the test pins whatever Derek chose.",
      "recommendation": "Write the five reason sentences into design decision 7, or into 6.1 verbatim. Include the fallback when `errorMessage` is undefined, and assert them by exact string."
    },
    {
      "id": "RDY-5",
      "severity": "major",
      "location": "tasks.md §6.2",
      "finding": "6.2 is conditional and cannot be red. It says to \"wire the timeout options in `score` if 6.1 left the native call unproven\", but 6.1 already implements `score` and asserts `{signal, timeoutMs, maxRetries: 0}`.",
      "rationale": "6.1 says \"Then implement `createPiJevScorerAdapter(ctx, config).score`\" and its test asserts classify's options. So 6.2's test passes on write. \"If 6.1 left it unproven\" is a choice for Derek, not a plan. The standard requires a failing behavioral test first, or an explicit statement of how the check is shown catching a mistake.",
      "concrete_case": "Derek implements 6.1 with the options. In 6.2 the real-path test is green at once and the `if` is false. Nothing shows the test catches a missing `maxRetries`, which the design measured as 1,498 ms over three attempts against a 50 ms bound.",
      "recommendation": "Make 6.2 an integration/characterisation test and say it is not red. Name how it is shown catching a mistake: with `maxRetries` temporarily removed the fetch stub sees more than one attempt. Delete the conditional wording."
    },
    {
      "id": "RDY-6",
      "severity": "major",
      "location": "tasks.md §6.1/§6.2; design.md decision 6 step 3 and decision 7 table",
      "finding": "The timeout-versus-other-error field choice compares a wall-clock `Date.now()` delta to the configured bound, and 6.2 tests it at 50 ms. The comparison can mis-name the field intermittently.",
      "rationale": "Node timers can fire up to about 1 ms early relative to the `Date.now()` delta. The row is `elapsed >= config.classifierTimeoutMs`, and the design records a 51 ms observation for a 50 ms bound. A single run at 49 ms would name `defaultDecisionModelProvider` instead of `classifierTimeoutMs`. 6.1's \"elapsed time at or above the bound\" case also needs a controlled clock, and the task never says whether it fakes timers or stubs `Date.now`.",
      "concrete_case": "The 50 ms real-path test is the notice's timeout case. It is an intermittent red in the gate whenever the delta lands one millisecond under.",
      "recommendation": "Ask the conductor to settle it with Michael. Options: a monotonic `performance.now()` with a small tolerance, or `elapsed >= timeoutMs - 1`. State how 6.1 controls elapsed time (fake timers or an injected clock) in the task."
    },
    {
      "id": "RDY-7",
      "severity": "minor",
      "location": "tasks.md §2.1",
      "finding": "The rejection reason text for `classifierTimeoutMs` is not given. It is the string existing tests assert (`\"must be an integer >= 0\"`, taiknr-config.test.ts L138).",
      "rationale": "`FIELD_RULES` returns a reason string, and `TaiknrConfigError.message` is `file: field: reason`. The spec says only \"naming the file and the field\", so the string is an error shape Derek would invent. The rows in 2.1 (`0`, `-1`, `1.5`, `1e999`, `2147483648`, `\"8000\"`) need an expected reason.",
      "concrete_case": "The `1e999` row passes with \"must be an integer\" in one place and \"must be an integer from 1 to 2147483647\" in another, and the two tests disagree.",
      "recommendation": "Give the exact reason string, e.g. `must be an integer from 1 to 2147483647`, so the six rows assert one value."
    },
    {
      "id": "RDY-8",
      "severity": "minor",
      "location": "tasks.md §1.1",
      "finding": "The marker-guard tests would pass if the guard were deleted for three of the four fields, and for the opening marker.",
      "rationale": "The only guard case is the closing marker inside the second item's `rawText`. The design says the guard rewrites `<recalled_context>` and `</recalled_context>` in `id`, `toolName`, `argsSummary` and `rawText`. A deletion in `argsSummary`, `toolName` or `id`, or of the opening-marker handling, fails no test. 1.1's `none` for the empty list is fine and explained.",
      "concrete_case": "An `argsSummary` carrying `</recalled_context>` is not rewritten, and the block closes early. All 1.1 assertions are still green.",
      "recommendation": "Add one cheap row per guarded field, an opening-marker case, and a double occurrence in one field. Add a case that is already `<\\/recalled_context>` to confirm it is not rewritten twice."
    },
    {
      "id": "RDY-9",
      "severity": "minor",
      "location": "tasks.md §3.1",
      "finding": "The eligibility boundaries miss shapes the types allow. A `replacement.content` that is a string or an empty array is not covered. Neither is an entry on the branch with the item's id that is not a tool-result message.",
      "rationale": "`ContextEditableContent` includes `UserMessage[\"content\"]`, which can be a string. Design rule (a) requires the matching entry to be a tool-result, and the task's off-branch case does not distinguish that. A first-block check written as `content[0].type` can throw on an empty array or compare a character on a string.",
      "concrete_case": "Another extension writes `{replacement:{content:\"redacted\"}}`. An implementation that indexes it either throws, which breaks the request's `context_with_system` path, or relies on the TypeScript shape.",
      "recommendation": "Add three rows: string content (ineligible), empty-array content (ineligible), and an entry with the item's id that is not a tool result (ineligible)."
    },
    {
      "id": "RDY-10",
      "severity": "minor",
      "location": "tasks.md §4.1 and §4.2",
      "finding": "Small gaps in the context adapter's tests, plus one invented behaviour.",
      "rationale": "(a) Text for array content is the text blocks joined with `\\n`, but no case has two text blocks. (b) The copy-not-mutate requirement is stated in the implementation sentence only. A mutating implementation passes if the test compares the output to the same object. The live script exists because of exactly this (it compares snapshots). (c) 4.2 gives `empty recalledOutputs` a contract-guard return that nothing in the design or spec asks for, and the handler never takes that path. It is an extra production branch with no caller. (d) \"an out-of-range index is not exercised by the handler\" leaves the adapter's behaviour for that index unspecified.",
      "concrete_case": "`appendRecalledContextToMessages` pushes onto the original message's `content` array. The output looks right and the earlier request's input is silently corrupted.",
      "recommendation": "Add a two-text-block join case. Take a `structuredClone` of the input in 4.2 and assert it is unchanged after the call. Either drop the empty-input guard or state it is a decided behaviour with its reason. State what an out-of-range index does, or say it is undefined."
    },
    {
      "id": "RDY-11",
      "severity": "minor",
      "location": "tasks.md §7.1; design.md decisions 5 and 9",
      "finding": "Three small decisions are left open in the use case: the tie-break comparator, the owner of the `budgetCharacters <= 0` guard, and the order of notify versus recording the token.",
      "rationale": "\"ties by id ascending\" does not say code-unit order or locale order. Decision 5 says the handler returns at `budgetCharacters <= 0` before calling the use case, and 7.1 also asserts the use case's own guard, so the check exists in two places. Decision 9 says to notify, record the token with no ids, and return `[]`. 7.1 says \"the use case never throws\". If `notifyOnce` throws (a stale `ctx`), the order decides whether the token is recorded and whether the throw escapes. 5.1 says the stale-ctx throw reaches the runner.",
      "concrete_case": "`notifyOnce` throws on the first failing key, the token is never recorded, and each later request under that key waits up to the bound again against \"One attempt\".",
      "recommendation": "State the comparator (`a < b` code-unit order). State whether the use case's `<= 0` guard is the contract and the handler's is redundant. State the order (record the token, then notify) and test a throwing notifier."
    },
    {
      "id": "RDY-12",
      "severity": "minor",
      "location": "tasks.md §8.2",
      "finding": "Two of 8.2's assertions are not observable as written, and the `shortcut:` comment ruling 4 requires is not in the task.",
      "rationale": "\"The handler assigns `current = ctx` first\" and \"the sequence is config holder → extractLatestUserPrompt → window → ...\" cannot be observed from outside; internal call order is not a behaviour. Only the skip conditions and outputs are. The notice going to the second event's `ctx` is the observable form. The design says `resolveReserveTokens` carries a `shortcut:` comment citing `settings-manager.js`, and 8.2 never mentions it. One task bundling the handler, the budget, the registration swap, `taiknr.ts` and `taiknr.test.ts` is also large.",
      "concrete_case": "Derek writes a vacuous \"order\" assertion with spies that pass for any order. No test fails if the sequence changes.",
      "recommendation": "Replace the sequence assertion with the observable cases: a failure notice reaches the latest event's `ctx.ui`, and a skip condition produces no `classify` call. Add the `shortcut:` comment to the implementation sentence. Optionally split registration (`taiknr.ts`, `taiknr.test.ts`) from the handler body."
    },
    {
      "id": "RDY-13",
      "severity": "minor",
      "location": "tasks.md §9.2",
      "finding": "The record of the two live runs has no stated home, and the task has no fallback if the key is absent.",
      "rationale": "9.2 says \"recorded in the change's verification notes\" but names no path. The tasks forbid any Markdown file other than `tasks.md`. A coder without `OPENROUTER_API_KEY` in their environment hits exit 2, and the plan does not say to stop and report rather than tick. The task is coder-run by Joel's Q5 ruling, which is fine, but spending his key needs the key to be present.",
      "concrete_case": "Derek's shell lacks the key, exit 2 is \"a setup check failure ... proves nothing\", and Derek ticks anyway or invents a notes file.",
      "recommendation": "Name where the exit codes and the failing-condition line are recorded. For example, write them under the task in `tasks.md` as the tick line. Add: if the key is absent, stop and report it to the conductor, and leave the task unticked."
    }
  ],
  "assumptions": [
    {
      "assumption": "All 16 existing test files are as the baseline says (16 on disk: 3 app, 2 config, 1 domain, 1 adapter, 6 handler, 3 use-case).",
      "status": "verified"
    },
    {
      "assumption": "The 221-test count in the baseline.",
      "status": "unverified"
    },
    {
      "assumption": "The stub bodies and signatures cited exist as described: `recall.ts`, `recall-relevant-context.ts`, `pi-context-adapter.ts`, `pi-jev-scorer-adapter.ts`, `pi-notifier-adapter.ts` (warned set before notify), `context.ts` (`_pi.on(\"context\", ...)`), and the `taiknr.ts` placeholder `notifier`.",
      "status": "verified"
    },
    {
      "assumption": "The new test paths do not exist and the modify targets do. `tests/support/classifier-guard.ts` is absent; `pi-archive-adapter.test.ts` and `fake-pi.ts` are present. `tests/domain/recall.test.ts` and `tests/infra/pi-event-handlers/context.test.ts` are absent.",
      "status": "verified"
    },
    {
      "assumption": "The installed pi 1.5.2 types carry `context_with_system`, `estimateTokens`, `DEFAULT_COMPACTION_SETTINGS`, `ModelRegistry.findOfType` and `.classify`, `ctx.signal`, `ExtensionAPI.getSettings` and `ExtensionContext.getContextUsage`. They also carry `ClassifierOptions` with `timeoutMs` and `maxRetries`, `ClassifierStopReason`, and `ContextEditEntry` whose `replacement` can be null.",
      "status": "verified"
    },
    {
      "assumption": "`createGatedPi` forwards `getSettings` and every non-`on` member, and the taiknr.test.ts Proxy allows only `on` at factory time. So registration may touch only `on`, and `getSettings` is read per event.",
      "status": "verified"
    },
    {
      "assumption": "The `TaiknrConfig` literals in tests that need updating are only `session-config.test.ts`, `handler-gate.test.ts` and `taiknr-config.test.ts` (L193 and L200). The others spread `DEFAULT_TAIKNR_CONFIG`.",
      "status": "verified"
    },
    {
      "assumption": "The `.mjs` script stays outside vitest, tsc and biome. The include globs are `tests/**/*.test.ts`, `src/**` plus `tests/**/*.ts`, and the biome allowlist.",
      "status": "verified"
    },
    {
      "assumption": "A real `ModelRegistry` with a registered System One classifier provider and a `fetch` stub is obtainable inside an extension session, so 6.2 and 8.x can run offline.",
      "status": "unverified"
    }
  ],
  "owner_questions": [
    {
      "question": "Is the timeout-versus-other-error field choice in the notice (decision 7: `elapsed >= classifierTimeoutMs`) allowed to use a monotonic clock plus a one-millisecond tolerance?",
      "options": [
        "Yes: `performance.now()` and `elapsed >= classifierTimeoutMs - 1`, stated in design decision 7 and task 6.1",
        "No: keep `Date.now()` and make the 6.2 test assert the field with a generous margin (a 50 ms bound with a hang held past 60 ms)"
      ],
      "recommended_option": "Yes: `performance.now()` and `elapsed >= classifierTimeoutMs - 1`, stated in design decision 7 and task 6.1",
      "why": "It is a design-level rule in an approved document, so only Michael can change it. A 1 ms early timer would otherwise flake 6.2's timeout case and name the wrong field."
    }
  ],
  "not_checked": [
    "Did not run `npm run test`, so the 16-file and 221-test baseline is unconfirmed beyond the file count.",
    "Did not execute or dry-run the System One guard path (a `taiknr-test` provider through `pi.registerProvider` with a stubbed `fetch`) to confirm 6.2 and 8.x work offline. Chidi owns that evidence.",
    "Did not read research-eleanor.md, research-chidi.md or the council files for the measurements the design cites.",
    "Did not verify the live script's loader path (`DefaultResourceLoader` with `additionalExtensionPaths`) or its token and context-window arithmetic.",
    "Did not check the Biome `noUnusedFunctionParameters` behaviour for `_signal` in the scorer, or the exact rules the 120-column formatter would apply.",
    "Did not re-open the design's compaction-case measurements or Joel's accepted ruling."
  ]
}