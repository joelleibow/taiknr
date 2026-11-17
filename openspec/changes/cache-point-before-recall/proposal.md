# Proposal

## Why

On every route measured, a request carrying recall's block makes the provider rewrite the turn's prefix back to the newest entry still within reach instead of reading it. In Joel's own session, eleven turn starts read only the 35,731-token system/tools entry and rewrote 41k–143k tokens each (`michael-orientation.md` M1). That surplus is real money — about $5.77 of excess writes in one post-compaction hour, against the $0.35 the dollar model charged (`M9`) — and it is why his own words are "this session has cost $.81 more than it would have otherwise" (`owner-rulings.md`, 2026-11-17).

The savings figure cannot show this. It charges a rewrite from the recalling message, while the real rewrite starts a prefix earlier, so it understates taiknr's real cost by about 16× (`M2`; `M9`). Fixing the payload alone leaves the figure dishonest; fixing the rule alone charges for a rewrite that still happens.

## What Changes

- **A recall block stops costing the turn its cached prefix.** On the routes with a measured result, a request carrying the block is sent so the provider reads the prefix before the block and writes only from the block onward, and the first request after a recalling turn reaches an entry the recalling turn wrote, including turns longer than the provider's lookback and turns longer than a cache entry's remaining lifetime (`M1`; `M4`; `M5`; `M6`). Message text and order are unchanged: only cache markers move (`ADR 0007`).
- **Only routes with a measured result change.** Anthropic direct over OAuth, Anthropic direct over an API key, Anthropic models through OpenRouter, and Joel's attribution route once he relaxes his extension's guard for message-level points (`owner-rulings.md` Q1(a); `M5`). Bedrock, the other Anthropic-format gateways and Gemini keep byte-identical payloads, and their under-reporting is recorded (`owner-rulings.md` Q3(a); `M5`; `research-chidi`).
- **The net dollars charge the rewrite that actually happened.** The charge starts where the provider's rewrite started rather than at the recalling message, and recall's block is charged where the provider billed it, so the figure prices the turn as it was billed. It may still read negative, because it does not depend on the read/write split and the terms the fix does not touch remain (`M2`; `M9`; `owner-rulings.md` Q2(a)).
- **The README explains a real negative figure** and names `decisionThreshold` as the lever that shrinks the block (`owner-rulings.md` Q2(a)).
- **The standing record that is measured false is narrowed, not edited.** ADR 0007's consequence and `README.md`'s recall paragraph both say the provider rewrites the recalling turn once, from its user message; the measurement runs back to the system entry (`M1`; `michael-orientation.md` §1). An accepted record's body is never edited, so a new ADR narrows it (`AGENTS.md`).
- **`.envrc` is ignored by git** (`owner-rulings.md`, 2026-11-17). It is already on the branch (`1b773fe`), so this change keeps it rather than adding it.

Acceptance is the real read/write split measured in a live session, not the figure: the figure cannot move with the fix on its own (`M2`; `michael-orientation.md` §3, trap 1).

**Deliberately not in this change:**

- Cost-aware recall, any credit to recall, and any clamp on a negative figure (`owner-rulings.md` Q2(a); ADR 0008).
- Bedrock and the other gateways with no measured result — no credentials exist, and their behaviour stays as it is (`owner-rulings.md` Q3(a)).
- Recall's disclosure split, size bound, cache key, eligibility rule and fail-open notice; the classifier and its timeout; stubbing and settlement (`michael-orientation.md` §2).
- Any new config field, instrument or session entry type (`owner-rulings.md`, instruments: "I'd add no setting for this behaviour").
- Joel's `anthropic-attribution` extension, which lives outside this repository. His edit is a dependency for his route, not a deliverable here (`owner-rulings.md` Q1(a)).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `tail-recall`: a request carrying recall's block no longer costs the turn its cached prefix, on the routes with a measured result and no others; every other route keeps today's payload.
- `context-figures`: the rewrite the net dollars charge is the rewrite the provider performed, and why a figure can honestly read negative is documented beside it.
- `development-checks`: `.gitignore` also ignores `.envrc`.

## Impact

- **Payload path:** a new handler under `src/infra/pi-event-handlers/`, composed in `src/app/extension/taiknr.ts` and registered through the existing session gate; no existing registration changes (`research-eleanor`).
- **Figures:** the rewrite and block terms in `src/use-cases/instruments-publisher.ts` and the rule in `src/domain/savings-dollars.ts` (`research-eleanor`).
- **Tests:** under `tests/`, mirroring those layers. No live call is added to `npm run check`; the measured routes are verified by hand, because the session harness rewrites every response's usage (`AGENTS.md` Traps).
- **Documentation:** `README.md`'s recall and instruments sections, one new record in `docs/adr/`, and `.gitignore`.
- **Provider-facing behaviour:** on the covered routes a payload differs from today's in cache markers only; on every other route it is byte-identical. Requests stay on `context_with_system` and recall keeps writing nothing (`ADR 0007`).
- **Outside the repository:** Joel's `anthropic-attribution` extension must relax its topology guard for message-level points before his route is served like pi's own provider (`M3`; `owner-rulings.md` Q1(a)).
