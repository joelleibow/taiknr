# Verification Report: taiknr-instruments (round 2)

Using change: `taiknr-instruments` (branch `taiknr-instruments`, PR #6), head commit `9ded10deec0505a4737716c0dcc0d1aa112a8b61`. Schema `marbleization`.
Artifacts read: `proposal.md`, the five delta specs, `design.md`, `tasks.md`, and `owner-rulings.md` for the live-check rulings the fixes cite. I read the diff `30f442e..HEAD` (the fixes `2177499`, the plan `4d64be8`, the tick `9ded10d`) in full, and the code those fixes touch.

## Summary

| Dimension | Status |
|---|---|
| Completeness | 41/41 tasks ticked, group 15 included, with Joel's words recorded under "Joel's live check, group 15". 21 requirements across 5 deltas, all ADDED or MODIFIED; every one has code behind it. |
| Correctness | 21/21 requirements covered. Every scenario maps to code and a green test, except the ones that can only be seen in Joel's pi (listed under Not verified). |
| Coherence | Design followed, including the three fixes. One comment-only edit to a frozen file, and one spec sentence looser than the design (both SUGGESTION). |

The counts are my own tally of `### Requirement:` and checkbox lines. The spec gained one requirement (*A pair with no ratio of its own borrows the most recently measured one*) and split one (*A saving is priced at the rates the request's own response reported*), which is why 20 became 21 since the last pass.

## What I ran

- `npm run check` in a `mktemp -d` copy of the tracked and untracked tree (`git ls-files -co --exclude-standard`), after `npm ci`. Biome clean over 80 files, `tsc --noEmit` clean, vitest **37 files, 542 tests passed**. The directory is removed. No model call was made.
- The load check of 14.4: an export with no `node_modules`, listed as a package in a separate agent directory. Stderr is empty. The positive control (appended `this is not typescript (`) prints `Failed to load extension … ParseError: Missing semicolon`. Both directories are removed.
- Mutations, each applied to the temporary copy only and reverted. The repository was never edited, and `git status` shows only a `judge-pr-review-2.md` I did not create.
- The `rg` proofs of 14.5 and 14.2 against `HEAD`.

## The three fixes

### 1. The bar draws context in turn (9.3, 6.8, 13.7, 9.4's `$bar` placement)

- `bar()` reads `readings.contextInTurn` (`jefferson-instruments-declaration.ts:52–57`), and the default context format is `$contextInTurn/$contextWindow $approx $bar`.
- A compaction or tree jump posts the five request figures through `noRequestYet(totalContext)` (`instruments-publisher.ts:128–134`, `postNewHistory` at `:178–182`), so after a history change the bar reads the new history and not a request that is gone. The opening publication spreads the same helper.
- Mutations:

| Mutation | Result |
|---|---|
| bar reads `totalContext` | 2 red (the two bar tests), matches 9.3 |
| `postNewHistory` without `noRequestYet` | 5 red: both `instruments-compact` tests and three publisher tests. 6.8 says "two"; five is more than that and does not contradict it |

- The OpenRouter claim rests on `input + cacheRead + cacheWrite` being the billed prompt for both API families. The measured value is already what `readResponse` and `validUsage` use. The test *an OpenRouter response's prompt fills the bar as an Anthropic one does* pins the arithmetic (3274 + 19 644 of 1 000 000 gives 2.2918). I did not re-derive pi's `openai-completions` parser line the design cites.

### 2. A new model borrows the most recently measured ratio (4.4, 6.9, 10.2, 13.7)

- `RatioTable` is now `{ entries, latest }`, where `latest` is a pair and not a copied k (`calibration.ts:26–34`). `seedTable` sets it to `seeds[0]?.pair`, `reseedTable` to `seeds[0]?.pair ?? table.latest`, `withLiveSample` to the sample's pair. `ratioFor` returns the pair's own entry, else `latest`'s k with the flag on, else k 1 with the flag on.
- That a seed list is newest first is what makes `seeds[0]` the right pair. `seedsFrom` walks `assistantEntries(branch).reverse()` (`pi-instrument-readings.ts:70–81`), and 10.2 pins the order.
- The usage-less message filter (`5b6f2d4`, `pi-instrument-readings.ts:33–35`) keeps a message with no `usage` from throwing in `usageOf`. Its test is red when the filter is removed.
- Mutations:

| Mutation | Red |
|---|---|
| `ratioFor` never borrows (k 1) | 9 |
| borrowed figure posted calibrated | 29 (this also calibrates k = 1, so it is broader than the task's) |
| `withLiveSample` leaves `latest` unmoved | 3 |
| `reseedTable` ignores `seeds[0]` | 1 |
| `seedTable` takes `seeds.at(-1)` | 2: one in `calibration.test.ts`, and 10.2's own test in `pi-instrument-readings.test.ts` |

- 4.4's boundary cases are all present as tests: an empty table, a `latest` whose entry a reseed dropped, and a pair holding its own seed. 6.9's two cases (Opus → Fable at 1.677 with the flag on, then calibrated at the first reply's 875 338) are present and red under the mutations above.
- The borrowing is a read, not a copy: nothing posts a figure from a borrowed k as calibrated, and the flag stays on until the pair's own live sample (`withLiveSample` makes it live).

### 3. Default labels no longer repeat (9.4)

- All four default formats drop their short name. `rg` on the declaration shows no format that repeats a word of its label.
- The test *every default format leaves the instrument's name to its label* compares against D5's four strings and checks each label's words against the format's literal words. Restoring `ctx `, or `save `, and moving `$bar` off the end, each turn it red (1 each, matching 9.4).
- The README example rows were brought along: `taiknr.savings` now reads `"$savedTokensSinceStart tok $savedDollarsSinceStart usd since start $approx"`, and `taiknr.context` uses `$contextInTurn`.

## Completeness

**Task completion.** 41 of 41 `[x]`, group 15 included (15.1–15.6). Group 15's ticks are Joel's own words in `owner-rulings.md`, with the unwatched parts listed there (15.3's `/compact` and `/tree` half, 15.5's `deciding N` flash, 15.6's OpenRouter half checked against a session file and not live). I raise nothing for those, since the ticking states them.

**Spec coverage.** All five deltas are ADDED or MODIFIED only. No REMOVED or RENAMED entries.

| Delta | Where implemented |
|---|---|
| `configuration` | `src/config/taiknr-config.ts`, one reader at `instruments-session-start.ts` |
| `context-figures` | `src/domain/{token-estimate,calibration,context-figures,savings-dollars}.ts`, `src/use-cases/instruments-publisher.ts`, `src/infra/adapters/pi-instrument-readings.ts` |
| `jefferson-instruments` | the declaration, the bus adapter, the six `instruments-*.ts` registrars, the holder |
| `extension-packaging` | `taiknr.ts`, `package.json`, `package-lock.json`, `tsconfig.json` |
| `tail-recall` | `pi-jev-scorer-adapter.ts`, `context.ts` |

The three modified deltas are unchanged since the last pass. The two that moved are `context-figures` and `jefferson-instruments`, and both moves are traced above.

## Correctness

The earlier pass's requirement mapping stands, and I re-read the changed parts against the changed text:

- *A pair with no ratio of its own borrows the most recently measured one*: `ratioFor`. Tests: `tests/domain/calibration.test.ts` (borrow, newest seed then live sample, tree jump, calibrated at own sample), `tests/use-cases/instruments-publisher.test.ts` (*a switch to a model with no ratio borrows…*), `tests/infra/pi-event-handlers/instruments-compact.test.ts`.
- *Context in turn before a history's first request* (now covering start, compact and tree): `noRequestYet`; both handler tests and three publisher tests.
- *The bar reads a provider's whole prompt* and *The percentage*: the declaration test.
- *A warm request that read only part of its prefix* (new scenario, text now says "low by write − read"): `savings-dollars.test.ts:111`, row 11, priced warm. The design's row 11 wording was corrected from "high" to "low", and the spec and design now agree.
- *Four instruments by their full names*: the declaration test and the label-comparison test.
- `rg` boundary proofs on `HEAD`: `4 *` and `/ 4` appear only at `token-estimate.ts:7`, `context.ts:67` and the `// 4. Drain` comment; every `pi-jefferson` import is `import type`; `jeffersonInstruments` appears five times in `src/` (four in `taiknr-config.ts`, one in `instruments-session-start.ts`); no `session_shutdown` or `events.on(`; no persistence call; no `@earendil-works/pi-` or `pi-jefferson` import in `src/domain` or `src/use-cases`; no deletion against `abaa6b0`; 30 added files under `src` and `tests`.

**Not verified:**

- Jefferson's acceptance of each report in a live TUI. Joel's group 15 covers it, with the exceptions he lists.
- *Every new session is a fresh Jefferson* and *A publishing registrar throws*: designed to have no taiknr test.
- *Turning off mid-session*: no `/taiknr` command exists yet.
- The `message_end` provider-pair, usage and cost values against a real provider; the session harness rewrites usage to characters ÷ 4 at zero cost, so Joel's live look (about 0.1% from Anthropic's bill) is the only evidence.
- I did not re-derive the `openai-completions` parser line the OpenRouter claim cites. I accept it on the ruling's measured sessions.

## Coherence

**Design adherence.** D5's table (bar and defaults), D7 step 5 (`latest`) and the response-state table match the code. The fixes follow the design text written for them.

**Code pattern consistency.** The edits keep the house layout: `.js` specifiers, no second estimator, one new helper in the publisher and none in a registrar. Tests mirror `src/`.

## Issues by priority

### CRITICAL

None.

### WARNING

None.

### SUGGESTION

1. **A frozen file was edited, comment only (carried from round 1).** `src/app/extension/handler-gate.ts:7–9` is rewritten in `30f442e` (the old "six non-session-start registrars" is now twelve). `design.md`'s Unchanged list and task 14.2, which 14.6 re-runs, expect that file untouched and exactly four modified source files. `git diff --name-only --diff-filter=M abaa6b0 HEAD -- src` lists five. The code is untouched and the new wording is accurate.
   - Recommendation: add `handler-gate.ts` (comment only) to 14.2's expected list, or revert the comment, so the check holds literally. A line in the PR description would do.
2. **The spec's borrowing sentence is looser than the design on a tree jump.** *A pair with no ratio…* says the borrowed pair is the newest live sample in this run, "or else" the newest seed on the branch. `reseedTable` sets `latest` to the new branch's newest seed even when this run holds a later live sample for another pair (`calibration.ts:90`, design D7 step 5, task 4.4, and a test for it). The code, design and tasks agree with each other, and the spec reads differently in one case.
   - Recommendation: add "a `/tree` jump takes the new branch's newest seed, and keeps the last pair only when the branch has none" to the requirement's text, so a reader of the spec alone gets the shipped behaviour.
3. **Two recorded numbers are stale.** 14.6 says "537 tests in Michael's copy"; the tree at this head runs 542 (it says the count is no pass condition, so nothing depends on it). The mutation counts in 4.4 (7, 3, 1, 1, 1), 6.8 (2) and 6.9 (8) differ from what I measured (9, 3, 1, 1 and 2; 5; 29 for a broader mutation). Each is a lower bound the claim still satisfies, because every mutation goes red.
   - Recommendation: none required. Reword the counts as "at least" if the file is edited again.
4. **A saving that rounds to zero posts `-0` (carried from round 1).** `Math.round` gives −0 for −0.3. It is finite, renders `0`, and Joel's live check raised no flicker. No action.

## Final assessment

No critical issues found; the checks that ran pass: `npm run check` is green at 542 tests, the load check and its positive control behave, every mutation the three fixes' tasks name goes red, and the `rg` boundary proofs hold. 4 suggestions to consider. Group 15 is ticked on Joel's words, so the Completeness gap from round 1 is closed. Not verified, for the reasons above: Jefferson's runtime acceptance beyond what Joel watched (15.3's `/compact` and `/tree`, 15.5's `deciding N` flash, 15.6's OpenRouter half), the live-provider values at `message_end`, the two scenarios designed to have no taiknr test, and the mid-session switch-off.
