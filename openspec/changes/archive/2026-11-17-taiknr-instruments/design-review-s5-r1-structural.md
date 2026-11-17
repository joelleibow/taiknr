{
  "mode": "review",
  "lens": "council-structural",
  "paraphrase_proposes": "tasks.md implements the four Jefferson instruments through 15 ordered groups: pin pi-jefferson@0.14.0 and turn on verbatimModuleSyntax, then the domain rules (token estimate, six figures, calibration, dollars), the per-session publisher use case with its declared types, the composition holder, the shared fake's bus recorder, the Jefferson declaration and bus adapters, the readings, the config switch, the classifier observer on recall's path, six publishing registrars, the wiring and its review checks, and Joel's live acceptance group. Every task names its failing test first, cites a red/green label or says why it has none, ends with npm run check green, and the Scenario coverage section maps each delta scenario to a task and a proving test or recorded check. The plan's end state is design.md's own file list: 30 files created, 13 modified, nothing deleted and no Markdown outside the change.",
  "paraphrase_existing": "taiknr today stages, settles and re-hydrates archived tool outputs through seven lifecycle registrations wired in src/app/extension/taiknr.ts behind a session-config gate, and recall appends one block to the latest user message inside context_with_system with a chars÷4-derived budget; no token figures, publishing, or instruments exist, and pi's own context reading jumps ~40% after a settlement because a context_edit newer than the last usage makes pi estimate the whole projection at characters÷4. Config is one enabled boolean layered from agent and project files, the suite gate is npm run check over 22 test files, and tsconfig.json carries no verbatimModuleSyntax while package.json holds no pi-jefferson dependency.",
  "recommendation": "Approve for implementation. Every Modify-table path exists on disk and matches the plan's description of it, the create list mirrors design.md's Module & File Placement exactly (30 created, 13 modified, none deleted), task order is dependency-sound (pin and flag before the only file that imports Jefferson's types; fake before the handler tests; publisher before holder before recall's path before registrars before wiring), each fact has one home (one estimator, one field table, one switch reader, one ratio table), and the claims I could check against the tree are calibrated (7-entry base list, 22 test files, no events member on the fake, two-param scorer adapter, {config, store, recallCache} deps). Five minor text defects — a false wiring parenthetical, one unachievable test-count criterion, one omitted fixed name, two scenarios without a named proof, and one superseded spike shape — need edits or a conductor note, but none forces Derek to invent a decision.",
  "findings": [
    {
      "id": "STRUCT-S5-R1-1",
      "severity": "minor",
      "location": "tasks.md, group 14, task 14.1 ('the four with no existing counterpart on their event'); design.md, Modified table and D2 ('immediately after the existing registrar whose outcome it reads')",
      "finding": "Task 14.1 calls the response, settled, compact and tree publishing registrars 'the four with no existing counterpart on their event', but session_compact and session_tree already have hydration registrars (registerSessionCompactHandler, registerSessionTreeHandler) whose re-hydrated store the publishing registrars read — 13.5 and 13.6 both assert the figures are 're-posted after re-hydration'. Appending all four after the request registrar also departs from design D2's stated placement rule, though the resulting event-time handler order is identical either way, because appending later still registers them after the hydration registrars.",
      "rationale": "The parenthetical is factually wrong for two of the four, and the placement it justifies contradicts the wiring rule a reviewer applies in 14.2's diff check against abaa6b0. The zero-decision rule survives — the Code instruction is explicit and behaviourally correct — but the internal contradiction invites a false finding at the gate or makes a reviewer think the plan miswired compact and tree.",
      "concrete_case": "In taiknr.ts the existing call order is start, tree, compact, tool_call, turn_end, before_settle, context; 14.1's instruction places compact-publishing and tree-publishing at the end, eight calls after registerSessionCompactHandler/registerSessionTreeHandler, not 'immediately after' them as design.md's Modified table prescribes — while 14.1's own justification denies those two events have any existing registrar at all.",
      "recommendation": "Reword 14.1's parenthetical: response and settled have no existing counterpart; compact and tree must follow their hydration registrars in registration order, which appending after the request registrar preserves — or move them per D2's rule. Either way the 13-entry sorted-list assertion and the per-event behaviour are unchanged."
    },
    {
      "id": "STRUCT-S5-R1-2",
      "severity": "minor",
      "location": "tasks.md, group 8, task 8.1, 'Verified' field",
      "finding": "8.1's verification criterion reads 'the whole existing suite stays green at the same 328 tests', but groups 2–7 run first and add roughly ten test files, so the suite is no longer at 328 when 8.1 executes. The plan's own header fixes the rule: 'no task asserts a total test count, so a suite that grows correctly never has to be renumbered.' (Tasks 1.1 and 1.2, which precede every test addition, may correctly say 328; 8.1 may not.)",
      "rationale": "A literal coder cannot satisfy 'the same 328 tests' at 8.1's position and must guess whether the plan erred or the suite broke — exactly the ambiguity the readiness standard forbids. The substantive check (the suite stays green, and this task adds no test of its own) is unaffected.",
      "concrete_case": "After 2.1–7.1 land, npx vitest run reports well over 328 tests; 8.1's Verified field then reads as failing even though the change is correct, and the coder has no stated criterion for 'the whole existing suite'.",
      "recommendation": "Reword to 'the existing suite stays green and this task adds no test of its own', dropping the number; keep the rest of the field (recorder assertions after group 9, ruling 16) unchanged."
    },
    {
      "id": "STRUCT-S5-R1-3",
      "severity": "minor",
      "location": "tasks.md, 'How this plan is executed', bullet 'Names the design fixes, and the ones it leaves to the house convention'",
      "finding": "The inventory of design-fixed exported names omits InstrumentPublisher, which design D3 and the instruments-holder placement row fix as an export of src/use-cases/instruments-publisher.ts and which task 7.1 explicitly imports ('importing InstrumentsHolder and InstrumentPublisher from the use case').",
      "rationale": "The bullet's stated purpose is that 'nothing else is chosen by the coder'; a required export name missing from the fixed list leaves a coder to decide whether the name is fixed or follows the house convention. In practice design D3 does fix both the name and the shape (six event methods plus reportRecalled, started, finished) and the home, so no decision actually remains — but the list that promises completeness is incomplete.",
      "concrete_case": "A coder writing 7.1 reads the fixed-names list, does not find InstrumentPublisher there, and must go to design.md D3 to learn the name is not theirs to choose.",
      "recommendation": "Add InstrumentPublisher to the fixed-names list beside FigureKey, FigureValues, Publication and the three interfaces."
    },
    {
      "id": "STRUCT-S5-R1-4",
      "severity": "minor",
      "location": "tasks.md, 'Scenario coverage', jefferson-instruments requirement 'Instruments are registered on Jefferson's published contract at session start'",
      "finding": "The scenarios *Placement stays the user's configuration* and *Jefferson's own code is untouched* are mapped to tasks 9.1, 9.2 and 13.1 but to no test or recorded check, while the readiness standard requires every scenario to name the task and the test that prove it or be marked as Joel's to observe. The neighbouring untestable scenarios (*Shutdown clears the fields*, *A mid-session off*, *Turning off mid-session*) each carry an explicit no-taiknr-test note; these two do not.",
      "rationale": "Both are non-action scope statements — the change writes no host file and touches nothing in Jefferson's repository — provable only by construction plus the diff checks, but as written they sit between 'proved' and 'excused', which a later gate pass can read as a coverage gap.",
      "concrete_case": "A reviewer scanning Scenario coverage for a proving test per scenario finds these two rows with task numbers only, unlike every other row in the same requirement which names a test file or a recorded review check.",
      "recommendation": "Add a one-line note naming the proof: 14.2's and 14.4's diff checks show no change outside the enumerated file list (so no host file and no Jefferson path is written), mirroring the *Shutdown clears the fields* note."
    },
    {
      "id": "STRUCT-S5-R1-5",
      "severity": "minor",
      "location": "redgreen-derek.md, A9 row; tasks.md, task 12.2; design.md D3/D9",
      "finding": "A9's recorded green says the reading recall passes 'evaluates to { estimate: tokenEstimate(formatRecalledContext(outputs)), messageIndex }', a member the same document's Gaps 4 removed with the evidence that nothing consumes it; design D3 now fixes the reading as () => { estimate: number } and task 12.2 correctly asserts the estimate-only shape while citing A9 as its red/green label.",
      "rationale": "The plan's rule is that each test cites the label where it went red and green; when the cited label's green shape disagrees with the design the plan implements, a coder reconciling the two could reintroduce the unconsumed member — the very drift Gaps 4 exists to prevent ('add only what your change consumes').",
      "concrete_case": "tasks 12.2: 'evaluates to { estimate: tokenEstimate(formatRecalledContext(outputs)) }'; redgreen-derek.md A9 green: 'evaluates to { estimate: tokenEstimate(formatRecalledContext(outputs)), messageIndex }' — the two disagree on the reading's shape.",
      "recommendation": "The coder follows design D3 (estimate only). The conductor notes the supersession beside the A9 citation in tasks 12.2, or leaves redgreen-derek.md as the untouched spike record it declares itself to be; no plan text other than the citation needs to change."
    }
  ],
  "assumptions": [
    {
      "assumption": "Every path in the Modify table exists on disk at the stated repository-relative location and matches the plan's description of its current state (taiknr.ts wires seven registrars; context.ts's deps are {config, store, recallCache}; createPiJevScorerAdapter takes two parameters; fake-pi has no events member and createContextStub.sessionManager has only getBranch; the base taiknr.test.ts asserts exactly 7 events against a proxy that throws on any member but on; tsconfig.json has no verbatimModuleSyntax; package.json has no pi-jefferson entry)",
      "status": "verified"
    },
    {
      "assumption": "Every path named in 'Unchanged' and 'Not created' exists: handler-gate.ts, session-config.ts, ports.ts (ArchiveStore with getAll() and size(), no added member needed), recall-relevant-context.ts, archived-output.ts, the six existing registrars, tests/support/classifier-guard.ts, and formatRecalledContext exported from src/domain/recall.ts",
      "status": "verified"
    },
    {
      "assumption": "The plan's two projection forms are both real in pi 1.5.2: ReadonlySessionManager.buildSessionProjection() (session-manager.d.ts:178, :328) and the root export buildSessionProjection(entries, leafId?) (:207), plus the root estimateTokens export (index.d.ts:6) that the readings and the request-side estimator need",
      "status": "verified"
    },
    {
      "assumption": "The baseline is 22 test files (counted on disk: exactly 22 *.test.ts files) and 328 tests; the 328 figure is taken from research-eleanor's run and the red/green spike's context, not re-run by this lens",
      "status": "unverified"
    },
    {
      "assumption": "pi runtime claims the plan rests on — pi's runner catching each handler separately, the before-first-await ordering, pi.events.emit throwing only from assertActive on a stale instance, the chars÷4 fallback after a context_edit — are as recorded in research-chidi, research-eleanor and the council's scratch-session rulings",
      "status": "unverified"
    },
    {
      "assumption": "pi-jefferson 0.14.0's published contract (jefferson:registration / jefferson:update channels, Report refusing null/undefined/non-finite, the bar's percentage scale and null, the type-only export path pi-jefferson/instruments resolving under nodenext) is as research-chidi measured it",
      "status": "unverified"
    }
  ],
  "owner_questions": [
    {
      "question": "Task 14.1's parenthetical calls the compact and tree publishing registrars events with 'no existing counterpart', which is false, and its appended placement departs from design D2's 'immediately after the existing registrar whose outcome it reads' — how should the plan text be reconciled?",
      "options": [
        "Reword 14.1's parenthetical (response and settled have no counterpart; compact and tree follow their hydration registrars in registration order, which appending after the request registrar preserves) and keep the appended order",
        "Move the compact and tree publishing registrar calls in 14.1 to sit immediately after registerSessionCompactHandler and registerSessionTreeHandler, exactly as design D2 states"
      ],
      "recommended_option": "Reword 14.1's parenthetical and keep the appended order",
      "why": "Both placements yield the identical event-time handler order — appending later still registers compact/tree publishing after their hydration registrars — so the only defect is the false justification; rewording is the one-line fix that removes the contradiction without touching code or the 13-entry assertion."
    },
    {
      "question": "Should the two scenarios with no named proof (*Placement stays the user's configuration*, *Jefferson's own code is untouched*) get an explicit note, and if so where?",
      "options": [
        "Add a one-line note in Scenario coverage naming 14.2's and 14.4's diff/review checks as their proof",
        "Leave them as task-only mappings and accept the construction-only reading",
        "Mark them for Joel's live look alongside the other Joel-observed rows"
      ],
      "recommended_option": "Add a one-line note naming 14.2's and 14.4's diff/review checks as their proof",
      "why": "The readiness standard wants every scenario either proved by a named test or explicitly excused; the diff checks already prove both statements at zero new cost, and the note mirrors the existing *Shutdown clears the fields* precedent."
    }
  ],
  "not_checked": [
    "Did not run npm run check or vitest; the 328-test baseline, every red/green label's reproduction, and all counts in redgreen-derek.md are accepted as recorded measurements, not re-measured.",
    "Did not verify pi runtime behaviour (per-handler catch in the runner, before-first-await timing, emit throwing from assertActive, event dispatch order) beyond the .d.ts exports grepped in node_modules; relied on research-chidi, research-eleanor and the council's scratch-session evidence.",
    "Did not inspect pi-jefferson 0.14.0's sources or npm tarball; the registration/report/bar/finiteness contract facts are taken from research-chidi.",
    "Did not re-derive the D8 dollar table's fifteen rows or the D5 field table's arithmetic; those are Chidi/Michael's domain and were checked for structural placement (one home per rule, row 12's split across publisher and handler) only.",
    "Did not read AGENTS.md, ARCHITECTURE.md, the ADRs, README.md or the living openspec/specs beyond the extension-packaging grep, since the plan's no-Markdown-in-diff rule puts them outside the implementation review.",
    "Did not verify that npm install --save-dev --save-exact pi-jefferson@0.14.0 from the registry produces the exact pin (Gaps 5's finding); accepted the spike's two consecutive installs as measured evidence."
  ]
}