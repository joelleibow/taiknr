import {
	type ContextWithSystemEvent,
	estimateTokens,
	SessionManager,
	type TurnEndEvent,
} from "@earendil-works/pi-coding-agent";
import { expect, test, vi } from "vitest";
import { createGatedPi } from "../../../src/app/extension/handler-gate.js";
import { createInstrumentsHolder } from "../../../src/app/extension/instruments-holder.js";
import { createSessionConfig } from "../../../src/config/session-config.js";
import { DEFAULT_TAIKNR_CONFIG, type TaiknrConfig } from "../../../src/config/taiknr-config.js";
import type { ArchivedToolOutput } from "../../../src/domain/archived-output.js";
import { tokenEstimate } from "../../../src/domain/token-estimate.js";
import { InMemoryArchiveStore, TAIKNR_SIDE_STORE_TYPE } from "../../../src/infra/adapters/pi-archive-adapter.js";
import { registerContextHandler } from "../../../src/infra/pi-event-handlers/context.js";
import { registerInstrumentsRequestHandler } from "../../../src/infra/pi-event-handlers/instruments-request.js";
import { createInstrumentsPublisher, type Publication } from "../../../src/use-cases/instruments-publisher.js";
import type { PayloadCacheState } from "../../../src/use-cases/payload-cache.js";
import type { RecallCache } from "../../../src/use-cases/recall-relevant-context.js";
import { createContextStub, createFakePi } from "../../support/fake-pi.js";

type Messages = ContextWithSystemEvent["messages"];

const REQUEST_KEYS = ["contextInTurn", "historyBefore", "recalled", "stubbed", "uncalibrated", "withheld"];

const MODEL = { provider: "test-provider", id: "test-model" };
const PAIR = { provider: "test-provider", model: "test-model" };

const CONFIG: TaiknrConfig = {
	...DEFAULT_TAIKNR_CONFIG,
	defaultDecisionModelProvider: "test-provider",
	defaultDecisionModel: "test-model",
	decisionThreshold: 0,
};

function prompt(text: string, timestamp = 1000) {
	return { role: "user" as const, content: [{ type: "text" as const, text }], timestamp };
}

const SYSTEM = { role: "system" as const, content: "Keep answers short.", timestamp: 0 };

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

/** Append one archived item to the branch — its tool result, its side-store record and taiknr's stub. */
function appendArchivedItem(manager: SessionManager): ArchivedToolOutput {
	const id = manager.appendMessage(toolResult());
	const item = {
		id,
		toolName: "bash",
		argsSummary: "",
		isError: false,
		stub: `[archived ${id}]`,
		rawText: "x".repeat(400),
	};
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

function harness(options: { config?: Partial<TaiknrConfig>; contextWindow?: number | undefined } = {}) {
	const manager = SessionManager.inMemory();
	const item = appendArchivedItem(manager);
	const fake = createFakePi();
	const session = createSessionConfig();
	const store = new InMemoryArchiveStore();
	store.addBatch([item]);
	const holder = createInstrumentsHolder();
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
	const recallCache: RecallCache = { lastPromptKey: "", lastRecalledIds: [] };
	const modelRegistry = {
		findOfType: vi.fn(() => MODEL),
		classify: vi.fn((_model, context) => Promise.resolve(answered(context))),
	};
	const gated = createGatedPi(fake.pi, session);
	const payloadCache: PayloadCacheState = { recallBlock: null, carrier: null, nextCarrier: null, applied: null };
	registerContextHandler(gated, { config: session, store, recallCache, holder, payloadCache });
	registerInstrumentsRequestHandler(gated, holder);
	session.assign({ status: "ready", config: { ...CONFIG, ...options.config } });

	const context = (contextWindow: number | undefined) =>
		createContextStub({
			cwd: "/work",
			trusted: false,
			branch: manager.getBranch(),
			contextWindow,
			model: MODEL,
			modelRegistry,
		});
	const last = () => posts[posts.length - 1];

	/** Fire recall, then the request registrar on the list recall returned, as pi's runner chains them. */
	const fire = async (messages: Messages, window: number | "unreported" = 200_000) => {
		const contextWindow = window === "unreported" ? undefined : window;
		const recalled = await fake.registered[0].handler(
			{ type: "context_with_system", messages },
			context(contextWindow),
		);
		const carried = (recalled as { messages?: Messages } | undefined)?.messages ?? messages;
		const returned = fake.registered[1].handler(
			{ type: "context_with_system", messages: carried },
			context(contextWindow),
		);
		return { returned, carried, last: last() };
	};

	return { fake, holder, store, posts, item, fire, manager, modelRegistry };
}

test("the request posts the six request figures with recall's block counted, and returns nothing", async () => {
	const { fire } = harness();
	const messages: Messages = [prompt("why did it fail?")];

	const { returned, carried, last } = await fire(messages);

	expect(returned).toBeUndefined();
	expect(Object.keys(last).sort()).toEqual(REQUEST_KEYS);
	expect(last.recalled).toBeGreaterThan(0);
	expect(last.contextInTurn).toBe(carried.reduce((total, message) => total + estimateTokens(message), 0));
});

test("a request recall refused to score still posts the six figures, with nothing recalled", async () => {
	const { fire } = harness({ config: { decisionThreshold: 1 } });

	const { carried, last } = await fire([prompt("why?")]);

	expect(carried).toHaveLength(1);
	expect(Object.keys(last).sort()).toEqual(REQUEST_KEYS);
	expect(last).toMatchObject({ recalled: 0, stubbed: 0, withheld: 0 });
});

const earlyReturns: Array<[string, Messages, number | "unreported"]> = [
	["no latest user message", [SYSTEM, CUSTOM], 200_000],
	["no window", [prompt("why?")], "unreported"],
	["a window of zero", [prompt("why?")], 0],
	["a budget at or below zero", [prompt("x".repeat(4000))], 100],
];

test.each(earlyReturns)("%s still posts the six figures with nothing recalled", async (_case, messages, window) => {
	const { fire } = harness();

	const { last } = await fire(messages, window);

	expect(Object.keys(last).sort()).toEqual(REQUEST_KEYS);
	expect(last).toMatchObject({ recalled: 0, stubbed: 0, withheld: 0 });
});

test("the pending request is written even when recall returned nothing, so the next response is priced", async () => {
	const { fire, holder, posts } = harness({ config: { decisionThreshold: 1 } });
	await fire([prompt("why?")]);

	holder.current().responseReceived(
		{
			pair: PAIR,
			stopReason: "stop",
			usage: { input: 70, cacheRead: 0, cacheWrite: 0 },
			cost: { input: 0, cacheRead: 0, cacheWrite: 0 },
		},
		() => ({ pair: PAIR, projectionEstimate: 0, contextWindow: 0, applied: null }),
	);

	const update = posts[posts.length - 1];
	expect(Object.keys(update)).toContain("savedTokensRequest");
	expect(update.contextInTurn).toBe(70);
});

test("a request carrying one stub reports what it withheld and what stands in its place", async () => {
	const { fire, item, manager } = harness();
	const messages: Messages = [prompt("why?"), { ...toolResult(), content: [{ type: "text", text: item.stub }] }];

	const { last } = await fire(messages);

	expect(last).toMatchObject({ withheld: 100, stubbed: tokenEstimate(item.stub) });
	expect(manager.getBranch().length).toBeGreaterThan(0);
});

test("a request with no model posts its figures at k 1 with the flag on", async () => {
	const { fake, holder, posts } = harness();
	const messages: Messages = [prompt("why?")];
	const ctx = createContextStub({
		cwd: "/work",
		trusted: false,
		branch: [],
		contextWindow: 200_000,
		modelRegistry: { findOfType: () => undefined, classify: vi.fn() },
	});

	fake.registered[1].handler({ type: "context_with_system", messages }, ctx);

	expect(posts[0]).toMatchObject({ uncalibrated: true });
	expect(holder.current()).toBeDefined();
});

test("with the switch off the request registrar posts nothing and evaluates no reading", () => {
	const fake = createFakePi();
	const session = createSessionConfig();
	session.assign({ status: "ready", config: { ...DEFAULT_TAIKNR_CONFIG, jeffersonInstruments: false } });
	const holder = createInstrumentsHolder();
	registerInstrumentsRequestHandler(createGatedPi(fake.pi, session), holder);

	expect(() =>
		fake.registered[0].handler(
			{ type: "context_with_system", messages: [prompt("why?")] },
			createContextStub({ cwd: "/work", trusted: false, hostReadsThrow: true }),
		),
	).not.toThrow();
	expect(fake.emitted).toEqual([]);
});

test("the same request with a real publisher on that context throws, so the silence can fail", () => {
	const fake = createFakePi();
	const session = createSessionConfig();
	session.assign({ status: "ready", config: DEFAULT_TAIKNR_CONFIG });
	const holder = createInstrumentsHolder();
	const posts: Publication[] = [];
	holder.install(
		createInstrumentsPublisher({
			sink: {
				register() {},
				post(publication) {
					posts.push(publication);
				},
			},
			store: new InMemoryArchiveStore(),
		}),
	);
	registerInstrumentsRequestHandler(createGatedPi(fake.pi, session), holder);

	expect(() =>
		fake.registered[0].handler(
			{ type: "context_with_system", messages: [prompt("why?")] },
			createContextStub({ cwd: "/work", trusted: false, hostReadsThrow: true }),
		),
	).toThrow("an instrument read the host while it was off");
	expect(posts).toEqual([]);
});
