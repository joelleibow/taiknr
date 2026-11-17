# Research — Chidi — taiknr-instruments

Facts only. No design, no recommendation. Nothing in either repository was edited and no model call was made. Scratch files were in `mktemp -d`, `/tmp/pjx` and `/tmp/ch-c`; the first two were removed, and `/tmp/ch-c` holds the probe scripts I wrote for C (outside both repositories).

## Question and scope

- A. pi-jefferson 0.14.0's provider contract: registration and update shapes, optional members, fault containment, type import under taiknr's TypeScript setup, and how Joel's pi loads Jefferson.
- B. pi 1.5.2 facts the figures rest on: `usage` and `usage.cost`, the events that carry them, `ctx.model`, `getContextUsage`, the chars÷4 fallback, and `pi.events`.
- C. Verify the conductor's lead: do `.pi/ctx-check.mjs` and `.pi/ctx-calib.mjs` measure what they claim, and what do they report on Joel's session files?

Versions examined: pi-jefferson tag `v0.14.0` (`cf90995`), Joel's checkout HEAD `cf90995` on `main` with a clean tree, and the npm tarball `pi-jefferson@0.14.0`. pi-coding-agent 1.5.2 with its bundled pi-ai 1.5.2. TypeScript 7.0.2 (taiknr's).

Line numbers for Jefferson are from `git show v0.14.0:<path>`. Line numbers for pi are in `<pi>` = `/Users/joelleibow/.local/share/fnm/node-versions/v26.8.1/installation/lib/node_modules/@earendil-works/pi-coding-agent/`; `pi-ai` is `<pi>node_modules/@earendil-works/pi-ai/`.

## A. pi-jefferson 0.14.0

### A1. Registration and update shapes

Contract file `extensions/jefferson/instrument-contract.ts`:

- `RegistrationChannel = "jefferson:registration"` (L17); `UpdateChannel = "jefferson:update"` (L20). Types only; the contract has no runtime statement (header, L1–11). The provider writes the channel strings itself (`registration-listener.ts:17–20`, same pattern).
- `Registration<Extension>` (L71–76): `{ extension: Extension; fields?: Readonly<Record<string, FieldType>>; instruments: readonly ProvidedDeclaration[] }`. `Extension` must not be `jefferson` or `jefferson.*`; otherwise TS2344 "a name under jefferson. belongs to Jefferson" (L55–65; `docs/extension-authors.md:92`).
- `Report` (L79–83): `{ extension: string; field: string; value: FieldValue }`.
- `FieldType = "string" | "number" | "boolean"`; `FieldValue = string | number | boolean`; `ReadingsView = Readonly<Record<string, FieldValue | undefined>>` (`data/field-value.ts:7–14`). "`undefined` is unknown, never a value" (L7). A report cannot carry `undefined` or `null`; `checkReport` refuses non-matching types (`data/provider-fields.ts:74–82`). So a posted field has no "clear" value; only `session_shutdown` clears.
- `number` fields must be finite; NaN and ±Infinity are refused (`provider-fields.ts:77–80`; warning `…reports "saved" as a number that is not finite`, doc L322).
- Naming: the instrument is `<extension>.<name>`; Jefferson composes it (`registration-listener.ts:91–93`). Users place `taiknr.context` etc. by that full name (`docs/extension-authors.md:94`). Unknown keys are ignored (doc L86).
- Each `instruments[]` entry needs `name: string`, `variables` (object of functions), `defaultFormat: string`; `defaultLabel?: string` (listener L84–113, doc L116–121). A variable returns `string | undefined`; anything else is a fault (doc L123).
- All of an extension's instruments read **all** of that extension's fields; no cross-extension reads (doc L98).
- Several registrations per extension are allowed if instrument names are new; fields merge. A re-declared field with the same type keeps its value; a different type refuses the later registration (doc L108–112; `provider-fields.ts:53–73`).
- Validation is all-or-nothing: the first fault refuses the whole registration, so no instrument and no field is accepted (listener L43–47, L162–175; doc L287).
- Timing:
  - "Post your registration from your `session_start` handler, before its first `await`. The bus keeps no history, so a registration posted earlier is lost when your extension loads before Jefferson." (doc L35). Jefferson's listener is installed at its factory time, in `startUp(pi)` (`startup.ts:24–46`; `registration-listener.ts:236, 254`).
  - A late registration still works, but a user whose row names the instrument sees a "not a known instrument" warning first (doc L35; `startup.ts:52–60`).
  - Jefferson's `session_start` handler returns early unless `ctx.mode === "tui"` (`startup.ts:112`). The bus listener does not depend on it.
  - `session_shutdown` (`startup.ts:82–93`) runs `registry.clearProvided()`, `fields.clear()` and `faults.close()`. Per doc L37, the provider's next `session_start` registers again, each field has no value until posted, and an update between shutdown and re-registration is refused with a warning (`vetReport`, listener L202–207: `<ext> reports "<field>" without a registration`).
- Repaint: a report that changes the value repaints; one that repeats the held value costs nothing (`provider-fields.ts:83–89`; doc L131). Comparison is `!==`.
- Doc example (L39–74): the registration object is a module constant and `pi.events.emit("jefferson:registration", registration)` runs in `session_start`; updates emit `{ extension, field, value }` on `jefferson:update` from `turn_end`.

### A2. Optional members

Each is validated at registration; a wrong shape refuses the registration with `"<ext.name>" carries <member> Jefferson cannot use` (`instrument-binding.ts:124–149`, listener L122–126; doc L307).

| Member | Contract | What it does (source) |
| --- | --- | --- |
| `variableForms` | `Record<variable, Record<form, (readings)=>string\|undefined>>` (L40) | Named renderings: `$saved\|cents`. The variable itself must also be in `variables`. The form follows the variable directly, before modifiers. A form returning `undefined` blanks the instrument (doc L204–208; `format.ts:105–111, 240–245`). |
| `bar` | `(readings)=>number\|null\|undefined` (L42) | Enables `$bar` in the format. See below (doc L210–218). |
| `fills` | `boolean` (L44) | `true` makes the instrument take the row's spare columns whatever its format. Otherwise it fills only when its format holds `$bar` (doc L220–222; `instrument-binding.ts:302`). |
| `variableFg` | `Record<variable, (text)=>string\|undefined>` (L46) | Picks a theme colour token for that variable's text. It receives the text before modifiers. It replaces the user's `fg` on that variable only. An unknown token is a fault; the variable keeps the user's style (doc L224–228; `instrument-binding.ts:186–208`). |
| `composed` | `{ variable, variables, select, formats }` (L26–31) | One default text per key. `select(readings)` returns the key. The chosen text fills `variable`. A kind's text is plain: no modifiers or forms. `select` → `undefined`, or an empty result, leaves `$variable` to its `variables` function; `() => undefined` leaves it with no value, which blanks the instrument only if the format names it (doc L230–241; `instrument-binding.ts:296–319`). |
| `options` | `readonly "formats"[]` (L49) | `["formats"]` lets the user rewrite each kind's text in the `instruments` block. It requires `composed`. Any other option name is refused (`option-unimplemented`) (doc L243–256; `instrument-binding.ts:146–158`). |

**How `bar` works:**

- It is a function of the provider's readings. `$bar` always means this bar, whatever the variables are called (doc L212).
- A number is a **percentage**, 0–100 scale. The fill is `floor((percent/100) * barWidth)`, clamped to `[0, barWidth]` (`components/visuals/bar.ts:20`). Below 0 is empty and above 100 is full (doc L214). The fill takes the theme `warning` colour when `percent > 70` and `error` when `percent > 90` (`bar.ts:14–15, 21–22`; `docs/formats.md:76`).
- `null` draws an unfilled, dim track (`bar.ts:18–25`: `percent === null` → `filled = 0`; track has `dim: true`).
- `undefined` means no value, and an instrument whose format names `$bar` renders nothing, label included (`format.ts:259–260`; doc L216; `docs/formats.md:76`).
- A non-finite number, or any other type, is a fault. It is recorded once, and the bar function's result becomes `undefined` (`instrument-binding.ts:177–184`).
- The bar is called only when the format holds `$bar` (`format.ts:257–259`). A format holds at most one `$bar`, and no modifier may follow it (`docs/formats.md:76`; `format.ts:118–120`).
- The bar's width is `max(0, width − visible width of the other pieces)` (`format.ts:261–262`).
- Jefferson's own `context` instrument uses the same mechanism: `bar: r => r.contextUsage === undefined ? undefined : r.contextUsage.percent` (`components/instruments/context.ts:14`).

### A3. Fault containment, warnings, no Jefferson installed

- **One function costs one instrument.** Every provider function runs inside `call()` (`instrument-binding.ts:97–111`):
  - A throw becomes a fault `…its variable threw`, and the member's absent value comes back.
  - A returned thenable has its rejection observed, so pi keeps running, and becomes `…returned a promise`.
  - A wrong-kind result becomes `…returned <what>, where text is declared`; for `bar` the declared text is `a finite number or null`.
  - `variableFg` faults cost only the colour (L186–208); a composed value that faults renders as nothing (L214–222). A `select` fault means nothing to compose (L219).
  - `containProvided` is an outer try/catch around the bound render, recording `its variable threw` and returning `""` (L261–275).
- **The ledger.** `faults.ts:36–77` dedupes by `scope + kind` once per session. Delivery is never synchronous: `queueMicrotask`, joined with `; ` as `pi-jefferson: <part>; <part>`. Nothing is delivered before startup completes (`faults.open` is called from the `resources_discover` handler for `ctx.mode === "tui"`, `startup.ts:52–65`). Delivery is through `ctx.ui.notify(message, "warning")`.
- The warning table is `docs/extension-authors.md:295–329`. It covers 25 rows, from "registration is not an object" to the three render faults, the update refusals (no registration, undeclared field, wrong type, not finite), and so on. Warnings about a registration or update carry no file path (doc L293).
- A user's settings fault on a provided instrument refuses only that instrument; it renders as `blank` (`docs/configuration.md:116–128`).
- **Jefferson not installed.** `pi.events.emit` goes to a Node `EventEmitter` (B8); with no listener it does nothing. There is no reply channel (doc L33), no sender and no replay. The `jefferson:registration` and `jefferson:update` listener lives only in Jefferson's `registration-listener.ts`. A provider therefore gets no signal that Jefferson is absent.
- Jefferson's own extension load also posts its registration on the same channel; the listener identifies it by payload object identity (`registration-listener.ts:22–23, 234–240, 262`). Not a provider concern.

### A4. Type import under taiknr's setup

- `package.json` of `pi-jefferson@0.14.0` has `"exports": { "./instruments": "./extensions/jefferson/instrument-contract.ts" }`, `"files": ["extensions","README.md","LICENSE"]`, and `pi.extensions: ["./extensions/jefferson.ts"]`. It is `"type": "module"`. The tarball ships `.ts` sources and no `.d.ts`; the published `instrument-contract.ts` is byte-identical to the tag's (diff). `startup.ts`, `registration-listener.ts` and `registration.ts` are byte-identical too.
- Docs: `docs/extension-authors.md:16–22, 331–334` say "install as a development dependency"; `import type` leaves nothing at runtime; `nodenext`, `node16` and `bundler` find `pi-jefferson/instruments`; `node10` finds nothing. The doc's example uses `pnpm`.
- The published tarball's rationale (`instrument-contract.ts:6–11`): pi does not install the peer dependencies of managed packages, and plain Node refuses to strip types under `node_modules`. A runtime import would force a full dependency, hence types-only and `import type`.
- **Dry check, done.** I copied taiknr (no `.git`, no `node_modules` at first) into a `mktemp -d`, copied its `node_modules`, and ran `npm install --save-dev` on the packed `pi-jefferson-0.14.0.tgz`. I added a probe `src/probe.ts` using `import type { Registration, Report } from "pi-jefferson/instruments"`, with `Registration<"taiknr">`, one instrument with `bar` returning `number | null`, and a `Report`. I ran taiknr's own `tsc` 7.0.2 with its unchanged `tsconfig.json` (`module`/`moduleResolution: nodenext`, `strict`, `noEmit`, `skipLibCheck`, `types: ["node"]`).
  - Result: exit 0, no diagnostics; the baseline without the probe also passes. The contract's own `import type … from "./data/field-value.ts"` (a `.ts` specifier) did not trip `nodenext`.
  - Negative control: `Registration<"jefferson.x">` fails with `TS2344: Type '"jefferson.x"' does not satisfy the constraint '"a name under jefferson. belongs to Jefferson"'`. A `bar` returning a string fails with `TS2322 … '() => string' is not assignable … number | null | undefined`. So the types are really being checked.
  - The temp dir and tarball were removed afterwards.
- Not checked: vitest or pi's runtime loader against the import (an `import type` is erased by both, but I did not run them); biome lint on the import; behaviour with a lockfile entry or registry install (the check used the tarball, not the registry, though the tarball is the registry's `0.14.0`).

### A5. How Joel's pi loads Jefferson

- `~/.pi/agent/settings.json` `packages` (L31–33) lists local paths: `"../../Projects/pi-jefferson"`, `"../../Projects/pi-omlx"`, `"../../Projects/taiknr"`, followed by npm packages (L34–37). Jefferson is loaded from the checkout, **not** from npm.
- The checkout is at `main`, HEAD `cf90995` = `v0.14.0`, clean tree. Its `package.json` says `"version": "0.1.1"` (the version comes from a label and tags: ADR 0018; the checkout has `"files"` and `"exports"` as the npm package does). The npm `latest` is `0.14.0`; the published package.json says `0.14.0`. So the code is 0.14.0; the checkout's version *string* reads 0.1.1.
- Load order in `packages`: Jefferson before taiknr. Both load before any `session_start`, so a `session_start` registration finds the listener.
- Joel's `~/.pi/agent/pi-jefferson.json` currently has rows using built-ins only: `notice`, `path`, `model`, `thinking`, `context` (`"format": "$bar $percent"`, label 🔋), `blank`. No `taiknr.*` instrument is placed yet. `~/.pi/agent/pi-taiknr.json` exists (contents not examined).

## B. pi 1.5.2

### B6. `usage` and `usage.cost`

`pi-ai/dist/types.d.ts:292–318` (`Usage`) and `:382–398` (`AssistantMessage`):

```
usage: {
  input, output, cacheRead, cacheWrite: number
  cacheWrite1h?: number   // subset of cacheWrite; Anthropic only
  reasoning?: number      // subset of output; only some providers
  totalTokens: number
  cost: { input, output, cacheRead, cacheWrite, total: number; totalFromProvider?: boolean }
}
```

- `cost.input/output/cacheRead/cacheWrite` are **catalog-derived** (rate × tokens); `total` is "Best available total: provider-reported billed cost when supported, otherwise the catalog estimate"; `totalFromProvider` is true only for the billed case (types L307–317).
- `calculateCost` (`pi-ai/dist/models.js:680–700`): rates come from `model.cost`, with tier selection by total input size (`input + cacheRead + cacheWrite > tier.inputTokensAbove`), and 1h cache writes at 2× the base `input` rate. It sets `totalFromProvider = false`.
- Only OpenRouter models (`provider === "openrouter"` or a baseUrl with `openrouter.ai`) have `total` replaced by the billed figure, and only when `is_byok` and `cost_details` are valid (`pi-ai/dist/utils/openrouter-cost.js:5–34`). The components stay catalog-derived.
- **When set** (Anthropic Messages, `pi-ai/dist/api/anthropic-messages.js`):
  - The message starts with zeros, `stopReason: "pending"` (L560–574).
  - The `message_start` stream event sets `input/output/cacheRead/cacheWrite/cacheWrite1h`, `totalTokens`, and calls `calculateCost` (L690–700).
  - The `message_delta` stream event overwrites any non-null counts, sets `reasoning`, recomputes `totalTokens`, calls `calculateCost`, and for OpenRouter applies the billed cost (L835–869).
  - Error and aborted responses throw; usage may be partial or zero (L878–880). pi's own reader skips `aborted`, `error` and all-zero usage (`<pi>dist/core/compaction/compaction.js:72–83`).
- I read only the Anthropic path (Joel's taiknr sessions are all `anthropic/claude-opus-5-5`; one other session, OpenRouter/deepseek, has `totalFromProvider` undefined throughout). Other providers' fill timing was not read.
- Sessions also contain `usage` entries (`type: "usage"`, `kind`, `provider`, `model`, `usage`, `note`; `<pi>dist/core/session-manager.d.ts:36–45`, e.g. `cache_warm`) that are separate from assistant messages.
- Rates "from each response's own reported cost" (Joel's ruling) must be derived: the response carries component costs and token counts, not rates. A rate is `cost.<component> / tokens` and is undefined when that component's token count is 0. Tiering and the 1h write rate make a single division inexact; `cost.cacheWrite` mixes short and 1h writes. These are my observations from `calculateCost`, not documented guidance.

**Events that carry it** (`<pi>dist/core/extensions/types.d.ts`; `<pi>docs/extensions.md`):

- `message_end` — `{ type: "message_end"; message: AgentMessage }` (L868–871). Fires for every message (user, assistant, tool-result, custom); the assistant's `usage` is final here. Handlers can return `{ message }` to replace it (L1141–1143; docs L756–758, L770–785).
- `turn_end` — `TurnEndEvent` (L848–855): `turnIndex`, `message` (the assistant message), `toolResults`, `messageEntryId`, `toolResultEntryIds`, `entries`, `continue`, `context`, `outcome`. It runs after the assistant and tool-result messages are persisted (docs L746). It may return `{ entries, continue }` with draft types `custom`, `custom_message`, `context_edit`, `compaction` (docs L746; this is the boundary taiknr's settlement uses, as far as the docs show).
- `message_update` — `{ message, assistantMessageEvent }` (L863–867): partial message while streaming; usage is partial.
- `provider_stream_event` — `{ provider, api, model, data }` (L733–739): the raw parsed provider event.
- `after_provider_response` — `{ status, headers }` only (L727–731); no usage.
- Per-request hook order: `context` → `context_with_system` → `before_provider_headers` → `before_provider_request` → `after_provider_response` → `provider_stream_event` and `message_start/update/end` (docs L351–359).
- `getSessionStats`-style totals exist (`<pi>dist/core/agent-session.js:3595–3604`); I did not trace how an extension reaches them.

### B7. `ctx.model`, compaction settings, `getContextUsage`, the chars÷4 fallback

- `ctx.model: Model<any> | undefined` (`types.d.ts:246`). `Model` has `contextWindow: number`, `maxTokens: number` and `cost` rates (`pi-ai/dist/types.d.ts:675–676`; `model.cost.tiers` used in `calculateCost`).
- pi itself reads the window from `_limitsModel()` = `routedModel?.model ?? model` (`agent-session.js:365–367`). `routedModel` exists only for a virtual model (`:1119–1123`). So with a virtual model, `ctx.model` and the model pi measures against may differ; I did not trace `ctx.model`'s getter (`runner.js:650`) further.
- `ctx.getContextUsage(): ContextUsage | undefined` — `{ tokens: number | null; contextWindow: number; percent: number | null }` (`types.d.ts:217–223, 268`). `null` means unknown, "right after compaction, before next LLM response".
- Compaction settings: `pi.getSettings(): Settings` returns a structuredClone of the merged settings (`types.d.ts:1331`; `settings-manager.js:329–331`). The raw `compaction.{enabled, reserveTokens, keepRecentTokens, modelOverrides}` are there (`<pi>docs/settings.md:73–76`). Defaults: `reserveTokens` 16384, `keepRecentTokens` 20000 (`compaction.js:53–57`). The effective value resolves per model: override for `provider/id`, then ordinary, then default (`settings-manager.js:656–686`); an invalid value throws. `getSettings()` does **not** resolve model overrides; that logic is in `SettingsManager.getCompactionSettings(model)`, which I did not find exposed to extensions.
- Compaction trigger: `shouldCompact` = `enabled && contextTokens > contextWindow − reserveTokens` (`compaction.js:173–177`); caller at `agent-session.js:476`.
- `getContextUsage()` (`agent-session.js:3607–3635`):
  1. Window ≤ 0 or no model → `undefined`.
  2. If a compaction entry exists on the branch and no non-aborted/non-error assistant with positive usage follows it → `{tokens: null, percent: null}`.
  3. Else `estimateProjectedContextTokens(projection, branch)`; `percent = tokens/window*100`.
- `estimateContextTokens(messages)` (`compaction.js:110–135`): find the last assistant message with valid usage (not aborted/error, `calculateContextTokens > 0`). `calculateContextTokens = usage.totalTokens || input+output+cacheRead+cacheWrite` (L65–67), which includes **output**. If found: `tokens = usageTokens + Σ estimateTokens(messages after it)`. If none: `Σ estimateTokens` over all messages.
- `estimateProjectedContextTokens` (`compaction.js:137–169`) **uses real usage only when** the usage's entry is later in the branch than the latest `context_edit` or `compaction` entry (`usageEntryIndex > latestInvalidatingEntryIndex`, L150–160). Otherwise it ignores usage and sums `estimateTokens` over the whole projection (system message counted once; L162–168). **Fallback = chars ÷ 4.**
- So after any `context_edit` entry newer than the last assistant reply, pi sums chars ÷ 4 over everything. This is a consequence of those lines; I did not run a live pi to show the display.
- `estimateTokens` (`compaction.js:201–256`): `ceil(chars/4)` per message. User, custom and tool-result: text length, with each image counted as 4800 chars (`ESTIMATED_IMAGE_CHARS`, L181). Assistant: text, thinking and `name + JSON(arguments)` of tool calls; **no** thinking signature or usage. System: content, plus `sections` text and `JSON.stringify(toolsAdded)`. `bashExecution`: command + output. Summaries: summary length.
- The code comment says "conservative (overestimates tokens)" (L199–200). C below measures the opposite on Joel's sessions.

### B8. `pi.events`

- `<pi>dist/core/event-bus.js:1–24`: a Node `EventEmitter`. `emit(channel, data)` calls `emitter.emit` (L5–7), which is **synchronous**, in registration order. `on` wraps the handler in an `async` function with `try { await handler(data) } catch { console.error("Event handler error (<channel>):", err) }` (L9–16). The handler's synchronous part therefore runs inside `emit`; a synchronous throw is caught and logged, never propagated to the emitter. A rejected promise is caught the same way. Returns an unsubscribe.
- No history, no replay; no listener means a no-op (EventEmitter semantics). `EventBus` type: `emit(channel, data: unknown): void`, `on(channel, handler): () => void` (`event-bus.d.ts:1–4`). Docs: "Shared event bus for communication between extensions" (`docs/extensions.md:1965–1971`) and nothing more.
- Per-extension wrapper (`loader.js:426–439`): `events.emit` calls `assertActive()` first, so `pi.events.emit` **throws** when the extension's ctx is stale (after session replacement or reload; message at `loader.js:148–150`). `events.on` also asserts and tracks the subscription; `invalidate` unsubscribes tracked listeners (`loader.js:146–166`). Listeners registered during load are tracked (`loadingUnsubscribers`, L434–436).
- The bus is created once per load (`loader.js:565` `eventBus ?? createEventBus()`), shared across extensions. I did not trace when it is cleared on reload (`EventBusController.clear` exists, L20–22).
- `console.error` from the wrapper writes to stderr; what that does inside pi's TUI I did not check.

## C. The scripts, and my numbers

### What the scripts do (`/Users/joelleibow/Projects/taiknr/.pi/`)

- `ctx-check.mjs` (22 lines). For each assistant message on the branch with usage, `real = input + cacheRead + cacheWrite` (L12, so it excludes output), and `est = Σ estimateTokens` over `buildSessionProjection(entries, e.parentId).messages` (L15–16). It prints the quantiles of `est/real`. It imports `SessionManager`, `buildSessionProjection` and `estimateTokens` from `@earendil-works/pi-coding-agent`.
- `ctx-calib.mjs` (20 lines). It builds the same `(real, est)` rows, then for each `i ≥ 1` predicts `est_i × (real_{i−1}/est_{i−1})` and prints the quantiles of `|predicted − real_i| / real_i`.
- Both ran as written with no model call.

### Do they measure what they claim?

- **Prompt side: yes.** `real` excludes `output`, and the projection at the assistant's `parentId` is what its request would see on the persisted branch. The projection includes the system message(s) (my probe: `message:system` present in 438/438, 696/696 and 572/572 projections), so `est` includes pi's system-prompt and tool text; it does not include the provider's own tool-schema or message-framing overhead.
- **Persisted versus sent.** `est` is of the persisted projection, not of the payload actually sent. Anything added in the `context` hooks (taiknr's stubbing at request time, tail recall) is not in it, and `real` includes it. `ctx-check` therefore measures pi's persisted-history estimate against the provider's real count for the request, not the estimate of what the request contained. I did not isolate this effect.
- **Prediction metric, caveat.** Consecutive requests differ little, so a low error is partly easy. I ran baselines on the same rows (`/tmp/ch-c/probe.mjs`; no repo edits). In the table, "last real" predicts `real_i = real_{i−1}`; "last real + Δest" adds the raw chars÷4 growth between requests; the last column adds `ratio × Δest`.

| Session (requests) | Ratio rule: median / p90 / max | Last real: median / p90 / max | Last real + Δest: median / p90 / max | Last real + ratio·Δest: median / p90 / max |
| --- | --- | --- | --- | --- |
| taiknr `…01a1dd10` (438) | 0.04% / 0.19% / 4.99% | 0.22% / 1.12% / 65.3% | 0.11% / 0.48% / 20.9% | 0.04% / 0.19% / 4.99% |
| dotfiles `…01a18fb6` (696) | 0.03% / 0.15% / 4.60% | 0.43% / 1.55% / 2061% | 0.04% / 0.17% / 65.6% | 0.03% / 0.15% / 4.60% |
| pi-jefferson `…01a1bd53` (572) | 0.02% / 0.13% / 4.15% | 0.20% / 0.71% / 68.0% | 0.09% / 0.34% / 21.9% | 0.02% / 0.13% / 4.15% |

  (The ratio rule and the last column are algebraically the same prediction, so they print the same numbers.) The ratio rule beats both baselines on the median and p90; the large baseline maxima come from jumps in context size (the 2061% row is one compaction, where `est` fell from 999,635 to 46,705 and the ratio rule erred 1%).
- **Worst ratio-rule errors** (taiknr `…01a1dd10`): the top case (5.0%) has `message:system, message:user` entries between the two requests, with `Δreal = −15,693` against `Δest = +3,182`. That is a changed system prompt, or a different tool set, between requests. The next-worst is 2.0%, then 1.9% after a plain tool result. I did not identify the cause of the 5.0% beyond the entries between.
- Both scripts treat every assistant message equally, including sub-agent or retried responses, and `ratio` ignores model changes. The three sessions above each used one model.

### My numbers (`ctx-check` on four sessions; `ctx-calib` on the same four plus three more)

`est/real` (`ctx-check`):

| Session | Model | Requests | min | p10 | median | p90 | max |
| --- | --- | --- | --- | --- | --- | --- | --- |
| taiknr `2026-11-15T02-36…01a1dd10` | anthropic/claude-opus-5-5 | 438 | 0.59 | 0.60 | 0.61 | 0.65 | 0.70 |
| taiknr `2026-11-14T22-46…01a1dc3d` | anthropic/claude-opus-5-5 | 403 | 0.58 | 0.59 | 0.61 | 0.66 | 0.70 |
| pi-jefferson `2026-11-08T22-42…01a1bd53` | anthropic/claude-opus-5-5 | 572 | 0.60 | 0.61 | 0.62 | 0.65 | 0.69 |
| dotfiles `2026-10-31T02-08…01a18fb6` | openrouter/deepseek/deepseek-v4.1-flash | 696 | 0.90 | 0.91 | 0.93 | 0.96 | 0.99 |

- The conductor's range 0.59–0.70 reproduces on the three Anthropic sessions (0.58–0.70). It does **not** hold for the OpenRouter/deepseek session (0.90–0.99), so the ratio depends on provider or model (and on the share of fixed overhead).
- Within a session the ratio drifts (e.g. 0.70 at the start, ~0.61 median), consistent with fixed overhead shrinking in share as the history grows. I did not verify that explanation.
- A linear fit of `real` on `est` is not a constant offset: Anthropic sessions give slope ~1.7 with a negative intercept (−14.8k, −20.5k); deepseek gives slope 1.03 and +10k. A single multiplicative ratio is what the calibration script uses.

`ctx-calib` prediction error (`|predicted − real| / real`):

| Session (predictions) | median | p90 | p99 | max |
| --- | --- | --- | --- | --- |
| taiknr `…01a1dd10` (437) | 0.04% | 0.19% | 1.03% | 4.99% |
| taiknr `…01a1dc3d` (402) | 0.04% | 0.14% | 0.43% | 5.62% |
| dotfiles `…01a18fb6` (695) | 0.03% | 0.15% | 1.02% | 4.60% |
| pi-jefferson `…01a1bd53` (571) | 0.02% | 0.13% | 0.53% | 4.15% |
| taiknr-dir `…01a1db4b` (57) | 0.29% | 1.14% | 2.47% | 2.63% |
| taiknr-dir `…01a1db8f` (235) | 0.06% | 0.20% | 0.46% | 2.24% |
| taiknr-dir `…01a1dc97` (64) | 0.62% | 2.32% | 7.01% | 8.83% |

- The conductor's figures (median 0.04%, worst 5%; and median 0.40%, worst 10.4%) are the same order as the long sessions above (first figure matches taiknr `…01a1dd10` exactly: 0.04% / 4.99%). I did not find the session behind "0.40% / worst 10.4%"; the closest are the two short sessions (0.29% / 2.6%, 0.62% / 8.8%). Short sessions have fewer predictions and larger errors. Their "390 requests" does not match any single session I ran (the taiknr sessions are 438 and 403).
- In these sessions, taiknr was active; `context_edit` entries are present (58 in `…01a1dd10`). My probe's per-request `est` for those sessions is of the persisted projection (see caveat above).

## Differences from the supplied assumptions

- Joel's pi loads Jefferson from **the local checkout**, not from npm (`settings.json`) (`../../Projects/pi-jefferson`), whose `package.json` version string is `0.1.1` while its code is `v0.14.0`'s. The npm tarball's contract and listener files are identical to the tag's.
- The conductor's lead says the ratio is 0.59–0.70 "across 390 requests"; it is 0.58–0.70 on Anthropic sessions and 0.90–0.99 on the one OpenRouter/deepseek session I ran.
- pi's source comment says `estimateTokens` "overestimates tokens"; on Anthropic sessions it came to ~0.6 of the real prompt size, i.e. it underestimates.
- `cost` components are catalog-derived, not provider-reported, for every provider except the OpenRouter billed case, which replaces only `total`. Joel's wording ("each response's own reported cost") does not say which; the fields are as above.
- The Jefferson doc and tests describe the bar as a percentage (0–100); not a fraction (`docs/extension-authors.md:212–214`, `bar.ts:20`).

## Gaps and unverified

- I did not run Jefferson in a live pi, so nothing here is observed rendering; all A-section behaviour is from source and docs.
- Only the Anthropic usage path and OpenRouter cost path were read in pi-ai; other providers' timing of usage fields is unread. Whether `usage.input` excludes cached tokens on non-Anthropic providers is unchecked (it matters for `real = input + cacheRead + cacheWrite` on the deepseek session).
- `ctx.model`'s getter in the runner (`runner.js:650`) and the virtual-model case (`routedModel`) were not traced; how an extension reads effective per-model `reserveTokens` (versus raw `getSettings().compaction`) was not found.
- When the bus is cleared on reload, and what `console.error` does in the TUI, were not traced.
- The effect of a `context_edit` on the displayed context figure was not reproduced live; B7 is from code.
- `pi-taiknr.json` was not read. Vitest, biome and a registry install against `pi-jefferson/instruments` were not tried.
- The cause of the 5% worst prediction error was not isolated; the sub-agent and per-request `context`-hook effects on `est` versus the sent payload were not measured.
- Sources: the taiknr project's own `package.json` and `tsconfig.json`; no web search was needed.

## Addendum — pi-jefferson.json rows

Source: pi-jefferson `v0.14.0` (`/Users/joelleibow/Projects/pi-jefferson`, read only; `git show v0.14.0:<path>`). `docs/configuration.md` is `C`; `docs/instruments.md` is `I`; `docs/formats.md` is `F`. Nothing was edited in either repository, and no model call was made.

### 1. Top-level shape

- One JSON object with three keys: `rows`, `instruments`, `rowGap` (`C:9–15`). Unknown keys are ignored without a warning (`C:17`), except the retired keys `cells`, `id`, `distribution`, which reject the file (`configuration.ts:101`, `:450–454`).
- The enclosing key for rows is **`rows`**: "`rows` lists the rows in the order they render. Each row is one line of the footer." (`C:21`).
- `rows` is an **array of rows**. A **row is an array of instruments**, not an object keyed by name (`C:23`: "A row is a list of instruments"; example `C:25–37`). A row written as an object rejects the file (`C:187–189`; `configuration.ts:371`). An empty row rejects the file (`C:48`).
- Each entry in a row is an object, e.g. `{ "instrument": "context", "align": "right" }`.
- Options are not in the row. They live in the top-level `instruments` object, keyed by instrument name (`C:94–108`).

### 2. The key naming an instrument

- A row entry names its instrument with **`instrument`** (required, a non-empty string): `C:41`; code `configuration.ts:391–397`.
- A provided instrument is named by its **full name**: "An instrument from another extension has a name with a dot, such as `taiknr.savings`. Write that full name." (`C:55`). Jefferson composes the name as `` `${extension}.${part}` `` (`registration-listener.ts:93`). So `"taiknr.context"` is right, and a bare `"context"` means `jefferson.default.context`, Jefferson's own (`C:54`).
- The same full name is the key in the `instruments` block: "The block follows the same naming rule as a row." (`C:110`). `I:66`: "Place one by its full name, such as `taiknr.savings`. Configure it in the `instruments` block as you configure Jefferson's own."
- Confirmed by run: all four `taiknr.*` names resolved through the real registry (below).

### 3. Keys a row and a block entry may set

**Row entry** (`C:39–44`; `configuration.ts:384–402`): only `instrument` and `align` (`left` | `right` | `center`, default `left`). "Any other key is a fault", and it rejects the whole file. My run confirmed it: a `label` inside a row gave `pi-jefferson: … was rejected (row 1, instrument 1: has an unrecognised key "label"; an instrument in a row takes only "instrument" and "align"); rendering the default row`.

**`instruments` block entry for a provided instrument** (`configuration.ts:167–175`, `checkProvidedSettings`; `I:29–35, 66`):

- `format` (string), `label` (string), `style` (object: `fg`, `bg`, `bold`, `dim`, `italic`, `underline`, `inverse`, `strikethrough`; `F:80`). These are `FOUNDATIONAL_OPTIONS = ["format", "style", "label"]` (`instrument.ts:41`).
- `formats` only if the provider declares `composed` and `options: ["formats"]` (`I:66`, `F:94`, `instrument-binding.ts:234`). taiknr declares neither, so it is **not** accepted for `taiknr.*`.
- Any other key (e.g. `width`, `seconds`) refuses that instrument alone: it renders blank, with one warning `"taiknr.context" is configured with "width", which the instrument does not declare; it renders blank` (`C:127`; `configuration.ts:167–175`). Confirmed in the run.
- A bad shape, non-string format or label, an unknown `$variable` or an unusable style also refuse that instrument alone (`C:118–136`). `$bar` in a format of an instrument with no declared `bar` is refused as `format naming "$bar", which the instrument does not declare` (my run: `taiknr.recall`).

**`bar` and `fills` are provider-only.** The user cannot set either; neither is in the option list. `bar` is a member of the provider's declaration (`instrument-binding.ts:43, 230`); the user turns it on by writing `$bar` in a format (`F:74`), which works only where the provider declared `bar`. `fills` is likewise a declaration member (`:124, 231`). The user does not set `fills` either: "A format that holds `$bar` makes its instrument fill the row" (`F:74`, `C:76`).

### 4. Example, validated

Instrument names, variables and defaults come from `/Users/joelleibow/Projects/taiknr/src/infra/adapters/jefferson-instruments-declaration.ts` (branch `taiknr-instruments`): `context` (`contextInTurn`, `historyBefore`, `totalContext`, `contextWindow`, `approx`, and `bar` declared; default `ctx $totalContext/$contextWindow $approx $bar`, label `taiknr ctx`), `archive` (`archiveItems`, `archiveWithheld`, `archiveStubbed`, `withheld`, `stubbed`, `approx`; default `arc $archiveItems $archiveWithheld to $archiveStubbed $approx`, label `taiknr arc`), `savings` (`savedTokensRequest`, `savedTokensSinceStart`, `savedDollarsRequest`, `savedDollarsSinceStart`, `withheld`, `stubbed`, `recalled`, `approx`; label `taiknr save`), `recall` (`recalled`, `deciding`, `decidingItems`, `approx`; default `rec $recalled tok $deciding $approx`, label `taiknr recall`). Only `context` declares `bar`.

```json
{
  "rows": [
    [
      { "instrument": "taiknr.context" },
      { "instrument": "taiknr.recall", "align": "right" }
    ],
    [
      { "instrument": "taiknr.archive" },
      { "instrument": "taiknr.savings", "align": "right" }
    ]
  ],
  "instruments": {
    "taiknr.context": {
      "label": "🗜️",
      "format": "$totalContext/$contextWindow $approx $bar",
      "style": { "fg": "accent" }
    },
    "taiknr.archive": {
      "format": "$archiveItems items, $archiveWithheld withheld, $archiveStubbed stubbed $approx"
    },
    "taiknr.savings": {
      "format": "saved $savedTokensSinceStart tok $savedDollarsSinceStart usd $approx"
    },
    "taiknr.recall": {
      "format": "recalled $recalled tok $deciding $approx"
    }
  }
}
```

The `$bar` in `taiknr.context` makes it fill the row, so `taiknr.recall` beside it gets only its text's columns (`C:76`, `F:74`). Omit the whole `instruments` block to get each instrument's default format and label.

**How validated.** In a `mktemp -d` scratch directory (removed afterwards) I extracted the `v0.14.0` tag and ran Jefferson's own code under Node 26.8.1 type stripping: the real `readConfiguration` (`configuration.ts:549`), the real registry with Jefferson's `SHIPPED` instruments, and the real `createRegistrationListener`. It was fed taiknr's real `TAIKNR_REGISTRATION`, copied from the branch's declaration file; Jefferson's `tests/fake-theme.ts` stood in for the theme. I tried both load orders: registration before the file is read, and the file read first with registration after.

| Case | Result |
| --- | --- |
| Example, registration first | No warning, no unknown names, no faults reported; the rows resolve to the four `taiknr.*` instruments. |
| Example, file read first | No warning and no faults reported after registration. At read time the four names are in `unknownNames` (they are reported only if still unknown when startup completes, `C:62`), and the cells fill when the registration arrives. |
| Negative control: `width` on `taiknr.context`, `$nope` in `taiknr.archive`, `$bar` on `taiknr.recall` | Three faults reported (`settings-option`, `settings-variable`, `settings-variable`); each instrument alone is refused. |
| Negative control: `label` inside a row | Whole file rejected, as quoted in §3. |

Not run: a real pi session (so nothing about how the rows look on screen), and the real theme (the `fg: "accent"` token is checked against the fake theme only; `accent` is the token `C:104` uses).

**Docs example for a provided instrument.** Jefferson's docs have no complete example of a provided-instrument row with a configured block. The nearest are the warning-table examples using `taiknr.savings` (`C:67, 124–133`) and the prose at `I:66`. The only docs example showing a configured block is for the built-in `model` (`C:98–108`), quoted in §1.

### Would Joel's real file accept the merge

`~/.pi/agent/pi-jefferson.json` (read, not edited) has 3 rows (`notice`; `path`, `model`, `thinking`; `blank`, `blank`, `context`), `"rowGap": 0`, and an `instruments` block for `notice`, `path`, `model`, `thinking`, `context`, `blank`, using only built-in bare names. I merged in memory, appending the example's two rows as rows 4–5 and adding its four keys to `instruments`, wrote the result to the scratch directory, and ran it through the same reader. **Yes: accepted.** No rejection warning, no faults, and the four names resolve (registration first); file-first behaves as in the table. Why it merges cleanly:

- The example's keys (`taiknr.*`) are disjoint from Joel's (`notice`, `path`, `model`, `thinking`, `context`, `blank`). The "two spellings of one instrument" rejection (`C:110`) applies only to one instrument under two spellings.
- Rows are independent lists; the first ten instruments of a row render (`C:46`), and the example's rows have two each.
- Joel's `context` entry (`$bar $percent`) is Jefferson's own instrument and unaffected. `taiknr.context` is a different instrument.
- Placement caveat: the merged footer would have five rows with `rowGap: 0`. The example's rows go below Joel's existing ones, and where they should go is his choice.
- The agent file applies unless a trusted project has its own `.pi/pi-jefferson.json`, which replaces it whole and is never merged (`C:3`). I did not check whether any project of Joel's has one.

### Addendum gaps

- No live pi run: rendered appearance, bar colours at 70%/90%, and the reflow of `taiknr.recall` beside the filling `taiknr.context` were not observed.
- The scratch harness used a fake theme and a hand-built event bus; the fault ledger's delivery (`ctx.ui.notify`) was not exercised. The faults I report are what the reader hands to `source.report`.
- Project-level `.pi/pi-jefferson.json` files were not searched for.
