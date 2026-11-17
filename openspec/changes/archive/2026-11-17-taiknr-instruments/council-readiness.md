{
  "mode": "council",
  "lens": "council-readiness",
  "paraphrase_proposes": "",
  "paraphrase_existing": "",
  "recommendation": "The change is safe to roll back at the data layer: it persists nothing, so session files are untouched. Before design, settle seven mechanics that a coder would otherwise decide mid-implementation: (1) where the second (switch) gate lives, (2) how re-registration behaves without a `session_shutdown`, (3) which model is 'current' for the ratio, (4) the request-to-response estimate slot and its lifecycle, (5) the permitted-differences list, which is not closed, (6) how a publish is contained and where its failure is reported, and (7) the test-support and proof gaps. Two skew and rollback hazards belong in design.md's Migration Plan: the new config key makes an older taiknr reject the whole file, and Jefferson's runtime comes from Joel's checkout while its types come from npm 0.14.0.",
  "findings": [
    {
      "id": "R1",
      "severity": "major",
      "location": "specs/configuration/spec.md 'One reader'; specs/jefferson-instruments/spec.md 'The switch is read in one place'; src/app/extension/handler-gate.ts; src/config/session-config.ts",
      "finding": "The switch has no workable home. Publishing handlers must be registered at factory time, before config is known, and the only inertness mechanism (`createGatedPi` -> `session.isActive()`) knows only `enabled`. The specs say publishing handlers never test the switch and that the registration is its 'one home'. That cannot hold: with the switch off, handlers still run and post updates for instruments that were never registered.",
      "rationale": "Jefferson refuses an update with no registration and warns `<ext> reports \"<field>\" without a registration` (research-chidi A1, listener L202-207). That warning appears on every update, not once at start. The design needs a second gate (a new `SessionConfig` member such as `instrumentsActive()`, plus either a second proxy or a parameter on `createGatedPi`). Both changes touch interfaces that the extension-packaging 'Signatures unchanged' list does not permit, and a coder would have to invent the name and placement.",
      "concrete_case": "`pi-taiknr.json` has `{\"<switch>\": false}` and `enabled` is true. `turn_end` and `context_with_system` run through the gate (active), the publisher emits `jefferson:update`, and Joel gets a TUI warning per update.",
      "recommendation": "Design names the gate's exact shape: the `SessionConfig` member name, the proxy or parameter for publishing registrars, and `registerSessionStartHandler` as the only caller of the registration emit. The extension-packaging difference list gains these items. Add a test that fires every publishing event with the switch off and asserts that `events.emit` is never called."
    },
    {
      "id": "R2",
      "severity": "major",
      "location": "src/config/taiknr-config.ts validateDocument (unknown key => TaiknrConfigError); owner-rulings 'malformed config => nothing for that session'; specs/configuration/spec.md",
      "finding": "Config rollback and version skew are unaddressed. Any file containing the new switch key is 'unknown field' to the previous taiknr, which rejects the file and does nothing for the whole session, per Joel's Q1(B) ruling.",
      "rationale": "The migration is additive on paper (the default is on, so the key is optional). It is not backward compatible for any file that sets the key. A project file under `.pi/pi-taiknr.json`, committed to a repo, taints every collaborator or machine still on the old taiknr. The same happens when Joel rolls this change back after trying the key.",
      "concrete_case": "Joel sets the switch false in `~/.pi/agent/pi-taiknr.json` to silence the instruments, then reverts to `abaa6b0`. The old loader throws `<file>: <switch>: unknown field`, and taiknr is dead for that session.",
      "recommendation": "Record in design.md's Migration Plan that the key must be removed before downgrade, and that the README example never shows the key. Rolling back also leaves Jefferson's 'not a known instrument' warnings for any `taiknr.*` rows. Neither is a task. A test that the default config contains no new key in the README example is unnecessary."
    },
    {
      "id": "R3",
      "severity": "major",
      "location": "src/infra/pi-event-handlers/session-start.ts (throws on rejection after assign; hydrates after); specs/context-figures 'A resumed session seeds k'; specs/jefferson-instruments 'registered before the first await'",
      "finding": "The `session_start` ordering is unspecified, and a throw in new code would cost hydration. The handler runs config load, then hydrate, and any new step (seed k from the branch, build the registration, post every field) is added to a handler whose escape is an uncaught throw. The existing `session_start` hydrates only if `session.isActive()`.",
      "rationale": "A thrown error after `assign(ready)` leaves the session active, but the archive is not hydrated or the instruments are half-posted. The only existing 'throw' contract in that handler is config rejection. The seeding code reads arbitrary persisted entries (`usage` entries, assistant messages with missing or partial usage).",
      "concrete_case": "A resumed branch holds an assistant message with `usage` absent or `usage.input` undefined, so the seed computation yields NaN or throws. `session_start` then rejects the hydration, or posts a non-finite figure and Jefferson refuses it.",
      "recommendation": "Design fixes the order (assign, active check, hydrate, seed k, switch gate, register, post every field, with no `await` anywhere) and wraps seeding and publishing in the same containment as R6. Add boundary tests: resumed branch with a malformed assistant usage, with only a `cache_warm` usage entry, with no usage at all (k=1, flag on), and with a rejected config (nothing emitted)."
    },
    {
      "id": "R4",
      "severity": "major",
      "location": "specs/jefferson-instruments 'Shutdown clears the fields'; src/ (no `session_shutdown` handler registered); research-chidi A1 (all-or-nothing validation, 'instrument names are new')",
      "finding": "Re-registration safety is unproven. taiknr registers no `session_shutdown`, and Jefferson refuses a whole registration whose instrument names it already holds. If `session_start` fires twice against one Jefferson state without a shutdown between them, the second registration is refused and the instruments freeze on stale values.",
      "rationale": "Whether pi always emits `session_shutdown` before `/new`, `/resume`, `/fork` and `/reload` is not cited anywhere in the research. T11 itself notes that no pi document promises event order. Design cannot be zero-decision while this is open.",
      "concrete_case": "`/reload` runs a new taiknr factory. If Jefferson's state was not cleared, `jefferson:registration` for `taiknr.context` is refused, and the old factory's stale-context emits throw, so the instruments never update.",
      "recommendation": "Ask Chidi to confirm from pi source that `session_shutdown` precedes every `session_start` with reason `new`, `resume`, `fork` and `reload`. Design states that the registration is emitted once per `session_start` and that a second `session_start` without shutdown is a case the extension does not guard. Add a handler test that two `session_start` calls on one factory emit two well-formed registrations and no throw. Rely on Joel's live `/reload` for the real behavior."
    },
    {
      "id": "R5",
      "severity": "major",
      "location": "specs/extension-packaging/spec.md 'Signatures unchanged' (list of five) and 'Seven events registered'; AGENTS.md ('one handler per lifecycle event'); src/infra/pi-event-handlers/turn-end.ts",
      "finding": "The permitted-differences list is not closed and contradicts its own rule. Items the design will have to change are not on it: the `SessionConfig` interface (R1); `TaiknrConfig` gains the switch (the spec says it 'gains `enabled`', which is already there); the dependency objects of `registerTurnEndHandler`, `registerAgentBeforeSettleHandler` and `registerContextHandler` if they carry a publisher; `createPiJevScorerAdapter` if wrapped; `ConfigPaths`. Item (5) permits only new registrars. But `turn_end`, `agent_before_settle` and `context_with_system` already have handlers, and AGENTS.md allows one handler per event, so publishing there extends an existing registrar.",
      "rationale": "A coder who cannot satisfy 'exactly one publishing handler per named event' and 'one handler per lifecycle event' at the same time must invent which contract bends. The 'Seven events' test is then rewritten ad hoc.",
      "concrete_case": "Design picks `turn_end` for usage. A second `pi.on('turn_end')` violates AGENTS.md. Extending `registerTurnEndHandler`'s deps changes a frozen signature that no listed difference covers.",
      "recommendation": "Design lists every changed registrar, deps object and exported type by name, with the exact new event list (or 'seven'). Correct the stale `TaiknrConfig gains enabled` sentence. The spec delta then reads as a closed list."
    },
    {
      "id": "R6",
      "severity": "major",
      "location": "specs/jefferson-instruments 'Publishing cannot cost stubbing or recall'; src/infra/adapters/pi-jev-scorer-adapter.ts (score awaits classify)",
      "finding": "Containment is specified as an outcome with no mechanism, and the dangerous publish is the one in a `finally`. The in-flight reset to 'not running' on every exit happens in the scorer adapter around `await classify`. A throw there (stale ctx makes `pi.events.emit` throw, `loader.js:426-430`) replaces the classifier's result or error. Nothing says where a swallowed failure is reported.",
      "rationale": "Standard §5 requires the explicit error behavior at the boundary and the log fields (entry, decision, outcome). 'The last posted value stands' says nothing about reporting. Without a decided single `safePublish` and a decided sink, each handler invents its own try/catch.",
      "concrete_case": "Classifier call in flight, Joel runs `/reload`. The old instance's classifier resolves, the `finally` emit throws on the stale context, and the throw masks the answer. Recall's outcome in the old instance is wrong, or the unhandled rejection is logged by pi.",
      "recommendation": "Design decides one infra function that takes the emit, wraps it in try/catch, and reports through the existing once-per-session notifier or a named silent policy. Every emit, including the one in `finally`, goes through it. Add tests that make `emit` throw (a) before a boundary handler returns (drafts still returned), (b) in the recall handler (messages still returned), (c) in the `finally` while `classify` resolves and while it rejects (the original result or error survives)."
    },
    {
      "id": "R7",
      "severity": "major",
      "location": "specs/context-figures 'One ratio per model' and 'A sample from the current model'; research-chidi B7 (`ctx.model` may be undefined; virtual models route per request)",
      "finding": "'Current provider and model' is not defined, and taiknr registers no model-change event. The ratio is keyed by a pair, but nothing says whether the current pair comes from `ctx.model` at request time, or from the response's own `provider` and `model` fields. For a virtual model these differ, so no sample ever matches the key.",
      "rationale": "A key mismatch silently leaves k at 1 with the flag on, so the figures never calibrate and the jump the change exists to resolve comes back. `ctx.model` is `undefined` with no model, and at `session_start` it may be absent while the branch holds usage.",
      "concrete_case": "Joel runs a virtual model. Each response reports the routed model, `ctx.model` reports the virtual one, the pair never matches, and the context bar reads 40% low indefinitely with the 'uncalibrated' flag.",
      "recommendation": "Design decides: key = the provider and id taken from the response being sampled, compared to the same pair taken from the request-time model snapshot stored with the pending estimate (R8). State the behavior for `ctx.model` undefined (k stays 1, flag on). Add a test for a model switch mid-session (old samples ignored) and a test where the request model differs from the response model (no sample, flag on)."
    },
    {
      "id": "R8",
      "severity": "major",
      "location": "specs/context-figures 'A sample from the current model' (response prompt ÷ estimate of the request that produced it); src/app/extension/taiknr.ts (shared state is built at composition)",
      "finding": "Pairing a response with its request needs new shared mutable state (the pending request's estimate, its model and its recall block size), written at `context_with_system` and read at the response event. Its lifecycle is not specified.",
      "rationale": "An aborted or errored request never produces a valid response, so a stale slot would pair with the next, different request. A wrong ratio miscalibrates every figure by the size of that difference. The slot also needs a reset at `session_start`, like the maps in `taiknr.ts`. Where it is built and passed (composition root, new deps member) is a boundary-contract choice.",
      "concrete_case": "Request A is aborted. Request B arrives with an estimate of 50k. A's slot (30k) is overwritten correctly only if the write replaces unconditionally. If the context handler returns early for B (nothing eligible), the slot keeps A's 30k, and B's response (real 52k) samples as 52k/30k.",
      "recommendation": "Design states: a single slot, overwritten unconditionally by the first read of every `context_with_system` (before any early return), cleared when consumed, cleared at `session_start`, and consumed only when the response's model matches the slot's model. Tests: an aborted response, an errored response, a response with no pending slot, and a context handler early return."
    },
    {
      "id": "R9",
      "severity": "major",
      "location": "tests/support/fake-pi.ts (no `events`; `sessionManager` has only `getBranch`); tests/app/extension/taiknr.test.ts; specs/jefferson-instruments, specs/context-figures 'Calibration and the dollar figures are tested at the handler'",
      "finding": "The task file will need test-support changes that no document lists: `createFakePi` has no `events` member, and `createContextStub`'s `sessionManager` has no `buildSessionProjection` and its `getContextUsage` cannot return tokens. The 'Seven events' test uses a fake 'whose only member is `on`', so the entry's default export must not touch `pi.events` at load.",
      "rationale": "Standard §2 requires every Modify path to be listed. A coder who extends the shared fake freely may weaken other tests, for example by letting a throwing `events` be silently tolerated.",
      "concrete_case": "A handler test for the savings instrument needs `buildSessionProjection` on the context stub and a recording `events.emit`. Without a decided shape the coder invents the recorder and the assertion form.",
      "recommendation": "Design's file list marks `tests/support/fake-pi.ts` as Modify, with the recorder's shape (`emitted: { channel, data }[]`) and an optional `emitThrows` switch for R6. The load test asserts that the default export performs no `events` access."
    },
    {
      "id": "R10",
      "severity": "major",
      "location": "specs/configuration 'One reader'; specs/extension-packaging 'Boundary holds' and 'The type keyword is the only thing that keeps it out'; tsconfig.json; biome.json (recommended preset); research Michael M6",
      "finding": "Three scenarios have no automated proof, and there is no precedent in tests/ for a source-scanning test. Biome's `useImportType` only warns, and `lint` exits 0 (M6). tsconfig has no `verbatimModuleSyntax`. The spec says 'the review reads for it', which is not a check.",
      "rationale": "Standard §3 requires each scenario to name its task and test, or be marked Joel's. A check that is claimed must be shown catching a violation.",
      "concrete_case": "A later edit writes `import { Registration } from \"pi-jefferson/instruments\"` without `type`. The gate stays green, and the extension loads from Joel's checkout because `node_modules` holds the package. It breaks for an npm install of `pi-taiknr`.",
      "recommendation": "Pick one automated check and show it failing on a negative control: either a vitest scan of `src/` for `pi-jefferson` imports that lack `type`, for `@earendil-works/pi-` and `pi-jefferson` under `src/domain` and `src/use-cases`, and for exactly one reader of the switch key; or `verbatimModuleSyntax` plus Biome `useImportType` as `error`. The design records the negative control. The 'no pi-jefferson in node_modules' load scenario is covered by the existing `git archive HEAD` load check, which already has no `node_modules`; state that explicitly."
    },
    {
      "id": "R11",
      "severity": "minor",
      "location": "package.json devDependencies; research-chidi A5 (Joel's pi loads Jefferson from ../../Projects/pi-jefferson, version string 0.1.1, code = v0.14.0); research-chidi A4 (tarball ships .ts sources)",
      "finding": "Version skew between what taiknr is typechecked against and what runs. Types come from `node_modules/pi-jefferson` (npm 0.14.0). Joel's live Jefferson is his checkout at `main`, which can move past `v0.14.0` at any time. The devDependency range (exact or caret) is not decided, and Jefferson absent, older than 0.14.0, or in a non-TUI mode is undetectable.",
      "rationale": "A drift in the runtime contract (a field rename, a stricter validator) is invisible to `npm run check` and shows only as a TUI warning. In the absent case taiknr still computes every figure (a projection per event) for no listener.",
      "concrete_case": "Jefferson `main` adds a new required member to `ProvidedDeclaration`. taiknr's registration is refused wholesale. All four instruments vanish and the only sign is a one-time TUI warning.",
      "recommendation": "Design pins the range (recommended: exact `0.14.0`, bumped deliberately) and writes in the Migration Plan that the live look is re-run on any Jefferson bump. Add a taiknr test that the registration object `satisfies Registration<\"taiknr\">` and that every posted field is declared, of its declared type and finite (the spec already requires this; name the test file). State that publishing cost when nobody listens is accepted, and which events it applies to."
    },
    {
      "id": "R12",
      "severity": "minor",
      "location": "specs/jefferson-instruments 'Joel's live look is the acceptance'; owner-rulings request ('the change ends with his own observation')",
      "finding": "Owner-observed proof must be separated from coder-ticked tasks. Joel's own observations are: Jefferson accepts the registration and every update, repaint while the classifier waits, `resources_discover` ordering, the `/reload` and `/resume` behavior of R4, the bar's fill, and the savings reading sensibly over a session.",
      "rationale": "Standard §3 says a task only Joel can observe is marked his and is never ticked by the coder. Adding Joel's `pi-jefferson.json` rows is also his (Q5(a)), and a coder must not edit that file.",
      "concrete_case": "A coder ticks 'verify instruments render' after the unit tests pass. T10 says no taiknr test can see Jefferson's verdict.",
      "recommendation": "tasks.md ends with a 'Joel observes' group listing each item above, marked for him. Post-merge steps (Jefferson bump re-check, rollback notes from R2) stay in design.md's Migration Plan, and README work stays with Bambadjan's docs pass."
    },
    {
      "id": "R13",
      "severity": "minor",
      "location": "specs/context-figures 'Dollar savings are net…' (O6); research-chidi B6 (rates derived as cost ÷ tokens; zero-token components; tiers; mixed 1h writes)",
      "finding": "The dollar rule is deferred wholesale to the design ('the design decides' the edges). Zero-decision readiness needs the exact formula and its boundary cases fixed before tasks, because the tests assert specific numbers.",
      "rationale": "A coder cannot choose the rate for a zero-token component, the cold-cache test (cacheRead vs the unchanged prefix), or the tier handling without deciding behavior that decides the published figure.",
      "concrete_case": "A response has `cacheRead = 0` and a cost of 0 for that component. The read rate is 0/0. The coder must choose between 0, the last known rate, or skipping the figure, and each changes the cumulative total.",
      "recommendation": "Design includes a worked table: warm, cold, first warm after a settlement, zero cacheRead, zero cacheWrite, 1h write present, a recall turn, a classifier result without usage. Each row has numbers and the expected finite output. The handler tests are written from that table."
    }
  ],
  "assumptions": [
    {
      "assumption": "No new session entry type or persisted state is added, so rolling back the code leaves every session file valid for the previous taiknr.",
      "status": "verified"
    },
    {
      "assumption": "The existing `session_start` handler has no `await`, so 'register before the first await' holds today and only new code can break it.",
      "status": "verified"
    },
    {
      "assumption": "Unknown config keys are rejected and a rejected file disables taiknr for the session (loader and Q1(B) ruling), which is why the new key is not rollback-safe.",
      "status": "verified"
    },
    {
      "assumption": "`tests/support/fake-pi.ts` has no `events` member and its context stub's `sessionManager` has only `getBranch`.",
      "status": "verified"
    },
    {
      "assumption": "No test in `tests/` scans source files for imports, so the boundary, one-reader and `import type` scenarios have no existing check to extend.",
      "status": "verified"
    },
    {
      "assumption": "pi emits `session_shutdown` before every `session_start` with reason new, resume, fork and reload, so Jefferson's state is cleared before re-registration.",
      "status": "unverified"
    },
    {
      "assumption": "Jefferson's runtime in Joel's pi is his local checkout and may differ from the npm 0.14.0 the types come from.",
      "status": "verified"
    },
    {
      "assumption": "Jefferson's refusal of a duplicate instrument name is a whole-registration refusal (A1: 'new names', all-or-nothing); duplicate-name behavior itself was not read.",
      "status": "unverified"
    },
    {
      "assumption": "An `import type` from `pi-jefferson/instruments` survives vitest and pi's loader (M5 covered tsc, `npm run check` and `pi --help`, which includes vitest and the loader).",
      "status": "verified"
    }
  ],
  "owner_questions": [
    {
      "question": "Should the instruments publishing cost be bounded when Jefferson is absent or too old (undetectable), or accepted?",
      "options": [
        "Accept the cost: the figures are cheap relative to a model request, and no detection is possible",
        "Add a cheap guard that skips projection building when the instruments are unregistered (no emit has ever been accepted)"
      ],
      "recommended_option": "Accept the cost: the figures are cheap relative to a model request, and no detection is possible",
      "why": "Jefferson has no reply channel (A3), so a guard cannot know a listener exists. This is a design call for Michael. It would reach Joel only if per-event projection cost is measured and found noticeable on a long session."
    }
  ],
  "not_checked": [
    "pi's emit order for `session_shutdown` and `session_start` on `/new`, `/resume`, `/fork`, `/reload` (needs Chidi)",
    "Jefferson's behavior on a duplicate instrument registration without a clearing shutdown",
    "Whether taiknr's factory is re-run on `/reload` and whether a stale old instance's `finally` still runs after a reload",
    "The cost of `buildSessionProjection` per event on a 700-message session",
    "How other provider APIs normalize `input`, `cacheRead` and `cacheWrite` (T5 reads only Anthropic and OpenAI-completions)",
    "Whether `pi-jefferson` in `node_modules` is auto-discovered by pi as a second Jefferson load when taiknr is installed from a checkout (M5 saw a clean stderr, not a duplicate-load check)",
    "The existing tests' count beyond the 22 files and 328 tests that Eleanor reported, and whether any other test relies on the fake's shape",
    "No file was edited."
  ]
}