# Spec Delta

## MODIFIED Requirements

### Requirement: The extension entry loads without error

The extension entry SHALL load under Pi 1.5.2 without throwing. Each of the seven handler registrars SHALL register a handler for its lifecycle event instead of throwing, and SHALL register nothing else (Q1(a); Trap 1; R3).

#### Scenario: Load check passes

- **WHEN** `pi --no-session --help` runs with `PI_CODING_AGENT_DIR` pointing at a throwaway directory that is a `git archive HEAD` copy of the repository and whose `settings.json` lists that copy under `packages` (design.md Decision 6)
- **THEN** stderr contains no `Failed to load extension` line and no host-provided-package warning. `--help` exits 0 whether or not an extension loaded, so the assertion is on the text, never on the exit code (R6)

#### Scenario: Seven events registered

- **WHEN** `tests/app/extension/taiknr.test.ts` invokes the entry's default export with a recording fake whose only member is `on`
- **THEN** the sorted list of registered event names equals exactly `session_start`, `session_tree`, `session_compact`, `tool_call`, `turn_end`, `agent_before_settle` and `context_with_system` (R6; S1)

#### Scenario: Recall subscribes to the system-inclusive event

- **WHEN** a session whose request carries a mid-conversation system message is scored, and that session's next request is built with recall
- **THEN** recall reaches the request through the `context_with_system` registration, no handler is registered for `context`, and the payload and result types the registration declares are unchanged from `HEAD` (S1; T1; `tail-recall` spec)

### Requirement: Handler signatures and the import boundary are preserved

The `register*Handler(pi, …)` signatures and the adapter and port contracts SHALL stay fixed, except the four differences enumerated in `Signatures unchanged` (O1; ruling 6; ruling 3; ruling 12). Everything else in those contracts SHALL stay unchanged against `HEAD`, no `@earendil-works/pi-*` import MAY enter `src/domain/` or `src/use-cases/` (ADR 0001; D5; Michael §2), and formatter whitespace MAY change in those files (R3).

#### Scenario: Signatures unchanged

- **WHEN** the seven handler files are compared with `HEAD`, and `ConfigPaths` in `src/config/taiknr-config.ts` is compared with `HEAD`
- **THEN** the only contract differences are (1) `registerSessionStartHandler` gaining the per-session configuration holder as a third parameter while keeping its `pi` and store parameters in their order, (2) the `config` member of `registerTurnEndHandler`'s and `registerContextHandler`'s dependency objects changing type from `TaiknrConfig` to the per-session configuration holder, with the other members of both objects unchanged apart from (4), (3) `ConfigPaths.projectConfigPath` changing type from `string` to `string | undefined`, and (4) `registerContextHandler`'s dependency object dropping its `notifier` member while its `config`, `store` and `recallCache` members stay as they are, because the notifier is built in the handler (none of (3) and (4) is a registrar signature or an adapter contract, listed here so a reviewer has one list of every permitted difference; rulings 2, 6, 3, 12); everything else is unchanged against `HEAD` — the other four registrars' exported names, parameter order, types and return types, `createPiJevScorerAdapter(ctx, config: TaiknrConfig)` (its signature; `TaiknrConfig` itself gains `enabled` under the `configuration` spec), and the port contracts — apart from each stub body replaced by its implementation (a used parameter may drop its `_` prefix) and formatter whitespace, while the rest of `src/config/taiknr-config.ts` is governed by the `configuration` spec

#### Scenario: A rename under O8

- **WHEN** the design renames `context.ts` or `registerContextHandler`
- **THEN** that rename is one further difference on the same list, and nothing else moves: `createPiJevScorerAdapter`, `extractLatestUserPrompt`, `appendRecalledContextToMessages` and `createOncePerSessionNotifier` keep their signatures, `RecallCache` keeps its shape, and the port contracts stay (ruling 12)

#### Scenario: Boundary holds

- **WHEN** `src/domain/` and `src/use-cases/` are searched for `@earendil-works/pi-` imports
- **THEN** none are found