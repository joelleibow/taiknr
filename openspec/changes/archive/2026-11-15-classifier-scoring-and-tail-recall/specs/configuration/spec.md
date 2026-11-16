# Spec Delta

## ADDED Requirements

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