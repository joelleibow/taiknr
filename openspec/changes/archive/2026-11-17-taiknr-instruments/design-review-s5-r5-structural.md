{
  "mode": "review",
  "lens": "council-structural",
  "paraphrase_proposes": "tasks.md proposes a fifteen-group plan for taiknr's four Jefferson instruments: 15 new source files — four domain calculators (token estimate, context figures, calibration, dollars), a use-case publisher holding every event's instrument state behind one deferred reading per event, a composition-root holder whose no-op stands until install, a declaration and a bus adapter, one readings module, and six publishing registrars — plus 15 mirrored test files, with only four source files modified and every frozen contract kept. A `jeffersonInstruments` switch, default on, is read only by the session-start publishing registrar, which builds the publisher and emits registration and opening figures before its first await; pi-jefferson 0.14.0 is pinned as an exact type-only devDependency enforced by `verbatimModuleSyntax`. Every task is test-first with a redgreen label or a stated reason it has none, drift and boundary `rg` checks re-run after the groups that can change them, and group 15 is Joel's live acceptance, never the coder's tick.",
  "paraphrase_existing": "At abaa6b0 taiknr is a seven-registration pi extension behind a config gate: turn_end stages large tool outputs, agent_before_settle drafts stub `context_edit`s plus a side-store entry and commits the in-memory ArchiveStore, hydration rebuilds that store from the branch at session_start/tree/compact, and recall scores the archive inside context_with_system, appending one per-request text block and persisting nothing. The store keeps each item's `stub` and `rawText` but records no token size and publishes nothing. pi's own context figure falls back to characters ÷ 4 after any context_edit, which is the post-settlement drop the instruments exist to answer.",
  "recommendation": "Approve: implementation-ready. The file boundary, interfaces, task order and verification are internally coherent and check out against the repository at every point I could verify on disk; the plan leaves the coder no decision beyond module-private choices, keeps one home per fact, and re-runs every check a later group can change. One minor completeness note: the jefferson-instruments scenario *Shutdown clears the fields* names neither a test nor Joel's observation, though 15.1's /reload covers it; attach that one line or accept the recorded disposition.",
  "findings": [
    {
      "id": "S5-R5-STRUCT-1",
      "severity": "minor",
      "location": "openspec/changes/taiknr-instruments/tasks.md — Scenario coverage, `jefferson-instruments` → *Every declared field carries a value from the moment it is declared* (the *Shutdown clears the fields* entry); also specs/jefferson-instruments/spec.md, same requirement",
      "finding": "The delta scenario *Shutdown clears the fields* has no test — correctly reasoned, since taiknr registers no `session_shutdown` handler (ruling 12) — but unlike *Joel's live look is the acceptance* it is also not marked as Joel's to observe, so implementation-readiness-standard §3's only escape clause for an unproven scenario names no owner for it. The two sibling unprovable scenarios (*Turning off mid-session*, *A mid-session off freezes it*) genuinely cannot be observed before the deferred `/taiknr` command exists, but this one is owner-observable: 15.1's `/reload` shows Jefferson's fields cleared and then re-posted by the fresh registration.",
      "rationale": "§3 says a scenario no test proves fails the plan unless it is marked as Joel's to observe. The entry stops at 'has no taiknr test', which records the absence but names no observation, so an auditor cannot tick the scenario under either arm of the clause.",
      "concrete_case": "A reviewer walking the jefferson-instruments delta against §3 reaches *Shutdown clears the fields* and finds in the coverage entry tasks 3.2, 6.1, … and labels A5/A11, no test that proves the scenario, and no Joel marking — only the sentence '*Shutdown clears the fields* is Jefferson's own behaviour … and has no taiknr test'.",
      "recommendation": "Add one clause to 15.1 (e.g. 'the rows also show every field cleared at shutdown and re-posted at the fresh registration') or one line to the coverage entry naming 15.1 as the scenario's owner observation; either is a one-line edit to tasks.md needing no code."
    }
  ],
  "assumptions": [
    {
      "assumption": "All 15 Modify paths in the File Boundary exist at the stated locations, and the base holds exactly 22 `tests/**/*.test.ts` files",
      "status": "verified"
    },
    {
      "assumption": "Only `tests/config/session-config.test.ts:9` and `tests/app/extension/handler-gate.test.ts:8` hold full `TaiknrConfig` literals (the others spread `DEFAULT_TAIKNR_CONFIG`), so 11.1's TS2741 claim reaches exactly those two",
      "status": "verified"
    },
    {
      "assumption": "`the known fields accept their valid values` sits at tests/config/taiknr-config.test.ts:228, as 11.1 states",
      "status": "verified"
    },
    {
      "assumption": "`tests/app/extension/taiknr.test.ts` asserts the sorted seven-event list against a fake that throws on any member but `on`, so 14.1's base of 7 and the 13-entry target are well-formed",
      "status": "verified"
    },
    {
      "assumption": "`src/infra/pi-event-handlers/context.ts:63` holds `4 * (window - reserve - estimate)` and `agent-before-settle.ts:46` holds the `// 4. Drain` comment, so 2.2/14.5's `rg` expectations name real hits",
      "status": "verified"
    },
    {
      "assumption": "`src/` holds no `console.` call and no writeFile/appendFile/mkdirSync/`pi-jefferson.json`, so the 'no log line' and 'no host file' claims hold at the base",
      "status": "verified"
    },
    {
      "assumption": "`createPiJevScorerAdapter(ctx, config)` currently takes two parameters, and `ArchiveStore` already exposes `getAll()` and `size()` with no member added",
      "status": "verified"
    },
    {
      "assumption": "`writeClassifierAgentConfig(agentDirectory, fields)` accepts extra fields, so 14.3's `{ jeffersonInstruments: false }` layering works as written",
      "status": "verified"
    },
    {
      "assumption": "`isActive()` is `ready && enabled`, so the gate's skip of a rejected config at session start is as 13.1 describes",
      "status": "verified"
    },
    {
      "assumption": "`tsconfig.json` lacks `verbatimModuleSyntax` and `package.json` lacks `pi-jefferson`, matching 1.1/1.2's Modify rows and 'not an existing path' note",
      "status": "verified"
    },
    {
      "assumption": "The 22-file/328-test baseline and the mktemp measurements behind the settled findings (load check, registration order, emit isolation, projection counts) still hold at HEAD; not re-run by this read-only lens",
      "status": "unverified"
    },
    {
      "assumption": "The 6.3/6.4 numeric examples (−700/−699, −0.013125, −0.0131229, −$0.05916) were hand-checked and agree with D8's rates; the publisher's runtime behaviour itself is not executed here",
      "status": "unverified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "Did not run `npm run check`, vitest, or the load check; all counts and mktemp measurements are taken from the settled findings (ruling 17, RDY2-8, RDY4-1).",
    "Did not read `proposal.md`, `council.md`, `michael-orientation.md`, `michael-council-rulings.json`, or the living `openspec/specs/` beyond what the deltas quote; they are cited by tasks.md and outside this lens's read list.",
    "Did not inspect pi-ai, pi-coding-agent, or pi-jefferson sources; host and contract behaviour is taken from research-chidi and the settled findings.",
    "Did not verify the spike's green totals (438 tests / 32 files) or re-derive its consolidated-file count beyond the settled RDY4-1 entry.",
    "Did not re-verify git HEAD equals abaa6b0 or the tree's untracked state; the brief states it and every file read was consistent with it."
  ]
}