{
  "mode": "council",
  "lens": "council-comprehension",
  "paraphrase_proposes": "",
  "paraphrase_existing": "",
  "recommendation": "Resolve the conflicting payload and accounting contracts before design, preserve the owner's measured-route scope, and document the operational prerequisites and remaining estimation limits.",
  "findings": [
    {
      "id": "CC-1",
      "severity": "blocking",
      "location": "specs/tail-recall/spec.md — The payload edit keeps other extensions' changes and the provider's limits; Joel's route is served as pi's own provider is",
      "finding": "The spec simultaneously requires every existing marker to remain, system and tools markers never to change, at most four markers, and new effective boundaries on OAuth requests that already have four markers. Joel's extension also protects system and tools markers, ruling out the measured OAuth strategy that removes them.",
      "rationale": "Copying a payload does not create a free marker slot, and the one measured OAuth slot strategy toggles a tools marker and changes system markers, contrary to the stated contract and Joel's extension guard. The design cannot tell which boundaries may yield or what to do if another extension owns them.",
      "concrete_case": "A direct OAuth request has two system markers, one tools marker and one last-message marker; a recall block is mid-history and the prior message needs a carry point.",
      "recommendation": "Choose and validate a per-route message-marker strategy that respects the guard and four-point cap, distinguish pi-owned from foreign markers where possible, and define a safe unchanged fallback if ownership or budget cannot be resolved. Measure any materially different strategy before promising its results."
    },
    {
      "id": "CC-2",
      "severity": "major",
      "location": "specs/tail-recall/spec.md — Nothing recalled; The next turn's first request reaches the recalling turn's entry",
      "finding": "The no-recall scenario requires an unchanged payload whenever no item is selected, but the following-turn carry point may be needed precisely when the previous recall block has disappeared and the new request has no recall.",
      "rationale": "An implementer cannot meet both requirements on a long previous recalling turn without distinguishing a currently empty recall from the absence of pending carry state.",
      "concrete_case": "A long recalling turn ends, then an unrelated prompt selects no items; the new request needs a point at the previous block's message to reach the earlier entry.",
      "recommendation": "Scope the unchanged-no-recall promise to requests with neither a recall block nor a pending carry operation, and specify when pending carry is consumed or discarded."
    },
    {
      "id": "CC-3",
      "severity": "major",
      "location": "proposal.md — What Changes; specs/tail-recall/spec.md — A recall block does not cost the turn its cached prefix",
      "finding": "The text promises a prefix cache hit and a particular write split for every covered recalling request, without the warm-entry, caching-minimum, expiry, and successful-edit conditions that make those outcomes possible.",
      "rationale": "Provider caching is not guaranteed on a cold start, below-minimum prefix, expired entry, or fail-open payload, as the research and fail-open scenarios already acknowledge. The absolute language makes normal provider behavior look like a broken installation.",
      "concrete_case": "The first covered request in a fresh session carries recall but there is no earlier cache entry, or its prefix is below the model's caching minimum.",
      "recommendation": "Describe the payload behavior as the guarantee, and qualify read/write acceptance by the necessary warm-cache, minimum-size, unchanged-prefix and successful-edit conditions; retain separate explicit cold and fail-open examples."
    },
    {
      "id": "CC-4",
      "severity": "blocking",
      "location": "specs/context-figures/spec.md — Dollar savings are net of cache rewrites and of recall's classifier spend; proposal.md — What Changes",
      "finding": "The figure is simultaneously specified to charge the exact provider rewrite, ignore the split except for warm/cold, and omit cold rewrites, while the owner explicitly allows under-reporting on unmeasured routes. The living pricing requirement also still charges recall according to its old boundary placement.",
      "rationale": "M2 shows the old split-independent calculation cannot distinguish the measured poisoned and fixed cases, and the orientation identifies zero-read poisoned requests. Provider counts alone do not establish the counterfactual or uniquely attribute a coincident TTL expiry; the spec does not state how to handle these cases or qualify accuracy.",
      "concrete_case": "A poisoned direct API-key request reads zero because the system prefix is below the minimum: the delta charges no rewrite, despite M9-style under-reporting. A covered request with its boundary moved also conflicts with the living spec's old block-pricing rule.",
      "recommendation": "Select an implementable accounting policy with examples for warm, zero-read, TTL expiry, mixed or missing rates, and covered versus uncovered routes; state which values are estimates and record accepted under-reporting. Amend the living block-pricing requirement as well, and make the M2 split-independence example explicitly describe the old rule if the new rule uses the split."
    },
    {
      "id": "CC-5",
      "severity": "major",
      "location": "specs/tail-recall/spec.md — The payload edit keeps other extensions' changes and the provider's limits; michael-orientation.md §3 trap 8",
      "finding": "The spec does not define how the handler reliably identifies taiknr's transient block or associates it with the prior message, despite requiring unknown requests and other extensions' edits to remain untouched.",
      "rationale": "The only textual marker can also occur in user content, while exact text comparison can fail after pi sanitizes surrogates. The publisher already has related baseline state, so independent payload guessing can also diverge from accounting.",
      "concrete_case": "A user pastes text beginning with `<recalled_context`, or recalled content contains an unpaired surrogate transformed before the payload hook.",
      "recommendation": "Specify a shared request-scoped source of block identity and message position, including provider transformation, no-state and ambiguous-match behavior; fail open without changing a user's or another extension's content."
    },
    {
      "id": "CC-6",
      "severity": "major",
      "location": "proposal.md — Acceptance and Impact; specs/context-figures/spec.md — A figure that reads negative says why, where it is read",
      "finding": "The operator-facing plan does not say how to recognize the covered route, install or verify Joel's external guard change, distinguish an unsupported route, or reproduce acceptance without accidentally spending model usage. It promises recorded under-reporting but has no user-facing scenario identifying the affected routes.",
      "rationale": "Joel's extension is a real prerequisite and M3 shows the old guard rejects edits; M5 did not validate the actual taiknr integration on his edited route. A general explanation of negative figures does not tell operators when the figure is known to under-report.",
      "concrete_case": "Joel starts a session before updating his extension, or an operator uses Bedrock and reads a negative figure without knowing the rewrite estimate can be low.",
      "recommendation": "Document the external dependency and safe pre-update behavior, covered and uncovered route limitations, and a manual acceptance checklist specifying setup, request sequence, expected relative read/write outcomes, cleanup, and explicit authorization for Joel's model usage."
    }
  ],
  "assumptions": [
    {
      "assumption": "The owner-rulings file is newer than and overrides conflicting orientation choices, including measured-route-only coverage and the permitted negative figure.",
      "status": "verified"
    },
    {
      "assumption": "The live M5 OAuth marker arrangement is the only OAuth strategy that has been measured in the supplied artifacts.",
      "status": "verified"
    },
    {
      "assumption": "The hook can identify the active provider and associate an incoming payload with the correct taiknr request even when other requests occur concurrently.",
      "status": "unverified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "No source files, repository state, tests, or live provider calls were inspected; findings use only the supplied proposal, rulings, orientation, research and named capability specs.",
    "Whether an alternative marker strategy actually works with Joel's modified extension and real taiknr-generated recall remains unmeasured."
  ]
}