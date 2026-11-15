{
  "mode": "council",
  "lens": "council-codebase",
  "paraphrase_proposes": "",
  "paraphrase_existing": "",
  "recommendation": "Proceed to design. Every current-state claim the proposal and research cite checks out on disk at HEAD: the three `Not implemented` adapter bodies, the throwing `buildStub`, the three `Not implemented` use-case bodies, six no-op handlers plus a real `session_start`, the raw-`pi`/gated-`pi` split, the `{} as ArchiveStore` test fixture, and the domain shapes in D9 (default 600, `>=` comparison, integer `>= 0` so `minCharsToArchive: 0` is valid). The proposal's Impact section is a clean Create/Modify boundary with no missing targets and nothing outside it. The design must additionally state: the archive's observation surfaces (no console.* exists to lean on), that registration-time API usage stays limited to `pi.on` (the unchanged taiknr.test.ts Proxy throws on anything else), and the lifecycle of the two unbounded maps in taiknr.ts.",
  "findings": [
    {
      "id": "CB-1",
      "severity": "minor",
      "location": "openspec/changes/archive-stubbing-and-branch-hydration/specs/archive-stubbing/spec.md (Settlement commits only items the active branch still holds) and specs/branch-hydration/spec.md (A foreign or malformed side-store entry is skipped)",
      "finding": "The archive has zero output-channel observability, and both specs make the interesting events silent: staged items are dropped silently off-branch and after recovery omission, and malformed `taiknr-side-store` entries are skipped without a report. Verified there is no logger anywhere in `src/` and the only precedent of user-facing output is the session-start rejection, which throws an actionable message.",
      "rationale": "An on-call engineer (or Joel) triaging 'why was my huge output never stubbed?' has no signal distinguishing never-staged, staged-but-dropped, and staged-but-unsettled; the same holds for a silently skipped corrupt side-store entry. O6 is open for exactly this, and configuration-loader R14 already ruled out `console.*`, so the answer must be named surfaces, not new output.",
      "concrete_case": "User hits Escape on a runaway bash run, then `/tree`-jumps to another branch and settles; the four pending items vanish with no draft, no entry, and no message, and the user cannot tell whether the feature is broken.",
      "recommendation": "In the design, state the observation surfaces explicitly and rely on nothing else: the in-process `InMemoryArchiveStore` contents, the persisted `taiknr-side-store` and `context_edit` session entries on the branch (readable from the session file), and the config-holder state (`ready`/`rejected`/`enabled`). Keep zero `console.*` output, matching configuration-loader R14, and keep the actionable-throw pattern of `session-start.ts` for any error that genuinely must reach the user."
    },
    {
      "id": "CB-2",
      "severity": "minor",
      "location": "tests/app/extension/taiknr.test.ts:5-13 and src/app/extension/taiknr.ts:28-46",
      "finding": "Hidden constraint the proposal does not state: `taiknr.test.ts` builds its `ExtensionAPI` fake as a Proxy whose `get` throws `unexpected ExtensionAPI member` for anything other than `on`, and the file must stay unchanged per the `configuration` spec (D7). Today `taiknr.ts` and every registrar only call `pi.on` at registration time, which is why the test is green.",
      "rationale": "If the design's wiring touches any other `ExtensionAPI` member at factory time (e.g. reading `pi.sessionManager` to seed the store), the unchanged composition test fails and the D7 gate with it. `createGatedPi` passes non-`on` properties through (handler-gate.ts:18), so the restriction is on wiring time, not handler bodies.",
      "concrete_case": "A design that seeds `InMemoryArchiveStore` from `ctx.sessionManager` inside the `taiknr(pi)` factory instead of in `session-start.ts` makes the Proxy throw `unexpected ExtensionAPI member: sessionManager` on the first line of the existing test.",
      "recommendation": "Add one line to the design: all Pi interaction happens inside event handler callbacks; the factory and registrars touch only `pi.on` (directly or via `createGatedPi`)."
    },
    {
      "id": "CB-3",
      "severity": "minor",
      "location": "src/app/extension/taiknr.ts:18-19",
      "finding": "Two unbounded session-lifetime Maps are wired as shared mutable state: `argsByCallId` and `originalContentByEntryId`. Nothing in the current code clears them, and `hydrateArchiveStore`'s `replaceAll` (the only archive-replacement path in the plan) does not touch them, so after a branch switch that drops entries their keys reference entries no longer reachable.",
      "rationale": "O1 already covers `argsByCallId` cleanup and nested-call leakage; the same lifecycle question applies to `originalContentByEntryId` (needed only between staging at `turn_end` and settlement at `agent_before_settle`, or until the item is dropped). Leaving keys behind is memory-only growth, not a correctness bug, but the design should not leave it unstated.",
      "concrete_case": "A long session with hundreds of tool calls accumulates hundreds of `argsByCallId` keys, including nested-call ids (`<parent>/<n>`) that never produce transcript results; after settlement the `originalContentByEntryId` keys for committed items are dead weight.",
      "recommendation": "The design should fix two cleanup points: delete `argsByCallId` entries when their call's result is staged (and never record nested calls, per Trap 8), and delete `originalContentByEntryId` entries for items at commit and at silent drop."
    },
    {
      "id": "CB-4",
      "severity": "minor",
      "location": "src/infra/adapters/pi-archive-adapter.ts:14-34 and specs/branch-hydration/spec.md (The same id twice on one branch)",
      "finding": "The duplicate-id spec scenario ('the archive holds one item for that id') is satisfied for free by the existing `InMemoryArchiveStore`, whose `addBatch` is a `Map.set` per item, so a later batch silently overwrites an earlier item with the same id. No new dedupe logic is needed — but 'later batch wins' is an implicit ordering rule the design should state, since `readArchiveBatchesFromBranch` will feed batches in branch order.",
      "rationale": "Reuse verification: the behaviour the spec requires is already the store's semantics; writing dedupe in `readArchiveBatchesFromBranch` would duplicate it. Naming 'last on the branch wins' makes the hydration result deterministic and testable.",
      "concrete_case": "Two `taiknr-side-store` entries on one branch each carry an item with id `a1b2c3d4` (possible after `/fork` copies entries); the archive must hold exactly one, and which one depends on whether batches are folded in branch order.",
      "recommendation": "Have the design state that batches are folded in branch order (root to leaf) and that `InMemoryArchiveStore.addBatch`'s overwrite yields last-wins; no extra code."
    },
    {
      "id": "CB-5",
      "severity": "minor",
      "location": "openspec/changes/archive-stubbing-and-branch-hydration/specs/branch-hydration/spec.md (Hydration runs only while taiknr is on and the session is active)",
      "finding": "Verified feasible against live code, no new mechanism needed: the `createGatedPi` gate in `handler-gate.ts` checks `session.isActive()` (`state.status === 'ready' && state.config.enabled`, session-config.ts:31-33) at event time, which already implements the `session_tree`/`session_compact` gating and the mid-session on-toggle self-heal the spec's last scenario requires — `setEnabled` flips `state.config.enabled`, so the next tree/compact event passes the gate and hydrates. `session_start` is confirmed registered on raw `pi` (taiknr.ts:28), so its own `isActive()` guard must be hand-written as Michael's Trap 2 says.",
      "rationale": "Confirms the spec's gating scenarios map one-to-one onto existing, tested code (tests/app/extension/handler-gate.test.ts exists) with no signature changes.",
      "concrete_case": "Session starts with `enabled: false`; user enables via the future Status card; next `/tree` fires `session_tree` through `gatedPi`, the gate now passes, and hydration runs — no per-handler `enabled` check anywhere.",
      "recommendation": "No change; the design can cite `createGatedPi` + hand-written `isActive()` guard in session-start as the complete inertness mechanism and keep the D4 'no per-handler enabled check' property trivially."
    }
  ],
  "assumptions": [
    {
      "assumption": "The three translation functions in `src/infra/adapters/pi-archive-adapter.ts` (`toToolOutputCandidates`, `toSettlementDrafts`, `readArchiveBatchesFromBranch`) throw `Not implemented`, and `InMemoryArchiveStore` + `TAIKNR_SIDE_STORE_TYPE = 'taiknr-side-store'` are working",
      "status": "verified"
    },
    {
      "assumption": "`buildStub` throws `Not implemented` and `shouldArchive` is a real `>=` comparison (`src/domain/archived-output.ts`)",
      "status": "verified"
    },
    {
      "assumption": "The three use-case bodies (`stage-tool-outputs.ts`, `commit-archived-batch.ts`, `hydrate-archive-store.ts`) throw `Not implemented`, and `ArchiveStore` on `ports.ts` carries `replaceAll`",
      "status": "verified"
    },
    {
      "assumption": "Six of seven handlers are no-ops and `session_start` does real config loading only; `session_start` is registered on raw `pi`, the other six on `gatedPi`",
      "status": "verified"
    },
    {
      "assumption": "`createGatedPi` wraps only `on` and gates on `session.isActive()`, which is `ready && enabled` (`handler-gate.ts`, `session-config.ts`)",
      "status": "verified"
    },
    {
      "assumption": "Trap 1's fixtures: `session-start.test.ts` passes `{} as ArchiveStore` and `fake-pi.ts` `createContextStub` carries only `cwd` and `isProjectTrusted`, with no sessionManager",
      "status": "verified"
    },
    {
      "assumption": "`taiknr.test.ts` is a Proxy that throws on any `ExtensionAPI` property other than `on`",
      "status": "verified"
    },
    {
      "assumption": "Default `minCharsToArchive` is 600 and the validator accepts any integer >= 0, so 0 is a valid setting (matches D9 and the `configuration` living spec)",
      "status": "verified"
    },
    {
      "assumption": "D9's domain shapes match disk: `ToolOutputCandidate` has `entryId`/`toolCallId`/`toolName`/`argsSummary`/`rawText`/`isError`; `ArchivedToolOutput` has `id` and no separate `entryId`",
      "status": "verified"
    },
    {
      "assumption": "The proposal's Impact list covers every file that must change; all cited paths exist at HEAD, and `tests/infra/adapters/`, `tests/use-cases/` and the session-level test are Create targets that do not exist yet",
      "status": "verified"
    },
    {
      "assumption": "Pi 1.5.2 platform behaviour (Trap 3-8, `context_edit` whole-content replacement, `getBranch()` semantics, `emitBoundary` draft validation) as reported by Chidi and Michael",
      "status": "unverified"
    },
    {
      "assumption": "That eight of the eleven existing `session-start.test.ts` cases resolve `enabled: true` and would crash on hydration (read only the first 130 lines of the file)",
      "status": "unverified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "Pi 1.5.2 dist sources under node_modules (`agent-session.js`, `session-manager.js`, `runner.js`) — platform claims belong to Chidi's lens",
    "Lines 131-251 of `tests/infra/pi-event-handlers/session-start.test.ts` (the per-case count behind Trap 1's 'eight of eleven')",
    "`npm run check` was not run; no test was executed",
    "HEAD commit identity (`4e951a2`) was not independently verified — no shell available",
    "The three non-archive adapters and `src/domain/recall.ts` bodies (recall card's territory, out of scope here)",
    "Fork semantics of `session_start` with `reason: 'fork'` — which entries a forked session's `getBranch()` carries"
  ]
}