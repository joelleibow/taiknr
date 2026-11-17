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
