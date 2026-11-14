{
  "mode": "council",
  "lens": "council-critic",
  "paraphrase_proposes": "",
  "paraphrase_existing": "",
  "recommendation": "Proceed to design, but it must first settle five cost and failure points. (1) There is no Biome file scope. With the `biome init` baseline, `biome check` lints the PoC files and the conductor's `.pi/` files, and `--write` would rewrite them; fixing this is blocking. (2) Each candidate Biome baseline reformats different existing source files. That cost was measured from the files, but no candidate was run through Biome. (3) No lockfile or package manager is chosen, so the spec's 'clean tree after install' scenario fails as written. (4) The load check and the 'seven events registered' check have no automatable pass/fail signal. A recording-fake test of the default export, run inside `npm run check`, is cheaper and stronger. (5) Biome, vitest and TypeScript versions were never measured; pin the majors that get measured. On the open question, the ruling does not pick a community. My recommendation is Pi's own Biome config (reading b), with `files.includes` narrowed to this package. It is the cheapest of the three to adopt against the current source and matches the people who would adopt the package. Joel should confirm it.",
  "findings": [
    {
      "id": "CR-1",
      "severity": "blocking",
      "location": "specs/development-checks/spec.md, 'Biome configuration follows community practice' and 'One check command runs lint, type-check and test'; proposal.md Open Questions (biome init: 'no files.includes, VCS integration off')",
      "finding": "The specs exclude the proof-of-concept files from `tsc` and from the test run, but nothing limits which files Biome sees. Under the `biome init` baseline (no `files.includes`, VCS off), `biome check .` lints and format-checks `jev-context-poc.ts`, `test-jev-poc.mjs`, and the conductor-owned `.pi/marbleization/foundation-and-packaging/{council,orientation,research,chidi-addendum,proposal-specs}.js`. `.pi/` is excluded only through `.git/info/exclude`. Whether Biome's `useIgnoreFile` reads that file is unverified.",
      "rationale": "Michael §2 says the change must neither edit the PoC files nor re-decide `.pi/`. A `format`/`lint:fix` script on the community pattern (`biome check --write`, Chidi addendum §5) would rewrite both. Pi's and rpiv-mono's `check` scripts also run `--write` (Chidi addendum §5), so copying them makes `check` itself rewrite files.",
      "concrete_case": "Derek runs `npm run check` with an init-style `biome.json` and `lint: biome check .`. Biome reports format and lint diagnostics in `test-jev-poc.mjs` and `.pi/marbleization/.../council.js`, and the check exits non-zero on files the change may not touch. If the check or format script uses `--write`, those files are silently rewritten in place.",
      "recommendation": "Add a requirement: the Biome scope is an explicit `files.includes` covering only `src/**`, `tests/**` and the root config files. That is the Pi-ecosystem pattern and the pattern in about half of GitHub configs (Chidi addendum §2–§3). Biome must never see the PoC files or `.pi/`, whatever VCS ignore handling does. Add a scenario: `.pi/` and the PoC files are not reported by `npm run lint`. `check` and `lint` run without `--write`; any `--write` script uses the same narrowed scope."
    },
    {
      "id": "CR-2",
      "severity": "major",
      "location": "proposal.md Open Questions (baselines a/b/c); specs/extension-packaging/spec.md 'Signatures unchanged' scenario",
      "finding": "The three baselines differ in reformatting cost on the existing tab-indented source, and the design has not costed them. Measured with grep over `src/`: 33 lines exceed 80 columns, none exceed 120, and indentation is tabs throughout. At `lineWidth` 80 (reading a), Biome wraps lines in about 15 files. That includes the signature lines of `registerSessionStartHandler`, `registerSessionTreeHandler` and `registerSessionCompactHandler` (session-start.ts:4, session-tree.ts:4, session-compact.ts:4; 92+ chars). Reading c, 'space is the more common explicit setting', re-indents every line of all 20 source files. At `lineWidth` 120 (reading b), no line needs wrapping, but the multi-line `import type { SessionBoundaryDraft, SessionEntry, TurnEndEvent }` in `pi-archive-adapter.ts:1-5` probably collapses to one line.",
      "rationale": "'Only the stub bodies differ' cannot hold under reading a if the formatter is applied, and `check` fails under any reading if it is not. The choice of baseline is therefore also a choice of diff size and of whether a spec scenario is violated. Neither research report measured this; Michael says 'no vitest/Biome run'.",
      "concrete_case": "The design picks init defaults (lineWidth 80). `npm run check` fails on session-start.ts:4 with a format diff. Running `biome format --write` to fix it rewraps the `registerSessionStartHandler(_pi: ExtensionAPI, _store: ArchiveStore): void` signature onto several lines, so the 'Signatures unchanged' comparison with HEAD fails.",
      "recommendation": "Before committing to a baseline, the design should run `biome check` for each candidate config in a `git archive` temp copy, as Michael did for `tsc`, and record how many files each would reformat. State whether this change applies a one-time format pass. If it does, change 'only the stub bodies differ' to 'only stub bodies and formatter whitespace differ; parameter lists and types are unchanged'."
    },
    {
      "id": "CR-3",
      "severity": "major",
      "location": "specs/development-checks/spec.md 'A fresh install leaves the working tree clean'; proposal.md What Changes (.gitignore)",
      "finding": "No package manager or lockfile policy is stated. `npm install` creates `package-lock.json`, and the proposed `.gitignore` (`node_modules/`, `*.tgz`, `.DS_Store`) does not ignore it, so the scenario 'git status reports no new untracked files' fails unless the change commits the lockfile. The two siblings disagree: pi-omlx's `.gitignore` ignores `package-lock.json`, while pi-jefferson commits `pnpm-lock.yaml`.",
      "rationale": "The scenario is stated as a hard check, but its result depends on a decision nobody has made. Whether the lockfile is committed also decides whether the tool versions in CR-5 are reproducible.",
      "concrete_case": "Fresh clone, run `npm install`, then `git status`: it shows `?? package-lock.json`, so the 'Install does not dirty the tree' scenario fails on its first run.",
      "recommendation": "The design names the package manager. The scripts and the 'npm run check' wording already assume npm. The design then either commits `package-lock.json` in this change (npm's documented default, and it makes the Biome/vitest/TS pins reproducible) or ignores it, and cites the community source per the standing principle. Change the scenario to 'no untracked files after the committed lockfile is in place'."
    },
    {
      "id": "CR-4",
      "severity": "major",
      "location": "specs/extension-packaging/spec.md 'The extension entry loads without error' (scenarios 'Load check passes', 'Seven events registered')",
      "finding": "No check has been specified that produces a pass/fail signal for either scenario. Michael's measurement of `pi -ne -e <repo> --help` recorded the printed 'Failed to load extension' message (Trap 1, Trap 3), not the exit code, so an exit-code check may pass on a broken load. 'Seven events registered' has no test or command at all. `tsc` accepts any valid event name (types.d.ts:1229-1269 lists 40+ overloads), so it cannot catch a wrong but valid name.",
      "rationale": "Neither check is in `npm run check`, so later cards get no regression guard against a stub that throws again or registers the wrong event.",
      "concrete_case": "session-tree.ts registers `pi.on(\"session_before_tree\", () => {})` instead of `session_tree`. `tsc` passes (overload at types.d.ts:1240), the extension loads, and `pi --help` prints nothing. Both scenarios are reported as passing. Separately, a script like `pi -ne -e . --help && echo ok` might print ok even with a throwing stub, because the load error may only be printed (exit code unmeasured).",
      "recommendation": "Add a vitest test that calls `taiknr` (default export) with a recording fake `{ on(event, h) { calls.push(event) } }` cast to `ExtensionAPI`. It asserts exactly the seven event names, one each, and that the call does not throw. All Pi imports in `src/` are `import type` (grep confirms), so this runs in plain Node inside `npm run check`. Keep the `pi -e` and `packages`-route runs as manual acceptance steps and assert on output text (no 'Failed to load extension', no 'Host-provided extension packages' warning), not on exit code."
    },
    {
      "id": "CR-5",
      "severity": "major",
      "location": "proposal.md What Changes (Biome and vitest tooling); michael-orientation.md 'Not covered by this pass'; research-chidi.md §6",
      "finding": "Nothing has measured the new tooling. Measured so far: `tsc` with typescript 5.9.3 and `node --test`. Not measured: vitest resolving the `.js`→`.ts` specifier chain (S6 depends on it), any Biome run, and the versions an unpinned install would choose today: typescript 7.0.2 (TS 7 is a major release; Chidi §6 has its compatibility as unverified), vitest 5.1.0 (Pi pins 4.1.12), Biome 2.6.7.",
      "rationale": "The spec's `.js`-specifier and type-check scenarios cite Michael's measurement, but that measurement used different tools and versions from the ones the change installs.",
      "concrete_case": "`npm i -D typescript vitest @biomejs/biome` installs typescript 7.0.2 and vitest 5.1.0. The design's claim that `tsc --noEmit` reports zero errors rests on a 5.9.3 run. If TS 7 reports a new error in the stubs or under `nodenext`, or vitest fails to resolve `../domain/archived-output.js`, `check` fails and the spec's evidence no longer applies.",
      "recommendation": "Pin the majors that get measured: `typescript` `^5.9.3` unless TS 7 is measured, `vitest` at the measured major, and Biome exact (`-E`, per Biome's install docs) with `$schema` set to that version. The design should run `npm run check` once in a `git archive` temp copy and cite that run as its evidence."
    },
    {
      "id": "CR-6",
      "severity": "minor",
      "location": "michael-orientation.md S6; specs/development-checks/spec.md 'Domain and use-case tests run without a Pi runtime'",
      "finding": "S6 lists `shouldArchive`, `buildStub`, `selectRecalledIds` and `formatRecalledContext` as existing pure functions to test. `buildStub` (archived-output.ts:25) and `formatRecalledContext` (recall.ts:19) still throw 'Not implemented'. Only `shouldArchive` and `selectRecalledIds` have bodies.",
      "rationale": "A first test written against a throwing stub cannot assert behaviour. It either fails or tests the throw, which then blocks the card that implements the function.",
      "concrete_case": "The first test imports `buildStub` and asserts a one-line stub. `npm test` fails with 'Not implemented: buildStub'.",
      "recommendation": "The design names `shouldArchive` and/or `selectRecalledIds` as the first-test targets, and the spec says 'an implemented pure function'."
    },
    {
      "id": "CR-7",
      "severity": "minor",
      "location": "specs/development-checks/spec.md 'Check fails on a lint error'",
      "finding": "'A file violates a Biome rule → `npm run check` exits non-zero' holds only for rules at error severity. By default `biome check` exits 0 on warnings. rpiv-mono adds `--error-on-warnings` (Chidi addendum §5) precisely because of this.",
      "rationale": "The scenario as written is either false, or forces a flag choice the design hasn't named.",
      "concrete_case": "A warn-severity recommended rule fires (for example an unused import, if it is warn-level in 2.6.7; unverified). `biome check` prints the warning and exits 0, so the scenario fails as written.",
      "recommendation": "Either add `--error-on-warnings` to `lint`, citing rpiv-mono, or narrow the scenario to 'violates an error-severity Biome rule'."
    },
    {
      "id": "CR-8",
      "severity": "minor",
      "location": "owner-rulings.md Q1(a) wording `pi.on(...)`; specs/extension-packaging/spec.md 'Signatures unchanged'",
      "finding": "The handler parameters are named `_pi` (for example session-start.ts:4, context.ts:7). Writing `pi.on(...)` as in Q1(a) means renaming the parameter, which changes the signature line the 'only the stub bodies differ' scenario compares against HEAD.",
      "rationale": "This is a small text conflict between the ruling's shorthand and the spec scenario. It is easy to fix but will trip a literal reviewer.",
      "concrete_case": "Derek renames `_pi` to `pi` in seven files. A reviewer diffing against HEAD sees seven changed signature lines and fails the scenario.",
      "recommendation": "Keep the `_pi` name and call `_pi.on(\"<event>\", () => {})`. Rename to `pi` only together with CR-2's loosened wording."
    },
    {
      "id": "CR-9",
      "severity": "minor",
      "location": "proposal.md tsconfig `types: [\"node\"]`; research-chidi.md addendum §3 (Pi's vitest config uses `globals`)",
      "finding": "If the vitest config copies Pi's `globals: true`, test files that call `describe` or `it` without importing them fail `tsc --noEmit`, because `types` is `[\"node\"]` only and `tests/**/*.ts` is included.",
      "rationale": "The settled tsconfig and a community-typical vitest option interact. Neither artifact mentions the interaction.",
      "concrete_case": "vitest.config.ts sets `globals: true` and tests/recall.test.ts uses bare `describe`. `npm run typecheck` fails with 'Cannot find name describe'.",
      "recommendation": "Tests import `describe`, `it` and `expect` from \"vitest\" explicitly, with no `globals`. This needs no tsconfig change."
    }
  ],
  "assumptions": [
    {
      "assumption": "Every `@earendil-works/pi-coding-agent` import in `src/` is `import type`, so a test that invokes the default export runs without the Pi runtime installed at runtime.",
      "status": "verified"
    },
    {
      "assumption": "The existing `src/` is tab-indented, with 33 lines over 80 columns and none over 120.",
      "status": "verified"
    },
    {
      "assumption": "Biome's formatter collapses the multi-line import specifiers in pi-archive-adapter.ts:1-5 at lineWidth 120 (Prettier-compatible behaviour).",
      "status": "unverified"
    },
    {
      "assumption": "Biome `vcs.useIgnoreFile` does not read `.git/info/exclude`, so `.pi/` would be scanned even with VCS integration on.",
      "status": "unverified"
    },
    {
      "assumption": "`pi --help` exits 0 when an extension fails to load and only prints the error.",
      "status": "unverified"
    },
    {
      "assumption": "vitest 5 resolves `.js` specifiers to `.ts` sources from TS importers.",
      "status": "unverified"
    },
    {
      "assumption": "Some Biome 2.6.7 recommended rules are warn severity, so they do not fail `biome check` without `--error-on-warnings`.",
      "status": "unverified"
    },
    {
      "assumption": "`ExtensionAPI.on` has no catch-all string overload, so a misspelled event name fails `tsc` (types.d.ts:1229-1269 read; the lines after 1269 were not read).",
      "status": "unverified"
    },
    {
      "assumption": "pi-omlx ignores `package-lock.json`; pi-jefferson commits `pnpm-lock.yaml`.",
      "status": "verified"
    }
  ],
  "owner_questions": [
    {
      "question": "Your ruling says Biome follows 'whatever the community is doing', but the research found three communities that disagree on indent width, line width and VCS handling. Which should set the baseline?",
      "options": [
        "(a) Biome's own `biome init` output and defaults: tabs, lineWidth 80, double quotes, recommended rules.",
        "(b) Pi's own repository config, which the Biome-using pi-package extensions copy: tabs, indentWidth 3, lineWidth 120, Pi's rule overrides, with `files.includes` narrowed to this package's `src/` and `tests/`.",
        "(c) Broad GitHub prevalence: VCS ignore-file on, spaces, explicit `files.includes`."
      ],
      "recommended_option": "(b) Pi's own repository config, with `files.includes` narrowed to this package.",
      "why": "You tied the ruling to adoption, and the people who would adopt this package are Pi users and extension authors. Every Biome-using pi-package Chidi checked copies Pi's block (Chidi addendum §3). It is also the cheapest choice against today's code. Under (a), the 80-column limit wraps lines in about 15 files, including three handler signatures the specs say must not change (CR-2). Under (c), switching to spaces re-indents every line of all 20 source files. (c) is also not one coherent config: it is a set of independent majorities. Under (b), no existing line exceeds 120 columns. Joel should confirm, because 'community' is his word and the research does not settle it."
    }
  ],
  "not_checked": [
    "Did not run Biome, vitest, tsc or pi (read-only lens). Every formatting-churn number is a grep line count, not a Biome run.",
    "Did not read the rest of types.d.ts beyond lines 1229-1269, or the `ExtensionHandler` return type (whether a void no-op satisfies `ContextEventResult` and `ToolCallEventResult`).",
    "Did not check which Biome 2.6.7 recommended rules are warn rather than error, or whether `useIgnoreFile` honours `.git/info/exclude`.",
    "Did not check Pi's own lockfile or package-manager practice as a community source for CR-3.",
    "Did not review docs-pass items (S7, S8) or the ARCHITECTURE.md corrections."
  ]
}