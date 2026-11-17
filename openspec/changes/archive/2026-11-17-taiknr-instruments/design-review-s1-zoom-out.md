{
  "mode": "review",
  "lens": "council-zoom-out",
  "paraphrase_proposes": "",
  "paraphrase_existing": "",
  "recommendation": "Revise the off-path reading boundary and the since-start token label, then proceed. The feature is justified, its proposed files have named owning layers, and it reuses the archive, recall bridge and host estimator without introducing a parallel telemetry system.",
  "findings": [
    {
      "id": "ZO-S1-1",
      "severity": "major",
      "location": "openspec/changes/taiknr-instruments/design.md — Module & File Placement (pi-instrument-readings.ts), D1, D2 event table, D3 publisher contract",
      "finding": "The no-op publisher is selected correctly, but the design puts estimated host readings upstream of that no-op without specifying how their evaluation is deferred. D2 has registrars read request/projection estimates before calling the publisher, while D3 names only the sink and observer as outside interfaces. On that stated flow, choosing a no-op suppresses posts but not instrument-only estimation and projection work.",
      "rationale": "D1 and approved ruling 6 require the switch-off path to compute nothing for the instruments; ruling 18 accepts work when Jefferson is absent, not when the instruments are disabled. The architecture needs one explicit boundary that preserves both inward dependencies and lazy evaluation, rather than leaving implementation to add switch checks in six handlers. The proposed switch-off test asserts only no emits and would miss this discrepancy. Sources: design D1–D3; council.md rulings 6 and 18; existing src/app/extension/handler-gate.ts allows all handlers through while enabled is true.",
      "concrete_case": "Set enabled=true and jeffersonInstruments=false, then fire context_with_system or agent_settled. A registrar following D2 obtains an estimate through pi-instrument-readings.ts before invoking holder.current().requestBuilt/settled; the no-op then discards the computed reading. Instrument-only host reads still run and can throw even though publishing is disabled.",
      "recommendation": "Specify that instrument-only readings are evaluated only by the real publisher—for example, pass a deferred plain-reading callback to the event method that the no-op never invokes. Keep pi DTOs and estimation in infra and keep the switch's single reader unchanged. Extend the disabled-path test to assert the instrument readings are not invoked, not merely that the bus is silent."
    },
    {
      "id": "ZO-S1-2",
      "severity": "minor",
      "location": "openspec/changes/taiknr-instruments/design.md — D5 instrument table, taiknr.savings default format and label",
      "finding": "The chosen default displays the cumulative tokens as 'since … tok' under 'taiknr save', omitting the required meaning 'tokens not sent since start'.",
      "rationale": "This is not a new naming preference or a request to reopen ruling 2: the new D5 format fails to carry that ruling's explicit default-label safeguard. A cumulative count repeatedly credits the same stub across requests and can exceed the entire context window, so 'since' alone does not distinguish traffic avoided from context capacity saved. Sources: council.md ruling 2; specs/context-figures/spec.md, 'The cumulative saving counts from the current start' and 'The total counts tokens not sent'.",
      "concrete_case": "A 5,000-token stub saving carried by 100 requests displays a cumulative 500,000 tok beside a much smaller context window. The proposed default does not tell the viewer this is tokens not sent across requests rather than a 500,000-token reduction of current context.",
      "recommendation": "Make the default rendering explicitly identify savedTokensSinceStart as 'tokens not sent since start'. No new field, status mechanism or configuration is needed."
    }
  ],
  "assumptions": [
    {
      "assumption": "The existing ArchiveStore, recall formatter/request bridge and pi estimateTokens supply the reusable inputs; no installed dependency already implements taiknr-specific calibration and counterfactual savings.",
      "status": "verified"
    },
    {
      "assumption": "The proposed domain/use-case/infra/composition directories match the repository's existing ownership and dependency conventions.",
      "status": "verified"
    },
    {
      "assumption": "The disabled-path implementation could defer host readings, but the current design does not specify that boundary consistently.",
      "status": "unverified"
    },
    {
      "assumption": "Approved council rulings remain binding; the six registrars, holder/no-op pattern, scorer observer and accepted no-listener cost were not reconsidered.",
      "status": "verified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "No files were edited and no tests or load checks were run; this was a read-only design and repository review.",
    "Jefferson live rendering, in-flight repainting and registration acceptance remain Joel's acceptance check; they were not reproduced.",
    "Provider normalization beyond the supplied research was not audited."
  ]
}