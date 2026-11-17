{
  "assumptions": [
    {
      "assumption": "The working tree is `main` at `abaa6b0` (brief and research-eleanor state it; the commit hash was not independently resolved)",
      "status": "unverified"
    },
    {
      "assumption": "All five round-1 and all four round-2 structural findings are folded into the current design.md, and the round-2 critic fixes landed as ruled: D2 defers to D5's \"Written at\" column and states only what changes with D4/D7 owning what is kept; the publisher has six event methods (`compacted`, `treeJumped`) with the empty-seed tree case named in D7 §5 and its registrar test; the window is out of the request reading and the Risks row counts projections per event; the figure types are placed in the use case; the rewrite baseline moves only on a priced response with the retry test priced by hand; `requestBuilt` takes and clears the stored recall reading first; and the delta's *When k is reseeded* and *One ratio per model* carry OD3(a)",
      "status": "verified"
    },
    {
      "assumption": "The repository placement facts: `ArchiveStore` carries `getAll()` and `size()` with no member added; `buildStub` embeds the entry id in the stub prefix (`archived-output.ts:52`); `context.ts` holds the chars÷4 inversion and exactly the five early returns; the scorer adapter drops `result.usage` on every path and throws on the `findOfType` miss before `classify`; `formatRecalledContext` is domain code (`recall.ts:34`); the seven registrars, `tests/support/fake-pi.ts`, `archive-session.test.ts`, `context.test.ts` and `pi-jev-scorer-adapter.test.ts` all exist in the tree; `tsconfig.json` has no `verbatimModuleSyntax` and `package.json` no `pi-jefferson` yet, matching the Created/Modified split",
      "status": "verified"
    },
    {
      "assumption": "`handler-gate.ts` wraps only `on` and tests `session.isActive()` synchronously, and `taiknr.ts` registers the raw-pi session-start handler before any gated registrar, so the gated `instruments-session-start` registrar sees ready state in the same tick (D1's ordering premise)",
      "status": "verified"
    },
    {
      "assumption": "The five spec deltas were read in full and the findings cite their current text",
      "status": "verified"
    },
    {
      "assumption": "The settled findings list (rulings 6–13, OD1–OD6 and their rejections, the retry measurement, the integer-estimate rounding, the window source, the scorer-adapter test's existence) is binding; each was checked against the current section text only to confirm it still holds, and none was reopened or independently re-measured",
      "status": "verified"
    },
    {
      "assumption": "pi-jefferson 0.14.0 contract behaviour relied on by D5/D9/D10 (registration before the first await, reports that cannot carry null or undefined, repaint dedupe on unchanged values, refusal and fault wording) rests on research-chidi A1–A5 and was not re-read against /Users/joelleibow/Projects/pi-jefferson",
      "status": "unverified"
    },
    {
      "assumption": "pi 1.5.2 internals cited by line (runner.js `context_with_system` chaining and per-handler catch, loader.js `assertActive`, agent-session.js retry and omission lines, compaction.js estimate rules) rest on the council's recorded scratch-session evidence and rulings; not re-read",
      "status": "unverified"
    }
  ],
  "findings": [
    {
      "concrete_case": "Request A is priced, so the baseline is A with `previousLength` 80. Request B carries a settlement's new stub at index 40 and its `messageEstimates` sum to 0 — the design's own response-test case — and its response is valid (not aborted, not an error, positive usage). Per D8 row (4) nothing is priced on B, the baseline stays A, and the next request C is charged Σ estimates[40, 80) at row (1). A test written from the delta's scenario instead asserts the charge on B, \"to the end of what the last request with a valid response carried\", and fails against the OD4(a)-correct implementation.",
      "finding": "The delta's dollar requirement and its *A warm request after taiknr's own change* scenario bound the charged rewrite suffix at \"the end of what the last request **with a valid response** carried\", while D8 fixes the baseline as \"the last request **a response priced**\" and keeps it there when a valid response goes unpriced (row (4): \"a valid response whose pending request's estimate is not above 0 … the rewrite baseline stays at the last priced request\"). The two homes for the baseline rule disagree on that named case: the delta's wording makes the estimate-0 request the charged request and the suffix bound, D8 keeps the last priced one.",
      "id": "STRUCT-R3-1",
      "location": "specs/context-figures/spec.md — requirement \"Dollar savings are net of cache rewrites and of recall's classifier spend\" (line 152) and its scenario *A warm request after taiknr's own change* (line 161), against design.md D8 \"Which message taiknr changed\" (line 324) and the response-state table row (4) (line 320)",
      "rationale": "One home per fact (feature-spec-standard §1). OD4(a) ruled the baseline's promotion in design.md, and the round-2 fix that conformed the delta's *When k is reseeded* and *One ratio per model* scenarios to OD3(a) (CR-S3-R2-4) left the dollar requirement's OD4 gloss one ruling behind. The delta's own validity definition (\"a valid response is not aborted, not an error and its usage is positive\", *An invalid response is not a sample*) makes the divergence behavioural rather than verbal: a valid response with a zero-estimate pending request is valid by the delta and unpriced by D8.",
      "recommendation": "Amend the requirement and the scenario from \"the last request with a valid response\" to \"the last request a response priced\" (equivalently, \"the last priced request\"), matching OD4(a). The retry path the ruling was made for already agrees under both wordings, because an errored or aborted response is not valid, so this conforms the delta to the ruling without touching any settled case.",
      "severity": "minor"
    },
    {
      "concrete_case": "A coder declares `Pair` in `src/infra/adapters/pi-instrument-readings.ts`, beside the six readers that produce it from `ctx.model` and the branch, then types the ratio table and `RequestReading` with it in `instruments-publisher.ts`: the use case now imports `src/infra/`, `npm run check` stays green, and the inversion surfaces only if a reviewer happens to run an import-direction check that no scenario names.",
      "finding": "The design names the declaring module of every new type except `Pair`. D3 places the `<Event>Readings` interfaces, `FigureKey`, `FigureValues`, `Publication` and the `InstrumentSink`/`ClassifierObserver`/`InstrumentsHolder` interfaces in `src/use-cases/instruments-publisher.ts`; `Pair` — \"(provider, model id)\", defined in prose at D7 step 1 — is carried by the use case's `RequestReading` (design.md:254) and ratio-table key, produced by the infra readings, and selected over by the domain calibration module, but its declaring module is nowhere stated.",
      "id": "STRUCT-R3-2",
      "location": "design.md — Decisions, D3 (\"Each `<Event>Readings` is a plain-data interface declared in this file\") and D7's `readRequest` sketch (line 254, `pair: Pair or undefined`), against the Created table's rows for `src/domain/calibration.ts`, `src/use-cases/instruments-publisher.ts` and `src/infra/adapters/pi-instrument-readings.ts`",
      "rationale": "feature-spec-standard §3 puts every type in one canonical place, and ADR 0001 fixes the direction: infra imports use cases, never the reverse. The natural-looking placement is `pi-instrument-readings.ts`, where pairs are produced — and that inverts the dependency in a way no gate catches: the boundary scenario's `rg` reads only `@earendil-works/pi-` and `pi-jefferson` imports, and `npm run check` does not test intra-repository import direction. This is the same defect class as round 2's STRUCT-R2-3, whose fix named the figure types' home; `Pair` is the one type that fix left unnamed.",
      "recommendation": "Add one sentence to D3 (or to D7 step 1): `Pair` is declared in `src/domain/calibration.ts` — or beside the readings in `src/use-cases/instruments-publisher.ts` — and every other layer imports it downward.",
      "severity": "minor"
    },
    {
      "concrete_case": "The docs writer works the pass from the design's sentence, opens `specs/extension-packaging/spec.md`, and finds three requirements none of which mentions the README — then either re-derives the requirement from the proposal's Documentation impact (J6; T1–T3; ruling 21) or files a question, in the pass Joel's standing ruling keeps ungated.",
      "finding": "The sentence says README \"gains … the measurement and calculation explanation the `extension-packaging` and `jefferson-instruments` deltas require\", but the extension-packaging delta carries no documentation requirement: its three requirements are the load check, the frozen-signature and boundary list, and the type-only devDependency. The explanation and the example rows are required by the jefferson-instruments delta's documentation requirement, and the switch's row by the configuration delta.",
      "id": "STRUCT-R3-3",
      "location": "design.md — \"Project documentation, in the docs pass\", first sentence (line 111), against specs/extension-packaging/spec.md and specs/jefferson-instruments/spec.md",
      "rationale": "feature-spec-standard §6 requires every statement about the existing artifacts to match them, and the docs pass is ordered by exactly these citations. A wrong source in the work order points the writer at a delta that holds nothing to write from and hides the requirement's actual citations one file away.",
      "recommendation": "Drop `extension-packaging` from the sentence — \"the measurement and calculation explanation the `jefferson-instruments` delta requires\" — keeping the configuration delta as the citation for the switch's row if a citation is wanted there at all.",
      "severity": "minor"
    }
  ],
  "lens": "council-structural",
  "mode": "review",
  "not_checked": [
    "pi-jefferson 0.14.0 sources under /Users/joelleibow/Projects/pi-jefferson (instrument-contract.ts, registration-listener.ts, provider-fields.ts, bar.ts) — Chidi's recorded evidence was relied on, not re-read.",
    "pi 1.5.2 internals cited by line number (runner.js, loader.js, agent-session.js, agent-session-runtime.js, model-runtime.js, compaction.js) — the council's recorded scratch-session evidence and rulings were relied on.",
    "The npm registry install of `pi-jefferson@0.14.0` and the resulting lockfile (D10's command and CB-10's outcome) — not run.",
    "Michael's 100,000-pair Math.round rounding run — cited in D7 as (Michael, Stage 2, C3), not re-executed; the settled integer-estimate finding covers its conclusion.",
    "`michael-orientation.md` — read only by targeted search to confirm the §O1–§O9 items the design cites exist; not read in full.",
    "Whether Jefferson repaints, or coalesces repaints, across the synchronous reports a `message_end` emits, and whether it accepts the registration and every update — unverifiable from taiknr's side; already the design's Open Questions and Joel's live look.",
    "Whether the estimate-0 pending case of D8 row (4) is reachable in a real session (a system message alone estimates above 0); STRUCT-R3-1's divergence stands on the design's own named test case either way.",
    "tasks.md — still absent from the change directory, so design-to-tasks alignment is not checkable at this stage.",
    "The git commit hash of the working tree (only the brief's statement that it is `main` at `abaa6b0`)."
  ],
  "owner_questions": [],
  "paraphrase_existing": "Today taiknr runs as a pi 1.5.2 extension with seven lifecycle registrars behind the single `enabled` gate in `handler-gate.ts`: `turn_end` stages large tool results, `agent_before_settle` drafts the stub `context_edit`s plus one side-store entry and writes the in-memory store, the hydration events (`session_start`, `session_tree`, `session_compact`) rebuild that store from the branch, and recall appends one `<recalled_context>` block to the latest user message inside `context_with_system`, with exactly five early returns before it. The store keeps each item's `stub` (each embedding its entry id) and `rawText`; `formatRecalledContext` is domain code; nothing measures token sizes and nothing publishes anything. pi's own context reading falls back to characters ÷ 4 over the whole projection after every settlement, sitting 38–41 % below the next request's real prompt.",
  "paraphrase_proposes": "Six publishing registrars — `session_start`, `context_with_system`, `message_end` (assistant only), `agent_settled`, `session_compact`, `session_tree` — each feed one per-session use-case publisher through a holder built in `taiknr.ts`, which holds a no-op until the `session_start` registrar reads the new `jeffersonInstruments` switch and installs the real publisher, registering and posting every opening field synchronously before its first `await`. The publisher serves four Jefferson instruments over 17 fields: the six context figures, per-request and since-start savings in tokens and signed dollars net of rewrite charges (the suffix charged only up to the last priced request's end, the candidate baseline promoted only by a priced response) and of recall's classifier spend, a decision-in-flight indicator fed by an observer at the scorer adapter, the window, and one uncalibrated flag, with every token figure k × one estimate under a per-model-pair ratio seeded from the branch at start and tree, kept live at `/tree`, and refreshed by each valid response under its own pair. Host state reaches the publisher only through one deferred reading per event (the request reading built from recall's returned messages, the stored recall reading taken and cleared first by `requestBuilt`), the arithmetic lives in four new domain modules, and `pi-jefferson` 0.14.0 joins as a type-only devDependency enforced by `verbatimModuleSyntax`, with every emit through one bus adapter that catches silently.",
  "recommendation": "Approve with minor edits: the design is ready for tasks.md once three one-clause precision fixes land. Every round-1 and round-2 finding re-checked landed as ruled — D2 defers to D5's \"Written at\" column and states only what changes, the publisher has six event methods with the empty-seed tree case named and tested, the window is out of the request reading and the Risks row counts projections per event, the figure types are placed in the use case, the rewrite baseline moves only on a priced response with the retry test priced by hand, `requestBuilt` takes and clears the stored recall reading first, and the delta's calibration scenarios carry OD3(a) — and layering, one-home rules, structural completeness against the feature-spec standard and the calibrated claims all verify against the tree, the deltas and the recorded evidence. Three minor defects remain: the context-figures delta's \"the last request with a valid response\" gloss has been left one ruling behind OD4(a) and diverges from D8 on the design's own estimate-0 test case (STRUCT-R3-1); the `Pair` type's declaring module is unstated, the one type round 2's fix left unnamed, with an unguarded infra-placement inversion as the risk (STRUCT-R3-2); and the docs-pass paragraph attributes the README explanation to the extension-packaging delta, which carries no documentation requirement (STRUCT-R3-3). None is blocking, none changes an approach, a requirement's substance or a settled ruling, and none goes to Joel."
}