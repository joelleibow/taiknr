# Owner Rulings — configuration-loader

Joel's own words only. Each entry is quoted and dated with what he decided.

## Request (2026-11-14)

> "Merge it and let's take down the next card as /skill:conductor-janet. I've updated the dotfiles settings file so that symlink is now live."

What he decided: run the next taiknr board card, **Configuration loader** (`🤖 Knowledge/projects/taiknr-notes/configuration-loader.md`), through Conductor Janet. The card's text was drafted by a Janet, so each decision in it (file locations, precedence, validation, error behaviour) is a proposal until he confirms it.

## Standing rulings carried from foundation-and-packaging (2026-11-14)

Recorded in `openspec/changes/archive/2026-11-14-foundation-and-packaging/owner-rulings.md`; quoted here because they bind this change too.

> "Whatever the community is doing for typical biome config is what we're going with. Our decisions need to reflect the communities preferences so we're well aligned for adoption."

- Decisions reflect the community's preferences, so the package is aligned for adoption.

> "The pi extension is pi-taiknr. The  repo is just taiknr"

- The package / extension name is `pi-taiknr`; the repository is `joelleibow/taiknr`.

## An on/off switch (2026-11-14)

> "One thing we should do, maybe boyscoutted into this run, we need an easy way to turn taiknr on and off without a complete uninstall/reinstall thing for folks. A simple `"enabled": true` field in the config maybe... If it's better to create a new card and do it independently then that's okay too."

What he decided: users need an easy way to turn taiknr on and off without uninstalling and reinstalling it. He suggested an `"enabled": true` config field, and left it to the conductor whether to fold it into this change or run it as its own card. The conductor folded it into this change, because the switch is a configuration field and this change builds the configuration loader. The field name and its exact behaviour (what "off" does, and when a change takes effect) are proposals for the council and design.

## The /taiknr on|off command (2026-11-14)

> "A command like /taiknr off or /taiknr on would be fantastic!!!"

What he asked for: a `/taiknr on` and `/taiknr off` command. The conductor's scope call: the command goes to the existing board card **Status readout and /taiknr command**, which already holds the session toggle, not into this change. This change delivers the `enabled` field and the loader the command will write through. It does not foreclose the command: the design must leave a clean place for a command to flip `enabled`.
