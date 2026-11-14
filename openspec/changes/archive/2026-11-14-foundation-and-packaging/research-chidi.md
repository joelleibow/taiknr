# Research (Chidi) — foundation-and-packaging

## Question and Scope

Chidi's six questions from `.pi/marbleization/foundation-and-packaging/brief-research.md`: Pi package rules, TypeScript loading, `settings.json`/`-e` path behaviour, auto-discovery (the "test files executed at startup" premise), the Pi types the stubs import, and type-check/test-runner facts. Pi 1.5.2. Nothing was installed, run or edited in `pi-taiknr`. No design or scope choices are made here.

PI = `/Users/joelleibow/.local/share/fnm/node-versions/v26.8.1/installation/lib/node_modules/@earendil-works/pi-coding-agent`

## Sources / Files Examined

- `PI/docs/packages.md` (sections: Choose a source, Create a package, Declare dependencies, Select package resources, Scope and identity)
- `PI/docs/extensions.md` (Extension Locations, Available Imports, Writing an Extension, lifecycle/events)
- `PI/docs/cli.md` (Resources: `-e`, `-ne`); `PI/docs/settings.md` (Resources)
- `PI/dist/core/resource-loader.js` (`HOST_PROVIDED_EXTENSION_PACKAGES`, `collectExtensionPackageWarnings`)
- `PI/dist/core/package-manager.js` (`resolveExtensionEntries`, `collectAutoExtensionEntries`, `collectPackageResources`)
- `PI/dist/core/extensions/loader.js` (`loadExtensionModule`, jiti options)
- `PI/dist/index.d.ts`, `PI/dist/core/extensions/types.d.ts`; `PI/package.json`
- `pi-taiknr/src/**` (read only, to answer Q5). Registry lookups via `npm view` (vitest, typescript).

## Findings

### 1. Package rules
- **Host-provided packages** are `@earendil-works/pi-ai`, `pi-agent-core`, `pi-coding-agent`, `pi-tui`, and `typebox` (`packages.md` § Declare dependencies). The code's set (`resource-loader.js`) also holds the legacy `@mariozechner/*` names and `@sinclair/typebox`.
- **Placement:** declare them in `peerDependencies` with `"*"` and do not bundle them. Do not put them in `dependencies`. The docs do not mention `devDependencies` for these packages. `extensions.md` § Available Imports says only that `devDependencies` are not installed by `pi install`. So the card's `devDependencies` entry is for local type-checking and is not a Pi rule. The card's claim "(never `dependencies`)" is documented.
- **Local packages:** "Local packages are not installed or modified, so their dependency tree remains the package author's responsibility." Pi will not install the peer for a local checkout.
- **Duplicate warning:** the only warning is emitted by `collectExtensionPackageWarnings` (`resource-loader.js`). It fires when a loaded extension's package root has a `package.json` whose `dependencies` object contains any host-provided name. The text is: `Host-provided extension packages must be declared in peerDependencies with a "*" range, not dependencies: <names>. Installed copies can bypass the extension loader and create duplicate runtime modules.` It checks `dependencies` only, not `devDependencies` or `peerDependencies`. It does not check the version range.
- **`pi` manifest key:** `pi.extensions`, `skills`, `prompts` and `themes` are arrays of paths relative to the package root. They accept globs and `!` exclusions (`packages.md` § Create a package). `pi.changelogPath`, `pi.image` and `pi.video` are optional. When the manifest has any resource field, only those entries are used and the conventional directories are not scanned (`collectPackageResources`).
- **Extension entries:** in `resolveExtensionEntries`, each `pi.extensions` path is resolved against the package dir and kept if it exists. An entry may be a file (`./src/index.ts` appears in `extensions.md`). The docs' file-versus-directory rule for settings is: "A file path loads one extension. A directory follows normal package discovery rules" (`packages.md`).
- **`pi-package` keyword:** it only makes an npm package eligible for the gallery at pi.dev/packages (`packages.md`). The code reads no keyword to load anything. Installing or loading a local checkout does not need it.

### 2. TypeScript loading
- Extensions load through jiti 2.7.0 ("TypeScript works without compilation", `extensions.md` § Writing an Extension). `loader.js` calls `createJiti(..., { moduleCache: false, ... })`.
- For the normal bundled-Node build, `usesEmbeddedModules` is true and Pi passes `virtualModules` (host packages mapped to Pi's own copies) with `tryNative: false`. `tsconfigPaths: true` is passed only for the source-TypeScript runtime. So no build step is needed, and no `tsconfig.json` is documented as consulted by the normal installed Pi.
- The extension must `export default` a function, sync or async, taking `ExtensionAPI`. If the module's default is not a function, `loadExtensionModule` returns `undefined`.
- Pi's own package is `"type": "module"`. The docs state no ESM requirement for extension packages. Stub imports use ESM syntax with `.js` specifiers, such as `../../config/taiknr-config.js` pointing at `.ts` files. Whether jiti resolves that `.js`→`.ts` form is not documented. It is **unverified** here.

### 3. Settings and `-e`
- **Settings paths:** relative paths in a settings file resolve from that settings file. `packages.md` § Choose a source says so for local package sources. `settings.md` § Resources says "Resource paths in user settings resolve from the agent directory", which is `~/.pi/agent`. So `../../Projects/pi-taiknr` in `~/.pi/agent/settings.json` is `~/Projects/pi-taiknr`. Absolute paths and `~` are also supported.
- **Where it goes:** a package source goes in the `packages` array. A raw extension file or directory goes in the `extensions` array (`extensions.md` § Extension Locations, `settings.md`).
- **Directory versus file:** a `packages` entry for a directory reads its `package.json` `pi` manifest, and `pi.extensions` is honoured. Without a manifest it falls back to `extensions/`, `skills/`, `prompts/` and `themes/` subdirectories. An entry that is a single `.ts` file loads that one extension.
- **Identity:** local packages are identified by resolved absolute path, to prevent double loading (`packages.md` § Scope and identity).
- **`pi -e <path>`** accepts an extension file or directory (`cli.md`). Relative paths resolve from the **current working directory**. `-e` is repeatable and explicit `-e` paths still load under `-ne`. `-e` is documented for "quick tests" (`extensions.md`). `-e` with a directory resolves entries as described above.

### 4. Discovery beyond the manifest
- **Manifest present:** Pi loads only the `pi.extensions` entries that exist. A file such as `tests/foo.test.ts` is not scanned.
- **No manifest:** `collectPackageResources` scans `<package>/extensions/` and the other three resource dirs. `collectAutoExtensionEntries` (`package-manager.js`) first checks the dir for a manifest or `index.ts`/`index.js`. Otherwise it loads every `*.ts`/`*.js` file one level deep, plus `index.ts`/`index.js`/manifest entries of subdirectories. It skips dot-entries and `node_modules` and honours ignore rules.
- **Auto-discovery roots:** `~/.pi/agent/extensions/` and `.pi/extensions/` (project, trusted only). Settings also list extra paths (`extensions.md`).
- **So the card's premise** "test files executed at startup" is true only for files placed inside a scanned extensions directory (for example the `extensions/` dir of a manifest-less package, or a settings `extensions` entry that is a directory). With a `pi.extensions` manifest, tests outside the listed entries are not executed. Files imported by the entry are executed only if the entry imports them.
- **Observation (not a design):** `pi-taiknr` has its entry at `src/app/extension/taiknr.ts`. The directory is named `extension`, not `extensions`. Without a manifest it would not be auto-scanned by the conventional rule.

### 5. Types and event names used by the stubs
- Types the stubs import, all `import type` from `@earendil-works/pi-coding-agent`: `ExtensionAPI`, `ExtensionContext`, `ContextEvent`, `TurnEndEvent`, `SessionBoundaryDraft` and `SessionEntry` (the last as written in `pi-archive-adapter.ts`). I checked that `ExtensionAPI`, `ExtensionContext`, `ContextEvent`, `TurnEndEvent` and `SessionBoundaryDraft` are exported in `PI/dist/index.d.ts` for 1.5.2. I did not separately confirm `SessionEntry` in that file, so it is **unconfirmed**.
- No stub contains a `pi.on(...)` call. All handler registrars (`register*Handler`) currently `throw new Error("Not implemented: ...")`, including `registerContextHandler`. The event names are only implied by file names (`session-start`, `session-tree`, `session-compact`, `tool-call`, `turn-end`, `agent-before-settle`, `context`).
- Event names exist in the docs/types: `agent_before_settle` (`types.d.ts` line 818 and `on(...)` overload line 1252), `turn_end`, `context`, `session_before_compact`, `session_compact`, `session_shutdown` (`extensions.md`). `session_start` and `tool_call` and the `session_tree`-family were not individually grepped.
- **Load consequence:** `taiknr.ts` calls `registerSessionStartHandler(...)` first, which throws. So a load check of the current entry would fail at factory time unless the stubs are changed. This is what `-e` or `settings.json` would exercise. This is an observation for Plan to weigh, not a decision. `tsc` type-checking would not hit it.
- Only `@earendil-works/pi-coding-agent` is imported directly. The package depends on `pi-agent-core`, `pi-ai`, `pi-tui` etc. at the exact version `1.5.2`, so its `.d.ts` files resolve them once the package is installed.

### 6. Type check and test runner
- Pi's own `package.json` pins `vitest` 4.1.12 and `@types/node` 22.19.19. Registry `latest` tags today: `vitest` 5.1.0, `typescript` 7.0.2 (`typescript@5` line → 5.9.3), `@types/node` 26.6.6. Local Node is v26.8.1.
- `vitest@5.1.0` has `engines.node` `^22.12.0 || ^24.0.0 || >=26.0.0` and a peer on `vite` `^6.4.0 || ^7.0.0 || ^8.0.0` (installs automatically via npm 7+). Node 26.8.1 satisfies the engines.
- `npm view vitest dist-tags` shows `rc` 5.0.0-rc.4 and `beta` 5.1.0-beta.1 besides `latest`. I did not check which TypeScript versions each vitest release supports. I did not check whether `typescript@7` changed `tsc` flags or `moduleResolution` options relative to 5.x. Both are **unverified**.
- Pi's docs give no required `tsconfig.json` for extension authors, since jiti ignores it in the installed build. A `tsconfig.json` is therefore for `tsc --noEmit` only. The stubs' `.js` import specifiers on `.ts` files need `moduleResolution` `node16`/`nodenext`/`bundler` for `tsc` to resolve them. That follows from TypeScript's documented behaviour and was not run here.
- Nothing was type-checked or tested in a copy, because the brief allowed a temp copy only if a measurement needed it and the above answers did not.

## Assumptions, Differences, and Unknowns

**Differences from the card:**
- `devDependencies` for Pi packages is not a Pi rule. The docs only say they are not installed for `pi install`. It is a local-development need.
- The `pi-package` keyword is optional for local loading. It only affects gallery eligibility.
- "Duplicate-dependency warning" is really a warning about host packages listed in `dependencies`. It does not trigger for `devDependencies` or `peerDependencies`.
- "Test files executed at startup" holds only for files inside a scanned extensions directory. It does not hold when a `pi.extensions` manifest names the entry.
- `settings.json` relative-path base: the agent directory (`~/.pi/agent`), which is the same as "the settings file's directory". `-e` relative paths use the CWD.
- Current stubs throw at load (see §5), so "loads cleanly" is not achievable from the stubs alone as written.

**Assumptions:** the installed Pi 1.5.2 docs and `dist/` match the Pi that Joel runs (installed path, bundled Node build).

**Unknowns / not verified:**
- No live `pi -e` run (the brief forbids running `pi` against the checkout), so the absence of a warning is read from source, not observed.
- Whether jiti resolves `./x.js` specifiers to `./x.ts`.
- `SessionEntry` export, and the exact event-name strings for `session_start`, `tool_call` and the tree events.
- TypeScript 7 / vitest 5 combined compatibility and tsconfig options for them.
- No web sources were used; everything above comes from the installed docs, source and `npm view`.


---

## Addendum (2026-11-14, run 2fd9a654) — community-typical Biome and vitest configuration


### Question and Scope

Joel's ruling: Biome config is "whatever the community is doing for typical biome config". This addendum reports evidence only, not a design. It covers five questions: current Biome and `biome init` output; typical Biome config in practice; what Pi and `pi-package` extensions do; vitest config need and test glob; typical script names. Nothing was installed or edited in the checkout.

### Sources / Files Examined

- Biome docs, fetched 2026-11-14: https://biomejs.dev/guides/getting-started/ and https://biomejs.dev/reference/configuration/ (first ~30 KB of 73 KB read)
- `npm view @biomejs/biome` (registry)
- GitHub code-search counts via `gh api search/code` (approximate, noisy, includes forks and examples)
- Pi monorepo raw files: `earendil-works/pi` `biome.json`, root `package.json`, `packages/coding-agent/vitest.config.ts`
- npm `keywords:pi-package` search (first 40 results); per-repo file-existence checks and raw `biome.json`, `package.json`, `vitest.config.ts` via `gh api`
- Vitest docs: https://vitest.dev/config/include, https://vitest.dev/config/exclude, `vitest-dev/vitest` `packages/vitest/src/defaults.ts`
- Local siblings `~/Projects/pi-omlx` (`biome.json`, `vitest.config.ts`, `package.json` scripts), already known to Eleanor

### Findings

#### 1. Biome version and `biome init`
- **Stable:** `@biomejs/biome` `latest` is **2.6.7** (dist-tags: `latest` 2.6.7, `beta` 2.0.0-beta.6, `nightly` 1.9.5-nightly.81fdedb). The docs reference `schemas/2.6.7/schema.json`. Install command in the docs: `npm i -D -E @biomejs/biome` (exact pin).
- **`biome init` output** (Getting Started, step 2), reformatted:
```json
{
  "$schema": "https://biomejs.dev/schemas/2.6.7/schema.json",
  "vcs": { "enabled": false, "clientKind": "git", "useIgnoreFile": false },
  "files": { "ignoreUnknown": false },
  "formatter": { "enabled": true, "indentStyle": "tab" },
  "linter": { "enabled": true, "rules": { "preset": "recommended" } },
  "javascript": { "formatter": { "quoteStyle": "double" } },
  "assist": { "enabled": true, "actions": { "source": { "organizeImports": "on" } } }
}
```
- **Defaults** (Configuration reference):
  - `indentStyle` is `tab`, `indentWidth` 2, `lineWidth` 80, `lineEnding` `lf`.
  - `vcs.enabled` and `vcs.useIgnoreFile` are `false`.
  - `files.includes` omitted means no restriction. Negation uses `!pattern`. `!!pattern` is "force-ignore", which also keeps the scanner from indexing the path.
  - `linter.rules.preset` is new: `"recommended" | "all" | "none"`, default `"recommended"`. The older `linter.rules.recommended: true` is still documented, also default `true`.
  - Assist `organizeImports` lives under `assist.actions.source` (the Biome 1.x top-level `organizeImports` key is gone).
- **Docs' own VCS guidance:** enable `vcs.enabled` + `vcs.clientKind` to reuse `.gitignore` via `useIgnoreFile` (https://biomejs.dev/configuration/integrate-with-vcs/).
- The generated init file is already tab-indented and double-quoted, which matches the change's stated source style. `biome init` as generated sets no `files.includes`. `biome check` run bare would therefore see root PoC files unless they are ignored.

#### 2. Typical Biome config in practice
GitHub code search for `filename:biome.json` (counts are approximate GitHub totals, indicative only; ~128k files):

| Setting | Matches |
|---|---|
| `useIgnoreFile` present | ~68k (~53%) |
| `"useIgnoreFile": true` | ~67k |
| `"indentStyle": "tab"` (explicit) | ~25k |
| `"indentStyle": "space"` | ~77k |
| `"recommended": true` | ~91k |
| `organizeImports` mentioned | ~77k |
| `includes` mentioned | ~63k |
| `extends` | ~12k |
| `"quoteStyle": "single"` / `"double"` | ~42k / ~50k |
| `lineWidth` set | ~53k |
| `"schemas/2.` (v2 schema) | ~57k |

- **Common deviations from the init output:**
  - Turn on VCS integration (`enabled`, `clientKind: git`, `useIgnoreFile: true`): about half of all configs, nearly all of which set `true` when the key exists.
  - Keep recommended rules explicit.
  - Set `files.includes`, often `["**", "!dist", ...]` or `["src/**/..."]`.
  - Set `formatter.indentStyle`. Explicit `space` outnumbers explicit `tab` about 3:1. Since `tab` is the default, many tab users omit the key, so the counts understate tab usage.
  - Set `lineWidth`.
  - Keep `organizeImports` on.
  - Few use `extends` (~10%).
- **Specific examples found in the search:**
  - `prisma/prisma-next`: `vcs` on, `files.includes ["**", "!**/dist", ...]`, space indent 2, `lineWidth` 100, `organizeImports` on.
  - A TS package template: `vcs` on, `files.includes ["src/**/*.ts"]`, assist `organizeImports` on, `extends ultracite`.
  - `mikaelbr/node-notifier` (v2.6.3): `vcs` on, `files.includes ["**", ...]`, space 2, single quotes.
- **Caveat:** I did not obtain a popularity-weighted sample of well-known libraries. A scripted sample of ~25 well-known repos by guessed path mostly returned 404, so it gave no usable evidence and is not cited.

#### 3. Pi ecosystem
- **Pi itself uses Biome.** The `earendil-works/pi` root `biome.json` (schema 2.3.5):
  - linter: `recommended: true` plus style/suspicious overrides: `noNonNullAssertion` off, `useConst` error, `useNodejsImportProtocol` off, `noExplicitAny` off, `noControlCharactersInRegex` off, `noEmptyInterface` off.
  - formatter: `enabled`, `formatWithErrors: false`, `indentStyle: tab`, `indentWidth: 3`, `lineWidth: 120`.
  - `files.includes` is an explicit list of package `src/` and `test/` globs plus `!` excludes.
  - It has no `vcs` block.
  - Pi's root `check` script is `node scripts/biome-check.mjs --write && … && tsc --noEmit && …`.
- **Pi's tests** use vitest: `"test": "vitest --run"` in `PI/package.json`, and a per-package `vitest.config.ts` (`globals`, `environment: node`, `reporters`, `env`, etc.).
- **Published `pi-package` extensions** (40 from `npm search keywords:pi-package`, 18 checked for config files):
  - Biome (4): `jayzeng/pi-memory`, `tintinweb/pi-subagents`, `heyhuynhgiabuu/pi-pretty`, `juicesharp/rpiv-mono`.
  - oxlint (3): `nicobailon/pi-mcp-adapter`, `nicobailon/pi-subagents`, `apmantza/pi-lens`.
  - ESLint (1): `MattDevy/pi-extensions`.
  - No linter config at repo root (10 of 18).
  - `tsconfig.json`: 15 of 18.
  - `vitest.config.ts`: 5 of 18.
  - `peerDependencies` on `@earendil-works/*`: confirmed in `pi-memory`, `tintinweb/pi-subagents`, `pi-pretty` (`"*"` in pi-pretty; `>=1.1.0` / `>=0.81.1` ranges in the others).
- **Biome-using extensions all copy Pi's own config shape:**
  - `pi-memory` (2.4.0): Pi's block verbatim, `includes ["**/*.ts", "!node_modules", "!.claude", "!coverage"]`.
  - `rpiv-mono` (2.5.5): the same overrides, `preset: "recommended"`, a broader `includes`.
  - `tintinweb/pi-subagents` (2.4.8): `recommended: true`, `style.recommended: false`, `formatter.enabled: false`, `includes ["src/**/*.ts","test/**/*.ts"]`.
  - `pi-pretty` (2.4.8): near-init: `assist.organizeImports on`, `recommended: true`, tab, `lineWidth 120`.
- **Local:** `pi-omlx` `biome.json` (read directly) is near-minimal: `root: true`, `vcs {enabled, git, useIgnoreFile: true}`, `files.includes ["**/*.{ts,json}"]`, formatter and linter enabled. It has no `$schema`.
- **Summary:** extension authors on Biome diverge on `lineWidth` 120 / `indentWidth` 3 (Pi's own style) versus Biome defaults. The "Pi style" values are not in `biome init`.

#### 4. vitest config
- **Default include:** `['**/*.{test,spec}.?(c|m)[jt]s?(x)']`. **Default exclude:** `['**/node_modules/**', '**/.git/**']` (vitest.dev/config/include and /exclude; `defaults.ts`). Patterns resolve from `root` (cwd).
- **Config-free works:** vitest needs no config file to run. Vitest's own docs describe a config file as optional, created when you need options.
- **Root-level files:** `test-jev-poc.mjs` does not match the default glob (no `.test.` or `.spec.` segment), and `jev-context-poc.ts` does not either. So bare `vitest run` would not pick them up, and `tests/**/*.test.ts` files would be found. A `.test.ts` or `.spec.ts` file placed in the root or elsewhere would also be picked up.
- **Community practice** (extensions above): of the 5 with a config, `pi-omlx`, `pi-mcp-adapter` and `rpiv-mono` set an explicit `include` (`test/**/*.test.ts`, `__tests__/**/*.test.ts`, `packages/*/**/*.test.ts`). `pi-pretty` and `tintinweb/pi-subagents` configure only env/server options and leave `include` default. Config-free runs are common for the rest (13 of 18 had no `vitest.config.*`, though some may use `node --test`/`bun test` instead; not verified). Pi's own package config only sets `include` through a shared base I did not read.
- **Version facts** (carried from the first report): vitest `latest` 5.1.0, requires Node `^22.12 || ^24 || >=26`; Pi itself pins 4.1.12.

#### 5. Script names
- `test`: `vitest run` (or `vitest --run`). Observed in `pi-omlx`, `tintinweb/pi-subagents`, `pi-pretty` (`vitest run --passWithNoTests`), `rpiv-mono`, and Pi's root.
- `typecheck`: `tsc --noEmit` in `pi-omlx`, `tintinweb/pi-subagents`, `pi-pretty`; `pi-jefferson` too. Pi uses `check` for the whole chain.
- `lint`: `biome check <paths>` (`pi-memory` `biome check .`; `tintinweb` `biome check src/ test/`; `pi-pretty` `biome check src/`).
- `lint:fix` is `biome check --fix …` (`tintinweb`, `pi-pretty`). `format` is `biome check --write …` in `pi-omlx`. Biome's own docs say `biome check --write` applies format, safe lint fixes and assists.
- `check` aggregates:
  - `pi-omlx`: `biome check … && tsc --noEmit && vitest run`.
  - `tintinweb`: `npm run lint && npm run typecheck && npm run test`.
  - `rpiv-mono`: `biome check --write --error-on-warnings . && tsc --noEmit …` (tests separate).
  - Pi: `biome-check --write && … && tsc --noEmit`.
- `test:watch` is `vitest` (`pi-omlx`, `tintinweb`, `pi-pretty`).

### Assumptions, Differences, and Unknowns

- **Assumed "community" means:** (a) Biome's own `biome init` and docs; (b) Pi's own repo and published `pi-package` extensions; (c) broad GitHub prevalence counts. All three are reported separately. I make no choice among them.
- **Difference from the stated style:** the init default is tab + double quotes + `lineWidth` 80 + `indentWidth` 2, which matches "tab-indented double-quoted". Pi and most Biome-using extensions set `indentWidth` 3 and `lineWidth` 120. Explicit `space` indentation is the more common explicit setting across GitHub.
- **Version divergence:** the `rules.recommended: true` form and the new `rules.preset: "recommended"` form both exist in 2.6.7. Extensions on 2.3–2.5 use the former; `rpiv-mono` (2.5.5) already uses `preset`.
- **Counts:** GitHub code-search totals are approximate, unweighted by repo quality, and double-count forks. They show direction only.
- **Unread / not checked:** the remaining ~70% of the Biome configuration reference (overrides, `javascript`/`json` sections); the vitest `include` setting in Pi's `vitest.base.ts`; whether the 13 extensions without `vitest.config.*` use another runner; `.npmignore` / `files` practice and the `$schema` local-path versus URL form beyond the cases seen.
- No install, run of `biome`, or `biome init` was executed; the init output comes from the docs page, not a local run.
