# Spec Delta

## Purpose

Defines how taiknr registers and keeps four instruments current on pi-jefferson's published provider contract, which values they carry, and what taiknr does when Jefferson is absent, when publishing fails, and when taiknr is off.

## ADDED Requirements

### Requirement: Instruments are registered on Jefferson's published contract at session start

taiknr SHALL register its instruments with pi-jefferson 0.14.0 or later through the `jefferson:registration` and `jefferson:update` channels alone, from its `session_start` publishing registrar and before that registrar's first `await`, and SHALL change nothing in Jefferson, its repository or its built-in instruments (J1; J4; T11; `research-chidi` A1; ruling 6; ruling 9).

#### Scenario: The registration is emitted before the first await

- **WHEN** a session starts with taiknr's config ready, `enabled` true and the instruments switch on
- **THEN** the registration has been emitted before the handler's first `await`, because the bus keeps no history and a host may emit `resources_discover` immediately after `session_start` (T11; `research-chidi` A1)

#### Scenario: Four instruments by their full names

- **WHEN** the registration is read
- **THEN** it names exactly `taiknr.context`, `taiknr.archive`, `taiknr.savings` and `taiknr.recall`, each with its variables, its default format and its label, and declares only the fields they read (J14; `research-chidi` A1)

#### Scenario: Jefferson is not installed

- **WHEN** Jefferson is absent from the session's loaded packages
- **THEN** the emits reach no listener and nothing throws, because the channel is a plain Node emitter with no reply channel, so taiknr behaves as it does today, and the cost of computing figures with no listener is accepted with no guard, because the bus cannot say whether anyone is listening (`research-chidi` A3; ruling 18)

#### Scenario: Every new session is a fresh Jefferson

- **WHEN** pi starts a new session, by `/new`, `/resume`, `/fork`, import or `/reload`
- **THEN** pi tears the runtime down first and rebuilds it, unsubscribing the old instance's bus listeners, so this registration is always the first in a fresh Jefferson and the in-memory figures are fresh per factory — no guard and no `session_shutdown` handler (ruling 12)

#### Scenario: Jefferson's own code is untouched

- **WHEN** the change is complete
- **THEN** Jefferson's repository, its built-in `context` instrument and its published bundle are unchanged (J4)

#### Scenario: Placement stays the user's configuration

- **WHEN** a user's `pi-jefferson.json` names `taiknr.*` rows, or the user wants a different format, label or style
- **THEN** that is ordinary Jefferson configuration, and this change writes no host file (J7; Q5(a))

### Requirement: Every declared field carries a value from the moment it is declared

Immediately after registering, taiknr SHALL post every field the registration declares, and SHALL keep each current as its event arrives. No declared field SHALL be left unposted, because a field with no value blanks every instrument whose format reads it, and no posted value can clear a field (T9; `research-chidi` A1; J11).

#### Scenario: Fields are posted at registration

- **WHEN** the registration has been emitted
- **THEN** every declared field carries a value before any instrument could render it (T9)

#### Scenario: A field is never undefined or null

- **WHEN** an instrument's format reads a field taiknr declared
- **THEN** that field holds a value of its declared type, never absent and never null, because a report cannot carry either (`research-chidi` A1)

#### Scenario: A field with nothing to report yet

- **WHEN** taiknr has nothing to report yet, as before a session's first request
- **THEN** the field still holds a number with its estimate flag beside it (J11; `context-figures` spec)

#### Scenario: The archive instrument reads the store

- **WHEN** the archive instrument reports the archive's items and their sizes
- **THEN** its values come from the store, which is an optimistic cache over the branch, and not from pi's session (S6; T15; `branch-hydration` spec)

#### Scenario: A compaction or a tree jump starts a history with no request

- **WHEN** a compaction or a `/tree` jump re-hydrates the store
- **THEN** total context and the archive are re-posted after that re-hydration, and the request figures are posted as before a history's first request (`context-figures` spec), so the bar never draws a request from a history that is gone (S6; T15; ruling 9)

#### Scenario: A repeated value costs nothing

- **WHEN** a report carries the value already held
- **THEN** nothing repaints, because only a changed value repaints (`research-chidi` A1)

#### Scenario: Shutdown clears the fields

- **WHEN** the session shuts down
- **THEN** Jefferson clears every field and closes its faults, and no field has a value until the next `session_start` posts it again (`research-chidi` A1)

### Requirement: The decision indicator publishes in flight and the item count

The indicator SHALL publish whether a classifier decision is running and how many archived items it is asking about, and SHALL NOT publish elapsed time. It SHALL read *not running* on every way out of the call — answer, error, timeout and cancel (J13; T9; `tail-recall` spec).

#### Scenario: A call starts

- **WHEN** recall's classifier call starts
- **THEN** the indicator reads running, with the number of ids that call is asking about (J13)

#### Scenario: A call ends any way

- **WHEN** the call ends by an answer, an error, its timeout or a cancel
- **THEN** the indicator reads not running (T9)

#### Scenario: No call yet

- **WHEN** no classifier call has been made in the session
- **THEN** the indicator reads not running and its count is 0 (J11)

#### Scenario: It only flashes

- **WHEN** a user watches the indicator
- **THEN** one call changes it for as long as the call runs, up to `classifierTimeoutMs`, and the measured timings are a sample rather than a bound (T23; ruling 8)

#### Scenario: A mid-session off freezes it

- **WHEN** taiknr is turned off mid-session while a value is posted
- **THEN** that value stays on screen, because only `session_shutdown` clears a field, and nothing in this change relies on a value never going stale (`research-chidi` A1; `configuration` spec)

### Requirement: The context instrument offers a bar that resolves the jump

`taiknr.context` SHALL offer a bar whose value is context in turn — the request the provider bills, recall's block included — divided by the model's context window times 100, and `null` for a window ≤ 0, so a user's format can name it and read a percentage pi's own figure cannot give. The window is an input field and not one of the six figures, so the never-a-placeholder rule does not apply to it: when `ctx.getContextUsage()` is undefined it posts 0 (J5; S2; T1; ruling 22).

#### Scenario: A user's format names the bar

- **WHEN** a user's format for the context instrument names the bar
- **THEN** the bar fills to that percentage on Jefferson's 0–100 scale, as Jefferson's own `context` instrument's bar does (`research-chidi` A2; S2)

#### Scenario: The percentage

- **WHEN** context in turn and the window are both known
- **THEN** the bar's value is context in turn divided by the window times 100, with the window taken from the same host call recall reads it from (S2)

#### Scenario: The bar reads a provider's whole prompt

- **WHEN** a response arrives from an OpenRouter model, through pi's `openai-completions` API
- **THEN** context in turn is `input + cacheRead + cacheWrite`, which pi's parser makes that provider's prompt tokens as Anthropic's usage does, so the bar reads the billed request for either (owner-rulings.md 2026-11-17; `context-figures` spec)

#### Scenario: No window

- **WHEN** the host reports no context window
- **THEN** the window field posts 0 and the bar returns `null` for a window ≤ 0, which draws an unfilled track rather than a wrong fill (S2; `research-chidi` A2; ruling 22)

#### Scenario: A format that does not name the bar

- **WHEN** the format does not name the bar
- **THEN** the bar is not called, and whether the default format names it is the design's (§O4)

#### Scenario: The bar is never non-finite

- **WHEN** the bar's function would produce a non-finite number
- **THEN** that is a fault Jefferson records once, and the instrument renders nothing, so taiknr never returns one (`research-chidi` A2)

### Requirement: Publishing cannot cost stubbing or recall

Publishing SHALL cost neither recall's return value nor a settlement's drafts. A publishing registrar SHALL NOT catch a throw raised while computing or posting figures: pi's runner catches it per handler and reports it on the extension error channel. Every emit SHALL go through one Jefferson bus adapter that catches silently, with a one-line comment citing `loader.js` (T12; `research-chidi` B8; ruling 11).

#### Scenario: A stale extension context

- **WHEN** the extension's context has gone stale, so that emitting on the bus throws
- **THEN** the bus adapter catches it silently, because the throw can only come from `assertActive` on a stale instance and a notice's `ctx.ui` is stale in the same case, so recall's handler still returns its messages and a boundary's drafts are untouched — recall's once-per-session notifier included, which this change leaves as ADR 0002 has it (T12; `research-chidi` B8; ADR 0002; ruling 11)

#### Scenario: A publishing registrar throws

- **WHEN** a publishing registrar throws before it returns
- **THEN** nothing in taiknr catches it: pi's runner records it on the extension error channel, the request still carries recall's block, and a settlement's drafts and hydration are untouched, because no publishing registrar runs inside a boundary handler (T12; ruling 11)

#### Scenario: A figure that cannot be computed

- **WHEN** any figure cannot be computed while publishing
- **THEN** taiknr does not catch the throw: pi's runner catches it per handler and reports it on the extension error channel, the last posted value stands, and nothing else in the session is affected (T12; ruling 11)

### Requirement: Nothing registers while taiknr is off or unconfigured

taiknr SHALL register no instrument and post no field while the session's config is rejected, or `enabled` is false, or the instruments switch is off. Jefferson's own *not a known instrument* warning for each `taiknr.*` row is then the only sign, and that is Jefferson's output, not taiknr's (Q3(a); J15; S5; `configuration` spec).

#### Scenario: A valid off registers nothing

- **WHEN** `enabled` is false or the session's config file is rejected
- **THEN** nothing is registered and no field is posted, so a `taiknr.*` row warns at each start (Q3(a))

#### Scenario: The switch alone

- **WHEN** `enabled` is true and the instruments switch is off
- **THEN** staging, settlement, hydration and recall work exactly as they do today, and only the instruments are absent (J8)

#### Scenario: The switch is read in one place

- **WHEN** the source is read for the switch
- **THEN** its one reader is a new `session_start` publishing registrar, registered through the gated pi after `registerSessionStartHandler`: with the switch on it builds the real publisher, emits the registration, posts every field and installs the publisher in the per-session holder built in `taiknr.ts`, and with the switch off the holder keeps its no-op; no other handler tests the switch (S5; ruling 6)

#### Scenario: Every publishing event with the switch off

- **WHEN** a test fires every publishing event with the instruments switch off
- **THEN** no emit reaches the bus and no instrument reading is evaluated, because the holder's no-op publisher neither calls a deferred reading nor posts a field (ruling 6)

#### Scenario: Turning off mid-session

- **WHEN** the deferred `/taiknr` command turns taiknr off in a session that has posted values
- **THEN** those values stay on screen until `session_shutdown`, and nothing in this change relies on a value never going stale (`research-chidi` A1; Michael §2)

### Requirement: What Jefferson cannot confirm, taiknr's own tests pin down

taiknr SHALL declare each field's name and type and post only finite values, and its own tests SHALL assert that every posted field is declared, of its declared type and finite. Only Joel's live look can confirm Jefferson accepts the registration and each update (T10; T9; J2).

#### Scenario: The three faults tsc cannot see

- **WHEN** a report carries an undeclared field, a value of another type, or a non-finite number
- **THEN** Jefferson refuses it at runtime with a warning that appears only in TUI mode, and `tsc` catches none of the three (T10; `research-chidi` A1, A3)

#### Scenario: Taiknr's tests assert the fields

- **WHEN** taiknr's tests run
- **THEN** every field name, type and finiteness is asserted on taiknr's side, because no test can read Jefferson's verdict and the package exports only its contract (T10; `research-chidi` A4)

#### Scenario: Joel's live look is the acceptance

- **WHEN** the change is accepted
- **THEN** Joel has watched the instruments in his own pi and every update he saw was accepted (J2; T10)

### Requirement: The documentation explains what stubbing does to pi's measurement

The project's documentation SHALL state what stubbing does to pi's own context measurement and calculation, and that taiknr's context figure resolves the confusing reading rather than pi's calculation: it gives a figure to watch that does not jump — the drop after a settlement, the pre-run compaction check that then runs low, and the `null` after a compaction — while pi's calculation itself is unchanged (J6; T1; T2; T3; §O8; ruling 21).

#### Scenario: The drop after a settlement

- **WHEN** the README is read
- **THEN** it says a settlement's `context_edit` makes pi estimate the whole projection at characters ÷ 4 until the next response, which is the drop a user sees after sending a message (T1; `research-chidi` B7)

#### Scenario: The calculation, not only the display

- **WHEN** the README is read
- **THEN** it says pi's own pre-run compaction check still runs on pi's estimate, so it runs low after a settled run until a response arrives, and that how large the gap is depends on the model — about 40 % on Anthropic, a few percent on deepseek (T2; ruling 21)

#### Scenario: The figure that is null

- **WHEN** the README is read
- **THEN** it says pi's figure is `null` right after a compaction while taiknr's is still a number (T3; J11)

#### Scenario: Recall's block in usage but not in history

- **WHEN** the README is read
- **THEN** it says a recall block counts in the request's usage but not in the persisted history (T4; `research-chidi` C)

#### Scenario: What the savings are net of, and their sign

- **WHEN** the README is read
- **THEN** it says the savings figures are net of the rewrite charges and of recall's reported classifier spend, are signed, and can go negative early in a session (J12; Q2(a); T19; ruling 20)

#### Scenario: The figures overlap

- **WHEN** the README is read
- **THEN** it says the figures overlap — recalled is a part of context in turn — and are not to be added together (J9; ruling 1)

#### Scenario: What kind of number each figure is

- **WHEN** the README is read
- **THEN** it says every token figure is a calibrated estimate except context in turn after its response, and that the dollar figures are counterfactual estimates (J10; J11; ruling 4)

#### Scenario: An example the user can paste

- **WHEN** the README is read
- **THEN** it carries an example set of `taiknr.*` rows for the user's own `pi-jefferson.json` (Q5(a); J6)
