# Joel's attribution extension: the relaxed guard (2026-11-17)

Joel's ruling Q1(a) (`owner-rulings.md`) was carried out by another Janet in his dotfiles, in
`~/dotfiles/home/dot_pi/private_agent/extensions/anthropic-attribution.ts`, which is symlinked to
`~/.pi/agent/extensions/anthropic-attribution.ts`. That Janet reports +42/−2. The file-and-line facts
below were read from the file on 2026-11-17.

## What the guard enforces now
- **The top-level, system and tools cache points are still fixed.** Payload middleware may not change them.
- **Message cache points may move or be added**, but each one must exactly copy a message cache marker
  that pi already placed in the same request: `assertMessageCacheControlsCopied`, `:1040-1052`. The allowed
  set is the shapes of pi's message markers, as canonical hashes (`messageCacheControlShapes`, `:1030-1036`).
  The comment at `:1038-1039` gives the reason: "so a TTL never changes mid-request (a 1h entry after a 5m
  one is a 400) and none appears where pi set none."
- **The 4-point limit is enforced** (`assertCacheControlBreakpointLimit`, `:1054`). So are the model and
  stream route, `metadata.user_id`, the system identity blocks, cache-lineage checks and cache retention.
  These are the other Janet's report, not re-read here.

## What this binds for taiknr's design
- On this route taiknr has to copy pi's own message marker object. A literal `{ type: "ephemeral" }` is
  rejected whenever pi's marker carries a `ttl`.
- If a request has no message marker from pi, taiknr cannot add one on this route.
- The other Janet's checks passed with an unchanged payload, a moved message point and an added second
  message point. They rejected a 5th point, a 5-minute point among 1-hour ones, a removed system point
  and a changed tools point.
