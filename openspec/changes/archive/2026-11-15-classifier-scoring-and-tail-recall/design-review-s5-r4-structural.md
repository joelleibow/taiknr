{
  "assumptions": [
    {
      "assumption": "The artifacts are unchanged since round 3's clean pass: `michael-resolve-s5-r3.json` records `round_status: clean` with three declines and no `required_change`, so the settled findings' trigger sections stand as round 3 verified them.",
      "status": "verified"
    },
    {
      "assumption": "All file-boundary rows match disk: the nine production Modify paths exist with the described stub state (`Not implemented` in `src/domain/recall.ts`, `src/use-cases/recall-relevant-context.ts`, `pi-context-adapter.ts` and `pi-jev-scorer-adapter.ts`; `_pi.on(␟context␟, () => {})` in `context.ts`; the placeholder `notifyOnce` and `notifier` member in `taiknr.ts`; `warned = true` before `notify` in `pi-notifier-adapter.ts`; `readArchiveBatchesFromBranch` at `pi-archive-adapter.ts` L144; module-local `FIELD_RULES`, exported `DEFAULT_TAIKNR_CONFIG` and `CONFIG_FILE_NAME` in `taiknr-config.ts`), and every Create path is absent (`tests/domain/recall.test.ts`, `tests/use-cases/recall-relevant-context.test.ts`, `pi-context-adapter.test.ts`, `pi-jev-scorer-adapter.test.ts`, `pi-notifier-adapter.test.ts`, `tests/infra/pi-event-handlers/context.test.ts`, `tests/support/classifier-guard.ts`, `test-recall-live.mjs`; `tests/domain/` holds only `archived-output.test.ts`, `tests/infra/adapters/` only `pi-archive-adapter.test.ts`).",
      "status": "verified"
    },
    {
      "assumption": "The required `classifierTimeoutMs` field breaks exactly the three test files task 2.1 names in the same group: full `TaiknrConfig` literals exist only at `tests/config/session-config.test.ts` L9, `tests/app/extension/handler-gate.test.ts` L8 and `tests/config/taiknr-config.test.ts`'s hand-written `toEqual` literal with `rejectedInputs` rows at L133; every other test spreads `DEFAULT_TAIKNR_CONFIG` and breaks nowhere.",
      "status": "verified"
    },
    {
      "assumption": "The gate leaves the root script alone: `vitest.config.ts` includes only `tests/**/*.test.ts`, `tsconfig.json` only `src/**/*.ts` and `tests/**/*.ts`, and `biome.json`'s `files.includes` names `src/**`, `tests/**` and four root config files, so a root `test-recall-live.mjs` is uncollected, unlinted and untype-checked — and 9.2's appended lines in `tasks.md` sit outside biome's includes too.",
      "status": "verified"
    },
    {
      "assumption": "The host surface the tasks need is real, re-grepped: `estimateTokens`, `DEFAULT_COMPACTION_SETTINGS` and `ModelRegistry` are exported from the pi-coding-agent root (`dist/index.d.ts` L6), and `ModelRegistry` has a public `constructor(runtime)` and `registerProvider(providerName, config)` (`model-registry.d.ts` L21-55), which 6.2's unit route and `classifierProviderExtension`'s session route rely on.",
      "status": "verified"
    },
    {
      "assumption": "The handler-test seams tasks 8.2 and 8.3 build on exist: `createGatedPi` in `src/app/extension/handler-gate.ts`, `sessionHarness` with `beforeTaiknr`/`afterTaiknr`/`extensionFactories` options, `sideStoreBatches` and `contextEdits` helpers, and `createContextStub`'s option-object shape in `tests/support/fake-pi.ts` — each defaulted addition compiles unchanged as the task states.",
      "status": "verified"
    },
    {
      "assumption": "No settled finding reopens: decision 10's two items, header and guard are byte-identical to the settled 381-unit text; decision 9's failure/cancel branch, decision 11's notifier wiring, decisions 2/3/5/6/7's rules, tasks 8.2 and 8.3's case lists, 1.1's zero-items parenthetical, 2.1's `rejectedInputs` assertion, and the extension-packaging delta's requirement text are unchanged from the rounds that settled them.",
      "status": "verified"
    },
    {
      "assumption": "Design decision 8's multipliers are arithmetically calibrated against its own measurements: 5000/361 ≈ 13.9 (␞about 14×␞ the maximum) and 5000/241–248 ≈ 20.2–20.7 (␞about 20×␞ the median); no unverified superlative or blanket caveat without a concrete case was found in the design, tasks or deltas.",
      "status": "verified"
    },
    {
      "assumption": "The 221-test baseline and a green `npm run check` were not re-run (no shell tool available to this lens); the baseline stands on `research-eleanor.md`'s recorded run at `main` `22113ac`.",
      "status": "unverified"
    },
    {
      "assumption": "Ruling and finding numbers (rulings 1–18, T1–T15, S1–S9, D1–D15, O1–O8) map to `council.md` / `michael-council-rulings.json`, outside this brief's read list; taken as given, as in rounds 1–3.",
      "status": "unverified"
    },
    {
      "assumption": "Michael's recorded measurements (the guard's two routes running green, the 1,430 ms three-attempt `maxRetries` mutation, 3-of-200 timeouts reading 19 ms, the compaction probes) are accepted on his recorded evidence, not re-executed.",
      "status": "unverified"
    }
  ],
  "findings": [],
  "lens": "council-structural",
  "mode": "review",
  "not_checked": [
    "`council.md` and `michael-council-rulings.json` — binding context outside this brief's read list; ruling-number mappings taken as given",
    "`proposal.md` and `design-review.md` — outside this brief's scope; provenance and Stage 1–4 history taken from the approved documents",
    "Any runtime execution: no `npm run test`, no `npm run check`, no UTF-16 length recount and no guard prototype run (no shell tool available to this lens); the settled 381/263 counts and Michael's run evidence are accepted on citation",
    "pi internals beyond the exports grepped (`runner.js`, `agent-session.js`, `settings-manager.js`, `compaction.js`, `system-one-shared.js` line cites are taken from Chidi's research and Michael's resolutions)",
    "The live script's behaviour against a real session, including the `--break-model` failing run and the two recorded lines under task 9.2, which exist only once 9.2 runs and spends model calls"
  ],
  "owner_questions": [],
  "paraphrase_existing": "At `main` `22113ac` every recall-path body throws `Not implemented` — the formatter, the use case, both context-adapter functions and the scorer's `score` — while `context.ts` registers a no-op `context` handler, the composition root feeds it a placeholder `notifyOnce` behind a frozen `notifier` member, and `createOncePerSessionNotifier` sets `warned` before calling `notify`. The archive half works end to end (settlement's side-store batches and stub `context_edit`s, insertion-ordered hydration, the agent-over-project config layering through one module-local `FIELD_RULES`, and the composition-root gate), and the repo's 16-file suite mirrors `src/` with `tests/support/fake-pi.ts` as its only shared fixture. The gate (biome, `tsc --noEmit`, vitest) covers only `src/**` and `tests/**` plus four root config files, leaving root-level `.mjs` files outside.",
  "paraphrase_proposes": "tasks.md proposes nine dependency-ordered groups, each red-test-first with named boundary cases and a green `npm run check`: the domain formatter with its marker guard and decision 10's exact 381-character string, the `classifierTimeoutMs` field (default 5000, range 1..2147483647, one reason string in the unexported `FIELD_RULES`), the branch-only eligibility reader, the prompt-extraction and tail-append adapter, the notifier flag-order fix, the bounded one-call scorer with decision 7's six reason sentences, the one-scoring-per-key use case with token/ranking/prefix-fit and fail-open notice, the `context_with_system` bridge over the shared offline classifier guard (6.2's `tests/support/classifier-guard.ts` with its nine named exports and two routes) with seven handler cases plus four session-level tests, and the root-level `test-recall-live.mjs` live verification run once by the coder with both runs recorded under task 9.2 in tasks.md itself. The docs pass is listed to match the design table but excluded as Bambadjan's, and no Markdown file other than tasks.md lands.",
  "recommendation": "Ready — Derek can start. Round 4 re-verified the structural surface against the repository at `22113ac` and found nothing new: all file-boundary rows match disk (nine Modify paths with the described stub state, every Create path absent including the handler-test mirror path, `tests/support/classifier-guard.ts` and `test-recall-live.mjs`), layering and one-home rules hold (domain and use-cases free of pi imports, `FIELD_RULES` module-local, the timeout's value fixed once in decision 8 and asserted once in 2.1, the exact block bytes fixed once in decision 10), the design/tasks/spec cross-references stay coherent (decision numbers, the coverage table, the three deltas, the configuration rejection rows, and the three-and-only-three `TaiknrConfig` literal sites 2.1 names), and the gate provably leaves the root script and 9.2's recorded lines outside its scope. No settled finding's trigger section changed — round 3's resolution was clean with three declines and no edits, so decisions 2, 3, 5, 6, 7, 9, 10 and 11, tasks 8.2 and 8.3, 2.1's `rejectedInputs` assertion and the extension-packaging delta all stand byte-identical to what their settling rounds verified — so every settled row stays closed and no new finding is raised."
}