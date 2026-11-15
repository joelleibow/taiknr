import type {
	ProjectedSessionEntry,
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

// The message and block types Pi's own event carries, since the host does not re-export them (D8).
type ContentBlock = TurnEndEvent["toolResults"][number]["content"][number];
type TextBlock = Extract<ContentBlock, { type: "text" }>;

function isTextBlock(block: ContentBlock): block is TextBlock {
	return block.type === "text";
}

/** The id of the projected entry that persisted this tool result, by its call id (M7). */
function projectedEntryId(contextEntries: readonly ProjectedSessionEntry[], toolCallId: string): string {
	const match = contextEntries.findLast(
		({ sourceEntry }) =>
			sourceEntry.type === "message" &&
			sourceEntry.message.role === "toolResult" &&
			sourceEntry.message.toolCallId === toolCallId,
	);
	return match?.sourceEntry.id ?? "";
}

/** The persisted entry id of `event.toolResults[index]`, or "" when nothing trustworthy pairs it. */
function entryIdAt(event: TurnEndEvent, index: number): string {
	const contextEntries = event.context?.contextEntries;
	if (contextEntries !== undefined) return projectedEntryId(contextEntries, event.toolResults[index].toolCallId);
	// Position is a pairing key only when Pi resolved every id, which its `flatMap` does not guarantee (Trap 6).
	const positionsAgree = event.toolResultEntryIds.length === event.toolResults.length;
	return positionsAgree ? event.toolResultEntryIds[index] : "";
}

/** Translate Pi TurnEndEvent tool results into domain ToolOutputCandidates. */
export function toToolOutputCandidates(
	event: TurnEndEvent,
	argsByCallId: ReadonlyMap<string, string>,
): ToolOutputCandidate[] {
	return event.toolResults.flatMap((result, index) => {
		const entryId = entryIdAt(event, index);
		if (entryId.length === 0) return [];

		const textBlocks = result.content.filter(isTextBlock);
		const rawText = textBlocks.some(({ text }) => text.length > 0) ? textBlocks.map(({ text }) => text).join("\n") : "";

		return [
			{
				entryId,
				toolCallId: result.toolCallId,
				toolName: result.toolName,
				argsSummary: argsByCallId.get(result.toolCallId) ?? "",
				rawText,
				isError: result.isError,
			},
		];
	});
}

/**
 * Translate a committed batch into Pi context_edit drafts (replacing text while
 * preserving any non-text content blocks) plus a taiknr-side-store custom entry.
 */
export function toSettlementDrafts(
	batch: ArchivedToolOutput[],
	originalToolResultsByEntryId: ReadonlyMap<string, unknown[]>,
): SessionBoundaryDraft[] {
	if (batch.length === 0) return [];
	return [
		{ type: "custom", customType: TAIKNR_SIDE_STORE_TYPE, data: batch },
		...batch.map((item) => ({
			type: "context_edit" as const,
			targetId: item.id,
			replacement: {
				content: [
					{ type: "text" as const, text: item.stub },
					...(originalToolResultsByEntryId.get(item.id) ?? []).filter(
						(block): block is ContentBlock => (block as { type?: unknown }).type !== "text",
					),
				],
			},
		})),
	];
}

/** The batch a custom entry carries, or nothing when the entry is foreign or malformed (M1). */
function batchOf(entry: SessionEntry): ArchivedToolOutput[] | undefined {
	if (entry.type !== "custom" || entry.customType !== TAIKNR_SIDE_STORE_TYPE) return undefined;
	const data: unknown = entry.data;
	if (!Array.isArray(data) || data.length === 0) return undefined;
	return data.every(isWellFormedItem) ? (data as ArchivedToolOutput[]) : undefined;
}

/** The item shape a persisted batch must carry: read-back's one definition, extra properties tolerated. */
function isWellFormedItem(value: unknown): boolean {
	if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
	const item = value as Record<string, unknown>;
	return (
		typeof item.id === "string" &&
		item.id.length > 0 &&
		typeof item.toolName === "string" &&
		typeof item.argsSummary === "string" &&
		typeof item.stub === "string" &&
		typeof item.rawText === "string" &&
		typeof item.isError === "boolean"
	);
}

/** Extract archived batches from Pi's active branch entries, in branch order. */
export function readArchiveBatchesFromBranch(entries: SessionEntry[]): ArchivedToolOutput[][] {
	return entries.flatMap((entry) => {
		const batch = batchOf(entry);
		return batch === undefined ? [] : [batch];
	});
}
