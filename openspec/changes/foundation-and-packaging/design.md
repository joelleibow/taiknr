# Design

## Context

`proposal.md` gives the motivation. What shapes the approach is the state of the tree and the constraints on it.

The repository is stub-stage: fifteen tracked `src/` files, an `ARCHITECTURE.md`, two accepted ADRs, two root proof-of-concept files, and no `package.json`, `tsconfig.json`, `.gitignore` or harness. `tests/` exists on disk, empty and untracked (Eleanor §1; Trap 6). Nothing can be loaded, type-checked or tested.

Two measured facts drive everything below.

1. **The handler stubs throw at load.** All seven `register*Handler` bodies are `throw new Error("Not implemented: …")`, so a load of `src/app/extension/taiknr.ts` fails in the factory (Trap 1). "Loads cleanly" is unreachable without editing those bodies, which is why Joel answered Q1(a).
2. **No `lineWidth` leaves `HEAD` formatted.** The formatter reflows 11 `src/` files at 80, 9 at 90, 1 at 100, 4 at 110 and 4 at 120 (R1's sweep), so `npm run check` is red on a freshly configured tree unless a one-time format pass runs first (R3).

Constraints that bind the design, all recorded in `michael-orientation.md` §1–§2 and `owner-rulings.md`:

- D1: the card is the request; its details are proposals until Joel confirms them. Joel confirmed the stack (`Biome + tsc + vitest`, Q3(b)), answered Q1(a) and Q2(a), ruled `lineWidth` 120, and stated the standing principle that decisions reflect community practice.
- D3 / ADR 0001: `src/domain/` and `src/use-cases/` import nothing from `@earendil-works/pi-*`, and their tests run with no Pi runtime.
- The seven handler public signatures, the adapter and port contracts, and `src/app/extension/taiknr.ts` as the single manifest entry are fixed; the next cards implement behind them.
- Joel's `~/.pi/agent/settings.json` and its chezmoi source, `jev-context-poc.ts`, `test-jev-poc.mjs`, the sibling packages and `.pi/` are outside this change.
- D2: documentation never blocks the feature, so `ARCHITECTURE.md` §8 and the deferred-boundary note are docs-pass work (Migration Plan).

Michael's eleven rulings (R1–R11) settle every open question the council raised, and Joel ruled the last knob. This design carries those rulings rather than re-arguing them; where a ruling measured a value, the value below cites it.

**Citation key.** `D1–D7`: binding decisions, `michael-orientation.md` §1. `Trap 1–9`: measured traps, `michael-orientation.md` §3. `S1–S8`: settled items, `michael-orientation.md` §5. `R1–R11`: Michael's council rulings 1–11 in `michael-council-rulings.json`. `OD-1`: the owner decision in `council.md`, answered in `owner-rulings.md` 'Biome line width'. Council lens findings: `CR-n` critic, `F-n` structural, `R-nn` readiness, `CAT-n` catalyst, `C-n` comprehension, `ZO-n` zoom-out, `CC-n` codebase, each in `council-<lens>.md`. `Chidi §n` / `Chidi addendum §n` / `Eleanor §n`: `research-chidi.md` / `research-eleanor.md`. Where an ID is used as authority below, the operative content is stated in place.

## Goals / Non-Goals

**Goals:**

- Write the five root configuration files with the content fixed in Decisions 1, 7, 8, 10 and 11, plus a committed `package-lock.json`, so `npm install && npm run check` is reproducible from a clean checkout.
- Make Pi 1.5.2 load the package's single entry point without error, with the seven event names type-checked and asserted.
- Give the load path an automated pass/fail signal inside `npm run check`, and a manual load check that fails visibly when discovery or dependency placement breaks.
- Keep the handler signatures, the import boundary, the single manifest entry and the proof-of-concept files exactly as they are.
- Leave the tree in one formatter style, so the first real feature card starts from a green `check`.

**Non-Goals:**

- No archival, config-loading or classifier-recall behavior; the handlers register no-op and nothing else.
- No lint rule enforcing ADR 0001's import boundary (S7) — recorded as deferred.
- No publishing path: `npm pack` and `npm publish` are out of scope, and the metadata they need is omitted (Decision 9).
- No `format` or `lint:fix` script (Decision 3), no `.git-blame-ignore-revs` (Decision 12), no CI configuration.
- No edit to `jev-context-poc.ts`, `test-jev-poc.mjs`, Joel's settings, the dotfiles source, the siblings or `.pi/`.
- No `tsconfig.json` option beyond the measured set (Decision 10).

## Module & File Placement

No new `src/` module. Every new file is either root tooling configuration or a test.

**Root configuration files.** All six must sit at the package root because the tools that read them resolve from the working directory by convention: npm reads `package.json` and the lockfile; `tsc` reads `tsconfig.json`; Biome and vitest read their configs from the root by default; and Pi resolves each `pi.extensions` path against the package root (Chidi §1, §4). None can live under `src/` without a flag on every invocation.

| File | Single responsibility |
|---|---|
| `package.json` | The package's identity for local loading: manifest entry, dependency placement, the four scripts (Decision 8, 9) |
| `package-lock.json` | The exact resolution of the measured tool versions (Decision 5) |
| `tsconfig.json` | The `tsc --noEmit` program: source, tests, and the proof-of-concept exclusion (Decision 10) |
| `biome.json` | Lint and format baseline plus file scope (Decisions 1, 2) |
| `vitest.config.ts` | The test discovery boundary (Decision 7) |
| `.gitignore` | The clean-tree baseline (Decision 5) |

The configuration blocks in Decisions 1, 7, 8, 10 and 11 fix **content**: keys, values and order. Whitespace in every file on the allowlist is whatever the one-time format pass (Decision 3) produces under `biome.json`: tab indentation, and short arrays such as `files.includes` collapsed to one line at width 120. A reviewer compares the written files to the blocks by content, not by byte.

**Test files.** `tests/` stays at the root, outside the extension entry's directory: both siblings keep a root test directory (Eleanor §2), and keeping tests out of `src/` keeps the composition root free of test-only code.

| File | Single responsibility | Layer |
|---|---|---|
| `tests/app/extension/taiknr.test.ts` | Assert that the entry's default export registers exactly the seven event names, with no Pi runtime | Mirrors `src/app/extension/`; imports inward through `taiknr.js` |
| `tests/domain/archived-output.test.ts` | Assert `shouldArchive(rawTextLength: number, minCharsToArchive: number): boolean` (src/domain/archived-output.ts, body `rawTextLength >= minCharsToArchive`) through the `.js` specifier chain: `shouldArchive(9, 10)` is `false`, `shouldArchive(10, 10)` is `true` (at the threshold archives), `shouldArchive(11, 10)` is `true`. Mutation that must turn it red: `>=` → `>` (R5). | Mirrors `src/domain/`; imports inward, no Pi types anywhere in the chain |

Two files, not one, because the two assertions belong to different layers and only one of them may touch Pi types (D3). A single file under `tests/app/` would pull the Pi-typed entry into the same module as the domain assertion, and the point of the domain test is that it runs in plain Node (ADR 0001 Consequences; R5).

**Modified source files.**

| Files | Change | Responsibility unchanged |
|---|---|---|
| The seven `src/infra/pi-event-handlers/*.ts` | One stub body each, replaced by a no-op registration | Each handler still owns the translation for its one lifecycle event |
| `src/infra/adapters/pi-archive-adapter.ts`, `src/infra/adapters/pi-jev-scorer-adapter.ts`, `src/infra/pi-event-handlers/tool-call.ts`, `src/use-cases/commit-archived-batch.ts` | Formatter whitespace only, from the one-time pass at `lineWidth` 120 (R1, R3) | Unchanged |

`tool-call.ts` appears in both rows: it is one of the four files the 120-width formatter reflows, which is why "only the stub bodies differ" is false even at the widest candidate (R3's evidence).

Dependencies keep pointing inward. Tests import `src/` modules through their `.js` specifiers; nothing in `src/` imports a test; and the new `tests/domain/` test sits on a chain with no `@earendil-works/pi-*` import, so D3 stays measurable.

**The event mapping.** One canonical table, which the seven stub bodies and the entry test both read:

| Handler file | Event name |
|---|---|
| `session-start.ts` | `session_start` |
| `session-tree.ts` | `session_tree` |
| `session-compact.ts` | `session_compact` |
| `tool-call.ts` | `tool_call` |
| `turn-end.ts` | `turn_end` |
| `agent-before-settle.ts` | `agent_before_settle` |
| `context.ts` | `context` |

All seven exist as `on(event: "…")` overloads in Pi 1.5.2 (D4; R6).

## Decisions

### 1. Biome baseline: `biome init` 2.6.7, plus VCS integration, the scoped file list, and `lineWidth` 120

`biome.json`'s content is fixed in the block below; every value traces to a source.

```json
{
  "$schema": "https://biomejs.dev/schemas/2.6.7/schema.json",
  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true
  },
  "files": {
    "ignoreUnknown": false,
    "includes": [
      "src/**",
      "tests/**",
      "package.json",
      "tsconfig.json",
      "biome.json",
      "vitest.config.ts"
    ]
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "tab",
    "lineWidth": 120
  },
  "linter": {
    "enabled": true,
    "rules": {
      "preset": "recommended"
    }
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "double"
    }
  },
  "assist": {
    "enabled": true,
    "actions": {
      "source": {
        "organizeImports": "on"
      }
    }
  }
}
```

| Setting | Source |
|---|---|
| `$schema` 2.6.7 | `biome init` output and Biome's install docs (Chidi addendum §1); the exact version R7 pins |
| `vcs.enabled`, `clientKind: "git"`, `useIgnoreFile: true` | Biome's documented VCS guidance, about 53% of configs (Chidi addendum §1–§2); settled by R1 and kept despite not being the scope mechanism (R2) |
| `files.ignoreUnknown: false` | `biome init` output (Chidi addendum §1) |
| `files.includes` (six entries) | R2, verbatim |
| `formatter.enabled`, `indentStyle: "tab"` | `biome init` output (Chidi addendum §1) |
| `formatter.lineWidth: 120` | Joel's ruling (OD-1; `owner-rulings.md`, "Biome line width"); R1's measured deviation from init |
| `linter.enabled`, `preset: "recommended"` | `biome init` output (Chidi addendum §1); R1 rules out every override |
| `javascript.formatter.quoteStyle: "double"` | `biome init` output (Chidi addendum §1) |
| `assist.actions.source.organizeImports: "on"` | `biome init` output (Chidi addendum §1); R1 keeps it on |

`lineWidth: 120` is the **only** deviation from the `biome init` 2.6.7 output, which is the point of R1: the spec's "every non-default setting traces to a named source" scenario has exactly one entry. `indentWidth` is not written, because init's default of 2 stands and Pi's 3 measured identical formatter output on this tree (R1).

**Alternatives weighed.** Pi's block (`indentWidth: 3` plus six rule overrides) — identical format output here and zero lint diagnostics with or without the overrides, so it fails the deletion test (R1). GitHub-majority space indentation — re-indents every line of every `src/` file for a knob whose default is already tab (R1). Init verbatim, with VCS off and no `files.includes` — unworkable: without a file list Biome checks 45 files including every `.md` under `docs/adr/` and `openspec/changes/`, both proof-of-concept files and `.pi/` (R2's measurement). `lineWidth` 80, 90, 100 or 110 — all cost more reformatting than 120 and buy no adoption alignment, because `biome.json` never ships to a consumer (R1; F1's note).

### 2. Lint scope is a positive `files.includes` allowlist

The allowlist is the six entries above: `src/**`, `tests/**`, and the four root files Biome reads. It is the only mechanism that carries the scope on a fresh clone, where `.git/info/exclude` (which holds the local `.pi/` exclusion) does not exist.

**Alternatives weighed.** Negative globs on the two proof-of-concept filenames — unnecessary once the allowlist exists, and it puts frozen files' names into a config the next card will read (R2). `!!` force-ignores — same objection, plus they hide paths from the scanner entirely (R2). Relying on `vcs.useIgnoreFile` alone — measured to honour `.git/info/exclude`, contrary to the lenses' assumption, but that file is local-only, so a fresh clone would lint `.pi/` (R2). Scoping only the CLI script — leaves editor LSPs scanning the root (CAT-1).

**Cost accepted:** an allowlist fails open. A new top-level directory is silently outside Biome until it is listed. Named in Risks 1.

### 3. One-time format pass, first, reviewed as whitespace-only; no permanent writer script

The format pass is `npx biome check --write .` — scoped by `files.includes` to `src/**`, `tests/**` and the four root config files — run once after the six root files are written and `npm install` has completed, and before any handler edit. Measured on this tree it rewrites exactly seven files: the four `src/` files named in the modified-files table and `biome.json`, `package.json`, `tsconfig.json` (tabs, and `files.includes` on one line). The change is a commit of its own whose diff is read as whitespace alone; the four root files are new in that commit, so they are reviewed against their Decision blocks by content. `npm run lint` stays `biome check .` and read-only, and nothing in the `check` chain passes `--write` (R2). No `format` or `lint:fix` script is added: nothing in this change needs a permanent writer after the pass, and R2 permits such a script without requiring one.

**Alternatives weighed.** No format pass — `npm run check` is red on its own first run, under every candidate width (R3). Folding the pass into the stub edits — a reviewer can no longer separate whitespace from behavior, which is exactly what the reworded "Signatures unchanged" scenario guards. A narrower width to shrink the pass — no width leaves the tree untouched (R1's sweep), so this trades one cost for a larger one.

### 4. The no-op registration keeps `HEAD`'s `_pi` parameter name

Each stub body becomes `_pi.on("<event>", () => {});` with the event from the mapping table, and nothing else in the function changes. Q1(a)'s `pi.on(...)` is shorthand for calling `.on` on the handler's Pi parameter; the parameter keeps its `HEAD` name, so the line the signature guarantee compares does not move (R3).

**Alternatives weighed.** Renaming `_pi` to `pi` — `_pi.on("<event>", () => {})` type-checks and passes the `recommended` preset with zero diagnostics, so the rename buys nothing and costs the signature guarantee (R3). Normalizing `_`-prefixed unused parameters — the preset reports nothing on the stubs before or after the edit (R3), and it creates rename-back work for later cards (CAT-2). Q1(b)'s bare `return` — the same size as the chosen option and proves less: no event name reaches `tsc`, so a wrong-but-valid name would go unnoticed.

### 5. npm is the package manager and `package-lock.json` is committed

The lockfile fixes the exact resolution of every tool the checks run, which matters because the load and type checks verify event names and types against whatever `@earendil-works/pi-coding-agent` resolves to (R4; R7). It is not added to `.gitignore`, and Biome needs no exclusion for it (ignored by default, R2).

**Alternatives weighed.** Ignoring the lockfile the way `pi-omlx` does — the outlier against npm's documented default and Pi's own practice, which commits it (R4). pnpm with `pnpm-lock.yaml` like `pi-jefferson` — no ruling or measurement asks for a second package manager, and every script in the specs already says `npm run`. Sanitizing `.npmrc` or pinning via `overrides` — nothing measured needs either.

### 6. The load path gets two guards, and neither is production code

- **In-repo guard:** `tests/app/extension/taiknr.test.ts` invokes the default export with a Proxy fake whose only member is `on` (any other member access throws) and asserts the sorted list of registered names equals exactly the seven. It runs inside `npm run check`, needs no Pi runtime (every Pi import in `src/` is `import type`), goes red against `HEAD`'s throwing stubs and green after the no-op edit, and catches a valid-but-wrong event name that `tsc` accepts (R6).
- **Manual load check**, run against a throwaway copy of the committed tree and asserting on text, never on an exit code:

  Prerequisites unchanged (Node 26.8.1, npm 11.19.0, Pi 1.5.2 via `pi --version`, `rg`). The check runs against a throwaway copy of the committed tree, never the live checkout, so it needs no clean-tree precondition and no revert; commit the stub edits first.

  ```
  D=$(mktemp -d)
  git archive HEAD | tar -x -C "$D"
  printf '{"packages":[%s]}' "$(node -p 'JSON.stringify(process.argv[1])' "$D")" > "$D/settings.json"
  PI_CODING_AGENT_DIR="$D" pi --no-session --help > "$D/out.txt" 2>&1
  head -1 "$D/out.txt"
  rg -c 'Failed to load extension|Host-provided extension packages' "$D/out.txt"
  ```

  (`$D` is both the package root Pi loads and the throwaway agent directory; Pi reads only `settings.json` from the agent directory and only `package.json` and `pi.extensions` from the package, so sharing one directory is safe.)

  Pass rule unchanged, all three: usage header printed; `rg -c` prints nothing and exits 1; both controls print `1`. In detail: (1) `head -1` prints Pi's usage header, `pi - AI coding assistant …` (proof Pi ran; a missing or failing `pi` prints something else or nothing); (2) `rg -c` prints nothing and exits 1 (no match); (3) both negative controls below print a count of 1. Any other output is a failure.

  Discovery is proven by two negative controls, run after the positive run, each inside `$D` and each undone by re-extracting the archive before the next step, whether or not it passed:

  - Control A (load error): in `$D/src/infra/pi-event-handlers/session-tree.ts` replace `_pi.on("session_tree", () => {});` with `throw new Error("Not implemented: registerSessionTreeHandler");`, re-run the `pi` line, `rg -c 'Failed to load extension' "$D/out.txt"` → `1`. Undo by re-extracting: `git archive HEAD | tar -x -C "$D"`.
  - Control B (dependency placement): in `$D/package.json` add `"dependencies": { "@earendil-works/pi-coding-agent": "*" }`; no `npm install` (Pi reads the manifest's `dependencies` object directly at load, so the lockfile and `node_modules/` are untouched); re-run the `pi` line, `rg -c 'Host-provided extension packages' "$D/out.txt"` → `1`. Undo by re-extracting as above.

  Cleanup: `rm -rf "$D"`. The live checkout is never read by Pi and never modified. Record `pi --version` with the result.
- **Domain guard:** `tests/domain/archived-output.test.ts` as specified in the test table. `test` and `expect` are imported from `vitest` (no globals, Decision 7). It is shown to catch a mistake once, by the `>=` → `>` scratch mutation, then the mutation is reverted.

**Alternatives weighed.** Relying on the `--help` exit code — measured 0 whether or not an extension failed to load, so it cannot fail (R6). Passing `-ne` on the packages route — `-ne` disables configured packages, and with it a throwing stub produced no error at all, which makes the command vacuous; that is why the readiness review's literal `pi -ne --help` form is rejected (R6). A non-interactive run (`--mode json`) — exits 1 on load failure but costs a model call (R6). Relying on `tsc` for the event names — it accepts `session_before_tree`, a real Pi event, so it cannot catch a wrong registration (R6). Treating the in-repo guard as the production mechanism — it is a test; the entry still calls `.on` and nothing else (R6).

### 7. `vitest.config.ts` sets `test.include` and nothing else

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		include: ["tests/**/*.test.ts"],
	},
});
```

This makes the development-checks invariant true as written — the test command runs only files under `tests/` — rather than true by accident, and it mirrors `tsconfig.json`'s `include` (R10). The file is listed in `files.includes` by name, not through a `*.ts` glob, which would admit `jev-context-poc.ts`.

**Alternatives weighed.** Config-free `vitest run` — passes today only because neither proof-of-concept filename contains a `.test.` segment, so a stray root `*.test.ts` would join the suite (F5; R10). `vitest run tests` with no config file — works, but leaves the invariant unstated in a file (CAT-1; R10). Copying Pi's package config, including `globals: true` — tests written against bare `describe` would then fail `tsc --noEmit` under `types: ["node"]`, so the tests import from `vitest` explicitly (CR-9; R7).

### 8. `package.json` content fixed

```json
{
  "name": "pi-taiknr",
  "type": "module",
  "pi": {
    "extensions": [
      "./src/app/extension/taiknr.ts"
    ]
  },
  "scripts": {
    "lint": "biome check .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "check": "npm run lint && npm run typecheck && npm run test"
  },
  "peerDependencies": {
    "@earendil-works/pi-coding-agent": "*"
  },
  "devDependencies": {
    "@biomejs/biome": "2.6.7",
    "@earendil-works/pi-coding-agent": "^1.5.2",
    "@types/node": "^22",
    "typescript": "^7.0.2",
    "vitest": "^5.1.0"
  }
}
```

| Field | Source |
|---|---|
| `name: "pi-taiknr"` | S1 (settled package shape: name `pi-taiknr`, `"type": "module"`, `pi.extensions` naming the single entry, peer `*` + dev `^1.5.2`, no `dependencies`); npm takes the lockfile root name from this field (consult measurement of a version-less manifest) |
| `"type": "module"` | S1; D6 (the source at HEAD is ESM with `.js` specifiers on `.ts` files — 47 relative imports — so the package must be `"type": "module"`) |
| `pi.extensions: ["./src/app/extension/taiknr.ts"]` | S1; R11 (manifest scenario reworded to what the repository controls); Chidi §1, §4 (Pi loads only the manifest's listed entries) |
| `lint: "biome check ."` | R2 — read-only, and the `files.includes` allowlist makes the `.` safe |
| `typecheck: "tsc --noEmit"` | S2; Chidi addendum §5 |
| `test: "vitest run"` | Chidi addendum §5 — observed in `pi-omlx`, `pi-pretty`, `pi-subagents`, `rpiv-mono` and Pi's own root; R10 |
| `check`: the three in order | The development-checks requirement; Chidi addendum §5 (`pi-omlx`'s chain) |
| `peerDependencies: { "@earendil-works/pi-coding-agent": "*" }` | Chidi §1 (`packages.md` § Declare dependencies); Trap 3 |
| `devDependencies` Pi entry `^1.5.2` | S1; Trap 9 — for `tsc` only, since Pi maps host packages to its own copies at runtime |
| `devDependencies` `@biomejs/biome: "2.6.7"`, exact | R7, following Biome's documented `npm i -D -E`; Chidi addendum §1 |
| `devDependencies` `typescript: "^7.0.2"`, `vitest: "^5.1.0"`, `@types/node: "^22"` | R7 — each measured green on this tree, with the lockfile fixing the exact resolution |
| No `dependencies` | Chidi §1 — the only field the host-provided-package warning inspects |

No `engines`: R7 rules it out, and nothing breaks without it.

**Alternatives weighed.** `typescript ^5.9.3` — both majors pass, so the community's current choice and Pi's own devDependency win (R7). `--error-on-warnings` in `lint` — default Biome exit behaviour is the community behaviour, one extension of five uses the flag, and nothing here needs it (R9). A single `check` that inlines `npx biome check .` — the named scripts are what the spec's requirements and the user's habits both address (Chidi addendum §5).

### 9. Publishing metadata is omitted, deliberately

`version`, `keywords`, `description`, `license`, `files`, `private` and `engines` are not written. Nothing in this change reads any of them: Pi identifies a local package by resolved absolute path and inspects only `dependencies` for its warning (Chidi §1); npm writes a lockfile from a version-less manifest (Michael's consult measurement of exactly this field set in a `git archive` copy: `npm install` exit 0, lockfile root `{"name":"pi-taiknr"}`, no warning at `--loglevel=warn`, and Pi 1.5.2 loaded the package through a `packages` entry with empty stderr); and the `pi-package` keyword only makes an npm-*published* package eligible for the pi.dev gallery, which Pi's loader never reads (Chidi §1). The publishing card adds them with real values. The licence is already chosen: the repository's first commit carries an MIT `LICENSE` (owner-rulings.md, "Repository and package name"), which is the one home for that fact in this change; `"license": "MIT"` is written into `package.json` by the publishing card together with `version`, because nothing in this change reads the field.

This supersedes one item of S1 — S1 had listed `"keywords": ["pi-package"]` in the package shape — which Michael's consult corrected: keeping the keyword while omitting `version` would be inconsistent, since both serve the same consumer — npm publishing — and that consumer is a later card.

**Alternatives weighed.** `"version": "0.0.0"` and `"private": true` as placeholders — the shape earlier measurements used, but a value no ruling supplies and a version that would have to be corrected; the version-less manifest is measured to install and load (see above). Keeping only `keywords` — the inconsistency above. `"files"`/`.npmignore` — nothing is published, so there is nothing to narrow.

**Consequence accepted:** `npm pack --dry-run` fails with "Invalid package, must have name and version" until the publishing card lands. That failure is outside `npm run check` and outside this change's acceptance (Risks 8).

### 10. `tsconfig.json` is exactly S2's measured option set

```json
{
  "compilerOptions": {
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "types": ["node"]
  },
  "include": ["src/**/*.ts", "tests/**/*.ts"]
}
```

Every key is S2's (S2: `module`/`moduleResolution: nodenext`, `strict`, `noEmit`, `skipLibCheck`, `types: ["node"]`, `include` of `src/**/*.ts` and `tests/**/*.ts`, root PoC excluded), and that exact set measured `tsc --noEmit` exit 0 with zero errors on this tree (Trap 2), under both TypeScript 5.9.3 and 7.0.2 (R7). The config serves `tsc` only — the installed Pi's loader ignores it (Chidi §2).

The proof-of-concept exclusion is carried by `include`, not by `exclude`: `jev-context-poc.ts` sits at the root and matches neither pattern, so adding an `exclude` entry would state the same fact twice (feature-spec standard §1). `vitest.config.ts` is outside the program for the same reason it is in Biome's list by name: S2's `include` covers `src/` and `tests/`, and widening it is a measured change nobody asked for.

**Alternatives weighed.** Adding `target`, `lib` or `verbatimModuleSyntax` — each is a value no ruling or measurement supplies, and the measured zero-error run did not have them. Adding the root PoC to `exclude` explicitly — redundant with `include`. `bundler` module resolution like `pi-omlx` — this package runs under Node's ESM rules with `.js` specifiers, and `nodenext` is what measured green (D6; Trap 2).

### 11. `.gitignore` content fixed

```
node_modules/
*.tgz
.DS_Store
```

S3's three entries (`node_modules/`, `*.tgz`, `.DS_Store`) and no more. No `.pi/` entry, because it is excluded locally through `.git/info/exclude` and the conductor owns what lives there (Trap 5). No `package-lock.json` entry, because the lockfile is committed (R4).

**Alternatives weighed.** Ignoring the lockfile (R4, rejected above). Adding `.pi/` "just in case" — re-decides a local, uncommitted exclusion the change is told not to touch (Trap 5). Adding `coverage/` or editor directories — nothing in this change produces them, and a setting exists only when something sets it differently (zoom-out standard §3).

### 12. The import-boundary lint stays deferred, and the format pass gets no blame-ignore file

ADR 0001's "enforce the import boundary during checks" is not this card (S7). Adding a Biome rule now would put an override into a config whose whole point is that it has none (R1), and there is no code in `src/domain/` or `src/use-cases/` that could violate it today.

`.git-blame-ignore-revs` was offered as a mitigation for the format pass shifting line-level blame (CAT-2). No ruling requires it, it is not in the proposal's file list, and four files lose only parameter-list line breaks, so it is not adopted; its absence is recorded in Open Questions rather than decided silently.

**Alternatives weighed.** A Biome `noRestrictedImports` override now — a rule with nothing to catch, against R1's no-overrides baseline. A separate boundary check script — a second tool for one grep, when the spec asks for deferral, not a stand-in.

### 13. The proof-of-concept scenario is read as "not collected"

C5 left one wording open: whether the test requirement should read "no live model or classifier call is made" or "the proof-of-concept files are not collected". This design adopts the collected reading as the verifiable one — the runner's file set is observable, a live model call is not — and keeps the no-call outcome in the spec as its consequence (development-checks, "Proof of concept not collected"). The explicit `test.include` is what makes that reading checkable without running anything.

## Risks / Trade-offs

1. **A new top-level source directory is silently unlinted.** Someone adds `scripts/…` later; `biome check .` skips it and no scenario notices. → The six `files.includes` entries are written in this document and in the development-checks lint requirement, and the "A new source file is inside the scope" scenario keeps `src/` and `tests/` covered without an edit; a new top-level root is a one-line config change with a spec-visible reason.
2. **The settings entry is active while the checkout is behind this change.** Every Pi session in every project prints `Failed to load extension … Not implemented: registerSessionStartHandler`; interactive sessions continue, but `--print` and `--mode json` runs exit 1. → Migration Plan steps 3–4: remove the entry before reverting or checking out an earlier commit. The manual check never loads the live checkout (Decision 6 runs against a `git archive` copy), so re-running it after step 2 cannot trip this.
3. **`pi --help` exits 0 on a failed load.** A green exit code could be read as a good load. → The manual check asserts on stderr text, and the in-repo guard turns red inside `npm run check` (Decision 6). The manual check requires Pi's usage header as positive proof that Pi ran, because a filtered pipeline is silent on a missing command too.
4. **A handler registers a valid-but-wrong event name.** `session_before_tree` exists in Pi 1.5.2's types, so `tsc` passes while Pi never invokes the handler. → The entry test compares the sorted list against exactly seven names, and was measured red on that exact substitution (R6).
5. **The format pass hides a behavior change.** Whitespace and stub edits land together; review can no longer see the second. → Format pass over the whole allowlist first (Decision 3), its `src/` diff reviewed as whitespace-only and the root configs reviewed against their blocks by content; handler edits second. The ordering is a task sequence, not a migration step.
6. **The format pass shifts line-level blame on four files.** `git blame` attributes their parameter lists to this change. → Accepted: four files, all parameter-list collapses, with `.git-blame-ignore-revs` recorded as an open, unadopted option (Decision 12).
7. **A revert leaves build leftovers on disk.** After a revert, `.gitignore`'s `node_modules/` entry is gone with it, so `node_modules/` and `package-lock.json` show as untracked. → Migration Plan step 5: delete both by hand.
8. **`npm pack` fails on a version-less manifest.** A later attempt to pack prints "Invalid package, must have name and version". → Accepted and named: packing and publishing belong to the publishing card, which writes real metadata (Decision 9); `pi install` loads a local checkout without publishing (Chidi §1).
9. **A warning-only lint violation passes `check`.** `noUnusedVariables` reports at warn severity and `biome check` exits 0. → Accepted by ruling: the scenario covers error-severity rules and formatting only, and no `--error-on-warnings` is added (R9).
10. **A test written outside `tests/` never runs.** With the explicit include, it is silently absent from the suite. → The include line and the rule that tests live under `tests/` with a `*.test.ts` name are both written down, in `vitest.config.ts` and in the development-checks requirement.
11. **Tool majors drift on a fresh clone without the lockfile.** A deleted or uncommitted `package-lock.json` lets `typescript` and `vitest` move majors under a green check. → The lockfile is committed and a scenario asserts it is tracked (R4, R7).
12. **The 120-width choice is only as stable as its measurement.** A future file with a 130-column line makes plain `check` red on formatting no one wrote by hand. → Expected behavior, not a defect: formatting is part of `check` (R2), and the fix is a deliberate `--write` run over the scoped files, not a change to the configuration.

## Migration Plan

Joel's Q2(a) puts the settings edit outside the repository and outside this change. The order below is recorded so the hand-off cannot invert the two.

1. **Merge the change.** Nothing that does not load the package changes behavior; `npm install && npm run check` is green from a clean checkout that carries the lockfile.
2. **Joel adds `"../../Projects/pi-taiknr"` to `packages` in `~/.pi/agent/settings.json`** — and in the chezmoi source `dotfiles/home/dot_pi/private_agent/settings.json` — himself, after the gate (Q2(a)). Relative paths in settings resolve from `~/.pi/agent`, so this form matches the two existing sibling entries (Trap 8; R8). From that moment the extension loads in every Pi session in every project and registers seven no-op handlers. This step is Joel's and is not a ticked task.
3. **Rollback order: remove the settings entry first, then revert the change.** Reverting first leaves every session trying to load a package whose entry throws.
4. **Do not switch the checkout below this change while the entry is active.** A pre-change commit turns every Pi session start into a `Failed to load extension … Not implemented` diagnostic: interactive sessions continue, `--print` and `--mode json` runs exit 1 (R8's measurement).
5. **After a revert, delete `node_modules/` and `package-lock.json` by hand.** The reverted `.gitignore` no longer covers `node_modules/`.
6. **Post-merge hand-off — the docs pass (D2).** Correct `ARCHITECTURE.md` §8's stated reason for a root `tests/` directory, which is false for a manifest-driven layout (S8; Trap 7); record the import-boundary lint as deferred in the architecture record and, if the project keeps one, in the ADR set (S7). Documentation never blocks the feature.

## Open Questions

1. **`.git-blame-ignore-revs`.** Offered by the catalyst lens (CAT-2) and not adopted here (Decision 12) without being rejected: adopting it later changes no requirement and no check, since it only points at the format commit's hash.
2. **The mechanism for the import-boundary lint.** Deferred (S7). Whether it lands as one Biome rule override or a separate check is the later card's choice; nothing here depends on which.
3. **The publishing metadata values.** `version`, `description` and `files` are the publishing card's to write with real values (Decision 9). `license` is settled as MIT (the root `LICENSE` file); the publishing card copies it into `package.json`.
