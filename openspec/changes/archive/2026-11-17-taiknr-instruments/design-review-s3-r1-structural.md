{
  "mode": "review",
  "lens": "council-structural",
  "paraphrase_existing": "Today taiknr runs as a pi 1.5.2 extension with seven lifecycle registrars: `turn_end` stages large tool results, `agent_before_settle` drafts the stub `context_edit`s and the side-store entry and writes the in-memory store, hydration events rebuild that store from the branch, and recall appends one `<recalled_context>` block to the latest user message inside `context_with_system`. The store holds each item's `stub` and `rawText`, pi persists the system prompt as a `role: \"system\"` entry, and nothing today measures or publishes token figures. pi's own context reading falls back to characters ÷ 4 over the whole projection after every settlement, sitting 38–41 % below the next request's real prompt.",
  "paraphrase_proposes": "The change adds six publishing registrars (`session_start`, `context_with_system`, `message_end`, `agent_settled`, `session_compact`, `session_tree`), one per event, feeding one per-session use-case publisher reached through a holder built in `taiknr.ts`, which holds a no-op until the `session_start` registrar reads the new `jeffersonInstruments` switch and installs the real one. The publisher posts four Jefferson instruments whose fields cover the six context figures, a per-model-pair calibrated token conversion (k from each valid response's prompt ÷ its request's estimate, seeded from the branch at start and tree), per-request and since-start savings in tokens and signed dollars net of rewrite charges and recall's classifier spend, and a decision-in-flight indicator fed by an observer at the scorer adapter. Every emit goes through one bus adapter that catches silently, the arithmetic lives in four new domain modules, and `pi-jefferson` 0.14.0 joins as a type-only devDependency enforced by `verbatimModuleSyntax`.",
  "recommendation": "Approve with minor edits. The layering (domain arithmetic, one use-case state holder with one writer per event, infra adapters for pi and Jefferson, composition wiring), the one-home rules (switch reader, field table, estimator, declaration, bus catch), structural completeness against the feature-spec standard, and the calibrated claims all verify against the tree, the specs and the recorded evidence, and none of the seven settled Round-1 findings was reopened. Five minor precision defects in design.md's own tables and evidence wording should be folded in before tasks.md is drafted; none is blocking and none changes a spec or the approach.",
  "findings": [
    {
      "id": "STRUCT-R1-1",
      "severity": "minor",
      "location": "openspec/changes/taiknr-instruments/design.md — Decisions, D2 table, rows `agent_settled`, `session_compact`, `session_tree`, against D5's field table and D3's test rule",
      "finding": "D2's \"Writes in the publisher\" column restates D5's \"Written at\" facts and drifts from them. The `agent_settled` cell reads \"keeps the totals, posts them and the archive from the store\", which names the savings totals as posted at `agent_settled`, while D5 writes `savedTokensRequest`, `savedTokensSinceStart`, `savedDollarsRequest` and `savedDollarsSinceStart` at \"response\" only. And the settled, compact and tree cells say \"posts total context and the archive\" while omitting `contextWindow`, which their own deferred readings include and D5 writes at \"start, response, settled, compact, tree\".",
      "rationale": "D3 fixes D5's \"Written at\" column as the one home (\"the publisher test asserts each event's publication carries exactly the fields D5's 'Written at' column gives that event\"), so a second divergent copy of the same facts in D2 is exactly the drift the one-home rule exists to prevent: two sections of the same document now prescribe different publications for the same event.",
      "concrete_case": "A coder writing `publisher.settled()` and `tests/infra/pi-event-handlers/instruments-settled.test.ts` from D2 posts `savedTokensSinceStart`/`savedDollarsSinceStart` at `agent_settled` and omits `contextWindow`; the same test written from D5 asserts the opposite publication set, so the design's two tables contradict each other at review and implementation time.",
      "recommendation": "Make D2's third column derive from D5: reword the `agent_settled` cell as \"keeps the savings untouched; posts total context, the window and the archive figures from the store\", add the window to the compact and tree cells, or replace the per-cell field lists with a pointer to D5's \"Written at\" column."
    },
    {
      "id": "STRUCT-R1-2",
      "severity": "minor",
      "location": "design.md — Decisions, D8, \"What a response does to every figure\" table",
      "finding": "The table claims \"One row per assistant `message_end` state\" but no row covers a response that is valid by stop-reason and usage while its pending request's estimate is not above 0: row (1) requires a pending request whose estimate is above 0, row (3) requires nothing pending, and row (4) lists only aborted or error, a prompt not above 0, and non-finite or negative token counts.",
      "rationale": "D7's validity rule (rule 2) excludes a zero estimate from samples, so the outcome is derivable from D7, but a table that claims exhaustiveness while leaving a state unplaced forces the implementer to invent the row, and the promised publisher tests (\"every response shape is covered\") give this shape no case.",
      "concrete_case": "A publisher test hands `responseReceived` a valid usage and a pending request whose `messageEstimates` sum to 0 (a scripted empty or all-empty message list); the implementer must decide unilaterally whether the pending request is consumed and which figures re-post, and two implementers can choose differently while both claim to follow the table.",
      "recommendation": "Add \"or the pending request's estimate is not above 0\" to row (4)'s condition list, so the state lands on the existing no-sample row: pending consumed, nothing priced, figures re-posted at the unchanged k."
    },
    {
      "id": "STRUCT-R1-3",
      "severity": "minor",
      "location": "design.md — Decisions, D8, dollar table, row 8 (\"Mixed short and one-hour cache writes\")",
      "finding": "Row 8's Arithmetic column uses a 1,000-token suffix (\"500 × 1.50/M − 1,000 × 20.0625/M\") that its Inputs column never states, against the table's own claim that \"the rates are round numbers chosen so each row is checkable by hand\". Every other row that charges a rewrite states its suffix in Inputs (rows 1, 2 and 4).",
      "rationale": "The table is the design's deliverable for §O6 (ruling 15, R13): each row's expected output must follow from its inputs alone. A hidden input makes the one row that exercises the blended-write rate uncheckable exactly where the design promises checkability, and `tests/domain/savings-dollars.test.ts` is specified as \"one case per row of the dollar table (D8)\".",
      "concrete_case": "Writing the row-8 case in `tests/domain/savings-dollars.test.ts` requires guessing the suffix; any guess other than 1,000 tokens fails the expected −$0.01931, and the Inputs column (\"cacheWrite 10,000: … cost.cacheWrite $0.215625; saving +500 tok\") gives no way to recover the intended value.",
      "recommendation": "Add \"suffix 1,000 tok\" to row 8's Inputs."
    },
    {
      "id": "STRUCT-R1-4",
      "severity": "minor",
      "location": "design.md — Module & File Placement, Modified table, `tests/infra/adapters/pi-jev-scorer-adapter.test.ts` row",
      "finding": "The row hedges with \"If the file is absent at `abaa6b0`, it is created at this path\", but the file exists in the tree at `abaa6b0` (`tests/infra/adapters/pi-jev-scorer-adapter.test.ts` sits alongside `pi-archive-adapter.test.ts`, `pi-context-adapter.test.ts` and `pi-notifier-adapter.test.ts`).",
      "rationale": "The Created/Modified split is the file list's structure, and the calibration rule requires statements about existing behavior to match cited evidence. A conditional whose condition the repository already decides leaves every reader to re-derive the placement the design declined to state.",
      "concrete_case": "A reviewer reconciling the file list against the tree must run the very check the design hedged on, and a coder drafting tasks.md from the document alone cannot tell whether this row is a create or a modify without opening the directory.",
      "recommendation": "State the row plainly as a modification of the existing file — it exists at `abaa6b0` — and drop the conditional."
    },
    {
      "id": "STRUCT-R1-5",
      "severity": "minor",
      "location": "design.md — Decisions, D7, \"Rounding\" paragraph",
      "finding": "The evidence claim \"over 100,000 random `(prompt, estimate)` pairs, `Math.round((prompt ÷ estimate) × estimate) === prompt` held for every one\" is the only measurement in the document with no cited source — no Chidi, M, T or ruling citation, unlike every other number in the Context section, D7 and the Risks table.",
      "rationale": "The feature-spec standard requires every statement about tested behavior to match cited evidence. The property is range-dependent — it holds for integer prompts below 2^52 at ordinary token magnitudes but not for denormal-range estimates — so the unstated generator range is load-bearing and an unsourced past-tense measurement cannot be audited.",
      "concrete_case": "A reader auditing the design's evidence cannot trace who ran the 100,000 pairs or over what range; a pair with prompt 3 and estimate 1e-320 gives 3 ÷ 1e-320 = Infinity in IEEE arithmetic, so `Math.round(Infinity × 1e-320) = Infinity ≠ 3` and the claim as worded is unverifiable and, unqualified, false.",
      "recommendation": "Cite the run (who, where, generator range), or restate it as the promised test's assertion — the publisher test already asserts a k = 0.6 response re-posts `contextInTurn` equal to the prompt — rather than as performed evidence."
    }
  ],
  "assumptions": [
    {
      "assumption": "The working tree is `main` at `abaa6b0` (brief and research-eleanor state it; `.git/HEAD` resolves to `refs/heads/main`; the commit hash was not independently resolved)",
      "status": "unverified"
    },
    {
      "assumption": "pi 1.5.2's SessionManager exposes both the no-arg `buildSessionProjection()` method and the root `buildSessionProjection(entries, leafId)` export, so D7's two projection forms are both real (session-manager.d.ts:178, :207, :328)",
      "status": "verified"
    },
    {
      "assumption": "`context.ts` holds the chars÷4 inversion (`budgetCharacters = 4 * (…)`, context.ts:63) and has exactly the five early returns D2/D9 name",
      "status": "verified"
    },
    {
      "assumption": "The `ArchiveStore` port already carries `getAll()` and `size()` with no member added (ports.ts)",
      "status": "verified"
    },
    {
      "assumption": "`buildStub` embeds the entry id in the stub prefix, making stubs unique per item (archived-output.ts)",
      "status": "verified"
    },
    {
      "assumption": "`createPiJevScorerAdapter(ctx, config)` currently drops `result.usage` on every path and throws on the `findOfType` miss before `classify`, so the optional-observer addition is the only seam that can see usage",
      "status": "verified"
    },
    {
      "assumption": "`createFakePi` exposes only `on`/`getSettings`/`marker` and `createContextStub`'s `sessionManager` only `getBranch`, matching the Modify row's premise; `pi-jev-scorer-adapter.test.ts` and `archive-session.test.ts` (with `extensionFactories`) exist in the tree",
      "status": "verified"
    },
    {
      "assumption": "pi-jefferson 0.14.0 contract behaviour relied on by D5/D9/D10 (registration before the first await, reports that cannot carry null or undefined, repaint dedupe on unchanged values, refusal and fault wording) rests on research-chidi A1–A5 and was not re-verified against the Jefferson repository",
      "status": "unverified"
    },
    {
      "assumption": "pi internals cited by line (runner.js `context_with_system` chaining, loader.js `assertActive`, `teardownCurrent`/reload paths, `model-runtime.js` classify try/catch) rest on the council's recorded scratch-session evidence and rulings; not re-read",
      "status": "unverified"
    },
    {
      "assumption": "Settled Round-1 findings (the holder and deferred reading, `classify` never rejects, the system prompt persisted as a `role: \"system\"` entry, stub uniqueness, `reportRecalled`'s reading shape, total context including the response) are binding and were not re-opened or independently re-checked",
      "status": "unverified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "pi-jefferson 0.14.0 sources (`instrument-contract.ts`, `registration-listener.ts`, `provider-fields.ts`, `bar.ts`) — Chidi's evidence in research-chidi.md, not re-read against /Users/joelleibow/Projects/pi-jefferson.",
    "pi 1.5.2 internals cited by line number (runner.js:1040–1068, loader.js:117-120 and :426-430, agent-session.js teardown and reload paths, model-runtime.js classify wrapping, compaction.js estimate rules) — relied on the council's recorded evidence and rulings.",
    "Whether Joel's Jefferson checkout diverges from the npm 0.14.0 tarball beyond the version string (research-chidi says the contract files are byte-identical; not re-diffed).",
    "The provenance and generator range of D7's 100,000-pair Math.round run.",
    "Whether Jefferson repaints while the classifier call is in flight, and whether it accepts the registration and each update — unverifiable from taiknr's side; already the design's Open Questions and Joel's live look.",
    "tasks.md — no tasks.md exists in the change directory yet, so design-to-tasks alignment is not checkable at this stage.",
    "The git commit hash of the working tree (only `.git/HEAD`'s ref was read)."
  ]
}