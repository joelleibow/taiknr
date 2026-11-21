import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type ExtensionContext, ModelRegistry, ModelRuntime } from "@earendil-works/pi-coding-agent";
import { afterEach, expect, test, vi } from "vitest";
import { DEFAULT_TAIKNR_CONFIG, type TaiknrConfig } from "../../../src/config/taiknr-config.js";
import { type JevScoringChunk, packChunks, taskText } from "../../../src/infra/adapters/jev-scoring-request.js";
import { createPiJevScorerAdapter } from "../../../src/infra/adapters/pi-jev-scorer-adapter.js";
import type { ScoringItem, ScoringRequest } from "../../../src/use-cases/ports.js";
import {
	installClassifierGuard,
	TEST_CLASSIFIER_MODEL,
	TEST_CLASSIFIER_PROVIDER,
	TEST_CLASSIFIER_PROVIDER_CONFIG,
} from "../../support/classifier-guard.js";

const CONFIG: TaiknrConfig = {
	...DEFAULT_TAIKNR_CONFIG,
	defaultDecisionModelProvider: "test-provider",
	defaultDecisionModel: "test-model",
};

const MODEL = { api: "typesafe-system-one", provider: "test-provider", apiKey: "k", baseUrl: "http://localhost:9" };

const ITEMS: ScoringItem[] = [
	{ id: "a1b2c3d4", stub: "stub one", excerpt: "excerpt one" },
	{ id: "bb2c2222", stub: "stub two", excerpt: "excerpt two" },
];

const REQUEST: ScoringRequest = { promptText: "why did the task fail?", items: ITEMS };

/** What a stubbed `classify` resolves; the fields the adapter reads. */
interface Classification {
	stopReason: string;
	errorMessage?: string;
	answers: Record<string, unknown>;
	usage?: { cost: { total: number } };
}

type CallOptions = { signal?: AbortSignal; timeoutMs?: number; maxRetries?: number };

/** A classifier observer that records its calls in the order they arrive. */
function observer() {
	const calls: string[] = [];
	return {
		calls,
		observer: {
			started(itemCount: number) {
				calls.push(`started ${itemCount}`);
			},
			finished(spend: { costTotal: number } | undefined) {
				calls.push(`finished ${spend?.costTotal}`);
			},
		},
	};
}

/** The one reason each rejection carries, factored so a case can fill in an id. */
const NO_MODEL = "the classifier model is not in pi's model catalog";
const NO_MESSAGE = "the classifier call failed with no error message";
const DEADLINE = "the scoring's deadline passed before every chunk was sent";
const noAnswer = (id: string) => `the classifier returned no answer for ${id}`;
const notBool = (id: string) => `the classifier's answer for ${id} is not a bool`;
const notProbability = (id: string) => `the classifier's probability for ${id} is not a number from 0 to 1`;

/** The notice the adapter builds, exactly as decision 7 templates it. */
function notice(reason: string, field: string, config: TaiknrConfig = CONFIG): string {
	return `taiknr: recall did not score this prompt — ${reason}. provider=${config.defaultDecisionModelProvider} model=${config.defaultDecisionModel} field=${field}. Fix that field in pi-taiknr.json, then run /reload.`;
}

/** A context whose model registry records its one lookup and its calls, answering as the case says. */
function scorerContext(options: {
	classify: (chunk: JevScoringChunk, callOptions: CallOptions) => Promise<Classification>;
	/** A catalog miss when set to `undefined`; omitted leaves the configured model resolvable. */
	model?: unknown;
	signal?: AbortSignal;
}) {
	const lookups: string[] = [];
	const calls: { chunk: JevScoringChunk; options: CallOptions }[] = [];
	const modelRegistry = {
		findOfType: (type: string, provider: string, modelId: string) => {
			lookups.push(`${type}|${provider}|${modelId}`);
			return "model" in options ? options.model : MODEL;
		},
		classify: async (_model: unknown, chunk: JevScoringChunk, callOptions: CallOptions) => {
			calls.push({ chunk, options: callOptions });
			return options.classify(chunk, callOptions);
		},
	};
	return { ctx: { signal: options.signal, modelRegistry } as unknown as ExtensionContext, lookups, calls };
}

/** The message a rejected scoring carries. */
async function rejectionOf(promise: Promise<unknown>): Promise<string> {
	try {
		await promise;
	} catch (error) {
		return (error as Error).message;
	}
	throw new Error("the scoring resolved instead of rejecting");
}

const answersFor = (ids: string[], probability: number): Record<string, unknown> =>
	Object.fromEntries(ids.map((id) => [id, { type: "bool", probability }]));

/** A scoring request over `count` items whose excerpts are long enough to make one chunk each. */
function chunkedRequest(count: number): ScoringRequest {
	const items = Array.from({ length: count }, (_unused, index) => ({
		id: `item${index.toString().padStart(4, "0")}`,
		stub: `stub ${index}`,
		excerpt: "x".repeat(15_000),
	}));
	return { promptText: "why did the task fail?", items };
}

/** A `classify` that resolves a stop for every id the chunk asks about. */
const answerEveryChunk = (chunk: JevScoringChunk): Promise<Classification> =>
	Promise.resolve({ stopReason: "stop", answers: answersFor(Object.keys(chunk.questions), 0.5) });

test("the task text and each item's stub and excerpt reach the wire, and nothing else", async () => {
	const { ctx, calls } = scorerContext({ classify: answerEveryChunk });

	await createPiJevScorerAdapter(ctx, CONFIG).score(REQUEST);

	const chunk = calls[0].chunk;
	expect(Object.keys(chunk)).toEqual(["state", "questions"]);
	expect(chunk.state.task).toBe(taskText("why did the task fail?", undefined));
	expect(chunk.state.task).toContain("why did the task fail?");
	expect(chunk.state.toolCalls).toEqual({
		a1b2c3d4: { call: "stub one", outputStart: "excerpt one" },
		bb2c2222: { call: "stub two", outputStart: "excerpt two" },
	});
	expect(Object.keys(chunk.questions)).toEqual(["a1b2c3d4", "bb2c2222"]);
});

test("a summary reaches the wire as the task text's summary", async () => {
	const { ctx, calls } = scorerContext({ classify: answerEveryChunk });

	await createPiJevScorerAdapter(ctx, CONFIG).score({ ...REQUEST, summary: "Goal: tune recall" });

	expect(calls[0].chunk.state.task).toBe(taskText("why did the task fail?", "Goal: tune recall"));
});

test("each question names its item's whole id", async () => {
	const { ctx, calls } = scorerContext({ classify: answerEveryChunk });

	await createPiJevScorerAdapter(ctx, CONFIG).score(REQUEST);

	expect(calls[0].chunk.questions.a1b2c3d4.instructions).toContain("a1b2c3d4");
	expect(calls[0].chunk.questions.a1b2c3d4.type).toBe("bool");
});

test("the configured pair is looked up once and no other model is asked", async () => {
	const { ctx, lookups } = scorerContext({ classify: answerEveryChunk });

	await createPiJevScorerAdapter(ctx, CONFIG).score(REQUEST);

	expect(lookups).toEqual(["classifier|test-provider|test-model"]);
});

test("each call carries the session's bound and no retries", async () => {
	const { ctx, calls } = scorerContext({ classify: answerEveryChunk });

	await createPiJevScorerAdapter(ctx, { ...CONFIG, classifierTimeoutMs: 5000 }).score(REQUEST);

	expect(calls[0].options.timeoutMs).toBe(5000);
	expect(calls[0].options.maxRetries).toBe(0);
	expect(calls[0].options.signal).toBeInstanceOf(AbortSignal);
});

test("a call's signal aborts when the event's signal aborts", async () => {
	const controller = new AbortController();
	const { ctx, calls } = scorerContext({
		classify: async (_chunk, options) => {
			await new Promise((resolve) => setTimeout(resolve, 1));
			return { stopReason: options.signal?.aborted === true ? "aborted" : "stop", answers: {} };
		},
		signal: controller.signal,
	});

	const scoring = createPiJevScorerAdapter(ctx, CONFIG).score(REQUEST);
	controller.abort();
	await scoring;

	expect(calls[0].options.signal?.aborted).toBe(true);
});

test("one score per asked id, in the items' order", async () => {
	const { ctx } = scorerContext({
		classify: async (chunk) =>
			Promise.resolve({
				stopReason: "stop",
				answers: {
					...answersFor(Object.keys(chunk.questions), 0.2),
					bb2c2222: { type: "bool", probability: 0.9 },
				},
			}),
	});

	expect(await createPiJevScorerAdapter(ctx, CONFIG).score(REQUEST)).toEqual([
		{ id: "a1b2c3d4", probability: 0.2 },
		{ id: "bb2c2222", probability: 0.9 },
	]);
});

test("a request that needs several chunks merges by id and observes once with the summed cost", async () => {
	const request = chunkedRequest(4);
	expect(packChunks(taskText(request.promptText, undefined), request.items).chunks).toHaveLength(4);
	const { ctx, calls } = scorerContext({
		classify: async (chunk) =>
			Promise.resolve({
				stopReason: "stop",
				answers: answersFor(Object.keys(chunk.questions), 0.5),
				usage: { cost: { total: 0.001 } },
			}),
	});
	const recorded = observer();

	const scores = await createPiJevScorerAdapter(ctx, CONFIG, recorded.observer).score(request);

	expect(calls).toHaveLength(4);
	expect(scores?.map(({ id }) => id)).toEqual(request.items.map(({ id }) => id));
	expect(recorded.calls).toEqual(["started 4", "finished 0.004"]);
});

test("every asked id appears once after the merge", async () => {
	const request = chunkedRequest(3);
	const { ctx } = scorerContext({ classify: answerEveryChunk });

	const scores = await createPiJevScorerAdapter(ctx, CONFIG).score(request);

	expect(scores).toHaveLength(3);
	expect(new Set(scores?.map(({ id }) => id)).size).toBe(3);
});

test("one chunk's error aborts its hanging siblings, shows that notice and observes once", async () => {
	const request = chunkedRequest(3);
	const { ctx, calls } = scorerContext({
		classify: async (_chunk, options) => {
			if (calls.length === 1) return { stopReason: "error", errorMessage: "boom", answers: {} };
			// A sibling that hangs until the adapter's abort reaches it.
			return new Promise<Classification>((resolve) => {
				options.signal?.addEventListener("abort", () => resolve({ stopReason: "aborted", answers: {} }), {
					once: true,
				});
			});
		},
	});
	const recorded = observer();

	const message = await rejectionOf(createPiJevScorerAdapter(ctx, CONFIG, recorded.observer).score(request));

	expect(message).toBe(notice("boom", "defaultDecisionModelProvider"));
	expect(calls).toHaveLength(3);
	expect(recorded.calls).toEqual(["started 3", "finished undefined"]);
});

test("a caller cancel returns nothing, no notice and no partial merge", async () => {
	const controller = new AbortController();
	const request = chunkedRequest(2);
	const { ctx } = scorerContext({
		classify: async (_chunk, options) =>
			new Promise<Classification>((resolve) => {
				options.signal?.addEventListener("abort", () => resolve({ stopReason: "aborted", answers: {} }), {
					once: true,
				});
			}),
		signal: controller.signal,
	});
	const recorded = observer();

	const scoring = createPiJevScorerAdapter(ctx, CONFIG, recorded.observer).score(request);
	controller.abort();

	expect(await scoring).toBeUndefined();
	expect(recorded.calls).toEqual(["started 2", "finished undefined"]);
});

test("a chunk not started at the deadline is never sent and shows the deadline's notice", async () => {
	const request = chunkedRequest(9);
	const { ctx, calls } = scorerContext({
		classify: async (chunk) => {
			await new Promise((resolve) => setTimeout(resolve, 30));
			return { stopReason: "stop", answers: answersFor(Object.keys(chunk.questions), 0.5) };
		},
	});

	const message = await rejectionOf(
		createPiJevScorerAdapter(ctx, { ...CONFIG, classifierTimeoutMs: 20 }).score(request),
	);

	expect(message).toBe(notice(DEADLINE, "classifierTimeoutMs", { ...CONFIG, classifierTimeoutMs: 20 }));
	expect(calls).toHaveLength(8);
});

test("an unchunkable request makes one call carrying every item", async () => {
	const items: ScoringItem[] = [
		{ id: "a1b2c3d4", stub: "small", excerpt: "x".repeat(100) },
		{ id: "bb2c2222", stub: "huge", excerpt: "x".repeat(30_000) },
	];
	const request: ScoringRequest = { promptText: "why did the task fail?", items };
	expect(packChunks(taskText(request.promptText, undefined), items).unchunked).toBe(true);
	const { ctx, calls } = scorerContext({ classify: answerEveryChunk });

	const scores = await createPiJevScorerAdapter(ctx, CONFIG).score(request);

	expect(calls).toHaveLength(1);
	expect(Object.keys(calls[0].chunk.questions)).toEqual(["a1b2c3d4", "bb2c2222"]);
	expect(scores).toHaveLength(2);
});

test.each([
	["an aborted result", { stopReason: "aborted", answers: {} }],
	["an abort racing a chunk error", { stopReason: "error", errorMessage: "boom", answers: {} }],
])("a cancelled run returns nothing rather than rejecting, on %s", async (_case, classification) => {
	const controller = new AbortController();
	const { ctx } = scorerContext({ classify: async () => classification, signal: controller.signal });
	controller.abort();

	expect(await createPiJevScorerAdapter(ctx, CONFIG).score(REQUEST)).toBeUndefined();
});

test("a model that does not resolve rejects naming both fields and makes no call", async () => {
	const { ctx, calls } = scorerContext({ model: undefined, classify: answerEveryChunk });

	const message = await rejectionOf(createPiJevScorerAdapter(ctx, CONFIG).score(REQUEST));

	expect(message).toBe(notice(NO_MODEL, "defaultDecisionModelProvider/defaultDecisionModel"));
	expect(calls).toEqual([]);
});

test("an answer set that misses an id rejects naming that id", async () => {
	const { ctx } = scorerContext({
		classify: async () => ({ stopReason: "stop", answers: { a1b2c3d4: { type: "bool", probability: 0.2 } } }),
	});

	const message = await rejectionOf(createPiJevScorerAdapter(ctx, CONFIG).score(REQUEST));

	expect(message).toBe(notice(noAnswer("bb2c2222"), "defaultDecisionModel"));
});

test("an answer of the wrong type rejects naming its id", async () => {
	const { ctx } = scorerContext({
		classify: async () => ({
			stopReason: "stop",
			answers: { a1b2c3d4: { type: "noul", probability: 0.2 }, bb2c2222: { type: "bool", probability: 0.2 } },
		}),
	});

	const message = await rejectionOf(createPiJevScorerAdapter(ctx, CONFIG).score(REQUEST));

	expect(message).toBe(notice(notBool("a1b2c3d4"), "defaultDecisionModel"));
});

test.each([Number.NaN, Number.POSITIVE_INFINITY, -0.1, 1.1])(
	"a probability of %s rejects naming its id",
	async (probability) => {
		const { ctx } = scorerContext({
			classify: async () => ({
				stopReason: "stop",
				answers: { a1b2c3d4: { type: "bool", probability }, bb2c2222: { type: "bool", probability: 0.2 } },
			}),
		});

		const message = await rejectionOf(createPiJevScorerAdapter(ctx, CONFIG).score(REQUEST));

		expect(message).toBe(notice(notProbability("a1b2c3d4"), "defaultDecisionModel"));
	},
);

test("an error that reached the deadline names the timeout field, with pi's own text", async () => {
	const config = { ...CONFIG, classifierTimeoutMs: 20 };
	const { ctx } = scorerContext({
		classify: async () => {
			await new Promise((resolve) => setTimeout(resolve, 25));
			return { stopReason: "error", errorMessage: "Request timed out after 20ms", answers: {} };
		},
	});

	const message = await rejectionOf(createPiJevScorerAdapter(ctx, config).score(REQUEST));

	expect(message).toBe(notice("Request timed out after 20ms", "classifierTimeoutMs", config));
});

test("any other error names the provider field, with pi's own text", async () => {
	const { ctx } = scorerContext({
		classify: async () => ({
			stopReason: "error",
			errorMessage: "Provider is not configured: test-provider",
			answers: {},
		}),
	});

	const message = await rejectionOf(createPiJevScorerAdapter(ctx, CONFIG).score(REQUEST));

	expect(message).toBe(notice("Provider is not configured: test-provider", "defaultDecisionModelProvider"));
});

test("an error carrying no message uses the adapter's own reason", async () => {
	const { ctx } = scorerContext({
		classify: async () => ({ stopReason: "error", errorMessage: "", answers: {} }),
	});

	const message = await rejectionOf(createPiJevScorerAdapter(ctx, CONFIG).score(REQUEST));

	expect(message).toBe(notice(NO_MESSAGE, "defaultDecisionModelProvider"));
});

test("the observation starts with the request's count and ends with the summed cost", async () => {
	const request = chunkedRequest(2);
	const { ctx } = scorerContext({
		classify: async (chunk) => ({
			stopReason: "stop",
			answers: answersFor(Object.keys(chunk.questions), 0.5),
			usage: { cost: { total: 0.0015 } },
		}),
	});
	const recorded = observer();

	await createPiJevScorerAdapter(ctx, CONFIG, recorded.observer).score(request);

	expect(recorded.calls).toEqual(["started 2", "finished 0.003"]);
});

test.each([
	["an error", { stopReason: "error", errorMessage: "boom", answers: {} }],
	["an abort", { stopReason: "aborted", answers: {} }],
	["a malformed answer", { stopReason: "stop", answers: { a1b2c3d4: { type: "noul" } } }],
])("the observation ends on every exit, on %s", async (_case, classification) => {
	const { ctx } = scorerContext({ classify: async () => classification });
	const recorded = observer();

	await createPiJevScorerAdapter(ctx, CONFIG, recorded.observer)
		.score(REQUEST)
		.catch(() => undefined);

	expect(recorded.calls).toEqual(["started 2", "finished undefined"]);
});

test("a catalog miss observes nothing and makes no call", async () => {
	const { ctx } = scorerContext({ model: undefined, classify: answerEveryChunk });
	const recorded = observer();

	await rejectionOf(createPiJevScorerAdapter(ctx, CONFIG, recorded.observer).score(REQUEST));

	expect(recorded.calls).toEqual([]);
});

test("a request with no items makes no call and observes nothing", async () => {
	const { ctx, calls } = scorerContext({ classify: answerEveryChunk });
	const recorded = observer();

	expect(await createPiJevScorerAdapter(ctx, CONFIG, recorded.observer).score({ ...REQUEST, items: [] })).toEqual([]);
	expect(calls).toEqual([]);
	expect(recorded.calls).toEqual([]);
});

test("a 36-character id is asked about and scored whole", async () => {
	const id = "0f8fad5b-d9cb-469f-a165-70867728950e";
	const { ctx, calls } = scorerContext({ classify: answerEveryChunk });

	expect(
		await createPiJevScorerAdapter(ctx, CONFIG).score({ ...REQUEST, items: [{ id, stub: "s", excerpt: "e" }] }),
	).toEqual([{ id, probability: 0.5 }]);
	expect(Object.keys(calls[0].chunk.questions)).toEqual([id]);
});

const directories: string[] = [];

/** A registry over pi's real catalog and the test provider, with a throwaway auth directory. */
async function testRegistry(withProvider = true): Promise<ModelRegistry> {
	const directory = mkdtempSync(join(tmpdir(), "taiknr-scorer-"));
	directories.push(directory);
	const runtime = await ModelRuntime.create({
		authPath: join(directory, "auth.json"),
		modelsPath: null,
		allowModelNetwork: false,
	});
	const registry = new ModelRegistry(runtime);
	if (withProvider) registry.registerProvider(TEST_CLASSIFIER_PROVIDER, TEST_CLASSIFIER_PROVIDER_CONFIG);
	return registry;
}

afterEach(() => {
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
	vi.useRealTimers();
	for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

test("the test provider's pair resolves and its questions reach the wire", async () => {
	const guard = installClassifierGuard();
	const ctx = { modelRegistry: await testRegistry() } as unknown as ExtensionContext;
	const config = {
		...DEFAULT_TAIKNR_CONFIG,
		defaultDecisionModelProvider: TEST_CLASSIFIER_PROVIDER,
		defaultDecisionModel: TEST_CLASSIFIER_MODEL,
	};

	const scores = await createPiJevScorerAdapter(ctx, config).score({ ...REQUEST, items: [ITEMS[0]] });

	expect(scores).toEqual([{ id: "a1b2c3d4", probability: 0 }]);
	expect(guard.requests[0].url).toBe("http://127.0.0.1:9/v1/systemone");
	expect(guard.requests[0].body.state.task).toContain("why did the task fail?");
	expect(guard.requests[0].body.state.toolCalls).toEqual({
		a1b2c3d4: { call: "stub one", outputStart: "excerpt one" },
	});
	expect(Object.values(guard.requests[0].body.questions).map(({ type }) => type)).toEqual(["noul"]);
});

test("a hanging call rejects at the configured bound, having made one request", async () => {
	const guard = installClassifierGuard("hang");
	const ctx = { modelRegistry: await testRegistry() } as unknown as ExtensionContext;
	const config = {
		...DEFAULT_TAIKNR_CONFIG,
		classifierTimeoutMs: 50,
		defaultDecisionModelProvider: TEST_CLASSIFIER_PROVIDER,
		defaultDecisionModel: TEST_CLASSIFIER_MODEL,
	};

	const message = await rejectionOf(createPiJevScorerAdapter(ctx, config).score({ ...REQUEST, items: [ITEMS[0]] }));

	expect(message).toContain("field=classifierTimeoutMs");
	expect(guard.requests).toHaveLength(1);
});

test("a caller abort under the default bound returns nothing", async () => {
	installClassifierGuard("hang");
	const controller = new AbortController();
	const ctx = { modelRegistry: await testRegistry(), signal: controller.signal } as unknown as ExtensionContext;
	const config = {
		...DEFAULT_TAIKNR_CONFIG,
		defaultDecisionModelProvider: TEST_CLASSIFIER_PROVIDER,
		defaultDecisionModel: TEST_CLASSIFIER_MODEL,
	};
	const scoring = createPiJevScorerAdapter(ctx, config).score({ ...REQUEST, items: [ITEMS[0]] });
	controller.abort();

	expect(await scoring).toBeUndefined();
});

test("the guard's per-call script lets one chunk of several fail through the real transport", async () => {
	const guard = installClassifierGuard();
	guard.answerEach([(ids) => Object.fromEntries(ids.map((id) => [id, 0.5])), "error"]);
	const ctx = { modelRegistry: await testRegistry() } as unknown as ExtensionContext;
	const config = {
		...DEFAULT_TAIKNR_CONFIG,
		defaultDecisionModelProvider: TEST_CLASSIFIER_PROVIDER,
		defaultDecisionModel: TEST_CLASSIFIER_MODEL,
	};
	const request = { ...chunkedRequest(3), items: chunkedRequest(3).items };
	const recorded = observer();

	const message = await rejectionOf(createPiJevScorerAdapter(ctx, config, recorded.observer).score(request));

	expect(message).toContain("did not score this prompt");
	expect(guard.requests).toHaveLength(3);
	expect(recorded.calls).toEqual(["started 3", "finished undefined"]);
});

test("at most eight chunks are in flight, and the ninth starts only when one settles", async () => {
	const request = chunkedRequest(9);
	expect(packChunks(taskText(request.promptText, undefined), request.items).chunks).toHaveLength(9);
	const releases: (() => void)[] = [];
	const { ctx, calls } = scorerContext({
		classify: (chunk) =>
			new Promise<Classification>((resolve) => {
				releases.push(() => resolve({ stopReason: "stop", answers: answersFor(Object.keys(chunk.questions), 0.5) }));
			}),
	});

	const scoring = createPiJevScorerAdapter(ctx, CONFIG).score(request);
	await Promise.resolve();
	expect(calls).toHaveLength(8);

	releases[0]();
	await vi.waitFor(() => expect(calls).toHaveLength(9));
	for (const release of releases.splice(0)) release();
	await scoring;
});

test("the time remaining is what each later call carries", async () => {
	vi.useFakeTimers();
	const request = chunkedRequest(9);
	const { ctx, calls } = scorerContext({
		classify: async (chunk) => {
			await new Promise((resolve) => setTimeout(resolve, 2000));
			return { stopReason: "stop", answers: answersFor(Object.keys(chunk.questions), 0.5) };
		},
	});

	const scoring = createPiJevScorerAdapter(ctx, { ...CONFIG, classifierTimeoutMs: 5000 }).score(request);
	await vi.advanceTimersByTimeAsync(2000);
	await vi.advanceTimersByTimeAsync(2000);
	await scoring;

	expect(calls.slice(0, 8).map(({ options }) => options.timeoutMs)).toEqual([
		5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000,
	]);
	expect(calls[8].options.timeoutMs).toBe(3000);
});
