{
  "mode": "review",
  "lens": "council-readiness",
  "paraphrase_proposes": "The change adds a `before_provider_request` payload edit that places a cache point before recall's block and a carry point on the previous recalling turn's carrier. It keeps a per-session `PayloadCacheState` with `recallBlock`, `carrier`, `nextCarrier` and `applied`. `carrier` is committed by a new `message_end` handler only at a valid assistant response. The dollar rule moves with it: D7 starts the rewrite after the carrier through `carrierRead`, and D8 prices the block by `applied.block` carried as `blockUncached`. tasks.md (revised after round 1) orders this into groups 1–10: adapter, request handler, commit handler, context cell, figures and readings, composition, the live script, a full re-run, Derek's live runs, and Joel's live routes. Each group is meant to land its own tests and typecheck.",
  "paraphrase_existing": "Today taiknr registers 13 gated handlers over 9 events and never edits the provider payload. The context handler appends recall's block and calls `reportRecalled`. The publisher's `rewriteOf` starts the rewrite at `carried.index` and prices the block at read or write from `blockInNewTail` alone. `PricedRequest` has no `blockUncached`. `ResponseReadings` is an alias of `CompactedReadings`. `registerInstrumentsResponseHandler(pi, holder)` takes two parameters. tsc covers `src` and `tests`, so every required-field change ripples to test fixtures. Base is 37 test files, which I counted on disk.",
  "recommendation": "Not ready, but close. Round 1's blocker (type ripples across groups) is fixed: 4.1 and 5.1 now carry their construction sites, and the 4.1 and 5.1 sites I checked on disk match. The 4.1/5.1 ripples are closed; the ordering inside group 5 is not. The unfixed findings are three majors and six minors.\n\nMajors:\n- 5.2's E1 and E2 expected values cannot go green until 5.3's D8 lands, because their numbers include the write-rate block charge.\n- D1's `anthropic/` prefix check has no uncovered test row, so the Gemini-through-OpenRouter scenario is mapped to a row that does not exist.\n- 8.1's `git status --porcelain > before` check writes files into the tree, so its own diff can never be empty.\n\nThe minors are small test-gap and citation fixes, listed below. None needs an owner decision.",
  "findings": [
    {
      "id": "R2-ORDER-5.2-needs-5.3",
      "severity": "major",
      "location": "tasks.md 5.2 (E1, E2) and 5.3 (E3; D8); redgreen-derek.md §4 E1/E2/E3 rows",
      "finding": "5.2 names E1 and E2 as green at the end of the task, but their expected values include D8's block write-rate charge, which lands in 5.3. After 5.2 alone, E1 and E2 stay red. M2 ('turns E1 and only E1 red') is also unreachable at 5.2. The group breaks its own 'each task leaves the suite green' rule.",
      "rationale": "I recomputed the red and green numbers against the fixtures' rates (READ 1.5e-6, WRITE 18.75e-6, k=1). E1's base figure −0.0012285 is −0.7×20×READ − 0.7×100×(WRITE−READ), that is, a read-rate block plus a 100-token suffix. E1's green figure −0.0002625 is −0.7×20×WRITE with a zero suffix, so it needs both D7 (suffix 0) and D8 (changed-in-place block at the write rate). E2's red and green figures (−0.0012285 against −0.00147) are character-for-character E3's. Their difference is exactly 0.7×20×(WRITE−READ), the D8 block-rate change, so E2's expected value needs D8 too. In 5.2-only code the block rate is `blockInNewTail` alone, and a block at index 0 on a carried message is a read.",
      "concrete_case": "The coder finishes 5.2 (D7 only) and runs the named command `npx vitest run tests/use-cases/instruments-publisher.test.ts`. E1 gets −0.0000210 against an expected −0.0002625, and E2 gets −0.0012285 against an expected −0.00147. Both stay red until 5.3's rate rule exists.",
      "recommendation": "Swap the order: make 5.3 (D8 and `blockUncached`) the first publisher/domain task and 5.2 (D7's start) the second. Then E1 and E2 are green exactly when 5.2 lands, E2 passes at 5.2 as a D7 guard, and M2 can be run. Or merge 5.2 and 5.3 into one task. Either way, state E1's and E2's expected numbers against the post-D8 baseline."
    },
    {
      "id": "R2-D1-PREFIX-NOT-TESTED",
      "severity": "major",
      "location": "tasks.md 1.1 'Uncovered rows' and Scenario Coverage row 'Gemini through OpenRouter keeps today's payload'; design D1; spec tail-recall 'Only routes the predicate covers change'",
      "finding": "1.1's uncovered rows contain no `openrouter` + `anthropic-messages` row whose model id does not begin `anthropic/`. D1's `anthropic/` prefix clause therefore has no test on its false side. The coverage table maps 'Gemini through OpenRouter keeps today's payload' to 'A1 (no covered row)', which proves nothing when no such row exists. The only OpenRouter uncovered row is `openai-completions`, with an unspecified id.",
      "rationale": "Q3(a) ('measured routes only') is a binding owner ruling, and the prefix clause is the only thing keeping non-Anthropic OpenRouter models on `anthropic-messages` out of the edit. A scenario no test proves fails the plan.",
      "concrete_case": "A coder writes `provider === 'openrouter' && api === 'anthropic-messages'` and drops the prefix test. Every listed A1 row still passes, because no row is openrouter + anthropic-messages + `google/gemini-…`. A Gemini request through OpenRouter then gets Anthropic-shaped markers edited.",
      "recommendation": "Add to 1.1's uncovered rows: `openrouter` / `anthropic-messages` / model id `google/gemini-2.5-pro` (any non-`anthropic/` id) expecting false. State the `openai-completions` row's id as `anthropic/…`, so it fails on api alone. Re-point the Gemini scenario at the new row."
    },
    {
      "id": "R2-CLEAN-TREE-CHECK-SELF-DIRTIES",
      "severity": "major",
      "location": "tasks.md 8.1 'Also prove the development-checks delta' (`git status --porcelain > before` … `diff before after` is empty)",
      "finding": "The shell creates `before` and `after` in the repository root before `git status` runs. The `before` listing then contains `?? before`, and the `after` listing contains `?? before` and `?? after`. `diff before after` is therefore non-empty whatever `npm install` does, so the check as written cannot pass.",
      "rationale": "Round 1 (R9) fixed the 'tree is dirty with the change' problem by using a before/after diff, but the redirect target makes the diff itself dirty.",
      "concrete_case": "At 8.1 the coder runs `git status --porcelain > before`, then `npm install`, then `git status --porcelain > after`. `diff before after` prints `> ?? after`, so the stated expectation 'empty' fails with a clean install. The coder must improvise a fix, and the plan's 'tree stays clean' proof is unreliable.",
      "recommendation": "Redirect to a path outside the repository, for example `B=$(mktemp); A=$(mktemp); git status --porcelain > \"$B\"; npm install; git status --porcelain > \"$A\"; diff \"$B\" \"$A\"`. Or compare `git status --porcelain | sort | md5sum` before and after. Keep the expectation 'empty diff'."
    },
    {
      "id": "R2-ADAPTER-NO-CATCH-UNTESTED",
      "severity": "minor",
      "location": "tasks.md 1.2 'editPayload catches nothing', 2.2 (B1, M1)",
      "finding": "1.2 says `editPayload` must not catch a `structuredClone` failure, but no adapter-level test asserts it throws. B1 passes in both shapes. If `editPayload` swallowed the failure and returned `{ output: undefined, nextCarrier: carrier, applied: null }`, B1's assertions would still hold: the handler returns undefined, `applied` is null, `nextCarrier` equals `carrier`, and `carrier` is unchanged. M1 would also survive, because the handler's `catch` would never run.",
      "rationale": "The task's own boundary 'the handler's catch is the single fail-open path' is enforced by nothing. A mutation that moves the catch into the adapter survives the whole suite.",
      "concrete_case": "A coder wraps the clone in `try { structuredClone(...) } catch { return untouched }` inside `editPayload`, following the older 'never throws' habit. B1 stays green, M1 is no longer caught, and the 'handler never throws out' contract has no test of its own catch.",
      "recommendation": "Add one adapter label to 1.2: `expect(() => editPayload(payloadWithFunctionValue, coveredModel, null, null)).toThrow()`. The untouched cases (uncovered route, non-object, no `messages` array) must not throw. Then M1 provably catches the handler's own catch."
    },
    {
      "id": "R2-NOTHING-RECALLED-SCENARIO-PROOF",
      "severity": "minor",
      "location": "tasks.md Scenario Coverage, tail-recall 'Nothing recalled and nothing handed off' → A2 (pin), A6",
      "finding": "The scenario is a covered three-point route, no block, and no previous carrier, expecting a byte-identical payload (output undefined). A2 covers uncovered routes, a non-object payload, or a payload with no `messages`. A6 has a record present whose index holds a different last block. Neither is the scenario. No named label exercises cell (a) null and record null on an API-key payload.",
      "rationale": "This is the S1 byte-identical promise, the most common request shape. 'Boundary: the record null' appears only as a bullet with no assertion label.",
      "concrete_case": "A mutation that makes the adapter return a clone with a re-serialised marker, or place a stray point, when `recallBlock` is null and `carrier` is null passes A2 (uncovered or no messages) and A6 (record set).",
      "recommendation": "Name one label for it, in 1.2 or as a new A-label: an API-key payload with three markers, `recallBlock` null and `carrier` null, expecting `output` undefined, `nextCarrier` null and `applied` null. Re-map the scenario to it."
    },
    {
      "id": "R2-LIVE-PRECONDITION-EDIT-UNPROVEN",
      "severity": "minor",
      "location": "tasks.md 7.1 (widened turn-2/3 precondition at `:174-178`), L1",
      "finding": "7.1 copies the spike's script byte for byte except for one edit: the precondition now covers `[...turn2, ...turn3]`. L1 judges only the carry assertion, and the probe logs fail the turn-1 preconditions by construction. Nothing is shown catching a mistake in the edited precondition: a turn 3 with no block, or the edit left as turn 2 alone.",
      "rationale": "The standard requires that a fixture or check relied on to catch a mistake be shown catching one. The spike's red/green evidence (L2–L5) ran the unedited script, so the edited line is the only unevidenced change in the shipped file.",
      "concrete_case": "The coder widens the precondition but the check is written as `turn2.every(...) && turn3.every(...)` over an empty `turn3`. `every` on an empty array is true, so a turn 3 that never ran passes vacuously. Nothing in 7.1 would notice.",
      "recommendation": "Add one offline check to 7.1 using the existing driver: replay a log where turn 3's requests carry no block and assert the new precondition prints a failure (exit 3 path). Also state that `[...turn2, ...turn3]` must be non-empty on the turn-3 side, since the existing 'there is a turn after turn 2' precondition already guards it."
    },
    {
      "id": "R2-WORKTREE-NO-NPM-CI",
      "severity": "minor",
      "location": "tasks.md 9.2; redgreen-derek.md 'How the spike ran' (base worktree with `npm ci` inside it)",
      "finding": "9.2's `git worktree add --detach … d5f8435` then immediate live run omits the `npm ci` the spike's base worktree had. The red evidence (L3, L5) was measured with dependencies installed in the worktree. The plan reproduces the procedure without that step, so whether the base extension loads from a node_modules-less worktree is unevidenced.",
      "rationale": "taiknr's `session-start.ts` imports runtime values (`CONFIG_DIR_NAME`, `getAgentDir`) from `@earendil-works/pi-coding-agent`. The extension loader may or may not alias them. A failed load produces an exit that looks like a red result but fails for the wrong reason, which spoils the discrimination step.",
      "concrete_case": "The worktree has no `node_modules`. If pi's loader does not alias the package for an extension outside the repository, the base run fails to start, the table prints nothing, and 9.2 cannot show 'seven assertions failing'.",
      "recommendation": "Add `npm ci` (or a symlink to the repository's `node_modules`) inside the worktree before the run, matching the spike. Record it in 9.2's command list."
    },
    {
      "id": "R2-LINE-REF-AND-PRICEDREQUEST-SOURCE",
      "severity": "minor",
      "location": "tasks.md 5.3 ('At `src/use-cases/instruments-publisher.ts:276`, `responseReceived` assigns {...}')",
      "finding": "Line 276 is the `netDollars(...)` call. `baseline = request.candidate;` is at line 288 (grep on disk). 5.3 also never says where `PricedRequest.blockUncached` gets its value at the `netDollars` call. It states only the baseline assignment's value. That value, `readings.applied?.block === 'uncached'` for this request, is in design §5.4, not in the task.",
      "rationale": "Both are tiny, but the coder otherwise infers which line to edit, and which value feeds the pricing call, from a note that conflates the two.",
      "concrete_case": "The coder passes `blockUncached: baseline?.blockUncached` into `netDollars` (the previous request's value) instead of this request's `applied`. E4 and E7 may still pass, but the block of the request that just went out is mispriced.",
      "recommendation": "Fix the cite: the `netDollars` argument literal near :276 gets `blockUncached: readings.applied?.block === \"uncached\"`, and `baseline = …` at :288 stores the same value. Write the two uses in 5.3 explicitly."
    },
    {
      "id": "R2-LIFETIME-SCENARIO-UNOWNED",
      "severity": "minor",
      "location": "tasks.md Scenario Coverage 'A turn longer than the entry's remaining lifetime'; Residuals 5",
      "finding": "The scenario's THEN is a 7.5-minute billing outcome (read 8,138, written 3,850). The plan states it is probe-measured (N2) and not re-run, and the shape half is proven by A8 and the in-turn test. No automated test observes it, and it is not marked as Joel's. The standard fails a scenario no test proves unless it is marked Joel's to observe.",
      "rationale": "The plan records the gap honestly in Residuals. Because it is neither tested nor owned, the Validate gate has no owner for it.",
      "concrete_case": "At 8.2 the coder walks the table and finds a row whose label cannot be run. Nothing says whether a red N2 re-run is a finding, a skip or Joel's.",
      "recommendation": "Mark the billing half explicitly as an accepted residual in the table with the owner (Michael or Joel, per the standing churn rule) and a sentence saying 8.2 does not re-run it. Or add it to Joel's tasks (10.x) as a long-turn observation."
    }
  ],
  "assumptions": [
    {
      "assumption": "Every Modify path in the File Boundary exists on disk; every Create path is new; src/app/extension/taiknr.ts has registerContextHandler at :57, registerInstrumentsResponseHandler at :59 and recallCache at :33; instruments-response.test.ts :80/:191/:215, context.test.ts :112, instruments-request.test.ts :109, fake-pi.ts :63 and the publisher test's contextReading helper at :166 are as cited.",
      "status": "verified"
    },
    {
      "assumption": "Base has 37 test files on disk and `.gitignore` line 12 is `.envrc` with no `.pi` entry. `package-lock.json` exists. The 13 registrations over 9 events in taiknr.test.ts become 15 over 10.",
      "status": "verified"
    },
    {
      "assumption": "The spike assets 7.1 and L1 rely on exist and match the tasks' line citations: `.pi/marbleization/cache-point-before-recall/derek/test-cache-point-live.mjs.txt` (exports `evaluate`, `report`, `parseObserverLog`; the `realpathSync` guard; the turn-2 precondition at :174-178; `H.blockChars === 0` guards at :210 and :216), the L1 driver `live-assertions-offline.mjs` (reads `michael/` logs relative to cwd), and `michael/long-added.log` and `long-carry.log`.",
      "status": "verified"
    },
    {
      "assumption": "The named existing pin tests (publisher: 'two calls before one valid response…', 'an absent, non-finite or negative cost…', 'a block larger than the stub saving…', 'a valid response makes its pair live…', 'an invalid response consumes…'; savings-dollars rows and the 'non-finite or negative falls back' test) all exist with those exact names.",
      "status": "verified"
    },
    {
      "assumption": "The session-start pin's helpers (`agentConfigFile`, `createSessionConfig` import, `register`, `startSession`, `readyConfig`, `workDirectory`) exist in session-start.test.ts with the shapes the snippet uses.",
      "status": "verified"
    },
    {
      "assumption": "E1's and E2's red and green values include D8's write-rate block charge. This follows from my own arithmetic on the fixture rates (k=1), and from E2's and E3's identical strings in redgreen-derek.md §4. I did not execute the spike's tests.",
      "status": "verified"
    },
    {
      "assumption": "The labelled red/green results (A1–A28, B1–B6, C1–C5, D1–D2, E1–E9, F1, G1, L1–L5) are as redgreen-derek.md reports. The spike's test bodies were not saved, so I could not re-derive them beyond E1–E3.",
      "status": "unverified"
    },
    {
      "assumption": "pi's extension loader resolves `@earendil-works/pi-coding-agent` for an extension loaded from a node_modules-less base worktree (see R2-WORKTREE-NO-NPM-CI).",
      "status": "unverified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "Whether the commit labelled `d21c80b` in 8.1 (base's 37 files) and the base `d5f8435` in 9.2 are the same tree. I confirmed only that 37 test files are on disk now, and that redgreen-derek.md reports 40 files and 596 tests with the three new files added.",
    "pi runtime internals the design cites by line (runner.js, anthropic-messages.js, cache-warmer.js, sdk.js, agent-session.js, docs/extensions.md) and Joel's external extension file; those belong to other lenses.",
    "README.md, ADR 0009 and ARCHITECTURE.md/AGENTS.md line numbers (docs pass, excluded from tasks.md by rule).",
    "Live behaviour on any route and whether `npm run check` passes; no commands or model calls were run.",
    "design-review.md and research-*.md contents beyond a keyword scan, and specs/** beyond the three delta spec files already read."
  ]
}