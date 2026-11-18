# Orientation: cache-point-before-recall (Michael)

This is a consult. It approves nothing, and every gate still runs.

**Headline.** The working hypothesis holds: recall's block, and pi's cache point sitting on it, cause the loss. The candidate fix fails in three ways:

1. On Joel's own route the fix errors every request it touches (M3).
2. On its own it misses any recalling turn longer than the cache lookback (M4).
3. It cannot change the savings figure, because the figure never registered the loss (M2).

Today the figure understates taiknr's real cost by about 16× (M9). A complete fix brings the real bill down to roughly what the figure already shows. That figure is still negative.

## 0. Measurements (each figure appears once, here)

Scratch is in `.pi/marbleization/cache-point-before-recall/michael/`. Every `mktemp -d` copy has been removed. Probe spend was a few tens of cents on the API key and OpenRouter, plus Haiku usage on Joel's OAuth subscription.

| # | What I measured | Result | Evidence |
|---|---|---|---|
| M1 | Joel's taiknr session (Opus 5.5, his attribution route). Every request opening a turn within 5 min of the previous request, after the 21:17Z compaction. | Eleven turn starts read only the 35,731-token system/tools entry and rewrote 41k–143k tokens each. A twelfth (@1916) read 138,629, which is exactly the entry written by the request opening the prior turn (@1896), a turn that carried no recall. That partial read is the signature of a recall block making the later entries unusable. Before recall merged (2026-11-16T05:51Z), turn-start losses were 2k–18k. | `turns.txt`; session `…01a1dd10….jsonl` |
| M2 | Is the dollar rule sensitive to the read/write split? I ran `netDollars(responseRates(…))` from `src/domain/savings-dollars.ts` on one request priced two ways: the poisoned split (read 35,731 / write 139,169) and the fixed split (read 168,585 / write 6,315). | Both give −0.02285. Rates are per-token prices, and the split only enters as `warm = cacheRead > 0` (`savings-dollars.ts:40-46`). | Node one-liner over the source file |
| M3 | Joel's `~/.pi/agent/extensions/anthropic-attribution.ts` with `probe.ts`, "added" mode, OAuth. | The request errors with `Anthropic protected cache-control topology changed during payload middleware`. Zero tokens were used and no fetch was made. Source: `:3180-3194` (hash before `onPayload`, assert after) and `:1521-1523`. The extension also refuses non-OAuth keys (`:3121-3125`). | `attr-added.log` |
| M4 | API key, Haiku 4.5. A recalling turn of 12 sequential tool calls (36 blocks), with only a point before the block. | The next turn read 0 and wrote 10,659. The block-free entry was out of lookback reach. | `long-added.log` |
| M5 | The same turn plus a second point on the last block of the message that carried the previous request's block, in the next turn's first request. | API key: read 6,923 / write 3,731. Anthropic OAuth through pi's own provider: read 15,550 / write 3,728 (system[0]'s point dropped on every request, the tools point dropped on that one request, 4 points, no 400). OpenRouter `anthropic/claude-haiku-4.5`, which sends an Anthropic-shaped body: read 6,799 / write 3,514. | `long-carry.log`, `long-oauth-carry.log`, `long-or-carry.log` |
| M6 | Entry lifetime. A 7.5-minute recalling turn (6 × `sleep 75`), with the point before the block on every request. | The next turn's second point read 6,899. The entry outlived the 5-minute TTL. | `ttl-carry.log` (second run, from line 3) |
| M7 | Turn length in lookback positions (content blocks, with tool_use and tool_result runs each counted once). | Taiknr session: 23 of 102 turns exceed 18 positions; 4 of 21 after compaction. | Session analysis |
| M8 | upbuild-dev session `…01a1dc59…` after 20:40Z. | One rewrite of 472,420 tokens at 21:04:20Z after a settlement, about $2.27. The cause can't be attributed from the file, because recall persists nothing. | Session analysis |
| M9 | Model vs. real, post-compaction hour of M1, at catalog prices ($5/M write, $0.2/M read). | The model's rewrite charge (suffix from the recalling message) totals about $0.35. The real excess writes total about $5.77. Stub savings at the read price total about $0.31. Jumps of about 33k tokens at turn starts @1890 and @1908 suggest blocks of that size, but block sizes are inferred, not measured. | Session analysis |

**The conductor's OpenRouter probe isn't valid as a taiknr simulation.** `probe-oai.ts` targets every user-role message, tool_result messages included, and calls `recall(users.length)`. So its block moved and changed text on every request (`or-haiku-*.log` reads 10,264 on every request). M5's OpenRouter run replaces it.

## 1. The decisions that bind this change

| Decision | Where it was made |
|---|---|
| Make taiknr stop costing more than it saves, so the figure stops reading negative. Subscription value is out of scope. | `owner-rulings.md` 2026-11-17 |
| Provider coverage is decided by measurement, never assumption. Every route the change affects needs a measured result. | `owner-rulings.md` 2026-11-17 |
| The direct Anthropic API-key route is verified alongside OAuth. | `owner-rulings.md` 2026-11-17 |
| `.envrc` is gitignored in this PR. Already done on the branch (`1b773fe`, `.gitignore:11`); `.envrc` was never tracked (`git log --all -- .envrc` is empty). Keep it. | `owner-rulings.md` 2026-11-17 |
| Unknowns are settled by probing before they are planned on. | `owner-rulings.md` 2026-11-17 |
| Dollars are "net of cache rewrites, taking rates from each response's own reported cost". Criterion: "keep it simple, make it reliable, and don't misinform users". | instruments `owner-rulings.md` 2026-11-15 |
| Dollars are signed and never clamped; since-start totals live in memory and reset at every start. | ADR 0008, Decision |
| Taiknr's only new configuration is the instruments switch. I'd add no setting for this behaviour. | instruments `owner-rulings.md` 2026-11-15 |
| Recall runs on `context_with_system`, nothing registers `context`, disclosure is split by destination, and recall keeps inside its own size bound. | ADR 0007, Decision |
| The block is appended "at the tail of the latest user message for that request only". | ADR 0002 mechanism 3 (event narrowed by 0007) |
| Domain and use cases stay free of pi types, so payload shapes stay in infra. | ADR 0001 |
| One handler per lifecycle event in `src/infra/pi-event-handlers/`, registered through the gate (`session_start` is the only exception). Existing signatures are fixed. A handler builds before it mutates and reads config at event time. | `AGENTS.md` Conventions |
| With `enabled` false, everything stops. | Joel, 2026-11-14 ("Q3, everything stops") |
| Documentation never blocks a feature. | Joel, standing |

**A standing record that is now measured false.** ADR 0007's Consequences says the provider "writes that turn to its cache again, once". README line 40 makes the same claim. M1 shows the rewrite running back to the system entry. The ADR body is never edited, so a new ADR narrows it.

## 2. What the change must not touch or foreclose

- Recall stays on `context_with_system`. Registering `context` would rebuild the head (ADR 0007).
- Recall's disclosure split and size bound stay as they are. The calibrated-bound card stays separate (instruments Q4 (a)).
- The gate stays the only inertness mechanism. A new payload handler registers through the gated `pi`. The twelve gated registrations and the raw `session_start` keep their signatures.
- "Which message carried recall's block in the last request" already lives in the publisher's `baseline` (`instruments-publisher.ts:106-119,184-203`). A payload handler that needs this must share one home for it, not track it a second time.
- Jefferson's declared field table stays total and finite. No new field without the declaration test.
- Routes with no measured result send byte-identical payloads to today. That covers Bedrock, the other anthropic-messages gateways (minimax, opencode, cloudflare, vercel, fireworks, copilot) and Gemini via OpenRouter. On Gemini, pi places no point, and the probe's added point did nothing (`or-hydrogen-*.log`).
- Joel's own sessions must not start erroring (M3). His extension lives outside this repository.
- Other extensions' payload edits stay intact:
  - Clone; never mutate `event.payload` in place.
  - Count the points already present and never exceed 4. A fifth is a 400 [Chidi, A].
  - Never throw. pi's runner swallows a handler's throw (`runner.js:1077-1097`), and that is the fail-open path.
- On pi's own Anthropic provider, system/tools markers are part of the thread hash (Chidi #4). Keep them identical across a session's requests, never toggled per request.

## 3. The traps

1. **The figure can't move with the fix** (M2). Any plan that counts a better number as acceptance fails. This change's acceptance is the real read/write split in a live session.
2. **Joel's route rejects payload surgery** (M3). That route is the one that produced both reported negatives.
3. **Lookback.** A point before the block alone fails for recalling turns over about 18 positions (M4; the docs say 20 positions, counting the breakpoint itself). That covers about a fifth of Joel's turns (M7). A second point, at the message that carried the block, on the first request after the block left it, closes the gap on three routes (M5). That point sits at lookback distance 0, so position counting stops mattering. That also covers Vertex and Bedrock upstreams, where the "a run counts as one position" rule is documented for the Claude API only.
4. **TTL.** The block-free entry survives a long turn only because the point before the block rides every request that carries the block, not just the first (M6).
5. **The block is often not on the last message.** Recall targets the newest role-`user` message, and custom messages don't move it (`tests/infra/adapters/pi-context-adapter.test.ts:66`). Joel's taiknr session has 364 `custom_message` entries against 102 user messages, so the block often sits mid-history while pi's last-message point is elsewhere. The block can also vanish or change on the same message when cached ids fall out of budget or eligibility (`recall-relevant-context.ts:66-72`). The logic has to key on the message that carries the block, never on "the last message".
6. **Point budget per route:**
   - pi's own OAuth provider uses all 4 (`baseline.log`), so there is no free slot.
   - API key and OpenRouter anthropic use 3.
   - The attribution route uses 3 but is guarded.
   - M5's OAuth slot strategy (drop system[0] everywhere, drop tools on one request) is one measured option, not a chosen one.
7. **TTL ordering.** "A 1-hour cache entry must appear before any 5-minute cache entries" ([A] "Mixing different TTLs"; Bedrock the same [B]). Copy pi's own `cache_control` object; never build one. The probes used a bare `{type:"ephemeral"}`, which would violate this under `long` retention. That violation comes from the docs and wasn't measured.
8. **Identifying the block.** The only marker is the `<recalled_context` text (Eleanor). pi sanitizes surrogates in text blocks (`anthropic-messages.js:1320`), so an exact match against the text recall built can miss. A prefix match can hit a user's own pasted text.
9. **The model under-reports in two ways.**
   - Its suffix starts at the recalling message, while the real rewrite starts at the last unpoisoned entry within reach. That's the 16× in M9.
   - Where the system/tools prefix is below the model's minimum, a poisoned request reads 0. `warm` then turns false and the rewrite isn't charged at all (`key-baseline.log` turns 2–3).
10. **Moving pi's point off the block changes the block's real billing**: input on the first request, write on the second. `netDollars` assumes pi's point is on the block (`savings-dollars.ts:55-56`).
11. **The session harness rewrites usage** (`AGENTS.md`). Cache behaviour is only verifiable with live probes and Joel's session.
12. **Bedrock** uses a separate `cachePoint` item with 2 points and is unmeasured. A `cache_control` handler never touches it, so the loss there stays.
13. **Same class: settlement stubs.** A fresh stub is also a change inside the cached prefix, and it has the same lookback limit when the first stub lands early in a long turn. Before recall merged, stub-only losses stayed at 2k–18k (M1), so how often it bites is unmeasured.

## 4. The savings question you asked me to settle

- **Does the fix make the figure honest?** Only if it's complete: the point before the block on every request that carries it, plus the point on the next turn (M4–M6). Then the real rewrite shrinks to about the model's suffix, on the routes it reaches.
  - Two terms still have to change with it. The suffix should start after the recalling message, because its own text stays cached. The block term has to match whichever slot strategy is chosen (trap 10).
  - On routes the fix doesn't reach (Bedrock, unmeasured gateways, Joel's route unless Q1 resolves it), the estimate-only rewrite keeps understating, up to the whole conversation. Under Joel's "don't misinform users", the design has to either reach those routes or price the rewrite from what the response reports. Choosing how is the council's work.
- **Non-negative in steady state?** No. The figure doesn't depend on the split (M2), so it reads after the fix what it reads now. It's negative because of terms the fix doesn't touch:
  - the block, written at 1.25× input;
  - the recalling turn's one honest rewrite;
  - classifier spend;
  - all set against stub savings priced at 0.05× input on Opus 5.5.

  In the M9 hour that comes to roughly −$0.4 either way. The real bill drops by about $5.4.
- **So the dollar rule changes too.** At minimum the suffix start and the block term change. Whether to measure the rewrite from the response is open (§5).

## 5. Questions only Joel can answer

**Q1. Your attribution extension, which lives outside this repo.** It rejects any `before_provider_request` change to cache points (M3; source `anthropic-attribution.ts:1521-1523,3180-3194`). Your sessions run through it.
- (a) You relax its topology guard for message-level points only. System, tools, identity and the 4-point limit stay protected. Its lineage hash already ignores `cache_control` (`promptMessagesWithoutCacheControls`). Taiknr's handler then serves your route the same way it serves pi's own.
- (b) Your extension places the points itself around `<recalled_context>`. The same logic would then live in two codebases.
- (c) Taiknr edits no payload at all and keeps each block on its message for the rest of the branch. Every route benefits, but this revises ADR 0002's "for that request only": blocks of about 33k tokens (M9) stay in context and are re-read on every request, and the model keeps seeing old recalls.
- (d) Taiknr skips your route, and your sessions keep paying the full rewrite.

I'd pick **(a)**: it's the narrowest change that keeps recall's behaviour, and your guard still protects everything it was written for.

**Q2. The objective versus the figure.** Your ruling ties "stop costing more" to "stops reading negative", and the fix can't deliver the second (§4).
- (a) Fix the cost and make the figure honest. It may still read negative when recall really costs more than stubbing saves. The README explains why and names `decisionThreshold` as the lever.
- (b) Also make recall cost-aware in this change, for example by skipping or shrinking a recall whose priced cost exceeds what the session has saved. That changes recall's behaviour and wants its own card.
- (c) Redefine the figure, for example by crediting recall. Nothing measured supports a credit.

Clamping is ruled out by ADR 0008 and your criteria. I'd pick **(a)**: it's the only option that doesn't misinform, and the scope stays this card's.

**Q3. Coverage beyond measured routes.** Your ruling already keeps the change off unmeasured routes. The open question is whether to buy the measurements.
- (a) Act only on routes measured in M5 (plus yours, after Q1). Bedrock and the other gateways keep today's behaviour and today's under-reporting, which is recorded.
- (b) Get AWS and gateway credentials and measure each one in this change.

I'd pick **(a)**: nothing shows those routes are in use, and (b) is cost and credentials outside the repo.

## 6. What is settled and what stays open

**Settled, by evidence:**
- The mechanism (M1).
- A complete fix needs both points, with the first one riding every request that carries the block (M4–M6).
- The figure is split-independent, so the dollar rule changes (M2).
- `.envrc` is done.
- The fix is a no-op on payloads where pi placed no point.

**Open for the council and the design:**
- The slot strategy per route (move vs. add, and which of pi's points yields on pi's own OAuth provider), kept consistent across requests (§2).
- How the block and the message carrying it are identified (trap 8), with one shared home for that fact.
- Whether the next-turn point targets the earliest change taiknr caused, block or fresh stub. I lean yes, because it's the same class (trap 13).
- Whether the rewrite is estimated or measured from the response. I lean towards measuring when taiknr changed the prefix and the response reports a cache split. The hazard to price is a TTL expiry that coincides with a change taiknr made.
- A new ADR narrowing ADR 0007's consequence and recording the payload edit.

**Prototypes.** None needed before the council: M4–M6 settle the shape. One measurement stays for later. If Q1 = (a), Joel's own session on his route, after he changes his extension, is the acceptance. It spends his model usage, so it's his call.

**Not covered:**
- Bedrock and the other gateways (no credentials).
- Thread continuation was never observed in any probe, so the cost of breaking it is unchecked. It's probably zero in tokens.
- Whether recall's classifier requests pass through `before_provider_request` is unchecked. The handler has to be a no-op without taiknr's state either way.
- The exact −$0.0215 and −$0.3449 readings weren't reconstructed, because the reload time is unknown and recall persists nothing.
- My probes inject a synthetic block at `before_provider_request`. Taiknr's real block arrives at `context_with_system`; I argued the payloads are equivalent rather than measuring it.