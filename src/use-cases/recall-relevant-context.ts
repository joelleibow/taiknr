import type { ArchivedToolOutput } from "../domain/archived-output.js";
import {
	formatRecalledContext,
	type RecalledOutput,
	type RelevanceScore,
	selectRecalledIds,
} from "../domain/recall.js";
import type { ArchiveStore, FailureNotifier, RelevanceScorer } from "./ports.js";

export interface RecallRelevantContextInput {
	promptKey: string;
	promptText: string;
	decisionThreshold: number;
	signal?: AbortSignal;
	/** The request's room for the block, in UTF-16 code units, read from the host per request. */
	budgetCharacters: number;
	/** The ids the branch still admits: the only items scored, and the only cached ids kept. */
	eligibleIds: ReadonlySet<string>;
}

export interface RecallCache {
	/** `<store size>|<prompt key>`, so a store that grew under one prompt is scored again (design decision 4). */
	lastPromptKey: string;
	lastRecalledIds: string[];
}

/** The four fields the block needs, taken from the store's own item. */
function toRecalledOutput(item: ArchivedToolOutput): RecalledOutput {
	return { id: item.id, toolName: item.toolName, argsSummary: item.argsSummary, rawText: item.rawText };
}

/** The selected scores by descending probability, ties by id ascending, so the block is deterministic. */
function rankedSelection(scores: RelevanceScore[], decisionThreshold: number): RelevanceScore[] {
	const selected = new Set(selectRecalledIds(scores, decisionThreshold));
	return scores
		.filter(({ id }) => selected.has(id))
		.sort((left, right) => right.probability - left.probability || (left.id < right.id ? -1 : 1));
}

/** The longest prefix of `outputs` whose formatted block fits `budgetCharacters`, whole items only. */
function fittingPrefix(outputs: RecalledOutput[], budgetCharacters: number): RecalledOutput[] {
	const kept: RecalledOutput[] = [];
	for (const output of outputs) {
		const candidate = [...kept, output];
		if (formatRecalledContext(candidate).length > budgetCharacters) break;
		kept.push(output);
	}
	return kept;
}

/**
 * Score archived stubs against the current prompt (cached per user message key)
 * and return recalled outputs. Fails open and notifies once if scoring fails.
 */
export async function recallRelevantContext(
	input: RecallRelevantContextInput,
	deps: {
		store: ArchiveStore;
		scorer: RelevanceScorer;
		notifier: FailureNotifier;
		cache: RecallCache;
	},
): Promise<RecalledOutput[]> {
	const token = `${deps.store.size()}|${input.promptKey}`;

	if (deps.cache.lastPromptKey === token) {
		const cached = deps.cache.lastRecalledIds.flatMap((id) => {
			const item = input.eligibleIds.has(id) ? deps.store.get(id) : undefined;
			return item === undefined ? [] : [toRecalledOutput(item)];
		});
		// The block's bytes stay as scored: appended whole or not at all (design decision 9).
		return formatRecalledContext(cached).length <= input.budgetCharacters ? cached : [];
	}

	const candidates = deps.store.getAll().filter(({ id }) => input.eligibleIds.has(id));
	// An empty scoreable set and a request with no room are the request's, not the key's: no token.
	if (candidates.length === 0 || input.budgetCharacters <= 0) return [];

	const archivedStubs = Object.fromEntries(candidates.map(({ id, stub }) => [id, stub]));
	let scores: RelevanceScore[] | undefined;
	try {
		scores = await deps.scorer.score(input.promptText, archivedStubs, input.signal);
	} catch (error) {
		// The adapter writes the notice; this side only shows it and remembers the attempt.
		deps.notifier.notifyOnce(error instanceof Error ? error.message : String(error));
		deps.cache.lastPromptKey = token;
		deps.cache.lastRecalledIds = [];
		return [];
	}
	// A caller's cancel: nothing recalled, no notice, and no token, so a later request can still score.
	if (scores === undefined) return [];

	const byId = new Map(candidates.map((item) => [item.id, item]));
	const outputs = rankedSelection(scores, input.decisionThreshold).flatMap(({ id }) => {
		const item = byId.get(id);
		return item === undefined ? [] : [toRecalledOutput(item)];
	});
	const kept = fittingPrefix(outputs, input.budgetCharacters);

	deps.cache.lastPromptKey = token;
	deps.cache.lastRecalledIds = kept.map(({ id }) => id);
	return kept;
}
