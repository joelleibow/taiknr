# configuration Specification

## Purpose
Defines where taiknr's configuration files live, how their fields layer and validate, what a broken or unreadable file does, when the files are re-read, and the `enabled` switch that turns taiknr off without an uninstall.

## Requirements

### Requirement: Config files sit at two host-resolved paths

taiknr SHALL read two optional files: `<agent dir>/pi-taiknr.json` and `<cwd>/<CONFIG_DIR_NAME>/pi-taiknr.json`. It SHALL build both paths from Pi's `getAgentDir()` and `CONFIG_DIR_NAME`, never from the literals `~/.pi/agent` or `.pi`. The project file SHALL be the one at the session's working directory, and no parent directory SHALL be searched (S1; Joel's "Q2 clarification"; Trap 3; D2; ruling 10).

#### Scenario: The agent path follows Pi's override

- **WHEN** `PI_CODING_AGENT_DIR` points at a throwaway directory and the session starts
- **THEN** taiknr reads `<that directory>/pi-taiknr.json` and never `~/.pi/agent/pi-taiknr.json`

#### Scenario: The project path is built from the host's constant

- **WHEN** the source is searched for the project path's construction
- **THEN** the path is built from the host's `CONFIG_DIR_NAME`, and `src/` contains no literal `.pi` or `~/.pi` path segment (ruling 10)

#### Scenario: No parent-directory search

- **WHEN** a `pi-taiknr.json` exists only in a parent of the session's working directory and none exists at `<cwd>/<CONFIG_DIR_NAME>/`
- **THEN** taiknr does not read the parent's file

### Requirement: Fields layer over defaults, then the agent file, then the project file

taiknr SHALL resolve each field independently: the built-in default, overlaid by the agent file's value, overlaid by the project file's value. A field the project file sets wins; otherwise the agent file's value; otherwise the default. A file MAY state only the fields that differ (Joel's "Orientation Q1b and Q2"; Michael's Q2(a); S2).

#### Scenario: The project file states one field

- **WHEN** a trusted project file holds `{"minCharsToArchive": 100}` and the agent file holds `{"decisionThreshold": 0.9}`
- **THEN** the resolved config has `minCharsToArchive` 100, `decisionThreshold` 0.9, and the defaults for the remaining fields

#### Scenario: The agent file alone

- **WHEN** only the agent file exists and it sets `defaultDecisionModel`
- **THEN** the resolved config takes that model and the defaults for every other field

#### Scenario: Neither file exists

- **WHEN** neither file exists
- **THEN** every field holds its default, and nothing is reported

#### Scenario: A file may carry a single field

- **WHEN** a trusted project file holds only `{"enabled": false}`
- **THEN** the resolved config keeps the agent file's other field values rather than resetting them to defaults

### Requirement: Every field is validated and every rejection names the file, and the field where one applies

In a config file taiknr SHALL accept only a JSON object whose known keys hold valid values, parsing the text after stripping a leading UTF-8 BOM. A non-object root, an unknown top-level key, a wrong JSON type or an out-of-range value SHALL each be a rejection. Every rejection SHALL name the file, and the field where one applies (Joel's "Q1b"; S3; Trap 7; D8; rulings 5, 12).

#### Scenario: The known fields accept their valid values

- **WHEN** a file sets `decisionThreshold` to `0.5`, `minCharsToArchive` to `600`, both model fields to non-empty strings and `enabled` to `true`
- **THEN** it is accepted, and the resolved config carries those values

#### Scenario: The root is not an object

- **WHEN** a file parses to `[]` or `null`
- **THEN** it is rejected, naming the file and no field

#### Scenario: An unknown top-level key

- **WHEN** a file carries a top-level key `decisionTreshold`
- **THEN** it is rejected, naming the file and that key, with the reason "unknown field"

#### Scenario: An unknown key named after an object-prototype member

- **WHEN** a file carries a top-level key `toString` or `__proto__`
- **THEN** it is rejected, naming the file and that key (ruling 12)

#### Scenario: An out-of-range threshold

- **WHEN** `decisionThreshold` is `2`, `-0.1`, `1e999` or `"0.5"`
- **THEN** it is rejected, naming the file and `decisionThreshold`

#### Scenario: A negative zero threshold

- **WHEN** `decisionThreshold` is `-0`
- **THEN** it is accepted, and the resolved value is `-0` (ruling 12)

#### Scenario: A length that is not a non-negative integer

- **WHEN** `minCharsToArchive` is `-1`, `1.5`, `1e999` or `"600"`
- **THEN** it is rejected, naming the file and `minCharsToArchive`

#### Scenario: An empty model field

- **WHEN** `defaultDecisionModel` or `defaultDecisionModelProvider` is `""`, `" "` or a non-string
- **THEN** it is rejected, naming the file and that field

#### Scenario: An enabled value that is not a boolean

- **WHEN** `enabled` is `"false"`, `0` or `null`
- **THEN** it is rejected, naming the file and `enabled`

### Requirement: An unreadable file is a rejection, not an absence

Only a path with no directory entry, or one under a `<cwd>/<CONFIG_DIR_NAME>` that is not a directory, SHALL count as absent. Every other read failure — a dangling symbolic link, a directory at the path, a permission failure — SHALL be a rejection naming the file (ruling 8; Joel's "Orientation Q1").

#### Scenario: A dangling symbolic link

- **WHEN** the agent path is a symbolic link whose target no longer exists
- **THEN** it is rejected, naming the file and no field, and not treated as absent

#### Scenario: A directory at the path

- **WHEN** `<agent dir>/pi-taiknr.json` is a directory
- **THEN** it is rejected, naming the file, with the error code in the reason

#### Scenario: A file that cannot be read

- **WHEN** the file exists with permissions that deny reading
- **THEN** it is rejected, naming the file, with the error code in the reason

#### Scenario: The project config directory is not a directory

- **WHEN** `<cwd>/<CONFIG_DIR_NAME>` is a regular file, so the read fails with `ENOTDIR`
- **THEN** the project file is treated as absent and nothing is reported

#### Scenario: A missing file stays silent

- **WHEN** a path holds no directory entry at all
- **THEN** the file is treated as absent and nothing is reported

### Requirement: A present but malformed or invalid file stops taiknr for the session

When a config file is present but cannot be parsed or fails validation, taiknr SHALL report the failure and SHALL do nothing for that session until the file is fixed, with no fallback to the defaults or to the other file's values (Joel's "Orientation Q1" → (b)). The report SHALL be one error thrown from the session-start handler after the session's state is recorded as rejected, never a UI notification alone (ruling 5; CB-2).

#### Scenario: An unparsable file

- **WHEN** a file holds `""`, `" "` or otherwise invalid JSON
- **THEN** the failure is reported naming the file, and nothing taiknr would do that session happens

#### Scenario: A BOM-prefixed object is not unparsable

- **WHEN** a file holds a UTF-8 BOM followed by `{}`
- **THEN** it is accepted, and the resolved config is the defaults (ruling 7)

#### Scenario: The report names the field and the recovery step

- **WHEN** a file is rejected for an out-of-range `decisionThreshold`
- **THEN** the session-start handler's thrown error reads `<absolute file path>: decisionThreshold: <reason>`, ending with the instruction to fix the file and then run `/reload` or start a new session (ruling 5)

#### Scenario: A parse or read failure names no field

- **WHEN** a file is rejected because it cannot be parsed or read
- **THEN** the thrown message carries the absolute path and the reason, then the recovery instruction (ruling 5)

#### Scenario: No fallback to the other layer

- **WHEN** the project file is rejected in a trusted project
- **THEN** the agent file's values and the defaults are not used in its place, and taiknr does nothing until the file is fixed

#### Scenario: The report reaches a mode with no UI

- **WHEN** the session runs in print or JSON mode and a file is rejected
- **THEN** the failure reaches that mode's error channel rather than a UI notification, and the machine-readable output stream carries no added line (ruling 5)

### Requirement: The project file is honoured only in a trusted project

taiknr SHALL apply the project file's values only when the host reports that project trusted for the session (`ctx.isProjectTrusted()`). In an untrusted project the caller SHALL pass no project path, so taiknr never opens, parses or validates a file it was not given (S4; research-chidi Q1; research-eleanor §1; rulings 2, 3).

#### Scenario: An untrusted project file is ignored

- **WHEN** the agent file sets `enabled` true and an untrusted project file sets it false
- **THEN** the resolved config reports `enabled` true

#### Scenario: An untrusted malformed project file is never read

- **WHEN** an untrusted project holds a malformed `<cwd>/<CONFIG_DIR_NAME>/pi-taiknr.json`
- **THEN** it causes no rejection, and the config resolves from the agent file over the defaults (ruling 3)

#### Scenario: A trusted project file applies

- **WHEN** the agent file sets `enabled` true and a trusted project file sets it false
- **THEN** the resolved config reports `enabled` false

### Requirement: Config is re-read at every session start

taiknr SHALL resolve the config at each `session_start`, from that event's working directory and trust state, reading the files afresh and replacing the session's resolved state whole. It SHALL NOT start a file watcher. A file edited mid-session SHALL take effect at the next session start and not before (S4, S12; Trap 8; Trap 13; ruling 1).

#### Scenario: A second session start re-reads

- **WHEN** the agent file changes and a later `session_start` arrives
- **THEN** the config resolved for that session carries the new value

#### Scenario: A fixed file clears a prior rejection

- **WHEN** a session started on a rejected file, the file is fixed, and a later `session_start` arrives in the same extension runtime
- **THEN** the resolved state is ready and carries the fixed file's values, and the session is no longer inert (ruling 1)

#### Scenario: An edit without a new session start does not apply

- **WHEN** a file changes mid-session and no new `session_start` follows
- **THEN** the session keeps the config it resolved at its own start

#### Scenario: Session replacement enters a different working directory

- **WHEN** a replacement session's working directory differs from the previous one's
- **THEN** the project file is looked for under the new working directory

### Requirement: The enabled switch turns taiknr fully off

`enabled` SHALL be a JSON boolean defaulting to `true`. While it is `false`, taiknr SHALL do no staging, settlement, hydration, recall or classifier calls, and outputs stubbed earlier SHALL stay stubbed. A handler other than the session-start one SHALL NOT run in that state, so one enforcement point serves every later card. A valid `enabled: false` SHALL produce no output (Joel's "Q3"; S10; rulings 4, 13).

#### Scenario: Absent means on

- **WHEN** no file sets `enabled`
- **THEN** the resolved config reports `enabled` true

#### Scenario: A valid off is silent

- **WHEN** the resolved config reports `enabled` false
- **THEN** the session start produces no output (ruling 13)

#### Scenario: A project file turns taiknr off for one project, verified by the archive and recall cards

- **WHEN** a trusted project file sets `enabled` false
- **THEN** taiknr is off in that project while the agent-level value still governs every other project

#### Scenario: Stubs made before the switch stay stubbed, verified by the archive and recall cards

- **WHEN** taiknr is turned off after outputs were stubbed in the same session
- **THEN** those outputs stay stubbed and are not recalled while it is off, until taiknr is turned back on

### Requirement: The loader is synchronous, host-free and takes its paths from the caller

`loadTaiknrConfig(paths: ConfigPaths): TaiknrConfig` SHALL stay synchronous and in `src/config/`, SHALL NOT import from `@earendil-works/pi-*`, and SHALL receive the agent path and the project path — or `undefined` for no project layer — from its caller, so another composition root (`cli/`, `mcp/`; ADR 0001) can call it with its own paths (D5, D9; S1, S6; ruling 2).

#### Scenario: No host import in the config layer

- **WHEN** `src/config/` is searched for `@earendil-works/pi-` imports
- **THEN** none are found

#### Scenario: Callable with no Pi runtime

- **WHEN** the loader is called with an agent path under a `mkdtemp` directory and no project path, with no Pi runtime present
- **THEN** it returns the agent file's values over the defaults

### Requirement: The session's resolved config reaches its handlers

The composition root SHALL pass the session's resolved state to the turn-end and context handler dependencies, in place of the `DEFAULT_TAIKNR_CONFIG` constant, through the per-session holder the design names, and those handlers SHALL read it at event time. The other four registrars SHALL NOT change, and the scorer adapter is outside this change's wiring (O1; S5; rulings 1, 16).

#### Scenario: A file's value reaches a handler

- **WHEN** the agent file sets `decisionThreshold` to a non-default value and the session starts
- **THEN** the holder the turn-end and context registrations received reports that value for that session

#### Scenario: Sessions do not share a config

- **WHEN** two sessions start with different config files
- **THEN** each session's handlers carry the values resolved for that session, and neither sees the other's

### Requirement: A clean seam is left for the deferred /taiknr command

One place SHALL exist where the deferred `/taiknr` command can set `enabled` for the current session: the session holder's `setEnabled(boolean): boolean`. It SHALL succeed only while the state is ready, returning false and changing nothing otherwise; its effect SHALL last until the next `session_start`, which re-reads the files; and it SHALL NOT hydrate. This change SHALL NOT register a command or write a config file (S13; D10; ruling 15).

#### Scenario: No command is registered

- **WHEN** the extension entry loads
- **THEN** it registers exactly the seven lifecycle events and registers no command and no tool

#### Scenario: The seam is named once

- **WHEN** the design is read
- **THEN** it names the single place the Status card's command will set `enabled` on, without re-registering handlers

#### Scenario: Turning on after a rejection is refused

- **WHEN** the resolved state is rejected or unresolved and `setEnabled(true)` is called
- **THEN** it returns false and the state is unchanged, so the session stays inert

#### Scenario: The flip ends at the next session start

- **WHEN** `setEnabled` changed `enabled` in memory and a later `session_start` arrives
- **THEN** the resolved state comes from the files as they are then, not from the in-memory value

### Requirement: The classifier call's timeout is a field with a default that can be overridden

`classifierTimeoutMs` SHALL be a known key holding an integer from 1 to 2147483647 milliseconds, defaulting to the value the design records from a measured classifier round trip. A file MAY override it, layering as every other field does, and a value outside that range, or one that is not an integer or not a number, SHALL be a rejection naming the file and the field (Joel's "Orientation Q2" → (b) and (c); D7; ruling 2).

#### Scenario: The default applies

- **WHEN** neither file sets `classifierTimeoutMs`
- **THEN** the resolved config carries the default the design records, and nothing is reported (D7)

#### Scenario: A file overrides the default

- **WHEN** the agent file sets `classifierTimeoutMs` to 8000
- **THEN** the resolved config carries 8000 (Joel's "Orientation Q2" → "a sensible default that can be overridden")

#### Scenario: The project file wins

- **WHEN** the agent file sets `classifierTimeoutMs` to 8000 and a trusted project file sets it to 12000
- **THEN** the resolved config carries 12000

#### Scenario: A value that is not an integer in range

- **WHEN** `classifierTimeoutMs` is `0`, `-1`, `1.5`, `1e999`, `2147483648` or `"8000"`
- **THEN** it is rejected, naming the file and `classifierTimeoutMs` (ruling 2: a larger value makes Node warn and fire after 1 ms, which would turn the setting into "always fail")

#### Scenario: The timeout reaches the recall path

- **WHEN** a session resolves a non-default `classifierTimeoutMs` and a request is scored
- **THEN** that session's classifier call is bounded by that value, read at event time (D7; `tail-recall` spec)

### Requirement: Config loading is tested without a Pi session

Tests SHALL mirror the `src/` layer each one exercises and SHALL follow the conventions the `development-checks` specification fixes rather than restating them. They SHALL cover the host-free loader and its rejection classes, the holder's three states, the gate, and the session-start handler's trust gate, ordering and re-read, with no Pi session or extension loader present in the loader tests (S7, S14; D7; ruling 9).

#### Scenario: Each layer's tests sit beside it

- **WHEN** the test tree is inspected
- **THEN** `tests/config/` holds the loader cases and the holder, `tests/app/extension/` the gate, `tests/infra/pi-event-handlers/` the session-start handler, the existing entry test is unchanged, and any fake shared by more than one file has one home under `tests/`

#### Scenario: The test command collects them

- **WHEN** `npm test` runs
- **THEN** the config, holder, gate and session-start tests are collected from `tests/**/*.test.ts`

#### Scenario: No Pi runtime in a loader test

- **WHEN** the loader tests under `tests/config/` run
- **THEN** no Pi extension loader and no Pi session are present

#### Scenario: Each rejection class has its own case

- **WHEN** the validation tests run
- **THEN** each rejection named in the validation requirement, plus `""`, `" "`, `[]`, `null`, `toString`, `__proto__`, `1e999`, the BOM case and the dangling-symlink and `EISDIR` cases, has its own case

#### Scenario: The gate is tested where it lives

- **WHEN** the holder and gate tests run
- **THEN** an inactive holder leaves a registered handler uncalled, and a ready holder with `enabled` true calls it once
