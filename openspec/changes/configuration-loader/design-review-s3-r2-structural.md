{
  "assumptions": [
    {
      "assumption": "HEAD sources match the design's claims: `src/config/taiknr-config.ts` exports the four-field `interface TaiknrConfig`, `DEFAULT_TAIKNR_CONFIG`, required-string `ConfigPaths` and the `Not implemented` stub; `src/app/extension/taiknr.ts:19` pins the constant; `session-start.ts` registers a no-op with `_pi`/`_store`; `turn-end.ts`/`context.ts` deps objects have the members the design says are unchanged",
      "status": "verified"
    },
    {
      "assumption": "Tooling scopes support the test plan: vitest include `tests/**/*.test.ts` (so `tests/support/fake-pi.ts` is not collected), biome includes `tests/**`, tsconfig includes `tests/**/*.ts`",
      "status": "verified"
    },
    {
      "assumption": "All four round-1 structural resolutions are applied: the enumerated permitted-difference list in `extension-packaging` plus `interface` keyword kept plus the differences-against-HEAD sentence; the host-neutral `TaiknrConfigError.message` with the recovery line appended only by the handler's throw; `resolve()` path building plus the relative-`PI_CODING_AGENT_DIR` test row; deterministic validation order plus the two-key test row; ENOTDIR absence restricted to the project path; the dangling-symlink-above risk row; the D9 alternative; the fake-pi shared-by clause; the orientation-D citation prefixes plus the Context legend",
      "status": "verified"
    },
    {
      "assumption": "The holder's placement in `src/config/session-config.ts` follows the recorded revision of ruling 1 (council.md §1 placement note, on consult); the infra→config type-import direction matches existing edges (`turn-end.ts:2`, `context.ts:2`) and no infra→app edge is created",
      "status": "verified"
    },
    {
      "assumption": "The entry test's fake throws on non-`on` members, so the gated `pi` keeps it green only because the gate's proxy forwards `Reflect.get` and the registrars touch `on` alone — and the gate test's fake therefore needs no other members",
      "status": "verified"
    },
    {
      "assumption": "Pi host measurements relied on (factory cached not the instance, per-handler throw catching on a carried channel, stderr surfacing in print/JSON modes, thirteen BOM-strip sites, TS2769 on the `LooseOn` cast, env-relative `getAgentDir()`) are accurate as recorded in council.md and michael-orientation.md",
      "status": "unverified"
    }
  ],
  "findings": [
    {
      "concrete_case": "Derek reads proposal.md's 'What Changes' and imports `join` from `node:path` for the two path builds; with `PI_CODING_AGENT_DIR=agent` (relative), the built paths stay relative and the session-start test's 'relative `PI_CODING_AGENT_DIR` still yields an absolute agent path' row fails — or a reviewer cross-checking the two artifacts asks which function the handler uses and gets two answers.",
      "finding": "The proposal names the session-start handler's path builds as 'the two `join` calls live in the session-start handler, the one place that already has `ctx.cwd` and `ctx.isProjectTrusted()`', but design.md D5 step 1 — after critic-r1-4's applied fix — pins `resolve` imported from `node:path`, because the spec asserts `<absolute file path>` and `getAgentDir()` returns `PI_CODING_AGENT_DIR` as given, relative when the user set it relative. The shared fact (two path builds living in the session-start handler, ruling 10) now carries two different function names across the change's artifacts.",
      "id": "S3R2-STR-1",
      "location": "proposal.md — 'What Changes', first bullet ('The two `join` calls live in the session-start handler…'); design.md — D5 step 1 (`resolve(getAgentDir(), CONFIG_FILE_NAME)`)",
      "rationale": "One home for each fact: the identifier is pinned in the design, and the proposal is a living artifact of this change directory (unlike council.md and michael-council-rulings.json, which record the rulings as made and should not be edited to match a later fix). The drift is real but one word, discovered by the same measurement that produced critic-r1-4, so it is minor and safely declinable with wording.",
      "recommendation": "In proposal.md, change 'The two `join` calls live in the session-start handler' to 'The two `resolve` calls live in the session-start handler' (or 'the two path builds'). Leave council.md's and the rulings JSON's 'two `join`s' untouched as the historical record of ruling 18's wording.",
      "severity": "minor"
    }
  ],
  "lens": "council-structural",
  "mode": "review",
  "not_checked": [
    "`tasks.md` — not yet present (Stage 4 artifact), so design-to-tasks alignment is out of scope this round",
    "Live re-measurement of any Pi host behaviour; the brief forbids running anything, so all host claims are traceable to recorded measurements only",
    "`michael-orientation.md` and the research reports in full — citation resolution and fix verification by targeted read/grep only",
    "The other six lens reports and `council-codebase.md` — not needed for this lens's verdict",
    "`node_modules/` Pi internals beyond the two files the design's host claims cite (loader.js, types.d.ts) — settled in council and not re-opened"
  ],
  "owner_questions": [],
  "paraphrase_existing": "At HEAD, `loadTaiknrConfig` throws `Not implemented`, and `src/app/extension/taiknr.ts:19` pins `DEFAULT_TAIKNR_CONFIG` by value into the turn-end and context handler dependencies, so a user's config file changes nothing. `TaiknrConfig` is a four-field interface with pinned defaults, `ConfigPaths` takes two required strings, and all seven handlers are no-op registrations whose only contract is the entry test's assertion of exactly seven `pi.on` calls against a fake that throws on any other member. No file is read, no path is resolved, no trust is checked, and no logging exists under `src/`; the repository enforces no import-boundary check beyond review (ADR 0001, ARCHITECTURE.md §8).",
  "paraphrase_proposes": "The design builds a synchronous, host-free `loadTaiknrConfig` in `src/config/taiknr-config.ts` that hand-validates two optional JSON files against a per-field rule table, layers them field by field (trusted project over agent over defaults), and classifies read errors so only a genuinely absent file is silent. Resolution runs in the session-start infra bridge at every `session_start` — paths built with `resolve` from the host helpers and `ctx.cwd`, trust gated into an optional project path — assigning a three-state holder (`unresolved | rejected | ready`) created per factory call in `src/config/session-config.ts`; a rejection assigns `rejected` then throws one error naming file, field, reason, and recovery step. Inertness is one gate at the composition root (`createGatedPi` in `src/app/extension/handler-gate.ts`) wrapping `pi.on` for the six non-session-start registrars, and the holder replaces the pinned constant in the turn-end and context deps. The holder's `setEnabled(boolean): boolean` is the single seam left for the deferred `/taiknr` command; tests mirror the `src/` layer each exercises with one shared handler-capturing fake, and no command, watcher, writer, log, or resolution record is built.",
  "recommendation": "Pass on structure, round 2: all four round-1 structural resolutions are verified applied (the enumerated permitted-difference list with `interface` kept and a differences-against-HEAD note, the host-neutral message with the recovery line appended only by the handler's throw, `resolve()` path building with the relative-`PI_CODING_AGENT_DIR` test row, deterministic key order with the two-key test row, plus the declined wording items — ENOTDIR project-only, the dangling-symlink-above risk, the D9 alternative, the fake-pi shared-by clause, and the orientation-D citation prefixes with a Context legend). Placement, dependency direction, one-home discipline, and risk calibration hold against the repository. One minor cross-artifact drift remains: proposal.md still calls the session-start path builds 'the two `join` calls' where design D5 now pins `resolve`; fix the one word in the proposal (the council record stays as history) or decline with that wording."
}