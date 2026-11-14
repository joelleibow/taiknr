{
  "mode": "review",
  "lens": "council-structural",
  "paraphrase_proposes": "The design builds the configuration loader end to end: a host-free `loadTaiknrConfig` in `src/config/taiknr-config.ts` that hand-validates two optional JSON files (agent, trusted-project), layers them field by field (project over agent over defaults), and classifies read errors so only a genuinely absent file is silent. Resolution runs in the session-start infra handler at every `session_start`, assigning a three-state holder (`unresolved | rejected | ready`) created per factory call in `src/config/session-config.ts`; a rejection assigns the holder then throws one error naming file, field, and recovery step, and a valid `enabled: false` stays silent. Inertness is one gate at the composition root (`createGatedPi` in `src/app/extension/handler-gate.ts`) wrapping `pi.on` for the six non-session-start registrars, and the holder replaces the pinned `DEFAULT_TAIKNR_CONFIG` constant in the turn-end and context deps. The holder's `setEnabled(boolean): boolean` is the single seam left for the deferred `/taiknr` command; no command, watcher, writer, log, or resolution record is built.",
  "paraphrase_existing": "At HEAD, `loadTaiknrConfig` throws `Not implemented`, and `src/app/extension/taiknr.ts:19` pins `DEFAULT_TAIKNR_CONFIG` by value into the turn-end and context handler dependencies, so a user's config file changes nothing. All seven handlers are no-op registrations whose only contract is the entry test's assertion of exactly seven `pi.on` calls; no file is read, no path resolved, no trust checked, and no logging exists under `src/`. `TaiknrConfig` (four fields) and `ConfigPaths` (two required strings) are exported from `src/config/taiknr-config.ts`; the infra handlers import the type only, and the repository enforces no import-boundary check beyond review (ADR 0001, ARCHITECTURE §8).",
  "recommendation": "Fix F1 (major) before the tasks stage: the `extension-packaging` delta's enumerated permitted-difference list omits the changes the design itself plans for `src/config/taiknr-config.ts` (the `enabled` field, `CONFIG_FILE_NAME`, `TaiknrConfigError`, the rule table, the `interface`→`type` keyword switch), making its mechanically-compared 'Signatures unchanged' scenario unsatisfiable as written — the same contradiction class CR-3/STR-4 fixed last round. F2 and F3 are minor coherence fixes (a wrong 'shared by' claim for the test fake, and bare D-number citations that collide with the design's own decision numbering). Module placement, layer flow, one-home discipline, and risk calibration otherwise pass; nothing speculative survived the rulings.",
  "findings": [
    {
      "id": "S3R1-STR-1",
      "severity": "major",
      "location": "specs/extension-packaging/spec.md — MODIFIED requirement 'Handler signatures and the import boundary are preserved', scenario 'Signatures unchanged'; design.md — 'Types and signatures' and Files-table row for src/config/taiknr-config.ts; proposal.md — 'BREAKING (internal)' and 'Impact'",
      "finding": "The delta's gated scenario compares the seven handler files and `src/config/taiknr-config.ts` with HEAD and permits only 'the three listed above, each stub body replaced by its implementation, and formatter whitespace — and nothing else'. But the design's own plan adds differences to `taiknr-config.ts` that no artifact enumerates: the `enabled` field on `TaiknrConfig`, `enabled: true` in `DEFAULT_TAIKNR_CONFIG`, the exported `CONFIG_FILE_NAME` constant, the `TaiknrConfigError` class, and the per-field rule table. The design's types block also switches HEAD's `export interface TaiknrConfig` to `export type TaiknrConfig`, and the session-start registrar's `_pi` parameter (HEAD) becomes `pi` in the design's signature. The requirement text compounds it: it says the adapter contracts stay fixed while `createPiJevScorerAdapter(ctx, config: TaiknrConfig)`'s parameter type silently gains a required field.",
      "rationale": "Ruling 6 rewrote this delta specifically so the comparison with HEAD is mechanical and non-circular (closing CR-3 and STR-4), and ConfigPaths was added to the list 'so a reviewer has one list of every permitted difference'. A list that omits changes the design and proposal both plan makes the scenario fail against the implementation it gates, and re-opens exactly the ambiguity the ruling closed. This completes ruling 6's list; it does not overturn any ruling.",
      "concrete_case": "After implementation, `git diff HEAD -- src/config/taiknr-config.ts` shows `enabled: boolean` added to the type, `enabled: true` added to the defaults, `CONFIG_FILE_NAME`, `TaiknrConfigError` and the rule table as new exports, and (per the design's block) the `interface` keyword changed to `type`. A reviewer executing the delta's scenario — 'the differences are the three listed above … and nothing else' — must either fail the implemented change or ignore the spec; the scenario has no passing outcome.",
      "recommendation": "Add a fourth enumerated difference to the delta: '`TaiknrConfig` gains the `enabled` field with default `true`; `src/config/taiknr-config.ts` gains `CONFIG_FILE_NAME`, `TaiknrConfigError` and the per-field rule table, its stub body replaced by its implementation' — and either keep HEAD's `interface` keyword in the design's types block or name the keyword change in the same item (folding in the `_pi`→`pi` rename under 'stub body replaced by its implementation'). Mirror the completed list in the design's 'Types and signatures' note so the list keeps one home, per ruling 6."
    },
    {
      "id": "S3R1-STR-2",
      "severity": "minor",
      "location": "design.md — Module & File Placement, Files table, `tests/support/fake-pi.ts` row",
      "finding": "The row says the fake is 'shared by the holder, gate and session-start tests', but the holder (`src/config/session-config.ts`) is host-free — `createSessionConfig()` takes no `pi` and no `ctx` — so its test needs neither the handler-capturing `ExtensionAPI` fake nor the context stub. The fake is shared by exactly two files: the gate test and the session-start test (the ctx stub by the session-start test alone).",
      "rationale": "The design's own D11 and the configuration spec's 'Config loading is tested without a Pi session' require tests to mirror the layer they exercise; wiring a host-shaped fake into `tests/config/session-config.test.ts` would contradict the host-free placement of `src/config/` that the same table asserts, and the wrong 'shared by' claim leaves Derek a dependency to fabricate.",
      "concrete_case": "Derek implements `tests/config/session-config.test.ts` per the table and imports `fake-pi.ts`; the import is unused (Biome flags it) or he invents a pi interaction the holder does not have, weakening the 'No Pi runtime in a loader test' boundary the spec's scenario asserts over `tests/config/`.",
      "recommendation": "Change the clause to 'shared by the gate and session-start tests' (the context stub is used only by the session-start test)."
    },
    {
      "id": "S3R1-STR-3",
      "severity": "minor",
      "location": "design.md — Context, Goals/Non-Goals, Files-table 'Unchanged' line, D4 rule table, Migration Plan (bare D-number citations)",
      "finding": "design.md defines its own Decisions D1–D13 but cites `michael-orientation.md`'s separate D-numbering bare ('D4', 'D5', 'D7', 'D8', 'D10'), so the same code resolves to two different decisions inside one document.",
      "rationale": "The feature-spec standard requires every claim to be traceable to its source; within design.md the codes are not traceable because the document carries two colliding D-number schemes without a disambiguation or a legend naming michael-orientation.md as the home of the Trap/S/D-coded facts.",
      "concrete_case": "D4's rule table cites '(src/domain/archived-output.ts:20; D8)' for `minCharsToArchive`'s range — the intended source is orientation D8 (range provenance in the domain), but design D8 is 'Nothing is emitted on success or absence', which is unrelated. Likewise Non-Goals cites '(D10; rulings 15, 14)' for scope exclusions while design D10 is 'No separate resolution orchestrator', and the Migration Plan cites '(D7; ruling 12)' and '(D4)' for tooling and the docs pass while design D7 is the BOM decision and design D4 is validation.",
      "recommendation": "Prefix every orientation citation ('orientation D8' or 'michael-orientation.md D8') wherever design.md cites an orientation D-number, or renumber the design's own decisions; add one Context sentence naming michael-orientation.md as the home of the `Trap N` and `S N` codes."
    }
  ],
  "assumptions": [
    {
      "assumption": "HEAD sources match the design's claims: `taiknr-config.ts` exports `interface TaiknrConfig` (four fields, no `enabled`), `DEFAULT_TAIKNR_CONFIG` with the four pinned values, required-string `ConfigPaths`, and a `Not implemented` loader; `taiknr.ts:19` pins the constant; `session-start.ts` registers a no-op with `_pi`",
      "status": "verified"
    },
    {
      "assumption": "Test/tooling scopes support the design's test plan: vitest include is `tests/**/*.test.ts` (so `tests/support/fake-pi.ts` is not collected), biome includes `tests/**`, tsconfig includes `tests/**/*.ts`",
      "status": "verified"
    },
    {
      "assumption": "The holder's placement in `src/config/session-config.ts` follows the recorded revision of ruling 1 (council.md 'Michael's Rulings' §1 placement note + research-eleanor.md addendum); the infra→config type-import direction matches existing edges (`turn-end.ts:2`, `context.ts:2`) and no infra→app edge is created",
      "status": "verified"
    },
    {
      "assumption": "Round-1/2 fixes are applied: D4 states the layering order with the worked example (CC-S2-1), and D6/D5 cover the non-ENOENT lstat branch and the only-error-branch clause (CC-S2-2)",
      "status": "verified"
    },
    {
      "assumption": "Pi-host measurements relied on (factory-cached-not-instance loader, per-handler throw catching on a carried channel, stderr surfacing in print/JSON modes, thirteen stripBom sites, TS2769 requiring the `LooseOn` cast) are accurate as recorded in council.md and the orientation",
      "status": "unverified"
    },
    {
      "assumption": "`createGatedPi`'s `Reflect.get` forwarding of non-`on` members is safe for the real host object — `createExtensionAPI` (loader.js L195–274) returns a closure-captured object literal whose methods use no `this` or private fields, and only `on` is ever called through the gate",
      "status": "verified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "pi-jefferson and pi-omlx sources firsthand — Eleanor's report is taken as read",
    "`michael-orientation.md` in full — sampled by targeted grep for the D-numbering scheme; its facts were not independently re-measured",
    "Live re-measurement of any Pi host behaviour (the brief forbids running anything); all host claims are traceable to recorded measurements",
    "`tasks.md` — not yet present (Stage 4 artifact), so design-to-tasks alignment is out of scope this round",
    "Whether any later board card plans to call a non-`on` member through the gated `pi` (would strengthen or retire the proxy-forwarding question)"
  ]
}