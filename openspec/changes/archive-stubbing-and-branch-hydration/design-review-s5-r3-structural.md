{
  "mode": "review",
  "lens": "council-structural",
  "paraphrase_proposes": "tasks.md proposes to implement the archive half of taiknr in 13 ordered groups: a shared surrogate-safe single-line truncation helper and the stub renderer in the domain, the staging/commit/hydration seams in the use cases, three Pi translations plus the side-store batch in the adapter, five event-handler bodies, one shared-fixture change, ten new test files (including a zero-network session-level suite), whole-tree boundary and rule verification against a recorded base commit, and Joel's own live check. No production file is created and no signature changes; every task names its failing test, boundary cases, and verification.",
  "paraphrase_existing": "Per the artifacts, the existing system has every seam declared but every body missing: `buildStub`, the three adapter translations and the four use-case bodies throw `Not implemented`, and six of the seven handlers register and return no-ops; `session_start` only resolves config and leaves its store parameter unused. The composition root already builds the store, `argsByCallId`, the pending array, the content map and the gated `pi`, and registers all seven events. Six existing test files with 80 cases pin config loading, the gate, and domain boundaries, and the fake host has no session manager.",
  "recommendation": "PASS — tasks.md is implementation-ready: the file boundary, layering, order and verification all check out against the repository, and Derek can execute every task without a design decision. Two minor findings remain (one spec scenario without a named landing, one inaccurate preamble claim); neither blocks execution, and one owner question decides the cheapest disposition of the first.",
  "findings": [
    {
      "id": "ST-S5-R3-1",
      "severity": "minor",
      "location": "openspec/changes/archive-stubbing-and-branch-hydration/tasks.md — 'Verification rules for this card', fifth bullet ('The two scenarios design review mapped here are named where they land') and group 10 (10.3); against specs/archive-stubbing/spec.md — Requirement 'The store is an optimistic cache over the branch...', Scenario 'A boundary Pi discards'",
      "finding": "The archive-stubbing spec's 'A boundary Pi discards' scenario — Pi rejects or discards a settlement boundary after taiknr already drained its committed items into the store, the store still holds them, and the next start/tree/compact reconciles it — has no named landing in tasks.md, while the other two design-review-mapped scenarios (the 36-character UUID id → 5.1, pre-compaction retention → 9.5) are explicitly named in the verification rules.",
      "rationale": "Structural completeness demands every spec scenario be claimable by a task or a stated mapping; this is the only one a coverage audit finds unclaimed. Its constituent facts are individually pinned (8.1 asserts the store holds committed items when the handler returns; 8.2's error behaviour states a failed boundary is reconciled by the next hydration rather than a compensating write; 4.3 and 9.3–9.5 pin whole replacement), so execution is not blocked and no spec requirement is untested in substance.",
      "concrete_case": "An extension registered after taiknr returns `{ entries: [itsOwnDraft] }` without spreading `event.entries` at `agent_before_settle` — the exact path Decision 8 documents ('if a later handler replaces event.entries without spreading, taiknr's drafts are dropped, which Decision 7's optimistic-cache rule already covers'). Pi then persists none of taiknr's drafts while `InMemoryArchiveStore` and the committed batch keep the raw items; no task drives this discard, and no verification-rules bullet names where the scenario's clauses land.",
      "recommendation": "Cheapest honest fix: extend the verification-rules mapping bullet to name the scenario's landing — 4.3, 8.1–8.2 and 9.3–9.5 as its compositional pins — matching the pattern already used for the other two mapped scenarios. Alternatively, add a non-spreading variant of 10.3's after-taiknr competitor to drive the discard end to end (asserting the branch carries no taiknr-side-store or context_edit entry while `errors` is empty)."
    },
    {
      "id": "ST-S5-R3-2",
      "severity": "minor",
      "location": "openspec/changes/archive-stubbing-and-branch-hydration/tasks.md — preamble, second paragraph ('…the two spec deltas own the required behaviour, so neither is restated')",
      "finding": "The preamble claims that neither design.md nor the spec deltas are restated, yet 2.2, 5.4, 5.6 and 7.2 transcribe design's binding rules in full (the separator regex and cut rule, the draft shapes and order, the well-formed-item guard predicate, the join order and mutation discipline) rather than citing them. Only the preamble's own description is inaccurate; the transcriptions themselves are exactly what makes the tasks zero-decision under the readiness standard and must stay.",
      "rationale": "A calibrated-claim defect: the document misdescribes its own structure, and a reader trusting the preamble would expect point citations where verbatim copies sit. A copy that its own header calls a citation invites silent divergence when the authority changes.",
      "concrete_case": "If Decision 4's rule in design.md were later amended (say, a different preview unit cap), a maintainer reading the preamble would treat tasks.md 2.2 as a pointer to the authority rather than a second copy — the copy in 2.2 would then keep the stale rule while the tasks execute it verbatim.",
      "recommendation": "Soften the preamble sentence to state what is true: the spec deltas' required behaviour is not restated, and binding rules are transcribed from design.md, which remains the authority on any divergence. One-line edit, no task content changes."
    }
  ],
  "assumptions": [
    {
      "assumption": "All 14 Modify paths exist with exactly the declarations, bodies and signatures tasks.md and Eleanor's Addendum transcribe (checked by reading every file).",
      "status": "verified"
    },
    {
      "assumption": "The 10 Create test paths follow design.md's Module & File Placement test table and mirror source layers.",
      "status": "verified"
    },
    {
      "assumption": "The 0.1 baseline of 6 test files and 80 cases reconciles by literal count, including test.each expansions (27 + 2 in taiknr-config.test.ts) and the one test.skipIf case.",
      "status": "verified"
    },
    {
      "assumption": "The gate claims hold: `npm run check` = lint then typecheck then test; biome `lineWidth` 120; `files.includes` scopes the formatter to src/**, tests/** and four root config files, matching 11.1's allowlist claim.",
      "status": "verified"
    },
    {
      "assumption": "11.3's production-rule greps start from a passing state: no `console.` anywhere in src/, no `@earendil-works/pi-` import in src/domain or src/use-cases, while src/infra has such imports (the control).",
      "status": "verified"
    },
    {
      "assumption": "Every Pi API the group 9–10 harnesses rely on exists in the installed 1.5.2 package: `SessionManager.inMemory`, `appendCustomEntry`, `appendCompaction(summary, firstKeptEntryId, tokensBefore, ...)`, `appendContextEdit`, `bindExtensions` (agent-session.js:2756), `registerNativeProvider`, the `fauxProvider`/`fauxToolCall`/`fauxAssistantMessage`/`setResponses`/`FauxResponseFactory` family in pi-ai, `navigateTree`, and `ExtensionAPI.registerTool`.",
      "status": "verified"
    },
    {
      "assumption": "`package-lock.json:667` is the hoisted `node_modules/@earendil-works/pi-ai` entry, as 10.1's shortcut comment claims.",
      "status": "verified"
    },
    {
      "assumption": "The working tree is `main` `4e951a2` with a clean status outside the change directory (0.1's precondition).",
      "status": "unverified"
    },
    {
      "assumption": "The RD-S5-R1-8 mktemp harness verification of group 10's recipe actually ran, as the group-10 preamble asserts; treated as settled from round 1 and not re-opened.",
      "status": "unverified"
    },
    {
      "assumption": "Chidi's Pi 1.5.2 behavioural transcriptions not directly re-checked here (abort-mid-tool outcome, `_startRun` skipping before-settle, compaction's two-summary split) hold as transcribed.",
      "status": "unverified"
    }
  ],
  "owner_questions": [
    {
      "question": "The archive-stubbing spec's 'A boundary Pi discards' scenario is the only mapped-requirement scenario without a named landing in tasks.md. How should it be dispositioned?",
      "options": [
        "Name its landing in the verification-rules mapping (4.3, 8.1–8.2, 9.3–9.5 as compositional pins), matching the pattern already used for the 36-char id and pre-compaction scenarios",
        "Add a non-spreading after-taiknr competitor case to 10.3 that drives the discard end to end",
        "Accept it as covered compositionally with no document change"
      ],
      "recommended_option": "Name its landing in the verification-rules mapping (4.3, 8.1–8.2, 9.3–9.5 as compositional pins), matching the pattern already used for the 36-char id and pre-compaction scenarios",
      "why": "It is the cheapest honest fix: every clause of the scenario is already pinned by existing tasks, the document already established named mapping as its mechanism for exactly this kind of scenario, and it avoids growing group 10 — the slowest test file — for a fact whose substance (store written before Pi commits; no compensating write; hydration reconciles) is already asserted at the layer level."
    }
  ],
  "not_checked": [
    "The standards files `~/.pi/agent/skills/conductor-janet/standards/feature-spec-standard.md` and `zoom-out-standard.md` — absent at the cited paths and not found anywhere under the project or home `.pi` trees, so they could not be applied; the implementation-readiness standard was read and used instead.",
    "Live execution: `npm run check`, `npx vitest run`, and any mktemp load check — no shell execution is available in this step.",
    "git state: HEAD hash, clean status, and the group 11 commit/diff choreography were taken from the document and prior-round settlements, not re-verified.",
    "Chidi's Pi behavioural transcriptions beyond the API-existence spot-checks (abort outcome computation, before-settle skip, compaction summary count) — accepted from research-chidi.md.",
    "The citation targets in michael-orientation.md, council.md, and the prior-round review files (council-critic, catalyst, comprehension, zoom-out) were not re-read.",
    "All settled findings from rounds 1 and 2 were skipped per the brief, including the six-vs-eight session-start count, the findLast/dedup nits, the *.md diff timing, and the helperExtension identifier."
  ]
}