import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type ExtensionContext, ModelRegistry, ModelRuntime } from "@earendil-works/pi-coding-agent";
import { afterEach, expect, test, vi } from "vitest";
import { DEFAULT_TAIKNR_CONFIG, type TaiknrConfig } from "../../../src/config/taiknr-config.js";
import { createPiJevScorerAdapter } from "../../../src/infra/adapters/pi-jev-scorer-adapter.js";
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

const MODEL = { api: "typesafe-system-one", provider: "test-provider", id: "test-model" };

const STUBS = { a1b2c3d4: "stub one", bbbb2222: "stub two" };

/** What a stubbed `classify` resolves; the fields the adapter reads. */
interface Classification {
	stopReason: string;
	errorMessage?: string;
	answers: Record<string, unknown>;
	usage?: { cost: { total: number } };
}

/** A classifier observer that records both calls in the order they arrive. */
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

/** The one reason sentence each rejection carries, factored so a case can fill in the id. */
const NO_MODEL = "the classifier model is not in pi's model catalog";
const NO_MESSAGE = "the classifier call failed with no error message";
const noAnswer = (id: string) => `the classifier returned no answer for ${id}`;
const notBool = (id: string) => `the classifier's answer for ${id} is not a bool`;
const notProbability = (id: string) => `the classifier's probability for ${id} is not a number from 0 to 1`;

/** The notice the adapter builds, exactly as decision 7 templates it. */
function notice(reason: string, field: string, config: TaiknrConfig = CONFIG): string {
	return `taiknr: recall did not score this prompt — ${reason}. provider=${config.defaultDecisionModelProvider} model=${config.defaultDecisionModel} field=${field}. Fix that field in pi-taiknr.json, then run /reload or start a new session.`;
}

type CallOptions = { signal?: AbortSignal; timeoutMs?: number; maxRetries?: number };

/** A context whose model registry records its one lookup and its calls, and answers as the case says. */
function scorerContext(options: {
	classify: (context: unknown, callOptions: CallOptions) => Promise<Classification>;
	/** The model the catalog lookup returns; omitted means the configured one, so pass `null` for a miss. */
	model?: unknown;
	signal?: AbortSignal;
}) {
	const lookups: string[] = [];
	const calls: { context: unknown; options: CallOptions }[] = [];
	const modelRegistry = {
		findOfType: (type: string, provider: string, modelId: string) => {
			lookups.push(`${type}|${provider}|${modelId}`);
			return "model" in options ? (options.model ?? undefined) : MODEL;
		},
		classify: async (_model: unknown, context: unknown, callOptions: CallOptions) => {
			calls.push({ context, options: callOptions });
			return options.classify(context, callOptions);
		},
	};
	return { ctx: { signal: options.signal, modelRegistry } as unknown as ExtensionContext, lookups, calls };
}

/** The message a promise rejects with, or a failure saying it resolved. */
async function rejectionOf(promise: Promise<unknown>): Promise<string> {
	try {
		await promise;
	} catch (error) {
		return (error as Error).message;
	}
	throw new Error("expected the scoring call to reject");
}

const answersFor = (ids: string[], probability: number): Record<string, unknown> =>
	Object.fromEntries(ids.map((id) => [id, { type: "bool", probability }]));

test("one bool question per archived id, keyed by its whole id, with the prompt text and stubs in state", async () => {
	const { ctx, calls } = scorerContext({
		classify: async () => ({ stopReason: "stop", answers: answersFor(Object.keys(STUBS), 0.9) }),
	});

	await createPiJevScorerAdapter(ctx, CONFIG).score("why did the test run fail?", STUBS);

	expect(calls[0].context).toEqual({
		state: { userPrompt: "why did the test run fail?", archivedToolOutputs: STUBS },
		questions: {
			a1b2c3d4: {
				type: "bool",
				instructions:
					"The user's latest message is in `userPrompt`. `archivedToolOutputs[a1b2c3d4]` is a one-line stub of a tool output from earlier in the same session whose full text was removed from the conversation. Would returning that output's full text help answer the user's latest message?",
				criteria: {
					true: "The archived output's content is something the latest message asks for, refers to, or is answered by.",
					false: "The archived output does not bear on the latest message.",
				},
			},
			bbbb2222: {
				type: "bool",
				instructions:
					"The user's latest message is in `userPrompt`. `archivedToolOutputs[bbbb2222]` is a one-line stub of a tool output from earlier in the same session whose full text was removed from the conversation. Would returning that output's full text help answer the user's latest message?",
				criteria: {
					true: "The archived output's content is something the latest message asks for, refers to, or is answered by.",
					false: "The archived output does not bear on the latest message.",
				},
			},
		},
	});
});

test("the configured pair is looked up once and no other model is tried", async () => {
	const { ctx, lookups } = scorerContext({
		classify: async () => ({ stopReason: "stop", answers: answersFor(Object.keys(STUBS), 0.9) }),
	});

	await createPiJevScorerAdapter(ctx, CONFIG).score("p", STUBS);

	expect(lookups).toEqual(["classifier|test-provider|test-model"]);
});

test("the call carries the event's signal, the session's timeout and no retries", async () => {
	const signal = new AbortController().signal;
	const { ctx, calls } = scorerContext({
		classify: async () => ({ stopReason: "stop", answers: answersFor(Object.keys(STUBS), 0.9) }),
		signal,
	});

	await createPiJevScorerAdapter(ctx, { ...CONFIG, classifierTimeoutMs: 8000 }).score("p", STUBS);

	expect(calls[0].options).toEqual({ signal, timeoutMs: 8000, maxRetries: 0 });
});

test("a resolved answer set becomes one score per asked id, in the question map's order", async () => {
	const { ctx } = scorerContext({
		classify: async () => ({
			stopReason: "stop",
			answers: { bbbb2222: { type: "bool", probability: 0.2 }, a1b2c3d4: { type: "bool", probability: 0.9 } },
		}),
	});

	const scores = await createPiJevScorerAdapter(ctx, CONFIG).score("p", STUBS);

	expect(scores).toEqual([
		{ id: "a1b2c3d4", probability: 0.9 },
		{ id: "bbbb2222", probability: 0.2 },
	]);
});

test("a caller abort resolves nothing rather than rejecting", async () => {
	const { ctx } = scorerContext({ classify: async () => ({ stopReason: "aborted", answers: {} }) });

	expect(await createPiJevScorerAdapter(ctx, CONFIG).score("p", STUBS)).toBeUndefined();
});

test("a model that does not resolve rejects naming both model fields, and makes no call", async () => {
	const { ctx, calls } = scorerContext({
		model: null,
		classify: async () => ({ stopReason: "stop", answers: {} }),
	});

	const message = await rejectionOf(createPiJevScorerAdapter(ctx, CONFIG).score("p", STUBS));

	expect(message).toBe(notice(NO_MODEL, "defaultDecisionModelProvider/defaultDecisionModel"));
	expect(calls).toEqual([]);
});

test("an answer set missing an answer rejects naming the first missing id and the model field", async () => {
	const { ctx } = scorerContext({
		classify: async () => ({ stopReason: "stop", answers: { a1b2c3d4: { type: "bool", probability: 0.9 } } }),
	});

	const message = await rejectionOf(createPiJevScorerAdapter(ctx, CONFIG).score("p", STUBS));

	expect(message).toBe(notice(noAnswer("bbbb2222"), "defaultDecisionModel"));
});

test("an answer of the wrong type rejects naming its id and the model field", async () => {
	const { ctx } = scorerContext({
		classify: async () => ({
			stopReason: "stop",
			answers: { a1b2c3d4: { type: "noul", noul: 0.9 }, bbbb2222: { type: "bool", probability: 0.1 } },
		}),
	});

	const message = await rejectionOf(createPiJevScorerAdapter(ctx, CONFIG).score("p", STUBS));

	expect(message).toBe(notice(notBool("a1b2c3d4"), "defaultDecisionModel"));
});

test.each([Number.NaN, Number.POSITIVE_INFINITY, -0.1, 1.1])(
	"a probability of %s rejects naming its id and the model field",
	async (probability) => {
		const { ctx } = scorerContext({
			classify: async () => ({
				stopReason: "stop",
				answers: { a1b2c3d4: { type: "bool", probability }, bbbb2222: { type: "bool", probability: 0.1 } },
			}),
		});

		const message = await rejectionOf(createPiJevScorerAdapter(ctx, CONFIG).score("p", STUBS));

		expect(message).toBe(notice(notProbability("a1b2c3d4"), "defaultDecisionModel"));
	},
);

test("an error that took the configured timeout rejects naming that field, with pi's own text", async () => {
	const { ctx } = scorerContext({
		classify: async () => {
			await new Promise((resolve) => setTimeout(resolve, 20));
			return { stopReason: "error", errorMessage: "Request timed out after 20ms", answers: {} };
		},
	});

	const message = await rejectionOf(
		createPiJevScorerAdapter(ctx, { ...CONFIG, classifierTimeoutMs: 20 }).score("p", STUBS),
	);

	expect(message).toBe(
		notice("Request timed out after 20ms", "classifierTimeoutMs", { ...CONFIG, classifierTimeoutMs: 20 }),
	);
});

test("any other error rejects at once naming the provider field, with pi's own text", async () => {
	const { ctx } = scorerContext({
		classify: async () => ({
			stopReason: "error",
			errorMessage: "Provider is not configured: test-provider",
			answers: {},
		}),
	});

	const message = await rejectionOf(createPiJevScorerAdapter(ctx, CONFIG).score("p", STUBS));

	expect(message).toBe(notice("Provider is not configured: test-provider", "defaultDecisionModelProvider"));
});

test("an error carrying no message rejects with the adapter's own reason", async () => {
	const { ctx } = scorerContext({ classify: async () => ({ stopReason: "error", errorMessage: "", answers: {} }) });

	const message = await rejectionOf(createPiJevScorerAdapter(ctx, CONFIG).score("p", STUBS));

	expect(message).toBe(notice(NO_MESSAGE, "defaultDecisionModelProvider"));
});

test("a 36-character id is asked about and scored whole", async () => {
	const id = "01234567-89ab-cdef-0123-456789abcdef";
	const { ctx, calls } = scorerContext({
		classify: async () => ({ stopReason: "stop", answers: { [id]: { type: "bool", probability: 0.9 } } }),
	});

	const scores = await createPiJevScorerAdapter(ctx, CONFIG).score("p", { [id]: "stub" });

	expect(Object.keys((calls[0].context as { questions: Record<string, unknown> }).questions)).toEqual([id]);
	expect(scores).toEqual([{ id, probability: 0.9 }]);
});

test("the observer hears the call start and the cost it reported", async () => {
	const { ctx } = scorerContext({
		classify: async () => ({
			stopReason: "stop",
			answers: answersFor(Object.keys(STUBS), 0.9),
			usage: { cost: { total: 0.001 } },
		}),
	});
	const recorded = observer();

	await createPiJevScorerAdapter(ctx, CONFIG, recorded.observer).score("p", STUBS);

	expect(recorded.calls).toEqual(["started 2", "finished 0.001"]);
});

test.each([
	["an abort", { stopReason: "aborted", answers: {} }],
	["an error", { stopReason: "error", errorMessage: "boom", answers: {} }],
	["a timeout-shaped error", { stopReason: "error", errorMessage: "Request timed out after 5ms", answers: {} }],
	["a malformed answer", { stopReason: "stop", answers: { a1b2c3d4: { type: "noul", noul: 0.9 } } }],
])("after %s the observation still ends, with no cost to charge", async (_case, classification) => {
	const { ctx } = scorerContext({ classify: async () => classification });
	const recorded = observer();

	await createPiJevScorerAdapter(ctx, CONFIG, recorded.observer)
		.score("p", STUBS)
		.catch(() => undefined);

	expect(recorded.calls).toEqual(["started 2", "finished undefined"]);
});

test("a catalog miss observes nothing, because it throws before the call", async () => {
	const { ctx } = scorerContext({ model: null, classify: async () => ({ stopReason: "stop", answers: {} }) });
	const recorded = observer();

	await rejectionOf(createPiJevScorerAdapter(ctx, CONFIG, recorded.observer).score("p", STUBS));

	expect(recorded.calls).toEqual([]);
});

const directories: string[] = [];

/** A registry holding pi's own catalog plus the test classifier provider, over a throwaway auth file. */
async function testRegistry(withTestProvider = true): Promise<ModelRegistry> {
	const directory = mkdtempSync(join(tmpdir(), "taiknr-classifier-"));
	directories.push(directory);
	const runtime = await ModelRuntime.create({
		authPath: join(directory, "auth.json"),
		modelsPath: null,
		allowModelNetwork: false,
		refreshOnCreate: false,
	});
	const registry = new ModelRegistry(runtime);
	if (withTestProvider) registry.registerProvider(TEST_CLASSIFIER_PROVIDER, TEST_CLASSIFIER_PROVIDER_CONFIG);
	return registry;
}

afterEach(() => {
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
	for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

test("the test provider's configured pair is the one the adapter resolves", async () => {
	const guard = installClassifierGuard();
	const ctx = { modelRegistry: await testRegistry() } as unknown as ExtensionContext;
	const config = {
		...DEFAULT_TAIKNR_CONFIG,
		defaultDecisionModelProvider: TEST_CLASSIFIER_PROVIDER,
		defaultDecisionModel: TEST_CLASSIFIER_MODEL,
	};

	const scores = await createPiJevScorerAdapter(ctx, config).score("why did the test run fail?", { a1b2c3d4: "s" });

	expect(scores).toEqual([{ id: "a1b2c3d4", probability: 0 }]);
	expect(guard.requests[0].url).toBe(`http://127.0.0.1:9/v1/systemone`);
	expect(Object.values(guard.requests[0].body.questions).map(({ type }) => type)).toEqual(["noul"]);
});

test("a hanging call rejects at the configured timeout, having made one request", async () => {
	const guard = installClassifierGuard("hang");
	const ctx = { modelRegistry: await testRegistry() } as unknown as ExtensionContext;
	const config = { ...DEFAULT_TAIKNR_CONFIG, classifierTimeoutMs: 50 };

	const message = await rejectionOf(
		createPiJevScorerAdapter(ctx, {
			...config,
			defaultDecisionModelProvider: TEST_CLASSIFIER_PROVIDER,
			defaultDecisionModel: TEST_CLASSIFIER_MODEL,
		}).score("p", { a1b2c3d4: "s" }),
	);

	expect(message).toContain("Request timed out after 50ms");
	expect(message).toContain("field=classifierTimeoutMs");
	expect(guard.requests).toHaveLength(1);
});

test("a caller abort under the default timeout resolves nothing, not a rejection", async () => {
	installClassifierGuard("hang");
	const controller = new AbortController();
	const ctx = { modelRegistry: await testRegistry(), signal: controller.signal } as unknown as ExtensionContext;
	const config = {
		...DEFAULT_TAIKNR_CONFIG,
		defaultDecisionModelProvider: TEST_CLASSIFIER_PROVIDER,
		defaultDecisionModel: TEST_CLASSIFIER_MODEL,
	};
	setTimeout(() => controller.abort(), 10);

	expect(await createPiJevScorerAdapter(ctx, config).score("p", { a1b2c3d4: "s" })).toBeUndefined();
});

test("the guard records the wire request a call under the default openrouter config makes", async () => {
	const guard = installClassifierGuard();
	vi.stubEnv("OPENROUTER_API_KEY", "dummy-not-a-key");
	const ctx = { modelRegistry: await testRegistry(false) } as unknown as ExtensionContext;

	await createPiJevScorerAdapter(ctx, DEFAULT_TAIKNR_CONFIG).score("p", { a1b2c3d4: "s" });

	expect(guard.requests[0].url).toBe("https://openrouter.ai/api/v1/systemone");
	expect(Object.values(guard.requests[0].body.questions).map(({ type }) => type)).toEqual(["noul"]);
});
