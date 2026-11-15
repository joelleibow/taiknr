{
  "mode": "review",
  "lens": "council-readiness",
  "paraphrase_proposes": "tasks.md splits the configuration-loader card into nine task groups. They are shared fake-Pi fixtures, the host-free loader (layering, per-field rule table, read-error classification), a three-state per-session holder, a Proxy-based handler gate, the session-start bridge (path build, trust gate, load, assign-then-throw), composition-root wiring with two type-only deps changes, and a final whole-tree verification group. Each task states its failing test first, then the production change, then a verification command. Signatures and reason strings are copied from design.md. The File Boundary lists 7 Create and 5 Modify paths and no Delete.",
  "paraphrase_existing": "At HEAD, loadTaiknrConfig throws 'Not implemented'. taiknr.ts pins DEFAULT_TAIKNR_CONFIG by value into the turn-end and context deps. All seven handlers are no-op stubs and registerSessionStartHandler takes only (_pi, _store). The only test is the entry test asserting seven pi.on registrations. tests/domain/archived-output.test.ts also exists. vitest collects tests/**/*.test.ts, tsconfig and Biome cover tests/**, and the host index exports getAgentDir and CONFIG_DIR_NAME. The foundation change's manual load check used a settings.json 'packages' entry plus PI_CODING_AGENT_DIR, a usage-header positive observation, and two negative controls.",
  "recommendation": "Revise before Implement. The group 1–8 tasks are mostly executable with no design choice left to the coder, and the file paths and host symbols check out against disk. One blocking defect is 9.5's manual load check, which cannot fail. Tasks 9.2, 9.3 and 9.6 compare against HEAD on an already-committed tree, so they are vacuous, and 9.6 cannot list new files at all. The spec scenario 'No parent-directory search' has no test. The rest are minor wording and hygiene fixes (see findings).",
  "findings": [
    {
      "id": "RDY-1",
      "severity": "blocking",
      "location": "tasks.md 9.5",
      "finding": "The manual load check can never fail. It runs `npx pi --no-session --help` in a `git archive` copy with a symlinked node_modules, but nothing makes Pi load the copy's extension: there is no settings.json `packages` entry and no PI_CODING_AGENT_DIR. The pass condition is only the absence of the text 'Failed to load extension'. The task also omits the positive observation (the usage header) and the negative control that the settled recipe used.",
      "rationale": "The readiness standard §3 requires that a check relying on an automated oracle be shown catching a mistake. The foundation-and-packaging archive's tasks.md 6.1–6.3 (lines 215–234) used `D=$(mktemp -d)`, a `printf` of a `{\"packages\":[...]}` settings.json, `PI_CODING_AGENT_DIR=\"$D\"`, `cd \"$D\"`, `head -1 out.txt` and a throwing-handler control. 9.5 drops all of it and adds an unneeded node_modules symlink. Without PI_CODING_AGENT_DIR, Pi reads the real ~/.pi/agent/settings.json. Joel's dotfiles symlink makes that point at the live checkout, so the check either exercises the live tree (contradicting 'never in the live checkout') or loads nothing.",
      "concrete_case": "The coder writes `import { getAgentDir } from \"@earendil-works/pi-coding-agent/nonexistent\"` in session-start.ts. In the copy, Pi never loads the extension, so 'Failed to load extension' never appears and 9.5 passes. The broken load is shipped.",
      "recommendation": "Replace 9.5's recipe with the foundation recipe verbatim: mktemp -d, git archive HEAD | tar -x, cd \"$D\", write settings.json naming $D under packages, `PI_CODING_AGENT_DIR=\"$D\" pi --no-session --help > out.txt 2>&1`. Require `head -1 out.txt` to print the usage header and `rg -c 'Failed to load extension|Host-provided extension packages'` to print nothing. Add a control that makes a registrar throw at load in the copy, expects a count of 1, and re-extracts to undo. Drop the node_modules symlink, since the foundation recipe needed no install."
    },
    {
      "id": "RDY-2",
      "severity": "major",
      "location": "tasks.md 'Verification rules' bullet 1; 9.2, 9.3, 9.6",
      "finding": "The comparisons use `git diff ... HEAD` and `git diff --stat HEAD` on the 'final committed tree'. Once the work is committed, HEAD is the new commit and these diffs print nothing. 9.3 can never show 'three enumerated differences', 9.6 can never list twelve paths, and 9.2's 'empty diff' is trivially true. No task says what the comparison base is or who commits. Separately, `git diff --stat HEAD` does not list untracked files, so the seven Create paths are invisible while uncommitted.",
      "rationale": "The zero-decision rule means the coder must not choose a base ref. The specs say 'compared with HEAD' meaning the pre-change state. The branch already has the design committed on it, so the pre-change state is a specific earlier commit.",
      "concrete_case": "After the coder commits group 8, `git diff --stat HEAD -- tests/app/extension/taiknr.test.ts` is empty even if the entry test had been edited and committed. `git diff --stat HEAD` is empty even though twelve files changed.",
      "recommendation": "Add a step before 1.1: `BASE=$(git rev-parse HEAD)`, recorded in the task report. Change 9.2, 9.3 and 9.6 to diff `$BASE..HEAD`, e.g. `git diff --stat $BASE HEAD`. State that the work is committed before group 9 and name who commits. Keep 9.4's `git grep HEAD` as is, since there HEAD is correct."
    },
    {
      "id": "RDY-3",
      "severity": "major",
      "location": "tasks.md 7.1 (and 2.1); specs/configuration/spec.md 'No parent-directory search'",
      "finding": "The spec scenario 'No parent-directory search' has no test in any task. 2.1 and 7.1 never place a pi-taiknr.json in a parent of cwd with none at `<cwd>/<CONFIG_DIR_NAME>/`. A coder who walks up the tree, or who builds the project path from the parent, stays green.",
      "rationale": "Standard §3 requires a failing behavioural test that fails when the behaviour is deleted. A requirement with no test has no proof, and Joel's Q2 clarification 'A' (cwd only) is exactly what this scenario guards.",
      "concrete_case": "A malformed `<tmp>/pi-taiknr.json` sits in the parent of the session `cwd`, with `isProjectTrusted()` true and no file at `<cwd>/.pi/`. The handler must not throw and must return the defaults. No listed case checks this.",
      "recommendation": "Add this case to 7.1 and its boundary list: a trusted session whose parent directory holds a malformed pi-taiknr.json and whose `<cwd>/<CONFIG_DIR_NAME>/` holds none → `ready` with the agent/default values and no throw."
    },
    {
      "id": "RDY-4",
      "severity": "minor",
      "location": "tasks.md 8.1 vs 8.2",
      "finding": "8.1 says 'Nothing else changes in either file' while retargeting the `config` member to `SessionConfig`. That leaves the old `import type { TaiknrConfig }` unused in turn-end.ts and context.ts. 8.2 itself notes that Biome fails the gate on an unused import (for DEFAULT_TAIKNR_CONFIG).",
      "rationale": "Applying 8.1 literally leaves lint red at `npm run check`. The coder has to decide whether to remove the import, which is a spec-sensitive hygiene call for the 'differences' list.",
      "concrete_case": "After 8.1, turn-end.ts line 2 still imports `TaiknrConfig` and nothing uses it.",
      "recommendation": "State in 8.1 that the `TaiknrConfig` import is replaced by the `SessionConfig` type import in each file, leaving no unused import."
    },
    {
      "id": "RDY-5",
      "severity": "minor",
      "location": "tasks.md 9.4, third grep",
      "finding": "`git grep -n -e '\\.pi/' -e '~/\\.pi' HEAD -- src` does not match a bare literal `\".pi\"` argument. The form `resolve(ctx.cwd, \".pi\", CONFIG_FILE_NAME)` is exactly the violation the spec scenario targets, and the pattern requires a trailing slash.",
      "rationale": "The spec says 'src/ contains no literal `.pi` or `~/.pi` path segment'. A proof that cannot detect the likeliest violation is not a proof.",
      "concrete_case": "The coder hard-codes `\".pi\"` as a `path.resolve` segment. 9.4 prints nothing and passes.",
      "recommendation": "Use `git grep -n -e '\\.pi\\b' -e '~/\\.pi' HEAD -- src` (or `-e '\"\\.pi\"'`) and state the expected empty result. Run it against the pre-change tree once as a sanity check, or confirm no existing `.pi` token is in src (the current src has none)."
    },
    {
      "id": "RDY-6",
      "severity": "minor",
      "location": "tasks.md 1.1 Verification",
      "finding": "The check says `npm run test` 'reports the existing entry test file only'. Two test files exist at HEAD: tests/app/extension/taiknr.test.ts and tests/domain/archived-output.test.ts.",
      "rationale": "A literal verification that cannot match output makes the coder judge a pass condition.",
      "concrete_case": "`npm run test` reports 2 files; the task says 1.",
      "recommendation": "Reword to 'reports the two existing test files and no new one (fake-pi.ts is not collected)'."
    },
    {
      "id": "RDY-7",
      "severity": "minor",
      "location": "tasks.md 7.1, 7.2",
      "finding": "Several wordings force a guess. (a) 7.1's failure says 'fails to import the third parameter'. vitest does not typecheck, so the real failure is the stub being a no-op: the handler never assigns the holder and never throws. (b) 'restored with `process.cwd()` in afterEach' is garbled; it means restore the env var and chdir back. (c) 7.2 does not say whether the handler is a synchronous function. The test asserts a synchronous `toThrow`, while an `async` handler would turn the throw into a rejection. (d) Neither task says how the test obtains the handler to invoke it: the recorded `on` pair's handler called with (eventStub, ctxStub).",
      "rationale": "Standard §1: the coder should not have to infer an interface or test boundary. Pi catches either, but the test shape depends on sync vs async.",
      "concrete_case": "Derek writes `async (_event, ctx) => {...}`. The test written first uses `expect(() => h()).toThrow` and fails confusingly, or is rewritten to `.rejects`.",
      "recommendation": "State: 'the handler is a synchronous `(_event, ctx)` function; the test calls the recorded handler directly and asserts with `toThrow`'. Fix (a) to 'fails because the stub neither assigns the holder nor throws'. Fix (b) to 'restore `PI_CODING_AGENT_DIR` and chdir back to the starting directory'."
    },
    {
      "id": "RDY-8",
      "severity": "minor",
      "location": "tasks.md 4.1 (chmod 000), 7.1 (`.pi` literal)",
      "finding": "Two test-environment hazards. The `chmod 000` EACCES case fails when the suite runs as root, because root ignores directory modes; no skip condition is stated. 7.1 hard-codes `<cwd>/.pi/pi-taiknr.json`, but D12 says CONFIG_DIR_NAME is `pkg.piConfig?.configDir || \".pi\"` evaluated at host load, so the test should import and use it.",
      "rationale": "Test-first checks must be deterministic. A hidden environment dependence makes the red/green evidence unreliable.",
      "concrete_case": "A container or CI run as uid 0 never gets EACCES from `chmod 000`, so the read succeeds and the test fails.",
      "recommendation": "In 4.1, skip that case when `process.getuid?.() === 0` and name the skip. In 7.1, build project fixture paths from the imported `CONFIG_DIR_NAME`."
    },
    {
      "id": "RDY-9",
      "severity": "minor",
      "location": "tasks.md 2.2",
      "finding": "The block is called 'verbatim' but `constructor(...);` and `loadTaiknrConfig(...): TaiknrConfig;` are bodiless. As written they are not compilable TypeScript (a class constructor without a body is TS2390; a function without a body outside an overload is an error). The prose partly covers this, but the 2.2 verification 'npm run typecheck passes' depends on the coder adding bodies.",
      "rationale": "Small, but this is precisely the choice-forcing ambiguity the standard excludes.",
      "concrete_case": "The coder pastes the block as written and typecheck fails.",
      "recommendation": "Add one sentence: 'the constructor and `loadTaiknrConfig` lines are signatures; the constructor gets the body described above, `loadTaiknrConfig` keeps its `throw new Error(\"Not implemented: loadTaiknrConfig\")` body.'"
    },
    {
      "id": "RDY-10",
      "severity": "minor",
      "location": "tasks.md 3.2, 4.1/4.2, 7.1/7.2",
      "finding": "Four behaviours have no named test and no explicit `none`. (a) The `lstat`-fails-with-non-ENOENT branch (4.2) is reachable only by a race. (b) 7.2's 'anything else propagates unassigned' branch is acknowledged in D5 as untested. (c) Scalar JSON roots (`5`, `\"x\"`, `true`) are covered by the 'plain JSON object' wording but not by a case. (d) 3.2 does not pin per-file sequencing: read and validate the agent file before reading the project file. The mixed case (agent has an invalid field, project path is an unreadable directory) is therefore unpinned, because 3.1's 'both broken' case may use the same failure class.",
      "rationale": "Standard §3 says to name boundary cases or state `none`. Silent gaps turn into coder choices.",
      "concrete_case": "The coder reads both files first. The agent file has `decisionThreshold: 2`; the project path is a directory. The loader reports `EISDIR` on the project file instead of the agent's field error, and no test catches it.",
      "recommendation": "State for (a) and (b) that the branch is deliberately untested and why. Add `5` and `\"x\"` roots to 3.1. In 3.1, use mixed-class both-broken cases for the ordering check, and say in 3.2 that each file is read then validated, agent first."
    },
    {
      "id": "RDY-11",
      "severity": "minor",
      "location": "specs/configuration/spec.md scenarios 'Sessions do not share a config' and 'The flip ends at the next session start'; tasks 5.1, 7.1",
      "finding": "Two further scenarios have no named test. Each factory call yields an independent holder. After `setEnabled` has flipped `enabled` in memory, a later session-start assignment replaces it from the files (7.1's re-read case does not include a prior `setEnabled`).",
      "rationale": "The spec requires each scenario to be covered, and both are cheap with the existing fixtures.",
      "concrete_case": "A coder memoises the holder at module level: nothing in 5.1 or 7.1 fails.",
      "recommendation": "Add to 5.1 that two `createSessionConfig()` calls do not share state. Add to 7.1's re-read case a `setEnabled(false)` before the second call, then assert the second call's file value wins."
    }
  ],
  "assumptions": [
    {
      "assumption": "Every file path named in the File Boundary matches the repo. The four Modify src files, `tests/app/extension/taiknr.test.ts` and `tests/domain/archived-output.test.ts` exist at HEAD. The new paths do not exist and follow design.md's placement.",
      "status": "verified"
    },
    {
      "assumption": "`getAgentDir` and `CONFIG_DIR_NAME` are exported from the host package index. `getAgentDir()` reads `PI_CODING_AGENT_DIR` at call time (config.js L510–516), so per-case env changes work.",
      "status": "verified"
    },
    {
      "assumption": "The host `on` overloads all return `() => void`. The loader's `api.on` does not use `this`, so the gate's unbound call `(target.on as unknown as LooseOn)(...)` is safe.",
      "status": "verified"
    },
    {
      "assumption": "The only consumers of `TaiknrConfig`-typed deps are taiknr.ts, turn-end.ts, context.ts and pi-jev-scorer-adapter.ts. The adapter is untouched, so 8.1's typecheck failure is confined to taiknr.ts.",
      "status": "verified"
    },
    {
      "assumption": "vitest 5 runs tests in forked processes by default, so `process.chdir` in 7.1's relative-agent-dir case works. vitest.config.ts sets no pool.",
      "status": "unverified"
    },
    {
      "assumption": "Pi's jiti loader resolves value imports of `getAgentDir` and `CONFIG_DIR_NAME` from the host package inside the extension. Only a working 9.5 can show this.",
      "status": "unverified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "Did not run any command, test, typecheck, Pi, or git, per the brief.",
    "Did not verify the host's `pkg.piConfig.configDir` value or the vitest default pool by execution.",
    "Did not re-open settled items from design-review.md, michael-council-rulings.json or michael-resolve-*.json.",
    "Did not read research-chidi.md or research-eleanor.md in full, nor council.md or michael-orientation.md; design.md cites them."
  ]
}