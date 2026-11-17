{
  "mode": "review",
  "lens": "council-codebase",
  "paraphrase_proposes": "`tasks.md` implements the four taiknr instruments in fifteen ordered groups: pin `pi-jefferson@0.14.0` exactly and turn on `verbatimModuleSyntax`; build four domain modules (character estimate, six figures, calibration, dollar table) behind a fully named interface block; build the per-session publisher, the no-op holder and the shared test fake; declare Jefferson's fields and emit them through one bus adapter; write one reading per publishing event; add the `jeffersonInstruments` switch; observe the classifier at the scorer adapter and report recall's block; add six publishing registrars, each carrying a switch-off pair; wire them in `taiknr.ts`, re-run every proof, the load check and the session-level listener test, and leave Joel's live look as his own group.",
  "paraphrase_existing": "At `abaa6b0` taiknr is a pi extension whose factory registers seven lifecycle handlers in `src/app/extension/taiknr.ts`, six of them through `createGatedPi` while `session_start` stays on the raw api so it can assign the session config and hydrate the archive store. Recall appends one `<recalled_context>` block to the latest user message inside `context_with_system`, keeping its chars-÷-4 budget inversion at `context.ts:63`, and builds `createPiJevScorerAdapter(ctx, config)` per request. Nothing publishes anything, `tsconfig.json` has no `verbatimModuleSyntax`, `tsconfig`/`biome` both cover `src/**`, and the suite is 22 test files.",
  "recommendation": "Implementation-ready after five small edits; no blocking finding this round. R1's eleven items all landed (the domain/port inversion, the unsettled domain exports, the config-test and `model.api` omissions, the wrong scenario citation, the impossible `rg` check, the gated-`session_start` rationale, the `state.status` guard), so what remains is one boundary gap (a fixture six test files share but no file lists) and four one-line corrections. Native behaviour I could check on disk backs the plan's riskiest host claims: `message_end` really is emitted before persistence, `context_with_system` really does hand the next handler the previous handler's returned list, the root `buildSessionProjection(entries, leafId?)` exists, and `isVirtualModel`/`VIRTUAL_MODEL_API` are unreachable from the package root, so the `\"pi-virtual\"` literal and its `shortcut:` comment are the only route.",
  "findings": [
    {
      "id": "CB-12",
      "severity": "major",
      "location": "tasks.md §13 preamble (the switch-off pair recipe) and 13.1–13.6; File Boundary Create/Modify rows touching `tests/support/`",
      "finding": "All six publishing-registrar tests build the same fixture, described once in prose: a gated registration with a ready config (`enabled: true`, `jeffersonInstruments: false`), a holder never installed, and `createContextStub(…)` with `Object.defineProperty(ctx, \"model\", { get() { throw … } })` plus thrown `buildSessionProjection`, `getBranch` and `getContextUsage`, then the pair installing a real publisher on that same context. AGENTS.md's Convention ('a fixture two test files share has one home under `tests/support/`') requires one home for it, and the File Boundary lists no Create there and no throwing option in the `tests/support/fake-pi.ts` Modify row, so the coder must either duplicate the recipe six times or invent an unlisted path.",
      "rationale": "Standard §2 requires every file the change creates or modifies by exact path, and this fixture is load-bearing: the switch-off case is only meaningful while every host read throws, so a copy that drops one override goes green proving nothing. Six hand-copies also drift exactly where the AGENTS.md convention exists to stop it.",
      "concrete_case": "The copy in `tests/infra/pi-event-handlers/instruments-settled.test.ts` overrides `buildSessionProjection`, `getBranch` and `getContextUsage` but not `model`; `readPair(ctx)` returns `undefined` without throwing, so `expect(handler(event, ctx)).toBeUndefined()` and `expect(fake.emitted).toEqual([])` both pass while the registrar evaluated a reading — the case the `jefferson-instruments` spec's *Every publishing event with the switch off* exists to fail.",
      "recommendation": "Add one Create row, e.g. `tests/support/instruments-harness.ts`, exporting the throwing context stub and a gated-registration helper, and name it in 8.1 or the §13 preamble; the alternative is a `throws?: true` option on `createContextStub` named in the existing `fake-pi.ts` Modify row."
    },
    {
      "id": "CB-13",
      "severity": "minor",
      "location": "tasks.md 1.1 (Red first / Verified)",
      "finding": "1.1 leaves its scratch `src/probe-verbatim.ts` in the tree ('is deleted at 1.2') while claiming `npm run check` green at 328 tests. `check` is lint → typecheck → test (`package.json:10-14`), Biome's allowlist covers `src/**` (`biome.json:10`) under `\"preset\": \"recommended\"`, and the probe's only statement is an unused value import of a type-only export — the `correctness/noUnusedImports` condition. `tsc` reads it too (`tsconfig.json` include `src/**/*.ts`).",
      "rationale": "A verification line that cannot be run in the state its own task leaves the tree; the probe's lifetime is the one thing 1.1 and 1.2 disagree about.",
      "concrete_case": "Derek installs the package as 1.1 says, leaves the probe in place and runs `npm run check`: `biome check .` fails on `src/probe-verbatim.ts` before `tsc` or `vitest` runs, so the asserted 'green at 328 tests' never executes. Even with that lint rule off, the probe sits in `src/`, outside `vitest`'s `tests/**/*.test.ts` include but inside both checks he gate runs.",
      "recommendation": "Delete the probe at the end of 1.1 (as the spike did — 'deleted immediately after') and recreate it at the start of 1.2 for the TS1484 red, or scope 1.1's green claim to `npm run test`."
    },
    {
      "id": "CB-14",
      "severity": "minor",
      "location": "tasks.md 14.2 (Verified); specs/extension-packaging/spec.md:40-41",
      "finding": "14.2's review command is `git diff abaa6b0 -- src/infra/pi-event-handlers src/infra/adapters src/use-cases/ports.ts`, which cannot see `src/config/taiknr-config.ts` — the same task's closed list permits '`TaiknrConfig` and its default gaining the switch' there, and the `extension-packaging` *Signatures unchanged* scenario explicitly compares `ConfigPaths` in that file with `abaa6b0`.",
      "rationale": "14.2 is the only guard on the frozen contracts, and `ConfigPaths` is what `session-start.ts:16-17` uses to decide whether a project config file is read; a widened type there is silent at compile time on the base's own tests.",
      "concrete_case": "A coder adding the switch also widens `ConfigPaths.projectConfigPath` from `string | undefined` to `string` and defaults it to `\"\"`; `npm run check` stays green and 14.2's diff shows nothing, so the spec's scenario is claimed as proven when it is not.",
      "recommendation": "Add `src/config/taiknr-config.ts` to 14.2's pathspec (and to the scenario-coverage sentence that cites it)."
    },
    {
      "id": "CB-15",
      "severity": "minor",
      "location": "tasks.md *Interfaces*, `pi-instrument-readings` line; design.md D7 step 4",
      "finding": "The seed expression is `Σ estimateTokens of buildSessionProjection(branch, parentId).messages`, and both artifacts read that as 'that message's `parentId`'. `AssistantMessage` has no `parentId` (`node_modules/@earendil-works/pi-ai/dist/types.d.ts:382-400`); the field is on `SessionEntryBase`. The root export itself is real and reachable (`dist/index.d.ts:21` exports `buildSessionProjection(entries, leafId?, byId?)`, and `SessionProjection.messages` is `AgentMessage[]`), so only the owner of `parentId` is wrong.",
      "rationale": "As written the expression does not compile, and the two plausible repairs differ in result: the entry's `parentId` gives the projection as of the request that produced the reply; the entry's `id` gives one that already contains the reply, inflating the estimate and biasing k low — a wrong figure that no plan check would flag.",
      "concrete_case": "`buildSessionProjection(branch, message.parentId)` on the assistant `AgentMessage` fails `tsc` with TS2339; swerving to `assistantEntry.id` compiles, makes `sampleRatio` use a projection that includes the reply's own text, and every 10.1 and 4.1 case still passes because the samples are scripted.",
      "recommendation": "Say 'the assistant *entry*'s `parentId`' in the Interfaces line and name the walk's inputs as `SessionEntry.id` and `SessionEntry.parentId`."
    },
    {
      "id": "CB-16",
      "severity": "minor",
      "location": "tasks.md 2.2 (Code / Verified); src/infra/pi-event-handlers/context.ts:63; src/use-cases/recall-relevant-context.ts:12",
      "finding": "2.2 says `src/use-cases/recall-relevant-context.ts`'s budget keeps pi's chars-÷-4 inverse untouched, but the inversion is `4 * (window - reserve - estimate)` at `src/infra/pi-event-handlers/context.ts:63`; the use case only receives the already-computed `budgetCharacters` as input. The task's own check (`rg '4 *' src/`) therefore lists a file 2.2 never names, and the file it does name contains no such arithmetic.",
      "rationale": "Current behaviour cited against the wrong path; a coder checking 2.2's named file finds nothing to preserve and may treat the `context.ts` hit as new drift to remove, which Q4(a) forbids.",
      "concrete_case": "After 2.1, `rg '4 \\*' src` returns `src/domain/token-estimate.ts` and `src/infra/pi-event-handlers/context.ts:63`, and nothing under `src/use-cases/`; 2.2's 'the recall budget's own inversion' has no match where it points.",
      "recommendation": "Name `src/infra/pi-event-handlers/context.ts:63` as the surviving inversion and say that `recall-relevant-context.ts` consumes `budgetCharacters` and is not edited."
    }
  ],
  "assumptions": [
    {
      "assumption": "Every existing path and symbol cited as current state exists and matches on disk: `taiknr.ts` registers exactly the seven events with `session_start` on the raw pi; `context.ts` has the five early returns and the only `4 *` inversion in `src/`; `createPiJevScorerAdapter` takes `(ctx, config)` and throws on the catalog `findOfType` miss before `classify`; `ArchiveStore` has `size()`/`getAll()` and needs no member; `archived-output.ts:52` is the `[archived <entryId>]` stub; `taiknr-config.test.ts:228-241` is the exact-key `toEqual` test; the only two full `TaiknrConfig` literals are `session-config.test.ts:9` and `handler-gate.test.ts:8`; `session-start.ts:31-32` is the hydration; `tests/support/classifier-guard.ts` and `formatRecalledContext` exist; `tsconfig.json` lacks `verbatimModuleSyntax`; `biome.json` covers `src/**` and `tests/**`; the suite is 22 test files.",
      "status": "verified"
    },
    {
      "assumption": "The host facts the readings and registrars depend on hold in pi 1.5.2: `ExtensionAPI.events: EventBus` with `emit(channel, data)`; `ContextWithSystemEvent` and `MessageEndEvent` exported from the package root; `on` overloads for `agent_settled`, `session_compact`, `session_start` and `message_end`; within one extension handlers run in registration order and `context_with_system` passes `handlerResult?.messages ?? currentMessages` (`runner.js:87-89, 1043-1072`); the runner catches each handler separately; `message_end` is dispatched before the reply is persisted (`agent-session.js:779-830, 943-946`); `SessionProjection.messages`; the root `buildSessionProjection(entries, leafId?, byId?)`; `SessionManager.appendUsage(kind, provider, model, usage, note?)`; `Usage.cost` required with `input`/`cacheRead`/`cacheWrite`/`total`.",
      "status": "verified"
    },
    {
      "assumption": "The `\"pi-virtual\"` string literal with a `shortcut:` comment is the only available route: `virtual-models.d.ts` exports both `VIRTUAL_MODEL_API` and `isVirtualModel`, but the package's `exports` map is `.` and `./rpc-entry` only and `dist/index.d.ts:29` re-exports neither, so no `nodenext` import can reach them.",
      "status": "verified"
    },
    {
      "assumption": "The Create list adds no path that exists (15 src + 15 test), the 15 Modify entries are all real, no Delete is needed, and the two files that do not type-check once `TaiknrConfig` gains a member are the two literals already listed. `pi-jev-scorer-adapter.test.ts`'s local `Classification` stub carries no `usage`, so 12.1's `finished 0.001` case widens an interface inside a file already marked Modify — no boundary gap there.",
      "status": "verified"
    },
    {
      "assumption": "`correctness/noUnusedImports` is on under Biome 2.6.7's `recommended` preset (the mechanism named for CB-13). I could not run `biome` — no shell tool in this lens — so the finding leans on `npm run test`'s `tests/**/*.test.ts` include as the rule-independent half.",
      "status": "unverified"
    },
    {
      "assumption": "The 328-test / 22-file baseline is the conductor's measurement (settled); I confirmed the 22 file paths on disk but did not run the suite.",
      "status": "unverified"
    },
    {
      "assumption": "`pi-jefferson@0.14.0`'s published types (`Registration`, `Report`, the two channel names, a `bar` variable typed `number | null`, refusal of `null`/`undefined`/non-finite) and the exact-pin install behave as tasks 1.1, 9.1, 9.2 and D10 say; the package is absent from `node_modules`, so these come from `research-chidi.md` and the spike's record.",
      "status": "unverified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "No shell tool in this lens: I could not run `npm run check`, `tsc`, `vitest`, `biome`, `git diff` or the load check, so the 328/438 counts, the dollar table's arithmetic and the claim that each group leaves the gate green are unverified by execution.",
    "The archive-session suite's twelve existing tests all assert `errors ` `toEqual([])`, so after 14.1 every one of them exercises the whole publishing path in a real session; I could not run them to see whether any publishing reading throws there (e.g. `getContextUsage()` at `agent_settled`).",
    "`pi-jefferson`'s tarball and types: not installed, so every contract claim is second-hand from `research-chidi.md` and `redgreen-derek.md`.",
    "The dollar table's fifteen rows, D5's figure semantics and the response-state table's arithmetic — other lenses' domain, checked here only where a task's verification names a repo fact.",
    "The five delta specs' full scenario inventory; I read only the scenarios whose checks resolve to a path, symbol or host behaviour on disk.",
    "Jefferson's runtime verdicts and Joel's group 15 — the acceptance is his observation and inherently unobservable from the repository.",
    "`research-eleanor.md` beyond the sections a task's citation depends on."
  ]
}