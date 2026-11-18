{
  "mode": "review",
  "lens": "council-structural",
  "paraphrase_proposes": "The design adds two gated one-event handlers — `before_provider_request` and a `message_end` commit — plus a pure infra adapter that, on predicate-covered Anthropic-format routes, places a before point ahead of recall's block and a carry on the previous carrier, both deep copies of pi's own message marker, inside a four-marker budget counted on the normalized clone, with one system-marker carve-out on pi's OAuth shape. Per-session state (`recallBlock`, committed and next carrier records, `applied` placement — four fields, three writers, one writer per field) is typed in a new pi-free use-cases module and created inline in `taiknr.ts`, committed only at a valid assistant `message_end`. The applied placement reaches the existing publisher as a `message_end` deferred reading that drives the rewrite-charge start (D7, in the publisher's `rewriteOf`) and a one-rule block pricing carried on the baseline as `blockUncached` (D8). Proof is automated handler/adapter tests plus a committed root live script run per covered route at Validate, with a migration order and rollback protecting Joel's already-relaxed attribution guard.",
  "paraphrase_existing": "Today recall appends its block to the newest user message at `context_with_system`, and pi places its message cache marker on the last block of the last message, so a request carrying the block makes the provider rewrite the turn's prefix instead of reading it. The savings figure charges a warm-request suffix from the changed message (`rewriteOf` in `instruments-publisher.ts:184-203`, `netDollars` in `savings-dollars.ts`) and prices recall's block by prior-message membership, so a block changed on a carried message is read-priced though nothing cached it. Handlers are thin gated one-event bridges under `src/infra/pi-event-handlers/` (thirteen registrations over nine events), publication flows through deferred readings into the use-cases publisher behind the `jeffersonInstruments` switch, the composition root in `taiknr.ts` creates all per-session state, and no payload-editing code exists.",
  "recommendation": "Proceed to tasks, with one major fix first: the design's count-based marker recognition edits a payload pi marked nowhere whenever another extension's lone message-level marker is present, diverging from ruling 1 and two tail-recall spec scenarios, and the divergence is recorded nowhere — record it as an accepted residual (or narrow the scenarios) exactly as the five-point risk is recorded. Two minors: §12 names an 'open' item it has already decided, and the docs pass corrects AGENTS.md's stale live-script trap but not ARCHITECTURE.md's same false claim. All round-3 findings are resolved; module fit, layer flow, state homes, citations and migration order match the real tree and the binding rulings.",
  "findings": [
    {
      "id": "S3R4-STRUCT-1",
      "severity": "major",
      "location": "/Users/joelleibow/Projects/taiknr/openspec/changes/cache-point-before-recall/design.md — §5.3 (4) 'A marker, and pi's message marker' (recognition by count) and §6.1 rows 'cacheRetention none, so pi marked nothing' and 'A second message-level marker'; specs/tail-recall/spec.md scenarios 'A payload pi marked nowhere' and 'Another extension's marker survives'; michael-council-rulings.json ruling 1 ('If pi placed no message marker, nothing is edited')",
      "finding": "pi's message marker is recognised only by count — exactly one message-level `cache_control`, wherever it sits — so a payload pi marked nowhere that carries exactly one message-level marker from another extension is indistinguishable from pi's. In that case the adapter edits the payload anyway (contrary to ruling 1's 'if pi placed no message marker, nothing is edited' and the spec's 'A payload pi marked nowhere' scenario), copies the foreign marker object as its template, and on a spent budget removes it as 'pi's last-message marker' (contrary to the allowance that pi's marker is the only existing marker taiknr may remove, and to the 'Another extension's marker survives' scenario, whose WHEN clause — 'another extension placed a marker anywhere under messages' — literally includes the lone case). The guard refuses zero and two-or-more; nothing in §6.1's boundary table or §11's risk list records what the one-marker trigger does when the marker is not pi's.",
      "rationale": "Feature-spec standard §4 requires each guard's refusal condition and trigger to be stated, and §1 requires every stated rule to hold in one place: the design's own allowance and two spec scenarios state guarantees the count-based mechanism cannot honour on a reachable input, and the divergence is unrecorded, so an implementer transcribing §5.3 believes no such case exists.",
      "concrete_case": "A session runs with `cacheRetention: none`, so pi places no message marker; another extension registered before taiknr places one message-level `cache_control`; foreign top-level and tools markers leave the budget at 2. The adapter counts exactly one message-level marker, takes it as pi's, places the before point and the carry as deep copies of the foreign marker object, and — the wanted two points plus one exceeding the budget — removes the foreign marker as 'pi's last-message marker'. The request goes out edited although pi marked nothing, and another extension's marker is gone, which the spec's byte-identical promise for foreign markers forbids.",
      "recommendation": "Record the divergence as an accepted residual, exactly as §11 records the five-point risk: one §6.1 row ('a lone message-level marker that is not pi's, where pi marked nowhere') and one §11 entry naming the trigger and the cost (a foreign marker treated as pi's, edited and on a spent budget removed). Alternatively narrow the two spec scenarios to the guard's actual refusal condition (zero, or two or more message markers) — a contract change that goes to Michael and Joel. The mechanism itself stays as measured and ruled."
    },
    {
      "id": "S3R4-STRUCT-2",
      "severity": "minor",
      "location": "/Users/joelleibow/Projects/taiknr/openspec/changes/cache-point-before-recall/design.md — §12 'Questions this design leaves open'",
      "finding": "The section says none about behaviour, then names 'the one open item' — whether `test-cache-point-live.mjs` stays in the repository after Validate — and in the same breath settles it ('This design commits it, because §6.3's triage needs it'). A question the design has already decided is not an open question; the section both claims closure and names a blocker.",
      "rationale": "Structural completeness: §12 is the design's own list of what remains open, and a Stage-5 readiness pass reads it as the blocker inventory. A decided item framed as open invites a hold on a settled decision — the churn round 2's standing ruling exists to prevent.",
      "concrete_case": "A Stage-5 readiness verifier greps design.md for open questions, finds 'The one open item is administrative', and files a readiness block on the live script's retention — a decision §8.3 and §6.3 already record as 'committed'.",
      "recommendation": "One line: 'None. `test-cache-point-live.mjs` is committed (§8.3), because §6.3's triage needs it.' Drop the open-item framing."
    },
    {
      "id": "S3R4-STRUCT-3",
      "severity": "minor",
      "location": "/Users/joelleibow/Projects/taiknr/openspec/changes/cache-point-before-recall/design.md — §4 documentation paragraph and §10 'After the merge, in the docs pass'; /Users/joelleibow/Projects/taiknr/ARCHITECTURE.md:3",
      "finding": "The docs pass corrects AGENTS.md's stale live-script trap (`jev-context-poc.ts`, `test-jev-poc.mjs`, `test-recall-live.mjs`), but ARCHITECTURE.md's intro carries the same false fact — '`jev-context-poc.ts` and `test-jev-poc.mjs` preserve the original proof of concept' — and the design's ARCHITECTURE.md entry names only lines 46-47 (the registration counts). None of those files exists in the tree (root listing), so the correction list names one of the two homes of the same stale claim.",
      "rationale": "One home per fact (feature-spec standard §1 and §3): a correction aimed at a stale claim should land at every place that asserts it, or the next reader of the uncorrected home inherits the same confusion the docs pass exists to remove; ARCHITECTURE.md is the file AGENTS.md directs readers to first.",
      "concrete_case": "A maintainer opens ARCHITECTURE.md (which AGENTS.md:3 names as 'the current shape'), reads on line 3 that `jev-context-poc.ts` and `test-jev-poc.mjs` 'preserve the original proof of concept', finds neither at the repository root, and concludes tracked files were lost — while the same docs pass fixes only AGENTS.md's copy of the claim.",
      "recommendation": "Add ARCHITECTURE.md's stale sentence to the §10 docs-pass list, as one clause beside the AGENTS.md trap correction."
    }
  ],
  "assumptions": [
    {
      "assumption": "Repository layout matches the placement table: the three modified handlers (`context.ts`, `instruments-response.ts`) and all other named modified files exist (`src/use-cases/instruments-publisher.ts`, `src/domain/savings-dollars.ts`, `src/domain/calibration.ts:50` `validUsage`, `tests/app/extension/taiknr.test.ts`, `tests/infra/pi-event-handlers/*`, `tests/infra/adapters/`, `tests/use-cases/instruments-publisher.test.ts`, `tests/domain/savings-dollars.test.ts`, `tests/support/fake-pi.ts`); the four new source files do not exist yet, as expected; `docs/adr/` runs 0001–0008 so 0009 is next; `.gitignore:12` is `.envrc`.",
      "status": "verified"
    },
    {
      "assumption": "All three round-3 structural findings are resolved in the current text: §5.2 reads 'Four fields and three writers, each field with exactly one writer'; the tail-recall inertness requirement cites 'design §5.1' and the archived configuration-loader design D3 by path; §8.2's run-status sentences name `dr-s3-r3-auth.log` (and the §8.1 round names `dr-s3-r3-url.log` and `dr-s3-r3-walk.log`).",
      "status": "verified"
    },
    {
      "assumption": "D8's block-rate formula matches the spec's placement table row by row against the current `netDollars` in `savings-dollars.ts` (read this round): `blockUncached ? inputRate : (warm && !blockInNewTail ? readRate : writeRate)`, with `blockInNewTail` covering new (`index >= previousLength`), changed (`blockChanged`) and left-uncached (`baseline.blockUncached`).",
      "status": "verified"
    },
    {
      "assumption": "The registration-count arithmetic holds: ARCHITECTURE.md:46-47 reads 'Thirteen registrations over nine events' / 'Twelve of the thirteen', AGENTS.md:42 reads 'The twelve non-`session_start` registrations', so the design's fifteen-over-ten (and fourteen gated) is correct; AGENTS.md's trap naming `jev-context-poc.ts`, `test-jev-poc.mjs` and `test-recall-live.mjs` is stale, and ARCHITECTURE.md:3 asserts the same two nonexistent files.",
      "status": "verified"
    },
    {
      "assumption": "D7's start and the `blockUncached` fold in §5.4 are consistent with the current `rewriteOf`/`responseReceived`/`baseline` shapes in `instruments-publisher.ts` (verified in round 3; the file was not re-read this round).",
      "status": "unverified"
    },
    {
      "assumption": "Probe measurements and run logs (`dr-s3-peek.log`, `dr-s3-r3-auth.log`, `dr-s3-r3-url.log`, `dr-s3-r3-walk.log`, the 152-request marker count, 132-of-132 pricing fit, N1–N9) and pi source citations are accurate as reported by the research reports and Michael's rulings; the logs under `.pi/marbleization/cache-point-before-recall/` were not opened this round.",
      "status": "unverified"
    },
    {
      "assumption": "Joel's external attribution extension line references and pi's OAuth marking behaviour are as recorded in `research-attribution-guard.md` and the binding rulings; the external file was not re-read.",
      "status": "unverified"
    }
  ],
  "owner_questions": [
    {
      "question": "How should the design close the lone-foreign-marker divergence (S3R4-STRUCT-1), where count-based recognition edits a payload pi marked nowhere because another extension's single message-level marker is indistinguishable from pi's?",
      "options": [
        "Record it as an accepted residual in the design only (§6.1 row + §11 entry, mirroring the recorded five-point risk), leaving the mechanism and both spec scenarios as they are",
        "Narrow the two tail-recall spec scenarios ('A payload pi marked nowhere', 'Another extension's marker survives') to the guard's actual refusal condition — zero, or two or more message markers",
        "Add a position-based provenance check to the recognition rule so a lone marker must sit where pi places it"
      ],
      "recommended_option": "Record it as an accepted residual in the design only (§6.1 row + §11 entry, mirroring the recorded five-point risk), leaving the mechanism and both spec scenarios as they are",
      "why": "The mechanism is settled by ruling 1's own measurement (152 requests, every one with exactly one marker) and position was deliberately not checked (pi appends empty system effort messages after the marked message), so option 3 reopens a measured decision. Option 2 touches a user-facing contract, which the standing churn rule sends to Joel; option 1 is the one-line fix that keeps the guarantees honest without reopening anything, and it follows the pattern ruling 14 already set for the five-point residual."
    }
  ],
  "not_checked": [
    "tasks.md does not exist yet in the change directory; design/tasks alignment needs a later pass once tasks are drafted.",
    "The probe logs and harness cases under /Users/joelleibow/Projects/taiknr/.pi/marbleization/cache-point-before-recall/ were not opened or re-run.",
    "The installed pi package sources and Joel's external attribution extension were not re-read; provider facts rest on the research reports and the binding rulings.",
    "`instruments-publisher.ts` was not re-read this round; its `rewriteOf`/`responseReceived`/`baseline` shapes rest on round 3's verification.",
    "The other lenses' round-4 passes and the Stage 5 readiness questions were not evaluated; this review is the structural lens only.",
    "No files were edited, no commands or model calls were made."
  ]
}