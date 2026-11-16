# Judge Gen — PR review — PR #4, `classifier-scoring-and-tail-recall`

Head commit reviewed: `2cfbbd8e9808e53537d02d6f6a994847f59a428a` (checked at the start and the end of the review; it did not move).
Evidence read: the PR description and diff, `proposal.md`, the three spec deltas, the living specs, the code the diff touches, and the pi host code it calls (`model-runtime.js`, `classifier-shared.js`, `settings-manager.js`).
`npm run check` run on that head: lint clean, typecheck clean, 22 test files and 327 tests pass.
Load assumed: one developer running one pi session, with an archive that grows with the branch and has no cap (the change says archive caps are not in scope).

What this change does:
On each new user message, taiknr now asks one classifier call which archived tool outputs matter. It appends the raw text of the picked ones as one extra text block at the end of that message, for that request only. It registers on `context_with_system` so the cached prompt prefix survives. It caps the block by the model's compaction threshold, fails open with one warning on a bad classifier, and adds a `classifierTimeoutMs` setting.

I traced the whole path and found no wrong result. The things I checked and found correct:
- A timeout comes back from pi as an `error` stop reason and a user cancel as `aborted` (`classifier-shared.js:L43-65`, `model-runtime.js:L568-581`). `classify` never throws. So "cancel is silent, timeout warns once" is true.
- `maxRetries: 0` is passed. Pi's default of two retries would otherwise run inside the bound.
- The recall block is copied onto the message and not mutated in. Images stay in order.
- Eligibility (`readEligibleArchivedIds`) runs on every request, cache hits included. It compares only the first block of the edit, which matches how settlement writes image items.
- The marker escaping in `formatRecalledContext` cannot be closed from inside raw text.
- The inertness lives in the gate only, as the repository rules say.

## Should fix

1. **The cache cost of dropping the old recall is only described for steers** (`src/infra/adapters/pi-context-adapter.ts:L36-46`, `README.md` "Recall", `docs/adr/0007…`, `ARCHITECTURE.md:L3`)
   - **What this is:** Recall is attached to the newest user message only. This is how the whole change is built, and the spec asks for it ("move recall to the newest user message").
   - **Problem:** It is not only a steer that moves recall. Every ordinary next prompt does too. Take a turn where prompt P1 recalled something. Its requests carry `P1 + block`, and the provider caches that prefix. When the user sends P2, the old `P1` goes out without the block. The prefix now differs at P1, so everything after P1 (the whole previous turn: assistant text, tool calls, tool results) is written to the cache again. This is the same kind of cost the change was started to avoid (the $0.25 flip in ADR 0007). The proposal states the cost only for steers ("each steer in a run that recalled something costs one cache rewrite"). The README says recall is for "that turn's requests only" and never mentions the rewrite. ADR 0007 says the prefix "stays reusable" and `ARCHITECTURE.md` still opens with "keeping the session prompt prefix byte-identical". None of the three says that the next prompt after any recalling prompt pays this.
   - **Fix:** Say it in the README "Recall" section and in ADR 0007's "More difficult" list: after a prompt that recalled something, the next prompt re-caches that turn. One or two sentences, no code. If Joel did not know this when he ruled Q1, he should see it before merge.
   - **If we skip it:** A user who turns recall on sees higher cache-write cost on the prompt after each recall and has nothing in the docs that explains it. This is the thing the footer already cannot show.

2. **The description promises an archive step the branch does not contain** (PR description "Change record"; `openspec/specs/`)
   - **What this is:** The description says the change "is archived into `openspec/specs/` on this branch before merge".
   - **Problem:** At this head the PR does not touch `openspec/specs/`. There is no `tail-recall` spec there. `extension-packaging` still lists `context` as the seventh event, and the `configuration` spec has no `classifierTimeoutMs`. The change directory is still in `openspec/changes/`. If the PR merges as it stands, the living specs say the opposite of the code.
   - **Fix:** Run the archive step before merging, or change the description so it does not say it is done.
   - **If we skip it:** `main` carries a spec that says `context` while the code registers `context_with_system`, and the next change is checked against the wrong spec.

## Nice to have

3. **The prefix-fit loop is quadratic** (`src/use-cases/recall-relevant-context.ts:L39-46`)
   - **What this is:** `fittingPrefix` decides how many picked items fit the budget.
   - **Problem:** For each item it formats the whole block again from scratch (`formatRecalledContext([...kept, output])`), escaping every field each time. I timed it on this machine against the real formatter with an 800,000-character budget. 500 items of 1,600 characters took 68 ms, 2,000 items of 400 characters took 636 ms and 5,000 items of 160 characters took 2.8 s. This runs synchronously inside the request handler. It needs thousands of picked items, which is `decisionThreshold: 0` on a very large archive, and the classifier call would likely time out first on an archive that large. So it is not a bug today, but the archive has no cap.
   - **Fix:** Keep a running length: format the empty block once, then add each item's own piece (`"\n\n[recalled output …]\n" + text` plus separators) and stop when the total passes the budget. The existing "one character short" test will catch an off-by-one.
   - **If we skip it:** Fine at today's archive sizes. It becomes a visible stall once the archive-scaling card lets archives grow.

4. **The abort signal travels two ways and one is dead** (`src/infra/adapters/pi-jev-scorer-adapter.ts:L28-32,L50`, `src/use-cases/ports.ts:L16-20`, `src/use-cases/recall-relevant-context.ts:L11,L83`, `src/infra/pi-event-handlers/context.ts:L68`)
   - **What this is:** The handler puts `ctx.signal` into the use-case input, the use case hands it to `scorer.score`, and the port declares a third `signal` parameter.
   - **Problem:** The adapter names that parameter `_signal` and never reads it. It uses `ctx.signal` straight from the context it was built with. Both values are the same object, so nothing is wrong. But there are two paths and one does nothing, and a test (`"…with its stubs and the caller's signal"`) pins the dead one.
   - **Fix:** Either use the parameter in the adapter (`signal: _signal`, rename it) and drop `ctx.signal` there, or remove the parameter, the input field and the handler line. The first is the smaller change and keeps the port contract the spec lists as unchanged.
   - **If we skip it:** A reader has to work out which of the two signals matters. If they ever differ, the wrong one wins silently.

Verdict: fix 1 and 2 first (both are words and a merge step, no code); 3 and 4 can follow.
Lean: -4 lines possible (finding 4 only; finding 3 is a speed change, not a size one).
Not checked: the live script (`test-recall-live.mjs`) and its OpenRouter run, which the brief forbade me to run; real provider cache behaviour (finding 1 is from how the request is built, not measured); and how pi's `estimateTokens` compares with a real tokenizer on this budget, which the change itself records as an accepted risk.
