# Design Review

Four stages, run fresh-context over `design.md` before tasks were drafted, and resolved by Michael (retained Oracle). Lens IDs below follow each report's own scheme; Michael's resolution files use a second scheme for the same findings. The mapping is in Stage 3.

## Stage 1: Initial Zoom Out

`council-zoom-out` and `council-catalyst` read `design.md` against the zoom-out standard. Neither raised a blocking or major issue, and neither asked an owner question.

**zoom-out — "Pass with one minor clarification."**

- **ZO-S1-1 (minor).** "One canonical table, which the seven stub bodies and the entry test both read" can imply a shared executable mapping, "despite the explicit plan for no new source module and literal event registrations." Its concrete case: an implementer makes both the handlers and the test's expected names read one mapping, then changes `session_tree` to the valid Pi event `session_before_tree` in that mapping, so production and assertion move together and the entry test passes instead of catching the wrong event. Its recommendation was to call the table a documentation reference, keep each handler's event literal local, and spell out the seven expected names independently in the test.
- **Its assumptions:** root tooling configuration and mirrored tests are the only new file responsibilities (verified); existing handler modules own lifecycle registration while the composition root and the inward layers keep their roles (verified); tool compatibility and manual load behaviour rest on the recorded research and Michael's measurements, "not independently executed during this read-only review" (unverified).

**catalyst — no findings: "No false compromise detected."**

- It reported that the design satisfies local Pi loading, read-only check reproducibility, frozen proof-of-concept isolation and ADR 0001 layer purity through config-level allowlists, commit segmentation and layer-split tests, "without adding src/ modules, wrappers, or speculative tooling."
- **Its assumptions:** `proposal.md` is non-empty and aligned with the design's file list and non-goals (verified, after a first read returned an empty object); the `biome.json` allowlist restricts both the CLI and editor LSPs without PoC negative globs (unverified); a version-less manifest installs and loads under Pi 1.5.2 (unverified); the seven no-op edits type-check and format clean while keeping the `HEAD` parameter names (unverified).
- **Fidelity note.** In the council round the same lens reported that its reads of `owner-rulings.md` and `proposal.md` had returned empty; at Stage 1 it repaired that by confirming the proposal verbatim through Eleanor.

## Stage 2: Comprehension Test

`council-comprehension` read `design.md` alone, doc-only.

**What this proposes (naive paraphrase):**

> The design adds npm, TypeScript, Biome and Vitest configuration, replaces seven throwing handler stubs with no-op event registrations, and tests the entry point and a domain behavior. It also calls for a separate formatter-only change, an automated check, and a manual Pi loading check before the owner enables the package in their settings. Publishing and enforcement of the domain import boundary are deferred.

**How the existing system works, per design.md:**

> The document describes a stub-stage repository without package configuration or a test harness, whose extension entry currently fails to load because its handler registration functions throw. Domain and use-case code must remain independent of Pi, while the extension entry, handler signatures, adapter and port contracts are fixed. The existing source is not fully formatted at any of the widths the document says were measured.

Its recommendation was to "revise the manual verification procedure and make the test contracts and document-specific references self-contained before implementation." The seven findings it raised:

| ID | Severity | What it flagged |
|---|---|---|
| COMP-1 | major | The manual check treats silence from a filtered pipeline as success: with `pi` missing, the command-not-found text matches neither pattern, so output is empty exactly as in the success case, and `rg`'s no-match exit status has no stated rule. |
| COMP-2 | major | The negative controls state no edit, no undo, no answer on whether `npm install` is required, and no safe JSON construction for the absolute path. |
| COMP-3 | major | The domain test is specified only as "threshold behavior", without the signature, the comparison, or the expected cases, including whether a value exactly at the threshold archives. |
| COMP-4 | major | `D#`, `S#`, `Trap #`, `R#` and the council lens IDs are used as authority without a key, and in four places the ID stands in for content a reader needs (`S1`, `S2`, `S3`, `D6`). |
| COMP-5 | minor | The format-only commit is not an actionable sequence: no writer command, and no statement of what must exist before the pass can run. |
| COMP-6 | minor | Calling `lineWidth` "the only deviation from `biome init` output" is inconsistent with also naming VCS integration and the scoped file list as additions. |
| COMP-7 | minor | The measured operator environment (Node, npm, Pi, `rg`) is not stated, though the green-check and manual-load claims depend on it. |

Its three assumptions: the design is the only permitted evidence (verified); a shell pipeline can print nothing when a command fails with text that matches neither pattern (verified); the dependency and formatter measurements are correct (unverified).

## Stage 3: Critic Review Loop

`council-critic` and `council-structural` read `design.md` against the feature-spec standard, looping with Michael as Resolver until two consecutive clean rounds.

**Outcome: 3 rounds. Round 1 came back `needs_fixes`. Rounds 2 and 3 both came back `clean`, which is the two consecutive clean rounds the loop requires; the loop closed well inside the cap of 5 and never hit the churn stop.**

Two findings were repaired in `design.md`, and one repair came from Michael himself; every other finding was declined as non-blocking, six with wording recorded for one fold-in pass. Round 3's critic raised nothing and reported four live-code checks it had run instead.

| Round | Lens | Findings | Round status |
|---|---|---|---|
| 1 | critic | CR-S3-1 (major), CR-S3-2, CR-S3-3, CR-S3-4 (minor) | `needs_fixes` |
| 1 | structural | STRUCT-S3R1-1, STRUCT-S3R1-2 (minor) | `needs_fixes` |
| 2 | critic | CR-S3R2-1, CR-S3R2-2, CR-S3R2-3 (minor) | `clean` |
| 2 | structural | STRUCT-S3R2-1 (minor) | `clean` |
| 3 | critic | none; four verified checks | `clean` |
| 3 | structural | STRUCT-S3R3-1, STRUCT-S3R3-2 (minor) | `clean` |

**Round 1 findings.**

- **CR-S3-1 (major).** The three root JSON configs are called "written verbatim" but shown with 2-space indentation, and they sit inside Biome's `files.includes` under `indentStyle: "tab"`, while the only measured format-pass command was `biome check --write src tests`. Copied as shown, they fail `biome check .` on formatting. Its recommendation: say the blocks fix content rather than bytes, and widen the pass to the whole allowlist.
- **CR-S3-2 (minor).** No cited measurement installed the exact Decision 8 manifest end to end; R4's lockfile resolved `typescript` 5.9.3 under an earlier manifest, and R7 measured 7.0.2 only through `npx -y -p typescript@7.0.2`, outside the tree.
- **CR-S3-3 (minor).** Both negative controls mutate the live checkout and undo with `git checkout -- <file>`, guarded only by a stated clean-tree precondition. On a dirty tree that command discards uncommitted work, and during Control A any other process loading the checkout sees a throwing entry.
- **CR-S3-4 (minor).** Risks 7 and Migration Plan step 5 say `package-lock.json` is left untracked after a revert, but Decision 5 commits it, so a revert removes it from the working tree.
- **STRUCT-S3R1-1 (minor).** Context says "fifteen tracked `src/` files" while citing Eleanor §1, the disk, and R1's own measurement, all of which say twenty.
- **STRUCT-S3R1-2 (minor).** The `.gitignore` placement row points at Decision 5, which owns the lockfile policy; the entries themselves live in Decision 11.

**Round 2 findings.** CR-S3R2-1: nothing says how the two test files, written after the pass, acquire Biome's style. CR-S3R2-2: "the four root files are new in that commit" where six root files are written before the pass, the seven-file claim carries no inline source, and `proposal.md` still says "verbatim". CR-S3R2-3: the manual check claims the live checkout is never read by Pi, yet runs `pi` with the live checkout as cwd. STRUCT-S3R2-1: `proposal.md` still describes the superseded `src`-scoped pass.

**Round 3 findings.** STRUCT-S3R3-1: the `extension-packaging` "Load check passes" WHEN clause still names the live repository, where the settled procedure lists the copy. STRUCT-S3R3-2: the `development-checks` tsconfig requirement says `SHALL exclude` where the design's fixed content carries the exclusion by `include` alone. Round 3's critic reported all Pi imports in `src/` type-only, all seven stubs named `_pi` with the exact throw text, the entry touching only `.on`, and `shouldArchive`'s `>=` body — all matching the design.

## Stage 4: Intermediate Zoom Out

`council-zoom-out` audited the edits Stages 2–3 made. It found no production module, wrapper, dependency or neighbouring feature work added, and passed placement, layer flow and contracts. **"Pass with one minor altitude cleanup."**

- **ZO-S4-1 (minor).** The expanded manual-verification section "now embeds a task runbook in the high-level design: shell setup, output filenames, exact temporary source edits, repeated archive extraction and cleanup." The safeguards are right, but "their execution mechanics are below design altitude", and Stage 5 would otherwise duplicate the recipe or send the implementer back into `design.md` for it. Its recommendation: keep the contract in Decision 6 — verify committed state in an isolated archive copy, use that copy as project and agent directory, require positive proof Pi ran, assert the absence of both diagnostics, require both controls — and move the exact commands, temporary mutations, restoration and cleanup into the tasks.
- **Applied.** Decision 6 now states that contract in one paragraph, and the literal recipe sits verbatim in `tasks.md` 6.1–6.4, which run after the stub-edit commit.

## Michael's Resolutions

Michael resolved every finding in `michael-resolve-s1s2.json`, `michael-resolve-s3-r1.json`, `michael-resolve-s3-r2.json`, `michael-resolve-s3-r3.json` and `michael-resolve-s4.json`. No item in this review was contested or escalated to Joel.

### `propose_fix` — applied to `design.md`

| Finding | Resolution |
|---|---|
| COMP-1 | The manual check captures Pi's unfiltered output to a file and requires Pi's usage header as positive proof that Pi ran, because a filtered pipeline is silent on a missing command too. |
| COMP-2 | Both controls state their edit, their expected count, and their undo; Control B needs no `npm install`; the settings path is built with `node -p 'JSON.stringify(...)'`. |
| COMP-3 | The domain test's contract went into the test table (`shouldArchive(9, 10)` false, `(10, 10)` true, `(11, 10)` true, mutation `>=` → `>`), and Decision 6 gained a third guard bullet. |
| COMP-4 | A citation key was added to Context, and `S1`, `S2`, `S3` and `D6` are now stated in place where they are used as authority. |
| MICHAEL-LICENSE | Michael added this himself: Joel had chosen MIT through the repository's first commit, so Decision 9 and Open Question 3 now say the licence is settled and the publishing card copies it into `package.json`. |
| CR-S3-1 | The blocks fix content, whitespace is whatever the pass produces, the pass is `npx biome check --write .` over the allowlist and rewrites exactly seven files (four `src/` files plus `biome.json`, `package.json`, `tsconfig.json`), and Goals and Risks 5 follow. |
| CR-S3-3 | The whole manual check moved into a `git archive HEAD` copy that is both the package root and `PI_CODING_AGENT_DIR`, so there is no clean-tree precondition and no revert; Risks 2 records that the live checkout is never loaded. |

### Declined, settled by measurement or recorded as wording

| Finding | Michael's disposition |
|---|---|
| ZO-S1-1 | Declined: a shared executable mapping is already excluded — "No new `src/` module", the guard is a test, and a handler cannot import from `tests/`. Wording recorded, not blocking. |
| COMP-5 | Declined: the command sequence is `tasks.md` content, as Risks 5 already says. |
| COMP-6 | Declined as accurate under a narrower reading: `lineWidth` is the only *formatter* deviation; the VCS block and `files.includes` are two traced non-formatter additions. Wording recorded. |
| COMP-7 | Declined: COMP-1's fix states the environment as the manual check's prerequisites, and `engines` stays omitted by R7. |
| CR-S3-2 | Declined: the gap was closed by measurement rather than by softening — the exact Decision 8 manifest installed in a `git archive` copy resolved `typescript` 7.0.2 in-tree and `npm run check` exited 0 with the seven no-op edits and both tests. |
| CR-S3-4 | Declined, wording recorded: after a revert only `node_modules/` is untracked. |
| STRUCT-S3R1-1 | Declined, one-word correction recorded: twenty, not fifteen. |
| STRUCT-S3R1-2 | Declined, correction recorded: point the row at Decision 11. |
| CR-S3R2-1, CR-S3R2-2, CR-S3R2-3, STRUCT-S3R2-1 | Declined as non-blocking, all four wording corrections recorded; round 2 came back clean. |
| STRUCT-S3R3-1, STRUCT-S3R3-2 | Declined as non-blocking, both one-line spec rewordings recorded; round 3 came back clean. |
| ZO-S4-1 | Declined as non-blocking, with the move recorded for the fold-in pass before `tasks.md`. It is now applied. |

Michael recorded the declined wording as one non-blocking tidy pass (`STAGE-3-TIDY`) so no fresh round would re-open it. That pass is applied: `design.md` carries all six of its corrections, `proposal.md` carries both (`What Changes` now points at Decision 3 and Open Questions says "The design fixes the content of every configuration file"), and both spec deltas carry their rewordings. `ZO-S4-1`'s move completes it.

### Contested or declined on evidence, in one place

`CR-S3-2` is the only finding whose evidence Michael replaced rather than the design text, and the replacement now appears in the design's Decision 5 row sources. Everything else was either a wording correction or a masked duplicate of a settled council ruling; no council ruling (R1–R11) changed during this review.

## Settled Findings

**Meaning settled by measurement.**

| Item | What it settled |
|---|---|
| `MANUAL-CHECK-IN-COPY` | The manual check and both controls run against a `git archive HEAD` copy, `$D` serving as both package root and agent directory; no revert, no clean-tree precondition, no `npm install`. Supersedes the live-tree `git checkout --` form, which CR-S3-3 removed. |
| `MANUAL-CHECK-NO-INSTALL` | With no `node_modules/` present, Pi 1.5.2 still loaded the package, Control A printed the load error and Control B printed the host-package warning. |
| `LOCKFILE-STABILITY` | Repeated `npm install`, `npm install` from a clean clone against the committed lockfile, and `npm ci` all leave `package-lock.json` byte-identical, so "Install does not dirty the tree" holds on a clean checkout. |
| `BIOME-JSON-FORMAT` | Biome 2.6.7 applies `indentStyle: tab` to JSON on the allowlist and collapses `files.includes` to one line at width 120; `pi.extensions` stays expanded; `vitest.config.ts` as written already passes. |
| `REPO-NAME` | No document uses the bare repository name `taiknr` as the package or extension name; `pi-taiknr` and `joelleibow/taiknr` are not conflated. |
| `LICENSE-IN-PACKAGE-JSON` | `"license": "MIT"` is not added to `package.json` in this change: nothing here reads it, `npm install` warned about nothing, and the root `LICENSE` is the one home for the fact. |
| `CR-S3-2`'s replacement | The exact Decision 8 manifest installs `typescript` 7.0.2 with `vitest` 5.1.0 and Pi 1.5.2 in-tree, and `npm run check` exits 0 with the seven no-op edits and both tests. |

**Accepted risks closed without a code change.**

| Item | Why it stays open by choice |
|---|---|
| `ZO-S1-1` | The event mapping is a documentation reference; the prohibition on a new `src/` module and the per-handler literals already prevent a shared executable table. |
| `COMP-5` | The format pass's command sequence belongs to `tasks.md`; this review's Stage 5 check verifies it. |
| `COMP-6` | The one-deviation claim is about formatter settings only. |
| `COMP-7` | The measured environment is a prerequisite of the manual check; `engines` stays out by R7. |
| `CR-S3-4` | The rollback wording now names only the leftovers a revert actually creates. |
| `ZO-S4-1` | The design keeps the manual check's contract and gives up its recipe; the recipe is preserved verbatim in `tasks.md`. |

## Owner Decisions Required

None. No Stage 1–4 finding went to Joel, and Michael marked none `joel` or `escalate`.

The one owner decision in this change was settled before the design was drafted: the council's `OD-1` (`biome.json` `lineWidth` 80 or 120, with Michael's recommendation of 120) was ruled by Joel as 120 — "i prefer 120" (`owner-rulings.md`, "Biome line width"). The design carries the ruled value, and the spec's "The chosen baseline is recorded" scenario is satisfied by it.
