import type { ContextWithSystemEvent } from "@earendil-works/pi-coding-agent";
import { expect, test } from "vitest";
import { createGatedPi } from "../../../src/app/extension/handler-gate.js";
import { createInstrumentsHolder } from "../../../src/app/extension/instruments-holder.js";
import { createSessionConfig } from "../../../src/config/session-config.js";
import { DEFAULT_TAIKNR_CONFIG } from "../../../src/config/taiknr-config.js";
import type { Pair } from "../../../src/domain/calibration.js";
import { InMemoryArchiveStore } from "../../../src/infra/adapters/pi-archive-adapter.js";
import { registerInstrumentsCompactHandler } from "../../../src/infra/pi-event-handlers/instruments-compact.js";
import { createInstrumentsPublisher, type Publication } from "../../../src/use-cases/instruments-publisher.js";
import { createContextStub, createFakePi } from "../../support/fake-pi.js";

type Message = ContextWithSystemEvent["messages"][number];
type Model = { provider: string; id: string };

const A: Pair = { provider: "anthropic", model: "claude-opus-5-5" };
const MODEL: Model = { provider: A.provider, id: A.model };
const OTHER: Model = { provider: "openrouter", id: "deepseek-v4.1-flash" };

const message = (chars: number): Message =>
	({ role: "user", content: "x".repeat(chars), timestamp: 1 }) as unknown as Message;

function harness() {
	const fake = createFakePi();
	const session = createSessionConfig();
	session.assign({ status: "ready", config: DEFAULT_TAIKNR_CONFIG });
	const store = new InMemoryArchiveStore();
	store.addBatch([
		{ id: "one", toolName: "bash", argsSummary: "", isError: false, stub: "[archived one]", rawText: "x".repeat(400) },
	]);
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
	registerInstrumentsCompactHandler(createGatedPi(fake.pi, session), holder);

	const start = (seeds: { pair: Pair; k: number }[]) =>
		holder.current().sessionStarted(() => ({ pair: A, projectionEstimate: 0, contextWindow: 0, seeds }));
	/** One priced request under A, which makes A live at 0.62. */
	const priceUnderA = () => {
		holder.current().requestBuilt(() => ({
			pair: A,
			messageEstimates: [100],
			toolResults: [],
			latestUser: undefined,
		}));
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
	const fire = (options: { model?: Model; projectionMessages?: Message[]; contextWindow?: number }) =>
		fake.registered[0].handler(
			{ type: "session_compact" },
			createContextStub({ cwd: "/work", trusted: false, model: options.model ?? MODEL, ...options }),
		);
	const last = () => posts[posts.length - 1];

	return { fake, holder, posts, start, priceUnderA, fire, last };
}

test("a compaction re-posts both figures after re-hydration and keeps a pair's live k", () => {
	const { start, priceUnderA, fire, last } = harness();
	start([{ pair: A, k: 0.5 }]);
	priceUnderA();

	fire({ projectionMessages: [message(1000)], contextWindow: 200_000 });

	expect(last()).toEqual({
		archiveItems: 1,
		// The store's sizes are k-scaled too, at the live 0.62: 100 tokens and the 4-token stub.
		archiveStubbed: 2,
		archiveWithheld: 62,
		// A compaction starts a history no request has been built from, so the bar reads the history (6.8).
		contextInTurn: 155,
		contextWindow: 200_000,
		historyBefore: 155,
		recalled: 0,
		stubbed: 0,
		totalContext: 155,
		uncalibrated: false,
		withheld: 0,
	});
});

test("a compaction on a pair with no entry borrows the measured pair's k with the flag on", () => {
	const { start, fire, last } = harness();
	start([{ pair: A, k: 0.5 }]);

	fire({ model: OTHER, projectionMessages: [message(1000)], contextWindow: 0 });

	// 250 tokens of the new history at A's 0.5: a pair with no ratio of its own borrows it (4.4).
	expect(last()).toMatchObject({ totalContext: 125, uncalibrated: true });
});

test("a compaction on a branch with no ratio anywhere posts k 1 with the flag on", () => {
	const { fire, last } = harness();

	fire({ model: OTHER, projectionMessages: [message(1000)], contextWindow: 200_000 });

	expect(last()).toMatchObject({ contextInTurn: 250, totalContext: 250, uncalibrated: true });
});

test("with the switch off nothing is posted and no host read happens", () => {
	const fake = createFakePi();
	const session = createSessionConfig();
	session.assign({ status: "ready", config: { ...DEFAULT_TAIKNR_CONFIG, jeffersonInstruments: false } });
	const holder = createInstrumentsHolder();
	registerInstrumentsCompactHandler(createGatedPi(fake.pi, session), holder);

	expect(() =>
		fake.registered[0].handler(
			{ type: "session_compact" },
			createContextStub({ cwd: "/work", trusted: false, hostReadsThrow: true }),
		),
	).not.toThrow();
	expect(fake.emitted).toEqual([]);
});

test("the same compaction with a real publisher on that context throws, so the silence can fail", () => {
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
	registerInstrumentsCompactHandler(createGatedPi(fake.pi, session), holder);

	expect(() =>
		fake.registered[0].handler(
			{ type: "session_compact" },
			createContextStub({ cwd: "/work", trusted: false, hostReadsThrow: true }),
		),
	).toThrow();
	expect(posts).toEqual([]);
});
