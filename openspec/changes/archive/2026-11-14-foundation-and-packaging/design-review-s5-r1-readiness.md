{
  "mode": "review",
  "lens": "council-readiness",
  "paraphrase_proposes": "tasks.md orders the work as six task groups. First, write the six root files (package.json, .gitignore, lockfile via npm install, biome.json, tsconfig.json, vitest.config.ts) and commit them. Second, run a whitespace-only Biome format pass as its own commit. Third, write the red entry test and replace the seven throwing handler stubs with `_pi.on(\"<event>\", () => {})`. Fourth, add the domain test for shouldArchive and prove it with a mutation. Fifth, run `npm run check` green and show each of its three layers failing once. Sixth, run a manual load check of a `git archive HEAD` copy under a throwaway PI_CODING_AGENT_DIR, with two negative controls. Joel's settings.json edit is explicitly not a task.",
  "paraphrase_existing": "The repo is stub-stage: 20 tracked src/ files, no package.json, tsconfig, .gitignore or harness, and an empty untracked tests/. All seven register*Handler bodies throw 'Not implemented'. src/app/extension/taiknr.ts is the single entry and calls all seven registrars. shouldArchive in src/domain/archived-output.ts is implemented (`>=`). InMemoryArchiveStore and DEFAULT_TAIKNR_CONFIG are implemented, and src/ imports Pi only as types. I confirmed these against the files on disk.",
  "recommendation": "Not ready to hand to the coder as written. File boundary, handler stub text, event mapping, test-first sequencing and hygiene are sound. I confirmed the stub strings, the shouldArchive body, and that the entry's constructors run without a Pi runtime. Four items need fixing before Implement. The entry test's import path is wrong and its Proxy-fake typing is undecided. Task 1.3's `git status --short` empty check contradicts the tree it runs on. Task 1.3 gives no instruction if the caret ranges resolve newer than the measured versions. The minor wording and placeholder fixes are cheap. None of these need an owner ruling.",
  "findings": [
    {
      "id": "RDY-S5-1",
      "severity": "major",
      "location": "tasks.md §3, task 3.1 (import of the entry's default export)",
      "finding": "The task says to import the entry from `../../src/app/extension/taiknr.js`. From `tests/app/extension/`, that path resolves to `tests/src/...`, which does not exist. The correct specifier is `../../../src/app/extension/taiknr.js`. The domain test's `../../src/domain/archived-output.js` is correct, since that file sits one level shallower.",
      "rationale": "The standard forbids guessing a file path. The design's table says the test 'mirrors src/app/extension/', which puts the test three directories below the root. The task text copies a two-level specifier onto a three-level file.",
      "concrete_case": "The coder writes 3.1 as written. `npx vitest run` fails with 'Failed to resolve import', not the `Not implemented: registerSessionStartHandler` red the task requires. Every `npx tsc --noEmit` in 3.2–3.8 then fails with TS2307, so the task's own 'tsc exits 0' check cannot pass until the coder invents the fix.",
      "recommendation": "Change the specifier in 3.1 to `../../../src/app/extension/taiknr.js`, and re-read every relative path in the task text against the `tests/` depth."
    },
    {
      "id": "RDY-S5-2",
      "severity": "major",
      "location": "tasks.md §3, task 3.1 (the Proxy fake) and design.md Decision 6",
      "finding": "The test body is described only as 'invoke it with a Proxy fake whose only member is `on`'. The coder is left to decide how the fake is typed for `taiknr(pi: ExtensionAPI)`, whether to import the `ExtensionAPI` type, and how names are recorded and compared. The task also leaves open whether the sorted seven-name list is written already sorted.",
      "rationale": "`tsc --noEmit` includes `tests/**` and `strict` is on. A Proxy is not assignable to `ExtensionAPI` without a cast, and the task says no cast form. The coder must also choose the type-import style, the recording array, and the throw message for non-`on` access. The throw message is not private if a later reader greps for it. Part of this is local test internals, but the cast and the exact expected array are interface choices that decide whether the first `tsc` run is green.",
      "concrete_case": "The coder passes `fake` directly to `taiknr(...)`. `npm run typecheck` fails with TS2345 at 3.2's verification. The alternatives (`as unknown as ExtensionAPI`, `as never`, a hand-built object) each work, and the coder has to choose one.",
      "recommendation": "Fix the shape in 3.1: `import type { ExtensionAPI } from \"@earendil-works/pi-coding-agent\"`, `const names: string[] = []`, a Proxy whose `get` returns a recorder for `on` and throws for any other key, a cast `as unknown as ExtensionAPI`, and the expected array spelled sorted: agent_before_settle, context, session_compact, session_start, session_tree, tool_call, turn_end. State that the file has exactly one `test`, which 3.9's '1 test' count already assumes."
    },
    {
      "id": "RDY-S5-3",
      "severity": "major",
      "location": "tasks.md §1, task 1.3 (Verified, third sentence)",
      "finding": "The task says a second `npm install` 'leaves `package-lock.json` unchanged and `git status --short` empty'. At 1.3, `package.json`, `.gitignore`, `biome.json` and the lockfile are untracked or uncommitted, and the commit does not happen until 1.7. The task's own previous sentence says `git status --short` lists `package-lock.json` and the other new files.",
      "rationale": "One verification line contradicts the other, and an empty status cannot be true at this point. The development-checks scenario 'Install does not dirty the tree' needs a clean committed tree. Nothing in the task list checks it after 1.7.",
      "concrete_case": "The coder runs 1.3 and gets a non-empty `git status --short` because the new files are untracked. The coder must decide whether the verification failed, or skip it. After 1.7 no task re-runs `npm install` on a clean tree, so the scenario is never actually proven.",
      "recommendation": "In 1.3, assert only that the second `npm install` leaves `package-lock.json` byte-identical (for example `shasum` before and after). Add to 1.7 or 2.2 a check that `npm install` followed by `git status --short` is empty on the committed tree. This is the scenario's own condition."
    },
    {
      "id": "RDY-S5-4",
      "severity": "major",
      "location": "tasks.md §1, task 1.3 (npm ls expected versions) against design.md Decision 8",
      "finding": "The task requires `npm ls` to resolve exactly `7.0.2`, `5.1.0`, `2.6.7` and `1.5.2`. Decision 8 writes caret ranges for typescript, vitest and the Pi dev copy (`^7.0.2`, `^5.1.0`, `^1.5.2`), and no lockfile exists yet. `npm install` takes the newest version in range at install time. Nothing says what to do if the registry has moved.",
      "rationale": "The lockfile fixes versions only after it is created, so 1.3's first install is the one that drifts. If a newer minor has shipped since R7's measurement, the task's assertion fails. The coder must then pin versions, loosen the check, or stop. That is a design decision. The Pi dev copy matters most, because the entry test and `tsc` verify event names against whatever it resolves to.",
      "concrete_case": "vitest 5.2.0 is published. `npm install` resolves it, and 1.3's `npm ls` line shows `5.2.0`. The coder cannot tell whether to run `npm install vitest@5.1.0`, edit the range, or accept the drift. I could not check the registry, so the live likelihood is unverified.",
      "recommendation": "Add an explicit rule to 1.3. If any of the four resolve differently from the measured tree, re-run the install pinned to the measured version (`npm install --save-exact` is not wanted, so use `npm install typescript@7.0.2 …` and restore the caret range in package.json), or stop and ask. Pick one in the task text."
    },
    {
      "id": "RDY-S5-5",
      "severity": "minor",
      "location": "tasks.md §2 task 2.1 and §5 task 5.1 (Verified lines quoting 'No fixes applied')",
      "finding": "The tasks assert that plain `npx biome check .` and `npm run check` report the text 'No fixes applied'. Biome prints that sentence when a `--write` run applies nothing. I did not run Biome, and I am not sure what a plain read-only `check` prints in 2.6.7.",
      "rationale": "The text is a verification oracle in the task. If Biome's read-only run prints different summary wording, the coder sees a mismatch on a green run and has to judge whether it is a failure.",
      "concrete_case": "At 5.1 `npm run check` exits 0 and Biome prints 'Checked 24 files in 12ms. No fixes needed.' The task says 'No fixes applied'.",
      "recommendation": "Rewrite the oracle as exit code 0 plus no diagnostics in the output, or have the conductor confirm the exact text with Chidi."
    },
    {
      "id": "RDY-S5-6",
      "severity": "minor",
      "location": "tasks.md §3 task 3.9 (last Verified clause)",
      "finding": "The task says `git log --oneline -1` 'shows the eight paths'. `git log --oneline` prints only a hash and subject, no paths.",
      "rationale": "A verification command that cannot show what it claims to show leaves the coder to guess a substitute. The other commit tasks use `git show --stat --oneline HEAD` correctly.",
      "concrete_case": "The coder runs the stated command and sees one line with no paths.",
      "recommendation": "Use `git show --stat --oneline HEAD` in 3.9."
    },
    {
      "id": "RDY-S5-7",
      "severity": "minor",
      "location": "tasks.md §4 task 4.1 (the three assertions)",
      "finding": "The task says to 'assert' three calls but never says whether they are three `test` blocks or three `expect` calls in one. The verification line, though, requires '1 file and 3 tests passed'. Tasks 4.2 and 5.4 expect 'the other two passing', so the three-`test` shape is also what they depend on.",
      "rationale": "The task's pass counts and its failure signatures hold only for three separate `test` blocks. The structure is not a private choice once the counts are oracles.",
      "concrete_case": "The coder puts three `expect` calls in a single `test`. 4.1's '3 tests' check fails, and in 4.2 'exactly the (10, 10) expectation fails while the other two pass' cannot be shown.",
      "recommendation": "Say in 4.1 that there are three `test` blocks, one per call, inside a single `describe`."
    },
    {
      "id": "RDY-S5-8",
      "severity": "minor",
      "location": "tasks.md §6 tasks 6.2 and 6.3 (undo command) and 6.4",
      "finding": "The undo step is written as `git -C <repo> archive HEAD | tar -x -C \"$D\"`. `<repo>` is a placeholder, and the recipe `cd`s into `$D` earlier, so the repo path is no longer implied. Task 6.4 says to 'record' the result and `pi --version` but does not say where.",
      "rationale": "These are small path and destination guesses of the kind the standard rules out. The repo path is knowable, `/Users/joelleibow/Projects/pi-taiknr`.",
      "concrete_case": "The coder types the command with the literal `<repo>`, or runs it from `$D` where `git archive HEAD` archives the wrong tree or fails. The result goes nowhere durable.",
      "recommendation": "Add `R=$(pwd)` before the `cd` in the 6.1 recipe and use `git -C \"$R\" archive HEAD` in 6.2 and 6.3. State where the 6.4 result is recorded, for example the final report back to the conductor."
    }
  ],
  "assumptions": [
    {
      "assumption": "The seven handler stub bodies and `src/domain/archived-output.ts` match the quoted text, and all listed src paths exist.",
      "status": "verified"
    },
    {
      "assumption": "taiknr.ts constructs InMemoryArchiveStore and reads DEFAULT_TAIKNR_CONFIG with no Pi runtime. Their modules use only `import type` from Pi, so the Proxy-fake entry test reaches the first throwing stub as 3.1's red expects.",
      "status": "verified"
    },
    {
      "assumption": "`tests/` is empty on disk, the root has no package.json, tsconfig or .gitignore, and all paths in the File Boundary table match the repository.",
      "status": "verified"
    },
    {
      "assumption": "Tests in `tests/domain/` reach `src/` with `../../src/...`, and tests in `tests/app/extension/` need `../../../src/...`.",
      "status": "verified"
    },
    {
      "assumption": "The measured numbers (seven reformatted files, Biome output wording, vitest and tsc results, Pi load behavior, registry resolution) come from Michael's and Eleanor's earlier measurements. I did not run Biome, npm, vitest, tsc or Pi.",
      "status": "unverified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "Biome 2.6.7 read-only `check` summary wording (no execution allowed).",
    "Current npm registry resolution of the caret ranges.",
    "That the 6.1 shell recipe produces the diagnostics claimed, including whether Pi reads `settings.json` packages with an absolute path from PI_CODING_AGENT_DIR.",
    "The seven-file format-pass count and the whitespace-only claim for the four src files.",
    "Whether Biome's `recommended` preset flags `() => {}` in the handler bodies (taken from R3).",
    "Logging and boundary-error requirements: no entry point, use case or adapter is added by this change, so section 5 of the standard does not apply."
  ]
}