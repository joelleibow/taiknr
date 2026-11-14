{
  "mode": "council",
  "lens": "council-structural",
  "paraphrase_proposes": "",
  "paraphrase_existing": "",
  "recommendation": "Proceed to design, but three structural gaps must close first: the Biome community baseline is unresolved and makes a spec requirement unmeasurable; the chosen baseline has a measured blast radius that contradicts the change's own 'Files edited' list and 'only the stub bodies differ' guarantee; and the lint layer has no PoC-file coverage rule even though tsc and the test runner do. The package shape itself (single manifest entry, peer-`*`/dev-only Pi dep, no-op handler registrations, throwaway agent dir) is structurally sound and keeps every responsibility in its existing module.",
  "findings": [
    {
      "id": "F1",
      "severity": "major",
      "location": "proposal.md 'Open Questions'; specs/development-checks/spec.md 'Requirement: Biome configuration follows community practice'",
      "finding": "The Biome requirement is unmeasurable as written because 'the community' has three candidate baselines (biome init defaults; Pi's repo and pi-package extensions; broad GitHub prevalence) that disagree on the actual knob values — indentWidth 2 vs 3, lineWidth 80 vs 120, VCS integration off vs on. The spec scenarios ('every non-default setting traces to a named community source') cannot be evaluated until one baseline is named.",
      "rationale": "A requirement whose acceptance criterion depends on an undefined referent invites mid-design drift: whoever writes biome.json will resolve 'community' silently and differently from whoever reviews it. This is the exact unmeasurable-goal pattern council exists to catch.",
      "concrete_case": "A designer following biome init writes lineWidth 80; a reviewer applying Joel's adoption principle points at Pi's lineWidth 120 (uniform across Pi and all four Biome-using pi-package extensions). Both believe they honored the ruling; the spec scenario cannot arbitrate.",
      "recommendation": "Raise the owner question below (which community sets the baseline) and have the design name one baseline and a source for every deviation, as the spec already demands."
    },
    {
      "id": "F2",
      "severity": "major",
      "location": "proposal.md 'Impact: Files edited'; specs/extension-packaging/spec.md 'Requirement: Handler signatures and the import boundary are preserved' (scenario 'only the stub bodies differ')",
      "finding": "The formatting blast radius of a format-enabled Biome inside `check` contradicts the change's own scope claims, and the contradiction is measurable now. Under biome init defaults (lineWidth 80), 26 lines across 15 src files exceed 80 characters (verified by grep at HEAD); under Pi-style lineWidth 120, zero lines do (verified). Three of those >80 lines are the `registerSessionStartHandler`/`registerSessionTreeHandler`/`registerSessionCompactHandler` signature lines themselves, and Biome's `organizeImports` assist (on in the init output and in ~77k configs) can also fail `biome check` on unsorted imports until applied.",
      "rationale": "The proposal lists only the seven handler files as edited, and the extension-packaging spec scenario requires that comparing the seven handler files with HEAD shows 'only the stub bodies differ'. A Biome run that reformats or fails on those same files breaks that guarantee or forces an undeclared formatting pass across the tree. Whichever baseline wins, the design must state whether a one-time format pass is in scope and amend the Files-edited list and the scenario wording accordingly.",
      "concrete_case": "With lineWidth 80, `npm run check` exits non-zero on first run citing `session-start.ts` line 4 (`export function registerSessionStartHandler(_pi: ExtensionAPI, _store: ArchiveStore): void {`); wrapping it to satisfy the formatter makes the seven handler files differ from HEAD beyond their stub bodies, failing the extension-packaging spec scenario.",
      "recommendation": "The design must either pick a baseline the existing tree already satisfies (lineWidth ≥ 120, tabs, double quotes — all verified at HEAD) or explicitly widen the Files-edited list and soften the 'only the stub bodies differ' scenario to 'no semantic change to signatures or contracts'. Record the assist/organizeImports behavior in the same decision."
    },
    {
      "id": "F3",
      "severity": "major",
      "location": "specs/development-checks/spec.md (no requirement covers Biome's file scope); research-chidi.md addendum §1",
      "finding": "The PoC-file exclusion (`jev-context-poc.ts`, `test-jev-poc.mjs`) is an explicit requirement for tsc (`include` excludes the root PoC) and for the test runner (explicit glob), but there is no corresponding requirement for the lint layer. Chidi measured that `biome init` output sets no `files.includes`, so bare `biome check` scans the root PoC files.",
      "rationale": "Two of three check layers treat the PoC files as out-of-bounds; the third can fail on them. The change commits to never editing those files, so a lint failure there has no permitted fix. The one-home-for-each-fact principle is violated: the PoC-exclusion rule is restated in two specs but absent from the third.",
      "concrete_case": "`biome check .` with the init config and no `files.includes` indexes `jev-context-poc.ts`; if it violates any format or lint rule, `npm run check` exits non-zero on a file the proposal's 'Not in this change' list forbids editing.",
      "recommendation": "Add a requirement to development-checks that Biome does not cover the two PoC files (via `files.includes` with `!` exclusion, or the `!!` force-ignore form), with a scenario mirroring the existing tsc/test exclusion scenarios."
    },
    {
      "id": "F4",
      "severity": "minor",
      "location": "proposal.md 'What Changes' (first-test bullet); specs/development-checks/spec.md 'Requirement: Domain and use-case tests run without a Pi runtime'",
      "finding": "The proposal lists four candidate pure functions for the first test (`shouldArchive`, `buildStub`, `selectRecalledIds`, `formatRecalledContext`), but only `shouldArchive` and `selectRecalledIds` have implemented behavior; `buildStub` and `formatRecalledContext` still `throw new Error('Not implemented: …')` (verified at HEAD).",
      "rationale": "A test writer following the proposal's list may assert on a throw (a test that the next card must rewrite) or drift into implementing the function, which is out of scope. Calibrated-claims discipline: the proposal implies all four are assertable; only two are.",
      "concrete_case": "A test importing `buildStub` and asserting `buildStub(candidate) === <stub string>` cannot pass without implementing `buildStub`, silently pulling a future card's work into this one.",
      "recommendation": "The design should name `shouldArchive` and `selectRecalledIds` as the assertable set for S6, or state explicitly that the test targets only implemented behavior."
    },
    {
      "id": "F5",
      "severity": "minor",
      "location": "specs/development-checks/spec.md 'Requirement: The test command does not execute the proof-of-concept files'; proposal.md 'a vitest configuration if the design needs one'",
      "finding": "The requirement 'the test command SHALL run only files under `tests/`' is not satisfied by config-free vitest: the default include is `**/*.{test,spec}.?(c|m)[jt]s?(x)` resolved from the root, so a stray root-level `.test.ts` would run. The config-free option the proposal floats only happens to pass today because the PoC filenames lack a `.test.` segment.",
      "rationale": "The spec's stated invariant is stronger than the tooling the proposal suggests. Either the requirement or the tooling must give. Community practice cuts both ways (3 of 5 configured extensions set an explicit include; 13 of 18 run config-free).",
      "concrete_case": "A contributor adds `scratch.test.ts` at the repo root; `npm test` executes it even though the spec says the test command runs only files under `tests/`.",
      "recommendation": "Either soften the requirement to 'does not execute the PoC files' (matching the spec's own heading) or require an explicit vitest `include: [tests/**/*.test.ts]`. Pick one in the design and delete the 'if the design needs one' hedge."
    },
    {
      "id": "F6",
      "severity": "minor",
      "location": "specs/development-checks/spec.md (no pinning requirement); michael-orientation.md §5 'Not covered by this pass'",
      "finding": "No spec or proposal text pins major versions for `typescript`, `@types/node`, `vitest`, or `@biomejs/biome`. Measurements were made with `typescript@^5.9.3` while registry `latest` is 7.0.2, and Chidi flagged TS 7 flag/moduleResolution behavior as unverified; vitest `latest` is 5.1.0 while Pi itself pins 4.1.12.",
      "rationale": "`check` is this change's core deliverable; its reproducibility depends on the tool versions. An unpinned `^` install can silently move the compiler under a green check.",
      "concrete_case": "A fresh `npm install` six months from now resolves `typescript@7`, whose unverified flag differences could make `tsc --noEmit` fail (or pass differently) on a tree that was measured green on 5.9.3.",
      "recommendation": "The design should pin the major versions it tested with (Michael measured 5.9.3) and record that choice as the reason the numbers are what they are."
    }
  ],
  "assumptions": [
    {
      "assumption": "The four named pure functions exist in src/domain/ with the export names listed",
      "status": "verified"
    },
    {
      "assumption": "buildStub and formatRecalledContext throw 'Not implemented'; shouldArchive and selectRecalledIds have real behavior",
      "status": "verified"
    },
    {
      "assumption": "Source tree is tab-indented and double-quoted; zero lines exceed 120 chars; 26 lines across 15 files exceed 80 chars (three of them handler signature lines)",
      "status": "verified"
    },
    {
      "assumption": "tests/ exists, empty; no root package.json/tsconfig/biome.json at HEAD",
      "status": "verified"
    },
    {
      "assumption": "Biome's formatter would actually reflow/flag the >80-char lines under lineWidth 80, and organizeImports would flag unsorted imports — inferred from Biome's documented behavior; no biome run was performed (forbidden by the brief)",
      "status": "unverified"
    },
    {
      "assumption": "Handler stub bodies are single-line `throw` statements behind intact `register*Handler` signatures, so a no-op replacement is a one-line, signature-preserving edit",
      "status": "verified"
    },
    {
      "assumption": "TypeScript 7 flag/moduleResolution behavior is compatible with the proposed tsconfig",
      "status": "unverified"
    }
  ],
  "owner_questions": [
    {
      "question": "Joel's Biome ruling ('whatever the community is doing for typical biome config') names a community that the research shows has three conflicting readings. The choice is not cosmetic: at biome-init defaults (lineWidth 80), the lint check fails or rewrites 26 lines in 15 files — including three of the seven handler signatures this change promises not to touch — while at lineWidth 120 (Pi and every Biome-using pi-package extension) the existing tree passes untouched. Which baseline should biome.json follow?",
      "options": [
        "(a) biome init defaults verbatim (tab, indentWidth 2, lineWidth 80, recommended preset, VCS off) — and amend the proposal's Files-edited list and the extension-packaging spec's 'only the stub bodies differ' scenario to admit a one-time formatting pass across src/.",
        "(b) Pi-ecosystem values (tab, lineWidth 120, recommended preset plus Pi's style overrides) — the closest match to the community that will actually adopt and read this package, at the cost of leaning toward exactly the sibling-copied config shape the ruling excluded.",
        "(c) biome init defaults as the baseline with exactly one traced deviation: lineWidth 120, justified by the uniform practice of the adopting community (Pi itself and all four Biome-using pi-package extensions), plus the structurally required files.includes excluding the two root PoC files."
      ],
      "recommended_option": "(c) biome init defaults as baseline, lineWidth 120 as the one traced deviation, PoC files excluded from lint coverage",
      "why": "(c) honors 'typical community config' for every knob where the community genuinely has one, deviates only on the single knob where the adopting community demonstrably and uniformly differs, requires zero edits to files outside the declared scope, and preserves the spec's signature-protection guarantee. (a) is the most literal reading of the ruling but forces a 15-file formatting churn that contradicts the change's own scope claims and waters down the handler-signature protection; biome.json is a dev-only file that never ships to consumers, so init's lineWidth 80 buys no adoption alignment. (b) is closest to the actual adopters but reproduces the sibling-copied shape Joel excluded and imports Pi's idiosyncratic style overrides. If Joel prefers (a) anyway, the design must still resolve F2 explicitly — the ruling alone does not license silently rewriting handler files."
    }
  ],
  "not_checked": [
    "Any actual Biome, vitest, tsc, or pi run against the checkout (forbidden by the brief); all failure/blast-radius claims about Biome are inferred from its documented defaults plus measured line lengths in the source, not observed.",
    "Sibling repos' full configs beyond what the research reports cite; Pi's shared vitest.base.ts include settings (Chidi left it unread).",
    "The remaining ~70% of Biome's configuration reference (overrides, javascript/json sections) and any $schema-form concerns.",
    "TypeScript 7 behavior differences; vitest 5 vs 4 compatibility with the chosen TypeScript major.",
    "Whether Biome's organizeImports canonical order matches the existing import order in src/ files (part of the same unmeasured lint blast radius as F2)."
  ]
}