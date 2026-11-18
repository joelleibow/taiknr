{
  "mode": "review",
  "lens": "council-structural",
  "paraphrase_proposes": "The design adds two gated handlers — `before_provider_request` and a `message_end` commit — plus a pure infra adapter that, on predicate-covered Anthropic-format routes, places a before point ahead of recall's block and a carry on the previous carrier, both deep copies of pi's own message marker, inside a four-marker budget counted on the normalized clone, with one system-marker carve-out on pi's OAuth shape. Per-session state (`recallBlock`, committed and next carrier records, `applied` placement) is typed in a new pi-free use-cases module and created inline in `taiknr.ts`, one writer per field, committed only at a valid assistant `message_end`. The applied placement reaches the existing publisher as a `message_end` deferred reading that drives the rewrite-charge start (D7, in the publisher's `rewriteOf`) and a one-rule block pricing carried on the baseline as `blockUncached` (D8). Proof is automated handler/adapter tests plus a committed root live script run per covered route at Validate, with a migration order and rollback protecting Joel's already-relaxed attribution guard.",
  "paraphrase_existing": "Today recall appends its block to the newest user message at `context_with_system`, and pi places its message cache marker on the last block of the last message, so a request carrying the block makes the provider rewrite the turn's prefix instead of reading it. The savings figure charges a warm-request suffix from the changed message (`rewriteOf` in `instruments-publisher.ts:184-203`, `netDollars` in `savings-dollars.ts:53-60`) and prices recall's block by prior-message membership (`blockInNewTail = block.index >= previousLength`, `instruments-publisher.ts:202`), so a block changed on a carried message is read-priced though nothing cached it. Handlers are thin gated one-event bridges under `src/infra/pi-event-handlers/`, publication flows through deferred readings into the use-cases publisher behind the `jeffersonInstruments` switch, the composition root in `taiknr.ts` creates all per-session state (thirteen registrations over nine events), and no payload-editing code exists.",
  "recommendation": "Proceed to tasks. All five round-2 structural findings are resolved and verified against the repository: the placement table now keeps D7's start in the publisher's `rewriteOf` and restricts `savings-dollars.ts` to the block-rate rule and `blockUncached`; §5.1 shows the two one-event register signatures; D4(b) points at §5.3 (5); the budget formula has one design home in §5.3 (4); and the context-figures spec's row-11 citation resolves to the archived instruments design at `:356`. Module fit, layer flow, state homes and migration order all match the real tree and the binding rulings, and every measured claim keeps a named run. Three minor one-line edits remain: the §5.2 field count, one misdirected spec citation, and one unanchored 'measured' claim in §8.2.",
  "findings": [
    {
      "id": "S3R3-STRUCT-1",
      "severity": "minor",
      "location": "/Users/joelleibow/Projects/taiknr/openspec/changes/cache-point-before-recall/design.md — §5.2 The state, sentence after the state block ('Three fields, each with one writer: …')",
      "finding": "The state block lists four fields — `recallBlock`, `carrier`, `nextCarrier`, `applied` — and the sentence that governs them says 'Three fields, each with one writer', then assigns the payload handler two of them (`nextCarrier` and `applied`). Both halves of the count are wrong: there are four fields, and one writer owns two of them.",
      "rationale": "Coherent state transitions and one home per fact (feature-spec standard §3): §5.2 is the section that fixes the state's shape and its write discipline, and an implementer transcribes the type `PayloadCacheState` from it. A wrong count invites either a wrong type or a wrong 'fix' of the settled two-write handler contract in §5.1.",
      "concrete_case": "An implementer building `PayloadCacheState` in `src/use-cases/payload-cache.ts` counts four cells in the block but three in the prose, and cannot tell which cell is meant not to exist; a stricter reader takes 'each with one writer' literally, decides the payload handler writing both `nextCarrier` and `applied` is a defect, and splits the writers — churning the commit ordering §5.1 and §8.1's failure-ordering test just settled in rounds 1–2.",
      "recommendation": "One-line edit: 'Four fields, three writers, each field with exactly one writer: …' — or drop the count and keep 'each field has one writer'."
    },
    {
      "id": "S3R3-STRUCT-2",
      "severity": "minor",
      "location": "/Users/joelleibow/Projects/taiknr/openspec/changes/cache-point-before-recall/specs/tail-recall/spec.md:203 — requirement 'The payload edit is inert while taiknr is off', citation '(D3; `configuration` spec; `michael-orientation.md` §2)'",
      "finding": "The inertness requirement cites a bare 'D3', but in this change's artifact set D3 is design.md's carve-out decision (the OAuth system-marker removal), which states nothing about inertness. Two lines up, the same spec file uses bare 'D1' to mean this design's D1, so the file's own convention makes 'D3' resolve to the carve-out. The inertness fact's actual homes are design §5.1's sentence ('The gate stays the only inertness mechanism') and the standing gate decision in the archived configuration-loader design (D3 there), which the unqualified label conflates.",
      "rationale": "Structural completeness requires cross-references that resolve (review charter; feature-spec standard §1: point to the home of a fact). A spec citation that misdirects within the change's own numbering leaves the requirement's authority untraceable, and the ambiguity is real because two different 'D3's exist across the repository's designs.",
      "concrete_case": "An implementer writing the inertness tests traces the requirement's '(D3)' into this change's design.md, reads the carve-out decision, finds nothing about the gate, and either invents an inertness rule or files the requirement as unsupported — when the real authority (design §5.1; the standing composition-root gate) is one grep away.",
      "recommendation": "Replace '(D3' with the home that states the mechanism — 'design §5.1' — or name the standing decision with its path ('`2026-11-14-configuration-loader/design.md` D3'), keeping the `configuration` spec and `michael-orientation.md` §2 citations."
    },
    {
      "id": "S3R3-STRUCT-3",
      "severity": "minor",
      "location": "/Users/joelleibow/Projects/taiknr/openspec/changes/cache-point-before-recall/design.md — §8.2 'Run status' paragraph ('The credential check and the symlink semantics were measured separately, as §8.3 states; no OAuth model call was run.')",
      "finding": "The run-status sentence claims two facts 'were measured separately' but names no run, log or file for either, unlike every other run-status sentence in §8 (which names `dr-s3-peek.log`, `dr-s2-harness.mjs` cases and `dr-s3-commit.log`). §8.3, which the sentence points to, states the symlink and auth-check mechanics but cites only source lines (`auth-storage.js:50,92`), not a measurement — so the pointer does not anchor the 'measured' claim.",
      "rationale": "Calibrated claims (feature-spec standard §6): every statement about tested behavior must match cited evidence. The design holds itself to naming its runs everywhere else; this one sentence leaves a measured claim indistinguishable from an assumption for a Stage-5 verifier.",
      "concrete_case": "A Stage-5 readiness verifier confirming §8.2's run status asks where the credential check and the symlink behaviour were measured; nothing in the change directory names a log or run for them, so the verifier cannot tell whether the OAuth preconditions rest on measurement or on source reading — exactly the distinction the run-status paragraphs exist to carry.",
      "recommendation": "Name the measurement for each (a log path under `.pi/marbleization/cache-point-before-recall/michael/`), or reword to what the evidence supports: 'the symlink and credential mechanics rest on source (`auth-storage.js:50,92`), not on a run; no OAuth model call was run.'"
    }
  ],
  "assumptions": [
    {
      "assumption": "Repository layout matches the placement table: handlers under `src/infra/pi-event-handlers/` (13 files, none editing payloads), adapters under `src/infra/adapters/`, `instruments-publisher.ts` and `recall-relevant-context.ts` under `src/use-cases/`, composition in `src/app/extension/taiknr.ts` with `recallCache` as an inline literal and 13 registrations; `tests/infra/adapters/` and every test file named in the table exists except the three new ones.",
      "status": "verified"
    },
    {
      "assumption": "Citation facts verified in the tree: `validUsage` at `src/domain/calibration.ts:50`; `createContextStub`'s `model` option at `tests/support/fake-pi.ts:63`; the rewrite charge at `savings-dollars.ts:59` and `rewriteOf` at `instruments-publisher.ts:184-203` with `blockInNewTail = block.index >= previousLength` at `:202`; `compacted`/`treeJumped` reset the baseline (the premise of D5's 'both events reset the publisher's baseline'); `.gitignore:12` is `.envrc`; ADRs 0001–0008 exist so `docs/adr/0009` is next; `ARCHITECTURE.md:46-47` reads 'Thirteen registrations over nine events' and `AGENTS.md:42` reads 'twelve', so the fifteen-over-ten arithmetic holds; the context-figures spec's 'design D8, row 11' citation resolves to `openspec/changes/archive/2026-11-17-taiknr-instruments/design.md:356` (row 11, the partial-prefix estimate).",
      "status": "verified"
    },
    {
      "assumption": "Round-2 findings S3R2-STRUCT-1 through -5 are resolved in the current text: the savings-dollars row claims only the block-rate rule and says 'The rewrite term and its inputs are unchanged', the publisher row names `rewriteOf` as D7's home, §5.4 says 'PricedRequest gains one field, blockUncached', §5.1 shows two separate one-event register signatures, D4(b) points at §5.3 (5), D2 points at §5.3 (4) for the budget formula, and the row-11 citation names the archived instruments design. Round-1 residuals named in round 2 (D4's scope, budget duplication) are also gone.",
      "status": "verified"
    },
    {
      "assumption": "D8's block-rate formula matches the spec's placement table row by row (uncached→input; new/changed/left-uncached→write; same-block warm→read; cold→write), and D7's start and the `blockUncached` fold in §5.4 are consistent with the current `rewriteOf`/`responseReceived`/`baseline` shapes in `instruments-publisher.ts`.",
      "status": "verified"
    },
    {
      "assumption": "Probe measurements (N1–N8, the 152-request marker count, 132-of-132 pricing fit, `dr-s3-peek.log`, `dr-s2-harness.mjs`, `dr-s3-commit.log`) and pi source citations (`runner.js`, `cache-warmer.js`, `sdk.js`, `agent-session.js`, `anthropic-messages.js`, `docs/extensions.md`, `pc.md:607`) are accurate as reported by the research reports and Michael's rulings; the logs under `.pi/marbleization/cache-point-before-recall/` were not opened.",
      "status": "unverified"
    },
    {
      "assumption": "Joel's external attribution extension line references and pi's OAuth marking behaviour are as recorded in `research-attribution-guard.md` and the binding rulings; the external file was not re-read.",
      "status": "unverified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "tasks.md does not exist yet in the change directory; design/tasks alignment needs a later pass once tasks are drafted.",
    "The probe logs and harness cases under /Users/joelleibow/Projects/taiknr/.pi/marbleization/cache-point-before-recall/ were not opened or re-run.",
    "The installed pi package sources and Joel's external attribution extension were not re-read; provider facts rest on the research reports and the binding rulings.",
    "The other lenses' round-3 passes and the Stage 5 readiness questions were not evaluated; this review is the structural lens only.",
    "No files were edited, no commands or model calls were made."
  ]
}