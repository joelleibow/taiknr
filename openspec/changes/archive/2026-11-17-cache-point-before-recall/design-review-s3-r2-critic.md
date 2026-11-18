{
  "mode": "review",
  "lens": "council-critic",
  "paraphrase_proposes": "",
  "paraphrase_existing": "",
  "recommendation": "Needs fixes, with one major item. All eleven round-1 critic findings landed correctly:\n- the commit now happens at a valid assistant `message_end`;\n- Joel's live runs use a temporary agent directory with a symlinked `auth.json`;\n- `applied` is derived on every exactly-one-marker payload;\n- markers are found by a recursive walk;\n- the fingerprint ignores `cache_control`;\n- the D1 precondition is in the live script;\n- virtual models are recorded as under-reporting;\n- the script evaluates every assertion before exiting.\n\nThe decisions, alternatives, failure order and rollback meet feature-spec-standard.\n\n**Major: the spec contradicts D8 (CR2-1).** The context-figures delta still states the old block-pricing rule, which D8 explicitly corrects. Its MODIFIED requirement and its table row 1 price a block on a carried message at the read rate. D8, and the §8.1 test written from it, charge a block that changed on a carried message at the write rate. The spec also keys its rule on 'pi's marker removed from the block'. That misses the budget-1 in-turn case, where D8 bills the block as input. Because the spec is where acceptance is defined, the implementer and Validate would be held to two different rules.\n\n**Minor items.** Seven are wording, residual or test-procedure fixes:\n- two `AppliedPlacement` fields nobody reads;\n- a spec replay scenario that contradicts §5.3 (6);\n- the surrogate row, which is false on Joel's route;\n- the live script's relative extension path against a temporary cwd;\n- the carve-out stripping a foreign system marker;\n- two inflated claims in D5 and §11.",
  "findings": [
    {
      "id": "CR2-1",
      "severity": "major",
      "location": "specs/context-figures/spec.md, MODIFIED 'A saving is priced at the rates the request's own response reported' (requirement text, scenario 'The block's charge, by placement and request' row 1, and scenario 'An applied edit is the source, not the intent'), against design.md D8 and §7.2 and §8.1's publisher test 'a block that changed on the same message the last priced request carried, charged at write rather than at read'",
      "finding": "The spec still prices recall's block by the old rule. For 'pi's marker stayed on the block, or the handler made no edit', it charges the read rate whenever the block's message lies inside what the last priced request carried. Table row 1 says a 'first request, warm' is priced at the read rate.\n\nD8, which came from Michael's dr-s2 ruling cc2-3, replaces that rule with a two-state transition. It treats `blockChanged || baseline.blockUncached` as the new tail, and says outright that this 'fixes a latent defect' in the old rule. The spec keeps the defect as a requirement.\n\nThe spec also keys its rule on whether 'the handler removed pi's marker from the block'. D8 keys on `applied.block`: no marker on recall's block or on any later block. The two differ whenever the block sits mid-history.\n\nThe spec's 'An applied edit is the source' scenario describes the deferred reading as 'whether a carry was placed and whether pi's marker on the block was kept or removed'. The design prices from `block` and `carrierRead` instead.",
      "rationale": "The spec is the home of what must be true at acceptance. A tasks author or the Validate stage that writes tests from the spec will contradict §8.1's test and D8's code. The design calls its own rule a defect fix, and the spec still requires the defect.\n\nIn today's code, `rewriteOf` sets `blockInNewTail = block.index >= previousLength` and `netDollars` reads a warm block at the read rate (`instruments-publisher.ts:184-203`, `savings-dollars.ts:56`). So the spec's wording is today's behaviour, and D8 is not.",
      "concrete_case": "**A changed block on a carried message.** In turn 2, request 5, recall's cache-hit branch drops one id that is no longer eligible (`recall-relevant-context.ts:64-72`). The block on U2 changes in place: same index, different text, so `blockChanged` is true. pi's marker stays on the last `tool_result`, so the handler neither kept nor removed a marker on the block. The spec says read rate, because U2 lies inside the last priced request. D8 and §8.1 say write rate.\n\n**The budget-1 in-turn case.** A foreign top-level marker over an API key leaves budget 1. An in-turn request places the before point and removes pi's last marker, which was on the last message, not on the block. The spec's 'removed pi's marker from the block' branch does not apply, so the spec gives the read rate. D8 gives `applied.block = \"uncached\"`, which is the input rate.",
      "recommendation": "Rewrite the spec requirement as D8's rule:\n- 'uncached' (no marker on recall's block or after it) is the input rate;\n- 'cached' and new, changed, or left uncached by the last priced request is the write rate;\n- 'cached' otherwise and warm is the read rate;\n- cold is the write rate.\n\nThen:\n- replace table row 1 with those four rows, using §7.2's numbers;\n- add one row for a block changed on a carried message, at the write rate;\n- reword 'An applied edit is the source' to name the reading the design actually consumes, `applied.block` and `applied.carrierRead`.\n\nCite cc2-3 (dr-s2) as the ruling that superseded the council's 'today's rule' wording."
    },
    {
      "id": "CR2-2",
      "severity": "minor",
      "location": "design.md §5.2 `AppliedPlacement`; §5.3 (5) derivation of `carry` and `blockMarker`; §5.4",
      "finding": "`AppliedPlacement.carry` and `AppliedPlacement.blockMarker` have no reader. D7 reads `carrierRead`, D8 reads `block`, and §5.4 says the publisher turns `applied` into exactly those two facts. `blockMarker: \"kept\" | \"removed\"` also has no defined value on a request that carries no block.",
      "rationale": "An unread field still costs a derivation in the adapter, adapter tests and a definition someone must keep correct. It also feeds the spec drift in CR2-1, where the spec names these two fields as the reading.",
      "concrete_case": "For a no-block handoff request, the design does not say whether `blockMarker` is \"kept\" or \"removed\". One implementer picks \"kept\", the test author asserts \"removed\", and nothing downstream would ever notice the difference.",
      "recommendation": "Delete `carry` and `blockMarker` from `AppliedPlacement`, leaving `{ carrierRead, block }`, and drop their derivation bullets. If a test needs to know a carry was placed, it can read the output payload."
    },
    {
      "id": "CR2-3",
      "severity": "minor",
      "location": "specs/tail-recall/spec.md scenario 'A request taiknr built nothing for' (THEN clause), against design.md §5.3 (6) and the §6.1 'same payload twice' row",
      "finding": "The spec's THEN says 'a re-fired request computes the same edit as its first firing' for every re-fire, the cache-warmer replay included.\n\nThe design says the opposite for a replay sent after the original request's `message_end` has committed: 'the edit may differ: a replay sent after a handoff places no carry'. Only re-fires before the commit are guaranteed to compute the same edit.",
      "rationale": "A test written from the spec would assert identical output for a post-commit replay, and that test fails against the design's correct behaviour.",
      "concrete_case": "H places the carry at U2 and the before point at U3, and commits record (b) = U3 at its valid `message_end`. During a long tool run, the warmer replays H. With record U3, U3 still ends with B3, so no carry is placed. The replay goes out as [system, tools, before@U3, pi's last@B3], which is not H's edit.",
      "recommendation": "Reword the THEN to: 'nothing throws, record (b) changes only at a valid assistant `message_end`, and every re-fire before that commit computes the same edit and next record as its first firing; a replay after the commit may place no carry'."
    },
    {
      "id": "CR2-4",
      "severity": "minor",
      "location": "design.md §6.1 row 'A lone surrogate inside the block'; D5",
      "finding": "The row says pi's rule applied to both sides 'matches'. That holds only on pi's own routes.\n\n- pi's `sanitizeSurrogates` removes unpaired surrogates (`sanitize-unicode.js:24`).\n- Joel's transport replaces them with `\\uFFFD` (`anthropic-attribution.ts:1585-1603`).\n\nOn his route, the payload block keeps `\\uFFFD` while cell (a) loses the surrogate. Exact equality then fails, and the request gets no before point and no record.",
      "rationale": "The outcome is fail-open and safe. But the row asserts a match on a route where the design's own guarantee ('served the same way as pi's own provider') does not hold for this input. Feature-spec-standard §6 requires claims about behaviour to match the evidence.",
      "concrete_case": "An archived tool output contains a lone high surrogate, recall puts it in B2, and the session is on Joel's attribution route. The payload's B2 has `\\uFFFD` where cell (a) had the surrogate, so no carrier is found. Record (b) becomes null, and turn 3's first request places no carry. That turn's loss is today's.",
      "recommendation": "State the row per route: it matches on pi's routes, and on Joel's route it fails open, so no edit is made for that request. Do not add a second normalisation rule unless one is measured to be needed."
    },
    {
      "id": "CR2-5",
      "severity": "minor",
      "location": "design.md §8.3 'The command' (`-e ./src/app/extension/taiknr.ts`); §8.2 invocation, temporary cwd paragraph and 'Discrimination, once at Validate'",
      "finding": "The command loads taiknr through a relative path. But §8.2 runs every route with the cwd set to a fresh `mktemp -d` directory. As written, pi resolves `./src/app/extension/taiknr.ts` against the empty temporary directory.\n\nThe discrimination run also never says how the script, which does not exist at the base commit, loads the base worktree's extension.\n\nSeparately, §8.2 states the temporary-directory setup twice: in 'Both of Derek's routes … They run with …' and again in 'All four routes run with …'.",
      "rationale": "Without this fixed, the live script fails to load the extension on all four routes. The discrimination evidence, which the design relies on to show the inequalities discriminate (M4), cannot be produced as described.",
      "concrete_case": "Derek runs `direnv exec . node test-cache-point-live.mjs anthropic-key`, and the script spawns `pi` with cwd `/tmp/tmp.X`. pi cannot find `/tmp/tmp.X/src/app/extension/taiknr.ts`, so the run aborts before any precondition and no route produces a result.",
      "recommendation": "State that the script resolves the extension as an absolute path from the directory it was launched in (`process.cwd()` before it spawns pi). The discrimination run is then `cd <base worktree> && node <repo>/test-cache-point-live.mjs anthropic-key`. Delete the first copy of the temporary-directory paragraph."
    },
    {
      "id": "CR2-6",
      "severity": "minor",
      "location": "design.md §6.1 row 'Another extension's top-level, system or tools marker'; D3; §5.3 (4) Normalization",
      "finding": "The carve-out fires on the shape 'system carries two marked blocks' and removes the first block's marker, whoever owns it.\n\nOn the API-key route, an earlier extension that adds a marked system block produces that shape. The carve-out then strips either pi's `system[0]` or the foreign marker. Yet §6.1 promises a foreign system marker is 'sent byte-identical', and the spec scenario 'Tools, the top-level marker and foreign markers are untouched' promises the same.",
      "rationale": "The ruling binds the shape test, so this is not a challenge to it. But the stated guarantee is false for an input the design does not exclude.",
      "concrete_case": "An extension loaded before taiknr prepends a marked system block on an API-key session, giving system = [foreign (marked), pi (marked)]. On every request the carve-out removes the foreign block's marker, so the foreign extension's cache entry is never written. §6.1 says that marker goes out byte-identical.",
      "recommendation": "Record the exception in §6.1 and in the spec's untouched-markers scenario: 'except the first of two marked system blocks, which the carve-out removes whoever placed it'. The alternative is to narrow the shape to pi's OAuth identity line, but that couples taiknr to pi's string, so recording the exception is preferred."
    },
    {
      "id": "CR2-7",
      "severity": "minor",
      "location": "design.md D5 'never edit the wrong message'; §11 'pi's marking could drift … and `applied` is null'",
      "finding": "Two claims are inflated.\n\n1. **'Never edit the wrong message' (D5).** The carry check compares only the last block's text at a payload index. After a compaction or a `/tree` jump, a different message at the same index can end with the same short text, and a carry is then placed on it.\n2. **'`applied` is null' (§11, pi's marking drifts).** Under §5.3 (5), `applied` is null only for untouched payloads, for zero or two-or-more message markers, and after a throw. When the block is simply not found, `applied` is non-null with `block` null, and `carrierRead` can still be set when the carry's fingerprint matched.",
      "rationale": "Both outcomes are benign:\n- after compaction or a tree jump the baseline is reset, so `carried` is undefined and pricing is today's;\n- an extra breakpoint costs nothing (`pc.md:607`).\n\nBut the claims as written are false, and §11's version contradicts §5.3 (5). Feature-spec-standard §6 asks for calibrated claims.",
      "concrete_case": "**Coincidental match.** Turn 5's user prompt is 'continue', at payload index 26, and record (b) holds index 26 with fingerprint 'continue'. A compaction follows, and the new turn's prompt at index 26 is also 'continue'. On a handoff-plus-recall request a carry lands on it, displacing pi's last marker and billing the block as input.\n\n**§11.** After a pi release, the before point is never found, but the carry still matches. `applied` is `{ carrierRead: B, block: null }`, not null.",
      "recommendation": "Reword D5 to say a mismatch never edits the wrong message, and a rare coincidental match places a harmless extra point that pricing ignores, because compaction and tree jumps reset the baseline. Reword §11 to say the figures price the cached rows, because `applied.block` is null."
    }
  ],
  "assumptions": [
    {
      "assumption": "Every built-in pi-ai API calls `options.onPayload`: anthropic-messages, openai-completions, openai-responses, azure, google, vertex, mistral, bedrock, codex and pi-messages. pi's custom-provider doc requires custom streams to call it. So the payload hook fires before every agent request's `message_end`, and `applied` is never stale except on a non-compliant third-party provider.",
      "status": "verified"
    },
    {
      "assumption": "Joel's transport sends through global `fetch` (`anthropic-attribution.ts:3059`), so §8.3's fetch-wrapping observer sees his wire payloads.",
      "status": "verified"
    },
    {
      "assumption": "`latestUser.tailText` is the text of the last content block of the latest user message (`pi-instrument-readings.ts:108-117`). That text is `formatRecalledContext(outputs)`, the same string cell (a) holds, so D7's `carrierRead === carried.text` comparison is exact on the context side.",
      "status": "verified"
    },
    {
      "assumption": "`appendRecalledContextToMessages` turns string content into `[text, block]` (`pi-context-adapter.ts:39-41`), so the carrier always has array content with at least two blocks when recall fired.",
      "status": "verified"
    },
    {
      "assumption": "The 132/132 block-pricing fit and the N1–N8 numbers are as Michael reports them. I did not open the logs under `.pi/marbleization/`.",
      "status": "unverified"
    },
    {
      "assumption": "Reading a longer cached prefix also refreshes the TTL of shorter entries inside it. This matters only for a warm replay that fires inside the classifier await with cell (a) cleared, so the replay's before-point entry would go unrefreshed.",
      "status": "unverified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "`research-chidi.md`, `research-eleanor.md`, `council.md` and `specs/development-checks/spec.md` were not re-read this round.",
    "How much a `structuredClone` and recursive walk of every covered payload costs in latency on large image payloads, and how much memory a canonical-JSON image fingerprint held in record (b) takes.",
    "Whether pi resolves `-e` against the child process's cwd or the caller's. CR2-5 assumes the child's cwd, as Node and pi do for relative paths.",
    "Whether `pi auth check --no-refresh` reports `ready` for an expired but refreshable token, in which case the OAuth precondition could exit 3 needlessly.",
    "The runner's behaviour when an earlier extension's `before_provider_request` handler throws: whether taiknr's handler still runs on the previous payload."
  ]
}