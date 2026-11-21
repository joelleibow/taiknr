import type { ExtensionContext, SessionEntry } from "@earendil-works/pi-coding-agent";
import type { TaiknrConfig } from "../../config/taiknr-config.js";
import { type ConversationPart, isUsableSummary, renderConversation } from "../../domain/conversation-summary.js";
import type { InstrumentPublisher } from "../../use-cases/instruments-publisher.js";
import type { FailureNotifier } from "../../use-cases/ports.js";

/** The summarizer's fixed system prompt, quoted by the `conversation-summary` delta's first scenario. */
const SYSTEM_PROMPT =
	"Summarize this conversation between a user and an AI assistant for a classifier that will judge which earlier tool results are needed for the user's next message. Start with one line `Goal:` stating what the user is trying to accomplish overall. Then `Now:` stating what is being worked on at the end of the conversation. Then up to 5 short bullets of key facts, decisions, files or names in play. At most 120 words. No preamble.";

/** One message's text: its string content, or its text blocks joined with a newline. */
function textOf(message: { content: string | readonly { type: string; text?: string }[] }): string {
	if (typeof message.content === "string") return message.content;
	return message.content
		.flatMap((block) => (block.type === "text" && typeof block.text === "string" ? [block.text] : []))
		.join("\n");
}

/**
 * The branch's message entries as the summarizer reads them: user and assistant text, and each
 * assistant tool call's arguments, in branch order (design decision 11).
 */
function conversationParts(entries: readonly SessionEntry[]): ConversationPart[] {
	const parts: ConversationPart[] = [];
	for (const entry of entries) {
		if (entry.type !== "message") continue;
		const { message } = entry;
		if (message.role !== "user" && message.role !== "assistant") continue;
		const text = textOf(message);
		if (text.trim().length > 0) parts.push({ role: message.role, text });
		if (message.role !== "assistant") continue;
		for (const block of message.content) {
			if (block.type === "toolCall") {
				parts.push({ toolName: block.name, argumentsJson: JSON.stringify(block.arguments ?? {}) });
			}
		}
	}
	return parts;
}

/** The one warning a summarizer failure shows, naming both settings the user has to fix. */
function warning(config: TaiknrConfig): string {
	return `taiknr could not write a conversation summary. provider=${config.conversationSummaryProvider ?? "unset"} model=${config.conversationSummaryModel ?? "unset"} field=conversationSummaryProvider,conversationSummaryModel`;
}

/**
 * The summarizer's provider boundary. It renders the branch's entries, asks the configured chat model
 * once, reports its spend, and answers with the summary or `undefined`. Every failure is `undefined`
 * plus at most one warning; nothing throws out of here.
 */
export function createPiSummarizerAdapter(
	ctx: ExtensionContext,
	config: TaiknrConfig,
	notifier: FailureNotifier,
	spend: Pick<InstrumentPublisher, "summarized">,
): { summarize(entries: readonly SessionEntry[], signal: AbortSignal): Promise<string | undefined> } {
	return {
		async summarize(entries, signal) {
			const provider = config.conversationSummaryProvider;
			const modelId = config.conversationSummaryModel;
			const model =
				provider === undefined || modelId === undefined ? undefined : ctx.modelRegistry.find(provider, modelId);
			if (model === undefined) {
				notifier.notifyOnce(warning(config));
				return undefined;
			}
			const level = config.conversationSummaryThinkingLevel;
			const options = level === "off" ? { temperature: 0, signal } : { temperature: 0, reasoning: level, signal };
			const result = await ctx.modelRegistry
				.streamSimple(
					model,
					{
						systemPrompt: SYSTEM_PROMPT,
						messages: [
							{ role: "user", content: renderConversation(conversationParts(entries)), timestamp: Date.now() },
						],
					},
					options,
				)
				.result();
			spend.summarized(result.usage === undefined ? undefined : { costTotal: result.usage.cost.total });
			// taiknr's own abort yields no summary and no warning, whatever the result says.
			if (signal.aborted) return undefined;
			if (result.stopReason !== "stop") {
				notifier.notifyOnce(warning(config));
				return undefined;
			}
			const text = result.content
				.flatMap((block) => (block.type === "text" ? [block.text] : []))
				.join("")
				.trim();
			return isUsableSummary(text) ? text : undefined;
		},
	};
}
