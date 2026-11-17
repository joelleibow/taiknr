# tail-recall Specification

## Purpose

Defines when taiknr recalls archived tool outputs into the request, how it scores them against the latest user prompt, what it appends and where, how far one recall may grow, and what it does when classification fails or taiknr is off.

## Requirements

### Requirement: Recall is scored once per latest user prompt

taiknr SHALL score the archive against the latest `role: "user"` message only, keyed by its `timestamp` and text. It SHALL recall nothing and make no classifier call when the archive is empty or that message is missing. A request whose key equals the last scored key SHALL reuse that scoring while the store's `size()` is unchanged, and a new prompt, a steer or a follow-up SHALL score again and move recall to the newest user message (S8; Joel's "Orientation Q1" → (a); `Chidi` §2; ruling 6).

#### Scenario: One turn's requests score once

- **WHEN** a run makes three provider requests under one key — a prompt and two tool-loop steps
- **THEN** exactly one classifier call is made, and each of the three requests carries the recall built for that key (S8)

#### Scenario: A repeated prompt scores again

- **WHEN** the user sends `continue`, and later sends `continue` again
- **THEN** the two messages carry their own timestamps, so the second is a new key and is scored again (T12)

#### Scenario: A steer moves the recall

- **WHEN** a run has recalled items and the user then steers
- **THEN** the request built for the steer carries the recall on the steer, and the earlier user message carries none of it (Joel's "Orientation Q1" → (a); T5)

#### Scenario: An empty archive asks nothing

- **WHEN** the archive holds no item
- **THEN** no classifier call is made and the request is unchanged

#### Scenario: A turn with no user message

- **WHEN** a compaction leaves the turn with no `role: "user"` message
- **THEN** nothing is recalled and no classifier call is made (T11)

#### Scenario: The store's size changes under the same user message

- **WHEN** an item enters the store at settlement or hydration and the latest user message, and so the key, is unchanged
- **THEN** the store's size no longer equals its size at scoring, so the key is scored again rather than reusing the earlier scoring, compared through the existing `lastPromptKey` string with no change to `RecallCache`'s shape (ruling 6)

### Requirement: One call asks one bool question per archived item

For a scored key taiknr SHALL make one classifier call carrying one `bool` question per eligible archived item, eligible by the rule `Recall yields to edits taiknr did not write and to items off the branch` states, keyed by that item's whole id, with the classifier's state holding the prompt's text and each id's stub. An item's raw text and any image SHALL NOT be sent. The id SHALL be passed as it is, never sliced and never matched against a pattern (S2; ADR 0006; T13; `Chidi` §3; ruling 9).

#### Scenario: Three items, one call

- **WHEN** the archive holds three eligible items
- **THEN** one classifier call carries three questions, one for each item's id

#### Scenario: A long id

- **WHEN** an item's id is a 36-character UUID rather than eight hexadecimal characters
- **THEN** its question's id is that whole string (ADR 0006)

#### Scenario: A stub, never the raw text

- **WHEN** an item's raw text carries text its stub does not carry
- **THEN** the call's state carries the stub and not the raw text (S2; T13)

#### Scenario: The prompt's text reaches the classifier

- **WHEN** the latest user message's content is one text block
- **THEN** the call's state carries that text (S2)

#### Scenario: No image is sent

- **WHEN** the latest user message carries an image block
- **THEN** the classifier call carries no image (S2)

### Requirement: Selection is the threshold rule over the answers

taiknr SHALL select the items whose probability is at least the session's `decisionThreshold`, through the selection the `development-checks` specification already names, so a probability equal to the threshold is selected and a threshold of 0 selects every scored item (S3; `development-checks` spec; `configuration` spec).

#### Scenario: A probability at the threshold

- **WHEN** an item's probability equals `decisionThreshold`
- **THEN** it is selected (S3)

#### Scenario: A probability below the threshold

- **WHEN** an item's probability is below `decisionThreshold`
- **THEN** it is not selected

#### Scenario: A threshold of zero

- **WHEN** `decisionThreshold` is 0 and every item was scored
- **THEN** every scored item is selected (`configuration` spec)

#### Scenario: Nothing selected

- **WHEN** every probability is below the threshold
- **THEN** no item is recalled and the request is unchanged (S1)

### Requirement: Recall keeps its own request under the host's compaction threshold

Selected items SHALL be recalled whole and in descending probability, and recall SHALL stop before the request would pass the host's compaction threshold — the model's context window less its reserved tokens — so that, by pi's own estimate, the request stays at or under that threshold, with the window, the reserve and the current size read per request. No item SHALL be recalled in part, and the archive SHALL keep every item it holds (Joel's "Orientation Q3" → (b); D2; D5; T9; ruling 4).

#### Scenario: An archive larger than the budget

- **WHEN** `decisionThreshold` is 0 and the selected items together would pass the model's compaction threshold
- **THEN** items are recalled in descending probability until the next one would pass the threshold, and every item after it is left out (Joel's "Orientation Q3" → (b))

#### Scenario: Whole items only

- **WHEN** the next item in descending probability would pass the threshold
- **THEN** no part of its raw text is recalled, and recall stops there

#### Scenario: The most relevant item is too large

- **WHEN** the highest-probability item alone would pass the threshold
- **THEN** nothing is recalled, because recall stops rather than skipping to a smaller item

#### Scenario: The archive keeps everything

- **WHEN** recall leaves items out
- **THEN** the store and the branch still hold every item, and no ceiling, pruning or eviction is added to the archive (D5)

#### Scenario: The claim stops at pi's own estimate

- **WHEN** overflow recovery runs despite the bound, because pi's estimate undercounted the request
- **THEN** that is the residual risk recorded against D2; the bound claims only what pi's own estimate delivers, so no guarantee was contradicted (ruling 4)

### Requirement: The bound covers only the request recall builds

The bound SHALL cover only the request recall builds: pi's next threshold check counts the provider usage of the request it last sent, recalled block included, so a recall that fills most of the room can make pi compact the session at that check (Joel's "Design review escalation — recall and pi's next compaction check", 2026-11-15; design decision 2). No taiknr setting avoids it while recall is on (design decision 2).

#### Scenario: Pi's next check can compact after a full recall

- **WHEN** a request carries a recall block filling most of the room under the threshold, and pi's next check — before the next step of a tool loop, or after a run that archived nothing — counts that request's provider usage plus what the step added
- **THEN** pi may compact the session at that check; the bound still kept the request it built at or under the threshold by pi's own estimate, so no guarantee was contradicted (Joel's "Design review escalation — recall and pi's next compaction check", 2026-11-15)

#### Scenario: Neither setting removes it

- **WHEN** an operator raises `decisionThreshold` or `reserveTokens` to stop that compaction
- **THEN** raising `decisionThreshold` can only shrink the block, and raising `reserveTokens` lowers pi's threshold and recall's budget by the same amount, so it moves the case rather than avoiding it (design decision 2)

### Requirement: The recall block is one trailing text block on the latest user message

When at least one item is recalled, taiknr SHALL append exactly one text block to the latest `role: "user"` message, after every block that message already carries, and SHALL leave every other message as it was. When nothing is recalled it SHALL leave the request unchanged. Every non-text block the message carries SHALL survive in its original order, and the block SHALL present recalled text as data rather than as instruction (S1; T10; T13; O4).

#### Scenario: A prompt of one text block

- **WHEN** the latest user message carries one text block and two items are recalled
- **THEN** the request's message carries that block followed by one recall block, and no second block is appended

#### Scenario: A prompt carrying an image

- **WHEN** the latest user message carries a text block and an image block
- **THEN** both stay in their original order and the recall block follows them (T10; `Chidi` §2)

#### Scenario: The system messages are untouched

- **WHEN** the session carries a mid-conversation system message and recall runs
- **THEN** the leading system message and that one are unchanged, so the host keeps them in place (S1; T1)

#### Scenario: Nothing recalled

- **WHEN** no item is selected
- **THEN** the request is exactly what it would have been without recall (S1)

#### Scenario: The delimiter inside raw text

- **WHEN** a recalled output's raw text contains the marker the recall block closes with
- **THEN** the block is still one well-formed block, and the text is not promoted out of the recalled data (T13; O4)

#### Scenario: Per request only

- **WHEN** the next request of the same turn is built after a tool result settled
- **THEN** it carries the recall for its key, and the branch and the store were not written by the earlier request

### Requirement: The classifier and its timeout come from the session's config at event time

The classifier SHALL be resolved from the session's `defaultDecisionModelProvider` and `defaultDecisionModel`, through the host's catalog lookup, read at event time, with no hardcoded provider and no fallback model id; a model that does not resolve SHALL fail open. The call SHALL be bounded by the session's classifier timeout, SHALL be attempted once with no retry, and SHALL carry the request's abort signal (S3; D7; Joel's "Orientation Q2" → (b) and (c); `Chidi` §3).

#### Scenario: The configured pair is the one used

- **WHEN** the resolved config names a provider and a model that are both in the catalog
- **THEN** the call is made with that pair and with no other (S3)

#### Scenario: No fallback model

- **WHEN** the resolved config's model is not in the catalog
- **THEN** no call reaches any other model, and the failure is reported (S3; T12)

#### Scenario: The timeout bounds the wait

- **WHEN** the classifier does not answer within the session's timeout
- **THEN** the request goes out without recall after that timeout rather than after the host's own limits (T3)

#### Scenario: One attempt

- **WHEN** a classifier call fails
- **THEN** that key is not attempted a second time (Joel's "Orientation Q2" → (b))

#### Scenario: A cancelled run ends the call

- **WHEN** the user cancels the run while the call is outstanding
- **THEN** the call ends with the run (S4)

### Requirement: A failure fails open, with one notice in the session

A missing model, an error answer, and a timed-out call SHALL each leave the request without recall and report at most one `ctx.ui.notify` warning in the session; a cancelled call reports nothing. Only a `stop` result carrying a `bool` answer with a finite probability in [0, 1] for every id asked about is an answer set; any other is an error answer. Stubbing SHALL be unaffected, and the notice SHALL be silent in print and JSON (S4; Joel's "Orientation Q4" → (a); D13; `Chidi` §4; ruling 1).

#### Scenario: A model that does not resolve

- **WHEN** the catalog lookup returns no model for the configured pair
- **THEN** the request goes out without recall and one warning appears (S4)

#### Scenario: A mistyped model name

- **WHEN** the config's model field holds a name the catalog does not know, which the `configuration` spec accepts as a non-empty string
- **THEN** recall fails open with the same one warning, taiknr is not turned off for the session, and stubbing keeps working (Joel's "Orientation Q4 sub-question" → (a))

#### Scenario: An error answer

- **WHEN** the classifier result's stop reason is an error
- **THEN** the request goes out without recall and one warning appears (S4; T4)

#### Scenario: An answer set missing an answer

- **WHEN** the classifier result's stop reason is `stop` but an id the call asked about carries no `bool` answer, or carries a probability that is not a finite number in [0, 1]
- **THEN** the answer set is an error answer, so the request goes out without recall and one warning appears (ruling 1)

#### Scenario: Once per session

- **WHEN** two requests in one session both fail
- **THEN** the warning appears once, after the first failure, and the second is silent (D13; S6)

#### Scenario: A cancel is not reported

- **WHEN** the user cancels the run and the classifier result's stop reason is `aborted`
- **THEN** the request ends with the run, nothing is recalled, and no warning appears (S4; T4)

#### Scenario: The notice says what to fix

- **WHEN** the warning appears
- **THEN** its message names the provider, the model, the config field and the reason (Joel's "Orientation Q4" → (a))

#### Scenario: Print mode keeps working

- **WHEN** a session runs in print or JSON mode and the classifier fails
- **THEN** the request goes out without recall, the machine-readable output carries no added line, and stubbing is unaffected (`Chidi` §4; T4)

#### Scenario: Stubbing is unaffected

- **WHEN** recall has failed in a session and a later run settles tool outputs
- **THEN** those outputs are stubbed and recorded as usual

### Requirement: Recall yields to edits taiknr did not write and to items off the branch

An item SHALL be eligible only when a tool-result entry with its id is on `getBranch()` and the latest `context_edit` targeting that id has a non-null `replacement` whose first content block is text equal to the item's stub. Eligibility SHALL be checked per request, cache hits included; an ineligible item is left out silently, so a persisted `context_edit` redaction is never undone and an item from an abandoned branch never returns (S9; ADR 0005; D14; T8; rulings 8, 10, 11).

#### Scenario: An item another extension redacted

- **WHEN** the latest `context_edit` on the active branch for an item's id carries content that is not taiknr's stub, as another extension's redaction leaves it
- **THEN** that item is not recalled, and the persisted redaction stands; authorship is read from that content, because a `context_edit` entry carries none (ADR 0005; T8; ruling 10)

#### Scenario: An item from a branch the user left

- **WHEN** the store holds an item whose entry is not on the active branch, as an off → `/tree` → on sequence leaves it
- **THEN** that item is not recalled, and nothing is reported (D14; T8)

#### Scenario: An item whose only edit is taiknr's stub

- **WHEN** an item's entry is on the active branch and its latest `context_edit` there is the stub taiknr wrote
- **THEN** it is eligible to be recalled (S9; ruling 10)

#### Scenario: An item with no edit at all

- **WHEN** an item's tool result and side-store entry are on the active branch but no `context_edit` targets its id, as a `/tree` leaf landing between the two leaves it
- **THEN** it is ineligible and is not recalled, because its raw text was never replaced and is already in context (ruling 10)

#### Scenario: An item that carried an image

- **WHEN** an item's `context_edit` carries the stub's text block followed by the image blocks the original output carried
- **THEN** only the first content block is compared, never the whole array, because a settlement writes the stub's text block followed by the original non-text blocks, so the item is eligible and is recalled (ruling 10)

#### Scenario: A foreign edit lands under one cache key mid-turn

- **WHEN** a `context_edit` taiknr did not write lands mid-turn for the items a scored key recorded, before that key's next request
- **THEN** that request carries no recall block, no second classifier call is made, and the check ran per request rather than once per key (ZO-2; ruling 8)

### Requirement: Recall is inert while taiknr is off

While the session's config is rejected or `enabled` is false, taiknr SHALL recall nothing and make no classifier call, enforced by the composition-root gate that stops every handler but the session-start one rather than by a check inside the recall handler, and outputs stubbed earlier SHALL stay stubbed (D3; S5; `configuration` spec).

#### Scenario: A project file turns taiknr off

- **WHEN** a trusted project file sets `enabled` false while the archive holds items and `decisionThreshold` is 0
- **THEN** no request carries recall and no classifier call is made in that session (`configuration` spec)

#### Scenario: Stubs made before the switch are not recalled

- **WHEN** outputs were stubbed in a session and taiknr is then turned off in that same session
- **THEN** those outputs stay stubbed and none of them is recalled (`configuration` spec)

#### Scenario: Turning taiknr on resumes recall

- **WHEN** taiknr is turned back on in a session and the next request is built with a new key
- **THEN** that request is scored and carries its recall

#### Scenario: A rejected config file

- **WHEN** the session's config file is rejected at session start
- **THEN** no classifier call is made for that session and nothing is recalled (`configuration` spec)

#### Scenario: Nothing is gated inside the recall handler

- **WHEN** the recall handler is read
- **THEN** it does not test `enabled` itself, and the gate at the composition root is what stops it (D3; S5)

### Requirement: Recall writes nothing

Recall SHALL change only the messages of the request it answers: no session entry is appended, the store and the branch are unchanged, and nothing is printed or logged. Its per-session decisions SHALL stay in memory, so the deferred status readout can show them without a persistence change (S1; D11; T14; D14).

#### Scenario: Nothing is appended

- **WHEN** a request carries recall
- **THEN** the branch gains no entry, the store's contents are unchanged, and no line reaches stdout or stderr (S1; D11)

#### Scenario: A resumed session starts clean

- **WHEN** a session is resumed
- **THEN** recall's per-session memory starts empty and the archive is whatever hydration read from the branch (`branch-hydration` spec)

#### Scenario: The decisions stay readable

- **WHEN** the deferred status readout is built
- **THEN** it can read the session's last recalled ids from memory, with no persistence added here (D14)

### Requirement: Recall is tested without a classifier call and verified by a live script run by hand

The default suite SHALL drive recall with a scripted classifier, so `npm test` makes no model or classifier request, and session-level recall tests SHALL take their guard from the shared helper in `tests/support/`. An assertion otherwise dependent on the classifier's answer SHALL script a "no". A live script, run by hand, SHALL verify recall against the real classifier (T2; S7; D10; Joel's "Orientation Q5" → (a); rulings 13, 14).

#### Scenario: No request leaves the suite

- **WHEN** `npm test` runs
- **THEN** no model or classifier request is made: one shared helper under `tests/support/` stubs `fetch` with a recording stub that answers scripted System One JSON or hangs until aborted, registers a provider under a distinct id such as `taiknr-test` mapping its classifier API to pi-ai's own System One `classify`, writes the agent config naming that provider and model, clears `OPENROUTER_API_KEY` and `TYPESAFE_API_KEY` with `vi.stubEnv`, and restores both the environment and the globals afterwards (T2; S7; ruling 14)

#### Scenario: The guard catches a mistake

- **WHEN** a test runs under the default openrouter config with a dummy key
- **THEN** the recording stub shows the request reached the `.../systemone` URL, so a call that escaped the helper would be caught rather than billed (ruling 14)

#### Scenario: The existing prompts script a no

- **WHEN** the session-level assertions that send a prompt after a settlement run
- **THEN** the scripted classifier answers "no", and the assertions themselves are unchanged (T2)

#### Scenario: The live script sits outside the gate

- **WHEN** `npm run check` runs
- **THEN** the script is not collected, not linted and not type-checked, because the test include and the lint allowlist the `development-checks` spec fixes leave a root-level file out

#### Scenario: The live script observes at the request

- **WHEN** the script runs
- **THEN** it loads taiknr through pi's own loader under a throwaway `PI_CODING_AGENT_DIR` holding its own config, and an inline probe extension loaded after taiknr records `before_provider_request` payloads, so the script reads what the provider was actually sent (ruling 13)

#### Scenario: The live script's two pass conditions

- **WHEN** a prompt asks for a unique marker in one archived output, and a second, unrelated prompt is sent
- **THEN** the first request carries exactly one recall block, holding that marker, at the tail of the latest user message, with the earlier messages and every system message byte-identical to a request without recall, and the second request carries no block (ruling 13)

#### Scenario: A failing run

- **WHEN** the same script runs with a mistyped `defaultDecisionModel`, or with `enabled` false
- **THEN** it exits non-zero, which is the run that shows the script catches a mistake (ruling 13)

#### Scenario: The live script spends live calls

- **WHEN** the coder implementing this change runs the script by hand
- **THEN** it calls the real classifier and model configured for it, which costs model calls, it removes its throwaway directories on every exit, and Joel's own manual test does not stand in for it (Joel's "Orientation Q5" → (a); ruling 13)

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
