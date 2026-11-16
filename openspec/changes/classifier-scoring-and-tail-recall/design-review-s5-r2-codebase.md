{
  "mode": "review",
  "lens": "council-codebase",
  "paraphrase_proposes": "The plan implements recall in nine ordered groups: `formatRecalledContext` and the threshold rule in the domain; the new `classifierTimeoutMs` config field with its rule and default 5000; `readEligibleArchivedIds` beside `readArchiveBatchesFromBranch`; `extractLatestUserPrompt` and `appendRecalledContextToMessages`; the notifier's `warned`-after-`notify` body; the bounded System One classifier call with its four-fact notice; the use case that scores once per `${store.size()}|${promptKey}` and fits whole items to a character budget; the `context_with_system` handler plus composition-root change plus a shared offline classifier guard; and a root-level live script run by hand. Every group is test-first, leaves the suite green, and adds only the tests it names. Files are marked Create or Modify with none deleted, and a docs pass is listed separately and excluded.",
  "paraphrase_existing": "At `main` `22113ac` the archive half works end to end while every recall body throws `Not implemented`: `formatRecalledContext`, `recallRelevantContext`, `extractLatestUserPrompt`, `appendRecalledContextToMessages` and `PiJevScorerAdapter.score`. `src/infra/pi-event-handlers/context.ts` registers `_pi.on(\"context\", () => {})` with a dependency object carrying a placeholder `notifier`, `src/app/extension/taiknr.ts` feeds that placeholder, `createOncePerSessionNotifier` sets `warned` before it calls `notify`, and `config.ts` validates five fields through a module-local `FIELD_RULES` map. The six non-`session_start` handlers register through `createGatedPi`, whose Proxy forwards every non-`on` member to the host.",
  "recommendation": "One blocking gap and three minor ones, all textual. Blocking: task 2.1 asks the config test to assert `FIELD_RULES.classifierTimeoutMs`, but `FIELD_RULES` is a module-local `const` in `src/config/taiknr-config.ts` with no export, and neither the design's file-boundary row for that file nor its row for the test adds one, so the clause cannot compile without an unstated public export — deleting the clause loses nothing because the file's `rejectedInputs` rows already pin the exact reason via `error.reason`. Minor: the gate case never assigns a ready `SessionConfig` before `setEnabled`, the gate case's \"real `SessionManager.inMemory()`\" has no `sessionManager` seam in `createContextStub` (it is `branch`), and the design says the `taiknr.test.ts` event list \"gains\" `context_with_system` while it must also lose `context`. Everything else the plan cites — `ContextWithSystemEvent`, `getContextUsage`, `getSettings`, `compaction.modelOverrides`, `DEFAULT_COMPACTION_SETTINGS`, `SessionManager.inMemory` with `appendMessage`/`appendContextEdit`/`appendCustomEntry`, the `rejectedInputs` row format, and the missing test files — matches disk.",
  "findings": [
    {
      "id": "CB-R2-1",
      "severity": "blocking",
      "location": "tasks.md §2.1 (\"and `FIELD_RULES.classifierTimeoutMs` returns that string\") against src/config/taiknr-config.ts L48 and tests/config/taiknr-config.test.ts L5-11",
      "finding": "The task asks the red tests to assert `FIELD_RULES.classifierTimeoutMs` returns the reason string, but `FIELD_RULES` is declared `const FIELD_RULES: { readonly [K in keyof TaiknrConfig]: (value: unknown) => string | undefined } = {` at L48 with no `export`. The test file imports only `CONFIG_FILE_NAME`, `DEFAULT_TAIKNR_CONFIG`, `loadTaiknrConfig`, `TaiknrConfig` and `TaiknrConfigError`. Neither the design's row for `src/config/taiknr-config.ts` (design.md L58, \"The field: `classifierTimeoutMs`, its default and its rule\") nor its row for `tests/config/taiknr-config.test.ts` (L72, \"The `toEqual` literal plus the rejection rows, including `2147483648`\") names an export, and no task in the File Boundary does either.",
      "rationale": "Readiness standard §2 blocks a plan that cites a symbol as reachable when it is not, and §1 forbids a task that forces the coder to choose an export. Adding `export` to a config module's rule table is a public-interface change the approved design never authorizes; dropping the clause is a silent under-implementation of the task's last requirement. The clause is also redundant: the file's `rejectedInputs: Array<[string, string | undefined, string]>` table (L133-160) is consumed by `test.each` (L163-169), which asserts `error.field` and `error.reason` per row, so the exact reason string is already pinned without the table being imported.",
      "concrete_case": "Derek writes `import { FIELD_RULES } from \"../../src/config/taiknr-config.js\"` in `tests/config/taiknr-config.test.ts` and `npm run typecheck` fails with `TS2459: Module '\"../../src/config/taiknr-config\"' declares 'FIELD_RULES' locally, but it is not exported.` He then either adds `export` to a production const nobody asked to expose, or deletes the assertion and wonders whether he missed the requirement. Either branch is a design decision the plan was supposed to settle.",
      "recommendation": "Delete the trailing clause from 2.1: `0`, `-1`, `1.5`, `1e999`, `2147483648` and `\"8000\"` are each rejected with reason exactly `must be an integer from 1 to 2147483647`, asserted in the file's existing row format` — full stop. If the design genuinely wants a direct unit assertion, add the export to design.md L58 and name it in L72 and task 2.1 as well; it must not stay implicit."
    },
    {
      "id": "CB-R2-2",
      "severity": "minor",
      "location": "tasks.md §8.2, case 7 \"The gate case\" (\"After `session.setEnabled(false)`, the handler returns `undefined` … After `session.setEnabled(true)` and a new user message, `classify` is called once\") against src/config/session-config.ts L27-32 and src/app/extension/handler-gate.ts L13-20",
      "finding": "The gate case never assigns a ready state to the `SessionConfig` it passes to `createGatedPi`, yet both `setEnabled` calls depend on one. `setEnabled(enabled)` begins `if (state.status !== \"ready\") return false;` and mutates nothing, and `createGatedPi`'s wrapper calls the handler only when `session.isActive()`, which is `state.status === \"ready\" && state.config.enabled`. The task names `decisionThreshold: 0` but not the `assign`.",
      "rationale": "Readiness standard §1/§3: the case must be executable as written. The failure here is quiet-then-loud: the disabled assertion passes vacuously because an unresolved holder is inactive anyway, and the enabled assertion then fails without saying why. AGENTS.md's own trap paragraph names exactly this (\"A test that registers through it and fires the event sees nothing until it assigns a ready state to the holder\"), so the fix is one clause.",
      "concrete_case": "Derek builds `const session = createSessionConfig()`, passes it to `createGatedPi(fake.pi, session)`, calls `session.setEnabled(false)` (returns `false`, state unchanged), fires the event and sees `undefined` → first assertion green. He then calls `session.setEnabled(true)` (returns `false` again), fires the event with a new user message, and `classify` is never called, so the case goes red for a reason unrelated to the gate.",
      "recommendation": "Add the assign to the case sentence: `with the item in the store and the holder assigned {status: \"ready\", config: {...DEFAULT_TAIKNR_CONFIG, decisionThreshold: 0}}`, then `session.setEnabled(false)` …`."
    },
    {
      "id": "CB-R2-3",
      "severity": "minor",
      "location": "tasks.md §8.2, case 7 (\"over a real `SessionManager.inMemory()` branch carrying the item's tool result, its `taiknr-side-store` entry and taiknr's stub `context_edit`\") against tests/support/fake-pi.ts L36-45 and design.md L68",
      "finding": "`createContextStub`'s only branch seam is `branch?: SessionEntry[]`, and the design's row for `tests/support/fake-pi.ts` enumerates exactly five new optional fields (`contextWindow`, `model`, `signal`, `modelRegistry`, `notify`) — no `sessionManager`. So \"over a real `SessionManager.inMemory()` branch\" is only reachable by building entries with a real manager and passing `branch: manager.getBranch()`; the task does not say so.",
      "rationale": "The plan is executable — the repo already carries the exact construction pattern — but the wording invites a sixth stub option the approved file-boundary row does not list, which is the kind of unstated data-shape choice the zero-decision rule forbids.",
      "concrete_case": "Derek reads \"real `SessionManager.inMemory()`\" as \"give the stub a live manager\", extends `createContextStub` with a `sessionManager?: SessionManager` option, and now `tests/support/fake-pi.ts` changes in a way design.md L68 does not describe and design-review never approved. The cheaper path is `branch: manager.getBranch()`.",
      "recommendation": "Say the seam: \"over the branch a real `SessionManager.inMemory()` yields (`appendMessage` for the tool result, `appendCustomEntry(TAIKNR_SIDE_STORE_TYPE, batch)`, `appendContextEdit(id, {content: [{type: \"text\", text: stub}]})`), passed as `createContextStub`'s `branch`\" — mirroring the pattern already in `tests/infra/adapters/pi-archive-adapter.test.ts` L319-337."
    },
    {
      "id": "CB-R2-4",
      "severity": "minor",
      "location": "design.md L69 (\"The registered event list gains `context_with_system`, in the same task group as the registration change\") against tests/app/extension/taiknr.test.ts L5-21 and tasks.md §8.2",
      "finding": "The live test is an exact seven-element `toEqual` on `events.sort()`, and it currently contains `\"context\"`. Registering `context_with_system` means the list must lose `\"context\"` as well as gain the new name; the design's row says only \"gains\", and task 8.2 says only \"update … the registered event list\".",
      "rationale": "Readiness standard §2 asks the boundary row to say what changes. Here the omission is cheap to fix and the failure is loud (`toEqual` on a 7-element sorted array), but the row as written describes a mutation that leaves eight entries and a red test.",
      "concrete_case": "Derek appends `\"context_with_system\"` to the expected array and leaves `\"context\"` in place; `events.sort()` has eight entries and `toEqual` fails against the seven-element literal, so he must infer the removal from the failure rather than from the plan.",
      "recommendation": "Change design.md L69 (and task 8.2's clause) to \"the registered event list loses `context` and gains `context_with_system`, so the seven-element `toEqual` and the test's name stay true\"."
    }
  ],
  "assumptions": [
    {
      "assumption": "`estimateTokens` and `DEFAULT_COMPACTION_SETTINGS` are exported from `@earendil-works/pi-coding-agent`'s package root, as design decision 2 and task 8.2 require (`dist/index.d.ts` L6 re-exports both from `./core/compaction`).",
      "status": "verified"
    },
    {
      "assumption": "`context_with_system` exists as an `pi.on` overload, its event carries `messages: AgentMessage[]` with no separate `system` field (the `messages` docblock says it is the full transcript including system messages), and its result type is `ContextEventResult = { messages?: AgentMessage[] }`, so the frozen adapter signatures and `return { messages: … }` hold.",
      "status": "verified"
    },
    {
      "assumption": "`ctx.getContextUsage(): ContextUsage | undefined` and that `ContextUsage` is `{tokens: number | null; contextWindow: number; percent: number | null}` (so `createContextStub`'s `{tokens: null, contextWindow, percent: null}` literal is type-legal), while `pi.getSettings(): Settings` lives on `ExtensionAPI` and `createGatedPi`'s Proxy forwards non-`on` members via `Reflect.get`.",
      "status": "verified"
    },
    {
      "assumption": "The document's three-rung reserve chain matches pi's own resolution: `Settings['compaction']` carries `modelOverrides: Record<string, {reserveTokens?: number; keepRecentTokens?: number}>` and `reserveTokens`, `DEFAULT_COMPACTION_SETTINGS.reserveTokens` is 16384, and `SettingsManager.getCompactionTokenSetting` resolves override → ordinary → built-in default exactly in that order.",
      "status": "verified"
    },
    {
      "assumption": "`SessionManager.inMemory(cwd?, options?, entries?)` takes `cwd` optionally, and `appendMessage`, `appendCustomEntry`, `appendContextEdit` and `appendCompaction` are public methods usable without `bindExtensions` — the repo already exercises the ungated pattern at `tests/infra/adapters/pi-archive-adapter.test.ts` L319-337.",
      "status": "verified"
    },
    {
      "assumption": "`FIELD_RULES` is module-local (no `export`) and `tests/config/taiknr-config.test.ts`'s \"existing row format\" is the `rejectedInputs: Array<[text, field, reason]>` table consumed by `test.each`, which asserts `error.field` and `error.reason`.",
      "status": "verified"
    },
    {
      "assumption": "`tests/infra/pi-event-handlers/context.test.ts`, `tests/domain/recall.test.ts`, `tests/use-cases/recall-relevant-context.test.ts` and the three adapter test files under `tests/infra/adapters/` do not exist, so their Create rows are correct; `tests/support/fake-pi.ts` and `tests/infra/adapters/pi-archive-adapter.test.ts` do exist as Modify targets; `test-jev-poc.mjs` sits at the repository root and no `test-recall-live.mjs` exists.",
      "status": "verified"
    },
    {
      "assumption": "`createContextStub`'s five added optional fields cover every `ctx`/`pi` member design decision 2 reads (`getContextUsage`, `model`, `signal`, `modelRegistry`, `ui.notify`, `sessionManager.getBranch`, `pi.getSettings`), so the handler tests need no further stub surface beyond CB-R2-3's `branch` seam.",
      "status": "verified"
    },
    {
      "assumption": "`getSettings` reached through `createGatedPi`'s Proxy binds correctly on the real host object; the gate case is the first handler to read a non-`on` member through the gate, so nothing in the suite proves it today.",
      "status": "unverified"
    },
    {
      "assumption": "pi's real `getContextUsage()` returns `undefined` for a window of 0 or less (design decision 2 step 4 and Chidi's addendum); `createContextStub`'s `contextWindow: 0` case instead returns `{contextWindow: 0}`, so task 8.2's \"or 0\" skip is reached through the `budgetCharacters <= 0` guard rather than the window guard. The observable outcome is the same — no classifier call.",
      "status": "unverified"
    },
    {
      "assumption": "The live script's ordering assumption — `DefaultResourceLoader` loads `additionalExtensionPaths` before any `extensionFactories`, so the pre-probe sees `event.messages` before taiknr's handler — is Chidi's measurement, not re-run here.",
      "status": "unverified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "Did not run `npm test`, `npm run check` or `npm run typecheck`; the 16-file/221-test baseline is taken from `research-eleanor.md` and the plan.",
    "Did not read the `extension-packaging` and `tail-recall` spec deltas in full, nor the `development-checks` spec, nor ADR 0002/0004/0005/0006 bodies; only the `configuration` delta and the design's citations were checked.",
    "Did not verify design decision 10's 381/263 byte counts or the marker guard's exact output — settled in this round.",
    "Did not verify `settings-manager.js` L654-683's exact line range; read L653-684 and `settings-schema.d.ts` instead and confirmed the resolution order.",
    "Did not verify pi's System One wire mapping (`bool` → `noul`), the 50 ms / 1,430 ms retry measurement, or that `pi.registerProvider` succeeds from an inline `extensionFactories` provider under `modelsPath: null, allowModelNetwork: false`; accepted from `research-chidi.md`.",
    "Did not verify the live script's OpenRouter model's tool-call support, the `before_provider_request` payload shape, or RPC-mode `notify` rendering.",
    "Did not verify the design's claim that `pi.getSettings()` applies no defaults to the extension-visible copy of `compaction`; only its raw type (all fields optional) was checked."
  ]
}