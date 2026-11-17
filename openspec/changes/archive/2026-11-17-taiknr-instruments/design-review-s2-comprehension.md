{
  "mode": "review",
  "lens": "council-comprehension",
  "paraphrase_proposes": "The design adds four Jefferson instruments that report estimated context, archived material, savings and classifier activity. A per-session publisher reads host data at six lifecycle events, calibrates estimates against response usage, and models token and dollar savings. A default-on switch controls whether the publisher is installed; the existing archive and recall behavior are intended to remain unchanged.",
  "paraphrase_existing": "Taiknr stores original tool output alongside replacement stubs, reconstructs that store from the session branch, and can append recalled material to a user message. Pi's own context figure can fall back to a character-based estimate after an edit, and the document reports that this underestimated actual prompts in one session. Jefferson accepts instrument registrations and updates, but does not tell an extension whether anyone is listening; taiknr currently records no token sizes and publishes no instruments.",
  "recommendation": "Revise the design to make calibration, event data flow, reporting, and failure isolation implementable from the document alone.",
  "findings": [
    {
      "id": "C1",
      "severity": "major",
      "location": "Context; Goals / Non-Goals; D2",
      "finding": "The core archive and lifecycle vocabulary is used before the document explains how the pieces connect.",
      "rationale": "A reader cannot confidently tell what triggers a settlement, what a boundary commits, how hydration reconstructs the store, or how stubbing differs from recalling. These are not standard concepts, and the proposed event order and savings depend on them.",
      "concrete_case": "An implementer reading the `agent_settled` row must decide what has changed and why the store is authoritative after that event, but the document only refers to settlement drafting and a boundary committing.",
      "recommendation": "Add a short existing-flow walkthrough defining settlement, stub, boundary, hydration, branch, projection, and recall, and connect each to the relevant lifecycle event."
    },
    {
      "id": "C2",
      "severity": "blocking",
      "location": "D2; D3; D7; Risks / Trade-offs: seeded k",
      "finding": "Calibration seeding and model-pair transitions are not specified well enough to implement.",
      "rationale": "The document says to select valid branch samples for a current model pair but never defines the pair's members, how a historical sample is matched to its request estimate, which sample wins, or what k to use when no matching sample exists. It also does not give a complete validity rule for the denominator or explain exactly when a model change resets the flag and ratio.",
      "concrete_case": "On session start, a branch contains several assistant usages for different models, or contains no valid matching sample; the reader cannot determine the opening k and flag from the design.",
      "recommendation": "Define the pair, historical estimate construction, sample validity and selection order, fallback k, and the transitions for live samples, model switches, compaction and tree changes."
    },
    {
      "id": "C3",
      "severity": "major",
      "location": "D5; D7; D2 message_end row",
      "finding": "The document does not say how the previously published request figures are reconciled when a response produces a new k and a measured `contextInTurn`.",
      "rationale": "The identity is defined using one common k, yet the response changes `contextInTurn` and can change k while `historyBefore`, `withheld`, `stubbed` and `recalled` are listed as request-only writes. The document therefore does not explain whether displayed fields should remain mutually consistent or which values the response republishes.",
      "concrete_case": "A request is published with k=1, then its valid response gives k=0.6; the measured request value changes, but the request-only fields have no stated response update.",
      "recommendation": "Specify the response-time publication of all affected fields, including the k used for the savings pair and the expected identity before and after a response."
    },
    {
      "id": "C4",
      "severity": "blocking",
      "location": "D2; D8, Which message taiknr changed",
      "finding": "The data and matching rules needed to detect a prior recall block's disappearance and new stubs are incomplete.",
      "rationale": "The recall report contains only an estimate and message index, yet the rewrite rule requires checking whether the next request still carries that particular block. The document also does not specify matching behavior for repeated or identical stub texts, multiple occurrences, or changed message positions.",
      "concrete_case": "Two archived items have identical stubs, or a recalled block's message moves after a branch or context change; the described state does not establish which raw text to use or how to locate the changed suffix.",
      "recommendation": "Define the exact request representation and stored identity needed for block and stub matching, including duplicate and unmatched cases and how message indices map between requests."
    },
    {
      "id": "C5",
      "severity": "major",
      "location": "D3; D5; Context: Jefferson contract",
      "finding": "The partial publication contract is not connected to Jefferson's requirement that every declared field be posted or the instrument blanks.",
      "rationale": "A `Publication` is a partial record and individual events update only some fields, but the design does not say whether each update is a whole-instrument snapshot or how unchanged values are supplied. A partial record also cannot by itself make a missing figure a compile error, contrary to D3's claim.",
      "concrete_case": "An observer posts only `deciding` and `decidingItems` while the recall instrument also declares `recalled` and `uncalibrated`; the design does not say what report is emitted for the other fields.",
      "recommendation": "Specify the actual update payload, field completeness scope, where last values are retained if needed, and the type and test guarantees for every instrument update."
    },
    {
      "id": "C6",
      "severity": "major",
      "location": "D2; D3; D4; Risks / Trade-offs: emit throws",
      "finding": "Failure isolation on recall's path is asserted but not described for observer and publisher failures.",
      "rationale": "Recall directly calls the publisher's observer and `reportRecalled`, while the bus adapter catches only emit failures and publishing registrars do not wrap recall's calls. The risk table requires a throwing observer to leave recall's messages intact, but no layer is assigned responsibility for catching that throw.",
      "concrete_case": "`observer.started`, `observer.finished`, or the deferred `reportRecalled` calculation throws during recall; the document does not show how recall still returns its messages.",
      "recommendation": "State the precise catch boundary and behavior for each recall-path observer and reporting call, including classifier rejection, while keeping the existing recall result and error handling intact."
    },
    {
      "id": "C7",
      "severity": "major",
      "location": "D2; D3; D8 row 12",
      "finding": "The classifier observer's completion and spend lifecycle is not defined for all exits and request boundaries.",
      "rationale": "The proposed `finished` call is described as the line after an await, which does not execute if classification rejects, yet the tests require calls on every exit shape. The design also does not say when last classifier spend is cleared or how multiple calls in one request combine.",
      "concrete_case": "A classifier call throws, or a later request performs no classification after an earlier paid call; the reader cannot determine whether `deciding` remains true or whether old spend is charged again.",
      "recommendation": "Specify start/finish behavior on success, missing usage and rejection, plus the reset and aggregation rules associating classifier spend with each request."
    },
    {
      "id": "C8",
      "severity": "major",
      "location": "D2; D7; Risks / Trade-offs: seeded k",
      "finding": "The source of the system message and delivery of recall-modified messages to the separate request registrar are not explained.",
      "rationale": "The calculation requires the same system-message treatment on both sides and the actual request after recall, but the design also says a persisted projection lacks the earlier system prompt. Merely registering a handler after recall does not explain what data the later handler receives or how the current system message is included in projection estimates.",
      "concrete_case": "At `context_with_system`, recall returns modified messages; at a later `message_end`, the reader must estimate the persisted projection including the system message, but the stated readings do not identify the source or propagation mechanism.",
      "recommendation": "Describe the host's handler-result propagation and the exact construction of request and persisted estimates, including the system message at each event and the behavior when it is unavailable."
    },
    {
      "id": "C9",
      "severity": "major",
      "location": "D8; D2 message_end row; Risks / Trade-offs: malformed usage",
      "finding": "The treatment of invalid and incomplete response and cost data is only partly specified.",
      "rationale": "The design distinguishes valid, aborted, errored and zero-usage responses but does not define all validity checks or the published per-request values when a pending request is consumed without a valid response. Cost and classifier values may also be absent or non-finite, while all published figures are required to be finite.",
      "concrete_case": "A response has positive token usage but a missing or non-finite cost component, or arrives with no pending request; the document does not determine its calibration, pricing, flag and published savings behavior.",
      "recommendation": "Give a compact response-state table covering missing, non-finite and zero token and cost components, no pending request, and aborted or errored responses, including which values remain unchanged or reset."
    },
    {
      "id": "C10",
      "severity": "major",
      "location": "D6; Migration Plan; Project documentation",
      "finding": "A reader cannot determine how to configure and use the instruments from this document alone.",
      "rationale": "The switch's name and default are given, but not its configuration file location or layering, and the proposed Jefferson rows are deferred to a future README. The document also mentions a local Jefferson checkout and a types-only development dependency without clearly distinguishing the required runtime listener from the build dependency.",
      "concrete_case": "An operator wants to disable instrument publishing or set up the four rows on a clean installation, but has no complete configuration example or stated runtime prerequisite.",
      "recommendation": "State where the switch is configured, how its layers apply, what runtime Jefferson setup is required, and provide a minimal usable row example or explicitly delimit these as documentation dependencies."
    },
    {
      "id": "C11",
      "severity": "minor",
      "location": "Goals / Non-Goals; Context: contracts this change must not widen",
      "finding": "Several scope constraints are delegated entirely to unnamed external content or unexplained ruling identifiers.",
      "rationale": "The design says all proposal exclusions apply and that the frozen contracts have a closed exception list, but does not restate either list. A reader with only this document cannot tell whether an otherwise plausible implementation is out of scope or violates a frozen contract.",
      "concrete_case": "An implementer considers changing an existing registrar dependency or adding a related reporting feature; the document cites `extension-packaging` and proposal exclusions without providing their full boundaries.",
      "recommendation": "Summarize the applicable exclusions and the complete allowed contract changes in this design, or clearly identify the external documents as required reading rather than presenting the design as self-contained."
    }
  ],
  "assumptions": [
    {
      "assumption": "The review brief requires assessing the design without consulting its cited research, rulings, specifications, or source code.",
      "status": "verified"
    },
    {
      "assumption": "Jefferson's updates require the field-completeness behavior stated in the design.",
      "status": "unverified"
    },
    {
      "assumption": "Host handler ordering and error isolation behave as the design claims.",
      "status": "unverified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "External specifications, source code, research, rulings, and live Jefferson or pi behavior were not checked; the assessment relies solely on design.md.",
    "Actual numerical calibration and savings results were not independently reproduced."
  ]
}