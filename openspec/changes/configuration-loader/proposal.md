# Proposal

## Why

The seven handlers load and register, but nothing behind them reads a configuration file: `loadTaiknrConfig` throws `Not implemented`, and the composition root hands the handlers the `DEFAULT_TAIKNR_CONFIG` constant (`src/config/taiknr-config.ts`, `src/app/extension/taiknr.ts:19`; research-eleanor §3). A user who writes a config file today changes nothing.

Joel also asked for a way to turn taiknr off without uninstalling it (`owner-rulings.md` "An on/off switch"). Pi's own route — `pi config` writing a `-path` exclusion into `packages`/`extensions` — needs a restart or `/reload` and cannot be flipped from inside a session (D11), so the switch has to be a field taiknr reads itself.

This change builds the loader, wires it, and adds that field.

## What Changes

Rulings are cited as `council.md` "Michael's Rulings", by number; Joel's own rulings by section in `owner-rulings.md`.

- **Two file locations, resolved through the host's helpers.** The agent-level file is `pi-taiknr.json` in Pi's agent directory; the project-level file is `pi-taiknr.json` in the project config directory at the session's working directory. Both paths come from `getAgentDir()` and `CONFIG_DIR_NAME`, never from the literals `~/.pi/agent` and `.pi` (S1; Trap 3; D2), and the file name is one exported constant in `src/config/` (ruling 10). The project file is `<cwd>/<CONFIG_DIR_NAME>/pi-taiknr.json` and only that — no parent-directory search (Joel, "Q2 clarification"). The two `join` calls live in the session-start handler, the one place that already has `ctx.cwd` and `ctx.isProjectTrusted()` (ruling 10).
- **Field-level layering.** For each field, the built-in default, then the agent file over it, then the project file over that. A project file states only what differs (Joel, "Orientation Q1b and Q2"; Michael's Q2(a)). This is the reading under which the card's "merges valid fields" criterion holds; the card's "matching pi-jefferson's precedence rules" clause is dropped, because jefferson replaces the agent document whole (Trap 5; research-eleanor §1). Layering iterates the known-key list over each parsed object and never spreads it (ruling 12).
- **Validation with named rejections, by hand.** The root must be a JSON object; `decisionThreshold` a finite number in `[0,1]`; `minCharsToArchive` an integer `>= 0`; `defaultDecisionModel` and `defaultDecisionModelProvider` non-empty strings after `trim()`; `enabled` a boolean. A leading UTF-8 BOM is stripped before `JSON.parse`, so a BOM-prefixed object is valid (ruling 7). An unknown top-level key is a rejection (Joel, "Orientation Q1b"), including one that names an object-prototype member such as `toString` or `__proto__` (ruling 12). One hand-written per-field rule table sits next to the defaults, and there is no typebox and no `package.json` change (ruling 12; O2). One error class carries the file, the field and the reason; the first violation is reported; a parse, root-type or read failure has no field (ruling 5, 12; S3; Trap 7).
- **An unreadable file is a rejection, not an absence.** Only a path with no directory entry counts as absent: a dangling symlink, `EISDIR`, `EACCES` and every other read error are rejections naming the file, with no field and the errno in the reason. A path under a `<cwd>/<CONFIG_DIR_NAME>` that is not a directory (`ENOTDIR`) counts as absent (ruling 8; Joel's "Orientation Q1").
- **A broken file is loud and closed.** A present-but-malformed or invalid file is reported clearly, and taiknr does nothing for that session until the file is fixed. No fallback to defaults, and no fallback to the other file (Joel, "Orientation Q1" → (b)). The report is one `Error` thrown from the session-start handler after the per-session holder is set to rejected, and nothing else; the message is `<absolute file path>: <field>: <reason>`, or the same without the field, ending with the recovery line "fix the file, then run /reload or start a new session" (ruling 5). It is the only emission this change makes.
- **Missing files are silent.** Neither file present, or one absent, leaves the defaults in place with no warning (S2; ruling 8 for what "absent" means).
- **The project file counts only in a trusted project.** The session-start handler passes the project path only when `ctx.isProjectTrusted()` is true and passes `undefined` otherwise, so the loader never opens, parses or validates a file it was not given. In an untrusted project a malformed project file is never read and causes no rejection (ruling 2, 3; S4; research-chidi Q1; research-eleanor §1).
- **Resolution runs at every session start, into a per-session holder.** Paths and trust come from the event's context, so the config is re-read on each `session_start` — `/reload`, `/new`, `/resume`, `/fork`, or a new process — and a mid-session file edit takes effect at the next one. No file watcher (S4, S12; Trap 8; Trap 13). The resolved state lives in one holder created per factory call, never at module level, with three states — unresolved, rejected carrying the error, ready carrying the config — and is replaced whole on each `session_start` (ruling 1).
- **A new `enabled` field.** A JSON boolean, default `true`. With it false, taiknr does no staging, settlement, hydration, recall or classifier calls, and outputs stubbed before it was turned off stay stubbed and are not recalled while it is off (Joel, "Orientation Q3" → fully inert; S10, S11; Trap 16). A trusted project file may set it false for that project alone. The field exists because the host's own disable needs a reload (D11). Inertness is one gate at the composition root, wrapping registration so a handler runs only while the holder is active (ruling 4), and a valid `enabled: false` is silent at session start (ruling 13; Joel's "Council OD").
- **Wiring in place of the constant.** The composition root creates the holder and the gate, hands the gated `pi` to the six non-session-start registrars, hands the raw `pi`, the store and the holder to the session-start registrar, and replaces `const config = DEFAULT_TAIKNR_CONFIG` with the holder in the turn-end and context handler dependencies (S5; orientation §2; ruling 1, 4, 16). The scorer adapter stays out of this change: it has no call site at HEAD, and the recall card constructs it from the holder's ready config (ruling 16).
- **Tests, mirroring the layer each exercises.** `tests/config/` holds the host-free loader cases — defaults, agent-only, project-over-agent, every rejection class, BOM, dangling symlink, `EISDIR`, the boundary values — and the holder's states and operations; `tests/app/extension/` holds the gate; `tests/infra/pi-event-handlers/` holds the session-start handler, with the trust gate, the assign-then-throw order, and a re-read on a second call with a different working directory. The existing entry test is unchanged, and one shared handler-capturing fake lives under `tests/` at the path the design names (ruling 9; S7, S14; D7).
- **BREAKING (internal): one enumerated signature revision.** `extension-packaging`'s "Handler signatures and the import boundary are preserved" gains one exception, and the delta now enumerates it by name: the session-start registration gains the holder, the `config` member of the turn-end and context deps objects changes type from `TaiknrConfig` to the holder, and `ConfigPaths.projectConfigPath` becomes `string | undefined`. Everything else is unchanged against `HEAD` — the other four registrars, the deps objects' other members, the adapter signature and the ports. The scenario compares the diff with that list (ruling 6; D6).
- **The docs pass follows the implementation, and nothing in it blocks the feature** (D4; S9, S15).

**Deliberately not in this change** (D10, narrowed unless noted):

- `/taiknr on` and `/taiknr off`. The "Status readout and /taiknr command" card owns them. This change leaves one seam — the holder's `setEnabled(boolean): boolean`, which succeeds only while the holder is ready, lasts until the next `session_start`, and does not hydrate — and registers no command (ruling 15; S13; Trap 14).
- Environment-variable overrides, and a UI status readout.
- The OpenRouter-provider abstraction behind `defaultDecisionModelProvider`, which Joel deferred until a version works locally the way he wants (Joel, "Orientation Q1").
- Any writer: no code writes a config file, and nothing reports which file supplied a field (Trap 14).
- A file watcher: Pi tells extensions not to start one, and `/reload` is the no-restart path this change delivers (Trap 13).
- Any resolution record or log. Nothing is emitted on a successful or absent file, and "present but untrusted project file, ignored" is indistinguishable from "absent" until the Status card adds a readout (ruling 14).
- An `enabled` check inside each handler's body. The gate is one place at the composition root and the handlers stay no-ops; the behavioural consumers land with the archive and recall cards (Trap 12; ruling 4, 17).
- The scorer adapter, whose construction belongs to the recall card (ruling 16).
- Any change to `src/domain/`, `src/use-cases/`, `biome.json`, `tsconfig.json`, `vitest.config.ts`, `.gitignore` or `package.json` (D5, D7; ruling 12).

## Capabilities

### New Capabilities

- `configuration`: where taiknr's config files live, how their fields layer and validate, what a broken or unreadable file does, when the files are re-read, and the `enabled` switch that turns taiknr off.

### Modified Capabilities

- `extension-packaging`: "Handler signatures and the import boundary are preserved" gains one narrow exception, enumerated by name — the session-start registration, the `config` member of the turn-end and context deps, and the `ConfigPaths.projectConfigPath` type. The import boundary, the other four registrars, the deps objects' other members, the adapter and the ports do not change.

## Impact

- `src/config/taiknr-config.ts`: the `Not implemented` body, the new field and its default, the file-name constant, the error class, the rule table, and `ConfigPaths.projectConfigPath` as `string | undefined`.
- A new `src/config/session-config.ts`: the per-session holder. A new `src/app/extension/` unit: the gate that wraps registration.
- `src/infra/pi-event-handlers/session-start.ts`: path building from `ctx`, the trust gate, the loader call, the holder assignment and the rethrow.
- `src/infra/pi-event-handlers/turn-end.ts` and `context.ts`: the `config` member's type.
- `src/app/extension/taiknr.ts`: the holder and the gate replace the constant.
- New tests under `tests/config/`, `tests/app/extension/`, `tests/infra/pi-event-handlers/` and one shared fake under `tests/`; no tooling file needs an edit (D7).
- Untouched: `src/domain/`, `src/use-cases/`, the seven-registration invariant, the other four handler files, the scorer adapter, Joel's `~/.pi/agent/` and the dotfiles, and the proof-of-concept files (orientation §2; ruling 6, 16).

## Open Questions

None outstanding. The council and Joel settled every question this proposal raised; each resolution is recorded in `council.md` ("Michael's Rulings" and "Owner Decisions Required") and applied above.

| Question | Resolution |
|---|---|
| O1 — how a per-session config reaches handlers registered at factory time | A three-state holder created per factory call, assigned whole once per `session_start`, read at event time (ruling 1) |
| O2 — validation implementation | Hand-written guards in one per-field rule table; no typebox, no `package.json` change (ruling 12) |
| O3 — how the rejected-file report surfaces in every mode | One `Error` thrown from the session-start handler after the holder is set to rejected; measured on stderr in print and JSON modes, in the chat in TUI, as `extension_error` in RPC (ruling 5) |
| O5 — observability | Nothing on success or absence; the rejection throw is the only emission; no resolution record (ruling 14) |
| O6 — where the `enabled` check lives | One gate at the composition root over the six non-session-start registrations; later cards add no per-handler check (ruling 4) |
| O7 — whether `enabled: false` is reported at session start | Silent (Joel, `owner-rulings.md` "Council OD — announcing a valid off") |

Dissolved by Joel's Q1 ruling: the orientation's O4 (which layer survives a rejection) no longer arises, because nothing survives — taiknr does nothing for that session.
