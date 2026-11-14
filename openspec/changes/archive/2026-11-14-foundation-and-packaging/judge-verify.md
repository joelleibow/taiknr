# Verification Report: foundation-and-packaging

Using change: `foundation-and-packaging` (schema `marbleization`). Branch `foundation-and-packaging`, HEAD `2712f09`.
Code commits verified: `ef06173` (root tooling), `74c8ae6` (format pass), `515c3ef` (no-op handlers + entry test), `4ca78f3` (domain test), `2712f09` (docs).
No model-calling file was run. Scratch work was done in `mktemp -d` copies of `git archive HEAD`, removed afterwards.

## Summary

| Dimension    | Status |
|--------------|--------|
| Completeness | 31/31 tasks ticked; 13 ADDED requirements across 2 capability specs, all have implementation |
| Correctness  | 12/13 reqs fully met; 1 req not met (fresh install dirties the tree). 21/22 scenarios confirmed |
| Coherence    | Design decisions 1–13 followed; 1 suggestion |

No REMOVED, RENAMED or MODIFIED requirements; there are no living specs under `openspec/specs/`.

## Evidence that ran

- `npm run check` on the live tree: exit 0. Biome checked 26 files (no fixes), `tsc --noEmit` silent, vitest 2 files / 4 tests passed. `git status` clean afterwards (the "Check never writes" scenario).
- Failure scenarios, run in an archive copy: a space-indented line makes `check` exit 1 (lint); `shouldArchive("9", 10)` gives a TS error (type); `shouldArchive(11, 10)` asserted `false` makes `check` exit 1 (test).
- `tsc --noEmit --listFiles` names no `jev-context-poc`; `vitest run` collects only the two `tests/` files.
- `rg "@earendil-works/pi-" src/domain src/use-cases` finds nothing; there is no root `index.ts` and no `extensions/`.
- Manual load check (Decision 6 recipe, Pi 1.5.2, Node 26.8.1, npm 11.19.0): the usage header was present; neither `Failed to load extension` nor `Host-provided extension packages` appeared. Control A (restored `throw` in `session-tree.ts`) gave the load error (count 1). Control B (host package added to `dependencies`) gave the warning (count 1).
- Whitespace-only proof, run against the pre-format commit: the four `src/` files and `package.json`, `tsconfig.json`, `biome.json` are all identical to their `ef06173^` or `ef06173` versions once spaces, tabs, newlines and commas are stripped.
- Handler diff `ef06173^..HEAD -- src`: each of the seven stub bodies is replaced by `_pi.on("<event>", () => {});`. Parameter names, parameter order and return types are unchanged. The only other diff is formatter whitespace in the four named files.
- Commit shape: `ef06173` has exactly six paths, `74c8ae6` exactly seven, `515c3ef` eight, `4ca78f3` one.
- `biome.json`, `tsconfig.json`, `vitest.config.ts`, `.gitignore` and `package.json` match the Decision 1, 7, 8, 10 and 11 blocks by content. `package.json` has no `dependencies`, no publishing metadata, and no `--write` in any script. `.gitignore` has no `.pi/` entry and no lockfile entry.

## Issues by priority

### CRITICAL

1. **Requirement not met: "A fresh install leaves the working tree clean" (development-checks), scenario "Install does not dirty the tree".**
   - Measured: in a `git archive HEAD` copy committed as a clean repo, `npm install` rewrote `package-lock.json` (`3486 insertions, 3486 deletions`), and `git status` showed ` M package-lock.json`. I also ran `npm install` in the live checkout, which dirtied it the same way; I restored the file with `git checkout -- package-lock.json`, and the tree is clean again.
   - Cause: the lockfile was generated in task 1.3 while `package.json` was still 2-space indented. The format pass (`74c8ae6`) then re-indented `package.json` with tabs. npm copies `package.json`'s indent into the lockfile, so every later `npm install` rewrites the lockfile in tabs. `git diff -w` on the rewrite is empty, so the diff is whitespace only.
   - Why the task check missed it: task 1.7 ran the "install does not dirty the tree" check on the pre-format tree. Nothing re-ran it after 2.2.
   - Recommendation: re-run `npm install` on the committed tree and commit the whitespace-only `package-lock.json` change, then confirm `npm install && git status --short` prints nothing. Add that check to task 2.2 or 5.1 so the order cannot hide it again. Task 1.3's "lockfile stable" check should also run after the format pass.

### WARNING

None.

### SUGGESTION

1. **Docs commit goes slightly past the proposal's stated docs pass.** `2712f09` adds `AGENTS.md` and `docs/adr/…-development-with-biome-tsc-and-vitest-under-npm.md` (ADR 0003). The proposal lists only the `ARCHITECTURE.md` §8 correction and the deferred-boundary note. The `ARCHITECTURE.md` text is accurate against the code; it is additive and breaks nothing. Recommendation: record AGENTS.md and ADR 0003 in the PR description so a reviewer does not read them as scope creep. Neither is a requirement.

## Completeness detail

- Tasks: 31 of 31 ticked, 0 remaining. Spot-checked against the tree and the commit log; no ticked task contradicts the code except the 1.7 claim in CRITICAL 1.
- Requirement coverage:
  - `extension-packaging`: manifest entry, peer deps, load without error, signatures/boundary preserved, ESM with `.js` specifiers, throwaway agent dir. All implemented.
  - `development-checks`: check chain, type-check scope, test include, domain test without Pi, Biome baseline, lint scope, boundary deferred, clean install. All implemented except the clean-install scenario above.

## Coherence

- Design adherence: followed. `lineWidth` 120 is the only deviation from the init baseline. The `files.includes` allowlist has six entries. The `_pi` parameter name is kept. There is no `exclude` key in `tsconfig.json`. `vitest.config.ts` sets only `include`. There is no `.git-blame-ignore-revs`, no `format` script and no boundary lint rule. Decision 12's deferral is recorded in the design and in `ARCHITECTURE.md` §8.
- Code pattern consistency: tests mirror the `src/` layers, import `expect` and `test` from `vitest`, and use `.js` specifiers, as the design and `AGENTS.md` say. No deviations found.

## Final Assessment

1 critical issue found. Fix before archiving: regenerate and commit `package-lock.json` so `npm install` leaves a clean tree. No warnings. 1 suggestion.

Not verified:
- The "Joel's settings file is unchanged" scenario. It is outside the repository and I did not read it. The change's commits touch no file outside the repo, and every Pi run I made used a throwaway `PI_CODING_AGENT_DIR`.
- Task 3.1's "red against `HEAD`'s throwing stubs" and task 4.2's `>=`→`>` mutation. These are historical steps, and I did not replay them. The control A result shows the load check goes red on a throwing handler.
- Behaviour on a different Pi version. Only 1.5.2 was installed.
