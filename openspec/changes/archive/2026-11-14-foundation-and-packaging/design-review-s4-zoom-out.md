{
  "mode": "review",
  "lens": "council-zoom-out",
  "paraphrase_proposes": "",
  "paraphrase_existing": "",
  "recommendation": "Pass with one minor altitude cleanup. The post-review edits add no production modules, wrappers, dependencies beyond the chosen tooling, or neighboring feature work. Root tooling configuration and layer-mirrored tests fit the inspected repository; retain the settled verification safeguards but move their operational recipe into tasks.md.",
  "findings": [
    {
      "id": "ZO-S4-1",
      "severity": "minor",
      "location": "openspec/changes/foundation-and-packaging/design.md — Decision 6, “Manual load check,” command block, negative-control edit instructions, archive restoration and cleanup",
      "finding": "The expanded manual verification section now embeds a task runbook in the high-level design: shell setup, output filenames, exact temporary source edits, repeated archive extraction and cleanup. The safeguards are appropriate, but their execution mechanics are below design altitude.",
      "rationale": "Zoom-out standard §4 places high-level design at boundaries, data flow and contracts, with implementation mechanics in tasks.md. Stages 2–3 correctly fixed unsafe live-tree mutation and vacuous success detection; retaining every operational correction inline has accumulated procedure rather than additional architectural decisions. Moving the recipe preserves those settled fixes without adding a script or another artifact.",
      "concrete_case": "When Stage 5 creates executable acceptance tasks, it must either duplicate Decision 6's archive/cd/restore/cleanup sequence or send the implementer back to a procedural block in design.md. The recent addition of cd \"$D\" and git -C <repo> restoration illustrates the shell-level details that now need maintenance inside the design.",
      "recommendation": "Keep in Decision 6 the contract: verify committed state in an isolated archive copy, use that copy as project and agent directory, require positive proof Pi ran, assert absence of both diagnostics, and require both negative controls. Move the exact shell commands, temporary mutations, restoration and cleanup sequence into the existing planned tasks.md acceptance task, preserving all settled safety requirements. Do not introduce a verification helper or new production module."
    }
  ],
  "assumptions": [
    {
      "assumption": "The existing app composition root owns wiring, infra handler modules own Pi lifecycle registrations, and pure domain/use-case modules remain inward dependencies; the proposed edits preserve those responsibilities.",
      "status": "verified"
    },
    {
      "assumption": "No existing project harness or configuration can be reused directly: root configuration is absent and tests/ is empty in the inspected tree. The proposal therefore needs tooling setup, not a new production abstraction.",
      "status": "verified"
    },
    {
      "assumption": "Earlier findings about shared event mappings, Biome baseline wording, formatter sequencing, dependency versions and manual-check safety are settled; this report does not reopen their substantive decisions.",
      "status": "verified"
    },
    {
      "assumption": "The recorded end-to-end tool and Pi measurements remain applicable to the eventual implementation; this read-only review did not reproduce them.",
      "status": "unverified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "No commands, installations, tests, formatter passes, Pi load checks or git mutations were performed, as required by the brief.",
    "No implementation diff or final lockfile was available for acceptance review; reproducibility and successful execution of the preserved checks remain implementation acceptance risks."
  ]
}