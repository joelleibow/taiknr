import type { ContextEvent } from "@earendil-works/pi-coding-agent";
import { formatRecalledContext, type RecalledOutput } from "../../domain/recall.js";

export interface ExtractedUserPrompt {
	messageIndex: number;
	promptKey: string;
	promptText: string;
}

/** The text of a user message: its string content, or its text blocks joined with one newline. */
function promptTextOf(message: ContextEvent["messages"][number]): string {
	if (message.role !== "user") return "";
	if (typeof message.content === "string") return message.content;
	return message.content.flatMap((block) => (block.type === "text" ? [block.text] : [])).join("\n");
}

/** Extract the latest user message's stable cache key (timestamp + text) and prompt text. */
export function extractLatestUserPrompt(messages: ContextEvent["messages"]): ExtractedUserPrompt | undefined {
	const messageIndex = messages.findLastIndex((message) => message.role === "user");
	if (messageIndex === -1) return undefined;

	const message = messages[messageIndex];
	const promptText = promptTextOf(message);
	return { messageIndex, promptKey: `${message.timestamp}|${promptText}`, promptText };
}

/**
 * Append formatted <recalled_context> to the tail of the target user message,
 * preserving any non-text blocks (e.g. images) on that message.
 */
export function appendRecalledContextToMessages(
	messages: ContextEvent["messages"],
	userMessageIndex: number,
	recalledOutputs: RecalledOutput[],
): ContextEvent["messages"] {
	const message = messages[userMessageIndex];
	if (recalledOutputs.length === 0 || message?.role !== "user") return messages;

	// One block added after the message's own, which stay in their order; the target is copied, not mutated.
	const content =
		typeof message.content === "string" ? [{ type: "text" as const, text: message.content }] : [...message.content];
	const recallBlock = { type: "text" as const, text: formatRecalledContext(recalledOutputs) };
	return messages.map((current, index) =>
		index === userMessageIndex ? { ...message, content: [...content, recallBlock] } : current,
	);
}
