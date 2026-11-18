{
  "mode": "review",
  "lens": "council-codebase",
  "paraphrase_proposes": "tasks.md orders twelve groups that add a payload adapter (route predicate + marker edit), two new pi handlers, one field on the context handler's deps, one field on PricedRequest, one field on ResponseReadings and a third parameter on the instruments registrar, plus an offline-provable root live script and two live runs. Each test is cited to a label in redgreen-derek.md, boundary cases are named per task, and mutations M1–M5 are offered as proof that the checks catch mistakes. The plan declares that every group lands its own tests and leaves npm run check green. The file boundary marks twenty-two paths Create or Modify and no Delete, and defers all Markdown to a docs pass.",
  "paraphrase_existing": "Per tasks.md and design.md, recall appends a <recalled_context> text block to the newest user message at context_with_system, and pi puts its single message cache marker on that block, so the provider rewrites the turn's prefix on the next request. Four existing publishers behind the instruments switch read figures from deferred readings a registrar hands over at message_end, and the dollar rule prices the block from whether it rides the new tail. Every registrar but session_start goes through a generic gated pi proxy, and the extension factory is re-run per session. The handlers are thin bridges; the adapter and the publisher hold the rules.",
  "recommendation": "Not ready. One blocking finding: three required type changes land in groups 4, 5 and 6 while the source that must compile against them is scheduled for groups 8, 6.2 and 7.1, so those groups cannot pass their own `npm run typecheck` step — the plan's own opening invariant fails at three verified sites. Fix the order (or the nullability of the three new fields) and settle the deps field name, and every other reference I checked matches live code.",
  "findings": [
    {
      "id": "CB-1",
      "severity": "blocking",
      "location": "/Users/joelleibow/Projects/taiknr/openspec/changes/cache-point-before-recall/tasks.md — opening paragraph and tasks 4.1, 5.1, 6.1 vs 8.1, 6.2, 7.1; design.md §4",
      "finding": "Each of the three required type changes is scheduled in an earlier group than the source file that must be edited to satisfy it, so groups 4, 5 and 6 each end with `tsc --noEmit` failing — contradicting tasks.md's opening promise that every group leaves `npm run check` green and `implementation-readiness-standard.md` §4.",
      "rationale": "The plan treats a type change and its construction sites as separate tasks. The standard requires each group to land its own tests and leave the suite green, and forbids a later group repairing an earlier one; here three later groups would have to repair three earlier ones, and 4.1 even asserts \"every construction site has to carry it\" while omitting the one site it does not own.",
      "concrete_case": "(a) 4.1 makes `payloadCache: PayloadCacheState` a required field of registerContextHandler's deps; the composition site at /Users/joelleibow/Projects/taiknr/src/app/extension/taiknr.ts:57 is only edited in 8.1, so 4.1's `npm run typecheck` fails on that call. (b) 5.1 adds required `PricedRequest.blockUncached`; the only production constructor, the netDollars argument literal at /Users/joelleibow/Projects/taiknr/src/use-cases/instruments-publisher.ts:276-282, is only edited in 6.2, and 5.1's own \"Verified by\" runs vitest only, so the group goes green in review and red in the next group's check. (c) 6.1 adds required `ResponseReadings.applied`; the `return { ...readings, projectionEstimate: … }` at /Users/joelleibow/Projects/taiknr/src/infra/adapters/pi-instrument-readings.ts:155 and the read closure at /Users/joelleibow/Projects/taiknr/src/infra/pi-event-handlers/instruments-response.ts:28 stop satisfying the type, and both files are only edited in 7.1.",
      "recommendation": "Move the minimum construction-site edit into each type-changing group and say so in the File Boundary rows: 4.1 also adds the `PayloadCacheState` literal and the deps field at src/app/extension/taiknr.ts:57 (8.1 keeps only the two registrations); 5.1 also passes `blockUncached: false` at src/use-cases/instruments-publisher.ts:276 (6.2 replaces it with readings.applied?.block === \"uncached\"); 6.1 also threads `applied` through src/infra/pi-event-handlers/instruments-response.ts and changes readResponse's declared return type to CompactedReadings (7.1 keeps the registrar's third parameter). Alternatively state the three fields as optional with a stated default, but that weakens two boundary contracts, so the reordering is cheaper."
    },
    {
      "id": "CB-2",
      "severity": "major",
      "location": "/Users/joelleibow/Projects/taiknr/openspec/changes/cache-point-before-recall/tasks.md — File Boundary row for `tests/infra/pi-event-handlers/instruments-request.test.ts` vs task 4.1; design.md §4 vs redgreen-derek.md Gap 8",
      "finding": "The new field on the context handler's deps object is named two different things: `payloadCache: PayloadCacheState` in design §4 and task 4.1, and \"a `payload` state\" in the File Boundary row and in redgreen-derek.md Gap 8.",
      "rationale": "The standard's zero-decision rule names public names and boundary contracts; this field is the contract between the composition root, the handler and two test files, and two authoritative lists in the same artifact disagree, so the coder picks one and one of the two lists becomes wrong.",
      "concrete_case": "A coder implementing 4.1 writes `payloadCache` (as 4.1 says) and then fixes the deps literal at /Users/joelleibow/Projects/taiknr/tests/infra/pi-event-handlers/instruments-request.test.ts:109, where the File Boundary row told them the field is called `payload`; the two names compile in isolation and the mismatch surfaces only as a tsc error in a file the task's own Verify line runs.",
      "recommendation": "Pick one name in all three artifacts. `payloadCache` (design §4, task 4.1) reads better beside the existing `holder` field, so change the File Boundary row and note in §4.1 that the same field is what Gap 8 called `payload`."
    },
    {
      "id": "CB-3",
      "severity": "minor",
      "location": "/Users/joelleibow/Projects/taiknr/openspec/changes/cache-point-before-recall/tasks.md — task 1.1 boundary cases and the `RouteModel` paragraph; design.md D1 and §5.3 (3)",
      "finding": "Neither artifact says whether `RouteModel.baseUrl` is optional, although 1.1 requires a \"missing `baseUrl`\" row to be built in a test that `npm run typecheck` compiles.",
      "rationale": "pi's own type makes the field non-optional (`BaseModel.baseUrl: string` at /Users/joelleibow/Projects/taiknr/node_modules/@earendil-works/pi-ai/dist/types.d.ts:652), so a required `RouteModel.baseUrl` makes the design's \"a missing baseUrl … is uncovered\" branch unreachable without a cast, and a cast in a test is exactly the invented boundary the standard forbids.",
      "concrete_case": "`extends Model`-shaped `ctx.model` always carries baseUrl, so an A1 row that omits it either fails tsc or needs `as unknown as RouteModel`; the same is true for /Users/joelleibow/Projects/taiknr/tests/support/fake-pi.ts:63, where task 2.1 adds `baseUrl?: string` precisely so an *absent* baseUrl can be built.",
      "recommendation": "State in 1.1 that `RouteModel.baseUrl` is `string | undefined` (and `api` a plain `string`), so the missing-baseUrl and unparseable-baseUrl rows are type-safe and the predicate's runtime guard is the only null check."
    },
    {
      "id": "CB-4",
      "severity": "minor",
      "location": "/Users/joelleibow/Projects/taiknr/openspec/changes/cache-point-before-recall/design.md §4 file-placement table",
      "finding": "design §4's table, which declares itself the file-placement contract, still omits `tests/support/fake-pi.ts`, although §8.1 requires its `model` option to gain `baseUrl?: string`.",
      "rationale": "This is the same class as the two gaps redgreen-derek.md raised against §4 (Gaps 6 and 7): a file the change cannot land without, absent from the placement contract. tasks.md's File Boundary does list it, so only readers who treat §4 as authoritative are misled.",
      "concrete_case": "A coder working from design §4 alone edits only the eleven test paths it names and then finds `createContextStub({ model: { provider: \"anthropic\", api: \"anthropic-messages\", id: \"…\", baseUrl: \"https://api.anthropic.com\" } })` rejected at /Users/joelleibow/Projects/taiknr/tests/support/fake-pi.ts:63.",
      "recommendation": "Add `tests/support/fake-pi.ts` (Modify — `createContextStub`'s `model` option gains `baseUrl?: string`) to design §4's tests row, matching the File Boundary row tasks.md already has."
    },
    {
      "id": "CB-5",
      "severity": "minor",
      "location": "/Users/joelleibow/Projects/taiknr/openspec/changes/cache-point-before-recall/tasks.md — task 10.1",
      "finding": "\"the suite grown from the base's 596 tests\" attributes to the base commit a count that redgreen-derek.md reports for the change, not the base.",
      "rationale": "The cited evidence runs `Tests 42 failed | 554 passed (596)` on a copy that already contains the new test files, so 596 is the post-change total and the base's own total is smaller by however many cases the change adds (more than 42, because the pin rows pass at base); the same sentence then says \"the count moves with the cases this plan adds\", which cannot be true of 596.",
      "concrete_case": "A coder running task 10.1 compares `npm run check`'s reported total against 596 and cannot tell whether the change added or lost cases, so the one number that would detect a silently skipped new test file is unusable.",
      "recommendation": "Drop the base count from 10.1 and state the check as: exit 0, and the reported total is the base's own total (measured before group 1) plus the cases groups 1–8 add. Or cite 596 as the spike's post-change total and require only that the local total be ≥ it."
    }
  ],
  "assumptions": [
    {
      "assumption": "pi exposes `before_provider_request` with `payload: unknown` and an `unknown` handler result, so returning a clone or `undefined` is the documented contract.",
      "status": "verified"
    },
    {
      "assumption": "`ExtensionContext.model` is `Model<any> | undefined` and `BaseModel.baseUrl` is a non-optional `string`, so the four fields `RouteModel` needs exist on `ctx.model`.",
      "status": "verified"
    },
    {
      "assumption": "`createContextStub`'s `model` option is a hand-written structural type cast to `ExtensionContext`, so widening it with `baseUrl?: string` needs no other fixture change.",
      "status": "verified"
    },
    {
      "assumption": "The gated `pi` is a generic Proxy over `on`, so the new `before_provider_request` event needs no edit to `src/app/extension/handler-gate.ts` and that file is correctly absent from the File Boundary.",
      "status": "verified"
    },
    {
      "assumption": "`sanitizeSurrogates` is not re-exported from `@earendil-works/pi-ai`'s index, so D5's local copy is necessary rather than a duplicate of an importable helper.",
      "status": "verified"
    },
    {
      "assumption": "`test-cache-point-live.mjs` at the repository root falls outside `biome.json`'s `files.includes`, `tsconfig.json`'s `include` and `vitest.config.ts`'s `include`, so it needs no config edit.",
      "status": "verified"
    },
    {
      "assumption": "`pi auth check --provider <p> [--json] [--credentials] [--no-refresh]` and the launch flags `-p`, `--no-session`, `-ne`, `-e`, `--model`, `--thinking` that §8.3 and task 9.1 depend on all exist in the installed pi CLI.",
      "status": "verified"
    },
    {
      "assumption": "A per-request `cacheRead`/`cacheWrite` triage path exists in the session JSONL, because the readings adapter already reads `entry.message.usage.cacheRead`/`cacheWrite` off persisted assistant entries.",
      "status": "verified"
    },
    {
      "assumption": "`readResponse`'s declared return type is currently `ResponseReadings`, so group 6's required `applied` field breaks it before 7.1 changes it — i.e. the compile coupling is real, not hypothetical.",
      "status": "verified"
    },
    {
      "assumption": "The faux provider used by `tests/app/extension/archive-session.test.ts` has a random `api` id, so D1 cannot cover it and that suite needs no edit from the new handlers.",
      "status": "verified"
    },
    {
      "assumption": "`tests/app/extension/archive-session.test.ts` asserts no dollar figures, so D8's `carried === undefined` change cannot move it (the harness rewrites usage to zero-cost anyway).",
      "status": "verified"
    }
  ],
  "owner_questions": [
    {
      "question": "How should the three compile-coupled type changes be ordered so each group leaves `npm run check` green?",
      "options": [
        "Move the minimum construction-site edit into the type-changing group (4.1 edits taiknr.ts:57, 5.1 passes blockUncached: false at instruments-publisher.ts:276, 6.1 threads applied and retypes readResponse); 7.1 and 8.1 keep the rest",
        "Make the three new fields optional with stated defaults so every group compiles alone",
        "Reorder groups so the domain/publisher/registrar groups run after the composition group"
      ],
      "recommended_option": "Move the minimum construction-site edit into the type-changing group (4.1 edits taiknr.ts:57, 5.1 passes blockUncached: false at instruments-publisher.ts:276, 6.1 threads applied and retypes readResponse); 7.1 and 8.1 keep the rest",
      "why": "It preserves the plan's dependency order and the required (non-optional) boundary contracts, costs three one-line edits, and needs no change to any test label or mutation claim."
    }
  ],
  "not_checked": [
    "pi's own runtime internals that design.md cites by line (runner.js:1074-1100, cache-warmer.js:119-196, sdk.js:224-229, anthropic-messages.js:1408-1432, agent-session.js:1604, docs/extensions.md:862/:2117, docs/custom-provider.md:195) — external-library behaviour belongs to Chidi's lane; I verified only the public types the new handlers bind to.",
    "I could not execute `npm run check` or vitest in this step, so the test totals in CB-5 are arithmetic from redgreen-derek.md's own table rather than a local run.",
    "Joel's `~/.pi/agent/extensions/anthropic-attribution.ts` line citations (:1020-1027, :1040-1052, :1329-1354, :1584-1604, :1619-1629, :3218-3233) — outside the repository and outside this lens.",
    "`openspec/changes/archive/2026-11-17-taiknr-instruments/design.md`:356, cited from the context-figures delta spec, was not opened.",
    "The design's \"no new log line, notice or instrument field\" position is fixed by the binding \"how scenarios are proven\" ruling, so I did not reopen it; I only confirmed the JSONL triage path it names actually carries per-request cache counts."
  ]
}