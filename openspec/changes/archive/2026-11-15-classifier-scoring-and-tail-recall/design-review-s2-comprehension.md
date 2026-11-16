{
  "mode": "review",
  "lens": "council-comprehension",
  "paraphrase_proposes": "The design adds request-time recall: it identifies the latest user prompt, scores eligible archived tool outputs with a bounded classifier call, and appends fitting full outputs to that user message. It caches the selected IDs per prompt and store size, rechecks branch eligibility on every request, warns once per session on classifier failures, and adds a configurable timeout. It also specifies offline tests, a live provider-payload check, and documentation updates.",
  "paraphrase_existing": "According to the document, taiknr already archives tool outputs and replaces their conversation content with stubs, but the recall path is unimplemented. A session-scoped cache and existing ports and adapters provide seams for recall, while a composition-root gate prevents most handlers from running when taiknr is off. Pi supplies the context events, branch entries, classifier, settings and model limits that the proposed implementation will use.",
  "recommendation": "Revise the design to define its project-specific data flow and make the disclosure, formatting, and live-verification contracts unambiguous before implementation.",
  "findings": [
    {
      "id": "COMP-1",
      "severity": "major",
      "location": "Context; Module & File Placement; Decisions 4–5",
      "finding": "The document does not explain the existing archive data model or lifecycle well enough to connect the recall steps. Terms such as settlement, hydration, side-store batch, archived item, stub, branch, and tool-result entry are used before their relationships are defined; the store's read operations and the mapping from an eligible ID to its stored raw text are not described.",
      "rationale": "A reader limited to this document cannot follow how an output gets archived, how a branch entry corresponds to a stored item, or how the use case obtains items to score and format.",
      "concrete_case": "Implementing decision 9 requires retrieving the stub, tool name, arguments summary and raw text for each ID, but the design names only store.size() and refers generically to the store's read API.",
      "recommendation": "Add a short existing-system walkthrough and the relevant item fields and store read contracts, including how item IDs relate to branch entries and batches."
    },
    {
      "id": "COMP-2",
      "severity": "major",
      "location": "Decision 6, The question; Risks / Trade-offs, disclosure row",
      "finding": "The disclosure statements do not consistently distinguish the classifier provider from the main model provider. Decision 6 says raw text never leaves the machine, and the risk table says the full raw text never leaves, although decisions 3, 10 and 13 describe sending recalled raw text in the main provider request.",
      "rationale": "A reader cannot tell what data is disclosed to which external service, a particularly consequential ambiguity for a feature restoring potentially sensitive tool output.",
      "concrete_case": "An eligible archived output contains a secret: its stub goes to the classifier, and, if selected, its full text is appended to the main model request despite the statement that full raw text never leaves.",
      "recommendation": "State separately what the classifier receives and what the main model provider receives, and qualify every 'never leaves' claim by destination."
    },
    {
      "id": "COMP-3",
      "severity": "major",
      "location": "Decision 10, The block",
      "finding": "The exact serialization is not fully specified for multiple items. The sample shows one item, but does not say how adjacent items are separated, whether the illustrative header's line break is literal, or whether the closing marker is followed by a newline.",
      "rationale": "The design requires identical bytes across requests and compares the formatted length to a character budget, so whitespace is part of the functional contract rather than presentation.",
      "concrete_case": "Two implementations could insert either one or two newlines between item bodies and labels; both fit the prose but produce different cached request bytes and different budget-fit outcomes.",
      "recommendation": "Give an exact two-item example or a precise newline-joining rule, including the header, inter-item separators and final newline."
    },
    {
      "id": "COMP-4",
      "severity": "major",
      "location": "Decision 13; Migration Plan, Deployment step 4",
      "finding": "The required live verification lacks an executable scenario and operator setup. It does not say how to create an archived output through pi, obtain a comparable no-recall request, choose or supply the real models and credentials, or invoke the script.",
      "rationale": "The coder must run this script to complete verification, but cannot construct or reproduce the required provider-payload comparisons from this document alone.",
      "concrete_case": "The check requires byte-identical earlier and system messages versus a request without recall, yet no baseline run or procedure for keeping those messages identical is described.",
      "recommendation": "Specify the minimum session sequence, baseline construction, configuration and credential inputs, invocation, and successful and failing exit conditions."
    },
    {
      "id": "COMP-5",
      "severity": "major",
      "location": "Decision 6, steps 2 and The question",
      "finding": "The classifier request's concrete data shape and question wording are ambiguous. The document calls archivedStubs a map and puts it into state, but does not define each map value; the example embeds <id> inside a quoted instruction without stating whether or how it is replaced with the actual ID.",
      "rationale": "Implementers cannot construct a reliably testable request or know whether the classifier sees an actual item reference or a literal placeholder.",
      "concrete_case": "For an ID containing punctuation or a newline, it is unclear what archivedToolOutputs contains and what exact instructions string is sent for that question.",
      "recommendation": "Show a complete one-item JSON request with a representative full ID and stub, and define ID interpolation or explicitly state that the placeholder is literal."
    },
    {
      "id": "COMP-6",
      "severity": "minor",
      "location": "Decision 2, step 2; Migration Plan, Deployment step 2",
      "finding": "The event-time config accessor and project configuration location are identified only by references to another handler and a 'trusted project file'. The agent directory is also not defined for an operator.",
      "rationale": "A reader with only the design cannot determine the intended call to read resolved config or where to place the timeout override and remove it for rollback.",
      "concrete_case": "An operator wants to set classifierTimeoutMs for one project, but the deployment instructions give no project file path or rule for project trust.",
      "recommendation": "Name the holder accessor and the agent and project config paths, and briefly state the trust prerequisite and precedence."
    },
    {
      "id": "COMP-7",
      "severity": "minor",
      "location": "Decision 9, Failure and cancel; Decision 11",
      "finding": "The sequence when notification itself throws is not explicit. Decision 9 says to notify, record the failed token and return, while decision 11 says a notification throw escapes and the request goes out unchanged, without saying whether the token was recorded.",
      "rationale": "This determines whether a later event under the same key retries the classifier and whether the claimed one-attempt rule still applies.",
      "concrete_case": "The classifier rejects and ctx.ui.notify throws; on the next request with the same prompt and store size, the reader cannot tell whether scoring is retried.",
      "recommendation": "State the exact ordering and cache state on notifier failure, and document whether the one-attempt guarantee has that exception."
    }
  ],
  "assumptions": [
    {
      "assumption": "The design is intended to be understandable and implementable without consulting its research, rulings or source files.",
      "status": "verified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "Source files, specifications, research and owner rulings were not read; findings concern the design document alone.",
    "The live script, tests and actual provider disclosure behavior were not executed or verified."
  ]
}