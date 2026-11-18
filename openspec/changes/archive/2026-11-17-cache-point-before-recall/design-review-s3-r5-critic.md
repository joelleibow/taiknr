{
  "mode": "review",
  "lens": "council-critic",
  "paraphrase_proposes": "",
  "paraphrase_existing": "",
  "recommendation": "**Verdict: needs fixes, one major item.**\n\nAll four round-4 critic fixes landed, along with the three structural ones:\n- the tail-recall \"In-turn requests\" scenario now says the request writes the new step, plus the block when the turn's first request billed it as input;\n- §8.1 has the before-point-only adapter test and the no-carrier test;\n- §8.3 has the turn 2, request 1 assertions and the turn-1 precondition;\n- D8 and §5.3 (5) say null when no carrier is found;\n- the budget-1 case and the provider that never calls `onPayload` are recorded;\n- the lone-foreign-marker residual, §12 and the ARCHITECTURE.md:5 docs-pass item are in.\n\nDecisions, alternatives, failure order, rollback and the Migration Plan still meet feature-spec-standard.\n\n**Major (CR5-1).** The design's own copy of the prompt-caching docs (`michael/pc.md`:48, :304, :509) says a top-level `cache_control` is automatic caching. It puts a breakpoint on the last cacheable block, which is on or after recall's block. D8 derives `applied.block` only from block-level markers, and the budget-1 residual uses a top-level marker as its example. So:\n- the figure charges the block at the input rate on every in-turn step it actually read;\n- §7.3 and the README record an under-report where the figure in fact over-charges;\n- §11's \"ten times today's cost\" does not happen in that example.\n\nThe fix is one derivation clause, one test and some rewording. The budget rule itself stays as ruled.",
  "findings": [
    {
      "id": "CR5-1",
      "severity": "major",
      "location": "/Users/joelleibow/Projects/taiknr/openspec/changes/cache-point-before-recall/design.md D8 (`applied.block` derivation), §5.3 (5), §7.3 (budget-1 entry added in r4), §11 \"Budget 1 bills the in-turn tail as input\"; specs/context-figures/spec.md scenario \"The block's charge, by placement and request\" row 1 (\"The budget-1 in-turn request is this row\"), scenario \"The block is not inside the charged suffix\", and scenario \"The under-reporting is recorded where the figure is read\"",
      "finding": "**The design treats a top-level `cache_control` only as a budget slot.**\n- D8 sets `applied.block` to \"uncached\" when no marker sits on recall's block or on any block after it.\n- §11 and §7.3 use a foreign top-level marker as the budget-1 example, and say each in-turn step re-sends the tail as input.\n\n**The provider docs the design already cites say otherwise.** A top-level `cache_control` is automatic caching:\n- \"The system automatically applies the cache breakpoint to the last cacheable block\" (`pc.md`:48, :304);\n- it \"uses one of the 4 available breakpoint slots\" (`pc.md`:509);\n- it is a no-op when the last block already carries the same TTL (`pc.md`:535).\n\nSo when a top-level marker is present and pi's marker yields, a breakpoint still sits on the payload's last block. That block is on or after recall's block. The block and the tail are written and then read.\n\nCounting the top-level marker in the budget is right. Deriving the placement without it is wrong.",
      "rationale": "Ruling Q2(a) and the instruments ruling (\"don't misinform users\") require the figure to price what the provider really does. feature-spec-standard §6 requires every statement about behaviour to match cited evidence.\n\nOn this input, three things go wrong:\n- the spec table and D8 price a read block at the input rate;\n- the §7.3 and README entry records an under-report where the figure actually over-charges;\n- §11 states a cost the provider docs rule out.\n\nThe r4 fix (CR4-4a, from this lens) carried the wrong example into the spec and the README list. That is why it is raised now.",
      "concrete_case": "An API-key session where an earlier extension sets top-level `cache_control: {type: \"ephemeral\"}`. The budget is 4 − (top-level + system[0] + tools) = 1.\n\n**Turn 2, request 1** (recalling, after a quiet turn):\n- the before point is wanted; 1 + 1 > 1, so pi's marker is removed;\n- the clone has no block-level marker at or after recall's block, so D8 gives `applied.block = \"uncached\"` and the block is priced at the input rate;\n- in reality the automatic breakpoint on the last block writes it.\n\n**Each of the 12 in-turn steps** does the same: \"uncached\", input rate, `baseline.blockUncached = true`. In reality each step reads the block and the tail through the automatic breakpoint.\n\n**Result.** The figure charges about 12 × 2,597 tokens × (input − read) that the provider never billed, and reads more negative: the scary number this change exists to remove. Meanwhile §7.3 and the README tell the reader the figure runs low there.\n\nThe real budget-1 cost case is a foreign second tools marker. That is not automatic caching, so there the tail really is billed as input.",
      "recommendation": "**D8 and §5.3 (5).** Count a top-level `cache_control` on the finished clone as a marker after recall's block. With a top-level marker, `applied.block` is then \"cached\" whenever a carrier is found (`pc.md`:304, :509). It is one clause in the derivation. The budget rule (ruling \"marker allowance\") is unchanged.\n\n**§8.1, one test.** Over an API key, a top-level marker, cell (a) set and record (b) null: pi's marker is removed, the before point is placed, and `applied.block` is \"cached\".\n\n**§11 and §7.3.** Change the budget-1 example to a foreign second tools marker. Add one line: a top-level marker leaves the tail cached, because automatic caching marks the last cacheable block.\n\n**context-figures spec.**\n- Row 1: \"The budget-1 in-turn request is this row, unless the payload carries a top-level marker\".\n- \"The block is not inside the charged suffix\": WHEN gains \"and no top-level marker\".\n- The under-reporting list: say \"where another extension's block-level marker leaves budget 1\".\n\nNo new measurement is needed: this is a derivation rule plus wording, grounded in docs the design already cites."
    }
  ],
  "assumptions": [
    {
      "assumption": "A top-level `cache_control` is Anthropic automatic caching. It places a breakpoint on the last cacheable block, uses one of the 4 slots, and is a no-op when the last block already carries the same TTL (`/Users/joelleibow/Projects/taiknr/.pi/marbleization/cache-point-before-recall/michael/pc.md`:48, :304, :509, :535-537).",
      "status": "verified"
    },
    {
      "assumption": "The live provider behaves as `pc.md` says for a top-level marker combined with explicit message breakpoints on the routes D1 covers, including OpenRouter. No probe ran a top-level marker.",
      "status": "unverified"
    },
    {
      "assumption": "Today's `rewriteOf` starts the suffix at `carried.index` when `blockChanged` holds. `blockInNewTail` is `block.index >= previousLength`, and the baseline is reset on compaction and tree jump (`/Users/joelleibow/Projects/taiknr/src/use-cases/instruments-publisher.ts`:185-203, :312-325).",
      "status": "verified"
    },
    {
      "assumption": "`validUsage(stopReason, usage)` rejects aborted, errored and zero-prompt responses. It is the same test `sampleRatio` uses, so the commit handler and the publisher move on the same responses (`/Users/joelleibow/Projects/taiknr/src/domain/calibration.ts`:50-60).",
      "status": "verified"
    },
    {
      "assumption": "All seven round-4 fixes (critic-r4-1 to r4-4, structural-r4-1 to r4-3) are present in design.md and the spec deltas as michael-dr-s3-r4.json required.",
      "status": "verified"
    },
    {
      "assumption": "The N3 and N9 per-request figures quoted in the In-turn scenario and in §8.3 match the logs. I did not open `s-key-h45.log` or `s-key-h45-r23.log`.",
      "status": "unverified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "The probe logs under `/Users/joelleibow/Projects/taiknr/.pi/marbleization/cache-point-before-recall/michael/` other than `pc.md`.",
    "Where Joel's transport places its one message marker (`anthropic-attribution.ts`:1619-1629). The turn 2, request 1 assertion 'a marker on recall's block' assumes it is the last block of the last message.",
    "Whether a top-level marker combined with pi's same-TTL last-block marker counts as a fifth slot when four explicit markers exist. `pc.md`:535 and :537 can be read either way; the design's budget is the conservative reading.",
    "research-eleanor.md, research-attribution-guard.md and council.md, which were not re-read this round.",
    "Latency of `structuredClone` plus the recursive walk on large payloads carrying base64 images."
  ]
}