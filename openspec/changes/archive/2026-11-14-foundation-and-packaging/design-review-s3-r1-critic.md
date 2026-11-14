{
  "mode": "review",
  "lens": "council-critic",
  "paraphrase_proposes": "",
  "paraphrase_existing": "",
  "recommendation": "Approve after one major fix. The design calls the three root JSON configs (`package.json`, `tsconfig.json`, `biome.json`) 'verbatim' but shows them with 2-space indentation. Biome is set to `indentStyle: \"tab\"` and these files are on its `files.includes` list, and the measured one-time format pass covers only `src tests`. So the first `npm run check` on a tree built from the design is red on formatting. Say that the blocks fix content, not whitespace, and widen the format pass to the whole allowlist. The other three findings are minor calibration and safety fixes. Nothing in them changes a ruling.",
  "findings": [
    {
      "id": "CR-S3-1",
      "severity": "major",
      "location": "design.md — Decision 1 (biome.json block), Decision 8 (package.json block), Decision 10 (tsconfig.json block), Decision 3 (one-time format pass); Goals bullet 5",
      "finding": "The three root JSON configs are called 'written verbatim' but are shown with 2-space indentation. They also sit inside Biome's `files.includes` allowlist under `formatter.indentStyle: \"tab\"`. The only measured format-pass command, `biome check --write src tests` (R3, quoted in michael-resolve-s1s2.json COMP-5), skips them. Copied verbatim, they fail `biome check .` on formatting.",
      "rationale": "Biome's global `formatter.indentStyle` applies to JSON as well as TS. Chidi §1 says the `biome init` file is 'already tab-indented'. The sibling `pi-omlx`, whose Biome includes `**/*.{ts,json}`, keeps `package.json`, `biome.json` and `tsconfig.json` all tab-indented (live read: `pi-omlx/package.json:2`, `biome.json:3`, `tsconfig.json:2` start with a tab). So does Pi's own installed `pi-coding-agent/package.json`. Biome's default JSON `expand: auto` also probably collapses short multi-line arrays such as `pi.extensions` and `files.includes` onto one line at width 120 (not checked). Decision 3 says the format pass guarantees a green first `check`. That holds for `src/`, but nothing covers the four root files Biome reads. Goal 5 ('the first real feature card starts from a green check') and the 'Check fails on a lint error' scenario then fire on the change's own configs.",
      "concrete_case": "Derek copies the Decision 1 block into `biome.json` with its 2-space indent, runs `npx biome check --write src tests` as measured, then runs `npm run check`. `biome check .` reports format errors on `biome.json`, `package.json` and `tsconfig.json` (tabs expected), and probably array-collapse diffs as well. `lint` exits non-zero, so `check` stops before `typecheck`.",
      "recommendation": "Add one sentence to Decisions 1, 8 and 10, or once under Module & File Placement: 'The blocks fix content. Whitespace in every file on the allowlist is whatever `biome check --write` produces.' Widen Decision 3's pass to the whole allowlist (`biome check --write .`, which `files.includes` scopes), run after the configs are written. Keep the `src/` reflow and the config normalisation as separate reviewable hunks. No new script or config value is needed."
    },
    {
      "id": "CR-S3-2",
      "severity": "minor",
      "location": "design.md — Decision 5 ('fixes the exact resolution of every tool the checks run'), Decision 8 table row for typescript/vitest/@types/node, Risks 11",
      "finding": "No cited measurement shows the verbatim Decision 8 manifest installed and run end to end. R4's measured lockfile resolved `typescript 5.9.3` under an earlier manifest. R7 measured TypeScript 7.0.2 only through `npx -y -p typescript@7.0.2 tsc`, outside the installed tree. The 'full chain exit 0' evidence does not say which TypeScript was installed.",
      "rationale": "Standard §6 says statements about tested behavior must match the cited evidence. The lockfile this change commits will resolve `typescript` 7.x alongside vitest 5.1.0, vite 8 and pi-coding-agent 1.5.2, and no cited run covers that tree. I checked live that the installed `@earendil-works/*` 1.5.2 packages declare no `typescript` peer, so an ERESOLVE is unlikely. The claim is still stronger than its evidence.",
      "concrete_case": "The lockfile committed under Decision 8 pins `typescript` 7.0.x. If any transitive tool in that tree misbehaves under TS 7 (e.g. a type-only import vitest resolves differently), `npm install && npm run check` fails on a clean checkout. The design calls this combination 'measured green'.",
      "recommendation": "Cite a single measurement of exactly the Decision 8 `package.json` in a `git archive` copy: `npm install && npm run check` exits 0 and the lockfile root shows `typescript` 7.x. Or soften Decision 5 to 'fixes the resolution the first `npm install` produces'. The ranges stay as they are; R7 stands."
    },
    {
      "id": "CR-S3-3",
      "severity": "minor",
      "location": "design.md — Decision 6, negative controls A and B",
      "finding": "Both controls break the live checkout (a restored `throw`, or a `dependencies` block). They then undo the change with `git checkout -- <file>`. The only guard is a stated precondition, 'each on a clean tree'. Nothing says what to do if the tree is not clean, and nothing isolates the window from concurrent users of the checkout.",
      "rationale": "Standard §4 asks what each guard refuses and how concurrent runs behave. On a dirty tree, `git checkout -- src/infra/pi-event-handlers/session-tree.ts` silently throws away the uncommitted no-op edit. During Control A, any other process loading this checkout sees a throwing entry: a parallel `npm run check`, or every Pi session on the machine if the check is re-run after Migration step 2 activates the settings entry (Risks 2: `--print`/`--mode json` exit 1). Michael ran the controls in a `git archive` temp copy (COMP-1/COMP-2 evidence), not in the live tree.",
      "concrete_case": "After the merge and Joel's settings edit, someone re-runs the manual check as a regression test. While Control A's `throw` is in place, every `pi --print` run Joel starts in any project exits 1 with `Failed to load extension … Not implemented: registerSessionTreeHandler`.",
      "recommendation": "Run the controls in a throwaway copy, as Michael measured: `git worktree add \"$D/wt\" HEAD` (or `git archive HEAD | tar -x -C \"$D/wt\"`), with `settings.json` pointing at `$D/wt`. The live tree is never touched, `git checkout --` is not needed, and `rm -rf \"$D\"` plus `git worktree prune` cleans up. If the live-tree form stays, turn the precondition into a refusal: 'if `git status --short` is non-empty, stop and commit first.'"
    },
    {
      "id": "CR-S3-4",
      "severity": "minor",
      "location": "design.md — Risks 7; Migration Plan step 5",
      "finding": "The design says `package-lock.json` is left on disk as untracked after a revert and must be deleted by hand. But Decision 5 commits the lockfile, so `git revert` deletes it from the working tree. Only `node_modules/` is left untracked.",
      "rationale": "Standard §6: every caveat must match the evidence and name the operator action it drives. The lockfile only comes back as untracked if someone runs `npm install` after the revert. This corrects the wording of a consequence. R8's decision (leave build leftovers for manual deletion) is unchanged.",
      "concrete_case": "Joel reverts the merge commit and runs `git status`. It shows `node_modules/` as untracked and no `package-lock.json`, because the revert removed the tracked file. Step 5 tells him to delete a file that is not there.",
      "recommendation": "Reword Risks 7 and step 5 to: 'delete `node_modules/` by hand, and `package-lock.json` too if `npm install` ran after the revert.'"
    }
  ],
  "assumptions": [
    {
      "assumption": "Every `@earendil-works/pi-*` import in `src/` is `import type`, so the entry test and domain test need no Pi runtime.",
      "status": "verified"
    },
    {
      "assumption": "`shouldArchive` at HEAD is `rawTextLength >= minCharsToArchive` and `src/domain/archived-output.ts` imports nothing.",
      "status": "verified"
    },
    {
      "assumption": "The entry composes only `InMemoryArchiveStore` (a non-throwing class) and the seven registrars, so the no-op edits make the factory load without throwing.",
      "status": "verified"
    },
    {
      "assumption": "Biome's global `formatter.indentStyle: \"tab\"` applies to JSON files on the allowlist, so 2-space JSON is reported as unformatted. Inferred from Chidi §1 and the tab-indented, Biome-checked JSON in `pi-omlx` and in installed Pi packages. Not run here.",
      "status": "unverified"
    },
    {
      "assumption": "Biome's JSON formatter collapses short multi-line arrays (`pi.extensions`, `files.includes`) to one line at width 120.",
      "status": "unverified"
    },
    {
      "assumption": "The installed `@earendil-works/*` 1.5.2 packages declare no `typescript` peer dependency (read in `pi-omlx/node_modules`).",
      "status": "verified"
    },
    {
      "assumption": "`npm install && npm run check` with exactly the Decision 8 manifest exits 0 with `typescript` 7.x installed in the tree.",
      "status": "unverified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "Did not run Biome, npm, tsc, vitest or Pi. All behavior claims rest on cited measurements or live file reads.",
    "Did not check whether npm versions other than 11.19.0 rewrite `package-lock.json` on `npm install`, which would affect the 'Install does not dirty the tree' scenario.",
    "Did not re-check the settled items (COMP-5/6/7, ZO-S1-1, licence, repo name, manual check without install) or R1–R11 decisions, except where the wording of R8's consequence is corrected in CR-S3-4.",
    "Did not read `michael-orientation.md` or the council-<lens>.md reports beyond what the design quotes."
  ]
}