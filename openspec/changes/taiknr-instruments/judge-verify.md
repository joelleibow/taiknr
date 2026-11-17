# Verification Report: taiknr-instruments

Using change: `taiknr-instruments` (branch `taiknr-instruments`, PR #6), head commit `30f442e`.
Schema `marbleization`. Artifacts read: `proposal.md`, the five delta specs, `design.md`, `tasks.md`.

## Summary

| Dimension | Status |
|---|---|
| Completeness | 36/41 tasks ticked. The 5 open are group 15 (Joel's live check, unticked by design). 20 requirements and 111 scenarios read; every ADDED or MODIFIED requirement has code behind it. |
| Correctness | 20/20 requirements covered. Scenarios are covered by code and a green test, except the four that no taiknr test can reach by design (listed under Not verified). |
| Coherence | Design followed. One comment-only edit to a file the design froze (SUGGESTION). |

The counts are my own tally of `### Requirement:`, `#### Scenario:` and checkbox lines in the delta specs and `tasks.md`.

I ran `npm run check` myself on the clean tree at `30f442e`: Biome clean over 80 files, `tsc --noEmit` clean, vitest 37 files and 526 tests passed.

Group 15 (15.1–15.5) is Joel's live check. It is meant to be unticked and I raise nothing for it. Unsigned commits are authorised and I raise nothing for them.

## Completeness

**Task completion.** Groups 1–14 are all `[x]` and group 15 is `[ ]`. Nothing in 1–14 is an unchecked box.

**Spec coverage.** All five deltas are ADDED or MODIFIED only. There are no REMOVED or RENAMED entries.

| Delta | Requirements | Where implemented |
|---|---|---|
| `configuration` | 1 | `src/config/taiknr-config.ts:10,23,69,90`, one reader at `src/infra/pi-event-handlers/instruments-session-start.ts:20` |
| `context-figures` | 7 | `src/domain/{token-estimate,calibration,context-figures,savings-dollars}.ts`, `src/use-cases/instruments-publisher.ts`, `src/infra/adapters/pi-instrument-readings.ts` |
| `jefferson-instruments` | 8 | `src/infra/adapters/jefferson-instruments-declaration.ts`, `jefferson-bus-adapter.ts`, the six `instruments-*.ts` registrars, `src/app/extension/instruments-holder.ts` |
| `extension-packaging` | 3 (2 MODIFIED, 1 ADDED) | `src/app/extension/taiknr.ts`, `package.json`, `package-lock.json`, `tsconfig.json` |
| `tail-recall` | 1 | `src/infra/adapters/pi-jev-scorer-adapter.ts:56,69`, `src/infra/pi-event-handlers/context.ts:73,88` |

The README requirement ("documentation explains what stubbing does…") has its text: the Instruments section covers the post-settlement drop, the pre-run compaction check, `null` after a compaction, the recall block, net and signed dollars, overlap, the kind of each figure, and the example rows. This is the docs pass, which `tasks.md` says is not a task.

## Correctness

**Requirement mapping, checked against the code rather than the tasks:**

- **Ratio and calibration.**
  - `validUsage` and `sampleRatio` (`calibration.ts:58–67`) take the prompt as `input + cacheRead + cacheWrite`, output left out. They refuse aborted and error responses, non-finite or negative counts, a zero prompt and a zero estimate.
  - `seedTable`, `reseedTable`, `withLiveSample` and `ratioFor` give the table rules. A session start seeds all entries as non-live. A tree jump keeps live entries and reseeds the rest. A compaction keeps the table. With no pair, k is 1 and the flag is on.
  - `seedsFrom` (`pi-instrument-readings.ts:62–76`) divides by the projection at `entry.parentId`, using the root `buildSessionProjection`. It reads assistant messages only, so a `usage` entry is never a sample.
  - `readPair` handles the virtual-model case.
- **Finite figures.** `posted` is `Math.round(k × estimate)`, and k is finite by construction. `responseRates` and `rate` refuse non-finite or negative costs. `finished` drops a non-finite or negative classifier cost. The bar returns `null` for a window ≤ 0.
- **Six figures.**
  - `matchStubs` is a single map lookup per tool result, taken from the request and not from the store.
  - `requestEstimates` defines `historyBefore` arithmetically, so the identity is exact.
  - Total context is the persisted projection. At a response it adds `estimateTokens(event.message)` (`readResponse`).
  - A request never posts `totalContext`, so a recall turn leaves it alone.
  - The opening posts `contextInTurn` equal to `totalContext`.
- **Saving and dollars.** `netDollars` follows D8's bullets and fifteen-row table: read or write rate by warm or cold, block rate by `blockInNewTail`, the rewrite charge only when warm and floored at zero (`Math.max(0, write − read)`), and `classifierSpend` subtracted. `rewriteOf` and `newStubStart` implement the baseline, suffix and block-change rules. The baseline is promoted only at a priced response. A compaction or tree jump clears it. Spend carries across an invalid response and is reset at a priced one.
- **Since-start totals.** They live in memory only, start at 0 for each factory, and `src/` has no persistence call (`rg "writeFile|appendFile|mkdirSync|pi-jefferson\.json" src` finds nothing).
- **Registration and posting.** The session-start registrar is synchronous. It evaluates the reading first, then registers, then posts a `FigureValues`-typed opening of all 17 fields, then installs. A throwing reading registers nothing and leaves the no-op. `buildFieldReports` emits one report per present key in declaration order, and each emit has its own `try`/`catch` citing the stale-context case (`jefferson-bus-adapter.ts:8–14`). No registrar catches.
- **Switch.** `jeffersonInstruments` is read in one place, so the no-op holder costs no host read. `registerContextHandler` passes `holder.current()` to the scorer adapter.
- **Observer.** `observer?.started(ids.length)` is immediately before `classify` and `finished` is the line after the `await`. I confirmed in `pi-ai/dist/models.js:522–536` that `classify` catches everything and returns `classifierErrorResult`, so one call point covers every exit. A catalog miss throws before `started`.
- **Packaging.**
  - `pi-jefferson` is `0.14.0` exactly, in `devDependencies` only, and the lockfile carries it.
  - `verbatimModuleSyntax` is on.
  - The `import type` search (`rg -n -U --pcre2 '^import (?!type )[^;]*?from "pi-jefferson' src tests`) finds nothing.
  - `src/domain` and `src/use-cases` import neither `@earendil-works/pi-` nor `pi-jefferson`.

**Reproduced checks (task 14.4, 14.5):**

| Check | Result |
|---|---|
| `4 *` and `/ 4` in `src` | exactly `token-estimate.ts:7`, `context.ts:67` and the `// 4. Drain` comment in `agent-before-settle.ts:46`, nothing else |
| `jeffersonInstruments` in `src` | `taiknr-config.ts` ×4 and `instruments-session-start.ts` ×1, nothing else |
| `session_shutdown\|events\.on\(` in `src` | nothing |
| Created files | exactly the design's 15 source and 15 test files |
| Load check, in a `mktemp -d` export with no `node_modules` | stderr empty on the clean tree; positive control (appended `this is not typescript (`) prints `Failed to load extension … ParseError`. Both directories removed. |

No model or classifier call was made.

**Scenario coverage.** Each scenario maps to a named test in `tests/**`. Examples: the publisher's rewrite-state cases, `tests/infra/adapters/jefferson-instruments-declaration.test.ts` (fields, types, finiteness, `toFixed(4)` and `bar`), `tests/app/extension/taiknr.test.ts` (13-entry list, factory touches only `on`) and the session-level cases in `tests/app/extension/archive-session.test.ts`. I confirmed the suite is green and read the publisher test titles against D8's response-state table and rewrite cases. I did not re-run the mutation steps `tasks.md` describes (delete a field key, flip a type, remove an ordering).

**Not verified:**

- The group 15 acceptance scenarios (*Joel's live look is the acceptance*, and the live half of *Shutdown clears the fields* and *A mid-session off freezes it*). Only Joel's own pi can show that Jefferson accepts each report. They are Joel's by design, not a gap.
- *Every new session is a fresh Jefferson* and *A publishing registrar throws*. Both are designed to have no taiknr test (pi's own teardown and pi's per-handler catch).
- *Turning off mid-session*, because no `/taiknr` command exists yet.
- The `message_end` provider-pair, usage and cost values against a real provider. The session harness rewrites usage to characters ÷ 4 at zero cost, so a real response's numbers can be confirmed only by Joel's live watch.

## Coherence

**Design adherence.** D1–D9 match the code: one publisher per session behind a holder with a no-op; six registrars immediately after the registrar each one reads, in the order `taiknr.ts:38–61` shows; eager values only for `message_end`; spend accounting; the rate and baseline rules; and failure with no new channel. The final `taiknr.ts` order is session-start, then the instruments session-start, tree, instruments tree, compact, instruments compact, tool_call, turn_end, agent_before_settle, context, then request, response, settled.

**Code pattern consistency.** The files follow the house layout. Imports use `.js` specifiers, the contract types are imported with `import type`, and each registrar registers one event. The tests mirror `src/`.

## Issues by priority

### CRITICAL

None.

### WARNING

None.

### SUGGESTION

1. **A file the design froze was edited, comment only.**
   - `design.md` (Unchanged list, line 109; D1's "the gate is not modified") and `tasks.md` 14.2 expect `src/app/extension/handler-gate.ts` unchanged. They also expect the modified-source list to be exactly four files.
   - `30f442e` (the docs commit) rewrote the doc comment at `src/app/extension/handler-gate.ts:7–9`. `git diff --name-only --diff-filter=M abaa6b0 HEAD -- src` therefore lists five files.
   - The code is untouched and the new wording is accurate: the old "six non-session-start registrars" is now twelve.
   - Recommendation: either revert the comment so 14.2's check holds literally, or note in the PR description that the gate file changed by comment only.
2. **A saving that rounds to zero posts `-0`.** `posted()` is `Math.round`, so −0.3 gives −0 (`context-figures.ts:68`, pinned by `tests/use-cases/instruments-publisher.test.ts:433`). `String(-0)` renders `0` and `-0` is finite, so Jefferson accepts it. A repeated `-0`/`0` pair could repaint under an `Object.is` comparison. Recommendation: none required. Normalise with `+ 0` only if Joel sees a flicker in 15.4.

## Final assessment

No critical issues found; the checks that ran pass: `npm run check` is green, the `rg` boundary checks hold, and the load check and its positive control behave. 2 suggestions to consider. Not verified, for the reasons above: the Jefferson runtime acceptance (group 15, Joel's), the live-provider values at `message_end`, and the three scenarios that are untestable by design. They do not block the implementation, but the change is not ready to archive until Joel's group 15 is ticked.
