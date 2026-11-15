# Owner Rulings — archive-stubbing-and-branch-hydration

Joel's own words only. Each entry is quoted and dated with what he decided.

## Request (2026-11-14)

> "Janet, we're here in taiknr  and ready to take  down the next card on the board"

What he decided: run the next taiknr board card, **Archive, stubbing, and branch hydration** (`🤖 Knowledge/projects/taiknr-notes/archive-stubbing-and-branch-hydration.md`), through Conductor Janet. The card's text was drafted by a Janet, so each decision in it (stub format, settlement mechanism, side-store entry, hydration events, test shape) is a proposal until he confirms it; it is the request, not a ruling.

## Standing rulings carried from earlier changes (2026-11-14)

Recorded in `openspec/changes/archive/2026-11-14-foundation-and-packaging/owner-rulings.md` and `openspec/changes/archive/2026-11-14-configuration-loader/owner-rulings.md`; quoted here because they bind this change too.

> "Whatever the community is doing for typical biome config is what we're going with. Our decisions need to reflect the communities preferences so we're well aligned for adoption."

- Decisions reflect the community's preferences, so the package is aligned for adoption.

> "The pi extension is pi-taiknr. The  repo is just taiknr"

- The package / extension name is `pi-taiknr`; the repository is `joelleibow/taiknr`.

> "Q3, everything stops"

- With `enabled` false, taiknr does no staging, settlement, hydration, recall or classifier calls. Outputs stubbed earlier in the session stay stubbed until it is turned back on.

> "Q1, I respect what Michael is recommending but there's a lot of contingencies that sway me to B, not A. If the user doesn't have openrouter, if it's the default model they entered that has a typo then the feature can't function, etc."

- A present-but-malformed or invalid config file is reported clearly and taiknr does nothing for that session until the file is fixed. It does not fall back to defaults.

> "I don't want to tangent down the "if the user doesn't have openrouter" caveat right now but that's something we need to address once we have a version working locally and it's working as well as we'd like then we can figure out that abstraction."

- The OpenRouter-as-classifier-provider dependency is deferred and is not raised in this change.

## Orientation Q1 and Q2 (2026-11-14)

Answering `michael-orientation.md` §4 Q1 (what happens to large tool outputs when a run is aborted and `agent_before_settle` never fires) and Q2 (whether pre-compaction archived outputs stay recallable):

> "q1 is a. i  like a on q2, as well."

- **Q1 → (a), carry forward.** Every persisted text tool result meeting `minCharsToArchive` is staged whatever the turn's outcome. Items from a run that did not settle carry forward to the next settled run, which commits only those still on the active branch and not recovery-omitted; items off the active branch are dropped.
- **Q2 → (a), keep the whole branch recallable.** Hydration reads the whole active branch, so archived outputs from before a compaction stay recallable. Jev's input grows with the branch until the archive-scaling card adds caps.

## A future idea, not in this change (2026-11-14)

> "a card for the board and potentially of interest is maybe somehow using those calls to help with context saving eg  when the model decides to  repeat tool  calls"

- Recorded as a future card on the taiknr board ("Repeated tool calls served from the archive"). Not in this change's scope.

## Joel's live check, task 12.1 (2026-11-15)

Run in his own pi, on this branch, in `~/Projects`. The first session worked a real task: investigating and reporting the Gemini 4 Carbon empty-read defect.

> "i  just had it report the bug for me so savings should be visible"

- **Stubbing:** at settlement taiknr stubbed 30 tool outputs, 252,635 characters, in one `taiknr-side-store` entry. On the next prompt the request fell from 163,769 tokens to 50,371, a drop of 113,398 (69%), measured from the session's own usage. On Opus 5.5 the one-time cache rewrite cost $0.1022 and each later request saves $0.0227, which breaks even after about 4.5 requests. The model finished the follow-up task working from the stubs.

> "tree  works as expected.  stepped back to a  web search and asked what the results were.  got a  nice detailed response about the full set of 3  queries"

- **`/tree`:** navigating to a stubbed tool result brought the raw output back into the model's context.

> "post compact is beautiful!!!"

- **`/compact`:** the archive survived compaction. The session was too small to compact at pi's default `keepRecentTokens` of 20,000, so `~/Projects/.pi/settings.json` lowered it to 2,000 for the test; the file was removed afterwards.

> "Just wrapped  that test"

- **Off switch:** with `~/Projects/.pi/pi-taiknr.json` set to `{ "enabled": false }`, a new session ran 9 tool results (the largest 40,182 and 26,528 characters) across 3 prompts, and the measurement shows 0 stubbed outputs and 0 side-store entries. The file was removed afterwards.
