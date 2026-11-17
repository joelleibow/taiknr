# Red/green proof — taiknr-instruments

Every check below is red at `abaa6b0` and green against the smallest change the design
(`design.md`, `specs/`, `owner-rulings.md`, `council.md`) specifies. Nothing ships: this is a
throwaway build per "Spikes and prototypes".

## How the spike ran

- **Base:** taiknr `main` at `abaa6b0` (`/Users/joelleibow/Projects/taiknr`). The project's own
  checkout was only read; `git status` there still shows nothing but the untracked
  `openspec/changes/taiknr-instruments/` directory, and `HEAD` is still `abaa6b0`.
- **Red copy:** `git archive abaa6b0 | tar -x` into a fresh `mktemp -d`, `git init` + one base
  commit, `npm ci`. The final test files were copied in and run there.
- **Green copy:** a second `mktemp -d` from the same archive, `npm ci`, then
  `npm install --save-dev --save-exact pi-jefferson@0.14.0` from the registry (see Gaps 5), then
  the implementation and the tests.
- **Both copies were removed** with `rm -rf` when the proof was done. No dependency was installed
  in the project's checkout, and no commit or push touched it.
- **No model call was spent.** `npm test` is covered by `tests/support/classifier-guard.ts`, the
  new checks script their own `classify` answers, and the load check is `pi --no-session --help`.
- **Commands** (in each copy): `npm ci`; `npx vitest run`; `npx tsc --noEmit`;
  `npx biome check --write .`; `npm run check`; the A1 probe below; the load check below.

**Red, at `abaa6b0`, with the final check set**

```
Test Files  14 failed | 18 passed (32)
     Tests  14 failed | 309 passed (323)
```

Eleven files fail at import — the modules the design creates do not exist yet
(`token-estimate`, `context-figures`, `calibration`, `savings-dollars`, `instruments-publisher`,
`instruments-holder`, `jefferson-instruments-declaration`, `jefferson-bus-adapter`,
`pi-instrument-readings`, the six registrars via the holder); three files fail **at their
assertions**, which is the sharper red:

```
tests/config/taiknr-config.test.ts > the instruments switch defaults to on
  AssertionError: expected undefined to be true
tests/config/taiknr-config.test.ts > the instruments switch rejects a string|a number|null
  AssertionError: expected 'unknown field' to be 'must be a boolean'
tests/app/extension/taiknr.test.ts > registers every lifecycle event, duplicates kept…
  AssertionError: expected [ 'agent_before_settle', …(6) ] to deeply equal [ 'agent_before_settle', …(12) ]
tests/infra/adapters/pi-jev-scorer-adapter.test.ts > the observer hears the call start…
  AssertionError: expected [] to deeply equal [ 'started 2', 'finished 0.001' ]
```

**Green, against the change**

```
Test Files  32 passed (32)
     Tests  438 passed (438)
```

`npm run check` (lint → typecheck → test) ends green: `biome check .` "Checked 75 files … no fixes
applied", `tsc --noEmit` silent, `vitest run` 438 passed.

## The checks

Each check names the expectation's source, then its red and its green. Tests are the check's home
unless the check is a compiler or loader question.

| # | Check | Expectation from | Red at base | Green |
|---|---|---|---|---|
| A1 | The Jefferson contract is imported type-only, and `verbatimModuleSyntax` makes a value import a compile error (TS1484); the extension still loads with no `node_modules` | `extension-packaging` *The Jefferson contract is a type-only development dependency*; ruling 17; design D10 | `tsconfig.json` has no flag and a value import of `Registration` compiles (no TS1484) | probe below: flag on → TS1484; flag off → compiles. Load check green, positive control red |
| A2 | The instruments switch: default `true`, layers agent-then-project, rejects `"false"`, `0`, `null` naming the field | `configuration` spec (all six scenarios); design D6 | 7 assertion failures in `tests/config/taiknr-config.test.ts` (`undefined` for the default; `unknown field` for the rejections) | those 7 pass, plus layering both orders |
| A3 | Thirteen registrations, duplicates kept, sorted; the factory touches nothing but `on` | `extension-packaging` *Every registration is listed*; ruling 10 | 7 entries | `tests/app/extension/taiknr.test.ts` asserts the 13 |
| A4 | The registration is emitted before the first `await`, and with the switch off nothing is registered, evaluated or posted | `jefferson-instruments` *The registration is emitted before the first await* and *Every publishing event with the switch off*; ruling 6; design D1 | modules absent | `tests/infra/pi-event-handlers/instruments-events.test.ts`: registration first and the handler returns `undefined`; six switch-off cases with a wholly throwing context, no emit; five cases where a real publisher on that context does throw, so the silence can fail; a throwing opening reading registers nothing and leaves the holder's no-op; a rejected config never reaches the reader |
| A5 | The six figures, `historyBefore − contextInTurn = savedTokens = withheld − stubbed − recalled` on unrounded values, and recalled overlapping context in turn rather than bucketed out | `context-figures` *Six figures…* and *A request's saving…*; rulings 1, 2, 3 | modules absent | `tests/domain/token-estimate.test.ts`, `tests/domain/context-figures.test.ts` (identity on unrounded values, negative saving, request-sourced stubs, archive totals, rounding), `tests/use-cases/instruments-publisher.test.ts` (request figures, valid response re-post with `contextInTurn` = the measured prompt, identity within 2 tokens after rounding) |
| A6 | One ratio per model pair, seeded per pair at start and reseeded at a tree jump, kept at a compaction, `k = 1` with the flag on when the pair has no entry | `context-figures` *One ratio per model*, *When k is reseeded*, *A resumed session seeds k*; rulings 4, 13 | modules absent | `tests/domain/calibration.test.ts` (validity, seeding, live sample, reseed keeping live entries, returning to a live pair) and the publisher cases: seeded pair posts its seed with the flag on, no pair posts `k = 1`, a tree jump keeps A live at 0.5 and takes B's 0.9, an errored response re-posts at the pair's unchanged k, and the design's own scenario (A live at 0.62, a request under A answered by B at 0.95, then `totalContext` 6,200 under A and 9,500 under B) |
| A7 | The dollar table's rows, each with its expected output | `context-figures` *The edges the design decides*; design D8's table; ruling 15 | modules absent | `tests/domain/savings-dollars.test.ts` rows 1–11, 13–15 (row 12 in the publisher, see Gaps 3) plus the non-finite/negative-cost fallback; publisher cases for the rewrite suffix ending at `previousLength` (new tail uncharged), a new user turn's vanished block, the same block again (nothing pending), and the spend |
| A8 | Host state reaches the publisher only through the deferred reading, and the no-op evaluates none and posts nothing | design D1, D3; ruling 6; `jefferson-instruments` *Every publishing event with the switch off* | modules absent | `tests/app/extension/instruments-holder.test.ts` (every method with a throwing reading, nothing thrown; install then reach), the publisher's `reportRecalled` throw case (stored unevaluated; the next `requestBuilt` throws; the request after that publishes `recalled` 0), and A4's switch-off cases |
| A9 | A publishing fault never touches recall: the emit is caught in the bus adapter, and the block's own estimate runs after recall's handler returns | `jefferson-instruments` *Publishing cannot cost stubbing or recall*; `tail-recall` spec; ruling 11; design D9 | the adapter ignores a third argument, so the observer records nothing | `tests/infra/pi-event-handlers/context.test.ts`: with `createFakePi({emitThrows: true})` behind the real publisher the handler still returns its messages with the block appended, and the recorder holds `deciding` true, `decidingItems` 1, `deciding` false; the reading recall passes evaluates to `{ estimate: tokenEstimate(formatRecalledContext(outputs)), messageIndex }` |
| A10 | The classifier is observed at the scorer adapter: `started(ids.length)` immediately before `classify`, `finished({costTotal})` on the line after the await, on every exit; no usage is `undefined`; a catalog miss observes nothing | `tail-recall` spec (all scenarios); design D4; ruling 8 | `[]` — the third parameter is ignored | `tests/infra/adapters/pi-jev-scorer-adapter.test.ts`: started-then-finished on an answer, an abort, an error, a timeout-shaped error and a malformed answer; `finished undefined` with no usage; nothing on a catalog miss; the publisher's spend cases (two calls add up, an aborted response carries them, a later request with no call is charged 0, non-finite/negative spend counts 0) |
| A11 | The declaration: every field declared with its type, four composed instrument names, formats naming only declared variables, `$savedTokensSinceStart tokens not sent since start`, the bar and its `null`, `~`/`""`, four-decimal dollars | `jefferson-instruments` *What Jefferson cannot confirm…*; design D5; rulings 2, 22 | modules absent | `tests/infra/adapters/jefferson-instruments-declaration.test.ts` (8 cases) and `tests/infra/adapters/jefferson-bus-adapter.test.ts` (both channel names, one report per field in declared order, a throwing emit leaving its caller intact) |
| A12 | Each reading: the pair by pi's own rule (physical, none, `pi-virtual` over the newest valid assistant message), the request reading touching neither the window nor the projection, the seed from the branch's newest valid sample, the response including the reply not yet on the branch | `context-figures` *One ratio per model*, *An invalid response is not a sample*; design D7 | modules absent | `tests/infra/adapters/pi-instrument-readings.test.ts` (12 cases), including `readRequest` under a context whose `getContextUsage`, `getBranch` and `buildSessionProjection` all throw |

### A1's probe and the load check

```
== with the flag (change state)
src/probe-verbatim.ts(2,10): error TS1484: 'Registration' is a type and must be imported using a
  type-only import when 'verbatimModuleSyntax' is enabled.
== with the flag turned off (base state)
(no lines: the value import compiled)
```

The probe was `import { Registration, type Report } from "pi-jefferson/instruments";`, deleted
immediately after.

The load check is the `git archive` copy with no `node_modules`, `settings.json` listing it under
`packages`, `PI_CODING_AGENT_DIR` pointing at that directory:

```
no node_modules in the copy
OK: no 'Failed to load extension' on stderr
```

Its positive control — one invalid line appended to `src/app/extension/taiknr.ts` in that copy —
prints `Error: Failed to load extension "…/taiknr.ts": … ParseError: Missing semicolon.`, and the
restored copy prints the line again only as absent. So the check is exercised, not merely silent.

## What this spike did not do

None of these is a gap in the design; they are the boundary of a throwaway build:

- **The design's twenty-file test list was consolidated.** The six publishing-registrar tests are
  one file (`tests/infra/pi-event-handlers/instruments-events.test.ts`), because the six share one
  harness. Implement should still place one file per registrar if it wants the design's layout.
- **`tests/app/extension/archive-session.test.ts` is untouched**, so the session-level wiring check
  (a listener extension in `extensionFactories`, T22) is unproven.
- **The docs pass is untouched**: the README's switch row, the example `taiknr.*` rows, the
  measurement explanation, `ARCHITECTURE.md`, `AGENTS.md` and the ADRs.
- **Nothing observable in a real pi** — Joel's live look (J2, T10) and `/reload` (ruling 12) are the
  only proof that Jefferson accepts the registration and each update.
- Not exercised: a real `/tree` or `/compact` against a live session; `pi-virtual` in a live
  routing; a provider that normalizes `input`/`cacheRead`/`cacheWrite` other than the two measured.
- The workings of `design.md`'s "Risks" that are host behaviour (pi's runner catching a throwing
  handler per handler) are relied on, as the design says, and asserted nowhere.

## Gaps

1. **The switch-off "pair" the design prescribes cannot be built for `context_with_system`.**
   `design.md`'s file-list note (after the Created table) says each registrar's switch-off test
   "installs a real publisher on that same throwing context and expects the throw", the context
   being one whose `buildSessionProjection`, `getBranch` and `getContextUsage` all throw. That holds
   for the four projection-reading registrars, but not for the request one: its reading is built
   from `event.messages` and `readPair(ctx)`, and D7 says the request "builds no projection" and
   reads the window not at all. **Evidence:** with that three-thrower context, a real publisher
   installed and the request event fired, the handler returned normally; the only host read it
   makes is `ctx.model`. My check gives the context a throwing `model` getter instead. Touches
   `jefferson-instruments` *Every publishing event with the switch off* and D7.

2. **`session_start`'s switch-off pair cannot be driven by installing a publisher.** The
   `session_start` registrar builds its own publisher and reads the switch from the session config,
   so `holder.install(...)` changes nothing and the case can never fail. **Evidence:** with the
   switch off and a publisher installed, the handler returned without throwing and emitted nothing
   whether or not one was installed. Its failure mode is covered instead by "a throwing opening
   reading registers nothing and leaves the holder's publisher as it was". Touches the same sentence
   and ruling 6.

3. **D8's row 12 is not a domain case.** *An aborted, errored or zero-usage response* has no
   arithmetic of its own: `netDollars` is never called for such a response, so the row can only be
   proven where the decision lives — the publisher. **Evidence:** `tests/domain/savings-dollars.test.ts`
   covers rows 1–11 and 13–15; row 12 is
   `tests/use-cases/instruments-publisher.test.ts`'s "an aborted, an errored or a zero-usage
   response changes no figure and prices nothing". The table mixes one publisher row into a table
   design calls "the rule's cases".

4. **`RecalledReading.messageIndex` is specified with no consumer.** D3 and D9 fix recall's reading
   as `{ estimate, messageIndex }`, but the index the publisher needs for the recall block's rate
   comes from `latestUser.index` in the request reading, so nothing reads `messageIndex`.
   **Evidence:** `grep -rn messageIndex src/` — the only writer is `context.ts` (its own prompt
   index, also passed to `appendRecalledContextToMessages`); `instruments-publisher.ts` declares the
   member and never reads it. Touches D3/D9 and "add only what your change consumes".

5. **The design's install command does not produce the pin it asks for.** D10 and
   `extension-packaging` *The Jefferson contract is a type-only development dependency* say
   `"pi-jefferson": "0.14.0"` exactly, "written by `npm install --save-dev pi-jefferson@0.14.0`".
   npm's default `save-prefix` writes a caret: after that exact command `package.json` read
   `"pi-jefferson": "^0.14.0"`. **Evidence:** the two consecutive installs in the green copy; only
   `--save-exact` produced `"0.14.0"`. Implement must use
   `npm install --save-dev --save-exact pi-jefferson@0.14.0`. Touches D10 and the packaging delta's
   *The lockfile carries it*.

6. **The host exports no message type the readings need.** Both `tests/support/fake-pi.ts` and
   `pi-instrument-readings.ts` need the type of a session message, and
   `@earendil-works/pi-coding-agent` exports no `AgentMessage` (TS2305); it has to be derived as
   `ContextWithSystemEvent["messages"][number]`, and `SessionManager.appendMessage` takes a narrower
   union than that (TS2345), so a test building a real branch casts. No decision is broken; it is a
   signature the design's file list implies but does not name.
