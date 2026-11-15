# Design Review

Four fresh-context stages ran over `design.md` before `tasks.md`. Stage 1 read the design against the Zoom Out Standard. Stage 2 paraphrased it strictly doc-only. Stage 3 looped the critic and structural lenses for five rounds with Michael as Resolver. Stage 4 re-ran Zoom Out over the Stage 2-3 edits. The loop converged: Stage 3 rounds 4 and 5 were clean, and no item was escalated to Joel. Each finding below is reported as the lens that raised it made it, and each ruling as Michael's.

## Stage 1: Initial Zoom Out

Two lenses ran. The log records one finding and no major finding.

**`council-zoom-out`** (`design-review-s1-zoom-out.md`) recommended passing with one minor documentation cleanup, on the grounds that the design solves the package's missing behavior inside existing domain, use-case, infrastructure and wiring boundaries, reuses the current store and gate, and adds no production module, dependency or neighboring feature.

- **ZO-S1-1** (minor): Decision 4's surrogate-boundary cut mechanics drop below design altitude into helper implementation — boundary code-unit inspection, the max-minus-one adjustment and the exact normalization call. The single-line, well-formed UTF-16 output and length limits are design contracts; the algorithm belongs in tasks or implementation. The lens asked that the separator class, length units, limits, verbatim raw-text contract, well-formedness guarantee, shared helper ownership and M9 citation stay, with the recipe moved out and M9's settled behavior unchanged.

Stage 1 produced no major finding, so it has no resolution file and no item from it carries a disposition. Stage 2's CC-1 fix (`michael-resolve-s2.json`) later named the exported helper and its single-line recipe in Decision 4 — the same location this finding flagged.

The lens's verified assumptions: the existing archive seams and composition-root state holders suffice with no new production module or signature change; the Map-backed `InMemoryArchiveStore` already supplies ordered last-write-wins replacement, so hydration needs no separate deduplication; the composition-root gate already wraps all six non-start handlers, leaving `session_start` as the only archive handler needing an explicit active-session guard; no existing production single-line or truncation helper is available to reuse. It left one assumption unverified: Pi 1.5.2 lifecycle, persistence and rejection behavior as recorded by the research, which it did not execute.

**`council-catalyst`** (`design-review-s1-catalyst.md`) found no false compromise and raised no findings. It held that the design resolves its competing constraints through structural splits rather than weakened invariants: two-phase staging and settlement preserve intra-run context and prefix stability while carrying aborted turns forward; side-store-first draft ordering plus whole-branch `replaceAll` reconciliation absorb Pi's non-transactional boundary commits without speculative rollback; strict `originalContentByEntryId` eviction prevents multi-MB retention while respecting the locked handler signatures; and layering `SessionManager.inMemory` tests with one `fauxProvider` `AgentSession` test reaches runtime fidelity at unit-test speed. Its unverified assumptions were that mid-history `context_edit` replacements preserve hosted-provider prompt-cache prefixes before the edited entry, and that Pi's built-in tool-output truncation bounds individual `rawText` sizes until the archive-scaling card adds caps.

## Stage 2: Comprehension Test

`council-comprehension` read `design.md` alone (`design-review-s2-comprehension.md`) and paraphrased before critiquing.

**What this proposes (naive paraphrase):**

At each turn end, the extension stages sufficiently large tool-result text, then at run settlement writes the original text to a side-store batch and replaces eligible results with short stubs while retaining non-text content. Before writing, it excludes results that left the active branch or have already been targeted by a context edit. On session start, tree navigation, and compaction, it rebuilds its in-memory archive from valid side-store entries on the active branch; the feature remains inert when inactive.

**How the existing system works, per design.md:**

The document says the domain, use-case, adapter, and event-handler seams already exist, but their archiving bodies are missing; an in-memory archive store and session configuration setup already work. The extension already registers seven events and constructs the pending list and lookup maps, but only session start currently loads configuration. Pi keeps a raw active branch, applies boundary drafts after handlers return, and can discard a whole boundary when a draft fails.

The lens's own recommendation was to revise the design before implementation, and it raised seven findings:

- **CC-1** (blocking), Decisions 4 and 7 and Goals / Non-Goals: the document never gives the actual stub template or says how the stub is inserted into the replacement content array alongside preserved non-text blocks, so implementations could satisfy the prose while producing incompatible model-visible content.
- **CC-2** (major), Context, Decision 10 and Module & File Placement: the configuration and gating concepts behind inertness — the config holder, gated `pi`, `session.isActive()`, and the off versus rejected states — are named but their relationships and transitions are never explained.
- **CC-3** (major), Decisions 2 and 6: the candidate-to-entry pairing contract is silent on the unresolved cases — no matching projected entry, no positional fallback, a repeated `toolCallId` — and on missing argument summaries or original content.
- **CC-4** (major), Decisions 7, 8, 11 and Risks: the claim that same-boundary competing edits cannot be overwritten is not connected to any ordering or visibility guarantee for other handlers' drafts, so the promised author-independent protection cannot be verified by a reader.
- **CC-5** (major), Decisions 7 and 11: the failure and mutation sequence contradicts itself — Decision 7 prunes before building drafts and returns before draining the store, while Decision 11 says drafts are built before mutating state; taken literally the drain is unreachable, and it never says which changes survive a failure or how retries work.
- **CC-6** (minor), Decisions 4 and 5 and the `tool-call.test.ts` row: undefined tool input is handled ambiguously — the implementation instruction converts it to an empty string while the test description says it must not record junk without defining whether an empty summary is stored or the call skipped.
- **CC-7** (minor), Decision 11 observation surfaces: the silent-drop diagnostic requires a side-store entry omitting the dropped id, but settlement writes no side-store entry when every pending item is dropped, and absence of a `context_edit` alone distinguishes neither a drop from an unstaged result nor either from a failed boundary.

The lens flagged two unstated assumptions: that the document's description of existing Pi behavior and current code is accurate, and that the stub's exact format and mixed-content ordering are required implementation contracts rather than intentionally unconstrained choices. It declared `specs/`, research, rulings, source and tests unread by design.

All seven were resolved (`michael-resolve-s2.json`): CC-1 through CC-5 as `propose_fix`, CC-6 and CC-7 as `decline`, with CC-6 and CC-7 recorded as settled findings.

## Stage 3: Critic Review Loop

Five rounds of `council-critic` and `council-structural` ran against the Feature Spec Standard, with Michael resolving every finding as `propose_fix` or `decline`. No finding was contested or escalated.

| Round | Critic | Structural | Round status | Fixes ordered |
|---|---|---|---|---|
| 1 | 8 findings (1 major, 7 minor) | 4 findings (1 major, 3 minor) | `needs_fixes` | 2 |
| 2 | 1 finding (major) | 2 findings (minor) | `needs_fixes` | 1 |
| 3 | 2 findings (1 major, 1 minor) | 1 finding (minor) | `needs_fixes` | 1 |
| 4 | 2 findings (minor) | 0 findings | `clean` | 0 |
| 5 | 1 finding (minor) | 0 findings | `clean` | 0 |

**Convergence:** by two consecutive clean rounds, rounds 4 and 5, reached on the last round the five-round cap allows. Four fixes were applied to `design.md` across rounds 1-3; the remaining seventeen findings were declined and the loop stopped changing the design after round 3.

Round 1 (`design-review-s3-r1-critic.md`, `design-review-s3-r1-structural.md`):

- **CR-S3-1** (major, fixed): Decision 11's claim that any unexpected throw reaches Pi's extension error channel is false for `tool_call`. `emitToolCall` (runner.js:965-980) has no try/catch, `_beforeToolCall` (agent-session.js:386-399) rethrows, and `prepareToolCall` (agent-loop.js:496-544) turns the throw into an error tool result, so a `tool_call` throw blocks the user's tool instead of being reported. The summarizer must be total: bare `JSON.stringify(event.input)` also throws on `BigInt`, circular references and a throwing `toJSON`.
- **CR-S3-2** (minor): the positional fallback in Decision 2 is unreachable because `BoundaryState.context.contextEntries` is non-optional, and the alternatives never weigh length-checked position, which is exact when `toolResultEntryIds.length === toolResults.length`, against last-match `toolCallId`, which is not exact when a turn repeats a `toolCallId`.
- **CR-S3-3** (minor): Decision 7's stub-only fallback for missing original content permanently strips every non-text block on that branch to keep the code total, and the map is filled in the same runtime, so the fallback hides a bug and loses data no later event can restore.
- **CR-S3-4** (minor): Decision 12's abort → `/tree` → settle test never says where the abort happens. Pi gives a tool call cut off by an abort during preparation a short `createErrorToolResult("Operation aborted")` far below the threshold — the lens did not trace what an abort during execution persists — so an abort that leaves nothing staged lets the drop path's assertions pass vacuously.
- **CR-S3-5** (minor): the discarded-boundary risk is stated only as store-ahead-of-branch, leaving out that the drained items are never staged again and stay raw on that branch, and that the store can hold items whose stubs never landed.
- **CR-S3-6** (minor): the silent-drop recipe fails whenever every pending item is dropped, and in the JSONL a drop is indistinguishable from an output under the threshold, an item pending at an aborted run, a pairing skip, and a discarded boundary.
- **CR-S3-7** (minor): the placement table says `stageToolOutputs` appends to the pending list, which its locked `{ candidates, minCharsToArchive } → ArchivedToolOutput[]` signature cannot do, and neither the table nor Decision 6 says where `buildStub` is called or how the staged `item.id` is joined back to the candidate's `toolCallId`.
- **CR-S3-8** (minor): the design fixes `agent_before_settle`'s return value but never `turn_end`'s, and a returned `entries` array replaces the whole proposal list at that boundary, so `{ entries: [] }` would drop every earlier extension's turn_end drafts.
- **ST-S3-1** (major, fixed): no named test covers the mid-session re-enable paths — a session that started with `enabled: false`, was turned on with `setEnabled(true)`, and then navigates, compacts or settles — although the branch-hydration spec carries that scenario and adopted council finding R-12 assigned it to this pass, while the existing gate test never flips `enabled` back to true before dispatch.
- **ST-S3-2** (minor): the proposal's Impact bullet says "the four adapters the recall card owns" where the repository has three non-archive adapters and the proposal's own non-goals name exactly three.
- **ST-S3-3** (minor): the placement table's untouched census names every other production module but not the recall card's `src/domain/recall.ts` and `src/use-cases/recall-relevant-context.ts`, so the silence is ambiguous between deliberate exclusion and oversight.
- **ST-S3-4** (minor): the proposal restates the configuration default (`default 600, comparison >=`) whose canonical homes are the live configuration spec and D9, the same drift council amendment 7 removed from the archive-stubbing spec.

Round 2 (`design-review-s3-r2-critic.md`, `design-review-s3-r2-structural.md`):

- **CR-S3-R2-1** (major, fixed): the round-1 session-level `enabled` toggle cases cannot be written as specified. `taiknr(pi)` keeps `createSessionConfig()` in its closure, nothing in `src/` calls `setEnabled`, the `/taiknr` command is out of scope, and `taiknr.ts` stays unchanged, so a test loading the real extension has no handle to flip `enabled`; the off-at-start case would also read the developer's real `~/.pi/agent/pi-taiknr.json` without a throwaway agent directory.
- **structural-r2-ST-S3-5** (minor): the malformed-session-file risk bullet claims both deltas pin that the session starts, but only `specs/branch-hydration/spec.md` carries those scenarios.
- **structural-r2-ST-S3-6** (minor): the 36-character UUID entry-id scenario — the one that exists to prevent the id-slicing mistake — is the only archive-stubbing scenario with no named verification in the test table.

Round 3 (`design-review-s3-r3-critic.md`, `design-review-s3-r3-structural.md`):

- **CR-S3-R3-1** (major, fixed): the session-level test promises "compaction hydration" and, in the project-file off case, "the archive empty", and neither is observable through the composition root as described. The store is a closure local with no reader until the recall card implements `context.ts`, and `emit`/`emitBoundary` deliver throws, including `Invalid boundary entries`, only to listeners registered through `bindExtensions({ onError })` — the same call that fires `session_start`. Without it the assertions pass against `HEAD`'s empty `session_compact` handler.
- **CR-S3-R3-2** (minor): the inertness risk cites the handler-level toggle cases as pinning raw-`pi` wiring, but each builds its own `createGatedPi`, and a session that starts off writes no side-store entry, so hydrating its branch yields an empty store either way.
- **structural-r3-ST-S3-1** (minor): Decision 12's Trap 1 justification miscounts the existing `session-start.test.ts` cases — six resolve `enabled: true`, eight resolve ready — a number that entered the design from an unverified assumption in the orientation and that round 1 wrongly confirmed.

Round 4 (`design-review-s3-r4-critic.md`, `design-review-s3-r4-structural.md`), both declined:

- **CR-S3-R4-1** (minor): the design never says how `session.compact()` succeeds in a short faux-provider session; under the default `keepRecentTokens: 20000` `prepareCompaction` returns `undefined` and `compact()` throws "Nothing to compact (session too small)", so the case either fails for a Pi reason or asserts nothing about taiknr.
- **CR-S3-R4-2** (minor): the compaction store assertion now points at `session-compact.test.ts`, but that row names only the gated hydration and mid-session re-enable cases, so no test row names branch-hydration's "Outputs archived before a compaction stay in the archive" scenario and Joel's Q2 → (a) invariant has no named test that can fail.

Round 5 (`design-review-s3-r5-critic.md`, `design-review-s3-r5-structural.md`, no structural findings), declined:

- **CR-S3-R5-1** (minor): the design never records that Pi tests its compaction threshold on the raw projection mid-run (`_compactBeforeNextAssistantResponse`) and at agent end (`_checkCompaction`), both before `agent_before_settle`, so a run that crosses the threshold is compacted on its raw outputs first and any stub whose target moves before `firstKeptEntryId` is inert in the projection.

## Stage 4: Intermediate Zoom Out

`council-zoom-out` re-read the design after the Stage 2-3 edits (`design-review-s4-zoom-out.md`) and recommended proceeding to task breakdown, finding that Stages 2 and 3 added necessary failure handling and test coverage without introducing production layers, dependencies, signature changes or neighboring features. The log records one finding and no major finding.

- **ZO-S4-1** (minor): the expanded `archive-session.test.ts` test-table row now repeats Decision 12's harness recipe — `bindExtensions`/`onError`, temporary-directory isolation, persisted-entry versus private-store assertions, the no-prototype-spies constraint — so the row has become a second test-strategy section rather than a concise file-to-responsibility map. The lens asked that the row keep the session-level scenarios and a reference to Decision 12, with the shared harness stated once in Decision 12 and the executable setup sequence in `tasks.md`, and that no helper abstraction be added merely to shorten the document.

Stage 4 produced no major finding, so it has no resolution file and this finding carries no disposition.

The lens's verified assumptions: the existing production module set is sufficient; `InMemoryArchiveStore.replaceAll` already supplies whole replacement and ordered last-write-wins through `Map.set`; the composition root already supplies all archive state, registers non-start handlers through `createGatedPi`, and `SessionConfig` supplies the active-state predicate and in-memory toggle without changes; no existing production single-line or surrogate-safe truncation helper exists under `src`, so the shared pure helper fits the archived-output domain module. It left Pi lifecycle and boundary-persistence mechanics unverified, as recorded by the research and Michael's measured rulings.

## Michael's Resolutions

Michael resolved every Stage 2 and Stage 3 finding, using `propose_fix` for nine and `decline` for nineteen. None was contested and none escalated.

**Applied to `design.md` (9):**

| Finding | What the fix changed |
|---|---|
| CC-1 (blocking) | State the one-line stub format once and name the shared helper `summarizeSingleLine(text, maxUnits): string`; in Decision 7, specify each draft's replacement as `[{ type: 'text', text: item.stub }, ...nonTextBlocks]` with non-text blocks preserved in original relative order |
| CC-2 (major) | Add a short Context summary of `SessionConfig`'s unresolved → ready/rejected states, `setEnabled`, `session.isActive()`, and why `session_start` alone is registered on raw `pi` while the other six go through `createGatedPi`, citing the source and the configuration spec rather than restating requirements |
| CC-3 (major) | In Decision 2, state that an unpaired `toolResult` is skipped silently and that `argsSummary` defaults via `argsByCallId.get(...) ?? ''`; in Decisions 6 and 7, state the last-match join and the `?? []` default |
| CC-4 (major) | In Decision 8 and the competing-`context_edit` risk bullet, explain Pi's sequential load-order dispatch: earlier handlers' drafts are visible, later handlers' drafts are not, a later `context_edit` still wins in model context under latest-edit-wins, and a later handler that replaces `event.entries` without spreading drops taiknr's drafts |
| CC-5 (major) | Rewrite Decision 7's step sequence so all reads and draft construction precede every mutation and the return is last, and state the matching build-before-mutate boundary for the other handlers in Decision 11 |
| CR-S3-1 (major) | Wrap `JSON.stringify(event.input)` in a try/catch falling back to `""`; separate `tool_call` from the five error-channel handlers in Decision 11; widen the `tool-call.test.ts` row to `undefined`, `BigInt` and circular input |
| ST-S3-1 (major) | Name the mid-session re-enable case in the `session-tree`/`session-compact` rows and the `enabled` toggle boundary cases in the session-level row, and correct the inertness risk bullet to stop claiming the existing gate test covers re-enabling |
| CR-S3-R2-1 (major) | Isolate `PI_CODING_AGENT_DIR` and `cwd` per case in `archive-session.test.ts` and cover startup config-file `enabled: false` there; move the in-memory `setEnabled` toggle cases to the `turn-end` and `agent-before-settle` rows wired with `createSessionConfig()` and `createGatedPi`; state the isolation in Decision 12; re-point the inertness risk bullet |
| CR-S3-R3-1 (major) | Have every session-level case call `await session.bindExtensions({ onError })` and assert an empty error list; reword the off case's expectation to "writes no `taiknr-side-store` or `context_edit` entry"; clarify "compaction hydration"; and take the non-spy alternative — assert persisted `SessionManager` entries and projected context in `archive-session.test.ts`, store contents directly in the three hydration handler tests |

**Declined (19), by what Michael accepted instead:**

- Already answered by the settled rulings or the existing artifacts: CR-S3-2 (M7 chose last-match `toolCallId`; duplicate ids in one turn violate provider protocols), CR-S3-3 (`turn-end.test.ts` and `archive-session.test.ts` already fail the key-mismatch refactor, and `?? []` keeps isolated calls total), CR-S3-5 (M4 and the archive-stubbing spec's "A boundary Pi discards" already accept optimistic-cache divergence until the next hydration), CR-S3-7 (D7 locks the signature and Stage 5 verifies every signature against disk), CR-S3-8 (`turn_end` proposes no drafts, so `undefined` is implied), CC-6 (Decisions 4 and 5 already specify storing `''`), CC-7 and CR-S3-6 (M11 accepts that silent drops have no logger or counter before the Status card), structural-r2-ST-S3-5 ("both deltas" is wording drift in the Risks bullet only), structural-r2-ST-S3-6 and CR-S3-R4-2 (the scenario stays owned by the spec and is mapped in `tasks.md`), structural-r3-ST-S3-1 (the fixture-first ordering requirement is unchanged), CR-S3-R3-2 (composition-root wiring for the hydration handlers has no non-spy reader until the recall card wires `context.ts`).
- Task-level or docs-pass detail that belongs to a later artifact: CR-S3-4 (test mechanics for `tasks.md`), CR-S3-R4-1 (a low `keepRecentTokens` plus one queued summary is a Stage 5 fixture decision), CR-S3-R5-1 (the cost stays as a consequence of the two-phase ruling and lands in the docs pass and the archive-scaling card).
- Wording and count drifts in other artifacts: ST-S3-2 (the design already states the count at "the three non-archive adapters"), ST-S3-3 (the Non-Goals and the proposal already exclude the recall files explicitly), ST-S3-4 (the spec and the design already defer the default to the configuration spec).

## Settled Findings

The state file's `settled` list accumulates one snapshot per round; it holds twelve distinct settled findings, each closed as an accepted consequence, an accepted risk or an answered question rather than as a defect left open:

| Finding | Why it is closed |
|---|---|
| CC-6 | Decision 4 and Decision 5 already specify storing `''` for undefined top-level `tool_call` input, not the string `'undefined'`, and `''` versus absent yields an identical `argsSummary` at `turn_end` |
| CC-7 / CR-S3-6 | Accepted diagnostic limitation under M11: an all-dropped settlement writes no `taiknr-side-store` entry; counters and status belong to the Status card |
| CR-S3-2 | M7 settled last-match `toolCallId` pairing through `contextEntries` over positional indexing |
| CR-S3-3 | The `originalContentByEntryId` fallback to `[]` in `toSettlementDrafts` keeps isolated text-only calls total, while `turn-end.test.ts` and `archive-session.test.ts` pin image preservation |
| CR-S3-5 | M4 and `specs/archive-stubbing/spec.md` ("A boundary Pi discards") already accept optimistic-cache divergence until the next hydration event |
| structural-r2-ST-S3-5 | The malformed side-store skipping scenarios live in `specs/branch-hydration/spec.md`; the wording drift in the design's Risks bullet is non-blocking |
| structural-r2-ST-S3-6 | The 36-character UUID `entryId` scenario is owned by `specs/archive-stubbing/spec.md` and mapped in `tasks.md` during Stage 5 |
| critic-r3-CR-S3-R3-2 | Composition-root `gatedPi` wiring for the hydration handlers is only end-to-end readable without spies once the recall card wires `context.ts` (D5) |
| structural-r3-ST-S3-1 | `session-start.test.ts` has six `enabled: true` cases out of eight ready cases; the fixture-first ordering in Decision 12 stands |
| critic-r4-CR-S3-R4-1 | Low `keepRecentTokens` in `SettingsManager.inMemory` plus one queued `fauxAssistantMessage` summary belongs in `tasks.md` (Stage 5) rather than `design.md` |
| critic-r4-CR-S3-R4-2 | The pre-compaction side-store retention scenario in `specs/branch-hydration/spec.md` maps onto `session-compact.test.ts` in `tasks.md` (Stage 5) |
| critic-r5-CR-S3-R5-1 | Accepted consequence of two-phase staging and settlement (Q1 → a versus d): intra-run and pre-settle threshold compaction evaluates raw outputs before `agent_before_settle`, while the side-store still preserves recallability (Q2 → a) |

## Owner Decisions Required

None. No finding in any stage was escalated to Joel, and Michael resolved every Stage 2 and Stage 3 finding himself. The two findings outside a resolver pass — ZO-S1-1 from Stage 1 and ZO-S4-1 from Stage 4 — were both minor, and neither withholds anything `tasks.md` needs.
