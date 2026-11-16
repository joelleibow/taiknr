# Design Review

Four stages ran against `design.md` before `tasks.md` is drafted. Michael resolved each stage's findings as the retained Oracle; Joel ruled on the one item Michael escalated. The stage reports, Michael's resolution records and `owner-rulings.md` are in this change directory and are the evidence for everything below.

## Stage 1: Initial Zoom Out

**Outcome:** Pass with one minor altitude cleanup.

`council-zoom-out` (`design-review-s1-zoom-out.md`, `.json`) passed the design, raising one finding:

- **ZO-S1-1** (minor) — `design.md` Decisions 6 and 9 (then L171, L240) drop from architectural statement into implementation mechanics: Decision 6 carries timing statements about when the classifier call resolves, and Decision 9 spells out the prefix-growth loop. The recommended cleanup was to keep each decision's architectural conclusion and move the mechanics to the tasks that implement them.

No blocking or major finding. `council-catalyst` (`design-review-s1-catalyst.md`) found no false compromise: "No false compromise detected. Proceed," with no findings and no owner questions.

No `michael-resolve-s1.json` or `michael-resolve-s1-zoom-out.json` exists in the change directory, so ZO-S1-1 has no recorded resolution. The text it named was rewritten by the Stage 3 rounds that touched the same two decisions (critic-r1-CRIT-2 and CRIT-3 on Decision 6's notice and marker guard, critic-r2-CRIT-R2-2 on the live script's setup check, critic-r6-CRIT-R6-1 and its companion wording change on Decision 2's measurements and the Risks row), so this document treats ZO-S1-1 as carried into those rounds rather than separately resolved. It is not reopened.

## Stage 2: Comprehension Test

**Outcome:** Revise the design. `council-comprehension` (`design-review-s2-comprehension.md`, `.json`) read `design.md` alone and paraphrased it before judging it.

**What this proposes (naive paraphrase):**

The design adds request-time recall: it identifies the latest user prompt, scores eligible archived tool outputs with a bounded classifier call, and appends fitting full outputs to that user message. It caches the selected IDs per prompt and store size, rechecks branch eligibility on every request, warns once per session on classifier failures, and adds a configurable timeout. It also specifies offline tests, a live-provider-payload check, and documentation updates.

**How the existing system works, per design.md:**

According to the document, taiknr already archives tool outputs and replaces their conversation content with stubs, but the recall path is unimplemented. A session-scoped cache and existing ports and adapters provide seams for recall, while a composition-root gate prevents most handlers from running when taiknr is off. Pi supplies the context events, branch entries, classifier, settings and model limits that the proposed implementation will use.

**Findings:**

- **COMP-1** (major) — the proposal's own store reads and mapping were never named. The document deferred the Module & File Placement rows marked "C or M" to disk instead of settling them, so a reader could not tell which files the change creates and which it modifies. Michael's resolution (`michael-resolve-s2.json`) is a `propose_fix` against `design.md`, and it calls the gap a real comprehension failure rather than a wording problem. The fix settled the placement table.
- **COMP-4** — evidence only, not a change request. Its measured evidence on `.mjs` load order was cited later by the structural lens in round 1 (structural-r1-STR-1).
- The comprehension report's remaining findings were minor, and this synthesis records only the dispositions above; the per-finding detail beyond COMP-1 and COMP-4 lives in `design-review-s2-comprehension.md` and `michael-resolve-s2.json`, which record `round_status: needs_fixes`.

## Stage 3: Critic Review Loop

**Outcome:** Closed at the cap on round 8's single clean round, accepted by Joel. This was **not** two consecutive clean rounds. Round 5 was clean; rounds 6, 7 and 8 then raised or reopened findings, and round 8 was the one clean round at the end of the run's 8-round cap. Joel ruled "b" to close Stage 3 on that result (`owner-rulings.md`).

Each round ran `council-critic` and `council-structural`; Michael's resolution for each round is `michael-resolve-s3-r<1..8>.json`.

| Round | Critic | Structural | Michael |
|---|---|---|---|
| 1 | Revise before tasks | Verified the assumptions; two minor findings | `propose_fix` (CRIT-1); one contested, one declined |
| 2 | Approve after two minor wording fixes | Approve; one minor cross-reference finding | `propose_fix` (CRIT-R2-1) |
| 3 | Approve; one optional minor wording fix | Verified | `propose_fix` (CRIT-R3-1) |
| 4 | Approve; one optional minor wording fix | Verified | `propose_fix` (CRIT-R4-1) |
| 5 | Approve, no findings | Verified | `clean` |
| 6 | Approve after one minor wording fix | Verified | `contest` (CRIT-R6-1) plus a required wording change |
| 7 | Approve after two wording fixes | Verified | `propose_fix` (CRIT-R7-1) |
| 8 | Approve; no new findings | Verified all assumptions | `clean` |

**Round 1.** The critic's blocking finding was **critic-r1-CRIT-1**: the block recall appends to the request carries no persisted conversation, so it can push pi's own token estimate over the compaction threshold at its next check, and a request-only block therefore triggers a persisted compaction. Michael escalated it to Joel rather than resolving it (see Owner Decisions Required). The critic's two minor findings were **critic-r1-CRIT-2** (the per-session notice can name the wrong field) and **critic-r1-CRIT-3** (the marker guard's description overstated what it prevents). The structural lens verified the assumptions and raised **structural-r1-STR-1** (minor; the lone `.mjs` live script's load order relative to `additionalExtensionPaths`, contested) and **structural-r1-STR-2** (minor; the hanging-fetch stub and the test provider registration need one named home in `tasks.md`, declined at Stage 3 because Stage 5 holds `tasks.md`).

**Round 2.** **critic-r2-CRIT-R2-1** (the Risks row overstated how often the compaction case fires and omitted the 40,960-token models) and **critic-r2-CRIT-R2-2** (the live script's setup check always exits 2, so the check could never pass) were both fixed. The structural lens approved and raised one minor finding, **structural-r2-STR-1**: the extension-packaging delta's "Load check passes" scenario carries "(design.md Decision 6)" verbatim from the living spec, where it refers to the packaging change's design document, but read inside this change it resolves to this change's decision 6, the classifier-call protocol. The lens recommended qualifying or dropping the parenthetical. No `propose_fix` for it appears in `michael-resolve-s3-r2.json`.

**Round 3.** **critic-r3-CRIT-R3-1** (minor, optional): `reserveTokens` is not a lever on the exposure and cannot shrink it. Michael issued a `propose_fix`; the structural lens verified.

**Round 4.** **critic-r4-CRIT-R4-1** (minor, optional): "No setting removes the case" was false, because pi's `compaction.enabled: false` removes it, at the cost of all of pi's automatic compaction. Michael issued a `propose_fix`; the structural lens verified.

**Round 5.** The critic approved with no findings and the structural lens verified. Michael's resolution records `round_status: clean` with no resolutions and lists the settled findings.

**Round 6.** **critic-r6-CRIT-R6-1** (minor): the post-compaction cache-hit drop leaves the block out for the rest of the turn, and the Risks row's closing sentence implied the opposite. Michael's disposition was `contest` — the design's mechanism was already correct as written — and the resolution also carries a required wording change (`michael-s3-r6-M1`) applied to Decision 2's "The measured case" and the Risks row's 40,960-token bullet. The structural lens verified.

**Round 7.** **critic-r7-CRIT-R7-1** (major): the 40,960-token bullet's premise was understated and needed the step size. **critic-r7-CRIT-R7-2** (minor): the `keepRecentTokens` qualifier's placement and attribution. Michael issued a `propose_fix` for CRIT-R7-1. The structural lens approved with no findings and confirmed `michael-s3-r6-M1` applied in full and coherently.

**Round 8.** The critic approved with no new findings and the structural lens verified all assumptions and all earlier conditions. Michael's resolution records `round_status: clean` with no resolutions; its settled list closes critic-r6-CRIT-R6-1 as "reopened in round 7 and closed by critic-r7-CRIT-R7-1."

## Stage 4: Intermediate Zoom Out

**Outcome:** Pass with one minor documentation cleanup.

`council-zoom-out` (`design-review-s4-zoom-out.md`, `.json`) audited the edits Stages 2 and 3 made and found no bloat and no altitude drop: the fixes added the evidence the findings asked for without pushing architectural statements back down into mechanics.

It raised one finding, **ZO-S4-1** (minor): Decision 2's experimental inventory (then `design.md` L126–142, with the decision's measured case at L134–142) overwhelms the architectural conclusion it supports. The recommendation was evidence placement only — keep the conclusion in the decision and let the measurements stand as the evidence behind it. No `michael-resolve-s4.json` or `michael-resolve-s4-zoom-out.json` exists in the change directory, and Stage 4 resolves only blocking or major findings, so ZO-S4-1 stands as a declined minor finding. Nothing in Stage 4 required a change to `design.md`.

## Michael's Resolutions

Michael resolved each stage's findings through `michael-resolver.schema.json` (`propose_fix` | `contest` | `escalate` | `decline`).

- **`propose_fix`, applied to `design.md`:** COMP-1 (Stage 2, Module & File Placement rows); critic-r1-CRIT-1's resolution, issued after Joel's ruling; critic-r2-CRIT-R2-1; critic-r3-CRIT-R3-1; critic-r4-CRIT-R4-1; critic-r7-CRIT-R7-1; plus the round-6 required wording change `michael-s3-r6-M1`.
- **`escalate`:** critic-r1-CRIT-1's compaction consequence went to Joel before `design-review` closed. His ruling is recorded in Owner Decisions Required.
- **`contest`:** critic-r6-CRIT-R6-1, on the ground that the design's mechanism was already correct as written; the companion wording change was still applied.
- **`decline`:** the minor findings Michael did not require a change for — critic-r1-CRIT-2 and CRIT-3 at their round's disposition, and ZO-S4-1 by the Stage 4 rule that only blocking or major findings are resolved. structural-r1-STR-2 is deferred to Stage 5 rather than declined on the merits, because `tasks.md` does not exist yet.
- **`clean`:** rounds 5 and 8, each with no resolutions and a settled-findings list.

## Settled Findings

Each entry is closed and not reopened unless a later round says so. The live list is in `.pi/marbleization/classifier-scoring-and-tail-recall/design-review-state.json`.

- **critic-r1-CRIT-1** — recall's request-only block can make pi's next check compact. Joel ruled "A": accept and document. The size bound stays as designed, with no headroom and no `session_before_compact` handler. Accepted and documented in Decision 2.
- **critic-r1-CRIT-2** (minor) — declined; the notice's field naming was not changed.
- **critic-r1-CRIT-3** (minor) — declined; the marker guard's description was not rewritten. The role move of T13 to Joel at PL2 sits under ruling 11.
- **structural-r1-STR-1** (minor) — contested: the lone `.mjs` loads before `extensionFactories`, so the design's load-order claim holds.
- **structural-r1-STR-2** (minor) — declined at Stage 3; the one-home naming for the hanging-fetch stub and the test provider registration belongs to `tasks.md`, which Stage 5 holds.
- **structural-r2-STR-1** (minor) — raised and not carried as a required change; the extension-packaging delta's "(design.md Decision 6)" citation remains as the living spec restates it.
- **critic-r2-CRIT-R2-1** — fixed in the Risks row.
- **critic-r2-CRIT-R2-2** — fixed in the live script's setup check.
- **critic-r6-CRIT-R6-1** — contested in round 6, reopened in round 7 and closed by critic-r7-CRIT-R7-1.
- **ZO-S1-1** (minor) — no resolution record; carried into the Stage 3 rounds that rewrote Decisions 6 and 9.
- **ZO-S4-1** (minor) — declined; evidence placement in Decision 2, no change made.

## Owner Decisions Required

Both of Joel's decisions are ruled and recorded in `owner-rulings.md`; neither is open.

- **The compaction consequence — ruled "A"** (2026-11-15). Michael escalated critic-r1-CRIT-1 rather than deciding it. Joel ruled "A": accept the consequence and document it. The size bound stays as designed, with no headroom and no `session_before_compact` handler; recall may therefore make pi's next check compact. The design documents the case in Decision 2 and carries short forms in the spec, the proposal, the Risks row and the README hand-off. See `owner-rulings.md` (the compaction ruling).
- **Closing Stage 3 at the cap — ruled "b"** (2026-11-15). Joel ruled "b" to close Stage 3 on round 8's clean result rather than run another round. See `owner-rulings.md` (the Stage 3 closure ruling).

The request's own scope exclusion also stands: pi's context-usage undercount after `context_edit` is out of scope for this change, per `owner-rulings.md`.
