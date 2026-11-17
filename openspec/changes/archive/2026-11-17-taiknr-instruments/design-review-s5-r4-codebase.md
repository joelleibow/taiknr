{
  "mode": "review",
  "lens": "council-codebase",
  "paraphrase_proposes": "tasks.md sequences the change into fifteen groups: the exact `pi-jefferson` pin and `verbatimModuleSyntax`; four domain modules (token estimate, figures, calibration, dollars); the per-session publisher with six event methods and a deferred reading each; the holder; the shared fake; the Jefferson declaration and bus adapter; the readings; the `jeffersonInstruments` switch; the classifier observer and recall's report; the six publishing registrars; then the wiring and the final re-runs, with Joel's own live look as the unticked last group. An Interfaces block fixes every export, signature and dependency object, and the File Boundary creates 15 source and 15 test files, modifies 15 and deletes nothing. Every task names its failing test, boundary cases, red/green label and the scenarios it proves, and 14.1's three session-level cases (tree, discarded compaction, recall turn) are what prove the registrar order.",
  "paraphrase_existing": "At `abaa6b0` taiknr registers seven handlers: `registerSessionStartHandler` on the raw `pi`, which loads and assigns the config and hydrates the store synchronously, and six others behind `createGatedPi`, whose Proxy intercepts only `on` and runs a handler only while `session.isActive()` (ready and enabled). `registerContextHandler(pi, {config, store, recallCache})` builds `createPiJevScorerAdapter(ctx, config)` per request, appends `formatRecalledContext` as the last content block of the latest user message, and returns from five places, four of them reachable through the gate. `TaiknrConfig` has six fields with a total `FIELD_RULES` map, and `tests/support/fake-pi.ts` has no `events`, projection or throwing hooks.",
  "recommendation": "Ready to implement: no blocking or major findings, and no owner decision needed. Every current-state reference holds on disk — the seven `on()` calls and their order in `taiknr.ts`, `handler-gate.ts`'s `on`-only Proxy that passes `events` through by identity, `context.ts`'s five returns and the `4 *` at line 63, `session-start.ts`'s synchronous load-and-hydrate, `formatRecalledContext` at `recall.ts:34`, `buildStub`'s stub-first replacement in `pi-archive-adapter.ts:112–114`, the two `TaiknrConfig` literals at `session-config.test.ts:9` and `handler-gate.test.ts:8`, `classifier-guard`'s field spread, the `runner.js` chaining and per-handler catch that D9 and 13.2 rely on, and pi 1.5.2's root `buildSessionProjection(entries, leafId)`, `estimateTokens`, `SessionManager.appendMessage/appendUsage/inMemory` and `MessageEndEvent`. The File Boundary is exact — 15 created source, 15 created tests, 15 modified, none unmarked and none missing — and 14.1's per-case red conditions are the right proof of order. The three findings are fixture and wording precision, each fixable in one clause: name 13.6's branch recipe, say the three-thrower `readRequest` case uses a physical model, and widen 14.2's diff pathspec to the four frozen files it cannot currently see.",
  "findings": [
    {
      "id": "CB-S5-R4-1",
      "severity": "minor",
      "location": "tasks.md 13.6, Failing test first and Boundary cases (with 8.1's `createContextStub` options)",
      "finding": "13.6's reseed cases need a `session_tree` reading whose `seeds` is non-empty with a k other than 1, and no task says how a branch that seeds a pair is built for the registrar tests. `readTreeJumped` derives `seeds` from the branch with the root `buildSessionProjection(branch, entry.parentId)` (D7 step 4), so `createContextStub`'s `projectionMessages` — the only projection hook 8.1 adds — never reaches the seed path: a branch of absent or hand-made entries projects to an estimate of 0, `sampleRatio` returns undefined and no seed exists. The plan also never says how a valid assistant message reaches a `SessionManager` branch, in 10.1 or anywhere else.",
      "rationale": "Without a seed the coder cannot distinguish reseeding from clearing, and must invent a session-entry fixture. The nearest recipes are local to other files (`session-start.test.ts:79`'s `branchWith`, `pi-archive-adapter.test.ts`'s literal `sourceEntry`), and 10.1's `SessionManager.inMemory()` plus `appendUsage` recipe covers the readings test only and does not mention `appendMessage`, the call that puts the assistant message on the branch.",
      "concrete_case": "Derek writes 13.6 with `createContextStub({ branch: [], projectionMessages: [...] })`; `readTreeJumped` walks an empty branch, returns `seeds: []`, and both \"the non-live entries are reseeded from the new branch\" and \"a jump to a branch ... whose entry was a seed\" have no observable, so he either hand-builds `SessionEntry` literals with a `parentId` chain or weakens both cases to k = 1.",
      "recommendation": "Add one clause to 13.6: build the branch with a real `SessionManager.inMemory()`, `appendMessage` a user message then an assistant message carrying valid usage, `appendUsage(\"cache_warm\", provider, model, usage)` after it, and pass `manager.getBranch()` as the stub's `branch`; state that `projectionMessages` is not the seed's projection."
    },
    {
      "id": "CB-S5-R4-2",
      "severity": "minor",
      "location": "tasks.md 10.1, the `readRequest` three-thrower case",
      "finding": "The case says `readRequest` returns its reading with `getContextUsage`, `sessionManager.buildSessionProjection` and `getBranch` all throwing, but the shared `readPair` walks the branch whenever `ctx.model.api === \"pi-virtual\"` (D7 step 1). The plan does not say that case's model is a physical one, and the `pi-virtual` case sits directly above it in the same list.",
      "rationale": "A coder reusing the `pi-virtual` stub for the three-thrower case gets a throwing `getBranch` inside `readPair`, so the case fails for the wrong reason; the tempting repair is to drop `getBranch` from the thrower list, which deletes the guarantee the case exists to make (the request reading touches neither the window, the projection nor the branch).",
      "concrete_case": "`createContextStub({ hostReadsThrow: true, model: { provider: \"pi\", id: \"virtual\", api: \"pi-virtual\" } })` — or the preceding case's stub with the three throwers added — makes `readRequest` throw on `getBranch`, although a shipped request reading under a physical model reads none of the three.",
      "recommendation": "State it in 10.1: the three-thrower case's model carries no `api`, or any value other than `\"pi-virtual\"`, so `readPair` returns `ctx.model`'s pair and the reading touches none of the three."
    },
    {
      "id": "CB-S5-R4-3",
      "severity": "minor",
      "location": "tasks.md 14.2, the frozen-contract diff command",
      "finding": "The check's pathspec omits four of the five files `design.md`'s Unchanged list names: `src/app/extension/handler-gate.ts`, `src/config/session-config.ts`, `src/domain/archived-output.ts` and `src/use-cases/recall-relevant-context.ts` (only `ports.ts` is named under `src/use-cases`). The sentence \"shows only the closed list\" therefore says nothing about those four, and no other task compares a changed-file list against the File Boundary — 14.4 uses `git diff --name-only abaa6b0` only for the Markdown assertion.",
      "rationale": "The check is the change's only proof that the frozen contracts did not drift, and four of the five files it is meant to cover are outside its pathspec; a drift there passes a green review check.",
      "concrete_case": "Derek threads `holder` or a spend callback into recall — `reportRecalled`'s reader sits next to it — so `recall-relevant-context.ts` gains a parameter. 14.2's command prints only the handler, adapter and config changes, the \"frozen contracts\" check passes, and ADR 0007's recall contract has changed unnoticed.",
      "recommendation": "Widen the pathspec to `git diff abaa6b0 -- src tests` (untracked new files are already covered by the same task's `git ls-files -o --exclude-standard -- src tests` clause), or add the four omitted paths."
    }
  ],
  "assumptions": [
    {
      "assumption": "`taiknr.ts` registers exactly seven `on()` calls today, once per registrar, in the order this plan inserts the six new registrars after (`session_start` raw, then tree, compact, tool_call, turn_end, agent_before_settle, context_with_system), and the sorted list with duplicates is 13 entries.",
      "status": "verified"
    },
    {
      "assumption": "`handler-gate.ts` intercepts only `on` and returns every other member with `Reflect.get(target, property, receiver)`, so the gated `pi.events` is the host's own object and the instruments `session_start` handler can emit through it; the factory is therefore safe under `taiknr.test.ts`'s fake that throws on any member but `on`.",
      "status": "verified"
    },
    {
      "assumption": "`runner.js` awaits `session_start` handlers sequentially in registration order, catches each handler separately and reports on the extension error channel, and chains `context_with_system` by creating a fresh event per handler with `messages: currentMessages` and setting `currentMessages = handlerResult?.messages ?? currentMessages`.",
      "status": "verified"
    },
    {
      "assumption": "`session-start.ts` is synchronous (no `await`), so the store is hydrated before the later gated `session_start` handler from `instruments-session-start.ts` runs, and the opening archive figures can be read in that handler's synchronous part.",
      "status": "verified"
    },
    {
      "assumption": "The test surface the plan extends is as stated: `createFakePi`/`createContextStub` shapes, `classifier-guard`'s `writeClassifierAgentConfig(dir, fields)` spreading fields over the classifier config, the two `TaiknrConfig` literals, `taiknr-config.test.ts`'s exact `toEqual` case at lines 228–241, `archive-session.test.ts`'s harness and `errors` collection, `formatRecalledContext` at `recall.ts:34`, and the stub replacement putting `item.stub` as the tool result's first content block at `pi-archive-adapter.ts:112–114` (so `firstText === stub`).",
      "status": "verified"
    },
    {
      "assumption": "pi 1.5.2 exports the root `buildSessionProjection(entries, leafId?, byId?)`, `estimateTokens`, `SessionManager.appendMessage/appendUsage/inMemory`, `MessageEndEvent`/`AgentSettledEvent`, and `on` overloads for the six publishing events.",
      "status": "verified"
    },
    {
      "assumption": "D5's key sets match every key set the tasks assert: 17 at the opening post, 14 at response rows (1)/(2), 5 at rows (3)/(4), 6 at the request, and 6 at settled, compact and tree.",
      "status": "verified"
    },
    {
      "assumption": "The measured claims on the settled list — the 328-test baseline, the TS2741/TS1484/TS2322/TS2353 outcomes, the load check and its positive control, the discarded-boundary error count, and `pi-jefferson` 0.14.0's `Registration`/`Report` shapes — hold as recorded.",
      "status": "unverified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "I had no shell tool and ran no command: not `npm run check`, not the load check, not any mutation step, and no `rg` (the equivalent checks were made with the grep tool against the working tree at `abaa6b0`).",
    "I did not install or read `pi-jefferson` 0.14.0: `Registration`, `Report`, the variable and `bar` shapes, and the composed instrument names are taken from `research-chidi.md` and the settled list.",
    "I did not re-derive D8's dollar rows or the response-state table's arithmetic beyond spot checks of rows 1, 2, 3, 6, 7, 8 and 15; round 3 did, and neither the table nor the tasks' dollar text changed since.",
    "I did not read the delta specs' prose beyond the scenario names and the figure/flag/since-start requirements; the docs-pass scenarios (README rows, the measurement explanation) are outside tasks.md by design and were not audited.",
    "I did not re-open any settled round 1–3 finding; the sections I cite (the fake's shape, the config literals, the 13-entry list, the six registrar tests' switch-off pairs) are unchanged since those findings landed.",
    "Group 15 (Joel's observation) depends on the docs pass and Joel's own `pi-jefferson.json` rows, which are post-merge hand-offs; I left it as the plan has it."
  ]
}