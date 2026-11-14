{
  "assumptions": [
    {
      "assumption": "The two round-1 propose_fix resolutions (critic-r1-1: content-vs-whitespace review rule plus widened `biome check --write .` pass; critic-r1-3: copy-based manual load check with re-extract undo) are incorporated in design.md as required.",
      "status": "verified"
    },
    {
      "assumption": "Round-1 declined-recorded findings and all settled_findings in michael-resolve-s3-r1.json and michael-resolve-s1s2.json are closed and not re-opened; the underlying sections were re-read only to confirm the fixes left them coherent (they did).",
      "status": "verified"
    },
    {
      "assumption": "Design's tree claims hold at HEAD: seven throwing `register*Handler` stubs with `_pi` parameter names; `shouldArchive(rawTextLength: number, minCharsToArchive: number): boolean` returning `rawTextLength >= minCharsToArchive` at src/domain/archived-output.ts:19-21; the entry default export composing the seven handlers at src/app/extension/taiknr.ts; the four 120-width reflow targets (pi-archive-adapter, pi-jev-scorer-adapter, tool-call, commit-archived-batch) exist; two ADRs, two root PoC files, root LICENSE, empty root tests/, and no package.json/tsconfig.json/.gitignore at root.",
      "status": "verified"
    },
    {
      "assumption": "Decision 6's no-Pi-runtime claim for the entry test holds: all 11 Pi imports in src/ are `import type`, including the multi-line import in src/infra/adapters/pi-archive-adapter.ts.",
      "status": "verified"
    },
    {
      "assumption": "Every config block in the design matches the corresponding spec requirement entry-for-entry (scripts and check order, files.includes six entries, tsconfig include set, vitest test.include, .gitignore three entries, the seven event names), and the root-config table (six files), Goals bullet 1 (five config files plus the lockfile) and Decision 3's 'six root files written / four root config files in the allowlist' are mutually consistent.",
      "status": "verified"
    },
    {
      "assumption": "proposal.md's format-pass scope sentence is the only divergence the round-1 fixes introduced between the proposal and the fixed design; the rest of the proposal (files added/edited, omitted publishing metadata, settings hand-off, omitted metadata list) matches design.md.",
      "status": "verified"
    },
    {
      "assumption": "The binding measurement evidence (biome `--write` fixing 7 files on this tree, the git-archive manual-check controls, lockfile stability, tsc/vitest green runs) reproduces as recorded — accepted as settled per the brief, not re-executed.",
      "status": "unverified"
    }
  ],
  "findings": [
    {
      "concrete_case": "An implementer following proposal.md runs the narrow pass (`npx biome check --write src`); `biome.json`, `package.json` and `tsconfig.json` — written with 2-space indentation per their Decision blocks — stay unformatted, and `npm run check`'s lint step fails on the three root configs. That is the exact defect critic-r1-1 measured and closed ('Found 7 errors' on biome.json, package.json and tsconfig.json before any src reflow); the stale sentence reintroduces it at the proposal layer.",
      "finding": "After the critic-r1-1 fix, the design's format pass is `npx biome check --write .`, scoped by `files.includes` to `src/**`, `tests/**` and the four root config files, and it rewrites exactly seven files (the four `src/` files plus `biome.json`, `package.json`, `tsconfig.json`). proposal.md still states the pass runs 'over `src/`' and 'reflows four files', restating the superseded scope instead of pointing at the design. Two statements of one fact now diverge across artifacts inside a single change.",
      "id": "STRUCT-S3R2-1",
      "location": "openspec/changes/foundation-and-packaging/proposal.md — 'What Changes' bullet 7 ('Run a one-time Biome format pass over `src/` … at `lineWidth` 120 it reflows four files (R3; R1)'), read against design.md Decision 3 and the Module & File Placement content/whitespace paragraph",
      "rationale": "Feature-spec standard §1: one home for each fact — the proposal should point at the design rather than restate its facts with a different scope. The proposal was accurate against the pre-fix design (a `src`-scoped pass, four src reflows) and was not updated when the r1 resolution widened the pass to the whole allowlist; round 2 exists precisely to catch drift the fixes left behind.",
      "recommendation": "Reword the proposal bullet to match Decision 3 — e.g. 'Run a one-time `biome check --write` pass scoped by `files.includes` to `src/**`, `tests/**` and the root config files, before any handler edit; at `lineWidth` 120 it reflows the four `src/` files, and the new root configs land formatted' — or drop the scope and file count and cite design.md Decision 3. No change to design.md, the specs, or any decision value follows.",
      "severity": "minor"
    }
  ],
  "lens": "council-structural",
  "mode": "review",
  "not_checked": [
    "tasks.md — does not exist yet in the change directory; design/tasks alignment is Stage 5 scope.",
    "R1-R11, Trap 1-9 and the round-1 measurement evidence (Biome sweeps and exit codes, git-archive manual-check controls, lockfile stability, tsc/vitest runs) — accepted as settled binding evidence per the brief; not re-executed.",
    "Settled findings skipped per the brief, sections re-read only for fix coherence: structural-r1-1 (twenty vs fifteen src files, declined-recorded), structural-r1-2 (.gitignore row cross-ref, declined-recorded), critic-r1-2 (manifest measured end-to-end), critic-r1-4 (revert-leftovers wording, declined-recorded), ZO-S1-1, COMP-5/6/7, REPO-NAME, LICENSE-IN-PACKAGE-JSON, MANUAL-CHECK-NO-INSTALL, LOCKFILE-STABILITY, BIOME-JSON-FORMAT, MANUAL-CHECK-IN-COPY.",
    "ARCHITECTURE.md §8 and the deferred import-boundary lint — docs-pass items settled under D2/S7/S8/Trap 7 and assigned to Migration Plan step 6; not re-audited.",
    "npm/Biome/Pi behavioural claims beyond what the design cites — not independently re-measured; the brief's discipline forbids installing or running anything."
  ],
  "owner_questions": [],
  "paraphrase_existing": "The repository is a stub-stage Pi extension package with no package.json, tsconfig.json, .gitignore or harness, so nothing can be loaded, type-checked or tested (Eleanor §1; Trap 6). All seven register*Handler stubs throw at load, so importing the single manifest entry src/app/extension/taiknr.ts fails (Trap 1), and no lineWidth leaves HEAD formatted (R1/R3), leaving every later board card blocked. The source follows a Clean Architecture layout — src/domain/ and src/use-cases/ import nothing from @earendil-works/pi-* (ADR 0001), src/infra/ holds the Pi adapters and the seven handlers, and the app entry composes them — and Pi 1.5.2 loads local packages through the manifest's pi.extensions entries with no build step.",
  "paraphrase_proposes": "The design writes six root tooling files with content fixed in Decisions 1, 7, 8, 10 and 11 — package.json (four scripts, peer `*` + dev `^1.5.2`, no dependencies, publishing metadata omitted), a committed package-lock.json, tsconfig.json (S2's measured nodenext set), biome.json (init 2.6.7 baseline plus VCS block, six-entry files.includes allowlist, lineWidth 120), vitest.config.ts (test.include only) and a three-entry .gitignore — replaces the seven throwing handler stubs with `_pi.on(\"<event>\", () => {})` no-op registrations, and runs a one-time `biome check --write .` pass over the whole allowlist as its own whitespace-only commit before any handler edit. It adds exactly two tests: an entry test asserting the sorted registered names equal the seven via a Proxy fake whose only member is `on`, and a domain test asserting shouldArchive's `>=` threshold behavior through the `.js` specifier chain. Load verification is a manual packages-route check against a `git archive HEAD` throwaway copy doubling as PI_CODING_AGENT_DIR, asserting Pi's usage header plus grep text (never exit codes), with two negative controls (restored throw; peer moved to dependencies) each undone by re-extracting the archive.",
  "recommendation": "Approve. Both round-1 fixes are incorporated verbatim and leave placement, one-home discipline, spec/design alignment, cross-references and claim calibration intact; no blocking or major structural defect remains. One minor cross-artifact drift should be recorded for Michael to fold in or decline: proposal.md still describes the superseded src-only format pass, a wording fix in the proposal only, with no change to any design decision, spec requirement or config value."
}