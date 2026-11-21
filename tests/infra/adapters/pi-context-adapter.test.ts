import type { ContextEvent, SessionEntry } from "@earendil-works/pi-coding-agent";
import { expect, test } from "vitest";
import { formatRecalledContext, type RecalledOutput } from "../../../src/domain/recall.js";
import {
	appendRecalledContextToMessages,
	extractLatestUserPrompt,
	newestAssistantEntryId,
} from "../../../src/infra/adapters/pi-context-adapter.js";

type Messages = ContextEvent["messages"];
type UserContent = Extract<Messages[number], { role: "user" }>["content"];

/** A user message carrying the given content and timestamp. */
function user(content: UserContent, timestamp = 1000) {
	return { role: "user" as const, content, timestamp };
}

const TEXT = (text: string) => ({ type: "text" as const, text });
const IMAGE = { type: "image" as const, data: "AAAA", mimeType: "image/png" };
const CUSTOM = {
	role: "custom" as const,
	customType: "probe",
	content: [TEXT("a mid-run note")],
	display: true,
	timestamp: 2000,
};
const RECALLED: RecalledOutput = {
	id: "a1b2c3d4",
	toolName: "bash",
	argsSummary: '{"command":"npm test"}',
	rawText: "line one\nline two",
};
const RECALL_BLOCK = TEXT(formatRecalledContext([RECALLED]));

test("the latest user prompt carries its index, its text and a timestamp|text key", () => {
	const messages: Messages = [user([TEXT("what failed?")], 1731)];

	expect(extractLatestUserPrompt(messages)).toEqual({
		messageIndex: 0,
		promptKey: "1731|what failed?",
		promptText: "what failed?",
	});
});

test("a string content yields the text verbatim", () => {
	const messages: Messages = [user("hello there", 7)];

	expect(extractLatestUserPrompt(messages)?.promptText).toBe("hello there");
});

test("several text blocks join with one newline", () => {
	const messages: Messages = [user([TEXT("line one"), TEXT("line two")])];

	expect(extractLatestUserPrompt(messages)?.promptText).toBe("line one\nline two");
});

test("an image block leaves the text and the index intact", () => {
	const messages: Messages = [user([TEXT("look at this"), IMAGE], 5)];

	expect(extractLatestUserPrompt(messages)).toEqual({
		messageIndex: 0,
		promptKey: "5|look at this",
		promptText: "look at this",
	});
});

test("a custom message after the latest user message does not move the index", () => {
	const messages: Messages = [user([TEXT("the prompt")], 9), CUSTOM];

	expect(extractLatestUserPrompt(messages)?.messageIndex).toBe(0);
});

test("no user message yields nothing", () => {
	expect(extractLatestUserPrompt([CUSTOM])).toBeUndefined();
});

test("empty messages yield nothing", () => {
	expect(extractLatestUserPrompt([])).toBeUndefined();
});

test("two user messages select the last", () => {
	const messages: Messages = [user([TEXT("first")], 1), user([TEXT("second")], 2)];

	expect(extractLatestUserPrompt(messages)).toEqual({
		messageIndex: 1,
		promptKey: "2|second",
		promptText: "second",
	});
});

test("a message carrying only an image yields empty text", () => {
	const messages: Messages = [user([IMAGE], 3)];

	expect(extractLatestUserPrompt(messages)?.promptText).toBe("");
});

test("an empty text block yields empty text", () => {
	const messages: Messages = [user([TEXT("")], 4)];

	expect(extractLatestUserPrompt(messages)?.promptText).toBe("");
});

/** The content the message at `index` carries, as the adapter returned it. */
function contentAt(messages: Messages, index: number): unknown {
	return (messages[index] as { content: unknown }).content;
}

test("one trailing text block carrying the formatted block is appended to the target message", () => {
	const messages: Messages = [user([TEXT("what failed?")], 1)];

	const appended = appendRecalledContextToMessages(messages, 0, [RECALLED]);

	expect(appended).toHaveLength(1);
	expect(contentAt(appended, 0)).toEqual([TEXT("what failed?"), RECALL_BLOCK]);
	expect(appended[0]).not.toBe(messages[0]);
});

test("a text block and an image block keep their order and the recall block follows them", () => {
	const messages: Messages = [user([TEXT("look"), IMAGE], 1)];

	const appended = appendRecalledContextToMessages(messages, 0, [RECALLED]);

	expect(contentAt(appended, 0)).toEqual([TEXT("look"), IMAGE, RECALL_BLOCK]);
});

test("a string content becomes two text blocks", () => {
	const messages: Messages = [user("what failed?", 1)];

	const appended = appendRecalledContextToMessages(messages, 0, [RECALLED]);

	expect(contentAt(appended, 0)).toEqual([TEXT("what failed?"), RECALL_BLOCK]);
});

test("every other message, a trailing custom message included, is element-identical to its input", () => {
	const messages: Messages = [user([TEXT("what failed?")], 1), CUSTOM];

	const appended = appendRecalledContextToMessages(messages, 0, [RECALLED]);

	expect(appended).toHaveLength(2);
	expect(appended[1]).toBe(CUSTOM);
});

test("the index being the last message leaves no neighbour to disturb", () => {
	const messages: Messages = [CUSTOM, user([TEXT("last")], 2)];

	const appended = appendRecalledContextToMessages(messages, 1, [RECALLED]);

	expect(appended).toHaveLength(2);
	expect(contentAt(appended, 1)).toEqual([TEXT("last"), RECALL_BLOCK]);
	expect(appended[0]).toBe(CUSTOM);
});

test("nothing recalled returns the input unchanged", () => {
	const messages: Messages = [user([TEXT("what failed?")], 1)];

	expect(appendRecalledContextToMessages(messages, 0, [])).toBe(messages);
});

/** One branch entry, carrying just the type, id and message role the derivation reads. */
function branchEntry(id: string, type: string, role?: string): SessionEntry {
	return {
		type,
		id,
		parentId: null,
		timestamp: "2026-11-20T00:00:00.000Z",
		message: { role },
	} as unknown as SessionEntry;
}

test("P1: the key is the last assistant message entry, even with a later user message", () => {
	const entries = [
		branchEntry("e1", "message", "assistant"),
		branchEntry("e2", "message", "assistant"),
		branchEntry("e3", "message", "user"),
	];

	expect(newestAssistantEntryId(entries)).toBe("e2");
});

test("P2: no assistant message means no key", () => {
	expect(newestAssistantEntryId([branchEntry("e1", "message", "user")])).toBeUndefined();
	expect(newestAssistantEntryId([])).toBeUndefined();
});

test("P3: a later non-message entry does not move the key", () => {
	const entries = [
		branchEntry("e1", "message", "assistant"),
		branchEntry("e2", "compaction"),
		branchEntry("e3", "label"),
	];

	expect(newestAssistantEntryId(entries)).toBe("e1");
});
