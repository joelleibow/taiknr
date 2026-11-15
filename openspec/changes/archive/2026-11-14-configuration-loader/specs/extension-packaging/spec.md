# Spec Delta

## MODIFIED Requirements

### Requirement: Handler signatures and the import boundary are preserved

The `register*Handler(pi, …)` signatures and the adapter and port contracts SHALL stay fixed, except the three differences enumerated below, which carry the session's configuration (O1; ruling 6):

1. `registerSessionStartHandler` gains the per-session configuration holder as a third parameter, and keeps its `pi` and store parameters in their order.
2. The `config` member of `registerTurnEndHandler`'s and `registerContextHandler`'s dependency objects changes type from `TaiknrConfig` to the per-session configuration holder. The other members of both objects are unchanged.
3. `ConfigPaths.projectConfigPath` changes type from `string` to `string | undefined`. It is neither a registrar signature nor an adapter contract; it is listed here so a reviewer has one list of every permitted difference (rulings 2, 6).

Everything else SHALL be unchanged against `HEAD`: the other four registrars' exported names, parameter order, types and return types; `createPiJevScorerAdapter(ctx, config: TaiknrConfig)` (its signature; `TaiknrConfig` itself gains `enabled` under the `configuration` spec); and the port contracts. No `@earendil-works/pi-*` import MAY enter `src/domain/` or `src/use-cases/` (ADR 0001; D5; Michael §2). Formatter whitespace MAY change in those files (R3).

#### Scenario: Signatures unchanged

- **WHEN** the seven handler files are compared with `HEAD`, and `ConfigPaths` in `src/config/taiknr-config.ts` is compared with `HEAD`
- **THEN** the differences are the three listed above, each stub body replaced by its implementation (a used parameter may drop its `_` prefix), and formatter whitespace — and nothing else. The rest of `src/config/taiknr-config.ts` is governed by the `configuration` spec.

#### Scenario: Boundary holds

- **WHEN** `src/domain/` and `src/use-cases/` are searched for `@earendil-works/pi-` imports
- **THEN** none are found
