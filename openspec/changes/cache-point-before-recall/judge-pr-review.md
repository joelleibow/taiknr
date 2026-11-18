# PR #7 review — "Keep a turn's cache alive when recall's block drops"

Head commit reviewed: `c59a1008a14f439c15b3fd63599e05e4a096e620` (checked again at the end; it had not moved).
Evidence read: the PR description and diff, `proposal.md`, the three spec deltas, the living specs, the code the diff touches and its callers. No other change-directory file was opened.
`npm run check` in a `mktemp -d` copy of the head (`git archive`, `npm ci`): lint clean, typecheck clean, 40 test files / 641 tests passed, exit 0. The copy is removed. No model call was made.
Load assumed: one developer running one pi session at a time (README). Payloads are a few hundred KB at most.

## What this change does

When recall adds its block to the newest user message, pi puts its cache marker on that block. The next turn no longer has the block, so the provider rewrites the whole history. This PR adds a `before_provider_request` handler that moves cache markers: one on the block before recall's block, and one "carry" marker on the previous turn's message on the first request after it. It works only on the measured Anthropic routes. It also changes how the net-dollar figure prices recall's block and the rewrite, and it adds ADR 0009, README text and a live test script.

## Findings

I found no bug, no data-loss path and no security problem. I traced these paths: the four-point budget, pi's marker yielding, the carve-out on the first system block, the carrier record and its commit at `message_end`, the fail-open `catch`, and the publisher's use of `applied`. Each matches the spec, and the tests exercise them.

### Should fix

1. **One spec scenario is not proven on OpenRouter** (`openspec/changes/cache-point-before-recall/specs/tail-recall/spec.md`, "A turn longer than the lookback")
   - **What this is:** The spec says a twelve-tool-call recalling turn still lets the next turn read an entry. This is the case that justifies the carry marker.
   - **Problem:** The PR description says that on OpenRouter turn 2 made only 2 of the 12 required requests. So the carry's long-turn benefit is shown only on the API key. OAuth and the attribution route are also unobserved. The code cannot show this either way. The unit tests prove marker placement, not provider billing.
   - **Fix:** Re-run `test-cache-point-live.mjs openrouter` until turn 2 makes all 12 requests, and record the result. Do not claim the route as proven before then. The PR text already marks this as open, so the merge decision is the owner's.
   - **If we skip it:** The OpenRouter route ships on shape evidence only. It is a covered route in the predicate, so the claim in the README and ADR 0009 would be wider than what was measured.

### Nice to have

2. **A large image block becomes a very large "fingerprint"** (`src/infra/adapters/anthropic-cache-payload.ts:L63-77`, `fingerprintOf` / `canonicalJson`, used at `L226` and `L196`)
   - **What this is:** The carrier record remembers the block before recall's block by its text. For a non-text block it uses the block's whole JSON.
   - **Problem:** In pi, a user message with a pasted image is text first, then the image, then recall's block. So the "before" block is the image. Its fingerprint is the full base64 string, often megabytes. It is kept in state, rebuilt on every request, and compared on the handoff request. The cost is a few milliseconds and some memory per request, not a failure.
   - **Fix:** For a non-text block use a short digest (`node:crypto` `createHash("sha1")` over the JSON), or the type plus the data length.
   - **If we skip it:** Sessions with big pasted images spend a little extra time and hold a large string for the whole turn.

3. **The whole payload is copied on every covered request, even when nothing can change** (`anthropic-cache-payload.ts:L204-211`)
   - **What this is:** `editPayload` calls `structuredClone(payload)` and walks it three times before it knows there is anything to do.
   - **Problem:** On a request with no recall block, no carrier record and no two-marked-system shape, the result is "send the payload unchanged". The copy is wasted. It is a few milliseconds against an LLM call, so this is small.
   - **Fix:** Return early when `recallBlock === null && carrier === null` and `system` does not hold two marked blocks, before cloning.
   - **If we skip it:** A small repeated cost per request. Nothing breaks.

4. **The README's "runs low" list leaves out partial-prefix reads** (`README.md`, new paragraph "The rewrite charge also runs low…")
   - **What this is:** The `context-figures` delta requires the instruments section to record the places the charge runs low, partial-prefix reads among them.
   - **Problem:** The new paragraph lists routes, failed edits, taiknr-caused zero reads and the budget-1 case. Partial-prefix reads appear only in the paragraph above, and only as "bias them … in directions that are known".
   - **Fix:** Add "and on a request that read only part of its prefix" to the new list.
   - **If we skip it:** The spec scenario "The under-reporting is recorded where the figure is read" is met only loosely.

## Checked and fine

- The route predicate reads the exact host with `new URL(...).hostname`, so `api.anthropic.com.corp-proxy.internal` and path-embedded hosts do not match. The tests cover these.
- The budget arithmetic leaves no room for a fifth marker. With zero wanted points it removes nothing from pi's markers.
- The handler never throws. The `catch` resets `applied` and `nextCarrier`, so a failed request cannot leak the previous request's placement into the figure.
- The carrier record commits only at a valid assistant response. A retried or errored request recomputes from the same committed record.
- The `PricedRequest` change is backward compatible: `applied === null` gives `blockUncached: false`, which is the old rule.
- The `AGENTS.md` counts (fifteen registrations, fourteen gated) match `taiknr.ts`.
- The live script reads keys only from the environment and does not print them.

Verdict: Ship, once the owner accepts finding 1 as an open item or closes it. Findings 2–4 are optional.
Lean: no deletions to offer; findings 2 and 3 are small swaps or additions.
Not checked: real provider billing on any route, and the OAuth and attribution routes (live runs, not repeatable here with no model call); the claim that removing the first OAuth system marker loses no prefix (a provider fact the code cannot show); pi's runtime behaviour for `before_provider_request` on non-agent requests such as compaction (read from the code's own comments, not from pi's source).
