# PR review — pull request #3, archive-stubbing-and-branch-hydration

Head commit reviewed: `cb9d234138ad1f5e71a5a08695f1215e6d84130b` (it did not move while I worked).
Evidence read: the PR description and diff, `proposal.md`, both spec deltas, the three living specs, the code the diff touches and the Pi 1.5.2 host types and dispatch code it connects to. I did not open the design, tasks, council, review or Michael files. `npm run check` passes: lint clean, typecheck clean, 16 test files, 220 tests.

Load assumed: one person running one Pi session at a time, sessions of tens to a few thousand tool calls. The README and ARCHITECTURE name no heavier load.

What this change does: when a run settles, taiknr replaces each large text tool result with a one-line stub. It records the raw text in a `taiknr-side-store` session entry and keeps an in-memory copy. It rebuilds that copy from the active branch on session start, `/tree` and `/compact`. A staged item from an aborted run waits for the next settled run, and is dropped if its entry has left the branch or already carries a `context_edit`.

## Must fix

None. I tried to break these and could not:
- Order of drafts: the side-store record comes first, then the edits, after other extensions' drafts. The handler builds every draft before it touches the store or either map.
- Pairing of results to entries by `toolCallId`, with a safe position fallback.
- The branch filter and the "already edited" filter: these match Pi's `appendContextEdit` rules (target must be on the branch).
- Surrogate-safe cuts, every line separator, a `tool_call` handler that cannot throw.
- Whole-branch hydration with whole-entry skipping of bad data.
- The gate: `session_start` is raw; the rest are gated, and no handler tests `enabled`.

## Should fix

None that changes behaviour. The spec and the code agree on every requirement I checked (staging, no-text, stub format, settlement, carry-forward, branch filter, one record per batch, inertness, three-event hydration, compaction, malformed entries). Nothing goes beyond the proposal.

## Nice to have

1. **Source comments point at a file the repo does not keep** (`src/infra/pi-event-handlers/agent-before-settle.ts:L52`, `session-start.ts:L29`, `src/infra/adapters/pi-archive-adapter.ts:L64`, `src/domain/archived-output.ts:L23`)
   - **What this is:** Four comments end in "(Trap 2)", "(Trap 5)", "(Trap 6)" or "(Trap 8)".
   - **Problem:** Those numbers come from a working note in the change directory. `AGENTS.md` lists the traps without numbers, so a later reader cannot resolve the reference.
   - **Fix:** Delete the four parentheticals. Each comment already says the reason in words.
   - **If we skip it:** Four comments cite something nobody can look up.

2. **The saved tool-result content is typed `unknown[]` and then cast back** (`src/infra/adapters/pi-archive-adapter.ts:L103-107`, `turn-end.ts`, `agent-before-settle.ts`, `taiknr.ts`)
   - **What this is:** `turn_end` stores each staged result's content blocks in a map. `toSettlementDrafts` reads them back, filters with `(block as {type?: unknown}).type` and asserts `block is ContentBlock`.
   - **Problem:** The map only ever holds `ContentBlock[]`. The `unknown` type plus the cast hides that, so a wrong thing put in the map would compile and reach a `context_edit`. No bug today.
   - **Fix:** Export the adapter's `ContentBlock` type and type the map as `Map<string, ContentBlock[]>`. Then the filter is `block.type !== "text"` with no cast.
   - **If we skip it:** A future change could put a non-block into the map and only find out when Pi rejects the boundary.

3. **`turn_end` finds the content by looking up the candidate twice** (`src/infra/pi-event-handlers/turn-end.ts:L24-29`)
   - **What this is:** After staging, each item is matched back to its candidate by id, then to its tool result by call id, only to read `content`.
   - **Problem:** Two `findLast` scans per staged item for something the adapter already had in hand. It reads as indirect, not wrong.
   - **Fix:** Have the adapter return the content with each candidate, or look the result up by `entryId` once. A few lines fewer.
   - **If we skip it:** Slightly harder to read. Nothing breaks.

4. **Two regexes that differ only by the `g` flag** (`src/domain/archived-output.ts:L25-26`)
   - **What this is:** `LINE_SEPARATOR` is used by `split`, `LINE_SEPARATOR_ALL` by `replace`.
   - **Problem:** Both patterns must change together. `split` with a global regex behaves the same, and `.test` is never called, so one constant is enough.
   - **Fix:** Keep one constant with the `g` flag and use it for both.
   - **If we skip it:** If someone adds a separator to one and forgets the other, a stub can end up with a line break in it.

Process note, not a finding: the PR text says the change "is archived into `openspec/specs/` on this branch before merge". At this head `openspec/specs/` still holds only the three older capabilities, and the two new specs are still deltas under the change directory. Merge only after that archive step lands, or the living specs will not describe the shipped behaviour.

Accepted limits I checked and left alone, because the docs or `shortcut:` comments name them: `argsByCallId` grows by one short string per top-level call for the session's life. The store can run ahead of the branch when Pi discards a boundary, and the next hydration repairs it. A competing extension registered after taiknr is invisible to its filter. Pending items are lost on `/reload`. The raw text is stored twice on disk. A very low `minCharsToArchive` can make a stub longer than its text (the README warns).

Verdict: Ship.
Lean: -8 lines possible.
Not checked: behaviour in a live Pi session with a real model and a real extension loaded after taiknr (no model call was allowed); I traced Pi's `agent_before_settle` and `appendContextEdit` in the installed 1.5.2 bundle and ran the existing faux-provider session tests instead.
