# 0005. Yield to Any Existing Edit of a Tool Result

## Status

Accepted

## Context

By the time a settlement runs, two other things may already own a tool result.

Pi's retry recovery omits a failed attempt's tool results with a replacement that carries no content, which takes that result out of the model's context while leaving its entry on the branch. Because the projection applies the latest edit to a target, a stub written for that same target later puts an unpaired tool result back in the model's context.

Other extensions edit tool results too. A redaction, a summary or an omission is a deliberate replacement, and a stub written over one silently undoes it. Nothing in the edit identifies its author, so a rule that meant to defer to an earlier extension could not ask who wrote the edit it found.

The branch itself moves under a pending item. An edit targeting an id that is no longer on the active branch throws, and one throwing draft discards the whole boundary, so a settlement that proposes anything for a departed item takes every other extension's proposal down with it.

Earlier cuts of this design waited for an edit to appear before settling an item, which re-stubs a result the user has already navigated away from and holds images for a session that is finished. Another cut disqualified an item only for a null replacement, which leaves a redaction overwritable.

## Decision

A pending item is committed only when both conditions hold:

1. The active branch holds a tool-result message with that item's id.
2. Neither the active branch nor the entries already proposed at that boundary holds a `context_edit` targeting that id, whatever its replacement and whoever wrote it.

A dropped item is dropped silently, with no replacement and no side-store record, and a settlement left with nothing to commit proposes nothing at all. Eligibility is read from the branch and the boundary's entries, never from the compaction-bounded projection, so an item carried forward from before a compaction is still considered.

## Consequences

**Easier:**

- A redaction or omission another extension made is never overwritten by a stub, whether it landed earlier in the session or at the same boundary.
- A recovery-omitted result stays omitted, so no unpaired tool result re-enters the model's context.
- A branch switch after an aborted run costs the pending item and nothing else: the next settlement drops it and succeeds instead of throwing away the boundary.
- Every read happens before any draft is proposed, so a settlement either proposes a consistent set or proposes nothing.

**More difficult:**

- taiknr gives up an output it already staged and recorded the content of, and says nothing about it. The only evidence is the absence of a stub beside a side-store record that omits the item.
- Registration order decides the outcome for two extensions that edit one result at the same boundary. An edit proposed by a handler that runs earlier is visible and drops the item; one proposed by a handler that runs later is invisible, so taiknr's record and store keep the unedited item while that edit wins in the model's context.
- Eligibility cannot be derived from the projection, because the projection is bounded at the last compaction and would drop carried-forward items that are still legitimately pending.
