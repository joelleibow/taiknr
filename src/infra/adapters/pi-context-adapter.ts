import type { ContextEvent } from "@earendil-works/pi-coding-agent";
import type { RecalledOutput } from "../../domain/recall.js";

export interface ExtractedUserPrompt {
	messageIndex: number;
	promptKey: string;
	promptText: string;
}

/** Extract the latest user message's stable cache key (timestamp + text) and prompt text. */
export function extractLatestUserPrompt(_messages: ContextEvent["messages"]): ExtractedUserPrompt | undefined {
	throw new Error("Not implemented: extractLatestUserPrompt");
}

/**
 * Append formatted <recalled_context> to the tail of the target user message,
 * preserving any non-text blocks (e.g. images) on that message.
 */
export function appendRecalledContextToMessages(
	_messages: ContextEvent["messages"],
	_userMessageIndex: number,
	_recalledOutputs: RecalledOutput[],
): ContextEvent["messages"] {
	throw new Error("Not implemented: appendRecalledContextToMessages");
}
