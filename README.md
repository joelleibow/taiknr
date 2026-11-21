# taiknr

`taiknr` is a Pi coding-agent extension: it keeps large tool outputs out of the active prompt by replacing them with deterministic one-line stubs, and recalls a raw output at the tail of the user's message when a turn needs it back. Stubbing, recall, the opt-in conversation summary and the four instruments work end to end. The status readout and the `/taiknr` commands are still being built.

The config file is `pi-taiknr.json`, and the npm package is `pi-taiknr`.

## What runs today

- Both config files are read and validated at every session start, and one config is resolved for the session.
- `enabled` turns taiknr off for a whole session, or for one project.
- A broken config file is reported, and taiknr then does nothing for that session.
- A tool result whose text reaches `minCharsToArchive` is replaced with a one-line stub once the run that produced it settles.
- Every stubbed output is recorded in the session file, so a resumed session, a `/tree` jump and a `/compact` all keep what was archived before them.
- A new user message is scored against the archive once, and the outputs the classifier picks come back in full at the end of that message for that turn's requests only. That turn's later tool-loop steps reuse the answer instead of asking again.
- The question goes out in as many calls as it takes: candidates are packed into requests of at most 30 KB each, up to eight calls run at once, and one `classifierTimeoutMs` deadline covers them all.
- Opted in, a small model writes a summary of the conversation after each response, and the next message's scoring carries it.
- Recall leaves out an output another extension has edited or that the active branch no longer carries, and it writes nothing to the session file.
- Four instruments are published to pi-jefferson 0.14.0 or later from the session start, and `jeffersonInstruments` turns them off without touching anything else.

Not built yet: the status readout and the `/taiknr on` and `/taiknr off` commands. The [instruments](#instruments) cover part of what those were meant to show: `taiknr.recall` carries the last request's block and whether a classifier scoring is running, and the net dollars include recall's classifier spend and, when it is on, the summary's.

## Stubbing

A run that settles replaces each of its own tool results at or above the threshold with one line:

```text
[archived 9f3c1a2b] bash({"command":"npm test"}) status=ok (4204 chars, 118 lines) preview: RUN v5.1.0 | Test Files 16 passed (16) | Tests 220 passed (220)
```

The stub names the output and previews it: the tool, its arguments cut to 120 characters, its status, the size of the raw text, and its first three lines cut to 180 characters. A long argument list keeps its start and its end, so a path's file name still shows: the first 40 characters, an ellipsis, then the last 79. That line is all the model sees in place of the output from then on.

A turn that fails or is interrupted stages its outputs too. They wait for the next run that settles, which stubs them then. What waits lives in the running extension only, so `/reload`, a new session or a session replacement loses anything still waiting, and the output stays raw.

### What a stub does not do

A stub hides an output from the model and nothing else. It is not redaction and it is not deletion: the raw text stays in the session's JSONL file, in the terminal UI and in exports, and a second copy of it goes into a `taiknr-side-store` entry that the model never sees. Navigating to a branch from before the stub puts the raw output back in front of the model, so the original is never lost and never hidden from you.

### What stubbing costs

Every stubbed output sits on disk twice, once as the tool result and once in its side-store record, so a session file roughly doubles the bytes of what it archived. The archive also grows with the branch and has no ceiling yet: a long session that archives output on many runs keeps every item.

## Recall

When a new user message arrives, taiknr asks the configured classifier which archived outputs bear on it. Items are packed in archive order into requests of at most 30 KB each, at most eight calls are in flight, and one deadline covers the whole scoring. The outputs the classifier picks go back in full at the end of the newest user message, inside a `<recalled_context>` block that marks them as reference data rather than instructions. That block exists for that turn's requests only: the session file is untouched, and the stub stays where it was.

What the block costs depends on the route. On Anthropic direct — an API key or OAuth — and on an Anthropic model through OpenRouter on its `anthropic-messages` api, taiknr also places cache points in the request: one on the block just before recall's block, and, on the first request after a turn that recalled, one on the last block of the message that carried recall's block. Nothing the model reads changes; only cache markers move. So the next turn reads the recalling turn's prefix from cache instead of writing it again. The block's own price follows where it lands: billed as input on a request that has to give up pi's own cache point for it, written on the next request, read after that.

On every other route taiknr sends the request as it built it, and the cost is unchanged: the next user message's request writes the recalling turn to its cache again from its user message onward, once, at the write rate. Bedrock, the other Anthropic-format gateways, OpenRouter's `openai-completions` path and a proxy host are that case. `docs/adr/0009-place-cache-points-around-the-recall-block.md` records the decision and the measurements.

Outputs are recalled whole and in order of relevance, until the next one would take the request past pi's compaction threshold. Recall never cuts an output in half, never skips a large one for a smaller one behind it, and never removes anything from the archive.

An output is a candidate only while its tool result is still on the active branch and the newest edit to it is taiknr's own stub. So a redaction another extension persisted keeps that output out, and an output left behind on a branch you navigated away from never comes back.

### What the default does, measured

The defaults were measured on 151 labelled requests from real sessions, holding 18,535 archived outputs. An item counts as related when it actually bore on the message, as the labelling judged it; precision is the share of what came back that was related. A top-level message is the user message a turn starts from, which is where recall's block matters most.

| | Recalled per request | Irrelevant | Related | Precision | Per top-level message | Top-level precision |
|---|---:|---:|---:|---:|---:|---:|
| Before this version | 9.20 | 3.00 | 6.20 | 0.67 | 3.18 | 0.55 |
| The new default | 9.36 | 2.39 | 6.97 | 0.74 | 1.91 | 0.86 |

So a request carries about as many items as before, but more of them are related and fewer are junk, and a user's own message pulls far fewer items at a much higher precision. The share of related items recall actually brings back rose from 0.15 to 0.17. That share counts 14 requests too long to split as recalling nothing, and it is low because most archived outputs are never needed at all.

The default `decisionThreshold` is 0.55. Raising it or lowering it moves how much comes back:

| Threshold | Recalled per request | Irrelevant | Related | Precision | Per top-level message | Top-level precision |
|---|---:|---:|---:|---:|---:|---:|
| 0.50 | 12.60 | 3.33 | 9.27 | 0.74 | 2.51 | 0.86 |
| 0.55 (default) | 9.36 | 2.39 | 6.97 | 0.74 | 1.91 | 0.86 |
| 0.60 | 8.65 | 2.28 | 6.37 | 0.74 | 1.47 | 0.82 |

Lowering the threshold to 0.50 buys about three more related items per request, and a third more junk along with them. Raising it to 0.60 removes almost no junk and loses useful items, which is why 0.55 is the default: it is the point where junk falls and useful items hold.

These figures belong to this exact set of settings — the scoring text, the stub, the request's budget, the excerpt, the summary and the pinned model. Change one of them and the numbers describe a request nobody sent, so they are measured again rather than reused. `docs/adr/0011-the-recall-set-is-one-calibration.md` records that, and what a change has to re-run.

### What recall sends, and where

Three destinations, and they are not the same:

- **The classifier provider** (`defaultDecisionModelProvider`, `openrouter` by default) gets the new message's text, and, for each candidate, that output's stub and the first 600 characters of the output itself. When you have enabled the summary, it gets the summary too. It never gets more of an output than those 600 characters, and never an image.
- **The summarizer provider** (`conversationSummaryProvider`), only when you have enabled the summary, gets the conversation text: your messages and the assistant's, plus one line for each tool call naming the tool and its arguments. It does not get tool results. See [Conversation summary](#conversation-summary).
- **The main model's provider** gets the full raw text of every output recall picks, inside the request that carries the block.

A stub does not keep an output off the network. It keeps the output out of the conversation; recall puts the body back in front of a provider on the one request that needs it.

The excerpt is not optional. It was measured as part of the set that ships, so an upgrade sends the first 600 characters of each archived output to the classifier provider from the first scored message onward. Turning recall off is the only way to stop that. `docs/adr/0010-widen-the-disclosure-split-for-excerpts-and-the-summary.md` records the decision.

### What recall costs, and where you can see it

A call carrying stubs alone costs about $0.0002 at today's archive size, which is around thirty archived outputs, and less when the archive is smaller (about $0.00004 at five). A call now also carries each item's excerpt, which measured about 1.8 to 1.9 times the bytes of the stub-only payload, and it carries the summary when you turn that on; expect a call's price to be higher than that figure. The cost grows with the archive, because each call carries one stub and one excerpt per candidate.

A new user message is one scoring, however many calls it takes. A large archive on a long message can take dozens of calls, so the spend per message is not the price of one call.

pi's footer and `/session` do not show that spend. pi totals the usage it records against a message or a tool result, and a classifier call an extension makes records nothing there, so the cost is real and invisible to pi.

taiknr's own figures do show it. `savedDollarsRequest` and `savedDollarsSinceStart` subtract every classifier call taiknr made since the last priced request, and every summarizer call too when the summary is on, so the net dollars a session reports include those costs. The [instruments](#instruments) section has the details.

### A message too long to split

The 30 KB budget is taiknr's own choice about accuracy, not a limit the classifier imposes. When a message is long enough that even one archived output cannot sit beside it under the budget — a subagent brief of around 30 KB, for instance — the scoring goes out as a single request carrying every candidate, in the same shape, under the same deadline. Nothing is skipped and nothing is trimmed. Fourteen of the 151 measured requests took that path. It is the one case where a single request can be very large; the largest measured 607 KB, and every one of the fourteen was answered. What such a request recalls was never scored, so no figure here describes it.

### How far recall may grow, and one consequence

Recall keeps the request it builds under pi's compaction threshold, measured with pi's own estimate. That is a bound on one request, not on pi's next check: pi's check counts the provider usage of the request it last sent, the recall block included, plus whatever the step after it added. So a recall that fills most of its room can make pi compact a session at that check, where it would not have compacted otherwise. After such a compaction the block may no longer fit, and the rest of that turn runs without it, silently; the next user message is scored again.

No taiknr setting removes this while recall is on. Raising `decisionThreshold` can only shrink the block. Raising `reserveTokens` lowers pi's threshold and recall's budget by the same amount, so it moves the case rather than avoiding it, and pi's own compactions start earlier. Turning pi's global compaction off (its own `compaction.enabled` setting) does remove the case, and it also turns off pi's overflow recovery, so taiknr does not recommend it. `docs/adr/0007-recall-on-the-whole-request-inside-its-own-bound.md` has the measurements.

### When the classifier cannot answer

Recall fails open: the request goes out without a block, and stubbing carries on. A missing model, an error answer or a scoring that runs past `classifierTimeoutMs` shows one warning in the session, naming the provider, the model and the field to fix, and later failures in that session are silent. A classifier that hangs adds up to the timeout to each new user message after that. Cancelling the run reports nothing. Print and JSON modes keep working and print nothing, because the warning has no surface there.

Splitting a request into calls multiplies that exposure, because every call is attempted once and none is retried. At a one-percent failure rate per call, a request that needs 75 calls fails about half the time, and a request that needs one call almost never does. No call failed across the 10,062 attempts measured, so the risk is arithmetic rather than observed. `minCharsToArchive` is the setting that changes how many candidates a request asks about, and so how many calls it needs: raise it and fewer outputs are archived, at the cost of keeping more of them whole in context. `decisionThreshold` does not change the call count, because the threshold is applied to the answers after every call has returned.

## Conversation summary

Off by default. A summary can make recall choose better, and it costs money on every response and sends your conversation to a second provider. Turning it on is a choice about both.

What it changes, at the shipped defaults, measured with a summary written after each response:

| | Recalled per request | Irrelevant | Related | Precision | Per top-level message | Top-level precision |
|---|---:|---:|---:|---:|---:|---:|
| No summary (default) | 9.36 | 2.39 | 6.97 | 0.74 | 1.91 | 0.86 |
| Summary on | 9.61 | 1.94 | 7.67 | 0.80 | 3.19 | 0.94 |
| Summary on, thinking off | 8.17 | 2.70 | 5.48 | 0.67 | 1.33 | 0.79 |

Read those rows as single measurements, not as tight bounds. How well the summary ranks top-level results is the steadiest gain: on two runs, a related top-level item outranked an unrelated one about 0.85 and 0.88 of the time, against about 0.70 without a summary. The extra top-level volume rests on one labelled item in the measured set; without it, the summary brings back fewer top-level related items than no summary does at 0.50 and at 0.55, and its precision on all requests stays within 0.02 of no summary's.

Two things to know before you turn it on:

- **It costs $0.0017 a response and about three seconds of a background call**, at the default thinking level, and you pay that on every settled run whether or not the next message uses the summary.
- **You never wait for it.** It is written after the response has reached you, so a slow summarizer delays nothing. A summary is used only by a request whose newest assistant message is the one it was written for; a resumed session, a `/tree` jump or a summary that is late all fall back to scoring without one.

To turn it on, set the flag and the pair. The example names the provider and model the measurements were made with:

```json
{
  "conversationSummaryEnabled": true,
  "conversationSummaryProvider": "openrouter",
  "conversationSummaryModel": "deepseek/deepseek-v4.1-flash-1017",
  "conversationSummaryThinkingLevel": "high"
}
```

The provider must be one pi can already call: log in to it, or put its key in the environment, before turning this on. taiknr uses pi's credentials and stores none of its own.

`conversationSummaryThinkingLevel` takes `off`, `minimal`, `low`, `medium`, `high`, `xhigh` or `max`, and defaults to `high`. Two caveats:

- `off` was measured as worse than no summary at all, so turning thinking off is not a cheap version of the feature; it is a way to spend the same money for a worse recall.
- A level your model does not offer runs at whatever level pi picks for that model, which can be higher than the one you set. On the example pair, `medium` runs as `high`, because that model offers no medium level.

If the summarizer cannot be used — the model does not resolve, the provider has no credentials, or the call returns an error — taiknr shows one warning for the session, naming the settings to fix. That warning is separate from recall's, so a later classifier failure still warns. A summary in the wrong format is dropped without a warning.

## Instruments

taiknr publishes four instruments to pi-jefferson 0.14.0 or later: `taiknr.context`, `taiknr.archive`, `taiknr.savings` and `taiknr.recall`. Publishing is on by default. `jeffersonInstruments` turns the rows off and leaves stubbing, settlement, hydration and recall exactly as they are.

Jefferson draws the rows. taiknr posts numbers and booleans and renders nothing itself, so where the rows sit, what they say, their label and their colour are ordinary Jefferson configuration in `~/.pi/agent/pi-jefferson.json`. An example set is below. With Jefferson absent the posts reach no listener: no row appears, nothing throws, and nothing else changes.

### What stubbing does to pi's own context figure

After a settlement replaces a tool output, the branch carries a `context_edit` newer than the last reply. At that moment pi stops trusting the provider's usage: it sums characters ÷ 4 over the whole projection instead, and keeps doing that until the next reply lands. So anyone watching pi's context figure sees it fall after a settled run and jump back when the next reply lands: two moves over a change that made the prompt smaller.

That estimate is low, and how low depends on the model. On Anthropic models it lands 38–41% below the next request's real prompt, measured at 33 consecutive settlements in one session; on the one deepseek session measured it is a few percent. It is pi's own rule and not a setting, so nothing in taiknr changes it.

Three consequences matter beyond the size of the gap:

- pi's pre-run compaction check runs on the same estimate, so after a settled run and until a reply arrives, pi checks against a number that is low by that much.
- Right after a compaction pi's figure is `null`, while taiknr's is still a number.
- A recall block counts in a request's usage and never in the persisted history, so the two measurements part company on a recalling turn.

`taiknr.context` is the reading for these. Its default format shows `contextInTurn`, the request the provider bills with recall's block: k × taiknr's estimate while the request is in flight, and the provider's own prompt count once its reply lands, on OpenRouter models as on Anthropic. Its bar reads that figure's share of the model's window. `$totalContext`, the persisted history, is the figure that never swaps estimators mid-stream: it moves by what was added and stubbed, not by 40% at once, and it is never `null`. A format naming `$bar` draws the bar, and a session whose host reports no window gets an empty track rather than a wrong fill.

### What each figure means

The figures overlap, so they are never added together. `recalled` is part of `contextInTurn`, and `historyBefore` differs from `contextInTurn` by exactly the request's saving.

- `contextInTurn`: the request as sent, recall block included.
- `historyBefore`: the same request with every stub replaced by the raw text it stands for, and the block removed.
- `withheld`: the raw text those stubs replaced.
- `stubbed`: the stub text standing in its place.
- `recalled`: recall's block in this request.
- `totalContext`: the persisted history after taiknr's edits, and never the recall block, which lives in one request and in no history.

Three more describe the archive rather than one request: `archiveItems`, `archiveWithheld` and `archiveStubbed` count the whole store, which keeps items from before a compaction, so `archiveWithheld` is larger than a request's `withheld` once the branch has been compacted.

Every token figure is a character estimate times one ratio, `k`: the prompt tokens of the newest valid reply for a provider and model, divided by the estimate of the request that produced it. One ratio is kept per provider and model and seeded from the session's branch at start. A model with no ratio of its own borrows the ratio of the model measured most recently until its own first reply is measured, so a model switch starts uncalibrated but not at the raw estimate; `k` is 1 only while no model has been measured on the branch or in this run.

The `~` beside a figure means the provider and model it was posted under have no live sample yet, and the figure is uncalibrated: `k` is a seed read from the branch, another model's ratio borrowed until this one replies, or 1 while nothing has been measured. The flag never means exact, and there is no second flag. Once a reply from that model has been measured, the flag turns off and the figures are calibrated estimates rather than raw ones.

Every token figure but one stays an estimate. `contextInTurn` becomes measured once its own reply lands, and the measured value is published only as `contextInTurn`: the saving is always computed from estimates, because subtracting a measured request from an estimated history would mix two different measurements.

The four savings figures count from the moment the session started. `/new`, `/resume`, `/fork` and `/reload` each begin again at zero, and nothing is persisted, which is why the default format says *tokens not sent since start*: a stub carried by ten requests counts ten times, so the total can pass the size of the context it is in. All four are signed. The dollars are net of the cache rewrite taiknr caused, of recall's classifier spend and, when the summary is on, of the summarizer's spend. They show four decimals, and a negative too small to show renders `-0.0000` rather than losing its sign.

Nothing is clamped and nothing is credited to recall, so a session reads negative whenever recall really costs more than stubbing saves. The terms that make it negative are recall's block billed as input or written at the write rate, the recalling turn's rewrite, the classifier calls and, with the summary on, the summarizer's calls, all set against saved text priced at the read rate. A negative reading is the figure working rather than a fault, and no session is promised a non-negative one. `decisionThreshold` is the lever: raising it recalls fewer outputs, which shrinks the block.

The dollars are a counterfactual: they price the text a stub kept off the request at the cache rate that request's own response reported. A provider outside the catalog's rates, a cost tier the smaller request avoided, or a cache read that covered only part of the prefix all bias them, in directions that are known and sizes that are not.

The rewrite charge also runs low, and nothing here corrects it. On a route the [Recall](#recall) section does not cover, the charge is the one that understated the rewrite before this fix: Bedrock, the other Anthropic-format gateways, OpenRouter's `openai-completions` path, a proxy host, and a virtual model, because the edit follows the model the request names and not the one a router picks behind it. It runs low as well on a request taiknr failed to edit, on a request taiknr itself makes read zero (a prefix below the model's cache minimum, as pi's 2,020-token system and tools leave Haiku 4.5's 4,096 over an API key), on a request that read only part of its prefix from cache, and on the in-turn requests of a turn where another extension's block-level cache marker leaves taiknr room for one point (a top-level marker is automatic caching and leaves the tail cached): the block then goes out uncached, and every step re-sends the turn's tool-result tail as input while the figure charges only the block.

`taiknr.recall` carries `recalled` for the last request, `deciding` for whether a classifier scoring is running (`deciding 12`, or `idle`), and `decidingItems` for the latest scoring's count on its own: 0 before any scoring, and it keeps that scoring's count after it ends, while `deciding` reads `idle`. A value that does not change repaints nothing, so the indicator flashes rather than ticks: one scoring moves it for as long as the scoring runs, up to `classifierTimeoutMs`, and no elapsed time is published. A summary never moves it.

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
      "format": "$contextInTurn/$contextWindow $approx $bar",
      "style": { "fg": "accent" }
    },
    "taiknr.archive": {
      "format": "$archiveItems items, $archiveWithheld withheld, $archiveStubbed stubbed $approx"
    },
    "taiknr.savings": {
      "format": "$savedTokensSinceStart tok $savedDollarsSinceStart usd since start $approx"
    },
    "taiknr.recall": {
      "format": "$recalled tok $deciding $approx"
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
| `decisionThreshold` | a number from 0 to 1: an output comes back when the classifier's answer for it is at or above this | `0.55` |
| `minCharsToArchive` | an integer of 0 or more: the minimum length at which an output is stubbed, with `0` stubbing every result that carries any text | `600` |
| `defaultDecisionModel` | a non-empty string, the classifier model | `typesafe/jev-1.14` |
| `defaultDecisionModelProvider` | a non-empty string, the provider serving that model | `openrouter` |
| `classifierTimeoutMs` | an integer from 1 to 2147483647: how long one scoring may take, in milliseconds, across every call it makes | `5000` |
| `enabled` | `true` or `false` | `true` |
| `jeffersonInstruments` | `true` or `false`: whether taiknr publishes its four `taiknr.*` instruments to pi-jefferson | `true` |
| `conversationSummaryEnabled` | `true` or `false`: whether a summary is written after each response and carried in the scoring | `false` |
| `conversationSummaryProvider` | a non-empty string, the provider that serves the summarizer model; required once the summary is on | none |
| `conversationSummaryModel` | a non-empty string, the summarizer model; required once the summary is on | none |
| `conversationSummaryThinkingLevel` | one of `off`, `minimal`, `low`, `medium`, `high`, `xhigh`, `max` | `high` |

A file states only the fields that differ. Every other case is a config error rather than something to ignore: a key outside the table, a value of the wrong type, a number out of range, a root that is not a JSON object.

One rule spans fields: turning the summary on without both a provider and a model rejects the config. The check runs on the config as resolved, after the two files are layered, so one file may enable the summary while another supplies the pair. The report names the missing key and the file that turned the summary on, and taiknr then does nothing for that session.

`decisionThreshold` is yours to set. The [measured table](#what-the-default-does-measured) shows what 0.50, 0.55 and 0.60 do, so a change is an informed one; 0.55 is the default because it is where junk falls and useful items hold.

`minCharsToArchive` also decides how many candidates a request asks about, and so how many calls a scoring needs: raise it and fewer outputs are archived, at the cost of keeping more of them whole in context.

Set `minCharsToArchive` well below about 400 and a stub can be longer than the text it replaced, which grows the context it was meant to shrink. The stub's framing costs a few hundred characters.

`classifierTimeoutMs` bounds one scoring, across every call it makes: each call gets the time remaining, and a scoring whose calls have not all answered by then goes out without recall. `5000` is about fourteen times the slowest of the ten single calls measured before requests were split, and the slowest split request measured took 4,037 ms across 62 calls. That margin is there because the archive grows with the branch: too low a value turns a large archive into a recall outage that looks like recall not working, and a huge one makes a classifier that is down add that wait to every new user message, silently after the first warning. The range stops at 2147483647 because Node warns above it and fires the timer after 1 ms, which would make every call fail.

`jeffersonInstruments` turns taiknr's instruments off and nothing else: staging, settlement, hydration and recall carry on, and only the published rows go away. `enabled` still stops every one of those. The [Instruments](#instruments) section says what each figure means and what a switch does to a value already on screen.

The four `conversationSummary*` fields are covered under [Conversation summary](#conversation-summary), including what the summary costs and what it sends.

### Which value wins

Each field resolves on its own: the built-in default, then the agent file's value, then the project file's value. The nearest file that sets a field wins, and the files behind it still supply what it leaves out. A trusted project file holding `{"enabled": false}` turns taiknr off for that project and keeps the agent file's other values.

### When the files are read

At every session start: a new `pi` process, `/new`, `/resume`, `/fork` or `/reload`. An edit made mid-session takes effect at the next start and not before. Nothing watches the files.

### Upgrading, and rolling back

An upgrade changes three things no setting asks for: the default classifier model becomes `typesafe/jev-1.14`, the default threshold becomes `0.55`, and the classifier starts receiving the first 600 characters of each archived output. A `decisionThreshold` or `defaultDecisionModel` you set yourself keeps applying.

A summary lives for the session only, so a resumed session's first message is scored without one.

To roll back, remove the four `conversationSummary*` fields from both config files **before** installing the older version. The older loader rejects a key it does not know, and a rejected load turns taiknr off for the session. Nothing else needs undoing: stubs settled before the upgrade keep the argument summaries they were settled with, because a settled stub is never rewritten.

### Turning it off

`"enabled": false` makes taiknr do nothing for that session: no staging, no settlement, no hydration, no recall, no classifier calls, no summary and no instruments. Anything stubbed before you turned it off stays stubbed until it is back on. A valid off is silent, because a switch you set yourself needs no announcement.

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
