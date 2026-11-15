# Verification Report: archive-stubbing-and-branch-hydration

Using change: `archive-stubbing-and-branch-hydration` (schema `marbleization`), branch `archive-stubbing-and-branch-hydration`, PR #3.
Head commit verified: `cb9d234138ad1f5e71a5a08695f1215e6d84130b` (matches `gh pr view 3 --json headRefOid`). Working tree clean.
`npm run check`, run by me on that head: lint clean (43 files), `tsc --noEmit` clean, vitest **16 files / 220 tests passed** (baseline recorded in 0.1 was 6 files / 80 cases). I ran no reproduction, edited nothing and spent no model call.

## Summary

| Dimension | Status |
|---|---|
| Completeness | 38/39 tasks. The one open box is 12.1, Joel's live check, and is meant to be unticked. 13 requirements, all with an implementation. |
| Correctness | 13/13 ADDED requirements covered. Every scenario has a test or a direct code path except two (WARNING 1 and 2). |
| Coherence | Followed. Design decisions 1–12 are all visible in the code and tests. 2 suggestions. |

Requirement count: `archive-stubbing` has 9 ADDED requirements and `branch-hydration` has 4, so **13 ADDED, 0 MODIFIED, 0 REMOVED, 0 RENAMED**.

## Completeness

**Task completion.** `openspec instructions apply` reports total 39, complete 38, remaining 1. The remaining one is `12.1 (Joel's)`, a live-model check that the tasks file itself says the coder never ticks. Per the brief it is expected open, so it is not a critical issue. It is a hand-off to Joel, and nothing in groups 0–11 depends on it.

**File boundary (group 11).** The diff against `origin/main` outside the change directory is exactly:
- the ten `src/` bodies (`archived-output.ts`, `pi-archive-adapter.ts`, the six handlers, three use cases);
- the test files the boundary names (ten new, `archived-output.test.ts` and `session-start.test.ts` modified, `tests/support/fake-pi.ts` modified);
- the docs pass (`AGENTS.md`, `ARCHITECTURE.md`, `README.md`, ADRs 0004–0006), which the proposal sequences after the implementation gate.

Not touched, as required: `src/app/extension/taiknr.ts`, `tests/app/extension/taiknr.test.ts`, `package.json`, `package-lock.json`, `biome.json`, `tsconfig.json`, `vitest.config.ts`, `context.ts` and the three other adapters. No production file was created. There is no `console.*` in `src/`, and `src/domain/` and `src/use-cases/` import nothing from `@earendil-works/pi-*`.

**Spec coverage / requirement implementation mapping** (all ADDED):

| Requirement | Where it lives |
|---|---|
| Persisted result above threshold staged at turn boundary, opaque id, any outcome | `src/infra/pi-event-handlers/turn-end.ts`, `stage-tool-outputs.ts`, `toToolOutputCandidates` (`pi-archive-adapter.ts:62-91`) |
| No-text result never staged; `\n` join; all-empty → no text; whitespace counts | `pi-archive-adapter.ts:79-80`, `stage-tool-outputs.ts:15-18` |
| One-line stub, 3-line/180 preview, 120 args, no separators, surrogate-safe | `archived-output.ts:23-54` (`summarizeSingleLine`, `buildStub`) |
| Settlement replaces content with stub plus non-text blocks, raw entry untouched | `toSettlementDrafts` (`pi-archive-adapter.ts:98-117`) |
| Optimistic store; side-store draft before the `context_edit` drafts | draft order in `toSettlementDrafts`; handler order in `agent-before-settle.ts` |
| Staged item waits for a settled run; never committed twice | pending list plus drain in `commitArchivedBatch`; `agent-before-settle.ts` |
| Commit only items the branch still holds and nobody has edited; silent drops; no draft when empty; other extensions' drafts kept | `agent-before-settle.ts:17-35, 52` |
| One side-store entry per committed batch, only when non-empty | `toSettlementDrafts` returns `[]` for an empty batch |
| Inert while off or rejected, through the gate | `taiknr.ts` (unchanged) registers six handlers through `gatedPi`; no handler tests `enabled` (`turn-end.ts` reads `state.status` only to get `minCharsToArchive`) |
| Hydration rebuilt on three events, whole replacement | `session-start.ts`, `session-tree.ts`, `session-compact.ts`, `hydrate-archive-store.ts`, `InMemoryArchiveStore.replaceAll` |
| Pre-compaction outputs stay archived | all three read `getBranch()`, never the projection |
| Foreign or malformed entries skipped whole; extra properties tolerated; last id wins | `batchOf` / `isWellFormedItem` / `readArchiveBatchesFromBranch` (`pi-archive-adapter.ts:120-150`) |
| Hydration only while on and active; mid-session re-enable | `session-start.ts` guards on `session.isActive()` after the config assignment; tree and compact go through the gate |

## Correctness

Every ADDED requirement has an implementation that matches its text. I read the code against each scenario and found no divergence.

Scenarios checked directly against tests include:
- threshold at 600 and 599, and a zero threshold with an image-only result, one empty block and two empty blocks;
- a 36-character UUID id;
- stub status, 120-character args cut, every line separator, and a surrogate pair at the cut;
- text plus image, text-only and original block order;
- abort then settle (real `AgentSession`), abort then `/tree` then settle, a competitor registered before and after taiknr, and a recovery-omitted (null) edit;
- a bad item skipping its whole batch, a bad entry beside a good one, the same id twice (the later wins), and idempotent hydration;
- the pre-compaction side-store entry, a configured-off or rejected session hydrating nothing, mid-session re-enable for tree and compact, and the trusted project file that turns taiknr off, end to end.

### CRITICAL
None.

### WARNING

1. **Scenario not covered by a test: "The original output is still there"** (`archive-stubbing`, Settlement requirement). Nothing asserts that after a replacement is persisted and the session navigates to a branch that precedes it, the model context carries the raw output again. The `/tree` test in `tests/app/extension/archive-session.test.ts` navigates *before* settlement, so it exercises the drop path and not this one. The behaviour is Pi's own (`Chidi` §3) and taiknr leaves the raw entry untouched, so a failure is unlikely. Joel's live check 12.1 covers it by hand.
   Recommendation: add one case to `archive-session.test.ts`: run a settled turn, `navigateTree` to the user entry before it, and assert `projectedToolResult` shows `BIG_TEXT`.

2. **Scenario not covered: "A boundary Pi discards" and "A partial persist of one boundary"** (the optimistic-cache requirement). The side-store-first order is pinned in `tests/infra/adapters/pi-archive-adapter.test.ts` and `agent-before-settle.test.ts`, but no test drives a rejected boundary and then checks that the next hydration reconciles the store. The design accepts this (M4: Pi gives no post-commit hook), and `AGENTS.md` records it as a trap.
   Recommendation: either add a session-level case with a throwing competitor draft followed by a `session_tree`, or note in the spec that the scenario is by-design untested.

### SUGGESTION

1. **The hydration events have no end-to-end test through a real session** for `session_start` on a resumed branch ("the archive holds their items before the first provider request") or for `session_tree`. They are covered at handler level with real `SessionManager.inMemory` branches and the real store, which is enough to confirm the logic. A resume test in `archive-session.test.ts` would confirm the ordering against Pi itself.
2. **`toWellFormed()` needs Node 20+**, and `package.json` declares no `engines`. Pi's own floor is above that, so this is theoretical. If an `engines` field is ever added, make sure it is ≥ 20.

## Coherence

**Design adherence: followed.** Decisions checked against the code:
- Decision 1 (stage at `turn_end` for any outcome, settle at the run boundary).
- Decision 2 (pair by `toolCallId` through `contextEntries`, last match, length-checked positional fallback, silent skip).
- Decision 3 (eligibility in the use case: `rawText.length > 0 && shouldArchive`).
- Decision 4 (verbatim `rawText`, one shared `summarizeSingleLine` used by `buildStub` and `tool_call`).
- Decision 5 (nested calls skipped, `shortcut:` comment present at `tool-call.ts:15`).
- Decision 6 (original content recorded for staged ids only, last-match).
- Decision 7 (five-step settlement pass, with every draft built before any mutation).
- Decision 8 (two `Set`s, author-independent, reads `getBranch()` and `event.entries`, never `contextEntries`).
- Decision 9 (bare array of full items, guard defined once, whole-entry skip).
- Decision 10 (one `replaceAll` path on three events).
- Decision 11 (no console, `tool_call` total through `try/catch`).
- Decision 12 (shared fixture first, real-session test isolates `PI_CODING_AGENT_DIR` and `cwd`, `bindExtensions({ onError })` with empty-error assertions, `shortcut:` comment on the `pi-ai` import, no prototype spies).

Signatures, registrations and the composition root are unchanged. `tests/app/extension/taiknr.test.ts` is byte-identical.

**Code pattern consistency: no deviations.** `.js` specifiers, `vitest` imports, tests mirroring their layer, and a shared fixture under `tests/support/` all match `AGENTS.md`. Every handler finishes its reads before it mutates. The docs pass matches what the code does (stubbing, settlement and hydration described as working; recall, status and `context` still stubs).

## Final Assessment

No critical issues. 2 warnings to consider (two scenarios with no direct test; both are accepted or hand-checked by design) and 2 suggestions. Ready for archive (with noted improvements), once Joel has run and recorded task 12.1.

Not verified: the live behaviour in a real `pi` with a real model (12.1, by design Joel's), a hosted provider's reaction to a mid-history `context_edit` (design open question), and behaviour on any Pi version other than the 1.5.2 the design targets. I read the design and tasks as this pass requires but did not re-measure Pi's runtime mechanics beyond what the tests exercise.
