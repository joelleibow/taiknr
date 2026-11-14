import type {
	SessionBoundaryDraft,
	SessionEntry,
	TurnEndEvent,
} from "@earendil-works/pi-coding-agent";
import type { ArchivedToolOutput, ToolOutputCandidate } from "../../domain/archived-output.js";
import type { ArchiveStore } from "../../use-cases/ports.js";

export const TAIKNR_SIDE_STORE_TYPE = "taiknr-side-store";

export class InMemoryArchiveStore implements ArchiveStore {
	private readonly items = new Map<string, ArchivedToolOutput>();

	size(): number {
		return this.items.size;
	}

	get(id: string): ArchivedToolOutput | undefined {
		return this.items.get(id);
	}

	getAll(): ArchivedToolOutput[] {
		return [...this.items.values()];
	}

	addBatch(items: ArchivedToolOutput[]): void {
		for (const item of items) this.items.set(item.id, item);
	}

	replaceAll(items: ArchivedToolOutput[]): void {
		this.items.clear();
		this.addBatch(items);
	}

	clear(): void {
		this.items.clear();
	}
}

/** Translate Pi TurnEndEvent tool results into domain ToolOutputCandidates. */
export function toToolOutputCandidates(
	_event: TurnEndEvent,
	_argsByCallId: ReadonlyMap<string, string>,
): ToolOutputCandidate[] {
	throw new Error("Not implemented: toToolOutputCandidates");
}

/**
 * Translate a committed batch into Pi context_edit drafts (replacing text while
 * preserving any non-text content blocks) plus a taiknr-side-store custom entry.
 */
export function toSettlementDrafts(
	_batch: ArchivedToolOutput[],
	_originalToolResultsByEntryId: ReadonlyMap<string, unknown[]>,
): SessionBoundaryDraft[] {
	throw new Error("Not implemented: toSettlementDrafts");
}

/** Extract archived batches from Pi's active branch entries. */
export function readArchiveBatchesFromBranch(_entries: SessionEntry[]): ArchivedToolOutput[][] {
	throw new Error("Not implemented: readArchiveBatchesFromBranch");
}
