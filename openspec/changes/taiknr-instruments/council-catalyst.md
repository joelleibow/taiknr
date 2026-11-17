{
  "mode": "council",
  "lens": "council-catalyst",
  "paraphrase_proposes": "",
  "paraphrase_existing": "",
  "recommendation": "Resolve one false compromise through reporting segmentation: recalled can be published independently while remaining included in context in turn. No broader architectural transform is warranted by the supplied evidence.",
  "findings": [
    {
      "id": "CAT-1",
      "severity": "major",
      "location": "openspec/changes/taiknr-instruments/specs/context-figures/spec.md — “Recalled stands on its own”, “Context in turn, before and after the response”, and “A request's saving is the difference between two figures”",
      "finding": "The delta conflates an independently published component with a component excluded from the request total. “Recalled stands on its own” says recall is not folded into context in turn, while the request-total definition includes recall and the savings identity subtracts it. These requirements cannot all hold when recall appends text.",
      "rationale": "The apparent compromise—either expose recalled separately or include it in the complete request—is false. Reporting segmentation permits an overlapping breakdown: context in turn describes the entire sent request, while recalled independently describes one component. This preserves Joel's separate-figure ruling and Michael's settled S3/S8 accounting without changing recall behavior.",
      "concrete_case": "With history before estimated at 100,000 tokens, withheld at 10,000, stubbed at 1,000 and recalled at 2,000, context in turn must be 93,000 and savings 7,000. Excluding recalled produces context in turn of 91,000 and savings of 9,000, contradicting withheld − stubbed − recalled and the response's measured prompt.",
      "recommendation": "Use reporting segmentation, not mutually exclusive accounting buckets: amend the standalone-recalled scenario to require its own published field while explicitly retaining recall in context in turn. Add a request-with-recall test that asserts both savings expressions agree under the chosen estimator and that the response measurement covers recall. Secondary operational trade-off: the displayed figures overlap and must not be summed indiscriminately; document that relationship. This needs no extra model call, persistence or runtime abstraction."
    }
  ],
  "assumptions": [
    {
      "assumption": "Joel's requirement that recalled be its own published figure does not require excluding it from the complete request figure; owner-rulings quotes only “published figure”, and orientation S8 explicitly includes recall in context in turn.",
      "status": "verified"
    },
    {
      "assumption": "The supplied research accurately describes the existing hooks, store and Jefferson contract; their underlying implementations were not independently inspected in this pass.",
      "status": "unverified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "No files edited; no source inspection beyond the supplied artifacts, test execution or live TUI rendering.",
    "Calibration accuracy and counterfactual dollar accounting were not independently validated; both retain the estimation risks documented in the supplied research."
  ]
}