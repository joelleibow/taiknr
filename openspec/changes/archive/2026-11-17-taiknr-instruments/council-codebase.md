{
  "mode": "council",
  "lens": "council-codebase",
  "paraphrase_proposes": "",
  "paraphrase_existing": "",
  "recommendation": "Proceed to design. The proposal matches live code in every file area I checked (seven handlers, session-start with no await, readEligibleArchivedIds, the frozen scorer adapter signature, the notifier built inside the context handler, pi.events on ExtensionAPI, 22 test files), so the four instruments are buildable as described. Four corrections must land while the design is written: (1) reword the 'differences from HEAD' list, because all four enumerated differences already exist at abaa6b0 and only (5) is real; (2) give contained publishing exactly one named reporting destination plus a test, or a frozen instrument becomes indistinguishable from a stale one; (3) name the home and test for pi's projection re-anchor rule, which the host does not export; (4) name the seam that carries the classifier's own usage and cost, which no permitted difference currently covers.",
  "findings": [
    {
      "id": "CB-1",
      "severity": "blocking",
      "location": "openspec/changes/taiknr-instruments/specs/extension-packaging/spec.md §Handler signatures and the import boundary are preserved → Scenario: Signatures unchanged",
      "finding": "All four enumerated contract differences (1)-(4) are already true at abaa6b0, so the scenario as written cannot pass when the finished tree is compared with HEAD.",
      "rationale": "registerSessionStartHandler(pi, store, session) already takes the per-session holder (src/infra/pi-event-handlers/session-start.ts:14); both dependency objects already type config as SessionConfig (src/infra/pi-event-handlers/turn-end.ts:8-15, context.ts:33-39); ConfigPaths.projectConfigPath is already string | undefined (src/config/taiknr-config.ts:28-33); and the context handler already builds its notifier internally (context.ts:41) instead of taking one. AGENTS.md records the third parameter as an existing enumerated exception, and the living spec carries the same stale wording, which this delta copies forward while adding (5).",
      "concrete_case": "A design or a reviewer runs the comparison the scenario names and reports four diffs that are not diffs. A coder told 'difference (1) is permitted' may believe the holder still has to be added, or may 'clean up' by removing the holder wiring that setEnabled and the gate depend on.",
      "recommendation": "Reword the scenario to compare against commit abaa6b0 and state (1)-(4) as 'already in the baseline and unchanged', leaving (5) as this change's only permitted difference. Fix the living spec's copy in the same pass so the next delta does not inherit it again."
    },
    {
      "id": "CB-2",
      "severity": "major",
      "location": "specs/jefferson-instruments/spec.md §Publishing cannot cost stubbing or recall; specs/context-figures/spec.md §A figure is never non-finite",
      "finding": "Publishing must be contained, but no artifact says where a contained failure is reported, and the repository's only failure conventions are a thrown error and one once-per-session notice.",
      "rationale": "AGENTS.md states the convention: a handler builds every value before it mutates, 'so an unexpected throw reaches Pi's extension error channel'. notifyOnce (src/infra/adapters/pi-notifier-adapter.ts) fires once per session and ADR 0002 ties it to classifier failure, so reusing it would spend recall's only notice. src/ holds no console or logger call at all, and Jefferson's fault ledger can only report a registration or report taiknr actually emitted, in TUI mode only and deduped once per session (T10).",
      "concrete_case": "The extension's context goes stale after a session replacement; every later pi.events.emit throws (loader.js:426-430); containment swallows each throw, so taiknr.context keeps the previous session's numbers on screen for the rest of the session while the session harness's bindExtensions({onError}) array stays empty and no notice ever appears.",
      "recommendation": "The design names one containment point and its report — a distinct once-per-session ui.notify ('taiknr: instruments — <field> not updated (<reason>)') or one console.error line — and adds a test where events.emit throws: recall still returns its messages and exactly one report is made. Add the matching triage rows to the README (see CB-11)."
    },
    {
      "id": "CB-3",
      "severity": "major",
      "location": "specs/context-figures/spec.md §Six figures, each taken from its own source → Scenario: Total context comes from the persisted projection",
      "finding": "The rule the scenario names ('re-anchored at each response's usage') is pi's estimateProjectedContextTokens, which the host does not export, so taiknr must reimplement the rule itself.",
      "rationale": "The host's exports map has only '.' and './rpc-entry' (node_modules/@earendil-works/pi-coding-agent/package.json:14-22), and the root re-export list from ./core/compaction omits estimateProjectedContextTokens, estimateContextTokens and ContextUsageEstimate (dist/index.d.ts:6). Only estimateTokens, calculateContextTokens, getLastAssistantUsage, buildSessionProjection and DEFAULT_COMPACTION_SETTINGS are reachable.",
      "concrete_case": "An implementer reaches for getContextUsage().tokens, the only public number, and gets pi's 38-41 % low fallback after every settlement — exactly the defect this change exists to fix — or writes the 'usage counts only when it is newer than the latest context_edit or compaction' comparison from memory with no test, so a later pi change silently breaks it.",
      "recommendation": "Name the home (e.g. src/infra/adapters/, since it needs branch entries and projections) and the rule in the design, with a test that a usage older than the latest context_edit is ignored and a newer one is authoritative. Keep pi's characters-÷-4 in the one helper T16 asks for beside it."
    },
    {
      "id": "CB-4",
      "severity": "major",
      "location": "tests/support/fake-pi.ts:21-34",
      "finding": "The shared handler fake exposes only on, getSettings and marker. Once session_start or a handler publishes, the fake has no bus, and because publishing must be contained the resulting throw is invisible, so a broken publish passes every handler test.",
      "rationale": "createFakePi is the single helper behind all seven handler test files (session-start.test.ts:68-70 and the rest). The session harness collects only errors that reach bindExtensions({onError}), which a contained throw never does (tests/app/extension/archive-session.test.ts:168-170).",
      "concrete_case": "Publishing from context_with_system under a createFakePi-driven test: pi.events is undefined, the throw is contained, the handler still returns its messages, so the recall assertion passes while zero fields were posted. Without containment the same change breaks every active-session handler test at once.",
      "recommendation": "Extend tests/support/fake-pi.ts with an emits: {channel, payload}[] recorder, and add two cases: fields posted on an active session, and a throwing events.emit that leaves recall's messages intact and reports once. Keep the session-level test to 'what crossed the bus', as the context-figures spec already says."
    },
    {
      "id": "CB-5",
      "severity": "major",
      "location": "src/infra/adapters/pi-jev-scorer-adapter.ts:33-90; src/use-cases/ports.ts:10-16; specs/extension-packaging/spec.md §Signatures unchanged (5)",
      "finding": "Net dollars must subtract each classify result's reported cost (Q2(a)), and that cost exists only inside score(); the port returns RelevanceScore[] | undefined, createPiJevScorerAdapter(ctx, config) is frozen, and permitted difference (5) covers only §O2's in-flight observation.",
      "rationale": "ClassifierResult.usage?: Usage exists (pi-ai/dist/types.d.ts:513-523) and today nobody reads it. A wrapper around RelevanceScorer in infra sees scores only, because the usage sits one level below the port; and the permitted-difference list freezes both the port contract and the adapter's constructor signature apart from §O2's member.",
      "concrete_case": "The design answers §O2 the recommended way with an infra wrapper, builds the in-flight flag, and then cannot publish a net dollar figure at all — or adds a third argument to createPiJevScorerAdapter and ships an unlisted contract difference that the 'Signatures unchanged' scenario reports as a violation.",
      "recommendation": "Extend difference (5) explicitly to the cost hand-off — an optional third parameter such as onClassified(usage), or a lastUsage reader on the adapter object the handler already owns — and add its scenario to the tail-recall delta. See the owner question below."
    },
    {
      "id": "CB-6",
      "severity": "major",
      "location": "proposal.md §Impact (Code); specs/configuration/spec.md §One reader; specs/jefferson-instruments/spec.md §The switch is read in one place",
      "finding": "The proposal places 'the second condition in src/app/extension/', which is the gate, while the two specs require one reader and forbid any publishing handler from testing the switch. A gate condition would stop staging, settlement, hydration and recall.",
      "rationale": "createGatedPi's wrapper is the only inertness point today (src/app/extension/handler-gate.ts:12-23) and session.isActive() is ready && enabled (src/config/session-config.ts:26-28). J8 says staging, settlement, hydration and recall must be unaffected, and the configuration delta's scenario 'The switch is not the enabled switch' would fail under a gate condition.",
      "concrete_case": "A user sets the instruments switch to false; under a gate condition the archive stops being stubbed and recall stops appending that session, and the delta's own scenario asserting both are unaffected fails.",
      "recommendation": "The design states the single reader is registerSessionStartHandler, which chooses between a real and a no-op publisher handed to the existing handlers; handler-gate.ts and SessionConfig.isActive() stay untouched. Correct the proposal's Impact line in the same pass."
    },
    {
      "id": "CB-7",
      "severity": "major",
      "location": "specs/context-figures/spec.md §One ratio per model",
      "finding": "k is voided only when the session's provider or model changes, but a /tree jump can land on a branch whose newest valid usage belongs to another model, and nothing samples again until the next response arrives, so the figures read calibrated while badly off.",
      "rationale": "session_tree is already registered and re-hydrates the archive (src/infra/pi-event-handlers/session-tree.ts), ModelChangeEntry exists in the session format, and Chidi measured ratios of 0.58-0.70 on Anthropic against 0.90-0.99 on OpenRouter/deepseek. The flag can then never say 'not yet calibrated', because a sample is present.",
      "concrete_case": "k = 0.61 from claude/opus; a /tree jump onto a branch last used with deepseek/deepseek-v4.1-flash; every figure on taiknr.context and taiknr.savings is about 60 % of the truth with the calibrated flag set, until the next assistant response lands.",
      "recommendation": "Add a scenario and resample at session_tree (session start already seeds; session_compact can keep k because the ratio is model-level), reusing the branch walk that pairs each sample by message.provider and message.model, which getLastAssistantUsage cannot do alone because it returns only a Usage."
    },
    {
      "id": "CB-8",
      "severity": "minor",
      "location": "specs/context-figures/spec.md §The same estimator on both sides",
      "finding": "pi's estimateTokens is ceil(chars/4) per message with images at 4800 chars, system sections and tool JSON counted; the per-request figures are computed from bare strings (rawText, stub, recall block) and the host exports no string estimator, so a second rule can drift from the first.",
      "rationale": "repacked compaction.js:203-252 shows ceil for every role and estimateTextAndImageContentChars for content; T16 already says the characters-÷-4 rule is about to get a second home beside context.ts's 4 * (...) inversion.",
      "concrete_case": "withheld computed with floor(chars/4) while history before uses estimateTokens' ceil: the two disagree by a token per archived item, so withheld minus stubbed minus recalled no longer equals history-before minus context-in-turn once the archive holds a few hundred items — on the one screen Joel is watching.",
      "recommendation": "One exported text→tokens helper in domain, with a test pinning its output to estimateTokens on a one-text-block user message, and the per-request figures built only through it."
    },
    {
      "id": "CB-9",
      "severity": "minor",
      "location": "specs/context-figures/spec.md §An invalid response is not a sample",
      "finding": "MessageEndEvent fires for user, tool-result and custom messages too, and its result may replace the message; the sample-validity scenarios cover aborted, error, zero usage and type:'usage' entries but not a non-assistant firing.",
      "rationale": "pi's EventBus wrapper awaits any returned value and MessageEndEventResult.message replaces the finalized message (dist/core/extensions/types.d.ts:868-871, 1141-1144); pi's own validity rule is applied to assistant messages only.",
      "concrete_case": "A message_end publisher samples a tool-result message's absent usage, or samples a sub-agent's assistant message for a different provider and voids k; a handler that returns a value lets pi replace a message.",
      "recommendation": "State the role filter as part of the validity rule ('an assistant message only') and require the handler to return nothing."
    },
    {
      "id": "CB-10",
      "severity": "minor",
      "location": "proposal.md §Impact (Dependencies); specs/extension-packaging/spec.md §The lockfile carries it",
      "finding": "The devDependency must be installed from pi-jefferson@0.14.0; Joel's checkout declares version 0.1.1 (Chidi A5), and npm install --save-dev with that path would write a file: spec into devDependencies and the lockfile.",
      "rationale": "pi-jefferson is absent from node_modules and from package-lock.json today, .gitignore holds *.tgz, and package.json has no version, so the pack-then-install route needs an explicit tarball name.",
      "concrete_case": "A coder following 'add the devDependency' literally from ~/.pi/agent/settings.json produces \"pi-jefferson\": \"file:../../Projects/pi-jefferson\"; a clean checkout then cannot install, and the spec's 'lockfile carries pi-jefferson and the packages it brings' scenario cannot hold.",
      "recommendation": "Name the exact command in the design (npm install --save-dev pi-jefferson@0.14.0, or the packed tarball with --save-dev pi-jefferson-0.14.0.tgz) and state the expected lockfile delta: pi-jefferson and lodash-es."
    },
    {
      "id": "CB-11",
      "severity": "minor",
      "location": "specs/jefferson-instruments/spec.md §The documentation explains what stubbing does to pi's measurement; README (§O8 docs pass)",
      "finding": "Nothing tells a user how to tell 'taiknr registered nothing' from 'rows render but never move' from 'numbers move but look wrong', and the archive instrument's source is an optimistic store that a /reload can silently correct.",
      "rationale": "Q3(a) makes the off or rejected case visible only as Jefferson's TUI-only 'not a known instrument' warning at start; AGENTS.md records that one throwing draft discards a whole boundary, so the store can hold items the branch never received; the README's existing classifier section is the precedent for spelling out what a user cannot see.",
      "concrete_case": "A boundary is discarded because a sibling extension's draft throws after taiknr already drained its items into the store; taiknr.archive shows 3 items, a /reload shows 0, and neither the README nor any notice says which number was right.",
      "recommendation": "Add a three-row triage table beside the README's example instrument rows (rows warn at start → nothing registered, check the session-start rejection; rows render but never move → a contained publish failure; figures move but look wrong → read the estimate flag, then the model) and one sentence where the archive instrument is described saying the store is an optimistic cache a /reload can change."
    }
  ],
  "assumptions": [
    {
      "assumption": "registerSessionStartHandler(pi, store, session) already takes the per-session holder at abaa6b0 (src/infra/pi-event-handlers/session-start.ts:14).",
      "status": "verified"
    },
    {
      "assumption": "registerTurnEndHandler's and registerContextHandler's dependency objects already type config as SessionConfig, and the context handler already builds its notifier internally.",
      "status": "verified"
    },
    {
      "assumption": "ConfigPaths.projectConfigPath is already string | undefined.",
      "status": "verified"
    },
    {
      "assumption": "The extension registers exactly seven events, asserted by tests/app/extension/taiknr.test.ts with a fake whose only member is `on`, and `pi.events: EventBus` is on ExtensionAPI.",
      "status": "verified"
    },
    {
      "assumption": "The session-start handler has no await, so a registration emitted there precedes its first await.",
      "status": "verified"
    },
    {
      "assumption": "src/ contains no console or logger call; the only failure surfaces are the thrown session-start rejection and the once-per-session notifier.",
      "status": "verified"
    },
    {
      "assumption": "estimateProjectedContextTokens and estimateContextTokens are not exported from the host root, and the host's exports map allows only '.' and './rpc-entry'.",
      "status": "verified"
    },
    {
      "assumption": "ClassifierResult.usage?: Usage exists and the scorer adapter ignores it.",
      "status": "verified"
    },
    {
      "assumption": "tests/support/fake-pi.ts exposes only on, getSettings and marker, and the session harness collects errors only through bindExtensions({onError}).",
      "status": "verified"
    },
    {
      "assumption": "The test tree holds 22 *.test.ts files and vitest collects only tests/**/*.test.ts.",
      "status": "verified"
    },
    {
      "assumption": "pi-jefferson is absent from node_modules and from package-lock.json today, so the 'loading without the package installed' scenario describes the live state.",
      "status": "verified"
    },
    {
      "assumption": "Whether console.error output from an extension is visible inside pi's TUI (Chidi did not trace it).",
      "status": "unverified"
    }
  ],
  "owner_questions": [
    {
      "question": "Where does a contained publish failure report, given that publishing must never cost recall or stubbing?",
      "options": [
        "One ui.notify per session through its own notifier, separate from recall's once-per-session notice",
        "One console.error line per session carrying the field name and reason",
        "Nothing: the last posted value stands and only the user's own watching reveals it"
      ],
      "recommended_option": "One ui.notify per session through its own notifier, separate from recall's once-per-session notice",
      "why": "It is the channel the existing tests already assert on (the console spies in session-start.test.ts:101-103 prove silence, ui.notify is what recall's own failure uses), it works in every mode Jefferson and pi have in common, and a separate notifier keeps ADR 0002's 'at most once per session' promise intact for the classifier. The console option depends on Chidi's untraced question of whether stderr is visible in the TUI, and silence leaves a frozen instrument indistinguishable from a stale one."
    },
    {
      "question": "May permitted difference (5) extend to the seam that carries the classifier's own usage and cost, which Q2(a)'s net dollar figure needs?",
      "options": [
        "Yes: an optional third parameter on createPiJevScorerAdapter (or a lastUsage reader on the adapter the handler owns)",
        "No: add a member to the RelevanceScorer port instead",
        "Drop the classifier netting from this change and publish gross dollars"
      ],
      "recommended_option": "Yes: an optional third parameter on createPiJevScorerAdapter (or a lastUsage reader on the adapter the handler owns)",
      "why": "It leaves the port contract and recall's use case untouched, exactly as the extension-packaging spec intends, while making Q2(a) computable from the ClassifierResult.usage that already exists. The port option widens the frozen contract the design was told to preserve, and dropping the netting contradicts Joel's Q2(a)."
    }
  ],
  "not_checked": [
    "Jefferson's own source at v0.14.0 (read-only, another repository); I relied on research-chidi.md for the contract shapes, the fault ledger and the registration timing.",
    "The 22/328 test baseline: I counted 22 test files but did not run npm test.",
    "The cost of calling sessionManager.buildSessionProjection() on every publishing event, which Michael's orientation also left untimed.",
    "pi's provider paths other than Anthropic and OpenAI-completions: whether usage.input excludes cached tokens there.",
    "Whether Biome's lint/style/useImportType warning is actually emitted under this repository's configuration (relied on Michael's M6).",
    "Whether an extension's console.error output is visible in pi's TUI.",
    "The contents of ~/.pi/agent/pi-taiknr.json and ~/.pi/agent/pi-jefferson.json (outside the repository; Chidi read the latter).",
    "Whether .pi/ctx-check.mjs and .pi/ctx-calib.mjs remain accurate once the instruments change what taiknr reads."
  ]
}