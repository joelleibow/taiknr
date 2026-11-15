# Design Review

The four-stage fresh-context review of `design.md`, resolved by Michael. Stage reports are `design-review-s1-zoom-out.md`, `design-review-s1-catalyst.md`, `design-review-s2-comprehension.md`, `design-review-s3-r1-critic.md` … `design-review-s3-r4-structural.md`, `design-review-s4-zoom-out.md`; Michael's resolutions are `michael-resolve-s1s2.json`, `michael-resolve-s3-r1.json` … `michael-resolve-s3-r4.json`. There is no `michael-resolve-s4.json`: Stage 4 raised nothing to resolve. Findings are reported as the lens made them and rulings as Michael's; Joel's only item was ruled in the council and is recorded in `owner-rulings.md`.

## Stage 1: Initial Zoom Out

Two lenses, run against `zoom-out-standard.md`.

**`council-zoom-out` — pass with a minor documentation cleanup.** Verified that the design fixes the actual unused-config path, reuses the existing config module and session-start bridge, and places the holder and gate in modules it justifies, without adding an orchestrator, dependency, logging system or neighbouring feature. One finding, **ZO-S1-1 (minor)**: the design dropped from the gate's public contract into its private helper — the module-local `LooseOn` alias and the exact `(target.on as unknown as LooseOn)(…)` cast — where the Zoom Out Standard §4 keeps high-level design at boundaries, data flow and contracts. Recommendation: keep `createGatedPi`'s exported signature, its placement and its registration/return-forwarding contract, and move the private spelling to implementation notes.

**`council-catalyst` — no false compromise detected.** Zero findings: no compromise forced between preserving the registrar signatures and enforcing session-wide inertness.

**Michael: ZO-S1-1 declined** (`michael-resolve-s1s2.json`). Ruling 4 asked the design to record the cast as the one place the host's `on` typing is bypassed, and the measured form is what turned `TS2769` green, so giving the coder the exact spelling leaves no choice to make — the bar. The block already says `LooseOn` is module-local and not exported, so no boundary is claimed. Settled; not re-opened unless the gate's mechanism changes.

## Stage 2: Comprehension Test

`council-comprehension`, doc-only over `design.md` alone, paraphrasing before reading.

**What this proposes (naive paraphrase):**

> At each session start, the extension reads an agent config file and, if the project is trusted, a project config file, validates them and combines them with defaults. A per-session holder records whether configuration is unresolved, rejected or ready, while a registration gate prevents other handlers from running unless the ready config is enabled. Rejections are reported through the host, and a future command can toggle the ready state without writing a file.

**How the existing system works, per design.md:**

> The current configuration loader is a stub, and the extension passes a fixed default config into its turn-end and context handler dependencies. The seven registered handlers currently do no work, and the existing entry test checks the number of registrations. According to the document, the host provides working-directory and project-trust information only at event time and creates a fresh extension instance for each session replacement.

The lens's recommendation was to revise the design before implementation to specify layer precedence and close the operator and error-handling gaps. Its two major findings were the design saying "layered field by field" without ever stating which source wins, and D6 enumerating `lstat` succeeding or failing `ENOENT` but not failing for another reason. Both were `propose_fix` and are applied (below).

## Stage 3: Critic Review Loop

Four rounds, each a fresh `council-critic` and `council-structural` against `design.md`. Rounds 1 and 2 needed fixes; round 3 was clean for both reviewers and round 4 was clean for both, which is the two consecutive clean rounds that close the loop.

**Round 1 — 3 major, 9 minor across the two lenses.**

- `council-critic`: **CR-S3-1 (major)** — `extension-packaging`'s "Signatures unchanged" scenario compares `src/config/taiknr-config.ts` with `HEAD` and permits only three differences, while the design adds `enabled`, `CONFIG_FILE_NAME`, `TaiknrConfigError` and rewrites `interface` to `type`, so the gated scenario could not pass; **CR-S3-2 (major)** — the design never says where the rejection message and its Pi-only `/reload` line are built, so a host-free error class and a handler-appended line are both correct readings with different observable results; **CR-S3-3 (minor)** collision between the design's own D-numbers and `michael-orientation.md`'s; **CR-S3-4 (minor)** the message promises an absolute path but `join(getAgentDir(), …)` keeps a relative `PI_CODING_AGENT_DIR` relative; **CR-S3-5 (minor)** D6 treats read `ENOTDIR` as absent for both paths where the spec limits it to the project path, and a broken directory symlink above the file is silently absent and unrecorded; **CR-S3-6 (minor)** `setEnabled` does not say whether it replaces or mutates, nor what it returns for an already-held value; **CR-S3-7 (minor)** "the holder stays `unresolved`" holds only on a holder's first `session_start`; **CR-S3-8 (minor)** "first violation" is not deterministic as written; **CR-S3-9 (minor)** D9 has no "Alternatives weighed" paragraph.
- `council-structural`: **S3R1-STR-1 (major)** the same unsatisfiable permitted-difference list, plus the unenumerated `_pi`→`pi` rename and the adapter's parameter type silently gaining a field; **S3R1-STR-2 (minor)** the fake is "shared by the holder" though the holder is host-free; **S3R1-STR-3 (minor)** bare orientation D-citations.

**Round 2 — 4 minor.**

- `council-critic`: **CR-S3R2-1 (minor)** the reason strings are pinned but not mapped to inputs (`minCharsToArchive: -1` and `decisionThreshold: 1e999` each admit two strings); **CR-S3R2-2 (minor)** "source order" is not what `Object.keys` gives for integer-like keys; **CR-S3R2-3 (minor)** D5 step 4's code span renders as a template literal, and "the critic measured the cost" claims a measurement nobody recorded.
- `council-structural`: **S3R2-STR-1 (minor)** `proposal.md` still called the session-start path builds "the two `join` calls" where D5 pins `resolve`.

**Round 3 — 3 minor, round clean.**

- `council-critic`: **critic-r3-1 (minor)** the gate Risks bullet claimed the gate test proves the composition-root wiring; **critic-r3-2 (minor)** the proposal's Impact still said "rethrow".
- `council-structural`: **S3R3-STR-1 (minor)** the proposal's six bare `D N` citations now collide with the bare-D convention the design's Context legend establishes.

**Round 4 — 1 minor, round clean.**

- `council-critic`: zero findings; every round-1 to round-3 wording item verified applied, and the unchanged entry-test fake re-checked against the gate.
- `council-structural`: **S3R4-STR-1 (minor)** the "Dependency direction" section put the loader edge on `src/app/extension/`, where this change gives it no call site, and omitted the three `src/config/` value imports the session-start body needs.

## Stage 4: Intermediate Zoom Out

`council-zoom-out` audited the edits Stages 2–3 made: **pass, no new findings.** The edits clarified precedence, validation outcomes, error ownership and recovery without adding modules, dependencies, wrappers or neighbouring features. The existing config module owns loading, the session-start infra bridge owns host paths and trust, the host-free holder owns session state, and the composition root owns the registration gate. The recommendation was to preserve the settled decisions, including the deliberately recorded gate cast. With no findings there was nothing for Michael to resolve, which is why no `michael-resolve-s4.json` exists.

## Michael's Resolutions

Twenty-six findings were put to Michael across the four resolution files: nine `propose_fix` (two of them duplicates covering one change, so eight distinct fixes) and seventeen `declined`. No `contest` and no `escalate` was issued, so nothing went to Joel.

The `propose_fix` items were applied to `design.md`, two of them also to a spec surface. The declined items were mostly minor wording; where Michael recorded exact wording it was applied in the following round, with four exceptions that change nothing — ZO-S1-1 (declined outright) and CC-S2-3, CC-S2-4 and CC-S2-5, declined as documentation pointers that `ARCHITECTURE.md` §11, ADR 0002 and Pi's own documentation already own.

**`propose_fix` — applied.**

| Finding | What changed |
|---|---|
| CC-S2-1 (major) | D4 states the layering order — default, then agent, then trusted project, field by field — with a worked conflicting-field example; Goals bullet 1 says "project over agent over defaults" |
| CC-S2-2 (major) | D6 covers an `lstat` failure other than `ENOENT` as a rejection carrying the `lstat` errno, and that only `ENOENT`/`ENOENT` and read `ENOTDIR` are absent; D5 step 3 states the loader converts every `fs` and parse failure, and says what happens to the holder if anything else escapes |
| critic-r1-1 / structural-r1-1 (major, duplicates) | The `extension-packaging` scenario compares only the seven handler files and `ConfigPaths`, with `interface` kept and a differences-against-`HEAD` sentence in the design's types block; the `_pi`/`_store` rename is recorded as not a signature change |
| critic-r1-2 (major) | D5 step 4 throws a new `Error` wrapping the caught one as `cause` and appending the recovery line; `TaiknrConfigError.message` stays host-neutral; the spec scenarios are asserted on the handler's throw |
| critic-r1-4 | D5 step 1 builds both paths with `resolve`, and the session-start test row covers a relative `PI_CODING_AGENT_DIR` |
| critic-r1-6 | D1 states that `setEnabled` replaces the state with a new config object and returns `true`, including for the already-held value, and `false` from `unresolved` or `rejected` |
| critic-r1-8 | D4 fixes the deterministic order — agent file before project file, and `Object.keys` order within a file — with the two-key file as a test row |
| critic-r2-1 | D4 gains a Reason column mapping each input class to exactly one string, with the `-1`/`"600"`/`1e999` rows asserted in the loader test |

**`declined`, with wording applied.** critic-r1-3 / structural-r1-3 (orientation D-citation prefixes and a Context legend), critic-r1-5 (ENOTDIR restricted to the project path, plus the dangling-parent-symlink risk row), critic-r1-7 (the holder's prior state, worded for the production lifetime), critic-r1-9 (D9's rejected alternative), structural-r1-2 (the fake's "shared by" clause), critic-r2-2 (`Object.keys` order wording), critic-r2-3 (the fenced throw block and "assessed the cost"), structural-r2-1 and critic-r3-2 and structural-r3-1 (the proposal's `resolve` wording, "the thrown report (design D5)", and a citation key), critic-r3-1 (the gate Risks bullet), and S3R4-STR-1 (the two "Dependency direction" sentences, applied in this pass).

**Michael's consult on the holder's placement.** Ruling 1 originally put the holder in `src/app/extension/`. On consult after the council, the states, operations and per-factory lifetime stand unchanged and the unit moved inward to `src/config/session-config.ts`: the infra handlers name the holder in their contracts, so declaring it in the composition root would make three infra handlers depend on `src/app/`, which `ARCHITECTURE.md` §3 keeps to the Pi extension alone; the house precedent is `RecallCache`, declared in `src/use-cases/` and imported as a type by `src/infra/pi-event-handlers/context.ts:4`. The revision is recorded in `council.md` ruling 1's placement note and carried into `design.md` under "Why the two new units are new files" and "Dependency direction".

## Settled Findings

- **ZO-S1-1** — the `LooseOn` alias and the exact cast expression stay in the design's types block and D3, by ruling 4; not to be re-opened unless the gate's mechanism changes.
- **CC-S2-3, CC-S2-4, CC-S2-5** — the host module and agent-dir resolution, Pi's trust mechanism, and ADR 0002's vocabulary are documentation pointers, declined as such. The facts themselves are unchanged and measured: `getAgentDir()` is `$PI_CODING_AGENT_DIR` when set, else `~/.pi/agent`; `CONFIG_DIR_NAME` is `.pi` unless the distribution is rebranded; trust is the host's decision, saved in `~/.pi/agent/trust.json`.
- **critic-r1-3 / structural-r1-3** — orientation D-number citations are prefixed and the design's Context carries the legend that bare `D N` means its own Decisions.
- **critic-r1-5** — an `ENOTDIR` on the agent path is a rejection, not an absence; a dangling symlink above the file is accepted as absent, with the risk recorded.
- **critic-r1-7** — the holder's prior-state claim is worded for the production lifetime, where Pi loads a new runtime before every `session_start`; the two-call unit test exercises the re-read, not this path.
- **critic-r1-9, structural-r1-2** — D9's rejected alternative and the fake's true sharing are stated.
- **critic-r2-2, critic-r2-3, structural-r2-1, critic-r3-1, critic-r3-2, structural-r3-1, S3R4-STR-1** — prose completeness and cross-reference wording; the operative statements (D5's four steps, D6's classification, D4's table, the Files table) govern.
- **Measured assumptions closed during the loop, none of them findings.** `Object.hasOwn` and `Error { cause }` type-check under the committed `tsconfig.json`; the uncast `on` call reports `TS2769` and the cast form passes `tsc` and Biome; the entry test's fake throws on any `ExtensionAPI` member other than `on`, which the gate never reads beyond; `Object.keys` lists integer-like keys first (`{"enabled":"no","0":1}` → `["0","enabled"]`); `JSON.parse` creates `__proto__` as an own property, so the unknown-key check sees it; `getAgentDir()` reads the variable at call time, so a test can set it.
- **Carried as unverified in every round, unchanged.** Pi's factory-cached-not-instance loader, the per-handler catch and its carried error channel, the stderr surfacing in print and JSON modes, the thirteen BOM-strip sites, and the per-load runtime before every replacement `session_start` rest on the measurements recorded in `michael-orientation.md` and `council.md`, not on a re-measurement inside the review.

## Owner Decisions Required

None. No item in Stages 1–4 was marked `escalate` or put to Joel. The design's one owner decision, O7 — whether a valid `enabled: false` is announced at session start — was settled in the council, where Michael marked it `joel` and recommended silent, and Joel ruled **(a) silent** ("I'm with Michael. A"). His words are recorded in `owner-rulings.md` § "Council OD — announcing a valid off". A rejected file stays loud; a valid off produces no output at session start.
