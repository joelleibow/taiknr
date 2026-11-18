{
  "mode": "council",
  "lens": "council-critic",
  "paraphrase_proposes": "",
  "paraphrase_existing": "",
  "recommendation": "Do not start the design from these specs as written. Three problems block it. (1) The marker rules in the tail-recall delta can't all be met. On pi's own OAuth provider every request already uses all 4 points. Over an API key, the first request after a recalling turn that also recalls needs 5. The one OAuth run that was measured (M5) switched the tools marker off for one request, which the delta's own consistency rule forbids. (2) pi's own Anthropic provider continues message threads by default (OAuth and API key). Within a turn, each request then sends only the new messages, so taiknr's point before the block never reaches the wire after the first request. Every probe (M4–M6) started a fresh thread on each request, so the long-turn result (M6) is unmeasured on those two routes. (3) taiknr can't tell Joel's route apart from pi's own: both register the provider id 'anthropic'. His relaxed guard, which appears to be in his file already, still throws if the system or tools markers change, or if a string message is rewritten as a block list. So no route's slot strategy may touch system or tools markers or rewrite message content. Fix the specs to say this, and probe thread continuation through a real pi session before planning on it. On the dollar rule, I recommend measuring the excess write from the response after any change taiknr makes. The 'split alone changes no figure' scenario turns today's defect (M2) into a requirement and should be dropped.",
  "findings": [
    {
      "id": "CR-1",
      "severity": "blocking",
      "location": "specs/tail-recall/spec.md — Requirement: The payload edit keeps other extensions' changes and the provider's limits; Requirement: A recall block does not cost the turn its cached prefix (\"only cache markers move\")",
      "finding": "The delta requires three things at once: keep every marker already on the payload, never exceed four points, and keep the system and tools markers the same across a session. No placement on pi's own OAuth provider meets all three. On an API key they break as soon as two turns in a row recall. The only measured OAuth run (M5) dropped the tools marker on one request, which the spec forbids.",
      "rationale": "pi's own OAuth provider marks system[0], system[1], tools and the last message, so all 4 points are taken (Chidi #3; anthropic-messages.js:1095-1127,1408-1432,1520). The 'keep every marker' wording leaves no free slot. Take the first request of a turn that recalls right after a recalling turn, over an API key. It needs the system and tools markers, a point on the message that carried the old block, a point before the new block, and pi's own last-message point on the new block: 5 points, which is a 400 (Chidi #2). M5's OAuth result came from dropping the tools marker on one request only. The tools marker is part of pi's thread hash (anthropic-messages.js:213-235), and the spec bans exactly that switch ('never toggled per request'). So the scenario citing 15,550/3,728 cites a run the spec would reject.",
      "concrete_case": "API key, Opus 5.5. Turn N recalls a 33k block. Turn N+1 also recalls. If the handler adds both points to N+1's first request, it carries 5 points and Anthropic returns 400. If it refuses to add, the request rereads only the 35,731-token system/tools entry and rewrites 41k–143k tokens (the M1 loss), and the change does nothing on that request.",
      "recommendation": "Rewrite the requirement as a priority rule that works only on message-level points. The point on the message that carried the old block comes first, then the point before the new block, then pi's own last-message point. pi's last-message point is the one that yields, by moving onto a higher-priority position. The handler never adds, drops or changes a system or tools marker (see CR-3). State that pi's last-message point may move; don't say every existing marker is kept. Count top-level, system, tools and message markers together against the limit of 4. Re-measure OAuth with a strategy the spec allows, before citing a number for it."
    },
    {
      "id": "CR-2",
      "severity": "blocking",
      "location": "specs/tail-recall/spec.md — Scenario: A turn longer than the entry's remaining lifetime; michael-orientation.md M4–M6, trap 4",
      "finding": "On pi's own Anthropic provider (OAuth and API key on api.anthropic.com), the second and later requests of a turn continue a message thread. They send only `messages.slice(prefixCount)` and leave out system and tools. The point taiknr puts before the block sits on an earlier message, so it is cut after the handler runs. M6's mechanism (the point rides every request that carries the block) therefore never reaches the wire on those routes. None of the probes exercised this.",
      "rationale": "Several pieces of pi's code combine here. supportsMessageThreads defaults to true for provider 'anthropic' on api.anthropic.com (anthropic-messages.js:162-163,586). A thread is continued when the stripped-marker hash of the earlier messages matches (anthropic-messages.js:244-261), and markers on messages are stripped from that hash (:231). onPayload runs before prepareThreadRequest (:632-638). The recall block stays on the same user message for the whole turn (living tail-recall 'Per request only'), so later requests in the turn match and continue. Chidi found `thread:{type:\"create\"}` on every probed request, which fits a probe that keeps no thread state between requests (threadState is a module-level Map). Joel's rule is 'know, not assume'.",
      "concrete_case": "API key. A recalling turn of 6 tool calls takes 7.5 minutes. Request 1 creates the thread and writes the entry that ends before the block. Requests 2–7 continue the thread and carry only new tool results, so nothing on the wire refreshes that entry. If the server does not keep request 1's markers, the entry expires about 5 minutes in. Turn N+1's point on the old block's message then finds nothing, and the request rewrites from the system entry, the same loss as today. M6 can't show this, because it measured thread-create requests only.",
      "recommendation": "Send this to Chidi as a probe, to be settled before planning. Drive a real pi agent session in a single process with a session id, over the API key and over OAuth, so the in-turn requests continue a thread. Repeat M4 and M6 in that setup. Until that is measured, either mark the long-turn scenario unmeasured for these two routes, or record that the fix relies only on the next turn's point (which works whenever the entry from request 1 is still alive)."
    },
    {
      "id": "CR-3",
      "severity": "blocking",
      "location": "specs/tail-recall/spec.md — Scenario: Joel's route is served as pi's own provider is; Requirement: Only routes with a measured result change",
      "finding": "From inside the handler, Joel's attribution route looks the same as pi's own Anthropic OAuth provider. His extension registers the provider as 'anthropic' too. His relaxed guard still throws on any change to the top-level, system or tools markers. It also throws on any change to message content outside cache_control, including rewriting a string as a single text block. So any OAuth slot strategy that touches the system or tools markers (M5's did), or any point that converts string content, makes every request on his route fail.",
      "rationale": "anthropic-attribution.ts:1248 and :3656 both call `pi.registerProvider('anthropic', …)`. The before_provider_request event carries only `payload` (types.d.ts:713-716), so the handler can't see which provider implementation is running. His file already has the message-level relaxation (:1021-1062; the 'may move message cache points but not invent them' check at :1040-1053; the limit of 4 at :1055-1062). It still compares the hash of the top-level, system and tools markers before and after onPayload (:3218-3233, :1556-1561). Its lineage hash strips cache_control only from messages whose content is an array, and does not normalize string content (:1704-1712). pi's thread hash does normalize it (anthropic-messages.js:233-235). Must-not-touch: 'Joel's own sessions must not start erroring' (orientation §2).",
      "concrete_case": "Suppose the design drops the redundant system[0] marker on OAuth to free a slot, as M5 did. On Joel's route that request throws 'Anthropic protected cache-control topology (top-level, system or tools) changed during payload middleware'. No tokens are spent and the turn fails. Separately, if a later turn's point is placed on an earlier user message whose wire content is the string \"go on\" by converting it to [{type:\"text\",text:\"go on\",cache_control}], his lineage check (:3250) throws.",
      "recommendation": "Make it an invariant on every route: the handler only adds or moves message-level cache_control, copying the exact object pi placed, and never touches system or tools markers or the top-level object. If the message to mark has string content, skip it and don't convert. Interactive prompts are already arrays (agent-session.js:1570), so this only affects user messages sent by extensions. Record in the Migration Plan that Joel's edit must land before taiknr ships. His file appears already changed, since M3's error text no longer matches the code. Acceptance on his route is still his own live session."
    },
    {
      "id": "CR-4",
      "severity": "major",
      "location": "michael-orientation.md §2 ('already lives in the publisher's baseline … must share one home'); src/use-cases/instruments-publisher.ts:106-110,184-203; src/app/extension/instruments-holder.ts",
      "finding": "The publisher's `baseline` can't be the shared home for 'which message carried the block'. With `jeffersonInstruments` false the holder keeps a no-op publisher, so that state never exists. Turning the display off would quietly turn the cost fix off too. The baseline also stores pi-message indices, which don't match positions in the wire payload.",
      "rationale": "instruments-session-start.ts:20 installs the real publisher only when `jeffersonInstruments` is true. Otherwise the holder's `noOpPublisher` drops every call (instruments-holder.ts). `Block.index` is an index into `event.messages` at context_with_system. pi's convertMessages then rearranges messages before the wire. It merges consecutive toolResult messages into one user message, drops user and assistant messages that convert to nothing, and moves mid-conversation system messages to just before the next assistant message (anthropic-messages.js:1232-1404). So index i in pi's list is generally not index i on the wire.",
      "concrete_case": "A user sets `jeffersonInstruments: false` in their project config. The payload handler asks the publisher which message carried the block and gets nothing back. Every turn after a recall rewrites 41k–143k tokens again, even though `enabled` is true. Separately, with instruments on, a turn with three parallel tool results maps to one wire message. A handler that uses baseline.index on the wire then marks a message 2 positions past the real one, the point lands in the wrong place, and it never matches a cache entry.",
      "recommendation": "Keep the fact in a per-session cell that recall owns, next to `recallCache` in taiknr.ts. The context handler writes it at context_with_system: the block's text, or a hash of it, plus the identity of the message that carries it (timestamp and prompt text, the same key recall already uses). Both the payload handler and the publisher read that one cell. The handler finds positions by content in the wire payload: the block is the last text block of a non-tool_result user message and equals the recorded text after pi's surrogate sanitizing. It never uses pi's indices."
    },
    {
      "id": "CR-5",
      "severity": "major",
      "location": "specs/tail-recall/spec.md — Requirement: The payload edit keeps other extensions' changes…, Scenario: A request taiknr built nothing for",
      "finding": "before_provider_request also fires for pi's cache-warmer replays. The warmer is on by default ('idle'), and its replays come with no context_with_system before them. Suppose the handler tracks state per request, for example 'add the next-turn point on the first request after the block left, then clear it'. A warm replay or a retry would then use up that state, and the real next request would go out without the point.",
      "rationale": "pi passes onPayload in the request options (pi-agent-core agent.js:312; sdk.js:262-273). The warmer replays with `streamSimple(run.model, run.context, getCacheWarmingRequestOptions(run.options, …))`, which copies those options and adds `disableContinuation: true` (cache-warmer.js refresh; cache-warming.js:48-50). The default mode is `cacheWarming: \"idle\"` (settings-defaults.js:60). The warm replay sends the last request's full payload, which still has the block.",
      "concrete_case": "A recalling turn settles and the user is idle. The warmer replays the turn's last request at 90% of the TTL, and taiknr's handler sees a block-carrying request with no new context_with_system. If the handler advances a 'first request after' flag here, then when the user types, turn N+1's first request gets no point on the old block's message and rewrites back to the system entry.",
      "recommendation": "Specify the handler as a pure function of the payload plus the recall-owned cell from CR-4. A point goes wherever the recorded message appears, so the same input always gives the same output. Nothing is consumed per request. A warm replay then refreshes the block-free entry as a side benefit. Choose the route from ctx.model (provider, api, baseUrl) and also require `payload.model === ctx.model.id`. A payload for any other model (compaction, summaries) is left alone."
    },
    {
      "id": "CR-6",
      "severity": "major",
      "location": "specs/context-figures/spec.md — Scenario: The split alone changes no figure; Requirement: Dollar savings are net… ('the rewrite charged SHALL be the one the provider performed')",
      "finding": "The scenario 'never the read and write counts' makes today's defect (M2) a requirement. It also rules out the response-measured rewrite that the orientation left open for the council. At the same time, the requirement says the charged rewrite SHALL be the one the provider performed. An estimate can't meet that on routes this change doesn't reach (Bedrock, other gateways), or for stub rewrites past the lookback. Both statements can't be true.",
      "rationale": "The current rule enters the split only as `warm = cacheRead > 0` (savings-dollars.ts:40-46) and prices the suffix from estimates (instruments-publisher.ts:184-203). On a route the fix doesn't reach, the real rewrite runs back to the last entry the provider could read (up to the whole conversation, M9). An estimate starting at the recalling message can't see that. The response's cacheWrite can. Joel's ruling on Q2 is 'make the figure honest'.",
      "concrete_case": "Bedrock, payload unchanged (Q3(a)). After a recalling turn, the next request writes 139,169 tokens and reads 35,731. The estimate rule charges only the suffix from the recalling message, about 1/16 of the real excess (M9). The README says the figure prices what was billed, but it understates by about $0.5 per such turn on Opus 5.5.",
      "recommendation": "Drop the split scenario, or restate it as how the old rule behaved. Weigh the measured rule against the estimate: on a warm request after a taiknr change, excess = max(0, cacheWrite − k·(estimate of messages past the previous priced request)), priced at (writeRate − readRate). This works the same on every route, so the under-reporting recorded for unmeasured routes goes away without touching their payloads. It also fixes the block term under a moved point, because the write is then measured rather than inferred. The residual hazard is a cache expiry that coincides with a taiknr change. When everything has expired, the request is cold and the rule already charges nothing, so the hazard is limited to partial expiry. Record it."
    },
    {
      "id": "CR-7",
      "severity": "major",
      "location": "specs/tail-recall/spec.md — Scenario: Nothing recalled; Scenario: The recalling request reads its prefix; requirement text ('writes only from the block onward')",
      "finding": "Three statements in the tail-recall delta conflict with how the fix works. 'Nothing recalled → byte-identical' contradicts the next-turn point, which goes on exactly those requests. 'The recalling request reads its prefix … where today eleven such turn starts read 35,731' blames the loss on the wrong request. 'Writes only from the block onward' is false.",
      "rationale": "The next-turn point is placed on the first request after a recalling turn, and that request often recalls nothing. Today the recalling request already reads the previous turn's last entry: pi's point is on the block, and lookback finds the entry that ended at the previous request's last message, a few positions back. M1's losses are turn starts after a block-carrying turn, where the removed block makes that turn's entries unusable (M1; trap 3). Even with the fix, the recalling request writes the previous turn's final reply and the new prompt as well as the block.",
      "concrete_case": "Turn N recalls, and turn N+1's classifier selects nothing. The spec requires N+1's first request to match a request built without taiknr byte for byte, yet the fix must add a point to it. An implementer either breaks the scenario or leaves out the next-turn point and keeps the M1 loss. And a 2k-token reply plus a 500-token prompt before a 33k block makes 'write ≈ block' fail as an acceptance check even when the fix works.",
      "recommendation": "Restate 'Nothing recalled' as: no block on this request and none recorded for the previous one → byte-identical. Move the M1 baseline numbers to the next-turn scenario. Restate the recalling-request scenario as the request writes an entry that ends right before the block, and its write covers everything after the last entry it read. Give acceptance as a number for Joel's live session: on the turn after a recalling turn, cacheRead reaches at least the end of the recalling message's original content."
    },
    {
      "id": "CR-8",
      "severity": "major",
      "location": "specs/context-figures/spec.md — Scenario: The block is charged where it was billed; michael-orientation.md trap 10",
      "finding": "Moving pi's point and adding a point bill the block differently. If the priority rule from CR-1 moves pi's last-message point only on some requests, the block's billing changes from request to request. The estimate rule then needs to know what the handler did on that request. Nothing in the specs says how that would reach the publisher.",
      "rationale": "Adding a point leaves the block written once at 1.25× and read at 0.1× afterwards, as today. Moving pi's point off the block bills the block as input (1×) on the first request, and the second request writes it (1.25×). That is about 2.25× instead of about 1.35× for a turn with several requests. With a 33k block on Opus 5.5 (input about $4/M against M9's $5/M write), a move costs about $0.13 extra per such turn. Losing the next-turn point instead costs 41k–143k tokens at the write rate, about $0.2–0.7 (M1). So moving is only worth it when the next-turn point needs the slot. That makes the strategy vary per request.",
      "concrete_case": "API key, two recalling turns in a row. On N+1's first request pi's point moves off the new block, so the provider bills the block as input. `netDollars` sees blockInNewTail = true and charges the write rate, an overcharge of 0.25× the block. On N+1's second request the provider writes the block, but the rule charges it at the read rate (blockInNewTail = false, warm), an undercharge of 1.15× the block.",
      "recommendation": "Either adopt the measured rule from CR-6, where the second request's write is measured and request 1's overcharge is bounded at 0.25× the block and recorded, or put 'what the handler placed on this request' in the CR-4 cell for the publisher to read. Don't keep a second copy. Add points by default, and move pi's point only when the budget forces it."
    },
    {
      "id": "CR-9",
      "severity": "minor",
      "location": "proposal.md — Why ('understates taiknr's real cost by about 16× (M2; M9)')",
      "finding": "16× is the ratio of the rewrite term alone (model $0.35 against real $5.77), not of taiknr's whole cost, and M2 does not support it.",
      "rationale": "M9 compares rewrite charges only. M2 is about the figure not depending on the split. The orientation's own §4 says the whole figure reads about −$0.4 before and after the fix.",
      "concrete_case": "A reader concludes the published figure is 16× too small overall. In fact the rewrite term is about 16× too small, and the whole figure moves from about −$0.4 to about −$5.8 when priced honestly.",
      "recommendation": "Say 'its rewrite charge understates the real rewrite by about 16× (M9)', and drop M2 from that citation."
    },
    {
      "id": "CR-10",
      "severity": "minor",
      "location": "specs/tail-recall/spec.md — Requirement: Only routes with a measured result change",
      "finding": "The route gate isn't defined, and the event gives the handler nothing but the payload. A provider id alone also admits routes that were never measured.",
      "rationale": "types.d.ts:713-716. A user's models.json can declare provider 'anthropic' with a proxy baseUrl, or an OpenRouter `anthropic/*` model on the openai-completions api with `cacheControlFormat: \"anthropic\"` (Chidi 5(b), compat-schema.js:203). Neither was measured.",
      "concrete_case": "A provider 'anthropic' that points at a corporate proxy gets the edit and starts throwing 400s if the proxy adds its own point. Or an OpenRouter Anthropic model on openai-completions receives an OpenAI-shaped body that the handler tries to treat as Anthropic messages.",
      "recommendation": "Define the gate in one place: (provider 'anthropic', api 'anthropic-messages', baseUrl on api.anthropic.com) or (provider 'openrouter', api 'anthropic-messages', model id starting with 'anthropic/'). Also require payload.model === ctx.model.id. Anything else is left unchanged."
    },
    {
      "id": "CR-11",
      "severity": "minor",
      "location": "michael-orientation.md §6 open question ('whether the next-turn point targets the earliest change taiknr caused, block or fresh stub'); trap 13",
      "finding": "The open question can be settled without a new probe. After a recalling turn, the block's message is always the earliest change taiknr makes, so the next-turn point should target it. Stub-only lookback losses are a separate, unmeasured class and should stay out of this change.",
      "rationale": "Settlement stubs only the outputs collected during the run that just ended (taiknr.ts wiring: turn_end fills `pendingOutputs` and agent_before_settle consumes it). Those tool results come after that turn's user message, which is where the block sits. Before recall merged, stub-only losses were 2k–18k (M1).",
      "concrete_case": "Turn N recalls and settles 3 stubs on its own tool results. Turn N+1's first request has the block removed at message u and fresh stubs at positions after u. A point at u's original content meets the entry turn N wrote. A point aimed at the earliest stub would land past the first change and match nothing.",
      "recommendation": "Target the message that carried the block. Record stub lookback as a follow-up with no measurement behind it."
    },
    {
      "id": "CR-12",
      "severity": "minor",
      "location": "specs/tail-recall/spec.md — Requirement: The payload edit keeps other extensions' changes…",
      "finding": "Operators can't see when the handler declined to place a point (budget full, route not covered, block not matched, string content), and an extension running after taiknr can still push a request to 5 points.",
      "rationale": "pi's runner swallows a handler's throw and reports it through emitError (runner.js:1074-1100). A deliberate no-op leaves no trace, and the session harness rewrites usage (AGENTS.md), so the only evidence is the live read/write split. pi runs before_provider_request handlers in the order extensions load, and each handler receives the previous one's payload.",
      "concrete_case": "A slot-full no-op on every turn start after recall makes the session look exactly as it does today, and nothing distinguishes 'fix declined' from 'fix ineffective'. Separately, a later extension adds a point after taiknr filled the request to 4, and Anthropic returns 400.",
      "recommendation": "Say in the design how acceptance tells the two apart. The measured dollar rule (CR-6) makes it show up in the figure. Otherwise name a manual check against the response split. Record the risk from extensions that run after taiknr, since taiknr can't guard against it."
    }
  ],
  "assumptions": [
    {
      "assumption": "pi's own Anthropic provider continues message threads for the second and later requests of a turn in a real agent session on api.anthropic.com, and continued requests carry only messages.slice(prefixCount).",
      "status": "unverified"
    },
    {
      "assumption": "Joel's relaxed guard is already in ~/.pi/agent/extensions/anthropic-attribution.ts. Its message-level check at :1040-1053 and its error text differ from M3's.",
      "status": "verified"
    },
    {
      "assumption": "Joel's route places 3 points and not pi OAuth's 4 (taken from the orientation; I didn't trace his marker placement).",
      "status": "unverified"
    },
    {
      "assumption": "before_provider_request fires for cache-warmer replays, because onPayload travels in the request options that the warmer copies.",
      "status": "verified"
    },
    {
      "assumption": "Whether compaction and summary requests go through onPayload.",
      "status": "unverified"
    },
    {
      "assumption": "Anthropic caches a string user message and a single text block of the same text identically. pi's own thread-hash normalization (anthropic-messages.js:233-235) and its normal turn-to-turn caching rely on this.",
      "status": "unverified"
    },
    {
      "assumption": "Settlement stubs only the outputs collected during the run that just ended, so stubs always come after that turn's user message.",
      "status": "unverified"
    },
    {
      "assumption": "The price figures in CR-8 (Opus 5.5 input about $4/M, block about 33k) come from M9's catalog write price and its inferred block size.",
      "status": "unverified"
    }
  ],
  "owner_questions": [
    {
      "question": "For Michael (design): on pi's own OAuth provider, where all 4 points are already taken, which point gives way to make room for the point before the block and the next-turn point?",
      "options": [
        "(a) Never touch system or tools markers. Move pi's last-message point to the higher-priority message position, accepting about 1× the block in extra input per recalling turn with several requests on this route only",
        "(b) Drop the redundant system[0] identity marker on every request of the session, only when the payload matches pi's own OAuth shape (4 points, 2 on system)",
        "(c) On this route, place no point when no slot is free, and keep today's loss"
      ],
      "recommended_option": "(a) Never touch system or tools markers. Move pi's last-message point to the higher-priority message position, accepting about 1× the block in extra input per recalling turn with several requests on this route only",
      "why": "(b) rests on telling pi's own payload shape apart from Joel's. Both use the provider id 'anthropic', and his guard throws on any change to system or tools markers (CR-3), so getting the shape test wrong fails his session. (a) works on every route and keeps pi's thread hash stable, and its cost is bounded and much smaller than the loss it prevents (CR-8)."
    },
    {
      "question": "For Michael (design): is the rewrite priced from estimates or measured from the response?",
      "options": [
        "(a) Measured: on a warm request after a taiknr change, excess = max(0, cacheWrite − k·new-tail estimate) at (write − read)",
        "(b) Estimated, with the suffix starting after the recalling message and a block term that follows the placement strategy",
        "(c) Estimated on covered routes, measured on the others"
      ],
      "recommended_option": "(a) Measured: on a warm request after a taiknr change, excess = max(0, cacheWrite − k·new-tail estimate) at (write − read)",
      "why": "Only (a) meets the requirement that the charged rewrite is the one the provider performed on every route, the unmeasured ones included. It also needs no state passed from the payload handler to the publisher (CR-6, CR-8). (c) needs both mechanisms."
    }
  ],
  "not_checked": [
    "Bedrock and the other Anthropic-format gateways (no credentials; no probe)",
    "I made no live probe or model call, so CR-2 rests on reading the source",
    "The rest of Joel's attribution extension past the guard, lineage and provider-registration sections, including how it places its own points",
    "Whether compaction and summary requests pass through before_provider_request",
    "Whether the server keeps a thread's earlier cache_control markers on continued requests",
    "The current README and ADR 0007 text (the documentation scenarios weren't re-read against them)",
    "The test files named in research-eleanor.md",
    "Recall's classifier path through the jev scorer adapter"
  ]
}