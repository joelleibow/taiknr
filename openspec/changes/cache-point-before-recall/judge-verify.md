# Verification Report: cache-point-before-recall

Reviewed head: `c59a1008a14f439c15b3fd63599e05e4a096e620` (PR #7, branch `cache-point-before-recall`, state OPEN). Schema `marbleization`; `openspec instructions apply` reports 17 tasks, 13 complete, 4 remaining, tracking readable, no unavailable files.

Using change: cache-point-before-recall. Read: `proposal.md`, the three delta specs, `design.md`, `tasks.md`, the diff against base `d5f8435`, and the live logs under `.pi/marbleization/cache-point-before-recall/derek/`.

## Gate, run independently

`git archive HEAD` into `mktemp -d`, `node_modules` copied in, `npm run check`:

- lint: `Checked 87 files … No fixes applied.`
- typecheck: clean
- test: `Test Files 40 passed (40)`, `Tests 641 passed (641)`
- exit 0

This matches task 8.1's record (40 files, 641 tests). The temp directory was removed. A second `mktemp -d` copy under `git init` then `npm install --prefer-offline` left `git status --porcelain` empty, which is the development-checks "install does not dirty the tree" scenario, and it was removed too. No model call was made. No file in the repository was edited.

## Summary

| Dimension | Status |
|---|---|
| Completeness | 13/17 tasks. The 4 open are 9.1 and 10.1–10.3, each open for a recorded reason (judged below). 10 requirements across 3 delta specs, all with implementation or doc evidence. |
| Correctness | 10/10 requirements covered (tail-recall 6, context-figures 1 ADDED + 2 MODIFIED, development-checks 1 MODIFIED). Every scenario with a code consequence has a passing test; 1 doc scenario is partly met (W1); 4 scenarios are live-only and rest on open tasks. |
| Coherence | Design followed (D1–D10, §5.1–5.4); 3 suggestions. |

## Completeness

### Tasks

13 of 17 ticked (1.1, 1.2, 2.1, 2.2, 3.1, 4.1, 5.1, 5.2, 6.1, 7.1, 8.1, 8.2, 9.2). Open: 9.1, 10.1, 10.2, 10.3.

**9.1 (OpenRouter and API-key green runs). Correctly unticked. Evidence read from the three logs.**

- `anthropic-key`: exit 0, 6 preconditions and all 11 assertions pass, turn 2 made 13 requests. `read_H` 11,882 against 6,853 + 1,314; `write_H` 1,158 against 1,126 + 7 + 39 + 256; `input_H` 6,135 against 1,297. I matched every number in `live-run-anthropic-key-1.log` against `tasks.md`'s record. This route is accepted by the task's own rule.
- `openrouter`: `live-run-openrouter-1/2/3.log`. Each prints all 11 assertions as `pass` (`read_H` 11,771 / 11,772 / 11,771 against 6,768–6,770 + 1,314; `write_H` 114 / 102 / 111 against 87 / 75 / 84 + 2 + 39 + 256; `input_H` 6,133 / 6,132 / 6,133 against 1,297). Each also prints `FAIL turn 2 made at least 12 requests: 2 requests` and no other precondition fails. Three exits on that one precondition in a row is the rule's "Validate finding, not a pass". The box cannot be ticked without breaking the task's own acceptance rule, and ticking it would claim something no run showed.
- What the three runs prove and what they do not. They prove the payload shape and the billing effect on OpenRouter from this checkout for a two-request turn: before point and pi's marker on turn 2's first request, carry on turn 2's last user message at the handoff, the block billed as input, and the prefix read rather than rewritten. They do not exercise the spec scenario "A turn longer than the lookback" on OpenRouter from this checkout, which is the only thing the 12-request precondition exists to protect. That scenario is live-evidenced on `anthropic-key` (13 requests, this checkout) and was green on OpenRouter in the spike (L2, 12 requests, from a copy of the project, not this checkout).
- A fact the task text does not state. All four OpenRouter runs this session made 2 requests in turn 2: the three green runs and the base run (`live-run-base-openrouter-1.log`). `design.md` §8.2 and Residual 1 describe the precondition as model-dependent, "5 of 9 runs". Four of four at 2 requests, on a route that did 12 in the spike, looks more like a stable behaviour of that route with this prompt than like luck. A fourth identical run will probably repeat it. Residual 1's own answer, "a more reliable prompt is unexplored", is the lever. A prompt change alters a script the offline checks (L1) were run against, so it is the owner's call, not a tick.
- **Judgement:** leave 9.1 unticked. It is an open Validate finding, not a defect in the code. Closing it needs one of: an OpenRouter run that passes every precondition; or an owner ruling that records the finding and accepts the lookback scenario on the strength of the `anthropic-key` 13-request run plus L2. Neither is mine or the implementer's to make.

**Group 10 (10.1, 10.2, 10.3). Correctly unticked. No evidence of Joel's observation exists in the change directory, the PR or the tasks.** The PR body says so too ("OAuth and attribution are Joel's to observe"). The task text says the implementer never ticks these, so nothing here is missing work. What rests on them alone:

- 10.1 `anthropic-oauth`: the only live evidence for the D3 carve-out on pi's own OAuth shape. Synthetic coverage exists and passes (`anthropic-cache-payload.test.ts` "pi's OAuth shape with no block and no handoff differs from its input only by system[0]'s marker", "a handoff that also recalls places both points and yields pi's marker", "with a top-level marker has no room, so neither point is placed", "a payload pi marked nowhere loses only system[0]'s marker"). The scenario "The marker is gone on every request" has no live proof until Joel runs it.
- 10.2 `attribution`: spec scenario "Joel's route is served as pi's own provider is" (no guard error on any request) is only observable on his route. The route is covered by D1 by construction; the guard acceptance is his.
- 10.3: the 7.5-minute billing half of "A turn longer than the entry's remaining lifetime". The shape half is tested; the billing half has no automated or script proof, as `tasks.md` says.

**Task 9.2, ticked.** Verified against `live-run-base-anthropic-key-1.log` and `live-run-base-openrouter-1.log`: seven `FAIL` lines on each (R1 before-point, and H's carry, before-point, nothing-after, `read_H`, `write_H`, `input_H`), with `read_H` 6,853 / 6,768 against + 1,314 and `write_H` 11,283 / 11,242. The numbers in `tasks.md` match the logs. See S3 on how the red runs were shaped.

**Task 8.1, 8.2.** 8.1's gate figures reproduced independently (above). `.gitignore:12` is `.envrc` and `git check-ignore -v .envrc` prints `.gitignore:12:.envrc`; `package-lock.json` is tracked (`git ls-files --error-unmatch` succeeds); `.gitignore` has no `.pi` entry. 8.2's walk: I spot-checked the named pins and labels in the adapter, handler, commit, publisher and savings-dollars tests and they exist and pass in the gate.

### Spec coverage (ADDED/MODIFIED requirements)

| Spec / requirement | Evidence |
|---|---|
| tail-recall: A recall block does not cost the turn its cached prefix | `src/infra/adapters/anthropic-cache-payload.ts` `editPayload` (before point on `content.at(-2)`, carry via `fingerprintedBlock`), `before-provider-request.ts`, `context.ts:52,92-94` (cell (a)); adapter tests; live `anthropic-key` and 3 OpenRouter logs |
| tail-recall: Only routes the predicate covers change | `coversRoute` (exact-host `new URL().hostname`, `openrouter` + `anthropic/` prefix, api `anthropic-messages`); undefined model and non-object / no-`messages` payload return `undefined` before the clone |
| tail-recall: The payload edit keeps other extensions' changes and the provider's limits | `markersUnder` walk (skips `input_schema` and `input`), exactly-one-message-marker rule, `BUDGET - (normalized.length - 1)`, `structuredClone` of pi's marker (ttl kept), fail-open `catch` in the handler |
| tail-recall: The one carve-out on a four-point payload | `unmarkFirstSystemBlock` runs first and is counted out of the budget; session-start pin test covers "cannot be switched mid-session"; no live proof (10.1) |
| tail-recall: The payload edit is inert while taiknr is off | Both new handlers registered on `gatedPi` in `taiknr.ts`; nothing in them tests `enabled`; `taiknr.test.ts` pins 15 registrations over 10 events |
| tail-recall: The record of what a recall block costs follows the measurement | README lines 40–44 rewritten; `docs/adr/0009` added; ADR 0007's body diff is empty |
| context-figures: A figure that reads negative says why | README instruments section; one gap, W1 |
| context-figures MODIFIED: Dollar savings are net of cache rewrites and of recall's classifier spend | `instruments-publisher.ts` `rewriteOf`: `carried.index + 1` when `applied?.carrierRead === carried.text`, else today's start |
| context-figures MODIFIED: A saving is priced at the rates the request's own response reported | `savings-dollars.ts` `blockRate = blockUncached ? inputRate : (warm && !blockInNewTail ? readRate : writeRate)`; `blockInNewTail` has D8's `carried === undefined` and `baseline.blockUncached` clauses; baseline stores `blockUncached` from the same reading |
| development-checks MODIFIED: A fresh install leaves the working tree clean | Reproduced (clean tree after install), lockfile tracked, `.envrc` at `.gitignore:12`, no `.pi` entry |

No requirement is missing. No requirement is implemented beyond the spec.

## Correctness

### Implementation against the spec text

I read `editPayload` against §5.3 line by line and found it matches: carve-out first and the budget counted on the normalized clone; zero or two-plus message markers leave the record alone and return `applied: null`; a coincident carry (pi's marker already on the target) is filtered out of the wanted points; pi's marker is removed only when `wanted + 1 > budget`; the next record is set only when the finished clone marks the before target; the carrier is the highest-index user message whose last block equals cell (a) after the lone-surrogate rule.

The handler order is right: `editPayload` runs inside `try`, `nextCarrier` and `applied` are written after it returns, and the `catch` sets `applied = null` and `nextCarrier = carrier`. The commit handler writes `carrier` only on `role: "assistant"` with `validUsage`, so an errored or aborted attempt cannot commit. The registrar adds `applied` to the deferred reading, so no publisher method and no Jefferson field was added.

### Scenario coverage

Every scenario with a code consequence has a named test in `tests/infra/adapters/anthropic-cache-payload.test.ts` (40 tests; the handoff, `[image]` fingerprint, duplicate-match, two-marker, no-fit, stale-carrier, replay, string-content, lone-surrogate and never-mutates cases are all present), `before-provider-request.test.ts` (B-series), `payload-cache-commit.test.ts` (C-series), `instruments-publisher.test.ts` and `savings-dollars.test.ts` (E-series, including "the split alone changes no figure"). All pass in the gate.

Scenarios not provable by the suite:

- "A turn longer than the lookback", live: proven on `anthropic-key`, not on OpenRouter from this checkout (9.1).
- "The marker is gone on every request" live, and "Joel's route is served as pi's own provider is": Joel's (10.1, 10.2).
- "A turn longer than the entry's remaining lifetime", billing half: Joel's (10.3).
- "The cost is about nothing" (the removed marker costs no prefix): a provider property, supported by N6 in the research, not testable here.

## Coherence

### Design adherence

D1–D10 and §5.1–5.4 are followed. Spot checks: D1 host equality is exact (`hostOf`); D2's four-point budget and copy-with-ttl; D3 on every covered request; D4's two facts with cell (a) cleared at the top of the `context_with_system` handler before any early return (`context.ts:52`); D5 comparison is local to the adapter; D6 fail-open; D7 and D8 as in the table; D9 the warm gate untouched (`rates.warm ? … : 0` unchanged); D10 no carry on stubs. The file boundary in `tasks.md` matches the diff: no file outside it changed except `ARCHITECTURE.md`, `AGENTS.md`, `README.md`, ADR 0009, which the design assigns to the docs pass. The two enumerated signature exceptions in `AGENTS.md` are written down (`session_start` and the `message_end` instruments registrar). `AGENTS.md` and `ARCHITECTURE.md` counts (fourteen gated, fifteen over ten events) match `taiknr.ts` and `taiknr.test.ts`.

### Code pattern consistency

New files follow the layer layout (`infra/adapters`, `infra/pi-event-handlers`, `use-cases`), `.js` specifiers, `vitest` imports, tests mirrored under `tests/`. The live script sits at the root outside the lint allowlist as `AGENTS.md` prescribes, and it differs from Derek's `test-cache-point-live.mjs.txt` by exactly the one widened precondition task 7.1 names (`diff` shows only lines 175–177).

## Issues by priority

### CRITICAL (blocks archive; none is a code defect)

1. **Incomplete task 9.1.** OpenRouter has no run that passes every precondition (3 of 3 exited 3 on "turn 2 made at least 12 requests", 2 requests each, all 11 assertions passing each time). Recommendation: keep the box unticked. The owner decides between (a) one more run with a prompt that reliably produces ≥12 requests on OpenRouter, noting that 4 of 4 runs this session made 2 and base did too, so a plain repeat is unlikely to differ, and (b) a recorded ruling that accepts the OpenRouter lookback scenario on the 13-request `anthropic-key` run plus the spike's L2.
2. **Incomplete tasks 10.1, 10.2, 10.3.** Joel's observations, none recorded. Recommendation: leave unticked until the conductor ticks each with his words. Nothing in the code needs to change for them.

### WARNING

W1. **README does not name partial-prefix reads as a place the rewrite charge runs low.** The `context-figures` scenario "The under-reporting is recorded where the figure is read" lists, in this order, routes the edit does not reach, fail-open requests, requests taiknr itself makes read zero, in-turn requests with budget 1, and partial-prefix reads. The new README paragraph (`README.md` "The rewrite charge also runs low…") covers the first four. Partial reads appear only in the preceding, older paragraph, as a bias on the dollars in general, not as under-reporting of the rewrite charge. Recommendation: add "and a request that read only part of its prefix from cache" to that sentence in `README.md`.

### SUGGESTION

S1. `carrierRead()` (`anthropic-cache-payload.ts`) uses `.some` over every block in the carrier message that matches the fingerprint and carries a marker, while the carry rule and `fingerprintedBlock` look at the last block only. With a message holding two blocks that share a fingerprint, `carrierRead` could claim a read the carry did not make. No test or measured payload reaches this, so it is a tightening, not a fault: compare the last block only, as `fingerprintedBlock` does.

S2. **The 9.1 evidence is not reproducible from the PR.** The six logs sit in `.pi/marbleization/…`, which is excluded from git (`.git/info/exclude`), and `tasks.md` inlines the numbers only for `anthropic-key`. For OpenRouter it says only "2 requests". Inline the OpenRouter `read_H` / `write_H` / `input_H` for each of the three runs in 9.1's record so the finding stands on text a reviewer can read.

S3. **Task 9.2's red runs were not shaped like the green `anthropic-key` run.** Both base runs also exited 3 on the 12-request precondition (2 requests), while the green key run made 13. The seven failing assertions are real and discriminate (they all concern points and read/write counts the lookback does not affect), but the lookback-specific discrimination on the key route rests on the spike's L5. Say so in the 9.2 record.

## Final assessment

4 critical issue(s) found, none a code defect: 9.1 (an open Validate finding by the task's own rule) and 10.1–10.3 (Joel's, by design). Fix before archiving: resolve 9.1 by owner decision and record Joel's three observations. 1 warning and 3 suggestions. In the checks that ran, nothing in the code contradicts the proposal, specs or design, and `npm run check` is green on an independent copy of head `c59a100`.

Not verified: the carve-out on pi's real OAuth payload, Joel's attribution route and the 7.5-minute billing scenario (no evidence exists yet, 10.1–10.3); the lookback scenario on OpenRouter from this checkout (9.1); every live number was read from logs and none re-run, because the brief allowed no model call.
