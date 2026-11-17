import { type ContextWithSystemEvent, SessionManager } from "@earendil-works/pi-coding-agent";
import { expect, test } from "vitest";
import { createGatedPi } from "../../../src/app/extension/handler-gate.js";
import { createInstrumentsHolder } from "../../../src/app/extension/instruments-holder.js";
import { createSessionConfig } from "../../../src/config/session-config.js";
import { DEFAULT_TAIKNR_CONFIG } from "../../../src/config/taiknr-config.js";
import type { Pair } from "../../../src/domain/calibration.js";
import { InMemoryArchiveStore } from "../../../src/infra/adapters/pi-archive-adapter.js";
import { registerInstrumentsTreeHandler } from "../../../src/infra/pi-event-handlers/instruments-tree.js";
import { createInstrumentsPublisher, type Publication } from "../../../src/use-cases/instruments-publisher.js";
import { createContextStub, createFakePi } from "../../support/fake-pi.js";

type Message = ContextWithSystemEvent["messages"][number];

const A: Pair = { provider: "anthropic", model: "claude-opus-5-5" };
const B: Pair = { provider: "openrouter", model: "deepseek/deepseek-v4.1-flash" };

const message = (chars: number): Message =>
	({ role: "user", content: "x".repeat(chars), timestamp: 1 }) as unknown as Message;

/** A branch of one user message and one valid reply for `pair`, whose prompt makes its seed 500. */
function branchSeeding(pair: Pair): SessionManager {
	const manager = SessionManager.inMemory();
	manager.appendMessage({ role: "user", content: "hi", timestamp: 1 } as never);
	manager.appendMessage({
		role: "assistant",
		content: [{ type: "text", text: "reply" }],
		api: "anthropic-messages",
		provider: pair.provider,
		model: pair.model,
		usage: {
			input: 500,
			output: 0,
			cacheRead: 0,
			cacheWrite: 0,
			totalTokens: 500,
			cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
		},
		stopReason: "stop",
		timestamp: 2,
	} as never);
	return manager;
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
	registerInstrumentsTreeHandler(createGatedPi(fake.pi, session), holder);

	const start = (seeds: { pair: Pair; k: number }[]) =>
		holder.current().sessionStarted(() => ({ pair: A, projectionEstimate: 0, contextWindow: 0, seeds }));
	/** One priced request under A, which makes A live at 0.62. */
	const priceUnderA = () => {
		holder.current().requestBuilt(() => ({ pair: A, messageEstimates: [100], toolResults: [], latestUser: undefined }));
		holder.current().responseReceived(
			{
				pair: A,
				stopReason: "stop",
				usage: { input: 62, cacheRead: 0, cacheWrite: 0 },
				cost: { input: 0, cacheRead: 0, cacheWrite: 0 },
			},
			() => ({ pair: A, projectionEstimate: 0, contextWindow: 0 }),
		);
	};
	const fire = (options: {
		model: { provider: string; id: string };
		branch?: unknown[];
		projectionMessages?: Message[];
	}) =>
		fake.registered[0].handler(
			{ type: "session_tree" },
			createContextStub({ cwd: "/work", trusted: false, ...options } as never),
		);
	const last = () => posts[posts.length - 1];

	return { fake, holder, posts, start, priceUnderA, fire, last };
}

test("a tree jump reseeds the entries it has not measured live and keeps the one it has", () => {
	const { start, priceUnderA, fire, holder, last } = harness();
	start([
		{ pair: A, k: 0.5 },
		{ pair: B, k: 0.9 },
	]);
	priceUnderA();

	fire({
		model: { provider: B.provider, id: B.model },
		branch: branchSeeding(B).getBranch(),
		projectionMessages: [message(8)],
	});

	// The new branch's seed for B is 500 over a 2-token projection, so the figure is 1000 and the flag is on.
	expect(last()).toMatchObject({ totalContext: 1000, uncalibrated: true });

	holder.current().settled(() => ({ pair: A, projectionEstimate: 1000, contextWindow: 0 }));
	expect(last()).toMatchObject({ totalContext: 620, uncalibrated: false });
});

test("a jump to a branch with no sample for a seeded pair posts k 1 with the flag on", () => {
	const { start, fire, last } = harness();
	start([{ pair: A, k: 0.5 }]);

	fire({ model: { provider: A.provider, id: A.model }, branch: [], projectionMessages: [message(8)] });

	expect(last()).toMatchObject({ totalContext: 2, uncalibrated: true });
});

test("a jump whose projection counts only what is persisted posts that estimate", () => {
	const { fire, last } = harness();

	fire({ model: { provider: A.provider, id: A.model }, branch: [], projectionMessages: [message(400)] });

	expect(last()).toMatchObject({ totalContext: 100, uncalibrated: true });
});

test("with the switch off nothing is posted and no host read happens", () => {
	const fake = createFakePi();
	const session = createSessionConfig();
	session.assign({ status: "ready", config: { ...DEFAULT_TAIKNR_CONFIG, jeffersonInstruments: false } });
	const holder = createInstrumentsHolder();
	registerInstrumentsTreeHandler(createGatedPi(fake.pi, session), holder);

	expect(() =>
		fake.registered[0].handler(
			{ type: "session_tree" },
			createContextStub({ cwd: "/work", trusted: false, hostReadsThrow: true }),
		),
	).not.toThrow();
	expect(fake.emitted).toEqual([]);
});

test("the same jump with a real publisher on that context throws, so the silence can fail", () => {
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
	registerInstrumentsTreeHandler(createGatedPi(fake.pi, session), holder);

	expect(() =>
		fake.registered[0].handler(
			{ type: "session_tree" },
			createContextStub({ cwd: "/work", trusted: false, hostReadsThrow: true }),
		),
	).toThrow();
	expect(posts).toEqual([]);
});
