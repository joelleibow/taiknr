import {
	type ContextWithSystemEvent,
	type ExtensionContext,
	estimateTokens,
	SessionManager,
	type SettingsManager,
	type TurnEndEvent,
} from "@earendil-works/pi-coding-agent";
import { expect, test, vi } from "vitest";
import { createConversationSummaryState } from "../../../src/app/extension/conversation-summary-state.js";
import { createGatedPi } from "../../../src/app/extension/handler-gate.js";
import { createInstrumentsHolder } from "../../../src/app/extension/instruments-holder.js";
import { createSessionConfig } from "../../../src/config/session-config.js";
import { DEFAULT_TAIKNR_CONFIG, type TaiknrConfig } from "../../../src/config/taiknr-config.js";
import type { ArchivedToolOutput } from "../../../src/domain/archived-output.js";
import { formatRecalledContext } from "../../../src/domain/recall.js";
import { tokenEstimate } from "../../../src/domain/token-estimate.js";
import { createJeffersonBusAdapter } from "../../../src/infra/adapters/jefferson-bus-adapter.js";
import { taskText } from "../../../src/infra/adapters/jev-scoring-request.js";
import { InMemoryArchiveStore, TAIKNR_SIDE_STORE_TYPE } from "../../../src/infra/adapters/pi-archive-adapter.js";
import { registerContextHandler } from "../../../src/infra/pi-event-handlers/context.js";
import { registerConversationSummarySettledHandler } from "../../../src/infra/pi-event-handlers/conversation-summary-settled.js";
import { createInstrumentsPublisher, type Publication } from "../../../src/use-cases/instruments-publisher.js";
import type { PayloadCacheState } from "../../../src/use-cases/payload-cache.js";
import type { RecallCache } from "../../../src/use-cases/recall-relevant-context.js";
import { createContextStub, createFakePi } from "../../support/fake-pi.js";
import {
	createSummarizerFake,
	SUMMARIZER_TEST_MODEL,
	SUMMARIZER_TEST_PROVIDER,
	type SummarizerFake,
} from "../../support/summarizer-fake.js";

type Messages = ContextWithSystemEvent["messages"];

const MODEL = { api: "typesafe-system-one", provider: "test-provider", id: "test-model" };

const CONFIG: TaiknrConfig = {
	...DEFAULT_TAIKNR_CONFIG,
	defaultDecisionModelProvider: "test-provider",
	defaultDecisionModel: "test-model",
	decisionThreshold: 0,
};

/** A prompt, whose timestamp tells one key from the next. */
function prompt(text: string, timestamp = 1000) {
	return { role: "user" as const, content: [{ type: "text" as const, text }], timestamp };
}

const SYSTEM = { role: "system" as const, content: "Keep answers short.", timestamp: 0 };

/** A mid-run note, which a split turn can carry with no user message of its own. */
const CUSTOM = {
	role: "custom" as const,
	customType: "probe",
	content: [{ type: "text" as const, text: "note" }],
	display: true,
	timestamp: 5,
};

const toolResult = (): TurnEndEvent["toolResults"][number] => ({
	role: "toolResult",
	toolCallId: "call-1",
	toolName: "bash",
	content: [{ type: "text", text: "raw" }],
	isError: false,
	timestamp: 0,
});

/**
 * Append one archived item to `manager`'s branch — its tool result, its side-store record and
 * taiknr's stub edit — with a block length that is a whole number of tokens, so a budget a case
 * computes lands exactly on the block.
 */
function appendArchivedItem(manager: SessionManager): ArchivedToolOutput {
	const id = manager.appendMessage(toolResult());
	const base = { id, toolName: "bash", argsSummary: "", isError: false, stub: `[archived ${id}]` };
	const pad = (4 - (formatRecalledContext([{ ...base, rawText: "" }]).length % 4)) % 4;
	const item = { ...base, rawText: "x".repeat(pad) };
	manager.appendCustomEntry(TAIKNR_SIDE_STORE_TYPE, [item]);
	manager.appendContextEdit(id, { content: [{ type: "text", text: item.stub }] });
	return item;
}

/** What a stubbed `classify` answers: every question it was asked, at `probability`. */
function answered(context: unknown, probability = 0.9) {
	const { questions } = context as { questions: Record<string, unknown> };
	return {
		stopReason: "stop",
		answers: Object.fromEntries(Object.keys(questions).map((id) => [id, { type: "bool", probability }])),
	};
}

interface HarnessOptions {
	config?: Partial<TaiknrConfig>;
	settings?: Parameters<typeof SettingsManager.inMemory>[0];
	model?: { provider: string; id: string };
	contextWindow?: number;
	/** The stub `classify`; the default answers every question at 0.9. */
	classify?: (model: unknown, context: unknown, options: unknown) => Promise<unknown>;
	ready?: boolean;
	/** Whether another extension's edit lands on the item's message after taiknr's stub (ADR 0005). */
	foreignEdit?: boolean;
	/** The summarizer fake the context stub's model registry carries, for the cases that assert it was not called. */
	summarizer?: SummarizerFake;
}

/** The handler registered as the composition root registers it, over a fake host and a real branch. */
function harness(options: HarnessOptions = {}) {
	const manager = SessionManager.inMemory();
	const item = appendArchivedItem(manager);
	if (options.foreignEdit) manager.appendContextEdit(item.id, { content: [{ type: "text", text: "redacted" }] });
	const fake = createFakePi({ settings: options.settings });
	const session = createSessionConfig();
	const store = new InMemoryArchiveStore();
	store.addBatch([item]);
	const recallCache: RecallCache = { lastPromptKey: "", lastRecalledIds: [] };
	const classify = vi.fn(options.classify ?? ((_model, classifyContext) => Promise.resolve(answered(classifyContext))));
	const modelRegistry = {
		findOfType: vi.fn(() => ("model" in options ? options.model : MODEL)),
		classify,
	};
	const holder = createInstrumentsHolder();
	const summary = createConversationSummaryState();
	const summarizer = options.summarizer ?? createSummarizerFake();
	const payloadCache: PayloadCacheState = { recallBlock: null, carrier: null, nextCarrier: null, applied: null };
	registerContextHandler(createGatedPi(fake.pi, session), {
		config: session,
		store,
		recallCache,
		holder,
		payloadCache,
		summary,
	});

	if (options.ready ?? true) session.assign({ status: "ready", config: { ...CONFIG, ...options.config } });

	/** A context for one event, recording any notice it receives. */
	const context = (
		notices: string[] = [],
		contextWindow = "contextWindow" in options ? options.contextWindow : 200_000,
	) =>
		createContextStub({
			cwd: "/work",
			trusted: false,
			// Read when the context is built, so a case can change the branch between two events.
			branch: manager.getBranch(),
			contextWindow,
			model: "model" in options ? options.model : undefined,
			modelRegistry: { ...modelRegistry, ...summarizer.modelRegistry },
			notify: (message) => notices.push(message),
		});

	/** Fire the registered handler once, as the host does. */
	const fire = async (ctx: ExtensionContext, messages: Messages) =>
		fake.registered[0].handler({ type: "context_with_system", messages }, ctx);

	return {
		fake,
		session,
		store,
		recallCache,
		payloadCache,
		item,
		classify,
		context,
		fire,
		manager,
		holder,
		summary,
		summarizer,
	};
}

/** The text of the block a result appends to the message at `index`, or `undefined` when none. */
function appendedBlockText(result: unknown, index: number): string | undefined {
	const messages = (result as { messages?: Messages } | undefined)?.messages;
	const message = messages?.[index];
	if (message === undefined || message.role !== "user" || !Array.isArray(message.content)) return undefined;
	const [last] = message.content.slice(-1);
	return last?.type === "text" && last.text.startsWith("<recalled_context>") ? last.text : undefined;
}

const estimate = (messages: Messages) => messages.reduce((total, message) => total + estimateTokens(message), 0);

/** The window at which the block exactly fills the budget, from the reserve a case expects. */
const windowFor = (reserve: number, messages: Messages, block: number) => block / 4 + reserve + estimate(messages);

test("the handler registers context_with_system, and nothing for context", () => {
	const { fake } = harness();

	expect(fake.registered.map(({ event }) => event)).toEqual(["context_with_system"]);
});

test("a config that is not ready recalls nothing and asks nothing", async () => {
	const { fire, classify, context } = harness({ ready: false });

	expect(await fire(context(), [prompt("why?")])).toBeUndefined();
	expect(classify).not.toHaveBeenCalled();
});

test("a turn with no user message recalls nothing and asks nothing", async () => {
	const { fire, classify, context } = harness();

	expect(await fire(context(), [CUSTOM])).toBeUndefined();
	expect(classify).not.toHaveBeenCalled();
});

test.each([
	["no usage at all", undefined],
	["a window of zero", 0],
])("%s recalls nothing and asks nothing", async (_case, contextWindow) => {
	const { fire, classify, context } = harness({ contextWindow });

	expect(await fire(context(), [prompt("why?")])).toBeUndefined();
	expect(classify).not.toHaveBeenCalled();
});

test("an item another extension redacted on the branch is neither asked about nor recalled", async () => {
	const { fire, classify, context } = harness({ foreignEdit: true });

	expect(await fire(context(), [prompt("why?")])).toBeUndefined();
	expect(classify).not.toHaveBeenCalled();
});

test("the session's own threshold decides what is recalled", async () => {
	const { fire, classify, context } = harness({ config: { decisionThreshold: 0.95 } });

	expect(await fire(context(), [prompt("why?")])).toBeUndefined();
	expect(classify).toHaveBeenCalledTimes(1);
});

test("compaction turned off still leaves the bound in force", async () => {
	const { fire, context, item } = harness({ settings: { compaction: { enabled: false, reserveTokens: 1000 } } });
	const messages: Messages = [prompt("why?")];
	const block = formatRecalledContext([item]).length;
	const window = windowFor(1000, messages, block);

	expect(appendedBlockText(await fire(context([], window), messages), 0)).toBe(formatRecalledContext([item]));
	expect(await fire(context([], window - 1), messages)).toBeUndefined();
});

test("a request with no room recalls nothing and asks nothing", async () => {
	const { fire, classify, context } = harness({
		contextWindow: 100,
		settings: { compaction: { reserveTokens: 1000 } },
	});

	expect(await fire(context(), [prompt("why?")])).toBeUndefined();
	expect(classify).not.toHaveBeenCalled();
});

test("the notice reaches the latest event's ctx, and is spent once per registration", async () => {
	const notices: string[][] = [[], [], []];
	let failing = false;
	const { fire, context, classify } = harness({
		classify: async (_model, classifyContext) =>
			failing ? { stopReason: "error", errorMessage: "boom", answers: {} } : answered(classifyContext),
	});

	await fire(context(notices[0]), [prompt("first", 1)]);
	failing = true;
	await fire(context(notices[1]), [prompt("second", 2)]);
	await fire(context(notices[2]), [prompt("third", 3)]);

	expect(classify).toHaveBeenCalledTimes(3);
	expect(notices[0]).toEqual([]);
	expect(notices[1]).toHaveLength(1);
	expect(notices[1][0]).toContain("boom");
	expect(notices[2]).toEqual([]);
});

test("the block is appended exactly when the budget equals its length, and not one token short", async () => {
	const { fire, context, item } = harness({ settings: { compaction: { reserveTokens: 1000 } } });
	const messages: Messages = [prompt("why?")];
	const block = formatRecalledContext([item]).length;
	const window = windowFor(1000, messages, block);

	expect(appendedBlockText(await fire(context([], window), messages), 0)).toBe(formatRecalledContext([item]));
	expect(await fire(context([], window - 1), messages)).toBeUndefined();
});

test("a system message counts toward the estimate, so the boundary moves by its own tokens", async () => {
	const { fire, context, item } = harness({ settings: { compaction: { reserveTokens: 1000 } } });
	const messages: Messages = [prompt("why?"), SYSTEM];
	const block = formatRecalledContext([item]).length;
	const window = windowFor(1000, messages, block);

	expect(appendedBlockText(await fire(context([], window), messages), 0)).toBeDefined();
	expect(await fire(context([], window - 1), messages)).toBeUndefined();
	expect(appendedBlockText(await fire(context([], window + estimateTokens(SYSTEM)), messages), 0)).toBeDefined();
});

test("a model's override sets the reserve, and the boundary it implies is the one that applies", async () => {
	const settings = {
		compaction: { reserveTokens: 5000, modelOverrides: { "test-provider/test-model": { reserveTokens: 100 } } },
	};
	const { fire, context, item } = harness({ settings, model: { provider: "test-provider", id: "test-model" } });
	const messages: Messages = [prompt("why?")];
	const block = formatRecalledContext([item]).length;

	expect(appendedBlockText(await fire(context([], windowFor(100, messages, block)), messages), 0)).toBeDefined();
	expect(await fire(context([], windowFor(100, messages, block) - 1), messages)).toBeUndefined();
});

test("an unknown model reads no override, so the setting's own reserve applies", async () => {
	const settings = {
		compaction: { reserveTokens: 5000, modelOverrides: { "other-provider/other-model": { reserveTokens: 100 } } },
	};
	const { fire, context, item } = harness({ settings });
	const messages: Messages = [prompt("why?")];
	const block = formatRecalledContext([item]).length;

	expect(appendedBlockText(await fire(context([], windowFor(5000, messages, block)), messages), 0)).toBeDefined();
	expect(await fire(context([], windowFor(100, messages, block)), messages)).toBeUndefined();
});

test("no compaction settings fall through to pi's own default reserve", async () => {
	const { fire, context, item } = harness();
	const messages: Messages = [prompt("why?")];
	const block = formatRecalledContext([item]).length;

	expect(appendedBlockText(await fire(context([], windowFor(16384, messages, block)), messages), 0)).toBeDefined();
	expect(await fire(context([], windowFor(0, messages, block)), messages)).toBeUndefined();
});

test("three requests under one key score the archive once", async () => {
	const { fire, context, classify, item } = harness();
	const messages: Messages = [prompt("why?", 7)];

	const first = await fire(context(), messages);
	await fire(context(), messages);
	const third = await fire(context(), messages);

	expect(classify).toHaveBeenCalledTimes(1);
	expect(appendedBlockText(first, 0)).toBe(formatRecalledContext([item]));
	expect(appendedBlockText(third, 0)).toBe(formatRecalledContext([item]));
});

test("a foreign edit that lands under a scored key drops the cached recall on that key's next request", async () => {
	const { fire, context, classify, item, manager } = harness();
	const messages: Messages = [prompt("why?", 21)];

	expect(appendedBlockText(await fire(context(), messages), 0)).toBe(formatRecalledContext([item]));

	manager.appendContextEdit(item.id, { content: [{ type: "text", text: "redacted" }] });

	expect(await fire(context(), messages)).toBeUndefined();
	expect(classify).toHaveBeenCalledTimes(1);
});

test("the gate stops the handler while taiknr is off and lets it run once it is on", async () => {
	const { fire, context, classify, session, item } = harness();

	expect(session.setEnabled(false)).toBe(true);
	expect(await fire(context(), [prompt("why?", 11)])).toBeUndefined();
	expect(classify).not.toHaveBeenCalled();

	expect(session.setEnabled(true)).toBe(true);
	const result = await fire(context(), [prompt("again", 12)]);

	expect(classify).toHaveBeenCalledTimes(1);
	expect(appendedBlockText(result, 0)).toBe(formatRecalledContext([item]));
});

test("the block recall appended is the estimate the request figures report", async () => {
	const { fire, context, item, holder, store } = harness();
	const posts: Publication[] = [];
	holder.install(
		createInstrumentsPublisher({
			sink: {
				register() {},
				post(publication) {
					posts.push(publication);
				},
			},
			store,
		}),
	);

	const result = await fire(context(), [prompt("why?")]);

	expect(appendedBlockText(result, 0)).toBe(formatRecalledContext([item]));
	holder
		.current()
		.requestBuilt(() => ({ pair: undefined, messageEstimates: [], toolResults: [], latestUser: undefined }));
	const request = posts[posts.length - 1];
	expect(request.recalled).toBe(tokenEstimate(formatRecalledContext([item])));
	expect(Number(request.recalled)).toBeGreaterThan(0);
});

test("the classifier's posts reach the bus even when the emit throws", async () => {
	const { fire, context, item, holder, store } = harness();
	const bus = createFakePi({ emitThrows: true });
	holder.install(createInstrumentsPublisher({ sink: createJeffersonBusAdapter(bus.pi), store }));

	const result = await fire(context(), [prompt("why?")]);

	expect(appendedBlockText(result, 0)).toBe(formatRecalledContext([item]));
	expect(bus.emitted.map(({ data }) => data)).toEqual([
		{ extension: "taiknr", field: "deciding", value: true },
		{ extension: "taiknr", field: "decidingItems", value: 1 },
		{ extension: "taiknr", field: "deciding", value: false },
	]);
});

test("cell (a) carries the block this request built, and is cleared at every context_with_system", async () => {
	const { fire, context, payloadCache, item } = harness();
	const block = formatRecalledContext([item]);

	await fire(context(), [prompt("why?")]);
	expect(payloadCache.recallBlock).toBe(block);

	// No user message, so the handler returns early: the clear must have happened before it.
	await fire(context(), [CUSTOM]);
	expect(payloadCache.recallBlock).toBeNull();

	await fire(context(), [prompt("again", 2)]);
	expect(payloadCache.recallBlock).toBe(block);
});

test("a request recall answers nothing for leaves cell (a) empty", async () => {
	const { fire, context, payloadCache } = harness({ config: { decisionThreshold: 0.95 } });

	await fire(context(), [prompt("why?")]);

	expect(payloadCache.recallBlock).toBeNull();
});

/** The task text the classifier was last asked with. */
function taskHeard(classify: unknown): string {
	const calls = (classify as { mock: { calls: unknown[][] } }).mock.calls;
	const [, context] = calls[calls.length - 1];
	return (context as { state: { task: string } }).state.task;
}

/** An assistant message entry appended to the harness's branch. */
function appendAssistant(manager: SessionManager, text = "earlier reply"): string {
	return manager.appendMessage({ role: "assistant", content: [{ type: "text", text }], timestamp: 0 } as never);
}

/** A user message entry appended to the harness's branch. */
function appendUser(manager: SessionManager, text = "why?"): string {
	return manager.appendMessage({ role: "user", content: text, timestamp: 0 } as never);
}

test("X1: a summary keyed on the newest assistant entry before the last user message is carried", async () => {
	const { fire, context, manager, summary, classify } = harness();
	const assistantId = appendAssistant(manager);
	appendUser(manager);
	await summary.write(assistantId, async () => "Goal: g");

	await fire(context(), [prompt("why?")]);

	expect(taskHeard(classify)).toBe(taskText("why?", "Goal: g"));
});

test("X2: a summary written for another entry is not carried", async () => {
	const { fire, context, manager, summary, classify } = harness();
	const older = appendAssistant(manager);
	appendAssistant(manager);
	appendUser(manager);
	await summary.write(older, async () => "Goal: g");

	await fire(context(), [prompt("why?")]);

	expect(taskHeard(classify)).toBe(taskText("why?", undefined));
});

test("X3: no summary on either side gives the no-summary default, and building the request makes no summarizer call", async () => {
	const summarizer = createSummarizerFake();
	const { fire, context, classify } = harness({ summarizer });

	await fire(context(), [prompt("why?")]);

	expect(taskHeard(classify)).toBe(taskText("why?", undefined));
	expect(summarizer.calls).toEqual([]);
});

test("X4: a stored summary is never used with no assistant entry to match", async () => {
	const { fire, context, manager, summary, classify } = harness();
	appendUser(manager);
	await summary.write("e-none", async () => "Goal: g");

	await fire(context(), [prompt("why?")]);

	expect(taskHeard(classify)).toBe(taskText("why?", undefined));
});

test("X5: a summary keyed on an assistant entry after the current message is not carried", async () => {
	const { fire, context, manager, summary, classify } = harness();
	appendUser(manager);
	const later = appendAssistant(manager);
	await summary.write(later, async () => "Goal: g");

	await fire(context(), [prompt("why?")]);

	expect(taskHeard(classify)).toBe(taskText("why?", undefined));
});

test("H9: a summarizer failure and a classifier failure each show their own single notice", async () => {
	const summarizer = createSummarizerFake();
	summarizer.answer("error");
	const { fake, session, holder, summary, manager, context, fire } = harness({
		summarizer,
		config: {
			conversationSummaryEnabled: true,
			conversationSummaryProvider: SUMMARIZER_TEST_PROVIDER,
			conversationSummaryModel: SUMMARIZER_TEST_MODEL,
		},
		classify: async () => ({ stopReason: "error", errorMessage: "boom", answers: {} }),
	});
	registerConversationSummarySettledHandler(createGatedPi(fake.pi, session), { config: session, summary, holder });

	appendAssistant(manager);
	const notices: string[] = [];
	const settled = fake.registered.find(({ event }) => event === "agent_settled");
	settled?.handler({ type: "agent_settled", aborted: false }, context(notices));
	await vi.waitFor(() => expect(notices).toHaveLength(1));
	expect(notices[0]).toContain("conversationSummaryProvider");

	await fire(context(notices), [prompt("why?")]);

	expect(notices).toHaveLength(2);
	expect(notices[1]).toContain("boom");
});
