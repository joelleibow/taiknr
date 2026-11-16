# 0007. Recall on the Whole Request, Inside Its Own Bound

## Status

Accepted

## Context

ADR 0002 recorded tail recall before anything measured it, and named `context` as the event recall attaches to. Measured against the host, a returned list that differs from the snapshot under `context` makes the runner rebuild the head: every mid-conversation system message folds into one replayed leading message, and the provider's cached prefix is lost. One layout flip rewrote a 50,371-token prompt at about $0.25, against the $0.0227 a request saves, and 87 of Joel's 165 multi-turn sessions over seven days carry such a message. `context_with_system` fires after the prompt and tool state are restored, sends the returned list as it is, and leaves each system message where the host put it. Both events carry the same message list and return the same result type, so the event decides what a request costs, and never what it carries.

Recall also settled two boundaries ADR 0002 does not state, because nothing had measured them.

The first is disclosure. One archived output's text can leave the machine in two directions, and they are not the same destination. The classifier needs enough of each output to judge it, which is the stub already rendered for it: the tool, its arguments and a preview of its first lines. The main model needs the body, because a body the model cannot see is the thing recall exists to fix. Between the two directions sits a gap in redaction. An edit another extension persisted is enforced, but a redactor that rewrites requests on their way out never sees recalled text, and the classifier payload passes through no request-time transform at all.

The second is size. Recall keeps the request it builds under the host's compaction threshold by the host's own estimate. The host's next threshold check counts something else: the provider usage of the request it last sent, recalled block included, plus what the step after it added. A recall that fills most of its budget can therefore make the host compact a session it would not otherwise have compacted at that check. On a 1,000,000-token window the case needs a conversation within roughly the top 7% under the threshold, because the block is bounded by the archive. On a 40,960-token window at the host's default `keepRecentTokens`, a large item only fits while the conversation is small, and the conversation plus the following step then has to reach about 20,000 tokens: a 3,000-token step made no compaction follow a 12,800-token item, and an 11,000-token step made one follow a 12,000-token item. After such a compaction the block may no longer fit, and the rest of the turn runs without it and without a notice.

Three responses were weighed. Recall nothing that would fill the budget: rejected, because the large output a turn is missing is what recall exists for. Add a margin to the bound: rejected, because no source supplies a value, and the operator already holds the host's `reserveTokens`. Turn the host's compaction off for the session: rejected, because that switch also turns off its overflow recovery and every threshold compaction, a larger loss than the case. Joel accepted the exposure on 2026-11-15 ("Design review escalation — recall and pi's next compaction check"), narrowing his earlier preference to miss a recall rather than cause a compaction. The exposure this record describes is the corrected one; the case first put to him was narrower.

## Decision

Recall attaches to a request on three terms.

**It runs on `context_with_system`, and nothing registers `context`.** This narrows ADR 0002's mechanism 3, whose sentence named the event, rather than replacing that decision, which still governs everything else it says, including one `bool` question per archived item and fail-open with one notice. An eighth event, or a handler linked to the settlement boundary so each message keeps its own recall, was weighed and declined: either needs a specification change, and Joel's Q1 ruling took the simpler rule instead, where a steer moves recall to the newest user message.

**It splits disclosure by destination.** The classifier provider receives the newest user prompt's text and, per eligible archived item, that item's stub, and nothing else: no item's raw text and no image. The main model's provider receives the full raw text of every item recall appends, inside the request. Recall adds no request-time redaction hook of its own. A persisted edit by another extension is honoured by leaving the item out; a request-time transform by another extension, on `context` or on a `context_with_system` handler registered before taiknr's, does not cover the block.

**It holds the request it builds inside the host's compaction threshold, and claims nothing beyond it.** Items are recalled whole, highest probability first, and recall stops before the request would pass the window less its reserved tokens, by the host's own estimate. The exposure the host's next check creates is accepted rather than engineered away: `decisionThreshold` is the lever that shrinks the block, and `reserveTokens` moves the case rather than avoiding it.

## Consequences

**Easier:**

- A request carrying recall keeps its mid-conversation system messages, so the prefix it shares with the request before it stays reusable.
- Recall persists nothing, so a resumed session, a `/tree` jump and a compaction carry no recall state to reconcile.
- What leaves the machine is stated once per destination and bounded by the item: a stub to the classifier, the body to the main model.

**More difficult:**

- A recall that fills most of its budget can cause a compaction the host would not otherwise make at that check. After it, the block may drop for the rest of the turn with no notice, and the next user message scores again.
- Recall sits outside both request-time redaction paths, so anything that must not leave the machine has to be excluded before it is archived, or by a persisted edit, and never by a filter applied on the way out.
- The classifier provider learns each scored message's text and a preview of every eligible archived output, on every new user message.
- The size bound is a budget and not a guarantee: it holds for the request recall builds, by the host's own estimate, and says nothing about the host's later checks or about a request another handler grows after recall returns.
