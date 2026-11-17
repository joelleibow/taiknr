# 0008. Publish Figures Through the Host's Instrument Contract

## Status

Accepted

## Context

Anyone watching context usage in pi sees a figure drop after a settled run and jump back when the next reply lands, over a change that made the prompt smaller. The cause is pi's own measurement. Once a `context_edit` is newer than the last reply, pi stops trusting the provider's usage and estimates the whole projection at characters ÷ 4 until the next response, and the same fallback drives its pre-run compaction check.

Measured by replaying the persisted usage of Joel's taiknr session `…01a1dd10` (Anthropic `claude-opus-5-5`, 33 settlements each followed by a request), pi's figure sat 38.0–41.2% below the next request's real prompt at every one, median 39.4%. The same estimator came to 0.90–0.99 of the real prompt on the one OpenRouter/deepseek session measured, so how large the gap is belongs to the provider. pi also reports `null` right after a compaction, and on a recalling turn its figure counts a block that was never persisted.

Three answers were on the table: fix pi upstream, have taiknr publish its own reading, or both. On 2026-11-15 Joel took taiknr's own reading and ruled Jefferson's code untouched, so Jefferson's configuration and its built-in instruments stay as they are and taiknr's only new setting is a switch. The criterion he set for the figures was "keep it simple, make it reliable, and don't misinform users". He also wants to watch them work in his own session, and that look is the acceptance.

taiknr already held what a reading needs: each archived item's raw text and its stub, the store, the branch, and the block recall appends. Nothing recorded a size and nothing published anything. Jefferson 0.14.0 supplies the surface — an extension registers instruments, posts one report per field, and Jefferson renders them — and it supplies it without a reply channel, without a signal about whether anyone listens, and with values cleared only at session shutdown.

The alternative surface was taiknr's own: `ctx.ui.setStatus`, which the deferred status card had been planned around, or a command that printed the figures on demand. Neither is a row a user watches while working. Both are taiknr's to render, style and keep consistent across terminals, and both reimplement a footer Jefferson already draws for every other extension.

Two smaller choices came with it. Where the numbers come from: pi's measurement is the thing being answered, so taiknr computes its own from its own estimator. How they reach taiknr's handlers: a second condition inside the existing gate, a switch test in each handler, or one publisher held in one place.

## Decision

**The reading is published on the host's instrument contract, and taiknr renders nothing.** Four instruments, one per view a user watches: `taiknr.context`, `taiknr.archive`, `taiknr.savings`, `taiknr.recall`. Where they sit and how they look are Jefferson configuration in the user's own file, and taiknr writes no host file. Its one switch is whether to publish at all, on by default, and `enabled` still stops everything.

**`pi-jefferson` is a dev dependency pinned to an exact version, and every import of it is a type import.** The package ships sources that only the compiler reads, so it gives `tsc` the contract and nothing at runtime; the Jefferson that runs is the user's, loaded as a package. A caret range would let a minor bump move a member under a green check, so the version is exact and the live session is re-run on any bump.

**One publisher per session, held behind a holder that starts as a no-op, and one switch read once.** Publishing runs in six registrations of its own, one per event, each placed immediately after the registrar whose outcome it reads, so no publish sits inside recall's handler or inside a settlement boundary. The gate is unchanged, and with the switch off the no-op evaluates nothing, so publishing off costs no host read at all.

**Every token figure is one character estimate times one ratio per provider and model.** A tokenizer was not chosen: it would add a dependency per provider and still be an approximation, while the provider's own reported prompt is the only ground truth a session has. The ratio is seeded from the branch at session start, replaced by each valid reply for its own pair, and one shared flag marks whether the pair a figure was posted under has a live sample in this run. The flag never means exact. The savings and the dollars are signed and never clamped; the dollars are net of the cache rewrite taiknr caused and of recall's classifier spend, and the since-start totals are held in memory and reset at every start.

## Consequences

**Easier:**

- A user gets a context figure that moves by what was added and stubbed, never by 40% at once, never `null`, and with a bar that reads the model's window.
- What recall did, and what it cost, has an answer before the status card exists: the block is its own figure and the classifier spend sits inside the net dollars.
- The four views are placed and styled by the user, in the same file and the same syntax as Jefferson's own instruments, and taiknr ships no UI.
- Nothing is persisted for any of it, so a session start begins at zero, no record shape is added, and ADR 0004's rule against versioned records still holds.

**More difficult:**

- A second contract with no feedback of its own. taiknr cannot learn whether Jefferson accepted a registration or a report, so a field name, a type or a non-finite number is caught by taiknr's own tests or by Joel's live session, and nowhere else.
- A pinned types-only dependency to keep in step with whatever Jefferson the user runs. Nothing at build time notices when the two drift apart.
- A ratio belongs to a provider and model, so a model switch publishes uncalibrated figures until a reply from the new model arrives, and a resumed session stays uncalibrated while its only sample is a seed reconstructed from a projection that lacks that turn's recall block.
- The figures cost a projection per publishing event, on six events per session, with no way to know whether anyone is listening; that cost is accepted rather than guarded.
- Publishing switched off mid-session cannot clear what is already on screen, because Jefferson clears a field only at shutdown, so a frozen row goes stale.
- None of it changes pi's figure or pi's pre-run check. The reading is taiknr's, and a user who reads pi's number instead still sees the drop.
- The dollars are counterfactual: they price avoided text at the response's own catalog rates, so a tier step and a partial cache read bias them, in directions that are known and sizes that are not.
