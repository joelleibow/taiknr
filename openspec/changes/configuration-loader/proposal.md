# Proposal

## Why

The seven handlers load and register, but nothing behind them reads a configuration file: `loadTaiknrConfig` throws `Not implemented`, and the composition root hands the handlers the `DEFAULT_TAIKNR_CONFIG` constant (`src/config/taiknr-config.ts`, `src/app/extension/taiknr.ts:19`; research-eleanor §3). A user who writes a config file today changes nothing.

Joel also asked for a way to turn taiknr off without uninstalling it (`owner-rulings.md` "An on/off switch"). Pi's own route — `pi config` writing a `-path` exclusion into `packages`/`extensions` — needs a restart or `/reload` and cannot be flipped from inside a session (D11), so the switch has to be a field taiknr reads itself.

This change builds the loader, wires it, and adds that field.

## What Changes

- **Two file locations, resolved through the host's helpers.** The agent-level file is `pi-taiknr.json` in Pi's agent directory; the project-level file is `pi-taiknr.json` in the project config directory at the session's working directory. Both paths come from `getAgentDir()` and `CONFIG_DIR_NAME`, never from the literals `~/.pi/agent` and `.pi` (S1; Trap 3; D2). The project file is `<cwd>/<CONFIG_DIR_NAME>/pi-taiknr.json` and only that — no parent-directory search (Joel, "Q2 clarification").
- **Field-level layering.** For each field, the built-in default, then the agent file over it, then the project file over that. A project file states only what differs (Joel, "Orientation Q1b and Q2"; Michael's Q2(a)). This is the reading under which the card's "merges valid fields" criterion holds; the card's "matching pi-jefferson's precedence rules" clause is dropped, because jefferson replaces the agent document whole (Trap 5; research-eleanor §1).
- **Validation with named rejections.** The root must be a JSON object; `decisionThreshold` a finite number in `[0,1]`; `minCharsToArchive` an integer `≥ 0`; `defaultDecisionModel` and `defaultDecisionModelProvider` non-empty strings. An unknown top-level key is a rejection (Joel, "Orientation Q1b"). Every rejection names the file and the field (S3; Trap 7; ranges from D8).
- **A broken file is loud and closed.** A present-but-malformed or invalid file is reported clearly, and taiknr does nothing for that session until the file is fixed. No fallback to defaults, and no fallback to the other file (Joel, "Orientation Q1" → (b)).
- **Missing files are silent.** Neither file present, or one absent, leaves the defaults in place with no warning (S2).
- **The project file counts only in a trusted project.** Its values apply when `ctx.isProjectTrusted()` is true, and are ignored otherwise (S4; research-chidi Q1; research-eleanor §1).
- **Resolution runs at every session start.** Paths and trust come from the event's context, so the config is re-read on each `session_start` — `/reload`, `/new`, `/resume`, `/fork`, or a new process — and a mid-session file edit takes effect at the next one. No file watcher (S4, S12; Trap 8; Trap 13).
- **A new `enabled` field.** A JSON boolean, default `true`. With it false, taiknr does no staging, settlement, hydration, recall or classifier calls, and outputs stubbed before it was turned off stay stubbed and are not recalled while it is off (Joel, "Orientation Q3" → fully inert; S10, S11; Trap 16). A trusted project file may set it false for that project alone. The field exists because the host's own disable needs a reload (D11).
- **Wiring in place of the constant.** The config resolved for the session reaches the turn-end and context handler dependencies and the scorer adapter, replacing `const config = DEFAULT_TAIKNR_CONFIG` (S5; orientation §2). The mechanism is O1's.
- **Tests.** `tests/config/` mirrors `src/config/`: defaults, agent-only, project-over-agent, each rejection class, the trust gate, the `enabled` field, and the re-read at `session_start` with the recording fake at the composition root (S7, S14; D7).
- **BREAKING (internal): one gated signature clause is narrowed.** `extension-packaging`'s "Handler signatures and the import boundary are preserved" gains one exception, named in the design, so the session-start registration and the config-carrying dependency types can carry a per-session configuration. The import boundary and the other six registrars are unchanged (D6; O1).
- **The docs pass follows the implementation, and nothing in it blocks the feature** (D4; S9, S15).

**Deliberately not in this change** (D10, narrowed unless noted):

- `/taiknr on` and `/taiknr off`. The "Status readout and /taiknr command" card owns them. This change leaves one assignable seam and registers no command (S13; Trap 14).
- Environment-variable overrides, and a UI status readout.
- The OpenRouter-provider abstraction behind `defaultDecisionModelProvider`, which Joel deferred until a version works locally the way he wants (Joel, "Orientation Q1").
- Any writer: no code writes a config file, and nothing reports which file supplied a field (Trap 14).
- A file watcher: Pi tells extensions not to start one, and `/reload` is the no-restart path this change delivers (Trap 13).
- The `enabled` check inside each handler's body. The handlers are no-ops, so the check lands with the archive and recall cards (Trap 12; O6).
- Any change to `src/domain/`, `src/use-cases/`, `biome.json`, `tsconfig.json`, `vitest.config.ts` or `.gitignore` (D5, D7). `package.json` changes only if the design adopts typebox (O2; Trap 9).

## Capabilities

### New Capabilities

- `configuration`: where taiknr's config files live, how their fields layer and validate, what a broken file does, when the files are re-read, and the `enabled` switch that turns taiknr off.

### Modified Capabilities

- `extension-packaging`: "Handler signatures and the import boundary are preserved" gains one narrow, design-named exception so the session-start registration and the config-carrying handler dependency types can carry a per-session configuration. The import boundary and the other six registrars do not change.

## Impact

- `src/config/taiknr-config.ts`: the `Not implemented` body, the new field and its default.
- A path-resolution site in `src/app/extension/taiknr.ts` or `src/infra/`, never in `src/config/` (S1; D5).
- The session-start handler and the turn-end and context handler dependency contracts, or the config value they hold (O1).
- New tests at `tests/config/`; no tooling file needs an edit (D7).
- Untouched: `src/domain/`, `src/use-cases/`, the seven-registration invariant, Joel's `~/.pi/agent/` and the dotfiles, and the proof-of-concept files (orientation §2).

## Open Questions

For the council and the design. This proposal picks none of them.

- **O1 — How a per-session config reaches handlers registered at factory time.** Fill one shared `TaiknrConfig` object in place at `session_start`, or change the dependency types to a holder/getter that a later command can also assign. Either way the session-start handler gains a config parameter, and the design must state the signature revision as its reason (Trap 2; S13).
- **O2 — Validation implementation.** Hand-written guards, or typebox with a new `peerDependencies` entry (Trap 9; research-chidi Q4).
- **O3 — How the rejected-file report surfaces in every mode.** A throw from the session-start handler is visible everywhere but skips the rest of that handler; `ctx.ui.notify` alone is invisible in print and JSON modes. The design also orders config resolution against store hydration (Trap 6; Joel's Q1(b) fixes that the report must be clear, not how it is delivered).
- **O5 — Observability.** The resolved paths, which files were present and trusted, and the outcome; where such a log goes in a Pi extension is the design's to name (the orientation's bar for a use-case entry).
- **O6 — Where the `enabled` check will live once handlers have bodies.** One guard at registration or each handler reading the holder. This change only names the seam, so three later cards do not each invent one (Trap 12).
- **O7 — Whether `enabled: false` is reported at session start,** or whether taiknr goes quiet. A once-per-session notice is UI the Status card owns if the design declines it (D10 narrowed).

Dissolved by Joel's Q1 ruling: the orientation's O4 (which layer survives a rejection) no longer arises, because nothing survives — taiknr does nothing for that session.
