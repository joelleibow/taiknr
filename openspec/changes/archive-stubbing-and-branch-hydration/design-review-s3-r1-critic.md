{
  "mode": "review",
  "lens": "council-critic",
  "paraphrase_proposes": "",
  "paraphrase_existing": "",
  "recommendation": "Approve after one major fix and some minor tightening. The major issue is the tool_call error path. Decision 11 says any unexpected throw goes to Pi's extension error channel. For tool_call that is false: Pi turns a throw from a tool_call handler into an error result for the user's tool, so the tool never runs. The `JSON.stringify` summary must be wrapped so it cannot throw. The minor findings are: the dead positional fallback and an alternative pairing rule that was never weighed; the stub-only fallback that permanently strips images; an abort test that can pass without testing anything; an understated discarded-boundary risk; a recipe for spotting silent drops that has gaps; the staging seam's wording; and turn_end's unstated return value. No blocking finding; no ruling M1–M11 is shown to be unworkable.",
  "findings": [
    {
      "id": "CR-S3-1",
      "severity": "major",
      "location": "design.md § Decisions → Decision 11 (per-handler error behaviour) and Decision 4/5 (tool-call.ts summary); Module & File Placement tests row for tool-call.test.ts",
      "finding": "Decision 11 says 'Any unexpected throw in that shape propagates to Pi's extension error channel without partial mutation'. For `tool_call` that is not what Pi 1.5.2 does. `ExtensionRunner.emitToolCall` (runner.js:965-980) has no try/catch. `AgentSession._beforeToolCall` (agent-session.js:386-399) rethrows. `prepareToolCall` in pi-agent-core (agent-loop.js:496-544) catches the error and returns `createErrorToolResult(error.message)` as an immediate result. So a taiknr tool_call throw blocks the user's tool instead of being reported. The design only promises 'never throws on undefined input'. `JSON.stringify` also throws on BigInt values, circular references and a throwing `toJSON`.",
      "rationale": "taiknr is meant to be a passive observer at tool_call. The design states the wrong error path for the one handler whose failure stops user work rather than just reporting an error, and the planned test (`undefined` input only) would not catch it. Standard §4 asks for failure behaviour under real conditions.",
      "concrete_case": "An extension registered before taiknr sets `event.input.requestId = 123n` (the docs say `input` is mutable), or attaches an object with a circular reference. Then `JSON.stringify(event.input)` throws `TypeError: Do not know how to serialize a BigInt`. `_beforeToolCall` rethrows it, the tool never runs, and the model receives an error tool result reading 'Do not know how to serialize a BigInt' for every such call while taiknr is on.",
      "recommendation": "Make the summarizer total. Wrap the stringify in a try/catch that records `\"\"`, which needs no new abstraction. Correct Decision 11 to say a tool_call throw blocks the tool in Pi 1.5.2, citing runner.js:965 and agent-loop.js:496-544. Add BigInt and circular-input cases to `tests/infra/pi-event-handlers/tool-call.test.ts` beside the `undefined` case."
    },
    {
      "id": "CR-S3-2",
      "severity": "minor",
      "location": "design.md § Decisions → Decision 2 (pairing) and its Alternatives",
      "finding": "The positional fallback is dead code. It runs 'only when `contextEntries` is absent', but `BoundaryState.context: BoundaryContextPreview` and `BoundaryContextPreview.contextEntries: ProjectedSessionEntry[]` are both non-optional (types.d.ts:799-810). `emitBoundary` always passes `context` (runner.js:767-781). The alternatives also skip the stronger option: when `toolResultEntryIds.length === toolResults.length`, nothing was dropped by the flatMap. Pi has already resolved each id from its own message object (agent-session.js:556-559), so pairing by position is exact. Last-match on `toolCallId` is not exact when a turn repeats a toolCallId.",
      "rationale": "Standard §5 asks that viable alternatives be weighed with real trade-offs. Here the rejected path is the more precise one in the case M7 was meant to settle, and the code kept for it cannot be reached or tested without type casts.",
      "concrete_case": "A provider returns two tool calls with the same id `call_0` in one turn, results A and B. Last-match pairs both candidates with B's entry id. Both are staged with id B, so two `context_edit`s target B and B's stub wins. A's 5,000-character output is never stubbed, and the `taiknr-side-store` entry records A's raw text under B's id. Pairing by position with the length check would have paired A correctly.",
      "recommendation": "Either drop the dead fallback branch and say the `toolCallId` rule cannot handle a repeated toolCallId in one turn, or record in Decision 2's alternatives why last-match `toolCallId` beat length-checked position. If Michael is open to it, reversing the order (position when lengths agree, last-match `toolCallId` otherwise) closes the gap with the same amount of code. At minimum, skip any candidate whose resolved entryId was already used in the same turn, so one entry never gets two stubs."
    },
    {
      "id": "CR-S3-3",
      "severity": "minor",
      "location": "design.md § Decisions → Decision 7 (ContextEditEntryDraft construction, 'a missing map entry yields [stubTextBlock] rather than throwing')",
      "finding": "When an item's original content is missing, the design writes a stub with only the text block. Every non-text block on that result is then gone from model context for that branch, and the design chose this so the code never throws. The map is filled in the same runtime for every staged item, so content can only be missing because of a bug. The fallback hides the bug and makes the loss permanent.",
      "rationale": "Standard §4 says nothing should swallow failures that lose data. ADR 0002 makes settled stubs permanent on the branch, so this loss cannot be undone, whereas dropping the item only costs one unstubbed output.",
      "concrete_case": "A future refactor of turn-end.ts writes `originalContentByEntryId` under `toolCallId` instead of entry id. Every screenshot tool result is then stubbed as `[stubTextBlock]`, so the model permanently loses the images on that branch. Every test that checks only the stub text still passes.",
      "recommendation": "Treat a missing `originalContentByEntryId` entry as an ineligible item in step 1's partition and drop it silently, like the other drops, so it never becomes a stub-only draft. Pin this with one unit test."
    },
    {
      "id": "CR-S3-4",
      "severity": "minor",
      "location": "design.md § Decisions → Decision 12; Module & File Placement tests row for tests/app/extension/archive-session.test.ts",
      "finding": "The session-level test covers 'abort → /tree → settle' but never says where the abort happens. Pi gives a tool call cut off by abort a short `createErrorToolResult(\"Operation aborted\")` (agent-loop.js:506-511, 525-530), which is far below 600 characters and so never staged. If the abort lands during tool preparation or execution, nothing is staged. The 'item dropped, no draft targets it, settlement succeeds' assertions then pass without testing the drop path.",
      "rationale": "This test exists because only a real AgentSession reaches the abort-skips-settle path (CR-4, M10). If it can pass vacuously, the Trap 3 mitigation is not actually covered.",
      "concrete_case": "The test calls `session.abort()` while the faux tool is running. The persisted tool result is 'Operation aborted' (17 characters), so `pendingOutputs` stays empty. After `/tree` and a settled run there is still no `context_edit`, and the test goes green while Decision 8's branch filter never ran.",
      "recommendation": "Abort only after the large tool result has been persisted and turn_end has run, for example from the faux response factory on the second provider request. Assert staging actually happened: in a control variant without `/tree`, the same item is stubbed at the next settled run."
    },
    {
      "id": "CR-S3-5",
      "severity": "minor",
      "location": "design.md § Risks / Trade-offs → 'A boundary Pi discards leaves the store ahead of the branch'",
      "finding": "This risk is stated only as 'store ahead of branch, reconciled by replaceAll'. It leaves out the user-visible result. The committed items were already drained from `pendingOutputs` and their content keys deleted, so they are never staged again. They stay raw in model context on that branch for the rest of the session. Until the next session_start, session_tree or session_compact, the store also holds items whose stubs never landed. In addition, `emitBoundary` takes its validity from the last `buildContext` (runner.js:796-813), so a later handler can drop taiknr's drafts without anything failing.",
      "rationale": "Standard §6 asks for calibrated claims. The operator decision this should drive (whether the Status or recall cards must check that a stub landed before recalling an item) is invisible as written.",
      "concrete_case": "A second extension registered after taiknr returns an invalid `context_edit` at agent_before_settle. Pi reports 'Invalid boundary entries' and commits nothing. taiknr's 8 KB `bash` output stays raw in every later request. The store still holds it, so the recall card can append the same 8 KB at the tail as well, until the user runs /tree or /compact.",
      "recommendation": "Add one sentence to this risk naming both consequences (permanently unstubbed on that branch, and possible duplicate recall until the next hydration), and hand the duplicate-recall case to the recall card. This does not reopen M4."
    },
    {
      "id": "CR-S3-6",
      "severity": "minor",
      "location": "design.md § Decisions → Decision 11 (observation surfaces, silent-drop inference)",
      "finding": "The design says a silent drop can be inferred from 'the absence of a context_edit for that id and the presence of a taiknr-side-store entry that omits it'. That fails whenever every pending item is dropped, because step 2 then returns `undefined` and no side-store entry exists. In the JSONL, a drop also looks the same as an output under the threshold, an item still pending when the run was aborted, a pairing skip at turn_end, and a boundary Pi discarded.",
      "rationale": "Standard §4 requires operators to see failures. The stated method answers the wrong question in exactly the case support will ask about: why a large output was not stubbed.",
      "concrete_case": "A user reports that a 5,000-character output was not stubbed. They aborted, ran `/tree` and settled one turn with no other archivable output. The JSONL has no taiknr-side-store entry and no context_edit, which looks the same as `enabled: false`, so the recipe cannot tell a branch drop from taiknr being off.",
      "recommendation": "Rewrite the sentence to list which causes the JSONL can and cannot tell apart, with Pi's 'Invalid boundary entries' error as the only signal of a discarded boundary. Record the unattributable cases as a docs-pass and Status-card input. No logger needed."
    },
    {
      "id": "CR-S3-7",
      "severity": "minor",
      "location": "design.md § Module & File Placement (stage-tool-outputs.ts row) and Decision 6",
      "finding": "The placement table says `stageToolOutputs` appends eligible candidates 'to the pending list'. The locked signature (`src/use-cases/stage-tool-outputs.ts:3-10`) takes `{ candidates, minCharsToArchive }` and returns `ArchivedToolOutput[]`, so it has no pending list to append to. The design never says that this use case calls `buildStub`. Decision 6 says 'no re-resolution', but `ArchivedToolOutput` has no `toolCallId` (`archived-output.ts:10-17`). turn-end.ts therefore has to map each staged `item.id` back to its candidate by `entryId` before it can find the content.",
      "rationale": "Standard §3 asks that every rule have one stated home. An implementer reading the table could change a locked signature (D7) or call `buildStub` in the handler, splitting stub construction across layers.",
      "concrete_case": "An implementer adds a `pendingOutputs` parameter to `stageToolOutputs` to match the table. That breaks `extension-packaging` 'Signatures unchanged'. Or they build the stub in turn-end.ts, which leaves future `cli/` or `mcp/` callers of the use case without stubs.",
      "recommendation": "Change the row to: 'candidates in; returns `buildStub`-rendered `ArchivedToolOutput`s for those carrying text and meeting the threshold; the handler pushes them'. In Decision 6, state the join `item.id === candidate.entryId → candidate.toolCallId → last toolResult with that toolCallId`."
    },
    {
      "id": "CR-S3-8",
      "severity": "minor",
      "location": "design.md § Decisions → Decision 1 / Decision 11 (turn_end handler)",
      "finding": "The design fixes agent_before_settle's return value but never turn_end's. turn_end is also a boundary handled by `emitBoundary`, where a returned `entries` replaces the whole proposal list (runner.js:782-784). Returning `{ entries: [] }` would throw away every earlier extension's turn_end drafts.",
      "rationale": "Trap 5's 'never replace event.entries' rule is stated only for settlement, but the same failure exists at the turn boundary that taiknr now handles on every turn.",
      "concrete_case": "turn-end.ts ends with `return { entries: [] }` to say it stages without drafting. An earlier-registered extension's `custom_message` proposed at turn_end is then silently dropped on every turn while taiknr is on.",
      "recommendation": "Add one clause to Decision 1 or 11: turn_end always returns `undefined` and proposes no drafts. Assert `undefined` in turn-end.test.ts."
    }
  ],
  "assumptions": [
    {
      "assumption": "In Pi 1.5.2 a throw from a tool_call handler becomes an error tool result and the tool does not execute (runner.js:965-980 has no try/catch; agent-session.js:386-399 rethrows; pi-agent-core agent-loop.js:496-544 catches the error into createErrorToolResult).",
      "status": "verified"
    },
    {
      "assumption": "BoundaryState.context and BoundaryContextPreview.contextEntries are non-optional in the 1.5.2 type declarations (types.d.ts:799-810).",
      "status": "verified"
    },
    {
      "assumption": "emitBoundary dispatches handlers one at a time in load order, replaces entries with a handler's returned entries, and takes boundary validity from the last buildContext (runner.js:767-813).",
      "status": "verified"
    },
    {
      "assumption": "The boundary preview is built by applying the drafts to SessionManager.inMemory seeded with [header, ...getBranch()], so contextEntries[].sourceEntry.id equals the persisted tool-result entry id (agent-session.js:659-666).",
      "status": "verified"
    },
    {
      "assumption": "When lengths agree, toolResultEntryIds[i] is exact, because Pi resolves each id from its own result message object via _findPersistedMessageEntryId (agent-session.js:556-559).",
      "status": "verified"
    },
    {
      "assumption": "String.prototype.toWellFormed type-checks under the current tsconfig. It sets no target or lib. Object.hasOwn (ES2022) already type-checks, and TS 7's bundled libs include lib.es2024.string.d.ts, but the default lib that `module: nodenext` resolves to under TS 7.0.2 was not confirmed. The runtime is safe because Pi requires node >=22.19.0.",
      "status": "unverified"
    },
    {
      "assumption": "Providers or pi-ai can return a repeated toolCallId inside one turn (the premise behind CR-S3-2's concrete case).",
      "status": "unverified"
    },
    {
      "assumption": "A tool call cut off by an abort during execution persists a short error result rather than the tool's full output (seen for aborts during preparation at agent-loop.js:506-530; tool-specific abort output during execution was not traced).",
      "status": "unverified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "Whether TS 7.0.2 resolves `.toWellFormed()` under this tsconfig; tsc was not run",
    "AgentSession's tree-navigation API, and whether the faux provider can trigger an abort at the second provider request",
    "What Pi persists when a running bash or read tool is cut off by an abort",
    "Fork semantics: which side-store entries a forked session's getBranch() carries",
    "The recall card's handling of store items whose stubs never landed (out of this change's scope)",
    "No tests, checks or model calls were run; this was a read-only review"
  ]
}