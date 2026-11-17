# Spec Delta

## ADDED Requirements

### Requirement: The classifier call is observable to the instruments

Recall SHALL make its classifier call observable — whether it is running and how many ids it asks about — through `createPiJevScorerAdapter(ctx, config, observer?)`, without changing what recall returns, its budget, its cache key or its eligibility rule, and without persisting or printing anything for it. The `RelevanceScorer` port and `recallRelevantContext` are unchanged: no port member and no wrapper (J13; `tail-recall` spec; O2; ruling 8).

#### Scenario: Where the observer is called

- **WHEN** the adapter calls the classifier
- **THEN** it calls `observer.started(ids.length)` immediately before `ctx.modelRegistry.classify` and `observer.finished(result.usage)` on the line after the await, before the aborted, error and validation branches, because `classify` never rejects, so that one call point covers every exit and no `finally` is needed, and a catalog miss throws before any call and observes nothing (Q2(a); ruling 8)

#### Scenario: The classifier's cost reaches the net dollars

- **WHEN** the call reports usage
- **THEN** `finished()` records that usage's cost for that request's net dollars, which are subtracted at the response, and absent usage counts as 0 (Q2(a); ruling 8)

#### Scenario: The call's start and end

- **WHEN** recall makes a classifier call
- **THEN** the published in-flight value follows that call, and its count is the number of ids the call was built from, which the use case already holds before the call (`research-eleanor` §1; J13)

#### Scenario: Every exit returns the value

- **WHEN** the call ends by an answer, an error, its timeout or a cancel
- **THEN** the in-flight value returns to not running on each of them, and that one call point covers every exit, so no `finally` is needed (T9; ruling 8)

#### Scenario: Each exit shape is tested

- **WHEN** the adapter's tests run
- **THEN** an aborted, an error, a timeout-shaped and a malformed-answer result each leave the indicator not running, and each passes its usage on (T9; ruling 8)

#### Scenario: No call is made

- **WHEN** recall makes no classifier call, as an empty archive leaves it
- **THEN** the value reads not running and the count is 0 (J11)

#### Scenario: Recall's own behaviour is unchanged

- **WHEN** the instruments read the classifier's outcome
- **THEN** recall's returned messages, its budget under pi's estimate, its cache key and its eligibility rule are exactly as the `tail-recall` specification fixes them, and the `RelevanceScorer` port has no new member, so `extension-packaging`'s list gains none (`tail-recall` spec; `extension-packaging` spec; ruling 8)
