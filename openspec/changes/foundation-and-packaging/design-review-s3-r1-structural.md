{
  "mode": "review",
  "lens": "council-structural",
  "paraphrase_proposes": "The design writes six root tooling files with fixed content — package.json, committed package-lock.json, tsconfig.json, biome.json (init 2.6.7 baseline + VCS block + six-entry files.includes allowlist + lineWidth 120), vitest.config.ts (test.include only) and .gitignore (three entries) — replaces the seven throwing handler stubs with one-line `_pi.on(\"<event>\", () => {})` no-op registrations, and runs a one-time 120-width Biome format pass as its own whitespace-only commit before any stub edit. It adds exactly two tests: an entry test asserting the sorted registered event names equal the seven via a Proxy fake whose only member is `on`, and a domain test asserting `shouldArchive` threshold behavior (`>=` at the threshold) through the `.js` specifier chain. Load verification is a manual packages-route check against a throwaway PI_CODING_AGENT_DIR, asserting on Pi's usage header plus grep text (never exit codes), with two negative controls (restored throw; peer moved to dependencies) each reverted with git checkout.",
  "paraphrase_existing": "The repository is a stub-stage Pi extension package with no package.json, tsconfig, .gitignore or harness, so nothing can be loaded, type-checked or tested. Twenty src files follow a Clean Architecture layout: src/domain/ and src/use-cases/ import nothing from Pi packages (ADR 0001), src/infra/ adapters and the seven pi-event-handlers import Pi types, and src/app/extension/taiknr.ts is the single composition-root entry whose seven handler registrars currently throw at load time (Trap 1), leaving every later board card blocked. Pi 1.5.2 loads local packages through the manifest's pi.extensions entries via jiti with no build step, identifies them by resolved absolute path, and warns only when a host-provided package name appears in the manifest's dependencies object.",
  "recommendation": "Approve with two minor fixes: correct the Context's 'fifteen tracked src/ files' to twenty (its own cited source, Eleanor §1, lists twenty, as do R1's measurement and the disk), and repoint the .gitignore placement row's cross-reference from Decision 5 to Decision 11, which is where the .gitignore content lives. Neither defect touches a decision, a config value, or a spec requirement; placement, one-home discipline, structural completeness and claim calibration all hold.",
  "findings": [
    {
      "id": "STRUCT-S3R1-1",
      "severity": "minor",
      "location": "openspec/changes/foundation-and-packaging/design.md — Context, first paragraph ('The repository is stub-stage: fifteen tracked src/ files…(Eleanor §1; Trap 6)')",
      "finding": "The Context states 'fifteen tracked `src/` files' and cites Eleanor §1, but Eleanor §1's inventory lists twenty tracked src files (1 app entry, 1 config, 2 domain, 5 use-cases, 4 adapters, 7 handlers), the worktree holds twenty, and Michael's ruling R1 measures 'all 20 `src/` files' for the space-indentation cost. The stated count contradicts its own cited source and every other measurement in the change record.",
      "rationale": "The zoom-out and feature-spec standards require every statement about existing behavior to match cited evidence. A context sentence that misstates a measured count undermines the design's otherwise exact provenance discipline, even though no decision below depends on the number (the format-pass and load measurements all use the correct 20-file reality).",
      "concrete_case": "A reader verifying Context against research-eleanor.md §1 counts twenty listed src files; grep/find over the checkout returns twenty; michael-council-rulings.json R1's answer says 're-indents every line of all 20 `src/` files'. The design's 'fifteen' matches none of them.",
      "recommendation": "Change 'fifteen tracked `src/` files' to 'twenty tracked `src/` files' (or drop the count and keep the citation). One-word fix; no other section needs to change."
    },
    {
      "id": "STRUCT-S3R1-2",
      "severity": "minor",
      "location": "openspec/changes/foundation-and-packaging/design.md — Module & File Placement, root configuration files table, `.gitignore` row ('The clean-tree baseline (Decision 5)')",
      "finding": "The .gitignore row's single-responsibility cell cites Decision 5, but Decision 5 owns the npm/lockfile policy ('package-lock.json is committed… It is not added to .gitignore'); the home of .gitignore's actual content — the three entries, no `.pi/`, no lockfile entry — is Decision 11. The cross-reference sends a reader tracing the clean-tree baseline to the wrong decision.",
      "rationale": "The feature-spec standard (§1, one home for each fact; structural completeness, coherent cross-references) requires each fact to have one canonical place that pointers actually reach. The .gitignore content fact's home is Decision 11; Decision 5 only shares the sub-fact that the lockfile is not ignored, so the row's pointer is at best half-wrong.",
      "concrete_case": "A reviewer reads the placement table, wants the .gitignore entries, follows '(Decision 5)', and lands on the lockfile/npm-manager ruling, which never states the three entries; the entries are in Decision 11 and in the development-checks spec requirement.",
      "recommendation": "Repoint the row to '(Decision 11)' or '(Decisions 5, 11)' — Decision 11 for the entries and Decision 5 for the no-lockfile-entry consequence. No content change to either decision."
    }
  ],
  "assumptions": [
    {
      "assumption": "All propose_fix required changes from michael-resolve-s1s2.json (COMP-1 manual-check rewrite with prerequisites, head -1 pass rule and $D removal; COMP-2 controls A/B with revert commands; COMP-3 domain-test contract in the test table plus the third Decision 6 bullet; COMP-4 citation key and S1/S2/S3/D6 inline expansions; MICHAEL-LICENSE Decision 9 and Open Questions 3 rewrites) are incorporated verbatim in design.md.",
      "status": "verified"
    },
    {
      "assumption": "No michael-resolve-s3-r*.json resolution file exists at review start, so no round-specific findings were skipped.",
      "status": "verified"
    },
    {
      "assumption": "Design's factual claims about the tree hold at HEAD: shouldArchive signature and `>=` body at src/domain/archived-output.ts:19–21; the seven handler stubs throw with `_pi` parameter names; the entry default-exports taiknr(pi: ExtensionAPI); the four 120-width reflow targets (pi-archive-adapter, pi-jev-scorer-adapter, tool-call, commit-archived-batch) exist; two ADRs, two root PoC files, and an empty root tests/ directory.",
      "status": "verified"
    },
    {
      "assumption": "Every config block in the design (biome.json, package.json, tsconfig.json, vitest.config.ts, .gitignore, files.includes six entries) matches the corresponding spec requirement entry-for-entry in specs/extension-packaging and specs/development-checks, and the proposal's Files-added/Files-edited lists match the design's placement tables.",
      "status": "verified"
    },
    {
      "assumption": "Design-internal cross-references resolve: Decisions 1–13 as cited in Non-Goals and placement rows, Decision 2→Risks 1, Decision 9→Risks 8, Decision 12→Open Questions 1, Migration Plan steps 1–6 — all correct except the .gitignore row (STRUCT-S3R1-2).",
      "status": "verified"
    },
    {
      "assumption": "Which src files are git-tracked (used only to confirm the fifteen-vs-twenty discrepancy against the index rather than the worktree) — no shell was run per the brief's discipline; relied on Eleanor §1's HEAD inventory, which explicitly lists the twenty src files as tracked.",
      "status": "unverified"
    },
    {
      "assumption": "The R1–R11 measurements (formatter sweeps, exit codes, load behaviour, version compatibility) reproduce as recorded — accepted as binding settled evidence per the brief, not re-run.",
      "status": "unverified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "tasks.md — does not exist yet in the change directory; design/tasks alignment is Stage 5 scope.",
    "ARCHITECTURE.md §8 wording — its false tests-directory rationale is a settled docs-pass item (S8, Trap 7, D2) deferred to Migration Plan step 6; not re-audited.",
    "R1–R11 and Trap measurements — accepted as settled binding evidence per the brief; not re-executed.",
    "Settled findings ZO-S1-1 (event-mapping table is documentation only), COMP-5 (format-pass command sequence is tasks.md content), COMP-6 ('only deviation' phrasing), COMP-7 (operator environment/engines) and the other michael-resolve-s1s2 settled_findings — skipped per the brief; the underlying sections were checked only for whether the S1/S2 required edits left them intact (they did)."
  ]
}