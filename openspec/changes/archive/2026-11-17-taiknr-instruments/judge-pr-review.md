# Judge Gen — PR review — taiknr-instruments (PR #6)

Head commit reviewed: `30f442eed50b50f3a33535d75a75f72ed0bdd345` (confirmed unchanged at the end of the review).
Evidence read: the PR description and diff, `proposal.md`, the five spec deltas, the code the diff touches, the pi host code it hooks into, and pi-jefferson 0.14.0 in `node_modules`. `npm run check` was run on this head: lint clean, typecheck clean, 37 files, 526 tests, all passing.
Load assumed: one person running pi in a terminal, one session at a time. A session has hundreds of requests at most.

What this change does: It adds four Jefferson instruments (`taiknr.context`, `.archive`, `.savings`, `.recall`) that taiknr keeps current from six extra event handlers. One per-session publisher turns pi's data into a calibrated token figure, a net dollar saving and a classifier "deciding" flag. A holder with a no-op publisher sits in front of it until `session_start` reads the new `jeffersonInstruments` switch. Recall, stubbing and settlement are untouched except for two small hooks: an observer on the classifier call and a "recall block size" report.

## Must fix

None found.

## Should fix

1. **Stub savings are priced at the cheap "read" rate on a request that has to re-write its cache** (`src/domain/savings-dollars.ts:L54-L58`, `src/use-cases/instruments-publisher.ts:L171-L190`)
   - **What this is:** The dollar figure says what a stub saved, priced at the rate the provider charges for that text. The spec says: read rate inside the part of a warm request the last priced request carried, write rate after it and on a cold request.
   - **Problem:** `netDollars` picks `stubRate = rates.warm ? readRate : writeRate` and never looks at where the stub sits. The block already gets the position check (`blockInNewTail`); stubs do not. The first priced request after a compaction, a `/tree` jump or a session start has no baseline (`previousLength` is 0), so every stub on it lies "after" what was carried. If that request is warm only because the system prompt prefix was cached, the rest is written at the write rate. Case: Anthropic rates (read 1.5, write 18.75 per million), 2,000 saved tokens in the kept tail after a compaction. The spec asks for $0.0375 and the code publishes $0.003, twelve times too low. It lasts one request and then the baseline is set.
   - **Fix:** Have the publisher also pass whether any stub's index is at or beyond the baseline's length (`matches.some(m => m.index >= previousLength)`), and let `netDollars` use the write rate for the stub saving in that case, the way it already does for the block. A few lines and one table row in `savings-dollars.test.ts`. If the design meant "read whenever warm", the spec sentence should be changed instead.
   - **If we skip it:** The since-start dollar total reads slightly low after each compaction or tree jump. The README already calls the dollars "a counterfactual estimate", so the damage is small and visible only in the savings row.

## Nice to have

2. **The decision count stays on its last value after the call ends** (`src/use-cases/instruments-publisher.ts:L321-L332`)
   - **What this is:** `started(n)` posts `deciding: true, decidingItems: n`. `finished()` posts only `deciding: false`.
   - **Problem:** The default format reads `$deciding`, which says `idle`, so it looks right. But the README advertises `$decidingItems` "for the count on its own". A user format such as `rec $decidingItems` shows `12` for as long as the session is idle after a 12-item call. The spec's "no call yet reads 0" holds only until the first call.
   - **Fix:** Post `{ deciding: false, decidingItems: 0 }` in `finished()` and update the one test line that pins `{ deciding: false }`. Or say in the README that the count is the last call's count.
   - **If we skip it:** Only users who write their own count-only format see a stale number.

3. **The change is not archived yet, and the README cites a file that will move** (`README.md`, "Example rows" section; PR description, "Change record")
   - **What this is:** The description says the change "is archived on this branch before merge". On this head `openspec/changes/taiknr-instruments/` is still in place, `openspec/specs/{configuration,extension-packaging,tail-recall}` are unchanged, and there is no `openspec/changes/archive/…-taiknr-instruments`.
   - **Problem:** If it merges as is, the living specs miss the new switch, the extended registration list and the observer contract. The README also cites `research-chidi.md` ("Addendum — pi-jefferson.json rows") by bare name, and that path stops resolving after archiving.
   - **Fix:** Run the archive step before merge. Then change the README citation to the archived path, or drop it, since the sentence stands without it.
   - **If we skip it:** The next change is written against stale living specs, and the README citation dangles.

Lean: -0 lines possible. The new files are small and follow the repo's one-registrar-per-event convention. I found no dead code and nothing the repo already had that was rebuilt.

## What I checked and found sound

- **Spec conformance, structure.** 13 registrations with duplicates kept. The switch has exactly one reader, `instruments-session-start.ts`. No pi or Jefferson import in `src/domain` or `src/use-cases`. `pi-jefferson` is an exact dev dependency with type-only imports and `verbatimModuleSyntax` on. `RelevanceScorer` is unchanged.
- **Publishing cannot cost recall.** `observer.started/finished` only call `sink.post`, which builds every report first and wraps each emit in its own catch. Pi's `ModelRuntime.classify` really never rejects (try/catch around the whole body), so one `finished` call after the await covers every exit. The request handler registers after recall's, so its `event.messages` is recall's output (pi chains the list between `context_with_system` handlers).
- **Calibration and ordering.** Pi persists a message after emitting `message_end`, so `projection + estimateTokens(event.message)` is not a double count. The system message is persisted in the projection and sits in `event.messages[0]`, so both sides of `k` use the same estimator. The identity `historyBefore − contextInTurn = saving` holds because `historyBefore` is defined by it.
- **Dollar arithmetic.** I worked the rewrite term through: `saving·read − stubbedSuffix·(write − read)` equals `rawSuffix·read − stubbedSuffix·write`, which is what the spec describes. Non-finite and negative costs fall back instead of reaching a field.
- **Jefferson contract.** Every posted field is declared and finite, and the booleans are booleans. Jefferson's listener is created at its factory, so a registration at `session_start` is heard. Its bar clamps a value over 100. The default formats parse (variable names stop at `/`).
- **Cost at the expected load.** Each response and settlement does one projection build and one `estimateTokens` pass, which is linear in history. That is fine for one interactive session.

Verdict: Ship. Finding 1 is worth a few lines before merge but does not block. Finding 3 is a merge-process step, not a code defect.

Not checked: how Jefferson renders the four formats and the bar in a live TUI (the PR says this is Joel's live check), and behaviour on a persisted assistant message with no `usage` object, which `usageOf` would throw on at session start and which I did not try to produce.
