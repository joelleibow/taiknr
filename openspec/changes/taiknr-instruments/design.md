# Design

## Context

Motivation is in `proposal.md`. What shapes the approach:

- **The host's own figure is the problem being answered.** After a settlement, a `context_edit` newer than the last usage makes pi sum characters ÷ 4 over the whole projection until the next response (`research-chidi` B7; T1). Played back over Joel's taiknr session `…01a1dd10` (Anthropic `claude-opus-5-5`, usage replayed from the persisted session, 33 settlements followed by a request), pi's figure sits 38.0–41.2 % below the next request's real prompt at every one, median 39.4 % (M1). The same fallback drives pi's pre-run compaction check (T2). taiknr publishes a replacement reading; it changes neither.
- **The harness already holds the inputs.** The store keeps each item's `stub` and `rawText` (`ArchivedToolOutput`, `src/domain/archived-output.ts`), settlement builds both strings before it drafts (`research-eleanor` §1), hydration replaces the store from the branch, and recall appends one text block to the latest user message inside `context_with_system` (`research-eleanor` §1). Nothing records a token size today, and nothing publishes anything (`research-eleanor` §1, §6).

**The existing flow the instruments read**

| Event | What taiknr does there today | What that leaves for the instruments |
|---|---|---|
| `tool_call` | records the call's one-line argument summary | nothing to measure: the argument summary is not the text that gets archived |
| `turn_end` | stages that turn's tool results that are large enough to archive, in the run buffers | the staged text of the items a settlement will replace, not yet on the branch |
| `agent_before_settle` (settlement) | for each staged result the branch still admits, drafts a `context_edit` that replaces the result's content with its stub; drafts one `taiknr-side-store` custom entry holding the raw text; writes the in-memory store. These drafts are the boundary: pi commits every handler's returned entries together after the last handler returns, so the store runs ahead of the branch until then | each item's raw text and its stub, in the store |
| `agent_settled` | fires after that commit (T15); the store and the branch agree unless pi discarded the boundary, in which case the store keeps what the branch lacks until the next hydration (AGENTS.md) | the store as it stands, which the archive instrument counts |
| `context_with_system` (recall) | scores the archive against the latest user message, once per prompt; appends one `<recalled_context>` text block to that message for this request only, and persists nothing | this request's block: the last content block of the latest user message |
| `session_start`, `session_tree`, `session_compact` (hydration) | replace the whole store with the items the branch's side-store entries carry | a store rebuilt from the branch |

1. **The branch** is the root-to-leaf entry path that `getBranch()` returns. **The projection** is the message list pi builds from it with every `context_edit` applied and compaction honoured (`buildSessionProjection()`).
2. A stub persists and stays in every later request. A recall block exists in one request only. `ARCHITECTURE.md` §11 holds the full definitions.
3. **A key to the citations.** J, T, S, M, Q and O numbers are `michael-orientation.md`'s; "ruling N" is `council.md`'s; C, CR, CB, R, ZO, STRUCT and CAT ids are the council lens reports' (`council-<lens>.md`).

- **Jefferson offers a contract and no reply channel.** `jefferson:registration` and `jefferson:update` carry a registration of instruments and per-field reports; a report cannot carry `null` or `undefined`; every declared field must be posted or the instrument blanks; only `session_shutdown` clears a value; an extension gets no signal about whether anyone listens (`research-chidi` A1, A3). Registration from `session_start` before the first `await` is the contract's instruction, because pi's `resources_discover` may follow immediately (T11).
- **The contracts this change must not widen.** Seven registrations and the registrar, adapter and port contracts are frozen against `abaa6b0` except the closed list in the `extension-packaging` delta (ruling 7); a handler registers exactly its one lifecycle event and the gate is the only place inertness lives (`AGENTS.md`); `src/domain/` and `src/use-cases/` import no pi package (ADR 0001); `npm run check` is the gate (ADR 0003); recall's return, budget, key and eligibility are unchanged (ADR 0007); a record's shape is never versioned, which is why nothing here is persisted (ADR 0004).
- **What the calibration can and cannot claim.** k = prompt tokens ÷ the estimate of the request that produced them reproduces real prompts to a median 0.02–0.04 % and a worst 5.62 % across four long sessions (402–695 predictions each), and a worst 8.83 % on three short ones (57–235 predictions) (Chidi C, run with `.pi/ctx-check.mjs` and `.pi/ctx-calib.mjs`; the four long sessions are three Anthropic at 0.58–0.70 and one OpenRouter/deepseek at 0.90–0.99), and to a median 0.06 % and at most 0.48 % at the 33 settlements above (M1). At one settlement's scale the data cannot confirm it: the request-to-request prediction miss is a median ~340 tokens against a median settlement saving of ~1,200, 21 % of the saving at the median and 130 % at p90 (M3). That is why every token figure keeps the flag and the saving is computed from estimates alone.
- **The dollars are a model, and they were computed once.** M4's rules, run over 441 requests of `…01a1dd10`: gross $2.80, rewrite penalty $0.25, net +$2.55, 20 requests net-negative, running total −$0.007 mid-session. M4 is a rough model, not a design, and it left recall out.

## Goals / Non-Goals

**Goals:**

- G1. Publish the four instruments `taiknr.context`, `taiknr.archive`, `taiknr.savings` and `taiknr.recall` on Jefferson's contract, from taiknr's own handlers, with every declared field carrying a value from the moment it is declared (J14; T9; ruling 6).
- G2. Publish the six figures, the per-request and since-start savings in tokens and dollars, and the classifier's in-flight state, as the `context-figures` delta defines them (J9; J12; J13; rulings 1–5).
- G3. Turn one character estimate into a token figure through one ratio per model pair and one flag, so every figure is finite and every reader knows whether the current pair's ratio is calibrated (S1; J10; J11; ruling 4; ruling 13).
- G4. Give the user a context figure to watch that does not jump, and a bar that reads the model's window without taiknr changing pi's or Jefferson's behaviour (J3; J5; ruling 5; ruling 22).
- G5. Cost stubbing, settlement and recall nothing: no new reporting channel, no throw inside another handler, no changed return (T12; ruling 11).

**Non-Goals:**

- Everything `proposal.md` §"What this change deliberately does not do" excludes, not restated here.
- Design-level exclusions the rulings fix: no second gate condition and no `SessionConfig` or `handler-gate.ts` change (ruling 6); no port member and no scorer wrapper (ruling 8); no persistence of the running total (Q1(a)); no fix to recall's size bound (Q4(a)); no source-scanning test where a compiler flag does the job (ruling 17); no wrapper, cache or queue around the publisher (ruling 18 accepts the cost).

## Module & File Placement

Layers as ADR 0001 has them. `src/domain/` imports nothing outside `src/domain/`. `src/use-cases/instruments-publisher.ts` imports `src/domain/` and the `ArchiveStore` port, and declares the three interfaces it requires from outside (`InstrumentSink`, `ClassifierObserver`, `InstrumentsHolder`). `src/infra/` implements those against pi and `pi-jefferson/instruments`. `src/app/extension/` composes. No pi or `pi-jefferson` import enters domain or use cases.

### Created

| File | Layer | Single responsibility | Why not an existing module |
|---|---|---|---|
| `src/domain/token-estimate.ts` | domain | The one rule that turns a bare string into a token estimate, `ceil(chars / 4)`, for raw text, a stub and the recall block | `context.ts` holds the inverse for recall's budget (`budgetCharacters = 4 * …`), which Q4(a) leaves untouched; a second inversion beside it is exactly the drift T16 names. Message-level estimates are pi's `estimateTokens`, called from infra, never re-derived |
| `src/domain/context-figures.ts` | domain | The six figures, the request's token saving and its identity, the archive's totals, and matching a request's stub texts to the store's raw text | New arithmetic with no host access. `src/domain/archived-output.ts` is a record shape, not a calculation |
| `src/domain/calibration.ts` | domain | The `Pair` type, sample validity, selecting k for a model pair, the ratio table's transitions (seed, reseed, live sample) as functions over a table value the publisher holds, and the uncalibrated flag's state | Deciding arithmetic over plain numbers (T5–T7, ruling 13); putting it in an infra adapter would put the rule where a later CLI or MCP root cannot reuse it (ARCHITECTURE §9) |
| `src/domain/savings-dollars.ts` | domain | Rates from one response's usage, warm and cold pricing, the rewrite charge, the net | Same reason; its only inputs are numbers, and every row of its table of cases but row 12 is tested in domain |
| `src/use-cases/instruments-publisher.ts` | use case | The per-session publisher: the ratio table keyed by pair, the pending request, the rewrite state, the recall block recall last reported, the uncharged classifier spend, the since-start totals, and one method per publishing event, each taking its host values through one deferred reading; declares `FigureKey`, `FigureValues`, `Publication`, `InstrumentPublisher`, `ResponseMessage` and the reading types, and the `InstrumentSink`, `ClassifierObserver` and `InstrumentsHolder` interfaces it needs | The state has one writer per event (ruling 14) and no existing module holds cross-event instrument state. Declaring the interfaces here rather than in `ports.ts` keeps every existing port contract untouched (ruling 7) |
| `src/app/extension/instruments-holder.ts` | composition | `createInstrumentsHolder()`, the per-session holder: a no-op publisher until one is installed | It is wiring, and `handler-gate.ts` owns the `enabled` gate, which this must not touch (ruling 6). The `InstrumentsHolder` interface is declared in the use case beside `InstrumentPublisher`, so every registrar and `context.ts` import inward and infra never depends on the composition root |
| `src/infra/adapters/jefferson-instruments-declaration.ts` | infra | The `as const` field table, `TAIKNR_FIELDS`, which is the total map from each `FigureKey` to its field name because each key is its own field name; the module-constant registration with the four instrument declarations, their variables and default formats; and building a report per field. It is the only place `pi-jefferson/instruments` types appear | It is the contract taiknr declares, pinned by tests because Jefferson's verdict is invisible (T10). Keeping it beside the bus adapter mixes data with transport |
| `src/infra/adapters/jefferson-bus-adapter.ts` | infra | Emitting the registration and each update on `pi.events`, catching silently with the `loader.js` citation | No existing adapter talks to Jefferson; `pi-archive-adapter.ts` and `pi-context-adapter.ts` talk to the session manager and the request |
| `src/infra/adapters/pi-instrument-readings.ts` | infra | One reading per publishing event — `readRequest(event, ctx)` and `readResponse(event, ctx)`, which read their event, and four that take `ctx` alone — turning host state into the plain readings the figures need: the request's message estimates, its tool results' first texts and its latest user message, the persisted projection's estimate, the window, the current pair — read by one `readPair(ctx)` that every reading shares — and the branch's usage samples per pair. A registrar hands the publisher `() => read<Event>(…)` and reads nothing itself | Six registrars would otherwise each read the projection and the window, and one copy of "count the system message the same way on both sides" would drift per file (T7) |
| `src/infra/pi-event-handlers/instruments-session-start.ts` | infra | The switch's only reader: build the real publisher, and install it in the holder once its opening reading has been evaluated and the registration and opening figures have been posted | A new event for an existing file's event is a new registrar, because `session-start.ts` keeps its signature and its job (ruling 7 (a), ruling 9) |
| `src/infra/pi-event-handlers/instruments-request.ts` | infra | The request figures and the pending request, at `context_with_system`, after recall | Same; `context.ts` is recall's and must not gain a publish throw |
| `src/infra/pi-event-handlers/instruments-response.ts` | infra | The savings pair and the since-start totals, the re-post of every k-scaled field, and total context and the window, at `message_end`, assistant messages only | Same |
| `src/infra/pi-event-handlers/instruments-settled.ts` | infra | Total context and the archive, at `agent_settled`, after the boundary commits | Same |
| `src/infra/pi-event-handlers/instruments-compact.ts` | infra | Total context and the archive, at `session_compact`, after re-hydration | Same |
| `src/infra/pi-event-handlers/instruments-tree.ts` | infra | Total context and the archive, and reseeding the ratio table, at `session_tree` | Same |
| `tests/domain/token-estimate.test.ts` | test | The rule and its behaviour on a surrogate pair and an empty string | Mirrors its layer |
| `tests/domain/context-figures.test.ts` | test | The six figures, the identity in both forms and on the unrounded values, stub matching, archive totals | Mirrors its layer |
| `tests/domain/calibration.test.ts` | test | Valid and invalid samples, pair selection and reseeding, the flag's transitions — the cases D7 lists | Mirrors its layer |
| `tests/domain/savings-dollars.test.ts` | test | One case per row of the dollar table (D8) except row 12, which prices nothing and is the response-state table's row (4), tested in `tests/use-cases/instruments-publisher.test.ts` and `tests/infra/pi-event-handlers/instruments-response.test.ts` | Mirrors its layer |
| `tests/use-cases/instruments-publisher.test.ts` | test | The state machine: one writer per event, every response shape, the identity before and after a response, the rewrite state, the uncharged spend, the since-start totals, and the pair each update is posted under — after a valid response makes pair A live at k = 0.62, `settled` with reading pair A posts `totalContext` at k = 0.62 with `uncalibrated` false; `compacted` with reading pair B, a seeded pair, posts B's seed k with the flag on; `treeJumped` with `pair` undefined posts k = 1 with the flag on; an errored `message_end` whose reading pair is A re-posts total context at A's k; and a request whose pair differs from its response's, observed only through a recording sink's posts: after an earlier valid response made pair A live at k = 0.62, `requestBuilt` with reading pair A and an estimate of 100,000, then `responseReceived` with eager `provider` and `model` B and a prompt of 95,000, whose update posts `contextInTurn` 95,000 with `uncalibrated` false, then a following `settled` with reading pair A posts `totalContext` at k = 0.62 with the flag off, and a `settled` with reading pair B posts at k = 0.95 with the flag off | Mirrors its layer |
| `tests/app/extension/instruments-holder.test.ts` | test | A no-op until installed, then the installed publisher | Mirrors its layer |
| `tests/infra/adapters/jefferson-instruments-declaration.test.ts` | test | Every declared field is posted with its declared type and a finite number; the four instrument names; the formats name only declared variables | The only place Jefferson's refusals can be caught (T10) |
| `tests/infra/adapters/jefferson-bus-adapter.test.ts` | test | The two channel names, the report shape, and a throwing emit leaving its caller intact | Mirrors its layer |
| `tests/infra/adapters/pi-instrument-readings.test.ts` | test | Each reading from a stubbed session manager and context, with a physical model's `pair` equal to `ctx.model`'s `(provider, id)`, with `pair` `undefined` when there is no model, and with `pi-virtual` spread over `createContextStub` giving the newest valid assistant message's pair on the branch while an `error` message and a zero-usage message are skipped; and `readRequest` still returning its reading with `createContextStub` overrides that make `getContextUsage` and `sessionManager.buildSessionProjection` throw, which pins that the request reading touches neither | Mirrors its layer |
| `tests/infra/pi-event-handlers/instruments-session-start.test.ts` | test | Both switch states, the before-first-await registration, the gate's skip on a rejected config, and a throwing opening reading that registers nothing and leaves the holder's publisher as it was; its switch-off case and its pair use the throwing context of the switch-off note below this table | Mirrors its layer |
| `tests/infra/pi-event-handlers/instruments-request.test.ts` | test | The request figures with and without a block, and after each of recall's four early returns reachable through the gate | Mirrors its layer |
| `tests/infra/pi-event-handlers/instruments-response.test.ts` | test | One case per row of D8's response-state table: the measured context in turn, the pair, an aborted, an errored, a zero-usage and a no-pending response, a `NaN` cost component beside valid token counts, and a pending request whose `messageEstimates` sum to 0 | Mirrors its layer |
| `tests/infra/pi-event-handlers/instruments-settled.test.ts` | test | Total context and the archive after the store has run ahead | Mirrors its layer |
| `tests/infra/pi-event-handlers/instruments-compact.test.ts` | test | Both figures re-posted after re-hydration, the ratio table kept | Mirrors its layer |
| `tests/infra/pi-event-handlers/instruments-tree.test.ts` | test | Both figures re-posted, and the ratio table's non-live entries reseeded from the new branch while its live entries stay; a jump to a branch with no valid sample for the current pair, whose entry was a seed, posting k = 1 figures with the flag on; and a jump on a pair with a live entry keeping that pair's k with the flag off | Mirrors its layer |

The six registrar tests and `pi-jev-scorer-adapter`'s are the only places a handler's inputs are scripted, because the session harness rewrites every response's usage to characters ÷ 4 at zero cost and cannot catch a calibration or dollar bug (T22).

Each of the six publishing-registrar tests also carries a switch-off pair, because `jefferson-instruments`' *Every publishing event with the switch off* asserts that no instrument reading is evaluated: it registers through `createGatedPi(fake.pi, session)` with a ready config (`enabled: true`, `jeffersonInstruments: false`) and a holder that is never installed, fires its event against a context whose `model` getter, `sessionManager.buildSessionProjection`, `sessionManager.getBranch` and `getContextUsage` all throw — `model` because every reading takes its pair through `readPair(ctx)` and the request reading reads nothing else of the host (D7; STRUCT-R2-2) — built as `createContextStub({ …, hostReadsThrow: true })`, the one home of that fixture (AGENTS.md), with `model` reached through a getter, and asserts that the handler returns without throwing and that the fake's emit recorder is still empty. Its pair installs a real publisher on that same throwing context and expects the throw, so the silent case can fail — except for `instruments-session-start.ts`, which builds its own publisher and never calls `holder.current()` (D1), so an installed publisher cannot change its outcome. Its pair is the same `session_start` on that same throwing context with `jeffersonInstruments: true`: the handler throws, the emit recorder stays empty, and `holder.current()` is still the no-op. That is the session-start row's throwing-opening-reading case.

### Modified

| File | What changes |
|---|---|
| `src/app/extension/taiknr.ts` | Builds the holder; calls each publishing registrar through the gated pi immediately after the existing registrar whose outcome it reads; passes the holder in `registerContextHandler`'s dependency object (ruling 7 (a), (b); ruling 9) |
| `src/infra/pi-event-handlers/context.ts` | Reports the block it appended, and takes the classifier observer from the holder and passes it to `createPiJevScorerAdapter` (ruling 7 (b), (c); ruling 8; ruling 14). Its signature, its budget, its key and its returns are unchanged (ADR 0007) |
| `src/infra/adapters/pi-jev-scorer-adapter.ts` | `createPiJevScorerAdapter(ctx, config, observer?)`: `observer.started(ids.length)` immediately before `ctx.modelRegistry.classify`, `observer.finished(...)` on the line after the await (ruling 7 (c); ruling 8) |
| `src/config/taiknr-config.ts` | The switch: its type, its default, its field rule, and its member in the returned object (`configuration` delta; §O5) |
| `tests/support/fake-pi.ts` | An `events.emit` that records every `{ channel, data }` in call order into `emitted`, an option that makes `emit` throw, which records the `{ channel, data }` first and then throws, `buildSessionProjection` on the context stub's `sessionManager` returning `{ messages: projectionMessages ?? [] }`, `createContextStub`'s `model` gaining `api?: string` (ruling 16), and a `hostReadsThrow?: true` option under which every host read an instrument reading makes throws — `model` as a getter, `getContextUsage`, `sessionManager.buildSessionProjection` and `sessionManager.getBranch` — the one home of that fixture (AGENTS.md). `getEntries` is not added: nothing here reads it — `getBranch()` and the projection are what the readings use |
| `tests/app/extension/taiknr.test.ts` | The registration list becomes the sorted list of every `on()` call, duplicates kept, 13 entries (ruling 10) |
| `tests/config/taiknr-config.test.ts` | The switch's default, layering and three rejection values, and `the known fields accept their valid values`, whose input JSON and expected object name the new field |
| `tests/config/session-config.test.ts` | Its `TaiknrConfig` literal gains `jeffersonInstruments: true`, without which it does not type-check (TS2741) |
| `tests/app/extension/handler-gate.test.ts` | Its `TaiknrConfig` literal gains `jeffersonInstruments: true`, without which it does not type-check (TS2741) |
| `tests/app/extension/archive-session.test.ts` | A listener extension in `extensionFactories` capturing what crossed the bus, so the session level checks the wiring only (T22) |
| `tests/infra/pi-event-handlers/context.test.ts` | Its one `registerContextHandler` call passes `holder: createInstrumentsHolder()` in its dependency object, without which it does not type-check (ruling 7 (b)). New cases: the reading recall passes to `reportRecalled` evaluates to `{ estimate: tokenEstimate(formatRecalledContext(outputs)) }`; and ruling 11's observer test, where the harness installs `createInstrumentsPublisher` with the bus adapter over `createFakePi({ emitThrows: true }).pi` as its sink and the harness's store, the stubbed `classify` answers, recall's handler returns its messages with the block appended, and the fake's recorder holds both observer emits — which is what proves the observer ran under a throwing emit |
| `tests/infra/adapters/pi-jev-scorer-adapter.test.ts` | The observer's two calls on every exit shape (ruling 8), including an error result with no usage calling `finished(undefined)` and leaving `deciding` false |
| `package.json`, `package-lock.json` | `pi-jefferson` in `devDependencies`, exact version `0.14.0`, written by `npm install --save-dev --save-exact pi-jefferson@0.14.0` from the registry (without `--save-exact`, npm's default `save-prefix` writes `^0.14.0`) so the lockfile carries a version and not a `file:` spec from Joel's checkout (M5; S7; CB-10) |
| `tsconfig.json` | `"verbatimModuleSyntax": true`, which turns a value import of a type-only export into TS1484 (ruling 17) |

### Unchanged, and named so a reviewer need not look

`src/app/extension/handler-gate.ts`, `src/config/session-config.ts`, `src/use-cases/ports.ts` (the `ArchiveStore` contract serves both reads this change makes — `getAll()` for stub matching and the archive totals, and `size()` — and no member is added), `src/use-cases/recall-relevant-context.ts`, `src/domain/archived-output.ts`, and the other six registrars (rulings 6, 7, 8).

### Project documentation, in the docs pass

`README.md` gains the switch's row the `configuration` delta requires (*The README carries the row*), and the example `taiknr.*` rows and the measurement and calculation explanation the `jefferson-instruments` delta requires (*The documentation explains what stubbing does to pi's measurement*). `ARCHITECTURE.md` and `AGENTS.md` come into line with the diff, and the decisions that are structural get ADRs under `docs/adr/` (numbers assigned then). This pass never blocks the change (Joel's standing ruling; ruling 20).

## Decisions

### D1. One publisher per session, and a no-op until one is installed

Michael's ruling 6 fixes the shape and `council.md` carries its reasoning; the design's part is where it lives. `createInstrumentsHolder()` starts with a no-op publisher and is built in `taiknr.ts` before any registrar runs. `instruments-session-start.ts` reads `config.jeffersonInstruments`, and only on a true builds the real publisher, calls `sessionStarted` with its deferred reading, then calls `install()`. Inside `sessionStarted` four steps run in this order, all synchronously and before any `await` (T11): it evaluates `read()`; it builds the opening `FigureValues`; it calls `sink.register()`; it calls `sink.post(opening)`. Reading first is what keeps a registration from arriving with no figures behind it: when the reading throws, nothing is registered, the holder keeps its no-op, pi's runner reports the throw on the extension error channel, and every `taiknr.*` row reads *not a known instrument* — the Q3(a) state, and a warning rather than four blank rows. Every other publishing registrar, and recall's handler, call `holder.current()` and never test the switch, and with the switch off no registrar reads the host at all.

**Rejected:** a second condition in `handler-gate.ts` — it would stop staging, settlement, hydration and recall, which J8 says must keep working, and it changes a file the ruling freezes. A switch test in each handler — seven homes for one fact, and the arithmetic would still run for nobody. The no-op also satisfies "the arithmetic sits behind the publisher": with the switch off nothing is estimated, matched or priced, and D3's deferred reading is what makes that true of the host reads as well — a registrar hands over a closure and evaluates nothing, so no projection, branch or usage read happens either.

The gate is not modified, so the ordering must be stated: the gate's wrapper tests the session's state and calls the handler in the same tick, so the publishing registrar's emit happens before its first `await`, which is what T11 requires.

### D2. Six publishing events, one registrar each

Ruling 9 fixes the events and rules 9 and 10 fix the registration count; `council.md` carries the evidence from pi's `docs/extensions.md` (:420, :665, :756-758, :350-359) and the scratch session that measured the order. The design's part is what each registrar reads and writes:

| Event | Registrar | Deferred reading (evaluated by the real publisher only) | Writes in the publisher |
|---|---|---|---|
| `session_start` | `instruments-session-start.ts` | branch usage samples per pair, the persisted estimate, the window, the model pair | installs the publisher; seeds the ratio table from the branch; opens the first request slot as empty; posts the opening figures, the archive's from the hydrated store |
| `context_with_system` | `instruments-request.ts` | the request reading built from the returned messages, and the pair | overwrites the pending request: estimate, recalled, the candidate — its matched stub set, its kept block when recall reported one, and its length — and the suffix start and estimate |
| `message_end` (assistant only, returns nothing) | `instruments-response.ts` | the message's usage and cost numbers, its `stopReason`, and its provider and model, passed eagerly, plus the current pair, the projection's estimate and the window | consumes the pending request in every case; on a valid sample, posts that pair's new k and re-posts every k-scaled field with it; prices the request, net of the uncharged spend, and adds to the since-start totals; posts total context, the window and the flag |
| `agent_settled` | `instruments-settled.ts` | the current pair, the projection's estimate and the window | changes no publisher state |
| `session_compact` | `instruments-compact.ts` | the current pair, the projection's estimate and the window | clears the pending request and the rewrite state |
| `session_tree` | `instruments-tree.ts` | the new branch's usage samples per pair, the current pair, the projection's estimate and the window | reseeds the ratio table's non-live entries from the new branch (D7); clears the pending request and the rewrite state |

What an event keeps is D4's (the uncharged spend) and D7's (the ratio table).

Which fields each event posts is D5's "Written at" column, the one list of it.

`turn_end` and `agent_before_settle` publish nothing (ruling 9). Every cell in the third column is a reading the registrar passes as a closure and never evaluates, and what it passes eagerly is only what the event itself carries (D3), which is what lets D1's switch-off case cost no host read at all; the archive's figures come from the store, which the publisher reads through the `ArchiveStore` port (D3). Each registrar is called immediately after the existing registrar whose outcome it reads, so the request figures see recall's returned messages and the post-commit figures see a committed store (T15). pi runs an event's handlers in registration order and hands each `context_with_system` handler the previous handler's returned `messages` as its `event.messages`, so the request registrar's reading is built from the list that already carries recall's block (`runner.js:1040–1068`; the council's scratch session).

**Rejected:** folding publishing into the existing handlers — one `on()` call less, but a publish throw would sit inside recall's and hydration's handlers, which is the failure T12 names, and it would widen the frozen signatures. A single registrar on one event — the figures have six different moments.

### D3. The publisher's contract, one deferred reading per event, and one writer per event

`src/use-cases/instruments-publisher.ts` exports `createInstrumentsPublisher({ sink, store })` and the three interfaces it requires:

```
InstrumentSink      { register(): void; post(publication: Publication): void }
ClassifierObserver  { started(itemCount: number): void; finished(spend: { costTotal: number } | undefined): void }
InstrumentsHolder   { current(): InstrumentPublisher; install(publisher: InstrumentPublisher): void }
ArchiveStore        (unchanged; read through getAll() and size())
```

`Publication` is `Partial<FigureValues>`, and the three types say what the compiler can and cannot catch:

1. **The types.** `FigureKey` names every field in D5's table; `FigureValues` is the total record that types each key as D5 does; `Publication = Partial<FigureValues>`. All three are declared and exported from `src/use-cases/instruments-publisher.ts`, beside `InstrumentSink`, `ClassifierObserver` and `InstrumentsHolder`; `jefferson-instruments-declaration.ts` and `jefferson-bus-adapter.ts` import them from there, so the dependency points inward (ADR 0001).
2. **What the compiler catches.** A misspelt key in any publication literal is a compile error (TS2561). A missing key is a compile error only where the value is typed `FigureValues`: the opening publication `sessionStarted` posts is typed `FigureValues`, so it carries every field (TS2741 otherwise), and the declaration's `TAIKNR_FIELDS`, whose keys are the field names, is total (TS2741 otherwise) (CR11).
3. **What `sink.post` emits.** One `Report` per key present, in `FigureKey` order, through the bus adapter, and nothing for a key absent from an update, so that field keeps the value Jefferson already holds. Every update after the opening one is therefore partial on purpose.
4. **Tests.** The declaration test asserts the opening publication's keys equal the declared fields; the publisher test asserts each event's publication carries exactly the fields D5's "Written at" column gives that event — for `responseReceived`, by the row of D8's response-state table: rows (3) and (4) post total context, the window, `archiveWithheld`, `archiveStubbed` and the flag only.

The publisher never names a field, a channel or a Jefferson type: `register()` takes nothing, because the declaration is the adapter's own data.

**Host state reaches the publisher through one deferred reading, and nothing before it.** Every event method whose figures need host-derived values takes exactly one, `read: () => <Event>Readings` — `sessionStarted`, `requestBuilt`, `responseReceived`, `settled`, `compacted` and `treeJumped` — and so does `reportRecalled`, whose reading is the block's estimate. Each `<Event>Readings` is a plain-data interface declared in this file with no pi type, produced by `pi-instrument-readings.ts` — `CompactedReadings` is `{ pair, projectionEstimate, contextWindow }`, `TreeJumpedReadings` is `CompactedReadings` plus the branch's usage samples per pair, the member `SessionStartedReadings` carries for D7 step 4's seeds, `SettledReadings` is `CompactedReadings`'s shape, and `RequestReading` is laid out in D7. Every event reading except `RequestReading`'s own block carries `pair: Pair | undefined` — `SessionStartedReadings`, `ResponseReadings`, `SettledReadings`, `CompactedReadings` and `TreeJumpedReadings` — and `pi-instrument-readings.ts` produces every `pair` member, `RequestReading`'s included, with one internal `readPair(ctx)` that implements D7 step 1. The archive store is not host state, so no reading carries it, and the publisher reads it through the `ArchiveStore` port it holds. The real publisher calls `read()` once, at the start of the method, with one exception: `reportRecalled` stores its reading unevaluated, and the `requestBuilt` that pi calls next takes it, clears it and evaluates it. `requestBuilt`'s first statement takes and clears the stored recall reading, before it evaluates its own reading or the stored one, so a throw from either reading leaves nothing stored for the next request (OD6(a)). The no-op never calls a reading, so `tokenEstimate(formatRecalledContext(outputs))` runs only in the real publisher, when that stored reading is evaluated, and a projection, a branch or a usage read happens only there too. The deferral is what keeps a fault off recall's path: a throw from the reading then lands in a publishing registrar, which pi's runner catches on its own, after recall's returned messages are already built (ruling 11; OD2(a)).

Only values the event already carries are passed eagerly: `message_end`'s usage and cost numbers, its `stopReason`, and its provider and model, which is the response's own pair, and the observer's `itemCount` and `costTotal`.

**The rule that follows:** no registrar and no code on recall's path calls `pi-instrument-readings.ts`, pi's `estimateTokens`, `buildSessionProjection`, `getBranch` or `getContextUsage` for the instruments, except inside a deferred reading. `instruments-session-start.ts` is the one file that reads the switch, and with the switch off it reads nothing else.

An `InstrumentPublisher` has one method per publishing event — `sessionStarted`, `requestBuilt`, `responseReceived`, `settled`, `compacted` (called by `instruments-compact.ts`) and `treeJumped` (called by `instruments-tree.ts`), six in all, one per registrar in D2 — plus what recall's path calls: `reportRecalled(read: () => { estimate: number })`, `started` and `finished`. The publisher implements the observer itself, so the adapter is handed `holder.current()` directly.

`finished` receives `{ costTotal }` rather than pi's `Usage`: the adapter reads `result.usage?.cost.total` and translates, because a use case may not import a pi type (ADR 0001). The `tail-recall` scenario's "passes its usage on" is satisfied by that translation, and the observer sees the same single pass-through point the ruling fixes.

The no-op publisher implements `InstrumentPublisher` and `ClassifierObserver` with empty bodies and is what the holder holds until `install()`.

**Rejected:** deriving the state inside each handler — it makes one fact live in six files and leaves the request slot writable from recall's five early returns (ruling 14). Folding it into `RecallCache` or `SessionConfig` — both are frozen and neither is about instruments (ruling 7).

### D4. The classifier is observed at the scorer adapter

Ruling 8 fixes the seam and the call points; the design adds only the translated shape in D3 and the ordering dependency: recall's handler calls `createPiJevScorerAdapter(ctx, config, holder.current())` with the publisher that is installed for the session, so with the switch off the observer is the no-op and nothing is recorded.

`classify` never rejects (`model-registry.js:91`; `model-runtime.js` wraps the call in a `try`/`catch` that returns `classifierErrorResult`, pi-ai `utils/model-operations.js:42–52`), so `finished`, on the line after the `await`, runs on every exit: answer, error, timeout, cancel and malformed answers. The validation throws come after it, and a `findOfType` miss throws before `started`, so nothing is observed there. `deciding` therefore returns to false on every exit. The adapter passes `{ costTotal: result.usage.cost.total }` when `result.usage` is present and `undefined` otherwise, and the publisher counts an `undefined`, non-finite or negative `costTotal` as 0.

**Spend accounting.** The publisher holds `unchargedSpend`, and each `finished` adds to it. The next priced response subtracts all of it as `classifierSpend` and resets it to 0; an invalid response leaves it for the next valid one; `session_compact` and `session_tree` keep it, because the money was spent; and a session start begins at 0, because the factory is fresh. So several calls before one priced response add up, and a request that makes no call is charged nothing. Tests: two calls before one valid response add up; an aborted response carries the spend to the next valid one; after a paid request, a request that makes no call is charged 0; and in `pi-jev-scorer-adapter.test.ts` an error result with no usage calls `finished(undefined)` and `deciding` ends false.

**Rejected:** a port member — it widens a frozen contract and `recallRelevantContext` would have to carry an observer it does not use. An infra wrapper around `RelevanceScorer` — it cannot see `result.usage`, which exists only inside the adapter (ZO-1, CB-5, CR2).

### D5. Fields, variables and formats (§O4)

One `as const` table declares the fields and their types, so an undeclared field is a compile error and only finiteness is left to tests (CR11; T10). Every field is posted at `session_start` and re-posted as its event arrives. The opening values are: `totalContext`, `contextInTurn` and `historyBefore` at k × the persisted estimate; `archiveItems`, `archiveWithheld` and `archiveStubbed` from the hydrated store; `withheld`, `stubbed`, `recalled`, all four savings and `decidingItems` at 0; `deciding` false; `contextWindow` from the host, 0 when it reports none; and `uncalibrated` from the current pair's seed (T9; ruling 3; ruling 4).

| Field | Type | Meaning | Written at |
|---|---|---|---|
| `contextInTurn` | number | the request as sent, k × its estimate; measured as `input + cacheRead + cacheWrite` after the response | request, response |
| `historyBefore` | number | the request as if taiknr had neither stubbed nor recalled | request, response |
| `withheld` | number | the raw text the stubs in this request replaced | request, response |
| `stubbed` | number | the stub text standing in their place | request, response |
| `recalled` | number | recall's appended block | request, response |
| `totalContext` | number | k × the estimate of the persisted history after taiknr's edits | start, response, settled, compact, tree |
| `archiveItems` | number | items in the store | start, settled, compact, tree |
| `archiveWithheld` | number | k × the raw text the store holds | start, response, settled, compact, tree |
| `archiveStubbed` | number | k × the stub text standing in for it | start, response, settled, compact, tree |
| `savedTokensRequest` | number | this request's token saving, signed | response |
| `savedTokensSinceStart` | number | tokens not sent since start, signed | response |
| `savedDollarsRequest` | number | this request's net dollars, signed | response |
| `savedDollarsSinceStart` | number | net dollars since start, signed | response |
| `deciding` | boolean | a classifier call is running | `started`, `finished` |
| `decidingItems` | number | how many ids the latest call asked about; 0 before any call; `finished` leaves it | `started` |
| `contextWindow` | number | the model's window, 0 when the host reports none | start, response, settled, compact, tree |
| `uncalibrated` | boolean | the pair the update is posted under has no live sample in this run — the current pair, or at a valid response the response's own pair (D7) | every event that writes a token figure |

The instruments, their variables and default formats:

| Instrument | Variables | Default format | Label |
|---|---|---|---|
| `taiknr.context` | `contextInTurn`, `historyBefore`, `totalContext`, `contextWindow`, `approx`, `bar` | `ctx $totalContext/$contextWindow $approx $bar` | `taiknr ctx` |
| `taiknr.archive` | `archiveItems`, `archiveWithheld`, `archiveStubbed`, `withheld`, `stubbed`, `approx` | `arc $archiveItems $archiveWithheld to $archiveStubbed $approx` | `taiknr arc` |
| `taiknr.savings` | `savedTokensRequest`, `savedTokensSinceStart`, `savedDollarsRequest`, `savedDollarsSinceStart`, `withheld`, `stubbed`, `recalled`, `approx` | `save $savedTokensRequest tok $savedDollarsRequest usd, $savedTokensSinceStart tokens not sent since start, $savedDollarsSinceStart usd net since start $approx` | `taiknr save` |
| `taiknr.recall` | `recalled`, `deciding`, `decidingItems`, `approx` | `rec $recalled tok $deciding $approx` | `taiknr recall` |

- **Variables, not `variableForms` and not `composed`.** A variable already returns `string | undefined`, so it renders its own text (`research-chidi` A1), each field has exactly one default rendering, and no ruled user need asks for a second one. `composed` with `options` would let a user rewrite kinds of text — machinery for a need nobody stated. The user still writes their own format, label and style in their `pi-jefferson.json` and may name `$bar` (J5; J7).
- **The flag rides beside the value.** `approx` renders `~` when `uncalibrated` is true and an empty string when it is false; every figure's value stays a plain number (J11).
- **A token, count or window variable renders the posted integer as `String(value)`** — `123456`, `-42` — and returns `undefined` while the readings carry no value for it: no locale grouping and no compact form, so the screen shows the same integer the identity and since-start are checked against.
- **The dollar variables render the bare signed number to four decimal places with `toFixed(4)`, so a negative net too small to show renders `-0.0000` and keeps its sign, and the default format names the unit `usd`**, so the sign of a session's negative values survives.
- **Ruling 2's "default label" is the default format's words beside `$savedTokensSinceStart`** — `tokens not sent since start` — because Jefferson's `defaultLabel` names the whole instrument and cannot carry them; the declaration test asserts the savings default format contains `$savedTokensSinceStart tokens not sent since start` (ruling 2; `context-figures` spec).
- **`historyBefore` before the first request equals `totalContext`**, so the identity holds with `withheld`, `stubbed` and `recalled` at 0 — and `contextInTurn` carries `totalContext`'s value, which is ruling 3's answer to §O7.
- **The bar** is `totalContext ÷ contextWindow × 100` when `contextWindow` is above 0, and `null` below that, which draws an unfilled track rather than a wrong fill (S2; ruling 22). It is declared on `taiknr.context` alone.
- **`deciding` renders its own sentence** — `deciding 12` while a call runs, `idle` otherwise — and `decidingItems` renders the bare count, so a user who wants the number alone has it.
- **The registration's extension name is `taiknr`**, which is what composes the four `taiknr.*` names and what every report carries (`research-chidi` A1; J14).
- **No `fills`**, because a format holding `$bar` already fills (`research-chidi` A2), and no `variableFg`, because colour is the user's style (J7).
- **The declaration is a module constant**, as Jefferson's own example has it (`research-chidi` A1), so a registration is one object and the four instrument names are visible in one place.

### D6. The switch is `jeffersonInstruments` (§O5)

A boolean, default `true`, validated like `enabled` and read only in `instruments-session-start.ts`. It sits in `pi-taiknr.json` beside `enabled`: taiknr reads it first from pi's agent directory (`getAgentDir()`, `~/.pi/agent` by default), then from `.pi/pi-taiknr.json` in the working directory when the project is trusted (`session-start.ts:16–17`), and the two files layer field by field as the `configuration` spec's *It layers like every other field* says.

**Rejected:** `instruments` — it says nothing about which host's instruments, and the file is taiknr's own config, not Jefferson's. `publishInstruments` — it names the mechanism rather than what the user gets, and `publish` is internal vocabulary. The name keeps Jefferson's name where its presence is the thing being switched (J8: "its Jefferson instruments").

### D7. Every token figure is k × one estimate over one estimator

The figures, as plain numbers before k:

- `withheld`, `stubbed` and `recalled` are `tokenEstimate` of their own text, from the same `src/domain/token-estimate.ts`.
- `contextInTurn` is Σ pi's `estimateTokens` over the request's messages as sent, which already carries the block.
- `historyBefore` is `contextInTurn + withheld − stubbed − recalled`. Defining it arithmetically is what makes the identity of ruling 1 exact rather than off by a rounding at a message boundary, and it is the same quantity S8 describes: the request with each stub replaced by its raw text and the block removed.
- The request's saving is `k × (withheld − stubbed − recalled)`, which is equal to `k × historyBefore − k × contextInTurn` by the line above, so both published forms agree by construction and the test of ruling 1 guards the path rather than a measurement.
- `totalContext` is k × Σ `estimateTokens` over `buildSessionProjection()`, the request-side estimator applied to the projection's messages, so the system message is counted the same way on both sides (T7; ruling 5).

**The system message, and the estimate at a response.** pi persists the system prompt as a `role: "system"` entry, so the request list and `buildSessionProjection().messages` carry the same system messages and no `getSystemPrompt()` read is needed (T7). At an assistant `message_end` the reply is not yet on the branch, so the persisted estimate there is Σ `estimateTokens` over `buildSessionProjection().messages` plus `estimateTokens(event.message)`, which is why the response's total context includes the response that just landed (Joel's ruling on the C8 escalation).

**The request reading, as plain data.** `readRequest` builds it from the list recall's handler returned, which the `context_with_system` registrar hands over:

```
readRequest: RequestReading
  pair: Pair or undefined
  messageEstimates: number[]                // each returned message's estimateTokens, in order; their sum is the request estimate
  toolResults: { index, firstText }[]       // each toolResult message's first content block's text, "" when that block is not text
  latestUser: { index, timestamp, tailText } or undefined
                                           // the latest user message: its index, its timestamp, and its
                                           // last content block's text — the string itself for string
                                           // content, "" when the last block is not text
```

**One k per request, from that request's own valid response.** The response `message_end` consumes carries its own pair, its message's `provider` and `model` (D3's eager values), so `k = (input + cacheRead + cacheWrite) ÷ the request's estimate` for that pair, and the identity's every term uses it (ruling 2). The measured prompt is published as `contextInTurn` and used nowhere else. Which pair's k applies where is the calibration block below, and at a valid assistant `message_end` it is the response's own pair — its k, its re-post and its flag — rather than the current pair, because the reply is not yet on the branch and the current pair there is the previous response's, or the virtual selection's (OD3(a)).

**Calibration: one ratio per model pair.** Rulings 4 and 13 together, as one rule:

1. **The pair.**
   - A pair is `(provider, model id)`. `Pair` is `{ provider: string; model: string }`, `model` holding the model id, declared and exported from `src/domain/calibration.ts`; `instruments-publisher.ts`, `pi-instrument-readings.ts` and the tests import it from there, so every layer imports it inward (ADR 0001).
   - A response's pair is its assistant message's `provider` and `model`, which pi sets from the model it requested (pi-ai `anthropic-messages.js:563–564`, `openai-completions.js:160–161`, `openai-responses.js:119–120`).
   - The current pair is `ctx.model`'s `(provider, id)`.
   - Under a virtual selection the current pair is the newest valid assistant message's pair on the branch (ruling 13). The test is `ctx.model.api === "pi-virtual"`, and it carries a `shortcut:` comment because pi does not export `isVirtualModel` (`VIRTUAL_MODEL_API`, `virtual-models.js:3`).
   - When `ctx.model` is undefined there is no current pair.
2. **A valid sample** is an assistant message meeting all three:
   - its `stopReason` is neither `"aborted"` nor `"error"`;
   - `usage.input`, `usage.cacheRead` and `usage.cacheWrite` are each finite and ≥ 0, and their sum — the prompt — is above 0;
   - it is paired with an estimate above 0.

   Then `k = prompt ÷ estimate`. Output is never part of the prompt.
3. **A live sample** is taken at a valid assistant `message_end` that has a pending request. Its estimate is the pending request's: the sum of its message estimates, recall's block included.
4. **The seed.** At `session_start` and `session_tree`, for each pair present on the branch:
   - take that pair's newest valid assistant message;
   - its estimate is Σ `estimateTokens` over `buildSessionProjection(ctx.sessionManager.getBranch(), entry.parentId).messages`, where `entry` is the session entry carrying that assistant message, using the root export and not the session manager's method;
   - that projection is the request that produced the message, less its recall block and any other extension's request-time edit, because neither is persisted;
   - it does contain the system message, because pi persists the system prompt as a `role: "system"` entry.
5. **The ratio table.** The publisher holds one entry per pair, `{ k, live }`.
   - `session_start` replaces the whole table with those seeds, each `live: false`, because the factory is fresh.
   - `session_tree` keeps every live entry and replaces every non-live entry with the new branch's seeds. A pair with neither a live entry nor a seed on the new branch has no entry, so its k is 1 and its flag is on, as the context-figures spec's *One ratio per model* already says.
   - A live sample sets its own pair's entry to `{ k, live: true }`.
   - `session_compact` keeps the table.
   - Every token figure at every event uses the current pair's entry — the response's own pair at a valid assistant `message_end`, as above — and k is 1 when that pair has no entry or there is no such pair.
   - At `agent_settled`, `session_compact`, `session_tree` and a `message_end` with no sample (D8 rows (3), (4)), the pair an update is posted under is the reading's `pair`, the current pair taken at that event; the publisher remembers no pair between events, because a `/model` switch fires no taiknr event and a virtual `/tree` jump changes the current pair itself.
   - `uncalibrated` is true unless that pair's entry is live.
   - This table is rulings 4 and 13 together. They read differently in one case — returning to a pair that already had a live sample earlier in this run — and a per-pair table follows ruling 4 there and matches ruling 13 everywhere else: returning to a pair with a live sample in this run keeps the flag off (ruling 4).
6. **`uncalibrated`** therefore means "the pair the update is posted under has no live sample in this run" (D5).
7. **Tests** (`tests/domain/calibration.test.ts`): a branch with samples from two pairs seeds both and uses the current one; a branch with no valid sample gives k = 1 with the flag on; aborted, error, zero-usage, `NaN`-usage and zero-estimate messages are skipped for the next older valid one; a live sample turns the flag off; a switch to a seeded pair turns it on with that pair's k; a switch back to a pair with a live sample keeps it off; `session_tree` keeps live entries and reseeds the rest; `session_compact` keeps it; and with the current pair A and a live sample from pair B, the update posts B's k and flag.

**The response re-posts every k-scaled figure.** A valid live sample replaces its own pair's k and makes `contextInTurn` the measured prompt, so every other k-scaled field is re-posted with that sample's k in the same update: `contextInTurn` as the prompt itself; `historyBefore`, `withheld`, `stubbed` and `recalled` as the new k × the pending request's estimates; `savedTokensRequest` as the new k × (withheld − stubbed − recalled); and `totalContext`, `archiveWithheld`, `archiveStubbed` and `uncalibrated`. The identity of rulings 1 and 2 therefore still holds on screen after every response.

**Rounding.** Every token field is posted as `Math.round(k × estimate)`, so a repeated value costs Jefferson nothing: the same estimate and the same k give the same integer — except `savedTokensSinceStart`, which is the running sum of the integers posted as `savedTokensRequest` at the responses that price their request (D8 rows (1), (2)), the spec's 'sum of the published requests' savings. The dollar fields are posted unrounded, so `savedDollarsSinceStart = Σ netDollars` is also the sum of the posted `savedDollarsRequest` values. For the sample's own request the measured `contextInTurn` equals `Math.round(k × estimate)`. Prompts and estimates are positive integers far below 2^51 (`estimateTokens` returns `Math.ceil(chars / 4)`, `compaction.js:201–251`), so `(prompt ÷ estimate) × estimate` lies within prompt · 2^−52 of the prompt and rounds back to it. This was checked over 100,000 integer pairs up to 900,000 under vitest 5.1.0 on Node v26.8.1 (Michael, Stage 2, C3). The identity `historyBefore − contextInTurn = savedTokensRequest = withheld − stubbed − recalled` holds on the unrounded values, before and after a response; posted values can differ from it by rounding alone, at most 2 tokens. Tests: the publisher test publishes a request at k = 1 that satisfies the identity, then its valid response, whose prompt gives k = 0.6, re-posts every request field so the identity holds again and `contextInTurn` equals the prompt; the domain test asserts the identity on the unrounded values.

**Rejected:** subtracting a measured `contextInTurn` — after the response that is the 340-token median prediction error, not a saving (M3). Re-deriving pi's `estimateProjectedContextTokens` — taiknr never wants pi's last-usage-plus-trailing figure, so nothing of that rule is reimplemented (ruling 5, CB-3).

### D8. The dollar rule, as a table of cases with numbers (§O6; ruling 15; R13)

Per request with a valid response:

- Rates, each from that response: `readRate = cost.cacheRead ÷ cacheRead`, `writeRate = cost.cacheWrite ÷ cacheWrite`, `inputRate = cost.input ÷ input`, each taken only when its token count is above 0 **and** its cost is finite and ≥ 0; `readRate` falls back to `inputRate`, `writeRate` falls back to `inputRate`, and `inputRate` is 0 when `input` is 0. No rate is ever 0 ÷ 0.
- Warm or cold: warm when `cacheRead > 0`, cold otherwise (M2's two classes).
- `grossDollars = k × (withheld − stubbed) × (warm ? readRate : writeRate) − k × recalled × (warm && latestUser.index < previousLength ? readRate : writeRate)`, so a negative saving is priced at the same rate and stays negative. Recall's block is priced at the rate its own message was billed at: the block is the last content of the latest user message, which is where pi's cache breakpoint falls, so a block on a message the baseline carried is a read and one in the new tail is a write. When the block changed on a carried message it stays at the read rate, because the rewrite charge already covers its write (CR-S3-2; OD1(a)).
- `rewriteCharge = warm && rewritePending ? k × suffixEstimate × max(0, writeRate − readRate) : 0`, where `suffixEstimate` is the estimate of the messages from taiknr's earliest change in this request up to the end of what the baseline carried, and `rewritePending` says taiknr changed an earlier message since the baseline: a settlement's new stubs, or the baseline's recall block now absent (ruling 15). The messages at and after `previousLength` are the new tail, which is written with or without taiknr and is never charged.
- `netDollars = grossDollars − rewriteCharge − classifierSpend`, where `classifierSpend` is the spend accumulated since the last priced response (D4), 0 when none has been charged.
- `savedDollarsSinceStart = Σ netDollars`; both totals are signed and neither is clamped (T19).

**What a response does to every figure.** One row per assistant `message_end` state:

| State | Sample and flag | Request figures | Savings pair and since-start | Total context, window and archive |
|---|---|---|---|---|
| **(1)** Valid (the calibration rule in D7) with a pending request whose estimate is above 0 | a live sample for the response's pair; the flag is recomputed from the ratio table | re-posted with the new k (D7), with `contextInTurn` as the prompt | priced as the bullets above say; the pending request's candidate becomes the baseline; the pair is posted; added to since-start; the uncharged spend is subtracted and reset | re-posted with the new k |
| **(2)** Valid token counts, but a cost component is non-finite or negative | as row (1) | as row (1) | as row (1), except that component's rate takes the zero-token fallback | as row (1) |
| **(3)** Valid, with nothing pending | no sample | unchanged | nothing is priced and the last pair stands | re-posted with the unchanged k |
| **(4)** Aborted or error; or a prompt not above 0; or any of the three token counts non-finite or negative; or a valid response whose pending request's estimate is not above 0 | no sample | `contextInTurn` stays the estimate; the pending request is consumed | nothing is priced; the last pair stands; the spend stays uncharged; the rewrite baseline stays at the last priced request | re-posted with the unchanged k |

A classifier `costTotal` that is `undefined`, non-finite or negative counts as 0 (D4).

**Which message taiknr changed.** The baseline is the last request a response priced: the stub texts it carried, the block recall reported on it, and its message count, `previousLength`. `requestBuilt` compares each request against the baseline and stores that request's candidate — its matched stub set, its kept block when recall reported one, and its length — in the pending request, never in the baseline. Only a response that prices its request promotes the candidate to the baseline (OD4(a)), and a request that gets no `message_end` is overwritten by the next `requestBuilt`, so its candidate is never promoted.

- **Stubs.** A tool result is a stub when its `firstText` equals an archived item's `stub`; a `firstText` that equals no stub is not a stub. Each stub begins `[archived <entryId>]` (`archived-output.ts:52`), so no two items share one and the match is one `Map<stub, item>` lookup. A matched item adds its `rawText` to withheld and its stub to stubbed.
- **New stubs.** A matched stub that the baseline did not carry is new, and the smallest index among the new stubs is a suffix start.
- **Recall's block.** When recall reported a block for this request, the candidate keeps `{ timestamp, index, text }` from `latestUser` — that is the block itself, because recall appends it as the last content block of the latest user message and only there. At the next request the baseline's block has changed when either `latestUser.timestamp` differs (a new user turn: the old message goes out without its block) or `latestUser.tailText` differs (a different block, or none, on the same message), and the baseline's index is then a suffix start. That request's candidate replaces or clears the block, and the reported one is cleared. The block's message is `latestUser.index`, the same index recall appended at, because the list is recall's own returned list (`runner.js:87–89`); `reportRecalled` carries only the estimate.
- **The suffix** starts at the smaller of the two suffix starts. `suffixEstimate` is Σ `messageEstimates[start, previousLength)`: `previousLength` is the baseline's message count, kept beside its stub set and its block, is cleared with them, and counts as 0 when there is no baseline. Messages at or after `previousLength` are the new tail, which is written with or without taiknr and is never charged. `rewritePending` is whether any suffix start exists.
- **No baseline.** `session_start`, `session_compact` and `session_tree` clear the baseline, as they clear the rest of the rewrite state, so the first request after one has no stub set, no block and no `previousLength` and nothing is pending: a warm request after `/reload` already carried those stubs in its cached prefix. A compaction or a tree jump clears the state for the same reason it re-writes the prompt whatever taiknr did, and charging that would misinform (T18's rule applied to pi's own rewrite).
- **Indices** are positions in the returned list. pi only appends between requests and omits a failed attempt from the projection with a null `context_edit` on the failed message (`agent-session.js:902–925`, `3212`), and compaction and a tree jump clear this state, so a kept index still names the same message. If another extension inserts a message before it the index shifts, and the charge is then an estimate, like rows 9 and 11.
- **Tests.** Stub matching in `tests/domain/context-figures.test.ts`; the rewrite state in the publisher test, covering a block appended and reported, the same block again on the same message (nothing pending), a shrunk block on the same message, no block on the same message, a new user turn, no previous block at all, a first request after a start whose stubs are all already present (nothing pending), two new stubs (the smaller index wins), and a `firstText` equal to no stub; a settlement followed by a request with a 1,500-token new tail, which is charged only up to `previousLength`; a new user turn's first request, whose new block is priced at the write rate; and the retry sequence: a priced request, a settlement, a new user turn whose first attempt errors, then the identical retried request, which is charged row 1's 600-token rewrite and prices its new 3,000-token block at the write rate — −$0.05916 at row 1's rates, with the stub saving +4,960 tokens and spend 0 — with an aborted response in place of the error giving the same figures.

**Rejected:** recording the settlement's entry index at `agent_before_settle` — that adds a seventh publishing registrar and a fourteenth registration, against rulings 9 and 10. Charging nothing for the recall block's disappearance — CR6's finding, which ruling 15 settles the other way. Charging the raw text on the read side as M4 did — M4 was testing whether the figure could be computed at all, and the token difference is the quantity the published figures already carry.

The dollar table below is the rule's cases with the arithmetic worked out. The rates are round numbers chosen so each row is checkable by hand; they are not measurements, and M4 is the only measured dollar model. Every row is warm and uses read $1.50/M and write $18.75/M unless its inputs say otherwise.

| # | Case | Inputs | Arithmetic | Expected output |
|---|---|---|---|---|
| 1 | Warm request, a settlement's rewrite pending | saving +4,960 tok; suffix 600 tok, from the first new stub to the baseline's end; new tail 1,500 tok, not charged; spend $0.0002; read $1.50/M, write $18.75/M | 4,960 × 1.50/M − 600 × 17.25/M − 0.0002 | −$0.00311 |
| 2 | A new user turn: the old block's message goes out without it, and a new block rides the new user message | saving −800 tok, all of it recalled; suffix from the old block's message to the baseline's end, 400 tok; recall's new 800-tok block on the new user message; spend 0 | −800 × 18.75/M − 400 × 17.25/M | −$0.02190 |
| 3 | Cold request after an idle gap | saving +4,960 tok; cacheRead 0; cacheWrite 210,000; spend 0 | 4,960 × 18.75/M, no rewrite charge (T18) | +$0.09300 |
| 4 | Cold request that also has a settlement pending | as row 3, suffix 600 tok | rewrite charge still 0 on a cold request | +$0.09300 |
| 5 | Warm request with no change since the last one | saving +2,000 tok; nothing pending; cacheRead 150,000 | 2,000 × 1.50/M | +$0.00300 |
| 6 | A provider that reports no cache components | cacheRead 0, cacheWrite 0, input 30,000, cost.input $0.45; saving +1,000 tok | both cache rates fall back to the input rate: 1,000 × 15.00/M | +$0.01500 |
| 7 | A component whose token count is 0 while its cost is not | cacheRead 0 with cost.cacheRead $0.02; cacheWrite 210,000, cost.cacheWrite $3.9375; saving +4,960 tok, cold | the read rate takes the input fallback rather than dividing by zero, and the cold price uses the write rate | +$0.09300, never `NaN` |
| 8 | Mixed short and one-hour cache writes | cacheWrite 10,000: 7,500 at $18.75/M and 2,500 at $30.00/M, cost.cacheWrite $0.215625; saving +500 tok; rewrite pending; suffix 1,000 tok | blended writeRate $21.5625/M; 500 × 1.50/M − 1,000 × 20.0625/M | −$0.01931 |
| 9 | The counterfactual would have crossed a cost tier | actual 190,000 prompt tokens; counterfactual 260,000; saving +1,000 tok, warm | priced at the actual response's read rate | +$0.00150, low by the tier step — an accepted estimate |
| 10 | A response whose write rate is below its read rate | read $18.75/M, write $1.50/M; saving +4,960 tok; suffix 600 tok | `max(0, write − read)` makes the charge 0, so no rewrite becomes a credit | +$0.09300 |
| 11 | A request that read part of its prefix from cache | cacheRead 40,000 with an expired middle; saving +3,000 tok | priced warm, because a response's counts cannot tell a partial read | +$0.00450, low by (write − read) on each saved token in the rewritten portion — an accepted estimate; the first priced request after a compaction or a tree jump is this case |
| 12 | An aborted, errored or zero-usage response | any | nothing is priced; the last completed pair stands; the since-start totals do not move | unchanged — row (4) of the response-state table |
| 13 | Warm request, a new block on a new user message, nothing pending | saving −3,000 tok, all of it recalled | −3,000 × 18.75/M | −$0.05625 |
| 14 | The same block again, on the same carried user message | saving −3,000 tok, all of it recalled; nothing pending | −3,000 × 1.50/M | −$0.00450 |
| 15 | A shrunk block on a carried message, with a suffix behind it | saving −2,000 tok, all of it recalled; suffix 2,400 tok | −2,000 × 1.50/M − 2,400 × 17.25/M | −$0.04440 |

### D9. Failure has no new channel

Ruling 11 fixes this; the design adds only the shape of the bus adapter's catch: `jefferson-bus-adapter.ts` wraps each `pi.events.emit` in its own `try`/`catch` with a one-line comment citing `loader.js`, because `pi.events.emit` throws only from `assertActive` on a stale instance, and a notice's `ctx.ui` is stale in the same case, so there is nobody to tell. The publishing registrars do not catch at all: pi's runner catches each handler separately and reports on the extension error channel, which is the house convention (`AGENTS.md`).

**Recall's path.** The only emits on recall's path are the observer's two, and they reach the bus only through that adapter's catch (ruling 11). Nothing on that path can throw from the instruments:

- `reportRecalled` only stores a closure and evaluates nothing (D3), so `tokenEstimate(formatRecalledContext(outputs))` runs in the `requestBuilt` that follows, after recall's messages have been returned.
- `started` and `finished` only assign state and call `sink.post`.
- `sink.post` builds object literals from a total `as const` map and emits inside the bus adapter's catch.

A fault in the instruments' own arithmetic therefore lands in a publishing registrar, where pi's runner catches it per handler, and never inside recall's handler: it can drop neither recall's block nor spend recall's once-per-session notice (ruling 11; OD2(a)). Tests: `reportRecalled` with a throwing reading returns normally and the following `requestBuilt` throws, and after a `requestBuilt` whose own reading throws a following request with no `reportRecalled` publishes `recalled` 0 (`tests/use-cases/instruments-publisher.test.ts`); and the reading recall passes evaluates to `{ estimate: tokenEstimate(formatRecalledContext(outputs)) }` (`tests/infra/pi-event-handlers/context.test.ts`).

`classify` never rejects (`model-registry.js:91`; `model-runtime.js`), so recall's path has no rejection case either.

**Rejected:** one wrapping function that reports through the existing notifier — a second user-facing notice for a fault with no user action, and it spends recall's once-per-session notice (ADR 0002).

### D10. The devDependency is pinned, and its types are the registry's

`"pi-jefferson": "0.14.0"` exactly, never a caret, because the contract is types-only and a minor bump can move a member under a green `npm run check`. Joel's pi loads Jefferson from his checkout, whose `package.json` version string reads `0.1.1` while its code is `v0.14.0` (`research-chidi` A5), so the compiler checks the registry's copy and a drift shows only as a Jefferson warning in his TUI. The live look is re-run on any bump (R11). At runtime the listener is Jefferson 0.14.0 or later, which pi loads as a package; the devDependency gives `tsc` the contract's types and nothing at runtime, so without Jefferson loaded the emits reach no listener (`jefferson-instruments`, *Jefferson is not installed*). The README's example `taiknr.*` rows, written in the docs pass, are the operator's setup reference.

**Rejected:** a caret range — the only change it buys is a silent type drift. Installing from the checkout or a tarball path — it writes a `file:` spec into `package-lock.json`, which breaks a clean install (CB-10).

## Risks / Trade-offs

| Concrete case | Mitigation |
|---|---|
| A field name, a type or a non-finite number is wrong: Jefferson refuses the update with a warning only in TUI mode, and `tsc` catches none of the three (T10) | One `as const` field table makes an undeclared field a compile error (CR11); the declaration test asserts every posted field's name, type and finiteness; Joel's live look is the acceptance (J2) |
| An emit throws on a stale context and the throw lands in recall's handler, so the request goes out with no recall (T12) | Every emit goes through the bus adapter's silent catch, so the observer's two posts reach the bus only through that catch (D9); ruling 11's test lives in `tests/infra/pi-event-handlers/context.test.ts`, where the fake's throwing `emit` records the `{ channel, data }` first and then throws, and it asserts recall still returns its messages with the block appended |
| A publishing registrar throws | Nothing in taiknr catches it; pi's runner records it on the extension error channel and the request still carries recall's block, because no publishing registrar runs inside a boundary handler (ruling 11). That pi's runner catches each handler separately is relied-on host behaviour, measured in the council's scratch session (ruling 9 evidence); no taiknr test asserts it, because no real input makes a publishing registrar throw, and `archive-session.test.ts` checks the wiring only (T22) |
| The dollar figures are counterfactual and go negative | M4's own session: 20 of 441 requests net-negative and the running total −$0.007 mid-session; published signed, and the README says what they are net of (T19; ruling 20) |
| A resumed session's seeded k is biased, because the persisted projection lacks the recall block that request carried (C5, CR8) | The seed stays — it is far closer than 1 — and its entry is not live, so the flag stays on until a live sample for that pair (D7, calibration; ruling 4) |
| A model switch voids k, and a `/tree` jump can land on a branch whose newest usage is another model's (CR9, CB-7) | One entry per pair in D7's ratio table, used for the pair an update is posted under — the current pair, or at a valid response the response's own pair, its message's `provider` and `model` (D7) — and seeded per pair at `session_start` and `session_tree`; Chidi C's 0.58–0.70 against 0.90–0.99 shows the size of the error a stale k would carry |
| `ctx.getContextUsage().tokens` is the persisted session's size, not this request's (T1; `AGENTS.md` trap) | Only `contextWindow` is read from that call; every size taiknr publishes is k × its own estimate, and the measured prompt comes from the response (rulings 2, 5) |
| A recall block makes total context jump, the smaller copy of the jump this change exists to remove (CR4) | Total context is always k × the persisted projection and never the measured prompt, so a block never enters it; a scenario asserts it on a recall turn (ruling 5) |
| Recall's five early returns leave the request slot stale, so a response is priced against the wrong request (R8) | The `context_with_system` registrar overwrites the pending request on every request whatever recall returned, and the next assistant `message_end` consumes it (ruling 14) |
| A request gets no `message_end`, or the branch holds a `usage` entry for a cache warm, and the slot or the sample goes wrong | An unconsumed request is overwritten by the next one; only assistant messages are sampled (T5); a `message_end` with nothing pending samples nothing |
| Malformed persisted usage at `session_start` produces `NaN` | Non-finite, or `input + cacheRead + cacheWrite` not above 0, is not a sample (ruling 9); a test asserts it |
| A projection is rebuilt on every publishing event, even with nobody listening | The count differs per event, and every count is inferred from the code rather than measured: the request builds none, because its reading comes from `event.messages` and it no longer calls `getContextUsage` (D2, D7); the response, `agent_settled` and `session_compact` build two each — the reading's own, and the one `ctx.getContextUsage()` builds for the window when the window is above 0 (`agent-session.js:3607–3640`); and `session_start` and `session_tree` build those two plus one seed projection per pair on the branch (D7 step 4). The measured figure is 0.32–0.80 ms per projection and estimate on Joel's two largest sessions, 14.4 MB and 2,495 and 1,331 entries. The cost is still accepted (ruling 18): six events, not every `message_end` of every role, and no guard, because the bus cannot say whether anyone listens. Reading the pair costs no projection; under `pi-virtual` it is one `getBranch()` walk, measured at 0.03–0.05 ms on Joel's two largest sessions (ruling 18 evidence). `ctx.model.contextWindow` is not used instead, because under a virtual selection pi reads the window from `_limitsModel()` (`agent-session.js:365–367`) |
| Recall's size bound is about 39 % low on Anthropic, so a block filling its budget can push a request past the window (T17) | Left as approved (Q4(a)); the archive's size limits it in practice, and the instruments make it visible rather than fixing it |
| A mid-session off freezes the last values on screen, because Jefferson clears only at `session_shutdown` | Documented; nothing here relies on a value never going stale (`research-chidi` A1; Michael §2) |
| The npm types drift from Joel's checkout (R11) | Exact pin; the live look re-runs on any bump |
| Two characters-÷-4 rules exist until recall's bound moves | `token-estimate.ts` owns the rule for the figures; `context.ts`'s inversion is recall's budget, untouched by Q4(a), and the card that moves the bound is where they meet |

## Migration Plan

Nothing to deploy: the package is loaded from a `packages` path and needs no migration step, and nothing is persisted (ADR 0004; Q1(a)). Two things a rollback must know, recorded because they are inherent in rules already ruled and neither is a task nor needs code (ruling 19):

1. **Remove `jeffersonInstruments` before downgrading.** An older taiknr rejects a config file that sets a key it does not know, and a rejected file turns taiknr off for that session at the next start (Joel 2026-11-14 Q1; `configuration` spec).
2. **A rollback leaves Jefferson's warning.** Each `taiknr.*` row in `pi-jefferson.json` then reports "not a known instrument" at every start — Jefferson's output, and accurate. The user removes the rows, or accepts the warning.

Post-merge hand-offs, in the order they must happen:

1. The README's `taiknr.*` example rows and its explanation of pi's measurement and taiknr's figure, written in the docs pass (J6; Q5(a); ruling 21).
2. Joel adds the rows to `~/.pi/agent/pi-jefferson.json` himself, copied from that example; this change writes no host file (Q5(a); J7).
3. Joel watches the instruments in his own pi. That is the acceptance and the only check that Jefferson accepts the registration and every update (J2; T10), and `/reload` is the check that a fresh Jefferson gets a first registration (ruling 12).

## Open Questions

Deferrable; none changes a spec, the approach or the task breakdown:

- **Does Jefferson repaint while the classifier call is in flight?** Not verifiable from taiknr's side; every lens that looked marked it `not_checked`, and Joel's live look answers it (T10; J2).
- **Does an extension's `console.error` reach the TUI?** Untraced (`research-chidi` B8); ruling 11 does not depend on it, because the bus adapter catches before any log is written.
- **How do providers other than Anthropic and OpenAI-completions normalize `input`, `cacheRead` and `cacheWrite`?** Unread (Chidi B6). k is calibrated per model from whatever those three carry, so a provider that folds cached tokens into `input` would produce a k that is wrong for the prompt — visible as a figure that disagrees with the response's `totalTokens`. It changes no decision here and would be its own card.
- **How much does the counterfactual's tier step and a partial cache read bias the dollars in practice?** Rows 9 and 11 of the table bound the direction, not the size; M4 is the only measured model and it used one session.
