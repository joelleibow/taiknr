{
  "mode": "council",
  "lens": "council-readiness",
  "paraphrase_proposes": "",
  "paraphrase_existing": "",
  "recommendation": "The behaviour is well specified, but the design must settle the points below before any tasks are drafted, or Derek will have to invent them. (1) The locked handler dependency types leave no legal place to discard argsByCallId entries or to carry original content. (2) The commit-then-validate ordering at agent_before_settle can leave the store, the pending list and the session out of sync, and a partial persist can leave stubs with no raw record. (3) The side-store data shape is a bare array with no version, and it freezes a persisted format. (4) The active-branch and recovery-omission filter has no stated data source. (5) The image-only guard has no stated home. Rollback is non-destructive: raw entries are untouched and Q3 inertness is already ruled. What needs deciding is partial-failure ordering and the persisted format.",
  "findings": [
    {
      "id": "R1",
      "severity": "major",
      "location": "proposal.md O1 (argument-summary discard) and What Changes (tool_call recording); src/infra/pi-event-handlers/turn-end.ts, agent-before-settle.ts, tool-call.ts; openspec/specs/extension-packaging/spec.md 'Signatures unchanged'",
      "finding": "O1 asks when argsByCallId entries are discarded, but the locked dependency types leave no legal place to do it. turn-end.ts receives `argsByCallId: ReadonlyMap<string,string>`. agent-before-settle.ts receives no argsByCallId at all. tool-call.ts has the mutable Map but runs before the result exists. The living spec says everything outside three enumerated differences stays unchanged against HEAD, and the proposal declares 'Modified Capabilities: None'.",
      "rationale": "The map leaks one entry per tool call for the life of the session, and nested calls ('<parent>/<n>') never produce a result, so they are never consumed. Fixing it means either changing a deps type (an extension-packaging MODIFIED clause) or casting the ReadonlyMap away. Either is a design decision the coder must not make.",
      "concrete_case": "A 500-tool-call session leaves 500 argsByCallId entries. Nested codemode calls are never removable from turn_end because their ids never appear in toolResults.",
      "recommendation": "The design must pick one: (a) skip nested calls at tool_call (`parentToolCallId !== undefined`) and accept bounded per-session growth for the rest, stating it as a shortcut; or (b) include a narrow extension-packaging MODIFIED clause changing the turn_end `argsByCallId` type to `Map` so turn_end deletes consumed ids. Record the choice in the design and, if (b), in the delta spec."
    },
    {
      "id": "R2",
      "severity": "major",
      "location": "archive-stubbing/spec.md 'Settlement commits only items the active branch still holds' and 'A committed batch is recorded once'; commit-archived-batch.ts ('Drain pending … into the ArchiveStore'); michael-orientation.md Trap 3 closing risk",
      "finding": "The commit path mutates in-memory state before Pi validates and persists the boundary, and the spec never says what happens when the boundary fails after the commit. commitArchivedBatch drains the pending list and writes InMemoryArchiveStore at handler time. Pi validates all drafts later (one invalid draft from any extension discards the whole list), and persistence is documented as non-transactional.",
      "rationale": "This is the main rollback and mid-flight hazard. A rejected boundary leaves the store holding items whose context_edit never landed, and pending is already drained, so they are never retried. If a draft fails midway through persistence, the order of drafts decides the outcome. Context_edit drafts that persist before the side-store draft leave stubs with no side-store record, so the raw text is unrecoverable after a resume. A side-store draft that persists first leaves a record and no stub, which is harmless. The spec and S3 imply the side-store draft goes last.",
      "concrete_case": "Another extension's draft throws in appendContextEdit at the same boundary. taiknr's store now holds N items, pending is empty and the session has no stubs. A later recall serves raw text the model still sees in context. After a partial persist with the side-store draft last, a resumed session has stubbed outputs and an empty archive.",
      "recommendation": "Pin in the design: (1) the draft order: the taiknr-side-store custom draft FIRST, then the context_edits; (2) build the drafts before touching store or pending, and mutate pending/store only after the drafts are built, with the throw-before-mutate behaviour stated; (3) say explicitly that a rejected or partly persisted boundary is reconciled by the next hydration on session_tree or session_compact, and that this is accepted. Add a test that builds drafts from a batch containing a malformed item and asserts store and pending are unchanged."
    },
    {
      "id": "R3",
      "severity": "major",
      "location": "archive-stubbing/spec.md 'A committed batch is recorded once' ('data is that batch'); branch-hydration/spec.md 'A foreign or malformed side-store entry is skipped'; michael-orientation.md S3",
      "finding": "The persisted side-store data is a bare array of items with no schema version, and 'well-formed item' is never enumerated. This is the one one-way door in the change, because session JSONL outlives the extension version that wrote it.",
      "rationale": "The next cards (recall, archive caps) and ADR 0002's note that stub format may change will each want to add or alter fields. With a bare array and whole-entry skipping of anything unrecognised, an older taiknr reading a newer entry silently loses the whole batch. A newer taiknr cannot tell old-format from new-format entries except by sniffing fields. The spec also leaves unresolved whether a batch with one bad item skips the whole entry or just that item, whether extra fields are tolerated, and which item wins when two entries share an id.",
      "concrete_case": "A caps card adds a `ts` field and moves the stub into a derived field. Sessions written by 0.2 are read by 0.1 after a rollback, or the reverse, and `[{id,…}]` cannot be distinguished by version.",
      "recommendation": "Decide before the design is drafted. Preferred: `data = { v: 1, items: ArchivedToolOutput[] }`. Else keep the bare array and state in the design that it is v1 and that future shapes must be a new custom type. Either way enumerate the required fields (id non-empty string; toolName, argsSummary, stub and rawText strings; isError boolean), tolerate unknown extra fields, state per-entry versus per-item skipping, and say which duplicate wins (Map set order, last wins). Update the delta spec if the shape changes."
    },
    {
      "id": "R4",
      "severity": "major",
      "location": "archive-stubbing/spec.md 'Settlement commits only items the active branch still holds'; proposal.md O3; Trap 4",
      "finding": "The branch and recovery-omission filter has no stated data source. The settlement handler can read ctx.sessionManager.getBranch(), event.context.contextEntries, or event.entries (other extensions' drafts). Each gives a different answer. 'The target's latest edit on that branch is Pi's recovery omission' does not say whether a null context_edit proposed by another extension in the same event.entries counts.",
      "rationale": "event.context.contextEntries is compaction-bounded, so a pending item from before a compaction's firstKeptEntryId would be wrongly dropped, which contradicts Q2. getBranch() is raw and includes everything, but ignores drafts in the current boundary. The spec says 'on the active branch', which points to getBranch(). Choosing between these is a design decision and must not be left to the coder. Branch membership is also computed by `getBranch().some(...)` per item, and the latest-edit rule needs a scan of context_edit entries per target.",
      "concrete_case": "An item staged before /compact and carried through an abort. contextEntries omits it, so the item is dropped and never stubbed or archived. Separately, another extension drafts `context_edit(target, null)` in event.entries for the same target; taiknr then appends a stub edit that resurrects an unpaired result.",
      "recommendation": "Design pins: the active-branch set comes from ctx.sessionManager.getBranch(); the latest-edit map is built from context_edit entries in that branch in order, then overlaid with any context_edit drafts in event.entries; a target is dropped if its resulting latest edit has `replacement === null`; also drop a target that another extension's draft in event.entries has already replaced (state which wins). Tests: carry-forward across a compaction commits; a draft from another extension with a null edit drops the item."
    },
    {
      "id": "R5",
      "severity": "major",
      "location": "archive-stubbing/spec.md 'A tool result carrying no text is never staged'; proposal.md O2; src/domain/archived-output.ts shouldArchive; src/use-cases/stage-tool-outputs.ts; tests/domain/archived-output.test.ts",
      "finding": "The 'no text is never staged' rule has no assigned home. shouldArchive(0, 0) is true and the existing domain test locks `>=` at the threshold. stageToolOutputs takes `candidates + minCharsToArchive` and is the only place with both. The adapter's toToolOutputCandidates takes no threshold. The rule can live in the adapter (omit the candidate), the use case (`rawText.length > 0 &&`), or the domain predicate.",
      "rationale": "Each placement produces a different test and a different failure. Putting it in shouldArchive alters a locked domain contract; putting it only in the adapter makes stageToolOutputs wrong in isolation; putting it only in the use case lets non-empty candidates through if the adapter joins blocks into '' for image-only content. The join rule (O2) also needs pinning: '\\n' per jev-context-poc.ts or ''. If rawText is '' after joining, what is the boundary for whitespace-only text?",
      "concrete_case": "minCharsToArchive=0, one image block: adapter returns a candidate with rawText '' and stageToolOutputs stages it, which gives an 85-character empty stub replacing an image-adjacent result.",
      "recommendation": "Design pins: the adapter drops results with zero text blocks, joins text blocks with '\\n' (matching jev-context-poc.ts:14–20), and the use case additionally guards `rawText.length > 0`, so a single layer's failure does not stage an empty stub. Leave shouldArchive untouched. State 'whitespace-only text counts as text' or the opposite. Name the matching tests in each layer."
    },
    {
      "id": "R6",
      "severity": "major",
      "location": "proposal.md O2/O4; src/infra/adapters/pi-archive-adapter.ts toToolOutputCandidates signature; turn-end.ts deps `originalContentByEntryId: Map<string, unknown[]>`; michael-orientation.md Trap 6",
      "finding": "Entry-id pairing and original-content capture need the same result-to-entry resolution, but only toToolOutputCandidates (fixed signature) is allowed to do it. The turn_end handler must also fill originalContentByEntryId keyed by the identical entryId. That forces the pairing logic to be either duplicated in the handler (breaking the 'thin bridge' contract) or exported as a new adapter helper (the O4 extension-packaging question), and Trap 6's proposed pairing is by object identity (`sourceEntry.message === toolResults[i]`).",
      "rationale": "Identity matching is brittle. A re-serialised or cloned message breaks it silently, and the failure is a stub on the wrong entry. Two independent resolutions can also disagree. Alternatively the settlement could read originals from ctx.sessionManager.getEntry(id), which makes originalContentByEntryId a dead dependency but removes the second pairing site. Either way, which is it?",
      "concrete_case": "toolResultEntryIds has length 2 for 3 toolResults because one id did not resolve. A positional index attaches call B's raw text to call C's entry.",
      "recommendation": "Design pins one of: (a) a new exported helper in pi-archive-adapter.ts that returns `{ candidate, content }` pairs resolved via `event.context.contextEntries` matching `sourceEntry.message.toolCallId` (not identity) and the entry's role; with a narrow extension-packaging clause saying 'adding an export is not a contract change'; or (b) no new export, with originals read at settlement from getEntry(id). Never positional indexing. If (b), state that originalContentByEntryId stays in deps unused, or is wired and cleaned. Test: contextEntries and toolResults of different lengths pair correctly by toolCallId."
    },
    {
      "id": "R7",
      "severity": "minor",
      "location": "owner-rulings.md Q1/Q2; archive-stubbing/spec.md 'A staged item waits'; turn-end deps `originalContentByEntryId`",
      "finding": "Carry-forward holds the full original content blocks (including base64 images) in memory for as long as an aborted-run item stays pending. Dropped, off-branch items must also have their originalContentByEntryId entry deleted, but no task or spec line says so.",
      "rationale": "Pending items from abandoned branches are dropped silently, and nothing names where their content entries are released. A session of repeated aborts on a screenshot-heavy tool holds all the images.",
      "concrete_case": "Ten aborted runs each carrying a 2 MB image result: 20 MB held until a settle happens that drops or commits them.",
      "recommendation": "State in the design that a drop and a commit both delete the entry's originalContentByEntryId record, and add one assertion for it. Mark unbounded pending growth in a session that never settles as an accepted shortcut with an upgrade trigger (the caps card)."
    },
    {
      "id": "R8",
      "severity": "minor",
      "location": "package.json peerDependencies `\"@earendil-works/pi-coding-agent\": \"*\"`; proposal.md 'Untouched: package.json'",
      "finding": "Version skew against Pi is unbounded. The change requires agent_before_settle, context_edit and ProjectedSessionEntry, which exist as of 1.5.2 (measured). The peer range is `*`, and the proposal forbids touching package.json.",
      "rationale": "On a Pi without agent_before_settle, taiknr stages forever, never settles, and never reports it. On a Pi that changes BoundaryContextPreview, the adapter breaks at runtime and not at install.",
      "concrete_case": "A user on Pi 1.4.x installs pi-taiknr: pending grows unbounded and no stub is ever applied, with no message.",
      "recommendation": "Not for this change to fix, but the design's Migration Plan should state that 1.5.2 is the verified floor and that the peer range is a known gap carried to a later card. Do not add a version check in the handlers."
    },
    {
      "id": "R9",
      "severity": "minor",
      "location": "owner-rulings.md; research-eleanor.md (jev-side-store); jev-context-poc.ts",
      "finding": "Sessions written by the proof of concept carry `jev-side-store` entries and PoC-style `tc_N` stub ids. taiknr reads only `taiknr-side-store`, so those sessions' stubbed outputs will be unrecoverable after taiknr is installed.",
      "rationale": "This matters only for Joel's own existing sessions (the PoC was his), but nothing says it is deliberately ignored. The migration plan is silent.",
      "concrete_case": "Joel resumes a session that has PoC stubs. taiknr hydrates an empty archive, and the next recall has nothing for those stubs.",
      "recommendation": "Ask Joel (see owner question) whether PoC-era sessions matter. The default is to ignore them and say so in the design's Migration Plan; do not add a legacy reader to this change."
    },
    {
      "id": "R10",
      "severity": "minor",
      "location": "proposal.md Impact ('Tests … plus the two shared fakes Trap 1 names') and O5; tests/support/fake-pi.ts; tests/infra/pi-event-handlers/session-start.test.ts:63",
      "finding": "The shared fakes grow in ways the proposal names but does not pin, and the task list cannot say which fixtures every group depends on. The fake context has only `cwd` and `isProjectTrusted`, and session-start.test.ts passes `{} as ArchiveStore`, so its eight enabled cases crash as soon as hydration lands. Also, tests need Pi event builders (turn_end, agent_before_settle, tool_call) that do not exist.",
      "rationale": "Without a named fixture task landing before the handlers, the first handler task cannot go green. A session-level test importing @earendil-works/pi-ai relies on npm hoisting; pi-ai is present at the top level of node_modules today, but is not in devDependencies and is not guaranteed by the lockfile.",
      "concrete_case": "A tasks.md that starts with the session_start handler leaves eight existing cases red until fake-pi.ts changes. A fresh `npm ci` with a different hoist breaks `import '@earendil-works/pi-ai'` in tests only.",
      "recommendation": "Design pins the fixture API (e.g. `createContextStub({ cwd, trusted, branch?: SessionEntry[] })` defaulting to `[]`; event builders in tests/support/) and orders the fixture task first, together with the session-start.test.ts update to an InMemoryArchiveStore. For O5, prefer the SessionManager.inMemory plus ExtensionRunner route that needs no pi-ai import, or if the faux provider is used, say the import relies on hoisting and add a guard test."
    },
    {
      "id": "R11",
      "severity": "minor",
      "location": "proposal.md O6 and 'Inert while off' scenarios; Pi extensions.md (handler errors)",
      "finding": "Boundary error behaviour is unstated for the handlers that read Pi state: what a handler does if ctx.sessionManager.getBranch() or the adapter throws. Pi reports a handler error and continues the other handlers. For agent_before_settle that is a state-mutating path (R2). For session_start hydration it must not turn an already-rejected or off session into a thrown error.",
      "rationale": "The implementation-readiness standard requires explicit error behaviour at every adapter and handler boundary, plus entry, decision and outcome fields where logging exists. O6 settles that there is no logger, so the error behaviour is the only observable.",
      "concrete_case": "A hydration throw on resume propagates as a session_start error that looks like a config rejection.",
      "recommendation": "Design states per handler: tool_call never throws (undefined input gives ''); turn_end and agent_before_settle build before mutating (R2) and let errors propagate to Pi; session_start hydration runs after config assignment and only when active; hydration failure is reported by Pi's error channel. State that observability is the store, the persisted entries and Pi's error channel, with no console output."
    },
    {
      "id": "R12",
      "severity": "minor",
      "location": "archive-stubbing/spec.md 'A staged item waits' / 'Nothing commits twice'; branch-hydration/spec.md 'Turning taiknr on mid-session'",
      "finding": "Re-staging protection is untested at the state boundaries. 'An item committed once is not committed again' relies on pending being drained, which the R2 ordering changes. When taiknr is switched on mid-session after starting off, nothing re-stages tool results produced while it was off, and settlement before the first hydration leaves the archive missing earlier stubs until the next tree or compact event.",
      "rationale": "The spec accepts the last point, but the carry-forward test set does not cover a result persisted while off, nor a settle immediately after turning on.",
      "concrete_case": "Off, then a 5 KB result, then on, then settle: nothing is staged for it, and it stays raw. A session turned on mid-session sees stubs from before with no archive entry until /tree.",
      "recommendation": "Add both cases as named boundary cases in the staging and hydration tasks, with the expected outcome stated: raw stays raw, archive catches up at the next tree or compact."
    }
  ],
  "assumptions": [
    {
      "assumption": "Pi 1.5.2 `ProjectedSessionEntry` carries `sourceEntry` and `messages`, and `BoundaryContextPreview.contextEntries` is typed as `ProjectedSessionEntry[]` (confirmed in node_modules types.d.ts and session-manager.d.ts).",
      "status": "verified"
    },
    {
      "assumption": "appendContextEdit rejects off-branch and non-editable targets with a thrown error, and normalises string replacement for toolResult (confirmed in session-manager.js 974–999).",
      "status": "verified"
    },
    {
      "assumption": "Forks and createBranchedSession copy the whole path, so context_edit and custom entries stay together; this removes a stub-without-record risk from forking (confirmed at session-manager.js 1217–1242 for the path copy).",
      "status": "verified"
    },
    {
      "assumption": "The turn_end deps type `argsByCallId: ReadonlyMap` and agent_before_settle deps without argsByCallId are current at HEAD and covered by the 'Signatures unchanged' scenario (confirmed in the files and in extension-packaging/spec.md 51–58).",
      "status": "verified"
    },
    {
      "assumption": "@earendil-works/pi-ai is hoisted at the top level of node_modules today but is not a declared dependency.",
      "status": "verified"
    },
    {
      "assumption": "Pi runs agent_before_settle handlers' drafts non-transactionally, and one throwing draft in preview validation discards the whole list (taken from Chidi §2 and Michael Trap 3; the runner source was not re-read in this pass).",
      "status": "unverified"
    },
    {
      "assumption": "`session_start` replaces the extension runtime on /new, /resume and /fork, so the factory-closure state (pending, argsByCallId, originalContentByEntryId) is fresh per session (from Chidi §5).",
      "status": "unverified"
    }
  ],
  "owner_questions": [
    {
      "question": "Should the `taiknr-side-store` entry data carry a schema version now (`{ v: 1, items }`) rather than being a bare array of items?",
      "options": [
        "Versioned envelope `{ v: 1, items: [...] }`, with the delta spec updated to match",
        "Bare array as currently specced, declared v1, with any later shape going to a new custom type"
      ],
      "recommended_option": "Versioned envelope `{ v: 1, items: [...] }`, with the delta spec updated to match",
      "why": "Session JSONL outlives the extension version that wrote it. A version field costs nothing today. Changing a bare array later forces sniffing of old entries, or silently drops them when an older taiknr reads a newer file. Michael can decide this alone, since it is a persisted-format design call, but the spec text currently says 'data is that batch', so it needs an explicit decision."
    },
    {
      "question": "Do existing PoC-era sessions (carrying `jev-side-store` entries and `tc_N` stub ids) need to remain recallable under pi-taiknr?",
      "options": [
        "No. Ignore them and say so in the design's Migration Plan",
        "Yes. Add a legacy reader for `jev-side-store` in a later card, not this one"
      ],
      "recommended_option": "No. Ignore them and say so in the design's Migration Plan",
      "why": "Only Joel knows whether any such sessions matter. Ignoring them is the smallest change and loses nothing for new sessions. Their stubs stay stubbed, with the raw text available only by navigating before the edit."
    }
  ],
  "not_checked": [
    "Pi's runner.js boundary validation and persistence behaviour were taken from Chidi and Michael, not re-read in this pass (R2 rests on them).",
    "Whether `session_start` always replaces the factory closure on /new, /resume and /fork was not verified; R7 and R12 assume it does.",
    "The bodies of recall-relevant-context.ts and the three non-archive adapters were not read, so interaction with the recall card's contracts was not checked.",
    "No tests were run and `npm run check` was not executed.",
    "Disk and session-file size cost of duplicating rawText in the side-store entries was not measured.",
    "How a boundary draft from `pi.appendEntry` versus a custom draft is ordered across other installed extensions was not examined."
  ]
}