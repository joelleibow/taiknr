# Spec Delta

## Purpose

Defines where taiknr's configuration files live, how their fields layer and validate, what a broken file does, when the files are re-read, and the `enabled` switch that turns taiknr off without an uninstall.

## ADDED Requirements

### Requirement: Config files sit at two host-resolved paths

taiknr SHALL read two optional files: `<agent dir>/pi-taiknr.json` and `<cwd>/<CONFIG_DIR_NAME>/pi-taiknr.json`. It SHALL build both paths from Pi's `getAgentDir()` and `CONFIG_DIR_NAME`, never from the literals `~/.pi/agent` or `.pi`. The project file SHALL be the one at the session's working directory, and no parent directory SHALL be searched (S1; Joel's "Q2 clarification"; Trap 3; D2).

#### Scenario: The agent path follows Pi's override

- **WHEN** `PI_CODING_AGENT_DIR` points at a throwaway directory
- **THEN** taiknr reads `<that directory>/pi-taiknr.json` and never `~/.pi/agent/pi-taiknr.json`

#### Scenario: The project path follows Pi's config-dir constant

- **WHEN** `CONFIG_DIR_NAME` is a value other than `.pi`
- **THEN** the project file is looked for at `<cwd>/<CONFIG_DIR_NAME>/pi-taiknr.json`

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

### Requirement: Every field is validated and every rejection names the file and the field

taiknr SHALL accept only a JSON object whose known keys hold valid values: `decisionThreshold` a finite number in `[0,1]`, `minCharsToArchive` an integer `>= 0`, the two model fields non-empty strings, `enabled` a boolean. A non-object root, an unknown top-level key, a wrong JSON type or an out-of-range value SHALL each be a rejection, and every rejection SHALL name the file and the field (Joel's "Orientation Q1b"; S3; Trap 7; D8).

#### Scenario: The root is not an object

- **WHEN** a file parses to `[]` or `null`
- **THEN** it is rejected, naming the file

#### Scenario: An unknown top-level key

- **WHEN** a file carries a top-level key `decisionTreshold`
- **THEN** it is rejected, naming the file and that key

#### Scenario: An out-of-range threshold

- **WHEN** `decisionThreshold` is `2`, `-0.1` or `"0.5"`
- **THEN** it is rejected, naming the file and `decisionThreshold`

#### Scenario: A length that is not a non-negative integer

- **WHEN** `minCharsToArchive` is `-1`, `1.5` or `"600"`
- **THEN** it is rejected, naming the file and `minCharsToArchive`

#### Scenario: An empty model field

- **WHEN** `defaultDecisionModel` or `defaultDecisionModelProvider` is `""` or a non-string
- **THEN** it is rejected, naming the file and that field

#### Scenario: An enabled value that is not a boolean

- **WHEN** `enabled` is `"false"`, `0` or `null`
- **THEN** it is rejected, naming the file and `enabled`

### Requirement: A present but malformed or invalid file stops taiknr for the session

When a config file is present but cannot be parsed or fails validation, taiknr SHALL report the failure clearly, naming the file and the field, and SHALL do nothing for that session — no staging, settlement, hydration, recall or classifier calls — until the file is fixed. It SHALL NOT fall back to the defaults, or to the other file's values (Joel's "Orientation Q1" → (b)).

#### Scenario: An unparsable file

- **WHEN** a file holds `""`, `" "`, a BOM-prefixed object or otherwise invalid JSON
- **THEN** the failure is reported naming the file, and nothing taiknr would do that session happens

#### Scenario: No fallback to the other layer

- **WHEN** the project file is rejected in a trusted project
- **THEN** the agent file's values and the defaults are not used in its place, and taiknr does nothing until the file is fixed

#### Scenario: The report reaches a mode with no UI

- **WHEN** the session runs in print or JSON mode and a file is rejected
- **THEN** the failure is reported on a channel those modes carry, not through a UI notification alone (Trap 6; O3 settles the mechanism)

### Requirement: The project file is honoured only in a trusted project

taiknr SHALL apply the project file's values only when the host reports that project trusted for the session (`ctx.isProjectTrusted()`). In an untrusted project taiknr SHALL ignore the project file and resolve the config from the agent file over the defaults (S4; research-chidi Q1; research-eleanor §1).

#### Scenario: An untrusted project file is ignored

- **WHEN** the agent file sets `enabled` true and an untrusted project file sets it false
- **THEN** the resolved config reports `enabled` true

#### Scenario: A trusted project file applies

- **WHEN** the agent file sets `enabled` true and a trusted project file sets it false
- **THEN** the resolved config reports `enabled` false

### Requirement: Config is re-read at every session start

taiknr SHALL resolve the config at each `session_start`, from that event's working directory and trust state, reading the files afresh. It SHALL NOT start a file watcher. A file edited mid-session SHALL take effect at the next session start — `/reload`, `/new`, `/resume`, `/fork` or a new process — and not before (S4, S12; Trap 8; Trap 13).

#### Scenario: A second session start re-reads

- **WHEN** the agent file changes and a later `session_start` arrives
- **THEN** the config resolved for that session carries the new value

#### Scenario: An edit without a new session start does not apply

- **WHEN** a file changes mid-session and no new `session_start` follows
- **THEN** the session keeps the config it resolved at its own start

#### Scenario: Session replacement enters a different working directory

- **WHEN** a replacement session's working directory differs from the previous one's
- **THEN** the project file is looked for under the new working directory

### Requirement: The enabled switch turns taiknr fully off

`enabled` SHALL be a JSON boolean that defaults to `true` when absent. While it is `false`, taiknr SHALL do no staging, settlement, hydration, recall or classifier calls, and outputs stubbed before it was turned off SHALL stay stubbed and unrecalled until it is turned back on. A trusted project file MAY set it `false` for that project alone (Joel's "Orientation Q3" → fully inert; S10, S11; Trap 15).

#### Scenario: Absent means on

- **WHEN** no file sets `enabled`
- **THEN** the resolved config reports `enabled` true

#### Scenario: A project file turns taiknr off for one project

- **WHEN** a trusted project file sets `enabled` false
- **THEN** taiknr is off in that project while the agent-level value still governs every other project

#### Scenario: Stubs made before the switch stay stubbed

- **WHEN** taiknr is turned off after outputs were stubbed in the same session
- **THEN** those outputs stay stubbed and are not recalled while it is off, until taiknr is turned back on

### Requirement: The loader is synchronous, host-free and takes its paths from the caller

`loadTaiknrConfig(paths: ConfigPaths): TaiknrConfig` SHALL stay synchronous and in `src/config/`, SHALL NOT import from `@earendil-works/pi-*`, and SHALL receive both paths from its caller, so another composition root (`cli/`, `mcp/`; ADR 0001) can call it with its own paths (D5, D9; S1, S6).

#### Scenario: No host import in the config layer

- **WHEN** `src/config/` is searched for `@earendil-works/pi-` imports
- **THEN** none are found

#### Scenario: Callable with no Pi runtime

- **WHEN** the loader is called with two paths under a `mkdtemp` directory and no Pi runtime present
- **THEN** it returns the layered, validated config

### Requirement: The session's resolved config reaches its handlers

The composition root SHALL pass the configuration it resolved for the session to the turn-end and context handler dependencies and the scorer adapter, in place of the `DEFAULT_TAIKNR_CONFIG` constant, through the mechanism the design names (O1). Every handler and adapter that needs a `TaiknrConfig` SHALL see the session's resolved value (S5; D9; orientation §2).

#### Scenario: A file's value reaches a handler

- **WHEN** the agent file sets `decisionThreshold` to a non-default value and the session starts
- **THEN** the turn-end handler's config carries that value

#### Scenario: Sessions do not share a config

- **WHEN** two sessions start with different config files
- **THEN** each session's handlers carry the values resolved for that session

### Requirement: A clean seam is left for the deferred /taiknr command

One place SHALL exist where the deferred `/taiknr` command can set `enabled` for the current session without re-registering handlers, and the design SHALL name it. This change SHALL NOT register a command, write a config file, or report which file supplied a field (S13; D10; Trap 14).

#### Scenario: No command is registered

- **WHEN** the extension entry loads
- **THEN** it registers exactly the seven lifecycle events and registers no command and no tool

#### Scenario: The seam is named once

- **WHEN** the design is read
- **THEN** it names the single place the Status card's command will set `enabled` on, without re-registering handlers

### Requirement: Config loading is tested without a Pi session

Tests under `tests/config/` SHALL mirror `src/config/` and cover defaults, the agent file alone, the project file over the agent file, every rejection class, the trust gate, the `enabled` field and the re-read at `session_start` with the recording fake at the composition root. They SHALL import `expect` and `test` from vitest, use `.js` specifiers, use `mkdtemp` directories and run with no Pi session or extension loader (S7, S14; D7).

#### Scenario: The test command collects them

- **WHEN** `npm test` runs
- **THEN** the config tests are collected from `tests/**/*.test.ts`

#### Scenario: No Pi runtime in a config test

- **WHEN** the config tests run
- **THEN** no Pi extension loader and no Pi session are present

#### Scenario: Each rejection class has its own case

- **WHEN** the validation tests run
- **THEN** each rejection named in the validation requirement, plus `""`, `" "`, a BOM-prefixed object, `[]` and `null`, has its own case (Trap 7)
