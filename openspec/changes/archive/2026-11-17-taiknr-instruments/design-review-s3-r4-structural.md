{
  "mode": "review",
  "lens": "council-structural",
  "paraphrase_proposes": "Six publishing registrars — `session_start`, `context_with_system`, `message_end` (assistant only), `agent_settled`, `session_compact`, `session_tree` — each feed one per-session use-case publisher through a holder built in `taiknr.ts`, which holds a no-op until the `session_start` registrar reads the new `jeffersonInstruments` switch and installs the real publisher, registering and posting every opening field synchronously before its first `await`. The publisher serves four Jefferson instruments over 17 fields: the six context figures, per-request and since-start savings in tokens and signed dollars net of rewrite charges (the suffix charged only up to the last priced request's end, the candidate baseline promoted only by a priced response) and of recall's classifier spend, a decision-in-flight indicator fed by an observer at the scorer adapter, the window, and one uncalibrated flag — every token figure k × one estimate under a per-model-pair ratio table seeded at start and tree, kept live at `/tree`, and refreshed by each valid response under its own pair. Host state reaches the publisher only through one deferred reading per event, each carrying the current pair taken by one shared `readPair(ctx)` (round 3's fix), with `requestBuilt` taking and clearing the stored recall reading as its first statement. The arithmetic lives in four new domain modules — including `Pair` in `calibration.ts`, round 3's other fix — and `pi-jefferson` 0.14.0 joins as a type-only devDependency enforced by `verbatimModuleSyntax`, with every emit through one bus adapter that catches silently.",
  "paraphrase_existing": "Today taiknr runs as a pi 1.5.2 extension with seven lifecycle registrars behind the single `enabled` gate in `handler-gate.ts`: `turn_end` stages large tool results, `agent_before_settle` drafts the stub `context_edit`s plus one side-store entry and writes the in-memory store, the hydration events (`session_start`, `session_tree`, `session_compact`) rebuild that store from the branch, and recall appends one `<recalled_context>` block to the latest user message inside `context_with_system`, with exactly five early returns before it. The store keeps each item's `stub` (each embedding its entry id) and `rawText`; `ArchiveStore` already carries `getAll()` and `size()`; `formatRecalledContext` is domain code; nothing measures token sizes and nothing publishes anything. pi's own context reading falls back to characters ÷ 4 over the whole projection after every settlement, sitting 38–41 % below the next request's real prompt.",
  "recommendation": "Approve with one minor edit; the design is ready for tasks.md once it lands. All four round-3 fixes verify as ruled: every event reading now carries the current pair from one `readPair(ctx)` with the publisher remembering no pair between events (D2's four reading cells, D3's reading paragraph, D7 step 5, the Risks row's pair clause, and the readings/publisher test rows); `Pair` is declared in `src/domain/calibration.ts` and imported inward (D7 step 1); the context-figures delta's rewrite-baseline gloss reads \"the last priced request\" with the priced-when clause; and the docs-pass paragraph now cites the configuration and jefferson-instruments deltas. Layering, the one-home rules, structural completeness against the feature-spec standard, and every other calibrated claim verify against the tree, the five deltas and the recorded evidence, and no settled finding was reopened. One unswept calibrated claim remains in the Context section: \"median 0.04 % and worst 4.99 % across whole sessions\" presents one session's numbers as the four-session result its own citation names, where the recorded worst is 5.62 % and the short sessions reach 8.83 %; the fix is one clause, no decision turns on it, and it is Michael's own wording choice between the two options in the finding.",
  "findings": [
    {
      "id": "STRUCT-R4-1",
      "severity": "minor",
      "location": "design.md — Context, bullet \"What the calibration can and cannot claim\" (line 27), against research-chidi.md §C (ctx-calib table, lines 200–204, and \"Differences from the supplied assumptions\", line 209) and michael-orientation.md line 243",
      "finding": "The bullet's headline \"k = prompt tokens ÷ the estimate of the request that produced them reproduces real prompts to a median 0.04 % and worst 4.99 % across whole sessions\" is scoped by its own parenthesis to \"four of Joel's sessions\", but 0.04 % / 4.99 % is one session's row — taiknr `…01a1dd10`'s. Across the four sessions the citation names, ctx-calib's medians run 0.02–0.04 % and its worst is 5.62 % (`…01a1dc3d`), and the short sessions Chidi also ran reach a worst of 8.83 % (`…01a1dc97`). The sentence understates the worst measured whole-session error at the scope it states.",
      "rationale": "feature-spec-standard §6: every statement about tested behaviour must match cited evidence, and this claim is the design's own motivation for the k-ratio (G3, D7). The approved orientation words the same evidence scope-true — \"median 0.04 % over whole sessions, worst 5 % on long ones and 8.8 % on short ones\" (michael-orientation.md:243) — while the design dropped the long/short distinction and inherited the flagship session's exact numbers, the session M1–M4 replay. No previous round swept this sentence and no settled finding covers it; the M1 (0.06 % / 0.48 %) and M4 figures in the same bullet verify, so this is the one clause in the Context evidence that fails its citation.",
      "concrete_case": "An engineer auditing the calibration claim before trusting the figures opens research-chidi.md §C: the ctx-calib table gives `…01a1dc3d` a worst prediction miss of 5.62 % and `…01a1dc97` a worst of 8.83 %, so the design's \"worst 4.99 %\" fails its own citation — a reader calibrating her expectation of the ratio rule's worst whole-session miss on it would under-anticipate the measured worst by up to 3.8 percentage points, and the sentence cannot be reconciled with the evidence it names without guessing that `…01a1dd10` alone was meant.",
      "recommendation": "One clause, either option: restore the orientation's scope-true wording (\"to a median 0.04 % over whole sessions, worst 5 % on long ones and 8.8 % on short ones\"), or keep the exact pair and attribute it (\"to a median 0.04 % and worst 4.99 % on `…01a1dd10`, the session M1–M4 replay; medians 0.02–0.04 % and worst 5.62 % across the four sessions Chidi ran\"). No decision changes: the flag rides beside every figure regardless (J11), and the M3 settlement-scale caveat already follows in the same bullet."
    }
  ],
  "assumptions": [
    {
      "assumption": "The working tree is `main` at `abaa6b0` (brief and research-eleanor state it; the commit hash was not independently resolved)",
      "status": "unverified"
    },
    {
      "assumption": "All four round-3 fixes landed as ruled and were checked against the current text: the pair rides every event reading from one `readPair(ctx)` (D2's four reading cells, D3's reading paragraph and eager-values sentence, D7 step 5, the Risks row's pair clause, the readings and publisher test rows), with the publisher remembering no pair between events; `Pair` is declared in `src/domain/calibration.ts` and imported inward (D7 step 1); the context-figures delta's baseline gloss reads \"the last priced request\" with the priced-when clause (requirement and *A warm request after taiknr's own change*); the docs-pass paragraph cites the configuration and jefferson-instruments deltas",
      "status": "verified"
    },
    {
      "assumption": "Repository placement facts re-checked this round: `ArchiveStore` carries `getAll()` and `size()` with no member added (ports.ts); `buildStub` embeds the entry id in the stub prefix (archived-output.ts); `context.ts` holds the chars÷4 inversion and exactly the five early returns, and calls `createPiJevScorerAdapter` with `ids` computed before `classify`; the seven registrars exist in `src/infra/pi-event-handlers/`; `session-start.ts:16–17` is the two-path config resolution D6 cites, on raw `pi` with no `await`",
      "status": "verified"
    },
    {
      "assumption": "The M1, M3 and M4 figures the Context section cites (38.0–41.2 % below at all 33 settlements, median 39.4 %; calibrated median 0.06 % and at most 0.48 %; ~340-token median miss against ~1,200 median saving, 21 % at median and 130 % at p90; 441 requests, gross $2.80, penalty $0.25, net +$2.55, 20 net-negative, −$0.007 mid-session) match michael-orientation.md's M-tables",
      "status": "verified"
    },
    {
      "assumption": "pi-jefferson 0.14.0 contract behaviour relied on by D5/D9/D10 (registration before the first await, reports that cannot carry null or undefined, repaint dedupe, refusal and fault wording) rests on research-chidi A1–A5 and was not re-read against /Users/joelleibow/Projects/pi-jefferson",
      "status": "unverified"
    },
    {
      "assumption": "pi 1.5.2 internals cited by line (runner.js `context_with_system` chaining and per-handler catch, loader.js `assertActive`, agent-session.js retry/omission/branch/`_limitsModel` lines, compaction.js estimate rules, model-runtime.js classify wrapping) rest on the council's recorded scratch-session evidence and rulings; not re-read",
      "status": "unverified"
    },
    {
      "assumption": "The settled findings list is binding; each was checked against the current section text only to confirm it still holds, and none was reopened or independently re-measured",
      "status": "verified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "pi-jefferson 0.14.0 sources under /Users/joelleibow/Projects/pi-jefferson (instrument-contract.ts, registration-listener.ts, provider-fields.ts, bar.ts) — Chidi's recorded evidence was relied on, not re-read.",
    "pi 1.5.2 internals cited by line number (runner.js, loader.js, agent-session.js, agent-session-runtime.js, model-runtime.js, compaction.js, settings-defaults.js) — the council's recorded scratch-session evidence and rulings were relied on.",
    "The npm registry install of `pi-jefferson@0.14.0` and the resulting lockfile (D10's command and CB-10's outcome) — not run.",
    "Michael's 100,000-pair Math.round rounding run — cited in D7 as (Michael, Stage 2, C3), not re-executed; the settled integer-estimate finding covers its conclusion.",
    "michael-orientation.md — read by targeted search for the M1/M3/M4 tables and line 243 only; not read in full.",
    "Whether Jefferson repaints while the classifier call is in flight, and whether it accepts the registration and every update — unverifiable from taiknr's side; already the design's Open Questions and Joel's live look.",
    "tasks.md — still absent from the change directory, so design-to-tasks alignment is not checkable at this stage.",
    "The git commit hash of the working tree (only the brief's statement that it is `main` at `abaa6b0`)."
  ]
}