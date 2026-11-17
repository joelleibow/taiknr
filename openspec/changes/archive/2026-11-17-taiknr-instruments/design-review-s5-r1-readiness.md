{
  "mode": "review",
  "lens": "council-readiness",
  "paraphrase_proposes": "tasks.md orders 15 groups: pin pi-jefferson and turn on verbatimModuleSyntax, then four domain modules, the per-session publisher, the holder, a shared fake, the Jefferson declaration and bus adapter, the readings, the config switch, recall's observer and block report, six publishing registrars, the wiring, and Joel's live look. Each task names its failing test first, its boundary cases, the redgreen-derek label (A1–A12) and the spec scenarios it proves. A File Boundary lists 30 created files and 13 modified. It claims the design fixes every name and the coder chooses nothing.",
  "paraphrase_existing": "At abaa6b0 taiknr registers seven handlers. A gated pi proxy makes six of them inert unless session config is ready and enabled, and session_start is ungated and assigns config. registerContextHandler takes {config, store, recallCache} and builds createPiJevScorerAdapter(ctx, config) per request. TaiknrConfig has six fields, and its full-object literals are repeated in several tests. The factory test uses a proxy that throws on any ExtensionAPI member other than on. The suite is 22 files and baseline 328 tests, and the session harness writes agentDir config and isolates PI_CODING_AGENT_DIR.",
  "recommendation": "Revise before Implement. Fix the cross-layer signatures (F1), the domain exports and the domain/port placement contradiction (F2), the File Boundary's missing test files (F3), the unreachable red in 14.3 (F4) and the unproven usage-entry scenario (F5). The dependency order, the dollar arithmetic (rows 1, 2, 8, 13–15 and the −$0.05916 retry sequence were recomputed), the Markdown exclusion, the verified existing paths and symbols, and the 30-created/13-modified counts all hold.",
  "findings": [
    {
      "id": "RDY-1",
      "severity": "blocking",
      "location": "tasks.md, intro paragraph \"Names the design fixes…\" and tasks 6.1–6.7, 9.1, 9.2, 10.1, 13.1–13.6, 8.1",
      "finding": "The plan says nothing else is chosen by the coder, but several cross-layer seams that tests are written against are not fixed anywhere. (a) createInstrumentsPublisher(deps): the members of deps are unstated. (b) The signature of responseReceived: D3 says only usage, cost, provider and model go eagerly, but D7 and D8 row (4) need stopReason too. It is not listed as eager, and the plan does not say whether it sits in ResponseReadings. (c) ResponseReadings and the shape of SessionStartedReadings' per-pair samples are undeclared. (d) The dependency objects of the six registerInstruments<Event>Handler functions are undeclared. (e) createJeffersonBusAdapter's parameter (pi or pi.events) and what it returns are undeclared, and so are createJeffersonInstrumentsDeclaration's and buildFieldReport's arguments and return values. (f) The option name for the new buildSessionProjection on fake-pi's context stub is undeclared.",
      "rationale": "Implementation-readiness standard §1 requires public names, exports and boundary contracts to be decided before Implement. These are the contracts between use-case, infra and app, and every test-first task asserts on them.",
      "concrete_case": "The coder writes `registerInstrumentsSessionStartHandler(gatedPi, { …, sink: createJeffersonBusAdapter(pi) })` in taiknr.ts, and the adapter reads `pi.events` on construction. The factory test's proxy (tests/app/extension/taiknr.test.ts) throws \"unexpected ExtensionAPI member: events\", and the extension-packaging spec says the factory never reads pi.events. Nothing in tasks.md says the adapter is built inside the session_start handler. Separately, a coder who passes stopReason through the deferred reading and one who passes it eagerly make 6.3's row (4) tests incompatible.",
      "recommendation": "Add one \"Interfaces\" block to tasks.md that states: the createInstrumentsPublisher deps members; the exact parameter lists of the six publisher methods and of reportRecalled/started/finished, including where stopReason sits; the field lists of ResponseReadings and SessionStartedReadings; each registrar's (pi, deps) shape; the createJeffersonBusAdapter parameter, with a statement that it is built inside the session_start handler and never in the factory; the declaration and report-builder signatures; and the fake-pi projection option."
    },
    {
      "id": "RDY-2",
      "severity": "major",
      "location": "tasks.md 3.1–3.2, 4.1–4.3, 5.1 and the File Boundary rows for src/domain/*",
      "finding": "The domain modules have no exported function names or signatures, except tokenEstimate and the Pair type. Task 5.1 uses readRate, writeRate, inputRate, grossDollars, rewriteCharge and netDollars as terms, not as exports. Task 3.2 also contradicts 3.1 on layering: 3.1 says context-figures.ts imports token-estimate.ts and the ArchivedToolOutput shape only, but 3.2 says the same module reads \"the ArchiveStore port's getAll() and size()\". ArchiveStore lives in src/use-cases/ports.ts.",
      "rationale": "Domain tests are written first against exports that nobody has named. A domain module may not import src/use-cases (design Module & File Placement; ADR 0001), so the 3.2 wording cannot be followed literally.",
      "concrete_case": "Taken literally, 3.2 puts `import type { ArchiveStore } from \"../use-cases/ports.js\"` in src/domain/context-figures.ts, which breaks the layer rule. The alternative is to take ArchivedToolOutput[] as a parameter and have the publisher call getAll()/size(). Choosing between them is a design decision the coder is left with.",
      "recommendation": "Name the domain exports and signatures: the six-figure and saving functions, stub matching, archive totals over ArchivedToolOutput[], the calibration seed/select/flag functions, and the dollar functions. Rewrite 3.2 so the domain takes plain items and the publisher reads the port."
    },
    {
      "id": "RDY-3",
      "severity": "major",
      "location": "tasks.md File Boundary (Modify) and 11.1",
      "finding": "The Modify list omits files that go red or fail typecheck once TaiknrConfig gains the required member jeffersonInstruments. tests/config/session-config.test.ts:9 and tests/app/extension/handler-gate.test.ts:8 are full `TaiknrConfig` literals without the new member (TS2741). tests/config/taiknr-config.test.ts:233 asserts `toEqual` on the whole resolved object, which then gains an extra property. Task 11.1 says \"the rest of the file's tests unchanged and green\".",
      "rationale": "Standard §2 requires every file the change modifies to be listed. The gate (npm run check, tsc over tests/**) is red at the end of 11.1 until these are edited. context.test.ts and pi-jev-scorer-adapter.test.ts spread DEFAULT_TAIKNR_CONFIG and are unaffected.",
      "concrete_case": "After 11.1 the command `tsc --noEmit` reports TS2741 in session-config.test.ts and handler-gate.test.ts. `vitest` fails the toEqual at taiknr-config.test.ts:233, whose expected object lacks `jeffersonInstruments: true`.",
      "recommendation": "Add tests/config/session-config.test.ts and tests/app/extension/handler-gate.test.ts to Modify (add `jeffersonInstruments: true` to each literal). Add the :233 toEqual update to 11.1 and drop the \"rest unchanged\" claim."
    },
    {
      "id": "RDY-4",
      "severity": "major",
      "location": "tasks.md 14.3 and 14.1",
      "finding": "Task 14.3 claims a failing-test-first red \"before the wiring (no listener sees the bus)\". The wiring is task 14.1, which lands earlier. At 14.3 the test is already green when written, so the claimed red cannot be observed in the stated order.",
      "rationale": "Standard §3 and §4: the failing behavioral test must precede the production code it proves, and tasks are ordered by dependency.",
      "concrete_case": "The coder finishes 14.1, which puts the six registrars into taiknr.ts, then writes the 14.3 listener test in archive-session.test.ts. It passes on first run, and the plan's red claim is false.",
      "recommendation": "Write the archive-session listener test inside 14.1 before the taiknr.ts wiring, or add a mutation step: comment out one registrar call, show 14.3 red, then restore it. State which."
    },
    {
      "id": "RDY-5",
      "severity": "major",
      "location": "tasks.md 10.1 and Scenario coverage (context-figures, first bullet; jefferson-instruments \"Placement stays the user's configuration\" and \"Jefferson's own code is untouched\")",
      "finding": "The scenario \"A usage entry of its own kind is not a sample\" is cited to task 10.1, but no named case builds a branch carrying a `usage` entry (type \"usage\", the cache-warm kind; UsageEntry exists in session-manager.d.ts). 10.1's test list names error, aborted and zero-usage assistant messages only. Two other jefferson-instruments scenarios are listed as test-proven by 9.1, 9.2 and 13.1 but have no assertion or review check.",
      "rationale": "Standard §3: a scenario no test proves fails the plan unless it is marked Joel's.",
      "concrete_case": "The coder implements seeding by scanning every branch entry for usage and never filters by entry type. All 10.1 cases pass, but a cache_warm usage entry on a resumed branch could seed a bogus k.",
      "recommendation": "Add to 10.1 a branch holding a `usage` entry of kind cache_warm beside a valid assistant message, expecting the seed to come from the assistant message only. Add a 14.2 review check for the \"no host file / Jefferson untouched\" scenarios."
    },
    {
      "id": "RDY-6",
      "severity": "minor",
      "location": "tasks.md 1.2",
      "finding": "The task says the probe rewritten as `import type { Registration, type Report }` compiles. TypeScript rejects an inline `type` modifier inside an `import type` statement (TS2206), so the stated green form is itself an error.",
      "rationale": "The task asserts a check outcome that will not occur. Derek's probe used `import { Registration, type Report }` for the red, and the green form is `import type { Registration, Report }`.",
      "concrete_case": "The coder follows 1.2 literally and sees TS2206 where the task promises a clean compile.",
      "recommendation": "Correct the green form to `import type { Registration, Report }`."
    },
    {
      "id": "RDY-7",
      "severity": "minor",
      "location": "tasks.md 1.1 (\"npm ci in a fresh copy of the archive\") and 14.4",
      "finding": "The load check says to export HEAD, or \"a tree of the working copy the same way\" if HEAD lacks the change. It gives no command for the working-copy export. The package-lock is uncommitted during implementation, so `git archive HEAD` cannot carry it. 14.4 also does not require rerunning the positive control against the finished code. Only Derek's spike ran it.",
      "rationale": "Standard §3: a check relied on to catch a mistake must show it catching one. The export method is a coder decision.",
      "concrete_case": "The coder runs `git archive HEAD` with the change uncommitted, so the copy has no pi-jefferson, no new registrars and the old lockfile. The load check passes vacuously.",
      "recommendation": "State the working-tree export command (for example `git ls-files -co --exclude-standard` into a temp dir) and require the one-invalid-line positive control in 14.4."
    },
    {
      "id": "RDY-8",
      "severity": "minor",
      "location": "tasks.md 6.2 and 12.2 (Scenarios)",
      "finding": "\"Recall's block in usage but not in history\" is cited as a `context-figures` scenario proven by tests. It is a README (docs) scenario under the jefferson-instruments requirement on documentation.",
      "rationale": "A docs scenario is outside tasks.md (Bambadjan's pass). Citing it as test-proven overstates coverage.",
      "concrete_case": "A reviewer checking the 6.2 coverage line finds no such scenario in specs/context-figures/spec.md.",
      "recommendation": "Remove it from the 6.2 and 12.2 citations. Let 6.2 and 12.2 cite \"A recall turn leaves total context alone\" and \"Recall subscribes…\" for the publisher and report halves."
    },
    {
      "id": "RDY-9",
      "severity": "minor",
      "location": "tasks.md group 15.1",
      "finding": "Task 15.1 has Joel edit his own pi-jefferson.json, copying rows from a README example that the post-approval docs pass writes. That is a post-merge action, which standard §4 puts in design.md's Migration Plan (hand-off 2). The observation tasks 15.2–15.5 are legitimate owner-observed items.",
      "rationale": "Post-merge actions are excluded from tasks.md, and 15.1 depends on a document that does not exist during Implement.",
      "concrete_case": "The conductor reads group 15 at implementation sign-off and finds 15.1 blocked on the README.",
      "recommendation": "Drop 15.1 from tasks.md, since the Migration Plan already holds it. Keep 15.2–15.5 as Joel's."
    },
    {
      "id": "RDY-10",
      "severity": "minor",
      "location": "tasks.md 9.2, 13.1 and 13.1's `rg` check",
      "finding": "Three small gaps. (a) There is no explicit production rule of no console.* and no logger, and no \"log fields: none\" statement, although earlier plans in this repo state it per standard §5. (b) 13.1 does not say how \"before the first await\" is observed. (c) \"`rg` finds jeffersonInstruments read nowhere else in src/\" is ambiguous, because taiknr-config.ts defines it.",
      "rationale": "Standard §5, and the zero-decision rule for the checks.",
      "concrete_case": "A coder adds console.error in the bus adapter's catch, which would corrupt TUI/JSON output. A coder who fires the handler and awaits it before asserting proves nothing about the first await.",
      "recommendation": "Add to the 'How this plan is executed' section: \"no console.*, no logger; the bus adapter catches silently\". In 13.1, say the test calls the handler without awaiting and asserts the recorder synchronously. Make the rg check read: `rg jeffersonInstruments src/` matches only src/config/taiknr-config.ts and src/infra/pi-event-handlers/instruments-session-start.ts."
    }
  ],
  "assumptions": [
    {
      "assumption": "The existing paths and symbols the plan cites exist: taiknr.ts, context.ts, handler-gate.ts, pi-jev-scorer-adapter.ts, taiknr-config.ts, fake-pi.ts, ports.ts (ArchiveStore getAll/size), formatRecalledContext, appendRecalledContextToMessages, and pi's buildSessionProjection, estimateTokens and EventBus.emit. The ctx.model shape and the other pi event names are those pi's types.d.ts declares.",
      "status": "verified"
    },
    {
      "assumption": "The file counts hold: the 22 existing test files, 30 created (15 src plus 15 tests) and 13 modified. registerContextHandler has one caller in src and one in tests, and createPiJevScorerAdapter's optional third parameter keeps its existing ~20 test call sites compiling.",
      "status": "verified"
    },
    {
      "assumption": "The dollar-table rows I recomputed hold: rows 1, 2, 8, 13, 14, 15 and the −$0.05916 retry sequence.",
      "status": "verified"
    },
    {
      "assumption": "pi runs one event's handlers in registration order and catches each separately, so the registrars' placement after the existing ones holds.",
      "status": "unverified"
    },
    {
      "assumption": "The baseline of 328 tests and the claim that the existing code compiles under verbatimModuleSyntax.",
      "status": "unverified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "I ran no command (no bash tool), so the 328-test baseline, verbatimModuleSyntax over the existing tree, and the TS2206 claim in RDY-6 are inferred from the artifacts and TypeScript's rules, not executed.",
    "I did not read pi-jefferson's published types or loader.js and did not install the package. I checked the Registration/Report names and the field and variable declarations only against the design.",
    "I did not audit research-eleanor.md, research-chidi.md, owner-rulings.md or the council files beyond what the design cites.",
    "I did not execute the red/green proof or the load check."
  ]
}