{
  "mode": "council",
  "lens": "council-readiness",
  "paraphrase_proposes": "",
  "paraphrase_existing": "",
  "recommendation": "Nothing here needs reopening: no data migration is needed, because recall writes nothing and the stub and side-store formats don't change. The design is not ready to hand to a coder until it settles seven things the specs leave open. (1) How an abort and a failure cross the port, and who writes the notice. (2) How the notifier gets a live ctx under the locked registrar dependencies. (3) Where the size budget's inputs come from, and in what unit. (4) How the timeout is applied, and how it is proved in the default suite. (5) The cache against the budget and against a changed archive. (6) Which existing tests break when the config field and event name change. (7) Who runs the live script, and how it loads a TypeScript extension. Two compatibility hazards need a Migration Plan entry: an overridden `classifierTimeoutMs` makes a rolled-back build reject the config, and an older host fails silently.",
  "findings": [
    {
      "id": "R1",
      "severity": "blocking",
      "location": "proposal.md O3 and T4; tail-recall spec 'A failure fails open' and 'A cancel is not reported'; src/use-cases/ports.ts RelevanceScorer and FailureNotifier",
      "finding": "The port cannot carry what the notice must say, and it cannot tell a failure from a cancel. The spec requires the notice to name the provider, the model, the config field and the reason, and a cancel to be silent. `RelevanceScorer.score` returns `RelevanceScore[] | undefined`. The use case (host-free, input is only `promptKey`, `promptText`, `decisionThreshold` and `signal`) knows no provider or model. It would also see the same `undefined` for a missing model, an error stop reason, a timeout and a user abort. `createPiJevScorerAdapter(ctx, config)` has no notifier, so the adapter cannot warn itself.",
      "rationale": "As specced, the coder must choose the error shape at the boundary, which breaks the zero-decision rule. The test for 'abort reports nothing' and 'error reports once' cannot be written until the mapping is fixed.",
      "concrete_case": "The configured model is `openrouter/typo`. `findOfType` returns `undefined`, the scorer returns `undefined`, and the use case calls `notifyOnce(?)` without knowing the provider, model or reason. A user pressing Escape (`stopReason: \"aborted\"`) returns the same `undefined`.",
      "recommendation": "The design should fix one mapping inside the locked types, with no port or delta change. The scorer resolves `undefined` only for a user abort. For a missing model or an error stop reason it rejects with an `Error` whose message is the finished notice text, and the adapter builds that text from provider, model, field and `errorMessage`. The use case catches the rejection, calls `notifyOnce(error.message)` and returns `[]`. The design should also record that the use case never calls the notifier on `undefined`."
    },
    {
      "id": "R2",
      "severity": "blocking",
      "location": "proposal.md O1 and T7; src/app/extension/taiknr.ts L44-51; src/infra/adapters/pi-notifier-adapter.ts",
      "finding": "There is no way to give `createOncePerSessionNotifier(getCtx)` a live `ctx` inside the registrar's locked dependency members. The `notifier` member is built at factory time, when no `ctx` exists. The handler receives `(event, ctx)` only at event time. `registerContextHandler`'s dependency object has no member that carries a ctx.",
      "rationale": "Either the coder invents a new dependency member or a module-level mutable ctx, or builds the notifier per event and warns on every request (D13). The `taiknr.test.ts` fake allows only `on`, so the wiring cannot touch any other `pi` member at factory time.",
      "concrete_case": "`createOncePerSessionNotifier(() => currentCtx)` in the composition root with `let currentCtx` never assigned throws `Cannot read properties of undefined (reading 'ui')` on the first failure. That throw is caught by the runner, so the user sees nothing.",
      "recommendation": "The design should name the mechanism and where the captured ctx lives. One option that needs no signature change: the composition root passes `registerContextHandler` a `pi` whose `on` wrapper records the handler's `ctx` into a factory-local variable before calling the handler. The notifier's `getCtx` reads that variable, and the `warned` flag lives in that same factory-local scope. The design should also say what a stale ctx does: `ctx.ui` throws once the runner is inactive, and the design should say the request still goes out unmodified."
    },
    {
      "id": "R3",
      "severity": "blocking",
      "location": "tail-recall spec 'Recall stops before the host's compaction threshold'; src/use-cases/recall-relevant-context.ts input type",
      "finding": "The size bound has no specified inputs, unit or owner. The use case is host-free and its input has no window, reserve or current-size field. Four things are undecided. First, where the window and `reserveTokens` come from. `ctx.model?.contextWindow` may be `undefined`, and `pi.getSettings().compaction.reserveTokens` is not model-aware (pi uses `getCompactionReserveTokens(model)`). Second, where the current request size comes from. `ctx.getContextUsage()` returns `tokens: null` right after compaction, and it undercounts after a `context_edit` (D2), which is exactly this extension's normal state. Third, the unit used to size a recalled item (chars/4 of `rawText` plus the wrapper?). Fourth, what to do when the bound cannot be computed, and whether the bound applies when `compaction.enabled` is false.",
      "rationale": "These are boundary contracts the coder would invent. The 'no request this change builds triggers overflow' guarantee rests on a figure Joel has said undercounts.",
      "concrete_case": "Right after `/compact`, `getContextUsage()` is `{tokens: null}`. With `decisionThreshold: 0` and 266k chars of archive, a coder who treats null as 0 recalls everything. A coder who treats null as 'unknown, recall nothing' silently disables recall on the first prompt after every compaction.",
      "recommendation": "The design should put the budget computation in the adapter or handler, in a named unit, passed to the use case as a plain number or `undefined`. It should state the `null` and `undefined` behaviours explicitly. It should state the item-size heuristic and say it is the same chars/4 estimate pi uses. It should give a pure boundary test for that function: exactly at the budget, one char over, a zero budget, and the largest item alone over the budget."
    },
    {
      "id": "R4",
      "severity": "major",
      "location": "proposal.md 'Recall stops before…' and O2; src/use-cases/recall-relevant-context.ts RecallCache `{lastPromptKey, lastRecalledIds}`",
      "finding": "The cache stores the ids after the size bound, but later requests in the same tool loop have a larger context. The key is unchanged across the steps, so those steps reuse step 1's decision. The cache also never re-validates ids against the store, or against the branch check (S9).",
      "rationale": "Applying the bound once makes 'no request this change builds triggers overflow' false for steps 2..n. Re-applying it per request needs the scores, which the cache shape doesn't hold, and a shape change needs a delta. Separately, `store.get(id)` can return `undefined` for a cached id after hydration `replaceAll` on a `/tree` switch.",
      "concrete_case": "Step 1 is at 600k of a 1M window and recalls 250k. Three tool results add 60k, so step 4 is over the window less the 16,384 reserve, a request this change made overflow. Or: a cache hit under an unchanged key returns an id that a `session_tree` hydration just removed, and the use case dereferences `undefined`.",
      "recommendation": "The design should choose between two options and state the cost of each. Either apply the bound to the cached ranked list per request, which changes the cache shape and needs one more delta; or accept the bound as step-1 only and weaken the spec claim. It must say how a cached id missing from the store is skipped, and whether the archive size or last batch participates in the cache key (O2/T6)."
    },
    {
      "id": "R5",
      "severity": "major",
      "location": "configuration delta; proposal.md 'A new config field…'; src/config/taiknr-config.ts FIELD_RULES and validateDocument",
      "finding": "Rollback and downgrade hazard. An unknown key is a rejection (living `configuration` spec). So once a user sets `classifierTimeoutMs` in `pi-taiknr.json` and the package is reverted to `22113ac` (or any build before this change), taiknr rejects that file and does nothing for the session. That is the no-fallback ruling working as designed. Nothing in the proposal tells the user to remove the key first.",
      "rationale": "Reverting is the rollback path. The failure is total (no stubbing either), and it hits exactly the users who opted into the new field. It does not reopen Joel's ruling; it is a documented consequence of it.",
      "concrete_case": "Agent file `{\"classifierTimeoutMs\":8000}` plus a revert to the earlier commit gives `…/pi-taiknr.json: classifierTimeoutMs: unknown field` and taiknr is inert for the session.",
      "recommendation": "The design's Migration Plan (not `tasks.md`) should state the rollback order: remove `classifierTimeoutMs` from agent and project files, then revert. It should state there is no data migration because recall writes nothing and no stored format changes. A session recalled by the new build and resumed by the old build carries no trace of recall."
    },
    {
      "id": "R6",
      "severity": "major",
      "location": "extension-packaging delta; package.json peerDependencies `*`; the proposal's ban on editing package.json",
      "finding": "Version skew with the host. `context_with_system` exists in `ExtensionAPI` at 1.5.2, but the peer range stays `*` and `package.json` is out of scope. The runner's `on` does not validate event names, so on a host without that event recall silently never fires while stubbing carries on, with no notice. The proposal never says which pi version introduced the event, and I could not verify that.",
      "rationale": "Users on an older pi pay the stubbing cost and get no recall, which is the exact state the proposal calls the problem it fixes. Nothing detects it, and the extension-packaging spec only requires loading under 1.5.2.",
      "concrete_case": "A user on a pi that predates `context_with_system` installs the new version. `pi.on(\"context_with_system\", …)` registers without error, the handler never runs, and no failure notice can appear because the handler never ran.",
      "recommendation": "The design should record the minimum host version (confirm in pi's changelog), say plainly that older hosts degrade silently, and leave the range as the spec fixes it. It should either accept that as the cost or name a detection that fits the locked contracts, such as the notifier firing from `session_start` when a version check fails. If the design wants any guard, it must say which it picks."
    },
    {
      "id": "R7",
      "severity": "major",
      "location": "proposal.md 'The model and its timeout…' and tail-recall spec 'The timeout bounds the wait'; pi-ai `classifier-shared.js` L47-72 and `types.d.ts` L92, L97",
      "finding": "The timeout mechanism and the way it is proved are undecided. `ClassifierOptions` has `timeoutMs` and `maxRetries`, and the shared HTTP classifier converts a timeout into a `stopReason: \"error\"` (a `TimeoutError`) and keeps `aborted` for the user's signal. An adapter-owned `AbortSignal.timeout` combined with `ctx.signal` would instead report `aborted` for both, which would hide the timeout notice. Neither choice is stated. The default suite's scripted classifier is a custom provider, and it ignores `timeoutMs` unless the fake implements it.",
      "rationale": "If the fake honours `timeoutMs`, a test proves the fake. If the adapter races its own timer, the cancel-versus-timeout distinction needs `ctx.signal?.aborted`. The coder would pick, and the 'hung classifier' scenario would then be unproved.",
      "concrete_case": "Scripted classifier returns a never-resolving promise. A test asserting 'request goes out after the timeout' passes only if the adapter bounds the wait itself. With the options-only approach the same test hangs. Request-time auth inside `classify` runs before the HTTP timeout starts. I did not verify whether it is bounded.",
      "recommendation": "The design should choose one. Preferred: pass `timeoutMs: config.classifierTimeoutMs` and `maxRetries: 0` to `classify` and treat only `stopReason` from pi as authoritative. Prove it in the default suite with a scripted classifier that records the options it received and asserts the exact values. Cover the real timeout in the live script. Alternatively use an adapter-owned timer and decide abort-versus-timeout by `ctx.signal?.aborted`. Either way the design should state which scenario each test proves."
    },
    {
      "id": "R8",
      "severity": "major",
      "location": "proposal.md 'Impact' (lists only new tests); tests/app/extension/taiknr.test.ts L16; tests/config/session-config.test.ts L9-15; tests/app/extension/handler-gate.test.ts L8-14; tests/config/taiknr-config.test.ts L190-201",
      "finding": "The Impact section names only new tests, but existing ones break. `taiknr.test.ts` asserts the exact event list containing `context`. `session-config.test.ts` and `handler-gate.test.ts` type a literal `TaiknrConfig` with five fields, so `tsc` fails once `classifierTimeoutMs` is a required field. `taiknr-config.test.ts` 'the known fields accept their valid values' uses `toEqual` on a five-field object, so it fails. The tests that spread `DEFAULT_TAIKNR_CONFIG` (`session-start.test.ts`, `turn-end.test.ts`) are unaffected.",
      "rationale": "Without an exact Modify list, a task group cannot leave the gate green: the config task would add the field and break `npm run typecheck` and `vitest` until those four files change.",
      "concrete_case": "Task 'add classifierTimeoutMs to TaiknrConfig and DEFAULT_TAIKNR_CONFIG' is done. `npm run check` fails in `session-config.test.ts` (missing property) and in `taiknr-config.test.ts` (extra key in expected). The same applies to the event list after the registration moves.",
      "recommendation": "The design should list those four test files as Modify entries, each placed in the same task group as the production change that breaks it. It should add the new field to the whitelist assertion and put the `classifierTimeoutMs` accept-and-reject boundary cases in the config group: `0`, `-1`, `1.5`, `1e999`, `\"8000\"`, and the layering with the agent file and the project file."
    },
    {
      "id": "R9",
      "severity": "major",
      "location": "proposal.md 'The default suite never calls the classifier' (T2, S7); tests/app/extension/archive-session.test.ts L245-262, L334-341",
      "finding": "The suite-credential guard is described but not specified, and nothing proves it holds. Session-level recall tests must clear provider credentials and register their own classifier, but the design must say how. Options include `vi.stubEnv`, an `afterEach` restore, and a shared helper. It must also say what makes a leaked live call fail the test rather than bill a call. Chidi found that the `ProviderAuth` shape and the behaviour of a second provider named `openrouter` beside the built-in were not verified. Michael's probe used a different path (an inline extension that calls `registerProvider`).",
      "rationale": "The standard requires a task relying on a guard to show the guard catching a mistake. `getProviderAuthStatus` reports `configured: false` even while the request goes out (Michael T2), so it cannot be that proof.",
      "concrete_case": "The two existing prompts after settlement run with `OPENROUTER_API_KEY` set in Joel's shell and a classifier registered under another provider name. `defaultDecisionModelProvider` still resolves to `openrouter` and the call goes to the network.",
      "recommendation": "The design should name the helper and its location (under `tests/support/`). It should state that the test's agent config sets both model fields to the scripted provider. The guard that proves it should be a `fetch` stub that throws, set in the same helper, so a leak fails a test. The scripted 'no' for the existing two prompts should be listed as a Modify to `archive-session.test.ts` with the unchanged assertions."
    },
    {
      "id": "R10",
      "severity": "major",
      "location": "proposal.md 'End-to-end verification is a live script run by hand'; owner-rulings.md Q5; tail-recall spec 'The live script spends live calls'; test-jev-poc.mjs",
      "finding": "Three things about the live script are unsettled. (a) Who runs it: the spec says 'run by hand', and Joel says the script, not his manual test, checks the box. If the coder runs it, the task needs `OPENROUTER_API_KEY` and spends model calls. If Joel runs it, it is a Joel-owned task the coder must not tick. (b) How it loads taiknr: `src/` uses `.js` specifiers on `.ts` files, which Node's type stripping does not remap, and there is no `tsx` and `package.json` cannot change. `test-jev-poc.mjs` imports nothing from `src/`. (c) What it asserts, and how it is shown catching a failure (O7, T14).",
      "rationale": "Recall leaves no log, no entry and no output, so a script that only prints will pass vacuously. Without stated assertions and a demonstrated failure, the one task that ticks the box proves nothing. The standard requires an automated check to be shown catching a mistake.",
      "concrete_case": "A script that runs a session and prints the model's answer exits 0 whether or not a recall block was sent. The faux chat provider's `FauxResponseFactory` is the one place that sees the transcript actually sent, which is how to read the block.",
      "recommendation": "The design should settle the runner. It should require the script to assert on the transcript the chat provider received, using a faux chat provider with a real classifier. It should give the load path, for example pi's extension loader by path rather than a bare import. It should say how the script is shown failing: run it once with recall disabled or the classifier model mistyped and show a non-zero exit."
    },
    {
      "id": "R11",
      "severity": "minor",
      "location": "configuration delta 'The default applies'; proposal.md 'defaulting to the value the design records'",
      "finding": "The default is still a blank. The measurement is 10 calls at 5 and 30 outputs: median 241-248 ms, max 361 ms, from one home network at one time of day. The research recommends no value. The classifier's input grows linearly with the branch (about 160 tokens per item, D5), so latency at hundreds of items is unmeasured. A default close to the measured max would trip the one-per-session notice as the archive grows, and the single attempt means no recovery.",
      "rationale": "The spec scenario asserts against the constant, so any number passes. The user-visible effect of a low value is silent recall loss after one notice.",
      "concrete_case": "A default of 400 ms against a 361 ms max leaves under 40 ms of headroom. A 300-item archive on a slow link times out, shows one warning, and recall is dead for the rest of the session.",
      "recommendation": "The design should state a literal integer and its derivation (a multiple of the measured max, with stated headroom), name the field's units and range, and say what the notice tells the user to raise. It should state that the latency at large archives was not measured."
    },
    {
      "id": "R12",
      "severity": "minor",
      "location": "proposal.md O6, T11, T14; tail-recall spec 'The recall block is one trailing text block'",
      "finding": "Two small contracts remain open for the design. First, the key is `timestamp` plus text of the latest `role: \"user\"` message, but a `custom` or `bashExecution` message after it reaches the model as a user-role message, so recall is attached earlier than the provider's last user turn. Second, `messageIndex` now indexes a list that begins with the leading system message under `context_with_system`, so an off-by-one is possible where an old test or helper assumed no system message.",
      "rationale": "Both are local, but the test cases that pin them down must be named, or the coder picks.",
      "concrete_case": "Messages `[system, user, assistant, custom]`. Recall lands on `user` at index 1 while the model's last turn is the custom message. A hand-built fixture without a leading system message gives index 0 and passes a test that fails in the real session.",
      "recommendation": "The design should state the rule for a trailing `custom` message (attach to the latest `role: \"user\"` message regardless). It should name boundary cases for the adapter tests: no user message, a string `content`, an image block, a leading system message, and a trailing custom message."
    }
  ],
  "assumptions": [
    {
      "assumption": "Recall persists nothing, and the stub and side-store formats are untouched, so rolling back or resuming across builds needs no data migration.",
      "status": "verified"
    },
    {
      "assumption": "An unknown config key is a rejection in the current loader (`validateDocument` throws 'unknown field'), so adding a field creates a downgrade hazard.",
      "status": "verified"
    },
    {
      "assumption": "`ExtensionAPI.on(\"context_with_system\", …)` exists in pi-coding-agent 1.5.2 with the same `ContextEventResult` return type, and the runner applies it after the `context` handlers. Because `event.messages` is the runner's own cloned list, an in-place edit is honoured.",
      "status": "verified"
    },
    {
      "assumption": "`pi.getSettings()` exposes `compaction.reserveTokens` to an extension at event time.",
      "status": "unverified"
    },
    {
      "assumption": "`ClassifierOptions` carries `timeoutMs` and `maxRetries`, and the shared HTTP classifier turns a timeout into `stopReason: \"error\"`.",
      "status": "verified"
    },
    {
      "assumption": "The pi version in which `context_with_system` first appeared, and whether older hosts ignore an unknown event name silently.",
      "status": "unverified"
    },
    {
      "assumption": "Existing tests that spread `DEFAULT_TAIKNR_CONFIG` stay green when the field is added. Four test files do not, as listed in R8.",
      "status": "verified"
    }
  ],
  "owner_questions": [
    {
      "question": "Who runs the live end-to-end script that ticks the verification task, you or the implementing coder?",
      "options": [
        "The coder runs it in their environment with `OPENROUTER_API_KEY` set. It spends model calls, and its pass criteria and the failing run that shows it catches a mistake go in the design.",
        "You run it and the task is yours. The coder writes it and must not tick it."
      ],
      "recommended_option": "The coder runs it",
      "why": "You ruled that the script, not your manual test, checks the box, which needs a runner who can tick it. 'Run by hand' in the spec can mean either, and a task the coder cannot tick leaves the box unticked. If you want to run it yourself, it must be marked yours."
    }
  ],
  "not_checked": [
    "pi's changelog and the first version with `context_with_system`.",
    "Whether request-time authentication inside `classify` is bounded by `timeoutMs`.",
    "Whether `pi.getSettings()` returns a usable `compaction.reserveTokens` inside a context handler, and whether model-specific reserve overrides are visible.",
    "How `registerNativeProvider` or an extension's `registerProvider` handles a second provider named `openrouter` beside the built-in.",
    "How the live script can load a TypeScript extension with `.js` specifiers without a new dependency.",
    "I ran no tests, probes or model calls. All findings come from reading files on disk at `main` `22113ac` and the installed pi 1.5.2."
  ]
}