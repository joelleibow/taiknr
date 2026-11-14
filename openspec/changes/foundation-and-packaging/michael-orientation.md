# Michael — Orientation for foundation-and-packaging

Consult, not a gate. Approves nothing; every gate still runs.

Inputs read in full: `owner-rulings.md`, `research-chidi.md`, `research-eleanor.md`, `brief-research.md`, `ARCHITECTURE.md`, ADR 0001, ADR 0002. Measurements below were made in a `mktemp -d` copy of `HEAD` (`git archive`), with its own `npm install`, and a throwaway `PI_CODING_AGENT_DIR`; nothing in the checkout, `~/.pi/agent/` or dotfiles was touched, and the copy is removed. One measurement had a cost outside the repository; see Trap 4.

## 1. Decisions that bind this change

| # | Decision | Where made | Kind |
|---|----------|------------|------|
| D1 | Run the **Foundation and packaging** card through Conductor Janet. The card's body (dependency layout, test runner, settings entry, acceptance criteria) is the request, not a ruling. | `owner-rulings.md`, 2026-11-14 | Joel's ruling |
| D2 | Documentation never blocks a feature. | Joel's standing ruling (agent file) | Joel's ruling |
| D3 | `src/domain/` and `src/use-cases/` import nothing from `@earendil-works/pi-*`; Pi types enter via `src/infra/pi-event-handlers/` → `src/infra/adapters/`. | ADR 0001 (Accepted) | Standing record. **Measured honored at `62d3330`**: `rg` over `src/` finds the Pi import in `src/app/extension/taiknr.ts`, 4 adapters, 7 handlers, and in no `domain`/`use-cases` file. |
| D4 | Archive/recall mechanism and the seven lifecycle events (`session_start`, `session_tree`, `session_compact`, `tool_call`, `turn_end`, `agent_before_settle`, `context`). | ADR 0002 (Accepted) | Standing record. **Measured**: all seven exist as `on(event: "...")` overloads in Pi 1.5.2 `dist/core/extensions/types.d.ts` lines 1231–1266. |
| D5 | `cli/` and `mcp/` entry points are future work. | `ARCHITECTURE.md` §9; card "Out of scope" | Standing record + proposal, consistent; nothing contradicts it. |
| D6 | Module style is ESM with `.js` specifiers on `.ts` sources (47 relative imports in `src/`). | Code at `HEAD` | Standing record in code. Any `tsconfig.json` and test runner must resolve this form (see Settled S2). |
| D7 | OpenSpec schema `marbleization`, no custom rules. | `openspec/config.yaml` at `HEAD` | Standing record. |

Everything else in the card is a proposal (D1). Provenance note: `ARCHITECTURE.md` §5/§6/§8 restate the card's Pi-platform claims in the card's words; both were Janet-drafted. They are one assertion written twice, not two sources. Chidi's report is the first provenance for any of them.

## 2. What the change must not touch or foreclose

- **`src/domain/` and `src/use-cases/` contents** (D3). No `tsconfig` option, lint rule or test layout may require a Pi import there. Tests for those layers run in plain Node with no Pi runtime (ADR 0001 "Consequences").
- **The seven handler files' public signatures** (`register*Handler(pi, …)`) and the adapter/port contracts: the next cards implement behind them. This card may only make them loadable (Q1), not reshape them.
- **`src/app/extension/taiknr.ts` as the single manifest entry.** Do not add `index.ts` at the package root or an `extensions/` directory; either would change which files Pi's fallback discovery would consider (Chidi §4).
- **Joel's `~/.pi/agent/settings.json` and its chezmoi source** `dotfiles/home/dot_pi/private_agent/settings.json` (plain JSON, identical content per Eleanor §3). Outside the repository; Joel's (Q2).
- **`jev-context-poc.ts` and `test-jev-poc.mjs`**: `ARCHITECTURE.md` says they "preserve the original proof of concept". This card neither deletes nor edits them; it keeps them out of the type-check and test globs (Trap 4).
- **Sibling packages `pi-jefferson`, `pi-omlx`**: references only.
- **`.pi/`** is excluded via `.git/info/exclude` (local, uncommitted). The new `.gitignore` need not and should not re-decide what the conductor tracks there.

## 3. Traps (measured where I could)

1. **The stubs throw at load.** All 7 `register*Handler` bodies are `throw new Error("Not implemented: …")` (20 such throws across `src/`). Measured with Pi 1.5.2 in the copy: both `pi -ne -e <copy>/src/app/extension/taiknr.ts` and `pi -ne -e <copy>` (manifest route) fail with `Failed to load extension … Not implemented: registerSessionStartHandler`. The card's "loads cleanly" criterion is unreachable without touching the stub bodies → Q1.
2. **`.js` → `.ts` specifiers resolve everywhere that matters.** Measured: jiti loaded the whole module graph (the failure in Trap 1 is inside the factory, after resolution); `tsc --noEmit` with `module`/`moduleResolution: nodenext`, `strict`, `include: ["src/**/*.ts"]`, `@earendil-works/pi-coding-agent@1.5.2` + `@types/node` installed → **exit 0, zero errors**; Node 26.8.1 `import("./src/use-cases/stage-tool-outputs.ts")` resolves its `../domain/archived-output.js` import. This closes Chidi's two "unverified" items (jiti resolution; whether the stubs type-check) and confirms `SessionEntry` is exported (`dist/index.d.ts` line 21).
3. **`pi -e` cannot observe the duplicate-dependency warning.** Measured: with `@earendil-works/pi-coding-agent` deliberately placed in `dependencies`, `pi -ne -e <copy> --help` printed no warning; the same package listed under `packages` in a throwaway `PI_CODING_AGENT_DIR` settings file printed `Warning: Extension package ".../package.json": Host-provided extension packages must be declared in peerDependencies with a "*" range, not dependencies: …`. Removing `dependencies` cleared it. So the card's `pi -e` check is vacuous for that criterion; the meaningful local check is the `packages` route through a throwaway agent dir (needs no edit to Joel's settings).
4. **`test-jev-poc.mjs` matches Node's default test glob and calls a live model.** Measured: bare `node --test` in the copy ran `test-jev-poc.mjs` (112 s, real classifier/model calls, prompt tokens reported) alongside the real test. **Disclosure: that run spent provider tokens once; I did not repeat it.** Any `test` script must name its glob (`tests/**/*.test.ts`), and `tsconfig` `include` must exclude the root PoC `.ts`. With the explicit glob, `node --test 'tests/**/*.test.ts'` ran only the two sample tests.
5. **`node_modules/` is not ignored today** (`git check-ignore node_modules` → not ignored; only `.pi/` is excluded locally). An `npm install` in the checkout before `.gitignore` lands dirties `git status`. `.gitignore` is the first file to write.
6. **Card criterion 1 is already met.** `git log` shows `62d3330` on `main` with `src/`, `openspec/`, `ARCHITECTURE.md`, ADRs. `tests/` exists on disk, empty and untracked. Remaining work is `package.json`, `tsconfig.json`, `.gitignore`, a first test, and scripts.
7. **"Test files executed at startup" is false for this layout.** Measured: a `tests/foo.test.ts` with a `console.error` side effect never ran under `-e <dir>` or the `packages` route (manifest present). Chidi §4 gives the source rule. `tests/` at the root stays as convention (both siblings use a root test dir), but `ARCHITECTURE.md` §8's stated reason is wrong → docs pass, minor (D2).
8. **Settings path forms differ by key.** Joel's `packages` entries are bare directory strings (`../../Projects/pi-jefferson`, `../../Projects/pi-omlx`); `thinking-box` is a file under `extensions`. Relative paths resolve from `~/.pi/agent` (`settings.md` §Resources). `-e` relative paths resolve from CWD. A taiknr entry belongs under `packages` as `../../Projects/pi-taiknr`.
9. **Host packages installed as devDependencies are not loaded at runtime** (jiti `virtualModules` maps them to Pi's copies, Chidi §2), so `devDependencies: ^1.5.2` is for `tsc` only and creates no duplicate. `peerDependencies "*"` is the documented rule; `devDependencies` is a local need, not a Pi rule.

## 4. Questions only Joel can answer

**Q1 — May this card edit the handler stub bodies so the extension loads?** (scope)
Source: card criterion 4 ("loads cleanly") vs card "Out of scope: implementing archival, config loading, or classifier recall logic"; Trap 1.
- (a) Replace each `throw` with a no-op `pi.on("<event>", () => {})` registration in the 7 handler files (one line each). Load passes and the seven event-name strings are type-checked against 1.5.2.
- (b) Replace each `throw` with a bare `return`. Smallest diff; proves less.
- (c) Leave the stubs; drop "loads cleanly" to "module graph resolves" (Trap 2 already shows that).
- **My pick: (a).** Same size as (b), and it is the only option under which the load check and the type check verify something the next cards depend on (the event names). It implements no behavior, so it stays inside the card's out-of-scope line as I read it; the scope line is Joel's to read.

**Q2 — Who adds `../../Projects/pi-taiknr` to `packages` in `~/.pi/agent/settings.json`, and when?** (action outside the repository)
Source: card ("Once the package shape is valid, Joel's settings.json loads the extension…"); Eleanor §3 (settings file and dotfiles source are identical plain JSON; chezmoi-managed).
- (a) Joel adds it himself after the gate; the card's acceptance check uses a throwaway `PI_CODING_AGENT_DIR` (Trap 3), so nothing in the change depends on his file.
- (b) Derek edits the dotfiles source and Joel runs `chezmoi apply`.
- (c) Not part of this card at all.
- **My pick: (a).** The verifiable criterion is reproducible without his file, and his dotfiles are not in this repository's blast radius.

**Q3 — Test runner and lint: jefferson-minimal or omlx-full?** (tooling the conductor flagged as a proposal awaiting his confirmation)
Source: `owner-rulings.md` lists "test runner" among unconfirmed proposals; Eleanor §2 (jefferson: `node --test` + `tsc --noEmit`, no lint, Pi 1.4-era; omlx: Biome + `tsc --noEmit` + `vitest run` under `check`, Pi 1.5.2-era).
- (a) `node --test 'tests/**/*.test.ts'` + `tsc --noEmit`, `check` = both; no vitest, no Biome. Measured working on Node 26.8.1 with zero extra dependencies (Trap 2, 4).
- (b) omlx's stack: Biome + `tsc` + vitest.
- **My pick: (a).** It needs nothing but `typescript` and `@types/node`, both siblings' `tsc` shape already fits, and the stubs give lint nothing to do yet. Biome can be added by a later card when there is code to lint; it is not a constraint anything today breaks without.

Nothing else is his. Dependency placement (peer `*` + dev `^1.5.2`, never `dependencies`) is settled by Pi's docs and the measured warning; the `pi` manifest shape is settled by `packages.md` and the measured load; `pi-package` keyword is optional for local loading and harmless.

## 5. Settled vs open

**Settled (for the council and the design):**
- S1 `package.json`: name `pi-taiknr`, `"type": "module"` (both siblings; needed for `.ts` ESM tests under `node --test`), `"keywords": ["pi-package"]`, `"pi": { "extensions": ["./src/app/extension/taiknr.ts"] }`, `peerDependencies: { "@earendil-works/pi-coding-agent": "*" }`, `devDependencies: { "@earendil-works/pi-coding-agent": "^1.5.2", "typescript", "@types/node" }`, no `dependencies`. Source: `packages.md` §Declare dependencies; Trap 3; Trap 2.
- S2 `tsconfig.json`: `module`/`moduleResolution: nodenext`, `strict`, `noEmit`, `skipLibCheck`, `types: ["node"]`, `include: ["src/**/*.ts", "tests/**/*.ts"]` (root PoC excluded). Source: D6; Trap 2; Trap 4. Jiti never reads it, so it serves `tsc` only (Chidi §2).
- S3 `.gitignore`: `node_modules/`, `*.tgz`, `.DS_Store` at minimum; do not add `.pi/` (already excluded locally; the conductor owns what lives there). Source: Trap 5; sibling files.
- S4 Test glob is explicit (`tests/**/*.test.ts`); PoC files untouched. Source: Trap 4.
- S5 Load check for acceptance: `pi -ne -e <repo> --help` for load errors **and** the `packages` route via throwaway `PI_CODING_AGENT_DIR` for the dependency warning. Source: Trap 1, 3. Both are runnable by Derek without touching Joel's settings.
- S6 First test: one `tests/` test that imports a `src/use-cases/` or `src/domain/` module through the `.js` specifier chain and asserts a behavior of an existing pure function (`shouldArchive`, `buildStub`, `selectRecalledIds`, `formatRecalledContext` exist per Eleanor §1). This also exercises D3's "unit-testable in plain Node".
- S7 ADR 0001's "enforce the import boundary during checks" is **not** this card: no boundary-lint tool is in scope (Q3a). The design records it as deferred, not as satisfied.
- S8 `ARCHITECTURE.md` §8 rationale ("so Pi does not load tests as extensions") is false for this layout; docs correction goes to Bambadjan's docs pass, minor (D2, Trap 7).

**Open (pending Joel's Q1–Q3):**
- Whether and how the handler stubs change (Q1) decides whether "loads cleanly" is an acceptance criterion or is replaced by "module graph resolves".
- Whether the change includes any step against Joel's settings (Q2).
- Whether `check` includes Biome/vitest (Q3); S1–S2 hold either way, with vitest adding `vitest.config.ts` and a `vitest` devDependency.

**Not covered by this pass:** no vitest/Biome run; no measurement of the relative `../../Projects/pi-taiknr` form from a real `~/.pi/agent` layout (the absolute-path `packages` route was measured instead); TypeScript 7 behaviour (I measured with `typescript@^5.9.3`; the design should pin the major it tests with).
