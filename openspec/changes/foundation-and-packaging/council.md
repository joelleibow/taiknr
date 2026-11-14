# Council Synthesis — foundation-and-packaging

Synthesis of the seven lens reports and Michael's rulings. Lens findings are reported as each lens made them; each ruling is Michael's. Joel rules on one item only (see Owner Decisions Required).

## Question and Scope

**The design question.** How to add the package's foundation — `package.json`, `tsconfig.json`, `.gitignore`, Biome and vitest tooling, and a first test — so that Pi 1.5.2 loads a single extension entry point, `npm run check` runs lint, type-check and test, and nothing outside the declared scope changes. The handler stubs must stop throwing at load (Q1(a)) without reshaping the signatures the next cards implement behind.

**Constraints that bind it** (`michael-orientation.md` §1–§2, `owner-rulings.md`):

- D1: the card is the request; each of its decisions is a proposal until Joel confirms it. Joel confirmed the stack, not the details.
- Q1(a), Q2(a), Q3(b): no-op `pi.on("<event>", () => {})` registrations in the seven handlers; Joel edits his own `~/.pi/agent/settings.json` and the change runs every check against a throwaway `PI_CODING_AGENT_DIR`; Biome + `tsc` + vitest.
- Joel's standing principle: decisions reflect the community's preferences so the package is aligned for adoption.
- D3/ADR 0001: no `@earendil-works/pi-*` import in `src/domain/` or `src/use-cases/`; those layers' unit tests run with no Pi runtime.
- Do not touch or foreclose: the handler public signatures and adapter/port contracts, `src/app/extension/taiknr.ts` as the single manifest entry (no root `index.ts`, no `extensions/`), Joel's settings and dotfiles, `jev-context-poc.ts` and `test-jev-poc.mjs`, the sibling packages, and `.pi/` (excluded via `.git/info/exclude`).
- D2: documentation never blocks the feature; the `ARCHITECTURE.md` §8 correction and the deferred boundary-lint note are docs-pass work.

**Evidence inputs.** `research-chidi.md` (documentation, Biome/vitest/Pi conventions, addendum §1–§6), `research-eleanor.md` (the codebase, siblings, settings file), `michael-orientation.md` (decisions, traps, S1–S8, and the measurements made in a `git archive` copy), `proposal.md`, and the two spec deltas `extension-packaging` and `development-checks`.

**Out of scope in this pass:** the spec rewordings Michael ruled (Synthesis, Rulings R2, R3, R4, R5, R9, R10, R11) are applied later through `design.md`; no spec in this change was edited here.

## Lens Findings & Trade-offs

### zoom-out

- **ZO-1 (minor).** "The tooling scope identifies test and type-check inputs but leaves lint inputs undefined." A default Biome config plus a repository-wide check reaches the preserved PoC files and can turn the packaging card into unrelated cleanup. Recommends explicit lint inputs over per-file suppressions or repository-wide cleanup.
- **ZO-2 (minor).** The clean-install scenario is not closed by `.gitignore`: `npm install` also creates `package-lock.json`, which the prescribed patterns do not cover. Recommends including the lockfile in this change rather than hiding it.
- **Assumptions verified:** the existing layout already provides the Clean Architecture ownership; `shouldArchive` and `selectRecalledIds` are sufficient for the first test while `buildStub`, `formatRecalledContext` and `stageToolOutputs` still throw; there is no manifest, tool config or populated harness to reuse. Unverified: Pi 1.5.2 loading and `.js`→`.ts` resolution, which it read rather than repeated.
- **Owner question:** which meaning of "community" sets the Biome baseline; recommended `biome init` output and defaults with only project-input scoping added, on the ground that it is the maintained, coherent upstream baseline with the least local policy.

### critic

- **CR-1 (blocking).** Nothing limits which files Biome sees. Under the `biome init` baseline `biome check .` lints and format-checks both PoC files and `.pi/`, which is excluded only through `.git/info/exclude`; whether `useIgnoreFile` reads that file was unverified by the lens. A `--write` script on the community pattern would rewrite both.
- **CR-2 (major).** The candidate baselines differ in reformatting cost and the design had not costed them: 33 lines over 80 columns and none over 120, tabs throughout; at `lineWidth` 80 about 15 files wrap, including the `registerSessionStartHandler`/`registerSessionTreeHandler`/`registerSessionCompactHandler` signature lines; at 120 the multi-line import in `pi-archive-adapter.ts` probably collapses. "Only the stub bodies differ" cannot hold under the narrow baseline if the formatter runs, and `check` fails under any baseline if it does not.
- **CR-3 (major).** No package manager or lockfile policy, so the clean-tree scenario fails on its first run; the siblings disagree (pi-omlx ignores `package-lock.json`, pi-jefferson commits `pnpm-lock.yaml`).
- **CR-4 (major).** No check produces a pass/fail signal for the load scenarios. Michael recorded the printed message, not the exit code, so an exit-code check may pass on a broken load; "seven events registered" had no test at all; `tsc` accepts any valid event name, so it cannot catch a wrong but valid one. Proposes a recording-fake test of the default export inside `npm run check`.
- **CR-5 (major).** Nothing measured the new tooling: no vitest resolution of the `.js` chain, no Biome run, and an unpinned install picks typescript 7.0.2 and vitest 5.1.0 today. Recommends pinning the majors that get measured.
- **CR-6 (minor).** S6 lists four pure functions but `buildStub` and `formatRecalledContext` still throw; a first test against them cannot assert behaviour.
- **CR-7 (minor).** The "check fails on a lint error" scenario is true only for error severity; default `biome check` exits 0 on warnings.
- **CR-8 (minor).** The handler parameters are named `_pi`, so writing `pi.on(...)` literally means renaming the parameter and changing the line the "signatures unchanged" scenario compares.
- **CR-9 (minor).** If the vitest config copies Pi's `globals: true`, tests using bare `describe` fail `tsc --noEmit` because `types` is `["node"]` only.
- **Owner question:** recommended Pi's own config as the baseline (reading b) with `files.includes` narrowed, because the adopters are Pi extension authors and it is cheapest against today's code; Joel to confirm.

### structural

- **F1 (major).** The Biome requirement is unmeasurable as written: the three readings disagree on `indentWidth` 2 vs 3, `lineWidth` 80 vs 120 and VCS on vs off, so the "every non-default setting traces to a named source" scenario cannot be evaluated until one baseline is named.
- **F2 (major).** The formatting blast radius contradicts the change's own scope claims — the proposal's Files-edited list and the "only the stub bodies differ" scenario — and the contradiction is measurable now (26 lines over 80 in 15 files; three of them handler signature lines; `organizeImports` can also fail a first run).
- **F3 (major).** The PoC exclusion is an explicit requirement for `tsc` and the test runner and absent for lint: two of three check layers treat the PoC files as out-of-bounds, the third can fail on them, and the change forbids the only permitted fix.
- **F4 (minor).** Only `shouldArchive` and `selectRecalledIds` have implemented behaviour; a test writer following the proposal's four-function list may assert on a throw.
- **F5 (minor).** "The test command SHALL run only files under `tests/`" is not satisfied by config-free vitest, whose default include matches a stray root `*.test.ts`; the config-free option passes today only because the PoC filenames lack a `.test.` segment. Community practice cuts both ways.
- **F6 (minor).** Nothing pins the tool majors, so a fresh install can silently move the compiler under a green check.
- **Owner question:** recommended `biome init` defaults with exactly one traced deviation, `lineWidth` 120, plus the structurally required `files.includes`; recorded that this lens treats lineWidth 80 as buying no adoption alignment because `biome.json` never ships to consumers.

### readiness

- **R-01 (major).** Zero-decision readiness needs a verbatim `biome.json` before tasks exist. Recommends the `biome init` output generated by the pinned version plus two named deltas — `vcs.useIgnoreFile` (Biome docs, ~53% prevalence) and scoped `files.includes` — keeping `lineWidth` 80, tab and double quotes, with no rule overrides.
- **R-02 (major).** The clean-tree scenario is false as written; no document decides the lockfile. Adds that the lockfile pin matters because the load and type checks verify event names against whatever version floats in.
- **R-03 (major).** No Biome-scope requirement; `biome check .` would lint both PoC files, `.pi/`, `openspec/` JSON and the lockfile, and the only permitted fix is forbidden.
- **R-04 (major).** Two things outside the stub bodies will change and the spec forbids them: the `_pi`→`pi` rename `pi.on(...)` implies, and a first-run `biome check --write` pass, since the existing source is not mechanically formatted under any baseline. Recommends rewording the scenario to exported names, parameter types, order and return types.
- **R-05 (major).** Verified on disk that two of S6's four functions throw; and the change has no test that could fail before the production edit, because a test of existing pure functions passes immediately. Proposes the Proxy-fake entry test, written first, red against the throwing stubs and green after the no-op edit.
- **R-06 (major).** `package.json` is specified by field family, not verbatim: versions, literal script text, `private`, publishing metadata, `engines` and whether `vitest.config.ts` exists are all undecided; vitest's default include also reaches `openspec/` and `.pi/`.
- **R-07 (minor).** The two acceptance checks name no exact commands, no throwaway agent-dir contents, no pass signal, no cleanup and no negative control; `pi -ne -e` loads the installed Pi, so the version must be recorded with `pi --version`.
- **R-08 (minor).** Rollback and mid-flight ordering are unaddressed: after Joel's settings entry, a checkout of a pre-change commit turns every Pi session's start into a load error, and a revert un-ignores `node_modules/`. Proposes recording the order in the design's Migration Plan, not as tasks.
- **R-09 (minor).** One scenario asserts a Pi internal no repository check can observe. Recommends rephrasing it to what the repository controls and citing Chidi §4 for the Pi-side behaviour.
- **Owner question:** recommended `biome init` plus the two named deltas, and argued against Pi's block as a sibling-copied config carrying Pi-codebase-specific rule disables. That argument rested on a paraphrase in `owner-rulings.md` that has since been removed; see R1.

### codebase

- **CC-1 (major).** "S6 says the first test asserts an existing pure function and names four candidates, but only two of the four have implemented bodies on disk"; a test written against `buildStub` fails with `Not implemented`, for a reason no edit in scope can fix. Names `shouldArchive` and `selectRecalledIds`, and the `.js` chain as exercised by the import itself.
- **CC-2 (major).** However the baseline is settled, the design must scope `biome check` away from both root PoC files: the init output sets no `files.includes`, and the files are git-tracked so an ignore-file hook would not exclude them either. Notes `jev-context-poc.ts` line 18 is ~135 characters and fails either candidate width.
- **CC-3 (minor).** The load check has no stated pass signature, so "loads cleanly" is not provably observable: empty output cannot distinguish a loaded no-op extension from an entry path that was silently dropped.
- **Assumptions verified against disk:** the 15 tracked `src/` files, the empty untracked `tests/`, each handler's single `throw` behind an intact signature, the 20 `Not implemented` throws, ADR 0001's boundary holding, `.pi/` in `.git/info/exclude`, and `taiknr.ts` as the single composition root.
- **Owner question:** recommended the Pi-ecosystem block, reasoning that the ruling's stated purpose is adoption alignment and the adoption audience is Pi extension authors.

### comprehension

- **C1 (major).** The two acceptance checks do not specify how to set up and invoke the isolated `packages` route, or how to distinguish a loaded package from one never discovered; absence of a warning is not evidence of correct dependency placement.
- **C2 (major).** Lint file coverage, and its interaction with the untouched PoC files and the existing formatting, are unspecified. A bare check can include the root PoC, leaving implementers a choice between violating scope and weakening checks.
- **C3 (major).** The spec says Node resolves TypeScript sources while the chosen runner is vitest; it names no supported Node version and does not separate native resolution from vitest's transformation. A passing vitest test cannot establish native Node behaviour.
- **C4 (minor).** The clean-install scenario does not state whether a lock is committed or how the worktree is prepared.
- **C5 (minor).** Two scenarios overstate their scope: not executing the PoC does not guarantee no test calls a live model, and an arbitrary Biome violation need not be in the lint target.
- **Owner question:** recommended the Pi-ecosystem patterns, generalized rather than copied wholesale, with project-specific safety exclusions documented.

### catalyst

- **CAT-1 (major).** The spec excludes the PoC files from `tsc` and vitest and keeps `.pi/` out of `.gitignore`, but defines no Biome file boundary — a false choice between editing frozen files, bespoke negative globs in `biome.json`, and scoping only the CLI script while editor LSPs still scan the root. Recommends a positive `files.includes` allowlist plus `vcs.useIgnoreFile: true`. Records the trade-off: an allowlist fails open, so a new top-level directory or root file silently skips Biome until it is listed. Also proposes `vitest run tests` rather than a config file.
- **CAT-2 (major).** "Contract-vs-Representation Separation": the real invariant is preserving semantic module contracts, not pre-linter whitespace, import order or `_`-prefixed unused parameters. Accepting that permits a one-time `--write` pass and `_`-prefix normalization without bespoke rule overrides, at the cost of a wider diff and shifted `git blame`. Also notes that normalizing unused parameter names creates rename-back work for later cards.
- **Owner question:** recommended the canonical `biome init` baseline plus VCS ignore and positive partitioning, keeping all `recommended` rules enabled.
- **Fidelity note.** This lens reports that its reads of `owner-rulings.md` and `proposal.md` returned empty and that it worked from the conductor's inline summary. Its findings overlap the other six lenses, and Michael ruled on both of them directly (R2, R3).

## Synthesis & Recommendation

Proceed to design with the small, additive packaging change the proposal describes: a single manifest entry, `peerDependencies` `"*"` with a `devDependencies` copy for `tsc` only, no-op handler registrations that change no signature, and every check self-contained in a throwaway agent directory.

Across the seven lenses, five points drew convergent findings — six of the seven on most of them — and Michael settled all five:

1. **Biome needs an explicit file scope.** R2 makes it a positive `files.includes` allowlist. Negative globs, `!!` force-ignores and "the ignore file handles it" were all rejected on measurement.
2. **A one-time format pass is unavoidable and in scope.** R3 accepts it, widens the proposal's Files-edited list, and rewrites the signature guarantee to what it actually protects.
3. **The lockfile is committed.** R4 makes npm the package manager and rewrites the clean-tree scenario around the committed lockfile.
4. **The load path needs an automated guard.** R6 gives the seven-event Proxy-fake test, the stderr-based manual load check, and the literal `packages`-route procedure with negative controls.
5. **Versions are pinned to what was measured.** R7 fixes Biome exactly and the other majors by measurement.

Two consequences follow, and the design carries them rather than restating the rulings:

- The root config files are inside Biome's scope, so they are written in the formatter's style (tabs, as the baseline sets) — otherwise `npm run check` is red on its first run against files this change itself creates.
- `vitest.config.ts` is listed in `files.includes` by name, not through a `*.ts` glob, which is also the mitigation for the fail-open cost CAT-1 recorded.

The one knob no measurement could decide is `lineWidth`: it is Joel's, and R1 hands it over with a recommendation of 120. Everything else in `biome.json` is settled whether he answers 80 or 120, so the design can be drafted to the point of that value and no further.

## Accepted & Rejected Feedback

### Accepted

| Finding | Closed by | What changes |
|---|---|---|
| CR-1 (blocking), ZO-1, F3, CC-2, R-03, C2, CAT-1 | R2 | A `files.includes` allowlist scoped to `src/**`, `tests/**` and the root config files; a new development-checks requirement and scenario that `npm run lint` reports nothing under the PoC files, `docs/`, `openspec/` or `.pi/` |
| CR-2, F2, R-04, CAT-2 | R3 | A one-time `biome check --write` pass over `src/`, format first then the no-op edits; the "signatures unchanged" scenario reworded to names, parameter order and types, return types and the import boundary; the proposal's Files-edited list widened |
| CR-3, ZO-2, R-02, C4 | R4 | npm; `package-lock.json` committed and listed as created; scenario reworded to the committed-lockfile baseline |
| CR-4, R-05 (entry test), C1, CC-3 | R6 | `tests/app/extension/taiknr.test.ts` with a Proxy fake inside `npm run check`; stderr-based manual load check; a literal `packages`-route procedure with two negative controls; `pi --version` recorded |
| CR-6, F4, CC-1 | R5 | The first domain test targets `shouldArchive` and/or `selectRecalledIds`; the requirement says "an implemented pure function"; the `>=`→`>` mutation is the proof it catches a mistake |
| CR-5, F6, R-01 (verbatim config), R-06 (verbatim config) | R7 | Biome exact `2.6.7`, vitest `^5.1.0`, typescript `^7.0.2`, `@types/node` `^22`, no `engines`; the design writes `package.json` verbatim and the lockfile fixes the exact resolution |
| R-07 (literal commands) | R6 | Literal `mktemp`/settings/`PI_CODING_AGENT_DIR`/cleanup procedure and negative controls, though its exact `-ne` invocation is rejected below |
| R-08 | R8 | Five ordered steps in the design's Migration Plan; no code, no task, and the settings edit stays Joel's and unticked |
| CR-7 | R9 | The scenario narrows to error-severity rules or formatting |
| F5, C5 (lint half), CAT-1 (`vitest run tests` half) | R10 | `vitest.config.ts` with `test.include: ["tests/**/*.test.ts"]` and nothing else; the proposal's hedge dropped |
| C3, R-09 | R10 (last part), R11 | The resolution scenario reads "the test runner resolves the chain"; the manifest scenario is reworded to what the repository controls, with Chidi §4 cited for Pi's behaviour |
| CR-8, CAT-2 (`_`-prefix half) | R3 | The parameter keeps its HEAD name, so `pi.on(...)` is shorthand for calling `.on` on the handler's Pi parameter; no `_`-prefix normalisation |
| CR-9 | R7 | Tests import `describe`/`test`/`expect` from `vitest`; no `globals` |

### Rejected

| Finding or recommendation | Ruled out by | Why |
|---|---|---|
| CR-1's alternatives — negative globs on the PoC filenames, `!!` force-ignore | R2 | Not needed and not wanted: the allowlist carries the scope, and `useIgnoreFile` cannot carry it because `.git/info/exclude` is local-only |
| CR-2's "state whether a format pass is in scope" as an open choice | R3 | No `lineWidth` leaves HEAD untouched (measured), so the pass is unavoidable; the choice was already made by the measurement |
| CR-5's `typescript ^5.9.3` | R7 | TS 7.0.2 was measured green on this tree; both majors pass, so the community's current choice wins and the lockfile pins the exact version |
| CR-7's `--error-on-warnings` | R9 | Default Biome exit behaviour is the community behaviour; one of five extensions uses the flag and nothing here needs it |
| CR-8's rename `_pi`→`pi` | R3 | `_pi.on("<event>", () => {})` type-checks and passes the recommended preset with zero diagnostics, so the rename buys nothing and costs the signature guarantee |
| R-07's `pi -ne --no-session --help` as the packages-route command | R6 | `-ne` disables configured packages; with it a throwing stub produced no error at all, so the command is vacuous |
| R-02's suggestion to add `!package-lock.json` to `files.includes` | R2 | Biome ignores the lockfile by default (measured) |
| R-06's "have someone measure vitest/Biome before design" | R7 | Done: the full `biome check . && tsc --noEmit && vitest run` chain was run in a temp copy |
| CAT-1's `vitest run tests` with no config file | R10 | A config file makes the spec's stated invariant true as written and mirrors `tsconfig.json`'s `include` |
| F1's "unmeasurable until a baseline is named" as a gate | R1 | The measurement eliminates every candidate but one knob, and that knob goes to Joel with a recommendation |
| readiness's argument that Pi's block is excluded as a sibling-copied config | R1 | That argument rested on a conductor paraphrase in `owner-rulings.md` that was not Joel's words and has been removed; the exclusion of Pi's `indentWidth` 3 and its rule overrides stands on the deletion test, and on nothing else |
| zoom-out's, critic's, codebase's and comprehension's owner-question framing (a three-way choice of communities) | R1 | Two of the three readings are eliminated by measurement, so the question Joel receives is narrower than the lenses framed it |

### Not ruled, carried to design

- **C5's live-model wording.** R10 and R2 settle the lint half and the runner scope; nobody ruled on whether the scenario should read "the PoC files are not collected" rather than "no live model or classifier call is made". The design records whichever reading it adopts.
- **CAT-2's `.git-blame-ignore-revs`.** Offered as a mitigation for the format pass shifting line-level blame; not adopted, not rejected. No ruling requires it, and it is not in the proposal's file list.
- **R-06's remaining package metadata** (`private`, `version`, `description`, `license`, `files`/`.npmignore`). R7 pins versions and R4 names the package manager; the rest is design content without a ruling.

## Michael's Rulings

### R1 — Which community sets the Biome baseline (`joel`)

**Dispute.** zoom-out, readiness and catalyst wanted `biome init` defaults (readiness adding `useIgnoreFile` and scoped `files.includes`); critic, codebase and comprehension wanted Pi's own block (`indentWidth` 3, `lineWidth` 120, six rule overrides); structural wanted init with `lineWidth` 120 as the one traced deviation and called the spec requirement unmeasurable until a baseline is named. Several lenses marked it for Joel.

**Ruling.** Joel's ruling narrows it but does not settle it. The evidence eliminates everything except one knob. Eliminated: GitHub-majority spaces, which re-indents every line of all 20 `src/` files for a knob whose init default is already tab; Pi's `indentWidth: 3` and its six rule overrides, which have zero measured effect on this tree (identical format output to `indentWidth` 2; zero lint diagnostics with or without them) and so go by the deletion test; and init verbatim with no `files.includes` and VCS off, which is unworkable under R2. What remains for Joel is `lineWidth` 80 or 120 — see Owner Decisions Required. Everything else in `biome.json` is settled whatever he answers: the `biome init` 2.6.7 output as the base, `vcs.enabled`/`clientKind: git`/`useIgnoreFile: true`, `files.includes` scoped per R2, the recommended preset, no rule overrides, tabs, double quotes, `organizeImports` on.

**Note on `owner-rulings.md`.** That file glossed Joel's words as excluding a sibling-copied config. The gloss was the conductor's paraphrase, not Joel's words; it has been removed and must not be restored. The exclusion stands on the deletion test above, and readiness's argument that leaned on the gloss does not survive on its own reasoning.

**Decided by.** None — the remaining choice is Joel's.

**Evidence.** Installed `@biomejs/biome` 2.6.7, typescript 5.9.3, vitest 5.1.0 and `@earendil-works/pi-coding-agent` 1.5.2 in a `git archive HEAD` copy under `mktemp -d` (removed after). `biome check . --reporter=summary` under four configs: init verbatim; init + vcs + includes; Pi block + includes; init + `lineWidth` 120 + vcs + includes. Format-diff file lists: `lineWidth` 80 → 11 `src/` files; 120 → 4; the Pi block and init+120 produced identical lists. Zero lint diagnostics on `src/` under every config; the only hits were `test-jev-poc.mjs` and a planted `.pi/` file. Swept 90/100/110 → 9/1/4 files. The four diffs at 120 are all parameter-list or import-list collapses, none semantic. Pi's repo `package.json` via `gh api`: Biome 2.3.5, typescript 7.0.2.

### R2 — Biome file scope (settled)

**Dispute.** CR-1 (blocking), F3, CC-2, R-03, ZO-1 and CAT-1 all wanted an explicit scope, disagreed on the mechanism (`files.includes` allowlist vs `!!` force-ignore vs `vcs.useIgnoreFile`), and left unverified whether Biome reads `.git/info/exclude` or ignores the lockfile.

**Ruling.** `biome.json` SHALL set `files.includes` to an allowlist: `src/**`, `tests/**`, and the root config files `package.json`, `tsconfig.json`, `biome.json`, `vitest.config.ts`. Negative globs on the PoC filenames are not needed and not wanted. `vcs.useIgnoreFile: true` is set because it is Biome's documented guidance and about half of configs, but it is not the mechanism: it does honour `.git/info/exclude` (measured, contrary to the lenses' unverified assumption), yet that file is local-only and a fresh clone has no `.pi/` exclusion, so the allowlist must carry the scope. `package-lock.json` needs no entry, because Biome ignores it by default (measured). `lint` is `biome check .`, read-only; any `format`/`lint:fix` script is a separate script and `check` never passes `--write`. Add the development-checks requirement and a scenario: `npm run lint` reports nothing under `jev-context-poc.ts`, `test-jev-poc.mjs`, `docs/`, `openspec/` or `.pi/`. This closes CR-1.

**Decided by.** Measurement: Biome 2.6.7 with the init config and no `files.includes` checked 45 files, including every `.md` under `docs/adr/` and `openspec/changes/` (Biome 2.6 formats Markdown; `research-chidi.md` and all seven council reports were flagged for formatting), both PoC files (format errors in both, an `organizeImports` error and a `noUnusedVariables` warning in `test-jev-poc.mjs`), and a planted `.pi/marbleization/junk.js`. Scoped to `files.includes`: 22–25 files, zero hits outside `src/`, `tests/` and root json.

**Evidence.** The unscoped run's 45 files and 29 errors; `.pi/` absent from a 44-file run with `useIgnoreFile: true` and `.pi/` only in `.git/info/exclude`, while `biome check .pi/marbleization/junk.js` answers "paths were provided but ignored"; `biome format package-lock.json` ignored under every config; `includes: ["src/**","tests/**","*.json"]` → 23 files, no PoC, `.md` or `.pi/` entries.

### R3 — Formatting blast radius vs the spec scenarios (settled)

**Dispute.** CR-2, F2, R-04 and CAT-2 said a one-time format pass is unavoidable and the scenario must loosen; R-04 and CR-8 added that `pi.on(...)` forces a `_pi`→`pi` rename; catalyst proposed `_`-prefix normalisation for unused parameters.

**Ruling.** A one-time `biome check --write` pass over `src/` is in scope under any baseline, because no `lineWidth` leaves HEAD untouched (measured). The "Signatures unchanged" scenario is reworded to what it means to protect: exported function names, parameter order and types, return types, and the import boundary unchanged against HEAD; formatter whitespace permitted. The proposal's Files-edited list widens to the formatted files (4 at `lineWidth` 120, 11 at 80, per R1's measurement), and the design orders the tasks: format pass first, its diff reviewed as whitespace-only, then the no-op edits. The `_pi`→`pi` rename does not happen: `_pi.on("<event>", () => {})` type-checks and passes the recommended preset with zero diagnostics, so Q1(a)'s `pi.on(...)` is shorthand for "call `.on` on the handler's Pi parameter" and the parameter keeps its HEAD name. No `_`-prefix normalisation is needed, because the recommended preset produced zero lint diagnostics on the stubs before and after the edit. No rule overrides are added.

**Decided by.** R1's `lineWidth` sweep (80/90/100/110/120 → 11/9/1/4/4 files), the four 120-width diffs being parameter-list collapses, and `tsc --noEmit` exit 0 with `biome check src tests` clean after replacing all seven throws with `_pi.on(...)`.

**Evidence.** In the temp copy, each handler's `throw` was replaced with `_pi.on("<event>", () => {})`; `tsc --noEmit` → 0 errors, including `context`, whose handler result type accepts a void arrow; `biome check src tests` after `--write` → "Checked 22 files, No fixes applied" and zero lint rules reported. `tool-call.ts` is one of the four files Biome reflows at 120, so "only stub bodies differ" is false for a handler file even at the widest candidate.

### R4 — Lockfile and package-manager policy (settled)

**Dispute.** CR-3, R-02, ZO-2 and C4: `npm install` creates `package-lock.json`, `.gitignore` does not cover it, no artifact says whether to commit it, and the siblings disagree.

**Ruling.** npm is the package manager. `package-lock.json` is committed in this change and listed as a created file, and is not added to `.gitignore`. The scenario is reworded: on a clean checkout containing the committed lockfile, `npm install` followed by `git status` reports no changes. Biome needs no exclusion for it (R2). pi-omlx's ignore is the outlier against npm's documented default and Pi's practice; the standing community principle decides for committing.

**Decided by.** Joel's standing principle applied to measured community practice: `earendil-works/pi`'s root has `package-lock.json` committed (via `gh api`); npm creates the lockfile on install (measured).

**Evidence.** `npm install` in the temp copy produced `package-lock.json` resolving typescript 5.9.3, vitest 5.1.0, vite 8.3.8, `@types/node` 22.20.5, `@biomejs/biome` 2.6.7 and `pi-coding-agent` 1.5.2. `gh api repos/earendil-works/pi/contents` lists `package-lock.json` and `.npmrc`. `~/Projects/pi-omlx/.gitignore` contains `package-lock.json`; `~/Projects/pi-jefferson` has `pnpm-lock.yaml` and `"packageManager": "pnpm@12.17.0"`.

### R5 — First-test target (settled)

**Dispute.** CC-1, CR-6, F4 and readiness said S6 named four existing pure functions, but `buildStub` and `formatRecalledContext` still throw; R-05 added that the change needs a test that can go red-then-green, which the entry test of R6 supplies.

**Ruling.** S6 was wrong on two of four, and is corrected. The first domain test targets `shouldArchive(rawTextLength, minCharsToArchive)` (`src/domain/archived-output.ts:19`) and/or `selectRecalledIds` (`src/domain/recall.ts:13`): equal to the threshold included, one below excluded. The development-checks requirement reads "an implemented pure function". The `.js` specifier chain is exercised by the import itself. The test is shown to catch a mistake by mutating `>=` to `>`.

**Decided by.** Source at HEAD: `buildStub` and `formatRecalledContext` are `throw new Error("Not implemented: …")`; `shouldArchive` and `selectRecalledIds` have bodies.

**Evidence.** The four functions were read at HEAD. `tests/domain/archived-output.test.ts` asserting `shouldArchive(10,10) === true` and `shouldArchive(9,10) === false` passed under vitest 5.1.0; mutating `>=` to `>` made it fail; restored → green.

### R6 — Automatable pass/fail for the load scenarios (settled)

**Dispute.** CR-4 and R-05 proposed a vitest test calling the default export with a recording fake `ExtensionAPI`; C1 and CC-3 wanted the `packages` route to prove discovery rather than merely print nothing; R-07 proposed literal commands including `PI_CODING_AGENT_DIR=<tmp> pi -ne --help`; critic noted `tsc` accepts any valid event name and that the `--help` exit code was unmeasured.

**Ruling.** Three parts. (1) The in-repo guard is `tests/app/extension/taiknr.test.ts`, invoking the default export with a Proxy fake whose only member is `on` (any other member access throws) and asserting the sorted list of registered events equals exactly the seven names. It runs inside `npm run check`, needs no Pi runtime (every Pi import in `src/` is `import type`), goes red against HEAD's throwing stubs and green after the no-op edit, and catches a valid-but-wrong name that `tsc` accepts. It is a test, not a production mechanism. (2) `pi --help` exits 0 whether or not an extension failed to load (measured), so the manual load check asserts on stderr text — absence of `Failed to load extension` — never on exit code. A non-interactive run would exit 1 on load failure but costs a model call, so it is not used. (3) The `packages`-route check MUST NOT pass `-ne`: `-ne` disables configured packages, and with it a throwing stub produced no error at all (measured), so R-07's literal command is vacuous. The procedure: `D=$(mktemp -d); printf '{"packages":["<abs repo path>"]}' > $D/settings.json; PI_CODING_AGENT_DIR=$D pi --no-session --help 2>&1 | rg 'Failed to load extension|Host-provided extension packages'` must print nothing; then `rm -rf $D`. Discovery is proven by two negative controls the tasks run once: with one handler's `throw` temporarily restored, the same command prints the `Failed to load extension … Not implemented` line; with the peer temporarily moved to `dependencies`, it prints the `Host-provided extension packages` warning. Both restored before the tick. Record `pi --version` (1.5.2) in the task.

**Decided by.** Measurement of Pi 1.5.2: `--help` exit codes, `-ne` behaviour on the packages route, and the recording-fake test's three negative controls. Pi's `dist/main.js` lines 766–812: `parsed.help` → `reportDiagnostics` → `process.exit(0)`; `hasRuntimeErrors` → exit 1 only on the non-help path.

**Evidence.** With throwing stubs: `pi -ne -e <file> --help` exit 0; `pi -ne -e <dir> --help` exit 0; `PI_CODING_AGENT_DIR=$A pi --no-session --help` exit 0 with the `Failed to load extension … Not implemented: registerSessionStartHandler` line on stderr; the same with `-ne` → exit 0 and empty stderr (package not loaded); `--mode json x` → exit 1. `rg 'on\(event: string'` in `types.d.ts` → no catch-all overload; `_pi.on("sesion_tree")` → TS2769; `_pi.on("session_before_tree")` → `tsc` 0 errors (real event at `types.d.ts:1240`). The fake test: green on no-op stubs; red when session-tree's throw was restored; red on `session_before_tree`.

### R7 — Version pinning (settled)

**Dispute.** CR-5, F6 and R-06: majors unmeasured; registry latest is typescript 7.0.2 and vitest 5.1.0 while orientation measured typescript 5.9.3 and `node --test`; Biome's docs say install with `-E`.

**Ruling.** Pin what is now measured, and prefer the community's current choice where both pass: `@biomejs/biome` exact `2.6.7` (Biome's documented `npm i -D -E`, `$schema` 2.6.7); `vitest` `^5.1.0` (registry latest, measured green including `.js`→`.ts` resolution and the Proxy-fake test); `typescript` `^7.0.2` (registry latest and Pi's own devDependency; `tsc --noEmit` exit 0 on this tree — 5.9.3 also passes, so either major is safe and the lockfile fixes the exact version); `@types/node` `^22` (Pi pins 22.x; Node engines in Pi `>=22.19.0`). No `engines` field. The design writes `package.json` verbatim and the committed lockfile makes the run reproducible. Tests import `describe`/`test`/`expect` from `vitest`, with no `globals` (measured: `tsc` with `tests/**` included and `types: ["node"]` passes that way, and `globals: true` would break it as CR-9 said).

**Decided by.** Measurement in the temp copy, Pi's devDependencies (`gh api`: typescript 7.0.2, `@types/node` 22.19.19), and Biome's install docs (Chidi addendum §1).

**Evidence.** `npx -y -p typescript@7.0.2 tsc --noEmit -p tsconfig.json` → exit 0, no output; 5.9.3 → exit 0. `npx vitest run` (5.1.0, vite 8.3.8, Node 26.8.1): 2 files passed, including imports through `../../src/app/extension/taiknr.js` and `../../src/domain/archived-output.js`. The full `biome check . && tsc --noEmit && vitest run` chain → exit 0.

### R8 — Settings-entry order and revert (settled)

**Dispute.** R-08, given Q2(a): after Joel adds `../../Projects/pi-taiknr` to `packages`, every Pi session on his machine loads the extension; a checkout of a pre-change commit would make every session print a load error; and a revert un-ignores `node_modules/`.

**Ruling.** The design's Migration Plan records five steps: (1) merge the change; (2) Joel adds the `packages` entry himself, after which the extension loads in every Pi session in every project; (3) rollback order is remove the settings entry first, then revert; (4) while the entry is active, checking out a commit before this change turns every Pi session start into a `Failed to load extension … Not implemented` diagnostic (interactive sessions continue; `--print`/`--mode json` runs exit 1), so Joel should not switch the checkout below this change with the entry active; (5) `node_modules/` and `package-lock.json` are left for manual deletion after a revert. No code and no task — this is design text, and the settings edit itself stays Joel's and is not a ticked task.

**Decided by.** Joel's Q2(a) ruling for who acts; measurement for the hazard.

**Evidence.** A throwing-stub load through the packages route: the `Failed to load extension …` line on stderr with `--help` (exit 0), and exit 1 under `--mode json` (`hasRuntimeErrors` path). Relative paths in `packages` resolve from `~/.pi/agent` (Pi `docs/settings.md` line 151), so `../../Projects/pi-taiknr` matches the two existing sibling entries.

### R9 — Does `biome check` fail on a warn-severity rule (settled)

**Dispute.** CR-7: the "check fails on a lint error" scenario holds only for error severity unless `--error-on-warnings` is added.

**Ruling.** Narrow the scenario to "violates an error-severity Biome rule or formatting". Do not add `--error-on-warnings`: default Biome exit behaviour is the community behaviour (one extension of five uses the flag) and nothing in this change needs it.

**Decided by.** Measurement of Biome 2.6.7 exit codes; Joel's community principle.

**Evidence.** A file with an unused `const` (recommended `noUnusedVariables`, warn): `biome check` exit 0; `biome check --error-on-warnings` exit 1.

### R10 — Test discovery scope (settled)

**Dispute.** F5, C5 and CAT-1: the spec says the test command runs only files under `tests/`, but config-free vitest's default include matches any `*.test.ts` anywhere; the proposal hedged "a vitest configuration if the design needs one"; catalyst proposed `vitest run tests` with no config file.

**Ruling.** Add `vitest.config.ts` with `test.include: ["tests/**/*.test.ts"]` and nothing else, and drop the proposal's hedge. This makes the spec's invariant true as written, mirrors `tsconfig.json`'s `include`, and is what pi-omlx, rpiv-mono and pi-mcp-adapter do. `vitest.config.ts` is added to Biome's `files.includes` by name, not through `*.ts`, which would admit `jev-context-poc.ts`. The PoC files are already outside the default include, so the explicit include is for the stated invariant, not for PoC safety. C3: the spec's "Node resolves the chain" scenario is reworded to "the test runner resolves the chain"; plain-Node resolution was measured but is not a requirement of this change.

**Decided by.** Joel's community principle (3 of 5 configured pi-package extensions set an explicit include, Chidi addendum §4); measurement that the default and explicit includes both find `tests/**/*.test.ts` and neither runs the PoC files.

**Evidence.** `npx vitest run` with no config found both test files (2 passed) and did not run `test-jev-poc.mjs` (no model call, 83 ms). Node resolution measured in the orientation pass: `node -e 'import("./src/use-cases/stage-tool-outputs.ts")'` resolved `../domain/archived-output.js`.

### R11 — Unobservable spec scenario (settled)

**Dispute.** R-09: "Pi loads only the entry named in `pi.extensions` and does not scan the conventional resource directories" asserts a Pi internal no repository check can observe.

**Ruling.** Reword it to what the repository controls and a test can assert: `package.json`'s `pi.extensions` equals `["./src/app/extension/taiknr.ts"]`, and no root `index.ts` or `extensions/` directory exists. Cite Chidi §4 for the Pi-side behaviour instead of asserting it as a scenario.

**Decided by.** Pi 1.5.2 `dist/core/package-manager.js` `collectPackageResources` (Chidi §4) and orientation Trap 7.

**Evidence.** Chidi §4 was re-read against `package-manager.js` lines ~2000–2030: `collectPackageResources` calls `addManifestEntries` when manifest entries exist. Orientation Trap 7's measurement stands and was not repeated.

## Owner Decisions Required

### OD-1 — Biome `lineWidth`: 80 or 120 (pending)

**Status: pending.** Michael marked this `joel`. The conductor brings it to Joel; when he rules, his words go into `owner-rulings.md` and this section will cite them.

**The choice.** `lineWidth` 80, which is the `biome init` default, or 120, which is what Pi and all four Biome-using `pi-package` extensions use. Nothing else about `biome.json` is open (R1).

**Michael's recommendation: 120.** His reasons:

- The adoption audience Joel named is Pi extension authors, where 120 is uniform.
- It is the smaller reformat: 120 reformats 4 `src/` files, 80 reformats 11.
- It is the only deviation from `biome init`, so the spec's "every non-default setting traces to a named source" scenario has exactly one entry.

**What each answer costs** (measured on HEAD, R1's evidence):

- **80** → 11 `src/` files reformatted, including three handler files (`session-start`, `session-tree`, `session-compact`) whose signature lines wrap. R3's widened Files-edited list and reworded signature scenario cover this either way, because exported names, parameter order and types, and return types do not change.
- **120** → 4 `src/` files reformatted (`pi-archive-adapter`, `pi-jev-scorer-adapter`, `tool-call`, `commit-archived-batch`), each a multi-line parameter list collapsed to one line.
- No width leaves the tree untouched: 90 → 9 files, 100 → 1, 110 → 4. The one-time format pass is in scope under every answer (R3).

**Not open, so not part of the question.** The `biome init` 2.6.7 output as the base; `vcs.enabled`/`clientKind: git`/`useIgnoreFile: true`; the scoped `files.includes` allowlist (R2); the recommended preset; no rule overrides; tabs; double quotes; `organizeImports` on; the pinned versions (R7); the committed lockfile (R4).
