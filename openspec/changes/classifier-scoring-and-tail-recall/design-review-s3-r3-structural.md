{
  "assumptions": [
    {
      "assumption": "The Module & File Placement table's C/M labels match the repository tree: every Modify row names an existing file (nine source rows, seven test rows, README/ARCHITECTURE/AGENTS) and every Create row names a path absent today (tests/domain/recall.test.ts with tests/domain/ holding only archived-output.test.ts; the four adapter/use-case test mirrors; tests/infra/pi-event-handlers/context.test.ts with no file at that mirror path; tests/support/classifier-guard.ts with only fake-pi.ts beside it; root test-recall-live.mjs absent; docs/adr ending at 0006 so 0007 is next).",
      "status": "verified"
    },
    {
      "assumption": "Both round-2 required changes are applied as specified: the Risks row's mitigation states the corrected frequency (exposure as wide as the block; the 1,000,000-, 262,144- and 40,960-token tiers; a compaction following nearly every large-item recall on the 40,960 model; raising reserveTokens or decisionThreshold as the lever), and decision 13's (6) reads pre-probe snapshots of prompt 2's requests and prompt 3's first request with prompt 1's own requests excluded via the agent_before_settle sentence.",
      "status": "verified"
    },
    {
      "assumption": "critic-r1-CRIT-1's narrowed wording is present and consistent everywhere it was required: the tail-recall requirement 'Recall keeps its own request under the host's compaction threshold' scoped to pi's own estimate, the new requirement 'The bound covers only the request recall builds' with its scenario, proposal.md's added sentence, design decision 2's paragraph and alternatives, and the README/ADR docs-pass rows.",
      "status": "verified"
    },
    {
      "assumption": "The extension-packaging delta restates both living requirements it modifies in full (loads-without-error with 'a handler' for 'a no-op handler' and context_with_system in the event list; signatures-preserved with the fourth enumerated difference dropping notifier), and its 'Load check passes' scenario text is unchanged from the living spec including the '(design.md Decision 6)' citation, so structural-r2-STR-1's condition (do not reopen unless the delta's scenario text changes) does not fire.",
      "status": "verified"
    },
    {
      "assumption": "The design's source citations hold: RecallCache {lastPromptKey, lastRecalledIds} and RecallRelevantContextInput's four existing fields in recall-relevant-context.ts; RecalledOutput's four fields identical to ArchivedToolOutput's four (archived-output.ts L10-17); ArchiveStore's read API over a Map in ports.ts; buildStub's 180-unit preview and 120-unit tool name and args summaries; argsSummary at most 120 units via tool-call.ts; minCharsToArchive 600 and decisionThreshold 0.5 defaults; the placeholder notifyOnce in taiknr.ts; warned set before notify in pi-notifier-adapter.ts; _pi.on(\"context\") and the {config, store, notifier, recallCache} dependency object in context.ts; the ready-guarded holder accessor in turn-end.ts; addBatch at commit-archived-batch.ts L8 and replaceAll at hydrate-archive-store.ts L6 with session-start's hydration call; and the PoC's template-literal id interpolation at jev-context-poc.ts L110.",
      "status": "verified"
    },
    {
      "assumption": "The import boundary holds: no @earendil-works import under src/domain/, src/use-cases/ or src/config/; pi imports appear only in app/extension and infra.",
      "status": "verified"
    },
    {
      "assumption": "The Risks row's corrected numbers are grounded and its arithmetic is right: the 262,144- and 40,960-token oMLX windows exist in ~/.pi/agent/models-store.json alongside 1,000,000-token entries; thresholds 983,616 / 245,760 / 24,576 at reserveTokens 16,384; roughly top 7% and over a quarter of the threshold; 10,000 + 12,800 = 22,800 with a 2,000-token step passing 24,576; and decision 8's 14x/20x/60x ratios against the 361 ms maximum, the 241-248 ms medians and the 300 s stall.",
      "status": "verified"
    },
    {
      "assumption": "Decision 10's exact block strings count as asserted: 381 UTF-16 code units for the two-item block and 263 for the first item alone, recounted by hand this round (18+138+0+66+8+8+0+91+24+19 = 372 plus 9 newlines; the guard's backslash included in the 24).",
      "status": "verified"
    },
    {
      "assumption": "The coverage table maps every requirement in the three deltas (twelve tail-recall, one configuration, two extension-packaging) to decisions or to an explicit no-decision, and the cross-references in design.md resolve (decisions 1-13, rulings 1-18, the named spec scenarios, the cited living-spec sections).",
      "status": "verified"
    },
    {
      "assumption": "pi dist internals cited by the design (runner.js L1043-1060, settings-manager.js L654-683, agent-session.js L473-487/L594-595/L2574-2604, compaction.js L137-169/L173-177, system-one-shared.js L47-55/L100-108, classifier-shared.js, anthropic-messages.js L1408-1431) hold as described.",
      "status": "unverified"
    },
    {
      "assumption": "The mktemp probe measurements behind decisions 2, 12 and 13 (pi's next-check compaction after a full recall, the fetch-stub guard catching the systemone URL, the additionalExtensionPaths load order with the pre-probe running first, the 2-to-3 message hand-off) hold as recorded in the round-1/2 evidence.",
      "status": "unverified"
    }
  ],
  "findings": [],
  "lens": "council-structural",
  "mode": "review",
  "not_checked": [
    "pi's dist internals behind the design's line citations (runner.js, settings-manager.js, agent-session.js, compaction.js, system-one-shared.js, classifier-shared.js, anthropic-messages.js): relied on Chidi's report and the rulings' recorded evidence, not re-read this round",
    "The mktemp probe measurements behind decisions 2, 12 and 13: not re-run; this pass is read-only inspection",
    "tasks.md: no such file exists in the change directory yet; Stage 5 holds it, so the guard's file-name and task-group alignment checks (settled structural-r1-STR-2) belong there, and no guard-home inconsistency exists between design decision 12 and the spec's 'one shared helper under tests/support/' wording",
    "michael-orientation.md and michael-resolve-s3-r1.json: cited throughout and taken as recorded; not re-read in full this round (michael-resolve-s3-r2.json was read in full)",
    "Round-1 and round-2 findings outside the settled list whose sections did not change between rounds",
    "Nothing was executed: the suite, tsc, the live script and the probes were not run; every check this round is read-only inspection of the repository, the change artifacts, the living specs and Joel's models-store.json"
  ],
  "owner_questions": [],
  "paraphrase_existing": "",
  "paraphrase_proposes": "",
  "recommendation": "Approve from the structural lens: no findings this round. Both round-2 required edits are in verbatim — the Risks row states the corrected compaction frequency across all three of Joel's window tiers with arithmetic that checks out against ~/.pi/agent/models-store.json, and decision 13's setup check now reads pre-probe snapshots with prompt 1's requests excluded. Every settled finding's round-3 condition holds and none is reopened: the CRIT-1 narrowed claim is present and consistent in the spec, proposal, design and docs rows; the packaging delta's load-check scenario is unchanged from the living spec so structural-r2-STR-1 does not fire; and the test guard has one home consistent between decision 12 and the spec. The placement table matches the repository exactly (every Modify row names an existing file, every Create row a path absent today), the import boundary holds with pi types only in app/ and infra/, each rule, default and constant has one home, the coverage table maps all fourteen delta requirements to decisions, and the measured claims — including decision 10's 381/263-character strings, recounted by hand — are correct."
}