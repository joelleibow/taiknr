# Spec Delta — tail-recall

## ADDED Requirements

### Requirement: A recall block does not cost the turn its cached prefix

On the routes the predicate covers, a request carrying recall's block SHALL carry a cache point on the block just before it, and a handoff request SHALL carry one on the last block of the previous carrier, so the next turn reaches an entry the recalling turn wrote. Message text, block order and message positions SHALL NOT change: only message-level markers move (M1; N3; ADR 0007; ruling "marker allowance").

#### Scenario: The payload shape is the guarantee

- **WHEN** a covered route's request carrying recall's block goes out with the edit applied
- **THEN** the block just before recall's block carries a point, and a provider read or write is a consequence of an entry an earlier request wrote, a prefix above the model's minimum, an entry inside its TTL and an applied edit, so no read is claimed when one of those fails (Chidi #2; ruling "read guarantees")

#### Scenario: The recalling request reads the previous request's entry

- **WHEN** a request carrying recall's block goes out on a covered route
- **THEN** its cache read covers the entry the previous request wrote, and what it writes is the previous turn's final reply, the new prompt and the block, which the provider bills as plain input because pi's marker is no longer on it — not "the block onward alone" (M1; N3; ruling "read guarantees")

#### Scenario: The next turn's first request reaches the recalling turn's entry

- **WHEN** the turn after a recalling turn opens, with or without a block of its own
- **THEN** its first request reads at least the prefix through the carrier's own content and writes no more than the previous turn's content plus the new prompt and tail, measured over an API key at 8,132 read against 1,142 written on a turn that recalled nothing, 6,896 against 1,236 on the handoff that also recalled, 7,836 through OpenRouter and 16,240 on Joel's attribution route, where before this change eleven such turn starts read the 35,731-token entry alone and rewrote 41k–143k tokens each (M1; N3; N5; N7)

#### Scenario: A turn longer than the lookback

- **WHEN** a recalling turn makes twelve sequential tool calls, carrying 36 content blocks, so the block sits past the provider's lookback
- **THEN** the next turn's first request still reads an entry from that turn — 6,896 read against 1,236 written over an API key — where a point before the block alone left it reading 0 and writing 10,659 (M4; N3)

#### Scenario: A turn longer than the entry's remaining lifetime

- **WHEN** a recalling turn runs 7.5 minutes and the next turn's requests follow
- **THEN** the next turn's create request still reads an entry written during that turn, which read 8,138 and wrote 3,850 in the measurement (N2)

#### Scenario: The turn continues a thread

- **WHEN** the model continues message threads, so the requests after a turn's first carry no system, no tools and no before-point
- **THEN** the first request after the block leaves is still a create, because removing the block changes the hashed prefix, and that request carries the carry point — measured across a turn of one create and twelve continued requests, and after twelve continued requests on a non-recalling model (N1; N2; N4; ruling "thread continuation")

#### Scenario: Only the cache markers differ

- **WHEN** a covered route's request carrying a block is compared with the same request built without this change
- **THEN** every message, its text and its position are identical, and the message-level cache markers are the only difference, except the one system marker the carve-out removes (ADR 0007; S1; ruling "carve-out")

#### Scenario: Nothing recalled and nothing handed off

- **WHEN** a request carries no block and its previous request carried none, on a route whose payload has three points
- **THEN** the payload is byte-identical to a request without recall, because there is no block to place anything around and no carrier to carry (S1; ruling "byte-identical scope")

#### Scenario: A handoff that recalls nothing

- **WHEN** a request carries no block, and the previous request's carrier is present and no longer ends with recall's block
- **THEN** it carries the carry point anyway, because the carrier's last block still equals the fingerprint the previous request recorded, and a request need not recall for the carry to apply (N3; N7; ruling "byte-identical scope")

### Requirement: Only routes the predicate covers change

taiknr SHALL change the payload only where one predicate holds, read from `ctx.model`: provider `anthropic` with api `anthropic-messages` and a baseUrl on api.anthropic.com, or provider `openrouter` on that api with an `anthropic/` model id, on a payload carrying a `messages` array. Every other request SHALL go out byte-identical to today's (owner-rulings.md Q3(a); Chidi 5(b)–(c); ruling "route predicate").

#### Scenario: The measured routes carry the edit

- **WHEN** a session runs Anthropic direct over OAuth, Anthropic direct over an API key, or an Anthropic model through OpenRouter on the `anthropic-messages` api
- **THEN** each sends a request shaped as the requirement above states, each measured with a read against a write at the next turn's first request (N3; N5; N6; N8)

#### Scenario: Joel's route is served as pi's own provider is

- **WHEN** his `anthropic-attribution` extension's guard, with message points allowed but system, tools, identity and the four-point limit still protected, carries a taiknr edit
- **THEN** his route receives the same edit pi's own Anthropic provider receives, no guard error appears on any request, and this change does not edit his extension (owner-rulings.md Q1(a); N7; `research-attribution-guard.md`)

#### Scenario: A provider pointing at a proxy keeps today's payload

- **WHEN** the session's provider is `anthropic` with a baseUrl that is not api.anthropic.com
- **THEN** the payload is byte-identical to today's, because that route was never measured (Chidi 5(b); ruling "route predicate")

#### Scenario: Bedrock keeps today's payload

- **WHEN** the session's provider is Bedrock
- **THEN** the payload is byte-identical to today's, because Bedrock's boundaries are separate `cachePoint` items that an edit to a block's own marker never reaches, and nothing about Bedrock was measured (Chidi "Bedrock"; `michael-orientation.md` §3 trap 12)

#### Scenario: The other Anthropic-format gateways keep today's payload

- **WHEN** the session runs minimax, opencode, cloudflare-ai-gateway, vercel-ai-gateway, fireworks or github-copilot
- **THEN** the payload is byte-identical to today's, because OpenRouter's result does not prove another gateway and none of them was measured (Chidi "Other providers"; owner-rulings.md Q3(a))

#### Scenario: Gemini through OpenRouter keeps today's payload

- **WHEN** the session runs a Gemini model through OpenRouter
- **THEN** the payload is byte-identical to today's, because pi places no boundary there and the probe's added one changed nothing (`or-hydrogen-*.log`; Chidi verdict 5(c))

#### Scenario: OpenRouter's OpenAI-shaped path keeps today's payload

- **WHEN** an OpenRouter Anthropic model is routed on `openai-completions`, as a user's `models.json` can do with `cacheControlFormat: "anthropic"`
- **THEN** the payload is byte-identical to today's, because the predicate reads the api as well as the provider (Chidi 5(b); `compat-schema.js:203`)

#### Scenario: No model on the request

- **WHEN** `ctx.model` is undefined
- **THEN** nothing is edited (ruling "route predicate")

#### Scenario: A payload pi marked nowhere

- **WHEN** pi places no message-level cache marker on a payload, as with `cacheRetention` none
- **THEN** no message-level marker is placed or removed, and the payload goes out unchanged except where the carve-out removes a system marker, because the edit has no marker to copy and no boundary to work from (ruling "marker allowance"; ruling "carve-out")

### Requirement: The payload edit keeps other extensions' changes and the provider's limits

taiknr SHALL build the request from a copy of the payload, keep every marker another extension placed, place no more than four points in a request, and work on message-level markers only. It SHALL place at most two points, each a deep copy of pi's own message marker object with its `ttl`, and SHALL NOT throw (Chidi #2, #4; `research-attribution-guard.md`; ruling "marker allowance").

#### Scenario: The two points it wants

- **WHEN** a request carries recall's block, or a handoff request follows one whose carrier lost its block
- **THEN** taiknr places a **before** point on the block just before recall's block, and a **carry** on the last block of the carrier message, and no other point of its own (N3; ruling "marker allowance")

#### Scenario: The budget decides, and pi's marker yields

- **WHEN** taiknr counts the room for its points
- **THEN** the budget is four minus every marker on the normalized clone except pi's last-message marker — the top-level marker, the system markers left after the carve-out and the tools marker — and if the wanted points exceed it the payload goes out with no message-level edit, carrying only the carve-out where it applies; if there is room for one more, pi's last-message marker stays where pi put it; otherwise it is removed, and it is the only existing marker taiknr may remove, apart from the carve-out (N3; ruling "marker allowance")

#### Scenario: Another extension's marker survives

- **WHEN** another extension placed a marker anywhere under `messages`
- **THEN** its marker goes out byte-identical and taiknr makes no message-level edit to that request, because with two message markers pi's cannot be told apart; a foreign top-level, system or tools marker is counted in the budget and goes out byte-identical (`michael-orientation.md` §2; N3)

#### Scenario: The budget is spent, so nothing moves

- **WHEN** the markers already on the payload, pi's last-message one included, leave no room for the wanted points
- **THEN** apart from the carve-out's system marker on pi's OAuth shape the payload goes out as it arrived, and no fifth point is ever placed, because a fifth is a 400 and not a silent drop (Chidi #2; ruling "marker allowance")

#### Scenario: Tools, the top-level marker and foreign markers are untouched

- **WHEN** the edit runs on a payload that carries a top-level marker, two system markers, a tools marker and another extension's message marker
- **THEN** the top-level marker, both system markers, the tools marker and the foreign message marker go out byte-identical, except where the carve-out below removes one system marker (ruling "marker allowance")

#### Scenario: Two recalling turns in a row

- **WHEN** a turn that recalled is followed by a turn that also recalls, so the handoff request wants the carry and the before point at once
- **THEN** both fit at four points over an API key, because pi's last-message marker is the one that yields, and the request carries the carry, the before point, system[0] and tools (N3; ruling "marker allowance")

#### Scenario: The retention follows pi's own

- **WHEN** pi asked for long retention on its markers
- **THEN** the point taiknr places is a copy carrying the same `ttl`, so no 5-minute entry precedes a 1-hour one and no 400 follows — measured at `PI_CACHE_RETENTION=long` on every marker (N8; Chidi "Mixing different TTLs"; `michael-orientation.md` §3 trap 7)

#### Scenario: A block the handler cannot find

- **WHEN** the payload's candidate message carries fewer than two blocks, or no block equals the carried block's text after pi's lone-surrogate removal
- **THEN** no before point is placed and no carrier is recorded, so a user who pasted `<recalled_context` into their own message gets no edit (Chidi #4; `sanitize-unicode.js:21-24`; ruling "state homes")

#### Scenario: String content where a point would go

- **WHEN** the message that would carry a point has string content
- **THEN** the point is skipped and the content is not converted to a block list, because Joel's guard throws on that conversion (`research-attribution-guard.md`; ruling "state homes")

#### Scenario: A block that is first in its message

- **WHEN** recall's block is the first block of its message
- **THEN** no before point is placed, because there is no block before it, and the request goes out with the carry alone if one applies (ruling "state homes")

#### Scenario: A stale carrier

- **WHEN** the message at the recorded index no longer ends with the recorded fingerprint, as after a compaction, a `/tree` jump, `/new`, or merged or shifted messages
- **THEN** no carry is placed, because a mismatch costs the optimisation and never edits the wrong message (ruling "state homes")

#### Scenario: A payload it cannot read

- **WHEN** the payload holds a shape the handler cannot edit, or its own code throws
- **THEN** the request goes out as it arrived, because a handler's throw is swallowed by pi's runner and the fail-open path is the only safe one (`michael-orientation.md` §2; Chidi #4)

#### Scenario: A request taiknr built nothing for

- **WHEN** the hook fires for a cache-warmer replay, a strict-tools rebuild, an auto-retry, or a request that is never answered validly
- **THEN** nothing throws, record (b) changes only at a valid assistant `message_end`, and a re-fired request computes the same edit as its first firing (ruling "handler inputs")

### Requirement: The one carve-out on a four-point payload

On a covered payload whose system carries two marked blocks — pi's OAuth shape — the first block's marker SHALL be removed on every request of an active session. It SHALL never be removed per request only, tools SHALL stay marked, and nothing else in that system SHALL change. On this shape, the byte-identical promise holds except for that one marker (N6; Chidi #4; ruling "carve-out").

#### Scenario: The marker is gone on every request

- **WHEN** a session on pi's own OAuth provider builds its first and its hundredth request with taiknr active
- **THEN** neither carries a marker on the first system block, and both carry the second system block's marker, the tools marker and the message points (N6)

#### Scenario: The cost is about nothing

- **WHEN** the first system block's marker is removed
- **THEN** no prefix is lost, because the tools-plus-identity entry is a strict prefix of the second system block's entry (N6; ruling "carve-out")

#### Scenario: Joel's route never matches the shape

- **WHEN** his attribution transport marks one system block
- **THEN** the carve-out does not fire, and his system markers go out exactly as his transport built them (N7; `anthropic-attribution.ts:1329-1354`)

#### Scenario: The route cannot be switched mid-session

- **WHEN** an operator changes `enabled` during a session
- **THEN** the edit's shape does not change, because config is read at session start and a change needs `/reload`, which is a new session (ruling "carve-out")

#### Scenario: The model is switched mid-session

- **WHEN** `/model` changes the selection between requests
- **THEN** D1 is evaluated per request from `ctx.model`; record (b) carries across and is checked against its fingerprint; a carry on a request with no matching entry adds no cost, and the first request on the new model is cold, so no rewrite is charged (ruling "carve-out")

### Requirement: The payload edit is inert while taiknr is off

While the session's config is rejected or `enabled` is false, the payload this change edits SHALL go out exactly as it arrived, because the new handler registers through the gate `tail-recall`'s inertness requirement already fixes, and tests nothing itself (D3; `configuration` spec; `michael-orientation.md` §2).

#### Scenario: A project file turns taiknr off

- **WHEN** a trusted project file sets `enabled` false and the session builds a request
- **THEN** the payload goes out byte-identical to one built without taiknr (`configuration` spec)

#### Scenario: A rejected config file

- **WHEN** the session's config file is rejected at session start
- **THEN** no payload is edited for that session (`configuration` spec)

#### Scenario: Publishing off, recall on

- **WHEN** `jeffersonInstruments` is false and recall appends a block
- **THEN** the payload is edited as usual, because neither of the handler's two facts lives behind the instruments switch (ruling "state homes")

### Requirement: The record of what a recall block costs follows the measurement

The documentation of what a recall block costs SHALL describe the billing this change produces, and the accepted record whose consequence the measurement contradicts SHALL be narrowed by a new ADR rather than edited (`michael-orientation.md` §1, §6; `AGENTS.md` Conventions; M1).

#### Scenario: The README's account matches the provider's billing

- **WHEN** the README's recall section is read
- **THEN** line 40 no longer says the provider re-caches the recalling turn from its user message onward once, and what it says a block costs is what the provider charges — billed as input on the request that moves pi's marker off it, written on the next, read after that (M1; N3; ruling "block pricing")

#### Scenario: The reason a figure can read negative in steady state

- **WHEN** the README's instruments section is read
- **THEN** line 112 no longer says "early on" alone, because the figure is not split-dependent and stays negative when recall really costs more than stubbing saves (M2; M9; owner-rulings.md Q2(a))

#### Scenario: A new ADR narrows the old consequence

- **WHEN** the decision records are read
- **THEN** ADR 0007's body is unchanged and `docs/adr/0009` narrows its "writes that turn to its cache again, once" consequence and records this payload edit (`michael-orientation.md` §2, §6; `AGENTS.md`)
