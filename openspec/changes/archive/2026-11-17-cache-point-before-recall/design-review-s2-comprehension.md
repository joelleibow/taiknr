{
  "mode": "review",
  "lens": "council-comprehension",
  "paraphrase_proposes": "The design adds a provider-request handler that copies and edits cache markers on eligible Anthropic-format requests, placing one before a recalled block and another on the preceding carrier when a later request hands off. It keeps per-session state to identify those locations and passes the finished placement to the existing savings publisher so the estimated rewrite and block charges reflect the edit. The handler fails open, and automated and live checks are intended to verify payload shape and caching behavior.",
  "paraphrase_existing": "According to the document, recall appends a block to a user message and pi places its message cache marker on that block, causing a later request to rewrite a prefix rather than read the desired cache entry. The existing publisher estimates rewrite costs from a baseline in context coordinates and uses a warm gate to avoid charging for cold cache expiry. Provider requests already pass through a gated handler system, while the response registrar supplies deferred readings to the publisher.",
  "recommendation": "Revise the design before implementation to make marker identification, pricing inputs, failure-state cleanup, and live validation reproducible from the document.",
  "findings": [
    {
      "id": "CC-1",
      "severity": "major",
      "location": "/Users/joelleibow/Projects/taiknr/openspec/changes/cache-point-before-recall/design.md §4.3, steps 3–4",
      "finding": "The design never specifies how to identify pi's last-message marker or distinguish it from a marker placed by another extension.",
      "rationale": "The adapter must find a marker to copy and is permitted to remove only pi's marker, while preserving every other extension's marker. The described payload input supplies no marker provenance or selection rule.",
      "concrete_case": "A covered payload has a cache marker on its last message and another extension has also marked a message block; the reader cannot determine which marker is pi's or what to do if pi's marker is not at the expected location.",
      "recommendation": "Specify the exact payload location and recognition conditions for pi's marker, how ambiguity is handled, and the fail-open behavior when its provenance cannot be established."
    },
    {
      "id": "CC-2",
      "severity": "major",
      "location": "/Users/joelleibow/Projects/taiknr/openspec/changes/cache-point-before-recall/design.md §4.2, §4.4, §6.1",
      "finding": "The stated applied value does not explain how the publisher locates the new rewrite boundary in its context-coordinate baseline.",
      "rationale": "The adapter knows a payload-coordinate carrier index but the publisher reads neither that index nor the carrier record; the only communicated placement facts are two booleans. The document does not explain how to translate or independently reconstruct the carrier boundary for the suffix estimate.",
      "concrete_case": "A handoff request has only a carry point on a previously recorded message, and pi has merged or otherwise reshaped messages relative to context coordinates; the publisher must start the charge after that carrier's own content.",
      "recommendation": "Define the complete data and coordinate mapping needed by the publisher, including carry-only requests and behavior when the boundary cannot be determined."
    },
    {
      "id": "CC-3",
      "severity": "major",
      "location": "/Users/joelleibow/Projects/taiknr/openspec/changes/cache-point-before-recall/design.md D8, §4.2, §4.4, §6.2",
      "finding": "The three-request block-pricing transition is not defined in terms of the available state and the new PricedRequest field.",
      "rationale": "The current applied value reports only the current request's carry and marker status, yet the next and later requests must distinguish a block previously billed as input from other blocks. The document does not define the placement field's values, how historical requests are associated with the same block, or which state transition selects each rate.",
      "concrete_case": "A recalling request removes pi's marker, the following request carries that block, and a third request carries it again; the reader cannot derive the write-then-read selection from the specified current applied value alone.",
      "recommendation": "Specify the placement field and exact prior-request lookup or state transition, including how a block is recognized across requests and what happens after an unedited or unpriced request."
    },
    {
      "id": "CC-4",
      "severity": "major",
      "location": "/Users/joelleibow/Projects/taiknr/openspec/changes/cache-point-before-recall/design.md §4.3 step 5 and §5.2",
      "finding": "The fail-open contract does not say how state is reset if an exception interrupts the adapter before its commit step.",
      "rationale": "The handler must never throw and the outgoing request must remain unchanged, but stale applied state would cause the publisher to price an unedited request as if an earlier placement had succeeded. The stated commit on every call is not an implementation order or exception-handling rule.",
      "concrete_case": "One request sets applied to a non-null placement; cloning, marker inspection, or fingerprinting the next payload throws before step 5, and the handler catches the error and sends the original payload.",
      "recommendation": "Specify an exception-safe reset of applied and the intended carrier-record behavior on failures, and require a test that starts with non-null prior state."
    },
    {
      "id": "CC-5",
      "severity": "major",
      "location": "/Users/joelleibow/Projects/taiknr/openspec/changes/cache-point-before-recall/design.md §4.3 wanted points and §5.1",
      "finding": "Carrier selection and marker placement are underspecified when exact matches are not unique or a target block is already marked.",
      "rationale": "Exact equality alone does not choose one of several matching user messages, and the instruction to place a marker does not say whether an existing marker counts as the wanted point or must remain untouched. Both choices affect the four-marker budget and the promise not to change another extension's markers.",
      "concrete_case": "Two user messages end in text identical to recallBlock, or the block before the matching recall text already has a cache marker from another extension.",
      "recommendation": "Define deterministic selection or fail-open behavior for multiple matches, and specify how an already-marked target affects copying, preservation, and budget counting."
    },
    {
      "id": "CC-6",
      "severity": "major",
      "location": "/Users/joelleibow/Projects/taiknr/openspec/changes/cache-point-before-recall/design.md §7.2–§7.3 and §5.3",
      "finding": "The live validation and triage procedure is not reproducible from the design.",
      "rationale": "The document gives route owners and qualitative inequalities, but no script invocation or route selection, measurement procedure for prefix and tail sizes, numeric or computed margin, or method for checking the model's cache-minimum precondition. The separate probe is named without the setup or command needed to rerun it.",
      "concrete_case": "Derek tries to validate OpenRouter using the committed script and must decide how to supply the route, establish the minimum eligible prefix, and choose the allowed write margin.",
      "recommendation": "Document the invocation and configuration for each route, the measurement and cache-minimum check, an explicit margin rule, and actionable failure output; include the probe's prerequisites and invocation if it remains a triage step."
    },
    {
      "id": "CC-7",
      "severity": "minor",
      "location": "/Users/joelleibow/Projects/taiknr/openspec/changes/cache-point-before-recall/design.md §4.2 and D5",
      "finding": "The mechanism that resets per-session in-memory state on /new, /reload, or session replacement is not stated.",
      "rationale": "Non-persistence by itself does not guarantee that a composed in-memory object is replaced when the active session changes; the document names no lifecycle hook or ownership rule that causes the reset.",
      "concrete_case": "A session is replaced while the extension process remains alive and carrier still contains an index and fingerprint from the previous session.",
      "recommendation": "Name the lifecycle event or construction boundary that creates or clears the state, and specify the expected behavior when sessions change."
    },
    {
      "id": "CC-8",
      "severity": "minor",
      "location": "/Users/joelleibow/Projects/taiknr/openspec/changes/cache-point-before-recall/design.md D10, §7.2, and §9",
      "finding": "Several project-specific terms are used without enough context for a reader to understand scope and validation: settlement stubs, Joel's attribution route, and the role of Jefferson/instruments.",
      "rationale": "These terms drive exclusions, route acceptance, and whether editing is independent of publishing, but the document does not explain what each component or route does or how it relates to the ordinary direct and OAuth routes.",
      "concrete_case": "A maintainer deciding whether a fresh settlement stub should get a carry, or setting up Joel's attribution acceptance session, has no definition of that object or route in the design.",
      "recommendation": "Add brief plain-English definitions and distinguish the attribution route from the other listed routes and the instruments switch from the payload-edit gate."
    }
  ],
  "assumptions": [
    {
      "assumption": "This review is limited to the design document and does not verify its claims against source, research, specifications, or owner rulings.",
      "status": "verified"
    },
    {
      "assumption": "The design's live-script instructions are intended to be sufficient for a maintainer to implement and rerun the checks without opening other artifacts.",
      "status": "unverified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "Source code, specs, research, owner rulings, and external provider behavior were not checked; the findings are document-only.",
    "No tests, live checks, or model calls were run."
  ]
}