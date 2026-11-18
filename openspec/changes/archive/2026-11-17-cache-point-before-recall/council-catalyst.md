{
  "mode": "council",
  "lens": "council-catalyst",
  "paraphrase_proposes": "",
  "paraphrase_existing": "",
  "recommendation": "Resolve the OAuth marker-budget contradiction before implementation. Prefer explicit slot ownership, one shared request-provenance record, and separate observed billing from estimated attribution; none requires changing recall content, adding configuration, or reopening Joel's rulings.",
  "findings": [
    {
      "id": "CAT-1",
      "severity": "blocking",
      "location": "specs/tail-recall/spec.md — “The payload edit keeps other extensions' changes and the provider's limits”; michael-orientation.md §2, §3 traps 3 and 6",
      "finding": "Preserving every existing marker, guaranteeing the two required message boundaries, and respecting the four-point cap cannot all hold on ordinary Anthropic OAuth. The measured OAuth workaround also changes the tools marker on one request, which the proposed invariant forbids.",
      "rationale": "This is a real capacity contradiction, not a reason to compromise cache correctness or extension isolation. Ordinary OAuth starts with three system/tools markers and one message marker. A long-turn handoff followed by another recall needs two independently positioned message boundaries. The specification currently provides neither room for them nor permission to remove a provider-owned marker. Copying the payload does not solve ownership or capacity.",
      "concrete_case": "A normal OAuth request has system[0], system[1], the last tool, and the last-message marker. After a recalling turn exceeding lookback, the next request also recalls: it needs a boundary at the previous carrier after removal of its block and another before the current block. Preserving the three system/tools markers leaves only one message slot. M5 obtained capacity by dropping system[0] throughout and tools on the handoff request, violating the proposed tools-stability requirement.",
      "recommendation": "Apply pre-allocation and segmentation: distinguish provider-owned markers that may yield from foreign markers that must survive, and specify a route-specific slot plan before editing any payload. One candidate for ordinary OAuth is a session-stable omission of redundant system[0], retaining tools and using two message slots; on handoff, reuse the ordinary tail slot rather than temporarily removing tools. This candidate is not established by M5 and needs a bounded live probe. It must also reconcile session-stable system/tools markers with gate-off byte identity when enabled changes mid-session; do not silently weaken either invariant. If capacity or ownership cannot be established, return the original payload and do not claim successful optimization for that case. Secondary trade-offs: fewer independently cached prefix checkpoints, possible uncached tail input on the handoff request, more topology tests, and an unresolved enable/disable transition contract."
    },
    {
      "id": "CAT-2",
      "severity": "major",
      "location": "michael-orientation.md §2 and §6 — shared carrier state and block identification; research-eleanor.md — “Potential payload discoverability”; specs/tail-recall/spec.md — “Only the cache markers differ”",
      "finding": "The apparent choice between fragile text discovery and adding an identifying marker to provider-visible content is avoidable. A request-scoped, out-of-band provenance record can identify taiknr's generated block without changing the prompt or creating a second recall-history tracker.",
      "rationale": "The appended block is known when taiknr builds the request, and the publisher already owns prior-carrier history. Rediscovering authorship from an XML-like prefix loses that information. Conversely, adding a nonce or metadata to message text would violate the marker-only payload contract. An intermediary record preserves provenance across the two lifecycle stages while keeping provider shapes in infra.",
      "concrete_case": "A user pastes text beginning with <recalled_context>, or generated recall contains an unpaired surrogate that pi sanitizes. Prefix matching can select the user's block; unsanitized exact matching can fail to find taiknr's actual block. Custom messages after the newest user message also invalidate a last-message shortcut.",
      "recommendation": "Have the existing request/baseline owner expose a request-scoped descriptor containing the known carrier, appended-block position and expected generated text. Resolve it in infra against the covered route's provider representation, applying the documented text normalization and validating an unambiguous match before changing markers. Treat ambiguity, stale state and requests without matching provenance as no-ops; add no provider-visible identifier and no independent previous-carrier cache. Use the same baseline's earliest taiknr-owned change for considering a handoff, including fresh stubs without changing settlement behavior; probe the stub case before promising its benefit. Secondary trade-offs: lifecycle invalidation and provider-normalization tests are required, matching adds bounded work, and ambiguous payloads deliberately lose the optimization rather than risk editing the wrong block."
    },
    {
      "id": "CAT-3",
      "severity": "major",
      "location": "specs/context-figures/spec.md — “The split alone changes no figure”, “A warm request after taiknr's own change”, and “The block is charged where it was billed”; living context-figures specification — “A saving is priced at the rates the request's own response reported”; proposal.md — net-dollar bullet",
      "finding": "The figures contract combines actual-rewrite billing with an invariant that deliberately ignores the observed split. It also treats a zero-read response as sufficient reason to omit a rewrite charge, despite evidence that taiknr can cause that condition. The block's new billing scenario conflicts with the unchanged living requirement that prices it by prior-message membership.",
      "rationale": "The real tension is between observing provider billing and attributing only taiknr's incremental cost. Aggregate response usage supplies the former boundary, not a complete counterfactual explanation. Keeping all attribution estimated understates demonstrated losses; charging every reported write to taiknr would instead include ordinary appended input or natural expiry. These concerns should be segmented rather than forced into one warm boolean or described as exact causal measurement.",
      "concrete_case": "The poisoned and fixed splits in M2 differ by 132,854 cache-write tokens, yet the delta requires identical dollars even while requiring the charge to start at the provider's actual rewrite boundary. Separately, research records poisoned requests reading zero when the system/tools prefix is below the caching minimum; the warm-only rule then charges no rewrite. Moving a marker off recall also bills the first block as input, contradicting the unchanged living write/read placement rule.",
      "recommendation": "Separate observed cache coverage from attribution: use the response split to locate or bound rewritten retained history, use the shared baseline to distinguish taiknr's changed history from ordinary new material, and account for the block separately according to the chosen slot strategy. Retain an explicitly documented estimate where allocation or TTL causality cannot be determined; do not claim exact taiknr causation from aggregate usage. Recast M2 as evidence about the old algorithm, not a required invariant of the new one, and modify the living block-pricing requirement as well. Add numerical cases for partial reads, taiknr-caused zero reads, coincident expiry, ordinary append, and both block-placement strategies. Keep the owner-approved exclusions and signed figure. Secondary trade-offs: token allocation remains approximate, expiry attribution may remain conservative, and the dollar rule needs more cases, but no new provider diagnostics call or instrument is necessary."
    }
  ],
  "assumptions": [
    {
      "assumption": "Joel's external extension change is a dependency, not a repository deliverable; honest negative figures and measured-route-only coverage are settled.",
      "status": "verified"
    },
    {
      "assumption": "Ordinary Anthropic OAuth starts with four markers, while API-key, measured OpenRouter Anthropic and attribution requests start with three, as recorded in the supplied research.",
      "status": "verified"
    },
    {
      "assumption": "A stable two-message-slot OAuth strategy that retains tools can meet the full handoff behavior; M5 did not measure that exact topology.",
      "status": "unverified"
    },
    {
      "assumption": "The publisher's existing baseline already records prior recall-carrier history and fresh-stub changes, allowing one shared ownership home.",
      "status": "verified"
    },
    {
      "assumption": "Reliable descriptor-to-payload matching across pi's transformations can be implemented for every covered route without modifying message content.",
      "status": "unverified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "No files were edited, commands or tests run, model calls made, or raw session transcripts inspected; source and platform facts were assessed through the named evidence.",
    "No independent live probe verified the candidate OAuth topology, real context_with_system-to-payload matching, stub handoff, or Joel's modified attribution route.",
    "Risk: the current OAuth preservation and slot requirements are incompatible as written; fail-open behavior preserves requests but does not establish the promised cache savings."
  ]
}