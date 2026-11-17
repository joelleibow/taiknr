# Spec Delta

## Purpose

Defines the figures taiknr publishes about context and savings, how a character estimate becomes a token figure, and how each saving is computed in tokens and in dollars.

## ADDED Requirements

### Requirement: A character estimate becomes a token figure through one ratio taken from the provider's own usage

taiknr SHALL publish each token figure as k × its own estimate, where k is the prompt tokens of the newest valid response from the pair the figure is posted under — the current provider and model, or, at a valid response, that response's own provider and model — divided by the estimate of the request that produced it. The prompt is `input + cacheRead + cacheWrite`, and the same estimator is used on both sides (S1; T5; T6; T7; J10; `research-chidi` B6).

#### Scenario: A sample from the current model

- **WHEN** a response completes carrying usage, and the request that produced it was estimated
- **THEN** k is that response's prompt tokens divided by that estimate, and every token figure is k times its own estimate (S1)

#### Scenario: Output is left out of the sample

- **WHEN** a sample is taken from a response
- **THEN** its prompt is `input + cacheRead + cacheWrite` and the response's output is not part of it, although pi's own context total adds output (`research-chidi` B6; T5)

#### Scenario: The same estimator on both sides

- **WHEN** the estimate is computed for either side of the ratio
- **THEN** one estimator produces both, counting the system message the same way, so the ratio is not distorted by two estimators' difference (T7)

#### Scenario: One ratio per model

- **WHEN** k is chosen for a request
- **THEN** the current pair is pi's own rule — `ctx.model`'s (provider, id), or, under a virtual selection, the (provider, model) of the newest valid response — and each k is held with the pair of the response it came from and used for an update posted under that pair: the current pair, or, at a valid response, the pair that response carries (OD3(a)); otherwise k reseeds from the branch's newest valid assistant message of the current pair, or is 1 with the flag on, because a ratio belongs to one model and a model switch voids it (T6; ruling 13)

#### Scenario: When k is reseeded

- **WHEN** a session starts or a `/tree` jump re-hydrates the branch
- **THEN** a session start replaces every ratio with the branch's seeds; a `/tree` jump keeps every ratio measured live in this run and reseeds the rest from the new branch; a compaction keeps them all because the ratio belongs to the model; and with `ctx.model` undefined k is 1 and the flag is on (T6; ruling 13; OD3(a))

#### Scenario: No sample yet

- **WHEN** no valid response from the current provider and model has been seen
- **THEN** k is 1 and every figure's flag reads *not yet calibrated* rather than *exact* (S1; T8; J11)

#### Scenario: A resumed session seeds k

- **WHEN** a session starts on a branch that carries valid usage for its current model
- **THEN** k is seeded from the newest such response at session start, before the first figure is published, and the flag stays on while that seed is the only sample, because the request it divides by is a reconstruction: the persisted projection lacks that time's recall block (S1; T4; ruling 4)

#### Scenario: An invalid response is not a sample

- **WHEN** a response is aborted, is an error, or carries zero usage
- **THEN** it is not a sample, which is pi's own validity rule — a valid response is not aborted, not an error and its usage is positive — and the rule reads assistant messages only: malformed persisted usage at `session_start` — non-finite, or `input + cacheRead + cacheWrite` not above 0 — is not a sample and never a NaN, and the `message_end` publishing handler returns nothing, because a returned message would replace pi's (T5; `research-chidi` B6; ruling 9)

#### Scenario: A usage entry of its own kind is not a sample

- **WHEN** the branch holds a `usage` entry of the kind a cache warm leaves
- **THEN** it is not a sample, because taiknr built no request for it and only assistant messages carry the usage a sample needs (T5)

### Requirement: Every figure is a finite number with the estimate flag beside it

Every published figure SHALL be a finite number — never a string, `null` or a placeholder — and each SHALL carry, in a value of its own, one boolean shared by every figure, meaning *uncalibrated*: no valid response in this run has calibrated k for the pair the update is posted under. It SHALL never mean *measured* or *exact*, and there is no second flag (J11; T8; ruling 4).

#### Scenario: Before any real usage exists

- **WHEN** the session has seen no response yet
- **THEN** the figures come from pi's characters ÷ 4 estimate and every flag reads uncalibrated (J11)

#### Scenario: What turns the flag on and off

- **WHEN** the calibration state changes
- **THEN** the flag is on while k is 1, stays on while k has only been seeded from persisted usage, turns off at the first valid live sample for the current model, and turns back on when the model changes to one with no live sample, because one calibration state serves every figure (J11; T8; ruling 4)

#### Scenario: A negative figure

- **WHEN** a figure works out negative
- **THEN** it is published negative, because clamping at zero would misinform (T19)

#### Scenario: A figure is never non-finite

- **WHEN** any figure is published
- **THEN** its value is finite; NaN and ±Infinity are refused at the instrument, so nothing taiknr computes may produce one (J11; `research-chidi` A1)

### Requirement: Six figures, each taken from its own source

taiknr SHALL publish six figures — history before, withheld, stubbed, context in turn, total context and recalled — each from its own source: the request for the per-request figures, the store's `rawText` for what a stub replaced, the persisted projection for total context, and the recall block for recalled (J9; S6; S8).

#### Scenario: The per-request figures come from the request

- **WHEN** withheld and stubbed are counted for a request
- **THEN** they come from that request, matching each tool result's first text block against the store's stubs, rather than from the store's contents, because hydration covers items from before a compaction and counting those would credit compaction's saving to taiknr (T14; S6)

#### Scenario: History before undoes taiknr's own mutation only

- **WHEN** history before is computed for a request
- **THEN** each stub in it is replaced by that item's `rawText` from the store, and other extensions' `context` handlers are left as they already ran before taiknr's own (S8)

#### Scenario: Context in turn, before and after the response

- **WHEN** context in turn is published for a request
- **THEN** it is the request as sent: estimated from that request's messages plus the recall block before the response, and measured as `input + cacheRead + cacheWrite` after it, which is the only use of the measured value, because the saving is computed from estimates alone (S8; ruling 2)

#### Scenario: Context in turn is per request

- **WHEN** one user turn makes several provider requests
- **THEN** each request publishes its own context in turn, because a turn spans several requests (S8)

#### Scenario: Recalled stands on its own

- **WHEN** recall appends its block
- **THEN** the block's size is published as its own figure and context in turn still includes it, so the figures overlap and recalled is a part of context in turn rather than a bucket taken out of it (J9; ruling 1; `owner-rulings.md`, "published figure")

#### Scenario: Total context comes from the persisted projection

- **WHEN** total context is published
- **THEN** it is k × the estimate of the persisted history after taiknr's edits, read from the session manager's projection, counting the system message as the request-side estimate does and never the measured prompt, so *re-anchored at each response* means k is refreshed from that response and nothing else (S8; T7; T15; ruling 5)

#### Scenario: A recall turn leaves total context alone

- **WHEN** a request carries recall's block
- **THEN** total context does not include recalled, because the block is never in the persisted history (T4; ruling 5)

#### Scenario: Context in turn before the session's first request

- **WHEN** a session publishes its first figures before any request exists
- **THEN** context in turn carries total context's value with the same flag, as a number like every figure, because zero would claim an empty request beside a non-empty history (J11; ruling 3)

### Requirement: A request's saving is the difference between two figures

Savings for one request SHALL be k × (withheld − stubbed − recalled), all three as estimates with one k — the k sampled from that request's own valid response. The saving SHALL be signed, so a request that restores more text than it saved publishes a negative saving (J12; S3; T19; ruling 2).

#### Scenario: What the saving must never mix

- **WHEN** the saving is computed for a request
- **THEN** history before − context in turn = withheld − stubbed − recalled, provided every term comes from the same estimator and the same k, and the saving never subtracts a measured context in turn from an estimated history before, because the measured value is published only as context in turn itself (S3; ruling 1; ruling 2)

#### Scenario: A settlement's saving

- **WHEN** a request carries a stub standing in for raw text and recall adds nothing
- **THEN** its saving is k × (withheld − stubbed) (S3; ruling 2)

#### Scenario: A recall block larger than the saving

- **WHEN** the recalled figure is larger than withheld minus stubbed for that request
- **THEN** the saving is negative and is published as it is (T19)

#### Scenario: A saving is an estimate at this scale

- **WHEN** one request's saving is published
- **THEN** it is an estimate, because the conversion is proven at whole-request scale and not at one settlement's scale (T8; M3)

### Requirement: Dollar savings are net of cache rewrites and of recall's classifier spend

Savings in dollars SHALL be net: the read rate inside the part of a warm request the last priced request carried, and the write rate after it and on a cold request; the first request priced after any change taiknr made to an earlier message is charged, when it is warm, the suffix it re-wrote; each classify result's reported cost is subtracted (a request is priced when a valid response arrives for it and its estimate is above 0) (J12; S4; Q2(a); M2; M4; T18–T21; ruling 15).

#### Scenario: A cold request

- **WHEN** a request was cold because the cache had expired over an idle gap
- **THEN** its saved tokens are priced at the write rate, and the expiry itself is not charged to taiknr, because it would have happened anyway (T18; M2)

#### Scenario: A warm request after taiknr's own change

- **WHEN** the first request priced after any change taiknr made to an earlier message is warm and re-writes from that message to the end of what the last priced request carried
- **THEN** that suffix is charged at the write rate, less its raw text at the read rate, whether the change was a settlement's stubs or a previous turn's recall block now missing from its user message, because every rewrite taiknr causes is charged and a cold request's rewrite is not (M2; M4; T18; ruling 15)

#### Scenario: Recall's classifier spend is inside the net

- **WHEN** a classify result reports usage and its cost
- **THEN** that cost is subtracted from the net dollars; when it reports none, its cost counts as zero (Q2(a); `research-chidi` B6)

#### Scenario: A negative total is published as it is

- **WHEN** a request's net saving is negative, or the session's running total is
- **THEN** both are published negative and neither is clamped, as M4's early running total was negative (T19; M4)

#### Scenario: The edges the design decides

- **WHEN** a component's token count is zero, or the counterfactual request would fall in another cost tier, or a response mixes short and one-hour cache writes
- **THEN** every rate comes from the response's own component costs, and how a rate is derived is the design's, worked out as a table of cases with numbers, so each of these edges has a row and an expected output, and no published figure is non-finite (T20; §O6; ruling 15; R13)

#### Scenario: The pair publishes together at the response

- **WHEN** a request's response arrives
- **THEN** the per-request pair of tokens and dollars and both since-start totals update together at that request's valid assistant response, at `message_end`; between responses the instrument keeps the last completed pair; the in-flight request's estimates — context in turn, recalled, history before, withheld and stubbed — go out at `context_with_system`; and an aborted, an errored or a zero-usage response adds nothing and publishes no pair (S4; T21; ruling 3)

#### Scenario: An earlier note this corrects

- **WHEN** the dollar figures are read
- **THEN** recall's classifier spend is visible inside the net, which supersedes the earlier note that recall's spend stays outside them (`owner-rulings.md` Q2(a); Michael §1)

### Requirement: The cumulative saving counts from the current start

The session's cumulative saving SHALL be held in memory and reset at every session start, `/new`, `/resume`, `/fork` and `/reload` included. The since-start token total SHALL be the sum of the published requests' savings, and its default label SHALL say *tokens not sent since start*. Nothing SHALL be persisted for it, so this change adds no session entry type (Q1(a); ADR 0004; ruling 2).

#### Scenario: A reload or a resume starts the total again

- **WHEN** a session starts by `/reload`, `/resume`, `/new` or `/fork`
- **THEN** the total begins again at zero and its label says *tokens not sent since start* (Q1(a); ruling 2)

#### Scenario: The total counts tokens not sent

- **WHEN** a stub is carried by several requests in one session
- **THEN** it counts once for every one of them, so the total can exceed the context size, which is why its label says tokens not sent (ruling 2)

#### Scenario: The total spans published requests only

- **WHEN** the total is published
- **THEN** it is the sum of the requests published since the current start, so it is the same number whether or not the session file outlives the start (Q1(a))

#### Scenario: A run that never answers

- **WHEN** a run never settles or never receives a response
- **THEN** nothing is added to the total for it (Q1(a))

#### Scenario: The total before any saving exists

- **WHEN** nothing has been saved since the current start
- **THEN** the total is 0 with the estimate flag beside it, which is the one figure whose label is what keeps it honest (J11; Michael §4 Q1)

### Requirement: Calibration and the dollar figures are tested at the handler

Calibration and the dollar figures SHALL be tested at the handler with scripted `usage` and `cost`, not through the session harness, whose faux provider rewrites every response's usage to characters ÷ 4 at zero cost — about a ratio of 1 and a dollar figure of 0, too forgiving to catch either (T22).

#### Scenario: A scripted response feeds the test

- **WHEN** a test exercises the conversion or the dollars
- **THEN** it hands the handler a response whose `usage` and `cost` are scripted rather than derived from characters (T22)

#### Scenario: The two forms of the saving agree

- **WHEN** a test publishes a request that carries recall's block
- **THEN** it asserts that k × (withheld − stubbed − recalled) and the identity history before − context in turn give the same number, because the identity holds only if every term comes from the same estimator and the same k (ruling 1)

#### Scenario: Every response shape is covered

- **WHEN** the handler tests run
- **THEN** an aborted, an errored, a zero-usage and a no-pending response, and a request recall returned nothing for, each have a test (ruling 14)

#### Scenario: The tests assert on the shared fake's recorder

- **WHEN** a handler test asserts what was published
- **THEN** it reads the shared fake's emit recorder, and a recorder no test asserts on is a finding at the gate (ruling 16)

#### Scenario: The session level checks the wiring only

- **WHEN** a session-level test runs
- **THEN** it asserts only what crossed the bus, captured by a listener extension in `extensionFactories`, as the existing archive session test does (T22)

#### Scenario: No request leaves the suite

- **WHEN** `npm test` runs
- **THEN** no model or classifier request is made (T22; `tail-recall` spec)
