{
  "mode": "council",
  "lens": "council-codebase",
  "paraphrase_proposes": "Move pi's cache point off recall's block so a request carrying the block reads its prefix and writes only from the block onward, add a second point one request later so the next turn reaches an entry the recalling turn wrote, act only on routes with a measured result (Anthropic OAuth and API key, Anthropic via OpenRouter, Joel's attribution route after his guard relaxation), and change the dollar rule so the rewrite charged is the one the provider performed. A new ADR narrows ADR 0007's measured-false consequence, the README explains an honest negative figure and names decisionThreshold, and .envrc stays gitignored. Acceptance is the real read/write split in a live session, not the figure.",
  "paraphrase_existing": "Recall appends one trailing <recalled_context> text block to the newest user message at context_with_system and persists nothing; pi marks the last block of the last payload message after that, so the marker lands on recall's block and every entry written during a recalling turn becomes unusable to the next turn. The instruments publisher keeps a per-session baseline (the block's message index, timestamp and tail text) and prices a rewrite from that message; netDollars charges only when the response is warm and the rewrite as max(0, writeRate-readRate) over an estimated suffix, so the figure is independent of the read/write split. Config is read at session start, one handler per lifecycle event registers through a gate that runs handlers only while enabled, and the twelve gated registrations plus raw session_start are fixed.",
  "recommendation": "Mechanism and measurements are read correctly, but four blocking contradictions stop this landing as worded: the block's shared home cannot be the instruments publisher (it is a no-op with instruments off, and it never exposes the current request's block), the provider payload carries no message id or timestamp so neither the block nor its former message can be located the way the plan assumes, the marker-keeping clause forbids the only OAuth slot strategy M5 measured, and the delta keeps the warm gate that M9 names as an under-charge. Each has a cheap fix and none reopens Joel's rulings; fix the four, name ctx.model as the route discriminator, and settle the rewrite term as measured with an estimate cap.",
  "findings": [
    {
      "id": "C1",
      "severity": "blocking",
      "location": "michael-orientation.md §2 (pointer to src/use-cases/instruments-publisher.ts:106-119,184-203); src/app/extension/instruments-holder.ts:6-16; src/use-cases/instruments-publisher.ts:245-256,290",
      "finding": "The orientation tells the payload handler to share the publisher's baseline as the one home for 'which message carried the block', but that state is behind the instruments switch and never exposes the current request's block.",
      "rationale": "With jeffersonInstruments false the holder holds noOpPublisher, whose reportRecalled(){} records nothing; baseline is assigned only at a priced response and holds the previous request's block, while the current request's block exists only in the private pending closure. Following the instruction makes the fix conditional on an unrelated switch, which contradicts the owner ruling that measures the fix on payloads.",
      "concrete_case": "A config file with jeffersonInstruments: false and one recalling turn on Opus over OAuth: recall appends the block, the handler finds no record, the payload goes out unchanged, and the 41k-143k rewrite continues with the fix installed and no warning.",
      "recommendation": "Home the fact in the ungated per-session cell that already exists (recallCache, created at src/app/extension/taiknr.ts:33, written in context.ts beside reportRecalled) and pass it to the new handler; keep the publisher's baseline for money only. This avoids adding a getter to the fixed InstrumentPublisher interface and therefore avoids modifying instruments-holder.ts."
    },
    {
      "id": "C2",
      "severity": "blocking",
      "location": "specs/tail-recall/spec.md 'The next turn's first request reaches the recalling turn's entry'; src/infra/adapters/pi-instrument-readings.ts:106-113; pi anthropic-messages.js:1251-1410",
      "finding": "The specs require a point before the block and, one request later, a point on the message that carried it, but the provider payload carries no timestamp or id and pi re-shapes the message array, so neither position is locatable as the plan assumes.",
      "rationale": "convertMessages emits bare {role, content}: it drops whitespace-only text blocks and empty user messages, merges runs of tool results into one user message, injects role:system messages into the messages array, and sanitizes every text. The publisher's latestUser {index, timestamp, tailText} is an index into context_with_system messages, and on the next request the block's text is gone entirely.",
      "concrete_case": "Joel's session with 364 custom_message entries against 102 user messages: the block sits mid-history, so the recorded index addresses a different array and no text remains to match on the following request. The handler marks an unrelated message or marks nothing, and the scenario 'the next turn's first request reaches the recalling turn's entry' has no mechanism.",
      "recommendation": "State the mechanism in design.md: the handler keeps its own payload-granular cell (the block's payload message index plus the payload message count), finds the block as the last role:user message whose final text block starts with <recalled_context> (exact equality preferred, prefix as fallback, no match means no-op), and places the next-turn point only when messages.length > recorded. That one condition also invalidates the cell after /compact, a /tree jump and /reload without new registrations."
    },
    {
      "id": "C3",
      "severity": "blocking",
      "location": "specs/tail-recall/spec.md 'The payload edit keeps other extensions' changes and the provider's limits'; michael-orientation.md M5 and §3 trap 6",
      "finding": "The requirement that taiknr keep every cache marker already on the payload and place no more than four boundaries forbids the OAuth slot strategy that M5 measured working.",
      "rationale": "pi's own OAuth provider already uses all four points (system[0], system[1], last tool, last message), and M5's OAuth run yielded system[0] on every request and the tools point on the transition request. 'Keeping every cache marker' forbids both drops, and a move is a delete plus an add that the same wording strains.",
      "concrete_case": "Joel's OAuth session at the first request after a recalling turn: the block's former message must be marked while four markers exist, so the handler either exceeds four (a 400 per Chidi #2) or violates the requirement.",
      "recommendation": "Replace the clause with what was measured: taiknr adds no fifth boundary, never changes a system or tools marker between the requests of one turn, and where a slot must be freed yields system[0] first and the tools point second. Name the yield order in the requirement and settle it in design.md."
    },
    {
      "id": "C4",
      "severity": "blocking",
      "location": "specs/context-figures/spec.md 'Dollar savings are net of cache rewrites'; src/domain/savings-dollars.ts:42,54,57,59; michael-orientation.md §3 trap 9",
      "finding": "The MODIFIED requirement keeps 'when it is warm' as the rewrite condition, so the under-charge M9 names survives the change that exists to remove it.",
      "rationale": "netDollars charges a rewrite only when warm is true, and warm is cacheRead > 0. A fully poisoned request reads 0, so warm is false, the rewrite term is 0, and the same boolean is also doing the stub-rate and block-rate jobs.",
      "concrete_case": "key-baseline.log turns 2-3: a request whose system/tools prefix is below the model's minimum reads 0 and writes the whole prompt; the figure records no rewrite for the most expensive request in the log.",
      "recommendation": "Gate the rewrite on 'a previous priced request exists' (baseline !== undefined in the publisher) and keep warm for the two rate choices. Say this in the delta, otherwise the coder implements the defect faithfully."
    },
    {
      "id": "C5",
      "severity": "major",
      "location": "michael-orientation.md §6 'not covered'; pi anthropic-messages.js:246-259,636-638",
      "finding": "A continued thread request sends only params.messages.slice(prefixCount), so every marker taiknr places on an earlier message never reaches the wire, and the hook cannot see that it happened because thread is attached after onPayload.",
      "rationale": "prepareThreadRequest runs after onPayload and continues only when the prefix hash and message count still match; recall's block changes the content of a message inside the hashed prefix, so a recalling session always gets create. That reasoning is absent from the evidence and, if it is wrong, the fix is silently inert.",
      "concrete_case": "Any session where pi continues a thread: the point before the block and the next-turn point are both on messages that are not sent, the provider rewrites as today, and no test in the repository notices.",
      "recommendation": "Record it in the new ADR as a stated assumption and confirm thread.type is create in a recalling session during the acceptance run, using the existing live script. Do not attempt detection in the handler, which cannot see the field."
    },
    {
      "id": "C6",
      "severity": "major",
      "location": "specs/tail-recall/spec.md 'Only routes with a measured result change'; pi sdk.js:224-228, runner.js:1074-1095, core/extensions/runner.js:648-651; tests/support/fake-pi.ts",
      "finding": "The requirement is exact about which routes change and which must stay byte-identical, but the event carries only the payload, and every Anthropic-format gateway produces the same shape, so the scenarios have no stated mechanism and no test boundary.",
      "rationale": "openrouter, minimax, opencode, cloudflare-ai-gateway, vercel-ai-gateway, fireworks and github-copilot all take the anthropic-messages path, so a shape-based check cannot separate a covered route from an excluded one. The event object holds payload alone.",
      "concrete_case": "A vercel-ai-gateway session on a Claude model: identical payload shape to OpenRouter's covered case, so 'byte-identical to today' is not assertable by any handler-level test as written.",
      "recommendation": "Name ctx.model.provider and ctx.model.id as the discriminator (provider anthropic, or openrouter with an anthropic/ id, matching openai-completions.js:1260) and return the payload untouched for every other provider. createContextStub already accepts a model, so each route scenario becomes one handler test rather than a live probe. Also record that modelRegistry.classify bypasses the hook, which retires the open classifier question."
    },
    {
      "id": "C7",
      "severity": "major",
      "location": "specs/context-figures/spec.md 'The block is charged where it was billed' and the MODIFIED requirement body; src/infra/pi-event-handlers/instruments-response.ts:9-29; src/domain/savings-dollars.ts:19-26",
      "finding": "The delta defers 'how that term is computed' to the design, and the code shows a measured charge is cheaper than today's estimate and needs no new data at the boundary.",
      "rationale": "usage.cacheWrite and cost.cacheWrite already reach responseReceived, so the rewrite the provider performed is directly priceable as cacheWrite x max(0, writeRate - readRate), capped by the estimated changed suffix so a coincidental TTL expiry cannot over-charge. PricedRequest.suffixEstimate is the only shape that changes.",
      "concrete_case": "A coder implementing the spec as written must choose between keeping the suffix estimate and switching to the response's own cache write, with no rule for which, which is exactly the guessing the readiness standard forbids.",
      "recommendation": "Settle it in design.md as measured with an estimate cap, and add the 'a previous priced request exists' predicate from C4 while the term is open."
    },
    {
      "id": "C8",
      "severity": "major",
      "location": "specs/tail-recall/spec.md 'The record of what a recall block costs follows the measurement'; specs/context-figures/spec.md 'A figure that reads negative says why'; README.md:40,67,112",
      "finding": "Three delta requirements are satisfiable only by Markdown, and two of their three README claims are already true, so no task can prove them and the scope they describe is overstated.",
      "rationale": "The readiness standard excludes documentation from tasks.md and requires every scenario to name a task and a test. README.md:67 already names decisionThreshold as the lever that shrinks the block and README.md:112 already says the figures are net, signed and can read negative early on; only README.md:40's 're-caches ... once' and the steady-state negative are actually missing.",
      "concrete_case": "A coder told to satisfy 'The lever is named' finds it already named at README.md:67, marks the scenario met, and never touches README.md:40, which is the paragraph M1 contradicts.",
      "recommendation": "Keep the requirements, move their proof into design.md's documentation step, and name the exact lines to change (README.md:40 and :112) so the docs pass has a target."
    },
    {
      "id": "C9",
      "severity": "major",
      "location": "tests/app/extension/taiknr.test.ts:5-28; ARCHITECTURE.md:46,54; proposal.md Impact",
      "finding": "The file boundary misses files the change cannot land without: the composition test pins thirteen registrations by exact list and its fake ExtensionAPI throws on any member but on, and ARCHITECTURE.md states the registration count and per-session state.",
      "rationale": "A new before_provider_request registration fails the composition test until it is edited, and leaves ARCHITECTURE.md's 'Thirteen registrations over nine events' and its per-session state paragraph wrong. If C1's recommendation is taken, context.ts, recall-relevant-context.ts and taiknr.ts are also Modify targets beyond the proposal's 'no existing registration changes'.",
      "concrete_case": "npm run check goes red on tests/app/extension/taiknr.test.ts the moment the handler is composed, and the plan has no Modify entry for it.",
      "recommendation": "Add tests/app/extension/taiknr.test.ts, ARCHITECTURE.md, and (if C1 is adopted) src/infra/pi-event-handlers/context.ts and src/use-cases/recall-relevant-context.ts to the file list, and restate the 'thirteen' count as fourteen over ten events."
    },
    {
      "id": "C10",
      "severity": "major",
      "location": "specs/tail-recall/spec.md 'A payload it cannot read', 'A payload pi marked nowhere', 'A request taiknr built nothing for'; src/infra/adapters/pi-notifier-adapter.ts",
      "finding": "Every failure path in this design is a silent no-op and nothing in taiknr can tell a maintainer whether the edit fired, so the fix's own diagnosis repeats the ambiguity that produced this change.",
      "rationale": "No marker found, route not covered, no free slot, unexpected shape and inactive gate all end in undefined. taiknr has no log channel, and the only user-facing notice is the once-per-session recall warning, which is recall's own and would be consumed by a second warning. Joel's field table is total and finite and the change adds no field.",
      "concrete_case": "Joel installs the fix and still sees a negative figure and a rewrite: nothing distinguishes 'the edit never fired' from 'the edit fired and recall really costs that'.",
      "recommendation": "State the triage path in design.md: each response's cache_read and cache_write in the session JSONL, read per request, and keep Michael's long-carry probe as the reproduction a maintainer reruns. Do not spend the recall notice on it."
    },
    {
      "id": "C11",
      "severity": "minor",
      "location": ".gitignore:12; michael-orientation.md §1; research-eleanor.md 'Scope and evidence'; recall-relevant-context.ts:64-75",
      "finding": "Two citations drift from disk: .envrc is at .gitignore line 12 (not 11 or 8), and recall-relevant-context.ts:66-72 is the cache-hit branch rather than the budget and eligibility fall-out.",
      "rationale": "Both are accurate in substance and wrong in line number, which is the class of error the next stage copies forward into tasks.md.",
      "concrete_case": "A task that says 'keep the .gitignore:11 entry' points at a blank line.",
      "recommendation": "Cite .gitignore:12 and recall-relevant-context.ts:64-75 when the artifacts are next touched."
    }
  ],
  "assumptions": [
    {
      "assumption": "before_provider_request exists in pi 1.5.2, its return replaces the payload, and undefined leaves the payload untouched, so the existing gate's undefined return is inert-safe for this event.",
      "status": "verified"
    },
    {
      "assumption": "A throwing handler is caught by pi's runner and the payload goes out as it arrived, so fail-open is the default and never throwing is sufficient.",
      "status": "verified"
    },
    {
      "assumption": "ctx.model is readable inside the before_provider_request handler and is the only usable route discriminator.",
      "status": "verified"
    },
    {
      "assumption": "Recall's classifier calls do not pass through before_provider_request, because onPayload is wired only into the agent's provider options and modelRegistry.classify takes its own path.",
      "status": "verified"
    },
    {
      "assumption": "hashThreadPrefix strips cache_control from messages only, and system and tools markers are inside the thread hash.",
      "status": "verified"
    },
    {
      "assumption": "Provider payload messages carry no id or timestamp, and the conversion drops whitespace-only blocks, merges tool result runs and injects system messages into the messages array.",
      "status": "verified"
    },
    {
      "assumption": "usage.cacheWrite and cost.cacheWrite already reach the publisher, so a measured rewrite charge needs no new plumbing.",
      "status": "verified"
    },
    {
      "assumption": "The composition test pins thirteen registrations by exact list and its fake ExtensionAPI throws on any member other than on.",
      "status": "verified"
    },
    {
      "assumption": ".envrc is already ignored in .gitignore, at line 12.",
      "status": "verified"
    },
    {
      "assumption": "pi delivers no custom-role message to convertMessages; the converter has no branch for it, so such a message would be dropped from the payload.",
      "status": "unverified"
    },
    {
      "assumption": "Recall's block is always the final text block of its message after pi's whitespace filter, because the block is non-empty and appended last.",
      "status": "unverified"
    },
    {
      "assumption": "The .envrc entry in .gitignore is committed on the branch rather than a working-tree edit.",
      "status": "unverified"
    }
  ],
  "owner_questions": [
    {
      "question": "Which slot strategy should the design adopt on pi's own OAuth provider, where pi already uses all four points?",
      "options": [
        "Yield system[0] on every request carrying the block and the tools point on the transition request, as M5 measured",
        "Move pi's last-message point only and accept no second point on OAuth, leaving the long-turn case unfixed there",
        "Skip Joel's OAuth route until his extension is relaxed and treat it as unmeasured"
      ],
      "recommended_option": "Yield system[0] on every request carrying the block and the tools point on the transition request, as M5 measured",
      "why": "It is the only OAuth shape with a measured read against a write, it costs the fewest reads because the moved point writes a superset entry, and it keeps the marker set stable within a recalling turn, which M6 depends on. Michael settles it; the spec's 'keeping every cache marker' clause must be rewritten either way (C3)."
    },
    {
      "question": "Should the next-turn point also target a fresh settlement stub in the same request, or recall's block only?",
      "options": [
        "Recall's block only in this change; record the stub case as unmeasured",
        "Both, with the handler holding a payload fingerprint of the previous request to find the earliest change",
        "Both, keyed on the publisher's newStubStart rather than on the payload"
      ],
      "recommended_option": "Recall's block only in this change; record the stub case as unmeasured",
      "why": "Trap 13 says how often the stub case bites is unmeasured, and finding it from the payload needs either a per-message differ or a cross-layer read that ADR 0001 forbids. Michael settles the scope; the figures already charge that rewrite today, so leaving the payload alone changes nothing."
    },
    {
      "question": "Who confirms the branch's git state, which this lens cannot read?",
      "options": [
        "Eleanor confirms commit 1b773fe and whether .gitignore is committed or a working-tree edit",
        "Michael's measurement record already covers it and no check is needed",
        "Treat it as irrelevant because the development-checks delta is valid either way"
      ],
      "recommended_option": "Eleanor confirms commit 1b773fe and whether .gitignore is committed or a working-tree edit",
      "why": "The development-checks delta MODIFIES a living requirement that does not yet name .envrc, so the delta itself is valid; what is unverified is only whether the underlying edit is committed, which matters for the PR description and for nothing in the code."
    }
  ],
  "not_checked": [
    "Nothing in git: no shell in this lens, so commit 1b773fe, the branch state and whether .envrc is tracked are unverified",
    "Michael's probe logs and Joel's session file, which are not in this repository and were read only as quoted",
    "Joel's anthropic-attribution extension, which lives outside the repository",
    "Provider documentation; no vendor doc was consulted and no live call was made",
    "Per-provider point counts by reading every gateway provider file; Chidi's counts plus the three marking sites were used instead",
    "the Jefferson declaration test, since this change adds no field"
  ]
}