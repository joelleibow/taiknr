{
  "mode": "review",
  "lens": "council-readiness",
  "paraphrase_proposes": "tasks.md turns the approved design into 15 groups. Groups 1–14 are for the coder: a pinned type-only pi-jefferson devDependency and verbatimModuleSyntax; four domain modules; one use-case publisher with a deferred-reading contract; a holder with a no-op; a declaration adapter and a bus adapter; readings; a config switch; an observer in the scorer adapter; six publishing registrars; and wiring with session-level and load checks. Group 15 is Joel's. An Interfaces block fixes every name and signature, and a File Boundary table gives 15 source files, 15 test files and 15 modified files. Every task names a failing test first, its boundary cases and the red/green label it cites from the spike, and a scenario-coverage section maps each delta scenario to tasks and tests.",
  "paraphrase_existing": "At abaa6b0 taiknr registers seven handlers through a gated pi, and registerSessionStartHandler loads the config and hydrates the store. Recall runs at context_with_system; its scorer adapter calls ctx.modelRegistry.classify; and nothing publishes anything. tests/support/fake-pi.ts has no event bus and no projection. The suite is 22 files and 328 tests, and the check gate is lint, then typecheck, then test. pi-jefferson is not installed, and no tsconfig flag forces type-only imports.",
  "recommendation": "Ready to implement after small edits. I re-verified the base against the repo: the gate and handler shapes, the harness helpers, the root exports (buildSessionProjection, estimateTokens, createEventBus), the `4 *` and `/ 4` sites, and the file counts (15 + 15 + 15). The dollar-table arithmetic also checks out. No design decision is left to Derek. One coverage claim is not backed by a test (RDY5-1, major). The other four findings are minor wording or command fixes.",
  "findings": [
    {
      "id": "RDY5-1",
      "severity": "major",
      "location": "tasks.md — Scenario coverage (jefferson-instruments, context-figures) and 13.1",
      "finding": "The coverage section maps two scenarios to 13.1, and 13.1 names no test that proves either one. They are `jefferson-instruments` *Every new session is a fresh Jefferson* and `context-figures` *A reload or a resume starts the total again*. 6.4 says a second sessionStarted is not a case, and 13.1's tests all fire session_start once. Nothing shows the registrar builds its publisher inside the handler, and nothing is exempted the way *Shutdown clears the fields* is.",
      "rationale": "The standard fails a plan when a scenario's named proof is missing. pi rebuilds the factory per session, so the behaviour is harmless in practice, but the coverage line claims a test that does not exist.",
      "concrete_case": "A registrar that builds the publisher at registration time, outside the handler, passes every listed 13.1 case. Only the single-fire cases are listed, and the scenario's claim of a fresh publisher per start is not exercised.",
      "recommendation": "Add one 13.1 case. Fire the registered session_start handler twice on one registration with the switch on. Assert the registration is emitted twice, `holder.current()` is a different object after the second start, and the second opening post carries all four savings at 0 even after a response was published between the two. Alternatively, mark both scenarios in the coverage section as pi's runtime teardown, proved only by 6.1's opening zeroes, as *Shutdown clears the fields* is."
    },
    {
      "id": "RDY5-2",
      "severity": "minor",
      "location": "tasks.md 6.1 (first sentences of the failing-test block) vs Interfaces (`InstrumentSink.post(publication)`)",
      "finding": "6.1 says the recording sink 'receives one post per key present, in FigureKey order'. At the InstrumentSink boundary the publisher makes one `post(publication)` call per event, and a partial object is not ordered. One report per key in FigureKey order is the bus adapter's behaviour, which 9.2 tests.",
      "rationale": "Derek must guess what the publisher test asserts. It is either the keys of each Publication or a flattened order. Both are local choices, but this is a test boundary the standard says the plan must not leave to him.",
      "concrete_case": "The opening publication post reads as 'one post per key' while the sink has one `post` call carrying seventeen keys. One reading asserts `calls.length === 17`, the other `Object.keys(calls[0])`, and the two fail differently.",
      "recommendation": "Reword 6.1 to say: the sink records one `post(publication)` call per event; each call's key set equals D5's 'Written at' set; there is no ordering assertion (ordering is 9.2's). Keep the strict finiteness and boolean checks on every value in each call."
    },
    {
      "id": "RDY5-3",
      "severity": "minor",
      "location": "tasks.md 9.1 (dollar variables) and design D5",
      "finding": "The dollar variables 'render the bare signed number to four decimal places', and the plan does not say what a value that rounds to zero renders. `(-0.00001).toFixed(4)` is `\"-0.0000\"`. 9.1 asserts only 'a negative dollar figure'. The token variables have the equivalent case settled (`-0` renders `\"0\"`).",
      "rationale": "The coder must decide whether `-0.0000` is acceptable or must be normalised. That is a published display rule, not a private choice.",
      "concrete_case": "A negative request net of −$0.00001 renders `-0.0000` with plain `toFixed(4)`, and with a normalising variant it renders `0.0000`. Both pass the tests as written.",
      "recommendation": "State one rule in 9.1. The cheapest is to keep `toFixed(4)` and assert that −0.00001 renders `\"-0.0000\"`, since the sign is the point of 'signed'. Alternatively, normalise and assert `\"0.0000\"`."
    },
    {
      "id": "RDY5-4",
      "severity": "minor",
      "location": "tasks.md 9.1 vs `jefferson-instruments` *Four instruments by their full names* ('declares only the fields they read')",
      "finding": "9.1 asserts that every default format names only declared fields, which is the converse. Nothing asserts that every declared field is read by at least one instrument's variables, which is what 'declares only the fields they read' requires.",
      "rationale": "A field in TAIKNR_FIELDS that no variable reads is posted for nobody. The compiler and the finiteness checks cannot see it, because TAIKNR_FIELDS is total over FigureKey by construction.",
      "concrete_case": "Adding a field to FigureValues and TAIKNR_FIELDS without a variable passes 9.1 as written. `uncalibrated` is read only through `approx`, so a dropped `approx` read would also pass.",
      "recommendation": "Add one 9.1 assertion. Call each instrument's variables with a values object whose getters record the field read, and assert the union of reads equals the key set of TAIKNR_FIELDS. The recording values object is a test-side fake only."
    },
    {
      "id": "RDY5-5",
      "severity": "minor",
      "location": "tasks.md 14.2 and 14.4 (`git diff --name-only abaa6b0 -- src`, `git diff --name-only abaa6b0`)",
      "finding": "14.2 expects `git diff --name-only abaa6b0 -- src` to list exactly the four modified source files, and expects the new files from `git ls-files -o`. That holds only while the new files are untracked. Once Derek runs `git add` or commits after a group, the 15 new files appear in the diff and leave the untracked list. The 'exactly four' assertion then fails, and the coder has to improvise.",
      "rationale": "The check was measured only on an uncommitted tree (CB-S5-R4-3). The plan says nothing about index state, and a per-group commit is a normal way to execute it.",
      "concrete_case": "After a commit that includes `src/domain/token-estimate.ts`, 14.2's first listing shows 19 names, and `git ls-files -o` shows none of the new files.",
      "recommendation": "Use `git diff --name-only --diff-filter=M abaa6b0 -- src` for the four modified files and `--diff-filter=A` for the created ones. Compare the A list, plus `git ls-files -o --exclude-standard`, to the File Boundary's Create paths. Apply the same filter to 14.4's Markdown check."
    },
    {
      "id": "RDY5-6",
      "severity": "minor",
      "location": "tasks.md 9.2 boundary 'an emit with no listener' and 12.2 ruling-11 case",
      "finding": "Two wording points. First, 9.2's 'no listener' case runs on the fake pi, whose emit only records, so it passes for any adapter and proves nothing about the real bus. The real `createEventBus()` is exported from pi, and the session-level suite already runs every existing archive-session case with no Jefferson listener and `errors` empty. Second, 12.2 says the recorder 'holds both observer emits' and then lists three reports (deciding true, decidingItems 1, deciding false). That is two posts and three emits.",
      "rationale": "A boundary case that cannot fail is the kind of proof the standard asks the plan to avoid. The count mismatch invites an off-by-one in Derek's assertion.",
      "concrete_case": "The 9.2 no-listener case is green for an adapter that throws on a real EventBus with no handler. The 12.2 assertion `emitted.length === 2` is red against the correct three.",
      "recommendation": "In 9.2, use `createEventBus()` from pi for the no-listener case, or name the existing archive-session cases as that proof. In 12.2, say 'two observer posts, three reports'."
    }
  ],
  "assumptions": [
    {
      "assumption": "A coder commits or stages new files between groups.",
      "status": "unverified"
    },
    {
      "assumption": "createGatedPi passes every member but `on` through Reflect.get, so `pi.events` reaches the registrars unchanged.",
      "status": "verified"
    },
    {
      "assumption": "`buildSessionProjection(entries, leafId)`, `estimateTokens` and `createEventBus` are root exports of pi-coding-agent 1.5.2, and `SessionManager.appendUsage(kind, provider, model, usage)` exists.",
      "status": "verified"
    },
    {
      "assumption": "archive-session.test.ts already has `latestToolResultEntryId`, `queueNoopRun`, `guard.answer`, `guard.requests`, `afterTaiknr` and an `errors` collector. classifier-guard.ts's `writeClassifierAgentConfig(dir, fields)` spreads `fields` over the classifier pair, so `{ jeffersonInstruments: false }` layers.",
      "status": "verified"
    },
    {
      "assumption": "The `4 *` and `/ 4` sites at abaa6b0 are exactly `context.ts:63` and the `// 4.` comment at `agent-before-settle.ts:46`.",
      "status": "verified"
    },
    {
      "assumption": "The dollar-table rows 1, 2, 8 and 15 and the retry sequence's −$0.05916 reproduce by hand from D8's formulas.",
      "status": "verified"
    },
    {
      "assumption": "The Create (15 + 15), Modify (4 + fake + 7 tests + 3 config files = 15) and Delete (none) counts match the Interfaces and Create tables.",
      "status": "verified"
    },
    {
      "assumption": "Registration order and the six publishing event shapes behave as the earlier rounds measured in a mktemp copy.",
      "status": "unverified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "pi-jefferson 0.14.0's Registration and Report type shapes. The package is not installed, so the declaration adapter's exact `Registration<\"taiknr\">` fields were not checked against its types.",
    "Execution of the plan. I read it and spot-checked repo symbols and arithmetic, and ran no test, build or load check.",
    "The research-eleanor, research-chidi, owner-rulings and the four delta specs other than the jefferson-instruments and context-figures requirement and scenario lists. I took the settled rulings as given.",
    "Whether Biome's formatter accepts the long single-line task text and the Interfaces comments. The tasks are Markdown and are not linted."
  ]
}