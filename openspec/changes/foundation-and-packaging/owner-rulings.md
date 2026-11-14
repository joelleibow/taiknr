# Owner Rulings — foundation-and-packaging

Joel's own words only. Each entry is quoted and dated with what he decided.

## Request (2026-11-14)

> "review the cards on the taiknr project board so we can /conductor-janet our way through the first one."

> "Let's do it!"

What he decided: run the first card on the taiknr board, **Foundation and packaging** (`🤖 Knowledge/projects/taiknr-notes/foundation-and-packaging.md`), through Conductor Janet. The card's text was drafted by a Janet, so each decision in it (dependency layout, test runner, settings entry, acceptance criteria) is a proposal until he confirms it; it is the request, not a ruling.

No other rulings recorded yet.

## Orientation questions (2026-11-14)

Answering Michael's orientation questions (`michael-orientation.md` §4):

> "1, yes, A. 2, sure. I can do A. 3, I'd like to use B but I don't know enough about Biome to configure it just yet."

- **Q1 → (a).** This card may replace each handler stub's `throw` with a no-op `pi.on("<event>", () => {})` registration so the extension loads; the load and type checks then verify the seven event names against Pi 1.5.2.
- **Q2 → (a).** Joel adds `../../Projects/pi-taiknr` to `packages` in `~/.pi/agent/settings.json` himself after the gate. The change's acceptance check uses a throwaway `PI_CODING_AGENT_DIR` and does not touch his settings or dotfiles.
- **Q3 → (b), pi-omlx's stack (Biome + `tsc` + vitest),** with his stated limit that he does not yet know enough about Biome to configure it. How Biome is configured is pending his confirmation below.

## Biome configuration (2026-11-14)

> "Whatever the community is doing for typical biome config is what we're going with. Our decisions need to reflect the communities preferences so we're well aligned for adoption."

- **Q3 settled as (b): Biome + `tsc` + vitest.** Biome's configuration is "whatever the community is doing for typical biome config."
- **Standing principle for this change:** decisions reflect the community's preferences, so the package is aligned for adoption.
