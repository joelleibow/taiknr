{
  "mode": "council",
  "lens": "council-comprehension",
  "paraphrase_proposes": "",
  "paraphrase_existing": "",
  "recommendation": "Resolve the conflicting figure definitions and make the README and instrument defaults distinguish estimates, missing values, and pi’s unchanged compaction behavior; retain the owner’s four instruments and configuration rulings.",
  "findings": [
    {
      "id": "C1",
      "severity": "blocking",
      "location": "specs/context-figures/spec.md — Six figures; A request's saving",
      "finding": "The contract says context in turn is the request as sent, including recall, but also says recall is not folded into context in turn. The savings equation simultaneously subtracts recalled from the same figure.",
      "rationale": "A reader cannot determine what number to display or compute the stated saving consistently, and the measured provider prompt necessarily includes recalled text.",
      "concrete_case": "With a 1,000-token pre-recall request, 100 tokens recalled, and 200 tokens of stub savings, the documented context in turn could be 1,000 or 1,100; history before minus context in turn produces different savings.",
      "recommendation": "Define context in turn as the complete request including recall and publish recalled separately as a breakdown, or explicitly define a different figure and adjust the savings equation; reconcile all scenarios with the owner’s separate-figure ruling."
    },
    {
      "id": "C2",
      "severity": "major",
      "location": "specs/context-figures/spec.md — Every figure is a finite number with the estimate flag beside it",
      "finding": "The estimate flag is described both as meaning 'not yet calibrated' and as distinguishing measured figures from all estimates. A calibrated estimate is both calibrated and still an estimate, so one boolean cannot unambiguously convey both meanings.",
      "rationale": "Users could mistake an estimated archive size or saving for a measured value after calibration, contrary to the requirement not to misinform.",
      "concrete_case": "After one valid provider response, withheld is calculated using the calibrated ratio, but is not itself measured; the spec does not say which flag value it must show.",
      "recommendation": "Define explicit, consistent display semantics for measured versus estimated and calibrated versus uncalibrated values; show their meaning in default formats and README examples."
    },
    {
      "id": "C3",
      "severity": "major",
      "location": "specs/context-figures/spec.md — Context in turn before the session's first request; Two savings figures become known at different moments",
      "finding": "Numeric-only fields have no specified user-visible distinction between a genuine zero, a request that does not yet exist, and a dollar value pending for the current request; token and dollar savings may temporarily refer to different requests.",
      "rationale": "An operator watching live can read a stale dollar figure as the cost of the newly displayed token saving, or treat an initial placeholder as a real measurement.",
      "concrete_case": "Request B publishes its token savings while the visible dollar saving still belongs to completed request A; before the first request, any numeric placeholder is displayed as if it described a request.",
      "recommendation": "Specify a status or request-identity field and default rendering that marks pending and unavailable values, while retaining the required numeric fields; document when the paired figures become comparable."
    },
    {
      "id": "C4",
      "severity": "major",
      "location": "specs/jefferson-instruments/spec.md — The documentation explains what stubbing does to pi's measurement",
      "finding": "The requirement says the taiknr instrument 'resolves' pi's measurement and calculation issue, while the proposal explicitly leaves pi and its compaction check unchanged. It also treats the approximately 40% undercount as general despite the research showing substantial model dependence.",
      "rationale": "An operator could believe installing the instrument corrects pi's actual pre-run compaction decision, rather than only offering a better statusline estimate.",
      "concrete_case": "A user sees taiknr's calibrated context bar near the window limit and assumes pi's automatic compaction check now uses that value; pi still runs its own estimate.",
      "recommendation": "Say explicitly that the instrument improves the displayed estimate only, does not change pi's compaction calculation, and that the size of the discrepancy depends on model and workload."
    },
    {
      "id": "C5",
      "severity": "major",
      "location": "specs/context-figures/spec.md — A resumed session seeds k; michael-orientation.md §5 S1",
      "finding": "The resume requirement asks for calibration against the request that produced persisted usage, but does not explain how to reconstruct that request when recall and other request-time modifications were not persisted.",
      "rationale": "A silently reconstructed persisted projection can differ from the sent prompt, producing a biased calibrated figure immediately after resume while appearing trustworthy.",
      "concrete_case": "The newest persisted response followed a request containing a recall block, but recall writes nothing to the session; its usage includes that block while the saved projection does not.",
      "recommendation": "Specify what can be reconstructed and a safe uncalibrated fallback when the original request estimate is unavailable; disclose the limitation rather than implying the reconstructed ratio is exact."
    },
    {
      "id": "C6",
      "severity": "minor",
      "location": "specs/jefferson-instruments/spec.md — decision indicator; README example",
      "finding": "The scenario promises that the indicator lasts only a few hundred milliseconds at most, even though that is merely an observed timing from a small sample and calls can last until timeout. The specifications also leave operator setup and expected warnings distributed across several documents.",
      "rationale": "A slow call can violate the asserted maximum without being broken, while users need to understand that Jefferson must be loaded and the rows added manually, and that disabling taiknr causes unknown-instrument warnings.",
      "concrete_case": "A classifier request takes several seconds but completes before its configured timeout; a user who leaves taiknr rows configured when its instruments switch is off sees Jefferson warnings.",
      "recommendation": "Replace the timing guarantee with 'visible while the call runs' and document the timeout caveat. Include a pasteable row example, Jefferson 0.14.0+ prerequisite, switch behavior, and expected warning in the README."
    }
  ],
  "assumptions": [
    {
      "assumption": "The brief's owner rulings and approved scopes are binding; apparent conflicts in the draft deltas should be reconciled without reopening settled decisions.",
      "status": "verified"
    },
    {
      "assumption": "A separate numeric breakdown for recall can coexist with request usage that includes recall, subject to clarifying the contradictory delta wording.",
      "status": "unverified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "Live pi/Jefferson rendering, provider behavior, and repository source were not independently inspected; this review uses only the supplied council artifacts.",
    "Accuracy of calibration and dollar calculations across untested models and workloads remains a risk."
  ]
}