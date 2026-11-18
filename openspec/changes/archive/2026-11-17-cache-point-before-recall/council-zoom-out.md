{
  "mode": "council",
  "lens": "council-zoom-out",
  "paraphrase_proposes": "",
  "paraphrase_existing": "",
  "recommendation": "Proceed with the measured-route cache-marker fix, not a new caching subsystem. Correct the contradictory contracts below before design. Keep payload translation in infra, pure pricing in domain, and one shared request-history owner in use cases, composed through the existing gate. Reuse the publisher's existing block/stub-change facts rather than adding another history tracker. The owner’s attribution, signed-figure, and measured-route rulings remain settled.",
  "findings": [
    {
      "id": "ZO-1",
      "severity": "blocking",
      "location": "openspec/changes/cache-point-before-recall/specs/tail-recall/spec.md — “The payload edit keeps other extensions' changes and the provider's limits”",
      "finding": "“Keeping every cache marker already on it” prevents the relocation and slot reservation that the fix needs. It is stronger than preserving other extensions' edits and conflicts with the four-point limit on pi's own OAuth route.",
      "rationale": "Chidi verdict 3 establishes four existing OAuth points. Orientation §6 explicitly leaves move-versus-add and yielding pi-owned points open. Keeping all four leaves no slot for the pre-block boundary or the carry-forward boundary. M5's demonstrated strategy also removes system[0] and temporarily removes tools; the latter cannot simply be copied because orientation §2 requires stable system/tools markers. This is a contract conflict, not a request to revisit Joel's extension ruling.",
      "concrete_case": "An ordinary pi OAuth payload already has two system points, a tools point, and a message point. Recall requires a boundary before its appended block. Preserving all existing points makes adding that boundary a fifth point and a 400; refusing to add it leaves the measured cache loss unfixed.",
      "recommendation": "Distinguish pi-owned markers, which this feature may deliberately relocate or reserve, from markers placed by other extensions, which remain protected. Have design select a fixed per-route slot policy and demonstrate both simultaneous needs: protecting the current block's prefix and reaching the previous block's entry. Any system/tools reduction on pi's own route must be uniform across requests; Joel's route must retain its protected system/tools topology. State fail-open behavior when protected markers leave insufficient slots."
    },
    {
      "id": "ZO-2",
      "severity": "major",
      "location": "openspec/changes/cache-point-before-recall/specs/tail-recall/spec.md — “Nothing recalled” scenario under “A recall block does not cost the turn its cached prefix”",
      "finding": "The no-block scenario forbids the carry-forward edit on exactly the request that may need it most.",
      "rationale": "Orientation M4–M6 require a boundary at the message that previously carried recall when that block leaves it. This requirement depends on the previous request, not on whether the current request selects recall. The current scenario says a request with no selected item is byte-identical, with no exception for that transition.",
      "concrete_case": "Turn A carries recall and performs twelve sequential tool calls. Turn B selects nothing. Its first request must add or relocate a point onto A's formerly recalling message; sending a byte-identical payload instead reproduces M4's lookback failure.",
      "recommendation": "Separate 'no current block and no pending taiknr-caused transition' from 'no current block after a previous block disappeared or changed.' Require byte-identical payloads only for the former, subject to any explicitly selected session-wide slot normalization. Describe carry-forward in terms of a changed carrier, including disappearance on the same user message because eligibility or budget changed, rather than only a new turn."
    },
    {
      "id": "ZO-3",
      "severity": "major",
      "location": "openspec/changes/cache-point-before-recall/specs/context-figures/spec.md — “The split alone changes no figure”; proposal.md — “The net dollars charge the rewrite that actually happened”",
      "finding": "A historical observation about the old formula has become an acceptance invariant that prevents the council from choosing response-based rewrite accounting.",
      "rationale": "Orientation M2 demonstrates that the existing formula ignores the read/write split except for warmth. Orientation §6 deliberately leaves measured versus estimated rewrite accounting open. Requiring the corrected implementation to return the old −0.02285 for both radically different splits freezes the very blindness the proposal seeks to remove.",
      "concrete_case": "Two otherwise equivalent requests report 35,731 read / 139,169 written and 168,585 read / 6,315 written. An implementation that uses the response split to bound the old-prefix rewrite can correctly produce different rewrite penalties, yet would fail this mandatory scenario.",
      "recommendation": "Move M2's equal-result example into historical rationale, not the new behavior contract. Prefer existing response usage plus request history to bound old-prefix writes on covered routes, subtracting identifiable new-tail and recall costs without double charging. Explicitly retain estimation and the owner-approved unmeasured-route limitation where attribution cannot be established. Aggregate usage cannot distinguish a coincident TTL expiry from a taiknr-caused miss, so specify that limitation rather than introducing diagnostics or promising exact causal billing."
    },
    {
      "id": "ZO-4",
      "severity": "major",
      "location": "openspec/changes/cache-point-before-recall/specs/context-figures/spec.md — “The block is charged where it was billed”; openspec/specs/context-figures/spec.md — “A saving is priced at the rates the request's own response reported”",
      "finding": "The delta leaves the living specification's old block-pricing rule intact and replaces it elsewhere with another slot-strategy-dependent assertion.",
      "rationale": "The living requirement prices recall at read versus write rates according to whether its message was in the previous priced request. The delta instead asserts input on the first request and write on the second. Orientation trap 10 and §4 explicitly say this depends on the selected marker strategy. Adding a pre-block marker while retaining a later marker can write the block immediately; moving the only later marker can leave the block uncached on subsequent requests. Both contracts cannot remain authoritative.",
      "concrete_case": "The selected strategy retains pi's trailing message point and adds a point before recall. The provider writes the block on its first request, but the delta demands input pricing. Conversely, moving the trailing point before recall does not by itself guarantee the block is written on the second request.",
      "recommendation": "Modify the existing “A saving is priced…” requirement as part of this delta. Require one strategy-aware block charge reflecting where the block falls relative to the selected boundaries, with explicit cases for first appearance, repeated requests, and removal/change. Leave the exact input/write/read sequence to the chosen slot policy and its tests rather than fixing it before that decision."
    },
    {
      "id": "ZO-5",
      "severity": "major",
      "location": "proposal.md — “Impact”; michael-orientation.md §2 shared-baseline constraint and §6 block-identification question; src/app/extension/instruments-holder.ts:3-18; src/infra/pi-event-handlers/instruments-session-start.ts:20-28",
      "finding": "The only existing carrier history belongs to an optional instruments publisher. The design must not make operational cache correctness depend on publishing being enabled, or solve that by adding a second tracker in the payload handler.",
      "rationale": "Direct inspection confirms that the holder's no-op discards reportRecalled, requestBuilt, and responseReceived, and the real publisher is installed only with jeffersonInstruments true. The private baseline in src/use-cases/instruments-publisher.ts is therefore unavailable when publishing is off. This is the main responsibility-placement issue the open shared-home question must resolve.",
      "concrete_case": "With enabled=true and jeffersonInstruments=false, recall still appends blocks, but the existing no-op stores neither the current carrier nor the previous one. A payload handler reading publisher history cannot protect the transition; a handler maintaining its own history would duplicate the accounting baseline and risk divergent carrier identification.",
      "recommendation": "Give the operational request/carrier fact one use-case-layer home independent of the instruments switch, and have both payload editing and accounting consume it. Reuse the existing publisher baseline/change-detection responsibilities rather than introducing a parallel cache manager. Record the actual append operation's message identity and block fact instead of discovering ownership through a global '<recalled_context' prefix search. Infra should resolve that fact against the serialized payload and fail open on ambiguity or unsupported transformation. Preserve the instruments-off promise of no instrument projection/branch/usage reads, and test recall plus carry-forward with publishing disabled."
    },
    {
      "id": "ZO-6",
      "severity": "minor",
      "location": "openspec/changes/cache-point-before-recall/specs/tail-recall/spec.md — “A recall block does not cost the turn its cached prefix” and “The recalling request reads its prefix”",
      "finding": "The provider-read guarantee is unconditional even when no reusable cache entry can exist.",
      "rationale": "Chidi verdict 2 documents model-specific minimum cache sizes, below which the provider accepts requests without caching. Ordinary expiry or a genuinely cold first request also prevents a read. The fix can preserve reuse opportunities; marker edits cannot guarantee a hit under these conditions.",
      "concrete_case": "A covered Haiku 4.5 route sends a recall request whose pre-block prefix is below 4,096 tokens, or sends its first request after all relevant entries expired. Correctly placed markers still produce no prefix cache read and therefore fail the current SHALL and scenario.",
      "recommendation": "Qualify the read/write outcome by an eligible, live entry written by an earlier request. Keep deterministic payload-marker assertions for cold and subminimum cases, and use the measured warm-session cases for live acceptance. Do not add cache-minimum configuration or provider-diagnostics machinery to satisfy an impossible universal guarantee."
    }
  ],
  "assumptions": [
    {
      "assumption": "The feature addresses a measured root cause rather than speculative optimization: orientation M1 and M4–M6 establish lost prefix reuse and the need for pre-block plus carry-forward boundaries.",
      "status": "verified"
    },
    {
      "assumption": "No existing taiknr payload handler already implements this operation. Source search found no before_provider_request registration; lifecycle handlers, adapters, publisher, and composition root already provide the appropriate extension points.",
      "status": "verified"
    },
    {
      "assumption": "No new dependency is needed. The installed host exposes the payload hook per Chidi, and the remaining work is ordinary payload copying/traversal plus existing request-history and arithmetic logic.",
      "status": "verified"
    },
    {
      "assumption": "The smallest scope for fresh stubs is to reuse the existing earliest-change information when selecting a carry-forward target, if the selected boundary policy supports it; settlement, stub formatting, and archival behavior should not change. Its incremental provider benefit has not been measured.",
      "status": "unverified"
    },
    {
      "assumption": "Joel's external extension change and a subsequent real-session acceptance run remain dependencies; the current evidence does not demonstrate that final integrated route.",
      "status": "unverified"
    },
    {
      "assumption": "A fixed, protected-marker-compatible slot policy will preserve the measured benefit across all covered routes; M5 proves the two-boundary mechanism but does not validate every policy satisfying the final topology constraints.",
      "status": "unverified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "No files were edited, tests executed, or live/model calls made. M1–M9 and provider documentation conclusions were taken from the supplied research rather than independently reproduced.",
    "Did not inspect Joel's external extension or verify its eventual deployed guard relaxation; attribution coverage remains conditional on that owner-controlled dependency.",
    "Did not validate thread continuation, long-retention behavior, or the final slot policy with a live provider. Those remain implementation-acceptance risks, not reasons to add speculative infrastructure."
  ]
}