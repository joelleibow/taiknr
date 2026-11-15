{
  "mode": "review",
  "lens": "council-structural",
  "paraphrase_proposes": "The design fills every missing body inside existing modules with zero new production files and unchanged signatures: turn_end stages every persisted text-carrying tool result at or above the session's threshold whatever the turn's outcome, pairing results to entry ids by toolCallId through contextEntries with a length-checked positional fallback, while tool_call records a try/catch-guarded, 120-unit single-line argument summary for top-level calls only. agent_before_settle builds eligibility Sets from getBranch() and event.entries, drops items the branch no longer holds or that any context_edit already targets, drafts the taiknr-side-store batch before its context_edit stub replacements, and drains the batch into the store as an optimistic cache over the branch. session_start (only while active), session_tree and session_compact rebuild the store whole from getBranch() behind a well-formed-item guard that skips foreign or malformed entries without failing the event; a shared domain helper renders single-line, surrogate-safe stubs and summaries; two test levels including a zero-network session-level test pin the abort, /tree, competing-draft, compaction and mid-session-toggle paths.",
  "paraphrase_existing": "At main 4e951a2 the composition root already constructs the config holder, the gated pi, InMemoryArchiveStore, argsByCallId, pendingOutputs, originalContentByEntryId and the recall cache, and registers all seven lifecycle events with exactly the dependencies the new bodies need; only session_start has a body (config resolution and rejection reporting, store parameter unused), the store's map operations work, and the three adapter translation functions, buildStub and the staging, commit and hydration use cases all throw Not implemented. createGatedPi suppresses the six non-start handlers unless session.isActive() holds at dispatch time, and SessionConfig moves unresolved to ready/rejected at session_start and flips enabled through setEnabled only from ready. Domain and use cases import nothing Pi-shaped (ADR 0001).",
  "recommendation": "Pass to the next stage: the round-1 fixes verified on disk, placement, layer flow, one-home rules and calibrated claims all hold, and the two remaining round-2 findings are one-line design.md edits (a wrong cross-reference in a Risks bullet and one missing named test case) that can land with the next revision without blocking convergence.",
  "findings": [
    {
      "id": "structural-r2-ST-S3-5",
      "severity": "minor",
      "location": "openspec/changes/archive-stubbing-and-branch-hydration/design.md:141 (Risks, 'A malformed session file could break a session start'); specs/branch-hydration/spec.md ('A foreign or malformed side-store entry is skipped'); specs/archive-stubbing/spec.md (contains no malformed-entry or session-start scenario)",
      "finding": "The malformed-session-file risk bullet claims 'both deltas' scenarios pin that the session starts', but only the branch-hydration delta carries those scenarios: specs/archive-stubbing/spec.md has no malformed-entry, skipped-entry or session-starts scenario anywhere, while specs/branch-hydration/spec.md alone pins 'No skipped entry SHALL fail a session start' and its 'Data of the wrong shape' / 'One bad item in a batch' scenarios ending 'the session starts'.",
      "rationale": "Calibrated claims: every cross-reference must match the cited evidence. A reader auditing the O3 mitigation opens specs/archive-stubbing/spec.md expecting the promised pin, finds none, and cannot tell whether a requirement is missing from that delta or the design miscounts its sources — the same census-drift class council amendment 7 fixed for the handler count and the 600 default.",
      "concrete_case": "An implementer verifying the bullet's claim greps specs/archive-stubbing/spec.md for the promised scenario and gets zero matches; the pin lives only in specs/branch-hydration/spec.md's skipping requirement, so the bullet's 'both deltas' is factually wrong about one of the two files it names.",
      "recommendation": "Change 'both deltas' scenarios' to 'the branch-hydration delta's scenarios' in the Risks bullet — a one-line edit. Do not add the scenario to the archive-stubbing delta: hydration-side skipping is already owned whole by branch-hydration, and widening that delta buys no behaviour."
    },
    {
      "id": "structural-r2-ST-S3-6",
      "severity": "minor",
      "location": "openspec/changes/archive-stubbing-and-branch-hydration/design.md:81 (Tests table, tests/infra/adapters/pi-archive-adapter.test.ts row); specs/archive-stubbing/spec.md:33-37 (scenario 'An id that is not eight characters')",
      "finding": "The spec scenario pinning that a 36-character UUID fallback entry id is carried whole (S1; Trap 6, the trap that motivated Decision 2's pairing rule) is the only archive-stubbing scenario with no named verification anywhere in the design's test table: the adapter row names candidate pairing, empty-text extraction, draft order, branch reading and the item guard, and the stage-tool-outputs row names threshold, empty, whitespace and join cases — none names a non-eight-character id.",
      "rationale": "Structural completeness between specs and design: a scenario that exists solely to prevent the id-slicing mistake (the PoC-adjacent error S1 was settled against) has no named home, so an implementer who slices or hex-pattern-matches ids passes every named test when the fixtures use only eight-hex ids.",
      "concrete_case": "A toToolOutputCandidates implemented with entryId.slice(0, 8) (or a /^[0-9a-f]{8}$/ normalization) turns the UUID-fallback id 'a1b2c3d4-...' into 'a1b2c3d4'; with eight-hex fixture ids every named adapter and settlement test still passes, and at settlement Decision 8's branch check finds no branch entry with the sliced id, so every UUID-fallback result is silently dropped and never stubbed or archived — violating the spec scenario with no failing test.",
      "recommendation": "Extend the pi-archive-adapter.test.ts row to read 'candidate pairing by toolCallId, including a 36-character UUID entry id carried whole, empty-text extraction, draft order, branch reading and the item guard' — one fixture id inside one already-named test; no new test file, no design change."
    }
  ],
  "assumptions": [
    {
      "assumption": "The Module & File Placement table still matches the code at HEAD: every listed production file exists with the stated signature and injected dependencies (turn-end.ts carries config, ReadonlyMap argsByCallId, pendingOutputs, originalContentByEntryId; agent-before-settle.ts carries store, pendingOutputs, originalContentByEntryId; tool-call.ts carries a mutable Map; toSettlementDrafts' second parameter is the ReadonlyMap the design names), taiknr.ts already constructs and passes the store and both maps, and layer dependencies point inward (domain imports nothing, use cases import domain/ports, adapter and handlers import use-cases/domain).",
      "status": "verified"
    },
    {
      "assumption": "Both round-1 propose_fix remedies landed in the current draft: Decision 4/5's try/catch around JSON.stringify substituting '' on BigInt/circular/throwing-toJSON with undefined reaching the helper as '', Decision 11's separation of tool_call totality (runner.js:965-979, agent-session.js:386-401, agent-loop.js:487-544) from the five error-channel handlers, the widened tool-call test row (undefined, BigInt, circular each record ''), and the named mid-session re-enable plus enabled-toggle-boundary cases in the session-tree/session-compact and archive-session rows and the inertness Risks bullet.",
      "status": "verified"
    },
    {
      "assumption": "The Context section's settled-code claims hold: SessionConfig starts unresolved, takes ready/rejected, flips enabled only from ready via setEnabled, and defines isActive() as ready-and-enabled; createGatedPi checks isActive() at dispatch time inside its on wrapper; package.json declares @earendil-works/pi-coding-agent as \"*\" in peerDependencies.",
      "status": "verified"
    },
    {
      "assumption": "Eight of the existing session-start test cases resolve enabled: true, so Decision 12's Trap 1 ordering claim stands (verified in round 1; the section is unchanged since).",
      "status": "verified"
    },
    {
      "assumption": "Pi 1.5.2 platform behaviour cited in Decision 8 and Decision 11 (sequential ExtensionRunner.emitBoundary dispatch in runner.js:773-797, no try/catch in emitToolCall, _beforeToolCall rethrow, prepareToolCall turning a throw into createErrorToolResult, appendContextEdit's off-branch throw, no post-commit callback, context_edit whole-content replacement) works as recorded by Chidi and Michael's rulings; it was not independently executed in this review.",
      "status": "unverified"
    },
    {
      "assumption": "The quantitative claims — the ~150 KB argsByCallId estimate across 1,000 calls (M6), the JSON.stringify separator and surrogate-split measurements in Node 26.8.1 (M9), and the ~35 ms zero-network harness measurement (M10) — are Michael's ruling evidence and were not re-measured here.",
      "status": "unverified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "No files were edited, no tests or checks were run, and no Pi runtime path was executed; platform behaviour is taken from Chidi's research and Michael's rulings, not re-measured.",
    "michael-orientation.md was not read directly; its D/S/O/Trap codes are consumed only as cited by the reviewed artifacts.",
    "The settled round-1 findings (CC-6, CC-7, critic-r1-CR-S3-2, CR-S3-3, CR-S3-5) and the pre-design structural dispositions (CS-1 through CS-9, including M7's god-module ruling on pi-archive-adapter.ts) were not reopened; the sections they concern were re-read only to confirm the round-1 fixes landed.",
    "tasks.md does not exist yet; design-to-tasks alignment is left to Stage 5, including the signature-against-disk verification the engine already assigned there (critic-r1-CR-S3-7 disposition).",
    "No live TUI, no model calls, and no inspection of the faux-provider harness beyond the design's and M10's recorded measurements."
  ]
}