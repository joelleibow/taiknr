# Owner rulings — cache-point-before-recall

Joel's words only, quoted and dated. This file binds every other artifact and is newer than all of them.

## 2026-11-17

> "Right now this session has cost $.81 more than it would have otherwise. Let's right that wrong."

> "I'm not asking for anything. I just want to get this corrected so tht number isn't scary to folks."

- **Objective.** Make taiknr stop costing more than it saves, so the savings figure stops reading negative. The question of whether a subscription plan is worth its price is not part of this change.

> "Do we implement this for Anthropic only or do we know it will work fine with other providers? Mind you I said "know", not assume"

- **Provider coverage is decided by evidence.** Every provider route the change affects needs a measured result, not an assumption.

> "And should we vet this with an API Key to be absolutely certain we're not creating muckity muck?"

- **The direct Anthropic API-key route is verified** alongside the OAuth route.

> "Yes. Add it to gitignore and it should go in with the card's PR."

- **`.envrc` is added to `.gitignore` in this change's PR.** The file exports `CLAUDE_API_KEY` for this repository.

> "Yeah. That's exactly the sort of thing that I requested we explore for. We can't create a card without identifying these unknowns first."

- **Unknowns are settled by probing before they are planned on.**

## 2026-11-17 — orientation questions

The questions from `michael-orientation.md` §5 went to Joel as multiple-choice. His answers are recorded as the options he chose.

- **Q1, his attribution extension: (a), "Relax the guard for message points".** Joel changes his `anthropic-attribution` extension so that cache points inside messages may change. System, tools, identity and the 4-point limit stay protected. taiknr then serves his route the same way it serves pi's own provider. The extension lives outside this repository, so the change does not edit it. Joel's edit is a dependency for his route.
- **Q2, the objective against the figure: (a), "Fix cost, make the figure honest".** The figure prices the rewrite as it really happens. It may still read negative when recall really costs more than stubbing saves; the README says why and names `decisionThreshold` as the lever. Cost-aware recall and any credit to recall are out of scope.
- **Q3, unmeasured routes: (a), "Measured routes only".** The change acts on Anthropic direct (OAuth and API key), Anthropic via OpenRouter, and Joel's attribution route. Bedrock and the other Anthropic-format gateways keep today's payloads, and their under-reporting is recorded.
