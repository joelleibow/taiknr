{
  "mode": "review",
  "lens": "council-codebase",
  "paraphrase_proposes": "tasks.md is a fifteen-group, test-first checklist that adds four Jefferson instruments to taiknr: four domain modules (token estimate, six figures, calibration, dollar rules), one per-session publisher in the use-case layer behind a holder that starts as a no-op, three infra adapters (the Jefferson declaration, the bus, the readings), and six new publishing registrars, each registered through the gated pi immediately after the existing registrar whose outcome it reads. It also modifies `registerContextHandler` (holder dependency plus the recalled reading), `createPiJevScorerAdapter` (optional observer), `taiknr-config.ts` (the `jeffersonInstruments` switch), `tsconfig.json` (`verbatimModuleSyntax`), `package.json`/lockfile (`pi-jefferson@0.14.0` exact) and nine test files including the shared fake. Each task names the failing test first, its boundary cases, the red/green label from the spike, and the delta scenarios it proves; group 15 is Joel's own pi and is never ticked by the coder.",
  "paraphrase_existing": "taiknr is a clean-architecture pi extension with seven `src/infra/pi-event-handlers/` registrars wired in `src/app/extension/taiknr.ts` (seven `on()` calls today), a frozen `SessionConfig`/`handler-gate.ts` inertness mechanism, an `ArchiveStore` port with `size()`/`getAll()`, and recall that appends one `<recalled_context>` block to the latest user message at `context_with_system` and persists nothing. Handlers get host state from the event context, the store is hydrated from the branch's `taiknr-side-store` entries at start/tree/compact, and settlement writes the store at `agent_before_settle` before pi commits the boundary. `npm run check` is lint → typecheck → vitest, with Biome as the only writer. Nothing publishes anything today and nothing records a token size.",
  "recommendation": "Not blocking: every path, symbol, signature and host API the plan cites exists on disk, the Create/Modify/Delete boundary is exact (30 created, 15 modified, none deleted, no missing Modify target), and the two `TaiknrConfig` literals that break on a new field are precisely the two the plan names. Fix CB-S5-R3-1 before handing it to Derek — 14.1(b) will produce an expected error on pi's extension error channel that the file's own convention forbids, and the obvious repair makes the designed proof unreachable. The other four are wording-level: state the fixture route in 14.3 and 12.2, the comparison precision in 5.1, and correct 13.4's premise so nobody reconciles the store at settlement.",
  "findings": [
    {
      "id": "CB-S5-R3-1",
      "severity": "major",
      "location": "tasks.md §14.1 (b) Compaction case",
      "finding": "The case's invalid `context_edit` (`targetId: `no-such-entry``) is discarded by pi through `buildContext` throwing after the competitor's handler, and pi reports that as an error on the extension error channel, which the harness's `bindExtensions({ onError: (error) => errors.push(error) })` collects. The task does not say to expect it, while every other case in the same file asserts the harness collected nothing.",
      "rationale": "In the installed pi, `emitBoundary` (runner.js:781–813) re-builds the context after each handler inside a try/catch, and on a throw it calls `emitError({ event: baseEvent.type, error: `Invalid boundary entries: …` })` before returning `{ entries: [], continue: false, valid: false }`; `agent-session.js:2773/2823` wires `bindings.onError` to `runner.onError`, so the entry lands in the harness's `errors`. `tests/app/extension/archive-session.test.ts` asserts `expect(errors).toEqual([])` in eight of its nine cases (its own comment calls the array what 'collects extension and boundary errors'), so the habitual first assertion after `session.prompt('run it')` is red for a reason the plan never names.",
      "concrete_case": "Derek writes 14.1(b) in the file's house style: `await session.prompt('run it'); expect(errors).toEqual([]); expect(lastArchiveItems(listener)).toBe(1);`. The first assertion fails with one `{ event: 'agent_before_settle', error: 'Invalid boundary entries: …' }` entry. If he then 'repairs' the competitor's edit into a valid one — as the file's existing `competitorExtension()` does — the boundary commits, the `taiknr-side-store` entry sits before `firstKeptEntryId` and survives the compaction exactly as the existing case 'a compaction keeps the side-store entry it carried before the kept range' shows, so the hydration after `session.compact()` puts one item back in the store and the case's `archiveItems` 0 can never hold.",
      "recommendation": "Say in 14.1(b) that the case expects exactly one collected error whose `error` starts with `Invalid boundary entries`, that this entry is the evidence the boundary was discarded, and that the case must not assert `errors` empty; add the same one-line note to 14.1's lead-in so (a) and (c) are not weakened to match."
    },
    {
      "id": "CB-S5-R3-2",
      "severity": "minor",
      "location": "tasks.md §14.3, the switch-off case",
      "finding": "The switch-off case is described as an isolated `PI_CODING_AGENT_DIR` whose `pi-taiknr.json` is `{`jeffersonInstruments`:false}`. In this file the agent config is written by `writeClassifierAgentConfig(agentDirectory)` in `beforeEach`, so a bare literal replaces the classifier provider/model and leaves recall unable to resolve its model at all.",
      "rationale": "`tests/support/classifier-guard.ts:118–128` writes `defaultDecisionModelProvider: 'taiknr-test'`, `defaultDecisionModel: 'jev-test'`; the shipped defaults are `openrouter`/`~typesafe/jev-latest` (`src/config/taiknr-config.ts:16–23`), which no provider in the harness registers. A lost classifier config means `findOfType` misses, `pi-jev-scorer-adapter.ts` throws its notice before `started`, `recallRelevantContext` fails open, and `guard.requests` stays empty — so the case passes with the observer path never exercised, and cannot show that the silence came from the switch rather than from recall never running.",
      "concrete_case": "The case writes `{",
      "recommendation": "Write it as `writeClassifierAgentConfig(agentDirectory, { jeffersonInstruments: false })`, which layers the switch onto the classifier fields, and assert `guard.requests` is non-empty and every `recalled` update is absent — the same shape as the file's existing 'a trusted project file that turns taiknr off leaves the output raw' case, which keeps recall reachable and still proves silence."
    },
    {
      "id": "CB-S5-R3-3",
      "severity": "minor",
      "location": "tasks.md §5.1",
      "finding": "The domain test is asked for `rows 1–11 and 13–15 of design.md D8's table, each with its expected output to the cent`. No row of that table is a whole cent, and six of them round to zero cents.",
      "rationale": "The design's expectations are five-decimal dollars (row 1 −$0.00311, row 5 +$0.00300, row 9 +$0.00150, row 11 +$0.00450, row 14 −$0.00450, row 15 −$0.04440) and one is exact only at seven places (row 8's arithmetic is −$0.0193125 against the table's −$0.01931); `netDollars` returns unrounded dollars by design (D7 `the dollar fields are posted unrounded`). 'To the cent' is therefore an assertion precision the table contradicts, and the plan leaves the coder to pick one.",
      "concrete_case": "Row 1 (`netDollars(responseRates(usage, cost), request)` = 4,960 × 1.50/M − 600 × 17.25/M − 0.0002 = −0.00311) asserted 'to the cent' is −0.00, and row 15 (−0.0444) is −0.04; both fail. Row 8 only passes at five places, because |−0.0193125 − (−0.01931)| = 2.5e-6.",
      "recommendation": "Say 'each with the table's own expected value, compared at five decimal places (`toBeCloseTo(expected, 5)`) or exactly where the arithmetic is exact', which is what the spike's `tests/domain/savings-dollars.test.ts` must have used to report A7 green."
    },
    {
      "id": "CB-S5-R3-4",
      "severity": "minor",
      "location": "tasks.md §12.2, the `reportRecalled` reading case",
      "finding": "The case asserts that the reading recall passes to `reportRecalled` evaluates to `{ estimate: tokenEstimate(formatRecalledContext(outputs)) }`, but `context.test.ts` registers only `registerContextHandler`, so with `holder: createInstrumentsHolder()` the closure goes to the no-op and nothing ever evaluates it. The plan does not say which publisher the case installs or what triggers the evaluation.",
      "rationale": "The publisher takes and clears the stored reading inside `requestBuilt` and nowhere else (design D3/OD6(a)); that method's only production caller is the request registrar, which this file does not register. Two routes exist — a capturing `InstrumentPublisher` whose `reportRecalled` keeps the closure for the test to call, or the real publisher over a recording sink plus a hand-built `RequestReading` — and choosing the test boundary is exactly what the readiness standard reserves to the plan.",
      "concrete_case": "Derek follows 'the harness installs `createInstrumentsPublisher`' from the observer case into the reading case, fires the event, and finds no posted `recalled` figure and no way to see the closure, because no `requestBuilt` ran — the assertion has no observable to stand on until he invents one of the two routes.",
      "recommendation": "Name the route: install the real publisher with a recording sink and, after firing the handler, call `holder.current().requestBuilt(() => ({ pair: undefined, messageEstimates: [], toolResults: [], latestUser: undefined }))` and assert the posted `recalled` equals `tokenEstimate(formatRecalledContext(outputs))`; that keeps the real publisher as the thing under test and needs no spy."
    },
    {
      "id": "CB-S5-R3-5",
      "severity": "minor",
      "location": "tasks.md §13.4 (premise) with §14.1 (b)",
      "finding": "13.4 justifies the settled re-post with `so the store agrees with the branch`, and lists `a store that ran ahead of the branch before the commit` as its boundary case. 14.1(b) shows the two can still disagree at `agent_settled`, and D5 defines `archiveItems` as 'items in the store'. The rationale invites the one implementation that breaks the proof.",
      "rationale": "When pi discards a boundary, taiknr's own store write has already happened (`AGENTS.md`: 'a settlement's store write is not persistence'), so at `agent_settled` the store holds the item and the branch holds no `taiknr-side-store` entry. D5 gives the field one source — `deps.store.size()` — and the settled registrar 'changes no publisher state' (D2), so nothing may be re-hydrated there. A handler that reconciles would post 0 at settlement, which contradicts 14.1(b)'s measured `archiveItems` 1 and would also drop items recall can still serve (`getAll()`).",
      "concrete_case": "A coder reading 'so the store agrees with the branch' adds `hydrateArchiveStore(readArchiveBatchesFromBranch(ctx.sessionManager.getBranch()), store)` to `instruments-settled.ts`. In 14.1(b) the post-settlement `archiveItems` is then 0 instead of 1, the compaction assertion becomes unfalsifiable, and recall silently loses the item the discarded boundary staged.",
      "recommendation": "Replace the clause in 13.4 with the source: 'total context from the reading, the archive's three figures from `deps.store.size()` and `deps.store.getAll()`, whatever the branch says; the handler re-hydrates nothing and changes no publisher state', and rename the boundary case 'a store that ran ahead of the branch (a discarded boundary)'."
    }
  ],
  "assumptions": [
    {
      "assumption": "Every path in the File Boundary's Modify list exists at abaa6b0, and the two `TaiknrConfig` literals that break on a new required field are exactly `tests/config/session-config.test.ts:9` and `tests/app/extension/handler-gate.test.ts:8`.",
      "status": "verified"
    },
    {
      "assumption": "`src/app/extension/taiknr.ts` registers exactly seven `on()` calls today (one per registrar), so 14.1's `the base reads 7 entries` and the 13-entry target are both right.",
      "status": "verified"
    },
    {
      "assumption": "The installed host is pi 1.5.2 and it offers `pi.events: EventBus` with `emit(channel, data)` behind `assertActive` (loader.js:426–430), plus typed `on` overloads for `session_compact`, `session_tree`, `context_with_system`, `agent_settled` and `message_end` (extensions/types.d.ts:1236–1260).",
      "status": "verified"
    },
    {
      "assumption": "`buildSessionProjection(entries, leafId?, byId?)` is a root export, `SessionManager.appendUsage(kind, provider, model, usage, note?)` exists, `Usage.cost` is required, `AssistantMessage` carries `provider`/`model`/`usage`/`stopReason` and no `parentId`, and `VIRTUAL_MODEL_API`/`isVirtualModel` are not re-exported from the package root (only `.` and `./rpc-entry` are exported), so the `pi-virtual` `shortcut:` is correct.",
      "status": "verified"
    },
    {
      "assumption": "`src/` holds no `console` call and no logger, so the plan's `log fields: none` and `no task adds a log line` are consistent with the repository; a fault surfaces only through pi's per-handler catch and `emitError`.",
      "status": "verified"
    },
    {
      "assumption": "pi's runner chains `context_with_system` handlers in registration order, hands each the previous handler's messages, and keeps the previous list when a handler returns nothing (runner.js:1043–1072), and `message_end` replaces the message only when the handler returns one (runner.js:872–906).",
      "status": "verified"
    },
    {
      "assumption": "`pi-jefferson@0.14.0` is absent from `node_modules` at abaa6b0, so 1.1's TS2307 red and the load check's premise hold.",
      "status": "verified"
    },
    {
      "assumption": "The fake's `emitThrows` records before throwing, which is what 9.2 and 12.2 assert; the fake does not exist in that shape yet.",
      "status": "unverified"
    },
    {
      "assumption": "Holding pi jefferson 0.14.0's `Registration`/`Report` shapes cannot be checked from this checkout, so 9.1's field table and `buildFieldReports` are taken as the design's and Chidi's readings.",
      "status": "unverified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "`pi-jefferson@0.14.0`'s own types (`Registration`, `Report`, `defaultLabel`, variable rendering): the package is not installed in this checkout.",
    "The load check and its positive control (`pi --no-session --help` against an exported copy with a separate `PI_CODING_AGENT_DIR`): not re-run here; taken as measured (RDY2-8).",
    "Group 15 and any real TUI rendering, including whether a real pi surfaces `emitError` output to the user or only records it internally.",
    "The five delta specs' scenario-to-test coverage mapping, except where a scenario named a path or symbol I could open on disk.",
    "The 22-file/328-test baseline, the 0.32–0.80 ms projection cost, and the spike's 438/32 green: reported from earlier measurements, not re-measured.",
    "`tests/infra/pi-event-handlers/` for `tool-call`, `turn-end`, `agent-before-settle`, `session-tree` and `session-compact` test files beyond confirming they build no complete `TaiknrConfig` literal and share no fixture I would need to change."
  ]
}