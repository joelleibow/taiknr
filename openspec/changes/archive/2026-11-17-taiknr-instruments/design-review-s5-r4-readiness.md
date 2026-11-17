{
  "mode": "review",
  "lens": "council-readiness",
  "paraphrase_proposes": "tasks.md sequences 15 groups for taiknr-instruments. They are: the exact pi-jefferson pin and verbatimModuleSyntax; four domain modules (token estimate, figures, calibration, dollars); the per-session publisher; the holder; a shared fake; the Jefferson declaration and bus adapter; the readings; the config switch; the scorer observer and recall's report; six publishing registrars; the wiring and final re-runs; and Joel's own live look. An Interfaces block fixes every export and signature. A File Boundary lists 15 source files and 15 test files created, plus 15 files modified. Each task names its failing test, boundary cases, red/green label and the scenarios it proves, and a coverage section maps every delta scenario to a task and a test or a recorded review check. Round 3's five fixes are all in the text.",
  "paraphrase_existing": "At abaa6b0 taiknr registers seven handlers. `registerSessionStartHandler` is raw so it can assign the config and hydrate the store, and the other six sit behind `createGatedPi`, which makes them inert unless the session config is active. `registerContextHandler(pi, {config, store, recallCache})` builds `createPiJevScorerAdapter(ctx, config)` per request and appends one `formatRecalledContext` block to the latest user message. `TaiknrConfig` has six fields and `FIELD_RULES` is total over them. `tests/support/fake-pi.ts` has no `events`, projection or throwing hooks. `archive-session.test.ts` runs a real session, with `beforeTaiknr`/`afterTaiknr` extension slots and an isolated agent dir, through a classifier guard.",
  "recommendation": "Ready to implement. I found no blocking or major gap and no owner decision is needed. Three minor wording or precision fixes are optional: a mislabelled file count in the preamble, a negative-token publisher case that is not named, and the point at which the session-level listener must subscribe. I re-checked the live repo against the plan and the paths and symbols hold. The 15 source and 15 test files created and the 15 modified are right. The sorted registration list is 7 at base and 13 after. The `4 *` and `/ 4` hits are only `context.ts:63` and `agent-before-settle.ts:46`. `src` holds no `writeFile`, `appendFile`, `mkdirSync` or `pi-jefferson.json`. `context.test.ts` and the scorer test spread `DEFAULT_TAIKNR_CONFIG`, so only the two named `TaiknrConfig` literals need the new field. The root `buildSessionProjection`, `estimateTokens`, `SessionManager.appendUsage`, `ReadonlySessionManager.buildSessionProjection`, `MessageEndEvent`, `AgentSettledEvent` and `on('agent_settled' | 'message_end')` all exist in pi 1.5.2. `writeClassifierAgentConfig(dir, fields)`, `queueNoopRun`, `latestToolResultEntryId`, `afterTaiknr` and `session.compact()` exist in the test support. The recall block text is exactly `formatRecalledContext(outputs)`, so 12.2's estimate matches the block. D5's \"Written at\" column matches every key set the tasks assert: 17 opening, 14 at response rows (1) and (2), 5 at rows (3) and (4), 6 at request, and 6 at settled, compact and tree.",
  "findings": [
    {
      "id": "RDY4-1",
      "severity": "minor",
      "location": "tasks.md, \"How this plan is executed\", *The end state* bullet",
      "finding": "The bullet says the end state is \"the design's own test file list (30 files created, 15 modified)\". The File Boundary creates 30 files in total: 15 source and 15 test files. It modifies 15 files, of which only 7 are tests. The test files are therefore 22 + 15 = 37, not a count read off \"30 created\". Derek's \"32 files\" is 22 + 10, because the spike merged the six registrar tests into one.",
      "rationale": "Standard §2: the file boundary must be exact. No later task asserts a total, so nothing breaks. A coder checking the finished tree against this sentence would still expect the wrong number of test files.",
      "concrete_case": "The coder counts `tests/**/*.test.ts` after group 14, finds 37, and reads \"30 files created\" as a miss of 7 test files.",
      "recommendation": "Reword to: \"the design's layout: 15 source and 15 test files created, 15 files modified, so 37 test files; the spike's 32 is 22 + 10 because it merged the six registrar tests into one.\""
    },
    {
      "id": "RDY4-2",
      "severity": "minor",
      "location": "tasks.md 6.3 (and the *Every figure is a finite number* / *A recall block larger than the saving* coverage lines)",
      "finding": "The scenarios *A negative figure*, *A recall block larger than the saving* and *A negative total is published as it is* map to 6.3 (and 3.1, 5.1). 3.1 asserts a negative saving in the domain and 5.1 a negative net per request. No named 6.3 case drives a request with a block and no stub savings through the publisher and asserts the sign it posts. `savedTokensRequest` is never named as negative, `savedTokensSinceStart` is never named as falling on a block-only request, and `savedDollarsSinceStart` is never named as going below zero. Row 2 and row 13 would be the natural inputs. 6.3's listed boundary case is only \"two fractional savings that round down\".",
      "rationale": "Standard §3: every scenario needs a test that fails when the behaviour is deleted. A publisher that clamps `Math.max(0, …)` before posting passes every named 6.3 case. It would also keep the since-start sum above zero.",
      "concrete_case": "At k = 0.7 a request carries only a 1,000-token block (saving −1,000 before k). The publisher must post `savedTokensRequest` −700 and lower `savedTokensSinceStart` from, say, 1 to −699, with `savedDollarsRequest` negative. Clamped code posts 0 and leaves the total alone, and no named case notices. The `posted` rounding of a tiny negative saving, such as k = 0.1 times −3, also yields −0 under `Math.round`, which `toBe(0)` rejects.",
      "recommendation": "Add one named 6.3 case: a priced request whose only effect is a recall block larger than its stub saving, asserting a negative `savedTokensRequest`, a falling `savedTokensSinceStart`, a negative `savedDollarsRequest` and `savedDollarsSinceStart`, each on the strict sink. Add that a result of −0 is asserted with `toBeCloseTo(0)` or normalized, never `toBe(0)`."
    },
    {
      "id": "RDY4-3",
      "severity": "minor",
      "location": "tasks.md 14.1 (listener extension), 14.3",
      "finding": "14.1 says the listener is \"an `afterTaiknr` extension recording every `jefferson:registration` and `jefferson:update` in order\". It does not say where the extension subscribes. A coder who subscribes inside a `session_start` handler gets a listener that pi runs after taiknr's `session_start`, so it misses the registration, which taiknr emits during its own handler. Only a subscription in the extension factory body, via `pi.events.on`, sees the whole run. The red-then-green order of 14.1 does not reveal this. The recorded list would simply lack the registration, which reads as a wiring bug.",
      "rationale": "Standard §1: a hidden placement choice for a test fixture. It is local, but it decides whether the tree, compaction and recall cases prove anything about the registration order.",
      "concrete_case": "A listener written as `pi.on(\"session_start\", () => pi.events.on(\"jefferson:update\", …))` as an `afterTaiknr` factory misses taiknr's registration and opening posts, so 14.3's \"one registration\" control reads 0 even though the code is correct.",
      "recommendation": "Add to 14.1: the listener subscribes with `pi.events.on` in its factory body, not in a handler, so it is attached before taiknr's `session_start` emits."
    }
  ],
  "assumptions": [
    {
      "assumption": "Every existing path and symbol the plan cites exists in the working tree: `taiknr.ts` (registrar signatures and order), `handler-gate.ts` (a Proxy that wraps only `on`, so `events` passes through), `context.ts` (its four reachable early returns and `budgetCharacters` at line 63), `pi-jev-scorer-adapter.ts` (`await classify` with `result.usage` readable on the next line), `pi-context-adapter.ts`, `taiknr-config.ts` (six-field `FIELD_RULES` and a layered returned object, so four `jeffersonInstruments` lines), `fake-pi.ts`, `classifier-guard.ts`, `vitest.config.ts` (including `tests/**/*.test.ts`), the two `TaiknrConfig` literals, and the archive-session helpers.",
      "status": "verified"
    },
    {
      "assumption": "pi 1.5.2 exports the types and functions the Interfaces use: `buildSessionProjection` (root, with `leafId`), `estimateTokens`, `ReadonlySessionManager.buildSessionProjection`, `SessionManager.appendUsage`, `MessageEndEvent`, `AgentSettledEvent`, `SessionTreeEvent`, and `on` overloads for all five new events.",
      "status": "verified"
    },
    {
      "assumption": "The key sets the tasks assert (17 opening, 14, 5, 6 request and 6 settled, compact and tree) match D5's \"Written at\" column and D8's response-state table.",
      "status": "verified"
    },
    {
      "assumption": "The recall block is the last content block of the latest user message and its text is `formatRecalledContext(outputs)`, so 12.2's `recalled` expectation matches what recall appends.",
      "status": "verified"
    },
    {
      "assumption": "The measured claims on the settled list hold as recorded: the 328-test baseline, the load recipe and its positive control, the TS2741, TS1484, TS2322 and TS2353 outcomes, the order-swap reds, the discarded-boundary error count, and the 13-entry Proxy test.",
      "status": "unverified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "I had no shell tool and ran no command: not `npm run check`, the load check, any mutation step, or an `rg`. The `rg`-equivalent checks I made were with the grep tool.",
    "I did not install or read pi-jefferson 0.14.0's types. `Registration`, `Report`, variable and `bar` shapes are taken from research-chidi.md.",
    "I did not open pi's runner or session source. Handler order, per-handler catching, `context_with_system` chaining, the discarded-boundary error count and the state of the branch at `message_end` come from the settled list.",
    "I did not re-derive D8's dollar rows this round; round 3 did, and neither the table nor the tasks' dollar text changed since.",
    "I did not read the specs' prose beyond the scenario names and the requirements for figures, flags and since-start. Docs-pass scenarios (the eight documentation scenarios, the README rows) are outside tasks.md by design and I did not check them.",
    "Group 15 (Joel's observation) depends on the docs pass and Joel's own `pi-jefferson.json` rows, which are post-merge hand-offs. I left it as the plan has it: owner-observed tasks are marked Joel's and never ticked by the coder, and earlier rounds did not re-open it."
  ]
}