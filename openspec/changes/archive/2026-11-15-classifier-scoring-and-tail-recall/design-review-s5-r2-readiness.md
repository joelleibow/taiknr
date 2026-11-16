{
  "mode": "review",
  "lens": "council-readiness",
  "paraphrase_proposes": "tasks.md plans nine groups: the pure formatter, the `classifierTimeoutMs` config field, the eligibility reader, the context adapter, the notifier, the scorer plus the shared classifier guard, the use case, the event bridge with session-level tests and a gate, and a paid live script. Every group names its red tests, boundary cases, completion command and boundary-error stance. The guard's nine exports, the `fake-pi.ts` additions and decision 7's reason sentences are now written out. The guard is created in 6.2, before 8.x consumes it. 8.3 adds session-level recall tests. 9.2 records the live runs under the task.",
  "paraphrase_existing": "At `22113ac` every recall body throws `Not implemented`. `context.ts` registers `_pi.on(\"context\", () => {})`, `taiknr.ts` passes a placeholder `notifier`, and `createOncePerSessionNotifier` sets `warned` before `notify`. The archive half works: settlement writes the side-store entry and the `context_edit` stubs, and hydration fills `InMemoryArchiveStore`. Six handlers register through `createGatedPi`, which calls them only while `session.isActive()`. `FIELD_RULES` in `taiknr-config.ts` is module-local. The suite has 16 test files, and `tests/support/` holds only `fake-pi.ts`. `archive-session.test.ts` drives real sessions over a faux model and an isolated agent dir.",
  "recommendation": "Ready for implementation after five minor edits. R1's blocking and major findings are resolved: the guard moves ahead of its consumers, interfaces are named, reason sentences are written, 6.2 is labelled a characterisation test with a shown mutation, and the clock tolerance is fixed. The guard's route into pi checks out: a provider registered by an extension and one registered on a unit-route `ModelRegistry` both reach the same `ModelRuntime`. I found no zero-decision gap that blocks Derek. The edits: one vacuous session test (8.3 item 4), a `setActiveTools` timing trap, an unreachable exact-boundary case in the budget test, an unexported `FIELD_RULES` the config task asserts through, and a contradiction about `enabled` in 8.2.",
  "findings": [
    {
      "id": "RDY2-1",
      "severity": "minor",
      "location": "tasks.md §8.3 item 4 (\"Off at session level\")",
      "finding": "`expect(guard.requests).toEqual([])` in the `a trusted project file that turns taiknr off` test passes even if the gate and the handler's inertness are deleted.",
      "rationale": "That test runs one prompt, \"run it\", on an empty store. With taiknr off nothing is ever archived, so there is never an eligible item. Recall would make no classifier call whether or not the gate works. The standard needs a test that fails when the behaviour is removed. The real proof is 8.2 case 7, which has an archived item in the store, `setEnabled(false)` and a counting `classify`.",
      "concrete_case": "Derek wraps `registerContextHandler` on the ungated `pi` in `taiknr.ts`. Prompt \"run it\" still reaches `context_with_system`, the eligible set is empty, no call is made, and item 4 stays green.",
      "recommendation": "Drop item 4. Alternatively keep the one line but label it a regression guard against a leaked call, not a proof of inertness, and say that case 7 carries the proof."
    },
    {
      "id": "RDY2-2",
      "severity": "minor",
      "location": "tasks.md §8.3 item 1 (the `beforeTaiknr` probe and `pi.setActiveTools`)",
      "finding": "The task says the probe \"calls `pi.setActiveTools([\"big_out\"])` before prompt 1\" without saying when. Pi throws if it is called while the factory runs.",
      "rationale": "In `loader.js` L113 and L132, `setActiveTools` is `notInitialized` until the runner binds its actions: \"Extension runtime not initialized. Action methods cannot be called during extension loading.\" The call has to come after `sessionHarness()` returns, from a `pi` the probe kept. Or it can use `session.setActiveTools`. Choosing is a small test-local decision, but the failure mode costs a debug cycle.",
      "concrete_case": "Derek puts the call in the probe's factory body and every test in the file throws at `bindExtensions`.",
      "recommendation": "State that the probe keeps its `pi` (or the test uses `session.setActiveTools`) and calls it after `sessionHarness()` resolves, once before prompt 1 and once after the settled run."
    },
    {
      "id": "RDY2-3",
      "severity": "minor",
      "location": "tasks.md §8.2 case 4 (the budget)",
      "finding": "The exact-boundary case is stated as \"`4 * (window - reserve - estimate)` equals the formatted block's length, and not when it is one less\". The budget moves in 4-character steps.",
      "rationale": "`budgetCharacters` is a multiple of 4. It can equal the block's length only when that length is a multiple of 4, and \"one less\" is one token, which is 4 characters. The task never says to pad the fixture item's `rawText` to make the length divisible by 4, so Derek has to pick a window or padding to hit the boundary.",
      "concrete_case": "The fixture's block is 381 characters. No integer window gives `4 * k === 381`, so the \"equals\" assertion is unreachable. Derek loosens it to `>=` and the exact-fit case loses its boundary.",
      "recommendation": "State that the fixture pads `rawText` so the block length is a multiple of 4, the append case uses `window - reserve - estimate = length / 4`, and the drop case uses one token less."
    },
    {
      "id": "RDY2-4",
      "severity": "minor",
      "location": "tasks.md §2.1 (\"`FIELD_RULES.classifierTimeoutMs` returns that string\")",
      "finding": "The task puts `FIELD_RULES.classifierTimeoutMs` in the test's assertion sentence. `FIELD_RULES` is a module-local, unexported const (`taiknr-config.ts` L50), so a test cannot call it.",
      "rationale": "Read as a test assertion, it forces a choice between exporting a private symbol, which widens the module's public surface, and reading the clause as implementation-only. The zero-decision rule settles exports.",
      "concrete_case": "Derek exports `FIELD_RULES` to satisfy the sentence. Or he asserts the reason only through `loadTaiknrConfig` rows and wonders whether he missed a requirement.",
      "recommendation": "Reword: the rejection rows assert `TaiknrConfigError.reason` through `loadTaiknrConfig`. `FIELD_RULES` stays unexported and gains an entry whose rule returns that string."
    },
    {
      "id": "RDY2-5",
      "severity": "minor",
      "location": "tasks.md §8.2 (closing sentence and cases 3 to 6)",
      "finding": "Two small gaps. The closing sentence says \"The handler tests `enabled` nowhere\", while case 7 tests it through `createGatedPi`. And cases 3 to 6 need eligible items, but only case 7 says how to build a branch that carries them.",
      "rationale": "The first reads like a rule against any `enabled` test, and Derek could add an in-handler `enabled` check or drop case 7. For the second, cases 3 to 6 need `deps.store` populated and a branch carrying the tool-result entry, the `taiknr-side-store` entry and a stub `context_edit`. Case 7 uses a real `SessionManager.inMemory()` branch, so the builder exists but is unnamed for the other cases.",
      "concrete_case": "Cases 3 and 6 find no eligible item, so the use case never calls `classify`. The test fails for a fixture reason, not a handler reason.",
      "recommendation": "Change the sentence to: the handler body has no `enabled` check, and case 7 proves the composition through the real gate. Add: cases 3 to 6 reuse case 7's real-`SessionManager` branch builder, one private helper in `context.test.ts`."
    }
  ],
  "assumptions": [
    {
      "assumption": "`ModelRegistry`, `ModelRuntime`, `estimateTokens` and `DEFAULT_COMPACTION_SETTINGS` are exported from the pi-coding-agent root, and the `./api/*` subpath of pi-ai exports `classify` from `typesafe-system-one`. `ProviderConfig.classifiers` and `ProviderClassifierModelConfig` exist as 6.2 uses them.",
      "status": "verified"
    },
    {
      "assumption": "A provider registered through an extension factory and one registered on a unit-route `ModelRegistry` both land in the same `ModelRuntime` the handler's `ctx.modelRegistry` wraps. Pending registrations are flushed at bind (`agent-session-services.js` L72-84; `agent-session.js` L3079).",
      "status": "verified"
    },
    {
      "assumption": "`vi.stubEnv(\"OPENROUTER_API_KEY\", \"\")` clears the key. `envApiKeyAuth` resolves at request time and treats an empty string as unset (`auth/helpers.js` L16-25).",
      "status": "verified"
    },
    {
      "assumption": "`createGatedPi` forwards `getSettings` by `Reflect.get`. `taiknr.test.ts` allows only `on` at factory time, so registration touches nothing else. `SessionConfig.setEnabled` works only after a ready `assign`.",
      "status": "verified"
    },
    {
      "assumption": "`SessionManager.inMemory` offers `appendMessage`, `appendCustomEntry` and `appendContextEdit`, enough to build 8.2 case 7's branch.",
      "status": "verified"
    },
    {
      "assumption": "No source-side `TaiknrConfig` literal breaks when the required field is added. The only literals are in `session-config.test.ts`, `handler-gate.test.ts` and `taiknr-config.test.ts`, all named in 2.1. The other tests spread `DEFAULT_TAIKNR_CONFIG`.",
      "status": "verified"
    },
    {
      "assumption": "The faux provider passes its `TranscriptContext` unchanged, so system messages at an index above 0 reach its handler. Pi inserts a tool-delta system message before the first non-system pending message (`agent-loop.js` L215-250).",
      "status": "verified"
    },
    {
      "assumption": "The 221-test baseline and a green `npm run check` at `22113ac`.",
      "status": "unverified"
    },
    {
      "assumption": "Chidi's measured timings (the hang stub's rejection mapped to the timeout notice, the three-attempt 1.4 s without `maxRetries: 0`), and the System One `noul` wire mapping.",
      "status": "unverified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "Did not run `npm run test`, `npm run check` or any task's completion command, so the 221-test baseline and the guard's offline behaviour are unconfirmed.",
    "Did not execute the guard's hang stub to confirm what error it must reject with so pi-ai reports a timeout. A wrong choice shows up as a characterisation-test failure in 6.2.",
    "Did not check the order of `vi.stubEnv` against `ModelRuntime.create` in 6.2's guard-catching test. Auth reads the environment at request time, so I expect it not to matter.",
    "Did not review the live script's loader path, the OpenRouter model's tool support, or 9.1's exit-code logic. Only `node --check` is available in the task.",
    "Did not re-open the settled items from the brief: the 381-unit string, RDY-8 to RDY-11, STRUCT-2, or the folded CB and STRUCT rows."
  ]
}