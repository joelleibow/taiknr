{
  "mode": "review",
  "lens": "council-critic",
  "paraphrase_proposes": "",
  "paraphrase_existing": "",
  "recommendation": "Needs fixes. The decisions, file placement, alternatives and rollback order meet feature-spec-standard. Two major gaps remain.\n\n1. **Record (b) is committed in the wrong place (CR-1).** It is written at `before_provider_request`, so any second firing of that hook for the same request overwrites it. That happens on pi's agent-level auto-retry, the strict-tools fallback loop, and an idle warm replay that fires while the next turn's classifier is running. Each case loses the carry on exactly the handoff request this change exists to fix. The design's own claim that 'a retry reuses the payload without re-firing the hook' cites pi's `before_provider_headers` doc, not the `before_provider_request` one.\n2. **Joel's two live routes cannot force recall to fire (CR-2).** The script writes nothing to his agent directory, so nothing sets `decisionThreshold: 0` for his runs, and the recall precondition would exit 3.\n\nFix CR-1 by computing record (b) in the hook and committing it only at a valid assistant `message_end`. One change closes all three re-fire paths. The nine minor items are wording, residual-recording and test-procedure fixes.",
  "findings": [
    {
      "id": "CR-1",
      "severity": "major",
      "location": "design.md D6; §4.3 (5) 'Commit, on every handler call'; §4.3 (6) 'Replays and retries'; §4.2 one-writer rule; §5.1 last row",
      "finding": "Record (b) is rewritten every time `before_provider_request` fires. Three pi paths fire it again for the same logical request, so the second firing sees the carrier the first one just recorded and places no carry.\n\n- **Agent-level auto-retry.** It is on by default (`retry.enabled: true`, `maxRetries: 3`) and re-runs the agent loop, so the whole hook chain fires again.\n- **The strict-tools fallback.** It rebuilds params and calls `onPayload` again inside the same request.\n- **An idle cache-warmer replay.** A replay can fire while the next turn's `context_with_system` is still awaiting the classifier. With cell (a) cleared, the replay finds no carrier and writes record (b) = null.\n\nThe statement 'A retry reuses the payload without re-firing the hook' is wrongly attributed. That sentence in pi's docs is about `before_provider_headers`.",
      "rationale": "Each path drops the carry on exactly the handoff request the change targets, and M1's loss comes back with no signal. Each path is reachable with pi's defaults or ordinary provider errors:\n\n- `agent-session.js:1604` with `_prepareRetry` at `:3189-3225`, and `settings-defaults.js:17-19` (retry enabled by default);\n- `anthropic-messages.js:623-666`: the `for(;;)` loop re-calls `options.onPayload` after a strict-tool-limit 400;\n- `settings-defaults.js:60`: `cacheWarming: \"idle\"` is the default;\n- `cache-warmer.js`: the run is cleared only by the next `start()`, which `sdk.js:268-269` calls inside `streamFn`, after `transformContext` has run `context_with_system`;\n- `cacheContextIsCurrent` (`sdk.js:213-222`) still holds when the new user message has been appended, so the replay is not stopped;\n- `docs/extensions.md:846-862`: the 'retries reuse' line sits under `before_provider_headers`.",
      "concrete_case": "**Auto-retry.** Turn 2 recalled, with its carrier at m[26]. Turn 3's handoff request H places the carry and the before point, and rewrites record (b) to {index of U3}. The stream then fails mid-response with `overloaded_error`. pi auto-retries and rebuilds H′. The adapter reads record (b) = U3, U3 still ends with recall's block, so H′ gets no carry. It reads only system and tools and rewrites turn 2, which is M4's shape (read 0, write 10,659).\n\n**Warm replay.** The session sits idle about 4.5 minutes after a recalling turn, and the user types a prompt. The context handler clears cell (a) and awaits the classifier. The warmer's timer fires and replays the last turn-2 request. With cell (a) null no carrier is found, so record (b) is set to null, and turn 3's first request places no carry.",
      "recommendation": "Have `edit` return the next record without committing it.\n\n- Commit record (b) only at the assistant `message_end` that has a valid, non-error response. Use the existing `message_end` registrar, which runs whatever `jeffersonInstruments` is.\n- Replays never reach `message_end`, errored attempts never commit, and the strict-tools re-fire sees the unchanged record.\n- In `context.ts`, write cell (a) once at the end of the handler, null on every early return, instead of clearing it at the top before the await.\n- Fix the citation in §4.3 (6), D6 and the spec scenario 'A request taiknr built nothing for'.\n- Add three handler tests: a hook fired twice for one handoff with no `message_end` between still places the carry the second time; an errored `message_end` does not commit; and a replayed payload does not change record (b)."
    },
    {
      "id": "CR-2",
      "severity": "major",
      "location": "design.md §7.2 route table and the paragraph 'Joel's two runs use his own agent directory, where the script writes nothing'; §7.3 Preconditions",
      "finding": "Only Derek's runs get `{\"decisionThreshold\": 0}`, through a temporary `PI_CODING_AGENT_DIR`. The `anthropic-oauth` and `attribution` runs use Joel's own agent directory, which the script does not write to. The design never says how the threshold reaches those two runs.\n\nWith Joel's normal threshold, recall may not fire on every request of turns 2 and 3. The script's precondition then exits 3, and two of the four owner-required routes produce no acceptance evidence.",
      "rationale": "The owner ruled that every route needs a measured result (owner-rulings Q1(a), Q3(a)). The script makes recall fire deterministically only with threshold 0 (`src/domain/recall.ts:14`).\n\nConfig is read from the agent directory or from a trusted project file (`session-start.ts:16-17`). A fresh `mktemp -d` cwd is not a trusted project, so a project file there would be ignored.",
      "concrete_case": "Joel's `~/.pi/agent/pi-taiknr.json` has `decisionThreshold` 0.5. Turn 2's classifier scores the stubbed `seq` output at 0.3, so turn 2 carries no `<recalled_context` block. The script exits 3 with 'precondition: turn 2 request 1 carries no block', and the OAuth and attribution routes have no evidence.",
      "recommendation": "State how threshold 0 reaches Joel's runs. Either:\n\n- point `PI_CODING_AGENT_DIR` at a temporary copy of his agent directory (auth file and extensions included) with the test `pi-taiknr.json` written into the copy, then remove it at exit; or\n- have the precondition print the exact config Joel must set beforehand.\n\nAlso say whether his runs use a temporary cwd."
    },
    {
      "id": "CR-3",
      "severity": "minor",
      "location": "design.md §4.3 (5) vs §4.3 (4) 'Zero, or two or more' and 'A target that already carries pi's recognised marker'; §4.2 `carrierRead`",
      "finding": "Two parts of §4.3 contradict each other.\n\n- **The `applied` rule versus `carrierRead`.** (5) makes `applied` null 'when no message-level point was placed'. In the coincident carry (the carrier is the last message, lost its block in place, and pi's marker already sits on the fingerprint block) nothing is placed, so `applied` is null. But §4.2 defines `carrierRead` as set whenever the finished clone has a marker on the fingerprint block, which pi's marker is. The publisher therefore falls back to today's start and charges the carrier's own content, which the provider read.\n- **The record rule.** (5) says record (b) is rewritten 'from every payload under (4)', but (4)'s zero-or-two-or-more bullet and D6 say it is left as it is.",
      "rationale": "The contract is supposed to have one source. As written, an implementer must pick one of two readings, and one of them misprices the request.",
      "concrete_case": "U is the last message and loses its block in place: recall returns [] on a re-request of the same prompt. pi's marker sits on U's last own block, which equals the fingerprint. Nothing is wanted, so `applied` is null and `rewriteOf` starts at `carried.index`. The charge then includes U's own tokens (6,811–15,321 in the measured runs) that the provider actually read.",
      "recommendation": "Make `applied` non-null whenever the payload was covered and normalized with exactly one message marker. Derive `carry`, `carrierRead` and `block` from the finished clone even when nothing was placed, and limit null to untouched, thrown and zero-or-two-or-more-marker payloads. In (5), reword the record rule as 'every payload under (4) except the zero-or-two-or-more case'. Add the coincident case to the publisher tests."
    },
    {
      "id": "CR-4",
      "severity": "minor",
      "location": "design.md D2 budget; §4.3 (4) 'Recognising pi's message marker' and 'The budget'",
      "finding": "The design never says how deep the marker count reads. Anthropic counts a `cache_control` anywhere toward the four-point limit, including blocks nested inside `tool_result.content`. If the count reads only top-level message blocks, an earlier extension's nested marker is missed, the payload looks like 'exactly one message marker', and taiknr adds points up to a fifth.",
      "rationale": "A fifth point is a 400, not a silent drop (Chidi #2). That turns the fail-open design into a failed request, and the design treats only extensions that run after taiknr as the five-point risk (§5.3).",
      "concrete_case": "An extension loaded before taiknr marks `messages[5].content[0].content[0]`, a text block inside a `tool_result`. A shallow count sees one message marker (pi's) and a budget of 2, so taiknr places the carry and the before point and removes pi's marker. The wire then carries system, tools, carry, before and the nested marker: five points, and Anthropic returns 400.",
      "recommendation": "Define a 'marker' as every `cache_control` key found by a recursive walk of the normalized clone. Count message-level markers recursively within `messages`. Add an adapter test with a nested `tool_result` marker that expects no message-level edit."
    },
    {
      "id": "CR-5",
      "severity": "minor",
      "location": "design.md D2 'room for one more means pi's marker stays; otherwise it is removed'; §4.3 (5) record written in the no-fit case; Risks and residuals",
      "finding": "The binding rule has two consequences on a budget-1 payload (three markers besides pi's, for example a foreign top-level marker over an API key) that the design does not record.\n\n- **In-turn steps lose their tail cache.** An in-turn request wants only the before point, which fits, so pi's last marker is removed. The tool-result tail after the before point is then neither cached nor read on any step, where today pi's marker caches it step by step.\n- **The figure undercharges after a no-fit.** A no-fit handoff-plus-recall request still records its carrier, but no request writes an entry at that fingerprint when the turn has no tool calls. The next handoff places a carry on an entry that was never written, and `carrierRead` tells the publisher the carrier's content was read, so the charge undercounts.",
      "rationale": "This is not a challenge to the ruling. The design's Risks section should name the concrete cost, and the figure should not claim a read that never happened.",
      "concrete_case": "A top-level marker added by another extension makes the budget 1. Turn 2 runs 12 tool calls with a 30k-token tail. Every step bills about 30k as input instead of reading it, about 360k input tokens where today it would be about 36k read-equivalent. The figure does not show this.",
      "recommendation": "Add a Risks bullet for the budget-1 tail cost and for the undercharge after a no-fit. Optionally, have the adapter record the carrier only when the before point was placed or pi's marker sits on the fingerprint block, which costs no extra code path."
    },
    {
      "id": "CR-6",
      "severity": "minor",
      "location": "specs/tail-recall/spec.md scenario 'The route cannot be switched mid-session'; design.md D3 'every request of an active session'",
      "finding": "The scenario says that changing the model needs `/reload`. That is false: `/model` and model cycling change `ctx.model` within a session (pi docs on virtual models: 'ctx.model and the session's model selection name the virtual model'; `sdk.js:216` reads `agent.state.model` per request). The binding carve-out ruling covered only `enabled`. The design does not say what happens to record (b) across a switch between covered routes.",
      "rationale": "The scenario asserts something that is not true and cannot be tested. The real behaviour is safe: D1 is evaluated per request, the fingerprint check guards the carry, and a cold request is never charged. The design should state that rather than rely on the false claim.",
      "concrete_case": "A user switches from `anthropic/claude-haiku-4-5` to `openrouter/anthropic/claude-haiku-4.5` mid-turn. The next request is covered, and record (b) holds the Anthropic payload's index. If the fingerprint matches, a carry is placed on an OpenRouter request that has no entry there. That request is cold, so no rewrite is charged, which is harmless but unstated.",
      "recommendation": "Drop 'or the model' from the scenario. Add one sentence to D3/§4.2: 'A model switch is evaluated per request by D1. Record (b) carries across it, and a mismatched or cold carry costs nothing and charges nothing.'"
    },
    {
      "id": "CR-7",
      "severity": "minor",
      "location": "design.md Terms, 'Joel's attribution route … reports the same provider, api and baseUrl as pi's own route'; §7.2",
      "finding": "The design states as fact that Joel's route reports the same `baseUrl`. Michael's own 'route predicate' ruling records this as 'inferred, not measured' and asks for confirmation at Validate. Joel's `registerProvider('anthropic', { api, streamSimple })` sets no `baseUrl` (`anthropic-attribution.ts:3656-3664`), and no Validate step checks it.",
      "rationale": "If `ctx.model.baseUrl` is not on api.anthropic.com for his route, D1 silently excludes it. His attribution run would then fail the marker assertions with no hint of the cause.",
      "concrete_case": "`ctx.model.baseUrl` is undefined under his re-registration. D1 is false, the payload goes out unedited, and his run fails 'a marker on the last block of turn 2's user message' with no hint that the predicate is the cause.",
      "recommendation": "Mark the claim as an assumption in Terms. In §7.3, have the observer print `ctx.model.provider/api/baseUrl` on the first request, and add a precondition that D1 holds, exiting 3 with that reason if it does not."
    },
    {
      "id": "CR-8",
      "severity": "minor",
      "location": "design.md §6.3 'What still under-reports'; Risks and residuals",
      "finding": "Virtual models are never covered and the design does not name them. For a virtual model (`pi.registerVirtualModel`), `ctx.model` names the virtual provider and id, not the physical Anthropic model the router picks, so D1 is false and the payload goes out unedited.",
      "rationale": "Q3(a) requires the under-reporting to be recorded. 'Any provider outside the predicate' does not tell a user that a router sitting in front of Anthropic opts them out of the fix.",
      "concrete_case": "A session on a `jev-router`-style virtual model routes implementation turns to `anthropic/claude-opus` over OAuth. `ctx.model.provider` is the virtual provider, so nothing is edited, and M1's loss and under-reporting continue.",
      "recommendation": "Add virtual models to the README's under-reporting list and to §6.3. State that coverage follows `ctx.model`, not the physical model in the payload."
    },
    {
      "id": "CR-9",
      "severity": "minor",
      "location": "proposal.md Impact 'the no-op publisher in src/app/extension/instruments-holder.ts gains the new deferred reading'; proposal.md What Changes 'if the wanted points exceed it the payload goes out unchanged'",
      "finding": "The proposal and the design disagree in two places.\n\n- **`instruments-holder.ts`.** The proposal names it as changing, but the design adds no publisher method and leaves it out of the file table.\n- **The no-fit case.** The proposal says the payload goes out unchanged, while the design (D2, §4.3) sends the normalized clone with the carve-out applied.",
      "rationale": "Feature-spec-standard §1 requires one home per fact. A planner who reads the proposal would schedule a holder change and expect a byte-identical OAuth no-fit payload.",
      "concrete_case": "The tasks author adds 'update `noOpPublisher` for the deferred reading' from the proposal's Impact list. They also write a test expecting an OAuth no-fit request to deep-equal its input, which contradicts §7.1's no-fit test.",
      "recommendation": "Correct the proposal to match the design: drop `instruments-holder.ts`, and change the no-fit case to read 'no message-level edit; the carve-out still applies'."
    },
    {
      "id": "CR-10",
      "severity": "minor",
      "location": "design.md §7.2 'Discrimination, once at Validate'; §7.3 Assertions on H and Output",
      "finding": "The discrimination run expects to record that the base commit 'fails the read assertion'. But the marker assertions come first and also fail on the base commit, which edits no payload. If the script exits on the first failure, the read inequality is never evaluated, and the discrimination evidence the design relies on is never produced.",
      "rationale": "The read and write inequalities are what separate fixed from broken billing (M4). The marker checks only prove the edit ran.",
      "concrete_case": "On the base worktree, H carries pi's single last marker. 'A marker on the last block of turn 2's user message' fails first, the script exits 1, and the log never shows `read_H` against its bound.",
      "recommendation": "Have the script evaluate every assertion, print each result, and exit 1 if any failed. The discrimination record then quotes the read line explicitly."
    },
    {
      "id": "CR-11",
      "severity": "minor",
      "location": "design.md D5 and §4.3 'When a handoff occurs' (fingerprint 'canonical JSON for a non-text block')",
      "finding": "The design does not say whether a non-text fingerprint excludes `cache_control`. If the before block is an image, its canonical JSON is recorded unmarked, but in the coincident case the same block later carries pi's marker. The JSON then differs, so the carry check and `carrierRead` both miss.",
      "rationale": "The miss is safe, since nothing is wrongly edited. But the publisher overcharges the carrier's own content, and an implementer cannot tell the rule intended to ignore markers.",
      "concrete_case": "U3's content is [image, recall block], and recall drops the block in place while U3 is last. pi marks the image. Its canonical JSON now includes `cache_control`, so it no longer equals the recorded fingerprint. `carrierRead` is null and the rewrite charge includes U3's tokens.",
      "recommendation": "State that the fingerprint, and the comparison against it, strip `cache_control` at every depth before canonicalising. Add an adapter test with an image fingerprint."
    }
  ],
  "assumptions": [
    {
      "assumption": "Cache-warmer replays call the agent's `onPayload` and so fire `before_provider_request`. They emit no `message_end`, only a `cache_warm` usage entry.",
      "status": "verified"
    },
    {
      "assumption": "`cacheWarmer.start()` runs inside `streamFn`, after `transformContext`. So the previous request's warm run stays live through the next request's `context_with_system`, including the classifier await.",
      "status": "verified"
    },
    {
      "assumption": "pi's agent-level auto-retry, on by default with up to 3 attempts, rebuilds the request and so re-fires `context_with_system` and `before_provider_request`.",
      "status": "verified"
    },
    {
      "assumption": "Mid-stream provider errors (for example an SSE `overloaded_error`) reach agent-level auto-retry rather than an SDK retry that reuses the body.",
      "status": "unverified"
    },
    {
      "assumption": "`onPayload` receives the full params before `prepareThreadRequest` slices them for a thread continuation, so record (b) is computed on full payload coordinates.",
      "status": "verified"
    },
    {
      "assumption": "Joel's re-registered `anthropic` provider exposes `ctx.model.baseUrl` on api.anthropic.com.",
      "status": "unverified"
    },
    {
      "assumption": "The probe counts (N1–N8, 132/132, 152 requests) are as Michael reports them. I did not re-read the logs under `.pi/marbleization/`.",
      "status": "unverified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "research-chidi.md, council.md and the earlier review rounds were not re-read. I took the design's citations of Chidi #2 and #4 as given.",
    "The probe logs and `dr-s2-harness.mjs` / `dr-s2-blockrate.py` under `.pi/marbleization/` were not re-run or opened.",
    "How likely a mid-stream overloaded error is to reach auto-retry versus an SDK-level retry was not measured.",
    "Whether the `fetch`-wrapping observer in §7.3 sees Joel's transport's wire payloads was not checked.",
    "The remaining text of specs/development-checks/spec.md was not reviewed."
  ]
}