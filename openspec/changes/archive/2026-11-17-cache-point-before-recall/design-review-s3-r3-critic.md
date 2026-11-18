{
  "mode": "review",
  "lens": "council-critic",
  "paraphrase_proposes": "",
  "paraphrase_existing": "",
  "recommendation": "Needs fixes, with one major item. All seven round-2 critic findings (CR2-1 to CR2-7) and the five structural fixes landed:\n- the context-figures delta now states D8's two-state rule and the five-row table;\n- `AppliedPlacement` is `{ carrierRead, block }`;\n- the replay THEN is limited to re-fires before the commit;\n- the surrogate row is stated per route;\n- the live script resolves an absolute extension path;\n- the carve-out exception is recorded in §6.1 and in the 'survives' scenario;\n- D5 and §11 are calibrated.\n\nDecisions, alternatives, failure order, rollback and the Migration Plan meet feature-spec-standard.\n\n**Major (CR3-1): one tail-recall billing scenario contradicts the budget rule and D8.** It says every request carrying recall's block bills the block as input, 'because pi's marker is no longer on it'. That is true only on a handoff that also recalls. A recalling turn that follows a non-recalling turn keeps pi's marker on the block, so the block is written. That is the most common recalling request, and turn 2's first request in the design's own live script is one.\n\n**Minor items:**\n- **CR3-2:** the recursive marker walk counts `cache_control` keys that are not markers, such as a tool schema property or a key in a tool call's input. A schema property alone can push every recalling turn into the budget-1 in-turn regression that §11 says no route reaches.\n- **CR3-3:** two `before_provider_request` emissions can overlap, a warm replay and the real request, and both write the single `nextCarrier`/`applied` cells. §5.3 (6)'s 'always the request's own' therefore needs a scope or a residual line.\n- **CR3-4:** D1's 'baseUrl on api.anthropic.com' does not say how it is matched, so a substring test would cover a proxy.",
  "findings": [
    {
      "id": "CR3-1",
      "severity": "major",
      "location": "/Users/joelleibow/Projects/taiknr/openspec/changes/cache-point-before-recall/specs/tail-recall/spec.md, requirement 'A recall block does not cost the turn its cached prefix', scenario 'The recalling request reads the previous request's entry'; against design.md §5.3 (4) 'pi's last marker' and 'The budget', D8, and specs/context-figures/spec.md scenario 'The block's charge, by placement and request' row 2",
      "finding": "The WHEN covers any request carrying recall's block on a covered route. The THEN says what it writes is 'the previous turn's final reply, the new prompt and the block, which the provider bills as plain input because pi's marker is no longer on it'.\n\nUnder the design's own rules, pi's marker comes off only when the wanted points plus one do not fit the budget. That happens on a handoff that also recalls (carry + before point), or at budget 1.\n\nOn the first request of a recalling turn that follows a non-recalling turn, only the before point is wanted. Over an API key the budget is 2, and 1 + 1 fits, so pi's marker stays on recall's block, which is the last block of the last message. The block is then cached and written. The context-figures table gives the same answer: 'cached, and new to the last priced request: the write rate'.\n\nIn-turn requests fall under the same WHEN. On those, pi's marker sits on the last tool_result, and the request writes the new step, not 'the previous turn's final reply and the new prompt'.",
      "rationale": "The specs are where acceptance is defined. Here one spec scenario contradicts §5.3 (4)'s budget rule and the context-figures delta's own pricing table.\n\nMichael's council ruling 'read guarantees' scoped this wording to the handoff request: 'The handoff request writes the previous turn's content and the new prompt, and with pi's marker moved it bills the block as input.' The spec widened it to every recalling request.\n\nThe ruling 'block pricing' records the measurement: with pi's marker kept, the block was written (N3 turn 1, 9,490 written including the block).",
      "concrete_case": "Here is the live script of §8.3. Turn 1 recalls nothing because the archive is empty. Turn 2's first request carries B2, so it wants only the before point. That is 3 markers (system, tools, before) plus pi's on B2, 4 in all, so pi's marker stays on B2 and B2 is written.\n\nThe spec scenario says that request bills B2 as input because pi's marker was removed. A tasks author who writes the adapter test 'a recalling request removes pi's marker' from this scenario contradicts §5.3 (4). A Validate reader checking turn 2's first request against the spec gets the opposite of the measured billing.",
      "recommendation": "Narrow the WHEN to 'the first request of a turn that recalls, after a turn that also recalled (a handoff that also recalls)', and keep the THEN as it is for that case (N3: 6,896 read, 1,236 written, 2,597 input).\n\nAdd one line for the other recalling first request: 'when the previous turn recalled nothing, pi's marker stays on the block and the block is written with the new prompt'. Cite the ruling 'block pricing' (N3 turn 1). Exclude in-turn requests, or point them to the context-figures table.\n\nThis is a wording fix and needs no new measurement."
    },
    {
      "id": "CR3-2",
      "severity": "minor",
      "location": "/Users/joelleibow/Projects/taiknr/openspec/changes/cache-point-before-recall/design.md §5.3 (4) 'A marker, and pi's message marker' and 'The budget'; D2; §11 'Budget 1 bills the in-turn tail as input'",
      "finding": "A marker is defined as 'any `cache_control` key found by a recursive walk', and the budget counts every such key on the normalized clone. Two kinds of payload data can carry that key without being a marker:\n- the JSON schema of a tool, `tools[*].input_schema.properties`;\n- a tool call's `input` object under `messages`.\n\nA key in a schema lowers the budget on every request of the session. A key in a tool call's input makes a second 'message-level marker', which stops every message-level edit while that call stays in history.",
      "rationale": "§11 accepts the budget-1 regression only because 'it needs a foreign marker' and 'no measured route reaches budget 1'. A false-positive count reaches it with no foreign marker at all.\n\nThe tool_use case only fails open, so it costs today's loss. The schema case costs more than today: the in-turn tail is billed as input on every step. Anthropic accepts `cache_control` only on blocks, tools and the top level. A key inside a schema or a tool call's input is never a breakpoint.",
      "concrete_case": "Take an API-key session with an MCP tool whose schema has a parameter named `cache_control`, as a tool wrapping the Messages API would.\n\nThe walk counts system, tools and the schema key, so the budget is 4 − 3 = 1. On every in-turn request of a recalling turn, the before point (1) plus one does not fit. pi's last marker is removed, and each step re-sends the turn's tool-result tail uncached. That is §11's 'roughly ten times today's read-equivalent cost' over a 12-step, 30k-token tail, and it recurs on every recalling turn of the session.\n\nSeparately, a handoff that also recalls wants 2 points against a budget of 1. It does not fit, so the carry is lost.",
      "recommendation": "Count a key only where the value is an object whose `type` is `\"ephemeral\"`. That is a one-line test in the walk, and it still finds the nested tool_result marker that round 1 asked for. Do not descend into `tool_use.input` or `input_schema` either.\n\nAdd one adapter test: a tool schema with a `cache_control` property leaves the budget at 2."
    },
    {
      "id": "CR3-3",
      "severity": "minor",
      "location": "/Users/joelleibow/Projects/taiknr/openspec/changes/cache-point-before-recall/design.md §5.1 step 2; §5.3 (6) 'applied at message_end is always the request's own'; §11",
      "finding": "`nextCarrier` and `applied` are single cells, and every payload call overwrites them (§5.1 step 2).\n\nThe previous request's cache warmer stays alive until the next request's `streamFn` calls `cacheWarmer.start` (`sdk.js:261-270`). So a warm replay can be in its `before_provider_request` chain while the real request's chain also runs. The runner serialises handlers within one emission but holds no lock across emissions (`runner.js:1074-1102`).\n\nIf an earlier extension's handler awaits I/O on the replay's chain, taiknr's replay call can land after taiknr's call for the real request. It then overwrites the real request's `nextCarrier` and `applied` before that request's `message_end` reads them.",
      "rationale": "The ordering is rare. It needs a slow asynchronous handler from another extension, plus a replay timer that fires within milliseconds of the real request's `streamFn`.\n\nBut §5.3 (6) states without qualification that `applied` at `message_end` is always the request's own. A clobber means the wrong record is committed, and that costs a real carry.",
      "concrete_case": "H is turn 3's first request, a handoff that also recalls. Just before H's `streamFn`, the warmer fires a replay of turn 2's last request, which stalls behind an earlier extension's async `before_provider_request` handler. H's chain runs taiknr first and writes `nextCarrier = U3`.\n\nThe replay's taiknr call then runs:\n- cell (a) is now B3, and the replayed payload carries B2, so no carrier is found;\n- it writes `nextCarrier = null` and `applied.block = null`.\n\nAt H's `message_end`:\n- the commit handler commits null, so turn 4's first request places no carry and rewrites the prefix, which is today's loss;\n- the publisher prices H's block as cached instead of at the input rate.",
      "recommendation": "Do not add machinery. Either qualify §5.3 (6) with 'unless another extension's async handler lets a warm replay's call land after this request's', or add one line to §11 with this concrete case and its cost: one lost carry and one mispriced request."
    },
    {
      "id": "CR3-4",
      "severity": "minor",
      "location": "/Users/joelleibow/Projects/taiknr/openspec/changes/cache-point-before-recall/design.md D1; §5.3 (3); specs/tail-recall/spec.md 'Only routes the predicate covers change'",
      "finding": "D1 says a baseUrl 'on api.anthropic.com' without saying how it is matched. It also does not say what happens when the baseUrl is missing or cannot be parsed.",
      "rationale": "This predicate is the one trust boundary that decides whether a payload may change, and the spec promises a proxy keeps a byte-identical payload. A prefix or substring test would break that promise. An unparsable baseUrl that throws inside `edit` does fail open through the catch path, but that leaves the contract to luck.",
      "concrete_case": "Provider `anthropic` with baseUrl `https://api.anthropic.com.corp-proxy.internal` or `https://gw.corp/api.anthropic.com/`. A `startsWith` or `includes` check covers either one, so a proxy receives the edit, which the spec scenario 'A provider pointing at a proxy keeps today's payload' forbids.",
      "recommendation": "State the rule as `new URL(baseUrl).hostname === \"api.anthropic.com\"`, and treat a missing or unparsable baseUrl as uncovered. Add both proxy shapes as rows in the route-table test."
    }
  ],
  "assumptions": [
    {
      "assumption": "The previous request's cache warmer stays alive through the next request's `context_with_system` handler, the classifier await included. `cacheWarmer.start` runs only inside the next request's `streamFn`, after `transformContext` (`sdk.js:261-273`; `cache-warmer.js` `start`/`clearRun`).",
      "status": "verified"
    },
    {
      "assumption": "A replay during the classifier await carries no before point, because cell (a) is cleared or set to the new block. This does not expire the before-point entry. The default classifier timeout is 5,000 ms (`taiknr-config.ts:21`), and the warm margin at a 5-minute TTL is 30 s (`cache-warming.js:17-21`).",
      "status": "verified"
    },
    {
      "assumption": "`emitBeforeProviderRequest` awaits handlers in load order within one emission and holds no lock across emissions (`runner.js:1074-1102`).",
      "status": "verified"
    },
    {
      "assumption": "Today's `rewriteOf` and `netDollars` match the design's description of the pre-change rule: `blockInNewTail = block.index >= previousLength`, and the warm read rate otherwise (`instruments-publisher.ts:185-203`; `savings-dollars.ts:56`). `compacted()` and `treeJumped()` reset the baseline (`instruments-publisher.ts:312-325`).",
      "status": "verified"
    },
    {
      "assumption": "`context.ts` has five early returns before recall: status, prompt, window, budget and empty outputs. 'Cleared at every `context_with_system`' is correct only if the clear comes before the first of them.",
      "status": "verified"
    },
    {
      "assumption": "No tool schema in Joel's or Derek's setup declares a property named `cache_control`.",
      "status": "unverified"
    },
    {
      "assumption": "The N1–N8 numbers and the 132-of-132 fit are as Michael reports them. I did not open the logs under `.pi/marbleization/`.",
      "status": "unverified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "research-chidi.md, research-eleanor.md, research-attribution-guard.md, council.md and specs/development-checks/spec.md were not re-read this round.",
    "Whether `tests/support/fake-pi.ts` dispatches two `message_end` handlers and a `before_provider_request` return value the way the runner does.",
    "Latency of `structuredClone` plus a recursive walk on payloads carrying many base64 images, and the memory of an image fingerprint held in record (b).",
    "Whether `pi auth check --no-refresh` reports `ready` for an expired but refreshable OAuth token."
  ]
}