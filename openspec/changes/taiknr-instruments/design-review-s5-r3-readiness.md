{
  "mode": "review",
  "lens": "council-readiness",
  "paraphrase_proposes": "tasks.md sequences 15 groups: the pi-jefferson pin and verbatimModuleSyntax, four domain modules, the per-session publisher, its holder, a shared fake, the Jefferson declaration and bus adapter, the readings, the config switch, the scorer observer, six publishing registrars, the wiring, and Joel's live look. An Interfaces block fixes every export and signature, and a File Boundary lists 30 created and 15 modified files. Each task names its failing test, its boundary cases, its red/green label and the scenarios it proves, and a scenario-coverage section maps every delta scenario to a task and a test or a review check. Round 2's fixes (since-start sum, validUsage, order proofs, key sets, reset cases, load recipe) are all in the text.",
  "paraphrase_existing": "At abaa6b0 taiknr registers seven raw or gated handlers. createGatedPi makes six of them inert unless the session config is ready and enabled, and registerSessionStartHandler stays raw to assign the config and hydrate the store. registerContextHandler takes {config, store, recallCache} and builds createPiJevScorerAdapter(ctx, config) per request. TaiknrConfig has six fields, and two tests hold full-object literals of it. tests/support/fake-pi.ts has no events or projection. archive-session.test.ts runs a real session with an isolated agent dir, a classifier guard and an agent config that points recall at the test provider.",
  "recommendation": "Ready to implement once five small wording fixes land; none needs an owner decision. I confirmed the live repo against the plan: the 22+15 file counts, the 13-entry registration list, `context.ts:63`, `agent-before-settle.ts:46`, `taiknr-config.test.ts:228–241`, the two TaiknrConfig literals, `context.test.ts` and the scorer test spreading DEFAULT_TAIKNR_CONFIG, the root `buildSessionProjection`, `MessageEndEvent`, `ExtensionAPI.events`, `SessionManager.appendUsage`, `formatRecalledContext` and the existing archive-session helpers. I also re-derived D8's rows 1, 2, 7, 8, 13–15 and the −$0.05916 retry. The gaps are: an ambiguous catch granularity in the bus adapter that ruling 11's test depends on, an unspecified rendering for token variables, a tolerance phrase that would let dollar assertions go weak, three review checks that no final group reruns, and a switch-off session test whose config recipe would drop the classifier config.",
  "findings": [
    {
      "id": "RDY3-1",
      "severity": "minor",
      "location": "tasks.md Interfaces (`createJeffersonBusAdapter`), 9.2, 12.2; design.md D9",
      "finding": "The catch granularity is ambiguous. Interfaces says the adapter reads `pi.events` \"only inside each emit, in one try/catch\", and D9 says \"wraps each emit in one try/catch\". Neither says whether a post of several keys has one try around the whole loop or one per emit. 12.2's ruling-11 test needs one try per emit. Under `createFakePi({ emitThrows: true })` the recorder must hold `deciding` true, `decidingItems` 1 and `deciding` false, which is the first post's two reports and the second post's one. 9.2 asserts only that \"an emit that throws leaves its caller intact\", so it does not pin this.",
      "rationale": "Standard §1 (boundary contracts decided before Implement) and §3 (the named test must go red on the wrong shape). A coder who writes one try around the report loop passes 9.2 and fails 12.2 later, in a different group, and has to rework the adapter.",
      "concrete_case": "`started(2)` posts two reports. The fake records `deciding` and throws. With a single try around the loop, `decidingItems` is never emitted or recorded, so 12.2's three-entry recorder assertion fails. 9.2, written first, is green.",
      "recommendation": "State in Interfaces and 9.2 that each `pi.events.emit` has its own try/catch, so a throw on one report never skips the next. Add to 9.2 the case that a two-key post under `emitThrows: true` records both reports and returns normally."
    },
    {
      "id": "RDY3-2",
      "severity": "minor",
      "location": "design.md D5 (Variables bullets); tasks.md 9.1",
      "finding": "D5 and 9.1 fix the rendering of `approx`, `bar`, the dollar variables (four decimals), `deciding` and `decidingItems`. They say nothing about how the other numeric variables (`$totalContext`, `$contextWindow`, `$contextInTurn`, `$historyBefore`, `$withheld`, `$stubbed`, `$recalled`, `$archiveItems`, `$archiveWithheld`, `$archiveStubbed`, `$savedTokensRequest`, `$savedTokensSinceStart`) become the `string | undefined` a Jefferson variable must return. The same gap covers a field with no reading yet. No 9.1 assertion pins either.",
      "rationale": "Standard §1: a data shape the coder must invent. The choice shows on screen in Joel's acceptance look. `toLocaleString()` is locale-dependent, and a compact `12.3k` form loses the integer the identity is checked against. Nothing in the test list would catch any of these.",
      "concrete_case": "One coder renders `String(value)`, giving `ctx 123456/200000`. Another renders `value.toLocaleString()`, giving `123,456` or `123.456` by locale. Both pass every 9.1 case as written.",
      "recommendation": "Add one line to D5 and 9.1: each token, count and window variable renders the posted integer as `String(value)`, and returns `undefined` when the readings carry no value for it. Add a 9.1 assertion that `$totalContext` renders `\"123456\"` for 123456 and `undefined` for an absent reading."
    },
    {
      "id": "RDY3-3",
      "severity": "minor",
      "location": "tasks.md 5.1 (\"each with its expected output to the cent\"); design.md D8 table",
      "finding": "5.1 says each dollar row is asserted \"to the cent\", but D8's expected values carry 5 decimals (−$0.00311, −$0.01931, −$0.05916) and the rows differ at the third and fourth decimal. The comparison and tolerance are not stated. Floating-point sums such as 4,960 × 1.50/M − 600 × 17.25/M − 0.0002 will not satisfy `toBe`.",
      "rationale": "Standard §3: assertions must fail when the behaviour is deleted. A coder following \"to the cent\" literally writes `toBeCloseTo(x, 2)`, which passes for any difference under 0.005.",
      "concrete_case": "Row 14 expects −$0.00450. With `toBeCloseTo(-0.0045, 2)` a `netDollars` of 0, from a deleted recall pricing, still passes, because the difference is 0.0045 < 0.005. Row 1 and row 15 weaken the same way.",
      "recommendation": "Replace \"to the cent\" in 5.1 with \"`toBeCloseTo(expected, 6)` against the table's value, with row 8's expected taken as −0.0193125 (exact), never a two-decimal tolerance\"."
    },
    {
      "id": "RDY3-4",
      "severity": "minor",
      "location": "tasks.md 14.2, 14.4, 14.5 and Scenario coverage (the `rg` checks in 2.2, 9.1 and 13.1)",
      "finding": "Three `rg` review checks are run in groups 2, 9 and 13 and then cited as proof in Scenario coverage, but no final-group task reruns them. They are: 2.2's fixed-string drift check (`rg -nF '4 *'` and `rg -nF '/ 4'` over `src` must hit exactly three places), 9.1's check that every `pi-jefferson` import carries `type`, and 13.1's `rg jeffersonInstruments src/` one-reader check. 14.2 reruns only the domain and use-case boundary `rg`. 14.5 reruns \"the suites of groups 3–13\" and lists the dollar, calibration, response-state and identity tables, which are tests.",
      "rationale": "Standard §4: a check a later task can change runs again after that task, and the last group reruns every scenario's proof. Groups 3–14 add comments and code to `src/`, and any of them can add a hit.",
      "concrete_case": "A comment in `src/domain/context-figures.ts` reading \"chars / 4, as token-estimate does\" adds a third `/ 4` hit after 2.2 was ticked. 14.5 reruns only tests, so it goes unseen. Likewise a later reading helper that mentions `jeffersonInstruments`.",
      "recommendation": "Add to 14.2 or 14.5 a line that reruns the three `rg` checks verbatim against the finished tree, with their expected hit lists, and cite them in the *The same estimator on both sides*, *One reader* and *What stops a value import* coverage lines."
    },
    {
      "id": "RDY3-5",
      "severity": "minor",
      "location": "tasks.md 14.3 (switch-off session case)",
      "finding": "14.3 says the switch-off case uses \"an isolated `PI_CODING_AGENT_DIR` whose `pi-taiknr.json` is `{\"jeffersonInstruments\":false}`\". The existing archive-session harness already writes the agent `pi-taiknr.json` in `beforeEach` through `writeClassifierAgentConfig`, which points recall at the test provider and model. Read literally, the new file replaces it. The case is also written after 14.1's wiring, so it has no red against the base, and the plan does not say how it is shown able to fail.",
      "rationale": "Standard §3: a check that cannot fail gives no proof, and the plan should name the fixture. Overwriting the file drops the classifier config. Recall then resolves the default openrouter model instead of the test provider, so the session runs a different recall path than every other case in the file. The fetch stub still keeps it off the network, which hides the drift.",
      "concrete_case": "A coder runs `writeFileSync(join(agentDirectory, CONFIG_FILE_NAME), '{\"jeffersonInstruments\":false}')`. Recall now hits the catalog-miss notice, `errors` or notifications differ from the on-case, and the \"nothing crossed the bus\" assertion is true even if the registrar ignores the switch, because no instrument would have posted anyway on that failing path.",
      "recommendation": "Say: `writeClassifierAgentConfig(agentDirectory, { jeffersonInstruments: false })`, run through the same `queueToolRun` flow as 14.1's on-cases. State the control: the same flow with the switch on records at least one `jefferson:registration`, and one mutation, with the session-start registrar ignoring the switch, turns the off-case red."
    }
  ],
  "assumptions": [
    {
      "assumption": "Every existing path and symbol the plan cites exists at the working tree: taiknr.ts, context.ts (budget at line 63), agent-before-settle.ts:46, handler-gate.ts, session-start.ts, pi-jev-scorer-adapter.ts, pi-context-adapter.ts, taiknr-config.ts, fake-pi.ts, classifier-guard.ts, the two TaiknrConfig literals at session-config.test.ts:9 and handler-gate.test.ts:8, the 'known fields' test at taiknr-config.test.ts:228–241, and the archive-session helpers. pi 1.5.2 exports MessageEndEvent, ContextWithSystemEvent, buildSessionProjection (root, with leafId), estimateTokens and SessionManager.appendUsage, and ExtensionAPI.events exists.",
      "status": "verified"
    },
    {
      "assumption": "The file counts hold: 15 src plus 15 test files created, 15 modified, and the sorted registration list is 13 entries. context.test.ts and the scorer test spread DEFAULT_TAIKNR_CONFIG, so they need no literal edit. biome.json includes package.json and tsconfig.json, and `src` has no `console` call and no write or mkdir call.",
      "status": "verified"
    },
    {
      "assumption": "D8's rows 1, 2, 7, 8, 13, 14, 15, the blended write rate in row 8, and the −$0.05916 retry sequence recompute to the stated values.",
      "status": "verified"
    },
    {
      "assumption": "pi runs one event's handlers in registration order and catches each handler's throw separately, and a bus emit throws only on a stale context. Taken from the council's scratch session and the settled list, not re-measured.",
      "status": "unverified"
    },
    {
      "assumption": "The measured claims in the settled list (baseline of 328 tests, the load recipe, TS2741 and TS1484 outcomes, the order-swap reds, the 13-entry Proxy test) hold as recorded.",
      "status": "unverified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "I had no bash tool, so I ran no command: not `npm run check`, not the load check, not any mutation. Every measurement is taken from the settled list.",
    "I did not install or read pi-jefferson 0.14.0's types. The `Registration`, `Report` and variable signatures are taken from research-chidi.md, and the `satisfies` and TS2741/TS2322/TS2353 behaviour from earlier rounds.",
    "I did not open pi's runner or session source. Handler order, per-handler catching, `context_with_system` chaining and the response-time branch state are taken from the settled findings and the council's evidence.",
    "I did not read council.md, the council lens reports, owner-rulings.md or research-eleanor.md line by line. I read proposal-level material only where tasks.md or design.md cited it.",
    "I did not check the docs-pass items (README, ARCHITECTURE, AGENTS, ADRs). They are outside tasks.md by design.",
    "I did not exercise the `-0` edge: `Math.round` of a small negative product posts -0, which `toBe(0)` or `toEqual(0)` in a test would reject. A coder will meet it only if a case lands a saving between −0.5 and 0, and I judged it a local test choice."
  ]
}