# Tasks

Implementation order is group order. Each group lands its own tests and leaves `npm run check` green, and each task leaves `npm run typecheck` clean, because a required field lands in the same task as every site that constructs it (`s5-type-ripples.log`; `package.json`'s `check` is `lint && typecheck && test`, and `tsconfig.json`'s include is `src/**/*.ts` and `tests/**/*.ts`, so a widened type breaks a test fixture as surely as it breaks `src`).

No task adds a log line, a notice or an instrument field, and `applied` reaches no Jefferson field: each task's log fields are none (design §6.3; ruling "how scenarios are proven"; ADR 0008).

Every test named below cites its label in `redgreen-derek.md`, the spike that ran each check twice: red against base `d5f8435`, green against the smallest change `design.md` specifies. A label marked **pin** was already green at base — a regression guard rather than a red. Where a group's correctness rests on a check catching a mistake, the group names the mutation from `redgreen-derek.md` §5 that caught it.

The A, B, C, D, E, F, G and L labels are `redgreen-derek.md`'s checks, and M1–M5 are its §5 mutations. They are not design decisions D1–D10 or `michael-orientation.md`'s M-evidence; where both appear, a test is written "test D1" and a mutation "mutation M2".

Sources: `design.md` (§ numbers cited inline), `specs/tail-recall`, `specs/context-figures`, `specs/development-checks`, `design-review.md`, and `owner-rulings.md`, which binds all of them. Where design and spike disagree on a name, the note says which one the task uses.

Markdown documentation is not a task. `README.md`:40 and :112 with the instruments section's under-reporting record, `docs/adr/0009`, `ARCHITECTURE.md`:46-47, `AGENTS.md`:23, :39 and :42, and `.gitignore`:12 (`1b773fe`; no entry to add) belong to Bambadjan's docs pass after the implementation gate (design §4, §10; `redgreen-derek.md` Gap 11).

## File Boundary

Every path below is repository-relative. `Delete` is empty: this change removes no file, and `.gitignore` needs no edit (design §10; `redgreen-derek.md` Gap 11).

| Path | Change | What changes, and why |
|---|---|---|
| `src/use-cases/payload-cache.ts` | Create | The pi-free types `CarrierRecord`, `AppliedPlacement` and `PayloadCacheState` (§5.2). No instance, no logic. Created in 1.1. |
| `src/infra/adapters/anthropic-cache-payload.ts` | Create | The route predicate (D1) and the whole edit (§5.3), plus the applied result and next record derived from the finished clone. Owns every provider-shape fact, including the local lone-surrogate rule and D5's comparison. `RouteModel` and `coversRoute` are 1.1's; `PayloadEdit` and `editPayload` are 1.2's. |
| `src/infra/pi-event-handlers/before-provider-request.ts` | Create | Register `before_provider_request` through the gate and return the edited clone or `undefined`. No rules in it (§5.1). Created in 2.1. |
| `src/infra/pi-event-handlers/payload-cache-commit.ts` | Create | Register `message_end` through the gate; for an assistant message with a valid response, set `state.carrier = state.nextCarrier`. No rules in it (§5.1). Created in 3.1. |
| `src/infra/pi-event-handlers/context.ts` | Modify | Write cell (a) after recall returns and clear it at every `context_with_system`, through a `payloadCache: PayloadCacheState` field on the existing deps object. `(pi, deps)` is unchanged. 4.1. |
| `src/app/extension/taiknr.ts` | Modify | 4.1 creates the state literal beside `recallCache` and passes it at `:57` to `registerContextHandler`; 5.1 passes it at `:59` to `registerInstrumentsResponseHandler`; 6.1 registers the two new handlers. |
| `src/domain/savings-dollars.ts` | Modify | D8: `PricedRequest` gains `blockUncached: boolean`, which selects the input rate over read or write. The rewrite term and its inputs are unchanged. 5.2. |
| `src/use-cases/instruments-publisher.ts` | Modify | `ResponseReadings` gains `applied`, imported as `AppliedPlacement` from `payload-cache.ts` (5.1); D7's start lives in `rewriteOf` (5.2), and the block's folded rate and the baseline's type are 5.2's too, with the baseline staying the pricing home (§5.4). No publisher method is added. |
| `src/infra/pi-event-handlers/instruments-response.ts` | Modify | `registerInstrumentsResponseHandler(pi, holder, state)` takes the payload state as a third parameter, and the read closure it hands the publisher at `message_end` gains `applied` (5.1). A second enumerated exception to `AGENTS.md`:23, beside `session_start`'s. |
| `src/infra/adapters/pi-instrument-readings.ts` | Modify | `readResponse` returns `CompactedReadings` (5.1); the registrar adds `applied` from the state to form `ResponseReadings` (§5.4; `redgreen-derek.md` Gap 7). |
| `tests/infra/adapters/anthropic-cache-payload.test.ts` | Create | The adapter's contract, §5.3: A1's `coversRoute` rows (1.1), then A2–A28, the in-turn test, the throw test and the quiet test (1.2). |
| `tests/infra/pi-event-handlers/before-provider-request.test.ts` | Create | The request handler's registration, edit and fail-open order: B2, B4, B6 (2.1) and B1, B3, B5 (2.2). |
| `tests/infra/pi-event-handlers/payload-cache-commit.test.ts` | Create | The commit timing: C1–C5 (3.1). |
| `tests/infra/pi-event-handlers/session-start.test.ts` | Modify | One pin proving the session's config is read at session start only, and that a file edited afterwards changes nothing until the next start (2.2). |
| `tests/infra/pi-event-handlers/context.test.ts` | Modify | `:112`'s `payloadCache` deps field, and cell (a) written and cleared: D1, D2 (4.1). |
| `tests/support/fake-pi.ts` | Modify | `createContextStub`'s `model` option gains `baseUrl?: string`, so a covered `ctx.model` can be built (§8.1; `tests/support/fake-pi.ts:63`). 2.1. |
| `tests/use-cases/instruments-publisher.test.ts` | Modify | The `contextReading` helper (`:166`) and every reading tsc names there — 42 lines (`s5-type-ripples.log` (c)) — carry `applied: null`, the unedited case that keeps today's expectations (5.1; D7, D8); E1–E6, the coincident-carry case, §8.1's driven case and the one mandated expectation change (5.2). |
| `tests/domain/savings-dollars.test.ts` | Modify | The `request()` helper (`:20`) defaults `blockUncached: false`; E7, E8, E9, and the new split test (5.2). |
| `tests/infra/pi-event-handlers/instruments-response.test.ts` | Modify | `:80`, `:191` and `:215` pass a state literal as the third argument, and the file gains G1 (5.1). |
| `tests/infra/pi-event-handlers/instruments-compact.test.ts` | Modify | `:63`'s reading carries `applied: null` (5.1; `redgreen-derek.md` Gap 6). |
| `tests/infra/pi-event-handlers/instruments-tree.test.ts` | Modify | `:77`'s reading carries the same field (5.1; Gap 6). |
| `tests/infra/pi-event-handlers/instruments-request.test.ts` | Modify | `:109`'s `payloadCache` deps field (4.1) and `:191`'s `applied: null` (5.1). Gap 8's name for this field is `payload`; the field is `payloadCache`. |
| `tests/app/extension/taiknr.test.ts` | Modify | The registration list: fifteen registrations over ten events, duplicates kept: F1 (6.1). |
| `test-cache-point-live.mjs` | Create | The live check of §8.2, at the repository root, outside `biome.json`'s allowlist, `tsconfig.json`'s program and vitest's include (7.1). |

## 1. The payload adapter

`src/infra/adapters/anthropic-cache-payload.ts`, with its types in `src/use-cases/payload-cache.ts`. Every test lives in `tests/infra/adapters/anthropic-cache-payload.test.ts` and calls the pure functions directly, with no fake pi and no network.

The adapter exports `coversRoute` and `editPayload`, and the types `RouteModel` and `PayloadEdit` (`redgreen-derek.md`, "My calls"). `design.md` §5.3 (5) calls the second function `edit`; use `editPayload`, the name the spike ran green. The function is `editPayload(payload, model, recallBlock, carrier) → { output, nextCarrier, applied }` and mutates nothing it is given.

The two declarations:

```ts
export interface PayloadEdit {
	output: unknown;
	nextCarrier: CarrierRecord | null;
	applied: AppliedPlacement | null;
}
export function editPayload(
	payload: unknown,
	model: RouteModel | undefined,
	recallBlock: string | null,
	carrier: CarrierRecord | null,
): PayloadEdit;
```

`output` is `unknown` because pi types the payload and the handler's result as `unknown` (`types.d.ts:715`, :1107); `undefined` means no change. Declared and type-checked in a copy with `npm ci`, where its shape test asserted `{ output: undefined, nextCarrier: null, applied: null }` with no cast.

`coversRoute(model: RouteModel | undefined): boolean` is the route half of D1 and nothing else; `editPayload` owns the object and `messages` checks of §5.3 (3). `RouteModel = { provider: string; api: string; id: string; baseUrl?: string }`, the four fields D1 reads off `ctx.model`. `baseUrl` is optional because pi's `Model` assigns to it and because a test builds the missing-`baseUrl` row without a cast (`types.d.ts`:652; measured with tsc).

For the untouched cases `editPayload` returns `{ output: undefined, nextCarrier: carrier, applied: null }`, and the handler returns `output`.

`editPayload` catches nothing. §5.3 (3)'s three untouched cases — a route `coversRoute` rejects, a payload that is not an object, a payload with no `messages` array — are checked before the clone, return `{ output: undefined, nextCarrier: carrier, applied: null }` and never throw. Every other payload is deep-cloned with `structuredClone`, and whatever is thrown from there on propagates to the handler. That includes `structuredClone`'s `DOMException` on a function, a symbol or a throwing getter. The handler's `catch` (§5.1 step 3; task 2.2, B1) is the single fail-open path.

- [x] 1.1 Create `src/use-cases/payload-cache.ts` with `CarrierRecord`, `AppliedPlacement` and `PayloadCacheState` (§5.2), and `src/infra/adapters/anthropic-cache-payload.ts` with `RouteModel` and `coversRoute` (D1; §5.3 (3)).
  - **Test first:** A1 as `coversRoute` rows — one boolean assertion per row of D1's boundary list, so every covered row asserts `true` and every uncovered row `false`. The red is the missing module.
  - **Covered rows:** `anthropic` / `anthropic-messages` / `https://api.anthropic.com`; and `openrouter` / `anthropic-messages` with an `anthropic/` model id.
  - **Uncovered rows:** `https://api.anthropic.com.corp-proxy.internal` and `https://gw.corp/api.anthropic.com/`, both proxies because host equality is exact; a missing `baseUrl`; a `baseUrl` `new URL` cannot parse; `openrouter` / `openai-completions` with the model id `anthropic/claude-haiku-4.5`, which fails on the api alone; `openrouter` / `anthropic-messages` with the model id `google/gemini-2.5-pro`, which is the false side of D1's `anthropic/` prefix clause, so a predicate that drops the clause turns this row red; an undefined model; and bedrock, minimax, opencode, cloudflare-ai-gateway, vercel-ai-gateway, fireworks and github-copilot, none of which has a covered row (spec `tail-recall` "Only routes the predicate covers change").
  - **Verified by:** `npx vitest run tests/infra/adapters/anthropic-cache-payload.test.ts`, then `npm run typecheck`.
  - **Error behavior:** `coversRoute` returns `false` for an undefined model, an unparsable or missing `baseUrl`, and any uncovered row, and never throws (§6.2).

- [x] 1.2 Add `PayloadEdit` and `editPayload`, the whole of §5.3: the carve-out, the marker walk and pi's message marker, the carrier search and the before point, the budget, the carry, the next record and the applied result (§5.3; D2; D3; D5; D8).
  - **Test first:** A2–A28, plus the in-turn test, the throw test and the quiet test below.
  - **A2's fixture** is A13's pi-OAuth-shaped payload, which a covered model would normalize, passed once with each uncovered model from 1.1. Expected: `output` undefined, `nextCarrier` equal to the given carrier, `applied` null. A payload that is not an object and a payload with no `messages` array give the same; an empty `messages` array is covered.
  - **The carve-out** (§5.3 (4), "Normalization first"; D3): A13, on pi's OAuth shape with no block and no handoff, where base removes no carve-out; A15, with no message marker at all. Both assert the output equals its input except `system[0]`'s marker. A12, a handoff that also recalls — both points placed, pi's last-message marker removed, `system[0]` unmarked, `system[1]` and tools marked, four markers, green as `m[0][0] m[4][0] system[1] tools[0]`; and A14, the same shape on a no-fit request carrying a top-level marker, which places no message-level point and moves none.
  - **The walk and pi's message marker** (§5.3 (4), "A marker, and pi's message marker"): A16 (**pin**) and A17 (**pin**), a foreign message marker beside pi's and a marker inside a `tool_result`'s content, both of which leave the payload equal to its input; A18 and A19, which are red at base (`no edit`) and green once the walk treats a `cache_control` property in a tool's `input_schema` and a `cache_control` key in a `tool_use` block's `input` as data; A20, pi's marker followed by an empty `role:system` effort message, recognised.
  - **A18, A19 and A20's fixtures.** A18 is the `input_schema` property with a handoff that also recalls, which places both points. A19 and A20 are recalling requests over an API key with record (b) null: a `tool_use` input carrying `cache_control`, and an empty `role:system` effort message after pi's marker. In each, the before point is placed.
  - **The carrier and the before point** (§5.3 (4), "The wanted points"; D5): A8, over an API key with cell (a) set and record (b) null — the before point lands on the block before recall's block, pi's marker stays on recall's block, there are four markers, and `applied.block` is `"cached"`, where base makes no edit; A11, cell (a) set with no payload block equal to it, where `applied.block` is null and no point is placed, against base's whole `applied` left null; A25, a string-content message, a pasted `<recalled_context` and a block that is first in its message; A26, a lone surrogate inside the block still matching pi's rule.
  - **The budget** (§5.3 (4), "The budget"; D2): A9, over an API key with a top-level marker, where pi's marker yields to the before point and `applied.block` is `"cached"`; A10, with a second tools marker instead, where `applied.block` is `"uncached"`. Both are red at base (`no edit`).
  - **The carry and the next record** (§5.3 (4), "When a handoff occurs" and "When no carry is placed"; §5.3 (5)): A3, the handoff placing the carry on the last block of the carrier recorded at the index, with `ttl` copied (`{"ttl":"1h","type":"ephemeral"}` on the carry) — base places no carry; A4, `[image, R]` then `[image]` already marked, where `recordOf` is null at base and the output deep-equals its input on the change; A5, the same unmarked, where the carry is placed; A6, a different last block at the recorded index, which places no carry and leaves the payload equal to its input on a three-point route; A7, a carrier still ending with recall's block, where only the before point is placed; A21, a coincident carry, where `applied` is null at base and the output deep-equals its input on the change; A22, two messages ending with the block's exact text, where the higher index is chosen; A23, a two-marker request that leaves the record alone so the next handoff still carries; A24, a no-fit handoff that records nothing, so the next handoff's `carrierRead` is null; A27 (**pin**), a stale carrier; A28, a replay before the commit editing the same way and after it placing no carry.
  - **A8 and A12 gain one assertion each:** the output and the input are deep-equal once every `cache_control` key is removed at every depth.
  - **The in-turn test** (new, not a spike label): fixture over an API key, `[U1, A, U2 = [own text, B], assistant tool_use, user tool_result marked by pi]`, with cell (a) = B and record (b) = `{ index of U2, fingerprint: own text, block: B }`. Expected: the before point on U2's own text, a copy of pi's marker; pi's marker untouched on the last `tool_result`; no carry; exactly four markers; `applied` = `{ carrierRead: B, block: "cached" }`; `nextCarrier` deep-equal to the record. Evidence for the shape: Derek's live L2 rows, turn 2's requests 10–13 (`live-runs.md`:75-78: `system[0] tools[3] m[4][0]:text m[22][0]:tool_result` through `m[28][0]:tool_result`).
  - **The throw test** (new, not a spike label): `expect(() => editPayload({ messages: [], leftover: () => 1 }, coveredModel, null, null)).toThrow()`, with `coveredModel` the `anthropic` / `anthropic-messages` / `https://api.anthropic.com` row from 1.1. In the same test, `editPayload({ messages: [], leftover: () => 1 }, uncoveredModel, null, null)` does not throw and returns `{ output: undefined, nextCarrier: null, applied: null }`, with `uncoveredModel` the `https://api.anthropic.com.corp-proxy.internal` row, so §5.3 (3)'s untouched cases are checked before the clone; and a non-object payload on `coveredModel` returns the same untouched result without throwing.
  - **The quiet test** (new, not a spike label): an API-key payload carrying pi's three markers (`system[0]`, the last tool, the last message's last block), with `recallBlock` null and `carrier` null, on the covered model. Expected: `output` is `undefined`, `nextCarrier` is `null`, and `applied` deep-equals `{ carrierRead: null, block: null }`. §5.3 (5) keeps `applied` non-null for every covered payload carrying exactly one message-level marker, even where nothing was placed, and makes `block` null when no carrier is found; null prices the cached rows, because `blockUncached` is `block === "uncached"`.
  - **Boundary cases:** a covered payload whose system carries one marked block, where nothing in system changes; a payload carrying three system blocks of which two are marked; a payload that is not an object; zero message-level markers; two or more, where no message-level edit is made; a marker whose `type` is not `"ephemeral"`; a `cache_control` key whose value is not an object; a marker nested two levels into a `tool_result`'s content; fewer than two blocks in the carrier message; string content where a point would go, never converted to a block list; two messages ending with the block's exact text; a block alone in its message; room for one more, where pi's marker stays where pi put it; no room, where it is removed; a payload whose markers leave the budget at one; the budget counted on the normalized clone, so the carve-out never spends it; an index out of range; a message that is not `role:user`; the record null; the fingerprint compared with `cache_control` ignored at every depth, non-text blocks by canonical JSON; the two-point handoff where the wanted points plus one exactly fit and where they do not; the carve-out still applied on a no-fit request.
  - **Verified by:** `npx vitest run tests/infra/adapters/anthropic-cache-payload.test.ts`, then `npm run typecheck`.
  - **Catches a mistake:** at the end of the task run M3 and M4, each restored afterwards. M3 (the carve-out is skipped) turns A12, A13, A14 and A15 red, and nothing else. M4 (the budget stops excluding pi's last-message marker) turns eight adapter checks red — A3, A5, A7, A8, A9, A10, A12 and A18.
  - **Error behavior:** the untouched cases return `output: undefined`. A throw is not caught here; it is the handler's (2.2, B1, M1).

## 2. The request handler

`src/infra/pi-event-handlers/before-provider-request.ts` (§5.1), tested in `tests/infra/pi-event-handlers/before-provider-request.test.ts` through the gated fake pi with a ready holder and the test's own state. The handler registers one event and holds no rules.

- [x] 2.1 Extend `tests/support/fake-pi.ts` so `createContextStub`'s `model` option takes `baseUrl?: string`, then create the handler and its registration (§8.1; §5.1).
  - **Test first:** B2, a covered request edits the payload and stores the placement it computed, where base stores nothing; B4, the route re-read per request, so `/model` to an uncovered route stops the edit; B6, publishing off with the edit still made, where base makes no edit.
  - **Boundary cases:** an uncovered `ctx.model`; an undefined `ctx.model`; a rejected config (2.2's B5); publishing on and off.
  - **Verified by:** `npx vitest run tests/infra/pi-event-handlers/before-provider-request.test.ts`.
  - **Error behavior:** the handler never throws out; `undefined` means no edit and leaves the payload as earlier handlers left it.

- [x] 2.2 Add the §5.1 ordering and the failure path, and pin where the session's config comes from.
  - **Test first:** B1, the order that matters — assign `state.applied` a non-null value and `state.nextCarrier` a record different from `state.carrier`, fire `before_provider_request` on a covered `ctx.model` with a payload carrying a function value, and assert the handler returns `undefined`, does not throw, sets `applied` to null, leaves `nextCarrier` deep-equal to `carrier`, and leaves `carrier` unchanged. At base `applied` stays non-null. B3, a covered request followed by an uncovered one, which leaves `applied` null, where base keeps the stale placement. B5 (**pin**), inertness with `enabled` false and with a rejected config.
  - **The session-start pin**, in `tests/infra/pi-event-handlers/session-start.test.ts`. B5 proves the handler is inert on a config it read; this proves the config is read once, at session start, which is what makes one read enough for a session:

    ```ts
    test("a config file edited after session start changes nothing until the next session start", () => {
    	agentConfigFile('{"enabled":true}');
    	const session = createSessionConfig();
    	const fake = register(session);
    	startSession(fake, createContextStub({ cwd: workDirectory, trusted: false, branch: [] }));
    	expect(readyConfig(session.state).enabled).toBe(true);

    	agentConfigFile('{"enabled":false}');
    	expect(readyConfig(session.state).enabled).toBe(true);

    	startSession(fake, createContextStub({ cwd: workDirectory, trusted: false, branch: [] }));
    	expect(readyConfig(session.state).enabled).toBe(false);
    });
    ```

    It is green at base and does not change: it is a pin on behaviour this change relies on and must not break. It ran green at base as written.
  - **Boundary cases:** a payload carrying a symbol; a throwing getter, covered by the same `catch`; `structuredClone` failing on a function; an attempt whose `message_end` was an error, which is the state B1 starts from; a config file edited between two session starts, which the pin covers.
  - **Verified by:** `npx vitest run tests/infra/pi-event-handlers/before-provider-request.test.ts tests/infra/pi-event-handlers/session-start.test.ts`.
  - **Catches a mistake:** mutation M1 (the handler's `catch` stops resetting `applied` and `nextCarrier`) turns B1 and only B1 red. The throw test (1.2) is what makes M1 meaningful: the adapter throws, so B1 exercises the handler's own `catch`.

## 3. The commit handler

- [x] 3.1 Create `src/infra/pi-event-handlers/payload-cache-commit.ts` and register `message_end` through the gate (§5.1; §5.3 (5)).
  - **Test first:** C1, two `before_provider_request` calls with the same handoff payload and no `message_end` between, where the second output carries the carry and base's does not; C4, a valid assistant `message_end` where `carrier` equals the previous `nextCarrier` and base's stays null; C2 (**pin**) and C3 (**pin**), an `error` and an `aborted` response and a payload call with no `message_end` after it, neither of which commits; C5 (**pin**), a user message's `message_end`, which commits nothing.
  - **Boundary cases:** an assistant message with an invalid usage; a `message_end` whose message is a tool result; two commits in a row; no payload call before the commit.
  - **Verified by:** `npx vitest run tests/infra/pi-event-handlers/payload-cache-commit.test.ts`.
  - **Error behavior:** the handler returns nothing and reads nothing the instruments registrar writes, so the two `message_end` handlers are order-independent (§5.1).

## 4. Cell (a) in the context handler

- [x] 4.1 Modify `src/infra/pi-event-handlers/context.ts` to write cell (a) after recall returns and clear it at every `context_with_system`, through a `payloadCache: PayloadCacheState` field on its existing deps object (§4; §5.2). The same task creates the state in `src/app/extension/taiknr.ts` beside `recallCache` — `const payloadCache: PayloadCacheState = { recallBlock: null, carrier: null, nextCarrier: null, applied: null };` — passes it at `:57` as `{ config: session, store, recallCache, holder, payloadCache }`, and adds the field to the deps literals at `tests/infra/pi-event-handlers/context.test.ts:112` and `tests/infra/pi-event-handlers/instruments-request.test.ts:109`.
  - `deps.payloadCache.recallBlock = null` is the handler's first statement, before every early return. After recall returns a non-empty list it is set to `formatRecalledContext(outputs)`, the same text `appendRecalledContextToMessages` appends (`pi-context-adapter.ts:42`). A clear that ran after an early return would leave the previous request's block for a later payload to match.
  - **Test first:** test D1, cell (a) holds the block this request built and is cleared at every `context_with_system`, where base never writes `recallBlock`; test D2 (**pin**), a request recall answers nothing for, which leaves cell (a) empty.
  - **Boundary cases:** a request recall answers with no block; a `context_with_system` before any block was written; two requests in a row on a stating cell. Test D1's own boundary: cell (a) is non-null, a `context_with_system` arrives with no user message, and afterwards `recallBlock` is null.
  - **Verified by:** `npx vitest run tests/infra/pi-event-handlers/context.test.ts tests/infra/pi-event-handlers/instruments-request.test.ts`, then `npm run typecheck`, because the deps field is required and its three construction sites land in this task (`s5-type-ripples.log` (a)).
  - **Error behavior:** none new; the handler's existing fail-open path is unchanged, and the clear is not a decision.

## 5. The figures and the readings

`src/use-cases/instruments-publisher.ts`, `src/infra/adapters/pi-instrument-readings.ts`, `src/infra/pi-event-handlers/instruments-response.ts` and `src/domain/savings-dollars.ts`. The publisher's tests drive `responseReceived` with scripted `usage` and `cost`, because the session harness rewrites every response's usage to characters ÷ 4 at zero cost (`AGENTS.md` Traps).

- [ ] 5.1 The readings: `ResponseReadings` gains `applied`, `readResponse` returns `CompactedReadings`, and the registrar takes the payload state and adds `applied` (§5.4; §4; `redgreen-derek.md` Gap 7).
  - The one shape, stated here and nowhere else:

    ```ts
    interface ResponseReadings extends CompactedReadings {
    	applied: AppliedPlacement | null;
    }
    ```

    `applied` is required, and null means no message-level edit or an untouched payload.
  - `readResponse` returns `CompactedReadings`.
  - `registerInstrumentsResponseHandler(pi, holder, state: PayloadCacheState)`, whose `message_end` read closure is `() => ({ ...readResponse(event, ctx), applied: state.applied })`.
  - `src/app/extension/taiknr.ts:59` passes `payloadCache`.
  - Every reading handed to `responseReceived` in the tests carries `applied: null`. That covers `tests/use-cases/instruments-publisher.test.ts`'s `contextReading` helper (`:166`) and every reading tsc names there: 42 lines (`s5-type-ripples.log` (c)), cleared by `applied: null` on the helper and on each inline reading among them, plus `tests/infra/pi-event-handlers/instruments-compact.test.ts:63`, `instruments-tree.test.ts:77` and `instruments-request.test.ts:191`. `tests/infra/pi-event-handlers/instruments-response.test.ts`'s three registrations (`:80`, `:191`, `:215`) pass a state literal as the third argument.
  - **Test first:** G1, the `message_end` registrar hands `applied` to the publisher unevaluated, where base hands `undefined`; and `tests/infra/pi-event-handlers/instruments-response.test.ts` gains the reading that carries `applied`.
  - **Boundary cases:** `state.applied` null; publishing off, where the reading is never evaluated; a `message_end` for a non-assistant message.
  - **Verified by:** `npx vitest run tests/infra/pi-event-handlers/instruments-response.test.ts tests/use-cases/instruments-publisher.test.ts tests/infra/pi-event-handlers/instruments-compact.test.ts tests/infra/pi-event-handlers/instruments-tree.test.ts tests/infra/pi-event-handlers/instruments-request.test.ts`, then `npm run typecheck`, because `applied` is required and every construction site lands in this task.
  - **Error behavior:** a fault in `applied` lands in the registrar and not in the payload handler (§5.4). The third parameter is the one signature exception this change adds to `AGENTS.md`:23, and the docs pass writes it (design §4, §10).

- [ ] 5.2 D7 and D8 together: the rewrite start in `rewriteOf`, and the block's one pricing rule in the domain and in the publisher (§5.4; D7; D8). One task, not two, because no measured state separates them: the spike ran E1–E9 and M2/M5 against the complete D7+D8 code, and D7-without-D8 or D8-without-D7 was never run.
  - `rewriteOf` reads this request's `readings.applied`. It is a private helper, so passing it as `rewriteOf(request, readings.applied)` is local.
  - When `blockChanged` holds and `applied?.carrierRead === carried.text`, the start is `carried.index + 1`; otherwise it is `carried.index`, today's rule.
  - `PricedRequest` gains `blockUncached: boolean`, and the block's rate becomes `blockUncached ? inputRate : (warm && !blockInNewTail ? readRate : writeRate)`.
  - `blockInNewTail = block !== undefined && (carried === undefined || blockChanged || block.index >= previousLength || baseline.blockUncached)`, with D8's `carried === undefined` and `baseline.blockUncached` clauses.
  - The publisher's `baseline` becomes `(RequestCandidate & { blockUncached: boolean }) | undefined`. The `netDollars` argument literal at `src/use-cases/instruments-publisher.ts:276-283` gains `blockUncached: readings.applied?.block === "uncached"` — this request's placement, never `baseline?.blockUncached`. `baseline = request.candidate` at `:288` becomes `baseline = { ...request.candidate, blockUncached: readings.applied?.block === "uncached" }`. It runs after `rewriteOf` at `:275`, so the `baseline.blockUncached` clause of `blockInNewTail` reads the previous baseline. `requestBuilt` and `RequestCandidate` do not gain the field (design §5.4); the spike's form, which sets `false` at `requestBuilt`, is not used.
  - `tests/domain/savings-dollars.test.ts`'s `request()` helper (`:20`) defaults `blockUncached: false`.
  - **Test first:** In every "(X against Y)" pair below, X is the base figure (red) and Y the expected figure the test asserts (green), as `redgreen-derek.md` §4 gives them. E1, the rewrite starts after the carrier's own content when `carrierRead` matches, which needs D8's write rate for a block changed in place and leaves a zero suffix (`-0.0002625` = −0.7 × 20 × WRITE, where base charges the carrier's own 100 tokens and reads `-0.0012285`); E2, `carrierRead` naming another block keeps today's start (`-0.00147` = −0.7 × 20 × WRITE − 0.7 × 100 × (WRITE − READ), against today's `-0.0012285`, E3's base value; E3's green is also `-0.00147`); E3, a block that changed in place on a carried message is charged the write rate, where base charges the read rate (`-0.0012285` against `-0.00147`); E4, a block the request left uncached is charged the input rate (`-0.06817125` against `-0.054537`); E5, a block that first appears on a message the last priced request carried is a write, where base charges the read rate (`-0.000042` against `-0.000525`); E6, a block the last priced request left uncached is a write, then a read; E7, an uncached block on a warm request is the input rate, where base charges the read rate (`-0.0038955` against `-0.038955`); E8, an uncached block on a cold request is the input rate, where base charges the write rate; E9 (**pin**), a cached block on a cold request is still the write rate. The coincident-carry case of §8.1 — pi's marker on the fingerprint block at the recorded index, `carrierRead` equal to the record's block, the rewrite start excluding the carrier — belongs here too.
  - **The split test, in the same file:** a pin, green at base, because the figure reads the response's cache split as one `cacheRead` and one `cacheWrite` and this change does not touch that. It is the assertion the row "The split alone changes no figure" names:

    ```ts
    test("the split alone changes no figure: the poisoned and the fixed split both net −0.02285", () => {
    	// M2's request at Opus 5.5's catalogue prices: input $4/M, read $0.2/M, write $5/M.
    	const price = (usage: UsageCounts): CostCounts => ({
    		input: usage.input * 4 * MICRO,
    		cacheRead: usage.cacheRead * 0.2 * MICRO,
    		cacheWrite: usage.cacheWrite * 5 * MICRO,
    	});
    	const priced = request({ stubSaving: 37_301, suffixEstimate: 6_315 });
    	const poisoned: UsageCounts = { input: 4, cacheRead: 35_731, cacheWrite: 139_169 };
    	const fixed: UsageCounts = { input: 4, cacheRead: 168_585, cacheWrite: 6_315 };
    	expect(netDollars(responseRates(poisoned, price(poisoned)), priced)).toBeCloseTo(-0.02285, 5);
    	expect(netDollars(responseRates(fixed, price(fixed)), priced)).toBeCloseTo(-0.02285, 5);
    });
    ```
  - **Add §8.1's driven case:** request 1 builds `latestUser {index 0, timestamp 7, tailText "why?"}` with no `reportRecalled` and is priced; request 2 reports a 40-token block, builds `latestUser {index 0, timestamp 7, tailText "block"}` and expects `savedDollarsRequest` of −0.7 × 40 × write.
  - **One existing expectation changes, and the design mandates it.** The publisher test "a shrunk block on the same carried message charges the suffix behind it" expected `-0.7 × 20 × READ − …`; D8 says that block was never cached by any request, so it becomes `-0.7 × 20 × WRITE − …`. Change that one number and leave the assertion's shape alone. The old figure is the latent defect D8 fixes, which 132 of 132 measured requests match (`redgreen-derek.md` §4).
  - **Boundary cases:** no baseline block; no carry or before point on the carrier; an unpriced request in between, which makes the texts differ and falls back to today's start; `applied` null; a zero-token block; a block that is absent; `blockUncached` false on a warm and on a cold request; `carried` undefined with `blockChanged` false and `block.index < previousLength`; a block that is new because `block.index >= previousLength`; an unpriced request that does not move the baseline; an unedited request (`applied` null), which counts as cached; a cold request; every rate still taken from the response's own component costs, and no published figure non-finite (spec `context-figures` "The edges the design decides").
  - **Verified by:** `npx vitest run tests/use-cases/instruments-publisher.test.ts tests/domain/savings-dollars.test.ts`, then `npm run check`.
  - **Catches a mistake:** mutation M2 (D7's start falls back to `carried.index`) turns E1 and only E1 red; mutation M5 (D8 drops the `carried === undefined` clause) turns E5 and only E5 red; the case ran against today's code in a copy and failed at the read rate, so it goes green only with the clause. The split test goes red under a mutation that makes the figure read `warm` as `cacheRead > cacheWrite`, along with two of the publisher's existing tests, and was restored to green (`s5-savings-dollars.test.ts`).
  - **Error behavior:** the domain is pure and throws nothing new; the cost of an edge it cannot price is the one it charges today.

## 6. The composition

- [ ] 6.1 Modify `src/app/extension/taiknr.ts` to compose and register both handlers (`redgreen-derek.md`, "My calls"; §5.2) in any position: registration order is not pinned and does not matter, because the two `message_end` handlers are order-independent (design §5.1), `before_provider_request` is its own event, and F1 sorts the events it records (`tests/app/extension/taiknr.test.ts:14`). The state literal and both of its uses already exist, from 4.1 and 5.1; this task adds the registrations and nothing else.
  - **Test first:** F1, the registration list — fifteen registrations over ten events, duplicates kept, where base has thirteen. This file pins the list, so it changes with the registrations.
  - **Boundary cases:** none; the factory re-runs per session, which is the boundary that gives the holder one cell per session (pi `docs/extensions.md`:512, :529, :1520-1530).
  - **Verified by:** `npx vitest run tests/app/extension/taiknr.test.ts`, then `npm run check`.
  - **Error behavior:** none new; the state starts empty and nothing in the factory can throw.

## 7. The live check

- [ ] 7.1 Create `test-cache-point-live.mjs` at the repository root by copying `.pi/marbleization/cache-point-before-recall/derek/test-cache-point-live.mjs.txt` byte for byte, with one change: the turn-2 precondition at `:174-178` becomes "every request of turns 2 and 3 carries a recall block", over `[...turn2, ...turn3]` (design §8.3). The source checks turn 2 alone, which lets three of H's assertions pass vacuously when turn 3 recalls nothing: the two block checks at `:208-218`, guarded by `H.blockChars === 0` at `:210` and `:216`, and `input_H ≥ ⌈chars/8⌉`, which becomes ≥ 0. The widened precondition holds on every measured live run, where turn 3's requests carried 10,374 or 10,386 block characters. The prompts, the observer string, the exit codes and the `realpathSync` main-module guard stay as they are, because the prompt's wording decides how often the twelve-request precondition holds (design §8.2: 5 of 9 runs) and L1 imports the script's own functions.
  - **Required named exports:** `evaluate(requests)`, `report(route, run)`, `parseObserverLog(text)`. The observer is a string written into the run's temporary cwd, not an export. The script meets §8.3's contract: the absolute extension path resolved from the launch directory, `PI_CODING_AGENT_DIR` and cwd in fresh `mktemp -d` directories, the test `pi-taiknr.json` with `decisionThreshold: 0` and `jeffersonInstruments: false`, the observer, the three prompts, the six preconditions, the four assertions on turn 2's first request and the seven on H, and the per-request table. Exit 2 for a missing key or an unknown route, 3 for a missing extension or a failed precondition, 1 for a failed assertion, 0 otherwise.
  - **Test first:** L1, run from the repository root: `node .pi/marbleization/cache-point-before-recall/derek/live-assertions-offline.mjs . long-added.log long-carry.log`. The driver reads its logs from `.pi/marbleization/cache-point-before-recall/michael/`, relative to the cwd, and replays each into the script's own `evaluate` and `report`. The check is the carry assertion: red on `long-added.log` (`H marks the last block of turn 2's user message: carry message 26: unmarked`), green on `long-carry.log` (`carry message 26: marked`). The probe logs fail the turn-1 preconditions by construction (`redgreen-derek.md` Gap 3), so L1 judges that one assertion only. The driver is not committed: `.pi/` is outside the repository.
  - **Then the widened precondition's own check, after L1:** from the repository root, `node .pi/marbleization/cache-point-before-recall/michael/s5r2-widened-precondition.mjs .`. It replays a synthetic three-turn run into the copied script's own `evaluate`. The expected output is `turn 3 carries its block  pass` and `turn 3 recalled nothing  FAIL  every request of turns 2 and 3 carries a recall block: …,0,0`. The unedited source prints `pass` for both, measured in a scratch run. A turn 3 that never ran is refused by `:180`'s "there is a turn after turn 2", which stays as it is. The scratch script is not committed: `.pi/` is outside the repository.
  - **Boundary cases:** no key; an unknown route; a checkout with no `src/app/extension/taiknr.ts`, which exits 3 with `extension not found: <absolute path>`; a route D1 does not cover, which exits 3 with `precondition failed: D1 covers the route ctx.model reports (<provider>/<api>/<baseUrl>)` (`:167`, `:349`); turn 1's second request reading 0; a request of turn 1 carrying a `<recalled_context` block; fewer than twelve requests in turn 2; a turn 3 that recalls nothing, which the widened precondition refuses.
  - **Verified by:** `node test-cache-point-live.mjs <route>` invoked from another directory, so the `realpathSync` main-module check is what makes it run.
  - **Log fields:** the script prints its own table; taiknr adds no log line, notice or instrument field (§6.3).
  - **Residual:** the assertion logic is proved offline against Michael's logs, because two numbers a log does not carry — the block's characters and turn 2's own text — are §8.3's rather than the logs' (`redgreen-derek.md` §6, "Not verified").

## 8. Every automated proof against the finished code

- [ ] 8.1 Run `npm run check` on the finished tree and record its result; it must exit 0 with lint, typecheck and all tests green. Vitest must report `Test Files 40 passed (40)` — base's 37 (measured at `d21c80b`) plus the three new test files — and more than base's 543 tests. Then re-run the checks later tasks can change: `tests/use-cases/instruments-publisher.test.ts` after 5.2, `tests/infra/pi-event-handlers/instruments-request.test.ts` after both 4.1 and 5.1, `tests/app/extension/taiknr.test.ts` after 6.1, and `tests/infra/pi-event-handlers/session-start.test.ts` after 2.2, whose pin guards behavior the composition rests on.
  - **Test first:** none — this task runs no new behavioural test. It is the re-run §4 of `implementation-readiness-standard.md` requires, because a formatting pass can rewrite a file an earlier check proved clean.
  - **Verified by:** `npm run check` exit 0; on failure, `npx biome check --write .` and then `npm run check` again — never the reverse order.
  - **Also prove the `development-checks` delta here,** since no code task touches it: `B=$(mktemp); A=$(mktemp); git status --porcelain > "$B"; npm install; git status --porcelain > "$A"; diff "$B" "$A"` prints nothing and exits 0, then `rm -f "$B" "$A"`; `git ls-files --error-unmatch package-lock.json` succeeds and `.gitignore` has no entry for it; `git check-ignore -v .envrc` prints `.gitignore:12:.envrc`, whether or not the file exists; `.gitignore` has no `.pi` entry.

- [ ] 8.2 Walk the Scenario Coverage table below against the finished suite and confirm every row's task and label still pass. A row whose label went red in the walk is a finding against the group that owns it, not a new task.

## 9. The live runs on the implementer's routes

These are Derek's two routes in §8.2's table. They run once the tree is finished, are cheap of design decisions and expensive in model calls, and are the only acceptance evidence for the payload's effect on a real provider.

- [ ] 9.1 Run the green side from this checkout, one route per run: `direnv exec . node test-cache-point-live.mjs openrouter`, then `direnv exec . node test-cache-point-live.mjs anthropic-key`.
  - **Test first:** none — L2 and L4 are the green halves of the pair the spike already measured from a copy of the project; this task reproduces them from this checkout. OpenRouter must pass every precondition and every assertion (eleven: four on turn 2's first request, seven on H), and record `read_H` and `write_H` against their bounds as L2 did (L2: 11,775 against 6,771 + 1,314; 953 against 1,223). `anthropic-key` gets the same wording: every precondition and every assertion (eleven), with `read_H` and `write_H` recorded against their bounds. `redgreen-derek.md`'s "twelve" counts the eleven assertions the script prints (`live-runs.md` §3: 17 rows, 6 preconditions and 11 assertions).
  - **Boundary case, and the acceptance rule:** a run that exits 3 on "turn 2 made at least 12 requests" and on no other precondition proves nothing, and is re-run from the start keeping every attempt's printed table; a route's acceptance is the first run that passes every precondition; three such exits in a row on one route is a Validate finding, not a pass (§8.2; `redgreen-derek.md` Gap 4; L4 is exactly such a run).
  - **Verified by:** each run's own exit code and printed table, with `read_H` recorded against its bound (§8.3).

- [ ] 9.2 Run §8.2's discrimination step once, from a base worktree, for both routes: `git worktree add --detach <mktemp -d>/base d5f8435`, then `cd <mktemp>/base && direnv exec <repo> node <repo>/test-cache-point-live.mjs openrouter`, then the same with `anthropic-key`, then `git worktree remove` it. direnv takes the repository's `.envrc` and the extension comes from the worktree.
  - **Test first:** none — L3 and L5 are the red halves of the same pair, already measured against base.
  - **Verified by:** seven assertions failing on each route (L3: the two point checks, the carry check, the block-after check, and `read_H`, `write_H`, `input_H`; L5: the same seven), with the printed `read_H` line recorded against its bound in the Validate evidence.
  - **Residual:** the `anthropic-key` green run has not yet passed the request-count precondition (`redgreen-derek.md` Gap 4), so that route's acceptance is 9.1's fresh run and not L4.

## 10. Joel's live routes

Marked as Joel's. The implementer never ticks these; the conductor ticks each with Joel's observation in his words (ruling "how scenarios are proven"; `owner-rulings.md` Q1(a)). Design §8.2 puts 10.1 and 10.2 at Validate, on his subscription, with a temporary agent directory whose `auth.json` is a symlink to `~/.pi/agent/auth.json`, and the script writes nothing inside `~/.pi/agent`.

- [ ] 10.1 **Joel's — never ticked by the implementer.** Run `direnv exec . node test-cache-point-live.mjs anthropic-oauth` and report whether every precondition and every assertion (eleven) pass. This is the only live evidence for D3's carve-out on pi's own OAuth shape (`redgreen-derek.md` L6, Gap 9), so A12–A15 are the only other evidence and they are synthetic.
- [ ] 10.2 **Joel's — never ticked by the implementer.** Run `direnv exec . node test-cache-point-live.mjs attribution` with `-e ~/.pi/agent/extensions/anthropic-attribution.ts`, and report whether any request carried a guard error and whether every precondition and assertion passed. His guard's relaxation is a dependency of this route and is already landed (design §10); his acceptance session is the report.
- [ ] 10.3 **Joel's — never ticked by the implementer.** In one of his own sessions running this checkout, find a recalling turn whose requests span more than five minutes and the turn after it. From the session JSONL, report the next turn's first request's `cacheRead` against the recalling turn's first request's `cacheRead`. The scenario holds when the first is the larger (N2: 8,138 read on the create request after a 7.5-minute turn). The conductor reads the JSONL and ticks it with Joel's observation in his words.

## Scenario Coverage

Every scenario in the delta specs, with the task and label that prove it. `pin` marks a scenario the change does not alter, proven by an assertion that is already green and that 8.1 re-runs. `docs pass` marks a scenario about Markdown, which is Bambadjan's after the gate (design §4, §10). `Joel` marks a scenario only his own session observes.

### tail-recall — A recall block does not cost the turn its cached prefix

| Scenario | Task | Proof |
|---|---|---|
| The payload shape is the guarantee | 1.2 | A8, A12; live 9.1 (L2) |
| A handoff that also recalls | 1.2 | A12; red at base 9.2 (L3) |
| A recalling request after a turn that recalled nothing | 1.2 | A8; live 9.1 (L2, `input_R1` 3 against 1,040) |
| In-turn requests | 1.2 | the in-turn test; live 9.1 (L2, `live-runs.md`:75-78) |
| The next turn's first request reaches the recalling turn's entry | 1.2 | A3, A4, A5; live 9.1 (L2 `read_H` 11,775, L3 red) |
| A turn longer than the lookback | 1.2 | A3; live 9.1 (L2, twelve requests in turn 2) |
| A turn longer than the entry's remaining lifetime | 1.2, 10.3 | shape: 1.2, A8 and the in-turn test, which show the before point on every request that carries the block, the mechanism N2 depends on; billing: Joel 10.3, because no automated test observes a TTL and the live script does not run 7.5 minutes |
| The turn continues a thread | 1.2 | A3; live 9.1 (L2) |
| Only the cache markers differ | 1.2 | A8 and A12, each with the output and the input deep-equal once every `cache_control` key is removed at every depth |
| Nothing recalled and nothing handed off | 1.2 | the quiet test |
| A handoff that recalls nothing | 1.2 | A3 |

### tail-recall — Only routes the predicate covers change

| Scenario | Task | Proof |
|---|---|---|
| The measured routes carry the edit | 1.1, 1.2 | A1, A8, A12; live 9.1 (L2) |
| Joel's route is served as pi's own provider is | — | Joel 10.2 |
| A provider pointing at a proxy keeps today's payload | 1.1 | A1 (the two proxy hosts and the missing-`baseUrl` rows) |
| Bedrock keeps today's payload | 1.1 | A1 (no covered row) |
| The other Anthropic-format gateways keep today's payload | 1.1 | A1 (no covered row) |
| Gemini through OpenRouter keeps today's payload | 1.1 | A1 (`openrouter` / `anthropic-messages` with the model id `google/gemini-2.5-pro`, which fails on D1's `anthropic/` prefix clause) |
| OpenRouter's OpenAI-shaped path keeps today's payload | 1.1 | A1 (`openai-completions` row with the `anthropic/claude-haiku-4.5` id, so it fails on the api alone) |
| No model on the request | 1.1 | A1 (undefined `ctx.model`) |
| A payload pi marked nowhere | 1.2 | A13, A15 |

### tail-recall — The payload edit keeps other extensions' changes and the provider's limits

| Scenario | Task | Proof |
|---|---|---|
| The two points it wants | 1.2 | A8, A3, A12 |
| The budget decides, and pi's marker yields | 1.2 | A9, A10 |
| Another extension's marker survives | 1.2 | A16 (pin), A17 (pin) |
| The budget is spent, so nothing moves | 1.2 | A14 |
| Tools, the top-level marker and foreign markers are untouched | 1.2 | A16, A9, A12 |
| Two recalling turns in a row | 1.2 | A12 (`m[0][0] m[4][0] system[1] tools[0]`) |
| The retention follows pi's own | 1.2 | A3 (`ttl` copied), A12 |
| A block the handler cannot find | 1.2 | A25 (the pasted `<recalled_context`), A11 |
| String content where a point would go | 1.2 | A25 |
| A block that is first in its message | 1.2 | A25 |
| A stale carrier | 1.2 | A27 (pin) |
| A payload it cannot read | 1.2, 2.2 | A2 (pin), B1 |
| A request taiknr built nothing for | 1.2, 3.1 | A28, C2 (pin), C3 (pin), C4 |

### tail-recall — The one carve-out on a four-point payload

| Scenario | Task | Proof |
|---|---|---|
| The marker is gone on every request | 1.2 | A13, A15, A12, A14 |
| The cost is about nothing | 1.2 | A13 (the output equals its input except `system[0]`) |
| Joel's route never matches the shape | 1.2 | A8 (one marked system block, nothing in system changes); Joel 10.2 |
| The route cannot be switched mid-session | 2.2 | the session-start pin: the config is read once, at session start, and a file edited afterwards changes nothing until the next start |
| The model is switched mid-session | 2.1 | B4 (the route re-read per request) |

### tail-recall — The payload edit is inert while taiknr is off

| Scenario | Task | Proof |
|---|---|---|
| A project file turns taiknr off | 2.2 | B5 (pin) |
| A rejected config file | 2.2 | B5 (pin) |
| Publishing off, recall on | 2.1 | B6 |

### tail-recall — The record of what a recall block costs follows the measurement

| Scenario | Task | Proof |
|---|---|---|
| The README's account matches the provider's billing | — | docs pass (`README.md`:40) |
| The reason a figure can read negative in steady state | — | docs pass (`README.md`:112) |
| A new ADR narrows the old consequence | — | docs pass (`docs/adr/0009`) |

### context-figures — A figure that reads negative says why, where it is read

| Scenario | Task | Proof |
|---|---|---|
| The reasons are named | — | docs pass (`README.md`, instruments section) |
| The lever is named | — | docs pass (`README.md`:67) |
| Nothing is credited and nothing is promised | — | docs pass |
| The under-reporting is recorded where the figure is read | — | docs pass (§7.3) |

### context-figures — Dollar savings are net of cache rewrites and of recall's classifier spend

| Scenario | Task | Proof |
|---|---|---|
| A warm request after taiknr's own change | 5.2 | E1, E2 |
| A request the edit did not reach keeps today's rule | 5.2, 2.2 | E2, B1, B3 |
| The block is not inside the charged suffix | 5.2 | E1, E4 |
| The split alone changes no figure | 5.2 | the new `savings-dollars.test.ts` test "the split alone changes no figure: the poisoned and the fixed split both net −0.02285" (green at base) |
| Recall's classifier spend is inside the net | — | pin: publisher tests "two calls before one valid response add up and are subtracted once" and "an absent, non-finite or negative cost counts as no spend"; 8.1 re-runs them |
| A negative total is published as it is | — | pin: "a block larger than the stub saving publishes a negative pair and a falling total" and "a negative saving that rounds to zero is published as minus zero"; 8.1 re-runs them |
| The pair publishes together at the response | 5.1 | pins "a valid response makes its pair live and re-posts every k-scaled figure with the new k" and "an invalid response consumes the pending request, so the next valid one prices nothing", plus G1 for the `applied` the reading now carries |
| An earlier note this corrects | — | docs pass (`README.md`, instruments section) |

### context-figures — A saving is priced at the rates the request's own response reported

| Scenario | Task | Proof |
|---|---|---|
| A cold request | 5.2 | E9 (pin) — the warm gate is untouched by this change (D9) |
| A warm request that read only part of its prefix | — | pin: the `savings-dollars.test.ts` row "a request that read part of its prefix from cache is priced warm"; 8.1 re-runs it |
| The block's charge, by placement and request | 5.2 | E3, E4, E5, E6, E7, E8 |
| An applied edit is the source, not the intent | 5.1, 2.2 | G1, B1, B3 |
| The edges the design decides | — | pin: the `savings-dollars.test.ts` rows "a cache read whose token count is zero while its cost is not", "mixed short and one-hour cache writes, so the write rate is blended" and "a counterfactual that would have crossed a cost tier is priced at the actual read rate", and the test "a cost that is non-finite or negative falls back instead of pricing the request"; 8.1 re-runs them |

### development-checks — A fresh install leaves the working tree clean

| Scenario | Task | Proof |
|---|---|---|
| Install does not dirty the tree | 8.1 | `git status --porcelain` before and after `npm install`, diffed and identical |
| The lockfile is committed | 8.1 | `git ls-files --error-unmatch package-lock.json` succeeds; `.gitignore` has no entry for it |
| `.envrc` stays out of the repository | 8.1 | `git check-ignore -v .envrc` prints `.gitignore:12:.envrc` (`1b773fe`) |
| `.pi/` is not re-decided | 8.1 | `.gitignore` has no `.pi` entry; this plan creates none |

## Residuals and open questions

These are questions the evidence does not settle, recorded rather than decided here.

1. **The twelve-request precondition is model-dependent** (design §8.2: 5 of 9 runs). §8.2's re-run rule is the answer this plan uses, in 9.1. A more reliable prompt is unexplored.
2. **The carve-out's only live proof is Joel's OAuth session.** On every route the implementer owns, system carries one marked block, so D3 never fires; A12–A15 are synthetic (Gap 9). Task 10.1 is where that is settled.
3. **The spec's uncached row has no live evidence.** Every route runs with `jeffersonInstruments: false`, as §8.2 requires, so `applied.block` moves no figure in a live run; E4 and E7 are the row's only proof (Gap 10). Task 9.1 must not claim the row is measured.
4. **The carry is one hop.** A handoff request carries no block, so it records null and nothing is carried after it; a recalling turn must re-establish the carry (`redgreen-derek.md` Gap 5; §5.3 (5)). A28 documents it. No task may be written to "keep the carry" across a handoff record, because the design does not.
5. **The 7.5-minute billing half is Joel's to observe (10.3); 8.2's walk does not re-run N2.** The coverage row "A turn longer than the entry's remaining lifetime" carries both halves: the shape's proof in A8 and the in-turn test, and the billing half in task 10.3, because no automated test observes a TTL and the live script does not run 7.5 minutes.
