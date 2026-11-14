# Spec Delta

## MODIFIED Requirements

### Requirement: Handler signatures and the import boundary are preserved

The `register*Handler(pi, …)` signatures and the adapter and port contracts SHALL stay fixed, except one per-session-config revision the design names (O1): the session-start registration and the config-carrying dependency types MAY change to carry the session's configuration. No other registrar's exported name, parameter order or types MAY change, and no `@earendil-works/pi-*` import MAY enter `src/domain/` or `src/use-cases/` (ADR 0001; D5; Michael §2). Formatter whitespace MAY change in those files (R3).

#### Scenario: Signatures unchanged

- **WHEN** the seven handler files are compared with `HEAD`
- **THEN** the six registrars other than the session-start one keep their exported names, parameter order, types and return types, and the session-start and dependency-contract changes are exactly the ones the design names (O1)

#### Scenario: Boundary holds

- **WHEN** `src/domain/` and `src/use-cases/` are searched for `@earendil-works/pi-` imports
- **THEN** none are found
