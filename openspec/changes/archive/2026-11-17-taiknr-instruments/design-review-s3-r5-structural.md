{
  "mode": "review",
  "lens": "council-structural",
  "paraphrase_proposes": "The design adds six publishing registrars — `session_start`, `context_with_system`, `message_end` (assistant only), `agent_settled`, `session_compact`, `session_tree` — each feeding one per-session use-case publisher reached through a holder built in `taiknr.ts` that holds a no-op until the `session_start` registrar reads the new `jeffersonInstruments` switch, installs the real publisher, and registers and posts every declared field synchronously before its first `await`. The publisher serves four Jefferson instruments over 17 fields: the six context figures, per-request and since-start savings in tokens and signed dollars net of taiknr-caused cache rewrites (charged only over the suffix the last priced request carried, the candidate baseline promoted only by a priced response) and of recall's classifier spend, a decision-in-flight indicator fed by an observer at the scorer adapter, the window, and one uncalibrated flag — every token figure k × one estimate under a per-model-pair ratio table seeded at start and tree and refreshed by each valid response under its own pair. Host state reaches the publisher only through one deferred reading per event, each carrying the current pair from one shared `readPair(ctx)`, with `requestBuilt` taking and clearing the stored recall reading as its first statement. The arithmetic lives in four new domain modules, and `pi-jefferson` 0.14.0 joins as an exact-pinned type-only devDependency enforced by `verbatimModuleSyntax`, with every emit through one bus adapter that catches silently.",
  "paraphrase_existing": "Today taiknr runs as a pi 1.5.2 extension with seven lifecycle registrars behind the single `enabled` gate in `handler-gate.ts`: `turn_end` stages large tool results, `agent_before_settle` drafts the stub `context_edit`s plus one side-store entry and writes the in-memory store, the hydration events (`session_start`, `session_tree`, `session_compact`) rebuild that store from the branch, and recall appends one `<recalled_context>` block to the latest user message inside `context_with_system`, with five early returns. The store keeps each item's `stub` (each embedding its entry id) and `rawText`; `ArchiveStore` already exposes `getAll()` and `size()`; `formatRecalledContext` is domain code; nothing measures token sizes and nothing publishes. pi's own context reading falls back to characters ÷ 4 over the whole projection after every settlement, sitting 38.0–41.2 % below the next request's real prompt at every one of the 33 replayed settlements.",
  "recommendation": "Approve with one minor edit; the design is ready for tasks.md once it lands. Round 4's fix (STRUCT-R4-1) verifies in the Context bullet, every settled finding holds in its section as written, and layering, the one-home rules, structural completeness against the feature-spec standard, cross-references (D2→D5, D3→D7, D8→D4/D7, the specs' scenarios) and the calibrated claims all verify against the tree and the five deltas; the dollar table's arithmetic re-checks by hand, including the retry case's −$0.05916 and row 15's −$0.04440 that OD1(a) settled. One minor placement slip remains in the Created test table: 'the switch-off silence' is listed among `tests/use-cases/instruments-publisher.test.ts`'s contents, but the switch is read only in `instruments-session-start.ts` and the silent actor is the composition holder's no-op, so that silence already has its home in the six registrar tests' switch-off pairs and the holder test.",
  "findings": [
    {
      "id": "STRUCT-R5-1",
      "severity": "minor",
      "location": "design.md — Module & File Placement, Created table, `tests/use-cases/instruments-publisher.test.ts` row (the cell listing 'the switch-off silence')",
      "finding": "The publisher test row lists 'the switch-off silence' among the use-case test's contents, but no switch-off behaviour is testable at that layer: the switch is read only in `instruments-session-start.ts` (D1, D6, the configuration spec's *One reader*), and the silent actor is the no-op publisher the composition holder holds (D1, D3, the `src/app/extension/instruments-holder.ts` row). The design's own registrar-tests paragraph already gives switch-off silence its home — each of the six publishing-registrar tests 'carries a switch-off pair, because `jefferson-instruments`' *Every publishing event with the switch off* asserts that no instrument reading is evaluated' — and `tests/app/extension/instruments-holder.test.ts` covers the no-op itself.",
      "rationale": "feature-spec-standard §1 and §3 keep one canonical home per fact, and the table's own fourth column says each test file 'Mirrors its layer'. A use-case test asserting switch-off silence would either import the no-op from the composition root (a use-case test reaching into `src/app/extension/`, against the mirror its own cell states) or duplicate the registrar tests' pairs; the fact is otherwise fully covered, so the risk is a stray second home, not a missing test.",
      "concrete_case": "An engineer writing tests from the table puts a switch-off case in `tests/use-cases/instruments-publisher.test.ts`. The use case exports no no-op and reads no switch, so the case either imports `createInstrumentsHolder` from `src/app/extension/instruments-holder.ts` — a use-case test depending on composition, against the row's 'Mirrors its layer' — or is skipped, leaving the cell's promise unfulfilled while the six registrar tests already assert the same silence and the design's silent-case coverage stands regardless.",
      "recommendation": "Delete the phrase from that cell, or replace it with what D9 already assigns this file and the cell currently omits: '`reportRecalled` with a throwing reading returns normally and the following `requestBuilt` throws; after a `requestBuilt` whose own reading throws, a following request with no `reportRecalled` publishes `recalled` 0'. One cell edit; no decision turns on it and the wording is Michael's own."
    }
  ],
  "assumptions": [
    {
      "assumption": "The working tree is `main` at `abaa6b0` (the brief and research-eleanor state it; the commit hash was not independently resolved this round)",
      "status": "unverified"
    },
    {
      "assumption": "Round 4's fix landed: the Context bullet now reads 'a median 0.02–0.04 % and a worst 5.62 % across four long sessions (402–695 predictions each), and a worst 8.83 % on three short ones', matching research-chidi §C's ctx-calib table",
      "status": "verified"
    },
    {
      "assumption": "The settled findings list is binding; each was checked against the current section text only to confirm it still holds as written (the holder and no-op, the single switch reader, the six publishing registrars, the scorer-adapter observer, `reportRecalled`'s stored reading taken and cleared first by `requestBuilt`, the per-pair ratio table with no remembered pair, the projection-count Risks row, the OD1–OD6 rules in D8), and none was reopened",
      "status": "verified"
    },
    {
      "assumption": "Repository placement facts re-checked this round: `ArchiveStore` carries `size()` at ports.ts:5 and `getAll()` at ports.ts:7 with no member added; `buildStub` embeds `candidate.entryId` in the stub prefix (archived-output.ts:52); `formatRecalledContext` lives in `src/domain/recall.ts:34`; `budgetCharacters = 4 * …` sits at `src/infra/pi-event-handlers/context.ts:63`; the seven registrars exist in `src/infra/pi-event-handlers/`; `createGatedPi` is in `src/app/extension/handler-gate.ts`; `registerContextHandler`'s dependency object is today `{ config: session, store, recallCache }` with no `notifier`; `session-start.ts:16–17` is the two-path config resolution D6 cites, on raw `pi` with no `await` before it; `tsconfig.json` lacks `verbatimModuleSyntax` today; `tests/support/fake-pi.ts` has no `events` member and `createContextStub` carries `getContextUsage` plus `sessionManager.getBranch` only; `docs/adr/` holds 0001–0007; ARCHITECTURE.md has §9 and §11; AGENTS.md carries the `npm run check` gate, the one-lifecycle-event line and the extension-error-channel line",
      "status": "verified"
    },
    {
      "assumption": "D8's dollar table was recomputed by hand (rows 1–15 and the retry sequence's −$0.05916) and matches the stated outputs, including row 15's −$0.04440 that OD1(a) settled against CR-S3-2's −$0.0789",
      "status": "verified"
    },
    {
      "assumption": "Cross-references resolve: D2's 'Which fields each event posts is D5's Written at column, the one list of it' matches D5's column; D3's reading-shape names match D7's `RequestReading` layout and D2's reading cells; D8's row references (rows 1, 9, 11, 12) match its own table; the design's scenario citations (`configuration`'s *It layers like every other field*, `context-figures`' *One ratio per model*, `jefferson-instruments`' *Every publishing event with the switch off* and *The switch is read in one place*) all exist in the five deltas",
      "status": "verified"
    },
    {
      "assumption": "pi-jefferson 0.14.0 contract behaviour relied on by D5/D9/D10 (registration before the first await, reports that cannot carry null or undefined, repaint dedupe, the bar's null/undefined semantics, refusal and fault wording) rests on research-chidi A1–A5 and was not re-read against /Users/joelleibow/Projects/pi-jefferson",
      "status": "unverified"
    },
    {
      "assumption": "pi 1.5.2 internals cited by line (runner.js chaining and per-handler catch, loader.js `assertActive`, agent-session.js retry/omission/branch/`_limitsModel` lines, compaction.js estimate rules, model-runtime.js classify wrapping, settings-defaults.js retry defaults) rest on the council's recorded scratch-session evidence and rulings; not re-read",
      "status": "unverified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "pi-jefferson 0.14.0 sources under /Users/joelleibow/Projects/pi-jefferson (instrument-contract.ts, registration-listener.ts, provider-fields.ts, bar.ts) — Chidi's recorded evidence was relied on, not re-read.",
    "pi 1.5.2 internals cited by line number (runner.js, loader.js, agent-session.js, agent-session-runtime.js, model-runtime.js, compaction.js, settings-defaults.js) — the council's recorded scratch-session evidence and rulings were relied on.",
    "The npm registry install of `pi-jefferson@0.14.0` and the resulting lockfile (D10's command and CB-10's outcome) — not run.",
    "Michael's 100,000-pair `Math.round` rounding run and the faux-session measurements behind the settled findings — cited as recorded, not re-executed.",
    "michael-orientation.md — checked by targeted search for the figures the Context bullet cites; not read in full.",
    "Whether Jefferson repaints while the classifier call is in flight, and whether it accepts the registration and every update — unverifiable from taiknr's side; already the design's Open Questions and Joel's live look.",
    "tasks.md — absent from the change directory, so design-to-tasks alignment is not checkable at this stage.",
    "The git commit hash of the working tree (only the brief's statement that it is `main` at `abaa6b0`)."
  ]
}