# Spec Delta — tail-recall

## ADDED Requirements

### Requirement: A recall block does not cost the turn its cached prefix

On the routes with a measured result, a request carrying recall's block SHALL be sent so the provider reads the prefix before the block from an entry an earlier request wrote and writes only from the block onward, and the first request after a recalling turn SHALL reach an entry that turn wrote (M1; M4; M5). What the payload carries SHALL NOT change: message text, block order and message positions stay as they are, and only cache markers move (ADR 0007; S1).

#### Scenario: The recalling request reads its prefix

- **WHEN** a request carrying recall's block goes out on a covered route
- **THEN** its response's cache read covers the system and tools prefix and the messages before the block, and its write covers the block and what follows, where today eleven such turn starts read the 35,731-token entry alone and rewrote 41k–143k tokens each (M1)

#### Scenario: The next turn's first request reaches the recalling turn's entry

- **WHEN** the turn after a recalling turn opens
- **THEN** its first request reads an entry written during the recalling turn rather than rewriting the block-free prefix, measured at 6,923 read against 3,731 written over an API key, 15,550 against 3,728 over OAuth, and 6,799 against 3,514 through OpenRouter (M5)

#### Scenario: A turn longer than the lookback

- **WHEN** a recalling turn makes twelve sequential tool calls, carrying 36 content blocks, so the block sits past the provider's lookback
- **THEN** the next turn's first request still reads an entry from that turn, where a point before the block alone left it reading 0 and writing 10,659 (M4; M5)

#### Scenario: A turn longer than the entry's remaining lifetime

- **WHEN** a recalling turn runs 7.5 minutes and the next turn's requests follow
- **THEN** the next turn still reads an entry written during that turn, which read 6,899 in the measurement (M6)

#### Scenario: Only the cache markers differ

- **WHEN** a covered route's request carrying a block is compared with the same request built without this change
- **THEN** every message, its text and its position are identical, and the cache markers are the only difference (ADR 0007; S1)

#### Scenario: Nothing recalled

- **WHEN** no item is selected
- **THEN** the payload is byte-identical to a request without recall, because there is no block to place anything around (S1)

### Requirement: Only routes with a measured result change

taiknr SHALL change the payload on exactly the routes with a measured result — Anthropic direct over OAuth, Anthropic direct over an API key, Anthropic models through OpenRouter, and Anthropic-format requests on Joel's attribution route once his extension's guard is relaxed — and SHALL send every other route a byte-identical payload (owner-rulings.md Q1(a), Q3(a); M5; `michael-orientation.md` §2).

#### Scenario: The three measured routes carry the edit

- **WHEN** a session runs Anthropic direct over OAuth, Anthropic direct over an API key, or an Anthropic model through OpenRouter
- **THEN** each of the three sends a request shaped as the requirement above states, as each was measured with a read against a write at the next turn's first request (M5)

#### Scenario: Bedrock keeps today's payload

- **WHEN** the session's provider is Bedrock
- **THEN** the payload is byte-identical to today's, because Bedrock's boundaries are separate `cachePoint` items that an edit to a block's own marker never reaches, and nothing about Bedrock was measured (Chidi, Bedrock; `michael-orientation.md` §3 trap 12)

#### Scenario: The other Anthropic-format gateways keep today's payload

- **WHEN** the session runs minimax, opencode, cloudflare-ai-gateway, vercel-ai-gateway, fireworks or github-copilot
- **THEN** the payload is byte-identical to today's, because OpenRouter's result does not prove another gateway and none of them was measured (Chidi, "Other providers"; owner-rulings.md Q3(a))

#### Scenario: Gemini through OpenRouter keeps today's payload

- **WHEN** the session runs a Gemini model through OpenRouter
- **THEN** the payload is byte-identical to today's, because pi places no boundary there and the probe's added one changed nothing (`or-hydrogen-*.log`; Chidi verdict 5(c))

#### Scenario: Joel's route is served as pi's own provider is

- **WHEN** his `anthropic-attribution` extension is relaxed to let message-level cache points change, with system, tools, identity and the four-point limit still protected
- **THEN** his route receives the same edit pi's own Anthropic provider receives, and this change does not edit his extension (owner-rulings.md Q1(a); M3)

#### Scenario: A payload pi marked nowhere

- **WHEN** pi places no cache boundary on a payload
- **THEN** the payload goes out unchanged, because the edit is a no-op where there is no boundary to work from (`michael-orientation.md` §6)

### Requirement: The payload edit keeps other extensions' changes and the provider's limits

taiknr SHALL build the request from a copy of the payload, keeping every cache marker already on it; SHALL place no more than four boundaries in a request; SHALL keep the system and tools markers identical across a session's requests; SHALL carry the retention pi set on its own markers; and SHALL NOT throw (Chidi #2, #4; `michael-orientation.md` §2, §3).

#### Scenario: Another extension's marker survives

- **WHEN** another extension marked a block before taiknr's handler runs
- **THEN** its marker is still there in what goes out, because the payload was copied and never mutated in place (`michael-orientation.md` §2)

#### Scenario: Never a fifth boundary

- **WHEN** the payload already carries four boundaries
- **THEN** the request carries no more than four, because a fifth is a 400 and not a silent drop (Chidi #2; `michael-orientation.md` §2)

#### Scenario: The system and tools markers stay put across requests

- **WHEN** two requests in one session are compared
- **THEN** the markers on their system messages and tools are the same set, never toggled per request, because those markers are inside pi's thread hash and only message markers are stripped from it (Chidi #4)

#### Scenario: The retention follows pi's own

- **WHEN** pi asked for long retention on its markers
- **THEN** the boundary taiknr places carries the same retention, so no 5-minute entry precedes a 1-hour one (Chidi; `michael-orientation.md` §3 trap 7)

#### Scenario: A payload it cannot read

- **WHEN** the payload holds a shape the handler cannot edit, or its own code throws
- **THEN** the request goes out as it arrived, because a handler's throw is swallowed by pi's runner and the fail-open path is the only safe one (`michael-orientation.md` §2; Chidi #4)

#### Scenario: A request taiknr built nothing for

- **WHEN** the payload belongs to a request the session's taiknr state knows nothing about, as a classifier call's own request
- **THEN** nothing is edited and nothing throws (`michael-orientation.md` §6)

### Requirement: The payload edit is inert while taiknr is off

While the session's config is rejected or `enabled` is false, the payload this change edits SHALL go out exactly as it arrived, because the new handler registers through the gate `tail-recall`'s inertness requirement already fixes, and tests nothing itself (D3; `configuration` spec; `michael-orientation.md` §2).

#### Scenario: A project file turns taiknr off

- **WHEN** a trusted project file sets `enabled` false and the session builds a request
- **THEN** the payload goes out byte-identical to one built without taiknr (`configuration` spec)

#### Scenario: A rejected config file

- **WHEN** the session's config file is rejected at session start
- **THEN** no payload is edited for that session (`configuration` spec)

### Requirement: The record of what a recall block costs follows the measurement

The documentation of what a recall block costs SHALL describe the billing this change produces, and the accepted record whose consequence the measurement contradicts SHALL be narrowed by a new ADR rather than edited (`michael-orientation.md` §1, §6; `AGENTS.md` Conventions; M1).

#### Scenario: The README's account matches the provider's billing

- **WHEN** the README's recall section is read
- **THEN** it no longer says the provider re-caches the recalling turn from its user message onward once, and what it says a block costs is what the provider charges (M1; `michael-orientation.md` §1)

#### Scenario: A new ADR narrows the old consequence

- **WHEN** the decision records are read
- **THEN** ADR 0007's body is unchanged and a new record narrows its "writes that turn to its cache again, once" consequence and records this payload edit (`michael-orientation.md` §2, §6; `AGENTS.md`)
