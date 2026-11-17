# Spec Delta — context-figures

## ADDED Requirements

### Requirement: A figure that reads negative says why, where it is read

The README SHALL explain why a net saving can honestly read negative and SHALL name `decisionThreshold` as the lever that shrinks the block, so a reader is not left to guess whether the figure is broken (owner-rulings.md Q2(a); ADR 0008).

#### Scenario: The reasons are named

- **WHEN** the README's instruments section is read
- **THEN** it names the terms a net negative can come from before any saving accumulates: recall's block written at the write rate, the recalling turn's rewrite, and recall's classifier spend, set against stub savings priced at the read rate (Q2(a); `michael-orientation.md` §4)

#### Scenario: The lever is named

- **WHEN** the same section is read
- **THEN** it names `decisionThreshold` as the lever that shrinks the block, and says no figure is clamped, so a negative reading is the figure working rather than a fault (Q2(a); ADR 0008)

#### Scenario: Nothing is credited and nothing is promised

- **WHEN** the same section is read
- **THEN** it credits recall with no saving of its own and claims no session will read non-negative (Q2(a); `michael-orientation.md` §4)

## MODIFIED Requirements

### Requirement: Dollar savings are net of cache rewrites and of recall's classifier spend

Savings in dollars SHALL be net, and the rewrite charged SHALL be the one the provider performed. The first request priced after a change taiknr made to an earlier message is charged, when it is warm, the text that change made unusable — from the earliest position the provider re-wrote, not from the message that carried the change — and each classify result's cost is subtracted (a request is priced when a valid response arrives and its estimate is above 0) (J12; Q2(a); M2; M9; ruling 15).

#### Scenario: A warm request after taiknr's own change

- **WHEN** the first request priced after any change taiknr made to an earlier message is warm and re-writes from the earliest position the provider could not read to the end of what the last priced request carried
- **THEN** that text is charged at the write rate, less its raw text at the read rate, whether the change was a settlement's stubs or a previous turn's recall block now missing from its user message, because every rewrite taiknr causes is charged and a cold request's rewrite is not (M9; T18; ruling 15)

#### Scenario: The charge starts where the provider's rewrite started

- **WHEN** a recalling turn's block no longer sits on pi's own boundary
- **THEN** the charge starts inside or after the recalling message, whose earlier text stayed cached, rather than at the recalling message's start, which is where it starts today (M9; `michael-orientation.md` §4)

#### Scenario: The split alone changes no figure

- **WHEN** one request is priced with the poisoned split — 35,731 read and 139,169 written — and then with the fixed one — 168,585 read and 6,315 written
- **THEN** both read −0.02285, because the split enters only as whether the request was warm, so what moves a figure is where the charge starts and what it charges, never the read and write counts (M2)

#### Scenario: The block is charged where it was billed

- **WHEN** pi's boundary no longer sits on recall's block
- **THEN** the block's own charge follows the request on which the provider billed the block's text — input on the first request, write on the second — rather than the charge the old placement implied, and how that term is computed is the design's (`michael-orientation.md` §3 trap 10; M9)

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
