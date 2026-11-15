# Spec Delta

## Purpose

Defines which tool outputs taiknr replaces with a one-line stub, what the stub says, how a staged output is settled into the session and its branch record, and what the archive does while taiknr is off.

## ADDED Requirements

### Requirement: A persisted tool result above the threshold is staged at its turn boundary

At the turn boundary where Pi has persisted a tool result, taiknr SHALL stage it as an archive candidate when the text it carries is at least the session's `minCharsToArchive`. The candidate's id SHALL be that persisted entry's id, treated as an opaque non-empty string. The turn's outcome SHALL NOT decide staging: a completed, aborted and failed turn alike stage what they persisted (Joel's "Orientation Q1" → (a); S1; D9; `Chidi` §1).

#### Scenario: A result above the threshold is staged

- **WHEN** a session whose `minCharsToArchive` is 600 persists a tool result carrying 600 characters of text
- **THEN** one candidate is staged, with that entry's id as its id, the tool's name and error state, and the result's whole text as its raw text

#### Scenario: A result below the threshold is not staged

- **WHEN** the same session persists a tool result carrying 599 characters of text
- **THEN** nothing is staged

#### Scenario: The session's own threshold applies

- **WHEN** the session's resolved config sets `minCharsToArchive` to 0
- **THEN** a persisted result carrying any text is staged, because the threshold the session applies is the resolved one (`configuration` spec)

#### Scenario: An aborted turn still stages

- **WHEN** a turn ends with outcome `aborted` after its tool results were persisted
- **THEN** every one of those results meeting the threshold is staged (Joel's "Orientation Q1" → (a))

#### Scenario: An id that is not eight characters

- **WHEN** the persisted entry's id is a 36-character UUID rather than eight hexadecimal characters
- **THEN** the candidate's id is that whole id, and nothing slices it or matches it against a length or hex pattern (S1; Trap 6)

### Requirement: A tool result carrying no text is never staged

taiknr SHALL stage nothing for a tool result whose content holds no text block, or text that is empty, whatever the configured threshold is, so an image-only or empty result never receives an empty stub (Trap 7; `configuration` spec's `minCharsToArchive: 0`). Several text blocks SHALL join with one newline, and a result whose text blocks are all empty SHALL carry no text rather than one newline; text that is only whitespace counts as text (M8).

#### Scenario: Image-only output at a zero threshold

- **WHEN** `minCharsToArchive` is 0 and a tool result's content holds only an image block
- **THEN** nothing is staged for it

#### Scenario: Empty text at a zero threshold

- **WHEN** `minCharsToArchive` is 0 and a tool result's content holds one text block whose text is empty
- **THEN** nothing is staged for it

#### Scenario: Several text blocks join into one raw text

- **WHEN** a tool result's content holds two text blocks, one reading `a` and one reading `b`
- **THEN** its raw text is `a` and `b` joined by one newline, and that joined text is what its character count measures (M8)

#### Scenario: Two empty text blocks at a zero threshold

- **WHEN** `minCharsToArchive` is 0 and a tool result's content holds two text blocks whose text is empty
- **THEN** nothing is staged for it, and its raw text is empty rather than a lone newline (C-4; M8)

#### Scenario: Whitespace on its own counts as text

- **WHEN** a tool result's text is only whitespace and its length meets the threshold
- **THEN** it is staged, because text is measured by length and never trimmed (M8)

### Requirement: The stub is one line naming the output and previewing it

`buildStub(candidate)` SHALL render `[archived <id>] <toolName>(<argsSummary>) status=<ok|error> (<n> chars, <m> lines) preview: <preview>`, where `<n>` is the raw text's length in characters, `<m>` its number of lines, `<preview>` at most its first three lines joined by ` | ` and cut to 180 characters, and `<argsSummary>` the tool call's input as JSON cut to 120 characters. The stub SHALL contain no line-break character (S2; `Eleanor` §3; Trap 8; M9).

#### Scenario: A successful output

- **WHEN** an item with id `a1b2c3d4`, tool name `bash`, argument summary `{"command":"npm test"}` and 4200 characters of raw text over 118 lines is stubbed
- **THEN** the stub reads `[archived a1b2c3d4] bash({"command":"npm test"}) status=ok (4200 chars, 118 lines) preview: ` followed by its first three lines joined by ` | `, cut to 180 characters

#### Scenario: A failing output

- **WHEN** the same item's result carries the error state
- **THEN** its stub reads `status=error` in place of `status=ok`

#### Scenario: A long argument list is cut

- **WHEN** the call's input stringifies to longer than 120 characters
- **THEN** the argument summary is its first 120 characters

#### Scenario: A call whose arguments were never recorded

- **WHEN** a tool result's call was never seen at the tool-call boundary
- **THEN** its stub renders an empty argument summary, as the proof of concept did (`Eleanor` §3)

#### Scenario: Line breaks never reach the stub

- **WHEN** the raw text contains `\r\n`, a bare `\r`, a bare newline, U+2028, U+2029 and U+0085, and its first three lines are longer than 180 characters
- **THEN** the stub contains none of those characters, and the preview is cut at 180 characters (Trap 8; M9)

#### Scenario: A cut never splits a surrogate pair

- **WHEN** the 180-character preview cut or the 120-character argument-summary cut would fall between a surrogate pair
- **THEN** the cut lands before the pair, and every stub is well-formed UTF-16 (CR-3; M9)

#### Scenario: One output's stub does not disturb another's

- **WHEN** two items are stubbed in one settlement
- **THEN** each stub carries its own id, tool name, counts and preview

### Requirement: Settlement replaces the tool result's content with its stub and keeps its non-text blocks

At the settled boundary taiknr SHALL propose, for each committed item, a replacement of that tool result's entire content: one text block holding the stub, followed by every non-text block the result originally carried, in their original order. It SHALL NOT alter the raw tool-result entry (S3; Trap 7; `Chidi` §3).

#### Scenario: Text and an image

- **WHEN** a staged result carried one text block and one image block
- **THEN** its replacement content is the stub's text block followed by that image block

#### Scenario: Text only

- **WHEN** a staged result carried only text blocks
- **THEN** its replacement content is exactly one text block holding the stub

#### Scenario: The original output is still there

- **WHEN** a replacement has been persisted and the session then navigates to a branch that precedes it
- **THEN** the model context carries the original tool output again (`Chidi` §3)

### Requirement: The store is an optimistic cache over the branch, and the record is drafted before the replacement

Pi commits a boundary's drafts only after every handler has returned, with no post-commit callback, so taiknr SHALL treat the in-memory archive as an optimistic cache over the branch, replaced whole at the next `session_start`, `session_tree` or `session_compact`. Within one boundary the `taiknr-side-store` draft SHALL come before the `context_edit` drafts, so a partial persist never leaves a stub without the record holding its raw text (M4; C-2; CS-7).

#### Scenario: A boundary Pi discards

- **WHEN** Pi rejects or discards a settlement boundary after taiknr has drained its committed items into the store
- **THEN** the store still holds those items, and the next `session_start`, `session_tree` or `session_compact` makes it match the branch again (M4; CR-1)

#### Scenario: A partial persist of one boundary

- **WHEN** only part of one settlement's drafts is persisted
- **THEN** every stub that reached the branch already has the `taiknr-side-store` record holding its raw text, because that draft was proposed first (M4; R-2)

### Requirement: A staged item waits until a settled run can commit it

An item staged in a run whose settled boundary never ran — a run aborted with `Escape` — SHALL stay pending and SHALL be considered by the next settled run of that session. An item committed once SHALL NOT be committed again (Joel's "Orientation Q1" → (a); Trap 3).

#### Scenario: Abort, then settle

- **WHEN** a run is aborted after staging items and a later run in the same session settles
- **THEN** those items are committed at that later boundary

#### Scenario: Nothing commits twice

- **WHEN** an item was committed at one settlement and a later run settles
- **THEN** no second replacement targets that entry and no later side-store entry repeats it

#### Scenario: A session that ends with items pending

- **WHEN** the session ends before any later run settles
- **THEN** nothing was committed for those items and nothing was reported

### Requirement: Settlement commits only items the active branch still holds

Before committing, taiknr SHALL drop every pending item whose target entry is not on the active branch, and every item whose target already carries a `context_edit` — null or not, from any author — on the active branch or among the entries already proposed at that boundary. Those drops SHALL be silent, and a settled run with nothing left to commit SHALL add no draft to the boundary (Joel's "Orientation Q1" → (a); M5; Trap 3–5).

#### Scenario: A branch switch after an abort

- **WHEN** an item was staged on a branch the user then leaves with `/tree`, and a run on the new branch settles
- **THEN** the item is dropped, no draft targets it, and the settlement succeeds without an error

#### Scenario: A recovery-omitted result

- **WHEN** Pi omitted a failed attempt's tool result with a null replacement on the branch before the session settled
- **THEN** a staged item for that result is dropped, and no unpaired tool result re-enters the model context (Trap 4; M5)

#### Scenario: A result another extension replaced at the boundary

- **WHEN** another extension already proposed a `context_edit` targeting that result at the same boundary, with any replacement at all
- **THEN** the staged item is dropped and that extension's proposal stands (C-1; CR-2; M5)

#### Scenario: A result redacted on the branch earlier

- **WHEN** the active branch already holds a `context_edit` targeting that result, whoever authored it and whatever it replaced
- **THEN** the staged item is dropped, so the earlier replacement is never overwritten by a stub (CS-3; M5)

#### Scenario: A run with nothing to commit

- **WHEN** a settled run has no pending item left
- **THEN** the boundary carries no replacement and no side-store entry from taiknr (Trap 5)

#### Scenario: A draft another extension proposed survives

- **WHEN** another extension proposed a draft at the same boundary
- **THEN** it is still persisted, and taiknr's drafts come after it (Trap 5)

### Requirement: A committed batch is recorded once as a side-store entry

One settlement's committed items SHALL be recorded in one session entry of the custom type `taiknr-side-store`, whose data is that batch, proposed in the same boundary as the replacements and only when the batch is non-empty. That entry SHALL NOT be sent to the model (S3; D9; `Chidi` §4).

#### Scenario: One entry per settlement

- **WHEN** three items commit in one settlement
- **THEN** one `taiknr-side-store` entry carries all three

#### Scenario: The record costs no context

- **WHEN** the next provider request is built after a settlement
- **THEN** the `taiknr-side-store` entry contributes no message to it (`Chidi` §4)

#### Scenario: A settlement with no commits writes no entry

- **WHEN** a settled run commits nothing
- **THEN** no `taiknr-side-store` entry is appended

### Requirement: The archive is inert while taiknr is off

While the session's config is rejected or `enabled` is false, taiknr SHALL stage nothing and settle nothing, and outputs stubbed earlier SHALL stay stubbed until it is on again. Inertness is observed through the composition-root gate the `configuration` spec requires, not through a check in each handler (Joel's standing "Q3, everything stops" and "Q1"; D3–D5; `configuration` spec).

#### Scenario: A project file turns taiknr off for that project

- **WHEN** a trusted project file sets `enabled` false, a session in that project produces tool results above the threshold, and a session elsewhere runs with `enabled` true
- **THEN** nothing is staged, settled or recorded in the first session, and the second is stubbed as usual (D5)

#### Scenario: Stubs made before the switch stay stubbed

- **WHEN** outputs were stubbed in a session and taiknr is then turned off in that same session
- **THEN** those outputs stay stubbed, no further output is stubbed, and nothing is recalled until it is on again (D5)

#### Scenario: A rejected config file leaves the archive idle

- **WHEN** the session's config file is rejected at session start
- **THEN** no tool output is staged or settled for that session
