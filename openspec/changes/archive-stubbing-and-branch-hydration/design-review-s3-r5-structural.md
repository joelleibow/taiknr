{
  "assumptions": [
    {
      "assumption": "design.md is unchanged in the sections the settled and declined findings concern since round 4's clean resolution: both critic-r4 findings were declined with dispositions mapping them to tasks.md (Stage 5) — CR-S3-R4-1 to a low keepRecentTokens SettingsManager.inMemory plus one queued fauxAssistantMessage summary in the archive-session task, CR-S3-R4-2 to the branch-hydration spec's pre-compaction retention scenarios mapped onto session-compact.test.ts and pi-archive-adapter.test.ts — and no required_change touched design.md in michael-resolve-s3-r4.json.",
      "status": "verified"
    },
    {
      "assumption": "The Module & File Placement table matches the code at HEAD, re-verified this round: registerTurnEndHandler carries config, ReadonlyMap argsByCallId, pendingOutputs and originalContentByEntryId; registerAgentBeforeSettleHandler carries store, pendingOutputs, originalContentByEntryId (no argsByCallId, per M6); registerToolCallHandler takes a mutable Map; session-tree/session-compact take the store; session-start takes raw pi, store and session; taiknr.ts constructs all of it and registers session_start raw plus the six others through createGatedPi.",
      "status": "verified"
    },
    {
      "assumption": "The locked signatures the design's decisions assume still hold on disk: stageToolOutputs(input: StageToolOutputsInput): ArchivedToolOutput[], commitArchivedBatch(pending: ArchivedToolOutput[], store: ArchiveStore): ArchivedToolOutput[], toSettlementDrafts(batch: ArchivedToolOutput[], originalToolResultsByEntryId: ReadonlyMap<string, unknown[]>): SessionBoundaryDraft[], readArchiveBatchesFromBranch(entries: SessionEntry[]): ArchivedToolOutput[][], and ToolOutputCandidate carries both entryId and toolCallId — so Decision 7's ordering and Decision 2's pairing need no signature change and Modified Capabilities stays None.",
      "status": "verified"
    },
    {
      "assumption": "The inertness mechanism is as the design describes: handler-gate.ts's createGatedPi checks session.isActive() at dispatch time inside its on wrapper and passes every other member through, and fake-pi.ts's createContextStub carries only cwd and isProjectTrusted() — so the branch fixture addition is genuinely 'modified first' and no test currently exercises branch reading.",
      "status": "verified"
    },
    {
      "assumption": "Settled and declined findings stay settled: the Risks bullet's 'both deltas' wording (structural-r2-ST-S3-5), the 36-char UUID scenario's tasks.md mapping (structural-r2-ST-S3-6), the session-start case count (structural-r3-ST-S3-1), the gatedPi wiring readability limit (critic-r3-CR-S3-R3-2), and the r1 structural proposal/table wording nits (ST-S3-2/3/4, declined with design.md:67 and the Non-Goals lines already carrying the correct counts and exclusions) all concern sections untouched since their dispositions.",
      "status": "verified"
    },
    {
      "assumption": "Pi 1.5.2 platform behaviour the design relies on (sequential ExtensionRunner.emitBoundary dispatch in runner.js:773-797, emitToolCall's missing try/catch with prepareToolCall converting a throw into createErrorToolResult, appendContextEdit's off-branch throw, no post-commit callback, context_edit whole-content replacement, getBranch() vs contextEntries compaction bound, bindExtensions emitting session_start and registering onError at agent-session.js:2756-2828) works as recorded by Chidi, the rulings and prior rounds' source readings; only the cited taiknr source files were re-read directly this round.",
      "status": "unverified"
    },
    {
      "assumption": "The quantitative claims — the ~150 KB argsByCallId estimate (M6), the Node 26.8.1 JSON.stringify separator and surrogate-split measurements (M9), and the ~35 ms zero-network faux-provider harness measurement (M10) — are Michael's ruling evidence and were not re-measured here.",
      "status": "unverified"
    }
  ],
  "findings": [],
  "lens": "council-structural",
  "mode": "review",
  "not_checked": [
    "No files were edited, no tests, tsc or biome checks were run, and no Pi runtime path was executed; this was a read-only convergence review.",
    "michael-orientation.md was not read directly; its D/S/O/Trap codes are consumed only as cited by the reviewed artifacts.",
    "tasks.md does not exist yet; the two declined critic-r4 mappings (low keepRecentTokens compaction fixture; pre-compaction side-store retention case onto session-compact.test.ts), the 36-char UUID scenario mapping, and the per-scenario test mapping are Stage 5 work and were not re-litigated here.",
    "The pre-design structural dispositions (CS-1 through CS-9, including M7's god-module ruling keeping InMemoryArchiveStore in pi-archive-adapter.ts) were not reopened; M1's item-shape statement appears in design Decision 9 and the branch-hydration delta as the rulings and amendment 1 ordered, which is sanctioned duplication rather than drift.",
    "No live TUI, no model calls, and no inspection of the recall card's adapters beyond confirming context.ts registers a no-op and taiknr.ts wires it unchanged."
  ],
  "owner_questions": [],
  "paraphrase_existing": "At main 4e951a2 the composition root (taiknr.ts) already constructs the config holder, the gated pi, InMemoryArchiveStore, argsByCallId, pendingOutputs, originalContentByEntryId and the recall cache, and registers all seven lifecycle events with exactly the dependencies the new bodies need; only session_start has a body (config resolution and rejection reporting, store parameter unused), the store's map operations work (pi-archive-adapter.ts), and the three adapter translation functions, buildStub and the staging, commit and hydration use cases all throw Not implemented. createGatedPi suppresses the six non-start handlers unless session.isActive() holds at dispatch time inside its on wrapper; SessionConfig starts unresolved, takes ready/rejected at session_start, and flips enabled through setEnabled only from ready; context.ts is a no-op belonging to the recall card. Domain and use cases import nothing Pi-shaped (ADR 0001).",
  "paraphrase_proposes": "The design fills every missing body inside existing modules with zero new production files and unchanged signatures: tool_call records a total, try/catch-guarded, 120-unit single-line argument summary for top-level calls only; turn_end stages every persisted text-carrying tool result at or above the session threshold whatever the turn's outcome, pairing results to entry ids by toolCallId through contextEntries with a length-checked positional fallback, and records original content only for staged ids. agent_before_settle runs one ordered pass — eligibility Sets from getBranch() and event.entries, silent drops, drafts built before any mutation, the taiknr-side-store batch drafted before its per-item context_edit stub replacements with non-text blocks preserved, then the batch drained into the store as an optimistic cache over the branch. session_start (after config assignment, only while active), session_tree and session_compact rebuild the store whole from getBranch() behind a well-formed-item guard that skips foreign or malformed entries without failing the event. Two test levels pin the runtime-only paths, including a zero-network session-level test whose every case calls bindExtensions({ onError }) with per-test PI_CODING_AGENT_DIR and cwd isolation.",
  "recommendation": "Converge: pass to Stage 5. The round-4 resolution came back clean with both critic-r4 findings declined into tasks.md's Stage 5 mapping, and no design.md section changed since, so every reopen condition is absent. Fresh disk verification this round confirms the Module & File Placement table still matches HEAD line-for-line (handler signatures, injected dependencies, the mutable argsByCallId Map behind turn-end's ReadonlyMap, the dispatch-time isActive() gate, fake-pi's branchless createContextStub awaiting its 'modified first' fixture change, the locked commitArchivedBatch/toSettlementDrafts/stageToolOutputs signatures), layer dependencies still point inward with the adapter as the only new Pi-aware surface besides the handlers, and each rule, constant and shape keeps one sanctioned home (Decision 9's item shape, M8's eligibility seam, M9's shared helper). No new findings; the remaining known gaps are the two declined Stage 5 mappings (compaction fixture mechanics and the pre-compaction retention case) plus the declined wording drifts, all already dispositioned."
}