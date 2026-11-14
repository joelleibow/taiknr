import type { RecalledOutput } from "../domain/recall.js";
import type { ArchiveStore, FailureNotifier, RelevanceScorer } from "./ports.js";

export interface RecallRelevantContextInput {
	promptKey: string;
	promptText: string;
	decisionThreshold: number;
	signal?: AbortSignal;
}

export interface RecallCache {
	lastPromptKey: string;
	lastRecalledIds: string[];
}

/**
 * Score archived stubs against the current prompt (cached per user message key)
 * and return recalled outputs. Fails open and notifies once if scoring fails.
 */
export async function recallRelevantContext(
	_input: RecallRelevantContextInput,
	_deps: {
		store: ArchiveStore;
		scorer: RelevanceScorer;
		notifier: FailureNotifier;
		cache: RecallCache;
	},
): Promise<RecalledOutput[]> {
	throw new Error("Not implemented: recallRelevantContext");
}
