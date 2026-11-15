{
  "mode": "council",
  "lens": "council-critic",
  "paraphrase_proposes": "",
  "paraphrase_existing": "",
  "recommendation": "The design is buildable within the seven events and Joel's Q1/Q2 rulings, but four things need fixing first. (1) Work out whether an item is committed by reading the active branch, not from in-memory state that Pi can silently throw away. (2) Restate the settlement filter in terms Pi actually records: a ContextEditEntry has no author, and drafts in event.entries count too. (3) Cut the stub's preview and argument summary on code-point boundaries. A persisted stub holding half a surrogate pair is believed to break every later request on that branch (provider behaviour not verified). (4) Choose a session harness that drives the real AgentSession for the abort, then /tree, then settle path. Everything else is minor: the stated costs, single homes for rules, and observability recipes for the design to record.",
  "findings": [
    {
      "id": "CR-1",
      "severity": "major",
      "location": "specs/archive-stubbing/spec.md 'A staged item waits until a settled run can commit it' + 'Settlement commits only items the active branch still holds'; src/use-cases/commit-archived-batch.ts (docstring 'Drain pending … into the ArchiveStore'); src/app/extension/taiknr.ts L24–26",
      "finding": "Whether an item has been committed is implicitly in-memory: commitArchivedBatch drains pendingOutputs and writes the store inside the agent_before_settle handler. But Pi decides afterwards whether the drafts persist. Pi checks the whole draft list after all handlers finish, and a later handler can replace event.entries outright (Chidi §2; Trap 3, Trap 5). Taiknr's own drafts can therefore vanish after taiknr has recorded them as committed.",
      "rationale": "Being careful with its own drafts (Trap 3's filter) does not protect taiknr from other extensions. Once the drafts are dropped, pending is empty, so the item is never retried. The store also claims an archive the session file lacks until the next hydration event. The outcome Joel chose in Q1 (a), every large output eventually stubbed, quietly fails.",
      "concrete_case": "Two cases. (a) A second extension loaded after taiknr returns `{ entries: [itsDraft] }` without spreading event.entries. (b) A second extension proposes a context_edit for an entry that is off the branch, so Pi sets valid=false and discards every draft (runner.js:798–813). Either way the settlement persists none of taiknr's drafts, and pendingOutputs is already drained. The 4,000-character bash output stays raw in context for the rest of the session. InMemoryArchiveStore holds it as archived, so the recall card would inject it a second time.",
      "recommendation": "Treat persisted state as the truth. An item counts as committed when a context_edit targeting it is on the active branch. Keep a pending item until the branch shows its edit, or until it is off the branch (which drops it, per Q1). The getBranch() walk the filter already needs covers this check, and 'Nothing commits twice' then follows from the branch instead of from an in-memory flag. Inside the handler, run the steps in this order: filter, build the drafts (pure), add to the store optimistically, return. A throw while building drafts then changes nothing. Put the side-store draft before the context_edit drafts in taiknr's list. Persistence is not transactional (Chidi §2), and an archived-but-unstubbed item is harmless where a stubbed-but-unrecallable item loses information. Optional: cap re-proposals, so a defect in taiknr's own draft cannot discard other extensions' drafts on every settle."
    },
    {
      "id": "CR-2",
      "severity": "major",
      "location": "specs/archive-stubbing/spec.md 'Settlement commits only items the active branch still holds' (\"whose target's latest edit on that branch is Pi's recovery omission\"); O3",
      "finding": "The filter is specified as dropping items whose latest edit is 'Pi's recovery omission'. That condition cannot be checked: ContextEditEntry is `{type,id,parentId,timestamp,targetId,replacement}` with no author field (Chidi §3). The spec also reads only edits already on the branch. It ignores context_edit drafts other handlers proposed earlier in the same boundary, and it ignores non-null edits from other extensions.",
      "rationale": "The latest edit for a target wins (session-manager.js:264). Any taiknr draft that lands after another edit to the same target overrides it: a null edit comes back to life, and a non-null edit is overwritten. Trap 4 already names event.entries as a source of these edits.",
      "concrete_case": "Three cases. (a) A context-pruning extension proposes `context_edit(X, null)` in this boundary's event.entries, and taiknr appends its stub for X after it. X's tool result returns to context without the tool call it answered, and the next provider request fails (#11227). (b) Another compressor already replaced X with its own summary, and taiknr's later stub overwrites it.",
      "recommendation": "Restate the rule in terms the code can check. Drop an item if any context_edit already targets it, null or not, by any author, either on the active branch or among the drafts in event.entries. This one rule also covers 'nothing commits twice' (CR-1). Make the spec's recovery-omission scenario one case of the rule, not the rule itself."
    },
    {
      "id": "CR-3",
      "severity": "major",
      "location": "specs/archive-stubbing/spec.md 'The stub is one line naming the output and previewing it' (180/120-character cuts); S2; O1",
      "finding": "The stub cuts the preview at 180 UTF-16 code units and the JSON argument summary at 120. If the cut falls inside a surrogate pair, the stub keeps half the pair. The stub is persisted in a context_edit, so every later provider request on that branch carries it.",
      "rationale": "Stubs are permanent on their branch, and taiknr has no path to rewrite them (ADR 0002 notes existing stubs are never rewritten). Some providers' JSON parsers are believed to reject lone surrogates, Anthropic's for one ('no low surrogate in string'). If so, a single emoji in tool output could block a whole session's branch. S2's template text is unaffected; only where the cut lands changes.",
      "concrete_case": "A `git log` output whose 180th code unit is the first half of a 🚀 emoji, or a `write` call whose input has an emoji spanning positions 119–120. Every request after that settlement is believed to be rejected by such a provider until the user navigates to a branch before the edit.",
      "recommendation": "Cut on code-point boundaries, for example by dropping a trailing high surrogate after `slice`. Cover it with one domain test. Normalize line breaks in the same O1 pass: `\\r\\n` and `\\r`, plus U+2028, U+2029 and U+0085, since `JSON.stringify` escapes `\\r` and `\\n` but not U+2028 or U+2029. Count lines with the same normalization."
    },
    {
      "id": "CR-4",
      "severity": "major",
      "location": "proposal.md 'Tests, including a session-level one'; O5; Trap 10",
      "finding": "The closing risks are all Pi runtime behaviour: settlement skipped on abort, a whole boundary rejected over one bad draft, and recovery omissions appended between agent_end and the retry. Option (i) cannot test them. Driving SessionManager.inMemory and hand-emitting events only replays what the test author believes Pi does.",
      "rationale": "A session test built on hand-written event sequences would pass even if Pi 1.5.x changed the abort or validation paths. Those paths are exactly the premises Michael found broken in the card (Trap 3).",
      "concrete_case": "A hand-driven test emits turn_end(aborted), then session_tree, then agent_before_settle, and it passes. It would still pass if a later Pi release ran agent_before_settle on aborted runs, or started validating drafts one at a time. The real failure from Trap 3, 'Entry <id> is not on the active branch', never runs.",
      "recommendation": "Use option (ii), the real createAgentSession with fauxProvider, at least for the abort, /tree, settle scenario and the scenario where another extension shares the boundary. Trap 10 measured about 35 ms with no network. Then choose explicitly between two costs. One is importing @earendil-works/pi-ai as an undeclared transitive dependency, with a one-line `shortcut:` comment; the lockfile keeps that deterministic. The other is a devDependency edit to package.json, which the proposal currently lists as untouched."
    },
    {
      "id": "CR-5",
      "severity": "minor",
      "location": "specs/archive-stubbing/spec.md 'A tool result carrying no text is never staged'; src/domain/archived-output.ts shouldArchive; src/use-cases/stage-tool-outputs.ts",
      "finding": "The rule that an empty or image-only result is never staged has no single home. `shouldArchive(0, 0)` returns true. If the guard lives only in the adapter's candidate translation, the use case and domain tests never see the rule.",
      "rationale": "feature-spec-standard §3 gives every rule one canonical home. Splitting the rule between the adapter (no text blocks) and the use case (empty string) leaves room for a regression at minCharsToArchive: 0.",
      "concrete_case": "A result has an empty text block followed by an image. The adapter emits a candidate with rawText '' because a text block exists, `shouldArchive(0, 0)` is true, and the image gets an 85-character 'preview: ' stub, the exact case Trap 7 warns about.",
      "recommendation": "Have stageToolOutputs (or the domain) refuse `rawText.length === 0` right beside shouldArchive. The adapter then only extracts and joins text. Add one use-case test at threshold 0."
    },
    {
      "id": "CR-6",
      "severity": "minor",
      "location": "src/use-cases/commit-archived-batch.ts (`_pending` is drained); agent-before-settle handler deps",
      "finding": "commitArchivedBatch drains the array it is given. If the handler filters pendingOutputs into a copy and passes the copy, the shared pendingOutputs array is never emptied.",
      "rationale": "This is the easy way to bolt the O3 filter on in front of the existing contract, and it silently breaks 'Nothing commits twice'.",
      "concrete_case": "The handler calls `commitArchivedBatch(pendingOutputs.filter(isCommittable), store)`. Every later settlement proposes the same context_edits again and appends another taiknr-side-store entry holding the same raw text. The session file grows each run, and hydration has to dedupe.",
      "recommendation": "State in the design that the filter removes items from pendingOutputs in place, and deletes their originalContentByEntryId entries, before or inside the commit. Pin this with the existing 'Nothing commits twice' scenario. This is moot if CR-1's branch-derived commit check is adopted."
    },
    {
      "id": "CR-7",
      "severity": "minor",
      "location": "proposal.md 'One side-store entry per committed batch'; S3; Joel's 'Orientation Q2' → (a)",
      "finding": "Each archived output's raw text is held in four places: the toolResult entry and the side-store data in the session JSONL, plus the store and the pending array in memory, on top of Pi's own copy. Joel accepted growth in the recall payload under Q2 (a). Nothing records a cost for disk or memory.",
      "rationale": "Hydration has no ceiling until the archive-caps card lands (D10). A cost nobody states cannot inform when that card is scheduled.",
      "concrete_case": "A long session archives 400 outputs averaging 20 KB. The session JSONL carries about 8 MB of duplicated raw text, and the hydrated store holds about another 8 MB in the extension's heap. This is in addition to the raw entries Pi already keeps.",
      "recommendation": "Keep S3's batch shape, which is the least code, and record the duplication as a stated cost for the archive-caps card. Note the rejected alternative: side-store entries carrying only ids and metadata, with rawText rebuilt from the untouched raw entry (Chidi §3). It would halve file growth, but hydration would have to pair entries and extract text again."
    },
    {
      "id": "CR-8",
      "severity": "minor",
      "location": "src/app/extension/taiknr.ts originalContentByEntryId, argsByCallId; O1, O3",
      "finding": "Two in-memory maps grow without bound. originalContentByEntryId holds each staged result's whole content array, including base64 images. Its entries are only cleared on commit, so items dropped off-branch stay forever. argsByCallId keeps an entry for every tool call whose result never arrives: a nested call, a call another extension blocked, or one that never produced a result.",
      "rationale": "Pending items are carried forward (Q1 (a)), so these maps live for the whole session.",
      "concrete_case": "A codemode tool makes 2,000 nested calls. Their argsByCallId entries are never consumed. A screenshot result over the threshold is staged and then dropped by a /tree jump, and its image block stays in the map until the session ends.",
      "recommendation": "Delete the argsByCallId entry at turn_end for every toolCallId seen, and skip recording calls that have parentToolCallId. Delete an originalContentByEntryId entry whenever its item is dropped. Simpler still: build the content map at settle from the raw branch entries the filter already walks, and leave the signature-locked map unused."
    },
    {
      "id": "CR-9",
      "severity": "minor",
      "location": "O2; Trap 6",
      "finding": "Pairing a tool result with its entry id through event.context.contextEntries (`sourceEntry.message === toolResults[i]`) depends on a relationship that was measured but is not documented by Pi. A simpler path uses only documented fields: pair by position, but only when `toolResultEntryIds.length === toolResults.length`.",
      "rationale": "The guard fails safe. When an id cannot be resolved, which is rare, that turn's results simply stay raw. The design should weigh this against relying on an undocumented relationship that a Pi upgrade could break without warning.",
      "concrete_case": "A Pi update rebuilds the context-preview messages instead of reusing the same objects. The identity check then matches nothing, and stubbing stops with no error.",
      "recommendation": "Record both options in Alternatives Weighed. If identity pairing wins, add a session-level assertion that it still pairs, so a Pi update that breaks it fails a test."
    },
    {
      "id": "CR-10",
      "severity": "minor",
      "location": "specs/branch-hydration/spec.md 'A foreign or malformed side-store entry is skipped'; O3, O6",
      "finding": "A malformed entry is skipped whole and silently. The side-store data carries no version, and nothing can show the user that a skip happened. The day a future card changes ArchivedToolOutput, a strict validator will silently skip every older entry.",
      "rationale": "Stubs already in context still point at those ids, so the outputs are stubbed but no longer recallable, and nobody can tell.",
      "concrete_case": "The archive-caps card adds a required `committedAt` field and the validator requires it. Every side-store entry written by this change is then skipped at the next session_start, and every stub in those sessions refers to an archive that is gone.",
      "recommendation": "Have the validator require only the fields hydration reads (id, toolName, argsSummary, isError, stub, rawText, each with the right type) and tolerate extra fields. Record in the design that the data shape is a persisted format contract. Optionally keep the valid items of a partly bad batch instead of dropping the whole entry."
    },
    {
      "id": "CR-11",
      "severity": "minor",
      "location": "O6; spec silent-drop clauses",
      "finding": "Several things can stop an output from being stubbed, and none of them leaves a trace. The output was under the threshold, taiknr was gated off, an aborted run was followed by a /tree jump, a recovery omission applied, another extension caused the boundary to be discarded, or the result came from a nested call.",
      "rationale": "feature-spec-standard §4 requires the design to say how operators see the change work or fail. console.* is ruled out (configuration-loader R14).",
      "concrete_case": "A user reports that a 5,000-character `npm test` output stayed raw. Nothing in memory or on disk tells the maintainer which of those causes applied.",
      "recommendation": "The design should name what is observable: context_edit and taiknr-side-store entries in the session JSONL, matched against toolResult entry ids, give a jq or grep recipe. It should list each silent-drop cause with how to infer it, and hand counters to the Status card. Add no logger here."
    },
    {
      "id": "CR-12",
      "severity": "minor",
      "location": "specs/branch-hydration/spec.md 'Turning taiknr on mid-session'; orientation §2 (Status card)",
      "finding": "With the gate closed, session_tree does not hydrate. A store hydrated while taiknr was on therefore survives a navigation that happens while it is off, and still holds the abandoned branch's items when taiknr is switched back on.",
      "rationale": "No user-facing switch exists in this change, but setEnabled does. The spec's 'gap closes at the next tree or compact' covers an empty store, not one holding another branch's items.",
      "concrete_case": "Taiknr is on with items {x} hydrated from branch A. The user turns it off, navigates /tree to branch B, then turns it back on. The next prompt's recall (next card) scores and injects x's raw text from a branch the user left.",
      "recommendation": "Record this as a handoff risk for the Status and recall cards. Either setEnabled(true) triggers hydration, or the store is cleared when taiknr turns off. Do not build either here."
    },
    {
      "id": "CR-13",
      "severity": "minor",
      "location": "configuration spec minCharsToArchive (any integer >= 0); S2 stub template",
      "finding": "Below roughly 400 characters the stub can be longer than the output it replaces. It carries a 10-character prefix, an 8–36-character id, the tool name, an argument summary of up to 120 characters, the counts, and a preview of up to 180 characters. Stubbing then makes the context bigger.",
      "rationale": "The default of 600 is safe. Any threshold the config spec allows is valid, so the design should state the trade-off and not leave users to discover it.",
      "concrete_case": "At minCharsToArchive: 50, a 60-character `ls` output is replaced by a stub of about 200 characters, adding context on every later request.",
      "recommendation": "Say it in the design, and in user docs during the docs pass. Do not change the threshold rule (configuration spec is approved)."
    }
  ],
  "assumptions": [
    {
      "assumption": "The extension factory runs again on each session_start reason (startup, reload, new, resume, fork), so pendingOutputs, the store and the maps never carry across sessions. Ids are unique only within one session, so a cross-session collision cannot happen.",
      "status": "verified"
    },
    {
      "assumption": "ContextEditEntry carries no author or source field, so a recovery omission by Pi cannot be told apart from a null edit by an extension.",
      "status": "verified"
    },
    {
      "assumption": "Pi checks the whole boundary draft list after all handlers finish, and one invalid draft discards all of them (runner.js:798–813, per Trap 3).",
      "status": "verified"
    },
    {
      "assumption": "Hosted providers, notably Anthropic, reject request bodies that contain lone UTF-16 surrogates.",
      "status": "unverified"
    },
    {
      "assumption": "Pi's built-in tools truncate output (about 50 KB), which bounds the size of each archived item in CR-7's estimate.",
      "status": "unverified"
    },
    {
      "assumption": "commitArchivedBatch, stageToolOutputs and hydrateArchiveStore have bodies that only throw, and their signatures are as read at HEAD.",
      "status": "verified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "Pi runtime source (runner.js, agent-session.js, session-manager.js) was not re-read; I relied on Chidi's and Michael's citations, except for compaction.md L83–138, which I read directly.",
    "The lone-surrogate behaviour of providers (Anthropic, OpenAI, oMLX) was not tested.",
    "Whether BoundaryContextPreview.contextEntries reflects drafts proposed earlier in the same boundary.",
    "The bodies of the recall-card files and the three non-archive adapters.",
    "Biome's noUndeclaredDependencies behaviour for a test importing @earendil-works/pi-ai."
  ]
}