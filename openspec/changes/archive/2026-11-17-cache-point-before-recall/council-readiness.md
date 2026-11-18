{
  "mode": "council",
  "lens": "council-readiness",
  "paraphrase_proposes": "",
  "paraphrase_existing": "",
  "recommendation": "Not ready to design. The mechanism (M1) and the three-route scope are sound. Two things block: (1) the strategy that was measured toggles the tools marker, which Joel's own Q1(a) ruling (system and tools stay protected in his guard) and the spec's 'identical across requests' rule both forbid, and that strategy has not been measured in the shape the spec needs. Until it is, a recalling request on Joel's route either errors or needs an edit his guard still refuses. (2) Nothing in the proposal or specs orders Joel's extension edit against the taiknr merge or its rollback. Seven further gaps would force the coder to invent design: the route predicate (the event carries no model), the state home (the instruments publisher is a no-op when its switch is off), block identification, the dollar-rule signal and its contradiction with a living requirement, scenarios with no provable test, and the spec's own SHALL conflicts. Resolve with one short probe round of the exact chosen strategy, a Migration Plan in design.md, and the spec edits listed below. Rollback of taiknr itself is safe because it persists nothing.",
  "findings": [
    {
      "id": "R1",
      "severity": "blocking",
      "location": "proposal.md 'Impact: Outside the repository'; specs/tail-recall/spec.md 'Joel's route is served as pi's own provider is'",
      "finding": "No ordering is defined between Joel's guard relaxation and the taiknr merge or rollback. taiknr cannot tell his route from direct Anthropic, and cannot catch the failure his guard produces.",
      "rationale": "His extension re-registers provider 'anthropic' with its own streamSimple (anthropic-attribution.ts:1214, 3104, 3616), so ctx.model.provider is 'anthropic', the same as pi's own route. Its topology assertion runs after the onPayload chain returns (:3181-3210), i.e. outside taiknr's try/catch. The spec's fail-open scenario therefore cannot cover it. M3 measured the result: the request is rejected with zero tokens and no fetch. The orientation lists 'Joel's own sessions must not start erroring' as a must-not-touch, but nothing in the spec or proposal preserves that beyond 'his edit is a dependency'.",
      "concrete_case": "The taiknr PR is merged and Joel runs /reload before his extension edit lands. Every request on his route that carries a recall block fails with 'Anthropic protected cache-control topology changed during payload middleware'. Rollback case: his guard edit is reverted while taiknr stays installed, with the same failure.",
      "recommendation": "Put the order in design.md's Migration Plan: (1) Joel's relaxed guard lands and is verified against unchanged taiknr, where it must be a no-op; (2) taiknr merges; (3) Joel's acceptance session. Rollback runs in the reverse order, taiknr before the extension. Reword the spec scenario to say that without the relaxation a recalling request on his route is rejected by his guard. Mark that acceptance session as Joel's to observe, never ticked by the coder. Do not add a config switch (ruled out)."
    },
    {
      "id": "R2",
      "severity": "blocking",
      "location": "michael-orientation.md M5 and trap 6; specs/tail-recall/spec.md requirement 'The payload edit keeps other extensions' changes…'; owner-rulings.md Q1(a); .pi/marbleization/cache-point-before-recall/michael/longprobe.ts:63-82 and the long-*-carry.log wire logs",
      "finding": "The slot strategy M5 measured touches the tools marker (and system[0] on OAuth). Q1(a) keeps system and tools protected in Joel's guard, and the spec says system and tools markers stay identical across requests. The measured strategy satisfies neither, and the strategy that would satisfy both was not measured in the shape the spec needs.",
      "rationale": "The probe's 'carry' and 'carry-oauth' modes delete every tools[] marker on each turn's first request. They leave pi's point on the recall block and add P1 and P2. The API-key and OpenRouter logs show tools[3] absent at nMsgs 27 and 31 and present on the requests between. The OAuth log shows the same, and system[0]'s marker is gone on every request. Chidi #4 says system and tools markers sit inside pi's thread hash, so toggling them changes the hash every turn. Thread continuation was never observed (every log shows thread:create or null). The spec forbids the toggle, and Q1(a) protects tools in his guard, so on his route the measured strategy still errors after the relaxation. A strategy that edits message markers only exists on the 3-point routes. Move pi's last-message point onto P1 on the block-carrying first request, add P1 on later requests, and add P2 on the next turn's first request. That stays at 4 points and never touches system or tools. It is unmeasured as a whole. moved.log covers P1 alone for one turn, and the probe's P2 runs used 'add', not 'move'. Moving also changes how the block is billed (orientation trap 10).",
      "concrete_case": "Joel's route, 3 points. Turn-first request after a recalling turn: system, tools and pi's last-message point on the block, plus P1 and P2, is 5, so tools must go, and his relaxed guard refuses that edit. Under 'move' the same request carries system, tools, P1 (moved) and P2, which is 4 and edits message markers only. On pi's OAuth route (4 points: system[0], system[1], tools, last) a system marker must still go: drop system[0] on every request, or toggle.",
      "recommendation": "Decide before design: message-markers-only 'move' on every route with fewer than 4 points. On 4-point payloads (pi's OAuth), drop system[0] constantly, on every request of that route, never per request. Name that as the one carve-out. Probe this exact strategy per route before it is planned on (R8). If the probe fails, the fallback is to send Joel's route no edit and record it, not to widen his guard."
    },
    {
      "id": "R3",
      "severity": "major",
      "location": "specs/tail-recall/spec.md requirement 'Only routes with a measured result change'",
      "finding": "The route predicate is undefined, and the information it needs is not on the event. A coder would have to invent it.",
      "rationale": "BeforeProviderRequestEvent carries only { type, payload: unknown } (types.d.ts:713-716). The model reaches the handler only as ctx.model, which may name a virtual model rather than the routed physical one (types.d.ts:1439-1447). A payload alone cannot separate Anthropic direct, Joel's route, OpenRouter, minimax, opencode, cloudflare, vercel, fireworks and copilot, because all share the anthropic-messages body (Chidi). Chidi #5 also shows OpenRouter anthropic/* can take the openai-completions path with cacheControlFormat 'anthropic', and only the Anthropic-shaped body was measured. Compaction, summaries and the cache warmer's replays run through other routes with the same hook and may carry a different model than ctx.model (sdk.js:262-273; cache-warmer.js:183).",
      "concrete_case": "ctx.model = { provider:'openrouter', id:'anthropic/claude-haiku-4.5', api:'openai-completions' } produces an openai-shaped payload with cache_control on a system/developer message. It is unmeasured, but it matches 'Anthropic via OpenRouter' by name. Another case: ctx.model is undefined, or names a virtual model, so the edit lands on the wrong physical route.",
      "recommendation": "Fix the allow-list in design.md as an exact predicate: (ctx.model.provider === 'anthropic' and api === 'anthropic-messages') or (provider === 'openrouter', id starting 'anthropic/', and api === 'anthropic-messages'). Also require payload.model to equal ctx.model.id and the payload to have an Anthropic-shaped system, tools and messages. Anything else, including undefined ctx.model, is a no-op. Name it as a pure function in infra with a table-driven test (provider, api and id vs. edit or no edit), and add a case for each gateway in the spec's list."
    },
    {
      "id": "R4",
      "severity": "major",
      "location": "michael-orientation.md §2 ('must share one home'); src/use-cases/instruments-publisher.ts:106-119,184-203; src/app/extension/instruments-holder.ts; src/infra/pi-event-handlers/instruments-session-start.ts",
      "finding": "The 'one shared home' for 'which message carried recall's block' cannot be the publisher's baseline. It does not exist when the instruments switch is off, and its index is in the wrong coordinates.",
      "rationale": "With jeffersonInstruments false, the holder keeps the no-op publisher, which holds no baseline (instruments-holder.ts, instruments-session-start.ts). The payload fix is gated only by taiknr's enabled flag, so it must work without instruments. baseline.block.index is a position in the context_with_system message list. In the provider payload, consecutive toolResults merge into one user message and pi inserts empty system messages carrying output_config effort before assistants and at the end (anthropic-messages.js:~1380-1450). Custom messages become user messages, so the indexes do not line up. A pi-free publisher cannot map between them either (ADR 0001).",
      "concrete_case": "Instruments off, recalling turn: no baseline exists, so the next turn's P2 target is unknown. Instruments on: baseline.index = 4 refers to the context list, while the same message sits at payload index 6 after merges and effort messages.",
      "recommendation": "Create one small session-scoped cell in infra, composed in taiknr.ts like the holder. The recall handler writes 'this request carries a block' into it. The payload handler writes the payload position of the block-carrying message plus a fingerprint of its preceding text block, and reads it next request. Validate by fingerprint at use, so compaction, tree jump and /new need no reset registrars. A mismatch means no P2, which is a harmless loss. The publisher does not share that cell. It receives a separate deferred reading of what was actually applied (R5)."
    },
    {
      "id": "R5",
      "severity": "major",
      "location": "specs/context-figures/spec.md MODIFIED requirement 'Dollar savings are net of cache rewrites…' and its scenarios; openspec/specs/context-figures/spec.md 'A saving is priced at the rates the request's own response reported'; src/domain/savings-dollars.ts:55-56",
      "finding": "The dollar-rule delta overclaims, leaves a living SHALL contradicting a new scenario, and defers the two terms it changes to 'the design's'. The block and rewrite terms also depend on a fact (what was applied to this request) that has no defined source.",
      "rationale": "(a) The modified SHALL says the rewrite charged 'SHALL be the one the provider performed'. The estimator cannot know that on the routes the change does not reach, and Q3(a) says their under-reporting is recorded, not fixed. (b) The living requirement 'A saving is priced at the rates…' (unmodified here) still says the block is priced 'at the read rate when its message lies inside what the last priced request carried, and at the write rate after it'. The new scenario says input on the first request and write on the second. Archiving as drafted leaves two contradictory SHALLs. (c) 'The charge starts inside or after the recalling message' and 'how that term is computed is the design's' cannot be turned into an assertion, so the test would be invented by the coder. (d) The block's real billing depends on the placement chosen, and so does the first request's block rate. When the handler fails open, is off-route or cannot find a slot, pi's point stays on the block and today's rule is right. So the publisher needs the applied placement as a fact, ideally taken from a post-condition check of the edited payload and not from intent, since the handler runs after requestBuilt and before responseReceived. AGENTS.md also requires figures be computed in the publisher from deferred readings.",
      "concrete_case": "Handler throws and fails open: the publisher charges the block at the input rate as if moved, but the provider billed it as a write. The figure reads too high. On Joel's route before relaxation, the 'applied' flag must be false because the request was rejected and carries no usage. Separately: the SHALL at (a) fails on Bedrock because the unchanged estimate still starts at the recalling message.",
      "recommendation": "Settle in design.md: (1) a new publisher method, e.g. requestPlaced(read), taking a deferred reading of { applied, blockRateKind: 'input'|'write'|'read' }. It is added to the no-op publisher and to the interface. No new Jefferson field. (2) PricedRequest gains a placement field in the domain, pi-free (ADR 0001). (3) MODIFY the living 'A saving is priced…' requirement so its block sentence matches. (4) Make the delta text the weaker, true one: 'on a request the edit was applied to, the rewrite starts after the recalling message's own text and the block is charged where it was billed; on every other request the rule is today's'. (5) Replace the 'inside or after' and 'design's' scenarios with a worked table with numbers (applied vs not, first request vs later, warm vs cold). I recommend estimate-only, not measured-from-response: the response-derived excess needs a new-tail estimate and a TTL discriminator, neither measured, and pi's cache-warmer replays make it noisier."
    },
    {
      "id": "R6",
      "severity": "major",
      "location": "specs/tail-recall/spec.md scenarios 'The recalling request reads its prefix', 'The next turn's first request reaches…', 'A turn longer than the lookback', 'A turn longer than the entry's remaining lifetime'; proposal.md Impact ('verified by hand')",
      "finding": "The billing scenarios are written as measured token counts from one-off probes. No automated test can prove them, and no scripted live check or named owner is defined. A scenario no test proves fails the plan unless it is marked as Joel's.",
      "rationale": "AGENTS.md: the session harness rewrites usage to chars/4 at zero cost, so cache behaviour is only observable live. The proposal says 'verified by hand' without naming who runs which route. AGENTS.md cites test-recall-live.mjs as the live-script precedent, but no .mjs file exists in the repository root (ls, find), so that precedent is stale and a new script needs its own file entry outside the lint allowlist. Hard-coded figures (6,923 / 3,731 etc.) depend on probe prompt content and will not reproduce. Haiku 4.5 needs a 4,096-token prefix to cache at all, and below that the provider returns 'no error' and no cache (Chidi), so a short prefix gives a false read of 0.",
      "concrete_case": "The coder runs the API-key probe with a 2,000-token prefix: cache read 0, write 0, and the script wrongly reports the fix failed (or, inverted, a broken fix passes).",
      "recommendation": "Split every scenario. (A) Payload-shape scenarios (marker positions, count ≤ 4, TTL copied, message text and order identical, inert, fail-open, route table) are automated tests at the handler and adapter, with the named failing test first. (B) Billing scenarios become inequalities, not recorded numbers: the next request's read is ≥ the block-free prefix tokens and the write is ≤ block + tail + a margin. They are proven by one new root script that takes CLAUDE_API_KEY from .envrc, asserts the cache-minimum precondition first, and is shown failing on the unfixed baseline. The coder runs API key and OpenRouter. OAuth and Joel's route are Joel's to observe and never ticked by the coder. State the script's repo-relative path and its lint/tsc/vitest exclusions in the design file list."
    },
    {
      "id": "R7",
      "severity": "major",
      "location": "specs/tail-recall/spec.md requirement 'The payload edit keeps other extensions' changes…'; scenario 'Nothing recalled'; scenario 'Another extension's marker survives'",
      "finding": "The spec's SHALLs conflict with the strategy and are silent on the case where no slot is free.",
      "rationale": "(a) 'Keeping every cache marker already on it' conflicts with moving pi's last-message point off the block and, on OAuth, dropping system[0]. (b) 'Nothing recalled: payload byte-identical to a request without recall' conflicts with a constant system[0] drop on 4-point payloads. Michael's M5 dropped it on every request. (c) If another extension already holds a slot, no rule says whether taiknr does P1 only, P2 only, or nothing. P1 alone fails the lookback case (M4), and the other extension could even turn a 'move' into a fifth point. (d) 'Retention follows pi's own' does not say which marker to copy when markers differ, and there is no scenario for pi placing none (cacheRetention none).",
      "concrete_case": "API key route, another extension marks a block, so 3+1 = 4 points. A recalling turn needs P1 on later requests and P2 on the next turn's first request. Add one and the request has 5 (a 400); add neither and the turn's loss returns. The spec says nothing either way.",
      "recommendation": "Rewrite the SHALL as an enumerated allowance: taiknr may remove (i) the marker on the recall block itself and (ii) system[0]'s marker on a 4-point payload; every other marker survives byte-identical. State the carve-out in 'Nothing recalled' for 4-point payloads, or drop system[0] only when a recall block is present and measure the hash toggle (R2). Define the no-slot rule: if the full edit does not fit in 4 points, send the payload unedited, and say so. Define the copy source: pi's own last-message marker object; if none exists, no edit."
    },
    {
      "id": "R8",
      "severity": "major",
      "location": "michael-orientation.md §6 ('Prototypes: None needed before the council'); owner-rulings.md ('Unknowns are settled by probing before they are planned on')",
      "finding": "The orientation says no prototype is needed, but the strategy the design must pick (R2) has not been run. Joel's own rule is to probe unknowns before planning on them.",
      "rationale": "M4-M6 measured 'add P1 (pi's point stays on the block) plus P2 plus a tools drop'. moved.log measured 'move' for P1 alone, for one turn. Unmeasured: move plus P2 with pi's point never on the block; consecutive recalling turns under 'move'; OAuth with a constant system[0] drop and nothing else touched; 1-hour retention (orientation trap 7 says the ordering violation 'wasn't measured', and the probes used a bare {type:'ephemeral'}); and a probe that copies pi's own cache_control object instead of a bare one.",
      "concrete_case": "A coder implements 'move' because Q1(a) forces it on Joel's route, and the first live run reads 0 on the next turn because P2 and the moved P1 interact, e.g. the entry P1 wrote is not at the position P2 hashes. That surfaces in Implement, not in the council.",
      "recommendation": "Run one probe round before design is final, using the existing longprobe.ts shape with a 'move' mode that copies pi's marker object. Cover: API key (coder, .envrc), OpenRouter anthropic/claude-haiku-4.5, pi's OAuth (Joel's subscription, Michael's earlier arrangement), a 36-block recalling turn, two consecutive recalling turns, and PI_CACHE_RETENTION=long. Spend is on the order of the cents already measured. Record results in design.md as measurements, with tool and entry for each cell. If the move strategy loses on any route, that route's edit is dropped from scope (Q3(a) measured routes only)."
    },
    {
      "id": "R9",
      "severity": "major",
      "location": "michael-orientation.md trap 8; research-eleanor.md 'Potential payload discoverability'; specs/tail-recall/spec.md 'A request taiknr built nothing for'",
      "finding": "Block identification and arming are undefined. 'The session's taiknr state knows nothing about' is not tied to any state that exists.",
      "rationale": "The only marker is the text of the recall block, and pi sanitizes surrogates in text (anthropic-messages.js ~1320), so an exact match against what recall built can miss. A prefix match can hit a user's pasted `<recalled_context`. The spec's no-op scenario for classifier calls rests on 'state', but no state is named. Michael did not check whether classifier calls reach the hook. They go through ctx.modelRegistry.classify (pi-jev-scorer-adapter.ts:57), and the hook is wired to the agent loop's onPayload (sdk.js:273), so they probably do not, but that is unmeasured. Pi's cache warmer replays run.context through streamSimple with the original run options (cache-warmer.js:183), so replayed payloads probably reach the hook. Provider retries may call the hook again for the same request.",
      "concrete_case": "A user pastes text containing `<recalled_context>` into a prompt where recall returned nothing. A prefix-only matcher puts a point on the block before it, wasting a slot, or the move strips pi's real last-message point. A cache-warm replay of the recalling request carries the same block and must not advance the 'previous block' position.",
      "recommendation": "Require both: the recall handler wrote 'a block was produced for this request' into the R4 cell, and the payload's last user message ends with exactly one text block starting with the recall open marker (exact delimiter strings from src/domain/recall.ts) and ending with its close marker. Anything else is a no-op. Make the handler idempotent on the same payload, so a replay or retry yields the same edit and moves no state. Add tests for the pasted-marker case, a surrogate in the block, a block that is the first block of its message, and a replay of one payload twice."
    },
    {
      "id": "R10",
      "severity": "minor",
      "location": "michael-orientation.md §3 trap 13, §6 ('Whether the next-turn point targets … fresh stub')",
      "finding": "The question of extending the next-turn point to settlement stubs should be answered no for this change.",
      "rationale": "Proposal 'Deliberately not' already excludes stubbing and settlement, and Joel's Q3(a) limits action to measured routes. Stub-only losses stayed at 2k-18k before recall (M1), so how often a stub rewrite matters is unmeasured. A stub-driven point would need its own probe and its own dollar term.",
      "concrete_case": "Including it adds a second trigger to the P2 logic and a second placement case to the figures without any measurement behind it.",
      "recommendation": "Keep out. Record trap 13 as a follow-up measurement in design.md's Migration Plan (not in tasks.md)."
    },
    {
      "id": "R11",
      "severity": "minor",
      "location": "specs/tail-recall/spec.md (all added requirements); future tasks.md",
      "finding": "The edit's boundary cases and the file boundary are not named, so the future tasks would leave test boundaries to the coder.",
      "rationale": "The standard requires each task to name its boundary cases or state none. The pi payload has unusual shapes: empty system messages with output_config interleaved with assistants and appended last, string versus array content (pi turns a string into one text block when it marks it), and a recall block that can be the first block of its message.",
      "concrete_case": "The recall block is the first block of its message and has no preceding block for P1 to sit on, so the coder would have to invent a rule.",
      "recommendation": "Name these boundary cases in design.md and tasks: no preceding block, place P1 on the previous message's last cacheable block or skip with a no-op; recall block absent; cacheRetention none; ctx.model undefined; four points already present; another extension's markers; empty or system-role messages in the payload; string-content messages. File boundary to list: Create src/infra/pi-event-handlers/before-provider-request.ts (or the chosen name), Create the infra payload-edit and route-predicate adapter, Create the R4 cell in infra or app, Create the live script and its tests mirrors, Modify src/app/extension/taiknr.ts, Modify src/use-cases/instruments-publisher.ts and src/infra/pi-event-handlers/context.ts (write to the cell), Modify src/domain/savings-dollars.ts, Modify src/app/extension/instruments-holder.ts (no-op method), Modify tests/app/extension/taiknr.test.ts (the event list gains before_provider_request), Modify the publisher and savings tests. .gitignore is already done and needs no task. The ADR and README edits are Bambadjan's docs pass, not tasks."
    },
    {
      "id": "R12",
      "severity": "minor",
      "location": "specs/tail-recall/spec.md 'The record of what a recall block costs follows the measurement'; specs/context-figures/spec.md 'A figure that reads negative says why'; specs/development-checks/spec.md",
      "finding": "Documentation scenarios have no named proof, and the evidence cites differ from the live files.",
      "rationale": "Docs are excluded from tasks.md, so the README and ADR scenarios need an owner for their proof (Bambadjan's pass) stated in the spec, or they fail the 'every scenario has a task and a test' rule. Michael cites .gitignore:11 and Eleanor cites :8. On disk .envrc is line 12 under '# Local secrets loaded by direnv', and .gitignore also holds '.scratches/', which the modified requirement's list omits. ADR 0009 is the next free number (docs/adr holds 0001-0008). AGENTS.md's 'twelve non-session_start registrations' becomes thirteen. Whether 1b773fe (Michael's cite) is on the branch was not verified.",
      "concrete_case": "The development-checks scenario '.envrc stays out of the repository' is provable with `git check-ignore -v .envrc` from the working tree and needs no vitest file.",
      "recommendation": "Mark the docs scenarios as proven by Bambadjan's pass plus Stage review, and the .envrc scenario by `git check-ignore -v .envrc` run once at verification. Cite the line as 12, or drop line numbers. Add '.scratches/' to the requirement's list or say the list is not exhaustive. Name the ADR as docs/adr/0009-… in the design file list."
    },
    {
      "id": "R13",
      "severity": "minor",
      "location": "specs/tail-recall/spec.md 'A payload it cannot read'; package.json peerDependencies",
      "finding": "Fail-open covers a throw and an unreadable shape. It does not cover pi version drift that leaves a parseable payload with changed semantics, and nothing states the error shape or the log at the boundary.",
      "rationale": "peerDependencies is '*' for the pi host, and the edit depends on pi marking the last block of the last user message and on the shape of its system and effort messages. If pi stops marking, the handler's find-the-marker step yields no marker and must no-op. The standard asks for the entry, decision and outcome fields and the error behaviour at a new entry point. The repo has no logger (grep), and the only user channel is the once-per-session notifier.",
      "concrete_case": "A pi release moves its marker to a different block. The handler finds a marker on a non-block and moves it, or finds none and edits nothing, but the publisher assumes 'applied'.",
      "recommendation": "State in design.md: the handler never throws and returns undefined for no edit and the edited clone otherwise; it logs nothing and raises no notice (no new surface); 'applied' for the publisher is derived from the finished clone (P1 present on the block's predecessor, no marker left on the block), not from intent. Test the 'no marker found' and 'marker on an unexpected block type' paths."
    }
  ],
  "assumptions": [
    {
      "assumption": "The billing mechanism (M1: block plus pi's last-message point causes the rewrite) holds; I did not re-measure it.",
      "status": "unverified"
    },
    {
      "assumption": "The BeforeProviderRequestEvent carries only payload, and the handler gets ctx.model; the runner swallows a handler's throw (runner.js:1074-1100).",
      "status": "verified"
    },
    {
      "assumption": "Joel's attribution extension registers provider 'anthropic' and asserts topology after the onPayload chain (anthropic-attribution.ts:1214, 3104, 3181-3210).",
      "status": "verified"
    },
    {
      "assumption": "The M5 probes dropped the tools marker on each turn's first request and left pi's point on the block (longprobe.ts, long-carry.log, long-oauth-carry.log, long-or-carry.log).",
      "status": "verified"
    },
    {
      "assumption": "The instruments publisher is a no-op, with no baseline, while jeffersonInstruments is false.",
      "status": "verified"
    },
    {
      "assumption": "Pi's payload inserts empty system messages with output_config, and merges consecutive toolResults, so context-list indexes do not equal payload indexes.",
      "status": "verified"
    },
    {
      "assumption": "Classifier calls do not pass through before_provider_request, and the cache warmer's replays do.",
      "status": "unverified"
    },
    {
      "assumption": "Joel's guard hashes messages without cache_control, so a message-level move passes once relaxed (Michael's claim at his §5 Q1).",
      "status": "unverified"
    },
    {
      "assumption": "Moving a message-level point cannot break thread continuation (Chidi #4, source reading only; continuation never observed).",
      "status": "unverified"
    },
    {
      "assumption": "The 'move' strategy (R2) at 4 points on the 3-point routes yields the same read/write as the measured 'add' strategy.",
      "status": "unverified"
    }
  ],
  "owner_questions": [
    {
      "question": "Joel: should his guard relaxation land and be verified before the taiknr PR merges, with the reverse order at rollback?",
      "options": [
        "His edit first, verified against unchanged taiknr; taiknr merges after; his acceptance session last",
        "taiknr ships first and his recalling requests fail until his edit lands (no skew protection)"
      ],
      "recommended_option": "His edit first, verified against unchanged taiknr; taiknr merges after; his acceptance session last",
      "why": "taiknr cannot detect his route or catch his guard's error. Only the order protects his sessions, and the choice is his, since the extension is his."
    },
    {
      "question": "Michael: which slot strategy ships? It decides whether system and tools markers are ever touched and whether Joel's route can be served at all.",
      "options": [
        "'Move' message-level points only on routes with fewer than 4 points; on 4-point payloads drop system[0] constantly, as a stated carve-out, and measure it (R2, R8)",
        "Keep the measured 'add' strategy with the tools marker toggled per turn, and amend the spec and accept the thread-hash change and Joel's route erroring under Q1(a)",
        "'Move' everywhere, and on 4-point OAuth drop system[0] only on requests that need a slot, accepting a one-time hash toggle"
      ],
      "recommended_option": "'Move' message-level points only on routes with fewer than 4 points; on 4-point payloads drop system[0] constantly, as a stated carve-out, and measure it (R2, R8)",
      "why": "It is the only option consistent with Q1(a), Chidi #4 and the spec's 'identical across requests'. Its cost is that a no-recall OAuth request is no longer byte-identical, which R7 writes into the spec."
    },
    {
      "question": "Michael: how does the figure learn what was applied, and is the rewrite estimated or measured from the response?",
      "options": [
        "Estimate, with a new publisher method taking a deferred 'applied placement' reading derived from the edited clone (R5)",
        "Measure the rewrite from the response's cache split when taiknr changed the prefix",
        "Both, with the measured value as a cross-check"
      ],
      "recommended_option": "Estimate, with a new publisher method taking a deferred 'applied placement' reading derived from the edited clone (R5)",
      "why": "It is testable at the handler with scripted usage, needs no new-tail estimate or TTL discriminator, and keeps Joel's 'keep it simple, make it reliable'. Under-reporting on unreached routes is already ruled as recorded (Q3(a))."
    },
    {
      "question": "Michael: does the payload handler share state with the publisher's baseline or with a new neutral cell?",
      "options": [
        "A new neutral session cell in infra with fingerprint validation (R4); the publisher gets only a deferred placement reading",
        "Extend InstrumentsHolder and the publisher's baseline"
      ],
      "recommended_option": "A new neutral session cell in infra with fingerprint validation (R4); the publisher gets only a deferred placement reading",
      "why": "With the instruments switch off the publisher is a no-op with no baseline, and its index is in context-list coordinates, not payload coordinates."
    }
  ],
  "not_checked": [
    "Joel's attribution extension's lineage hash behaviour for message-level cache_control beyond its :3181-3220 guard text (not re-run)",
    "Whether pi's provider-level retries call before_provider_request again for the same request, and whether compaction summaries reach the hook",
    "Cache-warmer replay payload shape and whether getCacheWarmingRequestOptions keeps onPayload (I saw only the streamSimple call at cache-warmer.js:183)",
    "Behaviour of an openai-completions-shaped OpenRouter request with cacheControlFormat 'anthropic' (Chidi #5; no probe)",
    "Opus 5.5 / Opus on Joel's route: all probes used Haiku 4.5",
    "Whether the tools-marker toggle changes pi's thread hash in practice (thread continuation never observed)",
    "git history: whether 1b773fe is on the branch and .gitignore is committed (no git access)",
    "Biome allowlist and tsconfig placement of the new live script (depends on its path)",
    "design.md and tasks.md do not exist yet; task hygiene, test-first naming and dependency ordering are listed as requirements, not verified",
    "No model calls made and no probe run by me"
  ]
}