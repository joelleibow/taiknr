# Spec Delta

## ADDED Requirements

### Requirement: The instruments switch turns publishing on and off, and defaults on

One new boolean field, named by the design (§O5), SHALL enable or disable taiknr's Jefferson instruments. It SHALL default to `true`, layer and validate as every other field does, carry a README row, and be read in exactly one place. `enabled` remains the switch that stops everything (J8; J15; S5; §O5).

#### Scenario: Absent means on

- **WHEN** no file sets the instruments switch
- **THEN** the resolved config reports it true (J8, "a" to the switch's default)

#### Scenario: It layers like every other field

- **WHEN** the agent file sets the switch false and a trusted project file sets it true
- **THEN** the resolved config reports true, and in the other order it reports false (`configuration` spec)

#### Scenario: A value that is not a boolean

- **WHEN** the switch is `"false"`, `0` or `null`
- **THEN** the file is rejected, naming the file and the field, under the rule `enabled` already follows (`configuration` spec)

#### Scenario: The switch is not the enabled switch

- **WHEN** `enabled` is true and the switch is false
- **THEN** staging, settlement, hydration and recall are unaffected and only publishing stops (J8)

#### Scenario: An off by either switch registers nothing

- **WHEN** `enabled` is false
- **THEN** the instruments switch has no effect on registration, because nothing registers at all (Q3(a); `jefferson-instruments` spec)

#### Scenario: The README carries the row

- **WHEN** the README's configuration table is read
- **THEN** it holds a row for the switch, with its default and what it turns off (Michael §1)

#### Scenario: One reader

- **WHEN** the source is searched for the switch's key
- **THEN** exactly one place reads it — the `session_start` publishing registrar that `jefferson-instruments`' *The switch is read in one place* fixes the identity of — and no publishing handler tests it itself (§O5; Michael §2; ruling 6)
