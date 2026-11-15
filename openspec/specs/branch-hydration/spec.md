# branch-hydration Specification

## Purpose

Defines how the in-memory archive is rebuilt from the session's active branch when a session starts, when the user navigates the tree and when it compacts, what that rebuild keeps, and what it does while taiknr is off.

## Requirements

### Requirement: The archive is rebuilt from the active branch on three events

On `session_start` while the session is active, on `session_tree`, and on `session_compact`, taiknr SHALL replace the in-memory archive's contents whole with the items carried by the `taiknr-side-store` entries on the active branch. A branch carrying no such entry SHALL leave the archive empty, and a second hydration over the same branch SHALL change nothing (S4; Joel's "Orientation Q2" → (a); `Chidi` §5).

#### Scenario: A resumed session

- **WHEN** a session is resumed and its branch holds two `taiknr-side-store` entries
- **THEN** the archive holds their items before the first provider request of that session is built

#### Scenario: Navigation drops the branch left behind

- **WHEN** the user navigates to a branch that diverges before those entries
- **THEN** the archive is empty afterwards, and the items from the branch left behind are gone (`Chidi` §5)

#### Scenario: Navigating back restores them

- **WHEN** the user navigates back to a leaf below those entries
- **THEN** the archive holds their items again

#### Scenario: Hydration twice over one branch

- **WHEN** hydration runs over the same branch twice, as a compact after a start does
- **THEN** the archive holds the same items after the second run as after the first

#### Scenario: A branch with no archive

- **WHEN** the active branch carries no `taiknr-side-store` entry
- **THEN** the archive is empty and nothing is reported

#### Scenario: Reading the branch writes nothing

- **WHEN** any hydration runs
- **THEN** no session entry is appended and nothing is printed (`Chidi` §4, §5; O6)

### Requirement: Outputs archived before a compaction stay in the archive

Hydration SHALL read every `taiknr-side-store` entry on the active branch, including those before the latest compaction entry, so an output archived before `/compact` or auto-compaction is still archived after it (Joel's "Orientation Q2" → (a); `Chidi` §5). Nothing in this change bounds the archive's size (D10).

#### Scenario: A compaction does not prune the archive

- **WHEN** a branch holds a side-store entry before the latest compaction entry and a compaction succeeds
- **THEN** the archive still holds that entry's items

#### Scenario: The entry before the compaction is still read

- **WHEN** a session with such a branch is resumed
- **THEN** hydration reads the side-store entry from before the compaction, not only those inside the kept range (`Chidi` §5)

#### Scenario: Growth is accepted for now

- **WHEN** a long session archives outputs on many runs without compacting
- **THEN** the archive keeps every item, and the ceiling the archive-caps card adds is not built here (Joel's "Orientation Q2" → (a); D10)

### Requirement: A foreign or malformed side-store entry is skipped

Reading the branch SHALL ignore a custom entry of another type. It SHALL skip a `taiknr-side-store` entry whose data is not a non-empty array of well-formed items, whole rather than item by item, and SHALL fold the entries it reads in branch order, root to leaf, so the last well-formed entry wins a repeated id. No skipped entry SHALL fail a session start, a navigation or a compaction (O3; M1; `Chidi` §4).

#### Scenario: Another extension's custom entry

- **WHEN** the branch holds a custom entry of a different custom type
- **THEN** it contributes no item to the archive

#### Scenario: A well-formed item is read

- **WHEN** a side-store entry's data is a non-empty array whose every element is a plain object, not an array, carrying `id` as a non-empty string, `toolName`, `argsSummary`, `stub` and `rawText` as strings and `isError` as a boolean
- **THEN** every element is read into the archive as an item (M1)

#### Scenario: An item carrying a property the shape does not name

- **WHEN** an otherwise well-formed item carries a property this item shape does not name, such as a timestamp a later card adds
- **THEN** it is still read, because extra properties are tolerated (M1; CR-10)

#### Scenario: Data of the wrong shape

- **WHEN** a `taiknr-side-store` entry's data is a string, an empty array, or an array holding an object without the fields an item carries
- **THEN** that entry is skipped, and the session starts

#### Scenario: One bad item in a batch

- **WHEN** a side-store entry's data is a three-element array whose second element lacks `isError`
- **THEN** the whole entry is skipped, including its two well-formed elements, and the session starts (M1)

#### Scenario: One bad entry beside a good one

- **WHEN** the branch holds one malformed side-store entry and one well-formed entry
- **THEN** the well-formed entry's items are in the archive and the session starts

#### Scenario: The same id twice on one branch

- **WHEN** two well-formed entries on the branch — one nearer the root, one nearer the leaf — carry the same item id
- **THEN** the archive holds one item for that id, the one carried by the entry nearer the leaf (M1; CB-4)

### Requirement: Hydration runs only while taiknr is on and the session is active

`session_start` SHALL hydrate only while the session is active, and the `session_tree` and `session_compact` registrations SHALL be gated like the other non-start handlers, so a session that started with `enabled` false or with a rejected config hydrates nothing (D3–D5; S4; Trap 2; `configuration` spec).

#### Scenario: A session configured off

- **WHEN** the resolved config reports `enabled` false and the session starts on a branch that holds side-store entries
- **THEN** the archive is not hydrated, and the store stays as it was (Trap 2)

#### Scenario: A rejected config file

- **WHEN** session start rejects the config file
- **THEN** no hydration happens, and the rejection is the only output of that session start (`configuration` spec)

#### Scenario: Nothing is gated per handler

- **WHEN** the five non-start handlers this change gives bodies — `tool-call.ts`, `turn-end.ts`, `agent-before-settle.ts`, `session-tree.ts` and `session-compact.ts` — are read
- **THEN** none of them tests `enabled` itself, and the gate at the composition root is what stops them (D4; CS-5)

#### Scenario: Turning taiknr on mid-session

- **WHEN** a session started with `enabled` false, taiknr is then turned on, and the user next navigates the tree or compacts
- **THEN** hydration runs at that event and the archive becomes current, so the mid-session gap closes without a reload (orientation §2; S4)