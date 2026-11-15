{
  "assumptions": [
    {
      "assumption": "The Module & File Placement table matches the code at HEAD: every listed file exists, the seven handler signatures and their injected dependencies already carry what the bodies need, taiknr.ts already constructs and passes the store and both maps, and layer dependencies point inward (domain imports nothing, use cases import domain/ports, adapters and handlers import use cases/domain).",
      "status": "verified"
    },
    {
      "assumption": "Eight of the eleven existing session-start test cases resolve enabled: true, so the design's Trap 1 claim about the fixture ordering is accurate.",
      "status": "verified"
    },
    {
      "assumption": "The existing handler-gate test covers unresolved, ready, ready-disabled and rejected holders but never flips enabled from false back to true at dispatch time, so no named test pins the mid-session re-open.",
      "status": "verified"
    },
    {
      "assumption": "Pi 1.5.2 platform behaviour (getBranch vs contextEntries compaction bound, sequential emitBoundary dispatch in runner.js:773-797, no post-commit callback, context_edit whole-content replacement) works as recorded by Chidi and Michael's rulings; it was not independently executed in this review.",
      "status": "unverified"
    },
    {
      "assumption": "The ~150 KB argsByCallId estimate and the surrogate/separator measurements are Michael's, taken as ruling evidence rather than re-measured here.",
      "status": "unverified"
    }
  ],
  "findings": [
    {
      "concrete_case": "A regression that snapshots isActive() at registration time, or caches the disabled state in the handler, passes every named test in the design's table and the current handler-gate tests while breaking the branch-hydration scenario 'Turning taiknr on mid-session': a session started with enabled: false, turned on with setEnabled(true), whose next /tree or /compact then fails to hydrate.",
      "finding": "No test in the design's test table names the mid-session re-enable paths: a session that started with enabled: false, was turned on via setEnabled(true), and then navigates, compacts or settles. The branch-hydration spec carries the scenario 'Turning taiknr on mid-session', and adopted council finding R-12 explicitly said 'the off→on and settle-after-on boundary cases ... the staging and hydration tests must [name]. For the design and tasks passes to carry' — but the session-tree/session-compact rows say only 'hydration runs through the gate and not when inactive', the turn-end row names only completed/aborted/error, and the session-level row's four cases omit it. The existing tests do not close the gap either: handler-gate.test.ts covers unresolved, ready, ready-disabled and rejected holders but never flips enabled back to true before dispatching, so the Risks bullet 'pinned by ... the existing gate test' overstates what is pinned.",
      "id": "ST-S3-1",
      "location": "openspec/changes/archive-stubbing-and-branch-hydration/design.md — Tests table (session-tree/session-compact, turn-end, agent-before-settle and session-level rows) and Risks bullet 'Inertness can regress silently'; openspec/changes/archive-stubbing-and-branch-hydration/specs/branch-hydration/spec.md requirement 'Hydration runs only while taiknr is on and the session is active', scenario 'Turning taiknr on mid-session'; tests/app/extension/handler-gate.test.ts",
      "rationale": "A spec scenario with no named verification is the exact silent-regression risk the design's own inertness bullet names, and the design pass was the assigned home for R-12's remedy. Decision 10 describes the mechanism correctly in prose (the gate checks isActive() at dispatch time, so setEnabled(true) re-opens it), but the design's verification plan never pins it, and the one existing test suite a reader would trust for it does not contain the disabled→enabled case.",
      "recommendation": "Add the started-off-then-on sequence to the test table: one gated hydration case (session assigned ready with enabled: false, setEnabled(true), then a session_tree or session_compact event reaches the handler and hydrates) and one settle-after-on case (a run settling after a mid-session enable stages and commits normally); alternatively add it to the session-level test's named cases. Do not change the mechanism — only the named coverage. The fix can land in this design's test table before tasks.md is written from it.",
      "severity": "major"
    },
    {
      "concrete_case": "An implementer verifying Impact against the tree counts pi-context-adapter.ts, pi-jev-scorer-adapter.ts and pi-notifier-adapter.ts, finds three, and cannot tell from the proposal whether a fourth file was missed in scope or the count is wrong; the design's table, which says 'the three non-archive adapters', is the correct count.",
      "finding": "The proposal's Impact bullet says 'the four adapters the recall card owns stay untouched', but the repository has exactly three non-archive adapters (pi-context-adapter.ts, pi-jev-scorer-adapter.ts, pi-notifier-adapter.ts), and the proposal's own 'Deliberately not in this change' list names exactly those three.",
      "id": "ST-S3-2",
      "location": "openspec/changes/archive-stubbing-and-branch-hydration/proposal.md — Impact, bullet on src/infra/pi-event-handlers/ ('the four adapters the recall card owns'); src/infra/adapters/ (4 files total, 3 non-archive)",
      "rationale": "One home for each fact: a file census that miscounts invites an implementer to hunt for a missing fourth adapter or, worse, to assume one of the archive-side adapters belongs to the recall card. The design's table already carries the correct count, so only the proposal drifts.",
      "recommendation": "Change 'the four adapters' to 'the three adapters' (or name them) in the Impact bullet, matching the design's 'the three non-archive adapters' and the proposal's own non-goals list.",
      "severity": "minor"
    },
    {
      "concrete_case": "A reader auditing 'which files does this change touch in src/use-cases/' against the table sees stage/commit/hydrate/ports and no mention of recall-relevant-context.ts; the table gives no signal whether that file is deliberately out of scope or simply unexamined, and its doc comment ('Not implemented' status was not read by Eleanor §1) makes the omission look like an oversight rather than D10's boundary.",
      "finding": "The placement table enumerates every other untouched production module — ports.ts, context.ts plus the three non-archive adapters, both config files, taiknr.ts — but the recall card's src/domain/recall.ts and src/use-cases/recall-relevant-context.ts appear nowhere, so a reader tracing scope from the table alone cannot tell whether those two files are deliberately untouched under D10 or overlooked.",
      "id": "ST-S3-3",
      "location": "openspec/changes/archive-stubbing-and-branch-hydration/design.md — Module & File Placement table (the 'Untouched' row naming context.ts and the three non-archive adapters)",
      "rationale": "The feature-spec standard's Module & File Placement exists so an engineer can trace where every construct lives; a census that covers untouched files selectively is worse than one that covers them completely, because the silence is ambiguous.",
      "recommendation": "Extend the 'Untouched' row (or add one row) naming src/domain/recall.ts and src/use-cases/recall-relevant-context.ts as the recall card's, unchanged under D10 — a one-line table edit, no design change.",
      "severity": "minor"
    },
    {
      "concrete_case": "If the configuration default is ever retuned (say to 800) in the live spec, this change's proposal — the document a future reader consults for provenance — still asserts 600, and any test or doc derived from the proposal rather than the spec inherits the stale number; CS-6's already-applied amendment fixed the spec side but left this instance.",
      "finding": "The proposal's first What Changes bullet restates the configuration default — 'meeting the session's minCharsToArchive (default 600, comparison >=)' — whose canonical homes are the live configuration spec and D9. Council amendment 7 removed the same restatement from the archive-stubbing spec scenario per CS-6's one-home rationale, but the proposal's copy survives.",
      "id": "ST-S3-4",
      "location": "openspec/changes/archive-stubbing-and-branch-hydration/proposal.md — What Changes, first bullet ('(default 600, comparison >=)')",
      "rationale": "CS-6's adopted rationale — one fact, one home, the configuration spec and D9 — applies identically here; the council's amendment queue fixed the spec instance and missed the proposal instance of the same fact.",
      "recommendation": "Drop the parenthetical or replace it with a pointer ('the session's minCharsToArchive, per the configuration spec'), matching the design, which restates no default.",
      "severity": "minor"
    }
  ],
  "lens": "council-structural",
  "mode": "review",
  "not_checked": [
    "No files were edited, no tests or checks were run, and no Pi runtime path was executed; Pi platform behaviour is taken from Chidi's research and Michael's rulings, not re-measured.",
    "michael-orientation.md was not read directly; its D/S/O/Trap codes are consumed only as cited by the reviewed artifacts.",
    "The pre-design structural findings CS-1 through CS-9 were not reopened; their dispositions (M1, M3, M5–M9, amendment 7) were confirmed to have landed in the current artifacts, including the god-module ruling M7 and the store's placement, which stay settled.",
    "tasks.md does not exist yet; alignment between design.md and tasks.md could not be checked and is left to the next stage.",
    "No live TUI, no model calls, and no inspection of the faux-provider harness beyond the design's and M10's recorded measurements."
  ],
  "owner_questions": [],
  "paraphrase_existing": "At main 4e951a2 the extension registers seven lifecycle handlers from a composition root that already constructs the config holder, the gated pi, the InMemoryArchiveStore, argsByCallId, pendingOutputs and originalContentByEntryId; only session_start has a body (config loading and rejection reporting), while the archive adapter's store works and its three translation functions, the domain's buildStub and the staging, commit and hydration use cases all throw Not implemented. Six non-start handlers are registered through createGatedPi, which suppresses them unless session.isActive(); session_start is registered on raw pi so a later session start re-reads the config files. Domain and use cases import nothing Pi-shaped (ADR 0001).",
  "paraphrase_proposes": "The design fills every missing body inside the existing modules with zero new production files and zero signature changes: turn_end stages every persisted text-carrying tool result at or above the session threshold whatever the turn's outcome, pairing results to entry ids by toolCallId through contextEntries; agent_before_settle drops items the active branch no longer holds or that any context_edit already targets, then proposes one taiknr-side-store batch draft before per-item context_edit stub replacements and drains the batch into the store as an optimistic cache over the branch. session_start (while active), session_tree and session_compact rebuild the store whole from getBranch() with a well-formed-item guard that skips foreign or malformed entries. Inertness stays at the composition-root gate plus one isActive() check in session_start; a shared domain helper renders single-line, surrogate-safe stubs and argument summaries; two test levels including a zero-network session-level test pin the runtime-only paths.",
  "recommendation": "Pass to the next stage with one major fix before tasks.md is written from this design: name the mid-session re-enable (off → on → hydrate/settle) tests that the branch-hydration spec scenario and adopted finding R-12 already assigned to the design pass. Module and file placement checks out line-for-line against the code, every M1–M11 ruling and all seven council amendments landed in the artifacts, each rule has one home, and the remaining findings are three count/wording drifts in the proposal and the placement table's untouched census."
}