{
  "mode": "review",
  "lens": "council-critic",
  "paraphrase_proposes": "",
  "paraphrase_existing": "",
  "recommendation": "Pass, nothing blocking. The fixes michael-resolve-s3-r2.json required are in design.md:\n- critic-r2-1: D4 has a Reason column, and each input class maps to exactly one reason.\n- The `minCharsToArchive -1/\"600\"` and `1e999` rows are in the loader-test row.\n- The declined wording items are applied: `Object.keys` order (integer-like keys first), the D5 throw as a fenced block, 'council critic assessed', and the proposal's `resolve` wording.\n\nThe architecture still holds against live code:\n- Pi's `createExtensionAPI` returns a plain object of closures, so forwarding through the gate's `Reflect.get` proxy is safe (loader.js L195–233).\n- `getAgentDir()` reads `PI_CODING_AGENT_DIR` each time it is called (config.js L510–515), so the test can set it.\n- Trust is settled (`project_trust`) before `session_start` (docs/extensions.md L377–393).\n\nTwo minor findings remain:\n1. The gate Risks bullet says the gate test covers the composition-root wiring. It does not.\n2. The proposal's Impact section still says 'rethrow'.",
  "findings": [
    {
      "id": "critic-r3-1",
      "severity": "minor",
      "location": "design.md — Risks / Trade-offs, bullet 'The gate is the only inertness mechanism, and it is invisible in the handler files'",
      "finding": "The bullet says the spec's enabled requirement is covered because 'the gate test asserts it'. The gate test calls `createGatedPi` directly. Nothing checks that `taiknr.ts` actually passes the gated `pi` to the six non-session-start registrars. The entry test only records event names.",
      "rationale": "Standard §6 requires claims about tested behaviour to match the evidence. The gate itself is tested, but the bullet's risk is about wiring: a later card bypassing the gated value. No test in this change can catch that, because the handlers are no-ops. The real check is the post-merge hand-off in ruling 17, where the archive and recall cards verify the 'off' scenarios through the composition-root gate.",
      "concrete_case": "A later edit writes `registerToolCallHandler(pi, argsByCallId)` with the raw `pi` in `taiknr.ts`. All tests still pass:\n- The entry test still sees seven events.\n- The gate unit test still passes.\n\n`npm run check` is green, and once tool_call has a body, `enabled: false` still stages outputs.",
      "recommendation": "Reword the mitigation: 'the gate test asserts the gate itself; that `taiknr.ts` routes all six registrations through it is checked by the archive and recall cards' off scenarios (ruling 17; Migration Plan hand-off), because the handlers are no-ops today.' No code change."
    },
    {
      "id": "critic-r3-2",
      "severity": "minor",
      "location": "proposal.md — Impact, `src/infra/pi-event-handlers/session-start.ts` bullet ('… the holder assignment and the rethrow')",
      "finding": "The proposal's Impact section still says 'rethrow'. critic-r1-2 changed the design to throw a new Error that wraps the host-neutral `TaiknrConfigError` (as `cause`) and appends the recovery line. The design's Files table was updated to 'throw the report on rejection'; the proposal was not.",
      "rationale": "Standard §1 says each fact has one home and the other artifacts must agree with it. 'Rethrow' describes the round-0 behaviour, which put Pi vocabulary in the host-free error, and that behaviour was ruled out.",
      "concrete_case": "An implementer reads the Impact section and writes `throw error` with the caught `TaiknrConfigError`. The stderr line then lacks 'fix the file, then run /reload or start a new session', and the spec scenario 'The report names the field and the recovery step' fails.",
      "recommendation": "Change 'the holder assignment and the rethrow' to 'the holder assignment and the thrown report (design D5)'."
    }
  ],
  "assumptions": [
    {
      "assumption": "Pi's `createExtensionAPI` builds `api` as a plain object of closures that do not depend on `this`, so a `Proxy` forwarding with `Reflect.get` and a `target.on(...)` call behave the same as calls on the raw object (loader.js L195–233).",
      "status": "verified"
    },
    {
      "assumption": "`getAgentDir()` reads `process.env.PI_CODING_AGENT_DIR` each time it is called and expands `~` without resolving a relative path. That is why D5 uses `resolve` and why the test can set the variable (config.js L510–515).",
      "status": "verified"
    },
    {
      "assumption": "`project_trust` resolves before `session_start`, and again before the replacement `session_start` when the working directory is new. So `ctx.isProjectTrusted()` in session_start reflects the final decision (docs/extensions.md L377–393, L431).",
      "status": "verified"
    },
    {
      "assumption": "`ExtensionContext` has `cwd: string` and `isProjectTrusted(): boolean` (types.d.ts L241, L258), and `on` has only per-event overloads that return `() => void` (types.d.ts L1229 onward), which matches `LooseOn`.",
      "status": "verified"
    },
    {
      "assumption": "`Error` options `{ cause }` type-check under the committed tsconfig (no explicit target/lib, `module: nodenext`, TypeScript ^7). I inferred this from the round-1 measurement that `Object.hasOwn`, also ES2022, type-checks. I did not run tsc.",
      "status": "unverified"
    },
    {
      "assumption": "Importing the Pi package index at runtime, now pulled in by session-start.ts and so by the unchanged entry test, works under vitest without side effects that break the entry test. This rests on D12's 'measured working under vitest' claim.",
      "status": "unverified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "Did not run tsc, Biome or vitest, because this review is read-only. The cast's TS2769 and the vitest import of the Pi index rest on Michael's measurements.",
    "Did not re-read research-chidi.md, research-eleanor.md or council.md in full this round. I relied on the rulings JSON, the specs and live code.",
    "Did not re-examine settled items: critic-r1-3/5/7/9, critic-r2-2/3, structural-r1-2, structural-r2-1 and the `Object.hasOwn` typing.",
    "Did not check how V8 `JSON.parse` messages look on Node 26 (length, input snippet) inside `cannot be parsed: <parser message>`."
  ]
}