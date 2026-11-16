{
  "mode": "review",
  "lens": "council-structural",
  "paraphrase_proposes": "tasks.md proposes nine dependency-ordered groups, each red-test-first with named boundary cases and a green `npm run check`: the pure domain formatter with its marker guard and decision 10's exact 381-character two-item string, the `classifierTimeoutMs` config field (default 5000, range 1..2147483647, one reason string in `FIELD_RULES`), the branch-only eligibility reader beside `readArchiveBatchesFromBranch`, the prompt-extraction and tail-append context adapter, the notifier flag-order fix, the bounded one-call scorer adapter with decision 7's six reason sentences, the one-scoring-per-key use case with token/ranking/prefix-fit and fail-open notice, the `context_with_system` bridge over the shared offline classifier guard created in 6.2 (`tests/support/classifier-guard.ts`, nine named exports, unit and session routes) with seven observable handler cases plus four session-level recall tests in 8.3, and the root-level `test-recall-live.mjs` live verification run once by the coder with both runs recorded under task 9.2 in tasks.md itself. The docs pass is listed to match the design table but excluded as Bambadjan's, and no Markdown file other than tasks.md lands.",
  "paraphrase_existing": "At `main` `22113ac` every recall-path body throws `Not implemented` — `formatRecalledContext`, `recallRelevantContext`, `extractLatestUserPrompt`, `appendRecalledContextToMessages` and the scorer's `score` — while `src/infra/pi-event-handlers/context.ts` registers a no-op `_pi.on(\"context\", () => {})`, the composition root feeds it a placeholder `notifyOnce` plus a frozen `notifier` member, and `createOncePerSessionNotifier` sets `warned` before calling `notify`. The archive half works end to end: settlement writes one `taiknr-side-store` batch plus per-item `context_edit` stub replacements, hydration fills the insertion-ordered `InMemoryArchiveStore`, and config layers agent-over-trusted-project through one module-local `FIELD_RULES` map, with the composition-root gate stopping every handler but `session_start` while taiknr is off. The suite holds 16 test files under `tests/` mirroring `src/`, `tests/support/fake-pi.ts` is its only shared fixture, and the gate (biome, `tsc --noEmit`, vitest) covers only `src/**` and `tests/**` plus four root config files, leaving root-level `.mjs` files outside.",
  "recommendation": "Ready — Derek can start. Round 3 re-verified the whole structural surface against the repository at `22113ac`: all 24 file-boundary rows match disk (nine production Modify paths with the described stub state, every Create path absent including `tests/infra/pi-event-handlers/context.test.ts`, `tests/support/classifier-guard.ts` and `test-recall-live.mjs`, no Deletes), layering holds (domain and use-cases free of pi imports, `FIELD_RULES` unexported), the gate leaves the root script uncollected/unlinted/untyped, the design/tasks/spec cross-references are coherent (decision numbers, the coverage table, the three spec deltas and the configuration rejection rows align), and the host surface the tests need (`estimateTokens`, `DEFAULT_COMPACTION_SETTINGS`, `ModelRegistry`, `ProviderConfig` from the pi root; pi-ai's `./api/*` subpath) is real. No settled finding's trigger section changed — decision 10's items, header and guard are byte-identical to the settled 381-unit text, decision 9's failure branch and decision 11's notifier wiring are unchanged, 8.2 and 8.3 match the round-2-verified wording, and the extension-packaging delta and the L69/L42 shorthand stand as settled — so every settled row stays closed and no new finding is raised.",
  "findings": [],
  "assumptions": [
    {
      "assumption": "All 24 file-boundary rows match disk at `main` `22113ac`: the nine production Modify paths exist with the described current state (`Not implemented` stubs in `src/domain/recall.ts`, `src/use-cases/recall-relevant-context.ts`, `src/infra/adapters/pi-context-adapter.ts` and `pi-jev-scorer-adapter.ts`; `_pi.on(\"context\", () => {})` in `src/infra/pi-event-handlers/context.ts`; the placeholder `notifyOnce` and frozen `notifier` member in `src/app/extension/taiknr.ts`; `warned = true` set before `getCtx().ui.notify` in `pi-notifier-adapter.ts`; `readArchiveBatchesFromBranch` and `InMemoryArchiveStore` in `pi-archive-adapter.ts`; the module-local `FIELD_RULES` map with its reason-string house pattern in `taiknr-config.ts`), and every Create path is absent — `tests/domain/recall.test.ts`, `tests/use-cases/recall-relevant-context.test.ts`, `tests/infra/adapters/pi-context-adapter.test.ts`, `pi-jev-scorer-adapter.test.ts`, `pi-notifier-adapter.test.ts`, `tests/infra/pi-event-handlers/context.test.ts`, `tests/support/classifier-guard.ts` and `test-recall-live.mjs`.",
      "status": "verified"
    },
    {
      "assumption": "Layering and one-home rules hold on disk: `src/domain/recall.ts`, `src/use-cases/recall-relevant-context.ts` and `src/use-cases/ports.ts` import nothing from `@earendil-works/pi-*`; the config file's name lives once in `CONFIG_FILE_NAME`; the `TaiknrConfig` literals task 2.1 must update exist exactly where named (`tests/config/session-config.test.ts` L9-15, `tests/app/extension/handler-gate.test.ts` L9-15, `tests/config/taiknr-config.test.ts`'s `toEqual` literals and its `rejectedInputs` row format at L133), so the required `classifierTimeoutMs` field breaks exactly those three files and the plan's same-group instruction covers them.",
      "status": "verified"
    },
    {
      "assumption": "The gate leaves the root script alone, re-read this round: `vitest.config.ts` includes only `tests/**/*.test.ts`, `tsconfig.json` includes only `src/**` and `tests/**`, and `biome.json`'s `files.includes` names `src/**`, `tests/**` and four root files, so a root-level `test-recall-live.mjs` is uncollected, unlinted and untype-checked, with `test-jev-poc.mjs` and `jev-context-poc.ts` as the root precedent.",
      "status": "verified"
    },
    {
      "assumption": "The host surface the new tests need is real, re-grepped this round: `estimateTokens`, `DEFAULT_COMPACTION_SETTINGS` and `ModelRegistry` are exported from the pi-coding-agent root (`dist/index.d.ts` L6, L13), `ProviderConfig` from L8, and pi-ai's `package.json` exposes the `./api/*` subpath (L30) that task 6.2's `classify` import and its copied `shortcut:` comment rely on.",
      "status": "verified"
    },
    {
      "assumption": "Every settled finding's trigger section is unchanged since the round that settled it, so none reopens: decision 10's two items, header line, marker-guard rule and 381/263 character counts are byte-identical to the settled S5-R1-STRUCT-1 text; decision 9's rejection/`undefined` mapping and decision 11's notifier wiring are unchanged (RDY-11, RDY-8..10, CB-7, decisions 2/3/5 rules unchanged); tasks 8.2 and 8.3 carry the same case lists and fixture choices round 2 verified (RDY2-1..3, RDY2-5, CB-R2-2/3); the extension-packaging delta's requirement text is unchanged (S5-R1-STRUCT-2, structural-r2-STR-1); and the `Gains context_with_system` shorthand in `design.md` L69 and `tasks.md` L42 stands as settled (CB-R2-4).",
      "status": "verified"
    },
    {
      "assumption": "The design's event-time config accessor citation is accurate: `src/infra/pi-event-handlers/turn-end.ts` reads `deps.config.state` and returns unless `state.status === \"ready\"` (L17-19), which is the accessor decision 2's step 2 and task 8.2's first skip condition reuse.",
      "status": "verified"
    },
    {
      "assumption": "The 16-file test baseline matches the tests tree recounted this round (3 app/extension, 2 config, 1 domain, 1 infra/adapters, 6 infra/pi-event-handlers, 3 use-cases, plus `tests/support/fake-pi.ts` outside the count).",
      "status": "verified"
    },
    {
      "assumption": "The 221-test count of the baseline and a green `npm run check` were not re-run (no shell tool available to this lens); the baseline stands on `research-eleanor.md`'s recorded run.",
      "status": "unverified"
    },
    {
      "assumption": "Ruling and finding numbers (rulings 1-18, T1-T15, S1-S9, D1-D15, O1-O8) map to `council.md` / `michael-council-rulings.json`, which sit outside this brief's read list; they are taken as given, as in rounds 1 and 2.",
      "status": "unverified"
    },
    {
      "assumption": "Michael's round-1 and round-2 measurements (the guard's two routes running green, the 1,430 ms three-attempt `maxRetries` mutation, the 3-of-200 timeouts at 19 ms, `node --check` parsing ESM) are accepted on his recorded evidence, not re-executed.",
      "status": "unverified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "`council.md` and `michael-council-rulings.json` — binding context outside this brief's read list; ruling-number mappings taken as given",
    "`proposal.md` and `design-review.md` — outside this brief's scope; the design's provenance and Stage 1-4 history taken from the approved document",
    "Any runtime execution: no `npm run test`, no `npm run check`, no `node` length recount and no guard prototype run (no shell tool available to this lens); Michael's run evidence and the settled 381/263 counts are accepted on citation",
    "pi internals beyond the exports grepped (`runner.js`, `agent-session.js`, `settings-manager.js`, `compaction.js`, `system-one-shared.js` line cites taken from Chidi's research and Michael's resolutions on citation)",
    "The live script's behaviour against a real session, including the `--break-model` failing run and the two recorded lines, which exist only once task 9.2 runs and spends model calls"
  ]
}