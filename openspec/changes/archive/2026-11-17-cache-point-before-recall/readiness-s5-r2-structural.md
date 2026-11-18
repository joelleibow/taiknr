{
  "mode": "review",
  "lens": "council-structural",
  "paraphrase_proposes": "The plan creates a pure Anthropic payload adapter (`coversRoute` + `editPayload`), two thin gated handlers (`before_provider_request` and a `message_end` commit), and a four-field per-session state, to place a before-point ahead of recall's block and a one-hop carry on the prior carrier inside a four-marker budget, with one OAuth carve-out. It widens `PricedRequest.blockUncached` and `ResponseReadings.applied` so the publisher moves the rewrite start (D7) and the block's rate (D8) from the applied edit, not the intent. Every scenario is proven by a labelled red/green check from the spike, a committed live script over four routes (two of them Joel's to observe), and a final re-run group; Markdown updates are excluded to Bambadjan's docs pass.",
  "paraphrase_existing": "Today recall appends a `<recalled_context` block to the newest user message at `context_with_system`, and pi places its message cache marker on that block, so a request carrying the block makes the provider rewrite the turn's prefix instead of reading the earlier entry. The publisher prices a warm-request rewrite suffix from the changed message (`rewriteOf` in `instruments-publisher.ts`, `netDollars` in `savings-dollars.ts`), with the block charged `warm && !blockInNewTail ? read : write`. Thirteen handler registrations over nine events sit behind a config gate in `taiknr.ts`'s factory, and the `message_end` registrar hands the publisher deferred readings via `readResponse`.",
  "recommendation": "Pass — implementation-ready. All five round-1 structural findings landed exactly as Michael adjudicated: the required-field widenings now land with their construction sites (4.1 absorbs `taiknr.ts:57`, 5.1 absorbs `taiknr.ts:59` and `readResponse`→`CompactedReadings`, 5.3 absorbs the `blockUncached` domain and publisher sites), and the group-green invariant holds on Michael's measured cumulative order (tsc 0 errors at every step, 543/543 green). The File Boundary verifies against the live tree down to line numbers, scenario coverage is complete across all three delta specs with Joel-only and docs-pass rows correctly marked, and claims are calibrated to the spike's measured labels. One minor finding: task 5.1's `45 sites` count does not match the log it cites (42 lines); correct it in passing, it blocks nothing.",
  "findings": [
    {
      "id": "S5R2-STRUCT-1",
      "severity": "minor",
      "location": "tasks.md task 5.1 (the readings task), citing `.pi/marbleization/cache-point-before-recall/michael/s5-type-ripples.log` section (c); live file tests/use-cases/instruments-publisher.test.ts",
      "finding": "Task 5.1 cites `s5-type-ripples.log` (c) as `45 sites` for the publisher test's inline readings, but the log's (c) section lists 42 distinct lines in `tests/use-cases/instruments-publisher.test.ts`, and the live file has exactly 42 `responseReceived` call sites (the `contextReading` helper at :166 is covered by its own separate clause). Michael's s5-r1 resolution says `:302 and 44 further sites`, which also does not match the log's 42 lines; the 45 may be tsc's raw error count (some lines producing two errors) rather than a site count.",
      "rationale": "implementation-readiness-standard.md §2 requires enumeration to match verified evidence, and feature-spec-standard.md §6 requires every stated count to match its cited artifact. The operative instruction (`every inline reading tsc names there`) is complete and 5.1's own `npm run typecheck` enforces it mechanically, so nothing can go out wrong — but a coder cross-checking the citation against the log finds three sites missing and must decide whether to hunt for them, an enumeration question the plan should have settled.",
      "concrete_case": "A coder executes 5.1, edits the 42 sites the log names plus the :166 helper, then re-reads the task, counts `45 sites`, and re-opens the log expecting three more lines — or edits fixture lines tsc did not name, touching tests the plan did not authorise.",
      "recommendation": "Drop the count from 5.1's sentence, or restate it as `the 42 call sites the log names plus the :166 helper`; if 45 is tsc's raw error count, say `45 tsc errors over 42 sites` so the number matches its artifact."
    }
  ],
  "assumptions": [
    {
      "assumption": "Every File Boundary path, line number and symbol checks out against the live tree: `taiknr.ts:57`/`:59` call sites, `context.test.ts:112` and `instruments-request.test.ts:109`/`:191` deps and reading sites, `instruments-compact.test.ts:63`, `instruments-tree.test.ts:77`, `instruments-response.test.ts:80`/`:191`/`:215`, `fake-pi.ts:63` (model option without baseUrl today), `savings-dollars.test.ts:20` (`request()` helper, `MICRO`, `netDollars`, `responseRates`, `UsageCounts`, `CostCounts` all present as named in the split-test snippet), `contextReading` at publisher-test `:166` with 42 `responseReceived` call sites, `validUsage` at `calibration.ts:50`, `formatRecalledContext` at `pi-context-adapter.ts:42`, `readResponse` in `pi-instrument-readings.ts` returning `ResponseReadings` today, `registerInstrumentsResponseHandler(pi, holder)` two-parameter form, and `taiknr.test.ts:5` pinning thirteen registrations. The four new src paths and three new test paths do not exist, as the boundary says.",
      "status": "verified"
    },
    {
      "assumption": "Every cited evidence artifact exists: `derek/test-cache-point-live.mjs.txt` (exports `evaluate` :155, `report` :244, `parseObserverLog` :271; turn-2 precondition at :174-178; `realpathSync` main guard), `derek/live-assertions-offline.mjs`, `michael/long-added.log`, `michael/long-carry.log`, `michael/s5-type-ripples.log`, `michael/s5-session-start.test.ts`, `michael/s5-savings-dollars.test.ts`, `michael/ttl-carry-h55.log`, `derek/live-runs.md`.",
      "status": "verified"
    },
    {
      "assumption": "Both cited base commits exist: repository HEAD is `d21c80b` (the commit 8.1's base counts of 37 files / 543 tests were measured at) and `d5f8435` (the red/green and 9.2 worktree base) is present in the object store. `package.json` `check` is `lint && typecheck && test`.",
      "status": "verified"
    },
    {
      "assumption": "All five round-1 structural findings (S5R1-STRUCT-1 through -5) landed in tasks.md exactly as Michael's binding `michael-s5-r1.json` resolutions require: the regrouped order with each required field landing in the same task as its construction sites, the `editPayload`-catches-nothing preamble and 1.1/1.2 error-behaviour wording, `coversRoute(model: RouteModel | undefined): boolean` with optional `baseUrl` and `editPayload` owning §5.3 (3)'s shape checks, cell (a) cleared as the context handler's first statement set to `formatRecalledContext(outputs)`, the baseline as `RequestCandidate & { blockUncached }` assigned at `responseReceived` with `requestBuilt` not setting it, File Boundary rows naming sites and tasks with `payloadCache` (not Gap 8's `payload`), the split test and the named pins, the session-start pin, the byte-for-byte live-script copy with the single widened precondition, the scoped development-checks proof, the rewritten Residual 1, and the corrected count clause.",
      "status": "verified"
    },
    {
      "assumption": "Scenario Coverage is complete: every scenario in all three delta specs (`tail-recall` 11+9+13+5+3+3 rows, `context-figures` 4+8+5 rows, `development-checks` 4 rows) has a row naming its task and proof; Joel-only rows (10.1, 10.2) are marked as never ticked by the implementer, docs rows are marked `docs pass` and excluded from tasks per the standard, and no scenario is left unproven.",
      "status": "verified"
    },
    {
      "assumption": "The split test's arithmetic holds as written: at Opus 5.5 catalogue prices both the poisoned (35,731/139,169) and fixed (168,585/6,315) splits net −0.0228518 ≈ −0.02285 under today's rule, recomputed independently this round.",
      "status": "verified"
    },
    {
      "assumption": "redgreen-derek.md's labels (A1–A28, B1–B6, C1–C5, D1–D2, E1–E9, F1, G1, L1–L5), mutations M1–M5, and Michael's cumulative regroup measurement (tsc 0 errors at every step, 543/543 green) are accurate records of runs actually executed; I re-executed nothing.",
      "status": "unverified"
    },
    {
      "assumption": "The in-turn test's expected marker layout (`m[0][0] m[4][0] system[1] tools[0]` shape, four markers, `applied = { carrierRead: B, block: 'cached' }`) and the E-labels' dollar figures (E1–E9) are accepted from redgreen-derek.md and design §8.1; only the split test's numbers were recomputed.",
      "status": "unverified"
    },
    {
      "assumption": "Citations into pi's own sources (`runner.js`, `anthropic-messages.js`, `docs/extensions.md`, `types.d.ts:652`, `sdk.js`) and Joel's `anthropic-attribution.ts` are outside the repository and accepted on the research reports' measurements.",
      "status": "unverified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "No test, typecheck, lint, mutation or git command was executed; every run claim comes from `redgreen-derek.md` and `michael-s5-r1.json` as recorded evidence.",
    "The byte-level content of `test-cache-point-live.mjs.txt` beyond its named exports, the precondition block and the `realpathSync` main guard; the byte-for-byte copy instruction makes the rest self-verifying at execution time.",
    "The arithmetic of the live assertions' ⌈chars/8⌉ and ⌈chars/2⌉ margins and the measured token numbers in design §8.3, beyond the split test recomputed this round.",
    "Whether tsc's raw output during Michael's s5 measurement printed 45 errors over the 42 distinct lines the log lists — the open basis of finding S5R2-STRUCT-1; the log itself was counted, not re-run.",
    "`research-chidi.md`, `research-eleanor.md` and `research-attribution-guard.md` were not re-read this round; round 1 verified their structural use, and no tasks.md section citing them changed in a way that reopens them.",
    "Bambadjan's docs-pass targets (`README.md:40`/`:112`, `docs/adr/0009`, `ARCHITECTURE.md:46-47`, `AGENTS.md:23`/`:39`/`:42`) exist as cited but their post-change wording is out of this plan's scope by design §4 and §10.",
    "Live-run reproducibility on Derek's routes (tasks 9.1/9.2) and Joel's routes (10.1/10.2): model-call-dependent checks are accepted as planned with their recorded residuals, including the model-dependent twelve-request precondition and the carve-out's Joel-only live proof."
  ]
}