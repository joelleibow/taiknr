{
  "assumptions": [
    {
      "assumption": "The settled critic-r1-CRIT-1 chain holds with none of its preconditions changed: the narrowed wording is present and consistent (design decision 2 at L126 and L142, spec L127's non-normative 'No taiknr setting avoids it while recall is on (design decision 2)', the retitled scenario 'Neither setting removes it' at L134, proposal L20), `lever` appears in no artifact of this change outside design.md's T9 overflow row where it is correct, decision 2 alone holds the full settings statement naming pi's global `compaction.enabled: false` with its cost and the `keepRecentTokens` precondition, and no spec SHALL forbids a later mechanism.",
      "status": "verified"
    },
    {
      "assumption": "Every compaction measurement in decision 2 carries its own `keepRecentTokens` setting (critic-r7-CRIT-R7-2): 'set `keepRecentTokens` to 2,000' governs the round-1/3/4 cases with the setting named inside each probe's parenthetical, the five default-settings bullets sit under 'At pi's default compaction settings (round 6 and round 7 probes)', and the Risks row's 40,960 bullet names 'pi's default `keepRecentTokens` of 20,000'.",
      "status": "verified"
    },
    {
      "assumption": "critic-r7-CRIT-R7-1's Risks-row fix (closing critic-r6-CRIT-R6-1) is in and coherent: the 40,960 bullet bounds the block at about 4,576 tokens (24,576 − 20,000) plus the step, carries both measurements (a 3,000-token step with a 12,800-token item caused no compaction; an 11,000-token step with a 12,000-token item did), states the drop-for-the-rest-of-the-turn-without-notice consequence, and the row keeps the within-turn re-append sentence citing the measured 262,144- and 1,000,000-token windows.",
      "status": "verified"
    },
    {
      "assumption": "The Module & File Placement table is accurate against the repository tree: all nine source Modify targets and all seven test Modify targets exist, none of the Create targets exists yet (tests/domain/recall.test.ts, tests/use-cases/recall-relevant-context.test.ts, the three new adapter test files, tests/infra/pi-event-handlers/context.test.ts at its currently empty mirror path, tests/support/classifier-guard.ts, the root-level test-recall-live.mjs, docs/adr/0007-*.md), and the seven handler files and six existing ADRs are as counted.",
      "status": "verified"
    },
    {
      "assumption": "structural-r2-STR-1 and structural-r1-STR-1 stay settled: the extension-packaging delta's '(design.md Decision 6)' is the living spec's L43 citation restated verbatim, and decision 13's observation mechanism (additionalExtensionPaths loaded in the order given, the temp-directory `.mjs` probe listed before the repository root and before extensionFactories) is unchanged.",
      "status": "verified"
    },
    {
      "assumption": "The probe measurements behind decisions 2, 12 and 13 — the round-1 through round-7 compaction probes, the fetch-stub guard, and the additionalExtensionPaths load order in michael-resolve-s2.json COMP-4 — hold as recorded.",
      "status": "unverified"
    }
  ],
  "findings": [],
  "lens": "council-structural",
  "mode": "review",
  "not_checked": [
    "tasks.md: it does not exist yet (Stage 5); structural-r1-STR-2's requirement that it names the shared guard's one home stays with Stage 5 and was not re-audited here.",
    "The mktemp probe measurements were not re-run; this pass is read-only inspection of the change artifacts, the living spec line cited, and the source and test trees.",
    "pi 1.5.2's dist source was not re-read beyond the citations already carried in the artifacts; the round-7 critic's node_modules reads stand as the record.",
    "The docs-pass targets (README.md field table and disclosure sentence, ARCHITECTURE.md §3/§5/§7, AGENTS.md line 3, ADR 0007) were not audited in place; the design gates that pass behind Michael's approval and it blocks nothing.",
    "The living configuration and archive-stubbing specs beyond the lines the design cites (for example the FIELD_RULES rejection rows); this change does not edit them."
  ],
  "owner_questions": [],
  "paraphrase_existing": "The archive half already works: settlement at `agent_before_settle` replaces large tool outputs on the branch with one-line stubs, persisting the raw text in `taiknr-side-store` custom entries plus one `context_edit` per item, and `session_start`/`session_tree`/`session_compact` hydrate the store from the whole branch into a `Map`-backed store whose read API is `size()`/`get(id)`/`getAll()` in insertion order. The recall half is entirely stubs: `formatRecalledContext`, `recallRelevantContext`, both `pi-context-adapter` exports and `score` throw `Not implemented`, the registration is `_pi.on(\"context\", () => {})`, and the composition root feeds a placeholder `notifyOnce` whose `warned` flag is set before `notify` runs. Config reaches handlers at event time through the per-session holder, read only while `status === \"ready\"`, and the composition-root gate stops every handler but `session_start` whenever taiknr is off or the config is rejected.",
  "paraphrase_proposes": "The design implements the recall half of taiknr on pi 1.5.2's `context_with_system` event: per request the handler reads the session config, extracts the latest `role: \"user\"` prompt, derives a character budget from pi's own window, reserve and `estimateTokens`, and reads eligible archived ids from the branch, then one bounded no-retry `classify` call scores them; threshold-selected items are ranked by descending probability, fitted as a whole-item prefix against the budget, and appended as one marker-guarded `<recalled_context>` text block on that message, cached per key through a store-size-plus-prompt token in the frozen `RecallCache`. Failures cross the frozen port as a rejection whose message is the finished notice, delivered once per session through a notifier built in the handler with `warned` set after `notify` returns; a cancel returns `undefined` and records nothing. The single new config field `classifierTimeoutMs` (default 5000 ms, integer 1..2147483647) bounds the call, the default suite proves everything behind one shared fetch-stub guard under `tests/support/`, and a root-level `test-recall-live.mjs` run by the implementing coder is the end-to-end verification.",
  "recommendation": "Approve from the structural lens: no findings this round. Every condition the settled record leaves for later rounds re-verifies against the current design.md, proposal.md and specs/: the round-7 critic fixes are in (the Risks row's 40,960-token bullet with the ~4,576-token-plus-step bound and both measurements, and the `keepRecentTokens` settings on every measurement), no artifact calls `reserveTokens` the lever for the recall-caused-compaction case, the full settings statement including pi's `compaction.enabled: false` and the `keepRecentTokens` precondition lives only in decision 2, the spec keeps its SHALL on the bound alone with no forbidding of a later mechanism, and the Module & File Placement table matches the tree exactly (all Modify targets present, all Create targets absent). The coverage table still maps every tail-recall, configuration and extension-packaging requirement to its decisions, and the one-home rule holds across the artifacts."
}