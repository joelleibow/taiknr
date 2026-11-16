{
  "mode": "review",
  "lens": "council-codebase",
  "paraphrase_proposes": "The plan implements recall in nine ordered groups: pure formatting in the domain, the new `classifierTimeoutMs` config field, a branch-only eligibility set in the archive adapter, the prompt extractor and tail-block appender, a one-per-factory notifier, the bounded classifier call and its notice, the use case that scores once per key and fits whole items to a character budget, the `context_with_system` handler plus composition-root change plus a shared offline classifier guard, and finally a root-level live script run by hand. Every group is test-first, leaves the suite green, and adds only the tests it names. Files are marked Create/Modify with none deleted, and a docs pass is listed separately and excluded.",
  "paraphrase_existing": "At `main` `22113ac` the archive half works end to end (staging, settlement, `taiknr-side-store`, hydration) while every recall body throws `Not implemented`: `formatRecalledContext`, `recallRelevantContext`, `extractLatestUserPrompt`, `appendRecalledContextToMessages` and `PiJevScorerAdapter.score`. `registerContextHandler` registers `_pi.on(\"context\", () => {})` and the composition root feeds it a placeholder `notifyOnce` plus a frozen `notifier` member. `createOncePerSessionNotifier` exists and sets its `warned` flag before calling `notify`, and the ports, `RecallCache` shape, `TaiknrConfig` fields and the gated `pi` are otherwise in place.",
  "recommendation": "Not ready as written, on three repair items and no blocking defect: the shared System One guard is created in group 8 but group 6.2 already needs it, task 9.2 records its evidence in an artifact the plan forbids creating, and task 8.2's asserted handler sequence includes steps that are not observable at a permitted test boundary. File boundary, current-state references and byte counts all check out against disk (381 and 263 recompute correctly; 16 baseline test files confirmed). Fix the three items and Derek can execute without a design decision.",
  "findings": [
    {
      "id": "CB-1",
      "severity": "major",
      "location": "tasks.md §6.2 (\"Add the red timeout test in the same file first, through pi-ai's real path: register a test provider whose classifier API maps to pi-ai's own System One `classify`, stub global `fetch` to hang until aborted\") vs §8.1 (\"Create `tests/support/classifier-guard.ts` …\")",
      "finding": "Group 6.2 requires exactly the fixture group 8.1 creates: a provider whose classifier API maps to pi-ai's System One `classify`, plus a hanging `fetch` stub and a scripted answer shape. The guard's Create task lands two groups later, so the coder must write an ad-hoc copy inside `tests/infra/adapters/pi-jev-scorer-adapter.test.ts` and then either refactor it away or leave two homes for one fixture.",
      "rationale": "Readiness standard §4 (dependency order and clean hand-offs) and AGENTS.md (\"A fixture two test files share has one home under `tests/support/`\"). Either branch forces the coder to make a placement decision the plan was supposed to settle, and the duplicated version is the one that would drift.",
      "concrete_case": "Derek implements 6.2 with a local `systemOneProvider()` helper in `tests/infra/adapters/pi-jev-scorer-adapter.test.ts`; 8.1 then creates `tests/support/classifier-guard.ts` with the same registration code, and the two copies diverge on baseUrl/apiKey/wire-type details, so a later change to the wire shape fixes one test and leaves the other green-but-wrong.",
      "recommendation": "Move the `tests/support/classifier-guard.ts` Create task to before 6.2 (a new group 5.2, or open group 6 with it), and let 8.1 only wire it into `archive-session.test.ts` and add the guard-catches-a-mistake test. State in 6.2 that the provider registration and fetch stub come from that helper."
    },
    {
      "id": "CB-2",
      "severity": "major",
      "location": "tasks.md §9.2 (\"Completion: both runs are recorded in the change's verification notes\") against the Gate paragraph (\"No Markdown file other than this `tasks.md` lands in the implementation\")",
      "finding": "Task 9.2's completion criterion points at \"the change's verification notes\", an artifact the plan never names, and the plan's own Gate forbids landing any Markdown other than `tasks.md`. The File Boundary has no path for it.",
      "rationale": "Readiness standard §3: a check must be provable and named. A completion criterion whose destination does not exist and cannot be created makes the task untickable or forces the coder to invent a location — the exact decision the plan must not leave open.",
      "concrete_case": "Derek runs both live scripts, gets exit 0 and exit 1 on prompt 3's \"no recall block\" condition, and then has to choose between reporting in chat only, appending to `tasks.md` (contradicting \"only this tasks.md lands\" in spirit but not letter), or writing a new Markdown file the gate forbids — with no rule to pick.",
      "recommendation": "Name the destination in 9.2, e.g. \"append both runs' exit codes and the failing condition as a note under task 9.2 in this `tasks.md`\" (the one Markdown file already in scope) or \"report both runs in the coder's completion message to the conductor\"."
    },
    {
      "id": "CB-3",
      "severity": "major",
      "location": "tasks.md §8.2 (\"the sequence is config holder → `extractLatestUserPrompt` → window → reserve → estimate → `readEligibleArchivedIds` → …\")",
      "finding": "The asserted call sequence is not fully observable at the boundaries the standard permits. `extractLatestUserPrompt`, the ranking/budget fit and pi's `estimateTokens` are internal steps of one handler; proving their relative order needs `vi.mock` of the sibling modules under test, and `estimate` has no observable effect at all.",
      "rationale": "Readiness standard §3: \"Fake only external side-effect boundaries; never mock the behavior under test.\" The coder is left to decide between mocking modules (forbidden), fabricating a hook in production (forbidden), or quietly weakening the assertion — all design decisions.",
      "concrete_case": "Derek writes the handler test with a recording `ctx` stub; `getContextUsage`, `getSettings`, `getBranch`, `findOfType` and `classify` record order, but nothing can record when `estimateTokens` ran or when `extractLatestUserPrompt` read the messages, so he drops half the enumerated sequence and the test no longer proves what the task claims.",
      "recommendation": "Restate the assertion as the order of observable boundary effects — `getContextUsage` → `getSettings` → `sessionManager.getBranch` → `modelRegistry.findOfType` → `classify` → the returned `{messages}` — and move \"the estimate is the sum of `estimateTokens` over `event.messages`\" into the budget-arithmetic case, which is asserted through the resulting `budgetCharacters` and observable skip/reach decisions."
    },
    {
      "id": "CB-4",
      "severity": "minor",
      "location": "tasks.md File Boundary, Tests row for `tests/support/fake-pi.ts` (\"A recording `ui.notify`, plus the `modelRegistry` seam the handler tests need\") against tests/support/fake-pi.ts L13-26 and L29-47",
      "finding": "The row understates what the handler tests need. The fake pi today has only `on` and `marker`, and `createContextStub` carries only `cwd`, `isProjectTrusted` and `sessionManager.getBranch`. The handler under test also calls `pi.getSettings()` and reads `ctx.getContextUsage()`, `ctx.model`, `ctx.signal` and `ctx.modelRegistry`.",
      "rationale": "The file is correctly marked Modify, so this is not a boundary violation, but the plan does not settle the stub's shape and the handler test cannot be written without adding `getSettings` to the fake pi and four members to the context stub — a data-shape choice left to the coder.",
      "concrete_case": "Derek adds `getSettings` to `tests/support/fake-pi.ts` and extends `createContextStub({cwd, trusted, branch})` with a second options bag, while three existing handler test files keep calling the old signature; the plan gave him no ruling on whether to widen `createContextStub` or build a separate `createRecallContextStub`.",
      "recommendation": "Name the additions in the row: a recording `ui.notify`, `getContextUsage`, `model`, `signal` and `modelRegistry` on the context stub, and `getSettings` on the fake pi, each defaulted so the six existing handler tests keep their current call sites."
    },
    {
      "id": "CB-5",
      "severity": "minor",
      "location": "design.md decision 2 (\"carries a `shortcut:` comment citing `settings-manager.js` L654-683\") and decision 4 (\"a doc comment on the field says so\") — no task mentions either",
      "finding": "Two comments the design makes binding are not carried into any task: the `shortcut:` comment on `resolveReserveTokens` and the doc comment on `RecallCache.lastPromptKey` explaining it holds the composed token. Neither is enforced by `npm run check`.",
      "rationale": "Readiness standard §1/§4: anything the design decides that no task produces is silently droppable, and the `lastPromptKey` comment is what stops a later reader \"fixing\" the field back to a bare key (ruling 6).",
      "concrete_case": "After implementation, `src/use-cases/recall-relevant-context.ts` keeps its current docblock with an accurately-named-looking `lastPromptKey: string` that holds \"3|1700000000000|hello\", and the next change re-implements the token comparison as an equality on the bare key because nothing on disk says otherwise.",
      "recommendation": "Add both sentences to the tasks that create them: the `shortcut:` comment in 8.2's implementation sentence, the field doc comment in 7.1's."
    },
    {
      "id": "CB-6",
      "severity": "minor",
      "location": "tasks.md §6.2 (\"Then wire the timeout options in `score` if 6.1 left the native call unproven\")",
      "finding": "A conditional instruction leaves the coder to judge whether 6.1 proved the native call. 6.1 already asserts the options object against a stub; 6.2 proves pi honours `timeoutMs`, which needs no new production code either way.",
      "rationale": "Readiness standard §1: \"if executing a task forces the coder to choose an interface … fail the plan.\" Here the choice is whether to edit `score` at all in 6.2.",
      "concrete_case": "Derek reads 6.1's assertion as sufficient, skips the conditional, and 6.2's test then fails; he debugs `src/infra/adapters/pi-jev-scorer-adapter.ts` rather than the test, and may add `maxRetries` twice or a second options object.",
      "recommendation": "Replace the conditional with the fact: 6.1 writes `{signal: ctx.signal, timeoutMs: config.classifierTimeoutMs, maxRetries: 0}` and 6.2 makes no production change unless the test fails, in which case the options object is the only thing to fix."
    },
    {
      "id": "CB-7",
      "severity": "minor",
      "location": "tasks.md §3.1 boundary cases, against src/infra/adapters/pi-archive-adapter.ts `toSettlementDrafts` and pi's `ContextEditEntry.replacement.content` (session-manager.d.ts L117-126: `ContextEditableContent` includes a bare string)",
      "finding": "The eligibility rule's boundary cases name an empty entry list, a null `replacement`, several edits and a malformed batch, but not a `replacement` whose `content` is a string rather than a block array — which the host type permits for a foreign `context_edit`.",
      "rationale": "Readiness standard §3 asks for the malformed/absent cases explicitly. Here TypeScript will force some narrowing, but a coder silencing it with a cast can treat the string's first character as a content block.",
      "concrete_case": "A foreign extension drafts `{type: \"context_edit\", targetId: id, replacement: {content: \"redacted\"}}`; an unchecked `replacement.content[0] as {type, text}` reads the character `\"r\"`, `text` is `undefined`, the item is (correctly) ineligible, but a cast that instead guards on `typeof === \"string\"` and wraps it would make the item eligible and resurrect the redacted raw text on the next request.",
      "recommendation": "Add the case to 3.1's list — \"a `replacement` whose `content` is a string is ineligible\" — so the narrowing is decided in the test, not in a cast."
    },
    {
      "id": "CB-8",
      "severity": "minor",
      "location": "tasks.md File Boundary, Tests row for `tests/support/classifier-guard.ts`, against tests/app/extension/archive-session.test.ts L4-6 and package.json devDependencies",
      "finding": "The guard must import pi-ai's System One `classify`, reachable only through `@earendil-works/pi-ai/api/typesafe-system-one`; `@earendil-works/pi-ai` is not a declared dependency and resolves solely because npm hoisted it through `@earendil-works/pi-coding-agent`. The plan does not say so, although the repo already carries a `// shortcut:` comment for that in `archive-session.test.ts`.",
      "rationale": "Readiness standard §3/§4: an undeclared dependency in a type-checked, linted file is a hand-off the plan should name, since the existing precedent documents it in one file and the guard introduces a second.",
      "concrete_case": "`npm ci` under a different lockfile layout, or a future pi-coding-agent that stops hoisting pi-ai, breaks `tsc --noEmit` on the new guard with `Cannot find module '@earendil-works/pi-ai/api/typesafe-system-one'`, and there is no comment in the new file saying why the import is legitimate.",
      "recommendation": "Say in 8.1 that the guard copies `archive-session.test.ts`'s `shortcut:` comment for the undeclared pi-ai import, and keep the import path (`/api/typesafe-system-one`), which the installed pi-ai's `exports` map does provide."
    }
  ],
  "assumptions": [
    {
      "assumption": "`estimateTokens` and `DEFAULT_COMPACTION_SETTINGS` are exported from `@earendil-works/pi-coding-agent`'s package root, as design decision 2 and task 8.2 require.",
      "status": "verified"
    },
    {
      "assumption": "`pi.getSettings()` returns raw `Settings` whose `compaction` is optional and carries `modelOverrides[\"<provider>/<id>\"].reserveTokens`, so `resolveReserveTokens`'s three-step chain is implementable and its \"compaction undefined\" boundary case is real.",
      "status": "verified"
    },
    {
      "assumption": "`context_with_system` exists in pi 1.5.2, is registrable through `pi.on`, and takes the same `ContextEventResult` return as `context`, so the frozen adapter signatures still accept the handler's messages.",
      "status": "verified"
    },
    {
      "assumption": "`ContextEditEntry` is part of `SessionEntry` and carries `targetId` and `replacement: {content} | null`, so `readEligibleArchivedIds(entries)` can read authorship from content with no store.",
      "status": "verified"
    },
    {
      "assumption": "`ModelRegistry.classify`'s options type carries `timeoutMs` and `maxRetries`, so asserting `{signal, timeoutMs, maxRetries: 0}` is type-legal.",
      "status": "verified"
    },
    {
      "assumption": "`formatRecalledContext`'s two-item block is exactly 381 characters and the one-item block 263, as design decision 10 states and task 1.1 asserts.",
      "status": "verified"
    },
    {
      "assumption": "The baseline is 16 test files (`tests/**/*.test.ts`), and root `test-recall-live.mjs` is outside `vitest.config.ts`'s include, `tsconfig`'s `src/`+`tests/` program and `biome.json`'s `files.includes` allowlist.",
      "status": "verified"
    },
    {
      "assumption": "`pi.registerProvider(name, {classifiers, models, baseUrl, apiKey})` is reachable from an inline extension in `extensionFactories` inside this repo's `ModelRuntime.create({modelsPath: null, allowModelNetwork: false})` harness — the mechanism the guard depends on. Chidi records it unread and unrun; the guard's own scripted-answer tests and its guard-catches-a-mistake test are what would catch a failure here.",
      "status": "unverified"
    },
    {
      "assumption": "pi's System One transport honours `timeoutMs` and `maxRetries: 0` as measured in T3 (51 ms for a 50 ms bound). Accepted from Chidi's measurement, not re-run.",
      "status": "unverified"
    },
    {
      "assumption": "The observability story is the design's: one `ctx.ui.notify` warning naming provider, model, field and reason, and nothing else — no logger, no `console.*`, every failure after the first silent (D11, ruling 15, Joel's Q4(a)). Recorded, not re-opened.",
      "status": "verified"
    }
  ],
  "owner_questions": [
    {
      "question": "Where do task 9.2's two live runs get recorded, given the plan forbids landing Markdown other than `tasks.md`?",
      "options": [
        "Append both runs (exit codes, which pass condition failed) as a note under task 9.2 in `tasks.md`",
        "Report both runs in the coder's completion message to the conductor, with no file written",
        "Write a separate `verification.md` in the change directory and exempt it from the no-Markdown rule"
      ],
      "recommended_option": "Append both runs (exit codes, which pass condition failed) as a note under task 9.2 in `tasks.md`",
      "why": "It is the one Markdown file already in implementation scope, so the evidence lands next to the task that produced it, survives the session, and needs no new exception to the Gate."
    },
    {
      "question": "Should the shared `tests/support/classifier-guard.ts` be created before group 6 rather than in 8.1?",
      "options": [
        "Move the guard's Create task ahead of 6.2 and leave 8.1 to wire it into `archive-session.test.ts`",
        "Keep 8.1 as written and accept a local duplicate helper in the scorer adapter test that 8.1 later replaces"
      ],
      "recommended_option": "Move the guard's Create task ahead of 6.2 and leave 8.1 to wire it into `archive-session.test.ts`",
      "why": "The guard is the fixture two test files share; creating it in 8.1 makes group 6 depend on later work and leaves one fixture with two homes, which AGENTS.md forbids."
    }
  ],
  "not_checked": [
    "Did not run `npm test`, `npm run check`, or the live script; the 221-test baseline count is taken from `research-eleanor.md`, and only the 16-file count was confirmed by listing `tests/`.",
    "Did not read `council.md` or `michael-council-rulings.json`; rulings 1–18 are taken as quoted in `design.md` and `tasks.md`.",
    "Did not verify pi's System One transport end to end (that `fetch` is resolved at call time, that a 50 ms bound rejects in ~51 ms, or that the wire question type is `noul`); accepted from `research-chidi.md`.",
    "Did not verify that `pi.registerProvider` succeeds from an inline extension in `extensionFactories` under `modelsPath: null, allowModelNetwork: false`, nor that `DefaultResourceLoader` loads a root `.mjs` probe before taiknr's handler in load order.",
    "Did not read `ARCHITECTURE.md`, `README.md` or `docs/adr/0001-0006` bodies; the docs-pass rows and the ADR numbering in the design's Migration Plan are unchecked.",
    "Did not check the living `development-checks` spec's exact wording about the root PoC files beyond what `biome.json` and `vitest.config.ts` show on disk."
  ]
}