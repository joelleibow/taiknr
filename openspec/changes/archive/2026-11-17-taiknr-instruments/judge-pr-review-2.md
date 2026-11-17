# Judge Gen — PR review, round 2 — PR #6 `taiknr-instruments`

Head commit reviewed: `9ded10deec0505a4737716c0dcc0d1aa112a8b61` (unchanged from `gh pr view` at start and end).
`npm run check` in a `mktemp -d` copy of `HEAD` (removed afterwards): lint clean, typecheck clean, 37 files, 542 tests passed. No model call.
Evidence read: PR description, `proposal.md`, `specs/`, the living specs, the code, and `git diff 30f442e...HEAD -- src tests README.md`. No file edited, no PR comment.

What this change does:
taiknr now publishes four instruments (context, archive, savings, recall) to the pi-jefferson status bar. Every token figure is taiknr's character count times a per-model ratio taken from each reply's real usage. Since the last round, the bar reads the request in turn (the provider's own count once the reply lands) instead of total history. A model with no ratio of its own borrows the ratio of the model measured most recently. Default formats no longer repeat the label. A compaction or `/tree` jump now re-posts the opening request figures. An assistant message with no `usage` is skipped as a sample.

I took the new round first, then the whole PR. The bar change, the single labels, the usage-less message skip and the opening figures after a compaction or tree jump all match the specs and the README, and each has a test that fails if it breaks. One finding remains.

## Should fix

1. **A tree jump can pick the wrong model to borrow from, or none at all** (`src/domain/calibration.ts`, `reseedTable`, the line `return { entries, latest: seeds[0]?.pair ?? table.latest }`)
   - **What this is:** When a model has no ratio of its own, it borrows the ratio of the model "measured most recently". The table keeps that model as `latest`. A `/tree` jump (moving to another point in the session history) keeps the ratios measured live in this run and re-reads the rest from the new branch.
   - **Problem:** `reseedTable` always lets the new branch's newest seed replace `latest`, even when a live measurement exists. The spec (`context-figures`, "A pair with no ratio of its own borrows…") says the source is "the pair of the newest live sample in this run, or else of the newest seed". Two concrete cases:
     (a) Model A was measured live. You jump to a branch whose newest reply was model B. `latest` becomes B's seed, so a new model C borrows B's seed. B's seed is the weaker number (it divides by a rebuilt request) and the spec says A's live ratio comes first.
     (b) Same start, then you jump again to a branch with no replies. B's seed is dropped from the table, but `latest` still names B. A is live and still in the table, yet `ratioFor` for C returns k = 1, which is about 40% low. The test "a latest whose entry a reseed dropped reads k 1" pins that last result, but only for a table with no live entries, which is the one case where it is right.
   - **Fix:** In `reseedTable`, keep the old `latest` when its entry is live and survives, and otherwise take `seeds[0]?.pair`. Roughly: `const keepLatest = table.latest !== undefined && entries.get(pairKey(table.latest))?.live; latest: keepLatest ? table.latest : (seeds[0]?.pair ?? table.latest)`. Then change the test "a tree jump borrows from the new branch's newest seed…" so a live pair beats a new seed, and add one for the double jump in (b).
   - **If we skip it:** After a tree jump across models, the first request on a third model shows a context figure and a bar that can be off by tens of percent, flagged `~`. It corrects itself at that model's first reply. It is rare and shows only in a status readout, and no stub, recall or dollar decision uses it. Recall's size bound stays on pi's estimate.

## Nice to have

None.

Not in scope but checked and fine: the borrow after a plain session start (the seeds are newest first and the test pins the order); the borrow after a live sample (`withLiveSample` sets `latest`); `ratioFor` with no pair; usage-less messages in both the seed reader and the virtual-model reader; the bar's null/zero/negative-window cases; the opening figures after a compaction and a tree jump and their effect on `pending` and `baseline`; the README rows against the declared default formats; the instruments' fields staying finite.

Verdict: fix 1 first. It is a small change in one function, and low in impact. I would not hold the merge on it if Joel prefers a follow-up.
Lean: -0 lines possible.
Not checked: how Jefferson 0.14.0 renders the bar and the new single-label formats in a live TUI (Joel's task 15 live check, not repeatable without a session).
