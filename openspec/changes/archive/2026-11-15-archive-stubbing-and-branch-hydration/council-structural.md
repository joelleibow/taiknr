{
  "mode": "council",
  "lens": "council-structural",
  "paraphrase_proposes": "",
  "paraphrase_existing": "",
  "recommendation": "Proceed to design with no blocking findings, but fix three spec-delta gaps first: pin the persisted side-store item shape (and decide rawText duplication consciously), widen the settlement drop filter from 'Pi recovery omission' to any latest-null context_edit, and pair every drop/commit path with release of the per-id auxiliary maps. When O4 is decided, avoid letting pi-archive-adapter.ts become the archive half's god module; the extension-packaging spec locks exported contracts, not file layout, so the Pi-free InMemoryArchiveStore can move to its own file. The remaining findings are wording and determinism fixes inside the two spec deltas.",
  "findings": [
    {
      "id": "CS-1",
      "severity": "major",
      "location": "specs/archive-stubbing/spec.md 'A committed batch is recorded once as a side-store entry'; specs/branch-hydration/spec.md 'A foreign or malformed side-store entry is skipped'; proposal.md Open Questions O3",
      "finding": "The persisted side-store batch item shape is defined nowhere, yet both spec deltas depend on it. branch-hydration requires skipping entries 'whose data is not a batch of well-formed items' without ever defining a well-formed item (which fields, which types, required vs optional); archive-stubbing says the entry's data 'is that batch' without saying what a batch item carries.",
      "rationale": "One home for each fact: the single most duplicated fact risk in this change is the persisted item shape, because the write side (settlement) and the read side (hydration) must agree on it or every hydration silently drops what settlement wrote. The 'malformed entry is skipped' requirement is unmeasurable and untestable until the shape is named, and the proposal explicitly defers only 'the validation's home' (O3), not the shape itself.",
      "concrete_case": "Design implements settlement persisting the domain ArchivedToolOutput wholesale (id, toolName, argsSummary, isError, stub, rawText), while hydration validation expects items without `stub` — every hydrated entry fails validation and every resumed session starts with an empty archive, silently (the spec requires the skip to be non-fatal, so nothing crashes to reveal it). Separately, persisting rawText duplicates the largest fact in the system: the untouched raw tool-result entry already on the same branch carries the same text (Chidi §3, §5), so a session archiving fifty 40k-char outputs stores those 2MB twice in its JSONL.",
      "recommendation": "Before or at design time, define the persisted item shape once (a single named type or schema referenced by both spec deltas), and make the write and read paths derive from it. Decide rawText persistence explicitly: persisting it doubles archived-output bytes in the session file but keeps hydration a single pass over custom entries and survives any future raw-entry pruning; omitting it halves file growth but forces hydration to join side-store items to tool-result entries and re-run the O2 text-extraction rule (Chidi §5 confirms raw entries remain on the branch, so the join is possible). State the chosen trade-off; either answer is workable, silence is not. `stub` is fully derivable from the other fields, so if it is persisted too, record why (ADR 0002's settled-stub-are-not-rewritten rule is a defensible reason)."
    },
    {
      "id": "CS-2",
      "severity": "major",
      "location": "specs/archive-stubbing/spec.md 'Settlement commits only items the active branch still holds' and 'A staged item waits until a settled run can commit it'; src/app/extension/taiknr.ts:24-26 (argsByCallId, pendingOutputs, originalContentByEntryId)",
      "finding": "The pending-item state machine specifies entry (staging at turn_end) and exit (commit or drop), but no requirement or proposal bullet says the per-id auxiliary state keyed alongside each item — originalContentByEntryId (full content blocks, potentially images) and argsByCallId — is released when its item is dropped or committed. Only orientation O1/Trap 8 gestures at argsByCallId cleanup 'so long sessions do not leak call IDs'.",
      "rationale": "Brittle state transitions: every exit path from the pending state must have exactly one owner for releasing keyed auxiliary state, or the extension accumulates unreachable memory for the life of the session. The spec mandates two drop paths (off-branch, recovery-omitted) plus the commit drain, and mandates the drops be silent — nothing observes whether the paired map entries were cleared.",
      "concrete_case": "A user aborts a run whose turn persisted ten tool results of 40k characters each with image blocks, navigates /tree away, and the drop filter silently discards all ten candidates. The candidates leave pendingOutputs, but the ten originalContentByEntryId entries (the full content arrays) and their argsByCallId summaries stay in memory until the process exits; a day-long session that repeats this pattern holds megabytes of dead content, and no test based on the current spec would catch it because no scenario exercises state after a drop.",
      "recommendation": "Add to the drop/commit requirements (or record in the design as a hard rule) that dropping or committing an item releases every auxiliary entry keyed by its id, in the same code path that performs the drop/commit — one owner, not per-handler cleanup. Pin it with a scenario: after a settlement that drops and commits items, no auxiliary map retains an entry for any dropped or committed id."
    },
    {
      "id": "CS-3",
      "severity": "major",
      "location": "specs/archive-stubbing/spec.md 'Settlement commits only items the active branch still holds' (the recovery-omitted drop clause)",
      "finding": "The settlement drop filter names only 'Pi's recovery omission' as a disqualifying edit. The Trap 4 resurrection hazard is a property of context_edit semantics — latest-edit-wins with replacement:null omitting the target — not of Pi's recovery code path specifically. A null context_edit on the target produced by any other extension, either earlier on the branch or in the same boundary's event.entries drafts, has the same effect.",
      "rationale": "Two concepts forced into one rule: the spec encodes the mechanism (match Pi's recovery omission) instead of the invariant (never emit a stub edit whose target's latest edit on the active branch, or among the pending drafts this boundary has already accumulated, is null). The mechanism rule couples the adapter to Pi recovery internals and leaves a crash path the spec's own scenarios never cover.",
      "concrete_case": "A second extension omits failed tool results by proposing context_edit(targetId, null) in the same agent_before_settle boundary, earlier in handler order than taiknr. Its draft sits in event.entries; taiknr's filter sees no Pi recovery omission on the branch, keeps the item, appends its stub context_edit after the null edit. Latest-edit-wins un-omits the tool result whose paired assistant toolCall was also omitted, the next provider request fails on an unpaired tool result (the exact Trap 4 failure), and the branch-hydration and archive-stubbing scenarios all still pass as written.",
      "recommendation": "Reword the requirement from 'whose target's latest edit on that branch is Pi's recovery omission' to 'whose target's latest edit on the active branch, or among the drafts already proposed in the same boundary, has a null replacement'. This is strictly simpler (one generic null check instead of recognizing Pi's recovery pattern), removes the adapter's coupling to recovery internals, and closes the third-party-extension hole. The recovery-omitted scenario stays as an instance of the wider rule."
    },
    {
      "id": "CS-4",
      "severity": "major",
      "location": "src/infra/adapters/pi-archive-adapter.ts (whole file); proposal.md Open Questions O4; michael-orientation.md §5 O4, D7",
      "finding": "This change turns pi-archive-adapter.ts into the archive half's god module. After implementation it would own: an in-memory store implementing a use-case port (Pi-independent), the side-store type constant, TurnEndEvent→candidate translation, settlement draft construction, branch reading, and — per O3/S5 — settlement filtering and batch validation. Six reasons to change in one file whose name advertises one. Notably InMemoryArchiveStore and TAIKNR_SIDE_STORE_TYPE are Pi-free, yet they live in a module whose top imports pull @earendil-works/pi-coding-agent types, so a Pi-free class shares a module boundary with the heaviest Pi-DTO translation in the change.",
      "rationale": "One responsibility per module: D7 and the extension-packaging 'Signatures unchanged' scenario lock exported handler/adaptor signatures against HEAD, but they lock contracts, not file layout — nothing forbids moving a Pi-free store class to a sibling file and re-pointing imports. Orientation O4 already contemplates a narrow extension-packaging MODIFIED clause if new exported helpers are added; the split decision should be made in the same breath rather than after the file has accreted.",
      "concrete_case": "The archive-scaling card (next but one on the board) changes the store (caps, eviction) and touches branch reading; under the current placement its author edits the same file that owns settlement draft translation and TurnEndEvent pairing, and any regression in translation tests blocks the scaling change. Conversely, a Pi type bump forces re-reading store code that has nothing to do with Pi.",
      "recommendation": "When deciding O4: keep pi-archive-adapter.ts for event/boundary translation, and move InMemoryArchiveStore and TAIKNR_SIDE_STORE_TYPE to their own file (e.g. src/infra/adapters/in-memory-archive-store.ts or beside the store's port in use-cases territory if the boundary allows) — exported names and signatures unchanged, only import paths move, which fits the extension-packaging spec's permitted-differences list or needs at most the narrow MODIFIED clause O4 already contemplates. New internal helpers (branch filtering, content extraction, batch validation) can stay internal to translation modules rather than growing the exported surface."
    },
    {
      "id": "CS-5",
      "severity": "minor",
      "location": "specs/branch-hydration/spec.md 'Hydration runs only while taiknr is on and the session is active', scenario 'Nothing is gated per handler' ('the six non-start archive handlers'); michael-orientation.md §5 S5 ('the five non-session_start archive handlers'), D4 ('the six non-session_start handlers')",
      "finding": "Cross-artifact count drift on the gated handlers. S5 counts five archive-half handlers (excluding context.ts, owned by the recall card); D4 and the branch-hydration scenario count six non-start handlers (including context.ts). The spec scenario says 'the six non-start archive handlers', which reads as claiming context.ts is an archive handler of this change.",
      "rationale": "One home for each fact: the handler census has three inconsistent phrasings across artifacts, which invites a reviewer or implementer to expect context.ts to gain a body in this change — it does not and must not (D10, orientation §2).",
      "concrete_case": "An implementer verifying the branch-hydration scenario reads 'six non-start archive handlers', greps the six non-start handler files including src/infra/pi-event-handlers/context.ts, and either 'implements' inertness checking in context.ts (scope creep into the recall card's file, violating D10) or files a confused finding when the change deliberately leaves it a no-op.",
      "recommendation": "Standardize the wording in the branch-hydration scenario: 'the five archive-half handlers this change implements, gated together with the recall card's context handler through the same composition-root gate'. Use one number for the archive half across proposal, specs, and design."
    },
    {
      "id": "CS-6",
      "severity": "minor",
      "location": "specs/archive-stubbing/spec.md 'A persisted tool result above the threshold is staged at its turn boundary', scenario 'The session's own threshold applies' ('the default 600 is not used')",
      "finding": "The archive-stubbing delta restates the default threshold value 600 in a scenario, duplicating a fact whose canonical homes are the configuration spec and the domain's shouldArchive default (D9).",
      "rationale": "One home for each fact: if the default ever changes in the configuration spec, this scenario's text silently disagrees with the governing spec. The archive delta only needs to say the session's resolved threshold governs.",
      "concrete_case": "A future change raises the default to 1000 in the configuration spec; the archive-stubbing scenario still says 'the default 600 is not used', and a reviewer running conformance against the delta rejects a correct implementation (or worse, copies 600 into a test fixture as the default).",
      "recommendation": "Rephrase the scenario to 'the session's resolved minCharsToArchive applies and no hardcoded default is consulted', citing the configuration spec rather than naming 600. Same treatment for any other constant the delta restates (the stub's 180/120/3-line numbers are behavioral requirements of this capability and correctly live here; the threshold default does not)."
    },
    {
      "id": "CS-7",
      "severity": "minor",
      "location": "specs/archive-stubbing/spec.md 'A committed batch is recorded once as a side-store entry' and settlement requirements; research-chidi.md §2 ('persistence is not transactional'); michael-orientation.md Trap 3",
      "finding": "Neither spec delta nor the proposal acknowledges the non-transactional commit hazard the orientation already half-closed: commitArchivedBatch mutates InMemoryArchiveStore synchronously inside the agent_before_settle handler, but Pi validates and appends the whole draft list only after all handlers finish, and discards every draft if any one fails. So the in-memory store can hold items whose stubs and side-store entry were never persisted, until the next hydration event rebuilds the store from the branch.",
      "rationale": "Calibrated claims: the proposal presents the branch filter as removing the known trigger (stale ids), which is true, but a residual divergence remains for any other validation failure (a third extension's malformed draft in the same boundary list invalidates the whole list, per Trap 3's measurement of _createBoundaryPreviewManager). The design needs a stated position — the store is a rebuildable cache whose source of truth is the branch — rather than an implicit one, or the design will be tempted to invent a compensating rollback that Pi's API cannot express (there is no boundary-result callback).",
      "concrete_case": "Two items commit; a third extension registered earlier in the same boundary returns a malformed draft; Pi marks the boundary invalid and appends nothing. taiknr's store now serves both items to recall (the recall card will read getAll()) even though no context_edit or taiknr-side-store entry exists on the branch; a user navigating /tree next self-heals the store, but a session that ends first persisted nothing and the in-memory items simply vanish on shutdown with no trace.",
      "recommendation": "Record in the design (one paragraph, not a mechanism): InMemoryArchiveStore is a cache over the branch, hydration replaceAll on the three events is the divergence recovery, and the divergence window is bounded by the next session_tree/session_compact/session_start. Do not build a rollback. Optionally add one scenario asserting a rejected boundary leaves the side-store absent so the self-heal is testable."
    },
    {
      "id": "CS-8",
      "severity": "minor",
      "location": "specs/branch-hydration/spec.md 'A foreign or malformed side-store entry is skipped', scenario 'The same id twice on one branch'",
      "finding": "The duplicate-id scenario specifies that the archive holds one item for a duplicated id but not which one wins, leaving the outcome dependent on iteration order.",
      "rationale": "Deterministic behavior: ids are unique within a session (byId), so this scenario exists precisely for malformed or foreign entries carrying colliding ids — the case where ordering is undefined. An unpinned winner makes hydration observably nondeterministic across implementations that both satisfy the spec.",
      "concrete_case": "A hand-edited or foreign taiknr-side-store entry duplicates id a1b2c3d4 with different rawText than the genuine entry earlier on the branch. One implementation keeps the branch-earlier item, another the branch-later item; recall serves different raw text for the same id and neither implementation fails the delta as written.",
      "recommendation": "Pin the winner in the scenario (branch-later wins is the natural choice, mirroring latest-edit-wins elsewhere in the system) or fold it into the CS-1 item-shape definition as one deterministic merge rule. One line in the spec; cheapest fix in this report."
    },
    {
      "id": "CS-9",
      "severity": "minor",
      "location": "src/use-cases/stage-tool-outputs.ts ('Filter candidates by size threshold'); src/infra/adapters/pi-archive-adapter.ts (toToolOutputCandidates); proposal.md O2; specs/archive-stubbing 'A tool result carrying no text is never staged'",
      "finding": "Candidate eligibility will live in two layers unless the design pins it: the size threshold (shouldArchive) runs in the use case per its docstring, while the 'must carry non-empty text' rule cannot be expressed by shouldArchive (shouldArchive(0, 0) is true by design) and must therefore run in the adapter's candidate extraction. What makes a candidate eligible would then have two homes across layers.",
      "rationale": "One rule, one seam: 'when is a tool result staged' is a single domain question; splitting its predicate across adapter and use case means a future change to eligibility (e.g., the archive-caps or a new content type) touches two layers and two test suites, and O2 already leaves the text-extraction boundary open, compounding the ambiguity.",
      "concrete_case": "Pi later adds an audio content block to tool results; the adapter's text-extraction (O2) correctly produces no text for an audio-only result, but a contributor extending eligibility in stageToolOutputs alone misses the adapter's no-text skip — with minCharsToArchive: 0, an audio-only result reaches stageToolOutputs with rawText '' where shouldArchive(0,0) returns true, and the eligibility predicate disagrees with itself across layers (whichever check runs last decides, invisibly).",
      "recommendation": "In the design, put both eligibility rules behind one seam: either the adapter emits only candidates carrying non-empty text and the use case owns only the threshold, or the use case owns both rules and the adapter passes through everything. State the division in one sentence in the design so O2's resolution inherits it."
    }
  ],
  "assumptions": [
    {
      "assumption": "Existing wiring and data shapes at HEAD (seven handler registrations, pendingOutputs typed ArchivedToolOutput[], originalContentByEntryId/argsByCallId maps in the composition root, the three Not-implemented adapter functions, InMemoryArchiveStore behavior) are as Eleanor §1 and orientation D9 describe.",
      "status": "verified"
    },
    {
      "assumption": "The extension-packaging spec locks exported handler/adaptor/port contracts against HEAD but not internal file layout, so moving Pi-free exports (InMemoryArchiveStore, TAIKNR_SIDE_STORE_TYPE) to a sibling file is contract-compatible (CS-4).",
      "status": "verified"
    },
    {
      "assumption": "context_edit is whole-content replacement, latest-edit-wins, and appendContextEdit throws for off-branch targets; boundary draft lists are validated wholesale with one throwing/invalid draft discarding the list; persistence is non-transactional.",
      "status": "unverified"
    },
    {
      "assumption": "The recovery-omission mechanism (context_edit(targetId, null) for failed attempts) and the ~35 ms zero-network session harness measurement are accurate as reported.",
      "status": "unverified"
    },
    {
      "assumption": "The canonical home of the default 600 is the configuration spec plus domain code (D9), and the archive delta's mention of 600 is therefore a restatement.",
      "status": "unverified"
    }
  ],
  "owner_questions": [
    {
      "question": "Should the persisted taiknr-side-store batch item carry the full rawText, or only id/toolName/argsSummary/isError with raw text re-joined from the raw tool-result entries on the branch at hydration? (The raw tool-result entry already stores the same text on the same branch, so persisting rawText stores every archived output twice in the session JSONL.)",
      "options": [
        "Persist the full item including rawText: hydration stays a single pass over custom entries, no join logic, robust if raw entries are ever pruned by a future Pi; session file grows by the full size of every archived output.",
        "Persist metadata only (id, toolName, argsSummary, isError) and re-extract raw text from tool-result entries at hydration: halves session-file growth for archived outputs; hydration gains an id-to-entry join plus a second consumer of the O2 text-join rule."
      ],
      "recommended_option": "Persist the full item including rawText",
      "why": "Simplicity and robustness win at this stage: one hydration pass, one owner of the item shape, no dependency on raw entries surviving future Pi pruning. Joel already accepted unbounded archive growth in the branch (Q2 ruling (a)) until the archive-scaling card adds caps, and local session-file bytes are the same trade-off in spirit. Record the duplication explicitly in the design so the archive-scaling card can revisit it when caps land."
    }
  ],
  "not_checked": [
    "Pi 1.5.2 node_modules internals (runner.js, agent-session.js, session-manager.js): every platform-behaviour claim is taken from research-chidi.md and michael-orientation.md's measurements, not re-verified against the installed package.",
    "The recall card's untouched files (src/domain/recall.ts, src/use-cases/recall-relevant-context.ts, the pi-{context,jev-scorer,notifier}-adapter.ts files, src/infra/pi-event-handlers/context.ts): taken on orientation D10's word that this change must not touch them.",
    "Existing tests beyond the claims cited in Trap 1 (tests/support/fake-pi.ts, session-start.test.ts contents): relied on orientation; no test file was read directly.",
    "ARCHITECTURE.md §11 and ADR 0002/0003 in full; ARCHITECTURE.md claims rest on Eleanor §5 and orientation citations.",
    "The full configuration spec (openspec/specs/configuration/spec.md) beyond the two deferred scenarios grepped for alignment with D5.",
    "No live session, npm run check, or measurement was run; this review is read-only over the artifacts and src/ as instructed."
  ]
}