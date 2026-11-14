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

export interface RelevanceScorer {
	score(
		promptText: string,
		archivedStubs: Record<string, string>,
		signal?: AbortSignal,
	): Promise<RelevanceScore[] | undefined>;
}

export interface FailureNotifier {
	notifyOnce(message: string): void;
}
