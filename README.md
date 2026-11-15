# pi-taiknr

`pi-taiknr` is a Pi coding-agent extension: it keeps large tool outputs out of the active prompt by replacing them with deterministic one-line stubs, and recalls a raw output at the tail of the user's message when a turn needs it back. Stubbing and recall are still being built. The configuration they read is what runs today.

## What runs today

- Both config files are read and validated at every session start, and one config is resolved for the session.
- `enabled` turns taiknr off for a whole session, or for one project.
- A broken config file is reported, and taiknr then does nothing for that session.

Not built yet: staging, settlement, archiving, recall, the status readout, and the `/taiknr on` and `/taiknr off` commands. Until those land the switch gates handlers that have no behavior behind them, so flipping it changes little you can see.

## Loading it

Nothing is published yet: `package.json` has no `version`, `license` or `files`, so `npm pack` fails. Pi loads the extension from a local checkout named under `packages` in `~/.pi/agent/settings.json`. `ARCHITECTURE.md` §6 has that entry and the path rules around it.

## Configuration

taiknr reads two optional files, both named `pi-taiknr.json`:

| Level | Where taiknr looks |
|---|---|
| Agent | `~/.pi/agent/pi-taiknr.json` by default, or the directory `PI_CODING_AGENT_DIR` names |
| Project | `<cwd>/.pi/pi-taiknr.json`: `pi-taiknr.json` in Pi's project config directory at the session's working directory, `.pi` in a standard install |

The project file counts only in a project Pi reports as trusted. taiknr looks in the session's working directory and searches no parent.

### Fields

| Field | Takes | Default |
|---|---|---|
| `decisionThreshold` | a number from 0 to 1 | `0.5` |
| `minCharsToArchive` | an integer of 0 or more: the minimum length at which an output is archived, with `0` archiving everything | `600` |
| `defaultDecisionModel` | a non-empty string, the classifier model | `~typesafe/jev-latest` |
| `defaultDecisionModelProvider` | a non-empty string, the provider serving that model | `openrouter` |
| `enabled` | `true` or `false` | `true` |

A file states only the fields that differ. Every other case is a config error rather than something to ignore: a key outside the table, a value of the wrong type, a number out of range, a root that is not a JSON object.

### Which value wins

Each field resolves on its own: the built-in default, then the agent file's value, then the project file's value. The nearest file that sets a field wins, and the files behind it still supply what it leaves out. A trusted project file holding `{"enabled": false}` turns taiknr off for that project and keeps the agent file's other values.

### When the files are read

At every session start: a new `pi` process, `/new`, `/resume`, `/fork` or `/reload`. An edit made mid-session takes effect at the next start and not before. Nothing watches the files.

### Turning it off

`"enabled": false` makes taiknr do nothing for that session: no staging, no settlement, no hydration, no recall, no classifier calls. Anything stubbed before you turned it off stays stubbed until it is back on. A valid off is silent, because a switch you set yourself needs no announcement.

To flip it today, edit the file and run `/reload`. `/taiknr on` and `/taiknr off` arrive with the status command.

### A broken file stops taiknr for the session

A file that cannot be read or parsed, or that fails a field's rule, is reported once at session start, and taiknr then does nothing until the file is fixed. Nothing falls back to the defaults, and nothing falls back to the other file. The report names the file, the field where one applies and the reason, then the recovery step:

```text
/Users/you/.pi/agent/pi-taiknr.json: decisionThreshold: must be <= 1; fix the file, then run /reload or start a new session
```

Two cases are not errors: a file that is not there is silent, and so is a project config directory that turned out to be a regular file. An entry that exists and cannot be read is an error, not a missing file: a dangling symlink, a directory where the file belongs, a permission denial.

A UTF-8 byte-order mark before the JSON is fine. A file holding only whitespace is not.

## Where to read more

`ARCHITECTURE.md` is the system's shape. `docs/adr/` holds the decisions behind it, one per file. `AGENTS.md` carries the commands, conventions and traps for working on the code.
