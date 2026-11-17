import {
	type ContextWithSystemEvent,
	estimateTokens,
	type MessageEndEvent,
	SessionManager,
} from "@earendil-works/pi-coding-agent";
import { expect, test } from "vitest";
import {
	readCompacted,
	readRequest,
	readResponse,
	readSessionStarted,
	readSettled,
	readTreeJumped,
} from "../../../src/infra/adapters/pi-instrument-readings.js";
import { createContextStub } from "../../support/fake-pi.js";

type Message = ContextWithSystemEvent["messages"][number];

const PAIR = { provider: "anthropic", model: "claude-opus-5-5" };
const MODEL = { provider: "anthropic", id: "claude-opus-5-5" };

const USAGE = {
	input: 500,
	output: 10,
	cacheRead: 0,
	cacheWrite: 0,
	totalTokens: 510,
	cost: { input: 0.0075, output: 0.00015, cacheRead: 0, cacheWrite: 0, total: 0.00765 },
};

const ZERO_USAGE = { ...USAGE, input: 0, output: 0, totalTokens: 0 };

function user(content: string | unknown[], timestamp = 1): Message {
	return { role: "user", content, timestamp } as unknown as Message;
}

function assistant(overrides: Record<string, unknown> = {}): Message {
	return {
		role: "assistant",
		content: [{ type: "text", text: "reply" }],
		api: "anthropic-messages",
		provider: "anthropic",
		model: "claude-opus-5-5",
		usage: USAGE,
		stopReason: "stop",
		timestamp: 2,
		...overrides,
	} as unknown as Message;
}

function toolResult(content: unknown[]): Message {
	return {
		role: "toolResult",
		toolCallId: "call-1",
		toolName: "bash",
		content,
		isError: false,
		timestamp: 3,
	} as unknown as Message;
}

/**
 * A real in-memory branch. `appendMessage`'s union is narrower than the event's message type
 * (TS2345), so each message is cast: Gaps 6.
 */
function branchOf(...messages: Message[]): SessionManager {
	const manager = SessionManager.inMemory();
	for (const message of messages) manager.appendMessage(message as never);
	return manager;
}

const context = (options: Omit<Parameters<typeof createContextStub>[0], "cwd" | "trusted">) =>
	createContextStub({ cwd: "/work", trusted: false, ...options });

const request = (messages: ContextWithSystemEvent["messages"]) =>
	({ type: "context_with_system", messages }) as ContextWithSystemEvent;

const messageEnd = (message: Message) => ({ type: "message_end", message }) as MessageEndEvent;

test("a physical model's pair is the context's own provider and model id", () => {
	const ctx = context({ model: MODEL });

	expect(readCompacted(ctx).pair).toEqual(PAIR);
	expect(readSettled(ctx).pair).toEqual(PAIR);
});

test("no model is no pair", () => {
	expect(readCompacted(context({})).pair).toBeUndefined();
});

test("a virtual selection takes the newest valid reply's pair and skips an error and a zero usage", () => {
	const manager = branchOf(
		user("hi"),
		assistant(),
		assistant({ provider: "openrouter", model: "other", stopReason: "error" }),
		assistant({ provider: "openrouter", model: "another", usage: ZERO_USAGE }),
	);
	const ctx = context({ model: { provider: "pi", id: "virtual", api: "pi-virtual" }, branch: manager.getBranch() });

	expect(readCompacted(ctx).pair).toEqual(PAIR);
});

test("a branch seeds its pair at the reply's prompt over the projection that produced it", () => {
	const manager = branchOf(user("hi"), assistant());
	const ctx = context({ model: MODEL, branch: manager.getBranch() });

	expect(readSessionStarted(ctx).seeds).toEqual([{ pair: PAIR, k: 500 }]);
	expect(readTreeJumped(ctx).seeds).toEqual([{ pair: PAIR, k: 500 }]);
});

test("a usage entry of its own kind never makes a second seed", () => {
	const manager = branchOf(user("hi"), assistant());
	manager.appendUsage("cache_warm", "anthropic", "claude-opus-5-5", USAGE as never);
	const ctx = context({ model: MODEL, branch: manager.getBranch() });

	expect(readSessionStarted(ctx).seeds).toEqual([{ pair: PAIR, k: 500 }]);
});

test("an aborted reply and an empty branch seed nothing", () => {
	const aborted = branchOf(user("hi"), assistant({ stopReason: "aborted" }));

	expect(readSessionStarted(context({ branch: aborted.getBranch() })).seeds).toEqual([]);
	expect(readSessionStarted(context({})).seeds).toEqual([]);
});

test("a persisted projection is the sum of its messages' estimates, and the window is the host's", () => {
	const manager = branchOf(user("hi"));
	const ctx = context({ branch: manager.getBranch(), projectionMessages: [user("hi")], contextWindow: 200_000 });

	expect(readCompacted(ctx)).toEqual({ pair: undefined, projectionEstimate: 1, contextWindow: 200_000 });
	expect(readSettled(ctx)).toEqual({ pair: undefined, projectionEstimate: 1, contextWindow: 200_000 });
	expect(readTreeJumped(ctx)).toEqual({
		pair: undefined,
		projectionEstimate: 1,
		contextWindow: 200_000,
		seeds: [],
	});
});

test("a window the host does not report reads zero", () => {
	expect(readCompacted(context({})).contextWindow).toBe(0);
});

test("a response's persisted estimate counts the reply that has not landed on the branch yet", () => {
	const manager = branchOf(user("hi"));
	const ctx = context({ branch: manager.getBranch(), projectionMessages: [user("hi")] });

	expect(readResponse(messageEnd(assistant()), ctx).projectionEstimate).toBe(1 + estimateTokens(assistant()));
});

test("a request reading carries its pair, every message's estimate and the latest user message", () => {
	const messages = [user("why did it fail?"), toolResult([{ type: "text", text: "raw" }]), user("and then?", 4)];

	expect(readRequest(request(messages), context({ model: MODEL }))).toEqual({
		pair: PAIR,
		messageEstimates: messages.map(estimateTokens),
		toolResults: [{ index: 1, firstText: "raw" }],
		latestUser: { index: 2, timestamp: 4, tailText: "and then?" },
	});
});

test("a request reading touches neither the window, the projection nor the branch", () => {
	const unavailable = (): never => {
		throw new Error("the request reading read the host beyond its model");
	};
	const base = context({ model: MODEL });
	const ctx = {
		...base,
		sessionManager: { getBranch: unavailable, buildSessionProjection: unavailable },
		getContextUsage: unavailable,
	} as unknown as typeof base;

	expect(readRequest(request([user("why?")]), ctx)).toEqual({
		pair: PAIR,
		messageEstimates: [1],
		toolResults: [],
		latestUser: { index: 0, timestamp: 1, tailText: "why?" },
	});
});

test("a request with no messages and no user message has nothing to report", () => {
	expect(readRequest(request([]), context({ model: MODEL }))).toEqual({
		pair: PAIR,
		messageEstimates: [],
		toolResults: [],
		latestUser: undefined,
	});
});

test("a first block that is not text is an empty first text, and a last block that is not text an empty tail", () => {
	const image = { type: "image", data: "iVBORw0KGgo=", mimeType: "image/png" };
	const messages = [
		user([{ type: "text", text: "look" }, image]),
		toolResult([image, { type: "text", text: "after the image" }]),
	];

	const reading = readRequest(request(messages), context({ model: MODEL }));

	expect(reading.toolResults).toEqual([{ index: 1, firstText: "" }]);
	expect(reading.latestUser?.tailText).toBe("");
});

test("a user message whose content is a plain string is its own tail", () => {
	expect(readRequest(request([user("a string prompt")]), context({ model: MODEL })).latestUser).toEqual({
		index: 0,
		timestamp: 1,
		tailText: "a string prompt",
	});
});
