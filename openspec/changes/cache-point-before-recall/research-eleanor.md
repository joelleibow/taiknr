# Eleanor research — cache-point-before-recall

## Scope and evidence

Repository: `/Users/joelleibow/Projects/taiknr`. Research scoped to taiknr source, tests, docs, the target change directory, and the supplied Joel rulings. Read `AGENTS.md`, `ARCHITECTURE.md`, `package.json`, `owner-rulings.md`, ADR 0007, and the relevant README sections; inspected relevant implementation/tests and current git status. I did not edit source/configuration. `.gitignore` already contains `.envrc` (line 8); `git status --short` reports it modified. Left it untouched as instructed.

## Recall block and lifecycle

- `src/domain/recall.ts:17-23,33-54` declares `<recalled_context>` markers and formats recalled outputs as a string.
- `src/infra/adapters/pi-context-adapter.ts:27-45` appends this as a **separate text content part**, not concatenated into the existing message text. String content is first converted to a text part; existing content parts (including images) remain in order; recall is appended after them. The target is copied, not mutated.
- `src/infra/pi-event-handlers/context.ts:31-35,49-90` registers `context_with_system`, finds the newest user message, runs scoring and returns appended messages. No recall is persisted. `src/app/extension/taiknr.ts:57-58` registers it followed by the instruments request handler, whose comment confirms its event list is already post-recall (`src/infra/pi-event-handlers/instruments-request.ts:5-12`).
- ADR 0007, “Recall on the Whole Request, Inside Its Own Bound,” accepts `context_with_system`, explicitly not `context`; its Consequences section states the next user request loses the block and the provider writes the recalling turn again.
- Search of `src/` and `tests/` found no `before_provider_request` registration. Existing lifecycle registrations all reside in `src/infra/pi-event-handlers/` and are composed in `src/app/extension/taiknr.ts`.

## Potential payload discoverability and handler conventions

Taiknr's explicit marker is the exact `<recalled_context>` string inside a text content part (`src/domain/recall.ts:17-23,33-54`; adapter append at `src/infra/adapters/pi-context-adapter.ts:39-45`). There is no explicit recall id or metadata marker in this block. Thus the string is the only taiknr-side payload marker found. Whether it is reliably present/unchanged at `before_provider_request` depends on pi provider transformations and hook ordering; Chidi is checking provider facts, and this repository inspection cannot establish that.

`AGENTS.md` conventions: every handler registers exactly one lifecycle event under `src/infra/pi-event-handlers/`; preserve the existing parameter name and fixed public signatures; register through the session gate except the one enumerated `session_start` exception, which is directly registered with the config-holder `pi`. The gate is `src/app/extension/handler-gate.ts:7-18`, and `taiknr.ts:28,39-59` composes it. Handlers read config from its holder at event time. Existing request registrars have fixed `(pi: ExtensionAPI, holder: InstrumentsHolder)`-style signatures, but there is no `before_provider_request` precedent to infer its exact desired dependencies/signature. The gate only checks `session.isActive()` (`handler-gate.ts:15-17`); it does not itself pass config.

## Savings dollars and why negative values occur

- Pure calculation: `src/domain/savings-dollars.ts:28-46` derives rates from assistant `usage` and `usage.cost` components (`input`, `cacheRead`, `cacheWrite`); unavailable cache component rates fall back to input rate. `netDollars` at lines 49-60 prices stub savings, subtracts recalled-block cost, warm-cache rewrite premium, and classifier spend. A negative result remains negative.
- Publisher: `src/use-cases/instruments-publisher.ts:147-153` owns since-start accumulator and uncharged classifier spend. `requestBuilt` records request estimates/block (`229-261`); `responseReceived` computes request net and accumulates it (`263-305`). Rewrite calculation is at `184-203`: it finds the earliest new stub suffix or changed prior recall block, estimates that old suffix through the previous request length, and `netDollars` charges `suffixEstimate * max(0, writeRate-readRate)` for warm responses (`savings-dollars.ts:59`). A cold response has no rewrite charge. A changed recall block is therefore charged, as are newly introduced stubs. The resulting penalty does not charge the full suffix again, only the cache-write/read rate differential, reflecting the rewrite premium.
- Response inputs: `src/infra/pi-event-handlers/instruments-response.ts:9-29` invokes on assistant `message_end`, forwarding provider/model, stop reason and the three usage and three cost components from the assistant message. `src/infra/adapters/pi-instrument-readings.ts:104-116` detects latest user's final text block; `readRequest` estimates each outgoing message at lines 138-158 (see full file), so appended recall is represented in those estimates.
- `savedDollarsRequest` and `savedDollarsSinceStart` are posted from the net and accumulator at `instruments-publisher.ts:284-300`. The latter resets with a new publisher/session; it is in-memory only (`ARCHITECTURE.md`, §4, “In-memory instrument state”).
- Mechanism: `rewriteOf` only detects the recall block change when current latest-user timestamp/tail differs from the baseline block (`instruments-publisher.ts:189-200`). Since recall is appended to that tail and then disappears next turn, the old block's user-message suffix is included in the rewrite suffix. Stubbing can also trigger rewrite via `newStubStart` (`136-141`, and `188-200`). Hence code accounts for both recall and stubbing under the modeled suffix premium, not neither. Cost is response-derived and counterfactual, so a cache-write premium plus recall's own input cost and classifier spend can exceed the priced value of withheld stub text, especially early on; then request and since-start values go negative. README states signed/net behavior at lines 112-114.
- No value-specific explanation can be verified for `-$0.0215` or `-$0.3449` from source alone. The provided taiknr `$PI_SESSION_FILE` was identified as `/Users/joelleibow/.pi/agent/sessions/--Users-joelleibow-Projects-taiknr--/2026-11-15T02-36-28-298Z_01a1dd10-3109-752d-a098-1566f07dd9a3/672a2237-e6d9-4d44-8ffa-d4fa21e877ba/run-0/session.jsonl`; I did not inspect it or the upbuild-dev sessions. Recall blocks are not persisted per brief, so persisted session data would not directly contain them.

## Tests and harnesses

- Recall formatting and marker escaping: `tests/domain/recall.test.ts`; adapter append/preservation: `tests/infra/adapters/pi-context-adapter.test.ts`; handler event and returned content shape: `tests/infra/pi-event-handlers/context.test.ts` (asserts block is last text content part); end-to-end host dispatch and non-persistence: `tests/app/extension/archive-session.test.ts` (notably around lines 416-541). These provide session-level payload-shape coverage at `context_with_system`, but not a `before_provider_request` payload assertion.
- Savings domain rules: `tests/domain/savings-dollars.test.ts`. Publisher and rewrite scenarios: `tests/use-cases/instruments-publisher.test.ts`, including changed/retained block and stub suffix cases (grep hits around lines 445-627). Response extraction: `tests/infra/pi-event-handlers/instruments-response.test.ts`; request estimate extraction: `tests/infra/adapters/pi-instrument-readings.test.ts`; publication declaration: `tests/infra/adapters/jefferson-instruments-declaration.test.ts`.
- `AGENTS.md` notes session-level harness replaces response usage with chars/4 at zero cost, so dollar rules need scripted usage/cost in handler/publisher tests; session harness only validates wiring. Gate behavior and fixed registration convention are tested in `tests/app/extension/handler-gate.test.ts` and `tests/app/extension/taiknr.test.ts`.

## Docs and ADRs likely touched

- `README.md`: Recall section line 40 says block disappears and provider re-caches once; instruments/savings explanation lines 112-114 describes net negative dollars and rewrite. These are the clearest user-facing descriptions to update if behavior changes.
- `ARCHITECTURE.md`: opening paragraphs, §3 Pi event handlers, §4 in-memory instrument state, and glossary entries for tail recall/dollar rule describe current placement and transient behavior.
- ADR 0007 is accepted and its body must not be edited under `AGENTS.md`; a changed decision should be recorded as a new ADR narrowing/superseding it, with title/path added to OpenSpec as appropriate. ADRs found: `docs/adr/0001-keep-domain-and-use-cases-free-of-pi-types.md` through `0008-publish-figures-through-the-hosts-instrument-contract.md`; 0007 is the recall placement decision.

## Configuration and project conventions read

`package.json`: ESM package; `npm run check` chains lint, typecheck, test; `npm test` is vitest. `AGENTS.md` says tests are only `tests/**/*.test.ts`; lint allowlist excludes markdown/OpenSpec. The new handler would therefore require a corresponding handler test and composition wiring test; any payload shape change needs adapter/session-level checks. No commands/tests were run.

## Unknowns / residual risks

- Provider hook payload shape, event order relative to Anthropic serialization/cache breakpoint selection, and reliable marker survival are outside taiknr and remain for Chidi to establish.
- The OAuth four-point limit and whether `system[0]` must be relocated are provider-specific, unverified here.
- No live-session usage/cost trace was inspected; source explains ways to go negative, not the exact two reported readings.
- Exact public signature and registration implications for a new `before_provider_request` handler are not established by existing taiknr code. Joel's owner rulings bind: provider coverage requires measured evidence and the direct Anthropic API-key route is also required; do not infer broad provider support.
