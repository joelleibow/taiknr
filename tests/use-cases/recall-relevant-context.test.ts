import { expect, test } from "vitest";
import type { ArchivedToolOutput } from "../../src/domain/archived-output.js";
import { formatRecalledContext, type RelevanceScore } from "../../src/domain/recall.js";
import type { ArchiveStore, FailureNotifier, RelevanceScorer } from "../../src/use-cases/ports.js";
import {
	type RecallCache,
	type RecallRelevantContextInput,
	recallRelevantContext,
} from "../../src/use-cases/recall-relevant-context.js";

/** An archived item carrying just the fields the recall path reads. */
function item(id: string, rawText = `raw of ${id}`): ArchivedToolOutput {
	return { id, toolName: "bash", argsSummary: "", isError: false, stub: `[archived ${id}]`, rawText };
}

const A = item("a1b2c3d4");
const B = item("bbbb2222");
const C = item("cccc3333");

/** A store over `items`, in the order given, with the port's write members inert. */
function fakeStore(items: ArchivedToolOutput[]): ArchiveStore {
	const byId = new Map(items.map((archived) => [archived.id, archived]));
	return {
		size: () => byId.size,
		get: (id) => byId.get(id),
		getAll: () => [...byId.values()],
		addBatch: () => {},
		replaceAll: () => {},
		clear: () => {},
	};
}

type ScorerCalls = { promptText: string; archivedStubs: Record<string, string>; signal?: AbortSignal }[];

/** A scorer answering as the case says, recording every call it gets. */
function fakeScorer(result: RelevanceScore[] | undefined): { scorer: RelevanceScorer; calls: ScorerCalls } {
	const calls: ScorerCalls = [];
	return {
		calls,
		scorer: {
			async score(promptText, archivedStubs, signal) {
				calls.push({ promptText, archivedStubs, signal });
				return result;
			},
		},
	};
}

/** A scorer that rejects with `message`, recording every call. */
function failingScorer(message: string): { scorer: RelevanceScorer; calls: ScorerCalls } {
	const calls: ScorerCalls = [];
	return {
		calls,
		scorer: {
			async score(promptText, archivedStubs, signal) {
				calls.push({ promptText, archivedStubs, signal });
				throw new Error(message);
			},
		},
	};
}

/** A notifier recording what it was told, and how often. */
function fakeNotifier(): { notifier: FailureNotifier; messages: string[] } {
	const messages: string[] = [];
	return { messages, notifier: { notifyOnce: (message) => messages.push(message) } };
}

/** The input a case varies: one key, one prompt, every item eligible, a budget wide enough for all. */
function input(overrides: Partial<RecallRelevantContextInput> = {}): RecallRelevantContextInput {
	return {
		promptKey: "1731|why did it fail?",
		promptText: "why did it fail?",
		decisionThreshold: 0.5,
		budgetCharacters: 10_000,
		eligibleIds: new Set([A.id, B.id, C.id]),
		...overrides,
	};
}

const freshCache = (): RecallCache => ({ lastPromptKey: "", lastRecalledIds: [] });

/** What the use case recalls, as the ids it returns in block order. */
async function recalledIds(
	entry: RecallRelevantContextInput,
	deps: { store: ArchiveStore; scorer: RelevanceScorer; notifier: FailureNotifier; cache: RecallCache },
): Promise<string[]> {
	const outputs = await recallRelevantContext(entry, deps);
	return outputs.map(({ id }) => id);
}

test("a new key scores every eligible item in store order, with its stubs and the caller's signal", async () => {
	const { scorer, calls } = fakeScorer([{ id: A.id, probability: 0.9 }]);
	const signal = new AbortController().signal;

	await recallRelevantContext(input({ signal }), {
		store: fakeStore([A, B]),
		scorer,
		notifier: fakeNotifier().notifier,
		cache: freshCache(),
	});

	expect(calls).toHaveLength(1);
	expect(calls[0].promptText).toBe("why did it fail?");
	expect(calls[0].archivedStubs).toEqual({ [A.id]: A.stub, [B.id]: B.stub });
	expect(calls[0].signal).toBe(signal);
});

test("an ineligible item is not scored", async () => {
	const { scorer, calls } = fakeScorer([{ id: A.id, probability: 0.9 }]);

	await recallRelevantContext(input({ eligibleIds: new Set([A.id]) }), {
		store: fakeStore([A, B]),
		scorer,
		notifier: fakeNotifier().notifier,
		cache: freshCache(),
	});

	expect(calls[0].archivedStubs).toEqual({ [A.id]: A.stub });
});

test("a probability equal to the threshold is recalled and one below it is not", async () => {
	const { scorer } = fakeScorer([
		{ id: A.id, probability: 0.5 },
		{ id: B.id, probability: 0.49 },
	]);

	const ids = await recalledIds(input(), {
		store: fakeStore([A, B]),
		scorer,
		notifier: fakeNotifier().notifier,
		cache: freshCache(),
	});

	expect(ids).toEqual([A.id]);
});

test("kept ids rank by descending probability, ties by id ascending", async () => {
	const { scorer } = fakeScorer([
		{ id: C.id, probability: 0.7 },
		{ id: B.id, probability: 0.9 },
		{ id: A.id, probability: 0.7 },
	]);

	const ids = await recalledIds(input(), {
		store: fakeStore([A, B, C]),
		scorer,
		notifier: fakeNotifier().notifier,
		cache: freshCache(),
	});

	expect(ids).toEqual([B.id, A.id, C.id]);
});

test("the longest prefix that fits the budget is recalled, from the store's own text", async () => {
	const { scorer } = fakeScorer([
		{ id: A.id, probability: 0.9 },
		{ id: B.id, probability: 0.8 },
		{ id: C.id, probability: 0.7 },
	]);
	const twoItems = formatRecalledContext([A, B]).length;

	const outputs = await recallRelevantContext(input({ budgetCharacters: twoItems }), {
		store: fakeStore([A, B, C]),
		scorer,
		notifier: fakeNotifier().notifier,
		cache: freshCache(),
	});

	expect(outputs).toEqual([
		{ id: A.id, toolName: "bash", argsSummary: "", rawText: A.rawText },
		{ id: B.id, toolName: "bash", argsSummary: "", rawText: B.rawText },
	]);
});

test("a budget one character short of the block recalls nothing", async () => {
	const { scorer } = fakeScorer([{ id: A.id, probability: 0.9 }]);
	const oneItem = formatRecalledContext([A]).length;

	const ids = await recalledIds(input({ budgetCharacters: oneItem - 1 }), {
		store: fakeStore([A]),
		scorer,
		notifier: fakeNotifier().notifier,
		cache: freshCache(),
	});

	expect(ids).toEqual([]);
});

test("a large item that does not fit stops the prefix rather than skipping to a smaller one behind it", async () => {
	const large = item("aaaa1111", "x".repeat(2000));
	const small = item("bbbb2222", "tiny");
	const { scorer } = fakeScorer([
		{ id: large.id, probability: 0.9 },
		{ id: small.id, probability: 0.8 },
	]);
	const smallAlone = formatRecalledContext([small]).length;

	const ids = await recalledIds(input({ budgetCharacters: smallAlone, eligibleIds: new Set([large.id, small.id]) }), {
		store: fakeStore([large, small]),
		scorer,
		notifier: fakeNotifier().notifier,
		cache: freshCache(),
	});

	expect(ids).toEqual([]);
});

test("a success records the token and the kept ids in block order", async () => {
	const cache = freshCache();
	const { scorer } = fakeScorer([
		{ id: B.id, probability: 0.9 },
		{ id: A.id, probability: 0.8 },
	]);

	await recallRelevantContext(input(), {
		store: fakeStore([A, B]),
		scorer,
		notifier: fakeNotifier().notifier,
		cache,
	});

	expect(cache.lastPromptKey).toBe(`2|1731|why did it fail?`);
	expect(cache.lastRecalledIds).toEqual([B.id, A.id]);
});

test("a cache hit reuses the ids with no second call and filters to what the store and eligibility still hold", async () => {
	const cache: RecallCache = { lastPromptKey: `2|1731|why did it fail?`, lastRecalledIds: [A.id, B.id, C.id] };
	const { scorer, calls } = fakeScorer([{ id: A.id, probability: 0.9 }]);

	const ids = await recalledIds(input({ eligibleIds: new Set([A.id, C.id]) }), {
		store: fakeStore([A, C]),
		scorer,
		notifier: fakeNotifier().notifier,
		cache,
	});

	expect(ids).toEqual([A.id, C.id]);
	expect(calls).toEqual([]);
});

test.each<[string, RelevanceScore[], number]>([
	[
		"nothing passes the threshold",
		[
			{ id: A.id, probability: 0.1 },
			{ id: B.id, probability: 0.2 },
		],
		10_000,
	],
	["nothing fits the budget", [{ id: A.id, probability: 0.9 }], formatRecalledContext([A]).length - 1],
])("a success that recalls nothing (%s) still records the key", async (_case, scores, budget) => {
	const cache = freshCache();
	const { scorer, calls } = fakeScorer(scores);
	const deps = { store: fakeStore([A, B]), scorer, notifier: fakeNotifier().notifier, cache };
	const entry = input({ budgetCharacters: budget });

	expect(await recalledIds(entry, deps)).toEqual([]);
	expect(cache).toEqual({ lastPromptKey: `2|1731|why did it fail?`, lastRecalledIds: [] });
	expect(await recalledIds(entry, deps)).toEqual([]);
	expect(calls).toHaveLength(1);
});

test("a cache hit drops a cached id the branch no longer admits, though the store still holds it", async () => {
	const cache: RecallCache = { lastPromptKey: `3|1731|why did it fail?`, lastRecalledIds: [A.id, B.id] };
	const { scorer, calls } = fakeScorer([{ id: A.id, probability: 0.9 }]);

	const ids = await recalledIds(input({ eligibleIds: new Set([A.id, C.id]) }), {
		store: fakeStore([A, B, C]),
		scorer,
		notifier: fakeNotifier().notifier,
		cache,
	});

	expect(ids).toEqual([A.id]);
	expect(calls).toEqual([]);
});

test("a cached block that no longer fits is dropped whole", async () => {
	const cache: RecallCache = { lastPromptKey: `2|1731|why did it fail?`, lastRecalledIds: [A.id, B.id] };
	const { scorer } = fakeScorer([]);
	const twoItems = formatRecalledContext([A, B]).length;

	const ids = await recalledIds(input({ budgetCharacters: twoItems - 1 }), {
		store: fakeStore([A, B]),
		scorer,
		notifier: fakeNotifier().notifier,
		cache,
	});

	expect(ids).toEqual([]);
});

test("a rejection notifies once with the error's message, records the key with no ids and recalls nothing", async () => {
	const cache = freshCache();
	const { scorer } = failingScorer("taiknr: recall did not score this prompt — boom.");
	const { notifier, messages } = fakeNotifier();

	const ids = await recalledIds(input(), { store: fakeStore([A]), scorer, notifier, cache });

	expect(ids).toEqual([]);
	expect(messages).toEqual(["taiknr: recall did not score this prompt — boom."]);
	expect(cache.lastPromptKey).toBe(`1|1731|why did it fail?`);
	expect(cache.lastRecalledIds).toEqual([]);
});

test("a rejection is not attempted again under the same key", async () => {
	const cache = freshCache();
	const { scorer, calls } = failingScorer("boom");
	const deps = { store: fakeStore([A]), scorer, notifier: fakeNotifier().notifier, cache };

	await recalledIds(input(), deps);
	const second = await recalledIds(input(), deps);

	expect(second).toEqual([]);
	expect(calls).toHaveLength(1);
});

test("a caller abort recalls nothing, notifies nothing and records no key, so the key can still score", async () => {
	const cache = freshCache();
	const { scorer, calls } = fakeScorer(undefined);
	const { notifier, messages } = fakeNotifier();
	const deps = { store: fakeStore([A]), scorer, notifier, cache };

	expect(await recalledIds(input(), deps)).toEqual([]);
	expect(messages).toEqual([]);
	expect(cache.lastPromptKey).toBe("");
	expect(await recalledIds(input(), deps)).toEqual([]);
	expect(calls).toHaveLength(2);
});

test("an empty eligible set asks nothing and records no key", async () => {
	const cache = freshCache();
	const { scorer, calls } = fakeScorer([]);

	const ids = await recalledIds(input({ eligibleIds: new Set() }), {
		store: fakeStore([A]),
		scorer,
		notifier: fakeNotifier().notifier,
		cache,
	});

	expect(ids).toEqual([]);
	expect(calls).toEqual([]);
	expect(cache.lastPromptKey).toBe("");
});

test("a budget of zero asks nothing and records no key", async () => {
	const cache = freshCache();
	const { scorer, calls } = fakeScorer([]);

	const ids = await recalledIds(input({ budgetCharacters: 0 }), {
		store: fakeStore([A]),
		scorer,
		notifier: fakeNotifier().notifier,
		cache,
	});

	expect(ids).toEqual([]);
	expect(calls).toEqual([]);
	expect(cache.lastPromptKey).toBe("");
});

test("a store whose size changed under the same key scores again", async () => {
	const cache: RecallCache = { lastPromptKey: `1|1731|why did it fail?`, lastRecalledIds: [A.id] };
	const { scorer, calls } = fakeScorer([
		{ id: A.id, probability: 0.9 },
		{ id: B.id, probability: 0.9 },
	]);

	const ids = await recalledIds(input(), {
		store: fakeStore([A, B]),
		scorer,
		notifier: fakeNotifier().notifier,
		cache,
	});

	expect(calls).toHaveLength(1);
	expect(ids).toEqual([A.id, B.id]);
});
