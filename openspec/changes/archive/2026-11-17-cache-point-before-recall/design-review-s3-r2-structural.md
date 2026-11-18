{
  "mode": "review",
  "lens": "council-structural",
  "paraphrase_proposes": "The design adds two gated handlers — `before_provider_request` and a `message_end` commit — plus a pure infra adapter that, on predicate-covered Anthropic-format routes, places a before point and a carry, both deep copies of pi's own message marker, inside a counted four-marker budget, with one system-marker carve-out on pi's OAuth shape; pi's marker is recognised by count (exactly one message-level marker on the normalized clone). Per-session state (`recallBlock`, committed/next carrier records, `applied` placement) is typed in a new pi-free use-cases module and created inline in `taiknr.ts`, one writer per field, committed only at a valid assistant `message_end`. The applied placement reaches the existing publisher as a `message_end` deferred reading that drives a new rewrite-charge start (D7) and a one-rule block pricing carried on the baseline as `blockUncached` (D8). Proof is automated handler/adapter tests plus a committed root live script run per covered route at Validate, with a migration order and rollback protecting Joel's already-relaxed attribution guard.",
  "paraphrase_existing": "Today recall appends its block to the newest user message at `context_with_system`, and pi places its message cache marker on the last block of the last message, so a request carrying the block makes the provider rewrite the turn's prefix instead of reading it. The savings figure charges a suffix from the changed message (`rewriteOf` in `instruments-publisher.ts`, `netDollars` in `savings-dollars.ts`) and prices recall's block by prior-message membership (`blockInNewTail = block.index >= previousLength`), so a block changed on a carried message is priced at the read rate although nothing cached it. Handlers are thin gated one-event bridges in `src/infra/pi-event-handlers/`, publication flows through deferred readings into the use-cases publisher behind the `jeffersonInstruments` switch, the composition root in `src/app/extension/taiknr.ts` creates all per-session state, and no payload-editing code exists.",
  "recommendation": "Proceed to tasks once one placement defect is corrected: the Module & File Placement table assigns D7's rewrite-charge start to `src/domain/savings-dollars.ts` while D7 and §5.4 compute it in the publisher's `rewriteOf`, and §5.4's 'gains `blockUncached` and one placement field' disagrees with D8's single named field. Round 1's major (the double record rule) is resolved and its recommended test added, the surrogate comparison, type homes, blockUncached fold, numbering and applied-window findings of round 1 are all resolved, the placement table otherwise matches the real repository and its conventions, and every measured claim keeps a named run. The remaining findings are one-line edits that can ride along.",
  "findings": [
    {
      "id": "S3R2-STRUCT-1",
      "severity": "major",
      "location": "/Users/joelleibow/Projects/taiknr/openspec/changes/cache-point-before-recall/design.md — §4 Module & File Placement, src/domain/savings-dollars.ts row; §5.4 final paragraph; D7; D8",
      "finding": "The placement table gives `src/domain/savings-dollars.ts` ownership of 'the rewrite charge's start (D7)', but D7 and §5.4 both compute that start in `rewriteOf`, a helper inside `src/use-cases/instruments-publisher.ts`: the start needs `baseline`, `candidate` and the carrier record — publisher state the pure domain function cannot see — and `netDollars` still receives only `suffixEstimate`, so its inputs and formula are unchanged by D7. In the same breath §5.4 closes with '`PricedRequest` gains `blockUncached` and one placement field', while D8 says only '`PricedRequest` gains `blockUncached: boolean`': either a second, unnamed PricedRequest field with no derivation and no consumer anywhere in the stated rules, or an apposition that should say so.",
      "rationale": "One home for each fact and clean module separation (feature-spec standard §3; zoom-out standard §2): the placement table is the artifact that fixes which layer owns which rule, and it assigns a use-case computation to the domain file while the contract sections assign it to the use-cases publisher — one fact, two homes — beside a domain shape change the rule statements do not support.",
      "concrete_case": "An implementer following the table moves the start decision into savings-dollars.ts, finds no `carried.index` or `baseline` in a pure function over `PricedRequest` and `Rates`, and either widens `netDollars`'s inputs (a domain shape change §5.4 says does not happen) or stalls on the contradiction. One following §5.4's closing sentence adds a second 'placement' field to PricedRequest that no rule in D8 reads, or asks which field was meant — two implementers ship different shapes for the same contract.",
      "recommendation": "Restrict the savings-dollars.ts row to what actually changes there — the block-rate rule (D8) and `blockUncached: boolean` — and name instruments-publisher.ts's `rewriteOf` as the home of D7's start in that row's place; make §5.4 read 'gains `blockUncached`, one placement field' (apposition) or name the second field and the rule that consumes it."
    },
    {
      "id": "S3R2-STRUCT-2",
      "severity": "minor",
      "location": "/Users/joelleibow/Projects/taiknr/openspec/changes/cache-point-before-recall/design.md — §5.1 contract block ('register(pi, state) // through the handler gate, two events') vs §4 table rows for before-provider-request.ts and payload-cache-commit.ts; AGENTS.md Conventions ('A handler registers exactly its one lifecycle event')",
      "finding": "§5.1's signature block presents a single `register(pi, state)` registering two events (`before_provider_request` and `message_end`), while §4's table and the prose two sentences later ('The commit handler is the other half. It registers `message_end` through the same gate') describe two files each registering exactly one event, and AGENTS.md fixes the convention: a handler registers exactly its one lifecycle event, with fixed public signatures.",
      "rationale": "Structural completeness and convention match (feature-spec standard §2: match the repository's existing layout and conventions): the contract block is what an implementer transcribes first, and it contradicts the placement authority on the registration shape.",
      "concrete_case": "An implementer copies §5.1's block into `before-provider-request.ts` and registers both events there; `payload-cache-commit.ts` is never created, the count becomes fourteen registrations over ten events, and both §10's docs-pass edit ('thirteen over nine becomes fifteen over ten') and the pinned `tests/app/extension/taiknr.test.ts` list miscount.",
      "recommendation": "Split the §5.1 block into the two `register` signatures the table names — `register(pi, state)` in before-provider-request.ts and its own in payload-cache-commit.ts — or annotate the block as depicting both handlers together."
    },
    {
      "id": "S3R2-STRUCT-3",
      "severity": "minor",
      "location": "/Users/joelleibow/Projects/taiknr/openspec/changes/cache-point-before-recall/design.md — D4(b) vs §5.3(5) and D6",
      "finding": "D4 still summarises record (b) as 'Its next value is computed from every covered payload the handler handles and left unchanged on one the edit does not cover', which contradicts §5.3(5)'s now-unambiguous rule that a covered payload whose message markers do not number exactly one also leaves the record unchanged. This is a residual of round 1's S3-STRUCT-1: the mechanics are single-sourced and correct, but the compressed summary retains the old scope.",
      "rationale": "One home for each fact (feature-spec standard §3): the decisions section may compress, but a compression that states a different scope than the mechanics it points to recreates the two-implementer split round 1 fixed.",
      "concrete_case": "A reader citing D4 alone concludes a covered request carrying a foreign message marker advances the record (it is a covered payload the handler handles); §5.3(5) and D6 say it does not — the next handoff after such a request either loses or keeps the carry depending on which sentence the implementer followed.",
      "recommendation": "Reword D4(b) to 'its next value follows §5.3 (5)' or extend the sentence: 'and left unchanged on one the edit does not cover or whose message markers do not number exactly one'."
    },
    {
      "id": "S3R2-STRUCT-4",
      "severity": "minor",
      "location": "/Users/joelleibow/Projects/taiknr/openspec/changes/cache-point-before-recall/design.md — D2 ('The budget is four minus every marker on the normalized clone except pi's last-message marker') vs §5.3(4) 'The budget'; also proposal.md 'What Changes' bullet 2 and specs/tail-recall/spec.md 'The budget decides, and pi's marker yields'",
      "finding": "Round 1's drift in the budget rule is reconciled — all four artifacts now agree that the carve-out survives a no-fit — but the formula is still restated in full twice inside design.md itself (D2 and §5.3(4)), beside the proposal's bullet and the spec scenario. Two complete copies of one formula inside one document is the duplication the one-home rule exists to prevent.",
      "rationale": "Feature-spec standard §1 and §3: keep one home for each fact and point to it. D2 is the decision, §5.3 is the mechanics the design itself designates ('The order these rules run in is §5.3'); stating the full formula in both leaves two sentences that must be edited in lockstep.",
      "concrete_case": "A later change to the budget — say a five-point allowance on some route — is edited in §5.3(4) but not in D2; D2 then promises a budget §5.3 no longer computes, and D2 is the sentence every later citation of 'D2' reaches.",
      "recommendation": "Let §5.3(4) own the formula and compress D2 to the decision plus a pointer ('a counted four-marker budget on the normalized clone, mechanics in §5.3'), or accept the duplication knowingly with an explicit 'as §5.3 states' in D2."
    },
    {
      "id": "S3R2-STRUCT-5",
      "severity": "minor",
      "location": "/Users/joelleibow/Projects/taiknr/openspec/changes/cache-point-before-recall/specs/context-figures/spec.md — MODIFIED requirement 'A saving is priced at the rates the request's own response reported', scenarios 'A warm request that read only part of its prefix' and 'The edges the design decides' ('design D8, row 11')",
      "finding": "The context-figures delta cites '(design D8, row 11)' twice, and no such row resolves: D8 has no numbered rows, §7.2's table has four unnumbered rows, and every other citation in the artifact set names rulings by short topic ('ruling warm gate') or by number in council.md's own list. The citation form appears nowhere else and looks like a stale reference, possibly to Michael's ruling 11 (the warm gate) or to an earlier draft's numbering.",
      "rationale": "Alignment between specs/ and design.md (feature-spec standard §1: point to the home of a fact; structural completeness: coherent cross-references): a spec citation that does not resolve leaves the requirement's authority untraceable for the verifier.",
      "concrete_case": "A verifier tracing the partial-prefix scenario's authority opens design D8, finds no row 11, and cannot tell whether the source is the design, Michael's ruling list, or an earlier design draft — so the scenario's claim of an accepted estimate rests on a citation that names nothing.",
      "recommendation": "Replace both occurrences with the citation form the artifacts already use — the design section that states the estimate ('design §7.2/§11', as the scenario's content requires) or 'ruling <name>' — so the scenario names a real home."
    }
  ],
  "assumptions": [
    {
      "assumption": "The design's named files and layers match the repository: handlers under src/infra/pi-event-handlers/ each register exactly one event (AGENTS.md Conventions), adapters under src/infra/adapters/, use-cases holds ports and the publisher, ARCHITECTURE.md:46-47 reads 'Thirteen registrations over nine events' / 'Twelve of the thirteen', AGENTS.md's gate trap says 'twelve', and no before_provider_request or cache-payload-editing code exists today.",
      "status": "verified"
    },
    {
      "assumption": "Citation facts the design rests on: `.gitignore:12` is `.envrc`; ADRs 0001–0008 exist so `docs/adr/0009` is next; `tests/app/extension/taiknr.test.ts` pins the thirteen registrations; `createContextStub`'s `model` option sits at `tests/support/fake-pi.ts:63`; `validUsage` sits at `src/domain/calibration.ts:~50`; the composition root creates `recallCache` as an inline literal and registers through the gate.",
      "status": "verified"
    },
    {
      "assumption": "D8's latent-defect claim is real in today's code: `rewriteOf` computes `blockInNewTail = block !== undefined && block.index >= previousLength` and `netDollars` prices a warm, not-in-new-tail block at the read rate, so a block changed on a message the last priced request carried (index < previousLength) is read-priced though nothing cached it.",
      "status": "verified"
    },
    {
      "assumption": "Round-1 structural findings S3-STRUCT-1 through -7 were re-checked against the round-2 text: the record rule is single-sourced in §5.3(5) with the recommended two-marker-then-handoff test added; the state types moved to `src/use-cases/payload-cache.ts`; the whole surrogate comparison moved into the adapter applied to both sides; the blockUncached fold is explicit ('`requestBuilt` does not set it'); headers are numbered §1–§12 and cross-references resolve; the warmer-timing invariant ('the warmer's next run starts only at the next request's streamFn') now guards the `applied` window. Only the budget duplication (S3R2-STRUCT-4) and a D4 residual (S3R2-STRUCT-3) survive from round 1.",
      "status": "verified"
    },
    {
      "assumption": "Probe measurements (N1–N8, `dr-s3-peek.log`, `dr-s2-harness.mjs` cases, the 132-of-132 and 152-request counts) are as cited; the logs under `.pi/marbleization/cache-point-before-recall/` were not opened.",
      "status": "unverified"
    },
    {
      "assumption": "pi source citations (runner.js:1074-1100, cache-warmer.js, sdk.js, anthropic-messages.js, docs/extensions.md line refs) and Joel's external attribution extension line refs are accurate as reported by the research reports and Michael's rulings; they were not re-read.",
      "status": "unverified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "tasks.md does not exist yet in the change directory; design/tasks alignment needs a later pass once tasks are drafted.",
    "The probe logs and harness cases under /Users/joelleibow/Projects/taiknr/.pi/marbleization/cache-point-before-recall/ were not opened or re-run.",
    "The installed pi package sources and Joel's external attribution extension were not re-read; provider facts rest on the research reports and the binding rulings.",
    "The council-zoom-out/comprehension round-2 passes and the Stage 5 readiness questions were not evaluated; this review is the structural lens only.",
    "No files were edited, no commands or model calls were made."
  ]
}