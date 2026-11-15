{
  "mode": "council",
  "lens": "council-zoom-out",
  "paraphrase_proposes": "",
  "paraphrase_existing": "",
  "recommendation": "Proceed to design. This implements the product's missing core behavior, not a neighboring feature, and the repository already provides the necessary domain types, use-case seams, archive store, adapter, handlers, and composition root. I found no blocking simplicity or responsibility-placement defect in the proposal.\n\nKeep production work in those existing modules: deterministic presentation in domain/archived-output.ts; threshold/staging, batch commit, and replacement orchestration in the existing use cases; persisted-data validation and Pi entry/content interpretation in infra/adapters/pi-archive-adapter.ts; lifecycle forwarding in the existing handlers; dependency composition in app/extension/taiknr.ts. Do not introduce a parallel archive service, generic event framework, validator dependency, logging facility, or persistence abstraction.\n\nFor the open choices: preserve rawText exactly and normalize only rendered stub fields; join text blocks with the existing PoC's newline convention; use one authoritative entry-ID resolution path for both candidates and preserved content; validate disk data in readArchiveBatchesFromBranch, not hydration orchestration. Prefer a small adapter helper and an explicitly justified narrow packaging-spec delta over duplicating Pi interpretation in handlers or pushing Pi structures inward. No new production file is needed. Prefer the existing direct Pi dependency's in-memory manager and boundary harness for the required session-level check; a full faux-provider prompt loop and a transitive pi-ai import need an additional demonstrated coverage benefit. Observe state through the existing store and session entries, with no console output. Leave caps, recall, commands, provider abstraction, and caching out, as already ruled.",
  "findings": [],
  "assumptions": [
    {
      "assumption": "The three archive use cases are existing implementation seams rather than working behavior to replace: direct inspection confirms each currently throws Not implemented.",
      "status": "verified"
    },
    {
      "assumption": "The archive adapter already owns the in-memory store and all three translation entry points; no additional production module or installed validation package is necessary for this change.",
      "status": "verified"
    },
    {
      "assumption": "Composition already allocates the pending array, argument map, original-content map, store, and gated Pi API, so archive implementation does not require a new session-state container.",
      "status": "verified"
    },
    {
      "assumption": "package.json directly declares pi-coding-agent but not pi-ai; a test importing pi-ai would rely on transitive dependency availability under the unchanged manifest.",
      "status": "verified"
    },
    {
      "assumption": "Pi 1.5.2 identity pairing, boundary validation, recovery omission, and branch semantics behave as measured in Chidi's research and Michael's orientation.",
      "status": "unverified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "Read-only review: no files edited, checks executed, model calls made, or live TUI behavior tested; platform runtime claims rely on the supplied research and orientation.",
    "No design exists yet, so final helper placement and lifecycle cleanup remain unreviewed. Risk: duplicating entry-ID resolution or introducing Pi DTOs into use cases would undermine the otherwise appropriate existing boundaries.",
    "Accepted whole-branch archive growth and post-settlement persistence failure behavior were not re-evaluated; no pruning, transaction framework, or extra lifecycle registration is proposed by this review."
  ]
}