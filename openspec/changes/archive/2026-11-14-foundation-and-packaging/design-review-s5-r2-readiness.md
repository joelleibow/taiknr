{
  "mode": "review",
  "lens": "council-readiness",
  "paraphrase_proposes": "tasks.md orders the work in six groups. First, write the six root files (package.json, .gitignore, tsconfig.json, biome.json, vitest.config.ts, and package-lock.json via npm install) and commit them as six paths. Second, run `npx biome check --write .` as its own seven-path commit, which is meant to be whitespace only. Third, write the red entry test with its full file text, replace the seven throwing handler bodies with `_pi.on(\"<event>\", () => {});`, and commit. Fourth, add the three-`test` domain test, prove it with the `>=` to `>` mutation, and commit. Fifth, run `npm run check` green and show each of its three layers failing once. Sixth, run a manual load check in a `git archive HEAD` copy under a throwaway PI_CODING_AGENT_DIR, with two negative controls. Joel's settings.json edit, the docs pass and the rollback order are outside the task list.",
  "paraphrase_existing": "The repo is stub-stage and has no package.json, tsconfig, .gitignore or harness. `tests/` is empty on disk. All seven `register*Handler` bodies throw `Not implemented: <name>`, and each takes `_pi: ExtensionAPI` as its first parameter. I read these on disk. `src/app/extension/taiknr.ts` is the single entry. It only passes `pi` through to the seven registrars and uses no Pi runtime of its own. `shouldArchive` in `src/domain/archived-output.ts` is implemented as `rawTextLength >= minCharsToArchive`. Four `src/` files hold multi-line signatures or imports that fit within 120 columns. `tool-call.ts` is one of them and `pi-archive-adapter.ts` has a multi-line import list.",
  "recommendation": "Nearly ready. All eight round-1 readiness findings are applied correctly. The entry test uses the three-level specifier `../../../src/...`, and both test files are given verbatim with no `describe`. Task 1.3 has the lockfile-stability and drift rule, and 1.7 carries the clean-tree check. 3.9 uses `git show --stat`, and 6.x uses `R=$(pwd)` and `git -C \"$R\"`. One major finding remains: task 2.1's whitespace-only oracle cannot prove what it claims, so the coder would have to invent a check. Two minor items are also open: two spec scenarios have no check, and the §6 recipe assumes one persistent shell. No owner question is needed. Fix 2.1 and the two minor items, then this passes.",
  "findings": [
    {
      "id": "RDY-S5R2-1",
      "severity": "major",
      "location": "tasks.md §2, task 2.1 Verified (`git show -w --stat -- src/` clause)",
      "finding": "Task 2.1 proves the four `src/` files changed by whitespace alone with `git show -w --stat -- src/` producing 'no hunk'. That oracle cannot do the job. `--stat` never prints hunks, so the clause is vacuous. And `-w` ignores whitespace inside a line but does not join lines or ignore commas. The 120-width pass collapses multi-line parameter and import lists into one line. Joining lines and dropping the trailing comma change the non-whitespace content of a line.",
      "rationale": "Decision 3 and Risks 5 rest on 'a reviewer can read the diff as whitespace alone', and the spec scenario 'Signatures unchanged' says 'any remaining difference is formatter whitespace'. The task is the only place that says how the coder shows it. The coder is left to improvise a check on the one commit meant to hide no behavior change (standard §3, provable checks). No measurement in the repo's recorded measurements shows `git show -w` coming back empty for these files.",
      "concrete_case": "`src/infra/pi-event-handlers/tool-call.ts` at HEAD has `export function registerToolCallHandler(\\n\\t_pi: ExtensionAPI,\\n\\t_argsByCallId: Map<string, string>,\\n): void {`. After the pass the signature is a single line with no trailing comma. `git show -w --stat -- src/` still lists the file with insertions and deletions. `pi-archive-adapter.ts`'s import list collapses the same way. The coder sees four changed files where the task says there is no hunk, and has to decide whether the pass is acceptable.",
      "recommendation": "Replace the clause with an oracle that can fail. For each of the four `src/` paths, compare the file at `HEAD~1` and `HEAD` with whitespace and commas stripped. For example, `[ \"$(git show HEAD~1:$f | tr -d ' \\t\\n,')\" = \"$(git show HEAD:$f | tr -d ' \\t\\n,')\" ]` must be true. Alternatively, state that the diff is read as line joins and trailing-comma removals only, and name `git show --word-diff=color` as the reading tool. Also state that the two non-JSON checks (`npm run typecheck` and the unchanged-signature reading) are the guard. Say which one is binding."
    },
    {
      "id": "RDY-S5R2-2",
      "severity": "minor",
      "location": "tasks.md §3–§4 (no task covers two spec scenarios)",
      "finding": "Two scenarios have no checking task. extension-packaging 'No competing entry point' needs no `index.ts` and no `extensions/` directory at the package root. extension-packaging 'Boundary holds' needs no `@earendil-works/pi-` import under `src/domain/` or `src/use-cases/`. Task 4.1's `rg -c '@earendil-works'` covers only the new test file, not the two source directories.",
      "rationale": "Standard §3 wants each behavior the spec names to have a check. Both scenarios are one-line greps, so a coder following tasks.md cannot tell whether to run them or skip them. 'Boundary holds' guards against a regression the change can cause, because the handler edits touch `src/infra/` next to those directories.",
      "concrete_case": "The coder finishes 5.5 with every task ticked. Nobody ran `rg -c '@earendil-works/pi-' src/domain src/use-cases` or `ls index.ts extensions`. A later stray `index.ts` or a Pi import in `src/domain/` would pass every ticked task.",
      "recommendation": "Add one Verified line to 4.3 or 5.1. `rg -c '@earendil-works/pi-' src/domain src/use-cases` prints nothing and exits 1, and `ls index.ts extensions` reports both missing. Name the two scenarios."
    },
    {
      "id": "RDY-S5R2-3",
      "severity": "minor",
      "location": "tasks.md §6, tasks 6.1–6.4 (shell variables `R`, `D`, and the 'pi line' reruns)",
      "finding": "Tasks 6.2 and 6.3 reuse `$R`, `$D`, the working directory inside `$D`, and the exact `PI_CODING_AGENT_DIR=\"$D\" pi --no-session --help > out.txt 2>&1` line, and 6.4 reuses `$R` and `$D` after them. The task never says the sequence must run in one persistent shell, or gives the rerun line in full. 6.1's prerequisites also give no instruction if Node, npm or Pi differ from the measured versions.",
      "rationale": "If the coder runs each command in a fresh shell, `$D` is empty and `git archive HEAD | tar -x -C \"\"` or `rm -rf \"$D\"` behaves wrongly. `rm -rf \"$D\"` with an empty `D` is a no-op, but a wrong `-C` target is not. The rerun line is described as 'the `pi` line' and the coder has to reassemble it. This is a hand-off gap, not a design gap.",
      "concrete_case": "6.2 runs in a new shell. `$D` is unset, so `git -C \"$R\" archive HEAD | tar -x -C \"$D\"` extracts into the current directory, which may be the live checkout. The 'Undo' step then overwrites tracked files in place.",
      "recommendation": "Add one sentence at the top of §6: run 6.1–6.4 in a single shell session so `R` and `D` persist. Write the rerun line as the full command with `cd \"$D\" &&` in front. Add that the coder stops and reports if the prerequisites differ, rather than proceeding."
    }
  ],
  "assumptions": [
    {
      "assumption": "All seven stub bodies match the quoted `throw new Error(\"Not implemented: <name>\")` text, and each handler's first parameter is `_pi`. The target paths in the File Boundary table exist.",
      "status": "verified"
    },
    {
      "assumption": "`src/domain/archived-output.ts` implements `shouldArchive(rawTextLength, minCharsToArchive)` as `>=`, so the three domain tests pass immediately and the `>=` to `>` mutation fails exactly the (10, 10) case.",
      "status": "verified"
    },
    {
      "assumption": "`tests/` is empty on disk. The entry test at `tests/app/extension/` correctly reaches `src/` with `../../../src/...` and the domain test at `tests/domain/` with `../../src/...`.",
      "status": "verified"
    },
    {
      "assumption": "`taiknr.ts` touches the `pi` argument only by passing it to the seven registrars, so the Proxy fake that throws on any member except `on` does not trip before the stubs are replaced.",
      "status": "verified"
    },
    {
      "assumption": "The four `src/` files named in the File Boundary table have multi-line signatures or import lists that collapse at width 120. This makes the `-w` oracle wrong in RDY-S5R2-1.",
      "status": "verified"
    },
    {
      "assumption": "Biome 2.6.7, tsc, vitest, npm and Pi behave as recorded in the earlier measurements. These cover the seven-file pass count, the `No fixes applied` text, the `--reporter=summary` listing of file names, and the Pi diagnostics. I did not run any of them.",
      "status": "unverified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "Anything that needs execution. I did not run Biome, npm, tsc, vitest or Pi, so the seven-file pass count, the read-only `No fixes applied` text, and the Pi load diagnostics are taken from earlier measurements.",
    "Whether `git show -w --stat` lists the four files with changed counts. I derived this from git's line-based semantics and the on-disk source, not from a run.",
    "Current npm registry resolution of the caret ranges. This was settled by `michael-resolve-s5-r1.json` and the drift rule in 1.3.",
    "Logging and boundary-error requirements (standard §5). No entry point, use case or adapter is added, only no-op registrations, so §5 does not apply.",
    "Settled items from design-review.md, michael-council-rulings.json and every michael-resolve-*.json. I did not re-open them, including the 'No fixes applied' oracle and the three-`test` shape."
  ]
}