{
  "mode": "review",
  "lens": "council-critic",
  "paraphrase_proposes": "",
  "paraphrase_existing": "",
  "recommendation": "Approve after one major fix. Round 3 moved the `setEnabled` toggle cases into handler-level tests that wire their own `createSessionConfig()` and `createGatedPi`, and made `archive-session.test.ts` isolate `PI_CODING_AGENT_DIR` and `cwd`. Both changes work against Pi 1.5.2. Project trust defaults to true (`settings-manager.js:238`), and `getAgentDir()` reads the environment variable at handler time. The row that changed still has the same kind of gap round 2 found for `setEnabled`. Inside `taiknr(pi)` the `InMemoryArchiveStore` is a closure local that nothing in this card reads (the `context` body is the recall card's and stays empty). Errors thrown inside `emit` and `emitBoundary` reach only the listeners registered through `bindExtensions({ onError })`, and with none registered they are silently dropped (`runner.js:497-501`). So the session-level 'compaction hydration' case and the off case's 'archive empty' cannot fail as written. They pass against `HEAD`'s empty `session_compact` handler. The fix is to name the observation seams in the test: a `vi.spyOn(InMemoryArchiveStore.prototype, ...)` spy and an `onError` listener passed to `bindExtensions`, which is also the call that fires `session_start`. No production change is needed. M1–M11 all still work.",
  "findings": [
    {
      "id": "CR-S3-R3-1",
      "severity": "major",
      "location": "design.md § Module & File Placement → Tests table, `tests/app/extension/archive-session.test.ts` row; § Decision 12; § Decision 11 (observation surfaces)",
      "finding": "The session-level test promises 'compaction hydration' and, in the project-file off case, 'the archive empty'. Neither can be observed through the composition root as the design describes it. `taiknr(pi)` creates `const store = new InMemoryArchiveStore()` as a closure local (src/app/extension/taiknr.ts:22). The only reader that would expose it is `registerContextHandler`, whose body is `_pi.on(\"context\", () => {})` and belongs to the recall card (src/infra/pi-event-handlers/context.ts:15). Errors are equally invisible. `ExtensionRunner.emit` and `emitBoundary` catch a handler's throw, and also an invalid boundary ('Invalid boundary entries'), and pass it to `emitError`. `emitError` only loops over the listeners registered with `onError` (runner.js:493-501, 773-813). A listener is registered only when the test calls `session.bindExtensions({ onError })` (agent-session.js:2757-2779, 2819-2826). That call is also the only thing that emits `session_start` (agent-session.js:2776). The design names neither the call nor the listener.",
      "rationale": "Standard §6 says a test the design cites must be able to fail. Standard §4 says the design must state how operators see the change fail. Decision 11 lists Pi's extension error channel as an observation surface, yet the one test that runs against a real `AgentSession` never listens on it. M10 adopted this test precisely to prove the paths that exist only at runtime (Trap 3, compaction). If its hydration assertion can only check Pi's own JSONL, it proves Pi works and says nothing about taiknr.",
      "concrete_case": "1. Leave `registerSessionCompactHandler` exactly as at `HEAD` (`() => {}`), or let `readArchiveBatchesFromBranch` throw on a real branch. The 'compaction hydration' case still passes. All it can assert is that the side-store entry from before compaction is still in `sessionManager.getBranch()`, which is Pi's behaviour, and the throw goes to an `emitError` with no listeners. 2. Without `bindExtensions`, `session_start` never fires, so the holder stays `unresolved` and every gated handler does nothing. The `enabled: false` assertion 'outputs raw and archive empty' then passes vacuously, whether or not the project-file read works. 3. In abort → `/tree` → settle, if Decision 8's filter regressed, the invalid draft would make `emitBoundary` return `valid: false` and report it only through `emitError`. The spec says 'the settlement succeeds without an error', and that cannot be checked without a listener.",
      "recommendation": "Add one clause to the `archive-session.test.ts` row and Decision 12, without touching `taiknr.ts`. (a) Each case calls `await session.bindExtensions({ onError })` with a collecting listener and asserts the collected list is empty. This fires `session_start` and captures thrown or invalid-boundary errors. (b) Each case observes the closure's store through `vi.spyOn(InMemoryArchiveStore.prototype, \"replaceAll\")` and `\"addBatch\"`. These are prototype methods (pi-archive-adapter.ts:7-33), and the test imports the same module instance it passes through `extensionFactories`. The compaction case then asserts that the last `replaceAll` call after `session_compact` carried the item from before compaction, and the off case asserts neither spy was called. Alternatively, reduce the session-level compaction case to 'no extension error' and state that store contents are pinned only in `session-compact.test.ts`."
    },
    {
      "id": "CR-S3-R3-2",
      "severity": "minor",
      "location": "design.md § Risks / Trade-offs → 'Inertness can regress silently'",
      "finding": "The risk says a handler 'wired to raw `pi` rather than the gate' is pinned by the toggle cases in turn-end, agent-before-settle, session-tree and session-compact. Each of those tests builds its own `createGatedPi(fake.pi, session)` around the registrar, so none of them exercises the wiring in `taiknr.ts`. `taiknr.test.ts` only records event names, not whether a handler is gated (tests/app/extension/taiknr.test.ts:5-22). The project-file off case in `archive-session.test.ts` would catch raw wiring of `turn_end` or `agent_before_settle`, because stubs would appear. It cannot catch raw wiring of `session_tree` or `session_compact`, because a session that starts off writes no `taiknr-side-store` entry, so hydrating its branch yields the same empty store either way.",
      "rationale": "Standard §6 requires every mitigation to match the evidence it cites. The stated failure mode includes 'hydrate while taiknr is off', and none of the cited tests can detect it.",
      "concrete_case": "Change `registerSessionTreeHandler(gatedPi, store)` to `registerSessionTreeHandler(pi, store)` in src/app/extension/taiknr.ts:31. Every test listed in the risk still passes. In production, a session configured `enabled: false` whose branch carries side-store entries from an earlier enabled session hydrates on `/tree`. That breaks branch-hydration's 'Hydration runs only while taiknr is on' requirement.",
      "recommendation": "Either narrow the risk's claim: the handler-level cases pin gate-plus-handler behaviour, and composition-root wiring is pinned only for the staging and settlement path by the off case. Or seed the off case's `SessionManager.inMemory` with a `taiknr-side-store` entry, trigger a `/tree` or compaction, and assert through the `replaceAll` spy from CR-S3-R3-1 that hydration never ran."
    }
  ],
  "assumptions": [
    {
      "assumption": "`session_start` is emitted only inside `AgentSession.bindExtensions` (agent-session.js:2776), not by `createAgentSession` itself (sdk.js:69-148 read).",
      "status": "verified"
    },
    {
      "assumption": "`ExtensionRunner.emitError` dispatches only to listeners registered through `onError`, and `AgentSession` registers one only when `bindExtensions` receives `onError` (runner.js:493-501; agent-session.js:2819-2826).",
      "status": "verified"
    },
    {
      "assumption": "`createAgentSession` builds its settings with `SettingsManager.create`, so project trust defaults to true there, and taiknr's `ctx.isProjectTrusted()` reads that value. A temp project `pi-taiknr.json` is therefore read without any trust prompt (settings-manager.js:223-248, agent-session.js:2913).",
      "status": "verified"
    },
    {
      "assumption": "A `vi.spyOn` on `InMemoryArchiveStore.prototype` intercepts the closure's instance, because `replaceAll` and `addBatch` are class prototype methods and the test imports the same module it passes as an extension factory.",
      "status": "unverified"
    },
    {
      "assumption": "Running a compaction with the faux provider succeeds without a network call, as M10's measurement reports.",
      "status": "unverified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "Whether compaction under the faux provider needs a scripted summary response (I relied on M10's measurement)",
    "Sections not changed since round 2 (Decisions 1–11 apart from the observation surfaces), and the settled findings",
    "The turn-end and agent-before-settle toggle cases' 'stay stubbed' halves. I judged them weak but harmless, because no handler-level code path can unstub",
    "No tests, tsc or model calls were run; this was a read-only review"
  ]
}