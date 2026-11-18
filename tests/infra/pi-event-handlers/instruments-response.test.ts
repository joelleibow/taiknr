import type { ContextWithSystemEvent } from "@earendil-works/pi-coding-agent";
import { expect, test } from "vitest";
import { createGatedPi } from "../../../src/app/extension/handler-gate.js";
import { createInstrumentsHolder } from "../../../src/app/extension/instruments-holder.js";
import { createSessionConfig } from "../../../src/config/session-config.js";
import { DEFAULT_TAIKNR_CONFIG } from "../../../src/config/taiknr-config.js";
import { InMemoryArchiveStore } from "../../../src/infra/adapters/pi-archive-adapter.js";
import { registerInstrumentsResponseHandler } from "../../../src/infra/pi-event-handlers/instruments-response.js";
import { createInstrumentsPublisher, type Publication } from "../../../src/use-cases/instruments-publisher.js";
import type { PayloadCacheState } from "../../../src/use-cases/payload-cache.js";
import { createContextStub, createFakePi } from "../../support/fake-pi.js";

type Message = ContextWithSystemEvent["messages"][number];
type Pair = { provider: string; model: string };

const A: Pair = { provider: "anthropic", model: "claude-opus-5-5" };
const B: Pair = { provider: "openrouter", model: "deepseek/deepseek-v4.1-flash" };

const RESPONSE_KEYS = [
	"archiveStubbed",
	"archiveWithheld",
	"contextInTurn",
	"contextWindow",
	"historyBefore",
	"recalled",
	"savedDollarsRequest",
	"savedDollarsSinceStart",
	"savedTokensRequest",
	"savedTokensSinceStart",
	"stubbed",
	"totalContext",
	"uncalibrated",
	"withheld",
];

const UNPRICED_KEYS = ["archiveStubbed", "archiveWithheld", "contextWindow", "totalContext", "uncalibrated"];

const USAGE = {
	input: 70,
	output: 5,
	cacheRead: 0,
	cacheWrite: 0,
	totalTokens: 75,
	cost: { input: 0.00105, output: 0.000075, cacheRead: 0, cacheWrite: 0, total: 0.001125 },
};

function assistant(overrides: Record<string, unknown> = {}): Message {
	return {
		role: "assistant",
		content: [{ type: "text", text: "reply" }],
		api: "anthropic-messages",
		provider: A.provider,
		model: A.model,
		usage: USAGE,
		stopReason: "stop",
		timestamp: 2,
		...overrides,
	} as unknown as Message;
}

const user = (text: string): Message => ({ role: "user", content: text, timestamp: 1 }) as unknown as Message;

/** The payload state the registrar reads its one fact from. */
function payloadState(applied: PayloadCacheState["applied"] = null): PayloadCacheState {
	return { recallBlock: null, carrier: null, nextCarrier: null, applied };
}

function harness() {
	const fake = createFakePi();
	const session = createSessionConfig();
	session.assign({ status: "ready", config: DEFAULT_TAIKNR_CONFIG });
	const store = new InMemoryArchiveStore();
	const posts: Publication[] = [];
	const holder = createInstrumentsHolder();
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
	registerInstrumentsResponseHandler(createGatedPi(fake.pi, session), holder, payloadState());

	const context = () =>
		createContextStub({
			cwd: "/work",
			trusted: false,
			model: { provider: A.provider, id: A.model },
			contextWindow: 200_000,
			projectionMessages: [user("x".repeat(400))],
		});
	const fire = (message: Message) => fake.registered[0].handler({ type: "message_end", message }, context());
	const pending = (estimates: number[] = [100]) =>
		holder.current().requestBuilt(() => ({
			pair: A,
			messageEstimates: estimates,
			toolResults: [],
			latestUser: undefined,
		}));
	const last = () => posts[posts.length - 1];

	return { fake, holder, posts, fire, pending, last };
}

test("a valid response to a pending request posts the fourteen figures with the measured context in turn", () => {
	const { fire, pending, last } = harness();
	pending();

	expect(fire(assistant())).toBeUndefined();

	expect(Object.keys(last()).sort()).toEqual(RESPONSE_KEYS);
	expect(last()).toMatchObject({ contextInTurn: 70, uncalibrated: false });
	// k 0.7 over the 100-token history plus the 2-token reply that has not landed on the branch.
	expect(last().totalContext).toBe(71);
});

test("the pair an update is posted under is the response's own", () => {
	const { fire, pending, holder, last } = harness();
	pending();

	fire(assistant({ provider: B.provider, model: B.model }));

	expect(last().uncalibrated).toBe(false);
	holder.current().settled(() => ({ pair: A, projectionEstimate: 100, contextWindow: 0 }));
	expect(last().uncalibrated).toBe(true);
});

const invalidResponses: Array<[string, Message]> = [
	["an aborted response", assistant({ stopReason: "aborted" })],
	["an errored response", assistant({ stopReason: "error" })],
	["a response with no usage at all", assistant({ usage: { ...USAGE, input: 0, output: 0, totalTokens: 0 } })],
	["a response whose token count is not a number", assistant({ usage: { ...USAGE, input: Number.NaN } })],
];

test.each(invalidResponses)("%s posts the five unpriced figures", (_case, message) => {
	const { fire, pending, last } = harness();
	pending();

	fire(message);

	expect(Object.keys(last()).sort()).toEqual(UNPRICED_KEYS);
});

test("a response with nothing pending posts the five unchanged figures", () => {
	const { fire, last } = harness();

	fire(assistant());

	expect(Object.keys(last()).sort()).toEqual(UNPRICED_KEYS);
});

test("a pending request whose estimate is zero prices nothing", () => {
	const { fire, pending, last } = harness();
	pending([]);

	fire(assistant());

	expect(Object.keys(last()).sort()).toEqual(UNPRICED_KEYS);
});

test("a cost component that is not a number still posts the fourteen figures", () => {
	const { fire, pending, last } = harness();
	pending();

	fire(assistant({ usage: { ...USAGE, cost: { ...USAGE.cost, cacheRead: Number.NaN } } }));

	expect(Object.keys(last()).sort()).toEqual(RESPONSE_KEYS);
});

test("a user message and a tool result post nothing", () => {
	const { fake, posts } = harness();

	fake.registered[0].handler(
		{ type: "message_end", message: user("why?") },
		createContextStub({ cwd: "/work", trusted: false }),
	);
	fake.registered[0].handler(
		{
			type: "message_end",
			message: { role: "toolResult", toolCallId: "c", toolName: "bash", content: [], isError: false, timestamp: 3 },
		},
		createContextStub({ cwd: "/work", trusted: false }),
	);

	expect(posts).toEqual([]);
});

test("with the switch off nothing is posted and no host read happens", () => {
	const fake = createFakePi();
	const session = createSessionConfig();
	session.assign({ status: "ready", config: { ...DEFAULT_TAIKNR_CONFIG, jeffersonInstruments: false } });
	const holder = createInstrumentsHolder();
	registerInstrumentsResponseHandler(createGatedPi(fake.pi, session), holder, payloadState());
	const noHostReads = createContextStub({ cwd: "/work", trusted: false, hostReadsThrow: true });

	expect(() => fake.registered[0].handler({ type: "message_end", message: assistant() }, noHostReads)).not.toThrow();
	expect(fake.emitted).toEqual([]);
});

test("the same response with a real publisher on that context throws, so the silence can fail", () => {
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
	registerInstrumentsResponseHandler(createGatedPi(fake.pi, session), holder, payloadState());

	expect(() =>
		fake.registered[0].handler(
			{ type: "message_end", message: assistant() },
			createContextStub({ cwd: "/work", trusted: false, hostReadsThrow: true }),
		),
	).toThrow();
	expect(posts).toEqual([]);
});

test("the registrar hands the payload state's placement to the publisher, unevaluated", () => {
	const fake = createFakePi();
	const session = createSessionConfig();
	session.assign({ status: "ready", config: DEFAULT_TAIKNR_CONFIG });
	const state = payloadState(null);
	const reads: Array<() => unknown> = [];
	registerInstrumentsResponseHandler(
		createGatedPi(fake.pi, session),
		{
			current: () => ({
				...createInstrumentsPublisher({ sink: { register() {}, post() {} }, store: new InMemoryArchiveStore() }),
				responseReceived(_response, read) {
					reads.push(read);
				},
			}),
			install() {},
		},
		state,
	);
	const context = () => createContextStub({ cwd: "/work", trusted: false, projectionMessages: [] });

	fake.registered[0].handler({ type: "message_end", message: assistant() }, context());
	expect(reads).toHaveLength(1);
	expect(reads[0]?.()).toMatchObject({ applied: null });

	// Read at evaluation time, which is what keeps a fault in the placement out of the payload handler.
	state.applied = { carrierRead: "block", block: "uncached" };
	expect(reads[0]?.()).toMatchObject({ applied: { carrierRead: "block", block: "uncached" } });
});
