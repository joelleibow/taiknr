import { expect, test } from "vitest";
import type { ArchivedToolOutput } from "../../src/domain/archived-output.js";
import type { Pair } from "../../src/domain/calibration.js";
import { InMemoryArchiveStore } from "../../src/infra/adapters/pi-archive-adapter.js";
import {
	createInstrumentsPublisher,
	type InstrumentSink,
	type Publication,
	type RequestReading,
	type ResponseMessage,
	type SessionStartedReadings,
} from "../../src/use-cases/instruments-publisher.js";
import type { AppliedPlacement } from "../../src/use-cases/payload-cache.js";

const A: Pair = { provider: "anthropic", model: "claude-opus-5-5" };
const B: Pair = { provider: "openrouter", model: "deepseek/deepseek-v4.1-flash" };
/** The pair of the measured model switch: Opus 5.5 → Fable 5.2 (owner-rulings.md 2026-11-17). */
const FABLE: Pair = { provider: "anthropic", model: "claude-fable-5-2" };

/** Read $1.50/M and write $18.75/M, the design's dollar-table rates. */
const READ = 1.5e-6;
const WRITE = 18.75e-6;

/** An archived item whose stub is `[archived <id>]` and whose raw text is `rawChars` characters. */
function archived(id: string, rawChars: number): ArchivedToolOutput {
	return {
		id,
		toolName: "bash",
		argsSummary: "",
		isError: false,
		stub: `[archived ${id}]`,
		rawText: "x".repeat(rawChars),
	};
}

/** 400 chars of raw text against a 14-character stub: 100 tokens withheld, 4 stubbed. */
const ONE = archived("one", 400);
const TWO = archived("two", 400);
/** 24 chars of raw text: 6 tokens withheld against the stub's 4, so the item saves 2 tokens. */
const TWO_TOKENS = archived("six", 24);

const VALUES_KEYS = [
	"archiveItems",
	"archiveStubbed",
	"archiveWithheld",
	"contextInTurn",
	"contextWindow",
	"deciding",
	"decidingItems",
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

const CONTEXT_KEYS = [
	"archiveItems",
	"archiveStubbed",
	"archiveWithheld",
	"contextWindow",
	"totalContext",
	"uncalibrated",
];

/** A branch event that starts a history: the six context fields and the five a request-less history posts. */
const NEW_HISTORY_KEYS = [
	"archiveItems",
	"archiveStubbed",
	"archiveWithheld",
	"contextInTurn",
	"contextWindow",
	"historyBefore",
	"recalled",
	"stubbed",
	"totalContext",
	"uncalibrated",
	"withheld",
];

const UNPRICED_KEYS = ["archiveStubbed", "archiveWithheld", "contextWindow", "totalContext", "uncalibrated"];

const REQUEST_KEYS = ["contextInTurn", "historyBefore", "recalled", "stubbed", "uncalibrated", "withheld"];

/** A sink that records every publication, checking each posted value's type on the way through. */
function recording() {
	const posts: Publication[] = [];
	const order: string[] = [];
	let registrations = 0;
	const sink: InstrumentSink = {
		register() {
			registrations += 1;
			order.push("register");
		},
		post(publication) {
			for (const [key, value] of Object.entries(publication)) {
				if (key === "deciding" || key === "uncalibrated") expect(typeof value, `${key} is a boolean`).toBe("boolean");
				else expect(Number.isFinite(value), `${key} is a finite number`).toBe(true);
			}
			order.push("post");
			posts.push(publication);
		},
	};
	return { sink, posts, order, registrations: () => registrations };
}

function harness(options: { items?: ArchivedToolOutput[] } = {}) {
	const store = new InMemoryArchiveStore();
	if (options.items !== undefined) store.addBatch(options.items);
	const recorded = recording();
	const publisher = createInstrumentsPublisher({ sink: recorded.sink, store });
	const last = () => recorded.posts[recorded.posts.length - 1];
	const start = (readings: Partial<SessionStartedReadings> = {}) =>
		publisher.sessionStarted(() => ({
			pair: undefined,
			projectionEstimate: 0,
			contextWindow: 0,
			seeds: [],
			...readings,
		}));
	return { publisher, store, recorded, last, start };
}

/** A request reading: one 100-token message, no tool results and no user message unless the case says. */
function reading(overrides: Partial<RequestReading> = {}): RequestReading {
	return { pair: A, messageEstimates: [100], toolResults: [], latestUser: undefined, ...overrides };
}

/** A response at read $1.50/M and write $18.75/M, whose prompt is the sum of its token counts. */
function response(
	usage: Partial<ResponseMessage["usage"]> = {},
	overrides: Partial<ResponseMessage> = {},
): ResponseMessage {
	const counts = { input: 0, cacheRead: 0, cacheWrite: 0, ...usage };
	return {
		pair: A,
		stopReason: "stop",
		usage: counts,
		cost: { input: counts.input * 15e-6, cacheRead: counts.cacheRead * READ, cacheWrite: counts.cacheWrite * WRITE },
		...overrides,
	};
}

/** The reading a response whose finished payload placed what `applied` says reports (D7, D8). */
const placed = (applied: AppliedPlacement | null) => () => ({ ...contextReading(), applied });

/** The reading at a response: 500 tokens persisted, a 200k window, and no message-level edit priced. */
const contextReading = (pair: Pair | undefined = A) => ({
	pair,
	projectionEstimate: 500,
	contextWindow: 200_000,
	applied: null,
});

test("session start registers, then posts every one of the seventeen declared fields", () => {
	const { recorded, start } = harness();

	start();

	expect(recorded.registrations()).toBe(1);
	expect(recorded.order).toEqual(["register", "post"]);
	expect(Object.keys(recorded.posts[0]).sort()).toEqual(VALUES_KEYS);
	expect(recorded.posts[0]).toEqual({
		contextInTurn: 0,
		historyBefore: 0,
		withheld: 0,
		stubbed: 0,
		recalled: 0,
		totalContext: 0,
		archiveItems: 0,
		archiveWithheld: 0,
		archiveStubbed: 0,
		savedTokensRequest: 0,
		savedTokensSinceStart: 0,
		savedDollarsRequest: 0,
		savedDollarsSinceStart: 0,
		deciding: false,
		decidingItems: 0,
		contextWindow: 0,
		uncalibrated: true,
	});
});

test("the opening figures scale the persisted estimate and the store's sizes by the seed's k", () => {
	const { recorded, start } = harness({ items: [ONE] });

	start({ pair: A, projectionEstimate: 1000, contextWindow: 200_000, seeds: [{ pair: A, k: 1.5 }] });

	expect(recorded.posts[0]).toMatchObject({
		totalContext: 1500,
		contextInTurn: 1500,
		historyBefore: 1500,
		archiveItems: 1,
		archiveWithheld: 150,
		archiveStubbed: 6,
		contextWindow: 200_000,
		uncalibrated: true,
	});
});

test("a request posts the six request figures and nothing else", () => {
	const { publisher, last, start } = harness({ items: [ONE] });
	start();

	publisher.requestBuilt(() =>
		reading({
			messageEstimates: [100, 50, 50],
			toolResults: [{ index: 1, firstText: ONE.stub }],
			latestUser: { index: 0, timestamp: 5, tailText: "why?" },
		}),
	);

	expect(Object.keys(last()).sort()).toEqual(REQUEST_KEYS);
	expect(last()).toEqual({
		contextInTurn: 200,
		historyBefore: 200 + 100 - 4,
		recalled: 0,
		stubbed: 4,
		uncalibrated: true,
		withheld: 100,
	});
});

test("a request's figures come from the stubs the request carries, not from the store's contents", () => {
	const { publisher, last, start } = harness({ items: [ONE, TWO] });
	start();

	publisher.requestBuilt(() => reading({ toolResults: [{ index: 1, firstText: ONE.stub }] }));

	expect(last()).toMatchObject({ withheld: 100, stubbed: 4 });
});

test("a request evaluates its reading once", () => {
	const { publisher, start } = harness();
	start();
	let reads = 0;

	publisher.requestBuilt(() => {
		reads += 1;
		return reading();
	});

	expect(reads).toBe(1);
});

test("recall's block is published as its own figure and is taken out of history before", () => {
	const { publisher, last, start } = harness({ items: [ONE] });
	start();
	publisher.reportRecalled(() => ({ estimate: 40 }));

	publisher.requestBuilt(() =>
		reading({
			toolResults: [{ index: 1, firstText: ONE.stub }],
			latestUser: { index: 0, timestamp: 1, tailText: "block" },
		}),
	);

	expect(last()).toEqual({
		contextInTurn: 100,
		historyBefore: 100 + 100 - 4 - 40,
		recalled: 40,
		stubbed: 4,
		uncalibrated: true,
		withheld: 100,
	});
});

test("a request with no messages, no stub and no block posts three zeros", () => {
	const { publisher, last, start } = harness();
	start();

	publisher.requestBuilt(() => reading({ messageEstimates: [] }));

	expect(last()).toEqual({
		contextInTurn: 0,
		historyBefore: 0,
		recalled: 0,
		stubbed: 0,
		uncalibrated: true,
		withheld: 0,
	});
});

test("a valid response makes its pair live and re-posts every k-scaled figure with the new k", () => {
	const { publisher, last, start } = harness({ items: [ONE] });
	start({ pair: A });
	publisher.requestBuilt(() => reading({ toolResults: [{ index: 1, firstText: ONE.stub }] }));

	publisher.responseReceived(response({ cacheRead: 30, cacheWrite: 40 }), () => ({
		pair: A,
		projectionEstimate: 500,
		contextWindow: 200_000,
		applied: null,
	}));

	const update = last();
	expect(Object.keys(update).sort()).toEqual(RESPONSE_KEYS);
	expect(update).toMatchObject({
		contextInTurn: 70,
		historyBefore: 137,
		withheld: 70,
		stubbed: 3,
		recalled: 0,
		savedTokensRequest: 67,
		savedTokensSinceStart: 67,
		totalContext: 350,
		archiveWithheld: 70,
		archiveStubbed: 3,
		contextWindow: 200_000,
		uncalibrated: false,
	});
	expect(Number(update.historyBefore) - Number(update.contextInTurn)).toBe(Number(update.savedTokensRequest));
	expect(update.savedDollarsRequest).toBeCloseTo(0.7 * 96 * READ, 9);
	expect(update.savedDollarsSinceStart).toBeCloseTo(Number(update.savedDollarsRequest), 9);
});

test("a response whose cost component is not a number keeps every token figure and falls back on the rate", () => {
	const run = (cost: ResponseMessage["cost"]) => {
		const { publisher, last, start } = harness({ items: [ONE] });
		start({ pair: A });
		publisher.requestBuilt(() => reading({ toolResults: [{ index: 1, firstText: ONE.stub }] }));
		publisher.responseReceived(response({ cacheRead: 30, cacheWrite: 40 }, { cost }), contextReading);
		return last();
	};

	const clean = run({ input: 0, cacheRead: 30 * READ, cacheWrite: 40 * WRITE });
	const broken = run({ input: 0, cacheRead: Number.NaN, cacheWrite: 40 * WRITE });

	expect(broken).toMatchObject({
		contextInTurn: clean.contextInTurn,
		historyBefore: clean.historyBefore,
		savedTokensRequest: clean.savedTokensRequest,
		uncalibrated: clean.uncalibrated,
	});
	// The read rate took the zero-token fallback, which is this response's input rate of zero.
	expect(broken.savedDollarsRequest).toBe(0);
	expect(clean.savedDollarsRequest).toBeGreaterThan(0);
});

test("a valid response with nothing pending posts the five unchanged figures", () => {
	const { publisher, last, start } = harness({ items: [ONE] });
	start({ pair: A });

	publisher.responseReceived(response({ cacheRead: 30, cacheWrite: 40 }), contextReading);

	expect(Object.keys(last()).sort()).toEqual(UNPRICED_KEYS);
	expect(last()).toEqual({
		archiveStubbed: 4,
		archiveWithheld: 100,
		contextWindow: 200_000,
		totalContext: 500,
		uncalibrated: true,
	});
});

const invalidResponses: Array<[string, ResponseMessage]> = [
	["an aborted response", response({ cacheRead: 30 }, { stopReason: "aborted" })],
	["an errored response", response({ cacheRead: 30 }, { stopReason: "error" })],
	["a response with no usage at all", response()],
	["a response whose token count is not a number", response({ input: Number.NaN })],
	["a response whose token count is negative", response({ cacheRead: -1 })],
];

test.each(invalidResponses)("%s prices nothing and posts the five unpriced figures", (_case, invalid) => {
	const { publisher, last, start } = harness({ items: [ONE] });
	start({ pair: A });
	publisher.requestBuilt(() => reading({ toolResults: [{ index: 1, firstText: ONE.stub }] }));

	publisher.responseReceived(invalid, contextReading);

	expect(Object.keys(last()).sort()).toEqual(UNPRICED_KEYS);
	expect(last().uncalibrated).toBe(true);
});

test("an invalid response consumes the pending request, so the next valid one prices nothing", () => {
	const { publisher, last, start } = harness({ items: [ONE] });
	start({ pair: A });
	publisher.requestBuilt(() => reading({ toolResults: [{ index: 1, firstText: ONE.stub }] }));
	publisher.responseReceived(response({ cacheRead: 30 }, { stopReason: "aborted" }), contextReading);

	publisher.responseReceived(response({ cacheRead: 30, cacheWrite: 40 }), contextReading);

	expect(Object.keys(last()).sort()).toEqual(UNPRICED_KEYS);
});

test("a valid response whose pending estimate is not above zero prices nothing", () => {
	const { publisher, last, start } = harness();
	start({ pair: A });
	publisher.requestBuilt(() => reading({ messageEstimates: [] }));

	publisher.responseReceived(response({ cacheRead: 30, cacheWrite: 40 }), contextReading);

	expect(Object.keys(last()).sort()).toEqual(UNPRICED_KEYS);
});

test("two requests that each save 1.4 tokens make the since-start total 1 and then 2", () => {
	const { publisher, recorded, start } = harness({ items: [TWO_TOKENS] });
	start({ pair: A });
	const price = () => {
		publisher.requestBuilt(() => reading({ toolResults: [{ index: 1, firstText: TWO_TOKENS.stub }] }));
		publisher.responseReceived(response({ cacheRead: 30, cacheWrite: 40 }), contextReading);
	};

	price();
	price();

	const priced = recorded.posts.filter((post) => "savedTokensSinceStart" in post && !("archiveItems" in post));
	expect(priced.map(({ savedTokensRequest }) => savedTokensRequest)).toEqual([1, 1]);
	expect(priced.map(({ savedTokensSinceStart }) => savedTokensSinceStart)).toEqual([1, 2]);
	expect(priced[1].savedDollarsSinceStart).toBeCloseTo(
		Number(priced[0].savedDollarsRequest) + Number(priced[1].savedDollarsRequest),
		9,
	);
});

test("a block larger than the stub saving publishes a negative pair and a falling total", () => {
	const { publisher, last, start } = harness({ items: [TWO_TOKENS] });
	start({ pair: A });
	publisher.requestBuilt(() =>
		reading({ messageEstimates: [99, 1], toolResults: [{ index: 1, firstText: TWO_TOKENS.stub }] }),
	);
	publisher.responseReceived(response({ cacheRead: 30, cacheWrite: 40 }), contextReading);
	expect(last().savedTokensRequest).toBe(1);

	publisher.reportRecalled(() => ({ estimate: 1000 }));
	publisher.requestBuilt(() =>
		reading({ messageEstimates: [99, 1, 1900], latestUser: { index: 2, timestamp: 2, tailText: "block" } }),
	);
	publisher.responseReceived(response({ cacheRead: 1000, cacheWrite: 400 }), contextReading);

	const update = last();
	expect(update.savedTokensRequest).toBe(-700);
	expect(update.savedTokensSinceStart).toBe(-699);
	expect(update.savedDollarsRequest).toBeCloseTo(-0.013125, 9);
	expect(update.savedDollarsSinceStart).toBeCloseTo(0.7 * 2 * READ - 0.013125, 9);
});

test("a negative saving that rounds to zero is published as minus zero", () => {
	const { publisher, last, start } = harness();
	start({ pair: A });
	publisher.reportRecalled(() => ({ estimate: 3 }));
	publisher.requestBuilt(() =>
		reading({ messageEstimates: [1000], latestUser: { index: 0, timestamp: 1, tailText: "block" } }),
	);

	publisher.responseReceived(response({ input: 100 }), contextReading);

	expect(last().savedTokensRequest).toBeCloseTo(0, 5);
});

test("the same block on the same carried message charges no rewrite", () => {
	const { publisher, last, start } = harness();
	start({ pair: A });
	const user = { index: 0, timestamp: 7, tailText: "block" };
	const price = (estimate: number) => {
		publisher.reportRecalled(() => ({ estimate }));
		publisher.requestBuilt(() => reading({ latestUser: user }));
		publisher.responseReceived(response({ cacheRead: 30, cacheWrite: 40 }), contextReading);
	};

	price(40);
	price(40);

	expect(last().savedDollarsRequest).toBeCloseTo(-0.7 * 40 * READ, 9);
});

test("a shrunk block on the same carried message charges the suffix behind it", () => {
	const { publisher, last, start } = harness();
	start({ pair: A });
	publisher.reportRecalled(() => ({ estimate: 40 }));
	publisher.requestBuilt(() => reading({ latestUser: { index: 0, timestamp: 7, tailText: "block" } }));
	publisher.responseReceived(response({ cacheRead: 30, cacheWrite: 40 }), contextReading);

	publisher.reportRecalled(() => ({ estimate: 20 }));
	publisher.requestBuilt(() => reading({ latestUser: { index: 0, timestamp: 7, tailText: "sm" } }));
	publisher.responseReceived(response({ cacheRead: 30, cacheWrite: 40 }), contextReading);

	// D8: no request ever cached this block, so it is a write even though the message is the carried one.
	expect(last().savedDollarsRequest).toBeCloseTo(-0.7 * 20 * WRITE - 0.7 * 100 * (WRITE - READ), 9);
});

test("a carried message whose block is gone charges the suffix and prices nothing as recalled", () => {
	const { publisher, last, start } = harness();
	start({ pair: A });
	publisher.reportRecalled(() => ({ estimate: 40 }));
	publisher.requestBuilt(() => reading({ latestUser: { index: 0, timestamp: 7, tailText: "block" } }));
	publisher.responseReceived(response({ cacheRead: 30, cacheWrite: 40 }), contextReading);

	publisher.requestBuilt(() => reading({ latestUser: { index: 0, timestamp: 7, tailText: "why?" } }));
	publisher.responseReceived(response({ cacheRead: 30, cacheWrite: 40 }), contextReading);

	expect(last().savedDollarsRequest).toBeCloseTo(-0.7 * 100 * (WRITE - READ), 9);
});

test("a new user turn charges the old block's message and prices the new block as a write", () => {
	const { publisher, last, start } = harness();
	start({ pair: A });
	publisher.reportRecalled(() => ({ estimate: 40 }));
	publisher.requestBuilt(() =>
		reading({ messageEstimates: [100, 100], latestUser: { index: 0, timestamp: 7, tailText: "block" } }),
	);
	publisher.responseReceived(response({ cacheRead: 30, cacheWrite: 40 }), contextReading);

	publisher.reportRecalled(() => ({ estimate: 30 }));
	publisher.requestBuilt(() =>
		reading({ messageEstimates: [100, 100, 50], latestUser: { index: 2, timestamp: 9, tailText: "next" } }),
	);
	publisher.responseReceived(response({ cacheRead: 145, cacheWrite: 30 }), contextReading);

	const k = 175 / 250;
	expect(last().savedDollarsRequest).toBeCloseTo(-k * 30 * WRITE - k * 200 * (WRITE - READ), 9);
});

test("a first block with no previous block charges no rewrite and prices the block as a write", () => {
	const { publisher, last, start } = harness();
	start({ pair: A });
	publisher.requestBuilt(() =>
		reading({ messageEstimates: [100, 100], latestUser: { index: 1, timestamp: 7, tailText: "why?" } }),
	);
	publisher.responseReceived(response({ cacheRead: 350 }), contextReading);

	publisher.reportRecalled(() => ({ estimate: 30 }));
	publisher.requestBuilt(() =>
		reading({ messageEstimates: [100, 100, 50], latestUser: { index: 2, timestamp: 9, tailText: "block" } }),
	);
	publisher.responseReceived(response({ cacheRead: 145, cacheWrite: 30 }), contextReading);

	expect(last().savedDollarsRequest).toBeCloseTo(-(175 / 250) * 30 * WRITE, 9);
});

test("a settlement charges the suffix to the baseline's end and never the new tail", () => {
	const { publisher, last, start, store } = harness();
	start({ pair: A });
	publisher.requestBuilt(() =>
		reading({ messageEstimates: [100, 200, 300], latestUser: { index: 2, timestamp: 1, tailText: "first" } }),
	);
	publisher.responseReceived(response({ cacheRead: 600 }), contextReading);

	store.addBatch([ONE]);
	publisher.requestBuilt(() =>
		reading({
			messageEstimates: [100, 200, 300, 1500],
			toolResults: [{ index: 1, firstText: ONE.stub }],
			latestUser: { index: 3, timestamp: 2, tailText: "more" },
		}),
	);
	publisher.responseReceived(response({ cacheRead: 1600, cacheWrite: 500 }), contextReading);

	expect(last().savedDollarsRequest).toBeCloseTo((2100 / 2100) * 96 * READ - (2100 / 2100) * 500 * (WRITE - READ), 9);
});

test.each(["error", "aborted"])(
	"an %s attempt prices nothing, and the identical retry is charged the rewrite once",
	(stopReason) => {
		const large = archived("one", 19_856);
		const { publisher, last, start, store } = harness();
		start({ pair: A });
		publisher.requestBuilt(() =>
			reading({
				messageEstimates: [100, 200, 200, 200, 200],
				latestUser: { index: 4, timestamp: 1, tailText: "first" },
			}),
		);
		publisher.responseReceived(response({ cacheRead: 600, cacheWrite: 200, input: 100 }), contextReading);

		store.addBatch([large]);
		const retried = () =>
			reading({
				messageEstimates: [100, 200, 200, 200, 200, 3000],
				toolResults: [{ index: 2, firstText: large.stub }],
				latestUser: { index: 5, timestamp: 2, tailText: "block" },
			});
		publisher.reportRecalled(() => ({ estimate: 3000 }));
		publisher.requestBuilt(retried);
		publisher.responseReceived(
			response({ cacheRead: 2600, cacheWrite: 1000, input: 300 }, { stopReason }),
			contextReading,
		);
		expect(Object.keys(last()).sort()).toEqual(UNPRICED_KEYS);

		publisher.reportRecalled(() => ({ estimate: 3000 }));
		publisher.requestBuilt(retried);
		publisher.responseReceived(response({ cacheRead: 2600, cacheWrite: 1000, input: 300 }), contextReading);

		expect(last().savedDollarsRequest).toBeCloseTo(-0.05916, 5);
	},
);

test.each(["compacted", "treeJumped"] as const)("a %s between two requests clears the rewrite baseline", (reset) => {
	const { publisher, last, start, store } = harness({ items: [ONE] });
	start({ pair: A });
	publisher.requestBuilt(() =>
		reading({
			messageEstimates: [100, 100, 100, 100],
			toolResults: [{ index: 2, firstText: ONE.stub }],
			latestUser: { index: 3, timestamp: 1, tailText: "first" },
		}),
	);
	publisher.responseReceived(response({ cacheRead: 200, cacheWrite: 100, input: 100 }), contextReading);

	store.addBatch([TWO]);
	reset === "compacted"
		? publisher.compacted(contextReading)
		: publisher.treeJumped(() => ({ ...contextReading(), seeds: [] }));
	publisher.requestBuilt(() =>
		reading({
			messageEstimates: [100, 100, 100, 100, 100, 100],
			toolResults: [
				{ index: 2, firstText: ONE.stub },
				{ index: 3, firstText: TWO.stub },
			],
			latestUser: { index: 5, timestamp: 2, tailText: "next" },
		}),
	);
	publisher.responseReceived(response({ cacheRead: 300, cacheWrite: 100 }), contextReading);

	expect(last().savedDollarsRequest).toBeCloseTo((2 / 3) * 192 * READ, 9);
});

test.each(["compacted", "treeJumped"] as const)(
	"a %s after a request consumes it, so its response is unpriced",
	(reset) => {
		const { publisher, last, start } = harness({ items: [ONE] });
		start({ pair: A });
		publisher.requestBuilt(() => reading({ toolResults: [{ index: 1, firstText: ONE.stub }] }));

		reset === "compacted"
			? publisher.compacted(contextReading)
			: publisher.treeJumped(() => ({ ...contextReading(), seeds: [] }));
		publisher.responseReceived(response({ cacheRead: 30, cacheWrite: 40 }), contextReading);

		expect(Object.keys(last()).sort()).toEqual(UNPRICED_KEYS);
	},
);

test("started posts the indicator and the item count, and finished posts the flag alone", () => {
	const { publisher, last, start } = harness();
	start();

	publisher.started(2);
	expect(last()).toEqual({ deciding: true, decidingItems: 2 });

	publisher.finished({ costTotal: 0.001 });
	expect(last()).toEqual({ deciding: false });
});

test("started with nothing to ask about still posts a zero count", () => {
	const { publisher, last, start } = harness();
	start();

	publisher.started(0);

	expect(last()).toEqual({ deciding: true, decidingItems: 0 });
});

test("two calls before one valid response add up and are subtracted once", () => {
	const { publisher, last, start } = harness({ items: [ONE] });
	start({ pair: A });
	publisher.started(1);
	publisher.finished({ costTotal: 0.001 });
	publisher.started(1);
	publisher.finished({ costTotal: 0.001 });
	publisher.requestBuilt(() => reading({ messageEstimates: [400], toolResults: [{ index: 1, firstText: ONE.stub }] }));

	publisher.responseReceived(response({ cacheRead: 400 }), contextReading);

	expect(last().savedDollarsRequest).toBeCloseTo(96 * READ - 0.002, 9);

	publisher.requestBuilt(() => reading({ messageEstimates: [400], toolResults: [{ index: 1, firstText: ONE.stub }] }));
	publisher.responseReceived(response({ cacheRead: 400 }), contextReading);

	expect(last().savedDollarsRequest).toBeCloseTo(96 * READ, 9);
});

test("an invalid response carries the spend to the next valid one", () => {
	const { publisher, last, start } = harness({ items: [ONE] });
	start({ pair: A });
	publisher.started(1);
	publisher.finished({ costTotal: 0.001 });
	publisher.requestBuilt(() => reading({ toolResults: [{ index: 1, firstText: ONE.stub }] }));
	publisher.responseReceived(response({ cacheRead: 30 }, { stopReason: "aborted" }), contextReading);

	publisher.requestBuilt(() => reading({ messageEstimates: [400], toolResults: [{ index: 1, firstText: ONE.stub }] }));
	publisher.responseReceived(response({ cacheRead: 400 }), contextReading);

	expect(last().savedDollarsRequest).toBeCloseTo(96 * READ - 0.001, 9);
});

test("an absent, non-finite or negative cost counts as no spend", () => {
	const { publisher, last, start } = harness({ items: [ONE] });
	start({ pair: A });
	publisher.finished(undefined);
	publisher.finished({ costTotal: Number.NaN });
	publisher.finished({ costTotal: -1 });
	publisher.finished({ costTotal: 0 });
	publisher.requestBuilt(() => reading({ messageEstimates: [400], toolResults: [{ index: 1, firstText: ONE.stub }] }));

	publisher.responseReceived(response({ cacheRead: 400 }), contextReading);

	expect(last().savedDollarsRequest).toBeCloseTo(96 * READ, 9);
});

test.each(["compacted", "treeJumped"] as const)("a %s keeps the uncharged spend", (reset) => {
	const { publisher, last, start } = harness({ items: [ONE] });
	start({ pair: A });
	publisher.started(1);
	publisher.finished({ costTotal: 0.001 });

	reset === "compacted"
		? publisher.compacted(contextReading)
		: publisher.treeJumped(() => ({ ...contextReading(), seeds: [] }));
	publisher.requestBuilt(() => reading({ messageEstimates: [400], toolResults: [{ index: 1, firstText: ONE.stub }] }));
	publisher.responseReceived(response({ cacheRead: 400 }), contextReading);

	expect(last().savedDollarsRequest).toBeCloseTo(96 * READ - 0.001, 9);
});

test("a settlement posts the six context and archive fields alone", () => {
	const { publisher, last, start } = harness({ items: [ONE] });
	start({ pair: A });

	publisher.settled(() => ({ pair: A, projectionEstimate: 700, contextWindow: 200_000 }));

	expect(Object.keys(last()).sort()).toEqual(CONTEXT_KEYS);
	expect(last()).toEqual({
		archiveItems: 1,
		archiveStubbed: 4,
		archiveWithheld: 100,
		contextWindow: 200_000,
		totalContext: 700,
		uncalibrated: true,
	});
});

test("compacted and a tree jump post the six context fields and the request figures of a history with no request yet", () => {
	const { publisher, recorded, start } = harness({ items: [ONE] });
	start({ pair: A });

	publisher.compacted(() => ({ pair: A, projectionEstimate: 700, contextWindow: 200_000 }));
	publisher.treeJumped(() => ({ pair: A, projectionEstimate: 300, contextWindow: 200_000, seeds: [] }));

	const [compacted, jumped] = recorded.posts.slice(-2);
	expect(Object.keys(compacted).sort()).toEqual(NEW_HISTORY_KEYS);
	expect(compacted).toEqual({
		archiveItems: 1,
		archiveStubbed: 4,
		archiveWithheld: 100,
		contextInTurn: 700,
		contextWindow: 200_000,
		historyBefore: 700,
		recalled: 0,
		stubbed: 0,
		totalContext: 700,
		uncalibrated: true,
		withheld: 0,
	});
	expect(Object.keys(jumped).sort()).toEqual(NEW_HISTORY_KEYS);
	expect(jumped).toMatchObject({ contextInTurn: 300, historyBefore: 300, totalContext: 300, withheld: 0 });
});

test("a compaction that starts an empty history still posts its request figures", () => {
	const { publisher, last, start } = harness();
	start({ pair: A });

	publisher.compacted(() => ({ pair: A, projectionEstimate: 0, contextWindow: 0 }));

	expect(Object.keys(last()).sort()).toEqual(NEW_HISTORY_KEYS);
	expect(last()).toEqual({
		archiveItems: 0,
		archiveStubbed: 0,
		archiveWithheld: 0,
		contextInTurn: 0,
		contextWindow: 0,
		historyBefore: 0,
		recalled: 0,
		stubbed: 0,
		totalContext: 0,
		uncalibrated: true,
		withheld: 0,
	});
});

test("a tree jump whose reading carries no pair posts the history at k 1", () => {
	const { publisher, last, start } = harness();
	start({ pair: A, seeds: [{ pair: A, k: 1.5 }] });

	publisher.treeJumped(() => ({ pair: undefined, projectionEstimate: 200, contextWindow: 1000, seeds: [] }));

	expect(last()).toMatchObject({ contextInTurn: 200, historyBefore: 200, totalContext: 200, uncalibrated: true });
});

test("a settled reading's pair takes its live k, and a seeded pair's k with the flag on", () => {
	const { publisher, last, start } = harness();
	start({ pair: A, seeds: [{ pair: A, k: 1.7 }] });
	publisher.requestBuilt(() => reading({ messageEstimates: [100] }));
	publisher.responseReceived(response({ cacheRead: 32, cacheWrite: 30 }), contextReading);

	publisher.settled(() => ({ pair: A, projectionEstimate: 1000, contextWindow: 2000 }));
	expect(last()).toMatchObject({ totalContext: 620, uncalibrated: false });

	// A pair with no entry borrows the most recently measured pair's k, and stays uncalibrated (4.4).
	publisher.settled(() => ({ pair: B, projectionEstimate: 1000, contextWindow: 2000 }));
	expect(last()).toMatchObject({ totalContext: 620, uncalibrated: true });
});

test("a switch to a model with no ratio borrows the last measured model's k until its own first valid reply", () => {
	const { publisher, last, start } = harness();
	start({ pair: A });
	publisher.requestBuilt(() => reading({ pair: A, messageEstimates: [100_000] }));
	publisher.responseReceived(response({ input: 167_700 }), () => ({
		pair: A,
		projectionEstimate: 0,
		contextWindow: 200_000,
		applied: null,
	}));
	expect(last().uncalibrated).toBe(false);

	publisher.requestBuilt(() => reading({ pair: FABLE, messageEstimates: [528_004] }));
	expect(last()).toMatchObject({ contextInTurn: Math.round(1.677 * 528_004), uncalibrated: true });

	publisher.responseReceived(response({ input: 875_338 }, { pair: FABLE }), () => ({
		pair: FABLE,
		projectionEstimate: 0,
		contextWindow: 200_000,
		applied: null,
	}));

	expect(last()).toMatchObject({ contextInTurn: 875_338, uncalibrated: false });
});

test("a compaction keeps the table, and a tree jump keeps every live entry and reseeds the rest", () => {
	const { publisher, last, start } = harness();
	start({
		pair: A,
		seeds: [
			{ pair: A, k: 1.7 },
			{ pair: B, k: 0.9 },
		],
	});
	publisher.requestBuilt(() => reading({ messageEstimates: [100] }));
	publisher.responseReceived(response({ cacheRead: 32, cacheWrite: 30 }), contextReading);

	publisher.compacted(() => ({ pair: B, projectionEstimate: 1000, contextWindow: 2000 }));
	expect(last()).toMatchObject({ totalContext: 900, uncalibrated: true });

	publisher.treeJumped(() => ({
		pair: B,
		projectionEstimate: 1000,
		contextWindow: 2000,
		seeds: [
			{ pair: B, k: 0.95 },
			{ pair: A, k: 3 },
		],
	}));
	expect(last()).toMatchObject({ totalContext: 950, uncalibrated: true });

	publisher.settled(() => ({ pair: A, projectionEstimate: 1000, contextWindow: 2000 }));
	expect(last()).toMatchObject({ totalContext: 620, uncalibrated: false });
});

test("a tree jump to a branch with no pair posts k 1 with the flag on", () => {
	const { publisher, last, start } = harness();
	start({ pair: A, seeds: [{ pair: A, k: 1.7 }] });

	publisher.treeJumped(() => ({ pair: undefined, projectionEstimate: 1000, contextWindow: 2000, seeds: [] }));

	expect(last()).toMatchObject({ totalContext: 1000, uncalibrated: true });
});

test("an errored response re-posts total context at its reading pair's k", () => {
	const { publisher, last, start } = harness();
	start({ pair: A });
	publisher.requestBuilt(() => reading());
	publisher.responseReceived(response({ cacheRead: 32, cacheWrite: 30 }), contextReading);
	publisher.requestBuilt(() => reading());

	publisher.responseReceived(response({ cacheRead: 32 }, { stopReason: "error" }), () => ({
		pair: A,
		projectionEstimate: 1000,
		contextWindow: 2000,
		applied: null,
	}));

	expect(last()).toMatchObject({ totalContext: 620, uncalibrated: false });
});

test("a request priced under one pair and answered by another posts each update under its own pair", () => {
	const { publisher, last, start } = harness();
	start({ pair: A });
	publisher.requestBuilt(() => reading({ messageEstimates: [1000] }));
	publisher.responseReceived(response({ cacheRead: 620 }), contextReading);

	publisher.requestBuilt(() => reading({ messageEstimates: [100_000] }));
	publisher.responseReceived(response({ cacheRead: 95_000 }, { pair: B }), contextReading);
	expect(last()).toMatchObject({ contextInTurn: 95_000, uncalibrated: false });

	publisher.settled(() => ({ pair: A, projectionEstimate: 10_000, contextWindow: 2000 }));
	expect(last()).toMatchObject({ totalContext: 6200, uncalibrated: false });

	publisher.settled(() => ({ pair: B, projectionEstimate: 10_000, contextWindow: 2000 }));
	expect(last()).toMatchObject({ totalContext: 9500, uncalibrated: false });
});

test("a throwing recall reading is stored unevaluated and throws at the next request", () => {
	const { publisher, last, start } = harness();
	start();

	expect(() =>
		publisher.reportRecalled(() => {
			throw new Error("recall could not be measured");
		}),
	).not.toThrow();
	expect(() => publisher.requestBuilt(() => reading())).toThrow("recall could not be measured");

	publisher.requestBuilt(() => reading());

	expect(last().recalled).toBe(0);
});

test("a request whose own reading throws still clears the stored recall reading", () => {
	const { publisher, last, start } = harness();
	start();
	publisher.reportRecalled(() => ({ estimate: 40 }));

	expect(() =>
		publisher.requestBuilt(() => {
			throw new Error("the host read failed");
		}),
	).toThrow("the host read failed");

	publisher.requestBuilt(() => reading());

	expect(last().recalled).toBe(0);
});

test("the rewrite starts after the carrier's own content when this request read through it", () => {
	const { publisher, last, start } = harness();
	start({ pair: A });
	publisher.reportRecalled(() => ({ estimate: 40 }));
	publisher.requestBuilt(() => reading({ latestUser: { index: 0, timestamp: 7, tailText: "block" } }));
	publisher.responseReceived(response({ cacheRead: 30, cacheWrite: 40 }), contextReading);

	publisher.reportRecalled(() => ({ estimate: 20 }));
	publisher.requestBuilt(() => reading({ latestUser: { index: 0, timestamp: 7, tailText: "sm" } }));
	// The coincident carry reports the same placement, so its figure is this one.
	publisher.responseReceived(
		response({ cacheRead: 30, cacheWrite: 40 }),
		placed({ carrierRead: "block", block: "cached" }),
	);

	expect(last().savedDollarsRequest).toBeCloseTo(-0.7 * 20 * WRITE, 9);
});

test("carrierRead naming a different block keeps today's start", () => {
	const { publisher, last, start } = harness();
	start({ pair: A });
	publisher.reportRecalled(() => ({ estimate: 40 }));
	publisher.requestBuilt(() => reading({ latestUser: { index: 0, timestamp: 7, tailText: "block" } }));
	publisher.responseReceived(response({ cacheRead: 30, cacheWrite: 40 }), contextReading);

	publisher.reportRecalled(() => ({ estimate: 20 }));
	publisher.requestBuilt(() => reading({ latestUser: { index: 0, timestamp: 7, tailText: "sm" } }));
	publisher.responseReceived(
		response({ cacheRead: 30, cacheWrite: 40 }),
		placed({ carrierRead: "a different block", block: "cached" }),
	);

	expect(last().savedDollarsRequest).toBeCloseTo(-0.7 * 20 * WRITE - 0.7 * 100 * (WRITE - READ), 9);
});

test("a request the edit did not reach keeps today's start", () => {
	const { publisher, last, start } = harness();
	start({ pair: A });
	publisher.reportRecalled(() => ({ estimate: 40 }));
	publisher.requestBuilt(() => reading({ latestUser: { index: 0, timestamp: 7, tailText: "block" } }));
	publisher.responseReceived(response({ cacheRead: 30, cacheWrite: 40 }), contextReading);

	publisher.reportRecalled(() => ({ estimate: 20 }));
	publisher.requestBuilt(() => reading({ latestUser: { index: 0, timestamp: 7, tailText: "sm" } }));
	publisher.responseReceived(response({ cacheRead: 30, cacheWrite: 40 }), placed(null));

	expect(last().savedDollarsRequest).toBeCloseTo(-0.7 * 20 * WRITE - 0.7 * 100 * (WRITE - READ), 9);
});

test("a block on the request that left it uncached is charged the input rate", () => {
	const { publisher, last, start } = harness();
	start({ pair: A });
	publisher.reportRecalled(() => ({ estimate: 2597 }));
	publisher.requestBuilt(() => reading({ latestUser: { index: 0, timestamp: 7, tailText: "block" } }));
	publisher.responseReceived(
		response({ input: 40, cacheWrite: 100 }),
		placed({ carrierRead: "previous", block: "uncached" }),
	);

	expect(last().savedDollarsRequest).toBeCloseTo(-1.4 * 2597 * 15e-6, 9);
});

test("a block that first appears on a message the last priced request carried is charged the write rate", () => {
	const { publisher, last, start } = harness();
	start({ pair: A });
	publisher.requestBuilt(() => reading({ latestUser: { index: 0, timestamp: 7, tailText: "why?" } }));
	publisher.responseReceived(response({ cacheRead: 30, cacheWrite: 40 }), contextReading);

	publisher.reportRecalled(() => ({ estimate: 40 }));
	publisher.requestBuilt(() => reading({ latestUser: { index: 0, timestamp: 7, tailText: "block" } }));
	publisher.responseReceived(
		response({ cacheRead: 30, cacheWrite: 40 }),
		placed({ carrierRead: null, block: "cached" }),
	);

	expect(last().savedDollarsRequest).toBeCloseTo(-0.7 * 40 * WRITE, 9);
});

test("a block the last priced request left uncached is a write, then a read", () => {
	const { publisher, last, start } = harness();
	const sameBlock = () => ({
		pair: A,
		messageEstimates: [100],
		toolResults: [],
		latestUser: { index: 0, timestamp: 7, tailText: "block" },
	});
	start({ pair: A });
	publisher.reportRecalled(() => ({ estimate: 40 }));
	publisher.requestBuilt(sameBlock);
	publisher.responseReceived(
		response({ cacheRead: 30, cacheWrite: 40 }),
		placed({ carrierRead: null, block: "uncached" }),
	);

	publisher.reportRecalled(() => ({ estimate: 40 }));
	publisher.requestBuilt(sameBlock);
	publisher.responseReceived(
		response({ cacheRead: 30, cacheWrite: 40 }),
		placed({ carrierRead: null, block: "cached" }),
	);
	expect(last().savedDollarsRequest).toBeCloseTo(-0.7 * 40 * WRITE, 9);

	publisher.reportRecalled(() => ({ estimate: 40 }));
	publisher.requestBuilt(sameBlock);
	publisher.responseReceived(
		response({ cacheRead: 30, cacheWrite: 40 }),
		placed({ carrierRead: "block", block: "cached" }),
	);
	expect(last().savedDollarsRequest).toBeCloseTo(-0.7 * 40 * READ, 9);
});
