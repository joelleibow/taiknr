# pi-taiknr

`pi-taiknr` is a Pi coding-agent extension: it keeps large tool outputs out of the active prompt by replacing them with deterministic one-line stubs, and recalls a raw output at the tail of the user's message when a turn needs it back. Stubbing works end to end. Recall and the status command are still being built.

## What runs today

- Both config files are read and validated at every session start, and one config is resolved for the session.
- `enabled` turns taiknr off for a whole session, or for one project.
- A broken config file is reported, and taiknr then does nothing for that session.
- A tool result whose text reaches `minCharsToArchive` is replaced with a one-line stub once the run that produced it settles.
- Every stubbed output is recorded in the session file, so a resumed session, a `/tree` jump and a `/compact` all keep what was archived before them.

Not built yet: recall, the status readout, and the `/taiknr on` and `/taiknr off` commands. Until they land, `context` has no behavior behind it, so the classifier never runs and nothing is recalled.

## Stubbing

A run that settles replaces each of its own tool results at or above the threshold with one line:

```text
[archived 9f3c1a2b] bash({"command":"npm test"}) status=ok (4204 chars, 118 lines) preview: RUN v5.1.0 | Test Files 16 passed (16) | Tests 220 passed (220)
```

The stub names the output and previews it: the tool, its arguments cut to 120 characters, its status, the size of the raw text, and its first three lines cut to 180 characters. That line is all the model sees in place of the output from then on.

A turn that fails or is interrupted stages its outputs too. They wait for the next run that settles, which stubs them then. What waits lives in the running extension only, so `/reload`, a new session or a session replacement loses anything still waiting, and the output stays raw.

### What a stub does not do

A stub hides an output from the model and nothing else. It is not redaction and it is not deletion: the raw text stays in the session's JSONL file, in the terminal UI and in exports, and a second copy of it goes into a `taiknr-side-store` entry that the model never sees. Navigating to a branch from before the stub puts the raw output back in front of the model, so the original is never lost and never hidden from you.

### What stubbing costs

Every stubbed output sits on disk twice, once as the tool result and once in its side-store record, so a session file roughly doubles the bytes of what it archived. The archive also grows with the branch and has no ceiling yet: a long session that archives output on many runs keeps every item.

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
| `minCharsToArchive` | an integer of 0 or more: the minimum length at which an output is stubbed, with `0` stubbing every result that carries any text | `600` |
| `defaultDecisionModel` | a non-empty string, the classifier model | `~typesafe/jev-latest` |
| `defaultDecisionModelProvider` | a non-empty string, the provider serving that model | `openrouter` |
| `enabled` | `true` or `false` | `true` |

A file states only the fields that differ. Every other case is a config error rather than something to ignore: a key outside the table, a value of the wrong type, a number out of range, a root that is not a JSON object.

The default threshold leaves room for the stub, whose framing costs a few hundred characters. Set `minCharsToArchive` well below about 400 and a stub can be longer than the text it replaced, which grows the context it was meant to shrink.

### Which value wins

Each field resolves on its own: the built-in default, then the agent file's value, then the project file's value. The nearest file that sets a field wins, and the files behind it still supply what it leaves out. A trusted project file holding `{"enabled": false}` turns taiknr off for that project and keeps the agent file's other values.

### When the files are read

At every session start: a new `pi` process, `/new`, `/resume`, `/fork` or `/reload`. An edit made mid-session takes effect at the next start and not before. Nothing watches the files.

### Turning it off

`"enabled": false` makes taiknr do nothing for that session: no staging, no settlement, no hydration, no recall, no classifier calls. Anything stubbed before you turned it off stays stubbed until it is back on. A valid off is silent, because a switch you set yourself needs no announcement.

To flip it today, edit the file and run `/reload`. `/taiknr on` and `/taiknr off` arrive with the status command.

`/reload` starts the session again, so the archive is rebuilt when taiknr comes back on. A flip made without one would not rebuild it: a `/tree` jump taken while taiknr was off leaves an archive that no longer matches the branch, and the next `/tree` or `/compact` repairs it. That gap belongs to the status card.

### A broken file stops taiknr for the session

A file that cannot be read or parsed, or that fails a field's rule, is reported once at session start, and taiknr then does nothing until the file is fixed. Nothing falls back to the defaults, and nothing falls back to the other file. The report names the file, the field where one applies and the reason, then the recovery step:

```text
/Users/you/.pi/agent/pi-taiknr.json: decisionThreshold: must be <= 1; fix the file, then run /reload or start a new session
```

Two cases are not errors: a file that is not there is silent, and so is a project config directory that turned out to be a regular file. An entry that exists and cannot be read is an error, not a missing file: a dangling symlink, a directory where the file belongs, a permission denial.

A UTF-8 byte-order mark before the JSON is fine. A file holding only whitespace is not.

## Where to read more

`ARCHITECTURE.md` is the system's shape. `docs/adr/` holds the decisions behind it, one per file. `AGENTS.md` carries the commands, conventions and traps for working on the code.
