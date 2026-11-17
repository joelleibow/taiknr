# Owner Rulings — taiknr-instruments

Joel's own words only. Each entry is quoted and dated with what he decided. The framing below was worked out with Joel in an Explore conversation on 2026-11-15; the conductor's options and recommendations from that conversation are not rulings unless Joel's answer below names them.

## Request (2026-11-15, started 2026-11-16)

> "Jefferson is currently amidst a change to allow extensions to create instruments and I'd like taiknr to provide this. It's all about exposing information to the user. Tokens and stubs in the store, when decision requests are in process, and estimated token and context savings. This aligns with understanding the context usage calculations and if there's anything we can do to assess if it's consistent?"

> "I know it's been a bit since we last chatted here. That's beacuse I was making certain that Jefferson was doing what you needed it to do and were concerned about. 0.14.0 just released and includes all the stuff we need, including the means to use any visual they provide. Have a look at that repo to get comfortable with the feature and then let's /skill:conductor-janet this thing."

> "I'm incredibly excited to actually watch the context bar and see the stats as it's being used. I really really really want to watch it happening"

- taiknr provides instruments to pi-jefferson (0.14.0 or later) through Jefferson's published provider contract. The data exposed: tokens and stubs in the store, when a classifier decision request is in progress, and estimated token and context savings.
- Joel wants to watch it work live: the change ends with his own observation of the instruments in his pi.

## The context-usage jump (2026-11-15)

> "Right now, anytone watching context usage would be confused by seeing a 40% jump after they send a message. how do we reconcile that?"

> "A however, we don't touch Jefferson at all. Jefferson allows using the bar in many instruments, we just need to make certain a user can customize the taiknr instrument to include the bar. Our docs here in taiknr need to be explicit about the behavior it causes with pi's context measurements and calculations and that the provided instrument can be used to resolve it."

- **taiknr publishes its own context figure** (option "a" of three: a taiknr-published figure, as opposed to fixing pi upstream or both).
- **taiknr touches nothing in Jefferson.**
- **A user can configure taiknr's context instrument to include the bar.**
- **taiknr's docs say explicitly** what stubbing does to pi's context measurement and calculation, and that taiknr's instrument resolves it.

## Configuration and Jefferson's role (2026-11-15)

> "for 2, thats odinary jefferson config, not taiknr config. taiknr's only config is whether to enable the jefferson instrument or not."

> "I'll take care of adressing that bar concern in jefferson. don't be concerned about jefferson. jefferson will be able to handle it. we can move past this."

- Placement, format, label, style and the bar are ordinary Jefferson configuration.
- **taiknr's only new configuration is a switch** that enables or disables its Jefferson instruments.

## The figures (2026-11-15)

> "my mind's picture:
> - we know the size of the message history before any mutation, we report this
> - we know the size of each omitted stub, we report this as witheld
> - we know the size of each stub included, we report this as stubbed (is this the same as above?)
> - we know the size of the resolved context for just this turn, we report that as context in turn
> - we know the size of the new message history, we report this as total context usage"

> "published figure" (asked whether recall's appended text is its own figure or folded into context in turn)

- The figures: **history before** (before any mutation), **withheld** (the raw size of stubbed outputs), **stubbed** (the size of the stubs standing in their place), **context in turn** (what this turn's request resolves to), **total context** (the persisted history after mutation), and **recalled** (recall's appended text), the last published as its own figure.

## Units (2026-11-15)

> "i honestly hold no strong opinion other keep it simple, make it reliable, and don't misinform users"

> "i prefer a consistent type so a makes sense. it should be a number, always"

- **Criteria for the token conversion:** keep it simple, make it reliable, don't misinform users. (No tokenizer or conversion method was ruled; the conductor's recommendation under these criteria was a per-session ratio calibrated from the provider's real usage, a proposal for the design.)
- **Every figure is always a number.** Before any real usage exists, the figures use pi's characters-÷-4 estimate (option "a"), and the estimate flag rides beside the value, never inside it.

## Savings (2026-11-15)

> "a" (asked whether to publish per-request savings now, the session's cumulative savings, or both)

> "b. doesnt each response include the dollars and/or rate?" (asked whether to publish savings in tokens only, or dollars too net of cache rewrites)

- **Both savings figures:** per-request now, and the session's cumulative total.
- **Dollars too, net of cache rewrites,** taking rates from each response's own reported cost.

## The switch's default (2026-11-15)

> "a"

- **On by default.**

## The decision-in-flight indicator (2026-11-15)

> "a"

- **Publish whether a classifier decision is running, and how many archived items it is asking about.** No elapsed-time updates.

## The instruments (2026-11-15)

> "a"

- **Four instruments, grouped by what the user is watching:** `taiknr.context`, `taiknr.archive`, `taiknr.savings`, `taiknr.recall`.

## Standing rulings carried from earlier changes

Recorded in the archived changes under `openspec/changes/archive/`; quoted here because they bind this change too.

> "Whatever the community is doing for typical biome config is what we're going with. Our decisions need to reflect the communities preferences so we're well aligned for adoption." (2026-11-14)

> "The pi extension is pi-taiknr. The  repo is just taiknr" (2026-11-14)

> "Q3, everything stops" (2026-11-14)

- With `enabled` false, taiknr does no staging, settlement, hydration, recall or classifier calls; by the same ruling it publishes nothing.

> "Q1, I respect what Michael is recommending but there's a lot of contingencies that sway me to B, not A. If the user doesn't have openrouter, if it's the default model they entered that has a typo then the feature can't function, etc." (2026-11-14)

- A malformed or invalid config file is reported and taiknr does nothing for that session; no fallback to defaults.

> "6. a" (2026-11-15, classifier-scoring-and-tail-recall Q6)

- Recall's classifier spend has no readout in pi; it reports no cost through pi, so it stays outside the dollar figures.

## Orientation Q1–Q5 (2026-11-16)

Answering `michael-orientation.md` §4:

> "1. a
> 2. a
> 3. a
> 4. a
> 5. a"

- **Q1 → (a).** The cumulative savings total counts from the current pi start and is labelled "since start". It resets on `/new`, `/resume`, `/fork` and `/reload`.
- **Q2 → (a).** Net dollars subtract recall's classifier spend, which taiknr receives on each `classify` result's usage. This puts recall's spend into a published figure. (A correction to the record above: the classifier call does report its cost to taiknr; it is pi's totals that leave it out.)
- **Q3 → (a).** With taiknr off or its config rejected, taiknr registers nothing. A Jefferson config that names `taiknr.*` gets Jefferson's "not a known instrument" warning for that row at each start.
- **Q4 → (a).** Recall's size bound keeps using pi's estimate in this change. Correcting it with the calibrated figure is a separate card.
- **Q5 → (a).** Joel adds the `taiknr.*` rows to his own `~/.pi/agent/pi-jefferson.json` himself, from an example in taiknr's README. The change does not edit that file.

## Design review escalation — total context at the response (2026-11-16)

Answering Michael's Stage 2 escalation (`michael-resolve-s2.json`, comprehension C8). At `message_end`, pi has not yet appended the response to the session, so a figure read from the persisted projection omits it. Asked whether total context at the response includes the response (a) or only what pi has persisted (b):

> "a, it's in the window then so it seems right"

- **→ (a).** At the response, total context includes the response that just landed, because it is in the context window then. taiknr adds the response's own size to what pi has persisted.

## Design review escalation — Stage 3 round 1, OD1–OD3 (2026-11-16)

Answering Michael's three escalations (`michael-resolve-s3-r1.json`), each correcting his own Stage 2 remedy:

> "1, a
> 2, a"

> "a" (OD3)

- **OD1 → (a).** The dollar figure charges only the rewrite taiknr causes: the span from taiknr's first change to the end of the previous request's cached prefix. Recall's new block is priced at the write rate.
- **OD2 → (a).** The instruments' calculation for a recall block runs after recall's path, not inside it, so a fault in it can never drop recall's block or spend recall's once-per-session notice.
- **OD3 → (a).** All four corrections to the Stage 2 text are applied: the response uses its own model pair's ratio; `/tree` keeps ratios measured live; the zero-size guard; and the rounding claim gets a citation.

## Design review escalation — Stage 3 round 2, OD4–OD6, and a standing rule (2026-11-16)

Answering Michael's three escalations (`michael-resolve-s3-r2.json`), each correcting his own previous-round text and each with a measured pick:

> "if they're measured and they're Michael's stance then they're settled... all A"

- **OD4 → (a).** The rewrite baseline moves only when a response prices its request.
- **OD5 → (a).** The publisher's `rehydrated` splits into one method per event (`compacted`, `treeJumped`), and the `/tree` rule for a pair with no seed on the new branch is stated.
- **OD6 → (a).** The three minor corrections are applied.
- **Standing rule for the rest of this change:** a churn escalation whose remedy Michael has measured, and which he states as his pick, is settled by that pick. It does not come to Joel. An escalation that turns on product behaviour, a user-facing contract, scope or cost still does.

## Closing Stage 5 (2026-11-16)

Stage 5 reached its five-round cap with one clean round, round 4. Round 5's one major finding (two coverage claims backed by no test) was resolved by Michael and patched. Asked whether to run a sixth round (a) or accept and go to Implement (b):

> "b"

- **→ (b).** Stage 5 closes, and the tasks gate is approved.
