{
  "mode": "council",
  "lens": "council-comprehension",
  "paraphrase_proposes": "",
  "paraphrase_existing": "",
  "recommendation": "Proceed to design after resolving the conflicting prompt and branch contracts, and make the live check and user-facing disclosure actionable without reopening the owner's settled choices.",
  "findings": [
    {
      "id": "C1",
      "severity": "major",
      "location": "specs/tail-recall/spec.md — Recall is scored once per latest user prompt; research-chidi.md §2",
      "finding": "The repeated-prompt scenario assumes timestamps uniquely distinguish messages, but the evidence says timestamps have millisecond resolution and no uniqueness guarantee. The required timestamp-plus-text key therefore cannot always distinguish a new message from an old one.",
      "rationale": "A user can send a new prompt yet silently receive the previous prompt's scoring, contrary to the new-message and steer contracts; this is a real limitation of the settled key, not just an implementation detail.",
      "concrete_case": "Two identical user messages are created in the same millisecond with the same timestamp and text; the second message has the previous cache key and is not rescored.",
      "recommendation": "Specify how to distinguish distinct messages in this collision case, while retaining reuse across requests for the same message; enumerate any necessary contract or spec change and add a collision test."
    },
    {
      "id": "C2",
      "severity": "major",
      "location": "proposal.md — Recall yields to edits taiknr did not write; specs/tail-recall/spec.md — Recall yields to edits taiknr did not write and to items off the branch",
      "finding": "The proposal requires the latest branch edit to be taiknr's stub, whereas the spec says the latest edit, 'if any,' must be the stub. The spec also says an item with a non-taiknr edit is excluded, without clarifying whether an older edit counts when a later edit exists.",
      "rationale": "These descriptions give different answers for the same branch history, leaving implementers and users unsure when archived raw content may reappear.",
      "concrete_case": "An archived item's entry is on the active branch but has no context_edit: the spec's conditional permits recall, while the proposal's stub requirement excludes it.",
      "recommendation": "State explicitly whether no edit makes an item eligible and whether only the latest edit matters; align the proposal, requirement, and scenarios with the intended safety boundary."
    },
    {
      "id": "C3",
      "severity": "major",
      "location": "specs/tail-recall/spec.md — Recall is tested without a classifier call and verified by a live script run by hand; proposal.md — Open Questions O7",
      "finding": "The live-script requirement says it must call the real classifier and model, but does not say what observable evidence establishes that real recall reached the in-flight request or how the script signals success and failure.",
      "rationale": "Calls alone could succeed while recall is absent, attached to the wrong message, or persisted incorrectly; model behavior alone is nondeterministic and can appear correct without using the recalled output.",
      "concrete_case": "A script successfully invokes Jev and a model but the context handler remains a no-op; the stated live-call scenario can pass without verifying the feature.",
      "recommendation": "In the design, define reproducible setup and cleanup, credential and model prerequisites, cost warning, a request-level observation of the expected recalled text, and explicit success/failure exit criteria; retain the owner's live-script requirement."
    },
    {
      "id": "C4",
      "severity": "minor",
      "location": "proposal.md — docs pass, failure notice, and Recall writes nothing; michael-orientation.md — T13 and Q6",
      "finding": "The feature silently sends each new user prompt and archived stubs to the configured classifier, incurs costs outside pi's session totals, and cannot show recall-failure notifications in print or JSON mode. The proposal mentions architecture and config documentation but does not explicitly require a user-facing explanation of these combined consequences.",
      "rationale": "An operator cannot readily understand the external data boundary, unreported cost, or why headless recall might be absent from the normal interface; documenting these does not require adding a status feature or changing the chosen notification channel.",
      "concrete_case": "A user enables pi-taiknr in an automated JSON session, assumes the prompt remains with the main model provider, and has no visible recall warning after classifier failure.",
      "recommendation": "Add a concise README explanation of what is sent, when classifier calls occur, that their spend is not in pi's session total, and that recall failure notices are silent in print and JSON; identify the existing config fields relevant to troubleshooting."
    },
    {
      "id": "C5",
      "severity": "minor",
      "location": "proposal.md — Open Questions O6; specs/tail-recall/spec.md — The recall block is one trailing text block on the latest user message",
      "finding": "The term 'tail recall' can suggest the block is last in the provider-visible conversation, but the requirement only puts it at the tail of the latest AgentMessage with role user. A later custom or bashExecution message can become a user-role message after conversion.",
      "rationale": "Without this distinction, a reader may expect the recalled material to be the last user-facing instruction or assume that all provider user messages participate in prompt selection.",
      "concrete_case": "A custom message follows the latest role-user message; recall is appended to the earlier message and the custom message subsequently becomes a provider-visible user message after it.",
      "recommendation": "Define 'tail' as the selected message's content tail, document which message types are excluded from scoring, and specify and test the ordering when a later converted user-role message exists."
    }
  ],
  "assumptions": [
    {
      "assumption": "The supplied research accurately describes pi 1.5.2 timestamp generation and message conversion.",
      "status": "unverified"
    },
    {
      "assumption": "Owner rulings on steering, notification channels, the configured provider, and live verification remain binding.",
      "status": "verified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "Source files, living specs, implementation, and tests were not independently inspected or run; platform behavior is taken from the supplied research.",
    "Classifier quality and timeout tail latency were not measured; the ten supplied round trips are not a tail-latency estimate."
  ]
}