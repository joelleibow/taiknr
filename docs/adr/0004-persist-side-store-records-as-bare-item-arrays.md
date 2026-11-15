# 0004. Persist Side-Store Records as Bare Arrays of Complete Items

## Status

Accepted

## Context

A session's archive has to rebuild from the branch alone: a resumed session, a `/tree` jump and a compaction all reconstruct the in-memory archive out of the `taiknr-side-store` entries the active branch carries, with no state left over from the process that wrote them. That makes the persisted record a contract between two readers that never run together, the settlement that writes a batch and the hydration that reads it back. If the two disagree about which items are valid, one writes records the other silently skips, and the session comes up with a shorter archive than it had.

The record also has to survive later cards. Extra metadata is the obvious kind of field a later card adds, and a session file outlives every version of the extension that wrote it.

Three shapes were weighed:

- **A versioned envelope** (`{ v: 1, items: [...] }`), the usual answer to a format that will change.
- **Metadata-only items**, re-joining each item's raw text from the tool-result entries still on the branch, so the record stopped duplicating the output's bytes.
- **A bare array of complete items**, which is what the code now writes.

The envelope loses on the test this design applies to a format feature: it has to let us delete something. An array check already identifies this shape, and a break the shape cannot absorb is better served by a new custom type, so the envelope adds a field nothing reads. Metadata-only items lose twice over: the read path would re-join multiple text blocks into one raw text, which is a second copy of the write path's join rule, and the stored stub would drift from what the current stub builder renders for the same text. A record that has to be recomputed is not a record.

## Decision

A `taiknr-side-store` entry's `data` is a non-empty array of complete archived items. Each item carries its id, its tool name, its argument summary, its error state, its rendered stub and its raw text, so hydration never reconstructs a field.

A well-formed item is a plain object, not an array, whose `id` is a non-empty string, whose `toolName`, `argsSummary`, `stub` and `rawText` are strings and whose `isError` is a boolean; a property the shape does not name is tolerated. Reading skips a foreign or malformed entry whole rather than item by item, folds the well-formed entries it reads in branch order, and lets the entry nearest the leaf win a repeated id. No skipped entry fails the event that was reading.

A shape that cannot be read this way gets a new custom type. This one is never renegotiated in place.

## Consequences

**Easier:**

- Hydration's validation is one array check and one field check, and both the write side and the read guard consume the same item definition, so neither can accept what the other rejects.
- An item read back is the item that was archived, stub included, so a changed stub builder never disagrees with an older session's record.
- A later card adds a field and old readers tolerate it, because unnamed properties are ignored rather than rejected.
- An extension that writes its own custom entries cannot corrupt the archive: a foreign type contributes nothing.

**More difficult:**

- An archived output's raw text sits in the session file twice, once in the tool result and once in its record, so stubbing roughly doubles the bytes of what it archived. Removing the second copy needs a read path that re-joins text, which is the alternative this record rejects.
- A record skipped for one bad item loses its well-formed neighbours too, because the entry is the unit of validity and a partly-read batch was judged worse than an omitted one.
- Breaking the shape means writing a reader for both custom types or accepting that older sessions' records are ignored; nothing about this decision can be undone in place.
