{
  "assumptions": [
    {
      "assumption": "Every file path in the Module & File Placement table exists (M) or is absent (C) as the table claims, and the seven handler files, the adapter signatures, the port contracts, RecallCache and RecallRelevantContextInput match the design's citations at HEAD.",
      "status": "verified"
    },
    {
      "assumption": "No @earendil-works/pi-* import enters src/domain/ or src/use-cases/, so the design's layering claim holds at HEAD.",
      "status": "verified"
    },
    {
      "assumption": "A root-level test-recall-live.mjs sits outside the vitest include (tests/**/*.test.ts), biome's files.includes allowlist and the tsconfig program, so no tooling file changes.",
      "status": "verified"
    },
    {
      "assumption": "Settlement writes the stub text block followed by the original non-text blocks, and ContextEditEntry carries no author, so decision 5's first-block comparison is the only buildable authorship read.",
      "status": "verified"
    },
    {
      "assumption": "buildStub previews the first three lines at 180 units and summarizes tool name and args at 120 units, so decision 6's sample question and decision 13's marker beyond line 3 and character 180 are consistent with the code.",
      "status": "verified"
    },
    {
      "assumption": "The next ADR number is 0007 (records 0001-0006 exist), ARCHITECTURE §3/§5/§7 and the intro, README's field table, and AGENTS.md's opening paragraph are the sections the docs pass names.",
      "status": "verified"
    },
    {
      "assumption": "Decision 10's 381-character two-item string and 263-character single-item string are arithmetically consistent with the stated line-joining rule (verified by hand count).",
      "status": "verified"
    },
    {
      "assumption": "pi-side claims (classify options timeoutMs/maxRetries, context_with_system semantics, the settings resolution chain, estimateTokens exported from the package root) hold as measured in the rulings and research; they were not re-run in this review.",
      "status": "unverified"
    }
  ],
  "findings": [
    {
      "concrete_case": "If DefaultResourceLoader does not treat a lone .mjs file in an additionalExtensionPaths entry as an extension, the probe never registers, the script has no pre-recall snapshot, and the byte-identity pass condition is unbuildable as written — discovered only when the coder runs the script.",
      "finding": "The live script's pre-recall snapshot rests on an untagged loader fact: a bare .mjs probe written into a temp directory and listed before the repository root in additionalExtensionPaths is assumed to load, and to load before extensionFactories.",
      "id": "STR-1",
      "location": "design.md, Decision 13 (4) Observation; Migration Plan step 4",
      "rationale": "Pass condition (5) compares every post message with a pre snapshot taken before taiknr's handler appends, and only an extension ordered before the repository root can take it. Every neighbouring load claim carries a measurement tag (the root .mjs manifest load, ERR_MODULE_NOT_FOUND, 2 → 3 messages), but this one names no source; the measured path loads the repository root through its package.json manifest, not a single-file extension.",
      "recommendation": "Cite the loader's documented handling of single-file extensions (or record a measured probe), or load the pre-probe as a directory with its own manifest, which the loader provably handles; tag the ordering claim (additionalExtensionPaths before extensionFactories) to its source as well.",
      "severity": "minor"
    },
    {
      "concrete_case": "The coder implements the adapter timeout case with a hand-built ctx.modelRegistry: the guard's pi.registerProvider path needs a session with extension factories, so a second hanging fetch stub and a second provider registration get written beside the guard's, and the two stubs drift.",
      "finding": "The timeout proof needs exactly the machinery the shared guard owns — a provider whose classifier API maps to pi-ai's System One classify plus a stubbed global fetch that hangs until aborted — but the guard's stated scope is every session-level recall test plus archive-session.test.ts, and the adapter test the design pins the timeout proof to is not session-level.",
      "id": "STR-2",
      "location": "design.md, Module & File Placement (tests/support/classifier-guard.ts and tests/infra/adapters/pi-jev-scorer-adapter.test.ts rows); Decision 12, 'The timeout is proved through pi-ai's real path'",
      "rationale": "One home for each fact is the standard the guard exists to serve. Left unstated, the adapter test either duplicates the provider registration and hanging fetch stub locally, or reaches for a guard whose registration route (an inline extension's pi.registerProvider) is not available to a hand-built ctx.modelRegistry.",
      "recommendation": "Name the adapter timeout test among the guard's users and give the guard a session-independent registration route (ModelRuntime.registerNativeProvider, Chidi §5) alongside the inline-extension one, or move the timeout proof to a session-level test that takes the guard as it stands; pick one so the hanging-fetch stub keeps one home.",
      "severity": "minor"
    }
  ],
  "lens": "council-structural",
  "mode": "review",
  "not_checked": [
    "pi's installed sources (runner.js, agent-session.js, settings-manager.js, system-one-shared.js) were not re-read; their cited line numbers are taken from research-chidi.md and the rulings' evidence.",
    "michael-orientation.md was not read directly; D/S/T citations were resolved through council.md and the rulings.",
    "The living specs under openspec/specs/ (development-checks, archive-stubbing, configuration, extension-packaging) were not read beyond the change's three deltas; tooling claims were verified against vitest.config.ts, biome.json and tsconfig.json instead.",
    "No network or model call was made; the live script's provider-side behaviour and the OpenRouter tool-call round trip are unverified by construction and are disclosed as such in the design.",
    "git state (main at 22113ac) and npm run check were not run; the test baseline is Eleanor's report."
  ],
  "owner_questions": [],
  "paraphrase_existing": "Per the document, taiknr's archive half works end to end: settlement commits a taiknr-side-store batch plus one context_edit per item whose replacement is the stub text block followed by the original non-text blocks, hydration rebuilds the Map-backed store from the branch, and the store's read API is size(), get() and getAll() in insertion order. The recall path is all stubs — both context-adapter exports, the domain formatter, the use case and the scorer's score throw, the registration is an empty context handler, and the composition root passes a placeholder notifier. Handlers read the session's resolved config from a holder at event time only while it is ready, and a composition-root gate stops every handler but session_start while taiknr is off.",
  "paraphrase_proposes": "The design implements recall on context_with_system: per request it derives the latest user prompt, computes a character budget from pi's window, reserve and estimate, derives eligible archived ids from the branch, and makes one bounded classify call whose selected items are appended as one marker-guarded <recalled_context> text block on that message. A token of store size plus prompt key caches one scoring per key, with eligibility re-checked and the budget re-applied on every request. Failures cross the frozen port as a rejection carrying the notice (once per session, built in the handler), cancels return undefined, and a new classifierTimeoutMs field bounds the wait. A shared test guard keeps the suite off the network, and a root-level live script verifies the provider payload by hand.",
  "recommendation": "Approve for implementation. Every structural claim I could check against the tree holds: the module table's C/M rows match the filesystem, no pi import enters src/domain/ or src/use-cases/, the frozen signatures and RecallCache shape are exactly as the design says, the root-level live script sits outside the vitest include, the biome allowlist and the tsconfig program, every tail-recall/configuration/packaging requirement maps to a decision, and the docs pass names real sections. Two minor test-side placements (STR-1, STR-2) should be settled in the design or tasks.md; neither changes a contract, a requirement or the task breakdown."
}