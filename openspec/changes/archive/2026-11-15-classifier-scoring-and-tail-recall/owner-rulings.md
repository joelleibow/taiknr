# Owner Rulings — classifier-scoring-and-tail-recall

Joel's own words only. Each entry is quoted and dated with what he decided.

## Request (2026-11-15)

> "For now let's just knockout the next card on the board /skill:conductor-janet we'll assess that concern afterwards."

What he decided: run the next taiknr board card, **Classifier scoring and tail recall** (`🤖 Knowledge/projects/taiknr-notes/classifier-scoring-and-tail-recall.md`), through Conductor Janet. The card's text was drafted by a Janet, so each decision in it (cache key, classifier question shape, injection format, fail-open behaviour, notification, test shape) is a proposal until he confirms it. "That concern" is pi's context-usage figure undercounting after a `context_edit` (it falls back to a chars/4 estimate); it is assessed after this change and is not in its scope.

## Standing rulings carried from earlier changes

Recorded in the archived changes under `openspec/changes/archive/`; quoted here because they bind this change too.

> "Whatever the community is doing for typical biome config is what we're going with. Our decisions need to reflect the communities preferences so we're well aligned for adoption." (2026-11-14)

- Decisions reflect the community's preferences, so the package is aligned for adoption.

> "The pi extension is pi-taiknr. The  repo is just taiknr" (2026-11-14)

- The package / extension name is `pi-taiknr`; the repository is `joelleibow/taiknr`.

> "Q3, everything stops" (2026-11-14)

- With `enabled` false, taiknr does no staging, settlement, hydration, recall or classifier calls.

> "Q1, I respect what Michael is recommending but there's a lot of contingencies that sway me to B, not A. If the user doesn't have openrouter, if it's the default model they entered that has a typo then the feature can't function, etc." (2026-11-14)

- A present-but-malformed or invalid config file is reported clearly and taiknr does nothing for that session until it is fixed; no fallback to defaults.

> "I don't want to tangent down the "if the user doesn't have openrouter" caveat right now but that's something we need to address once we have a version working locally and it's working as well as we'd like then we can figure out that abstraction." (2026-11-14)

- The classifier keeps its configured provider (`openrouter` by default). Abstracting the provider for users without OpenRouter is deferred and is not raised in this change.

> "q1 is a. i  like a on q2, as well." (2026-11-14, archive-stubbing-and-branch-hydration)

- Q2 (a): the archive covers the whole active branch, so outputs from before a compaction stay recallable.

> "a card for the board and potentially of interest is maybe somehow using those calls to help with context saving eg  when the model decides to  repeat tool  calls" (2026-11-14)

- Serving repeated tool calls from the archive is a separate future card, not this change.

## Orientation Q1–Q6 (2026-11-15)

Answering `michael-orientation.md` §4:

> "1. a
> 2. b and c. a sensible default that can be overridden
> 3. b
> 4. a
> 5. a plus I'll manually test but that's not what checks the box, the script checks the box...
> 6. a"

- **Q1 → (a).** A message steered in mid-run moves recall to the newest user message, and the recall attached to the earlier message drops. Each steer in a run that recalled something costs one cache rewrite.
- **Q2 → (b) and (c).** The classifier call has a fixed timeout with no retries, and that timeout is a config field: "a sensible default that can be overridden". The default is set from a measured Jev round trip, and taking that measurement spends model calls.
- **Q3 → (b).** When the relevant outputs would overflow the main model's context, the highest-scoring items are recalled first and recall stops before pi's compaction threshold.
- **Q4 → (a).** The once-per-session failure notice goes through `ctx.ui.notify`. It shows in the TUI and stays silent in print and JSON modes, and stubbing keeps working either way.
- **Q5 → (a).** A live end-to-end verification script, like the proof of concept's, is what checks the box. It spends model calls. Joel will also test by hand, but his manual test does not tick the task; the script does.
- **Q6 → (a).** The cost is accepted: one classifier call per new user message, about $0.0002 per call at today's archive size, with no spend readout until the Status card.

## Orientation Q4 sub-question — a mistyped classifier model (2026-11-15)

Asked whether a classifier model name in the config that does not resolve should fail open with the same notice (a) or turn taiknr off at session start like a broken config file (b):

> "a"

- **→ (a), fail open.** A classifier model that does not resolve stops recall only. Stubbing keeps working, and the same once-per-session `ctx.ui.notify` notice reports it.

## Design review escalation — recall and pi's next compaction check (2026-11-15)

Answering Michael's Stage 3 round 1 escalation (`michael-resolve-s3-r1.json`, critic CRIT-1). Recall keeps the request it builds under pi's compaction threshold. But pi's next check counts the provider usage of the request it last sent, recalled text included. So a recall that fills most of its budget can trigger a compaction at the next step of a tool loop, or after the run.

> "A"

- **→ (a), accept and document.** The size bound stays as designed. The spec, the proposal, the new ADR and the README state that recall keeps its own request under pi's compaction threshold, and that a recall filling most of the room can make pi's next check compact the session. The design gets a Risks row and a spec scenario for this case. `reserveTokens` is the operator's lever. No new mechanism. This narrows Joel's Q3(b): in this edge case recall can cause the compaction he would otherwise rather miss a recall than trigger.

## Closing Stage 3 of design review (2026-11-15)

Stage 3 reached its round-8 cap with one clean round (round 8). Rounds 2 to 7 each corrected wording in the description of the compaction case Joel accepted. Round 7 also widened that case on the 40,960-token model: one large tool step lets recall cause a compaction there, after which the block drops for the rest of the turn without a notice. Asked whether to run round 9 (a) or accept round 8's clean result and go to Stage 4 (b):

> "b"

- **→ (b).** Stage 3 closes on round 8's clean result, and Stage 4 runs. His ruling "A" on the compaction case stands, with the corrected exposure described in `design.md` decision 2.
