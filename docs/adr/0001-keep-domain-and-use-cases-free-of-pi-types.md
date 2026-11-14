# 0001. Keep Domain and Use Cases Free of Pi Types

## Status

Accepted

## Context

`pi-taiknr` starts as a Pi extension, with planned future entry points for a standalone CLI (transcript analysis and benchmarking) and an MCP server (tool-driven archive and recall for non-Pi hosts). Tightly coupling core stubbing, archive management, and relevance-recall logic to `@earendil-works/pi-coding-agent` event shapes and session types would force rewrites when adding those applications and prevent unit testing core behavior without a Pi runtime.

## Decision

Keep `src/domain/` and `src/use-cases/` strictly free of imports from `@earendil-works/pi-*` or any host harness SDK.

Pi lifecycle handlers live in `src/infra/pi-event-handlers/` and receive Pi event DTOs, passing them through `src/infra/adapters/` to translate between Pi-specific types (`TurnEndEvent`, `ContextEvent`, `SessionBoundaryDraft`, `SessionEntry`, `AgentMessage`) and the pure domain objects and port interfaces defined by `src/use-cases/`. Each application entry point under `src/app/` wires its own adapters around the shared domain and use-case core.

## Consequences

**Easier:**
- Discrete future `cli/` and `mcp/` apps can reuse `src/domain/` and `src/use-cases/` directly by supplying new adapters and composition roots.
- Domain rules and use-case orchestration are unit-testable in plain Node without mocking Pi's extension runner or `SessionManager`.

**More difficult:**
- Requires explicit DTO-to-domain translation functions and port interfaces in `src/infra/adapters/` and `src/use-cases/` instead of mutating Pi event payloads inline.
- Contributors must enforce the import boundary during review and checks so Pi types do not leak inward.
