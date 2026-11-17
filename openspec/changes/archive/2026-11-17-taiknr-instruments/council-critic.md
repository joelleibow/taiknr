{
  "assumptions": [
    {
      "assumption": "pi re-runs the extension factory for each session (`/new`, `/resume`, `/fork`, `/reload`), so in-memory figure state and k reset with the factory's closures.",
      "status": "unverified"
    },
    {
      "assumption": "`ClassifierResult.usage` is optional and may be present on error results; the current adapter drops it on every path.",
      "status": "verified"
    },
    {
      "assumption": "buildStub embeds the entry id (`[archived <id>]`), so matching stubs exactly against a request's first text block is unambiguous.",
      "status": "verified"
    },
    {
      "assumption": "The session_start handler contains no await today, so registering before the first await is trivially met.",
      "status": "verified"
    },
    {
      "assumption": "tsconfig lacks verbatimModuleSyntax; enabling it passes on existing imports.",
      "status": "unverified"
    },
    {
      "assumption": "Jefferson's TUI repaints while `context_with_system` awaits classify, so the in-flight flash is visible at all.",
      "status": "unverified"
    },
    {
      "assumption": "The cost of building a projection and estimating it on Joel's largest sessions is small enough to run once per published event.",
      "status": "unverified"
    }
  ],
  "findings": [
    {
      "concrete_case": "pi-taiknr.json sets the switch false and the user's pi-jefferson.json has no taiknr rows. On the first `context_with_system`, taiknr emits the figure updates and a TUI warning 'pi-jefferson: taiknr reports \"…\" without a registration' appears. That contradicts 'only the instruments are absent' (J8).",
      "finding": "The deltas don't say how the publishing handlers go quiet when the instruments switch is off. The gate only checks `session.isActive()`, and the spec forbids each handler from testing the switch itself.",
      "id": "CR1",
      "location": "specs/jefferson-instruments/spec.md, 'Nothing registers while taiknr is off or unconfigured' / 'The switch is read in one place'; src/app/extension/handler-gate.ts L11-21",
      "rationale": "With `enabled: true` and the switch false, every publishing handler on `gatedPi` still runs and emits `jefferson:update`. Jefferson's `vetReport` refuses those updates with `<ext> reports \"<field>\" without a registration` (Chidi A1, listener L202-207). So the user gets a warning, and taiknr still builds a projection on every event for nobody.",
      "recommendation": "Make the switch's one home the factory that builds a single publisher at `session_start`. It returns a real publisher when the session registers, and a no-op one otherwise. Handlers call the publisher and nothing else, and they skip the figure arithmetic when it is the no-op. Name this in design.md as the meaning of 'read in one place'.",
      "severity": "major"
    },
    {
      "concrete_case": "A classify call times out after spending tokens and returns `stopReason: \"error\"` with `usage.cost.total = 0.0004`. The adapter throws a notice, and the use case catches it and returns []. The net dollars never subtract the $0.0004. The only workaround left inside the frozen list is to proxy `ctx.modelRegistry.classify` inside the context handler, which is a hack on a host object.",
      "finding": "Nothing on the frozen list lets the classifier's `result.usage` reach the dollar figures. The adapter reads `classify`'s result and returns only `RelevanceScore[] | undefined`, so the usage is dropped. On the error and timeout paths it throws, and the usage is lost there as well.",
      "id": "CR2",
      "location": "specs/context-figures/spec.md 'Recall's classifier spend is inside the net'; specs/extension-packaging/spec.md 'Signatures unchanged' difference (5); src/infra/adapters/pi-jev-scorer-adapter.ts L50-89; src/use-cases/ports.ts RelevanceScorer",
      "rationale": "Q2(a) requires subtracting each classify result's reported cost. An infra wrapper around `RelevanceScorer` (the cheap O2 seam) only sees scores. Difference (5) only allows a port member 'for the classifier observation' (in flight plus count), not a cost channel. And `createPiJevScorerAdapter(ctx, config)` is frozen.",
      "recommendation": "Add one named difference in the extension-packaging delta for the cost seam. For example, an optional observer parameter on `createPiJevScorerAdapter`, called with `result.usage` before every return or throw, including the aborted and error paths. Or widen difference (5) so it explicitly covers classifier usage. Either way, the record should be read at the single `classify` call site.",
      "severity": "major"
    },
    {
      "concrete_case": "A request saves 1,200 tokens, and the new response's measured prompt comes in 1,560 above k_old × estimate. The published saving becomes 1,200 − 1,560 = −360 tokens, a negative saving caused by the measurement, not by taiknr. It then flows into the 'since start' total.",
      "finding": "The saving is defined as history before − context in turn. After the response, context in turn becomes measured while history before stays k × estimate. The per-request saving then absorbs the miss in predicting one request from the last, and at p90 that miss is larger than the saving itself.",
      "id": "CR3",
      "location": "specs/context-figures/spec.md 'A request's saving is the difference between two figures' and 'Context in turn, before and after the response'",
      "rationale": "M3 puts that miss at a median of about 340 tokens against a median per-settlement saving of about 1,200 (21 % at the median, 130 % at p90). S3's own identity, withheld − stubbed − recalled, avoids the mixing when all three terms use one k.",
      "recommendation": "State in the spec that the per-request token saving is computed as k × (withheld − stubbed − recalled) estimates with one k. Never subtract a measured figure from an estimated one. Measured context in turn is published as its own figure only.",
      "severity": "major"
    },
    {
      "concrete_case": "A recall turn sends a 20k-token block on a 200k persisted history. Measured prompt = 220k and the bar reads 110 % of the persisted value. At the next settlement's k × estimate it falls back about 20k, so the user sees a sawtooth tied to recall.",
      "finding": "Total context is defined as the persisted history, which excludes recall's block (T4). But it is also 're-anchored at each response's usage', and that usage includes the block. The two definitions conflict.",
      "id": "CR4",
      "location": "specs/context-figures/spec.md 'Total context comes from the persisted projection'; michael-orientation S8 row 'total context'",
      "rationale": "If re-anchoring sets total context to the measured prompt, the bar, which is total context ÷ window (S2), jumps by the block's size on every recall turn. It then drops again when the next figure is re-estimated. That is a smaller copy of the jump this change exists to remove.",
      "recommendation": "Have the spec define re-anchoring as refreshing k from the response. Total context then stays k × estimate(persisted projection) and never takes the measured prompt. Add a scenario: on a recall turn, total context does not include the recalled figure.",
      "severity": "major"
    },
    {
      "concrete_case": "The bar reads 92 %. Compaction runs and the projection drops to about 50k tokens. The taiknr bar keeps showing 92 % in error colour until the next `context_with_system`, while the README says taiknr's figure is the reliable one after a compaction.",
      "finding": "The deltas and O1 name only request, response and settle points for publishing. Neither says total context and the bar must be re-posted at `session_compact` and `session_tree`, which change the projection.",
      "id": "CR5",
      "location": "specs/jefferson-instruments/spec.md 'Every declared field carries a value…' (keep each current as its event arrives); michael-orientation O1",
      "rationale": "Only `session_shutdown` clears a field (Chidi A1), so the bar keeps its last value. After a compaction, pi's own figure is null (T3) and the docs promise that taiknr's number stands in. A stale pre-compaction value misinforms at exactly that moment.",
      "recommendation": "Require a total-context and archive re-post from the existing `session_compact` and `session_tree` handlers. Their bodies change, not their signatures, so no new event is needed. Add a scenario for each.",
      "severity": "major"
    },
    {
      "concrete_case": "Turn N recalls a block into user message N. On turn N+1, message N is sent plain, so every token from N onward (say 60k) is written at about $5/M instead of read at about $0.5/M. That is about $0.27, and none of it is charged to taiknr.",
      "finding": "The requirement fixes the rewrite charge to 'the first warm request after a settlement'. It says nothing about the rewrite that recall causes. Recall's block is appended to the latest user message and is not persisted, so on the next user turn that message goes out without the block, and the cache is re-written from that message onward.",
      "id": "CR6",
      "location": "specs/context-figures/spec.md 'Dollar savings are net of cache rewrites…' (requirement text and 'A warm request after a settlement')",
      "rationale": "That cost exists only because taiknr recalled. Leaving it out overstates the net dollars, which breaks 'don't misinform' and S4's 'last recall block' input. The orientation lists it as open (O6), but the delta's text reads as settled with settlement-only charging.",
      "recommendation": "Reword the requirement so the rewrite charge covers 'the first warm request after any change taiknr made to an earlier message: a settlement's stubs or the removal of a previous recall block'. Leave the exact rule to O6.",
      "severity": "major"
    },
    {
      "concrete_case": "`getContextUsage()` returns undefined at the very first `session_start` (no model). taiknr has to post something for the window. If it posts nothing, every instrument whose format reads the window renders blank.",
      "finding": "Jefferson's bar function reads only taiknr's own fields, so the window must be posted as a field. A report cannot carry null or undefined (Chidi A1), so 'window unknown' needs a sentinel. That collides with the rule 'never a placeholder'.",
      "id": "CR7",
      "location": "specs/jefferson-instruments/spec.md 'No window' / specs/context-figures/spec.md 'Every figure is a finite number… never a placeholder'",
      "rationale": "Without a stated sentinel, an implementer either leaves the window field unposted, which blanks any format naming `$bar`, or posts a guess.",
      "recommendation": "Declare that the window field posts 0 when unknown and the bar function maps a window ≤ 0 to null. Say the window is an input field, not one of the six figures, so the placeholder rule doesn't apply to it.",
      "severity": "minor"
    },
    {
      "concrete_case": "The last persisted request carried a 20k-token recall block on 80k persisted tokens. The seeded k comes out about 25 % high, and after `/reload` every figure reads about 25 % high until the next response.",
      "finding": "A seed taken from the persisted projection at the response's parent leaves out recall's block (T4), but the response's usage includes it. So the seeded k is biased high in proportion to the block.",
      "id": "CR8",
      "location": "specs/context-figures/spec.md 'A resumed session seeds k'",
      "rationale": "The seed is used for every figure until the first live response arrives.",
      "recommendation": "Keep the 'not yet calibrated' flag on while k is seeded, and clear it only on a live sample. Or seed from the median ratio of the last few valid responses, which damps a single recall outlier. Pick one in the design.",
      "severity": "minor"
    },
    {
      "concrete_case": "The user picks a virtual model that routes to anthropic/claude-opus-5-5. Every response reports the routed pair, so none matches `ctx.model`. k stays at 1 with the flag on for the whole session, and the jump is never resolved.",
      "finding": "'Samples from the current provider and model' is ambiguous for a virtual model. `ctx.model` can differ from the provider and model that each response reports.",
      "id": "CR9",
      "location": "specs/context-figures/spec.md 'One ratio per model'; research-chidi B7 (`_limitsModel`, routedModel)",
      "rationale": "Chidi did not trace the virtual-model case (T6). If 'current' means `ctx.model`, no response ever matches it.",
      "recommendation": "Define 'current' as the provider and model of the newest valid response. A response from a different pair starts a new k.",
      "severity": "minor"
    },
    {
      "concrete_case": "A later edit writes `import { Registration } from \"pi-jefferson/instruments\"`. Biome warns, lint exits 0 (M6), tsc passes, and Joel's checkout loads fine (M5). It breaks for any install without devDependencies.",
      "finding": "The delta relies on review to catch a value import of `pi-jefferson`, but a standard compiler flag would catch it in `npm run check`.",
      "id": "CR10",
      "location": "specs/extension-packaging/spec.md 'The type keyword is the only thing that keeps it out'; tsconfig.json",
      "rationale": "With `\"verbatimModuleSyntax\": true`, tsc rejects importing a type-only export without `type` (TS1484). The flag is not set today (tsconfig.json). The existing load check runs on a `git archive HEAD` copy, which has no node_modules, so a value import that survives to runtime should also fail to load there.",
      "recommendation": "Add `verbatimModuleSyntax: true` to tsconfig (and fix any existing imports it flags, which I have not checked). Name the git-archive load check as the runtime backstop instead of 'the review reads for it'.",
      "severity": "minor"
    },
    {
      "concrete_case": "A typo posts `field: \"withheldTokens\"` where the declared field is `withheld`. tsc is silent, Jefferson refuses it at runtime in TUI only, and only a test that enumerates every post catches it.",
      "finding": "The delta puts field names and types entirely on runtime tests. tsc could enforce both for free.",
      "id": "CR11",
      "location": "specs/jefferson-instruments/spec.md 'What Jefferson cannot confirm, taiknr's own tests pin down'",
      "rationale": "`Report.value` is not tied to the declared field (T10). A single `as const` field table plus a typed `post<K>(field: K, value: FieldTypeOf<K>)` makes an undeclared field or a wrong type a compile error. That leaves only finiteness for tests.",
      "recommendation": "Make one module-constant field table the canonical source. Derive the registration's `fields` and the publisher's types from it, and keep one assert-based finiteness test.",
      "severity": "minor"
    },
    {
      "concrete_case": "A tool loop of 30 tool results in one turn triggers 30+ `message_end` events. Each rebuilds a projection of about 600k tokens to re-post a total context that has not changed.",
      "finding": "The cost of rebuilding the projection and estimating it is unmeasured. That cost is paid for total context, and `getContextUsage()` itself rebuilds the projection (Chidi B7). Every pi process that loads taiknr pays it, including non-TUI ones whose Jefferson renders nothing (`startup.ts:112`).",
      "id": "CR12",
      "location": "proposal.md Impact; michael-orientation 'What this pass did not cover' (projection cost untraced)",
      "rationale": "Joel's sessions reach 558k–674k tokens (M2), about 2.4M characters, and `estimateTokens` JSON-stringifies tool arguments. If publishing runs on every `message_end` (every user, tool-result and custom message), that rebuild repeats many times per turn.",
      "recommendation": "Publish total context only where it changes: `session_start`, after commit, compaction or `/tree`, and the assistant's `message_end`. Compute it once per event. Measure one rebuild on `…01a1dd10` before choosing the O1 events.",
      "severity": "minor"
    },
    {
      "concrete_case": "A 200k-token session with 150k withheld over 40 requests shows about 6M tokens 'saved since start'. A user reads that as context saved and concludes the figure is broken.",
      "finding": "Summing per-request savings counts each stub once for every request that carries it. The 'since start' token total therefore grows far past the context size.",
      "id": "CR13",
      "location": "specs/context-figures/spec.md 'The cumulative saving counts from the current start'",
      "rationale": "That is correct as 'tokens not sent', and it is what the dollars need. But a label that reads like a context reduction misinforms.",
      "recommendation": "Have the spec name the cumulative token figure 'tokens not sent since start'. Have the README example label it that way, separate from the per-request context saving.",
      "severity": "minor"
    },
    {
      "concrete_case": "`/new` while a classify call is in flight. The old handler's `finally` emits on a stale ctx, the emit throws, and the throw escapes the `finally`.",
      "finding": "The 'not running' reset will naturally sit in a `finally`. A throw from that emit (stale ctx, `loader.js:426-430`) replaces the handler's return value, so recall's messages are lost: T12 again, in a new spot.",
      "id": "CR14",
      "location": "specs/jefferson-instruments/spec.md 'A call ends any way'; T12",
      "rationale": "'Every publish SHALL be contained' covers this only if the design applies it to the `finally` path as well.",
      "recommendation": "Route every emit, including the reset, through the publisher's single try/catch. Add one handler test where emit throws in the reset and recall still returns its messages.",
      "severity": "minor"
    }
  ],
  "lens": "council-critic",
  "mode": "council",
  "not_checked": [
    "Projection rebuild timing on real sessions",
    "Whether TS1484 under verbatimModuleSyntax flags existing taiknr imports",
    "Virtual-model ctx.model getter (runner.js:650)",
    "Other extensions' context_with_system handlers running after taiknr's and changing the request that k is sampled against",
    "Non-Anthropic usage normalization for the prompt = input+cacheRead+cacheWrite rule",
    "Jefferson repaint behaviour live"
  ],
  "owner_questions": [],
  "paraphrase_existing": "",
  "paraphrase_proposes": "",
  "recommendation": "Go ahead with the design, but first close six major holes in the deltas. (1) With the switch off and `enabled` on, the gated handlers still publish, so Jefferson raises warnings. (2) No allowed seam carries the classifier's cost into the net dollars, so Q2(a) cannot be built as frozen. (3) A per-request saving that subtracts a measured figure from an estimated one is mostly noise. (4) The rule that 're-anchors' total context to usage folds recall's block back in and creates a new jump. (5) Total context is not re-posted at compaction or `/tree`. (6) The dollar rule charges settlement rewrites but not the rewrite that dropping recall's block causes. The rest are minor fixes that are cheap and enforced by the build checks."
}