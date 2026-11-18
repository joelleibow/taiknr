# Red/green spike — cache-point-before-recall

Every check a task will rely on has been run twice: red against base commit `d5f8435`, green against
the smallest change `design.md` specifies. All §8.1 checks are red then green; `test-cache-point-live.mjs`
passes every one of its twelve assertions on `openrouter` and on `anthropic-key` against the change, and
fails seven of them on both routes against the base. Two things did not go green as written: §8.3's
`read_H` inequality does not hold on the probe logs the design cites, and three of §8.2's preconditions
cannot hold on those logs at all (§Gaps 2, 3 and 4). No live OAuth or attribution run was made — those
are Joel's at Validate.

**How the spike ran.** A full copy of the project at `d5f8435` in `/tmp/dr-rg.GuaKI3/tree`, its own git
repo, `npm install` inside it with the project's committed `package-lock.json`. The red run is that copy
with the four new modules present but behaving as the base does (the payload edit returns "no change"),
plus the new tests; the green run is the change itself. A separate `git worktree` of the same base
commit in `/tmp/dr-rg.GuaKI3/base`, with `npm ci` inside it, is the red side of the live runs. Both are
removed. The project's own checkout is untouched apart from this file.

**Command:** `npm run check` inside the copy — `biome check .`, `tsc --noEmit`, `vitest run`.
Red: `Test Files 8 failed | 32 passed (40)`, `Tests 42 failed | 554 passed (596)`.
Green: `Test Files 40 passed (40)`, `Tests 596 passed (596)`, plus `npm run check` exit 0 with lint and
typecheck clean.

Every check is labelled so `tasks.md` can cite it. "Pin" means the check is already green against the
base, so it is a regression guard rather than a red.

---

## 1 Automated, at the adapter — `tests/infra/adapters/anthropic-cache-payload.test.ts`

| # | Check (§8.1) | Red at base | Green |
|---|---|---|---|
| A1 | the route table, one row per provider, never more than four markers | covered row returned `undefined`: `anthropic/anthropic-messages edited: expected false to be true` | pass |
| A2 | a payload that is not an object, or carries no `messages` array | pin (base edits nothing) | pass |
| A3 | the handoff places the carry on the recorded carrier's last block, `ttl` copied | no carry placed | pass; `{"ttl":"1h","type":"ephemeral"}` on the carry |
| A4 | `[image, R]` then `[image]` already marked: the carry is in place | `recordOf` null | pass, output deep-equals its input |
| A5 | `[image, R]` then `[image]` unmarked: the carry is placed | no carry | pass |
| A6 | a different last block at the recorded index places no carry | `applied` was `null`, not `{carrierRead: null, block: null}` | pass |
| A7 | a carrier that still ends with recall's block: only the before point | no before point | pass; `carrierRead` is the record's block, the before point sitting on the same message |
| A8 | API key, no record: before point, pi's marker stays, four markers, `block` cached | no edit | pass |
| A9 | API key with a top-level marker: pi's marker yields, `block` cached | no edit | pass |
| A10 | a second tools marker instead: `block` uncached | no edit | pass |
| A11 | cell (a) set with no payload block equal to it: `applied.block` null, no point | `applied` null | pass |
| A12 | pi's OAuth shape: a handoff that also recalls places both points, removes pi's marker, leaves `system[0]` unmarked, `block` uncached | no edit | pass, four markers: `m[0][0] m[4][0] system[1] tools[0]` |
| A13 | pi's OAuth shape with no block and no handoff: only `system[0]`'s marker is removed | no carve-out | pass |
| A14 | pi's OAuth shape with a top-level marker: no room for both points, none moves | no edit | pass |
| A15 | no message marker at all: only `system[0]`'s marker is removed | no carve-out | pass |
| A16 | a foreign message marker beside pi's: no message-level edit | pin | pass |
| A17 | a marker inside a `tool_result`'s content counts as a message marker: no edit | pin | pass |
| A18 | a `cache_control` property inside a tool's `input_schema` is data: both points placed | no edit | pass |
| A19 | a `cache_control` key in a `tool_use` block's `input` is data: the edit is still made | no edit | pass |
| A20 | pi's marker followed by an empty `role:system` effort message is recognised | no edit | pass |
| A21 | a coincident carry changes nothing | `applied` null | pass |
| A22 | two messages end with the block's exact text: the higher index is chosen | no before point on the higher message | pass, record `{index: 2, fingerprint: "second"}` |
| A23 | a two-marker request leaves the record alone, so the next handoff still carries | no record kept | pass |
| A24 | a no-fit handoff records nothing, so the next handoff's `carrierRead` is null | output not `undefined` at base… red on the record rule | pass |
| A25 | string content / a pasted `<recalled_context` / a block that is first in its message | red on the record rule | pass |
| A26 | a lone surrogate inside the block still matches pi's rule | no edit | pass |
| A27 | a stale carrier places no carry | pin | pass |
| A28 | a replay before the commit edits the same way; after it, no carry | no carry | pass |

## 2 Automated, at the handlers

`tests/infra/pi-event-handlers/before-provider-request.test.ts`:

| # | Check | Red | Green |
|---|---|---|---|
| B1 | the §5.1 ordering: a throwing payload returns `undefined`, does not throw, sets `applied` null, resets `nextCarrier` to `carrier`, leaves `carrier` unchanged | `applied` stayed non-null | pass |
| B2 | a covered request edits the payload and stores the placement it computed | nothing stored | pass |
| B3 | a covered request followed by an uncovered one leaves `applied` null | stale placement kept | pass |
| B4 | the route is re-read per request, so `/model` to an uncovered route stops the edit | no edit at all | pass |
| B5 | inertness with `enabled` false and with a rejected config | pin | pass |
| B6 | publishing off still edits the payload | no edit | pass |

`tests/infra/pi-event-handlers/payload-cache-commit.test.ts`:

| # | Check (§8.1 (a)–(d)) | Red | Green |
|---|---|---|---|
| C1 | two handoff calls, no `message_end` between: the second output carries the carry | no carry | pass |
| C2 | an `error` and an `aborted` response commit nothing | pin | pass |
| C3 | a payload call with no `message_end` after it commits nothing | pin | pass |
| C4 | a valid assistant response commits the record the payload call computed | `nextCarrier` null | pass |
| C5 | a user message's `message_end` commits nothing | pin | pass |

## 3 Automated, at recall's handler and the composition

| # | Check | Red | Green |
|---|---|---|---|
| D1 | cell (a) holds the block this request built and is cleared at every `context_with_system` | `recallBlock` never written | pass |
| D2 | a request recall answers nothing for leaves cell (a) empty | pin | pass |
| F1 | the registration list: fifteen registrations over ten events, duplicates kept | expected thirteen | pass |
| G1 | the `message_end` registrar hands `applied` to the publisher unevaluated | `applied` undefined | pass |

## 4 Automated, at the figures

`tests/use-cases/instruments-publisher.test.ts`:

| # | Check | Red | Green |
|---|---|---|---|
| E1 | the rewrite starts after the carrier's own content when `carrierRead` matches | `-0.0012285` (the carrier's own 100 tokens charged) vs `-0.0002625` | pass |
| E2 | `carrierRead` naming another block keeps today's start | `-0.0012285` vs `-0.00147` | pass |
| E3 | a block that changed in place on a carried message is charged the write rate | `-0.0012285` (read rate) vs `-0.00147` | pass |
| E4 | a block the request left uncached is charged the input rate | `-0.06817125` (write rate at k 1.4) vs `-0.054537` (input) | pass |
| E5 | a block that first appears on a message the last priced request carried is a write | `-0.000042` (read rate) vs `-0.000525` | pass |
| E6 | a block the last priced request left uncached is a write, then a read | `-0.000042` (read) vs `-0.000525` (write) on the second request | pass |

`tests/domain/savings-dollars.test.ts`:

| # | Check | Red | Green |
|---|---|---|---|
| E7 | an uncached block on a warm request is the input rate | `-0.0038955` (read) vs `-0.038955` (input) | pass |
| E8 | an uncached block on a cold request is the input rate | `-0.04869375` (write rate) vs `-0.038955` (input) | pass |
| E9 | a cached block on a cold request is still the write rate | pin | pass |

The figure checks' red was re-run against the base's two figure files alone
(`git checkout 27501f4 -- src/use-cases/instruments-publisher.ts src/domain/savings-dollars.ts`, then
`npx vitest run` on the two test files: `Tests 9 failed | 69 passed (78)`, every one an `AssertionError`).
The first red run had E5 erroring on a `TypeError` from a request-reading shape the base does not accept,
which is a red for the wrong reason; the re-run gives each of the nine its assertion.

**An existing expectation changed, and the design mandates it.** `instruments-publisher.test.ts`'s
"a shrunk block on the same carried message charges the suffix behind it" expected
`-0.7 × 20 × READ − …`; D8 says that block was never cached by any request, so it is `-0.7 × 20 × WRITE − …`.
The old figure is the latent defect D8 fixes ("132 of 132 measured requests match"). I changed that one
number and left the assertion's shape alone; nothing else in the existing suite changed except the two
fixture fields the design adds (`PricedRequest.blockUncached`, `ResponseReadings.applied`).

## 5 The checks catch mistakes

Each mutation was applied to the green tree, the named checks rerun, then the file restored.

| Mutation | Caught by |
|---|---|
| M1 the handler's `catch` stops resetting `applied`/`nextCarrier` | B1 only |
| M2 D7's start falls back to `carried.index` | E1 only |
| M3 the carve-out is skipped | A12, A13, A14, A15 |
| M4 the budget stops excluding pi's last-message marker | eight adapter checks (A3, A5, A7, A8, A9, A10, A12, A18) |
| M5 D8 drops the `carried === undefined` clause | E5 only |

## 6 Live — `test-cache-point-live.mjs`

The script is at the root, outside `biome.json`'s allowlist, `tsconfig.json`'s program and vitest's
include. It exits 2 for a missing key or an unknown route (measured), 3 with
`extension not found: <absolute path>` when the checkout has no `src/app/extension/taiknr.ts` (measured),
3 for a failed precondition, 1 for a failed assertion, 0 otherwise.

**The assertion logic offline, against Michael's recorded logs.** A scratch driver
(`.pi/marbleization/cache-point-before-recall/derek/live-assertions-offline.mjs`) replays a probe log into
the script's own `evaluate`. Two numbers a log does not carry are supplied as §8.3 quotes them: the
block's characters (1,040 tokens × 8) and turn 2's own text (1,278 × 8).

| # | Check | Red | Green |
|---|---|---|---|
| L1 | the carry assertion discriminates the two strategies | `long-added.log` (M4): `H marks the last block of turn 2's user message: carry message 26: unmarked` | `long-carry.log`: pass, `m[26][0]` marked at H |

**Live, red then green, on the two routes I own.** Full output is in
`.pi/marbleization/cache-point-before-recall/derek/live-runs.md`.

| # | Run | Result |
|---|---|---|
| L2 | `openrouter`, the change | six preconditions and all twelve assertions pass; turn 2 made 13 requests; `H` read 11,775 and wrote 953 against the base's 6,769 and 11,246 |
| L3 | `openrouter`, the base | seven assertions fail: the two point checks, the carry check, the block-after check, `read_H` (6,769 against 6,769 + 1,314), `write_H` (11,246 against 383) and `input_H` (3 against 1,297) |
| L4 | `anthropic-key`, the change | all twelve assertions pass; the request-count precondition failed (the model made 2 requests in turn 2, not 12) so the run exits 3 |
| L5 | `anthropic-key`, the base | the same seven assertions fail; `H` read 6,852 and wrote 11,287 against the change's 11,885 and 131 |
| L6 | `anthropic-oauth`, `attribution` | not run — Joel's at Validate (`direnv exec . node test-cache-point-live.mjs anthropic-oauth`, `… attribution`) |

The shell's `$?` was masked by the pipe into `tail` on all four runs; each script's own return is
determined by the reason it printed (`precondition failed` → 3; otherwise `assertions.every` → 0/1).

---

## Questions I asked

One. My role rule for a spike says "never spend a model call; a check that needs one stays unrun", while
the brief provisioned credentials for four live routes and asked for the live script's assertions. The
answer was (b): prove the assertion logic offline against Michael's logs, and also run
`anthropic-key` and `openrouter` live, red against base and green against the change; `anthropic-oauth`
and `attribution` stay with Joel. I followed that, and reported L3, L5 and L6 accordingly.

## My calls, inside the contract

- `withoutLoneSurrogates`, `canonicalJson` and `markersIn` are module-private in the adapter; only
  `coversRoute`, `editPayload`, `RouteModel` and `PayloadEdit` are exported, because only the handler
  and the tests need them.
- The context handler takes the payload state as a fifth field of its existing deps object rather than a
  new parameter, so `AGENTS.md`:23's fixed `(event, ctx)` signature needs no exception (Gap 8).
- The two new handlers are registered before `registerContextHandler` and `registerInstrumentsResponseHandler`
  respectively; both events' handlers are order-independent by design, so the position is mine.
- `RequestCandidate.blockUncached` starts `false` at `requestBuilt` and is overwritten at the response,
  which is when the finished clone's placement is known.
- `test-cache-point-live.mjs` compares real paths (`realpathSync`) before deciding it is the main module,
  because `/tmp` is a symlink to `/private/tmp` here and the naive comparison made the script a no-op when
  invoked from another directory.
- The observer finds the block's own message by searching for a tail that starts with `<recalled_context`,
  not the last `role:user` message: after the first tool call the last user message is the tool result.

## Tasks

None to tick: the change has no `tasks.md` yet. The one check that needs an observation only Joel can
make is L6, and design §8.2 already puts it there.

## Not verified

- **No OAuth and no attribution run.** L6 is Joel's, and it is the only live evidence for D3's carve-out
  (Gap 9) and the only route where the retention is pi's own 1h marker.
- **The `anthropic-key` green run exits 3 on a precondition** (Gap 4). Its twelve assertions pass, but a
  route's acceptance needs a run where turn 2 makes twelve requests, and I did not get one on that route.
- **The online proof of `read_H` is not a red-then-green pair on the design's own numbers** (Gap 2): the
  inequality fails on the probe logs and passes on my live runs for a different reason.
- **`applied.block`'s uncached row has no live evidence** (Gap 10), because every route runs with
  publishing off, as §8.2 requires.
- **I did not run `npm run check` under the project's own `.envrc` in the base worktree**, only inside the
  change copy; the base worktree ran `npm ci` and the live script only.
- **Two numbers in the offline replay are the design's, not the logs'**: the block's characters and turn
  2's own text. A live run computes both; a log cannot, so the offline red/green is about the assertion
  logic, not about reproducing §8.3's arithmetic from a log.
- **`structuredClone` on a payload with a throwing getter** is covered by the handler's `catch`, not by a
  getter fixture: my B1 uses a function value, the case design §5.1 measures.

## Docs for Bambadjan

My change makes these Markdown sentences false or incomplete. I edited none of them.

- `AGENTS.md`:23 — "The public signatures are fixed … with one enumerated exception: the `session_start`
  registration takes the session's config holder as a third parameter." `registerInstrumentsResponseHandler`
  now takes the payload state as a third parameter too, and that enumeration gains it.
- `AGENTS.md`:42 — "four `taiknr.*` instruments kept current from one publisher per session behind the
  `jeffersonInstruments` switch" is still true, but the registration counts elsewhere ("thirteen over
  nine events") are now fifteen over ten, because `message_end` gains a second taiknr handler and
  `before_provider_request` is new.
- `ARCHITECTURE.md`:46-47 — the registration counts and the event list, on the same change.
- `ARCHITECTURE.md`:5 and `AGENTS.md`'s live-script trap — both name `jev-context-poc.ts`,
  `test-jev-poc.mjs` and `test-recall-live.mjs`, which are not in the tree; `test-cache-point-live.mjs`
  now is, and belongs in that trap.
- `README.md`:40 — the account of what a recall block costs, and `README.md`:112 with the instrument
  section's under-reporting record, are design §10's, and this change makes both wrong as written.
- `docs/adr/0009` is new work, not an edit: it narrows ADR 0007's "writes that turn to its cache again,
  once" and records this payload edit.

## Gaps

Every check I could not make go red then green, and every place the design is wrong or silent where the
code meets it.

1. **`R1 marks recall's block` and `R1's input is below a tenth of the block` cannot both hold on a
   two-point handoff.** `§8.3` asserts both against turn 2's first request. On a handoff that also
   recalls, D2 makes pi's marker yield, so recall's block carries no marker and the provider bills it as
   input — the spec's own "A handoff that also recalls" scenario says so. Both assertions fail on
   `s-key-h45.log`, `s-or-h45.log`, `s-attr-h45.log` (2,597 input) and on `long-added.log`. They pass only
   when turn 2's first request follows a turn that recalled nothing, which is what the script's own
   prompts produce and what the measured live runs show (input 3, block 10,374 characters). §8.3 must say
   which case R1 is, or pick the assertion that holds in both.

2. **`read_H ≥ read_R1(turn 2) + ⌈chars(turn 2's own text)/8⌉` is not a safe bound when R1 itself read the
   prefix.** On `s-key-h45.log` (N3): H reads 8,132, the bound is 6,896 + 1,278 = 8,174 → **fails by 42**.
   On `s-or-h45.log` (N5): 7,836 against 6,814 + 1,278 = 8,092 → **fails by 256**. On `s-attr-h45.log`
   (N7): 16,240 against 15,324 + 1,278 = 16,602 → **fails by 362**. The design's claim that it "passes on
   M5, N3, N5 and N7 (6,814–15,324 against 1,278)" only holds if `read_R1` is 0, which it is not once
   turn 2 opens on a handoff. The divisor is the other half of the problem: the added text is a
   digit-dense table, and 10,224 characters came to 1,236–1,314 tokens, not 1,278 as an upper bound.
   Fix one of the two — drop the `read_R1` term, or take the margin from the request the script actually
   sent — because as written the inequality fails on the runs the design cites as passing.

3. **Three of §8.2's preconditions cannot hold on the probe logs it cites.** "no request of turn 1
   carries a `<recalled_context` text block" fails on `long-added.log`, `long-carry.log`, `s-key-h45.log`,
   `s-or-h45.log` and `s-attr-h45.log`, because `probe2.ts` recalled from turn 1
   (`PROBE_RECALL_TURNS="1,2"`). "turn 2 made at least 12 requests" fails on `long-added.log`,
   `long-carry.log` and `s-oauth-h45.log`. So §8.2's "the inequalities and the preconditions ran against
   M4, M5, N3, N5 and N7" describes runs in which the script would exit 3 before asserting. The script's
   own prompts do satisfy the turn-1 precondition (measured L2 and L4: `block chars 0,0`).

4. **`turn 2 made at least 12 requests` is model-dependent, and 3 of my 6 live runs failed it.** The
   model made one bash call instead of twelve in both of the `anthropic-key` runs and in the
   `openrouter` base run, so the script exits 3 and a route's acceptance cannot be relied on in one
   attempt. A run that fails it costs a model call and proves nothing. The script should say so, or ask
   for the twelve calls in a way the model follows more reliably (the probe's own wording,
   `run2.sh`'s `$LONG`, gave 13 in `openrouter` but not in `anthropic-key`).

5. **The carry is one hop, and the design never says it.** `§5.3 (5)` records the next carrier only when
   the payload's own carrier (cell (a)) is found, so a handoff request — which carries no block — records
   `null`. After that request commits, no later request of the same turn and no request of the following
   turn carries anything. The measured prototype does the same (`probe2.ts`: `prev = carrier >= 0 ? … :
   undefined`), so the evidence agrees, but nothing in `design.md` or the delta specs tells a reader that
   a recalling turn must re-establish the carry. My A28 documents it; a task that "keeps the carry"
   would be inventing behaviour.

6. **`§4`'s test table names six files and the code needs nine.** Making `ResponseReadings.applied`
   required also changes `tests/infra/pi-event-handlers/instruments-compact.test.ts`,
   `instruments-tree.test.ts` and `instruments-request.test.ts`, and `instruments-request.test.ts` also
   needs a `payload` in the context handler's deps. None of the three is in the table.

7. **`§4` misses a fifth file in `src`.** `src/infra/adapters/pi-instrument-readings.ts` returned
   `ResponseReadings`; with `applied` supplied by the registrar it returns `CompactedReadings`. Small, but
   `§4` is the file-placement contract and it does not name it.

8. **`context.ts` gains a fifth dependency, and no ruling covers it.** `§4` says the handler writes cell
   (a) and `§10` enumerates exactly one new signature exception (the `message_end` registrar's third
   parameter). What I did: a `payload` field on the context handler's existing deps object, so the fixed
   `(event, ctx)` signature is untouched and `AGENTS.md`:23 needs no exception for it. That should be the
   design's sentence, not mine.

9. **D3's carve-out has no live coverage on any route I own.** It fires only where system carries two
   marked blocks, which is pi's OAuth shape alone: the API-key route measured one marked system block,
   OpenRouter one, and Joel's attribution transport marks `system[2]` of three. So A12–A15 are the only
   evidence for the carve-out and they are synthetic. If Joel's OAuth session is the acceptance, the
   carve-out's live proof rests on it.

10. **`applied.block` had no effect on any figure in these runs**, because every route ran with
    `jeffersonInstruments: false` as §8.2 requires. The uncached row of the spec's table is proven only at
    E4 and E7. That is a property of the check, not a defect, but a task that claims the row is "measured"
    would be overstating.

11. **`.gitignore` needs no change and the docs pass does.** `AGENTS.md`:23's enumeration gains the
    `message_end` registrar's third parameter; `AGENTS.md`:42's "thirteen over nine events" becomes
    fifteen over ten; `ARCHITECTURE.md`:46-47's counts move with it; `AGENTS.md`'s trap naming
    `jev-context-poc.ts`, `test-jev-poc.mjs` and `test-recall-live.mjs` should name
    `test-cache-point-live.mjs`, which now exists; `README.md`:40 and :112 and `docs/adr/0009` are §10's.
    Listed under Docs for Bambadjan above.
