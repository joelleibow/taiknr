# 0002. Deterministic Settlement Stubbing in Session Entries and Tail Recall

## Status

Accepted

## Context

Agent harnesses like Pi re-send a large prompt prefix on every turn. When tool outputs accumulate, context size explodes and local or hosted prefill latency degrades. Naively summarizing history with an LLM or rewriting earlier turns on every request invalidates KV prompt prefix caches, adds extra LLM cost/latency, and risks losing exact details (such as error lines, paths, or config values) that a later turn needs. External sidecar files also risk drifting from session forks, `/tree` branch switches, and compaction.

## Decision

Archive and recall tool outputs using four coupled mechanisms:

1. **Deterministic settlement stubbing:** Replace eligible tool outputs only at `agent_before_settle` using `context_edit` entries with deterministic one-line stubs (keyed by Pi's collision-free 8-character `entryId`) while preserving any non-text blocks (such as images) on that tool result. Staging occurs at `turn_end`, leaving intra-run messages untouched until the run settles.
2. **In-session persistence (`taiknr-side-store`):** Store raw archived batches inside Pi `custom` session entries emitted at settlement, and rehydrate from `getBranch()` on `session_start`, `session_tree`, and `session_compact` so forks, branch switches, and pre-compaction items remain self-contained and scorable.
3. **Tail-only classifier recall:** Before provider requests (`context`), score archived stubs with a single `bool` question per stub via the configured decision model (cached per user message key: `timestamp` + text) and append matching raw outputs inside `<recalled_context>` at the tail of the latest user message for that request only, preserving non-text user content blocks.
4. **Fail-open resilience:** If the classifier is unavailable or errors, skip recall so the main prompt proceeds, notifying the user at most once per session.

## Consequences

**Easier:**
- Prompt prefixes remain monotonic and byte-identical across settled turns, maximizing prefix-cache hit rates on local (oMLX) and hosted providers.
- Zero summarizing LLM calls are spent at archival time, and forks/branches automatically retain matching archive state without external file garbage collection.
- Pre-compaction tool outputs remain recoverable on demand even after Pi summarizes older conversation turns.

**More difficult:**
- Raw archived tool outputs remain stored inside session `.jsonl` files on disk (excluded from active LLM context until recalled).
- Hydrating from `getBranch()` across multiple compactions causes the classifier's stub list to grow linearly with session length until an explicit archive cap or pruning policy is introduced.
- Modifying the stub format or recall framing later does not retroactively rewrite already-settled `context_edit` entries on older sessions.
