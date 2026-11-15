{
  "assumptions": [
    {
      "assumption": "HEAD sources match the design's claims: `src/config/taiknr-config.ts` exports the four-field `interface TaiknrConfig` (no `enabled`), `DEFAULT_TAIKNR_CONFIG`, two-required-string `ConfigPaths` and the `Not implemented` stub; `taiknr.ts:19` pins the constant; `session-start.ts` registers a no-op with `_pi`/`_store`; `turn-end.ts`/`context.ts` deps carry `config: TaiknrConfig` with the other members the design says are unchanged; `RecallCache` is declared at `recall-relevant-context.ts:11` and type-imported by `context.ts:4`",
      "status": "verified"
    },
    {
      "assumption": "Tooling scopes support the test plan: vitest include is `tests/**/*.test.ts` (so `tests/support/fake-pi.ts` is not collected), and biome/tsconfig cover `tests/**` per ARCHITECTURE.md §8",
      "status": "verified"
    },
    {
      "assumption": "All round-1 structural resolutions are applied: the extension-packaging enumerated permitted-difference list with the `interface` keyword kept, the differences-against-HEAD sentence, the `_pi`/`_store` prefix note, the fake-pi 'shared by the gate and session-start tests' clause, the `orientation D N` citation prefixes and the Context legend ('bare `D N` refers to this document's Decisions')",
      "status": "verified"
    },
    {
      "assumption": "All round-2 resolutions are applied: critic-r2-1's D4 Reason column with the input-class mapping sentence and the Files-table loader-row reason assertions (`-1`/`\"600\"` → `must be an integer >= 0`; `1e999` → `must be a number`); critic-r2-2's `Object.keys` insertion-order wording ('integer-like keys first') and the two-key test row; critic-r2-3's fenced `ts` throw block in D5 step 4 and 'assessed the cost' in Risks; structural-r2-1's proposal wording ('The two path builds (`resolve`, …)') with no residual `join` in any living artifact (council.md, michael-orientation.md and the rulings JSON keep `join` only as history)",
      "status": "verified"
    },
    {
      "assumption": "The holder's placement in `src/config/session-config.ts` and the infra→config type-import direction follow the recorded revision of ruling 1 and the research-eleanor addendum (no written rule forbids infra→app; none exists at HEAD; `RecallCache` precedent: declared in use-cases, type-imported by infra)",
      "status": "verified"
    },
    {
      "assumption": "Pi host measurements relied on (factory cached not the instance, per-handler throw caught on a carried channel, stderr surfacing in print/JSON modes, thirteen stripBom sites, TS2769 requiring the `LooseOn` cast, env-relative `getAgentDir()`) are accurate as recorded in council.md and michael-orientation.md",
      "status": "unverified"
    }
  ],
  "findings": [
    {
      "concrete_case": "A reader tracing proposal.md's 'The field exists because the host's own disable needs a reload (D11)' with design.md's legend in mind opens design.md D11 and finds 'Tests mirror the layer each one exercises, with one shared fake' — a wrong referent; the intended source is michael-orientation.md's addendum D11 (the host `pi config` disable route). The same holds for proposal '(S1; Trap 3; D2)' (community preference vs design D2 `ConfigPaths` optionality), '(ruling 6; D6)' (frozen signatures vs design D6 read-error classification), '(D4; S9, S15)' (docs pass vs design D4 validation), '(ruling 9; S7, S14; D7)' (test conventions vs design D7 BOM), and '(D10, narrowed…)' (scope exclusions vs design D10 no-orchestrator).",
      "finding": "proposal.md cites `michael-orientation.md`'s decision numbers bare in six places — `(S1; Trap 3; D2)`, `(D11)` in Why, `(ruling 6; D6)`, `(D4; S9, S15)`, `(ruling 9; S7, S14; D7)`, `(D10, narrowed…)` — while design.md's Context legend, added by the round-1 fix, now declares that bare `D N` refers to design.md's own Decisions D1–D13. The proposal's citations predate design.md and were unambiguous when written, but across the change directory's two living narrative artifacts the same code now resolves to two different decisions, and the proposal is inconsistent with itself (it writes `orientation §2` and `design D5` explicitly elsewhere).",
      "id": "S3R3-STR-1",
      "location": "proposal.md — 'Why' ('…needs a restart or `/reload`… (D11)'), 'What Changes' first bullet ('(S1; Trap 3; D2)'), BREAKING bullet ('(ruling 6; D6)'), tests bullet ('(ruling 9; S7, S14; D7)'), docs-pass bullet ('(D4; S9, S15)'), 'Deliberately not in this change' ('(D10, narrowed…)'); design.md — Context, citation legend ('bare `D N` refers to this document's Decisions')",
      "rationale": "Structural completeness and coherent cross-references: this is the residue of the colliding-D-scheme class that structural-r1-3/critic-r1-3 fixed inside design.md (prefixing design.md's orientation citations and adding the legend); the proposal-side half of the same fact was never prefixed because design.md did not exist when the proposal was written. The proposal is a living artifact of the change directory (established by structural-r2-1, which Michael resolved by wording the proposal to follow the design), so its citation scheme should not collide with the convention the design's own legend now establishes. Severity is minor: every referent is recoverable from context, no behavior, contract or test is affected, and the class was twice declined as wording.",
      "recommendation": "One sentence in proposal.md's citation preamble — 'Bare `D N` codes refer to `michael-orientation.md`'s Decisions' — or prefix the six bare citations with `orientation`, matching design.md's convention; council.md, michael-orientation.md and the rulings JSON stay untouched as history. Declining is safe: wording only, recoverable referents, no implementation contract affected.",
      "severity": "minor"
    }
  ],
  "lens": "council-structural",
  "mode": "review",
  "not_checked": [
    "`tasks.md` — Stage 4 artifact, not yet present, so design-to-tasks alignment is out of scope this round",
    "Live re-measurement of any Pi host behaviour; the brief forbids running anything, so all host claims stay traceable to recorded measurements only",
    "`michael-orientation.md`, `research-chidi.md` and `research-eleanor.md` in full — citation resolution and fix verification by targeted read/grep only",
    "The other six lens reports and `michael-resolve-s1s2.json`'s settled findings beyond the sections this lens re-verified",
    "`node_modules/` Pi internals beyond the files the design's host claims cite (loader.js, types.d.ts) — settled in council and not re-opened"
  ],
  "owner_questions": [],
  "paraphrase_existing": "At HEAD, `loadTaiknrConfig` throws `Not implemented` and `src/app/extension/taiknr.ts:19` pins `DEFAULT_TAIKNR_CONFIG` by value into the turn-end and context handler dependencies, so a user's config file changes nothing. `TaiknrConfig` is a four-field interface with pinned defaults, `ConfigPaths` takes two required strings, and all seven handlers are no-op registrations whose only contract is the entry test's assertion of exactly seven `pi.on` calls against a fake that throws on any other member. No file is read, no path is resolved, no trust is checked, and no logging exists under `src/`; the repository enforces no import-boundary check beyond review (ADR 0001, ARCHITECTURE.md §8).",
  "paraphrase_proposes": "The design builds a synchronous, host-free `loadTaiknrConfig` in `src/config/taiknr-config.ts` that hand-validates two optional JSON files against a per-field rule table with pinned reason strings, layers them field by field (trusted project over agent over defaults), and classifies read errors so only a genuinely absent file is silent. Resolution runs in the session-start infra bridge at every `session_start` — paths built with `resolve` from the host helpers and `ctx.cwd`, trust gated into an optional project path — assigning a three-state holder (`unresolved | rejected | ready`) created per factory call in `src/config/session-config.ts`; a rejection assigns `rejected` then throws one error naming the file, field, reason and recovery step. Inertness is one gate at the composition root (`createGatedPi` in `src/app/extension/handler-gate.ts`) wrapping `pi.on` for the six non-session-start registrars, and the holder replaces the pinned constant in the turn-end and context deps. The holder's `setEnabled(boolean): boolean` is the single seam left for the deferred `/taiknr` command; tests mirror the `src/` layer each exercises with one shared handler-capturing fake, and no command, watcher, writer, log or resolution record is built.",
  "recommendation": "Pass on structure, round 3: every round-1 and round-2 resolution is verified applied — the extension-packaging enumerated permitted-difference list with `interface` kept and a differences-against-HEAD note, the host-neutral message with the recovery line appended only by the handler's throw, `resolve()` path building with the relative-`PI_CODING_AGENT_DIR` test row, the D4 Reason column with the input-class mapping and the two-key test row, the `Object.keys` insertion-order wording, the fenced D5 throw block, 'assessed' replacing the unmeasured claim in Risks, and the proposal's 'two path builds (`resolve`)' wording. Module placement, dependency direction, one-home discipline, spec/design/proposal alignment and risk calibration all hold against the live tree, and no settled ruling is touched. One minor cross-reference residue remains (S3R3-STR-1): proposal.md's bare `D N` citations now collide with the bare-D convention design.md's Context legend establishes; fix with one preamble sentence or six `orientation` prefixes, or decline as wording — nothing blocks Stage 4."
}