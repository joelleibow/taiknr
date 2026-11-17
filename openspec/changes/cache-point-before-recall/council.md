# Council — cache-point-before-recall

Seven lens reports sit behind this file: zoom-out, comprehension, catalyst, critic, codebase,
readiness and structural, with their shared evidence in `michael-orientation.md` (M1–M9). Michael
ruled on every open item; his rulings are in `michael-council-rulings.json` and repeated here in his
own words. Joel had already ruled on the attribution route, the figure and the routes
(`owner-rulings.md` Q1(a), Q2(a), Q3(a)), so nothing was escalated to him from this stage.

**Verdict: proceed to design.** Every blocker the lenses raised is settled by a ruling below. Three
of them were settled by measuring the strategy rather than by argument: the marker allowance (N3–N8),
the carve-out on a four-point payload (N6), and thread continuation (N1, N2, N4). The probe round is
in `.pi/marbleization/cache-point-before-recall/michael/`; `probe2.ts` appends the block at
`context_with_system` the way taiknr's adapter does, and edits markers at `before_provider_request`.

## What all seven lenses agreed on

- The mechanism is measured, not inferred: pi marks the last block of the last message, recall
  appends its block after that mark, and every entry written during a recalling turn becomes
  unusable to the next turn (M1; `research-chidi` verdict 1).
- A point before recall's block alone does not fix a long turn. The carry point, one request later,
  is what closes it (M4, M5).
- The figure cannot move on the split alone, so a plan that counts a better number as acceptance
  fails; acceptance is the read/write split in a live session (M2, M9).
- The covered-route scope Joel set is kept, and every other route gets a byte-identical payload.
- The payload handler needs a route predicate the event does not carry, and a state home that does
  not depend on the instruments switch.
- `context_with_system` stays the event recall attaches to, and nothing registers `context`
  (ADR 0007).

## The seven lenses

Each row is the finding as that lens made it. Severity is the lens's own.

### Zoom-out (`council-zoom-out.md`)

Recommendation: proceed with the measured cache-marker fix, not a new caching subsystem; keep payload
translation in infra, pricing in domain, one shared request-history owner in use cases.

| Id | Severity | Finding | What became of it |
|---|---|---|---|
| ZO-1 | blocking | "Keep every cache marker already on it" leaves no slot on pi's own OAuth route, where all four points are used; the one measured strategy moved system and tools markers | Settled by the marker allowance and the carve-out (below): message-level markers only, an enumerated allowance, a 4-point budget, and one constant system[0] omission |
| ZO-2 | major | "Nothing recalled → byte-identical" forbids the carry on the very request that needs it | Settled: byte-identical is scoped to a request that carries no block and whose previous request carried none, on a 3-point route |
| ZO-3 | major | "The split alone changes no figure" turns M2 into an acceptance invariant | Kept, reworded as a property of the chosen rule; the rule moves through where the charge starts, not through the split |
| ZO-4 | major | The living block-pricing rule stays authoritative beside the delta's new one | Settled: the delta now MODIFIES that living requirement, and the block has one rule |
| ZO-5 | major | The only existing carrier history belongs to an optional publisher; cache correctness must not depend on publishing being on | Settled: two facts, two homes, neither behind the switch |
| ZO-6 | minor | The provider-read guarantee is unconditional where no entry can exist | Settled: the payload shape is the guarantee; reads and writes are conditional |

### Comprehension (`council-comprehension.md`)

| Id | Severity | Finding | What became of it |
|---|---|---|---|
| CC-1 | blocking | Every marker kept, system and tools fixed, four points, and new boundaries on a four-point payload cannot all hold | Same settlement as ZO-1 |
| CC-2 | major | The no-recall promise conflicts with the carry point | Same settlement as ZO-2 |
| CC-3 | major | The text promises a prefix hit and a write split without the conditions that make them possible | Settled by the read guarantees |
| CC-4 | blocking | The figure is asked to charge the exact rewrite, ignore the split and omit cold rewrites at once, and the living block rule still contradicts it | Settled: the charge is an estimate that starts after the carrier's own content on a request the edit reached, today's rule on every other, and the living block rule is modified |
| CC-5 | major | Block identification is undefined; the text marker can be pasted and can be altered by surrogate sanitizing | Settled: a request-scoped cell plus an exact match on the block after pi's surrogate rule, with no prefix match |
| CC-6 | major | The plan does not say how to recognise a covered route, order Joel's guard edit, or reproduce acceptance without spending model usage | Settled: one predicate, a Migration Plan, and named owners for each live run |

### Catalyst (`council-catalyst.md`)

| Id | Severity | Finding | What became of it |
|---|---|---|---|
| CAT-1 | blocking | Preserving markers, the two message boundaries and the four-point cap cannot all hold on ordinary OAuth; the measured workaround toggles tools | Settled by the carve-out: system[0]'s marker goes on every request of an active session, tools stay, and the two message slots are free |
| CAT-2 | major | Fragile text discovery and a provider-visible identifier are both avoidable with an out-of-band record | Settled: the carrier record is out of band, rewritten from every payload, with no identifier in the prompt |
| CAT-3 | major | The figures contract mixes observed billing with a split-blind invariant and treats a zero-read response as no rewrite | Settled: the estimate rule keeps the warm gate, and the zero-read case is recorded as under-reporting rather than charged |

### Critic (`council-critic.md`)

Recommendation: fix the specs' three blocking problems before design; probe thread continuation; drop
or reword the split scenario.

| Id | Severity | Finding | What became of it |
|---|---|---|---|
| CR-1 | blocking | Keep-every-marker, four points and stable system/tools cannot hold together; M5's cited OAuth numbers came from a tools toggle the spec forbids | Settled by the marker allowance and the carve-out; the spec no longer cites M5's OAuth numbers and cites N6 instead |
| CR-2 | blocking | pi continues message threads, so the before-point never reaches the wire after a turn's first request, and M6 is unmeasured on pi's routes | Refuted by measurement: continuation is real but confined to models whose response id equals the requested id; the feared loss does not happen (N1, N2, N4) |
| CR-3 | blocking | taiknr cannot tell Joel's route from pi's own, and his guard still throws on system, tools and content conversion | Settled: taiknr never does anything his guard forbids; his edit has already landed |
| CR-4 | major | The publisher's baseline cannot be the shared home: it is a no-op with the switch off, and its index is in context coordinates | Settled by the two homes, with payload coordinates in the handler's own record |
| CR-5 | major | Cache-warmer replays and retries could consume a per-request flag | Settled: the handler is a function of the payload and two facts, so a replay is idempotent |
| CR-6 | major | The split scenario makes today's defect a requirement and forecloses a measured rule | Kept, reworded; the measured rule was weighed and declined for simplicity |
| CR-7 | major | "Nothing recalled", "the recalling request reads its prefix" and "writes only from the block onward" are all wrong or misfiled | Settled: the scope is narrowed, M1's numbers move to the next-turn scenario, and the false claim is gone |
| CR-8 | major | Moving pi's point changes the block's billing, and nothing says how the publisher learns what was applied | Settled: the applied result is derived from the finished payload and reaches the publisher as a deferred reading |
| CR-9 | minor | "16×" is the ratio of the rewrite term, not of taiknr's whole cost; M2 does not support it | Accepted: the proposal says the rewrite charge is 16× low and drops M2 |
| CR-10 | minor | The route gate is undefined and a provider id alone admits unmeasured routes | Settled by the predicate |
| CR-11 | minor | Whether the carry should target fresh settlement stubs | Settled: recall's block only; the stub class is a follow-up card in the design |
| CR-12 | minor | Operators cannot tell a declined edit from an ineffective one, and a later extension can still reach five points | Settled: triage is the session JSONL plus `probe2.ts`, and the five-point risk is recorded in the design |

### Codebase (`council-codebase.md`)

| Id | Severity | Finding | What became of it |
|---|---|---|---|
| C1 | blocking | The publisher's baseline is behind the instruments switch and never exposes the current request's block | Settled: cell (a) is written by the context handler beside `recallCache` and does not depend on the switch |
| C2 | blocking | The payload carries no id or timestamp, and pi reshapes the message array, so neither position is locatable as planned | Settled: payload coordinates plus a fingerprint, validated before each carry |
| C3 | blocking | "Keep every marker" forbids the only measured OAuth strategy | Same settlement as ZO-1 |
| C4 | blocking | Keeping the warm gate leaves the under-charge M9 names | Declined: the warm gate stays, because the living spec already rules a cold expiry is not taiknr's charge, and C4's gate would charge an idle gap; the case is recorded instead |
| C5 | major | A continued thread sends only the messages after the prefix, so a point on an earlier message never reaches the wire | Refuted by measurement (N1, N2, N4): the first request after the block leaves is a create and carries the carry |
| C6 | major | Every Anthropic-format gateway produces the same payload shape, so the routes cannot be separated | Settled by the predicate, which is table-tested |
| C7 | major | A measured charge is cheaper than today's estimate and needs no new data | Weighed and declined: it needs a counterfactual new tail and a TTL discriminator, and "keep it simple, make it reliable" governs |
| C8 | major | Three delta requirements are satisfiable only by Markdown, and two of their claims already hold | Accepted: README.md:40 and :112 are the targets, and README.md:67 already names the lever |
| C9 | major | The file boundary misses the composition test and ARCHITECTURE.md's registration count | Accepted: `tests/app/extension/taiknr.test.ts`, `context.ts`, ARCHITECTURE.md and AGENTS.md are named in the design |
| C10 | major | Every failure path is silent, so a maintainer cannot tell whether the edit fired | Settled: triage is per-request `cacheRead`/`cacheWrite` in the session JSONL plus `probe2.ts`; no new log, notice or field |
| C11 | minor | Two citations drifted: `.envrc` is `.gitignore:12`, and the `recall-relevant-context.ts` citation is the cache-hit branch | Accepted for the line number; Michael's `:66-72` citation stands |

### Readiness (`council-readiness.md`)

Recommendation: not ready to design; resolve with one probe round of the chosen strategy, a Migration
Plan, and the spec edits listed.

| Id | Severity | Finding | What became of it |
|---|---|---|---|
| R1 | blocking | No ordering between Joel's guard relaxation and the taiknr merge or rollback | Settled: the Migration Plan states the order — his guard edit first (already landed), taiknr after, his acceptance session last, and rollback in reverse |
| R2 | blocking | The measured strategy toggles tools, which Q1(a) and the spec forbid, and the strategy the spec needs was unmeasured | Settled and then measured: the carve-out plus two message points is N3–N8, and no N run touched tools |
| R3 | major | The route predicate is undefined and the event carries only the payload | Settled by the predicate, which reads `ctx.model` |
| R4 | major | The shared home cannot be the baseline, for the switch and the coordinate system | Same settlement as C1 and C2 |
| R5 | major | The dollar delta overclaims, leaves a living SHALL contradicting it, and defers two terms to the design | Settled: weaker, true wording; the living rule is modified; the terms are stated |
| R6 | major | Billing scenarios are probe numbers no test proves, with no live check or owner named | Settled: payload-shape tests are automated; billing is proven at Validate by a named live run per route |
| R7 | major | The spec's SHALLs conflict with the strategy and are silent when no slot is free | Settled by the allowance, the budget rule and the no-slot rule |
| R8 | major | The strategy the design must pick was never run, against Joel's "settle unknowns by probing" | Settled: the probe round ran this pass (N2–N8) |
| R9 | major | Block identification and arming are undefined | Settled: an exact match on the recalled block, no prefix match, and a no-op otherwise |
| R10 | minor | The next-turn point should not also target settlement stubs | Accepted: recall's block only |
| R11 | minor | Boundary cases and the file boundary are unnamed | Accepted: named in the design's Module & File Placement and boundary table |
| R12 | minor | Documentation scenarios have no named proof, and the `cites` drift | Accepted: the docs pass proves them; `.gitignore:12`; ADR 0009 |
| R13 | minor | Fail-open covers a throw and an unreadable shape, not a pi version drift, and the boundary's error shape is unstated | Accepted: the handler returns `undefined` for no edit and never throws; `applied` is derived from the finished clone |

### Structural (`council-structural.md`)

| Id | Severity | Finding | What became of it |
|---|---|---|---|
| STRUCT-1 | blocking | The delta leaves the living "A saving is priced at the rates…" requirement untouched, so one spec carries two block pricings | Settled: that requirement is MODIFIED by this change, and the block has one home |
| STRUCT-2 | major | "The rewrite charged SHALL be the one the provider performed" commits the rule to an unobservable start position | Settled: the estimate starts at the position of taiknr's own change |
| STRUCT-3 | major | The under-reporting Q3(a) promises has no home in any requirement | Settled: README's instruments section, with one scenario pointing there |
| STRUCT-4 | major | Every scenario presupposes "the message that carries the block" and nothing fixes how it is found | Settled: the cell plus the carrier record, validated by fingerprint |
| STRUCT-5 | minor | The route enumeration is not the predicate the handler needs, so it would be transcribed three times | Settled: one predicate module, cited by the enumeration, the tests and the README |

## Michael's rulings

Each is his answer to a dispute the lenses raised. They are settled; none is Joel's. They are numbered
in the order `michael-council-rulings.json` lists them, so each one's bolded lead-in is its handle.
The specs and `design.md` cite them by that short topic name.

1. **Which existing markers the edit may change.** Message-level markers only, under an enumerated
   allowance. Taiknr wants at most two points: a **carry** on the last block of the carrier message on
   the first request after the previous request's carrier lost its block, and a **before** point on
   the block just before recall's block on every request that carries a block. Both are deep copies of
   pi's own message marker object, `ttl` included. **Budget:** start from 4 and subtract every marker
   except pi's last-message marker. If the wanted points exceed the budget, the payload goes out
   unchanged; if there is room for one more, pi's marker stays; otherwise it is removed, and it is the
   only existing marker taiknr may remove. If pi placed no message marker, nothing is edited. The spec
   stops citing M5's tools-toggling numbers and cites N3–N8. *Decided by N3–N8, `research-chidi` #2
   (a fifth point is a 400) and `research-attribution-guard.md` (copy pi's marker).*

2. **Who yields on pi's own OAuth provider.** The carve-out: on a covered payload whose system carries
   two marked blocks, the first block's marker is removed on every request of an active session. That
   shape is pi's OAuth path, it is never removed per request only, tools stay marked, and nothing else
   in system changes. "Byte-identical when nothing is recalled and nothing is handed off" holds
   except for that one marker. Cost is about nothing, because the tools-plus-identity entry is a
   strict prefix of system[1]'s entry. Joel's route never matches the shape, and enable/disable
   mid-session cannot happen because config is read at session start and a change needs `/reload`.
   *Decided by `research-chidi` #4, N6 and Joel's `markSystemCacheSurface` source.*

3. **Joel's attribution route.** His edit has already landed: the file has
   `assertMessageCacheControlsCopied` and its protected topology hash excludes message paths. No route
   test is needed to tell his transport from pi's, because under rulings 1–2 taiknr never does
   anything his guard forbids. Still to do: the Migration Plan states the rollback order, and
   acceptance on his route is his own session. *Decided by `owner-rulings.md` Q1(a),
   `research-attribution-guard.md` and N7.*

4. **Thread continuation.** Continuation is real, but only for models whose response model id equals
   the requested id. Haiku 4.5 never continues, which is why every probe showed `create`. Within a
   recalling turn the block stays on its message, so later requests continue and carry no system, no
   tools and no before-point — but the first request after the block leaves is always a create,
   because removing the block changes the hashed prefix, and that request carries the carry. It read
   the entry written at the recalling turn's first request after 7.5 minutes and after 12 continued
   requests. The long-turn and TTL scenarios hold on continuing and non-continuing models alike.
   *Decided by N1, N2 and N4.*

5. **Scope of "byte-identical".** It applies to a request that carries no block and whose previous
   request carried none, on 3-point routes; on pi's OAuth shape the carve-out applies. A handoff
   request carries the carry point whether or not it recalls. The carry is defined by a changed
   carrier: the previous request's carrier message is present and no longer ends with recall's block,
   which also covers the same message losing or changing its block. No carry state outlives the next
   request. *Decided by N3 and `recall-relevant-context.ts:64-72`.*

6. **Where the two facts live.** Michael withdrew his orientation's §2 instruction. (a) The recall
   block this request carries: its exact text, written by the context handler into a per-session cell
   composed in `taiknr.ts` beside `recallCache`, cleared at every `context_with_system`, independent of
   `jeffersonInstruments`. (b) Where the last request's carrier sat: its payload message index plus a
   fingerprint of the block just before recall's block, rewritten from every payload the handler
   handles. The carrier is the `role:user` message whose last block is a text block equal to (a) after
   pi's lone-surrogate removal; one local copy of pi's regex is kept. Fewer than two blocks, or no
   exact match, means no before-point and no record. A carry is placed only where the message at the
   recorded index ends with a block equal to the recorded fingerprint. No prefix matching, and no
   identifier visible to the provider. The publisher's baseline stays the pricing home and the handler
   never reads it.

7. **What the handler may consume.** It is a function of three inputs: the payload, cell (a) and
   record (b). Cache-warmer replays reach the hook and are idempotent; retries reuse the payload
   without re-firing it; compaction and summaries never reach it; classifier calls go through
   `modelRegistry.classify`. A payload with no pi message marker is left alone and does not touch the
   record.

8. **The route predicate.** One pure predicate in infra, reading `ctx.model`: provider `anthropic`
   with api `anthropic-messages` and a baseUrl on api.anthropic.com, or provider `openrouter` with api
   `anthropic-messages` and a model id starting `anthropic/`. The payload must also have a messages
   array. Everything else is untouched. Michael did not adopt `payload.model === ctx.model.id`, because
   Joel's transport sends `policy.modelId` from `normalizedAnthropicModelId`. Tests are table-driven,
   one row per provider the spec names.

9. **How the rewrite charge is sized.** Estimate, not measure. On a covered route, when the handler
   placed a carry, the charged suffix is the text after the carrier's own content through the end of
   what the last priced request carried, with the block excluded. Every request the edit did not reach
   keeps today's rule. Measuring was declined: it needs a counterfactual new tail and a TTL
   discriminator. Residuals are recorded: uncovered routes, fail-open requests, taiknr-caused zero
   reads and partial-prefix reads.

10. **How recall's block is priced.** One rule. When pi's marker stayed on the block, or the handler
    made no edit, today's rule applies. When the handler removed pi's marker from the block, the block
    is charged at the input rate on that request, at the write rate on the next request that carries
    it, and at the read rate after that. The placement is derived from the finished payload and
    reaches the publisher as a deferred reading — no new Jefferson field and no publisher getter. The
    "inside or after" and "the design's" scenarios are replaced by a worked table.

11. **The warm gate.** It stays. The living spec already rules that a cold request's expiry is not
    charged to taiknr. The zero-read case taiknr itself causes is recorded as under-reporting instead.

12. **"The split alone changes no figure".** Kept, reworded as a property of the rule ruling 9 chose:
    the response's split still enters only as warm or cold, and the figure moves through where the
    charge starts and through the block term. It cites M2 as the old rule's same property, not as
    acceptance evidence.

13. **Read guarantees.** The payload shape is the guarantee. Read and write outcomes are conditional on
    an entry an earlier request wrote, a prefix above the model's minimum, an entry inside its TTL, and
    an edit that was applied. "The recalling request reads its prefix" is corrected: today's recalling
    request already reads the previous request's entry, and M1's loss is at the first request after the
    block leaves, so M1's numbers move to the next-turn scenario. "Writes only from the block onward"
    is false and is gone. Acceptance is stated as inequalities.

14. **How the scenarios are proven.** Payload-shape scenarios are automated handler and adapter tests:
    the route table, marker positions and the budget, `ttl` copy, no-fit, string-content skip, a pasted
    marker, a surrogate, a block that is first in its message, replay idempotence, inertness. Billing
    scenarios are proven at Validate by a live run of the real extension on each covered route, after
    checking the cache-minimum precondition. Derek runs API key and OpenRouter; Joel runs pi's own
    OAuth route and his attribution route. No new log, notice or instrument field. Triage is the
    per-request cache read and write in the session JSONL plus re-running `probe2.ts`, and the design
    records that an extension running after taiknr can still push a request to five points.

15. **Settlement stubs.** Recall's block only. Michael withdrew his orientation's lean: after a
    recalling turn the carry sits earlier than every fresh stub, and stub-only lookback losses are
    unmeasured, so they become a follow-up card in the design rather than tasks.

16. **Where the under-reporting is recorded.** One home: README's instruments section, beside the
    explanation of a negative figure. It names the routes the edit does not reach, fail-open requests,
    taiknr-caused zero reads and partial-prefix reads, and the context-figures delta gets one scenario
    pointing there.

17. **Documentation targets and citation drift.** README.md:40 and :112 are the lines to change, and
    README.md:67 already names `decisionThreshold`, so that scenario is met. `context.ts` and
    `tests/app/extension/taiknr.test.ts` join the file list, and in the docs pass ARCHITECTURE.md:46-47
    and AGENTS.md:42 gain the new registration. The ADR is `docs/adr/0009`. The 16× applies to the
    rewrite term and M2 is dropped from that citation. `.envrc` is `.gitignore:12`, committed in
    `1b773fe`.

18. **Must the strategy be probed before design?** Yes, and he ran it: N3–N8 this pass. Not covered is
    pi's own OAuth with a 36-block turn under this exact strategy, twice because the model made one
    call per turn; N7 covers the same endpoint and auth, lookback is a backend property, and the carry
    sits at distance 0.

## Advice the council accepted

- Separate the two facts and give each one writer: the carried block's text, and the carrier's payload
  position with a fingerprint (ruling 6).
- Identify the block by exact equality after pi's surrogate rule rather than by prefix (rulings 6, 7).
- State the route scope as one machine-checkable predicate rather than a route enumeration
  (ruling 8).
- Narrow "byte-identical" to its 3-point case and state the OAuth carve-out in the same breath
  (rulings 2, 5).
- Prove payload shape with tests and prove billing live, with a named owner per route (ruling 14).
- Record the under-reporting where a reader meets a negative figure (ruling 16).
- Modify the living block-pricing requirement instead of leaving two rules for one term
  (ruling 10).
- Keep recall's block in scope and settlement stubs out of it (ruling 15).

## Advice the council rejected

- **Measure the rewrite from the response's cache split** (CR-6, C7, ZO-3 and Michael's own earlier
  lean). Declined by ruling 9: the counterfactual new tail and the TTL discriminator are unmeasured,
  and Joel's "keep it simple, make it reliable" governs.
- **Gate the rewrite on "a previous priced request exists" instead of on warm** (C4, CAT-3, CC-4).
  Declined by ruling 11: it would charge an idle gap past the TTL, which the living spec already
  refuses.
- **Use the publisher's baseline as the shared home** (Michael's orientation §2, STRUCT-4, CAT-2).
  Withdrawn by ruling 6: it is a no-op behind the switch and its index is in context coordinates.
- **Extend the carry point to fresh settlement stubs** (CAT-2, and Michael's own earlier lean).
  Withdrawn by ruling 15.
- **Add a log line, a notice or an instrument field so a maintainer can see the edit fire** (C10,
  CR-12). Declined by ruling 14: no new surface; triage is the session JSONL and `probe2.ts`.
- **Drop "the split alone changes no figure"** (ZO-3, CR-6, CC-4, CAT-3). Not adopted: ruling 12 keeps
  it reworded, so the equality is stated as the old rule's property rather than as an acceptance
  invariant.
- **Require `payload.model === ctx.model.id`** (CR-5, R3). Declined by ruling 8: Joel's transport
  rewrites the model id, and compaction and summary requests never reach the hook.
- **Add a config switch for the payload edit** (suggested in more than one lens report). Ruled out
  already: taiknr's only new setting is the instruments switch (`owner-rulings.md`, instruments).

## Owner Decisions Required

None. Every dispute the lenses raised is settled by a ruling above; Joel's three rulings (`Q1(a)`,
`Q2(a)`, `Q3(a)`) already covered the attribution route, the figure and the routes, and no item
carried `joel` or `escalate` out of this stage.

## What remains open in the design

These are questions for `design.md`, not owner items:

- The exact module names and the live script's path and exclusions.
- The boundary cases: no preceding block, a string-content message, `cacheRetention` none, an empty or
  system-role message in the payload, four points already present.
- Where the applied placement reading enters the publisher's method set, and how the no-op publisher
  gains it.
- The follow-up card for stub-only lookback losses.

## What is still unmeasured

- pi's own OAuth with a 36-block recalling turn under this exact strategy (ruling 18).
- Bedrock and the other Anthropic-format gateways, which keep today's payloads (Joel's Q3(a)).
- OpenRouter's `openai-completions` path with `cacheControlFormat: "anthropic"`, which the predicate
  excludes.
- Whether a later extension pushing taiknr's four points to five can be prevented. It cannot, from
  inside taiknr.
