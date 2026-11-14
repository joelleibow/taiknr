# PR review — foundation-and-packaging (PR #1)

Reviewed head commit: `2712f096cd588a42735f1726025c52b3a9346184` (unchanged from start to end of review).

What this change does: It gives the stub-stage `pi-taiknr` extension a package shape (`package.json`, lockfile, `tsconfig.json`, `biome.json`, `vitest.config.ts`, `.gitignore`). It makes the seven lifecycle handlers register empty callbacks instead of throwing, so Pi can load the extension. It adds one `npm run check` command (lint, then type-check, then tests), two small tests, and docs (ARCHITECTURE.md, ADR 0003, AGENTS.md). Nothing behavioural is built.

## Must fix
None.

## Should fix
None.

## Nice to have

1. **The PR carries about 50 workflow files that its description never mentions** (`openspec/changes/foundation-and-packaging/council*.md`, `design-review*.md`, `michael-*.json`, `research-*.md`, `owner-rulings.md`, `design.md`, `tasks.md`)
   - **What this is:** Besides the real change (about 4,000 lines including a 3,488-line lockfile), the diff adds roughly 5,000 lines of planning, review and decision notes under the change directory.
   - **Problem:** The description lists every code and doc file but is silent on these. A reviewer reading only the description would not know they are in the diff, or whether they are meant to land on `main`. I did not read them (by design), so I cannot say whether they are right.
   - **Fix:** Add one line to the description saying they are the change's working record and are meant to be merged (or drop them from the PR if they are not).
   - **If we skip it:** Nothing breaks. A later reader may be unsure whether the pile was intended.

## What I checked

- Ran `npm run check` on the head: lint (26 files), `tsc --noEmit` and vitest (2 files, 4 tests) all pass, and `git status` stays clean afterwards (so the "check never writes" requirement holds).
- Ran the load check by hand: a `git archive HEAD` copy listed under `packages` in a throwaway `PI_CODING_AGENT_DIR`, then `pi --no-session --help` with Pi 1.5.2. Stderr was empty: no `Failed to load extension` line and no host-package warning. (I symlinked `node_modules` into the copy, so this run is not a fresh-install test.)
- Held the diff against `proposal.md` and both spec deltas:
  - `package.json`: manifest names the single entry; the Pi package is a `"*"` peer and a `^1.5.2` dev dependency only; `"type": "module"`; the four scripts are in the required order; no `--write` anywhere in the chain; no publishing fields.
  - Config files: `biome.json` has the allowlist, VCS integration and `lineWidth` 120 and no rule overrides; `tsconfig.json` uses `nodenext` and strict and leaves out `jev-context-poc.ts`; `vitest.config.ts` includes only `tests/**/*.test.ts`; `.gitignore` has no `.pi/` and no lockfile entry; the lockfile is committed and every package resolves from `registry.npmjs.org`.
  - Source: all seven handlers register exactly their own event, and no signature or parameter name changed. The `src/` diff outside those bodies is line-wrap only. `src/domain/` and `src/use-cases/` gain no Pi imports.
  - Tests: the `taiknr.test.ts` Proxy fake throws on any `ExtensionAPI` member except `on`, so "registers nothing else" is really enforced. The `shouldArchive` test covers below, at and above the threshold, through the `.js` import.
- Read the docs against the code: ARCHITECTURE.md §3/§6/§8, ADR 0003 and AGENTS.md match the config as committed.

Verdict: Ship.

Not checked: the content of the workflow files named in finding 1 (blind by design); a from-scratch `npm install` on a clean machine; the claim in ARCHITECTURE.md and ADR 0003 that sibling extensions and Pi's own root use the same toolchain (not verifiable from this repo); and that `pi` warns when the peer moves to `dependencies` (I did not rerun the negative controls).
