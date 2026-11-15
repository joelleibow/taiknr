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

## Orientation Q1 — a broken config file (2026-11-14)

Answering `michael-orientation.md` §4 Q1 (what happens when a config file is present but malformed or invalid):

> "Q1, I respect what Michael is recommending but there's a lot of contingencies that sway me to B, not A. If the user doesn't have openrouter, if it's the default model they entered that has a typo then the feature can't function, etc."

> "I don't want to tangent down the "if the user doesn't have openrouter" caveat right now but that's something we need to address once we have a version working locally and it's working as well as we'd like then we can figure out that abstraction."

- **Q1 → (b), loud and closed.** A present-but-malformed or invalid config file is reported clearly (naming the file and the field), and taiknr does nothing for that session until the file is fixed. It does not fall back to defaults.
- **Deferred, not in this change:** the dependency on OpenRouter as the classifier provider. Joel will address that abstraction once a version works locally as well as he wants.

## Orientation Q1b and Q2 — unknown keys and layering (2026-11-14)

> "Q1b, reject it. Q2, defaults first, overlayed with user file, then overlayed with the project. Closest settings file to the working directory wins w/ its overrides, otherwise it inherits the user level setting, followed by the default."

- **Q1b → reject.** An unknown top-level key is a config error, handled under Q1(b).
- **Q2 → field-level layering:** defaults, then the user (agent-level) file over them, then the project file over that. For each field, the project file's value wins when it sets one; otherwise the user file's; otherwise the default.

## Orientation Q3 — what "off" stops (2026-11-14)

> "Q3, everything stops"

- **Q3 → (a), fully inert.** With `enabled` false, taiknr does no staging, settlement, hydration, recall or classifier calls. Outputs stubbed earlier in the session stay stubbed until it is turned back on.

## Q2 clarification — which project file (2026-11-14)

Asked whether "closest settings file to the working directory" means only `<cwd>/.pi/pi-taiknr.json` (as Pi treats its own `.pi/` settings) or the nearest one found walking up from the working directory:

> "A"

- **The project file is `<cwd>/<CONFIG_DIR_NAME>/pi-taiknr.json` only**, as Pi treats its own project `.pi/` configuration. No parent-directory search.

## Council OD — announcing a valid "off" (2026-11-14)

Answering the council's owner decision (`michael-council-rulings.json`, O7: should a valid `enabled: false` be announced at session start):

> "I'm with Michael. A"

- **O7 → (a), silent.** A valid config with `enabled: false` produces no output at session start. A rejected file stays loud.
