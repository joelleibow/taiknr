# pi-taiknr

`pi-taiknr` is a Pi coding-agent extension: it keeps large tool outputs out of the active prompt by replacing them with deterministic one-line stubs, and recalls a raw output at the tail of the user's message when a turn needs it back. Stubbing, recall and the four instruments work end to end. The status readout and the `/taiknr` commands are still being built.

## What runs today

- Both config files are read and validated at every session start, and one config is resolved for the session.
- `enabled` turns taiknr off for a whole session, or for one project.
- A broken config file is reported, and taiknr then does nothing for that session.
- A tool result whose text reaches `minCharsToArchive` is replaced with a one-line stub once the run that produced it settles.
- Every stubbed output is recorded in the session file, so a resumed session, a `/tree` jump and a `/compact` all keep what was archived before them.
- A new user message is scored against the archive once, and the outputs the classifier picks come back in full at the end of that message for that turn's requests only.
- Recall leaves out an output another extension has edited or that the active branch no longer carries, and it writes nothing to the session file.
- Four instruments are published to pi-jefferson 0.14.0 or later from the session start, and `jeffersonInstruments` turns them off without touching anything else.

Not built yet: the status readout and the `/taiknr on` and `/taiknr off` commands. The [instruments](#instruments) cover part of what those were meant to show: `taiknr.recall` carries the last request's block and whether a classifier call is running, and the net dollars include recall's classifier spend.

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

## Recall

When a new user message arrives, taiknr asks the configured classifier which archived outputs bear on it. One call covers the whole archive, and the rest of that turn reuses the answer instead of asking again for each tool-loop step. The outputs it picks go back in full at the end of the newest user message, inside a `<recalled_context>` block that marks them as reference data rather than instructions. That block exists for that turn's requests only: the session file is untouched, and the stub stays where it was. The next user message's request no longer carries the block, so the provider re-caches the recalling turn from its user message onward, once, at cache-write price.

Outputs are recalled whole and in order of relevance, until the next one would take the request past pi's compaction threshold. Recall never cuts an output in half, never skips a large one for a smaller one behind it, and never removes anything from the archive.

An output is a candidate only while its tool result is still on the active branch and the newest edit to it is taiknr's own stub. So a redaction another extension persisted keeps that output out, and an output left behind on a branch you navigated away from never comes back.

### What recall sends, and where

Two destinations, and they are not the same:

- **The classifier provider** (`defaultDecisionModelProvider`, `openrouter` by default) gets the new message's text and, for each candidate, that output's stub: the tool name, the 120-character argument summary and the 180-character preview of the first three lines. It never gets an output's raw text, and never an image.
- **The main model's provider** gets the full raw text of every output recall picks, inside the request that carries the block.

A stub does not keep an output off the network. It keeps the output out of the conversation; recall puts the body back in front of a provider on the one request that needs it.

### What recall costs, and where you can see it

About $0.0002 a call at today's archive size, which is around thirty archived outputs, and less when the archive is smaller (about $0.00004 at five). It is one call per new user message, and the cost grows with the archive because the call carries one stub per candidate.

pi's footer and `/session` do not show that spend. pi totals the usage it records against a message or a tool result, and a classifier call an extension makes records nothing there, so the cost is real and invisible to pi.

taiknr's own figures do show it. `savedDollarsRequest` and `savedDollarsSinceStart` subtract every classifier call taiknr made since the last priced request, so the net dollars a session reports include recall's cost. The [instruments](#instruments) section has the details.

### How far recall may grow, and one consequence

Recall keeps the request it builds under pi's compaction threshold, measured with pi's own estimate. That is a bound on one request, not on pi's next check: pi's check counts the provider usage of the request it last sent, the recall block included, plus whatever the step after it added. So a recall that fills most of its room can make pi compact a session at that check, where it would not have compacted otherwise. After such a compaction the block may no longer fit, and the rest of that turn runs without it, silently; the next user message is scored again.

No taiknr setting removes this while recall is on. Raising `decisionThreshold` can only shrink the block. Raising `reserveTokens` lowers pi's threshold and recall's budget by the same amount, so it moves the case rather than avoiding it, and pi's own compactions start earlier. Turning pi's global compaction off (its own `compaction.enabled` setting) does remove the case, and it also turns off pi's overflow recovery, so taiknr does not recommend it. `docs/adr/0007-recall-on-the-whole-request-inside-its-own-bound.md` has the measurements.

### When the classifier cannot answer

Recall fails open: the request goes out without a block, and stubbing carries on. A missing model, an error answer or a call that runs past `classifierTimeoutMs` shows one warning in the session, naming the provider, the model and the field to fix, and later failures in that session are silent. A classifier that hangs adds up to the timeout to each new user message after that. Cancelling the run reports nothing. Print and JSON modes keep working and print nothing, because the warning has no surface there.

## Instruments

taiknr publishes four instruments to pi-jefferson 0.14.0 or later: `taiknr.context`, `taiknr.archive`, `taiknr.savings` and `taiknr.recall`. Publishing is on by default. `jeffersonInstruments` is taiknr's only new setting, and turning it off leaves stubbing, settlement, hydration and recall exactly as they are.

Jefferson draws the rows. taiknr posts numbers and booleans and renders nothing itself, so where the rows sit, what they say, their label and their colour are ordinary Jefferson configuration in `~/.pi/agent/pi-jefferson.json`. An example set is below. With Jefferson absent the posts reach no listener: no row appears, nothing throws, and nothing else changes.

### What stubbing does to pi's own context figure

After a settlement replaces a tool output, the branch carries a `context_edit` newer than the last reply. At that moment pi stops trusting the provider's usage: it sums characters ÷ 4 over the whole projection instead, and keeps doing that until the next reply lands. So anyone watching pi's context figure sees it fall after a settled run and jump back when the next reply lands: two moves over a change that made the prompt smaller.

That estimate is low, and how low depends on the model. On Anthropic models it lands 38–41% below the next request's real prompt, measured at 33 consecutive settlements in one session; on the one deepseek session measured it is a few percent. It is pi's own rule and not a setting, so nothing in taiknr changes it.

Three consequences matter beyond the size of the gap:

- pi's pre-run compaction check runs on the same estimate, so after a settled run and until a reply arrives, pi checks against a number that is low by that much.
- Right after a compaction pi's figure is `null`, while taiknr's is still a number.
- A recall block counts in a request's usage and never in the persisted history, so the two measurements part company on a recalling turn.

`taiknr.context` is the reading for these. It carries a figure built from taiknr's own estimate of the persisted history, corrected by the ratio below, so it never swaps estimators mid-stream: it moves by what was added and what was stubbed, not by 40% at once, and it is never `null`. It also offers a bar, which reads as that figure's share of the model's window. A format naming `$bar` draws it, and a session whose host reports no window gets an empty track rather than a wrong fill.

### What each figure means

The figures overlap, so they are never added together. `recalled` is part of `contextInTurn`, and `historyBefore` differs from `contextInTurn` by exactly the request's saving.

- `contextInTurn`: the request as sent, recall block included.
- `historyBefore`: the same request with every stub replaced by the raw text it stands for, and the block removed.
- `withheld`: the raw text those stubs replaced.
- `stubbed`: the stub text standing in its place.
- `recalled`: recall's block in this request.
- `totalContext`: the persisted history after taiknr's edits, and never the recall block, which lives in one request and in no history.

Three more describe the archive rather than one request: `archiveItems`, `archiveWithheld` and `archiveStubbed` count the whole store, which keeps items from before a compaction, so `archiveWithheld` is larger than a request's `withheld` once the branch has been compacted.

Every token figure is a character estimate times one ratio, `k`: the prompt tokens of the newest valid reply for a provider and model, divided by the estimate of the request that produced it. One ratio is kept per provider and model and seeded from the session's branch at start, so a model switch starts uncalibrated again.

The `~` beside a figure means the provider and model it was posted under have no live sample yet, and the figure is uncalibrated: `k` is 1, or a seed read from the branch. The flag never means exact, and there is no second flag. Once a reply from that model has been measured, the flag turns off and the figures are calibrated estimates rather than raw ones.

Every token figure but one stays an estimate. `contextInTurn` becomes measured once its own reply lands, and the measured value is published only as `contextInTurn`: the saving is always computed from estimates, because subtracting a measured request from an estimated history would mix two different measurements.

The four savings figures count from the moment the session started. `/new`, `/resume`, `/fork` and `/reload` each begin again at zero, and nothing is persisted, which is why the default format says *tokens not sent since start*: a stub carried by ten requests counts ten times, so the total can pass the size of the context it is in. All four are signed. The dollars are net of the cache rewrite taiknr caused and of recall's classifier spend, so a session can read negative early on, while a rewrite and a classifier call have been charged and no saving has accumulated. They show four decimals, and a negative too small to show renders `-0.0000` rather than losing its sign.

The dollars are a counterfactual: they price the text a stub kept off the request at the cache rate that request's own response reported. A provider outside the catalog's rates, a cost tier the smaller request avoided, or a cache read that covered only part of the prefix all bias them, in directions that are known and sizes that are not.

`taiknr.recall` carries `recalled` for the last request, `deciding` for whether a classifier call is running (`deciding 12`, or `idle`), and `decidingItems` for the latest call's count on its own: 0 before any call, and it keeps that call's count after it ends, while `deciding` reads `idle`. A value that does not change repaints nothing, so the indicator flashes rather than ticks: one call moves it for as long as the call runs, up to `classifierTimeoutMs`, and no elapsed time is published.

### Example rows

Copy these into `~/.pi/agent/pi-jefferson.json`. The rows append to whatever is already there, and where they land is your choice.

```json
{
  "rows": [
    [
      { "instrument": "taiknr.context" },
      { "instrument": "taiknr.recall", "align": "right" }
    ],
    [
      { "instrument": "taiknr.archive" },
      { "instrument": "taiknr.savings", "align": "right" }
    ]
  ],
  "instruments": {
    "taiknr.context": {
      "label": "🗜️",
      "format": "$totalContext/$contextWindow $approx $bar",
      "style": { "fg": "accent" }
    },
    "taiknr.archive": {
      "format": "$archiveItems items, $archiveWithheld withheld, $archiveStubbed stubbed $approx"
    },
    "taiknr.savings": {
      "format": "saved $savedTokensSinceStart tok $savedDollarsSinceStart usd $approx"
    },
    "taiknr.recall": {
      "format": "recalled $recalled tok $deciding $approx"
    }
  }
}
```

The `$bar` in `taiknr.context` makes that instrument fill the spare columns of its row, so `taiknr.recall` beside it gets only its own text's width.

- A row entry takes `instrument` and `align` and nothing else. A label or a format inside a row rejects the whole file.
- Format, label and style go in the `instruments` block, keyed by the same full name the row uses.
- A format may name only variables its instrument declares. `taiknr.recall` declares no bar, so `$bar` there blanks it. `formats` is not accepted for any `taiknr.*` row.
- An undeclared variable, an undeclared option or an unusable style refuses that one instrument, which renders blank and warns once; the others are unaffected.
- Omit the `instruments` block entirely to get each instrument's default format and label.

This example ran through Jefferson 0.14.0's own configuration reader against taiknr's registration, registration first and file first, with no warning and all four names resolving.

### Turning publishing off

`"jeffersonInstruments": false` stops publishing and nothing else. Nothing registers and no figure is posted, so a `taiknr.*` row that is already in `pi-jefferson.json` reports `not a known instrument` at each start, which is Jefferson's own warning about a row it has no instrument for. `"enabled": false` still stops everything, publishing included, and a row already on screen stays there by the same rule.

The switch is read once, at session start. There is no `/taiknr` command yet, so turning publishing off today means editing the file and running `/reload`.

A switch turned off in a session that has already posted values cannot clear them: Jefferson clears a field only when the session shuts down. The last figures stay on the row and go stale from then on. Nothing in taiknr reads a posted figure back, so a frozen row is only ever stale to the person reading it.

## Loading it

Nothing is packaged yet: `package.json` has no `version`, `license` or `files`, so `npm pack` fails. Pi loads the extension from a local checkout named under `packages` in `~/.pi/agent/settings.json`. `ARCHITECTURE.md` §6 has that entry and the path rules around it.

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
| `classifierTimeoutMs` | an integer from 1 to 2147483647: how long one classifier call may take, in milliseconds | `5000` |
| `enabled` | `true` or `false` | `true` |
| `jeffersonInstruments` | `true` or `false`: whether taiknr publishes its four `taiknr.*` instruments to pi-jefferson | `true` |

A file states only the fields that differ. Every other case is a config error rather than something to ignore: a key outside the table, a value of the wrong type, a number out of range, a root that is not a JSON object.

The default threshold leaves room for the stub, whose framing costs a few hundred characters. Set `minCharsToArchive` well below about 400 and a stub can be longer than the text it replaced, which grows the context it was meant to shrink.

`classifierTimeoutMs` bounds one classifier call. `5000` is about fourteen times the slowest of the ten calls measured, and that margin is there because the archive grows with the branch: too low a value turns a large archive into a recall outage that looks like recall not working, and a huge one makes a classifier that is down add that wait to every new user message, silently after the first warning. The range stops at 2147483647 because Node warns above it and fires the timer after 1 ms, which would make every call fail.

`jeffersonInstruments` turns taiknr's instruments off and nothing else: staging, settlement, hydration and recall carry on, and only the published rows go away. `enabled` still stops every one of those. The [Instruments](#instruments) section says what each figure means and what a switch does to a value already on screen.

### Which value wins

Each field resolves on its own: the built-in default, then the agent file's value, then the project file's value. The nearest file that sets a field wins, and the files behind it still supply what it leaves out. A trusted project file holding `{"enabled": false}` turns taiknr off for that project and keeps the agent file's other values.

### When the files are read

At every session start: a new `pi` process, `/new`, `/resume`, `/fork` or `/reload`. An edit made mid-session takes effect at the next start and not before. Nothing watches the files.

### Turning it off

`"enabled": false` makes taiknr do nothing for that session: no staging, no settlement, no hydration, no recall, no classifier calls, and no instruments. Anything stubbed before you turned it off stays stubbed until it is back on. A valid off is silent, because a switch you set yourself needs no announcement.

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
