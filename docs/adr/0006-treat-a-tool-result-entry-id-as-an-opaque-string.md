# 0006. Treat a Tool Result's Entry Id as an Opaque String

## Status

Accepted

## Context

Every archive item, every side-store record and every replacement is keyed by the id Pi persisted for the tool result, so what the code assumes about that id's shape governs the whole archive path.

ADR 0002 describes it as Pi's collision-free 8-character `entryId`. Measured against the host, that is the common case and not the rule: Pi generates eight hexadecimal characters normally and falls back to a 36-character UUID when it has to, and the ids it hands a turn as a list are `flatMap`-filtered, so the list can be shorter than the results it belongs to. A pairing that sliced an id, matched it against a hex pattern, or trusted position silently attached a stub to the neighbouring result. This record narrows ADR 0002's parenthetical rather than replacing that decision, which still governs everything else it says.

The repository's proof of concept wrote its own session records under a `jev-side-store` type, with stub ids of the form `tc_N`. Those are a different identifier space written by code that no longer exists, and the sessions that carry them came from proof-of-concept runs rather than from this build.

Two alternatives were weighed: parse and normalize ids to a fixed width, and read the proof of concept's records through a compatibility shim. The first invents a failure mode, since an id that arrives in a shape the parser does not expect becomes a silently skipped result rather than a working one. The second costs a reader, a test suite and a permanent second format for sessions nobody will resume.

## Decision

An entry id is an opaque non-empty string. taiknr carries it whole, never slices it, never matches it against a length or a pattern, and uses it only to key a record and to name an edit's target.

A result pairs with its entry by call id, not by position, and position is used only when the list Pi hands over and the results it belongs to are the same length.

Session records the proof of concept wrote are ignored. No compatibility reader exists for `jev-side-store` entries or `tc_N` ids, and a session that carries them comes up with an empty archive rather than a migrated one.

## Consequences

**Easier:**

- Both of Pi's id shapes work without special handling, and a future shape works too, because nothing inspects the string.
- A result that cannot be paired is skipped instead of mispaired, so a stub never lands on the wrong output.
- The archive path carries no legacy branch, no shim and no second reader to keep green.

**More difficult:**

- A result that cannot be paired is skipped silently: nothing in the data marks it, and the only evidence is an output that stayed raw.
- Proof-of-concept sessions lose their archives when opened by this build, and anyone who wanted those outputs back has to read the JSONL by hand.
- An id is carried whole into stub text, so a 36-character id makes the stub longer than an 8-character one by 28 characters with nothing to trim it.
