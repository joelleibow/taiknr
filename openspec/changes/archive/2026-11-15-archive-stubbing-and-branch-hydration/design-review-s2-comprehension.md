{
  "mode": "review",
  "lens": "council-comprehension",
  "paraphrase_proposes": "At each turn end, the extension stages sufficiently large tool-result text, then at run settlement writes the original text to a side-store batch and replaces eligible results with short stubs while retaining non-text content. Before writing, it excludes results that left the active branch or have already been targeted by a context edit. On session start, tree navigation, and compaction, it rebuilds its in-memory archive from valid side-store entries on the active branch; the feature remains inert when inactive.",
  "paraphrase_existing": "The document says the domain, use-case, adapter, and event-handler seams already exist, but their archiving bodies are missing; an in-memory archive store and session configuration setup already work. The extension already registers seven events and constructs the pending list and lookup maps, but only session start currently loads configuration. Pi keeps a raw active branch, applies boundary drafts after handlers return, and can discard a whole boundary when a draft fails.",
  "recommendation": "Revise the design before implementation to specify the stub and content-replacement contracts, the pairing and configuration edge cases, and the guarantees around competing drafts and failures.",
  "findings": [
    {
      "id": "CC-1",
      "severity": "blocking",
      "location": "Decisions 4 and 7; Goals / Non-Goals",
      "finding": "The document never gives the actual stub template or explains how the stub is inserted into the replacement content array alongside preserved non-text blocks.",
      "rationale": "Counts, preview rules, and single-line safety are specified, but readers cannot determine the required output string, block ordering, or placement without another artifact. Different implementations could all satisfy the prose while producing incompatible model-visible content.",
      "concrete_case": "A tool result contains text, an image, and more text: the design does not say where the single stub block appears relative to the image or what exact text it contains.",
      "recommendation": "State the complete stub template, including delimiters and field order, and specify the replacement array construction and ordering for mixed text and non-text blocks."
    },
    {
      "id": "CC-2",
      "severity": "major",
      "location": "Context; Decision 10; Module & File Placement",
      "finding": "The configuration and gating concepts needed to reproduce inertness are not defined in the document: the config holder, gated pi, session.isActive(), and off versus rejected states are named but their relationships and transitions are not explained.",
      "rationale": "A reader cannot tell what makes a session active, which registrations receive the gate, or why session_start is the only ungated handler. The design's central off-state guarantee consequently depends on unstated setup.",
      "concrete_case": "At session_start configuration is rejected, or the feature is switched off and later on: the document does not explain how state reaches session.isActive() or which event registrations the gate suppresses.",
      "recommendation": "Summarize configuration loading, the active predicate, how the gated pi wraps registrations, and the effect of enabling or disabling on subsequent events."
    },
    {
      "id": "CC-3",
      "severity": "major",
      "location": "Decision 2; Decision 6",
      "finding": "The candidate-to-entry pairing contract does not say what to do when no matching projected entry exists, the positional fallback is unavailable, or multiple results share a toolCallId; it also does not describe missing argument summaries or original content.",
      "rationale": "The happy path is explained, but the stated filtered-id hazard makes unresolved mappings a realistic condition. Staging without a trustworthy id or original content can silently omit an output, target the wrong result, or prevent preservation of non-text content.",
      "concrete_case": "contextEntries is present but contains no matching toolResult, or is absent while toolResultEntryIds is shorter than the result list; a nested call has no recorded args summary.",
      "recommendation": "Specify whether each unresolved result is skipped or fails the event, how duplicate matches are resolved on both id and content lookup, and the exact defaults for missing summaries and content."
    },
    {
      "id": "CC-4",
      "severity": "major",
      "location": "Decisions 7, 8 and 11; Risks / Trade-offs — competing context edits",
      "finding": "The claim that same-boundary competing edits cannot be overwritten is not connected to an ordering or visibility guarantee for other handlers' drafts.",
      "rationale": "The filter examines event.entries at taiknr's turn, but the document does not establish that it includes drafts from handlers that run later, or how conflicts are resolved when those drafts are committed. Readers cannot verify the promised author-independent protection for all extensions.",
      "concrete_case": "Another extension proposes a redaction for the same target after taiknr has built its own stub draft in the same boundary.",
      "recommendation": "Explain Pi's handler ordering, what each handler sees in event.entries, and the final conflict behavior; scope the guarantee to what can actually be observed or define a mechanism that also handles later drafts."
    },
    {
      "id": "CC-5",
      "severity": "major",
      "location": "Decisions 7 and 11",
      "finding": "The failure and mutation sequence is internally unclear: Decision 7 prunes pending items before building drafts and says to return the draft array before draining the store, while Decision 11 says drafts are built before mutating state.",
      "rationale": "Taken literally, the return makes the drain unreachable, and a draft-construction failure can occur after pending items and originals have already been deleted. The document does not state which changes remain on failure or how retries work.",
      "concrete_case": "A mixed pending batch has an off-branch item pruned, then toSettlementDrafts throws for a remaining item.",
      "recommendation": "Give an executable sequence distinguishing construction of the return value from the final return, and specify state and retry behavior when candidate translation, draft construction, store writes, or branch reads fail."
    },
    {
      "id": "CC-6",
      "severity": "minor",
      "location": "Decision 4; Decision 5; test plan for tool-call.test.ts",
      "finding": "The handling of undefined tool input is ambiguous: the implementation instruction converts it to an empty string, while the test description says it must not record junk without defining whether an empty summary is stored or the call is skipped.",
      "rationale": "Both interpretations satisfy parts of the prose but produce different lookup-map state and potentially different rendered stubs.",
      "concrete_case": "A top-level tool_call has event.input === undefined and a subsequent result is staged.",
      "recommendation": "Specify whether to store an empty summary or omit the map entry, and state what the rendered argument field contains in that case."
    },
    {
      "id": "CC-7",
      "severity": "minor",
      "location": "Decision 11 — observation surfaces",
      "finding": "The proposed silent-drop observation requires a side-store entry omitting the dropped id, but settlement explicitly produces no side-store entry when every pending item is dropped.",
      "rationale": "An operator cannot apply the stated diagnostic in the all-dropped case, and absence of a context edit alone does not distinguish a drop from an unstaged result or a failed boundary.",
      "concrete_case": "The only pending output is off-branch at settlement, so the handler prunes it and returns undefined.",
      "recommendation": "Describe the all-dropped case separately and acknowledge that the available persisted observations do not uniquely diagnose a silent drop."
    }
  ],
  "assumptions": [
    {
      "assumption": "The document's description of existing Pi behavior and current code is accurate; this review did not independently verify it.",
      "status": "unverified"
    },
    {
      "assumption": "The stub's exact format and mixed-content ordering are required implementation contracts rather than intentionally unconstrained choices.",
      "status": "unverified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "Referenced specs, research, rulings, source files, and tests were not read, as required by the brief.",
    "Runtime behavior and package-version compatibility were not independently verified."
  ]
}