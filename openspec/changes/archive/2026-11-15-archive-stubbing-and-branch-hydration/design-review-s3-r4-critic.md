{
  "mode": "review",
  "lens": "council-critic",
  "paraphrase_proposes": "",
  "paraphrase_existing": "",
  "recommendation": "Approve. This round fixes CR-S3-R3-1, the major finding from round 3. In `archive-session.test.ts` every case now calls `await session.bindExtensions({ onError })`, which is what emits `session_start` (agent-session.js:2776) and attaches the `emitError` listener (agent-session.js:2819-2826), and then asserts that no error was collected. That makes the session-level cases able to fail:\n- **Project-file off case:** if the loader rejects the file, `session-start.ts` throws and the error reaches `onError`. If the project file is ignored, the paired `enabled: true` session and the off session would both stub, and the test fails.\n- **Settlement filter:** if Decision 8's filter regresses, the invalid draft fails `emitBoundary`'s `buildContext` check, which reports through `emitError` (runner.js:797-806).\n\nStore contents are now asserted directly in the hydration handler tests through the public `getAll()`/`get()` on `ArchiveStore`. This stays within the no-mocking-internals rule. Two minor gaps remain, both in the changed rows:\n1. The design never says how `session.compact()` succeeds in a short faux-provider session. In fact it throws 'Nothing to compact (session too small)' under the default `keepRecentTokens: 20000`.\n2. The compaction store assertion now belongs to `session-compact.test.ts`, but that row does not name the case of a side-store entry that comes before the compaction. M1–M11 still hold.",
  "findings": [
    {
      "id": "CR-S3-R4-1",
      "severity": "minor",
      "location": "design.md § Module & File Placement → Tests table, `tests/app/extension/archive-session.test.ts` row (compaction over an archived branch); § Decision 12",
      "finding": "The changed row states that `session.compact()` fires `session_compact` with zero extension errors. It does not say how a compaction succeeds in a short session driven by the faux provider. `AgentSession.compact()` calls `prepareCompaction(getBranch(), settings)` (agent-session.js:2338-2347). With the default `keepRecentTokens: 20000` (compaction.js:56), a session holding a few faux turns never exceeds the budget. `findProjectedCutPoint` then cuts at the first cut point (compaction.js:566-604), `messagesToSummarize` is empty, and `prepareCompaction` returns `undefined` (compaction.js:641-643). `compact()` then throws 'Nothing to compact (session too small)'. Stubbing makes this worse, because the cut-point budget is measured on the projected (stubbed) messages. Even once the budget is exceeded, the default path `_runDefaultCompaction` makes one model call. The faux provider answers that call with 'No more faux responses queued' unless a summary response has been queued (faux.js:360-366). M10 measured a prompt loop, not a compaction.",
      "rationale": "Standard §1/§6: any operation the design depends on has to be shown to run. This case is now the only session-level check on `session_compact`'s wiring and its error path. If it cannot reach `session_compact`, it either fails for a Pi reason or gets rewritten ad hoc to catch the throw. Then it asserts nothing about taiknr.",
      "concrete_case": "The test prompts the faux model twice: one large `bash` result, then settle, then a second short turn. It then calls `await session.compact()`. `prepareCompaction` finds under 20 000 projected tokens and returns `undefined`, so `compact()` rejects with 'Nothing to compact (session too small)'. `session_compact` never fires, so the case cannot check whether `registerSessionCompactHandler` throws on a real compacted branch.",
      "recommendation": "Add one clause naming the model-free path to the row or to Decision 12. The cleanest option is a test-only extension factory whose `session_before_compact` handler returns `{ compaction: { summary, firstKeptEntryId, tokensBefore } }`, with `firstKeptEntryId` pointing to an entry after the `taiknr-side-store` entry (agent-session.js:2350-2369, where `fromExtension` is true). This needs no faux response and no change to settings. The alternative is a `SettingsManager.inMemory` with a low `keepRecentTokens` plus one queued `fauxAssistantMessage` summary. Either way, the case should also assert that the side-store entry comes before `firstKeptEntryId`, so the setup really is 'pre-compaction'."
    },
    {
      "id": "CR-S3-R4-2",
      "severity": "minor",
      "location": "design.md § Module & File Placement → Tests table, `tests/infra/pi-event-handlers/session-tree.test.ts`, `.../session-compact.test.ts` row and `tests/infra/adapters/pi-archive-adapter.test.ts` row",
      "finding": "The archive-session row now says that `InMemoryArchiveStore` contents are asserted directly in `session-compact.test.ts`. The `session-compact.test.ts` row lists only 'hydration runs through the gate and not when inactive' and the mid-session re-enable case. No test row names branch-hydration's 'Outputs archived before a compaction stay in the archive' scenarios. That would be a `SessionManager.inMemory` branch with a `taiknr-side-store` entry before an `appendCompaction` whose `firstKeptEntryId` comes after it. The adapter row says only 'branch reading and the item guard'.",
      "rationale": "Standard §6: the design delegates a claim to a test, so that test must actually cover the claim. Before this round, the session-level row nominally covered compaction hydration. Now that it explicitly does not, Joel's Q2 → (a) invariant has no named test that can fail.",
      "concrete_case": "Suppose `readArchiveBatchesFromBranch` (or the handler) is changed to fold only the entries after the last `type === \"compaction\"` entry, for example as a 'compaction already summarized this' optimisation. Every named case still passes. The gate cases, re-enable, malformed-entry skipping, and archive-session's 'pre-compaction entries retained on `getBranch()`' check only Pi's append-only branch. In production, `/compact` then empties the archive of everything archived before it, which violates 'A compaction does not prune the archive'.",
      "recommendation": "Add one case to the `session-compact.test.ts` row (or to the adapter row): a `SessionManager.inMemory` branch holding a `taiknr-side-store` entry, then `appendCompaction` with `firstKeptEntryId` after that entry, then `session_compact` through the gate. Assert that `store.getAll()` holds the entry's items. Stage 5's tasks.md can map it if the design row stays terse, but the delegation sentence should point to a case that exists."
    }
  ],
  "assumptions": [
    {
      "assumption": "`AgentSession.bindExtensions` emits `session_start` through `ExtensionRunner.emit` and registers the `onError` listener before emitting it (agent-session.js:2756-2779, 2819-2826).",
      "status": "verified"
    },
    {
      "assumption": "A config rejection is thrown from `session_start` after the holder carries it (src/infra/pi-event-handlers/session-start.ts:21-24). It therefore reaches the `onError` listener, so the off case's empty-error assertion also catches an unexpectedly rejected project file.",
      "status": "verified"
    },
    {
      "assumption": "`ArchiveStore` exposes `getAll()`, `get()` and `size()` publicly (src/use-cases/ports.ts:4-11; pi-archive-adapter.ts:7-33). The handler tests can therefore assert store contents without spies.",
      "status": "verified"
    },
    {
      "assumption": "`emitBoundary` reports both handler throws and invalid boundary entries through `emitError` (runner.js:781-806). An off-branch `context_edit` draft is therefore visible to the session-level `onError` list.",
      "status": "verified"
    },
    {
      "assumption": "`prepareCompaction` returns `undefined` for a session whose projected tokens stay under `keepRecentTokens`, so `compact()` throws 'Nothing to compact (session too small)' (compaction.js:566-643; agent-session.js:2338-2347).",
      "status": "verified"
    },
    {
      "assumption": "In an isolated `PI_CODING_AGENT_DIR`/temp cwd no MCP server is registered, so `reportUnhandledMcpServers` adds no error to the `onError` list during `bindExtensions` (runner.js:506-514).",
      "status": "unverified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "Sections unchanged since round 3 (Decisions 1–11, Risks, Migration Plan) and all settled findings",
    "Whether `SettingsManager.inMemory` keeps `projectTrusted` true the way `fromStorageWithPaths` does; relevant only if CR-S3-R4-1 is fixed through settings rather than a `session_before_compact` test extension",
    "How the abort → `/tree` → settle case triggers the abort and the navigation; that row is unchanged this round",
    "No tests, tsc or model calls were run; this was a read-only review"
  ]
}