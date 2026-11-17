{
  "mode": "review",
  "lens": "council-codebase",
  "paraphrase_proposes": "The plan implements the four taiknr instruments in fifteen ordered groups: pin `pi-jefferson@0.14.0` and turn on `verbatimModuleSyntax`; build the domain rules (character estimate, six figures, calibration, dollar table); build the per-session publisher, the holder and the shared test fake; declare the Jefferson fields and the bus adapter; write one reading per publishing event; add the `jeffersonInstruments` switch; observe the classifier at the scorer adapter and report recall's block; add six publishing registrars; wire them in `taiknr.ts` and re-run every proof plus the load check, with Joel's live look left as his own group.",
  "paraphrase_existing": "At `abaa6b0` taiknr is a pi extension whose factory registers seven lifecycle handlers through `createGatedPi` (`session_start` stays on the raw api): recall appends one block to the latest user message inside `context_with_system` and keeps its chars-÷-4 budget inversion in `context.ts`; settlement, hydration and staging fill an in-memory `ArchiveStore` served by `getAll()`/`size()`; the classifier seam is `createPiJevScorerAdapter(ctx, config)`, whose `classify` result carries `usage.cost.total` that nothing reads; and nothing publishes anything. `tsconfig.json` has no `verbatimModuleSyntax`, `biome.json`'s allowlist covers `src/`, `tests/` and four root files, and the suite is 22 test files green.",
  "recommendation": "Not implementation-ready as written, but close: one blocking layering contradiction (group 3 has the domain module reading the `ArchiveStore` port, which both its own previous task and design.md's placement rule forbid), one major unsettled interface (group 4 leaves the ratio table's home and every export of `calibration.ts` and `context-figures.ts` to the coder, which no check would catch), and eight small claims that will not verify as stated (one existing config test that must change, two mis-cited scenario/symbol references, an `rg` check that cannot pass, a fake whose `model` option cannot express `pi-virtual`, the 328 baseline, the AGENTS.md `session_start` trap, and one boundary case in the wrong layer). Every path, symbol and current-state reference in the File Boundary checks out against disk and the Create/Modify lists reconcile exactly with `design.md`; fixing the eleven items is a handful of sentences plus one interface decision, then re-running group 14.",
  "findings": [
    {
      "id": "CB-1",
      "severity": "blocking",
      "location": "tasks.md 3.2 (Code) vs 3.1 (Code); design.md Module & File Placement, `src/domain/context-figures.ts` row",
      "finding": "Task 3.2 tells the coder the archive totals and stub matching in `src/domain/context-figures.ts` read \"the `ArchiveStore` port's `getAll()` and `size()` and nothing else\", but `ArchiveStore` is declared in `src/use-cases/ports.ts`, and both task 3.1 (\"importing `token-estimate.ts` and the `ArchivedToolOutput` shape only\") and design.md's placement rule (\"`src/domain/` imports nothing outside `src/domain/`\") forbid that import.",
      "rationale": "Two artifacts in the same group contradict each other at a layer boundary, so the coder must choose one: import a use-case port upward into domain, or change the function to take plain data. Nothing in the plan's own checks catches the inversion — task 14.2's boundary `rg` only looks for `@earendil-works/pi-` and `pi-jefferson` imports, not the domain→use-cases direction — so either choice lands green.",
      "concrete_case": "Derek writes `archiveTotals(store: ArchiveStore, k)` in `src/domain/context-figures.ts`. `import type { ArchiveStore } from \"../use-cases/ports.js\"` compiles, passes `tsc`, passes `biome`, and passes both boundary `rg` checks in 9.1 and 14.2 — a permanent inversion of the layering the design states, unwitnessed by any test.",
      "recommendation": "Fix task 3.2's Code line to `... reading the archive's items as plain data — the count, the summed `rawText`, the summed `stub` — which the publisher passes from the `ArchiveStore` port it holds (D3)`. That keeps `src/domain/` self-contained and matches design.md's own row (\"New arithmetic with no host access\") and D3's \"the publisher reads it through the `ArchiveStore` port it holds\"."
    },
    {
      "id": "CB-2",
      "severity": "major",
      "location": "tasks.md 4.1–4.3; design.md D7 step 5 and the `src/domain/calibration.ts` placement row; tasks.md \"How this plan is executed\", names paragraph",
      "finding": "The plan never settles what `src/domain/calibration.ts` and `src/domain/context-figures.ts` export, and tasks 4.1–4.3 test table-level transitions (\"a session start replaces the whole table with seeds, each not live\"; \"a `/tree` jump keeps every live entry and reseeds the rest\") that design.md D7 places in the publisher's own state, while the design gives `calibration.ts` only \"selecting k for a model pair, and the uncalibrated flag's state\".",
      "rationale": "The standard's zero-decision rule requires public names, exports and data shapes settled before implementation; the tasks header explicitly claims \"Nothing else is chosen by the coder\", which is not true of these two modules. The same behaviour is claimed as a proof in two layers (4.2 in the domain test, 6.6 in the publisher test) with no stated division of labour, so the coder both invents the interface and decides where the ratio table lives.",
      "concrete_case": "Derek must pick the shape of the ratio table and the signatures of, at minimum, `context-figures.ts`'s six-figure function (or three: request figures, saving, archive totals), its stub matcher, and `calibration.ts`'s validity/k/flag/seed/reseed functions. Two implementers produce two different public APIs with identical behaviour, and no test, `tsc` check or `rg` in the plan can tell which one the design wanted.",
      "recommendation": "Add one sentence to 4.1 and one to 3.1 fixing each module's exports by name and signature (e.g. `kFor(entry, pair)`, `isUncalibrated(entry)` over `{ k, live }`, `seedSamples(samples)`, `reseed(table, seeds)` in `calibration.ts`; `requestFigures(reading, k)`, `archiveTotals(items, k)`, `matchStubs(toolResults, items)` in `context-figures.ts`), and state which of the table's transitions the domain owns versus the six publisher methods of D2."
    },
    {
      "id": "CB-3",
      "severity": "minor",
      "location": "tasks.md 6.1 (Code) and the File Boundary Create row for `src/use-cases/instruments-publisher.ts`",
      "finding": "`InstrumentPublisher` — the type the holder's `current()` returns and the no-op implements — is missing from the list of types declared in `instruments-publisher.ts` (the tasks list only `FigureKey`, `FigureValues`, `Publication`, `InstrumentSink`, `ClassifierObserver` and `InstrumentsHolder`), although design.md D3/D1 name it.",
      "rationale": "Task 7.1's holder and task 6.x's six method signatures both depend on that one interface, and the tasks header's list of \"names the design fixes\" omits it, so a coder working from tasks.md alone must infer the name the holder's return type takes.",
      "concrete_case": "Writing `src/app/extension/instruments-holder.ts`, Derek needs a type for the installed publisher; the tasks name `InstrumentsHolder` but not what `current()` returns, so he either invents a name or goes back to design.md D3's prose.",
      "recommendation": "Add `InstrumentPublisher` (with its six event methods plus `reportRecalled`, `started`, `finished`) to task 6.1's Code line and to the File Boundary's \"declares ...\" clause."
    },
    {
      "id": "CB-4",
      "severity": "minor",
      "location": "tasks.md 11.1 (Verified); tests/config/taiknr-config.test.ts:228–241",
      "finding": "Task 11.1 claims \"the rest of the file's tests unchanged and green\", but `tests/config/taiknr-config.test.ts`'s `test(\"the known fields accept their valid values\")` loads a file naming all six known fields and asserts `toEqual` against an explicit six-key literal; adding `jeffersonInstruments` to the returned object makes that assertion fail.",
      "rationale": "`toEqual` is exact on keys, so the test cannot pass unchanged, and the plan says it will. The rest of the file's whole-object assertions are safe because they compare against `DEFAULT_TAIKNR_CONFIG`, which gains the field with the default.",
      "concrete_case": "After 11.1, `npm run test` reports `expected { decisionThreshold: 0.5, ..., enabled: true, jeffersonInstruments: true } to deeply equal { ...six keys }` at `tests/config/taiknr-config.test.ts:233`, inside a task whose verification says the file's other tests are unchanged.",
      "recommendation": "Name that edit in 11.1: the input JSON at line 230 and the expected literal at 233–240 each gain `\"jeffersonInstruments\":true` / `jeffersonInstruments: true`."
    },
    {
      "id": "CB-5",
      "severity": "minor",
      "location": "tasks.md 6.2 (Scenarios) and 12.2 (Scenarios); specs/context-figures/spec.md",
      "finding": "Both tasks cite `context-figures` *Recall's block in usage but not in history*, which does not exist in that delta. The scenario by that name lives in `specs/jefferson-instruments/spec.md:226` and its body is a README-documentation check (\"WHEN the README is read\"), which the plan itself routes to the docs pass.",
      "rationale": "The scenario title is used as the proof for the publisher half (6.2) and the report half (12.2), so a coder checking off the scenario cannot find it where the tasks point, and the behaviour it names is actually proven by *Context in turn, before and after the response* and *A recall turn leaves total context alone*.",
      "concrete_case": "Derek greps `specs/context-figures/spec.md` for the title at the end of task 6.2 and finds nothing; the only hit is a documentation scenario in another delta that no test is supposed to prove.",
      "recommendation": "Replace both citations with `context-figures` *Context in turn, before and after the response* (the publisher half) and *A recall turn leaves total context alone* (the report half)."
    },
    {
      "id": "CB-6",
      "severity": "minor",
      "location": "tasks.md 13.1 (Verified); src/config/taiknr-config.ts:22, 47–66, 99–106",
      "finding": "Task 13.1's check \"`rg` finds `jeffersonInstruments` read nowhere else in `src/`\" cannot pass as written: task 11.1's own change puts the key in `src/config/taiknr-config.ts` four times — the `TaiknrConfig` member, the `DEFAULT_TAIKNR_CONFIG` value, the required `FIELD_RULES` entry (the mapped type forces one) and the `layered(\"jeffersonInstruments\", documents)` call in `loadTaiknrConfig`.",
      "rationale": "The `configuration` spec's *One reader* means no other handler tests the switch, not that the string appears once; a check that cannot pass as stated costs the coder a decision about whether the config hits are acceptable and risks a false red at the gate.",
      "concrete_case": "Derek runs `rg jeffersonInstruments src/` at the end of 13.1 and gets four hits in `src/config/taiknr-config.ts` before the one in `instruments-session-start.ts`, and has to decide whether the task failed.",
      "recommendation": "Reword to: \"`rg jeffersonInstruments src/` shows `src/config/taiknr-config.ts` (member, default, field rule, layering) and `src/infra/pi-event-handlers/instruments-session-start.ts` and nothing else — no other handler or registrar tests the switch.\""
    },
    {
      "id": "CB-7",
      "severity": "minor",
      "location": "tasks.md 10.1 (Failing test first) and 8.1 / File Boundary Modify row for tests/support/fake-pi.ts; tests/support/fake-pi.ts:41–52",
      "finding": "Task 10.1 requires `pi-virtual` cases (`ctx.model.api === \"pi-virtual\"`, design D7 step 1), but `createContextStub`'s `model` option is typed `{ provider: string; id: string }` with no `api`, and neither task 8.1's three listed changes nor the File Boundary row mentions widening it.",
      "rationale": "The fake is the one fixture every reading and registrar test goes through, so an unlisted change to it is an unstated boundary edit; the alternative is an `as unknown as` cast inside two test files, which is the kind of drift the shared fake exists to prevent.",
      "concrete_case": "`createContextStub({ cwd: \"/work\", trusted: false, model: { api: \"pi-virtual\", provider: \"p\", id: \"m\" } })` fails `tsc` with TS2353 (object literal may only specify known properties) in `tests/infra/adapters/pi-instrument-readings.test.ts`.",
      "recommendation": "Add `api?: string` to `createContextStub`'s `model` option to task 8.1's change list and to the File Boundary's `tests/support/fake-pi.ts` row."
    },
    {
      "id": "CB-8",
      "severity": "minor",
      "location": "tasks.md \"How this plan is executed\" (the baseline paragraph), 1.1, 1.2, 8.1 (Verified); redgreen-derek.md \"Red, at `abaa6b0`\"",
      "finding": "The plan fixes the base at \"the exact baseline count\" of 328 tests and has three tasks verify \"still green at 328 tests\", but `redgreen-derek.md`'s own red run over the same base reports 323 tests total (14 failed, 309 passed) with the final check set, so the two documents cannot both describe `abaa6b0`.",
      "rationale": "The red copy contains the base's 22 files plus the new ones and modifies only three of them, so a 328-test base plus new assertion failures cannot total 323; either the base count is stale or the spike's count excludes cases. A coder told to expect 328 will not know whether a different number is a defect, and the plan's claim that \"no task asserts a total test count\" is contradicted by three tasks that do.",
      "concrete_case": "At the end of 1.1 the coder runs `npm run check` and reads `Tests 3xx passed (3xx)`; if it is not 328 the plan gives no way to tell whether the dependency install changed something or the baseline was mis-measured.",
      "recommendation": "Either re-measure `abaa6b0` once and put the number in, or word 1.1/1.2/8.1 as \"green at the base's own count, unchanged\" — the second is what the plan's own \"no task asserts a total\" rule wants."
    },
    {
      "id": "CB-9",
      "severity": "minor",
      "location": "AGENTS.md Traps (\"`session_start` stays on the raw host API\"); tasks.md §13 preamble, 13.1, 14.1; specs/jefferson-instruments/spec.md:173",
      "finding": "The plan says every publishing registrar — `instruments-session-start.ts` included — is called \"through the gated pi\", while AGENTS.md's trap says `session_start` deliberately stays on the raw host api, and the tasks never say why this registrar differs. The unstated consequence: because registration happens only in a gated `session_start`, turning taiknr back on mid-session registers no instruments until the next session.",
      "rationale": "A coder reading AGENTS.md first (as the house conventions say to) will register the new `session_start` handler on the raw `pi`, and then 13.1's \"a rejected config never reaches the reader, because the gate skips it\" and the `configuration` spec's *One reader* cannot both hold. The mid-session re-enable is the mirror of the documented *Turning off mid-session* and is nowhere recorded.",
      "concrete_case": "Registered on the raw `pi`, the handler runs on a rejected config where `session.state` is `{ status: \"rejected\", error }`, so reading `state.config.jeffersonInstruments` does not type-check (TS2339) and the gate-skip case in 13.1 has nothing to observe.",
      "recommendation": "One clause in 13.1 and 14.1: this `session_start` registrar takes the gated pi (unlike the existing one, whose raw registration AGENTS.md's trap protects) because instruments must not register on a rejected or disabled session, and it runs after `registerSessionStartHandler` has resolved the config. Note the mid-session re-enable gap beside *Turning off mid-session* as deferred to the `/taiknr` card."
    },
    {
      "id": "CB-10",
      "severity": "minor",
      "location": "tasks.md 5.1 (Failing test first, Boundary cases); design.md D8",
      "finding": "Task 5.1's boundary cases include \"no cost object at all\" in `tests/domain/savings-dollars.test.ts`, but the same line fixes the module as \"taking numbers only\", where an absent cost object is unrepresentable; design D8 puts that state in response-state row (2), whose test is 6.3/13.3.",
      "rationale": "Either the domain function takes a usage-like object with an optional `cost` (contradicting \"numbers only\" and D8's \"Rates, each from that response\" as numbers) or the case cannot be written where the task puts it — a small but real zero-decision violation at the module's edge.",
      "concrete_case": "Writing `tests/domain/savings-dollars.test.ts`, Derek has no argument to pass for \"no cost object at all\": `inputRate`, `readRate` and `writeRate` are numbers, so he must either invent a `cost?: {...} | undefined` parameter or drop the case.",
      "recommendation": "Move that case to 6.3's list (row (2), the zero-token fallback) and leave 5.1's domain cases as the numeric edges it already lists plus rows 1–11 and 13–15."
    },
    {
      "id": "CB-11",
      "severity": "minor",
      "location": "tasks.md 13.1 (Code); src/config/session-config.ts:3–7; src/infra/pi-event-handlers/context.ts:52–54",
      "finding": "`instruments-session-start.ts`'s dep is the `SessionConfig` holder, whose `state` is a three-way union, so reading `state.config.jeffersonInstruments` needs a `state.status !== \"ready\"` early return even though the gate already guarantees `isActive()`. Task 13.1's code line describes the switch read and the four synchronous steps but not that guard.",
      "rationale": "The types force the guard, so it is not optional; leaving it unstated means the coder writes a null check the plan does not describe and no test covers, in a handler whose \"the gate skips it\" case asserts the branch is unreachable in production. The house pattern exists (`context.ts` opens with exactly that check), so one clause removes the guess.",
      "concrete_case": "`const { state } = deps.session; state.config.jeffersonInstruments` fails `tsc` with TS2339 because `config` does not exist on `{ status: \"unresolved\" }`.",
      "recommendation": "Add to 13.1: \"the body opens with the same `if (state.status !== \"ready\") return;` guard `context.ts` uses, for the type rather than for production.\""
    }
  ],
  "assumptions": [
    {
      "assumption": "Every existing path cited as current state exists and matches: `src/app/extension/taiknr.ts` registers 7 handlers with `session_start` on the raw pi; `src/infra/pi-event-handlers/context.ts` holds the only `4 *` inversion in `src/` (line 63) and its five early returns; `src/infra/adapters/pi-jev-scorer-adapter.ts` takes `(ctx, config)` and throws on the catalog miss before `classify`; `src/use-cases/ports.ts` has `size()`/`getAll()` with no member needed; `formatRecalledContext` is at `src/domain/recall.ts:34`; `tests/support/fake-pi.ts` has `createFakePi`/`createContextStub` without `events` or `buildSessionProjection`; `tests/app/extension/taiknr.test.ts` reads 7 entries; `tests/app/extension/archive-session.test.ts` already takes `extensionFactories` and a classifier guard.",
      "status": "verified"
    },
    {
      "assumption": "The 30 Create and 13 Modify entries reconcile exactly with `design.md`'s Created/Modified tables (15 src + 15 tests created, 13 modified), no Delete is needed, and the excluded `tests/infra/pi-event-handlers/instruments-events.test.ts` is the spike's consolidation only.",
      "status": "verified"
    },
    {
      "assumption": "The host APIs the readings depend on exist in the installed pi 1.5.2: `ExtensionAPI.events: EventBus`, the `agent_settled` and `message_end` events (`message_end` returning nothing replaces nothing), `SessionProjection.messages`, `SessionEntryBase.parentId`, `Usage` with `input`/`cacheRead`/`cacheWrite`, `usage.cost.total`, and `VIRTUAL_MODEL_API = \"pi-virtual\"`.",
      "status": "verified"
    },
    {
      "assumption": "`verbatimModuleSyntax: true` (task 1.2) leaves the current tree green: every external and local import in `src/` and `tests/` already carries `import type` or an inline `type` modifier, and no `export {}`/`export type` pattern would newly fail.",
      "status": "unverified"
    },
    {
      "assumption": "The base suite is 22 files and 328 tests, as the plan's baseline paragraph says and tasks 1.1, 1.2 and 8.1 verify.",
      "status": "unverified"
    },
    {
      "assumption": "`pi-jefferson@0.14.0`'s published types provide `Registration`, `Report`, the two channel names, a `bar` variable typed `number | null`, and refuse `null`/`undefined`/non-finite values, exactly as tasks 1.1, 9.1 and 9.2 assume.",
      "status": "unverified"
    }
  ],
  "owner_questions": [
    {
      "question": "How should the archive's totals and stub matching reach `src/domain/context-figures.ts`?",
      "options": [
        "Plain data: the publisher passes the store's items (or the count and both summed texts) and the domain module keeps importing only `src/domain/` (design's stated rule)",
        "Import the `ArchiveStore` port into the domain module, as task 3.2 literally says, and drop the \"domain imports nothing outside domain\" placement rule"
      ],
      "recommended_option": "Plain data: the publisher passes the store's items (or the count and both summed texts) and the domain module keeps importing only `src/domain/` (design's stated rule)",
      "why": "Design.md's placement table and task 3.1 both forbid the upward import, and D3 already makes the publisher the holder of the `ArchiveStore` port, so the plain-data version needs no new decision and keeps the domain unit-testable in plain Node (ADR 0001's consequence)."
    },
    {
      "question": "Where does the ratio table live, and what does `src/domain/calibration.ts` export?",
      "options": [
        "The publisher holds the `{ k, live }` map (D7 step 5); `calibration.ts` exports pure helpers — sample validity, `k` for a pair, the flag, seeding from samples, reseeding — and tasks 4.2's table transitions move to the publisher test",
        "`calibration.ts` owns the table as a value it returns from seed/reseed/live-sample functions, and the publisher only stores it (what tasks 4.2's test descriptions read like)"
      ],
      "recommended_option": "The publisher holds the `{ k, live }` map (D7 step 5); `calibration.ts` exports pure helpers — sample validity, `k` for a pair, the flag, seeding from samples, reseeding — and tasks 4.2's table transitions move to the publisher test",
      "why": "D7 step 5 and the placement row both say the publisher holds one entry per pair and that `calibration.ts` decides arithmetic over plain numbers; following that also removes the duplicate proof boundary between 4.2 and 6.6 and matches the standard's one-writer-per-event rule (ruling 14)."
    }
  ],
  "not_checked": [
    "`pi-jefferson@0.14.0` itself: the package is absent from `node_modules` and `package.json`, so every contract claim (type names, channel names, `bar`'s `number | null`, refusal of `null`/non-finite, `defaultLabel`/format semantics) was checked only against `research-chidi.md`, not against the published types.",
    "No shell tool is available in this lens, so I could not run `npm run check`, `tsc`, `npm test` or `git diff`: the 328-test baseline, the spike's 323/438 numbers, the dollar table's arithmetic and the claim that the suite stays green at each group are unverified by execution.",
    "Whether `verbatimModuleSyntax: true` compiles the current tree clean — inferred from reading every import statement, not from a `tsc` run.",
    "Jefferson's runtime verdicts and the plan's final acceptance (registration accepted, `$bar` filled, `~` rendered, `deciding` flashing) — Joel's group 15 and inherently unobservable from the repository.",
    "The two behavioral scenarios the plan itself marks as unprovable by any taiknr test (`A publishing registrar throws`, `Turning off mid-session`) and the newly visible one I found (a mid-session re-enable), all of which rest on pi's per-handler catch and on a `/taiknr` command that does not exist yet.",
    "`research-eleanor.md` and the remainder of `research-chidi.md` beyond the Jefferson contract and the `pi-virtual` facts, which I read only where a task's verification depended on them."
  ]
}