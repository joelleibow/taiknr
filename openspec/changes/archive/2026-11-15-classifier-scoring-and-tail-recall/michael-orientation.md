# Michael — Orientation for classifier-scoring-and-tail-recall

This is a consult. It approves nothing, and every gate still runs.

**What I read.** I read these in full:
- the brief, `owner-rulings.md`, `research-chidi.md` and `research-eleanor.md`, plus both research briefs;
- the five living specs;
- the three archived changes' `owner-rulings.md`, `design.md` and `michael-orientation.md`;
- ADRs 0001–0006, `ARCHITECTURE.md`, `AGENTS.md` and `README.md`;
- every `src/` file on the recall path at `main` `22113ac`, `tests/app/extension/{taiknr,archive-session}.test.ts`, `jev-context-poc.ts` and `test-jev-poc.mjs`.

**Platform claims.** I checked these against pi-coding-agent 1.5.2:
- `dist/core/extensions/{runner.js,types.d.ts}`, `dist/core/{agent-session,model-runtime,usage-totals,http-dispatcher}.js`, `dist/modes/print-mode.js` and `docs/extensions.md`;
- in its pi-ai: `utils/transcript.js`, `api/{system-one-shared,typesafe-system-one,classifier-shared}.js`, `utils/provider-retry.js` and `providers/data/{anthropic,openrouter}.json`.

**How I measured.**
- I ran probes in a `git archive HEAD` copy under `mktemp -d`, with its own `npm ci`. The copy is removed and the checkout is untouched.
- In that copy the baseline is 16 files and 221 tests passing, which matches Eleanor's count.
- Every probe ran with `OPENROUTER_API_KEY` and `TYPESAFE_API_KEY` unset. The one probe of credentials from the environment used a dummy key and a `fetch` that throws.
- No model call and no classifier call was made.
- Joel's session files under `~/.pi/agent/sessions` were only read.

## 1. Decisions that bind this change

| # | Decision | Where made | Kind |
|---|---|---|---|
| D1 | Run the **Classifier scoring and tail recall** card. Every decision the card makes is a proposal until Joel confirms it: cache key, question shape, injection format, fail-open, notification, test shape. | `owner-rulings.md` "Request", 2026-11-15 | Joel |
| D2 | Pi's context-usage figure undercounting after a `context_edit` is assessed after this change. It is not in scope. | same | Joel |
| D3 | With `enabled: false` or a rejected file, there is no recall and no classifier call. Inertness lives only in the composition-root gate. This card verifies the recall half of the two deferred scenarios: a project file turning taiknr off, and earlier stubs "not recalled while it is off". | "Q3", "Q1"; `configuration/spec.md` L208, L220–228; `archive-stubbing/spec.md` L211–223; `AGENTS.md` gate trap | Joel + gated spec |
| D4 | The classifier keeps its configured provider, `openrouter` by default. Abstracting away from OpenRouter is not raised here. | standing rulings 2026-11-14 | Joel |
| D5 | The archive covers the whole branch, so the classifier's input grows with the branch until the archive-scaling card lands. | archive change, Q2(a) | Joel |
| D6 | Serving repeated tool calls from the archive is a separate card. Decisions follow community preference. The names are `pi-taiknr` and `taiknr`. Documentation never blocks a feature. | standing rulings | Joel |
| D7 | Config fields and defaults: `decisionThreshold` in [0, 1], default 0.5; both model fields are non-empty strings, defaulting to `~typesafe/jev-latest` / `openrouter`. They are read from the holder at event time. There is no fallback to defaults. | `configuration/spec.md` L57–92, L246–251; Q1(B) | gated + Joel |
| D8 | Exactly seven events are registered, `context` among them. Registrar, adapter and port contracts stay fixed against `HEAD`, apart from the enumerated differences and stub bodies being replaced. | `extension-packaging/spec.md` L46–58 | my approval + Joel's gate |
| D9 | `src/domain/`, `src/use-cases/` and `src/config/` import nothing from pi. Measured: `rg "@earendil-works"` finds nothing in those three directories at `22113ac`. | ADR 0001; `extension-packaging` "Boundary holds" | gated |
| D10 | The test command collects only `tests/**`, "so no live model or classifier call is made". `selectRecalledIds` has a pure test. The Biome allowlist applies. | `development-checks/spec.md` L49–54, L63 | gated |
| D11 | No `console.*` and no logger; observation happens through named surfaces; each handler reads before it mutates. Session-level tests isolate `PI_CODING_AGENT_DIR` and `cwd`. | archive `design.md` Decisions 11–12 | my approval |
| D12 | Yield to any existing edit (ADR 0005). Entry ids are opaque strings and are never sliced (ADR 0006). | ADRs 0005, 0006 | my approval |
| D13 | State local to the factory is per session, because pi runs the factory on every load. "Once per session" therefore means once per factory call. | `configuration-loader/design.md` L10, L61 | my approval |
| D14 | The stale store left by an off → `/tree` → on sequence was handed to the Status and recall cards. | archive `design.md` L139, L152 | my approval |
| D15 | The shapes at `HEAD` are bound by D8. They include `ArchivedToolOutput` and the store's read API (`size`, `get`, `getAll`), plus `RelevanceScore`, `RecalledOutput`, `RecallCache {lastPromptKey, lastRecalledIds}` and `RelevanceScorer.score(promptText, archivedStubs, signal?) → RelevanceScore[] \| undefined`. Also bound: `FailureNotifier.notifyOnce`, `ExtractedUserPrompt`, `createPiJevScorerAdapter(ctx, config: TaiknrConfig)`, `createOncePerSessionNotifier(getCtx)`, and `selectRecalledIds` with `>=`. | code at `22113ac` | gated by D8 |

**Where ADR 0002, `ARCHITECTURE.md` and the stubs come from.** ADR 0002, `ARCHITECTURE.md` §5/§11, the card and the recall stubs were all committed in `87b0069`, in the same pass by a Janet.
- ADR 0002's mechanisms 3 and 4 (recall on `context`, the key, the "byte-identical" claim, `ctx.ui.notify`) were never gated. They are the card's proposal written twice, not independent decisions.
- What binds is the contract shapes D8 later locked. The behaviour those shapes imply does not bind.

## 2. What the change must not touch or foreclose

- **The archive half.** This covers:
  - the staging, settlement and hydration handlers;
  - the `taiknr-side-store` format (ADR 0004);
  - the stub format (already-settled `context_edit`s cannot be rewritten);
  - `InMemoryArchiveStore`'s write path.

  Recall only reads the store.
- **The Status / `/taiknr` card.** Keep `SessionConfig.setEnabled` as it is. Keep recall's decisions in memory: `RecallCache.lastRecalledIds` is what a readout would show. Add no `ctx.ui.setStatus`.
- **Archive scaling and threshold calibration.** Put no cap or pruning into the archive. If Joel wants a size budget per request (Q3), it lives in recall and does not foreclose that card.
- **The OpenRouter abstraction (D4).** Resolve the model only from the two config fields through `ctx.modelRegistry.findOfType`. Hardcode no provider and no fallback id.
- **D2.** Do not fold pi's usage-figure behaviour into this change.
- **Reuse by `cli/` and `mcp/` (ADR 0001).**
  - The classifier protocol (questions, `ClassifierContext`, `stopReason`) stays inside the scorer adapter.
  - Caching and fail-open stay in a use case that knows nothing about pi.
- **Files to leave alone.** `jev-context-poc.ts`, `test-jev-poc.mjs`, `package.json`, `package-lock.json`, `biome.json`, `tsconfig.json`, `vitest.config.ts`, `~/.pi/agent/` and Joel's sessions.

## 3. The traps

**T1. Returning a changed list from `context` destroys the cached prefix on Joel's main model.**
- *Mechanism.* `restoreSystemMessages` (`runner.js` L101–105) returns `[getCurrentSystemMessage(current), ...returned]` whenever the returned list differs from the snapshot. Every mid-conversation system message (a tool or prompt-section patch) is folded into a rebuilt head. `docs/extensions.md` L827 says so: "An unchanged list keeps mid-conversation system messages in place, so models that accept them retain their cached prefix."
- *Measured in a real `AgentSession` with a faux provider.* I added a tool between prompts, then compared three requests:

  | Request | Layout sent | Head declares |
  |---|---|---|
  | unchanged | `[system, user, assistant, system(patch), user]` | `t1` |
  | `context` appending to the user message's tail | `[system, user, assistant, user, assistant, user]`, patch gone | `t1,t2` |
  | `context_with_system` making the same append | `[system, user, assistant, system, …, user]`, patch kept in place | `t1` |

  Each request carried only its own `<recalled_context>`, so the append is per-request.
- *Which models it hits.* `claude-opus-5-5` has `compat.supportsMidConvoSystemMessages: true` (`anthropic.json`). Models without that flag are unaffected, because pi-ai's `collapseSystemMessages` (`transcript.js` L96) builds the same head the runner does.
- *Joel's own sessions.* Over the last 7 days, 87 of his 165 multi-turn sessions (subagent runs included) carry at least one mid-conversation system message. His archive live-check session (`…01a1e087…`, Opus 5.5) carries three, at entries 63, 126 and 130.
- *Cost.* Each time the layout flips, the whole prompt is written to cache again.
  - His request after stubbing was 50,371 tokens (archive `owner-rulings.md` task 12.1). At Opus 5.5's cache-write price of $5/M, that is about $0.25 per flip.
  - Stubbing saves him $0.0227 per request, so one flip costs about 11 requests' worth of savings.

**T2. Once recall lands, the existing suite will call the live Jev classifier.**
- *Credentials reach the test.* `OPENROUTER_API_KEY` is set in this environment, and `~/.pi/agent/auth.json` holds `openrouter`. I measured that `ModelRuntime.create` with an isolated `authPath` still resolves the key from the environment: `classify` POSTed to `https://openrouter.ai/api/v1/systemone`, which my throwing `fetch` blocked. `getProviderAuthStatus("openrouter")` reported `configured: false` even as the request went out, so it cannot prove isolation.
- *Two tests reach it.* `archive-session.test.ts` L245–262 prompts "what did you see?" after a settlement, with the default config; so does L334–341 ("one more"). That is a billed network call that gives a different answer from run to run, against D10.
- *One assertion would depend on Jev.* L245 asserts the transcript does not contain `BIG_TEXT`, which would then depend on Jev's answer. The fix is to script a "no" answer from the classifier, not to edit the expectation.

**T3. Fail-open does not cover a slow classifier.**
- *No timeout by default.* `postClassifierRequest` uses `timeoutMs` only when the caller passes one (`classifier-shared.js` L47), and it retries provider errors twice (L68).
- *Long waits.* pi's global undici dispatcher has a 300 s header and body idle timeout (`settings.md` L126; `http-dispatcher.js` L77–85). A 429 can be retried after a server-requested delay of up to 60 s each time (`provider-retry.js`).
- *Effect.* A hung Jev holds the user's request for minutes, inside an awaited handler. Escape aborts the whole run, not just the recall.

**T4. `classify` never rejects, and the port loses information.**
- *How failures arrive.* `ModelRuntime.classify` catches every failure into `stopReason: "error" | "aborted"` with `answers: {}` (`model-runtime.js` L568–580). Measured: with no key, it returns `"Provider is not configured: openrouter"` instantly and makes no network call. A model that is not in the catalog makes `findOfType` return `undefined`.
- *What the port can't say.* `RelevanceScorer.score` returns `RelevanceScore[] | undefined`. A single `undefined` cannot tell the user's Escape apart from a classifier failure, and only a failure should notify. Keeping that distinction either needs a mapping that fits the port, or a port change with a spec delta (D8).

**T5. "Re-score on steering" drops the earlier recall in the middle of a run.**
- *Measured.* A steering message is a new latest user message with its own timestamp.
- *Consequence, by construction.* `U1` loses its block for the rest of the run. Two things follow:
  - the prefix diverges at `U1`, so every raw, unsettled tool output in the run is prefilled again;
  - the model loses content it was working from.
- Owner question: Q1.

**T6. The archive can grow while the cache key stays the same.** `_runBeforeSettleBoundary` continues when `result.continue || hasQueuedMessages()` (`agent-session.js` L1630–1648). If another extension asks to continue at settlement, the run goes on with the same latest user message after taiknr committed new items. A cache hit then never scores those items. `RecallCache` sits in `registerContextHandler`'s signature (D8), so changing its shape needs a spec delta.

**T7. The notifier is wired to a no-op.**
- *Today.* `taiknr.ts` L44–51 passes a placeholder whose `notifyOnce` does nothing.
- *Where the real one must be built.* `createOncePerSessionNotifier` keeps its `warned` flag in a closure. It must be created once per factory call (D13), with a `getCtx` that returns the current event's `ctx`. Built per event, it warns on every request. Holding a stale `ctx` makes it throw, because the `ctx.ui` getter asserts the runner is active (`runner.js` L626–629).
- *The wiring is locked.* The registrar's dependency members are locked by D8.

**T8. Recall can resurrect a redaction or another branch's output.**
- *Redactions.* ADR 0005 "More difficult" records that an edit proposed by a later handler wins in model context, while taiknr's store keeps the unedited raw text. Recalling that id brings the redacted content back.
- *Other branches.* The off → `/tree` → on store (D14) can hold items that are not on the active branch.
- *One fix for both.* One branch check covers both cases: the id must be on the branch, and its latest `context_edit` must be taiknr's own stub.

**T9. Recall size is unbounded, and overflow leaves a lasting change.**
- *Size.* In Joel's session the archive holds 266,619 raw characters (about 67k tokens), and the largest item is 51,064. `decisionThreshold: 0` is valid and recalls everything.
- *What overflow does.* It triggers pi's recovery: one persisted compaction, then "Context overflow recovery failed after one compact-and-retry attempt" (`agent-session.js` L2510–2565).
- *Who is at risk.* The local oMLX models ADR 0002 names have far smaller windows than Opus 5.5's 1M.
- Owner question: Q3.

**T10. The proof of concept drops images.**
- *The bug.* It replaces the user message's content with one string (`jev-context-poc.ts` L141–143).
- *Why appending works.* Pi builds a prompt's content as `[text, ...images]` (`agent-session.js` L1568–1573). Appending one trailing text block keeps the original blocks untouched, and it passed through intact in my probe.

**T11. "The latest user message" may not exist, or may not be last.**
- *Not there.* A compaction that splits a turn (`findCutPoint` with `isSplitTurn`) can leave the current turn with no `role: "user"` message.
- *Not last.* `custom` and `bashExecution` messages after it become user-role messages for the model (Chidi §1, role caveat).

**T12. What the proof of concept gets wrong.**
- *Key.* Its cache key is the prompt text alone (L94), so "continue" twice never re-scores.
- *Model.* It hardcodes `openrouter` and silently falls back to `typesafe/jev-1.14` (L99–100). That contradicts D7 and the no-fallback spirit of Q1(B).
- *A correction to Eleanor's report.* She says its classify "errors propagate". They do not: `classify` never rejects, so the PoC fails open silently (L124).

**T13. Recall changes trust and data flow.**
- *Trust.* Recalled tool output, including the `web_search` and `fetch_content` results present in Joel's sessions, is raised into the user role.
- *Data flow.* Every new user prompt is sent to OpenRouter along with the stubs.
- `ARCHITECTURE.md` §7 mentions only the stubs.

**T14. Nothing about recall is persisted.**
- Under D11 there is no log either.
- Joel's live check can see recall only through the model's behaviour or its usage figures. The design has to name how recall is observed.

**T15. The registration test only allows `on`.** `taiknr.test.ts` L6–11 throws on any `ExtensionAPI` member other than `on` at factory time. The factory therefore cannot call `registerProvider` or anything else.

## 4. Questions only Joel can answer

### 4a. What the card proposes that pi 1.5.2 does not do as described

| Card says | pi 1.5.2, measured | Whose call |
|---|---|---|
| "On each `context` event … for the in-flight request only." ADR 0002 adds "earlier history byte-identical". | Per request: yes. Byte-identical under `context`: no, whenever the session has a mid-conversation system message and the model accepts them (T1). Under `context_with_system`: yes. | Settled by evidence (S1) |
| Fails open "if the classifier is unavailable or `classify()` fails" | Yes for a missing model and for every error (T4). Not for a slow or hung classifier (T3). | Joel, Q2 |
| "Notifies once per session via `ctx.ui.notify`" | Works in TUI and RPC. A silent no-op in print and JSON (`runner.js` L132–137). | Joel, Q4 |
| The key is unchanged within a tool loop; new turns and steering re-score | Measured: three requests in one run share one key; a second "continue" and a steer each get a new key | Settled. The consequence is Q1. |
| Images and non-text blocks are preserved | Content is an array, and a trailing block passes through (T10) | Settled |
| "An end-to-end verification script (reproducing or adapting `test-jev-poc.mjs`)" | The faux provider has no classifier. A classifier an extension registers reaches `ctx.modelRegistry` with no network (measured). A script like `test-jev-poc.mjs` spends model calls and sits outside the gate. | Joel, Q5 |
| (implicit) Classifier spend shows in the session cost | It does not. `getUsageCostBreakdown` sums only assistant, `usage`, tool-result and summary entries (`usage-totals.js`). `SessionBoundaryDraft` has no usage draft (`types.d.ts` L798). | Joel, Q6 |

### 4b. Questions

**Q1. When the user steers or queues a follow-up mid-run, what happens to the recall already attached to the earlier message?**
Source: the card's "steering messages re-score" (a Janet proposal), plus T5.
- **(a)** Recall goes only on the latest user message, as the card says. A steer re-scores and moves recall to the steer; the earlier block drops. That costs one prefix rewrite of the run so far, and the model loses that content.
- **(b)** Each user message keeps its recall until the run settles, and a new message adds only newly relevant items. The prefix stays stable and nothing is lost. The cost: the `context` handler has no event that marks a run boundary, so this needs an eighth event or a link to the settlement handler, plus a spec delta.
- **(c)** Re-score the steer against every user message since the run began, and move the combined recall to the latest message. Nothing is lost, but the one prefix rewrite stays, and it still needs the run boundary.

*My pick: (a).* It adds the least mechanism. The cost is one rewrite per steer, and only in runs that recalled something. Joel's live check will show whether steering is common enough to pay for (b).

**Q2. How long may the classifier hold up the user's request?**
Source: the card's fail-open, plus T3.
- **(a)** Pi's defaults. There is no timeout, a hung connection stalls for up to 300 s, and retries after a 429 can wait up to 60 s each.
- **(b)** A fixed timeout and `maxRetries: 0`, with the value taken from one measured Jev round trip. `node test-jev-poc.mjs` prints "Jev latency", but running it is Joel's call because it spends model calls.
- **(c)** A new config field. That changes the `configuration` spec and the README: more scope.

*My pick: (b).* A missed recall costs less than a stalled turn, and the number gets a measured source.

**Q3. What happens when the relevant outputs would overflow the main model's context?**
Source: T9. The card puts threshold calibration out of scope but says nothing about size.
- **(a)** No limit beyond the threshold, as the card says.
- **(b)** Recall whole items, highest probability first, up to what keeps the request under pi's own compaction threshold (context window minus `reserveTokens`). This rests on pi's usage estimate, which D2 flags as undercounting.
- **(c)** Defer to the archive-scaling card.

*My pick: (b).* A missed recall is recoverable. A compaction persisted by a request-only recall, followed by a failed turn, is not.

**Q4. Where does the one-per-session failure notice go?**
The card proposes `ctx.ui.notify`. The configuration-loader design rejected `ctx.ui.notify` for config errors because it is invisible in print and JSON mode (`design.md` L227).
- **(a)** `ctx.ui.notify(…, "warning")`, as the card and the existing adapter do. Visible in TUI and RPC; silent in `-p` and JSON.
- **(b)** Pi's extension error channel, through one throw per session. It shows as a TUI error, and as `Extension error (…)` on stderr in print and JSON (`print-mode.js` L85–86). The request still goes out unchanged, because the runner catches the throw (`runner.js` L1031–1040).
- **(c)** `notify` when `ctx.hasUI` is true, otherwise (b).

*Sub-question.* A typo in `defaultDecisionModel` passes validation (D7). Should it give the same fail-open notice, or reject at session start the way a bad config file does?

*My pick: (a).* Stubbing still works when recall fails. A print session rarely carries an archive. The message should name the provider, the model, the config field and the reason. The typo case should fail open the same way.

**Q5. How is the end-to-end behaviour verified?**
Source: the card's verification script.
- **(a)** A new live script in the style of `test-jev-poc.mjs`. It spends model calls and sits outside the lint and type gate.
- **(b)** A session-level test with a scripted classifier, run in `npm run test`, plus Joel's own live check in his pi like task 12.1. He spends those model calls himself.
- **(c)** Both.

*My pick: (b).* It needs no new code outside the gate, and the archive card set the precedent.

**Q6. Does Joel accept what recall costs him per request?** The numbers come from his real 31-item side store and the proof of concept's question shape.
- **Classifier calls.**
  - None while the archive is empty or taiknr is off.
  - One per new latest user message: a new prompt, a steer or a follow-up.
  - None per tool step or per auto-retry.
- **Classifier tokens.**
  - Per call: about 4,900, a request of 19,686 bytes measured by chars/4. Jev's own tokenizer is unmeasured.
  - Per archived item: about 160, growing linearly with the branch (D5).
  - Price: $0.042 per million input tokens, output free. That is about $0.0002 a call at 31 items and about $0.002 at 300.
  - Limit: past roughly 1,600 items, Jev's 262,144-token window makes every call fail, so taiknr fails open from then on.
- **Visibility.** None of this shows in pi's footer or `/session` (4a).
- **Latency.** One classifier round trip before the first request of each scored turn. Unmeasured (Q2).
- **Main model.** The recalled raw text rides along on every request of that turn.
  - Size: the median item is about 850 tokens, the largest about 12,800.
  - Cost: the first request writes it to cache (about $0.064 for the largest at Opus 5.5's $5/M), later steps read it at $0.20/M, and the next turn drops it.
  - With S1 there is no head rewrite; under `context`, T1's cost applies.

The options:
- **(a)** Accept, with the spend invisible until the Status card.
- **(b)** Pull a spend readout into this change from the Status card.

*My pick: (a).* At these prices the classifier is a rounding error next to the recalled text.

## 5. What is settled, and what stays open

**Settled, for the council and the design:**
- **S1. Recall registers on `context_with_system`, not `context` (T1).**
  - *What it revises.* D8's "Seven events registered" list, ADR 0002 mechanism 3's event name, and `ARCHITECTURE.md` §3/§5. That takes an `extension-packaging` spec delta and a new ADR narrowing ADR 0002 (`AGENTS.md` L25).
  - *Why the adapter signatures can stay.* The payload and result types are identical: `AgentMessage[]` and `ContextEventResult` (`types.d.ts` L699–711, L1242–1243). So the `ContextEvent["messages"]` signatures hold.
  - *What the handler may change.* Append one trailing text block to the latest user message only. Leave index 0 and every system message alone. Return nothing when nothing is recalled.
- **S2. Questions.** One call per scored key, with one `bool` question per archived item, keyed by the whole entry id (ADR 0006). State is `{ userPrompt, archivedToolOutputs: id → stub }`. No images are sent: nothing requires them.
- **S3. Model and selection.** The model comes from the holder at event time, through `findOfType(provider, model)`, with no fallback id. Selection uses the existing `selectRecalledIds` with `>=`.
- **S4. Failure handling.**
  - A missing model or `"error"` means no recall plus the one notice (channel per Q4).
  - `"aborted"` means no recall and no notice.
  - `ctx.signal` is passed through; it is defined inside a context handler (measured).
- **S5. Inertness.** The gate alone keeps recall off. The tests mirror the archive card: `createGatedPi` with `setEnabled` at the handler layer, plus a project file turning taiknr off at session level.
- **S6. The once-per-session flag** lives in the registration closure (D13), never per event.
- **S7. Session-level tests.**
  - The classifier comes from `pi.registerProvider` in an inline extension, plus an agent config file naming that provider. Measured working with no network.
  - Every session-level test removes provider credentials from the environment (T2).
  - Tests like L245 script a "no" answer.
  - No new dependency.
- **S8. The cache key** is the latest `role: "user"` message's `timestamp` plus its text. Skip recall when the archive is empty or there is no user message.
- **S9. Recall yields** to edits taiknr did not write and to items that are not on the branch. This is ADR 0005's principle carried over to recall, plus the D14 hand-off.
- **S10. Layering (ADR 0001).**
  - The classifier protocol lives in the scorer adapter.
  - Caching and fail-open live in the use case.
  - The format lives in the domain.
  - The append lives in the context adapter.
- **S11. Documentation** goes to Bambadjan's docs pass, as minor items (D6): `AGENTS.md` L3, `README.md` L3/L13, the `ARCHITECTURE.md` intro and §3/§5/§7 (with T13 added), and the new ADR.

**Open, for the council and the design:**
- **O1.** How to wire the notifier against the locked registrar dependencies (T7).
- **O2.** Whether the cache is invalidated when the store changes, and whether `RecallCache` changes shape (T6). A shape change needs a spec delta.
- **O3.** How abort and error map across `RelevanceScore[] | undefined` (T4).
- **O4.** The question wording and the `<recalled_context>` format. That includes framing recalled output as data, and handling `</recalled_context>` appearing inside raw text (T13).
- **O5.** How S9's check works: read the branch per scored key, and compare the latest edit with `item.stub`.
- **O6.** What happens when there is no user message, or when a `custom` message follows it (T11).
- **O7.** How recall is observed, and the plan for the live check (T14).
- **O8.** The file and registrar names after S1.
- **O9.** Whatever Q1–Q3 decide.

**What this pass did not cover.**
- Jev's latency and recall quality: those need a model call.
- A byte-level diff of the Anthropic payload. T1 rests on the transcript layout I measured, pi's own L827 statement and the compat flag. I did not inspect a serialized request.
- How RPC mode renders `notify`.
- A real recall large enough to overflow, run through pi's recovery path.

---

I skipped Jev latency and recall quality, the Anthropic payload bytes, and an actual overflow run; T1's cost figure is reasoned from source and from Joel's earlier measurements.

**Risk:** from the day recall lands, `npm run test` in Joel's shell (where `OPENROUTER_API_KEY` is set) calls the real Jev classifier from two existing tests unless the harness clears provider credentials (T2).