{
  "assumptions": [
    {
      "assumption": "`.envrc` is already gitignored on this branch and was never tracked",
      "status": "verified"
    },
    {
      "assumption": "pi's runner swallows a `before_provider_request` handler's throw, so fail-open is the only safe path",
      "status": "verified"
    },
    {
      "assumption": "the `before_provider_request` handler receives the extension context and can read the current model selection, so route scoping is implementable",
      "status": "verified"
    },
    {
      "assumption": "the publisher's baseline `Block` fact (which message carried the block) is recorded at request time, before `before_provider_request` runs, so it can be the one shared home for identification",
      "status": "verified"
    },
    {
      "assumption": "README line 40 today claims the provider re-caches the recalling turn once from its user message, and `netDollars` today prices the block read-when-warm-in-prefix / write-otherwise",
      "status": "verified"
    },
    {
      "assumption": "the dollar rule depends on the read/write split only through `warm` (M2)",
      "status": "verified"
    },
    {
      "assumption": "recall's classifier requests pass through `before_provider_request` in a shape the handler can safely no-op on (unchecked per orientation §6)",
      "status": "unverified"
    },
    {
      "assumption": "Joel relaxes his attribution extension's guard for message-level points before this change serves his route (his edit, outside this repo)",
      "status": "unverified"
    },
    {
      "assumption": "Bedrock and the other gateways behave as documented, not measured (no credentials; accepted per Q3(a))",
      "status": "unverified"
    }
  ],
  "findings": [
    {
      "concrete_case": "Warm recalling turn: request 1 carries the block and the provider bills it as plain input (the point sits before it); request 2 carries it again and the provider bills a cache write (M5, trap 10). Living rule: request 2 is warm and the block's message lies inside what request 1 carried, so the block is priced at the read rate. Delta scenario `The block is charged where it was billed`: write. The same request prices differently under two requirements of one spec.",
      "finding": "The delta modifies \"Dollar savings are net of cache rewrites and of recall's classifier spend\" but leaves the sibling living requirement \"A saving is priced at the rates the request's own response reported\" untouched. That untouched requirement still fixes recall's block price: \"at the read rate when its message lies inside what the last priced request carried, and at the write rate after it or on a cold request.\" The delta's new block billing — input on the first request, write on the second — contradicts it on the second request of a warm recalling turn, so the merged spec would carry two disagreeing rules for the same term.",
      "id": "STRUCT-1",
      "location": "openspec/changes/cache-point-before-recall/specs/context-figures/spec.md (MODIFIED Requirements) vs openspec/specs/context-figures/spec.md, requirement \"A saving is priced at the rates the request's own response reported\"",
      "rationale": "One home for each fact: a spec that merges two conflicting pricings for recall's block cannot be implemented or tested, and the design cannot satisfy both requirements.",
      "recommendation": "Add a MODIFIED entry for \"A saving is priced at the rates the request's own response reported\" that narrows its recall-block sentence to defer the block term to the net-dollars rule (or restates it in the new billing), so the block's price has exactly one home before design starts.",
      "severity": "blocking"
    },
    {
      "concrete_case": "OpenRouter `anthropic/claude-haiku-4.5`, first request after a recalling turn, warm (M5: read 6,799 / write 3,514). The response's usage carries no position and OpenRouter carries no cache diagnostics, so the requirement's start cannot be observed there. If a 1-hour entry expired in the same window, the provider's real rewrite started earlier than any fact taiknr holds, and a change-position estimate under-charges it.",
      "finding": "The MODIFIED requirement text commits the dollar rule to \"the rewrite charged SHALL be the one the provider performed … from the earliest position the provider re-wrote,\" but that start position is unobservable on a covered route. Usage splits carry no position (M2), and the only position-bearing signal — cache diagnostics — is Claude-direct-only and best-effort, absent from OpenRouter (Chidi [D]). This pre-decides the estimate-vs-measure question the orientation leaves open (§4, §6), and the two wordings inside the delta already disagree (header: \"the provider re-wrote\"; scenario 1: \"the provider could not read\").",
      "id": "STRUCT-2",
      "location": "openspec/changes/cache-point-before-recall/specs/context-figures/spec.md, MODIFIED requirement \"Dollar savings are net of cache rewrites and of recall's classifier spend\", header text and scenarios \"The charge starts where the provider's rewrite started\" / \"A warm request after taiknr's own change\"",
      "rationale": "A requirement bound to an unobservable fact will not survive implementation: the handler/publisher can compute the position of taiknr's own change from its baseline, but not the provider's rewrite start, and a coinciding TTL expiry makes the two diverge.",
      "recommendation": "Word the rule on what taiknr can know — the delta's own \"the earliest position the provider could not read,\" i.e. the position of taiknr's change — keep estimate-vs-measure as an explicit open decision (owner question below), and record the TTL-coincidence residual wherever the rule is stated.",
      "severity": "major"
    },
    {
      "concrete_case": "A Bedrock session after this change still rewrites the poisoned prefix every recall (trap 12). The README's instruments section (lines 112–114) says the dollars are net of the rewrite taiknr caused; a reader on Bedrock cannot learn the figure understates there, so the README misinforms on exactly the routes Joel's Q3(a) ruling names.",
      "finding": "The \"under-reporting is recorded\" deliverable — Joel's own Q3(a) wording, restated in the proposal — is carried by no requirement or scenario in any delta. No artifact names where the record lives (which document, which section), and the tail-recall record requirement only covers the README's recall paragraph and the new ADR.",
      "id": "STRUCT-3",
      "location": "openspec/changes/cache-point-before-recall/proposal.md (\"their under-reporting is recorded\") vs specs/tail-recall/spec.md and specs/context-figures/spec.md deltas",
      "rationale": "A binding ruling with no home in the spec means it either gets dropped silently at implementation or gets written wherever is convenient, twice.",
      "recommendation": "Give the record one home now: a scenario under the context-figures ADDED requirement (or the tail-recall record requirement) naming the document and section that states the figure understates on routes the fix does not reach, tied to the estimate-vs-measure decision.",
      "severity": "major"
    },
    {
      "concrete_case": "A user pastes text beginning `<recalled_context` into an earlier message; a text-matching handler moves markers onto that message and the real block still poisons the prefix. Conversely, sanitized text defeats an exact match and no point is placed at all.",
      "finding": "Every scenario in the tail-recall delta presupposes \"the message that carries the block,\" but no delta or artifact fixes how that message is identified, and the only payload-native source is unsafe: the marker is the `<recalled_context` text, which surrogate sanitization can alter (trap 8), which prefix matching can find in user-pasted text, and which sits mid-history in Joel's own session (364 `custom_message` entries against 102 user messages; recall targets the newest role-`user` message, never \"the last message\").",
      "id": "STRUCT-4",
      "location": "openspec/changes/cache-point-before-recall/specs/tail-recall/spec.md, ADDED requirement \"A recall block does not cost the turn its cached prefix\"; orientation §6 open question on identification",
      "rationale": "Misidentification breaks the byte-identity guarantees the same delta states: a false positive edits a message that carries no block; a false negative leaves the measured loss in place.",
      "recommendation": "Pin identification to the one shared home the orientation already names: the publisher's baseline `Block` fact (message index, timestamp, text — instruments-publisher.ts:106-119,184-203), recorded at `requestBuilt` before `before_provider_request` runs, never a re-match of payload text; state it in the design as the single source.",
      "severity": "major"
    },
    {
      "concrete_case": "A session on the `opencode` provider (unmeasured gateway) sends the same Anthropic-shaped body as direct Anthropic; only `ctx.model`'s provider id distinguishes it. The handler predicate is `provider === \"anthropic\"` or `provider === \"openrouter\"` with an `anthropic/*` model id; the spec's four-route list cannot be that predicate.",
      "id": "STRUCT-5",
      "finding": "The covered-route fact is stated as a four-route enumeration, but the handler needs a provider/model predicate, and Joel's attribution route is indistinguishable from Anthropic-direct-OAuth at the provider level (same provider id; his extension lives outside the repo). The predicate will otherwise be restated across the handler, the tests, and the README.",
      "location": "openspec/changes/cache-point-before-recall/specs/tail-recall/spec.md, ADDED requirement \"Only routes with a measured result change\"; proposal Impact \"Provider-facing behaviour\"",
      "rationale": "One home for each fact: the enumeration is the requirement, but the machine-readable predicate must live once so tests and docs derive from it instead of transcribing it.",
      "recommendation": "Verified implementable: the `before_provider_request` handler receives the extension context and can read `ctx.model` (pi runner.js `createContext`, `emitBeforeProviderRequest(event, ctx)`). Design should name one canonical predicate (one module) and let the enumeration, tests and README cite it.",
      "severity": "minor"
    }
  ],
  "lens": "council-structural",
  "mode": "council",
  "not_checked": [
    "No measurement or probe was re-run; M1–M9 are taken as cited evidence from the orientation.",
    "Chidi's out-of-repo citations (pi-ai `anthropic-messages.js` marking and sanitization lines, the attribution extension's guard) were not independently re-verified; only `runner.js` (handler contract, fail-open) and `sdk.js` were read.",
    "Joel's session JSONL and the upbuild-dev session (M8) were not inspected; the exact −$0.0215/−$0.3449 readings remain unreconstructed.",
    "Whether recall's classifier requests pass through `before_provider_request` is unchecked (orientation §6); the delta's no-op requirement covers the behavior, not the fact.",
    "No design.md or tasks.md exists yet (council stage); module placement was reviewed only at the proposal's Impact level — new-file naming and the ADR number stay open for the design.",
    "No files were edited; read-only inspection."
  ],
  "owner_questions": [
    {
      "options": [
        "(a) Estimate the charged rewrite from the position of taiknr's own change (its baseline), keep one route-independent mechanism, and record the under-reporting on unreached routes plus the TTL-coincidence residual in the README",
        "(b) Measure the charged rewrite from what the response reports, so the figure prices the real rewrite on every route",
        "(c) Hybrid: measure where diagnostics exist (direct Anthropic, best-effort) and estimate elsewhere"
      ],
      "question": "How does the dollar rule size the rewrite it charges — estimate from taiknr's own change, or measure from what the response reports? (Orientation §4/§6 leaves this to the council; the delta's wording currently pre-decides \"the one the provider performed.\")",
      "recommended_option": "(a)",
      "why": "Estimating from the change position is the only mechanism that works identically on all covered routes: no response on OpenRouter reports a rewrite position, cache diagnostics are Claude-direct-only and best-effort, and billing reported cache writes wholesale would charge writes taiknr did not cause on every turn's first request. It keeps one home for the rule, and Joel's Q3(a) already accepts recorded under-reporting. Michael leans (b) — his lean should be answered with this feasibility evidence before design commits."
    },
    {
      "options": [
        "(a) This card guards recall's block only; the settlement-stub class is recorded as a priced residual and becomes its own card if it bites",
        "(b) The payload guard targets the earliest change taiknr caused inside the cached prefix, block or fresh stub"
      ],
      "question": "Does the payload guard cover the whole class of taiknr's in-prefix changes, or recall's block only? (Orientation §6 leaves open whether the next-turn point targets the earliest change — block or fresh stub; Michael leans yes, trap 13.)",
      "recommended_option": "(a)",
      "why": "The measured evidence covers the block (M1, M4–M6); the stub case is 2k–18k per event with unmeasured frequency, and covering it adds a second fact family — stubbed tool-result messages — to the handler's identification seam, broadening this card's scope beyond the proposal. Joel's measured-evidence principle points the same way; (b) stays available as a small follow-up card if the residual bites."
    }
  ],
  "paraphrase_existing": "",
  "paraphrase_proposes": "",
  "recommendation": "Proceed to design only after the context-figures delta is repaired: as drafted it merges a contradiction into the living spec (STRUCT-1, blocking). Resolve the two decisions the orientation leaves open — estimate-vs-measure for the charged rewrite (owner question 1) and whether the payload guard covers the stub class (owner question 2) — and give the under-reporting record and the block-identification predicate one named home each. The payload-handler placement (one handler under src/infra/pi-event-handlers/, gated, composed in taiknr.ts), the route scoping (ctx.model is observable at before_provider_request), and the .gitignore/ADR deliverables are structurally sound and evidence-backed."
}