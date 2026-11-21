import { cutToUnits, tailStartOf } from "./archived-output.js";

/** One piece of the conversation the summarizer reads: a message's text, or a tool call's arguments. */
export type ConversationPart =
	| { role: "user" | "assistant"; text: string }
	| { toolName: string; argumentsJson: string };

/** A tool call's arguments are cut to this many units, so one long argument cannot dominate the input. */
const ARGUMENT_UNITS = 200;

/** The conversation's bound: at or under it the whole conversation is rendered; over it, head and tail. */
const CONVERSATION_UNITS = 60_000;
const TAIL_UNITS = 55_000;

/** What stands between the head and the tail when the conversation is bounded. */
const ELLIPSIS = "\n\n…\n\n";

/** A summary is malformed only when it is empty or its first non-blank line does not begin `Goal:`. */
export function isUsableSummary(text: string): boolean {
	const trimmed = text.trimStart();
	if (trimmed.length === 0) return false;
	const [firstLine] = trimmed.split("\n");
	return firstLine.startsWith("Goal:");
}

/** Every part's own line, in order: a message's text untrimmed, a tool call's arguments cut to 200 units. */
function renderPart(part: ConversationPart): string | undefined {
	if ("role" in part) return part.text.trim().length === 0 ? undefined : `${part.role}: ${part.text}`;
	return `tool call ${part.toolName}(${cutToUnits(part.argumentsJson, ARGUMENT_UNITS)})`;
}

/**
 * The conversation as the summarizer reads it: each part's line, joined by a blank line, and bounded
 * when it is long by the first `user: ` part whole and the joined text's last 55,000 units
 * (design decision 11).
 */
export function renderConversation(parts: readonly ConversationPart[]): string {
	const rendered = parts.flatMap((part) => {
		const line = renderPart(part);
		return line === undefined ? [] : [line];
	});
	const joined = rendered.join("\n\n");
	if (joined.length <= CONVERSATION_UNITS) return joined;
	const head = rendered.find((line) => line.startsWith("user: ")) ?? rendered[0];
	const tail = joined.slice(tailStartOf(joined, joined.length - TAIL_UNITS));
	return `${head}${ELLIPSIS}${tail}`;
}
