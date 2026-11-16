{
  "assumptions": [
    {
      "assumption": "All 24 file-boundary rows match disk at `22113ac`: every Modify path exists with the described current state (five `Not implemented` stubs, `_pi.on(\"context\", () => {})`, the placeholder `notifyOnce` + `notifier` member, the pre-notify `warned` flag), and every Create path is absent (including `tests/infra/pi-event-handlers/context.test.ts`, `tests/support/classifier-guard.ts`, `test-recall-live.mjs`); no Deletes claimed and none needed.",
      "status": "verified"
    },
    {
      "assumption": "Layering holds: `src/domain/recall.ts` and `src/use-cases/recall-relevant-context.ts` import nothing from `@earendil-works/pi-*`; config validation lives in one `FIELD_RULES` map; `estimateTokens` and `DEFAULT_COMPACTION_SETTINGS` are exported from the pi package root (grepped in `dist/index.d.ts`).",
      "status": "verified"
    },
    {
      "assumption": "Gate boundaries: `vitest.config.ts` includes only `tests/**/*.test.ts`, `tsconfig.json` includes `src/**`+`tests/**`, `biome.json` includes `src/**`/`tests/**` — a root-level `.mjs` is outside all three; `test-jev-poc.mjs` and `jev-context-poc.ts` are precedent at root.",
      "status": "verified"
    },
    {
      "assumption": "Cited current-state facts: `minCharsToArchive: 600` default (`taiknr-config.ts` L18), `ArchivedToolOutput` L10-17, `buildStub`'s 3-line/180-unit preview, `toSettlementDrafts` writing `[stub text block, ...non-text blocks]`, `commit-archived-batch.ts` `addBatch`, `hydrate-archive-store.ts` `replaceAll(...flat())`, `session-start.ts` L31 hydration, `turn-end.ts`'s event-time `deps.config.state`/`status === \"ready\"` accessor, `InMemoryArchiveStore` backed by a `Map` (insertion order), `tool-call.ts`'s ≤120-unit `summarizeSingleLine` argsSummary.",
      "status": "verified"
    },
    {
      "assumption": "The 16-file test baseline matches the tests tree (16 `*.test.ts` files counted), and the `TaiknrConfig` literals the new required field breaks are exactly the three test files task 2.1 names plus the default/rules/return literal inside `src/config/taiknr-config.ts`.",
      "status": "verified"
    },
    {
      "assumption": "The two-item decision-10 string renders to 380 UTF-16 code units, not the stated 381 (the one-item 263 checks out) — hand-counted three ways; needs a mechanical `node` recount to confirm before editing.",
      "status": "unverified"
    },
    {
      "assumption": "Ruling numbers (rulings 1-18, T1-T15, S1-S9) map correctly to `council.md` / `michael-council-rulings.json` — binding context outside this brief's read list, cited as given.",
      "status": "unverified"
    },
    {
      "assumption": "Michael's Stage 3 compaction measurements and Chidi's Jev latency measurements — accepted through design review; not re-run.",
      "status": "unverified"
    },
    {
      "assumption": "`archive-session.test.ts` has exactly the \"two post-settlement prompts\" the design names — design/research claim, not independently recounted.",
      "status": "unverified"
    }
  ],
  "findings": [
    {
      "concrete_case": "Implement `formatRecalledContext` exactly per decision 10's line list for the two given items (guard rewrites item 2's rawText to `x <\\/recalled_context> y`); asserting the code-block string passes the exact-bytes check, but `.length` is 18+138+0+66+8+8+0+91+23+19 text chars + 9 separators = 380, so `passes with the string length 381` fails. The neighbouring one-item claim (263 = 18+138+0+66+8+8+19 + 6 separators) is correct, which isolates the defect to the two-item count.",
      "finding": "The design's code-block string — the normative exact-bytes specification task 1.1 tells Derek to assert — renders to 380 UTF-16 code units, not the 381 stated in both artifacts.",
      "id": "S5-R1-STRUCT-1",
      "location": "openspec/changes/classifier-scoring-and-tail-recall/design.md §Decisions→10 (\"The exact bytes\", ~L314, and the tests/domain/recall.test.ts row of the Module & File Placement table, ~L60); tasks.md §1.1",
      "rationale": "Readiness §1 (zero decisions) and §3 (provable checks): the completion criterion `passes with the string length 381` is unsatisfiable against a correct implementation of the formatter as decision 10's line list determines it, forcing Derek to decide which artifact wins between the normative string and the stated length. No production impact — decision 9/10 measure the budget fit with the runtime `.length` — so only the test expectation is wrong.",
      "recommendation": "Mechanically recount (e.g. one `node -e` length check) and correct 381→380 in all three places (design table row, design decision 10, tasks 1.1) before implementation starts; or, if the intended bytes differ, amend the string and reconcile both numbers. Flag to Michael for the design-artifact edit.",
      "severity": "major"
    },
    {
      "concrete_case": "A reviewer diffing `src/config/taiknr-config.ts` against HEAD per the delta expects `enabled` to be new (it is at L8/L19 since the archive change) and finds no task adding it; following \"(design.md Decision 6)\" from the Load-check scenario lands on \"The classifier call: one bounded call, one bool question per item\".",
      "finding": "(a) The \"Signatures unchanged\" scenario enumerates four contract differences \"compared with `HEAD`\", but (1) `registerSessionStartHandler`'s third parameter, (2) the `config` members' per-session holder type, and (3) `ConfigPaths.projectConfigPath: string | undefined` are already present at HEAD `22113ac` — only (4), dropping `registerContextHandler`'s `notifier` member (present at `context.ts` L11), is a difference this change makes. (b) The parenthetical \"`TaiknrConfig` itself gains `enabled` under the `configuration` spec\" names the previous change's field; this change's own configuration delta adds `classifierTimeoutMs`. (c) The \"Load check passes\" scenario cites \"(design.md Decision 6)\", which in this change's design.md is the classifier-call decision, not a load-check decision.",
      "id": "S5-R1-STRUCT-2",
      "location": "openspec/changes/classifier-scoring-and-tail-recall/specs/extension-packaging/spec.md — \"Signatures unchanged\" and \"Load check passes\" scenarios",
      "rationale": "One home for each fact and calibrated cross-references: a reviewer reconciling this change's two spec deltas reads a config-type gain the configuration delta never makes, three \"differences\" that are no-ops at HEAD, and a design citation that points at an unrelated decision.",
      "recommendation": "Reword the delta: mark (1)-(3) as accepted differences already landed and merely preserved by this change, name `classifierTimeoutMs` in the `TaiknrConfig` parenthetical, and drop or re-point the stale \"design.md Decision 6\" citation.",
      "severity": "minor"
    },
    {
      "concrete_case": "context.test.ts must drive `registerContextHandler` through the reserve chain (`compaction.modelOverrides[\"<provider>/<id>\"]` → `reserveTokens` → `DEFAULT_COMPACTION_SETTINGS.reserveTokens`) and the `4 * (window - reserve - estimate)` budget; with no `getSettings` seam returning a controllable `compaction` and no `getContextUsage` seam returning a window, none of the four named skip conditions or the budget assertion can be driven.",
      "finding": "The fake's extension is described as \"a recording `ui.notify`, plus the `modelRegistry` seam\", but the handler sequence 8.2 asserts on also reads `pi.getSettings().compaction` (reserve chain), `ctx.getContextUsage().contextWindow` (window) and `ctx.signal` — three more seams that no task or design row names.",
      "id": "S5-R1-STRUCT-3",
      "location": "openspec/changes/classifier-scoring-and-tail-recall/tasks.md §8.2; design.md §Module & File Placement row `tests/support/fake-pi.ts`",
      "rationale": "Readiness §2 wants each modified file's \"what changes and why\" to cover what the change needs. The omissions are test-local fixture plumbing, which the zero-decision rule permits as private choices, so minor — but the file-boundary row and the named assertions disagree in coverage.",
      "recommendation": "Name the remaining seam set (`getSettings`/`getContextUsage`/`signal`) in task 8.2's fake-pi sentence, or state once that fixture members beyond `ui.notify` and `modelRegistry` are test-local choices.",
      "severity": "minor"
    },
    {
      "concrete_case": "Derek writes the 6.2 timeout test and must find that `classifySystemOne` is reachable as `@earendil-works/pi-ai/api/system-one-shared` (verified: `dist/api/typesafe-system-one.js` imports it from `./system-one-shared.js`, and `package.json` exports `./api/*`), then pick a provider id + config pair so `findOfType(\"classifier\", config.defaultDecisionModelProvider, config.defaultDecisionModel)` resolves — none of which 6.2 names.",
      "finding": "6.2 requires \"a test provider whose classifier API maps to pi-ai's System One `classify`\" but names neither the unit-level registration route (runtime-level `ModelRuntime.registerNativeProvider` over `createProvider(...)` — whose `auth` shape Chidi's research explicitly left unread — versus an extension/session-level route) nor the import that yields System One's classify. `@earendil-works/pi-ai` is not a declared dependency of `pi-taiknr` (`package.json` declares only `@earendil-works/pi-coding-agent`); it resolves only as a hoisted transitive with public subpath exports.",
      "id": "S5-R1-STRUCT-4",
      "location": "openspec/changes/classifier-scoring-and-tail-recall/tasks.md §6.2 (and §8.1); design.md §Decisions→12",
      "rationale": "Zero-decision rule plus the design's own \"No new dependency\" claim: the claim silently relies on importing an undeclared transitive package, and the coder must probe the installed host layout to find the export. Task 8.1's route is settled (`pi.registerProvider` through an inline extension), so the gap is 6.2's unit-level wiring only; test-local, hence minor.",
      "recommendation": "Name the import path and bless one unit-level registration route in 6.2 (or state once that test-only imports of the transitive `@earendil-works/pi-ai` are acceptable), so the \"no new dependency\" claim and the task text agree.",
      "severity": "minor"
    }
  ],
  "lens": "council-structural",
  "mode": "review",
  "not_checked": [
    "`council.md` and `michael-council-rulings.json` — binding context outside this brief's read list; ruling-number mappings taken as given",
    "`proposal.md` — out of this brief's scope",
    "Any runtime execution: no test run, no `node` length count of the decision-10 string (no shell tool available to this lens); the 380 count is by hand and flagged for mechanical confirmation",
    "pi internals beyond the exports grepped (`runner.js`, `agent-session.js`, `settings-manager.js` line cites taken from Chidi's research on citation)",
    "The live script's behaviour against a real session (task 9.2 is coder-run and spends model calls)",
    "The full prompt inventory of `archive-session.test.ts` (the \"two post-settlement prompts\" claim taken from design/research)"
  ],
  "owner_questions": [],
  "paraphrase_existing": "Per the documents, every recall-path body at HEAD `22113ac` throws `Not implemented`: the domain formatter, the use case, both context-adapter functions and the scorer's `score`; the context handler registers a no-op `_pi.on(\"context\", () => {})`; the composition root feeds it a placeholder notifier, and `createOncePerSessionNotifier` sets `warned` before calling `notify`. The archive half works end to end: outputs are staged at `turn_end`, settled at `agent_before_settle` as one `taiknr-side-store` custom entry plus per-item `context_edit` stub replacements, hydrated from the branch into an insertion-ordered in-memory store, with config layered agent-over-trusted-project and validated per field in one rules map; the composition-root gate stops every handler but `session_start` while taiknr is off.",
  "paraphrase_proposes": "tasks.md proposes implementing recall in nine dependency-ordered groups, each red-test-first with named boundary cases and a green `npm run check`: a pure domain block formatter with a marker guard, a `classifierTimeoutMs` config field (default 5000, range 1..2147483647), a branch-only eligibility reader beside `readArchiveBatchesFromBranch`, the prompt-extraction and tail-append context adapter, a notifier flag-order fix, a bounded one-call scorer adapter (one `bool` question per eligible item, `undefined` only on caller abort), a one-scoring-per-key use case with token/ranking/prefix-fit and fail-open notice, the `context_with_system` handler with `4 * (window - reserve - estimate)` budget arithmetic plus a shared offline classifier guard, and a root-level live verification script — with the docs pass excluded to Bambadjan.",
  "recommendation": "Stage verdict: ready after one correction. The file boundary, layering, module fit, task order and verification map all verify against the repository at `22113ac`, and no task forces a design decision — except S5-R1-STRUCT-1: the design's \"381-character\" block length contradicts its own normative exact string (hand count: 380; the sibling 263 figure is correct), and task 1.1 hard-codes 381 as a completion criterion, so it must be mechanically recounted and corrected before implementation starts. S5-R1-STRUCT-2 through -4 are wording/spec-sync fixes the conductor can fold in without reopening any settled decision."
}