# Spec Delta — context-figures

## ADDED Requirements

### Requirement: A figure that reads negative says why, where it is read

The README SHALL explain why a net saving can honestly read negative and SHALL name `decisionThreshold` as the lever that shrinks the block, so a reader is not left to guess whether the figure is broken (owner-rulings.md Q2(a); ADR 0008). It SHALL also record, in its instruments section, where the rewrite charge runs low, because Joel's ruling keeps that under-reporting on the routes this change does not reach (owner-rulings.md Q3(a); ruling "under-reporting home").

#### Scenario: The reasons are named

- **WHEN** the README's instruments section is read
- **THEN** it names the terms a net negative can come from: recall's block billed as input or written at the write rate, the recalling turn's rewrite, and recall's classifier spend, set against stub savings priced at the read rate (Q2(a); `michael-orientation.md` §4)

#### Scenario: The lever is named

- **WHEN** the same section is read
- **THEN** it names `decisionThreshold` as the lever that shrinks the block, and says no figure is clamped, so a negative reading is the figure working rather than a fault (Q2(a); ADR 0008; README.md:67)

#### Scenario: Nothing is credited and nothing is promised

- **WHEN** the same section is read
- **THEN** it credits recall with no saving of its own and claims no session will read non-negative (Q2(a); `michael-orientation.md` §4)

#### Scenario: The under-reporting is recorded where the figure is read

- **WHEN** the README's instruments section is read
- **THEN** it states that the rewrite charge runs low on the routes the edit does not reach — Bedrock, the other Anthropic-format gateways, OpenRouter's `openai-completions` path and any provider outside the predicate — on fail-open requests, on requests taiknr itself makes read zero, on in-turn requests where another extension's block-level marker leaves budget 1, and on partial-prefix reads (owner-rulings.md Q3(a); ruling "under-reporting home")

## MODIFIED Requirements

### Requirement: Dollar savings are net of cache rewrites and of recall's classifier spend

Savings in dollars SHALL be net. The rewrite charged SHALL be an estimate that starts where the provider now rewrites: on a request the payload edit was applied to, the charged suffix is the text after the carrier's own content through the end of what the last priced request carried, with recall's block excluded; on every other request the rule is today's, the suffix from the change to the end of what the last priced request carried, charged only when the request is warm. Each classify result's reported cost is subtracted (a request is priced when a valid response arrives for it and its estimate is above 0) (J12; Q2(a); M9; N3; ruling "rewrite sizing").

#### Scenario: A warm request after taiknr's own change

- **WHEN** the first request priced after a change taiknr made to an earlier message is warm, the payload edit was applied to it, and it re-writes from after the carrier's own content to the end of what the last priced request carried
- **THEN** that text is charged at the write rate, less its raw text at the read rate, whether the change was a settlement's stubs or a previous turn's recall block now missing from its user message, because every rewrite taiknr causes is charged and a cold request's rewrite is not (M9; T18; N3; ruling "rewrite sizing")

#### Scenario: A request the edit did not reach keeps today's rule

- **WHEN** the request is on an uncovered route, the handler failed open, or no message-level point was placed for want of budget
- **THEN** the charge is today's — the suffix from the changed message to the end of what the last priced request carried — and its known under-reporting is recorded in the README rather than corrected here (owner-rulings.md Q3(a); ruling "rewrite sizing")

#### Scenario: The block is not inside the charged suffix

- **WHEN** the finished payload carries no marker on recall's block or on any block after it, and the payload carries no top-level marker, so the provider bills the block as plain input
- **THEN** the charge starts after the carrier's own content and the block is not part of it, measured at 1,236 written on the handoff request while the block itself went out as 2,597 input tokens (N3; N5; N7; N8; ruling "rewrite sizing")

#### Scenario: The split alone changes no figure

- **WHEN** one request is priced with the poisoned split — 35,731 read and 139,169 written — and then with the fixed one — 168,585 read and 6,315 written
- **THEN** both read −0.02285 under this rule too, because the split enters only as whether the request was warm, so what moves a figure is where the charge starts and what it charges, never the read and write counts — which is the old rule's property, reproduced here to show it still holds, and not acceptance evidence for the fix (M2; ruling "split scenario")

#### Scenario: Recall's classifier spend is inside the net

- **WHEN** a classify result reports usage and its cost
- **THEN** that cost is subtracted from the net dollars; when it reports none, its cost counts as zero (Q2(a); `research-chidi` B6)

#### Scenario: A negative total is published as it is

- **WHEN** a request's net saving is negative, or the session's running total is
- **THEN** both are published negative and neither is clamped, as M4's early running total was negative (T19; M4)

#### Scenario: The pair publishes together at the response

- **WHEN** a request's response arrives
- **THEN** the per-request pair of tokens and dollars and both since-start totals update together at that request's valid assistant response, at `message_end`; between responses the instrument keeps the last completed pair; the in-flight request's estimates — context in turn, recalled, history before, withheld and stubbed — go out at `context_with_system`; and an aborted, an errored or a zero-usage response adds nothing and publishes no pair (S4; T21; ruling 3)

#### Scenario: An earlier note this corrects

- **WHEN** the dollar figures are read
- **THEN** recall's classifier spend is visible inside the net, which supersedes the earlier note that recall's spend stays outside them (`owner-rulings.md` Q2(a); Michael §1)

### Requirement: A saving is priced at the rates the request's own response reported

A stub's saving SHALL be priced at the read rate on a warm request and the write rate on a cold one, including a warm request that read only part of its prefix, whose saving is then an estimate low by the difference between the two rates (instruments design D8, row 11 (`openspec/changes/archive/2026-11-17-taiknr-instruments/design.md`:356); M2). Recall's block SHALL be priced by one rule, taken from the finished payload and the last priced request. When no cache marker sits on recall's block or on any block after it and the request carries no top-level `cache_control`, the block went out uncached and is priced at the input rate; a top-level marker is automatic caching, whose breakpoint lands on the last eligible block, so it is at or after recall's block (`pc.md`:48, :538; N10). Otherwise, when the block is new to what the last priced request carried, changed on its message, or was left uncached by the last priced request, it is priced at the write rate. Otherwise it is priced at the read rate on a warm request and the write rate on a cold one. A request whose payload the handler did not edit counts as cached (ruling "block pricing", narrowed by michael-dr-s2 cc2-3; N3; 132 of 132 measured requests).

#### Scenario: A cold request

- **WHEN** a request was cold because the cache had expired over an idle gap
- **THEN** its saved tokens are priced at the write rate, and the expiry itself is not charged to taiknr, because it would have happened anyway; the warm gate is not replaced by "a previous priced request exists", because that gate would charge exactly this case (T18; M2; ruling "warm gate")

#### Scenario: A warm request that read only part of its prefix

- **WHEN** the first priced request after a compaction or a tree jump is warm and read only part of its prefix from cache
- **THEN** its saving is priced at the read rate and is therefore low by (write − read) on each saved token in the rewritten portion, which is an accepted estimate and not a corrected figure (instruments design D8, row 11 (`openspec/changes/archive/2026-11-17-taiknr-instruments/design.md`:356); ruling 15)

#### Scenario: The block's charge, by placement and request

- **WHEN** a recalling turn's requests are priced
- **THEN** each case has one answer, and this table is the rule:
  - uncached, on whichever request carries it: the input rate. Measured at 2,597 on N3's handoff request and 3,204 on Haiku 5.5. The budget-1 in-turn request is this row unless the payload carries a top-level marker (N10; N11);
  - cached, and new to the last priced request or left uncached by it: the write rate (2,682 on N3's next request);
  - cached, and changed in place on a message the last priced request carried (recall's cache-hit branch dropped an id, `recall-relevant-context.ts:64-72`): the write rate, not the read rate;
  - cached, the same block the last priced request carried cached, warm: the read rate (91 written per step);
  - cached, cold: the write rate (N3; ruling "block pricing")

#### Scenario: An applied edit is the source, not the intent

- **WHEN** the publisher prices the block and the rewrite
- **THEN** it uses one deferred reading derived from the finished payload — `applied.block` (cached, uncached or null) and `applied.carrierRead` — so a handler that failed open prices today's way, no new Jefferson field is declared, and no getter is added to the publisher's interface (ADR 0008; `AGENTS.md` Conventions; ruling "block pricing")

#### Scenario: The edges the design decides

- **WHEN** a component's token count is zero, or the counterfactual request would fall in another cost tier, or a response mixes short and one-hour cache writes
- **THEN** every rate comes from the response's own component costs, and how a rate is derived is the design's, worked out as a table of cases with numbers, so each of these edges has a row and an expected output, and no published figure is non-finite (T20; §O6; ruling 15; R13)
