{
  "mode": "review",
  "lens": "council-readiness",
  "paraphrase_proposes": "The change adds a `before_provider_request` payload edit on covered Anthropic routes (D1). It places a before point on the block ahead of recall's block and, on a handoff, a carry point on the previous carrier, inside a counted four-marker budget, with D3's one system-marker carve-out. A per-session `PayloadCacheState` holds cell (a), the committed carrier, the next carrier and `applied`. A new `message_end` handler commits the carrier only at a valid assistant response. The figures follow: D7 starts the rewrite after the carrier through `carrierRead`, and D8 prices the block by `applied.block`, carried as `blockUncached`. tasks.md orders this into ten groups: adapter, request handler, commit handler, context cell, readings and figures (5.1, then D7+D8 merged as 5.2), composition, live script, full re-run, Derek's live runs, Joel's live runs. Round-2 fixes are all in: merged 5.2, the prefix row, the mktemp-based clean-tree check, the throw test, the quiet test, the widened precondition with its own check, 10.3, and the two-site `netDollars`/`baseline` edit.",
  "paraphrase_existing": "Today taiknr registers 13 gated handlers over 9 events and edits no provider payload. The context handler appends recall's block and calls `reportRecalled`. `rewriteOf` in `instruments-publisher.ts` starts the rewrite at `carried.index` and prices the block at read or write from `blockInNewTail = block.index >= previousLength` alone. `PricedRequest` has no `blockUncached`. `ResponseReadings` is an alias of `CompactedReadings`. `registerInstrumentsResponseHandler(pi, holder)` takes two parameters. tsc covers `src` and `tests`, so a required field ripples into test fixtures. `biome.json`, `tsconfig.json` and vitest all exclude a root `.mjs`. Base is 37 test files.",
  "recommendation": "Ready for Implement. I found no blocking or major findings, and no design choice is left to Derek that would change behaviour. Every Modify path, line cite and symbol I checked on disk matches tasks.md: `taiknr.ts` :33/:57/:59, `context.ts` deps, the three `instruments-response.test.ts` sites, the `context.test.ts`/`instruments-request.test.ts` deps sites, the publisher `rewriteOf`, `:275-283` and `:288`, `PricedRequest`, `savings-dollars.test.ts` `request()`, `validUsage`, `createContextStub`, the gate, `biome.json`/`tsconfig.json`/vitest scope, the 37 test files, `.gitignore:12`, and the live script's six preconditions, exports and exit codes. Test order and ripples hold, and the spec scenarios all map to a task and a label, a pin, the docs pass, or Joel. Five minor wording and consistency items remain, none of which blocks. The two most worth fixing before Implement are the mislabelled E2/E3 numbers in 5.2 and the 'twelve assertions' count in 9.1 and 10.1. The script has 11.",
  "findings": [
    {
      "id": "readiness-r3-1",
      "severity": "minor",
      "location": "tasks.md 5.2 'Test first' E2 and E3; redgreen-derek.md §4 rows E2 and E3",
      "finding": "5.2 says E2's `-0.00147` is set 'against today's `-0.0012285`, which is E3's own green number'. That is wrong. `-0.0012285` is the base (red) value on both E2 and E3, and `-0.00147` is the green value on both (`redgreen-derek.md` §4). The parentheticals 'A against B' on E3–E8 also never say that A is the base value and B the expected one.",
      "rationale": "E1 spells out its expected value (`-0.0002625 = −0.7 × 20 × WRITE`), but E3–E8 give two numbers with no stated roles, and the E2 sentence points the wrong way. The coder recomputes from READ=1.5e-6 and WRITE=18.75e-6, so the mistake is self-correcting. But a test asserting `-0.0012285` would pass at base and fail only after D8.",
      "concrete_case": "The coder reads 'E3's own green number is −0.0012285', writes E3 as `toBeCloseTo(-0.0012285, 9)`, and sees it green at base, so it is not red-first. After D8 lands it goes red, and the coder has to work out which side of 'against' was meant.",
      "recommendation": "In 5.2, replace 'which is E3's own green number' with 'which is E3's base value; E3's green is also −0.00147'. State once that in every '(X against Y)' pair on E3–E8, X is the base figure and Y the expected one."
    },
    {
      "id": "readiness-r3-2",
      "severity": "minor",
      "location": "tasks.md 7.1, 9.1 (twice), 10.1; design.md §8.2 'Run status'; test-cache-point-live.mjs.txt `evaluate`",
      "finding": "The tasks count 'twelve assertions' as the acceptance bar. 7.1 itself says 'four assertions on turn 2's first request and the seven on H', which is eleven. The source script has exactly 11 assertion `check(` calls (:186, :187, :192, :197 and :202, :203, :208, :214, :219, :224, :233) beside 6 preconditions.",
      "rationale": "This is the live-route acceptance wording for Derek's runs and Joel's 10.1/10.2 report. 'All twelve' cannot be literally satisfied or checked, and a reader may hunt for a twelfth. The base-red count of seven is correct.",
      "concrete_case": "Joel runs 10.1 and the script prints 11 assertion rows. He cannot tell whether one is missing from the report or whether 'twelve' was a miscount.",
      "recommendation": "In 9.1 and 10.1 write 'every precondition and every assertion (eleven: four on turn 2's first request, seven on H)'. Fix the same count in design.md §8.2's 'Run status' at the next design touch, or note that tasks.md governs."
    },
    {
      "id": "readiness-r3-3",
      "severity": "minor",
      "location": "tasks.md 4.1 'Test first' and 'Boundary cases'; 1.2 and 2.2 mutation names",
      "finding": "Test labels collide with design decision names and with evidence labels. 4.1's tests are named D1 and D2 and its boundary line says 'D1's own boundary', while D1 and D2 elsewhere in tasks.md are the route predicate (1.1 'D1's boundary list') and the budget. The mutations M1–M5 also reuse the M1/M4/M5 names of `michael-orientation.md` evidence that design and spec cite.",
      "rationale": "The spike's labels are cited by `redgreen-derek.md`, so renaming is not free. But within one tasks.md a reader of 4.1 cannot tell the test D1 from decision D1 without context. This costs only a re-read.",
      "concrete_case": "The coder reads 4.1's 'D1's own boundary: cell (a) is non-null, a `context_with_system` arrives with no user message' and looks for the route predicate's boundary list in 1.1.",
      "recommendation": "Write 'test D1' and 'test D2' at each use in 4.1, and 'mutation M2' where M-labels appear. Alternatively add one preamble sentence: 'A, B, C, D, E, F, G, L labels are redgreen-derek.md's checks, and M1–M5 are its §5 mutations, not design decisions D1–D10 or Michael's M-evidence.'"
    },
    {
      "id": "readiness-r3-4",
      "severity": "minor",
      "location": "tasks.md 1.2 (preamble: `PayloadEdit`, `editPayload`)",
      "finding": "`PayloadEdit` is exported and named, but its field types are not written down. Only the tuple names `{ output, nextCarrier, applied }` appear. `nextCarrier` and `applied` can be read off §5.2, while the type of `output` ('the edited deep clone or `undefined`') is left to the coder. `payload` and `output` could be `unknown` or `Record<string, unknown>`.",
      "rationale": "Public export names are decided and the shapes of two fields follow from §5.2. The third is a one-word type that tests and the handler both touch, and the handler returns `output` to pi, whose event result is `unknown`. This is not a behavioural choice.",
      "concrete_case": "The coder types `output` as `Record<string, unknown> | undefined` and the test file's deep-equality assertions then need casts.",
      "recommendation": "Add one line to 1.2: `export interface PayloadEdit { output: unknown; nextCarrier: CarrierRecord | null; applied: AppliedPlacement | null }`, with `payload: unknown` and `model: RouteModel | undefined`."
    },
    {
      "id": "readiness-r3-5",
      "severity": "minor",
      "location": "tasks.md 6.1 and F1; tests/app/extension/taiknr.test.ts",
      "finding": "6.1 instructs that `before_provider_request` register before `registerContextHandler`, and `message_end` before `registerInstrumentsResponseHandler`. F1, the only test of the registration list, sorts the events (`events.sort()`), so nothing proves that order. Design §5.1 also states the two `message_end` handlers are order-independent.",
      "rationale": "An instruction no check can catch is either dead or a hidden requirement. The design says the order does not matter, so it is dead. A reader may take it as a constraint that F1 enforces.",
      "concrete_case": "The coder places `registerPayloadCacheCommitHandler` after the instruments registrar. F1 passes, and no test says whether that was allowed.",
      "recommendation": "Add 'order is not pinned and does not matter (design §5.1)' to 6.1, or drop the ordering instruction."
    }
  ],
  "assumptions": [
    {
      "assumption": "Every Modify path and the cited lines exist and match: `taiknr.ts` :33/:57/:59; `context.ts` deps object; `context.test.ts:112`; `instruments-request.test.ts:109` and `:191`; `instruments-response.test.ts` :80/:191/:215; `instruments-compact.test.ts:63`; `instruments-tree.test.ts:77`; `instruments-publisher.test.ts` `contextReading` at :166 and 42 `responseReceived(` calls; `fake-pi.ts` `createContextStub` model option; `savings-dollars.test.ts` `request()`; `pi-instrument-readings.ts` `readResponse`.",
      "status": "verified"
    },
    {
      "assumption": "Base has 37 test files on disk, the registration test expects 13 events and becomes 15 over 10, `package-lock.json` exists, and `.gitignore:12` is `.envrc` with no `.pi` entry.",
      "status": "verified"
    },
    {
      "assumption": "`biome.json` `files.includes`, `tsconfig.json` `include` and vitest `include` exclude a root `test-cache-point-live.mjs`. No `.mjs` is in the tree today, and the AGENTS.md live-script trap names files that are not there, as design §8.3 says.",
      "status": "verified"
    },
    {
      "assumption": "The spike assets 7.1 and L1 rely on exist (`test-cache-point-live.mjs.txt`, `live-assertions-offline.mjs`, `long-added.log`, `long-carry.log`, `s5r2-widened-precondition.mjs` and its log). The script's turn-2 precondition is at :174-178, its six preconditions and eleven assertions are as counted, and the exports and exit codes match 7.1.",
      "status": "verified"
    },
    {
      "assumption": "The widened precondition is shown catching a mistake: the saved log prints 'pass' for both turn-3 cases on the as-is source and 'FAIL' on the widened copy when turn 3 recalled nothing.",
      "status": "verified"
    },
    {
      "assumption": "The existing publisher test 'a shrunk block on the same carried message charges the suffix behind it' exists at :479 with the `-0.7 × 20 × READ − …` expectation that D8 changes. No other `PricedRequest` or `netDollars` construction site exists outside `request()`.",
      "status": "verified"
    },
    {
      "assumption": "`createGatedPi` gates every `pi.on`, and `before_provider_request` is a typed pi event whose handler result is `unknown`, so the new handlers register through the gate without a type exception.",
      "status": "verified"
    },
    {
      "assumption": "The labelled red/green results A1–A28, B1–B6, C1–C5, D1–D2, E1–E9, F1, G1 and L1–L5, and mutations M1–M5, are as `redgreen-derek.md` reports. The spike's test bodies are not saved, so I could not re-derive them beyond E1–E3's arithmetic.",
      "status": "unverified"
    },
    {
      "assumption": "`d21c80b` (HEAD, base counts) differs from `d5f8435` (the red/green and 9.2 worktree base) only in design artifacts. The reflog shows d21c80b committed after d5f8435 as 'Red/green proof, Michael's gap rulings, design patched', which fits that, but I did not diff source.",
      "status": "unverified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "No commands or model calls were run: `npm run check`, the live scripts, the L1 driver and the git worktree steps were read, not executed.",
    "The spike's test bodies and fixtures for A1–A28, B, C, D, E, F and G are not on disk. I read only their descriptions in `tasks.md` and `redgreen-derek.md`, so each label's fixture is the coder's to write from prose.",
    "pi runtime internals (runner.js, anthropic-messages.js, cache-warmer.js, sdk.js, agent-session.js, docs/extensions.md) and Joel's external `anthropic-attribution.ts`; those belong to other lenses.",
    "README.md, ADR 0009, ARCHITECTURE.md and AGENTS.md line numbers (docs pass, excluded from tasks.md).",
    "`research-*.md` and `design-review.md` beyond keyword scans.",
    "Whether `message_end` assistant messages can lack `usage` on some provider paths. The commit handler's 'invalid usage' boundary covers a bad value but not an absent `usage` object."
  ]
}