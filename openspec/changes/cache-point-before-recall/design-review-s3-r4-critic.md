{
  "mode": "review",
  "lens": "council-critic",
  "paraphrase_proposes": "",
  "paraphrase_existing": "",
  "recommendation": "**Verdict: needs fixes, with one major item.**\n\nAll seven round-3 fixes landed (critic-r3-1 to r3-4, structural-r3-1 to r3-3):\n- the tail-recall billing scenario is split into a handoff that also recalls, a recalling request after a turn that recalled nothing, and in-turn requests;\n- the marker walk counts only `ephemeral` objects and skips `input_schema` and `tool_use.input`;\n- D1 matches the host exactly with `new URL(...).hostname`;\n- the late-warm-replay overwrite is qualified in §5.3 (6) and recorded in §11;\n- §5.2 says four fields and three writers;\n- the inertness citation points to the archived configuration-loader D3;\n- §8.2 cites `dr-s3-r3-auth.log`.\n\nDecisions, alternatives, failure order, rollback and the Migration Plan still meet feature-spec-standard.\n\n**Major (CR4-1): the new 'In-turn requests' scenario contradicts its own evidence.** It says a later request in a recalling turn 'writes only the new step'. That is false for the second request after a handoff that also recalls. That request also writes recall's block, which the turn's first request billed as plain input: N3 wrote 2,682, and N9's turn 3, request 2 wrote 2,675. N9 is the scenario's own citation, and context-figures' table row 2 prices exactly this write. The fix is one clause.\n\n**Minor:**\n- **CR4-2:** neither an adapter test nor a live assertion proves the new 'recalling request after a turn that recalled nothing' shape, even though the live script's turn 2, request 1 is that request.\n- **CR4-3:** D8's 'null only when the request carries no block' conflicts with §11 and §6.1 when a carrier cannot be found. Read literally, it prices a cached block at the input rate.\n- **CR4-4:** the budget-1 in-turn regression that §11 records is not charged by the figure, and the README's under-reporting list leaves it out. Separately, a provider that never calls `onPayload` leaves the previous request's `applied` in place, so the next response is priced with the wrong placement.",
  "findings": [
    {
      "id": "CR4-1",
      "severity": "major",
      "location": "/Users/joelleibow/Projects/taiknr/openspec/changes/cache-point-before-recall/specs/tail-recall/spec.md, requirement 'A recall block does not cost the turn its cached prefix', scenario 'In-turn requests'; against specs/context-figures/spec.md scenario 'The block's charge, by placement and request' row 2, and michael-dr-s3-r3.json critic-r3-1 evidence",
      "finding": "The scenario is new this round. Its WHEN covers every later request of a recalling turn where the wanted points plus one fit the budget. Its THEN says 'pi's marker stays on the last `tool_result`, so the request writes only the new step', citing N9.\n\nThat holds only when the turn's first request left the block cached. After a handoff that also recalls, the first request removed pi's marker and billed the block as plain input. The second request therefore writes the block as well as the new step.",
      "rationale": "The scenario's own evidence contradicts it. Michael's dr-s3-r3 record for N9 lists turn 3, request 2 at 'read 9,274 / write 2,675', after a turn-3 first request billed 2,597 as input. N3's turn-2 second request wrote 2,682.\n\nThe context-figures delta states the same fact as a pricing row: 'cached, and new to the last priced request or left uncached by it: the write rate (2,682 on N3's next request)'. So the two spec files disagree about the same request.\n\nThe feature-spec standard (§6) requires every statement about measured behaviour to match the cited evidence. This is the same class of defect as CR3-1, introduced by that fix.",
      "concrete_case": "The live script of §8.3 runs turns 2 and 3 that both recall.\n- H (turn 3, request 1) wants the carry and the before point. At budget 2, pi's marker yields, and the block is billed as input (2,597).\n- Turn 3, request 2 wants only the before point. 1 + 1 fits, so pi's marker sits on the new `tool_result`. That request writes 2,675 tokens: the 2,597-token block plus the step.\n\nA Validate reader checking that request against 'writes only the new step' sees a failure where the design is working. A tasks author writing a billing check from this scenario encodes the wrong bound.",
      "recommendation": "Change the THEN to:\n\n> 'pi's marker stays on the last `tool_result`, so the request writes the new step, plus recall's block when the turn's first request billed it as input (N3: 2,682; N9 turn 3, request 2: 2,675), and the block is priced by context-figures' \"The block's charge, by placement and request\" (N9)'.\n\nThis is wording only and needs no new measurement."
    },
    {
      "id": "CR4-2",
      "severity": "minor",
      "location": "/Users/joelleibow/Projects/taiknr/openspec/changes/cache-point-before-recall/design.md §8.1 adapter tests and §8.3 'Assertions on H'; specs/tail-recall/spec.md scenario 'A recalling request after a turn that recalled nothing'",
      "finding": "The scenario added in round 3 has no proof. It says that when only the before point is wanted, pi's marker stays on recall's block and the block is written.\n- **Adapter tests (§8.1):** none asserts that a before-point-only request over an API key keeps pi's marker on recall's block with four markers in all. The closest test, 'a carrier that still ends with recall's block places no carry, so only the before point is placed', says nothing about pi's marker.\n- **Live script (§8.3):** it asserts only on H. Turn 2, request 1 is exactly this case: turn 1 recalls nothing because the archive is empty.",
      "rationale": "Ruling 'how scenarios are proven' splits proof two ways:\n- payload shape is proven by automated adapter tests;\n- billing is proven by a live assertion at Validate.\n\nThis scenario has a shape half (where pi's marker stays) and a billing half (8,030 read, 2,694 written, 3 input). Neither half is covered.\n\nThe 'pi's last marker stays when the wanted points plus one fit' branch is the most common recalling request, and nothing pins it.",
      "concrete_case": "An implementation can get this branch backwards: it removes pi's marker whenever any point is placed. Every §8.1 test still passes:\n- the handoff tests expect removal anyway;\n- the in-place test checks only the before point.\n\nOn the live run, H's assertions still pass. Meanwhile every first request of a recalling turn after a quiet turn bills the block as input, and its next request rewrites it. The regression ships unseen.",
      "recommendation": "Add one adapter test: over an API key, a request with cell (a) set and no record. The before point goes on the block before recall's block, pi's marker stays on recall's block, and there are four markers in all.\n\nIn §8.3, add two assertions on turn 2, request 1:\n- a marker on recall's block and on the block before it;\n- `write ≥ ⌈chars(turn 2's block) / 8⌉`, which fails if the block went out as input."
    },
    {
      "id": "CR4-3",
      "severity": "minor",
      "location": "/Users/joelleibow/Projects/taiknr/openspec/changes/cache-point-before-recall/design.md D8 ('null only when the request carries no block'), §5.3 (5); against §6.1 row 'A lone surrogate inside the block' and §11 'pi's marking could drift'",
      "finding": "D8 and §5.3 (5) say `applied.block` is null 'only when the request carries no block', and 'uncached' when no marker sits on recall's block or on any block after it.\n\nThey do not say what 'carries' means when cell (a) is set but no carrier matches. That happens with a lone surrogate on Joel's route, or after a drift in pi's rule. §11 says `applied.block` is then null. D8, read literally, says the request carries a block and nothing marks a block the adapter never located, which gives 'uncached'.",
      "rationale": "State each rule once. As written, the derivation in D8 and the outcome in §11 disagree on a reachable input, and the two readings price the block differently: the input rate versus the cached rows.",
      "concrete_case": "Joel's route, recall's block containing a lone surrogate. His transport writes U+FFFD, so no payload block equals cell (a) and no carrier is found. pi's marker still sits on the block, so the block is cached and written.\n\nAn implementer who follows D8 literally sets `applied.block = \"uncached\"`. The publisher then:\n- prices the block at the input rate;\n- stores `blockUncached: true`;\n- charges the next request's read of that block at the write rate.\n\nThat is two mispriced requests per affected turn.",
      "recommendation": "In D8, write: 'null when no carrier is found, which includes a request carrying no block'. Add one adapter test: cell (a) set, no matching block, `applied.block` null."
    },
    {
      "id": "CR4-4",
      "severity": "minor",
      "location": "/Users/joelleibow/Projects/taiknr/openspec/changes/cache-point-before-recall/design.md §7.3 'What still under-reports', §11 'Budget 1 bills the in-turn tail as input', §5.1 step 2; specs/context-figures/spec.md 'The under-reporting is recorded where the figure is read'",
      "finding": "Two gaps in figure honesty, each needing only a line.\n\n(a) **The figure does not charge the budget-1 regression.** At budget 1, every in-turn request of a recalling turn moves pi's marker off the tail. Each step re-sends the turn's tool-result tail uncached, which §11 accepts. D8 charges only the block at the input rate. `blockChanged` is false in-turn, so the rewrite term is 0, and the tail's extra cost of (input − read) per step is charged nowhere. §7.3 and the README list both omit this case.\n\n(b) **A provider that never calls `onPayload` leaves stale state.** taiknr's handler then never fires, so `state.applied` keeps the previous covered request's value, and the next valid `message_end` prices with it. Every built-in pi-ai streaming API calls `onPayload`, so this needs an extension-registered provider whose `streamSimple` ignores it.",
      "rationale": "Ruling Q2(a) is 'fix cost, make the figure honest'. Ruling Q3(a) and 'under-reporting home' require each known under-report to be recorded in the README.\n\nCase (a) is one the design itself creates and has already quantified at about ten times today's read-equivalent cost. It belongs in the one home for under-reporting.\n\nCase (b) is the same stale-`applied` defect that the §5.1 ordering guards against, reached by a path that ordering cannot cover.",
      "concrete_case": "(a) An API-key session where another extension sets a top-level `cache_control`. A 12-step recalling turn with a 30k-token tail bills about 30k × 11 tokens as input instead of read. The figure shows only the block at the input rate, so the net reads close to zero while the real cost rises.\n\n(b) A covered handoff that also recalls leaves `applied = {block: \"uncached\", carrierRead: R}`. The user then switches with `/model` to a custom provider that never calls `onPayload`. That request's block is priced at the input rate, and its baseline stores `blockUncached: true`, so the next request is charged the write rate for a read.",
      "recommendation": "Add (a) to §7.3 and to the README under-reporting list, with the spec scenario's list extended to name 'requests where a foreign marker leaves budget 1'.\n\nAdd (b) as a §11 residual with this concrete case. No mechanism is needed: guarding it would require a second writer to `applied`."
    }
  ],
  "assumptions": [
    {
      "assumption": "All seven round-3 fixes are present in design.md and the spec deltas as Michael's dr-s3-r3 required: D1 hostname, the §5.3 (4) walk, the §5.3 (6) qualifier, the §11 replay residual, the §5.2 field count, the §8.2 auth log, the inert citation, the split tail-recall scenarios, and N1–N9 in §1.",
      "status": "verified"
    },
    {
      "assumption": "Today's `netDollars` prices the block as `warm && !blockInNewTail ? readRate : writeRate`, and `inputRate` comes from the response's own input component (`src/domain/savings-dollars.ts:40-58`).",
      "status": "verified"
    },
    {
      "assumption": "A request is priced in `responseReceived` exactly when `pending` exists and `sampleRatio` gives a value. `sampleRatio` requires `validUsage`, the same test the commit handler uses, so the publisher's baseline and record (b) move on the same responses except when `pending` is missing (`instruments-publisher.ts:239-283`; `calibration.ts:50-61`).",
      "status": "verified"
    },
    {
      "assumption": "pi builds user prompts as array content (`agent-session.js:1570`, `:1886`, `:1901`), and `convertMessages` keeps arrays as arrays (`anthropic-messages.js:1277-1310`). So after recall's block leaves a message, the previous carrier is array content and the carry is not skipped for string content.",
      "status": "verified"
    },
    {
      "assumption": "A warm replay is scheduled from `streamFn` (`CacheWarmer.start`). It can fire during tool execution after `message_end`, writes no `message_end`, and is aborted by the next `start` (`cache-warmer.js`).",
      "status": "verified"
    },
    {
      "assumption": "Every built-in pi-ai streaming API that is used as an agent model calls `onPayload`. `cloudflare-workers-ai-system-one`, `typesafe-system-one` and `openai-decisions` do not, but they are not agent streaming APIs.",
      "status": "unverified"
    },
    {
      "assumption": "Some extension-registered provider exists whose `streamSimple` ignores `onPayload`.",
      "status": "unverified"
    },
    {
      "assumption": "The N3 and N9 per-request numbers are as Michael's rulings and dr-s3-r3 report them. I did not open the logs under `.pi/marbleization/`.",
      "status": "unverified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "research-chidi.md beyond its header and verdict lines; research-eleanor.md, research-attribution-guard.md and council.md were not re-read this round.",
    "The probe logs under `.pi/marbleization/cache-point-before-recall/michael/` (N3, N9, `dr-s3-r3-*.log`).",
    "Whether `tests/support/fake-pi.ts` dispatches two `message_end` handlers and a `before_provider_request` return value the way pi's runner does.",
    "Latency of `structuredClone` plus the recursive walk on payloads carrying many base64 images.",
    "Whether the spec deltas' use of design labels ('D1', 'record (b)', `applied.block`) breaks the standard's 'mechanism belongs in the design' rule. Michael chose that wording in an earlier round, so I did not reopen it."
  ]
}