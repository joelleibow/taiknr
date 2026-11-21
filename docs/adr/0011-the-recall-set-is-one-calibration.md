# 0011. The Recall Set Is One Calibration

## Status

Accepted

## Context

The scoring prompt, the stub's argument cut, the request's size budget and split, the 600-unit output excerpt, the summary's construction and the classifier model were measured as one set, on 151 labelled requests holding 18,535 archived items. The default threshold is read off that measurement rather than chosen from a principle. At 0.55 the shipped default recalls 9.4 items per request — 2.4 of them irrelevant, 7.0 related — against 9.2 with 3.0 irrelevant before it, and 1.9 items per top-level message at a precision of 0.86 against 3.2 at 0.55. At 0.60 the irrelevant items barely move while related ones fall away. At 0.50 the irrelevant ones rise by a third.

Nothing kept those numbers attached to the settings they describe. A later card that changed the prompt, the stub, the request's budget or the model would leave 0.55 standing on a calibration it no longer has: the figures would still read as measured while describing a request nobody sent. The board already carries one such card, replacing a repeated tool call with its newest result, which changes the stubs a request carries.

Two alternatives were weighed. State the relationship in prose alone: prose is what the next card reads last. Pin the model and treat nothing else as calibrated: four other settings move the same numbers. Freeze the whole set so no setting can change without a release: no measurement supports taking the threshold away from the user, and Joel ruled that it stays configurable.

## Decision

**The recall set is the prompt wording, the stub's argument cut, the request's byte budget and its split, the 600-unit excerpt, the summary's construction, and the pinned decision model.** Those are the members that were measured together, and the default threshold is a point on that one curve.

**The default `decisionThreshold` is that measurement's operating point, not a free parameter.** It is 0.55. A user may set their own, and the figures at 0.50, 0.55 and 0.60 are on record so the choice is informed.

**A change to any member of the set re-runs the live verification and re-picks the threshold.** The verification is a live script, kept untracked beside its labelled cases and its scores, run before the change is archived, and it costs about $0.45 of classifier spend per run. Its pass ranges are the central 99.8% of 20,000 simulated draws of the shipped request, and every measured setup that predates the shipped set fails at least one of them.

**The pinned model is `typesafe/jev-1.14`.** The `~typesafe/jev-latest` alias still works when a user names it, and a user who keeps the alias runs an unmeasured calibration. A model id the catalog no longer resolves fails open, as every unresolved classifier does.

## Consequences

**Easier:**

- A change to one lever now has a written answer to "what must I measure", and a check that tells a correct build from every setup measured before it.
- The default threshold has an evidence trail: 0.55 is a point on a measured curve, and the numbers either side of it are recorded with it.
- The pin costs nothing at runtime and stops a green test suite from describing a model that moved underneath it.

**More difficult:**

- Cosmetic edits to the calibrated text are paid changes: a wording change needs a live run before anyone can say what it did.
- The verification's ranges cannot separate a threshold between 0.52 and 0.58 from 0.55, so a small tuning is below what the procedure resolves and has to be argued from the curve instead.
- When a provider retires `typesafe/jev-1.14`, every user who never set a model fails open until a new pin ships and is calibrated again.
- The set is large enough that a reader changing one member may not think of themselves as changing the calibration, so this record has to be found before the change, not after it.
