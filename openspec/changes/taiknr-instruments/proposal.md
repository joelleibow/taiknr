# Proposal

## Why

Joel wants to watch taiknr work: the tokens and stubs in the archive, when the classifier is deciding, and what stubbing saves. Nothing shows any of it today (`research-eleanor` §6), and the one figure that is visible misleads. After every settlement pi's own context figure sits 38–41 % below the next request's real prompt (M1), because a `context_edit` newer than the last usage makes pi estimate the whole projection at characters ÷ 4 until the next response (T1; `research-chidi` B7). That is the roughly 40 % jump after sending a message this change answers.

pi-jefferson 0.14.0 publishes a provider contract through which an extension registers instruments and posts field updates (`research-chidi` A1). taiknr can therefore publish its own figures, and its own resolution of the jump, without changing Jefferson or pi (J3; J4).

## What Changes

- **Four instruments, registered with Jefferson.** `taiknr.context`, `taiknr.archive`, `taiknr.savings` and `taiknr.recall`, registered from taiknr's `session_start` publishing registrar with no `await` before the registration and kept current from taiknr's own handlers (J14; T11; `research-chidi` A1; ruling 6).
- **Six figures, each published as its own value:** history before, withheld, stubbed, context in turn, total context and recalled — recalled overlapping context in turn rather than being a bucket taken out of it (J9; S8; ruling 1).
- **A calibrated token conversion.** One ratio per model pair, taken from the provider's own usage for that model, turns taiknr's character estimate into a token figure; a model with no ratio of its own borrows the ratio of the model measured most recently, and the estimate flag rides beside the value and says so until its own first valid reply; a resumed session seeds the ratio from persisted usage and the flag stays on until a live sample calibrates it (S1; J10; J11; ruling 4; owner-rulings.md 2026-11-17).
- **Savings, per request and since start, in tokens and dollars.** Tokens as the estimate of history before minus the estimate of context in turn, one k throughout, published together with the dollars at the response; dollars net of every cache rewrite taiknr causes and of recall's classifier spend; the since-start total labelled *tokens not sent since start*; every figure signed, and the running total may go negative (J12; S3; S4; Q1(a); Q2(a); T19; ruling 2; ruling 3).
- **A decision-in-flight indicator** carrying how many archived items the classifier is asking about, with no elapsed-time updates (J13).
- **A bar on the context instrument**, reading context in turn, the request the provider bills, ÷ the model's window on Jefferson's 0–100 scale, which a user's format may name; placement, format, label and style stay ordinary Jefferson configuration (J5; J7; S2; Q5(a)).
- **One new setting:** a boolean switch, on by default, that enables or disables the instruments. The existing `enabled` keeps stopping everything (J8; J15).
- **A development dependency.** `pi-jefferson` joins `devDependencies` with its lockfile change, imported only with `import type`, which `"verbatimModuleSyntax": true` in `tsconfig.json` enforces at compile time and the `git archive` load check backstops at runtime (S7; M5; T13; ruling 17).

### What this change deliberately does not do

- Fix pi's measurement or calculation upstream, or change anything in Jefferson, its repository or its built-in `context` instrument (J3; J4).
- Move recall's size bound onto the calibrated conversion. Recall keeps pi's estimate, and the correction is its own card (Q4(a); T17).
- Persist the session's savings total. It lives in memory and resets at each session start (Q1(a)).
- Write `~/.pi/agent/pi-jefferson.json` or `~/.pi/agent/settings.json`. Joel adds the `taiknr.*` rows himself from a README example (Q5(a)).
- Add a `/taiknr` command, the deferred status readout, or a spend readout of its own; recall's classifier spend appears inside the net dollar figure instead (J15; Q2(a)).
- Make any model or classifier call of its own. The figures come from usage pi already persisted and from what each response reports (S1; T22).

## Capabilities

### New Capabilities

- `context-figures`: what each of the six figures means, the calibrated conversion behind every token figure, the savings arithmetic per request and since start in tokens and dollars, and how the conversion and the dollars are tested.
- `jefferson-instruments`: how taiknr registers and keeps its four instruments current on pi-jefferson's published contract, and what it does when Jefferson is absent, when publishing throws, and when taiknr is off.

### Modified Capabilities

- `configuration`: one new field — a boolean switch, on by default — that enables or disables the instruments, with its validation, its one reader and its README row.
- `extension-packaging`: the registered event list gains the six publishing events, the permitted contract differences gain the four publishing additions as a closed list, the import boundary extends to Jefferson's contract, and `pi-jefferson` is declared as a type-only development dependency.
- `tail-recall`: the classifier call's start, end and item count become observable to the instruments, with recall's returns, budget, cache key and eligibility unchanged.

## Impact

- **Code.** Figure arithmetic in `src/domain/` and `src/use-cases/`, per ADR 0001. pi usage, the persisted projection, the Jefferson bus and its types in `src/infra/` adapters and handlers. The switch in `src/config/`; its one reader is the `session_start` publishing registrar, reached through a per-session holder built in `taiknr.ts`, and `handler-gate.ts`, `SessionConfig` and `isActive()` are unchanged (ruling 6). The publishing registrars sit beside the seven existing handlers in `src/infra/pi-event-handlers/`, one file per event, for the six events `extension-packaging` fixes (ruling 9).
- **Contracts.** The registration list in `tests/app/extension/taiknr.test.ts` and the `extension-packaging` scenarios that fix it grow together, to every registration with duplicates kept (O1; ruling 10). The classifier is observed at the scorer adapter, so no port changes: the permitted differences are the four additions `extension-packaging` lists (ruling 7; ruling 8).
- **Dependencies.** `package.json` and the committed `package-lock.json` gain `pi-jefferson` and the packages it brings, in `devDependencies` only (M5; S7).
- **Behaviour.** Stubbing, settlement, hydration and recall are unchanged; the archive figures read the store, which is an optimistic cache (`branch-hydration` spec; T15). Recall's budget stays on pi's estimate (Q4(a)).
- **Documentation.** `README.md` gains the field row, the example instrument rows and the explanation of what stubbing does to pi's measurement and calculation, and of what the context figure resolves and what it does not (J6; Q5(a); O8; ruling 21). The project's own architecture and instruction files are brought in line in the docs pass after approval.
- **Untouched.** Jefferson's repository, `~/.pi/agent/settings.json`, `~/.pi/agent/pi-jefferson.json`, and every file outside this repository (J4; Q5(a); `extension-packaging` spec).
- **Acceptance.** Joel's own look at the instruments in his pi is the only check that Jefferson accepts the registration and each update (J2; T10).
