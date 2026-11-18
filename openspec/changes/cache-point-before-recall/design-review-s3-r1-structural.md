{
  "mode": "review",
  "lens": "council-structural",
  "paraphrase_proposes": "The design adds a gated `before_provider_request` handler and a pure infra adapter that, on covered Anthropic-format routes, places two message-level cache points (a before point ahead of recall's block and a carry on the previous carrier at handoff) inside a four-marker budget, with one system-marker carve-out on pi's OAuth shape. Per-session state — the recall block's text, the carrier's payload position, and an applied-placement result — lives in one new app/extension module with one writer per fact, and the applied result reaches the existing publisher as a deferred message_end reading that drives a new rewrite-charge start and a one-rule block pricing carried on the baseline. Proof is automated handler/adapter tests plus a committed live script run per covered route at Validate; a migration order and rollback protect Joel's already-relaxed attribution guard.",
  "paraphrase_existing": "Today recall appends its block to the newest user message at `context_with_system`, and pi places its message cache marker on the last block, so a request carrying the block makes the provider rewrite the turn's prefix instead of reading it; the savings figure's rewrite charge starts at the recalling message and prices the block by prior-message membership. The publisher keeps a per-session baseline in context coordinates behind the instruments switch, handlers are thin gated bridges in `src/infra/pi-event-handlers/`, and every publication flows through deferred readings into the use-cases publisher; no payload-editing code exists yet.",
  "recommendation": "Revise before tasks. The placement table matches the repository's real layering, the migration order and rollback are sound, and the claims are unusually well calibrated (every risk carries a concrete case, every measured number names its run, and the run-status paragraphs separate what ran from what is design). One major defect must be fixed first: §4.3 states two opposite rules for when the carrier record is rewritten, which changes whether the carry ever fires after a foreign-marker request. The state module's type home, the split surrogate-equality rule, and the blockUncached sequencing are small but real boundary gaps; the rest are minor drift and numbering hygiene.",
  "findings": [
    {
      "id": "S3-STRUCT-1",
      "severity": "major",
      "location": "/Users/joelleibow/Projects/taiknr/openspec/changes/cache-point-before-recall/design.md — §4.3 item 5 (Commit) vs §4.3 item 4 (Zero, or two or more, message markers) and D6",
      "finding": "The carrier record has two opposite rewrite rules in the same contract. §4.3(5) says record (b) 'is rewritten from every payload under (4), the no-fit case included', but item (4)'s zero-or-two-marker bullet says 'applied is null and record (b) is left as it is', and D6 says a payload whose message markers 'do not number exactly one gets no message-level edit and does not touch record (b)'. The two-or-more-marker case sits inside item (4), so a literal reading of (5) rewrites the record exactly where the bullet and D6 forbid it.",
      "rationale": "One home for each fact and coherent state transitions (feature-spec standard §3): a single transition cannot carry two contradicting rules. The binding sources do not settle it — ruling 'handler inputs' covers only the zero-marker case ('A payload with no pi message marker is left alone and doesn't touch the record'), and ruling 'state homes' says only 'rewritten from every payload it handles' — so the design itself must pick one and say it once.",
      "concrete_case": "Request N on a covered route carries a foreign extension's message marker beside pi's and ends with the carrier [U, R]. Under §4.3(5) the record is rewritten to this payload's carrier or null, so the next turn's handoff either loses the carry entirely or re-arms from a different carrier; under the §4.3(4) bullet and D6 the record survives untouched and the next handoff places the carry after the fingerprint check. Two implementers following different sentences of §4.3 ship different behavior on every foreign-marker request.",
      "recommendation": "Restrict §4.3(5) to the payloads that pass the exactly-one-marker check (keeping §4.3(3)'s untouched cases out), matching D6 and the bullet — or, if advancing the record on foreign-marker payloads is intended, change D6 and the bullet instead. Add an adapter test pinning the chosen rule: a covered two-message-marker payload followed by a handoff request."
    },
    {
      "id": "S3-STRUCT-2",
      "severity": "minor",
      "location": "/Users/joelleibow/Projects/taiknr/openspec/changes/cache-point-before-recall/design.md — Module & File Placement, src/app/extension/payload-cache-state.ts row; §4.2",
      "finding": "The design places the per-session state module in app/extension but never says where the state's interface (the §4.2 recallBlock / carrier / applied shape) is declared, while every consumer is in infra: context.ts writes cell (a), the new handler and the adapter's `edit(payload, model, recallBlock, carrier)` need the carrier record's type, and instruments-response.ts reads `applied`.",
      "rationale": "Dependencies must point inward (zoom-out standard §2; the design's own opening line: 'infra translates… app/extension composes. No layer boundary moves'). A grep over src/infra finds no import of app/ today, and the repository already solves exactly this shape: InstrumentsHolder's interface is declared in src/use-cases/instruments-publisher.ts with only the factory in src/app/extension/instruments-holder.ts. The design names a type home only for `applied` ('a plain pi-free type declared here beside it', i.e. use-cases), leaving the rest of the state's contract homeless.",
      "concrete_case": "src/infra/adapters/anthropic-cache-payload.ts needs the `carrier` parameter's type for `edit`'s signature. If the only declaration is in src/app/extension/payload-cache-state.ts, the adapter and before-provider-request.ts import from app into infra, inverting the composition direction the design asserts and contradicting 'No layer boundary moves' in the same table.",
      "recommendation": "Follow the holder precedent: declare the state's plain, pi-free interface (including the applied type it already assigns to use-cases) in src/use-cases/ beside the types its consumers already import, and keep only the mutable factory in payload-cache-state.ts. One sentence in the table row fixes it."
    },
    {
      "id": "S3-STRUCT-3",
      "severity": "minor",
      "location": "/Users/joelleibow/Projects/taiknr/openspec/changes/cache-point-before-recall/design.md — Module & File Placement rows for anthropic-cache-payload.ts and src/domain/recall.ts; D5; §5.1 surrogate row",
      "finding": "One rule — 'equal to (a) after pi's lone-surrogate removal' — is split across two homes: the adapter 'owns every provider-shape fact, including the local lone-surrogate rule' while domain recall.ts gains 'the exact-equality test the adapter uses on a candidate block'. Which module applies the regex, and to which side of the comparison, is never stated.",
      "rationale": "One home for each fact (feature-spec standard §3). A normalization rule and the equality that depends on it cannot be owned by two layers without naming the composition; the natural split (regex in the adapter, raw === in domain) silently breaks the match the design promises in §5.1 ('A lone surrogate inside the block | The comparison is done after pi's rule, so it matches').",
      "concrete_case": "Recall's block contains a lone surrogate (e.g. U+D800). pi's payload build removes it from the payload-side text, but cell (a) — written by context.ts from context-side strings — still carries it. If the adapter sanitizes only the payload block and the domain test compares raw strings, no match is found on any request of that turn: no before point, no carrier recorded, and the cache loss this change exists to fix returns silently, with applied null so the figures report nothing either.",
      "recommendation": "Give the normalized-equality test one home: either the whole comparison (regex plus equality) in domain recall.ts as 'the exact-equality test', with the adapter only passing texts through, or the whole thing in the adapter with the domain row dropped — and state that the rule is applied to both sides before comparing."
    },
    {
      "id": "S3-STRUCT-4",
      "severity": "minor",
      "location": "/Users/joelleibow/Projects/taiknr/openspec/changes/cache-point-before-recall/design.md — D2 and §4.3(4) 'The budget'; proposal.md 'What Changes' bullet 2; specs/tail-recall/spec.md 'The budget decides, and pi's marker yields'",
      "finding": "The marker-budget and no-fit rule is stated in full in four artifacts — proposal, spec scenario, D2 and §4.3(4) — and the copies already disagree at the edge the S1 review forced: the proposal says 'if the wanted points exceed it the payload goes out unchanged', while design D2 says 'the request still goes out normalized' and the spec says 'apart from the carve-out's system marker… the payload goes out as it arrived'. The route predicate is similarly restated in full in D1 and the spec's requirement.",
      "rationale": "Feature-spec standard §1: 'Keep one home for each fact. Point to proposal.md or specs/ instead of restating them.' Four homes for one rule is drift already visible in the one place where the wording had to change after the carve-out ordering was fixed; every future edit to the budget must now be made four times, and the copies are the acceptance surface for different readers (proposal for the owner, spec for the verifier, design for the implementer).",
      "concrete_case": "An implementer writing the no-fit adapter test from proposal.md's bullet asserts the output deep-equals the input on pi's OAuth shape; the same test written from design §4.3(4) or the spec asserts system[0]'s marker is removed. One of the two tests fails, and which one depends on which artifact the writer happened to open.",
      "recommendation": "Make the spec scenario the single home of the budget's observable outcome; in D2 and §4.3 keep only what is the design's to decide (the count order, the normalized clone) and in the proposal keep only the intent ('at most two points inside a four-marker budget'). Reconcile the proposal's 'unchanged' to 'except the carve-out' or delete the restated detail."
    },
    {
      "id": "S3-STRUCT-5",
      "severity": "minor",
      "location": "/Users/joelleibow/Projects/taiknr/openspec/changes/cache-point-before-recall/design.md — D8; §4.4; Module & File Placement instruments-publisher.ts row",
      "finding": "D8 says 'RequestCandidate gains blockUncached from that reading', but RequestCandidate is built in requestBuilt — which fires at context_with_system (src/infra/pi-event-handlers/instruments-request.ts registers it there, and the publisher evaluates the reading immediately), before before_provider_request writes `applied`. The reading that carries `applied` is the one the message_end registrar hands over, after the candidate is already stored in `pending`.",
      "rationale": "Coherent state transitions (feature-spec standard §3): a field on a type constructed at event A cannot be sourced from a reading that exists only at event B unless the design names where the fold happens. The write-then-read transition of D8 depends entirely on this field reaching the baseline, so the sequencing is not cosmetic.",
      "concrete_case": "An implementer adds blockUncached to the candidate object literal in requestBuilt, where no applied value exists yet, and leaves it false. On a handoff turn the second request's baseline then says 'cached', blockInNewTail falls back to the ordinary rules, and the block is priced at the read rate instead of the write rate — the exact row §6.2's table and the spec scenario 'The block's charge, by placement and request' require, and the defect D8 claims to fix reappears only in the figures.",
      "recommendation": "State the fold explicitly: responseReceived reads `applied` from the message_end reading and sets blockUncached on the pending candidate before `baseline = request.candidate` and before netDollars, so PricedRequest.blockUncached and the inherited baseline value come from the same read. One sentence in D8 or §4.4 closes it."
    },
    {
      "id": "S3-STRUCT-6",
      "severity": "minor",
      "location": "/Users/joelleibow/Projects/taiknr/openspec/changes/cache-point-before-recall/design.md — top-level headers vs §4.1–§7.3 and §9 references",
      "finding": "The top-level sections carry no numbers while their subsections do, and the implied parent numbering does not match the header order: 'Contracts and data flow' is the fifth ## header but its subsections are 4.1–4.4, and 'Migration Plan' is cited as §9 though counting every ## header in order makes it the tenth. The scheme only resolves if 'Module & File Placement' is silently uncounted.",
      "rationale": "Structural completeness requires coherent numbering and cross-references (review charter). The internal references do resolve by content today — §4.3 is unambiguously the adapter contract, §9 unambiguously the Migration Plan — but an engineer counting headers to cite a section lands one off, and later artifacts (tasks.md, review rounds) will cite these numbers.",
      "concrete_case": "A tasks.md draft cites '§5.2' for the fail-open contract by counting ## headers: the fifth header is 'Contracts and data flow', whose §5.2 does not exist; the fail-open contract is in the sixth header's §5.2 ('Boundaries, failure modes, observability').",
      "recommendation": "Number the ## headers to match the subsection scheme and update every internal §-reference, or drop the parent numbers from subsection titles and reference sections by name. A mechanical edit either way."
    },
    {
      "id": "S3-STRUCT-7",
      "severity": "minor",
      "location": "/Users/joelleibow/Projects/taiknr/openspec/changes/cache-point-before-recall/design.md — §4.2 ('applied is rewritten on every call'), §4.3(6) (replays), D6",
      "finding": "`applied` is a single cell written by every before_provider_request call and read once at the response's message_end, but the design states no ordering guarantee that no other covered payload is handled between a request's edit and the response that prices it — while D6 itself concedes a replay's 'edit may differ from the original's'. The design's replay analysis covers record (b)'s idempotence but not `applied`'s exclusivity.",
      "rationale": "Brittle state transition: the fact 'what was applied to the request now being priced' has one home that any in-flight covered call can overwrite. Every other failure path in §4.1–§5.2 is ordered and tested; this window is the one write-read pair with no stated ordering.",
      "concrete_case": "Request N goes out with the carry applied (applied.carrierRead set); pi's cache warmer fires a replay of an earlier payload before N's response arrives, and the replay's handler call rewrites `applied` — after a handoff the replay places no carry, so applied.carrierRead becomes null; response N's message_end then prices the rewrite with today's start, undercharging exactly the request the edit fixed.",
      "recommendation": "State the invariant the design relies on (the warmer replays only while no request is in flight — or whatever the pi source supports), or record this window as a residual with the concrete case in the Risks section, next to the recorded five-point blind spot."
    }
  ],
  "assumptions": [
    {
      "assumption": "The design's named files and layers match the repository's actual layout and conventions: handlers in src/infra/pi-event-handlers/, adapters in src/infra/adapters/, domain and use-cases unchanged in role, and no before_provider_request or cache-payload-editing code exists today.",
      "status": "verified"
    },
    {
      "assumption": "No infra module imports from src/app/ today, and the InstrumentsHolder interface/factory split (use-cases type, app factory) is the existing precedent for shared per-session state.",
      "status": "verified"
    },
    {
      "assumption": "requestBuilt fires at context_with_system and evaluates its reading immediately, before before_provider_request runs — the sequencing premise of S3-STRUCT-5.",
      "status": "verified"
    },
    {
      "assumption": "ARCHITECTURE.md §3 currently reads 'Thirteen registrations over nine events', so the design's 'fourteen over ten' arithmetic for the docs pass holds.",
      "status": "verified"
    },
    {
      "assumption": "pi lifecycle facts cited by the design (the factory re-run per session/reload/fork at docs/extensions.md:512, :529, :1520-1530; cache-warmer replay timing; the runner's handler-error behavior) are accurate as reported.",
      "status": "unverified"
    },
    {
      "assumption": "The probe measurements N1–N8, the 132-of-132 and 152-request counts, and the dr-s2-harness run statuses are as cited; the logs under .pi/marbleization/ were not opened.",
      "status": "unverified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "tasks.md does not exist yet in the change directory; design/tasks alignment will need a later pass once tasks are drafted.",
    "The probe logs under /Users/joelleibow/Projects/taiknr/.pi/marbleization/cache-point-before-recall/ and the dr-s2-harness cases were not opened or re-run.",
    "Joel's external attribution extension and the installed pi package sources were not re-read; provider facts rely on the research reports and the binding rulings.",
    "No files were edited, no commands or model calls were made."
  ]
}