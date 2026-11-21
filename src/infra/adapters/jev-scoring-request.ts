import type { ScoringItem } from "../../use-cases/ports.js";

/** One classifier request's serialized body: the calibrated `state` and one `bool` question per item. */
export interface JevScoringChunk {
	state: { task: string; toolCalls: Record<string, { call: string; outputStart: string }> };
	questions: Record<string, { type: "bool"; instructions: string; criteria: { true: string; false: string } }>;
}

/** The task text's fixed pieces, built in one pass so nothing inserted is scanned again (decision 1). */
const TASK_HEAD =
	"Your task is to assess the following `toolCall` signatures from an AI assisted conversation with a user. Based on the current message from the user in context of the conversation summary, answer yes or no for the likely results of this `toolCall` being needed to respond to the recent message.";
const SUMMARY_HEADING = "\n\nConversation summary:\n";
const MESSAGE_HEADING = "\n\nUser's message:\n";

/** The question's two criteria, quoted from the `tail-recall` delta's "Each item's question" requirement. */
const CRITERIA = {
	true: "The user's message asks about this tool call's result, or the work it asks for reads, changes or checks what that result holds.",
	false: "It belongs to other work, or is another file, copy or round than the user's message names.",
};

/** A chunk's ceiling in UTF-8 bytes of its serialized JSON, and the size of one item's own question. */
const BUDGET_BYTES = 30_000;

/** The task text Joel's prompt fills, with the summary's two lines only when there is a summary. */
export function taskText(promptText: string, summary: string | undefined): string {
	const summaryPart = summary === undefined ? "" : `${SUMMARY_HEADING}${summary}`;
	return `${TASK_HEAD}${summaryPart}${MESSAGE_HEADING}${promptText}`;
}

/** The item's whole id, carried verbatim (ADR 0006). */
function instructionsFor(id: string): string {
	return `Following \`task\`, is the result of \`toolCalls[${id}]\` needed to respond to the user's message?`;
}

/** One chunk carrying `items` in the order given, each question keyed by the item's whole id. */
function chunkFor(task: string, items: readonly ScoringItem[]): JevScoringChunk {
	return {
		state: {
			task,
			toolCalls: Object.fromEntries(items.map(({ id, stub, excerpt }) => [id, { call: stub, outputStart: excerpt }])),
		},
		questions: Object.fromEntries(
			items.map(({ id }) => [id, { type: "bool" as const, instructions: instructionsFor(id), criteria: CRITERIA }]),
		),
	};
}

/** The one measure of a chunk's size: the UTF-8 bytes of its serialized JSON. */
function byteLength(chunk: JevScoringChunk): number {
	return Buffer.byteLength(JSON.stringify(chunk), "utf8");
}

/**
 * Pack `items` in store order into chunks under the byte budget. An item that cannot fit beside the
 * task text on its own sends one unchunked request carrying every item (decision 9).
 */
export function packChunks(
	task: string,
	items: readonly ScoringItem[],
): { chunks: JevScoringChunk[]; unchunked: boolean } {
	if (items.length === 0) return { chunks: [], unchunked: false };
	if (items.some((item) => byteLength(chunkFor(task, [item])) > BUDGET_BYTES)) {
		return { chunks: [chunkFor(task, items)], unchunked: true };
	}

	const chunks: JevScoringChunk[] = [];
	let packed: ScoringItem[] = [];
	for (const item of items) {
		const candidate = [...packed, item];
		if (packed.length > 0 && byteLength(chunkFor(task, candidate)) > BUDGET_BYTES) {
			chunks.push(chunkFor(task, packed));
			packed = [item];
		} else {
			packed = candidate;
		}
	}
	if (packed.length > 0) chunks.push(chunkFor(task, packed));
	return { chunks, unchunked: false };
}
