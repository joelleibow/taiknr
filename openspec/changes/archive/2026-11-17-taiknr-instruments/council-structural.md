{
  "assumptions": [
    {
      "assumption": "The council record is the nine brief-listed documents, and no design.md or tasks.md exists for this change yet.",
      "status": "verified"
    },
    {
      "assumption": "Michael's O1-O9 (michael-orientation.md §5) are the complete open list the design must answer, and every §O reference in the deltas resolves to it.",
      "status": "verified"
    },
    {
      "assumption": "The extension-packaging delta carries the living spec's frozen seven-event list and permitted-differences forward unchanged, apart from the publishing additions it names.",
      "status": "verified"
    },
    {
      "assumption": "The composition root (src/app/extension/taiknr.ts) constructing shared state and handing it to the registrars is the house pattern any new per-session state would follow.",
      "status": "verified"
    },
    {
      "assumption": "A throwing context_with_system handler has its whole result dropped by pi's runner, so publishing must not share recall's handler without containment (Michael T12, Chidi B8).",
      "status": "unverified"
    },
    {
      "assumption": "A value import of pi-jefferson/instruments would fail loudly at extension load from a clean npm checkout, so the type-only boundary fails safe (Chidi A4, M5 negative control).",
      "status": "unverified"
    }
  ],
  "findings": [
    {
      "concrete_case": "Design answers O1 with \"usage read at turn_end, published by a new registrar calling pi.on('turn_end', …)\". The recording fake records turn_end twice. Under the literal sorted-list reading, \"equals exactly the seven events … and nothing else\" fails; under a distinct-names reading it passes. Both readings are live until the scenario picks one.",
      "finding": "The scenario freezes the sorted list of registered event names as exactly the seven events \"plus every event design.md names for publishing at §O1, and nothing else\", and the requirement adds that each publishing registrar registers exactly one handler and no registrar registers a second event. But O1's live options include already-registered events (turn_end, agent_before_settle), and the proposal says \"The publishing handlers sit beside the seven existing ones in src/infra/pi-event-handlers/\". Nothing states whether the test's list counts distinct names or one entry per on() call, and the two readings disagree exactly when a design adds a registrar for an already-registered event.",
      "id": "STRUCT-1",
      "location": "openspec/changes/taiknr-instruments/specs/extension-packaging/spec.md — \"Requirement: The extension entry loads without error\" → \"Scenario: Seven events registered\"; proposal.md \"Impact — Code\"",
      "rationale": "This scenario is the repository's frozen boundary: the living extension-packaging spec and tests/app/extension/taiknr.test.ts repeat the identical list, and the proposal's own \"Impact — Contracts\" binds spec and test to move together. An ambiguous assertion form propagates into all three and invites silent drift between them during design.",
      "recommendation": "State the assertion form in the scenario — the set of distinct registered event names, permitting a publishing registrar to share an already-registered event — or bound the design to fold publishing into the existing handler whenever it names an existing event. Prefer the first: a separate registrar keeps a publishing throw (T12) out of recall's and settlement's handlers, one responsibility per registrar.",
      "severity": "major"
    },
    {
      "concrete_case": "The design splits usage reading (O1: message_end vs turn_end) from figure publishing elsewhere. Both handlers read the same response to recompute k; if either applies a different estimator than the one that produced the in-flight request estimate, two instruments disagree about the same figure within one repaint.",
      "finding": "The ratio k has a full lifecycle (1 at start → seeded from persisted usage at session_start → updated at each valid response → voided on provider/model change), and the \"measured\" flip of context in turn needs the estimate of the request currently in flight (written at request time, consumed when its response lands). Neither the proposal's Impact, nor any delta, nor the orientation's open list names the holder, its single writer per event, or its readers.",
      "id": "STRUCT-2",
      "location": "openspec/changes/taiknr-instruments/specs/context-figures/spec.md (the ratio requirement and its scenarios); proposal.md \"What Changes\" (calibrated token conversion) and \"Impact — Code\"; michael-orientation.md §5 \"Open for the council and the design\"",
      "rationale": "One home for each fact is the house rule, and every existing shared value — store, maps, pending list, recall cache — is constructed once in the composition root and passed into the registrars. Leaving this state's home to chance invites each handler deriving k on its own; T7 shows that two estimators distort the ratio, and independent derivations are how that distortion enters the code.",
      "recommendation": "Add both values to design.md's must-answer list: one per-session holder constructed in the composition root beside the store and pending list, seeded at session_start, written by exactly one handler per event, voided on provider or model change.",
      "severity": "major"
    },
    {
      "concrete_case": "A future change gives the classifier adapter a second stop outcome. The tail-recall spec gains the exit; the jefferson-instruments copy still enumerates four; the applied living specs now contradict each other on one rule.",
      "finding": "The four exits (answer, error, timeout, cancel) and the initial not-running / count-0 state are enumerated in full in both the tail-recall delta and the jefferson-instruments delta. The same pattern repeats for the off-gating rule and the switch's one-reader rule, each stated in both the configuration and jefferson-instruments deltas.",
      "id": "STRUCT-3",
      "location": "openspec/changes/taiknr-instruments/specs/tail-recall/spec.md (\"Every exit returns the value\", \"No call is made\") and specs/jefferson-instruments/spec.md (\"A call ends any way\", \"No call yet\"); the same pattern across specs/configuration/spec.md (\"An off by either switch registers nothing\", \"One reader\") and specs/jefferson-instruments/spec.md (\"A valid off registers nothing\", \"The switch is read in one place\")",
      "rationale": "Once applied, two or three living specs will carry the same behavioral sentences. A later change that adds an exit path or redefines the gating updates one copy and not the other, and nothing fails loudly because each spec still reads well alone.",
      "recommendation": "Give each fact one canonical home — tail-recall owns the seam contract, jefferson-instruments owns what is posted, configuration owns the field's semantics — and have the other delta cite the spec by name instead of restating the enumeration, the cross-reference style these deltas already use elsewhere.",
      "severity": "minor"
    },
    {
      "concrete_case": "A user watches taiknr.savings sit negative early in a session (M4's running total was −$0.007 at mid-session before it climbed), finds no README text on netting or the sign, and reads the figure as a bug.",
      "finding": "The docs requirement covers the context-measurement story (T1–T4) and the pasteable example rows, and the configuration delta covers the switch's README row — but no scenario requires the README to state what the savings figures net (the first-warm rewrite charge, the classifier's reported spend under Q2(a)) or that they are signed and can go negative (T19).",
      "id": "STRUCT-4",
      "location": "openspec/changes/taiknr-instruments/specs/jefferson-instruments/spec.md — \"Requirement: The documentation explains what stubbing does to pi's measurement\"; proposal.md \"Impact — Documentation\"",
      "rationale": "Joel's standing criteria for the figures are \"keep it simple, make it reliable, and don't misinform users\", and Q2(a) deliberately puts recall's spend inside the net, superseding the earlier note. Today's README explicitly says classifier costs are invisible in pi's own surfaces; a savings figure that silently subtracts that spend, with no README text explaining netting or the sign, leaves the user with a reading the docs never gave.",
      "recommendation": "Extend the documentation requirement (or O8) with one scenario: the README states the savings figures are net of the first-warm rewrite charge and the classifier's reported spend, and are signed.",
      "severity": "minor"
    }
  ],
  "lens": "council-structural",
  "mode": "council",
  "not_checked": [
    "The pi-jefferson repository (/Users/joelleibow/Projects/pi-jefferson, tag v0.14.0): contract shapes, fault containment and bar behavior taken from Chidi's and Michael's citations; source not read.",
    "pi's bundled sources (compaction.js, agent-session.js, runner.js, event-bus.js, loader.js, pi-ai): line citations accepted from the research reports; not read.",
    "Joel's ~/.pi/agent/settings.json and ~/.pi/agent/pi-jefferson.json: taken from Chidi A5; not read.",
    "The archived changes under openspec/changes/archive/: the standing rulings quoted in owner-rulings.md taken as binding without reading the archived originals.",
    "The living specs archive-stubbing, branch-hydration and development-checks beyond the deltas' and the orientation's citations of them.",
    "src/ and tests/ contents beyond a directory listing: Eleanor's reconnaissance stands in; no file was opened and nothing was run (read-only pass, nothing implemented yet)."
  ],
  "owner_questions": [
    {
      "options": [
        "(a) The scenario asserts the set of distinct registered event names, so a publishing registrar may share an already-registered event without adding a name to the list.",
        "(b) The scenario keeps one entry per on() call, and the design is bound to fold publishing into the existing handler whenever it names an existing event.",
        "(c) Leave the wording as it stands and let design.md pick the assertion form."
      ],
      "question": "STRUCT-1: what form does the packaging registration assertion take when the design's O1 answer names an already-registered event?",
      "recommended_option": "(a)",
      "why": "O1's live options include turn_end and agent_before_settle, and the proposal already places the publishing handlers beside the seven existing ones; a separate registrar also keeps a publishing throw (T12) out of recall's and settlement's handlers — one responsibility per registrar."
    },
    {
      "options": [
        "(a) One per-session state holder constructed in the composition root beside the store and pending list, written by exactly one handler per event (seeded at session_start, updated at each valid response, voided on provider/model change).",
        "(b) Derived on demand inside each publishing handler from the usage its own event carries, with no new holder.",
        "(c) Folded into the existing recall cache or the per-session SessionConfig holder."
      ],
      "question": "STRUCT-2: where do the calibration ratio k and the in-flight request estimate live?",
      "recommended_option": "(a)",
      "why": "One home per fact is the house rule; SessionConfig holds config state and the recall cache is keyed by prompt, both the wrong shape, and on-demand derivation across handlers multiplies the two-estimator distortion T7 warns about."
    },
    {
      "options": [
        "(a) Yes — extend the jefferson-instruments documentation requirement (or O8) with one scenario: the README states the savings figures are net of the rewrite charge and the classifier's reported spend, and are signed.",
        "(b) No — leave it to the docs pass after approval, as the proposal's Impact already provides."
      ],
      "question": "STRUCT-4: do the savings figures' netting and sign get a required README scenario?",
      "recommended_option": "(a)",
      "why": "J12(b) and Q2(a) make netting ruled behavior, today's README already speaks about classifier cost visibility, and M4 shows the running total goes negative early; the docs pass after approval is for the architecture and instruction files, not for this user-facing claim."
    }
  ],
  "paraphrase_existing": "",
  "paraphrase_proposes": "",
  "recommendation": "Proceed to design. Nothing blocks: the proposal's scope boundaries are clean, the two new capabilities split along the right seam (what the published figures mean vs. how they are exposed on Jefferson's contract), and every deferred choice is bounded by a named open question. Carry two majors into design.md's must-answer list: the packaging test's assertion form for when the design's O1 answer names an already-registered event (STRUCT-1), and a single named home for the two new cross-event state values, the calibration ratio k and the in-flight request estimate (STRUCT-2)."
}