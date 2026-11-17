# Michael: orientation for taiknr-instruments

This is a consult. It approves nothing, and every gate still runs.

- **Base:** taiknr `main` at `abaa6b0`, clean apart from this change's directory. Jefferson tag `v0.14.0`, read only. pi 1.5.2.
- **Nothing changed:** no file in either repository was edited, and no model call was made.
- **Where I measured:** every measurement ran in a `mktemp -d` copy or a scratch directory, and all of them have been removed.

## 0. What this pass measured

The later sections cite these as M1 to M6. M1 to M4 replay Joel's taiknr session `…01a1dd10` using only the usage pi persisted.

| # | Question | Result |
|---|---|---|
| M1 | At each settlement followed by a request: how far below the next request's real prompt is pi's figure right after the settlement? And how close does a calibrated prediction come (the previous request's real-to-estimate ratio times the next request's estimate)? | **33 settlements.**<br>• pi's figure sits **38.0–41.2 % below** real (median 39.4 %) at every one.<br>• The calibrated prediction misses by a median of 0.06 % and at most 0.48 %. |
| M2 | Same 33: how much of the next request was read from cache? Compared: `cacheRead` against the estimate of the unchanged prefix before the first edited message. | **29 warm.** `cacheRead` is within about 1 % of that prefix. Only the suffix from the first edited message onward is re-written: 891–14,836 tokens.<br>**4 cold.** `cacheRead` is 0–35,238 against a prefix of 558k–674k. These follow idle gaps of 4.6, 5.4, 34.1 and 69.1 min. Each re-wrote the whole history, about $2.6–3.3 each at the session's write rate (about $5 per million, derived from its own responses). |
| M3 | Same 33: is a single settlement's saving larger than the normal error in predicting one request from the last? Compared: each settlement's saving after the ratio, against the miss in predicting the whole change from one request to the next. | **Not reliably.**<br>• Saving: median about 1,200 tokens.<br>• Request-to-request miss: median about 340 tokens. That is 21 % of the saving at the median and 130 % at p90. |
| M4 | A rough dollar model, to test whether the figure can be computed at all (it is not a design). Rules:<br>• a saved token costs the read rate on a warm request and the write rate on a cold one;<br>• the first warm request after a settlement is charged the re-written suffix at the write rate, less that suffix's raw text at the read rate;<br>• each rate is the response's own component cost ÷ its tokens;<br>• recall is left out, because it isn't persisted. | **441 requests, $69.50 in session cost.**<br>• Gross saving $2.80, re-write penalty $0.25, net **+$2.55**.<br>• 20 requests were net-negative.<br>• The running total was −$0.007 at mid-session before it climbed. |
| M5 | Does a type-only import of Jefferson's contract survive taiknr's whole gate and pi's loader? Setup:<br>• a taiknr copy with `npm install --save-dev pi-jefferson-0.14.0.tgz`;<br>• a probe module doing `import type { Registration, Report } from "pi-jefferson/instruments"`, with a `bar`, imported from the entry. | **Yes.**<br>• `npm run check` is green: Biome, tsc 7.0.2, and vitest at 23 files / 330 tests (the baseline is 22 / 328).<br>• `pi --no-session --help` in a throwaway agent directory prints nothing on stderr.<br>• Negative control: a bogus subpath import prints `Failed to load extension … Package subpath './does-not-exist' is not defined by "exports"`.<br>• The lockfile gains two packages: `pi-jefferson` and `lodash-es`. |
| M6 | Does the gate stop a value import (no `type`) of the contract? | **No.** `lint/style/useImportType` only warns, and `npm run lint` (`biome check .`) exits 0. |

## 1. The decisions that bind this change

### Joel's rulings (`owner-rulings.md`, 2026-11-15)

| ID | Decision | Where |
|---|---|---|
| J1 | taiknr provides instruments through Jefferson 0.14.0+'s published provider contract. The data: tokens and stubs in the store, whether a classifier decision is in progress, and estimated token and context savings. | Request |
| J2 | The change ends with Joel watching the instruments in his own pi. | Request |
| J3 | taiknr publishes its own context figure; pi is not fixed upstream. | Context-usage jump, "a" |
| J4 | taiknr touches nothing in Jefferson. | Same |
| J5 | A user can configure taiknr's context instrument to include the bar. | Same |
| J6 | taiknr's docs say explicitly what stubbing does to pi's context measurement and calculation, and that taiknr's instrument resolves it. | Same |
| J7 | Placement, format, label, style and the bar are ordinary Jefferson configuration. | Configuration |
| J8 | There is exactly one new taiknr setting: a switch for its Jefferson instruments, on by default. | Configuration; switch default "a" |
| J9 | Six figures: history before, withheld, stubbed, context in turn, total context, and recalled as a figure of its own. | The figures |
| J10 | The token conversion is judged on three criteria: simple, reliable, and not misinforming users. The method itself was left open. | Units |
| J11 | Every figure is always a number. Before any real usage exists, figures use pi's chars ÷ 4, and an estimate flag sits beside each value, never inside it. | Units, "a" |
| J12 | Savings are published per request and as a session total, in tokens and in dollars. The dollars are net of cache rewrites. | Savings, "a", "b" |
| J13 | Publish whether a classifier decision is running and how many items it asks about. No elapsed-time updates. | Indicator, "a" |
| J14 | Four instruments: `taiknr.context`, `taiknr.archive`, `taiknr.savings`, `taiknr.recall`. | Instruments, "a" |
| J15 | Standing rulings from earlier changes:<br>• "Q3, everything stops": `enabled: false` turns everything off.<br>• A broken config means taiknr does nothing for that session.<br>• Biome follows the community's choices.<br>• The package is `pi-taiknr`; the repository is `taiknr`.<br>• Q6(a): the classifier cost is accepted, with "no spend readout until the Status card". | Archived changes |

### Lines in the rulings file that are not Joel's words

I checked where each came from.

- **"by the same ruling it publishes nothing"** (under Q3). This is the conductor extending Q3 to publishing, which did not exist when Q3 was ruled. §4 Q3 covers the case it leaves open.
- **"taking rates from each response's own reported cost."** This is the conductor's reading of Joel's question "doesnt each response include the dollars and/or rate?".
  - What a response actually carries (Chidi B6; `pi-ai/dist/models.js:680–700`): dollars per component, which pi computes from the model's catalog rates, and no rates.
  - A rate can only be derived as component cost ÷ component tokens, and only when those tokens are above zero.
  - §5 S4 honors the reading that way.
- **"it reports no cost through pi, so it stays outside the dollar figures"** (under Q6). This is false at the source.
  - `ClassifierResult.usage` is "Token usage and its cost at the model's catalog price, when the service reports token counts" (`pi-ai/dist/types.d.ts:513–523`).
  - What is true is that pi does not add that cost to the session total (`openspec/changes/archive/2026-11-15-classifier-scoring-and-tail-recall/research-chidi.md:72`).
  - Q6 itself only accepted the cost and deferred a readout. See §4 Q2.
- **"a per-session ratio calibrated from the provider's real usage."** This is recorded as the conductor's proposal. §5 S1 settles it on the evidence.

### Approved specs and records

| Decision | Where | What it means here |
|---|---|---|
| Exactly seven events are registered. Registrar signatures and port contracts are frozen except for four listed differences. | `extension-packaging/spec.md` "Seven events registered", "Signatures unchanged" | A design that publishes from an existing handler, or adds an event, revises these scenarios and must name each new difference. |
| Load checks run in a throwaway agent dir, and `~/.pi/agent/settings.json` is never modified. | extension-packaging | Still holds. |
| The host package is a peer dependency only; imports use ESM `.js` specifiers. | extension-packaging | `pi-jefferson` is a devDependency only (M5). |
| Fields layer and validate, and unknown keys are rejected. `enabled` stops everything, and "a valid `enabled: false` SHALL produce no output". `setEnabled` is the seam the deferred `/taiknr` command will use. | `configuration/spec.md` | The switch is a new field with a rule, a default and a README row, read in one place. |
| Recall runs on `context_with_system`, is bounded "by pi's own estimate", and writes nothing. Its decisions stay in memory for the deferred readout. | `tail-recall/spec.md`; ADR 0007 | Publishing reads recall's outcome and must not change it. |
| Hydration reads the whole branch, and the store is an optimistic cache over it. | `branch-hydration`, `archive-stubbing`; ARCHITECTURE §4 | Figures taken from the store are as optimistic as the store. |
| Domain and use cases import no pi package. | ADR 0001; "Boundary holds" | Arithmetic goes in domain and use cases. pi calls and Jefferson types stay in infra. |
| A record's shape is never versioned; a new shape gets a new custom type. | ADR 0004 | Applies to any persisted total (§4 Q1, option b). |
| npm, a committed lockfile, and `npm run check` as the gate. | ADR 0003; development-checks | The devDependency lands together with its lockfile change. |
| One handler per lifecycle event; every read before the first mutation; the gate is the only place inertness lives. | AGENTS.md | Still holds. |

## 2. What the change must not touch or foreclose

- **Jefferson's repository and its built-in `context` instrument (J4).** Jefferson also gives taiknr no way to read pi's session data: "No extension reads another extension's fields, or pi's session data" (`docs/extension-authors.md`, Fields). Every value a taiknr instrument shows has to be a field taiknr posts, including the context window.
- **Recall's behavior.** That covers its returned messages, its budget, its cache key and its eligibility rule, and the `context_with_system` registration (tail-recall spec; ADR 0007). T17 is the defect in recall's budget this change will expose; fixing it waits on §4 Q4.
- **Stubbing and settlement.** That covers the order of the drafts, ADR 0005's yields, and the side store's bare-array shape (ADR 0004). Sizes can be derived from `rawText` and `stub`, so items need no new fields.
- **The gate stays the only place that checks `enabled`.** The instruments switch is a second condition. It gets one home of its own, not a check in every handler.
- **The Status card's seam.** That is `SessionConfig.setEnabled` and recall's in-memory decisions. Jefferson has no way to clear a value; only `session_shutdown` clears (Chidi A1). So a later mid-session off would freeze the last values posted. Nothing in this change may rely on values never going stale.
- **Later CLI and MCP entry points (ARCHITECTURE §9).** The figure arithmetic stays free of host code so they can reuse it.
- **Joel's files.** `~/.pi/agent/settings.json` and `~/.pi/agent/pi-jefferson.json` stay untouched (§4 Q5).
- **The publishing card.** `pi-jefferson` goes in `devDependencies` only, never in `dependencies` or `peerDependencies`.

## 3. The traps

### What pi does with taiknr's edits

- **T1. The 40 % jump comes from pi's fallback, not from recall.**
  - After a settlement, a `context_edit` is newer than the last usage. `getContextUsage()` then sums chars ÷ 4 over the whole projection (`compaction.js:137–169`; `agent-session.js:3607–3635`).
  - On Anthropic, chars ÷ 4 is about 0.6 of real (Chidi C). M1 found the drop at all 33 settlements, and that drop is Joel's jump.
  - On deepseek the same ratio is 0.90–0.99, so the size of the jump depends on the model.
  - On a recall turn, recall's block lands on top of this.
- **T2. pi's run-start compaction check under-counts the same way.**
  - `_checkCompaction` switches to `estimateProjectedContextTokens` whenever the projection holds any `context_edit` (`agent-session.js:2576–2579`).
  - `_prepareRun` calls it before each run (`:1549`).
  - So after a settled run, pi's pre-run threshold check runs about 40 % low until the next response arrives. The checks after each response use real usage again.
  - This is the "calculation" J6 says the docs must explain.
- **T3. After a compaction, pi's figure is `null` until the next response** (`agent-session.js:3617–3628`).
  - J11 still requires a number.
  - The calibrated estimate erred 1 % across a compaction (Chidi C, the 2061 % row).
- **T4. Chidi's caveat that `ctx-check` misses "taiknr's stubbing at request time" is wrong.**
  - Stubbing is a persisted `context_edit`, which `buildSessionProjection` applies. M2 found the first difference exactly at the edited tool result.
  - Only recall's block is missing from the persisted projection.

### Calibration

- **T5. Take the usage sample the way pi does, from the right messages.**
  - Use pi's validity rule: not aborted, not an error, and positive usage (`compaction.js:72–83`).
  - Use assistant messages only. Joel's session also holds `type: "usage"`, `kind: "cache_warm"` entries (two in `…01a1dd10`), and taiknr built none of those requests.
  - Leave output out. pi's `calculateContextTokens` adds output (`compaction.js:65–67`), but the request's prompt is `input + cacheRead + cacheWrite`.
  - That sum is the whole prompt on both code paths read: Anthropic (Chidi B6), and OpenAI-completions, which sets `input = prompt_tokens − cacheRead − cacheWrite` (`openai-completions.js:1157–1190`). Other APIs are unread.
- **T6. The ratio belongs to one model.**
  - Anthropic sits at 0.58–0.70 and deepseek at 0.90–0.99, so a model switch voids it.
  - Pair each sample by the response's own provider and model.
  - A virtual model routes each request separately (`agent-session.js:365–367`). I did not trace that further.
- **T7. Compute the ratio over the same estimate it will be applied to.**
  - pi's fallback counts the current system message once (`compaction.js:162–168`).
  - `Σ estimateTokens(event.messages)` counts every system message.
  - Pick one estimator and use it on both sides.
- **T8. The ratio is only proven on whole requests.**
  - It is checked at whole-request scale (M1; Chidi C).
  - At the scale of one settlement's saving, the data cannot confirm it (M3).
  - So withheld, stubbed, recalled and the savings stay estimates. The flag can honestly mean "not yet calibrated", never "exact".

### Jefferson's contract

- **T9. Every field needs a value from the start.**
  - A field that was never posted blanks any instrument whose format names a variable that reads it, and no posted value can clear a field (Chidi A1).
  - So J11 means posting every field right after registering.
  - A "deciding" flag must be reset on every way out of the classifier call: answer, error, timeout and cancel.
- **T10. Neither tsc nor taiknr's own suite can confirm Jefferson accepts an update. Only Joel's live look can.**
  - `Report.value` is a `FieldValue` that is not tied to the declared field (`instrument-contract.ts:79–83`). So `tsc` does not catch an undeclared field, a wrong type or a non-finite number.
  - Jefferson refuses each of those at runtime. Its warning only appears in TUI mode (`faults.open` at `resources_discover`, `startup.ts:52–65`).
  - No taiknr test can see Jefferson's verdict without importing Jefferson internals, and the package exports only `./instruments`.
  - Joel's live look (J2) is the only check that Jefferson accepts the registration and every update.
  - So taiknr's field names, types and finiteness must be correct by construction and covered by taiknr's own tests.
- **T11. Register in `session_start`, after the config loads and before any `await`.**
  - The switch lives in the config, so the config has to load first. `session-start.ts` has no `await` today.
  - Jefferson judges unknown instrument names at `resources_discover`. pi emits that after every `session_start`, according to Jefferson's own comment (`startup.ts`), which notes that no pi document promises this order.
- **T12. A publishing error can cost recall or stubbing.**
  - `pi.events.emit` throws once the extension's context is stale (`loader.js:426–430`).
  - Inside `context_with_system`, the runner catches the throw and drops the handler's result, so recall is lost for that request (`runner.js:1043–1068`).
  - In a boundary handler, a throw before the return loses taiknr's drafts.
  - Publishing must not be able to cost recall or stubbing.
- **T13. Only the `type` keyword keeps the contract out of runtime.**
  - A value import loads fine from Joel's checkout, because the devDependency is in `node_modules` (M5).
  - Biome only warns about it (M6).

### Figures and the archive

- **T14. Count withheld and stubbed from the request, not the store.**
  - Hydration covers the whole branch, including items from before a compaction. Counting the store would credit taiknr with savings that compaction made.
  - To find the stubs in a request, match each tool result's first text block exactly against the store's stubs. That needs no id parsing (ADR 0006).
  - The archive instrument is where the store's totals belong.
- **T15. The store runs ahead of the branch at `agent_before_settle`.**
  - pi's `agent_settled` is "final and notification-only; use it for status integrations" (`docs/extensions.md:665`).
  - It fires after the boundary has committed.
- **T16. chars ÷ 4 is about to get a second home.**
  - `context.ts` already inverts it: `budgetCharacters = 4 * (...)`.
  - The figures need the same rule for bare strings: raw text, stubs and the recall block. It should live in one place.
- **T17. Recall's size bound is about 39 % low on Anthropic.**
  - It uses raw chars ÷ 4 (`context.ts`; tail-recall spec), and T1 shows that runs about 39 % low.
  - So a block that fills its budget can push a request to about 1.6 × pi's threshold in real tokens, past the window. In practice the archive's size limits this.
  - The instruments will make it visible (§4 Q4).

### Dollars

- **T18. Cache expiry is not taiknr's cost.**
  - The four cold requests in M2 would have re-written the whole history with or without taiknr. Charging them as rewrites caused by taiknr misinforms by about $3 each.
  - Whether a request was warm or cold shows in each response (`cacheRead` against the unchanged prefix).
  - On a cold request, a saved token would have been written, not read.
- **T19. The dollar figures can go negative, and must be shown that way.** In M4, 20 requests were net-negative and the running total went negative early. Clamping at zero misinforms.
- **T20. Deriving rates has edge cases.**
  - A component's rate is undefined when its token count is zero.
  - Rates are tiered by total input size (`models.js:680–700`). The larger counterfactual request could have fallen in a higher tier.
  - `cost.cacheWrite` mixes short writes and 1-hour writes.
- **T21. The two per-request savings figures become known at different moments.** Tokens are known when the request is built; dollars only arrive with the response. Published separately, they describe different requests for as long as a response takes.

### Tests

- **T22. The session harness cannot test calibration or dollars.**
  - Its faux provider replaces each response's usage with its own chars ÷ 4 and zero cost (`pi-ai/dist/providers/faux.js:134–168`, applied at `:356` and `:367`).
  - So the ratio comes out at about 1 and every dollar is 0. That fake is too forgiving to catch a bug in either.
  - Those paths need handler-level tests fed with scripted `usage` and `cost`.
  - The session level can only check the wiring. A listener extension in `extensionFactories`, the setup `archive-session.test.ts` already uses, can capture what goes over the bus.
- **T23. The decision indicator will only flash.** It lasts one classifier call. The README puts the 5000 ms timeout at about 14 × the slowest of ten measured calls, so a few hundred milliseconds at most.

## 4. The questions only Joel can answer

**Q1. What does "the session's cumulative" savings span?**

- **Source:** taiknr's docs use "session start" for a new process, `/new`, `/resume`, `/fork` and `/reload` (README, "When the files are read"). The session file itself outlives all of those.
- **Options:**
  - **(a)** Keep the total in memory. It resets at every session start, like recall's decisions and the run buffers do, and its label says "since start".
  - **(b)** Persist a running total in a new custom entry at each settled run, and rebuild it at start, `/tree` and compaction. It survives `/reload` and `/resume`. The cost is a new permanent record type in Joel's session files (ADR 0004), and a run that never settles loses what it accrued.
  - **(c)** Rebuild it at start from persisted usage and the side-store records. Recall's share cannot be rebuilt (recall writes nothing), so the total would change across a `/reload`. It would also replay one projection per past request inside `session_start`.
- **Pick: (a).** It is simplest and reliable, and the label makes it honest. This is the one figure where "always a number" forces a false number until Joel picks its lifetime.

**Q2. Should the net dollars subtract recall's classifier spend?**

- **Source:** each classifier result reports its tokens and catalog cost (`types.d.ts:513–523`). pi leaves it out of its own totals. The rulings line saying it "reports no cost" is the conductor's, not Joel's (see §1).
- **Options:**
  - **(a)** Subtract each call's reported cost, so the figure is net of what recall spent to produce the saving.
  - **(b)** Leave it out. The figure then overstates by about $0.0002 a call at around 30 items, and about $0.002 at 300.
- **Pick: (a).** "Net" and "don't misinform" both point that way, and the cost is already in hand with no extra call. The tradeoff: it makes the spend visible inside the net, which Q6 had deferred to the Status card. If the service reports no usage, the docs say the classifier cost counts as zero.

**Q3. What happens to Jefferson rows that name `taiknr.*` while taiknr is off?**

- **Source:** Jefferson warns at each start about names no registration claims (`startup.ts:52–60`). The configuration spec says a valid off "SHALL produce no output".
- **Options:**
  - **(a)** Don't register while `enabled` is false or the switch is off. Jefferson shows "not a known instrument" for that row at each start, including in a project whose file turns taiknr off.
  - **(b)** Register anyway and post nothing. The row renders blank with no warning, but taiknr acts while "everything stops".
- **Pick: (a).** It is the literal reading of both rulings, and the warning is Jefferson's and accurate.

**Q4. Should recall's size bound be fixed in this change?**

- **Source:** recall's bound uses pi's raw estimate (T17), and the instruments will show it running low. The bound is set by the tail-recall spec and ADR 0007.
- **Options:**
  - **(a)** Leave recall as approved and give the fix its own card.
  - **(b)** Move recall's budget onto the calibrated conversion here, which revises the tail-recall spec and ADR 0007 inside this change.
- **Pick: (a).** It keeps this change's scope to publishing.

**Q5. Who places the instruments for the live look?**

- **Source:** `~/.pi/agent/pi-jefferson.json` is not managed by chezmoi (`chezmoi source-path` reports "not managed"). It currently holds built-in instruments only (Chidi A5).
- **Options:**
  - **(a)** Joel adds the rows himself, from an example the README carries.
  - **(b)** The last task of the change edits his file.
- **Pick: (a).** Placement is Jefferson configuration (J7), and the file sits outside the repository.

## 5. What is settled and what stays open

### Settled by the evidence or a decision in play

**S1. The token conversion is a calibrated per-session ratio.** It meets J10's three criteria where the alternatives fail:

- pi's chars ÷ 4 alone misinforms; it is the jump (T1).
- An exact count is neither simple nor reliable.
  - Neither taiknr nor its host has a tokenizer installed.
  - The host's transitive `@anthropic-ai/sdk` 0.129.0 offers only `messages.countTokens`, which is one network call per figure and works for one provider only.
- The ratio is accurate where it matters:
  - median 0.04 % over whole sessions, worst 5 % on long ones and 8.8 % on short ones (Chidi C);
  - median 0.06 % and at most 0.48 % at exactly the settlements where pi fails (M1).

The rule the design inherits:

- **Ratio:** k = the prompt tokens of the newest valid response from the same model (T5) ÷ the estimate of the request that produced it (T7).
- **Figures:** each token figure is k × its estimate.
- **No sample:** k = 1 and the flag is on. The flag means "not yet calibrated" (T8).
- **Resumed sessions:** these already hold real usage, so seed k at session start from the last valid persisted response for the current model.

**S2. The bar shows total context ÷ window × 100.**

- **Why total context:** Joel's name for that figure is "total context usage", the reading whose jump he wants resolved.
- **Window:** taken from `getContextUsage().contextWindow`, the same source recall uses.
- **No window:** the bar returns `null` (`agent-session.js:3607–3612`).

**S3. Savings per request = history before − context in turn.**

- That equals withheld − stubbed − recalled. Both terms are Joel's own figures.
- The result is signed (T19).

**S4. Dollars net of cache rewrites can be computed from what taiknr can see** (M2, M4).

- **What it uses:** where taiknr's edits and its last recall block sit in the request, plus the response's token counts and their costs.
- **When it is computed:** at the response.
- **How it is published:** together with that request's token savings (T21).

**S5. Registration rules.**

- Register per T11, and only for a ready, enabled session with the switch on.
- Post every field immediately afterward (T9).

**S6. Where the figures come from.** Per-request withheld and stubbed come from the request itself (T14). The archive figures come from the store.

**S7. How the contract is imported.** `pi-jefferson` as a devDependency, with `import type` (M5, T13).

**S8. Every figure Joel named can be computed as he described it.**

| Figure | What it is | Taken from | Known at | Nature |
|---|---|---|---|---|
| history before | The request as if taiknr had neither stubbed nor recalled. | The request, plus the store's raw text for each matched stub | Request | Estimate |
| withheld | The raw text of taiknr's stubs in this request. | The store's `rawText` | Request | Estimate |
| stubbed | The stub lines standing in for that text. | The request | Request | Estimate |
| context in turn | The request as sent. | First the estimate of `event.messages` plus recall's block; then `input + cacheRead + cacheWrite` | Request, then response | Estimate, then measured |
| total context | The persisted history after taiknr's edits. | `ctx.sessionManager.buildSessionProjection()` (`session-manager.d.ts:178`) | Any event | Estimate, re-anchored at each response |
| recalled | Recall's appended block. | `formatRecalledContext` output | Request | Estimate |

Two clarifications:

- "Any mutation" means taiknr's own. Other extensions' `context` handlers have already run by then (`runner.js:1014–1042`).
- "Context in turn" is per request: a user turn spans several requests.

### Open for the council and the design

- **O1. Event points.**
  - Usage could be read at `message_end`, as soon as the response is done (best for J2). Or at `turn_end`, already registered, which waits for the turn's tools.
  - Post-commit figures could go at `agent_settled` (T15) or at `agent_before_settle`.
  - Every choice revises an extension-packaging scenario (§1).
- **O2. The seam for the decision indicator.** Wrapping the `RelevanceScorer` port in infra leaves `recallRelevantContext` and the port contract untouched. A progress port on the use case changes both.
- **O3. Layering.** Arithmetic goes in domain and use cases. pi estimation and Jefferson's bus go in infra adapters, and Jefferson types stay in infra.
- **O4. Fields.** The field set and names, which field each default format reads, the flag's name (T8), and how it renders (`variableForms` or `composed`, Chidi A2).
- **O5. The switch.** Its name, the one place it is read, and its README row.
- **O6. The exact dollar rule.** The rate each saved token takes, the rewrite charges after a settlement and after a recall turn, the cold-cache rule, zero-token components, and tiers (T18–T21).
- **O7. Context in turn before a session's first request.** It has no request yet, and 0 would misinform.
- **O8. J6's docs.** They cover T1, T2 and T3, recall's block appearing in usage but not in history, and how `taiknr.context` resolves the jump. Under Joel's standing ruling this is documentation and minor, but J6 requires it.
- **O9. The test plan,** given T22.

### Prototypes

None are needed before the council: M1 to M6 already answer the build-time questions this orientation raised. What remains unmeasured is listed below and rests on later gates.

## What this pass did not cover

- **Untested in a TUI:**
  - whether Jefferson repaints while taiknr's `context_with_system` handler is waiting on the classifier;
  - whether Jefferson accepts the registration and each update (T10).
- **Joel's live look:** the two items above are left to his live look (J2).
- **Untraced:**
  - how other provider APIs normalize usage;
  - how a virtual model pairs requests with responses;
  - what it costs to build a projection on every event.
- **Unverifiable from usage alone:** any bias in the conversion for tool-output text (T8).
- **Not a design:** M4 is a rough model. Recall's dollar effect is not in it.

I skipped re-deriving most of Chidi's Jefferson citations (I spot-checked the load-bearing ones) and did not time the per-event projection builds. The risk Joel should know: every dollar figure is a counterfactual estimate that will sometimes go negative.