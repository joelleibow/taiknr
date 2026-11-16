{
  "mode": "review",
  "lens": "council-zoom-out",
  "paraphrase_proposes": "",
  "paraphrase_existing": "",
  "recommendation": "Pass with one minor documentation cleanup. Stages 2 and 3 added no source layers, dependencies, speculative abstractions, or neighboring features. The clarified mappings reuse existing archive reads and preserve inward dependencies; however, the compaction investigation's experimental inventory now overwhelms its architectural conclusion.",
  "findings": [
    {
      "id": "ZO-S4-1",
      "severity": "minor",
      "location": "openspec/changes/classifier-scoring-and-tail-recall/design.md:126–142, Decision 2, particularly the measurement inventory at lines 134–142",
      "finding": "Stage 3's compaction clarification embeds an extended experimental report in the high-level design: probe configurations, review-round history, five numerical run results, and additional paired reserve/enablement experiments.",
      "rationale": "Zoom Out Standard §4 requires the intermediate pass to catch bloat introduced by earlier fixes and keep design at boundaries, data flow, and contracts. The two-part compaction condition and the accepted consequences belong here, but the chronological measurement inventory is supporting research rather than another design decision. This is solely an evidence-placement finding: the owner-approved mechanism, corrected exposure, and Stage 3 conclusions remain settled.",
      "concrete_case": "A coder following Decision 2 to implement the request budget must traverse experiments using keepRecentTokens=2,000, experiments at its 20,000 default, multiple context windows, and successive review rounds before reaching the unit and alternatives. These experiments require no additional production behavior, yet sit inline with the handler's implementation contract; the Risks row at line 411 already provides the operator-facing per-window consequences.",
      "recommendation": "Retain the request-only bound, the two necessary compaction conditions, the post-compaction cache-fit behavior, and the setting limitations in Decision 2. Keep the accepted consequence and representative per-window exposure in Risks. Relocate the detailed probe inventory and review-round provenance to the existing research or resolution evidence, with a precise link from Decision 2; preserve all measurements without adding a new mechanism or source module."
    }
  ],
  "assumptions": [
    {
      "assumption": "Recall completes existing unimplemented seams rather than requiring a parallel subsystem. Verified directly in the domain formatter, recall use case, context adapter, scorer adapter, and context handler.",
      "status": "verified"
    },
    {
      "assumption": "The proposed source changes fit existing responsibility owners: pure formatting in domain, scoring/cache/fit policy in use-cases, Pi protocols and event reads in infra, configuration validation in config, and session wiring in app/extension. Verified against the actual src tree and representative implementations.",
      "status": "verified"
    },
    {
      "assumption": "Eligibility can reuse the archive adapter's existing validated batch reader and the use case can reuse ArchiveStore.size/get/getAll; no second archive parser or store abstraction is needed. Verified in src/infra/adapters/pi-archive-adapter.ts and the existing recall contracts.",
      "status": "verified"
    },
    {
      "assumption": "Stage 2's archive walkthrough, explicit store mapping, wire-response correction, and live verification detail address concrete comprehension gaps rather than introduce new feature scope. Checked against michael-resolve-s2.json and the current design.",
      "status": "verified"
    },
    {
      "assumption": "Platform timeout, estimate, and compaction behavior is supported by the approved research and Stage 3 evidence; this review did not independently reproduce those measurements.",
      "status": "unverified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "Read-only review: no files edited, tests executed, or live model calls made.",
    "Did not repeat Stage 1's unchanged timing-statement and prefix-loop altitude finding, or reopen settled notifier, eligibility, cache, marker, timeout, and compaction mechanisms.",
    "Did not independently execute Pi's runtime or verify provider-visible cache hits. Accepted risks remain: recall can cause a later persisted compaction, a cached block can then disappear without notice, and request-time redactors do not cover recall."
  ]
}