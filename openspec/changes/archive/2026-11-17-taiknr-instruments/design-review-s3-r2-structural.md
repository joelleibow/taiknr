{
  "mode": "review",
  "lens": "council-structural",
  "paraphrase_existing": "Today taiknr runs as a pi 1.5.2 extension with seven lifecycle registrars: `turn_end` stages large tool results, `agent_before_settle` drafts the stub `context_edit`s and one side-store entry and writes the in-memory store, the hydration events (`session_start`, `session_tree`, `session_compact`) rebuild that store from the branch, and recall appends one `<recalled_context>` block to the latest user message inside `context_with_system`, all behind the single `enabled` gate in `handler-gate.ts`. The store holds each item's `stub` and `rawText` (each stub embedding its entry id); nothing measures token sizes and nothing publishes anything. pi's own context figure falls back to characters ÷ 4 over the whole projection after every settlement, sitting 38–41 % below the next request's real prompt.",
  "paraphrase_proposes": "The change adds six publishing registrars — one each for `session_start`, `context_with_system`, `message_end` (assistant only), `agent_settled`, `session_compact` and `session_tree` — each feeding one per-session use-case publisher through a holder built in `taiknr.ts`, which holds a no-op publisher until the `session_start` registrar reads the new `jeffersonInstruments` switch and installs the real one. The publisher registers four Jefferson instruments (`taiknr.context`, `taiknr.archive`, `taiknr.savings`, `taiknr.recall`) and posts the six context figures, per-request and since-start savings in tokens and signed dollars net of rewrite charges and recall's classifier spend, a decision-in-flight indicator with its item count, the window, and one uncalibrated flag, with every token figure k × one estimate under a per-model-pair ratio seeded from the branch and refreshed by each valid response. Host state reaches the publisher only through one deferred reading per event; the classifier is observed at the scorer adapter; every emit goes through one bus adapter that catches silently; the arithmetic lives in four new domain modules and a use-case publisher; `pi-jefferson` 0.14.0 joins as a type-only devDependency enforced by `verbatimModuleSyntax`.",
  "recommendation": "Approve with minor edits before tasks.md is drafted. The layering (domain arithmetic, one use-case state holder with one writer per event, infra adapters for pi and Jefferson, composition wiring), the one-home rules (switch reader, field table, estimator, declaration, bus catch), structural completeness against the feature-spec standard, and the calibrated claims all verify against the tree, the specs and the recorded evidence, and none of the round-1 or round-2 settled findings was reopened. Four defects remain: one major gap at the compact/tree seam — the single `rehydrated` method serves two events with different readings and different writes, and the design never states the discriminator or the empty-seed tree case — plus three minor precision defects in D2/D3/D5/D7. None changes a spec, the approach or a ruling; all four are design-statement fixes.",
  "findings": [
    {
      "id": "STRUCT-R2-1",
      "severity": "major",
      "location": "design.md — Decisions, D3 (\"An `InstrumentPublisher` has one method per publishing event — `sessionStarted`, `requestBuilt`, `responseReceived`, `settled` and `rehydrated`\") and D2's table rows `session_compact` / `session_tree`, against D7 calibration §5 and the `context-figures` spec's *When k is reseeded*",
      "finding": "Five publisher methods are named for six publishing events: `rehydrated` is the method for both `session_compact` and `session_tree`, but the two events carry different deferred readings (tree's includes the new branch's usage samples per pair; compact's is only the projection's estimate and the window) and perform different writes (tree reseeds the ratio table's non-live entries and, per D2, clears the pending request and rewrite state; compact keeps the ratio table). The design never states how `rehydrated` distinguishes the two events, and never states what a tree jump does to a non-live ratio-table entry whose pair has no valid sample on the new branch.",
      "rationale": "feature-spec-standard §3 requires explicit state transitions, and the council settled the behaviour (ruling 13; D7 §5: `session_tree` keeps live entries and replaces only the non-live ones) while leaving the dispatch unstated. A shared method whose behaviour turns on an unstated discriminator is a state-transition hole a coder must fill mid-implementation, exactly the class of gap ruling 14's \"one writer per event\" and D3's \"each `<Event>Readings` is a plain-data interface\" were meant to close — with six events, six readings in `pi-instrument-readings.ts`, and five methods, two readings feed one method and nothing says how.",
      "concrete_case": "A `/tree` jump to a branch whose newest valid assistant message belongs to no pair holding a seeded entry: the tree reading's samples list is empty, shape-identical to a compact reading if the samples member is optional. An implementation that reads \"no samples ⇒ keep the table\" (the compact behaviour, indistinguishable by shape) keeps the pre-jump branch's stale non-live k for the current pair instead of k = 1 with the flag on — the `context-figures` spec's *When k is reseeded* says \"otherwise k reseeds from the branch's newest valid assistant message of the current pair, or is 1 with the flag on\" — so every k-scaled figure after the jump is published under a ratio measured on another branch, with no test in `tests/infra/pi-event-handlers/instruments-tree.test.ts` naming the empty-seed case.",
      "recommendation": "State the discriminator in D3: either two methods (`compacted` and `treeJumped`) or a `RehydratedReadings` whose samples member is named as the discriminator (`undefined` = compact, present — empty included — = tree). Add one sentence to D7 §5 that a non-live pair with no seed on the new branch loses its entry — k = 1, flag on — matching the spec, and name the empty-seed case in the tree registrar test's row."
    },
    {
      "id": "STRUCT-R2-2",
      "severity": "minor",
      "location": "design.md — D2's table row `context_with_system` (\"the request reading built from the returned messages, the window, the pair\") and D7's `readRequest` block (`contextWindow: number`), against D5's field-table row `contextWindow` (\"Written at: start, response, settled, compact, tree\")",
      "finding": "The request reading carries the window, but no request-time write consumes it: D5's \"Written at\" column omits `request` for `contextWindow`, none of the request figures (`contextInTurn`, `historyBefore`, `withheld`, `stubbed`, `recalled`) needs a window, and the response re-posts the window from its own deferred reading. Either D2/D7 specify a dead host read, or D5's column is missing a write.",
      "rationale": "One home for each fact: D2/D7 and D5 are two statements of what the request event reads and writes, and they disagree. The dead-read reading is not free — the window comes from `ctx.getContextUsage()`, which builds its own projection, and the Risks row counts exactly that second projection among the accepted per-event cost, so the ambiguity decides whether one of the two accepted projections per request publishes nothing.",
      "concrete_case": "A coder implementing `readRequest` from D7 calls `ctx.getContextUsage()` on every `context_with_system` (the extra ~0.32–0.80 ms projection build the Risks row accepts), then finds `requestBuilt` posts no field that uses the value; dropping it silently diverges from D7's stated reading shape and its `pi-instrument-readings.test.ts` case, keeping it costs a projection build per request that no published field consumes.",
      "recommendation": "Pick one home-consistent statement: drop `contextWindow` from `readRequest` and from D2's request row, or add `request` to D5's `contextWindow` \"Written at\" column and state that `requestBuilt` re-posts it (a repeated value costs Jefferson nothing by A1's repaint dedupe)."
    },
    {
      "id": "STRUCT-R2-3",
      "severity": "minor",
      "location": "design.md — D3 point 1 (\"The types. `FigureKey` … `FigureValues` … `Publication = Partial<FigureValues>`\") against D2's file-table rows for `src/use-cases/instruments-publisher.ts` and `src/infra/adapters/jefferson-instruments-declaration.ts`",
      "finding": "D3 defines the three figure types but never names the module that declares them. The declaration adapter needs `FigureKey` for its total `Record<FigureKey, FieldName>` map, the bus adapter needs `Publication` for `post`, and the use case owns the opening publication's `FigureValues` typing; D2's file table says the use case \"declares the three interfaces it requires from outside\" — `InstrumentSink`, `ClassifierObserver`, `InstrumentsHolder` — so the figure types' home is unstated, and only the use case (or domain) can hold them without an upward import.",
      "rationale": "feature-spec-standard §3 puts every type in one canonical place, and ADR 0001 fixes the direction: infra imports use cases, never the reverse. The natural-looking alternative — beside the field table in `jefferson-instruments-declaration.ts` — breaks the layer direction in a way no gate catches: the boundary scenario's `rg` check reads only `@earendil-works/pi-` and `pi-jefferson` imports, and `npm run check` does not test intra-repository import direction.",
      "concrete_case": "A coder places `FigureKey`/`FigureValues`/`Publication` in `jefferson-instruments-declaration.ts` because that file already names every field and its map; `instruments-publisher.ts` then imports the types from `src/infra/`, `npm run check` stays green, and the layering inversion surfaces only if a reviewer happens to run an import-direction check no scenario names.",
      "recommendation": "Add one sentence to D3: the three types are declared and exported from `src/use-cases/instruments-publisher.ts` beside the interfaces, and the declaration and bus adapters import them downward."
    },
    {
      "id": "STRUCT-R2-4",
      "severity": "minor",
      "location": "design.md — D2's table, `session_compact` cell (\"clears the pending request and the rewrite state; keeps the ratio table and the uncharged spend\") against the `session_tree` cell (\"reseeds the pairs with no live entry from the new branch; clears the pending request and the rewrite state\") and D4's spend-accounting paragraph",
      "finding": "The compact cell affirmatively keeps the uncharged spend while the tree cell is silent on it, although D4 settles that both events keep it (\"`session_compact` and `session_tree` keep it, because the money was spent\"). The asymmetry is the same D2-restates-another-decision drift class as round 1's STRUCT-R1-1, whose fix made D2 point to D5 for fields but left the state writes restated per cell.",
      "rationale": "One home for each fact: D4 owns spend accounting, and a D2 cell that mentions the spend for one of the two sibling events and not the other invites the inference that the silent event clears it. D3's rule that the design is the implementer's only contract for the publisher's state makes the inference load-bearing.",
      "concrete_case": "A coder writing the tree path from D2's cell alone clears `unchargedSpend` on a `/tree` jump — the compact cell needed an affirmative \"keeps\" and the tree cell has none — so every classify call made before the jump vanishes from the next priced request's net dollars, under-charging it by exactly that spend against D4's rule and the settled finding that the money was spent.",
      "recommendation": "Make both cells agree with D4: add \"keeps the uncharged spend\" to the tree cell, or trim both cells to what changes and let D4's paragraph carry what is kept."
    }
  ],
  "assumptions": [
    {
      "assumption": "The working tree is `main` at `abaa6b0` (the brief and research-eleanor state it; the commit hash was not independently resolved)",
      "status": "unverified"
    },
    {
      "assumption": "The five round-1 structural findings were folded into the current design.md (D2 now points to D5's \"Written at\" column as the one field list; D8's row (4) covers a pending estimate not above 0; dollar row 8 states its suffix in Inputs; the scorer test row is stated plainly with no conditional; the rounding run is cited as Michael, Stage 2, C3)",
      "status": "verified"
    },
    {
      "assumption": "The repository facts the placement rests on: `ArchiveStore` carries `getAll()` and `size()` with no member added; `buildStub` embeds the entry id in the stub prefix; `context.ts` holds the chars÷4 inversion and exactly the five early returns; the scorer adapter drops `result.usage` on every path and throws on the `findOfType` miss before `classify`; the seven registrars, `tests/support/fake-pi.ts`, `archive-session.test.ts` and `pi-jev-scorer-adapter.test.ts` all exist in the tree",
      "status": "verified"
    },
    {
      "assumption": "`session-start.ts` resolves the config, assigns ready/rejected state and hydrates synchronously with no `await`, so the gated publishing registrar registered after it sees a ready state in the same event and a rejection skips it (ruling 6's premise)",
      "status": "verified"
    },
    {
      "assumption": "pi-jefferson 0.14.0 contract behaviour relied on by D5/D9/D10 (registration before the first await, reports that cannot carry null or undefined, repaint dedupe on unchanged values, refusal and fault wording) rests on research-chidi A1–A5 and was not re-read against the Jefferson repository",
      "status": "unverified"
    },
    {
      "assumption": "pi 1.5.2 internals cited by line (runner.js `context_with_system` chaining and per-handler catch, loader.js `assertActive`, model-runtime.js classify wrapping, compaction.js estimate rules, agent-session.js window and teardown paths) rest on the council's recorded scratch-session evidence and rulings; not re-read",
      "status": "unverified"
    },
    {
      "assumption": "The round-2 settled findings list is binding; each was checked against the current section text only to confirm it still holds, and none was reopened or independently re-measured",
      "status": "verified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "pi-jefferson 0.14.0 sources under /Users/joelleibow/Projects/pi-jefferson (instrument-contract.ts, registration-listener.ts, provider-fields.ts, bar.ts) — Chidi's recorded evidence was relied on, not re-read.",
    "pi 1.5.2 internals cited by line number (runner.js, loader.js, model-runtime.js, compaction.js, agent-session.js, agent-session-runtime.js) — the council's recorded evidence and rulings were relied on.",
    "The working tree's commit hash (only the brief's statement that it is `main` at `abaa6b0`).",
    "tasks.md — no tasks.md exists in the change directory yet, so design-to-tasks alignment is not checkable at this stage.",
    "Whether Jefferson repaints while the classifier call is in flight and whether it accepts the registration and every update — unverifiable from taiknr's side; already the design's Open Questions and Joel's live look.",
    "The npm registry install of `pi-jefferson@0.14.0` and the resulting lockfile (D10's command and CB-10's outcome were not run).",
    "Michael's 100,000-pair Math.round rounding run — now cited in D7, but not re-executed; the settled finding on integer estimates covers its conclusion."
  ]
}