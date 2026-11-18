{
  "assumptions": [
    {
      "assumption": "Every Create/Modify path in the File Boundary exists in the tree or is a new path following design §4's placement: context.ts, taiknr.ts, savings-dollars.ts, instruments-publisher.ts, instruments-response.ts, pi-instrument-readings.ts, fake-pi.ts and all eleven named test files are present; the four new src paths and three new test paths do not exist yet.",
      "status": "verified"
    },
    {
      "assumption": "Base state matches the tasks' claims: thirteen registrations over nine events (taiknr.test.ts:5 pins the sorted list of 13), `.gitignore:12` is `.envrc` with no `.pi/` entry, a root `.mjs` file sits outside biome's `includes`, tsconfig's program and vitest's include, and `npm run check` is `lint && typecheck && test` (package.json:13).",
      "status": "verified"
    },
    {
      "assumption": "The symbols tasks.md cites as current state exist as described: `validUsage` (calibration.ts:50), `rewriteOf` returning `{ suffixEstimate, blockInNewTail }` with today's `blockInNewTail = block !== undefined && block.index >= previousLength` (instruments-publisher.ts:185-203), `ResponseReadings = CompactedReadings` (:59), `PricedRequest` without `blockUncached` (savings-dollars.ts:19-26), `readResponse` annotated `: ResponseReadings` (pi-instrument-readings.ts:129), `createContextStub`'s `model` option without `baseUrl` (fake-pi.ts:63), and `registerInstrumentsResponseHandler(pi, holder)` (instruments-response.ts:9).",
      "status": "verified"
    },
    {
      "assumption": "The three registerContextHandler construction sites are exactly `src/app/extension/taiknr.ts:57`, `tests/infra/pi-event-handlers/context.test.ts:112` and `tests/infra/pi-event-handlers/instruments-request.test.ts:109`, and the only responseReceived callers outside the publisher test are instruments-compact.test.ts:56, instruments-tree.test.ts:70 and instruments-request.test.ts:184 — so the File Boundary's test list is complete for runtime callers.",
      "status": "verified"
    },
    {
      "assumption": "redgreen-derek.md's labels (A1–A28, B1–B6, C1–C5, D1–D2, E1–E9, F1, G1, L1–L5), mutations M1–M5 and the base counts (596 tests, 13 registrations) are accurate records of runs actually executed against base `d5f8435`; I did not re-execute any of them.",
      "status": "unverified"
    },
    {
      "assumption": "`package-lock.json` is git-tracked, as task 10.1 and the development-checks delta require.",
      "status": "unverified"
    },
    {
      "assumption": "Design §8.3's live-script contract (prompts, six preconditions, eleven assertions, exit codes) is implementable as written; accepted on redgreen §6's measured runs rather than re-derived.",
      "status": "unverified"
    }
  ],
  "findings": [
    {
      "concrete_case": "Coder finishes 6.1 exactly as written: `ResponseReadings` gains required `applied`; `readResponse`'s return literal still lacks it; the task's own `npm run typecheck` prints TS2322 in `src/infra/adapters/pi-instrument-readings.ts` and the group ends red. Executing 5.1 alone likewise ends the group with tsc red at `instruments-publisher.ts:276` (missing `blockUncached` in the PricedRequest literal handed to `netDollars`).",
      "finding": "The group sequence cannot leave the suite green at each boundary, because required-field widenings ripple into files later groups own. After 5.1, `src/use-cases/instruments-publisher.ts`'s PricedRequest construction (responseReceived, ~:276) fails tsc until 6.2. After 6.1, `src/infra/adapters/pi-instrument-readings.ts`'s `readResponse` (annotated `: ResponseReadings`, returning a literal without `applied`) fails tsc — and 6.1's own `Verified by` names `npm run typecheck`, whose fix (returning `CompactedReadings`) is task 7.1, the next group. Executing the plan in order therefore fails the named verification of task 6.1 and forces the coder to choose between pulling 7.1's edit forward, accepting a red typecheck, or inventing an optional `applied?:` field the design does not state (`AppliedPlacement | null` is required, per §5.2 and redgreen's fixture note).",
      "id": "S5R1-STRUCT-1",
      "location": "tasks.md preamble (group-green invariant) and tasks 5.1, 6.1; ripples into src/use-cases/instruments-publisher.ts:276 and src/infra/adapters/pi-instrument-readings.ts:129",
      "rationale": "implementation-readiness-standard.md §4 requires each group to land its own tests and leave the suite green so a later group never repairs an earlier one, and §1's zero-decision rule fails a plan whose task, executed as written, cannot pass its own named check. `npm run check` is `lint && typecheck && test` (package.json:13), so a red tsc is a red group.",
      "recommendation": "Bucket each widening with its ripple in one group: either 5.1 and 6.x merge (the `PricedRequest.blockUncached` field and the publisher's construction site change together), or 5.1's Verified by is restricted to the domain test and the preamble's per-group `npm run check` claim is amended for that group; and 6.1 absorbs 7.1's `readResponse` return-type change (or 7.1 moves ahead of 6.1), so the type that requires `applied` and the function that cannot yet supply it never coexist across a group boundary.",
      "severity": "blocking"
    },
    {
      "concrete_case": "After 4.1, tsc reports the missing `payloadCache` property at `taiknr.ts:57`; after 7.1, the missing third argument at `taiknr.ts:59`. Neither task names `src/app/extension/taiknr.ts`, and 8.1's File Boundary row claims the file's change (create the state, compose and register the new handlers).",
      "finding": "The composition file's edits are split across groups without a task authorizing them: making the context handler's `payloadCache` deps field required (4.1) and the registrar's third parameter required (7.1) each break `src/app/extension/taiknr.ts`'s call sites (lines 57 and 59) — which 4.1's `npm run typecheck` and 7.1's `npm run typecheck` then catch — but the File Boundary and task 8.1 assign that file's changes to the composition group. 4.1's sentence `because the deps field is required and every construction site has to carry it` half-authorizes the early taiknr.ts edit (and forces creating the state literal, which 8.1 claims as its own); 7.1 has no such sentence for `taiknr.ts:59`, so its named typecheck fails until 8.1 with no authorized remedy.",
      "id": "S5R1-STRUCT-2",
      "location": "tasks.md tasks 4.1, 7.1, 8.1 and File Boundary row for src/app/extension/taiknr.ts; live call sites at src/app/extension/taiknr.ts:57 and :59",
      "rationale": "implementation-readiness-standard.md §2 requires the file boundary to state what changes per task and §4 requires dependency-ordered groups; a coder who hits 7.1's failing typecheck must decide whether to edit a file another task owns, which is a plan-level choice the plan should have made.",
      "recommendation": "State the ripple explicitly: 4.1 and 7.1 each add `and update the call site in src/app/extension/taiknr.ts (creating the state literal at 4.1)` to their own text, and 8.1 is narrowed to registering the two new handlers; or move the state literal and both call-site updates into the earliest group that needs them and renumber 8.1 accordingly.",
      "severity": "major"
    },
    {
      "concrete_case": "A reader of Residual 1 before running 11.1 expects turn 2's first request to read ~3 tokens; the live runs it cites (L2, design §8.3) show it reading 6,771–8,030 and the bound passing because read_H covers that entry plus the new turn-2 content.",
      "finding": "Residual 1 misstates why the `read_H` bound holds where 11.1 runs it: `the script's own prompts make `read_R1` 3` contradicts design §8.3's own passing numbers, where `read_R1(turn 2)` is 6,852 (API key) and 6,771 (OpenRouter) on the change. The 3 is `input_R1(turn 2)` — design §8.3's R1 assertion `input_R1 < ⌈chars/8⌉` passes at `3 against 1,040` — not the cache read.",
      "id": "S5R1-STRUCT-3",
      "location": "tasks.md §Residuals item 1, against design.md §8.3 (assertions on turn 2, request 1) and redgreen-derek.md Gap 2",
      "rationale": "feature-spec-standard.md §6 requires every stated claim to match cited evidence; 11.1 `reports both sides so a reader sees it`, and the residual's wrong reason would mislead exactly that reader when the printed `read_R1` shows thousands, not 3.",
      "recommendation": "Correct the sentence to name `input_R1` 3, or restate the reason the bound holds (on the script's prompts H reads through R1's entry plus the new turn-2 content, measured L2: 11,775 against 6,771 + 1,314), leaving the design question of dropping the `read_R1` term as the residual's open item.",
      "severity": "minor"
    },
    {
      "concrete_case": "After 6.1, `tsc` fails on `tests/use-cases/instruments-publisher.test.ts`'s `contextReading` fixture (missing `applied`) even though the task text names only the three instrument files; the coder must infer the fixture value from D7/D8 rather than from the task.",
      "finding": "Task 6.1's sentence `update the readings the three instrument test files hand `responseReceived` so they carry `applied`` under-enumerates the ripple: `tests/use-cases/instruments-publisher.test.ts`'s own `contextReading` fixture feeds `responseReceived` at roughly forty call sites (verified: lines 302–886), and every one must carry the new required `applied` field for 6.1's `npm run typecheck` to pass. The File Boundary's Modify row covers the file, and the value is settled by design (`applied` null is the unedited case that keeps today's expectations, per D7's fallback and D8's `applied null counts as cached`), so this is an enumeration gap, not a decision gap.",
      "id": "S5R1-STRUCT-4",
      "location": "tasks.md task 6.1; tests/use-cases/instruments-publisher.test.ts:302-886",
      "rationale": "implementation-readiness-standard.md §3 requires the plan to name what each task's tests change; an implementer following 6.1's text literally touches three files and then finds a fourth failing typecheck.",
      "recommendation": "Extend 6.1's sentence to `the readings the three instrument test files and the publisher test's own contextReading fixture hand responseReceived`, naming `applied: null` as the fixture's value for the existing expectations.",
      "severity": "minor"
    },
    {
      "concrete_case": "A coder drafting the adapter's exports from tasks.md alone has `editPayload(payload, model, recallBlock, carrier)` fully settled but must infer `coversRoute`'s argument order from §5.3 (1)'s input list and the A1 test's shape.",
      "finding": "`coversRoute`'s parameter list is never stated: `editPayload`'s signature is given in full in task 1.1 and design §5.3 (5), and the export names are settled (`coversRoute`, `editPayload`, `RouteModel`, `PayloadEdit`), but whether `coversRoute` takes `(payload, model)` or `(model, payload)` — and whether it returns a boolean or the covered/uncovered triage of §5.3 (3) — is left to inference from §5.3 (1)'s input ordering and the A1/A2 labels.",
      "id": "S5R1-STRUCT-5",
      "location": "tasks.md task 1.1; design.md §5.3 (1) and (3)",
      "rationale": "implementation-readiness-standard.md §1 settles public exports and boundary contracts before implementation; the predicate is the adapter's public entry alongside `editPayload` and deserves the same one-line signature.",
      "recommendation": "Add the signature to task 1.1 or design §5.3 (3): `coversRoute(payload, model) → boolean`, covering D1's route rows plus the object-and-messages-array shape tests of §5.3 (3).",
      "severity": "minor"
    }
  ],
  "lens": "council-structural",
  "mode": "review",
  "not_checked": [
    "I executed nothing: no test, typecheck, lint or mutation run, and no git command; all red/green, mutation (M1–M5) and live-run (L1–L5) claims are taken from redgreen-derek.md as recorded evidence.",
    "Michael's probe logs and the spike's artifacts under `.pi/marbleization/cache-point-before-recall/` (including the offline L1 driver and live-runs.md) were not opened; L1's reproducibility from the committed script alone is accepted on the spike's report.",
    "research-chidi.md, research-eleanor.md and research-attribution-guard.md were skimmed for structure and spot-checked, not read in full; citations into pi's own sources (`runner.js`, `anthropic-messages.js`, `docs/extensions.md`) and Joel's `anthropic-attribution.ts` were not verified, being outside the repository.",
    "Design §8.3's assertion arithmetic (the ⌈chars/8⌉ and ⌈chars/2⌉ margins) and the measured token numbers were not recomputed.",
    "Whether `package-lock.json` is tracked, and whether `npm install` leaves the tree clean (development-checks scenarios), was not verified; task 10.1 checks both at run time.",
    "Bambadjan's docs-pass targets (README.md:40, :112, docs/adr/0009, ARCHITECTURE.md:46-47, AGENTS.md:23, :39, :42) were confirmed to exist as cited but their post-change wording was not drafted or checked, being out of this plan's scope by design §4 and §10."
  ],
  "owner_questions": [],
  "paraphrase_existing": "Today recall appends a `<recalled_context` block to the newest user message at `context_with_system`, and pi places its message cache marker on that block, so a request carrying the block makes the provider rewrite the turn's prefix instead of reading the earlier entry. The savings publisher prices a warm-request rewrite suffix from the changed message (`rewriteOf` in `instruments-publisher.ts`, `netDollars` in `savings-dollars.ts`), with the block's rate today `warm && !blockInNewTail ? read : write`. Thirteen handler registrations over nine events sit behind a config gate in `taiknr.ts`'s factory; the `message_end` registrar hands the publisher deferred readings via `readResponse`.",
  "paraphrase_proposes": "The plan adds a pure Anthropic payload adapter, two thin gated handlers (`before_provider_request`, a `message_end` commit) and a four-field per-session state, to place a before-point ahead of recall's block and a one-hop carry on the prior carrier inside a four-marker budget, with one OAuth carve-out. It widens `PricedRequest.blockUncached` and `ResponseReadings.applied` so the publisher moves the rewrite start (D7) and the block's rate (D8) from the applied edit, not the intent. Every scenario is proven by a labelled red/green check from the spike, a committed live script over four routes (two Joel's), and a final re-run group; Markdown updates are excluded to Bambadjan's docs pass.",
  "recommendation": "Round 1: needs fixes. One blocking dependency-order defect — the required-field widenings in groups 5 and 6 leave `npm run typecheck` red at their own group boundaries because their ripples land in groups 6 and 7 — and one major ownership ambiguity around `taiknr.ts`'s call sites, which groups 4 and 7 break but group 8 owns. Everything else passes: the file boundary is verified against the live tree down to line numbers, scenario coverage is complete with every delta scenario mapped to a task and a label, layering keeps the adapter owning provider shape and the domain pure, Joel-only checks are marked his, and the claims are calibrated against the spike's measured labels including its honest residuals."
}