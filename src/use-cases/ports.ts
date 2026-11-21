import type { ArchivedToolOutput } from "../domain/archived-output.js";
import type { RelevanceScore } from "../domain/recall.js";

export interface ArchiveStore {
	size(): number;
	get(id: string): ArchivedToolOutput | undefined;
	getAll(): ArchivedToolOutput[];
	addBatch(items: ArchivedToolOutput[]): void;
	replaceAll(items: ArchivedToolOutput[]): void;
	clear(): void;
}

/** One archived item as the classifier receives it: its id, its stub and the first 600 units of its raw text. */
export interface ScoringItem {
	id: string;
	stub: string;
	excerpt: string;
}

/** One scoring's plain-data request: the prompt, the matching summary when there is one, and the items. */
export interface ScoringRequest {
	promptText: string;
	summary?: string;
	items: readonly ScoringItem[];
}

export interface RelevanceScorer {
	score(request: ScoringRequest, signal?: AbortSignal): Promise<RelevanceScore[] | undefined>;
}

export interface FailureNotifier {
	notifyOnce(message: string): void;
}

/**
 * One session's summary: the entry id it was written for and its text. A write aborts the one before
 * it, and only the newest write may store. Declared here so infra may use it without importing app.
 */
export interface ConversationSummaryState {
	current(): { key: string; text: string } | undefined;
	write(key: string, produce: (signal: AbortSignal) => Promise<string | undefined>): Promise<void>;
	shutdown(): void;
}
