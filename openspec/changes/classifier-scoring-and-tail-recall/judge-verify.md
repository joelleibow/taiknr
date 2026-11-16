# Verification Report: classifier-scoring-and-tail-recall

Using change: `classifier-scoring-and-tail-recall` (schema `marbleization`), branch `classifier-scoring-and-tail-recall`, PR #4.
Head commit verified: `2cfbbd8e9808e53537d02d6f6a994847f59a428a` (`gh pr view 4 --json headRefOid` and `git rev-parse HEAD` agree; the working tree was clean).

`npm run check` was run on that head: lint (50 files), typecheck and vitest are green. The suite is 22 files and 327 tests, against the baseline in `tasks.md` of 16 files and 221 tests. No model call was made. `test-recall-live.mjs`, `jev-context-poc.ts` and `test-jev-poc.mjs` were not run. `node --check test-recall-live.mjs` parses. No reproduction copy was needed, so no temp directory was created.

## Summary

| Dimension | Status |
|---|---|
| Completeness | 15/15 tasks ticked (`progress.remaining` 0). Spec coverage: 3 delta specs (`tail-recall`, `configuration`, `extension-packaging`), 14 requirements (11 + 1 + 2 as ADDED/MODIFIED), all with implementation found. |
| Correctness | 14/14 ADDED/MODIFIED requirements have matching code. 3 scenarios have no test that exercises them as written (see SUGGESTIONs 1–3). No requirement diverges. |
| Coherence | Design followed on all 13 decisions; one deliberate narrowing of the live script is recorded in the design itself. Code follows project patterns. Not verified: task 9.2's live run (see below). |

No REMOVED or RENAMED requirements exist in these deltas.

## Completeness

**Task completion.** All 15 tasks are ticked (1.1, 2.1, 3.1, 4.1, 4.2, 5.1, 6.1, 6.2, 7.1, 8.1–8.4, 9.1, 9.2). Each ticked task has its artifact in the diff:
- `tests/domain/recall.test.ts` and `formatRecalledContext` (1.1);
- `classifierTimeoutMs` with its rule and rows in `tests/config/taiknr-config.test.ts` (2.1);
- `readEligibleArchivedIds` with 9 tests (3.1);
- the context adapter, its test file and its 16 tests (4.x);
- the notifier body and its 5 tests (5.1);
- the scorer, `tests/support/classifier-guard.ts` and the real-path tests (6.x);
- the use case and its 17 tests (7.1);
- the guard wired into `archive-session.test.ts`, the handler and its 15 tests, and the three session-level recall tests (8.x);
- `test-recall-live.mjs` (9.1).

**Task 9.2 — not verified here, by the brief.** `tasks.md` carries the two recorded lines the task asks for:
- exit 0 for the passing run, with the `PASS:` line printed;
- exit 1 for `--break-model`, on "prompt 3's first request has no recall block".

I did not re-run them, because that spends model calls. The report relies on the recorded evidence and nothing more.

**Scope claims.** `git diff main...HEAD --name-only` outside `openspec/` and `.pi/` touches exactly the files the File Boundary table lists, plus the four docs-pass files. `package.json`, `package-lock.json`, `biome.json`, `tsconfig.json`, `vitest.config.ts`, `jev-context-poc.ts`, `test-jev-poc.mjs`, the six archive handlers and `src/use-cases/ports.ts` are untouched. `rg "console\."` over `src` finds nothing, and `src/domain` and `src/use-cases` have no `@earendil-works/pi-*` import.

## Correctness

### `tail-recall`

| Requirement | Evidence |
|---|---|
| Scored once per latest user prompt | `extractLatestUserPrompt` (`src/infra/adapters/pi-context-adapter.ts:21`) gives the key `timestamp\|text`. The use-case token is `store.size()\|promptKey` in the existing `lastPromptKey` string, with `RecallCache`'s shape unchanged (`src/use-cases/recall-relevant-context.ts:50`). An empty candidate set, a missing user message and a missing window each return before any call. Tests: use-case "a store whose size changed…", "an empty eligible set…", handler "three requests under one key score the archive once", and the session test with one classifier call per turn. |
| One bool question per eligible item | `pi-jev-scorer-adapter.ts` builds one `bool` question per id, keyed by the whole id. State is `{userPrompt, archivedToolOutputs: stubs}`, and no raw text or image is sent. The 36-character id is tested. |
| Selection is the threshold rule | `selectRecalledIds` is unchanged and `>=` holds. The domain test covers equal, below and 0. The use-case ranking is descending with ties by id. |
| Keeps its request under the compaction threshold | `context.ts` computes `4 * (window - reserve - estimate)` from `getContextUsage()?.contextWindow`, the reserve chain (override, setting, pi default) and `estimateTokens` over all messages, system messages included. `fittingPrefix` stops at the first item that would overflow. Handler boundary tests assert "equals" against "one short", plus the reserve chain and `compaction.enabled: false`. |
| The bound covers only the request recall builds | A claims-only requirement. The README, `ARCHITECTURE.md` and ADR 0007 state it with the same narrowing, and nothing in the code contradicts it. |
| One trailing text block on the latest user message | `appendRecalledContextToMessages` copies the target, keeps its blocks in order and adds one block. A string content becomes two text blocks. The marker guard (`recall.ts`) rewrites both markers in all four fields. The 381- and 263-character strings are asserted. |
| Classifier and timeout from session config at event time | `findOfType("classifier", provider, model)` with no fallback. `classify` gets `{signal: ctx.signal, timeoutMs, maxRetries: 0}`. The timeout, caller abort and guard-catches-a-mistake tests run through pi-ai's real path. |
| Failure fails open, one notice | The adapter throws a finished notice with the template's four facts. The use case calls `notifyOnce(error.message)` and records the token with no ids. `undefined` records no token and gives no notice. `warned` is set after `notify` returns. The answer-set validation matches the spec (missing id, non-`bool`, non-finite or out-of-range probability). |
| Yields to foreign edits and off-branch items | `readEligibleArchivedIds` (`pi-archive-adapter.ts:164`) requires a tool-result entry on the branch and compares only the first block of the latest edit's replacement. It is read per request in the handler, and the set is applied to the candidates and to cached ids. Five spec cases plus four boundaries are tested. |
| Inert while off | `registerContextHandler` registers through `gatedPi` (`taiknr.ts`). The handler tests `state.status !== "ready"`, a narrowing the config union requires, and does not test `enabled`, as `turn-end.ts` does. The gate test asserts no classifier call while off and one call after `setEnabled(true)`. The session test asserts `guard.requests` is `[]` with `enabled: false`. |
| Writes nothing | The handler returns only `{messages}`. A session test asserts side-store batches and context edits are unchanged and that exactly one classifier call was made. |
| Tested without a classifier call; live script | `tests/support/classifier-guard.ts` stubs `fetch`, registers `taiknr-test`, clears both keys and is taken by `archive-session.test.ts`. The live script is at the root, outside the include, the lint allowlist and the type program. |

### `configuration`

`classifierTimeoutMs` has default 5000, a rule `integer, 1..2147483647` returning exactly `must be an integer from 1 to 2147483647`, and layering through `layered`. Tests cover the default, 8000, project 12000 over agent 8000, 1 and 2147483647 accepted, and the six rejected values. The scenario "The timeout reaches the recall path" is covered by the scorer test "the call carries … the session's timeout" and the session test using `classifierTimeoutMs: 50`.

### `extension-packaging`

`taiknr.test.ts` lists the seven events, with `context_with_system` in place of `context`. `registerContextHandler`'s dependency object drops `notifier` (`taiknr.ts` now passes `{config, store, recallCache}`). Names, `createPiJevScorerAdapter(ctx, config)`, `RecallCache`'s shape and the ports are unchanged. The import boundary holds.

## Coherence

**Design adherence.** Decisions 1–13 are followed:
- decision 1: the event and the unchanged names;
- decision 2: the handler's step order and the `shortcut:` comment on `resolveReserveTokens`;
- decision 3: index, text and key;
- decision 4: the token;
- decision 5: eligibility;
- decision 6: the call options, with `maxRetries: 0` commented;
- decision 7: the notice template and the field rule (the `elapsed >= timeout - 1` row);
- decision 8: 5000;
- decision 9: the ranking, the prefix fit and the cache-hit rule;
- decision 10: the format;
- decision 11: the notifier built at registration over a `current` cell;
- decision 12: the guard;
- decision 13: the live script and its recorded runs.

The docs pass landed after implementation (README, `ARCHITECTURE.md`, `AGENTS.md`, ADR 0007). It states the two disclosure destinations, the redactor gap and the compaction consequence the proposal and specs call for. ADR 0002's body is untouched.

**Code pattern consistency.** `.js` import specifiers, tests under `tests/` mirroring `src/`, the shared fixture under `tests/support/`, `expect` and `test` imported from vitest, and no `console.*` in `src/` all follow `AGENTS.md`. Every lint and format check passes.

## Issues

### CRITICAL
None.

### WARNING
None.

### SUGGESTION

1. **Scenario "A steer moves the recall" has no test that builds two requests.** The behaviour is right by construction: the block is placed by `userMessageIndex`, `extractLatestUserPrompt` takes the last `user` message, and a new key rescores. Pieces are tested ("two user messages select the last", "a new key scores", "every other message is element-identical"). No test sends a steer and asserts the earlier user message loses its block. Recommendation: add one case in `tests/infra/pi-event-handlers/context.test.ts` firing the handler with a prompt, then with `[prompt1, assistant, steer]`, and asserting `appendedBlockText(result, 0)` is `undefined` and `appendedBlockText(result, 2)` is the block.

2. **Scenario "A foreign edit lands under one cache key mid-turn" is tested only at the use-case level.** The use-case test "a cache hit drops a cached id the branch no longer admits" proves the filter. The handler's per-request `readEligibleArchivedIds(ctx.sessionManager.getBranch())` call is not exercised after a key was scored. A refactor that hoisted that read out of the per-request path would stay green. Recommendation: in `context.test.ts`, fire once, then `manager.appendContextEdit(item.id, {content: [{type:"text", text:"redacted"}]})` on the harness's branch and fire again with the same messages. Assert `undefined` and `classify` called once.

3. **Scenario "Print mode keeps working" is untested.** It follows from `ctx.ui.notify` being a no-op in print and JSON (design cites `Chidi` §4), and the live script runs outside print mode. Nothing in the code can break it separately, so this is informational. Recommendation: either accept it, or state in `tasks.md` that it rests on the host's `notify` behaviour.

4. **`fittingPrefix` re-formats each growing prefix (`recall-relevant-context.ts:48`).** It does O(k²) string building over k kept items. The loop stops at the first overflow, so the cost is bounded by the budget and does not matter at current archive sizes. It may be worth tracking against the archive-scaling card, since a threshold of 0 on a large archive makes k large. No action is needed now.

## Final Assessment

No critical issues. No warnings. 4 suggestions to consider. Every check that ran passed: `npm run check` is green on `2cfbbd8` (327 tests), all 15 tasks are ticked, and every ADDED and MODIFIED requirement has matching code and tests.

Not verified: the live run recorded under task 9.2 (exit 0, and exit 1 for `--break-model`). The brief forbids spending model calls, so I read the recorded lines but did not reproduce them. The run's claim about the real provider payload (one block, the marker in it, no recall on the unrelated prompt) therefore rests on the recorded evidence. Also not checked: pi's behaviour in RPC and print modes, and the compaction measurements in design decision 2, which need a live pi session.
