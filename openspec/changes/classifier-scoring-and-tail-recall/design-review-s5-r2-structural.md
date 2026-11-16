{
  "mode": "review",
  "lens": "council-structural",
  "paraphrase_proposes": "tasks.md proposes nine dependency-ordered groups, each red-test-first with named boundary cases and a green `npm run check`: the pure domain formatter with its marker guard, the `classifierTimeoutMs` config field (default 5000, range 1..2147483647), the branch-only eligibility reader, the prompt-extraction and tail-append context adapter, the notifier flag-order fix, the bounded one-call scorer adapter (one `bool` question per eligible item, `undefined` only on caller abort, notice text fixed by decision 7), the one-scoring-per-key use case with token/ranking/prefix-fit and fail-open notice, then the `context_with_system` bridge over a shared offline classifier guard created in 6.2 (`tests/support/classifier-guard.ts`) with seven observable handler cases plus four session-level recall tests in 8.3, and finally the root-level `test-recall-live.mjs` live verification run once by the coder with both runs recorded in tasks.md itself. Round 1's resolution reordered the guard ahead of every consumer, named the guard's and fake host's interfaces, wrote the notice's reason sentences, made 6.2's real-path tests characterisation tests with a shown `maxRetries` mutation, and gave the live-run record a home and a stop-and-report rule.",
  "paraphrase_existing": "At `main` `22113ac` every recall-path body throws `Not implemented` — `formatRecalledContext`, `recallRelevantContext`, `extractLatestUserPrompt`, `appendRecalledContextToMessages` and the scorer's `score` — while `src/infra/pi-event-handlers/context.ts` registers a no-op `_pi.on(\"context\", () => {})`, the composition root feeds it a placeholder `notifyOnce` plus a frozen `notifier` member, and `createOncePerSessionNotifier` sets `warned` before calling `notify`. The archive half works end to end: settlement writes one `taiknr-side-store` batch plus per-item `context_edit` stub replacements, hydration fills the insertion-ordered `InMemoryArchiveStore`, and config layers agent-over-trusted-project through one `FIELD_RULES` map, with the composition-root gate stopping every handler but `session_start` while taiknr is off. The suite holds 16 test files under `tests/` mirroring `src/`, `tests/support/fake-pi.ts` is its only shared fixture, and the gate (biome, `tsc --noEmit`, vitest) covers only `src/**` and `tests/**`, leaving root-level `.mjs` files like `test-jev-poc.mjs` outside.",
  "recommendation": "Ready. Every round-1 required change is in the amended artifacts verbatim and verifies against the repository: 6.2 creates the shared guard ahead of all its consumers with its nine named exports and both registration routes, 8.1 is stated not-red offline preparation, 8.2 asserts the seven observable handler cases and carries the `shortcut:` comment, 8.3 holds the four session-level recall tests, design decision 7 fixes all six reason sentences and the `- 1` tolerance with 6.1's elapsed-time control stated, 2.1 pins the rejection string, and 9.2 records both live runs in tasks.md itself with the stop-and-report rule. The 24 file-boundary rows match disk (the nine Modify stubs exactly as described, every Create path absent, no Deletes), layering holds, the group order is dependency-clean, and the folded round-1 rows are resolved through RDY-1, RDY-2, RDY-5, CB-2 and CB-3 as applied. No new findings; the settled rows stay closed, and Derek can start.",
  "findings": [],
  "assumptions": [
    {
      "assumption": "All 24 file-boundary rows match disk at `main` `22113ac`: the nine production Modify paths exist with the described current state (five `Not implemented` stubs in `src/domain/recall.ts`, `src/use-cases/recall-relevant-context.ts` and `src/infra/adapters/pi-context-adapter.ts`/`pi-jev-scorer-adapter.ts`; `_pi.on(\"context\", () => {})` in `src/infra/pi-event-handlers/context.ts`; the placeholder `notifyOnce` and frozen `notifier` member in `src/app/extension/taiknr.ts`; `warned = true` set before `getCtx().ui.notify` in `src/infra/adapters/pi-notifier-adapter.ts`), and every Create path is absent, including `tests/infra/pi-event-handlers/context.test.ts`, `tests/support/classifier-guard.ts` and `test-recall-live.mjs`.",
      "status": "verified"
    },
    {
      "assumption": "Every round-1 required change is applied verbatim in the amended artifacts: RDY-1's reorder (6.2 creates the guard with the real-path tests on the unit route and the guard-catches-a-mistake test; 8.1 wires the guard into `archive-session.test.ts` as not-red offline preparation with no mistake test; 8.2 is the handler task; 8.3 holds the session-level tests; 8.4 is the gate run; both File Boundary rows and the matching design rows agree), RDY-2's nine guard exports, two routes and fake-pi members with every existing call site kept compiling, RDY-3's gate case and four session-level tests with design decision 12 pointing at them, RDY-4's six reason sentences, RDY-5's characterisation wording and the measured `maxRetries` mutation, RDY-6's `- 1` row with its measurement and 6.1's elapsed-time control, RDY-7's reason string, CB-2's record home and stop-and-report rule, and CB-3's seven observable cases with the `shortcut:` comment in the implementation sentence.",
      "status": "verified"
    },
    {
      "assumption": "Every symbol and helper the amended tasks cite exists on disk: `readArchiveBatchesFromBranch` (`pi-archive-adapter.ts` L144), `createGatedPi(pi, session)` forwarding every non-`on` member (`handler-gate.ts`), `SessionConfig.setEnabled/isActive`, `DEFAULT_TAIKNR_CONFIG`, the `FIELD_RULES` reason-string house pattern (`must be an integer >= 0`), the `TaiknrConfig` literals in `session-config.test.ts`, `handler-gate.test.ts` and `taiknr-config.test.ts`, and `sessionHarness`/`beforeTaiknr`/`afterTaiknr`/`extensionFactories`/`sideStoreBatches`/`contextEdits`/`errors`/`agentDirectory`/`BIG_TEXT`, the L4-5 `shortcut:` comment and the off-test at L362 in `archive-session.test.ts`, whose post-settlement prompts are exactly two (`what did you see?` and `one more`; the other second prompts follow aborted runs, not settlements).",
      "status": "verified"
    },
    {
      "assumption": "The host surface the new tests need is real: `ModelRegistry` and `ProviderConfig` are exported from the pi-coding-agent root (`dist/index.d.ts` L13, L8), pi-ai's `package.json` exports `./api/*` (L30), `api/typesafe-system-one.js` exports `classify` wrapping `classifySystemOne` (L2, L29), `system-one-shared.js` maps public `bool` questions to wire `noul` and reads the answer from `answer.noul` (L48, L54, L100-106), and `estimateTokens` and `DEFAULT_COMPACTION_SETTINGS` are exported from the pi root (`index.d.ts` L6).",
      "status": "verified"
    },
    {
      "assumption": "The gate leaves the root script alone: vitest collects only `tests/**/*.test.ts`, tsconfig includes only `src/**` and `tests/**`, and biome's `files.includes` names `src/**`, `tests/**` and four root files, so `test-recall-live.mjs` is uncollected, unlinted and untype-checked, with `test-jev-poc.mjs` as the root precedent; AGENTS.md L20 (one home under `tests/support/` for a fixture two test files share, still linted and type-checked) and L32 (the lint-allowlist trap) are cited accurately, and `node --check` parses ESM on the installed Node 26.8.1 (its CHANGELOG: \"module: fix --check on ambiguous ESM files\", #65203), so 9.1's completion command is satisfiable.",
      "status": "verified"
    },
    {
      "assumption": "The 16-file baseline matches disk (16 `*.test.ts` files counted: 3 app/extension, 2 config, 1 domain, 1 infra/adapters, 6 infra/pi-event-handlers, 3 use-cases).",
      "status": "verified"
    },
    {
      "assumption": "The 221-test count of the baseline and a green `npm run check` were not re-run (no shell tool available to this lens).",
      "status": "unverified"
    },
    {
      "assumption": "Michael's round-1 measurements — the guard's unit route and archive-session wiring running green under the gate, the 1,430 ms three-attempt `maxRetries` mutation, the 3-of-200 timeouts reading 19 ms, and `ProviderConfig`/`ModelRegistry` type-checking — are accepted on his recorded evidence, not re-executed.",
      "status": "unverified"
    },
    {
      "assumption": "Ruling and finding numbers (rulings 1-18, T1-T15, S1-S9, D1-D15, O1-O8) map to `council.md` / `michael-council-rulings.json`, which sit outside this brief's read list; they are taken as given.",
      "status": "unverified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "`council.md` and `michael-council-rulings.json` — binding context outside this brief's read list; ruling-number mappings taken as given",
    "`proposal.md` and `design-review.md` — outside this brief's scope; the design's provenance and Stage 1-4 history taken from the approved document",
    "Any runtime execution: no `npm run test`, no `npm run check`, no `node` length count and no guard prototype run (no shell tool available to this lens); Michael's round-1 run evidence is accepted on citation",
    "pi internals beyond the exports grepped (`runner.js`, `agent-session.js`, `settings-manager.js`, `compaction.js` line cites taken from Chidi's research and Michael's resolution on citation)",
    "The live script's behaviour against a real session, including the `--break-model` failing run and the two recorded lines, which exist only once task 9.2 runs and spends model calls"
  ]
}