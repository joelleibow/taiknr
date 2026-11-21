import { expect, test } from "vitest";
import { isUsableSummary, renderConversation } from "../../src/domain/conversation-summary.js";

/** What stands between a bounded conversation's head and its tail. */
const ELLIPSIS = "\n\n…\n\n";

test("a summary whose first line begins Goal: is usable", () => {
	expect(isUsableSummary("Goal: ship the change")).toBe(true);
});

test("leading blank lines before Goal: do not make a summary malformed", () => {
	expect(isUsableSummary("\n\n  Goal: ship the change")).toBe(true);
});

test("a summary with no word cap is usable", () => {
	const long = `Goal: ship it\n\n${Array.from({ length: 400 }, (_, index) => `word${index}`).join(" ")}`;

	expect(isUsableSummary(long)).toBe(true);
});

test("an empty summary is malformed", () => {
	expect(isUsableSummary("")).toBe(false);
	expect(isUsableSummary("   \n\n  ")).toBe(false);
});

test("a summary whose first line does not begin Goal: is malformed", () => {
	expect(isUsableSummary("No goal here")).toBe(false);
	expect(isUsableSummary("**Goal:** ship it")).toBe(false);
});

test("a Goal: line with nothing after it is usable", () => {
	expect(isUsableSummary("Goal:")).toBe(true);
});

test("a message's text is rendered under its role, untrimmed, and parts are joined by a blank line", () => {
	expect(
		renderConversation([
			{ role: "user", text: "  read a.ts  " },
			{ role: "assistant", text: "Reading it now" },
		]),
	).toBe("user:   read a.ts  \n\nassistant: Reading it now");
});

test("a tool call is rendered as its name and its arguments", () => {
	expect(renderConversation([{ toolName: "read", argumentsJson: '{"path":"a.ts"}' }])).toBe(
		'tool call read({"path":"a.ts"})',
	);
});

test("a blank message contributes no part", () => {
	expect(
		renderConversation([
			{ role: "user", text: "hi" },
			{ role: "assistant", text: "   " },
			{ role: "user", text: "there" },
		]),
	).toBe("user: hi\n\nuser: there");
});

test("a tool call's arguments are cut to 200 units", () => {
	const argumentsJson = "x".repeat(300);

	const rendered = renderConversation([{ toolName: "read", argumentsJson }]);

	expect(rendered).toBe(`tool call read(${"x".repeat(200)})`);
});

test("a tool call's 200-unit cut never lands inside a surrogate pair", () => {
	const argumentsJson = `${"a".repeat(199)}🚀tail`;

	const rendered = renderConversation([{ toolName: "read", argumentsJson }]);

	expect(rendered).toBe(`tool call read(${"a".repeat(199)})`);
	expect(rendered.isWellFormed()).toBe(true);
});

test("a conversation at or under 60,000 units is rendered whole", () => {
	const text = "a".repeat(60_000 - "assistant: ".length);

	expect(renderConversation([{ role: "assistant", text }])).toBe(`assistant: ${text}`);
});

test("over 60,000 units, the first user part is kept whole and the joined text's last 55,000 units follow", () => {
	const rendered = renderConversation([
		{ role: "user", text: "u".repeat(10) },
		{ role: "assistant", text: "a".repeat(60_000) },
	]);

	expect(rendered.startsWith(`user: ${"u".repeat(10)}${ELLIPSIS}`)).toBe(true);
	expect(rendered.endsWith("a".repeat(55_000))).toBe(true);
	expect(rendered.length).toBe(`user: ${"u".repeat(10)}`.length + ELLIPSIS.length + 55_000);
});

test("a first user part over 60,000 units is kept whole", () => {
	const userText = "u".repeat(61_000);

	const rendered = renderConversation([
		{ role: "user", text: userText },
		{ role: "assistant", text: "a" },
	]);

	expect(rendered.startsWith(`user: ${userText}${ELLIPSIS}`)).toBe(true);
	expect(rendered.endsWith("assistant: a")).toBe(true);
	expect(rendered.length).toBe(`user: ${userText}`.length + ELLIPSIS.length + 55_000);
});

test("over 60,000 units with no user part, the first part is kept whole", () => {
	const assistantText = "a".repeat(60_100);

	const rendered = renderConversation([{ role: "assistant", text: assistantText }]);

	expect(rendered.startsWith(`assistant: ${assistantText}${ELLIPSIS}`)).toBe(true);
	expect(rendered.endsWith("a".repeat(55_000))).toBe(true);
});

test("the tail's cut moves one unit earlier rather than into a surrogate pair", () => {
	const rendered = renderConversation([{ role: "assistant", text: `${"a".repeat(5_000)}🚀${"b".repeat(54_999)}` }]);

	expect(rendered.endsWith(`…\n\n🚀${"b".repeat(54_999)}`)).toBe(true);
	expect(rendered.isWellFormed()).toBe(true);
});
