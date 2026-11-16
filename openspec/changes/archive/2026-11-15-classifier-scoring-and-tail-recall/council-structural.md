{
  "assumptions": [
    {
      "assumption": "The living development-checks spec already excludes a repository-root live script from the test include, the lint allowlist and the ts program, as the proposal claims",
      "status": "verified"
    },
    {
      "assumption": "registerContextHandler's locked dependency object at HEAD is {config: SessionConfig holder, store, notifier, recallCache} with no scorer and no branch member",
      "status": "verified"
    },
    {
      "assumption": "createPiJevScorerAdapter's locked signature takes an ExtensionContext (which exists only per event) and a static TaiknrConfig, not the holder",
      "status": "verified"
    },
    {
      "assumption": "pi's context-usage figure undercounts after a context_edit, per Joel's own 2026-11-15 request note ('that concern'), and that fix is out of scope (D2)",
      "status": "verified"
    },
    {
      "assumption": "An extension can read the active request's token estimate, the model's reserveTokens/compaction threshold, or the active branch with its context_edits",
      "status": "unverified"
    }
  ],
  "findings": [
    {
      "concrete_case": "A stubbed session (context_edit present), decisionThreshold 0, and the 51,064-char largest item from Joel's archive: the bound computed from the undercounted estimate passes, the real request exceeds the window, and overflow recovery runs — the exact lasting damage T9 exists to prevent, in the feature's primary use case.",
      "finding": "The size-bound requirement rests on extension-readable platform facts no artifact verified, and its consequence clause is an absolute guarantee the mechanism cannot deliver.",
      "id": "F1",
      "location": "specs/tail-recall/spec.md, ADDED Requirement 'Recall stops before the host's compaction threshold'",
      "rationale": "The requirement mandates stopping before 'the host's compaction threshold — the model's context window less its reserved tokens', resting on 'the host's own size estimate', but no research (Chidi §1/§3, Michael Q3(b), T9) names an extension API for the per-request token estimate, reserveTokens, or the threshold itself — only the catalog model's contextWindow. Separately, the clause 'so no request this change builds triggers the host's overflow recovery' is stated as a SHALL-level guarantee resting on a figure Joel's own ruling says undercounts after a context_edit (D2) — and stubbing works via context_edit, so the undercounted estimate is the one used in exactly the sessions recall targets.",
      "recommendation": "Hold this requirement until Chidi's addendum (size-bound access) lands; reword the clause to what the mechanism actually guarantees ('under the token estimate available to the handler') or drop the absolute consequence, and record the residual overflow risk against D2 rather than claiming it away.",
      "severity": "major"
    },
    {
      "concrete_case": "An off → /tree → on sequence (D14) leaves stale items in the store; if the design cannot reach the branch at event time and trusts store contents instead, the spec scenario 'An item from a branch the user left' fails — a stale item's raw text is appended to a live request on the wrong branch's content.",
      "finding": "The yield requirement needs branch and context_edit access at event time, but the locked registrar dependencies carry no branch member and no research names the extension API for it.",
      "id": "F2",
      "location": "specs/tail-recall/spec.md, ADDED Requirement 'Recall yields to edits taiknr did not write and to items off the branch'",
      "rationale": "S9 requires, per scored item, that its entry be on the active branch and its latest context_edit there be taiknr's stub. At HEAD, registerContextHandler's dependency object is {config, store, notifier, recallCache} — no branch accessor — and its shape is locked by D8. Whether ctx.sessionManager or any other event-time member exposes the active branch and per-entry context_edits is unverified in every artifact.",
      "recommendation": "Hold until Chidi's addendum (branch access) lands. If no extension API exposes it, the design must not touch the archive half to work around it (the change excludes the archive write path); flag the constraint back to Michael rather than smuggling branch state into the store.",
      "severity": "major"
    },
    {
      "concrete_case": "A stale off-branch store (D14) holding 20 items next to 31 live ones: every scored key sends 20 dead questions (~160 input tokens each, Michael Q6) on every new user message forever — cost grows with the store, not the branch, contradicting the branch-linear framing Q6's acceptance rested on. Or, if the design filters pre-scoring, a test written to 'three items, one call' fails whenever one of the three is ineligible.",
      "finding": "Two requirements in the same delta disagree on the scored set: 'one bool question for every item in the archive' versus the yield rule that leaves off-branch and redacted items out — the specs never say whether ineligible items are scored.",
      "id": "F3",
      "location": "specs/tail-recall/spec.md, ADDED Requirement 'One call asks one bool question per archived item' vs the 'Recall yields…' requirement",
      "rationale": "The one-call requirement says questions cover every archive item; the yield requirement says ineligible items 'SHALL be left out silently' — of recall, but scoring status is unstated. Michael's Q6 cost analysis assumed scoring all items, but its 'growing linearly with the branch' framing (D5) is only true if ineligible items are filtered before scoring; a stale off-branch store (D14) makes the store strictly larger than the active branch.",
      "recommendation": "Settle the boundary before design: make eligibility a pre-scoring filter with one home (a single adapter function owning the branch-plus-latest-edit rule), and reword the spec to 'every eligible item' — or explicitly state ineligible items are scored but never recalled. One owner question below covers the cost acceptance this changes.",
      "severity": "major"
    },
    {
      "concrete_case": "T6: another extension asks to continue at settlement → the run continues with the same latest user message after taiknr committed new items → the cache hits → the new items are never scored until the next user message; a reviewer reading the spec cannot tell whether that violates a requirement.",
      "finding": "The cache-reuse requirement already decides invalidation semantics ('SHALL reuse that scoring while the archive is unchanged') while O2 leaves whether invalidation happens — and the RecallCache shape change it requires — open.",
      "id": "F4",
      "location": "specs/tail-recall/spec.md, ADDED Requirement 'Recall is scored once per latest user prompt' (reuse clause) vs proposal.md 'Open Questions' O2",
      "rationale": "The spec's 'while the archive is unchanged' condition is a behavior commitment, but RecallCache's locked shape {lastPromptKey, lastRecalledIds} has no member recording archive change, so the condition is unenforceable without the shape change O2 itself gates behind 'a shape change takes one more delta'. The spec and the open item give the designer contradictory mandates: one promises invalidation, the other permits none.",
      "recommendation": "Pick one owner before design: either the spec owns invalidation (name its trigger — e.g. store size/version at score time — and enumerate the RecallCache shape delta now) or delete the 'while the archive is unchanged' clause and hand the whole question to O2.",
      "severity": "major"
    },
    {
      "concrete_case": "A future edit to development-checks' credential rule (e.g., covering a new provider env var) leaves tail-recall's restated 'no model or classifier request' silently stale; the tail-recall capability is then archived carrying a divergent copy of the rule.",
      "finding": "The no-live-call rule is restated across two capabilities: tail-recall's testing requirement restates development-checks' 'no live model or classifier call is made'.",
      "id": "F5",
      "location": "specs/tail-recall/spec.md, ADDED Requirement 'Recall is tested without a classifier call…' vs openspec/specs/development-checks/spec.md, test-command requirement",
      "rationale": "One home for each fact: the living development-checks spec already owns 'the suite makes no live model or classifier call', and the proposal itself acknowledges it ('its requirement… already covers the test side'), yet the delta restates the rule. Two living homes for the same rule drift apart when either spec is later amended.",
      "recommendation": "Keep in tail-recall only the facts development-checks does not own (credential clearing from the environment, the scripted classifier, scripting a 'no'); cross-reference the no-live-call rule instead of restating it.",
      "severity": "minor"
    },
    {
      "concrete_case": "A designer resolving the config question by building the adapter once in taiknr.ts at factory time: no ExtensionContext exists there, so the signature forces a hack — or the adapter is built with a config snapshot resolved at load, and the event-time read the tail-recall spec and AGENTS.md require is silently violated.",
      "finding": "The proposal's module placement never says where createPiJevScorerAdapter is constructed, and its locked inputs force a per-event construction site the Impact list omits.",
      "id": "F6",
      "location": "proposal.md, 'Impact' (pi-jev-scorer-adapter.ts and context.ts bullets)",
      "rationale": "createPiJevScorerAdapter(ctx: ExtensionContext, config: TaiknrConfig) takes a per-event context (there is no ExtensionContext at factory time) and a static TaiknrConfig, while the spec requires the model and timeout to be read from the session's resolved config at event time. The only signature-preserving placement is construction inside the context handler, per event, from the holder's event-time resolution — but the Impact on src/app/extension/taiknr.ts names only 'the real notifier, and reuse of the existing RecallCache instance', and O1 covers only the notifier, leaving this site unnamed.",
      "recommendation": "The design should name it: the scorer adapter is built per event inside registerContextHandler from the config holder's event-time read; state it once so the composition root is not handed a snapshot.",
      "severity": "minor"
    },
    {
      "concrete_case": "A notice fired from a getCtx closure whose runner went inactive between the failure and the read throws at runner.js L626–629, so a recall failure surfaces as an extension error instead of the one warning Joel chose (Q4 → (a)).",
      "finding": "Committing createOncePerSessionNotifier to the composition root forces a getCtx indirection across the factory/event boundary — a brittle shared-mutable-state bridge — where a simpler per-factory-call closure exists.",
      "id": "F7",
      "location": "proposal.md, 'Impact' (pi-notifier-adapter.ts bullet); michael-orientation.md T7 and open item O1",
      "rationale": "The proposal wires the real notifier in the composition root with a getCtx that must return the current event's ctx (T7). That is a mutable ctx cell spanning the factory and event lifetimes; holding a stale ctx throws, because the ctx.ui getter asserts the runner is active. The registration closure inside registerContextHandler is equally per-factory-call (D13) and can hold the warned flag directly, with a per-event thin notifier carrying the live ctx — no cross-boundary cell, no staleness guard to write.",
      "recommendation": "In settling O1, the design should weigh the handler-closure variant against the locked adapter; if the composition-root placement stands, the design must state the getCtx cell's lifetime and its stale-ctx guard explicitly, since a silent variant here becomes a thrown extension error.",
      "severity": "minor"
    },
    {
      "concrete_case": "A design records default 500 ms citing 'the measured round trip'; the next reviewer cannot distinguish 500, 1000, or 3600 as compliant, because 241–361 ms with no recommended value anchors nothing — and a default below the 361 ms observed max (e.g. 300) would fail open on a routine call.",
      "finding": "The timeout default is anchored to 'a measured classifier round trip' that explicitly recommends no value, leaving what counts as 'measured' unverifiable.",
      "id": "F8",
      "location": "specs/configuration/spec.md, ADDED Requirement 'The classifier call's timeout is a field…'; research-chidi.md addendum",
      "rationale": "The measurement (median 241–248 ms, max 361 ms, 10 sequential calls, one time of day) ends 'no timeout value is recommended' and 'not a tail-latency estimate'. The spec says the default is 'the value the design records from a measured classifier round trip', so any number can claim lineage from the range, and nothing calibrates the choice (e.g., headroom over the observed max, or a round number with recorded reasoning).",
      "recommendation": "Have the design record the derivation rule alongside the number (e.g., 'N× the observed max, rounded'), so the default is checkable against the measurement instead of merely adjacent to it.",
      "severity": "minor"
    }
  ],
  "lens": "council-structural",
  "mode": "council",
  "not_checked": [
    "ADR texts 0001–0006 were read only through Eleanor's and Michael's summaries, not directly",
    "The living archive-stubbing and branch-hydration specs were read only via Eleanor's report, not directly",
    "ARCHITECTURE.md, README.md and AGENTS.md current text (their correction is a post-implementation docs pass, S11, and blocks nothing here)",
    "No design.md or tasks.md exist yet — this council runs pre-design",
    "Joel's session files under ~/.pi/agent (read only by Michael; not re-examined here)"
  ],
  "owner_questions": [
    {
      "options": [
        "Eligible items only: one filter owns branch membership plus latest-edit authorship, and questions cover only what can be recalled — cost grows with the active branch, as Q6's acceptance assumed",
        "Every store item is scored and eligibility is applied only at recall — simpler data flow, but cost grows with the whole store including stale off-branch items, diverging from the branch-linear framing Q6 accepted"
      ],
      "question": "When the store holds items that are not recallable (off a branch you left via off → /tree → on, D14's stale store, or redacted by another extension), does the classifier still score them? This changes what your Q6 cost acceptance actually covered: Q6 accepted ~$0.0002 per call 'growing linearly with the branch'; scoring stale items makes it grow linearly with the store instead.",
      "recommended_option": "Eligible items only",
      "why": "It keeps the cost inside what Q6's acceptance described (branch-linear), never sends questions about content that can never be recalled, and gives the eligibility rule one home that the spec, the cost model and the tests all cite. The store-wide variant bills forever for items that are dead by construction."
    }
  ],
  "paraphrase_existing": "",
  "paraphrase_proposes": "",
  "recommendation": "Proceed to design, but amend the tail-recall delta first: the size-bound and yield requirements each rest on extension-readable platform facts that were pending with Chidi at review time, the scored set (every store item vs eligible items) is undecided, and the cache-invalidation clause claims a behavior its locked shape cannot enforce. The layering itself (S10) is clean and the separation of responsibilities holds; the risks are spec-level ambiguities and two unnamed construction/wiring sites, not architectural ones."
}