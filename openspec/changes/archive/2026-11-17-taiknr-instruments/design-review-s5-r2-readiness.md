{
  "mode": "review",
  "lens": "council-readiness",
  "paraphrase_proposes": "tasks.md orders 15 groups: pin pi-jefferson and turn on verbatimModuleSyntax; four domain modules; the per-session publisher; the holder; a shared fake; the Jefferson declaration and bus adapter; the readings; the config switch; recall's observer and block report; six publishing registrars; the wiring; and Joel's live look. An Interfaces block now fixes every export, signature and dependency object. A File Boundary lists 30 created and 15 modified files. Each task names its failing test, boundary cases, redgreen label and the spec scenarios it proves, and the plan says the coder chooses no names.",
  "paraphrase_existing": "At abaa6b0 taiknr registers seven handlers. A gated pi proxy makes six of them inert unless the session config is ready and enabled; session_start stays raw and assigns the config and hydrates the store. registerContextHandler takes {config, store, recallCache} and builds createPiJevScorerAdapter(ctx, config) per request. TaiknrConfig has six fields, and its full-object literals sit in session-config.test.ts and handler-gate.test.ts. tsconfig has no verbatimModuleSyntax. The factory test uses a Proxy that throws on any member but `on`. The session harness in archive-session.test.ts isolates PI_CODING_AGENT_DIR and installs the classifier guard.",
  "recommendation": "Revise before Implement. Round 1's fixes held, and I confirmed the live paths and symbols: the Interfaces block, the 15 + 15 file counts, the 13-entry registration list, the TaiknrConfig literals, `ContextWithSystemEvent`, `MessageEndEvent`, and the root `buildSessionProjection` export. Five decisions or proofs are still missing. (1) The since-start token sum has no stated basis. (2) readPair's \"valid\" predicate cannot be built from `sampleRatio`'s signature. (3) The registration order in taiknr.ts that the design relies on has no test that fails when it is wrong. (4) The publisher's finite-number and per-event key-set contract appears in Interfaces and the design but in no task's test. (5) The compaction/tree/start reset of the rewrite state is untested. Five minor findings are check commands and test harness details left to the coder. None needs an owner decision.",
  "findings": [
    {
      "id": "RDY2-1",
      "severity": "major",
      "location": "tasks.md 6.3 and Interfaces (`posted`); design.md D5 (`savedTokensSinceStart`), D7 Rounding, D8 response-state table row (1); context-figures spec *The cumulative saving counts from the current start*",
      "finding": "Nothing says what `savedTokensSinceStart` is a sum of. D7 says every token field is posted as `Math.round(k × estimate)`. D8 row (1) says \"added to since-start\". The spec says \"the sum of the published requests' savings\". The coder must choose between summing the unrounded `k × saving` and rounding once at post, or summing the posted integers. The two differ by up to 0.5 token per request, and the dollar total has the same shape (a sum of unrounded `netDollars`).",
      "rationale": "Standard §1 requires data shapes to be settled before Implement. 6.3 and 13.3 assert an exact since-start figure, so the choice changes the expected number in the test.",
      "concrete_case": "Two valid responses, each with k × saving = 1.4. Summing the posted integers gives 1 + 1 = 2. Summing the unrounded values gives 2.8, which posts as 3. A 6.3 test written for one rule fails under the other.",
      "recommendation": "State in 6.3 (and in the design's rounding paragraph) that `savedTokensSinceStart` is the running sum of the integers posted as `savedTokensRequest`. That is the spec's literal \"published requests' savings\", and it makes the screen internally consistent. State that the dollar total sums unrounded `netDollars` as D8 says. Add a case of two responses with fractional savings to 6.3."
    },
    {
      "id": "RDY2-2",
      "severity": "major",
      "location": "tasks.md Interfaces (`sampleRatio`, `readPair`) and 10.1; design.md D7 step 1 and step 2",
      "finding": "Under `pi-virtual`, `readPair` must pick \"the newest valid assistant message's pair\" on the branch, and 10.1 tests that error and zero-usage messages are skipped. The only validity function in Interfaces is `sampleRatio(stopReason, usage, estimate)`. D7 step 2 makes \"estimate above 0\" part of validity, and `readPair` has no estimate, because it builds no projection (D7, ruling 18: one getBranch walk). No exported predicate for stopReason and usage validity exists. How `readPair` tests validity is an unmade interface decision in `calibration.ts`.",
      "rationale": "Standard §1: exports and boundary contracts are settled in the plan. A coder has two valid options with different public shapes: add a `validUsage` export, or call `sampleRatio(…, 1)`.",
      "concrete_case": "A coder calls `sampleRatio(stopReason, usage, 0)` for pair selection. It returns `undefined` for every message, so `pair` is `undefined` and k is 1 with the flag on. 10.1's virtual-model case then fails, or the coder reworks `calibration.ts` mid-task.",
      "recommendation": "Add to Interfaces either `validUsage(stopReason: string, usage: UsageCounts): boolean`, which `sampleRatio` also calls, or the line \"`readPair` tests validity as `sampleRatio(stopReason, usage, 1) !== undefined`\". Say which in 4.1 and 10.1."
    },
    {
      "id": "RDY2-3",
      "severity": "major",
      "location": "tasks.md 13.5, 13.6, 14.1, 14.3; design.md D2 (\"each registrar is called immediately after the existing registrar whose outcome it reads\")",
      "finding": "The design requires the compact and tree instruments registrars to run after their hydration registrars. The spec scenario *A compaction or a tree jump re-posts two figures* says \"after that re-hydration\". It also requires the request registrar to run after recall's, so `event.messages` carries the block. Each registrar's unit test fires only its own handler, so none can fail on a wrong order in taiknr.ts. 14.3's session-level test asserts only that the registration precedes the first request and that a settlement's update carries the archive's figures. Nothing makes a swapped order red.",
      "rationale": "Standard §3: a scenario no test proves fails the plan. The ordering is the whole content of the \"after re-hydration\" claim.",
      "concrete_case": "A coder writes `registerInstrumentsTreeHandler` before `registerSessionTreeHandler` in taiknr.ts. The tree jump in archive-session.test.ts (navigate to the tool result's entry, which drops the side-store entry) posts `archiveItems` 1 from the not-yet-hydrated store instead of 0. All 13.x tests, the 13-entry list and the 14.3 assertions stay green.",
      "recommendation": "Extend 14.1's session-level listener test, written before the taiknr.ts edit. After `navigateTree` onto the tool-result entry, assert the last `jefferson:update` for `archiveItems` is 0. In the existing recall session test (probe after taiknr), assert that the request's `recalled` update is above 0 and equals the estimate of the block the after-probe saw, which a request registrar placed before recall cannot satisfy. State in 14.1 that these assertions are what make a swapped order red."
    },
    {
      "id": "RDY2-4",
      "severity": "major",
      "location": "tasks.md Interfaces (last paragraph), 6.1–6.7, 9.1; design.md D3 item 4; scenarios *A figure is never non-finite* and *A field is never undefined or null*",
      "finding": "Interfaces says \"finiteness is the publisher's by construction, and the publisher test asserts it on every posted number\". Design D3 item 4 says \"the publisher test asserts each event's publication carries exactly the fields D5's 'Written at' column gives that event\". No task in 6.1–6.7 or 13.x lists either as an assertion. 9.1's finiteness case builds a Publication by hand, so it proves nothing about what the publisher posts. The scenario is cited to 9.1 and 6.1.",
      "rationale": "Standard §3: every behaviour needs a named failing test that goes red when the behaviour is deleted. `buildFieldReports` deliberately checks nothing, so the publisher test is the only guard against a NaN or Infinity reaching Jefferson. The key-set rule also guards the spec's \"between responses the instrument keeps the last completed pair\".",
      "concrete_case": "`requestBuilt` divides by a pending estimate of 0 (6.2's own boundary case), or posts `savedTokensRequest` at the request event. Every named 6.x case passes, because none asserts finiteness on all posts or the exact keys of an update. NaN reaches Jefferson, which refuses the update with a TUI-only warning.",
      "recommendation": "In 6.1, make the publisher test's recording sink fail on any posted number that is not finite and any `deciding` or `uncalibrated` value that is not boolean, so every case in 6.1–6.7 carries it. Add to 6.2, 6.3, 6.5 and 6.6 an assertion of the exact key set each event posts, per D5's Written-at column. Re-cite *A figure is never non-finite* to 6.1."
    },
    {
      "id": "RDY2-5",
      "severity": "major",
      "location": "tasks.md 6.4, 6.6, 13.5, 13.6; design.md D2 table (compact and tree rows) and D8 \"No baseline\"",
      "finding": "The design states that `session_start`, `session_compact` and `session_tree` clear the pending request and the baseline (stub set, block, `previousLength`). The first request after one has \"nothing pending\" so no rewrite is charged. 6.4's cases, 6.5's, 6.6's and 13.5/13.6's assert nothing about this. 6.4 tests \"no baseline at all\" only as an initial state. The clearing behaviour is not asserted anywhere.",
      "rationale": "Standard §3. This is money-affecting behaviour stated as a decision, and deleting it leaves every named test green.",
      "concrete_case": "`compacted` forgets to clear the baseline. A priced request with new stubs, then `compacted`, then a warm request carrying those stubs is charged a 600-token rewrite (about −$0.01 at row 1's rates) that D8 says must be 0. No listed test sees it.",
      "recommendation": "Add to 6.4: a priced request, then `compacted` / `treeJumped` / a second `sessionStarted`, then a warm request with the same stubs and a rewrite-triggering change, expecting rewriteCharge 0. Also add: a pending request written before `compacted` is not priced at the next response."
    },
    {
      "id": "RDY2-6",
      "severity": "minor",
      "location": "tasks.md 12.1 (Boundary cases)",
      "finding": "12.1 lists \"a result whose usage cost is absent\" as a boundary case. This contradicts the settled finding that `Usage.cost` is required, so an absent cost object is not a case anywhere (pi-ai types.d.ts:306), and 5.1 already says so. `ClassifierResult.usage` is `usage?: Usage`, so only the absence of `usage` is a case.",
      "rationale": "A coder cannot write the case without a cast, and the expected outcome (`finished(undefined)` or a throw on `.cost.total`) is not stated.",
      "concrete_case": "The coder stubs `classify` to resolve `{ usage: {} }`. `result.usage.cost.total` throws a TypeError after the await, which is neither tested nor designed.",
      "recommendation": "Delete the case from 12.1 and keep \"a result with no usage → `finished(undefined)`\"."
    },
    {
      "id": "RDY2-7",
      "severity": "minor",
      "location": "tasks.md 13.2 (and 13.1's use of the shared guard)",
      "finding": "13.2 asserts the pending request is written \"after each of recall's five early returns\", and \"the reading is built from `event.messages`, the list recall's handler returned\". It does not say how the test obtains recall's returned list. The test must register `registerContextHandler` and the request registrar on one fake pi. It must fire the two handlers in registration order, giving the second the first's returned messages, as pi's runner does. Recall's scoring path then needs the classifier guard or a stubbed `classify`.",
      "rationale": "Standard §3: the test boundary should not be invented by the coder, and a test that scores recall must take the shared guard (AGENTS.md trap).",
      "concrete_case": "A coder fires only the request registrar with a hand-built list. The five early returns are then never exercised through recall, and the \"block appended\" case has no real block.",
      "recommendation": "Add to 13.2: \"the test registers `registerContextHandler` (with a no-op holder) and `registerInstrumentsRequestHandler` on one `createFakePi`, through `createGatedPi`. It fires them in order, passes recall's returned messages (or the original list on a bare return) as `event.messages`, and takes the stubbed `classify` and the shared guard from `tests/support/`.\""
    },
    {
      "id": "RDY2-8",
      "severity": "minor",
      "location": "tasks.md 14.4 (load check); design.md and redgreen-derek.md \"A1's probe and the load check\"",
      "finding": "14.4 says to point `PI_CODING_AGENT_DIR` at `$E` \"with a `settings.json` listing that copy under `packages`\". Read literally, the agent dir and the package are the same directory, and the `settings.json` text is not given. Derek's record says only \"`settings.json` listing it under `packages`, `PI_CODING_AGENT_DIR` pointing at that directory\", which is ambiguous too.",
      "rationale": "Standard §3: a check that is relied on to catch a mistake must be reproducible without guessing. A mis-built settings file would let the check pass vacuously. The positive control would still catch that, but only if the coder follows the control.",
      "concrete_case": "The coder writes `{\"packages\":[\".\"]}` into `$E/settings.json`, or lists a relative path. pi loads nothing from the copy, stderr is empty, and the control, run on the same wrong setup, also prints nothing. The coder finds the check unusable and improvises.",
      "recommendation": "Give the literal recipe. For example: `A=$(mktemp -d)`, then write `$A/settings.json` as `{\"packages\":[\"<absolute $E>\"]}`, then run `PI_CODING_AGENT_DIR=$A pi --no-session --help`. Say that `$A` is separate from `$E`. I did not run pi, so I could not confirm the `packages` entry format."
    },
    {
      "id": "RDY2-9",
      "severity": "minor",
      "location": "tasks.md 2.2 and 14.2",
      "finding": "Two review commands cannot do what they claim. (a) 2.2's `rg` for `4 *` and `/ 4` treats `4 *` as a regex (a 4 followed by any number of spaces), which matches every line containing a 4, such as `2147483647`. (b) 14.2 says `git diff abaa6b0 -- src/infra/pi-event-handlers src/infra/adapters …` shows the publishing registrars and new adapters, but these are untracked files and `git diff` omits them until `git add -N` or a commit.",
      "rationale": "Standard §3: a check that cannot fail or cannot see its subject gives no proof.",
      "concrete_case": "At 14.2 the diff lists only context.ts and the scorer adapter. The coder concludes the new registrars are absent from the \"closed list\" check, or never inspects them.",
      "recommendation": "Use `rg -F '4 *'` and `rg -F '/ 4'` in 2.2. In 14.2 run `git add -N src tests` first, or add `git status --short` to the check."
    },
    {
      "id": "RDY2-10",
      "severity": "minor",
      "location": "tasks.md 6.1 and 9.1 (Interfaces: `TAIKNR_FIELDS` `satisfies`, opening typed `FigureValues`)",
      "finding": "The plan relies on the compiler to catch a missing or extra field (TS2741 on the opening `FigureValues` and on `TAIKNR_FIELDS`, TS2353 and TS2322 on the `satisfies` clause). Nothing requires showing the check catching one. Michael measured it once in round 1, but no task carries it.",
      "rationale": "Standard §3: if a task relies on an automated check to catch a mistake, state how it will be shown catching one.",
      "concrete_case": "The coder types the opening publication as `Publication` (Partial) instead of `FigureValues`. A forgotten field then compiles, and the declaration test asserts only the hand-built publication it was given.",
      "recommendation": "Add to 9.1 and 6.1 a one-time mutation step: delete one key from `TAIKNR_FIELDS` and from the opening literal, and see TS2741. Change one value type, and see TS2322. Restore, then re-run `npm run check`."
    }
  ],
  "assumptions": [
    {
      "assumption": "The existing paths and symbols the plan cites exist at the working tree: taiknr.ts, context.ts, handler-gate.ts, session-config.ts, session-start.ts, pi-jev-scorer-adapter.ts, pi-context-adapter.ts, taiknr-config.ts, ports.ts (ArchiveStore getAll/size), fake-pi.ts, classifier-guard.ts, formatRecalledContext, appendRecalledContextToMessages. pi 1.5.2 exports ContextWithSystemEvent, MessageEndEvent, buildSessionProjection (root, with a leafId parameter), estimateTokens, UsageEntry and EventBus.",
      "status": "verified"
    },
    {
      "assumption": "File counts: 15 src plus 15 test files created, and 15 modified (taiknr.ts, context.ts, the scorer adapter, taiknr-config.ts, fake-pi.ts, taiknr.test.ts, taiknr-config.test.ts, session-config.test.ts, handler-gate.test.ts, archive-session.test.ts, context.test.ts, the scorer test, package.json, package-lock.json, tsconfig.json). The 13-entry list sums to 13. context.test.ts and the scorer test spread DEFAULT_TAIKNR_CONFIG, so they need no config edit.",
      "status": "verified"
    },
    {
      "assumption": "The five early returns of recall's handler are: the not-ready gate, no user prompt, no window, a non-positive budget, and no recalled outputs.",
      "status": "verified"
    },
    {
      "assumption": "Recall appends the block as the last content block of the latest user message, converting string content to an array. So `latestUser.tailText` and `latestUser.index` identify the block as D8 uses them.",
      "status": "verified"
    },
    {
      "assumption": "Round 1's settled measurements hold: the 328-test baseline, `git ls-files -z -co` export, TS2206 and TS2741, the bus adapter built in the handler with the 13-entry Proxy test, and the dollar rows.",
      "status": "unverified"
    },
    {
      "assumption": "pi runs one event's handlers in registration order, so placing each instruments registrar after its neighbour is sufficient. This relies on the council's scratch session (ruling 6, ruling 9).",
      "status": "unverified"
    }
  ],
  "owner_questions": [
    {
      "question": "RDY2-1: what is `savedTokensSinceStart` a running sum of?",
      "options": [
        "The integers posted as `savedTokensRequest` (the spec's \"published requests' savings\")",
        "The unrounded `k × saving` per request, rounded once at post"
      ],
      "recommended_option": "The integers posted as `savedTokensRequest` (the spec's \"published requests' savings\")",
      "why": "It matches the spec text and makes the on-screen request and total figures consistent. The other option is the same size and drifts from what the user saw. I pick the first in this review, and Michael can confirm it when he settles the finding."
    }
  ],
  "not_checked": [
    "I had no bash tool, so I ran no command. The 328-test baseline, `verbatimModuleSyntax` over the existing tree and the load check are taken from round 1's measurements.",
    "I did not install or read pi-jefferson 0.14.0's types, so `Registration`, `Report`, the exact report payload and the variable and bar function signatures are unchecked against the package.",
    "I did not re-derive the dollar table or the calibration arithmetic. Round 1 recomputed rows 1, 2, 8, 13–15 and the −$0.05916 retry sequence.",
    "I did not audit research-eleanor.md, owner-rulings.md or the council files beyond what tasks.md and design.md cite.",
    "I did not read specs/extension-packaging/spec.md, specs/tail-recall/spec.md or specs/configuration/spec.md line by line, nor the rest of context-figures/spec.md after the dollar requirement. I checked their scenario headings against the coverage list.",
    "I did not verify pi's handler registration order or per-handler error catching in pi's runner. This is settled by ruling 9's scratch session."
  ]
}