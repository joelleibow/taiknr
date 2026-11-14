{
  "mode": "review",
  "lens": "council-critic",
  "paraphrase_proposes": "",
  "paraphrase_existing": "",
  "recommendation": "Needs fixes, nothing blocking. Two major contract gaps need fixing before tasks: (1) the extension-packaging 'Signatures unchanged' scenario diffs src/config/taiknr-config.ts against HEAD and permits only three differences, but the design adds `enabled`, `CONFIG_FILE_NAME`, `TaiknrConfigError` and also changes `interface` to `type`, so that diff check cannot pass; (2) the design never says where the rejection message and its Pi-only '/reload' recovery line are built: in the host-free error class, or in the session-start handler. The rest are minor calibration and traceability fixes. The architecture holds: the three-state holder per factory call, the trust gate at the caller, the composition-root gate, the lstat classification and assign-then-throw all check out against live code and Pi 1.5.2 sources.",
  "findings": [
    {
      "id": "CR-S3-1",
      "severity": "major",
      "location": "design.md — Module & File Placement › Types and signatures (`src/config/taiknr-config.ts` block); specs/extension-packaging/spec.md — Scenario 'Signatures unchanged'",
      "finding": "The design's taiknr-config.ts makes changes the extension-packaging scenario forbids. The scenario compares 'the seven handler files and `src/config/taiknr-config.ts`' with HEAD and allows only three listed differences, stub bodies and whitespace. The design adds a fifth `enabled` member to `TaiknrConfig` and a new default value, new exports `CONFIG_FILE_NAME` and `TaiknrConfigError`, and rewrites `export interface TaiknrConfig` / `export interface ConfigPaths` as `export type … =`.",
      "rationale": "A gated scenario that fails a mechanical diff check against its own design cannot be ticked honestly. The interface-to-type rewrite also breaks house convention: all 13 exported object shapes under src/ are `interface` (grep `^export (type|interface)` over src/), including both in taiknr-config.ts at HEAD (L1, L15). The new `SessionConfig` would be the only `type` alias among them.",
      "concrete_case": "The reviewer runs `git diff HEAD -- src/config/taiknr-config.ts`. It shows `+ enabled: boolean`, `+ enabled: true`, `+ export const CONFIG_FILE_NAME`, `+ export class TaiknrConfigError`, and `interface`→`type` on two declarations. None of these is one of the three listed differences, so 'and nothing else' is false.",
      "recommendation": "Keep `interface` for `TaiknrConfig`, `ConfigPaths` and `SessionConfig` (only the two unions need `type`), which removes the gratuitous diff. In the design's types block, state that taiknr-config.ts's other permitted differences are the `enabled` member and default (orientation D9 revised, Joel's 'An on/off switch') and the two new exports. Hand Michael a one-line fix to the scenario so its list covers them, or have it compare only the seven handler files plus `ConfigPaths`."
    },
    {
      "id": "CR-S3-2",
      "severity": "major",
      "location": "design.md — D5 (message format, step 4 'Rethrow'); Types block `TaiknrConfigError`; D10 ('The Status card's re-validation … calls `loadTaiknrConfig` directly')",
      "finding": "The design never says which unit builds the reported message. D5 says 'rethrow on rejection', which implies the same `TaiknrConfigError` instance, so its constructor would build `message`, including 'fix the file, then run /reload or start a new session'. That puts Pi command vocabulary into the host-free `src/config/` layer, which the design says any composition root (cli/, mcp/) and the Status card's re-validation will call.",
      "rationale": "Standard §3 requires one canonical place for each rule and host vocabulary kept at the edges. The two possible implementations behave differently: either every non-Pi caller shows '/reload', or the handler throws a new Error whose message differs from the `rejected` state's `error.message` that the Status card will display.",
      "concrete_case": "A future `cli/` root calls `loadTaiknrConfig` on a file with `decisionThreshold: 2`. If the constructor builds the full message, the CLI prints '…: decisionThreshold: must be <= 1 … run /reload or start a new session', a command the CLI does not have. If instead the handler appends the line, `session.state.error.message` lacks the recovery step the spec scenario 'The report names the field and the recovery step' asserts, and the readout and the stderr line disagree.",
      "recommendation": "Pin it in D5: `TaiknrConfigError.message` is `<path>: <field>: <reason>` (or `<path>: <reason>`), host-neutral. The session-start handler assigns `{status:'rejected', error}` and then throws `new Error(`${error.message}; fix the file, then run /reload or start a new session`, { cause: error })`. Replace 'Rethrow' with that wording and state that the spec's message scenario is asserted on the handler's throw."
    },
    {
      "id": "CR-S3-3",
      "severity": "minor",
      "location": "design.md — Non-Goals ('D10', 'D4'), Unchanged list ('D5, D7'), D4 table ('D8'), Migration Plan step 1 ('D7; ruling 12') and 'Docs pass (D4)'",
      "finding": "The design numbers its own decisions D1–D13 but also cites michael-orientation.md's decision table under the same D-labels (orientation D4 'Documentation never blocks', D5 import boundary, D7 test conventions, D8 comparand provenance, D10 out of scope).",
      "rationale": "Standard §1 requires a reader with no earlier context to be able to trace every claim. Each colliding label points to an unrelated decision in this same document.",
      "concrete_case": "The D4 table cites 'D8' as the source of the `[0,1]` threshold range. In this design, D8 is 'Nothing is emitted on success or absence'. Likewise 'Docs pass (D4)' points the reader to the validation decision.",
      "recommendation": "Prefix every orientation citation, e.g. 'orientation D8', or rename the design's decisions (e.g. DD1–DD13), and leave the numbers otherwise unchanged."
    },
    {
      "id": "CR-S3-4",
      "severity": "minor",
      "location": "design.md — D5 message format ('<absolute file path>'); D5 step 1 (`join(getAgentDir(), CONFIG_FILE_NAME)`)",
      "finding": "The message promises an absolute path, but `getAgentDir()` returns `expandTildePath(process.env.PI_CODING_AGENT_DIR)` without resolving it (node_modules/@earendil-works/pi-coding-agent/dist/config.js L510–516). `join` keeps a relative path relative.",
      "rationale": "The spec scenario 'The report names the field and the recovery step' asserts `<absolute file path>`, and the design builds that path with an API that does not guarantee it.",
      "concrete_case": "`PI_CODING_AGENT_DIR=agent pi -p hi` with `agent/pi-taiknr.json` holding `{\"enabled\":0}` prints 'agent/pi-taiknr.json: enabled: must be a boolean', which is not absolute.",
      "recommendation": "In D5 step 1, use `resolve(getAgentDir(), CONFIG_FILE_NAME)` (same import, same line count), or drop 'absolute' from the design and the spec wording."
    },
    {
      "id": "CR-S3-5",
      "severity": "minor",
      "location": "design.md — D6; specs/configuration/spec.md — Requirement 'An unreadable file is a rejection, not an absence'",
      "finding": "D6 treats a read `ENOTDIR` as absent for both paths. The spec limits that to a `<cwd>/<CONFIG_DIR_NAME>` that is not a directory. D6 also does not cover a broken directory symlink above the file: read `ENOENT` plus lstat `ENOENT` classifies it as absent.",
      "rationale": "Ruling 8's stated reason is that dotfile-managed link targets can go missing. A missing parent target is that same case and is silently treated as absent. Neither the design nor Risks records it, and the ENOTDIR scope differs between design and spec.",
      "concrete_case": "(a) In a trusted project, a dotfile-managed `<cwd>/.pi` symlink whose target was deleted yields read ENOENT and lstat ENOENT, so the session runs on agent/default values with no report, though the user put a project config in place. (b) `PI_CODING_AGENT_DIR` pointing at a regular file yields agent read ENOTDIR, so the agent layer is silently absent, which the spec does not permit for the agent path.",
      "recommendation": "Restrict 'read ENOTDIR → absent' to the project path in D6, or amend the spec to cover both. Add one Risks bullet accepting the broken-parent-symlink case as 'absent' (no extra code), so the gap is recorded rather than discovered."
    },
    {
      "id": "CR-S3-6",
      "severity": "minor",
      "location": "design.md — D1 and D9 (`setEnabled(boolean): boolean`)",
      "finding": "`setEnabled` is underspecified in two ways. It is not said whether it replaces the ready state with a new config object or mutates `config.enabled` in place (`TaiknrConfig` fields are not readonly). It is also not said what it returns when the state is ready and already holds the requested value.",
      "rationale": "This seam is the Status card's whole contract (ruling 15). In-place mutation leaks into any config object a later async handler is still holding. The return value decides whether `/taiknr off` twice reports success or refusal.",
      "concrete_case": "A later recall card's async `context` handler reads `const { config } = session.state` and then awaits the classifier. Meanwhile `/taiknr off` calls `setEnabled(false)`. With in-place mutation, that in-flight handler sees `enabled: false` partway through its run; with replacement it does not. And for `setEnabled(false)` while already off, the Status card cannot tell from the contract whether it gets true or false.",
      "recommendation": "Add one sentence to D1/D9: from `ready`, `setEnabled` replaces the state with `{ status: 'ready', config: { ...config, enabled } }` and returns true, including when the value is unchanged. Otherwise it returns false and changes nothing. Add one holder test row for the unchanged-value case."
    },
    {
      "id": "CR-S3-7",
      "severity": "minor",
      "location": "design.md — D5 step 3 ('Should anything else escape … the holder stays `unresolved`')",
      "finding": "The claim 'the holder stays `unresolved`' is true only on a holder's first `session_start`. `assign` has no reset, so on a second call to the same holder an escaping non-`TaiknrConfigError` leaves the previous `ready` state, and the gate stays open.",
      "rationale": "In Pi every session_start follows a freshly loaded runtime (docs/extensions.md L376–392 lifecycle), so production is unaffected. But the design's own session-start test drives 'a re-read on a second call with a different working directory' on one holder. There the claim is false, and nothing records that the guarantee depends on one session_start per holder.",
      "concrete_case": "In the session-start test, call 1 in cwd A resolves `ready` with A's project config. Call 2 in cwd B hits a loader defect (TypeError). The handler propagates and the holder is still `ready` with A's values, so `isActive()` stays true for B.",
      "recommendation": "Reword step 3: 'the holder keeps its prior state — `unresolved` in production, because Pi loads a new runtime, and so a new holder, before every `session_start` (docs/extensions.md L376–392)'. No code change is needed."
    },
    {
      "id": "CR-S3-8",
      "severity": "minor",
      "location": "design.md — D4 ('The first violation found is the one reported')",
      "finding": "'First violation' is not deterministic as written. The design does not fix whether the agent file is validated before the project file, or whether a file's keys are checked in source order or in known-key-list order with unknown keys in a separate pass.",
      "rationale": "Tests must pin exact field names in rejection messages (spec 'Each rejection class has its own case'). Two correct implementations would report different fields for the same input.",
      "concrete_case": "Agent file `{\"decisionTreshold\":0.9,\"enabled\":\"no\"}`: walking known keys first reports `enabled: must be a boolean`, while walking parsed keys reports `decisionTreshold: unknown field`. With both files broken, either file may be named.",
      "recommendation": "Add one sentence: the agent file is validated before the project file, and within a file each key of `Object.keys(parsed)`, in source order, is checked as unknown-or-rule, so the first failing key is reported."
    },
    {
      "id": "CR-S3-9",
      "severity": "minor",
      "location": "design.md — D9",
      "finding": "D9 is the only seam decision with no 'Alternatives weighed' paragraph, though ruling 15 weighed a bare writable `enabled` field and rejected it (stale-store hazard, un-rejecting a fixed but unreloaded file).",
      "rationale": "Standard §5 requires the losing alternatives and their trade-offs, and the trade-off already exists in ruling 15.",
      "concrete_case": "A Status-card engineer reading D9 alone cannot see why `session.state.config.enabled = false` was not chosen as the seam.",
      "recommendation": "Add one line: 'Alternative weighed: a writable `enabled` on the ready config. Writing it from a `rejected` or `unresolved` state could not be refused and would bypass the `ready`-only guard (ruling 15; CR-6).'"
    }
  ],
  "assumptions": [
    {
      "assumption": "Pi's `api.on` is an object-literal method with no `this` dependency, so the gate's `(target.on as unknown as LooseOn)(…)` and `Reflect.get` forwarding are safe.",
      "status": "verified"
    },
    {
      "assumption": "Every `session_start` follows a freshly loaded extension runtime, so each holder sees exactly one `session_start` in production.",
      "status": "verified"
    },
    {
      "assumption": "`ctx.cwd` and `ctx.isProjectTrusted()` exist on the event context, and trust is decided before `session_start` and does not change mid-process (`/trust` saves for future processes).",
      "status": "verified"
    },
    {
      "assumption": "`getAgentDir()` reads `PI_CODING_AGENT_DIR` at call time and does not resolve relative values.",
      "status": "verified"
    },
    {
      "assumption": "The repo's exported object shapes are uniformly `interface`.",
      "status": "verified"
    },
    {
      "assumption": "`Object.hasOwn` type-checks under the repo's TypeScript 7 / `module: nodenext` default target without a `lib` setting.",
      "status": "unverified"
    },
    {
      "assumption": "The `ENOENT`/`ENOTDIR`/`EACCES`/`EISDIR` errno pairs measured by Michael on Node 26.8.1 hold on the platforms users run.",
      "status": "unverified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "Did not run tsc, Biome or vitest (read-only), so the `Object.hasOwn` lib and the gate cast's `TS2769` claims rest on Michael's measurements.",
    "Did not re-measure print/JSON/RPC/TUI error surfacing; it is settled in ruling 5.",
    "Did not read research-chidi.md, research-eleanor.md or council.md in full. Relied on the rulings JSON, owner rulings and live code for the facts cited above.",
    "Did not check a FIFO or very large file at the config path; synchronous `readFileSync` would block session start. Judged too exotic to raise."
  ]
}