# 0009. Place Cache Points Around the Recall Block

## Status

Accepted

## Context

ADR 0007 recorded what a recall block costs, in one of its consequences: "The block is gone from the next user message's request, so that request's prefix diverges at the recalling turn's user message and the provider writes that turn to its cache again, once, at cache-write price." Measured, that sentence was wrong in both directions.

Pi puts its own cache point on the block recall appends, so the request that carries the block makes the provider rewrite the turn's prefix instead of reading it. Over eleven turn starts measured before this change, the prefix read the 35,731-token entry alone and rewrote between 41,000 and 143,000 tokens each. In one of Joel's sessions the extension had cost $0.81 more than it would have otherwise, and that report is what started this work.

What the provider charges follows where the cache points sit, and the response's own counts cannot tell you: they enter the figure only as whether the request was warm, so one request prices the same way however its read and write split falls. Three answers were weighed. Edit the request payload so the prefix stays cached, which is this record. Price the rewrite from the response's cache split instead, declined because it needs a counterfactual new tail and a discriminator for the entry's lifetime, and a retried or replayed request makes it noisier. Add a log line or an instrument field so the edit is visible, declined because the published field table stays total and finite, and the figures already carry the cost.

This record narrows ADR 0007's consequence and does not replace that decision. ADR 0007's body is unchanged, and everything else it says still governs, including recall on `context_with_system`, the disclosure split by destination, the size bound and its accepted exposure.

## Decision

**On the routes one predicate covers, taiknr edits the provider's request payload and moves message-level cache points.** The predicate is read from the request's own model: provider `anthropic` on the `anthropic-messages` api with a baseUrl whose host is exactly `api.anthropic.com`, or provider `openrouter` on that api with a model id beginning `anthropic/`. Every other request goes out byte-identical to today's — Bedrock, the other Anthropic-format gateways, OpenRouter's `openai-completions` path, a proxy host, a missing baseUrl and a virtual model among them. Coverage is exactly the routes that were measured: Joel's ruling of 2026-11-17 took measured routes only, because a result on one gateway proves nothing about another.

**The edit places at most two points of its own, and both are copies of pi's own message marker with its lifetime.** One sits on the block just before the block recall appended, so the request reads the prefix before it. The other sits, on the first request after a turn that recalled, on the last block of the message that carried the block, so that request reaches an entry the recalling turn wrote. Message text, block order and message positions do not change. A request may carry four cache points and a fifth is a 400 rather than a silent drop, so the budget is four minus every marker already there, and when taiknr's wanted points do not fit, pi's last-message marker is the one that yields and the payload goes out otherwise as it arrived. Apart from the carve-out below, message-level markers are the only ones taiknr touches.

**One carve-out, on pi's own OAuth shape.** Where the system prompt carries two marked blocks, the first block's marker is removed on every request of the session. It cannot be toggled per request, because system and tools markers sit inside pi's thread hash. And the entry it gives up costs nothing: the tools-plus-identity entry is a strict prefix of the entry the second marked block already covers.

**The edit is a pure function of its inputs, and it fails open.** It takes the payload, the model, the block this request carries and the record of where the last request's carrier sat, and returns a deep clone or nothing; it mutates neither the payload nor its own state before it has a result. The record the next request uses is committed only at a valid assistant response, so an errored, aborted or replayed attempt never carries one forward. Nothing throws out of the handler: pi's runner swallows a handler's throw and sends the previous payload anyway, so a request the edit cannot read goes out as it arrived, priced the way it was before this change.

**The figure prices the block by where it lands.** A block left with no marker on or after it went out uncached and is charged the input rate. Otherwise it is a write when it is new to what the last priced request carried, changed on its message, or left uncached by the last priced request, and a read or a write by the warm gate on every other request. The placement is read from the finished payload, so a handler that failed open prices today's way instead of claiming a move it did not make.

## Consequences

**Easier:**

- A recalling turn keeps its cached prefix. The turn that follows reads at least the prefix through the carrier's own content and writes no more than the previous turn's content, the new prompt and the tail: measured at 6,896 read against 1,236 written on the turn after a handoff that also recalled, and at 8,132 against 1,142 on the turn after a turn that recalled nothing.
- A recalling turn longer than the provider's lookback keeps its entry, which a point before the block alone does not. Over twelve sequential tool calls the next turn read 6,896 and wrote 1,236, where the single point left it reading 0 and writing 10,659.
- The block's price is what the provider bills, and the same rule corrects a latent defect: a block that changed on a message the last priced request carried used to be priced at the read rate although no request had cached it. Every one of 132 measured requests across six runs matches the corrected rule.
- Nothing is persisted, no config field is added, no session entry type is added and no host file is written, so a rollback leaves no residue to reconcile.

**More difficult:**

- ADR 0007's consequence now holds only where the edit does not reach. On the covered routes the block is billed as input on the request that gives up pi's marker for it, written on the next request and read after that; on every other route the old sentence stands, and the rewrite charge there understates exactly as it did before.
- The edit has to recognise pi's own marker to copy it. A pi release that marks a different block makes taiknr find no match and place nothing, which is today's behaviour with today's numbers, and a transport that rewrites a lone surrogate in the block's text rather than removing it matches nothing, so that route gets no point.
- Another extension's marker cannot always be told from pi's. A lone message-level marker where pi marked nothing is copied as pi's and may be removed when the budget is short, and a marker placed by an extension loaded after taiknr can push a request to five points, which is a 400 taiknr can neither see nor prevent.
- With another extension's block-level cache marker leaving room for one point, the in-turn requests of a recalling turn bill their growing tool-result tail as input — roughly ten times the read-equivalent cost over a long turn — while the figure charges only the block.
- A moved carrier costs the optimisation and never edits the wrong message. A compaction, a `/tree` jump, `/new`, or merged or shifted messages leave the fingerprint unmatched, so that turn's first request rewrites the block-free prefix, as it did before this change.
- A warm replay of an earlier request, stalled behind another extension's asynchronous handler, can overwrite this request's placement and lose its carry. The cost is one lost carry and one mispriced request, and it is recorded rather than guarded.
- Under-reporting is recorded in `README.md` and not corrected here: a route outside the predicate, a request the edit failed on, a prefix below the model's cache minimum, a turn where a foreign marker leaves budget 1, and a partial cache read all price low, in directions that are known and sizes that are not.
