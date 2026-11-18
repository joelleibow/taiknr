{
  "mode": "review",
  "lens": "council-readiness",
  "paraphrase_proposes": "The change adds a before_provider_request payload edit that places a cache point on the block before recall's block, plus a carry point on the previous recalling turn's carrier, so the next turn reads an entry instead of rewriting its prefix. It keeps a per-session PayloadCacheState with four fields: cell (a), committed record (b), nextCarrier and applied. A new commit handler writes record (b) only at a valid assistant message_end. The pricing rule moves too: the block gets one rule via applied.block, written blockUncached, and the rewrite start moves after the carrier through carrierRead. tasks.md orders this into 12 groups: adapter, request handler, commit handler, context cell, domain, publisher, registrar, composition, live script, a full re-run, Derek's live runs, and Joel's live routes.",
  "paraphrase_existing": "Today taiknr registers 13 gated handlers over 9 events and never edits the provider payload. The context handler appends recall's block and calls reportRecalled. The publisher's rewriteOf starts the rewrite at carried.index and prices the block at read or write from blockInNewTail alone. PricedRequest has no blockUncached, ResponseReadings is an alias of CompactedReadings, and readResponse returns it. registerInstrumentsResponseHandler takes (pi, holder). The context handler's deps object is {config, store, recallCache, holder}. tsc covers src and tests, so every required-field change ripples through npm run check.",
  "recommendation": "Not ready: revise tasks.md before Implement. One blocking finding: groups 4, 5, 6 and 7 each add a required field or parameter whose consumers are only updated in a later group, so the stated invariant that every group leaves npm run check green is false, and 4.1's and 6.1's own typecheck commands fail as written. Four majors:\n- 1.1/1.2 say editPayload never throws, but B1 and M1 need it to throw on an uncloneable payload and the handler to catch.\n- Tests inside group 1 are assigned to tasks that cannot make them pass.\n- The In-turn requests and Only the cache markers differ scenarios have no proving test.\n- The live script task cites no source for prompts or exports, and several context-figures pin scenarios have no named test.\nFile paths, the symbols the tasks cite, .gitignore:12 and the AGENTS.md line numbers all check out against disk.",
  "findings": [
    {
      "id": "R1-groups-not-green",
      "severity": "blocking",
      "location": "tasks.md preamble ('each group leaves npm run check green'); 4.1, 5.1, 6.1, 7.1, 8.1",
      "finding": "Groups 4, 5, 6 and 7 each add a required field or parameter, and the consumers that must supply it are edited only in later groups. The claim that every group leaves npm run check green is false, and 4.1's and 6.1's own 'Verified by: npm run typecheck' fails as written.",
      "rationale": "tsconfig includes src/** and tests/**, and npm run check runs tsc. A required-field change anywhere breaks every untouched construction site until it is edited.",
      "concrete_case": "4.1 makes deps.payloadCache required in context.ts, but taiknr.ts:41 still builds the deps as {config, store, recallCache, holder} until 8.1, so tsc fails at 4.1. 5.1 makes PricedRequest.blockUncached required, but instruments-publisher.ts:~207 calls netDollars with no such field until 6.2. 6.1 makes ResponseReadings.applied required, but instruments-response.ts:28 passes readResponse's CompactedReadings until 7.1. 7.1 adds a required third parameter that taiknr.ts:53 does not supply until 8.1.",
      "recommendation": "Regroup so each ripple lands whole:\n- Merge 5.1, 6.1, 6.2 and 7.1 into one 'figures and readings' group.\n- Move the state literal in taiknr.ts and the new deps and parameter at its call sites into 4.1 and the merged group, leaving 8.1 only to register the two new handlers and update F1.\nAlternatively state explicitly that 4–8 are one green boundary and run check only at its end."
    },
    {
      "id": "R2-editpayload-throws-contradiction",
      "severity": "major",
      "location": "tasks.md 1.1 Error behavior ('never throws'), 1.2 Error behavior ('the function is total over its four inputs'), 2.2 (B1, M1); design.md §5.1, §6.1, §6.2",
      "finding": "1.1 and 1.2 tell the coder that editPayload never throws and is total. Design §5.1, §6.1 and §6.2 and test B1/M1 require editPayload to throw on a payload structuredClone cannot copy, and the handler to catch it and reset applied and nextCarrier.",
      "rationale": "If the coder follows 1.2 and catches the clone failure inside the adapter, the handler's catch is dead code. M1 (the catch stops resetting) then cannot turn B1 red. The coder must decide who owns the failure, which is a design choice the tasks should have settled.",
      "concrete_case": "B1 passes a payload with a function value. If editPayload swallows the DOMException and returns an untouched result, the handler's catch never runs. B1 still passes, but M1 is no longer caught and the 'handler never throws out' contract has no test for its own catch.",
      "recommendation": "Change 1.1 and 1.2 to say editPayload may throw only on a payload structuredClone rejects, that it does not catch, and that the handler's catch is the single fail-open path. Keep 'returns undefined' for the three untouched cases only."
    },
    {
      "id": "R3-group1-intra-order",
      "severity": "major",
      "location": "tasks.md 1.1 (A1, A2), 1.3 (A18, A19, A20), 1.4 (A8)",
      "finding": "Several labels are assigned to a task that cannot make them pass. A1/A2 are 'edited' checks but need editPayload, which 1.2 adds, and 1.1 adds only coversRoute. 1.3's A18, A19 and A20 assert that both points, or the edit, are still placed, which needs the before point (1.4), the carry (1.6) and the budget (1.5). 1.4's A8 asserts 'four markers' and that pi's marker stays, which depends on the budget logic in 1.5.",
      "rationale": "Each task must have a test that fails before and passes after its own production code. A test whose green depends on a later task's code leaves the suite red inside the group, and the coder has to invent an interim placement algorithm.",
      "concrete_case": "A18 ('a handoff that also recalls still places both the carry and the before point' despite a tool input_schema marker) cannot go green at 1.3, because no placement code exists until 1.4 and 1.6. The task text itself concedes the dependency by crediting M4, a 1.5 mutation, with turning A18 red. In addition, A1's covered-row fixture is unspecified, and a covered payload with no point wanted and no carve-out returns undefined, so 'edited: true' needs a fixture the task never defines.",
      "recommendation": "Either test coversRoute directly in 1.1 with its own labelled cases (A1 and A2 as route-table assertions on coversRoute, plus a payload-shape check), or fold 1.1–1.7 into one adapter task with the A-labels as its test list. Move A18–A20 to 1.5 or later, and give A1 a named fixture for the covered row."
    },
    {
      "id": "R4-scenarios-without-proof",
      "severity": "major",
      "location": "tasks.md Scenario Coverage, tail-recall rows 'In-turn requests', 'Only the cache markers differ', 'A turn longer than the entry's remaining lifetime', 'The route cannot be switched mid-session'",
      "finding": "Four spec scenarios have no proving test.\n- 'In-turn requests' is mapped to A8 and A9 with the note '(pi's marker stays with room for one more)'. A9 is actually the top-level-marker case where pi's marker yields, and A8 has pi's marker on recall's block of a first request. No named test places pi's marker on a later tool_result with the before point earlier.\n- 'Only the cache markers differ' is mapped to A13, A16 and A21, which are all no-edit or equal-input cases. None asserts that message text, order and position are unchanged when an edit was made.\n- 'A turn longer than the entry's lifetime' is mapped to A3, which only proves ttl is copied.\n- 'The route cannot be switched mid-session' is mapped to B5, which proves inertness with enabled false or a rejected config, not shape stability.",
      "rationale": "The standard fails the plan when a scenario has no named test and is not marked Joel's. A wrong mapping is worse than a gap, because it reads as proven.",
      "concrete_case": "A mutation that moves pi's last-message marker off the tool_result on an in-turn request, or reorders blocks while placing points, passes every named label.",
      "recommendation": "Add an in-turn adapter label (cell (a) set, carrier earlier in the array, pi's marker on the last tool_result, wanted points plus one fit, output has the before point and pi's marker untouched). Add an assertion to A8/A12 that the output equals the input once cache_control is stripped, apart from the carve-out. Correct the A9 note. Mark the 7.5-minute lifetime and the mid-session toggle scenarios as accepted residual or Joel-observed instead of citing A3 and B5."
    },
    {
      "id": "R5-live-script-source",
      "severity": "major",
      "location": "tasks.md 9.1 and its L1 'Test first'; design.md §8.3",
      "finding": "9.1 asks for the whole live script ('to §8.3's contract') but never names a source. The exact prompt text, the observer's code, the exports and the main-module guard are not in tasks.md or design.md. L1 drives the script's own `evaluate`, but the task never says `evaluate`, `report` or `parseObserverLog` are exported. A working copy exists only in the excluded `.pi/` tree at `/Users/joelleibow/Projects/taiknr/.pi/marbleization/cache-point-before-recall/derek/test-cache-point-live.mjs.txt`, alongside the L1 driver `live-assertions-offline.mjs`.",
      "rationale": "Acceptance runs on a model-dependent 12-request precondition. A re-invented prompt changes how often that precondition holds and invalidates the red/green evidence the spike collected.",
      "concrete_case": "A coder rewrites the turn-2 prompt from the one-line description 'a second 800-entry table, a question about the output, twelve sequential calls'. The model makes 2 requests, as in L4, and the route never reaches acceptance. Or `evaluate` is not exported and the L1 driver cannot import it.",
      "recommendation": "Name the spike's .txt file as the source to copy into the repository root, and list the required exports (`default` observer, `evaluate`, `report`, `parseObserverLog`). Name the L1 driver's path and the log files it replays (long-added.log, long-carry.log under .pi/marbleization/cache-point-before-recall/michael/)."
    },
    {
      "id": "R6-pin-scenarios-unnamed",
      "severity": "major",
      "location": "tasks.md Scenario Coverage, context-figures rows marked 'pin' ('The split alone changes no figure', 'A warm request that read only part of its prefix', 'Recall's classifier spend', 'A negative total', 'The edges the design decides')",
      "finding": "These rows cite '10.1 re-runs the publisher's existing price tests' without naming a test. For 'The split alone changes no figure', no existing test carries the spec's numbers. A grep of tests/ for 35731, 139169, 168585 and 0.02285 finds nothing, and no test title mentions the split.",
      "rationale": "A pin is only a proof if a specific existing test fails when the behaviour is deleted. Naming none leaves the scenario unproven.",
      "concrete_case": "The spec scenario prices one request with a 35,731/139,169 split and again with 168,585/6,315, and expects −0.02285 both times. A change that made netDollars depend on the read/write counts would pass every currently named check.",
      "recommendation": "Name an existing test for each pin. Candidates in tests/use-cases/instruments-publisher.test.ts: 'a block larger than the stub saving publishes a negative pair and a falling total' for the negative total; 'two calls before one valid response add up and are subtracted once' for classifier spend; the 'a valid response makes its pair live…' test for the pair. Add one new test, with the spec's two splits, for the split scenario."
    },
    {
      "id": "R7-fixture-ripple-unlisted",
      "severity": "minor",
      "location": "tasks.md File Boundary; 6.1; 5.1; 7.1; 4.1",
      "finding": "Existing fixtures the type changes break are not all listed.\n- tests/use-cases/instruments-publisher.test.ts needs `applied` in its `contextReading` helper (line 166) and the inline readings at lines 302, 821, 831 and 886. 6.1 only names compact, tree and request.\n- tests/domain/savings-dollars.test.ts's `request()` helper (line 19) needs a blockUncached default.\n- tests/infra/pi-event-handlers/instruments-response.test.ts has three registerInstrumentsResponseHandler calls (lines 80, 191, 215) that need the third parameter.\n- tests/infra/pi-event-handlers/context.test.ts:112 builds deps without payloadCache.\n- The File Boundary row for instruments-request.test.ts says 'a `payload` state', while design §4 and 4.1 say `payloadCache`.\n- The type of ResponseReadings.applied is not stated; it is presumably `interface ResponseReadings extends CompactedReadings { applied: AppliedPlacement | null }`, required.",
      "rationale": "Each is mechanical, but the file boundary is supposed to list every modified file and symbol shape.",
      "concrete_case": "The coder updates only the three named instrument test files and tsc fails in instruments-publisher.test.ts and savings-dollars.test.ts.",
      "recommendation": "Add these sites to the File Boundary and to the owning task. Fix the `payload` versus `payloadCache` inconsistency. State ResponseReadings' exact shape and that `applied` is required with `null` meaning 'not edited'."
    },
    {
      "id": "R8-adapter-api-unsettled",
      "severity": "minor",
      "location": "tasks.md 1.1, 4.1",
      "finding": "Small interface choices are left open.\n- Does coversRoute take the payload as well as the model? D1 requires a messages array, and 1.1 gives only 'route table' cases.\n- Is RouteModel.baseUrl optional? 'A missing baseUrl' is a boundary case.\n- Is 'returns undefined' for an uncovered route the adapter's return value or the handler's? editPayload is declared to return {output, nextCarrier, applied}.\n- 4.1 does not say that cell (a)'s value is formatRecalledContext(outputs), the same text appendRecalledContextToMessages appends, or that the clear happens at the top of the handler, before its early returns.\n- The baseline's blockUncached home differs between design §5.4 (baseline = {...candidate, blockUncached}) and the spike (RequestCandidate.blockUncached, initialised false at requestBuilt).",
      "rationale": "Each is a private-looking choice that other code or tests then depend on.",
      "concrete_case": "The coder clears cell (a) after the `prompt === undefined` return, so a context_with_system with no user prompt leaves the previous request's block in cell (a). A later payload then matches a stale block.",
      "recommendation": "State the signatures: coversRoute(model: RouteModel | undefined): boolean, with the messages check in editPayload; RouteModel.baseUrl?: string; cell (a) = formatRecalledContext(outputs); clear as the first statement of the handler. Name the baseline shape."
    },
    {
      "id": "R9-clean-tree-check",
      "severity": "minor",
      "location": "tasks.md 10.1 'Also prove the development-checks delta'",
      "finding": "The check runs `npm install` and expects `git status` to report no changes. At 10.1 the implementer's tree holds the whole uncommitted change.",
      "rationale": "The assertion cannot hold literally. The spec scenario concerns a clean checkout.",
      "concrete_case": "git status after 10.1 lists tasks-created files, so the stated expectation fails even though install changed nothing.",
      "recommendation": "Scope it: record `git status --porcelain` before and after `npm install` and require the diff to be empty, or restrict it to package-lock.json and .gitignore."
    },
    {
      "id": "R10-live-numbers-as-acceptance",
      "severity": "minor",
      "location": "tasks.md 11.1 ('H reading 11,775 and writing 953')",
      "finding": "11.1 states exact live token counts as the pass condition for the openrouter run.",
      "rationale": "These are one run's measurements and vary with model output, so they are not acceptance bounds. The script's assertions are the inequalities.",
      "concrete_case": "A valid run reads 11,880 and fails the literal reading of the task.",
      "recommendation": "Reword to 'all twelve assertions pass; record read_H and write_H against their bounds, as L2 did'."
    }
  ],
  "assumptions": [
    {
      "assumption": "Every src and tests path the tasks mark Modify exists on disk, and every Create path is new (checked: no payload-cache.ts, anthropic-cache-payload.ts, before-provider-request.ts, payload-cache-commit.ts or test-cache-point-live.mjs at the repo root).",
      "status": "verified"
    },
    {
      "assumption": "The cited symbols exist as described: rewriteOf and blockInNewTail in instruments-publisher.ts; netDollars and PricedRequest in savings-dollars.ts; validUsage at calibration.ts:50; createContextStub's model option at fake-pi.ts:63; the 13-registration list in taiknr.test.ts; the BeforeProviderRequestEvent type; pi-ai's sanitizeSurrogates regex at sanitize-unicode.js:21-24; Model.baseUrl.",
      "status": "verified"
    },
    {
      "assumption": "The .gitignore:12 .envrc entry, no .pi/ entry, and AGENTS.md lines 23, 39 and 42 are as cited.",
      "status": "verified"
    },
    {
      "assumption": "The base registration count is thirteen over nine events and becomes fifteen over ten.",
      "status": "verified"
    },
    {
      "assumption": "tsc covers tests/** so required-field ripples break typecheck.",
      "status": "verified"
    },
    {
      "assumption": "The spike's script and L1 driver exist only under .pi/marbleization/.../derek/, and the adapter and handler test bodies were never saved; only the labelled tables in redgreen-derek.md survive.",
      "status": "verified"
    },
    {
      "assumption": "The A1–A28, B1–B6, C1–C5, D1–D2, E1–E9, F1 and G1 red and green results are as redgreen-derek.md reports.",
      "status": "unverified"
    },
    {
      "assumption": "The only existing expectation that changes under D8 is the 'shrunk block on the same carried message' test.",
      "status": "unverified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "Whether base commit d5f8435 exists for the 11.2 git worktree command",
    "README.md:40, :112, :67, ADR 0009 and ARCHITECTURE.md line numbers (docs pass, out of tasks.md scope)",
    "pi runner internals cited in design (runner.js, anthropic-messages.js, cache-warmer.js line numbers)",
    "Whether pi's extension typings for ExtensionContext.model expose baseUrl on the union used by createContextStub",
    "Live behaviour on any route; no model calls were made",
    "specs/** beyond tail-recall, context-figures and development-checks"
  ]
}