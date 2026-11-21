import { expect, test } from "vitest";
import { packChunks, taskText } from "../../../src/infra/adapters/jev-scoring-request.js";
import type { ScoringItem } from "../../../src/use-cases/ports.js";

/** The task text's opening, quoted from the `tail-recall` delta's "The wording is the owner's" scenario. */
const OPENING =
	"Your task is to assess the following `toolCall` signatures from an AI assisted conversation with a user. Based on the current message from the user in context of the conversation summary, answer yes or no for the likely results of this `toolCall` being needed to respond to the recent message.";

const CRITERIA = {
	true: "The user's message asks about this tool call's result, or the work it asks for reads, changes or checks what that result holds.",
	false: "It belongs to other work, or is another file, copy or round than the user's message names.",
};

const UUID = "01234567-89ab-cdef-0123-456789abcdef";

const item = (id: string, overrides: Partial<ScoringItem> = {}): ScoringItem => ({
	id,
	stub: `stub of ${id}`,
	excerpt: `excerpt of ${id}`,
	...overrides,
});

const itemsOf = (count: number, excerpt: string): ScoringItem[] =>
	Array.from({ length: count }, (_, index) => item(`id${index}`, { excerpt }));

const bytes = (chunk: unknown): number => Buffer.byteLength(JSON.stringify(chunk), "utf8");

test("J1 the task text carries the summary and the message in the owner's template", () => {
	expect(taskText("the message", "Goal: g")).toBe(
		`${OPENING}\n\nConversation summary:\nGoal: g\n\nUser's message:\nthe message`,
	);
});

test("J2 without a summary the two summary lines and the blank line after them are gone", () => {
	expect(taskText("the message", undefined)).toBe(`${OPENING}\n\nUser's message:\nthe message`);
});

test("J3 a summary that looks like a placeholder is inserted verbatim", () => {
	const summary = "Goal: {{user_message}} $& $1 $$";

	expect(taskText("the message", summary)).toBe(
		`${OPENING}\n\nConversation summary:\n${summary}\n\nUser's message:\nthe message`,
	);
});

test("J4 a message that looks like a placeholder is inserted verbatim", () => {
	const message = "{{conversation_summary}} $& $1 $$";

	expect(taskText(message, "Goal: g")).toBe(
		`${OPENING}\n\nConversation summary:\nGoal: g\n\nUser's message:\n${message}`,
	);
});

test("J5 the opening appears once in a 40-item request", () => {
	const { chunks } = packChunks(taskText("the message", undefined), itemsOf(40, "e"));

	expect(chunks).toHaveLength(1);
	expect(JSON.stringify(chunks).split(OPENING)).toHaveLength(2);
});

test("J6 an item's question carries the instructions and both criteria verbatim", () => {
	const { chunks } = packChunks(taskText("the message", undefined), [item("33b8b9b9")]);

	expect(chunks[0].questions["33b8b9b9"]).toEqual({
		type: "bool",
		instructions: "Following `task`, is the result of `toolCalls[33b8b9b9]` needed to respond to the user's message?",
		criteria: CRITERIA,
	});
});

test("J7 the instructions and both criteria cost 314 bytes with an 8-character id", () => {
	const { chunks } = packChunks(taskText("the message", undefined), [item("abcd1234")]);
	const { instructions, criteria } = chunks[0].questions.abcd1234;

	expect(
		Buffer.byteLength(instructions, "utf8") +
			Buffer.byteLength(criteria.true, "utf8") +
			Buffer.byteLength(criteria.false, "utf8"),
	).toBe(314);
});

test("J8 state carries the task and each item's call and outputStart, in that key order", () => {
	const { chunks } = packChunks(taskText("the message", undefined), [
		item("33b8b9b9", { stub: "[archived 33b8b9b9] bash() status=ok preview: x", excerpt: "the excerpt" }),
	]);

	expect(Object.keys(chunks[0])).toEqual(["state", "questions"]);
	expect(Object.keys(chunks[0].state)).toEqual(["task", "toolCalls"]);
	expect(JSON.stringify(chunks[0].state.toolCalls["33b8b9b9"])).toBe(
		'{"call":"[archived 33b8b9b9] bash() status=ok preview: x","outputStart":"the excerpt"}',
	);
});

test("J9 an integer-like id is hoisted ahead of the string ids on the wire", () => {
	const { chunks } = packChunks(taskText("the message", undefined), [item("abcd1234"), item("12345678")]);

	expect(Object.keys(chunks[0].state.toolCalls)).toEqual(["12345678", "abcd1234"]);
});

test("J10 a full request serializes to the calibrated shape, with an 8-character and a UUID id", () => {
	const task = taskText("why did it fail?", "Goal: g");
	const { chunks } = packChunks(task, [
		item("33b8b9b9", { stub: "[archived 33b8b9b9] bash() status=ok preview: x", excerpt: "the excerpt" }),
		item(UUID, { stub: "uuid stub", excerpt: "uuid excerpt" }),
	]);

	const question = (id: string) => ({
		type: "bool",
		instructions: `Following \`task\`, is the result of \`toolCalls[${id}]\` needed to respond to the user's message?`,
		criteria: CRITERIA,
	});

	expect(JSON.stringify(chunks[0])).toBe(
		JSON.stringify({
			state: {
				task,
				toolCalls: {
					"33b8b9b9": { call: "[archived 33b8b9b9] bash() status=ok preview: x", outputStart: "the excerpt" },
					[UUID]: { call: "uuid stub", outputStart: "uuid excerpt" },
				},
			},
			questions: { "33b8b9b9": question("33b8b9b9"), [UUID]: question(UUID) },
		}),
	);
});

test("J11 every chunk's serialized JSON is at most 30,000 bytes", () => {
	const { chunks } = packChunks(taskText("the message", undefined), itemsOf(60, "a".repeat(600)));

	expect(chunks.length).toBeGreaterThan(1);
	for (const chunk of chunks) expect(bytes(chunk)).toBeLessThanOrEqual(30_000);
});

test("J12 the chunks cover every item once, in store order", () => {
	const items = itemsOf(60, "a".repeat(600));
	const { chunks } = packChunks(taskText("the message", undefined), items);

	const packed = chunks.flatMap((chunk) => Object.keys(chunk.state.toolCalls));

	expect(packed).toEqual(items.map(({ id }) => id));
	expect(new Set(packed).size).toBe(items.length);
});

test("J13 the task text's bytes reduce how many items fit a chunk", () => {
	const items = itemsOf(40, "a".repeat(600));
	const short = packChunks(taskText("m", undefined), items);
	const long = packChunks(taskText("a".repeat(20_000), undefined), items);

	const firstChunk = (chunks: { state: { toolCalls: Record<string, unknown> } }[]) =>
		Object.keys(chunks[0].state.toolCalls).length;

	expect(firstChunk(long.chunks)).toBeLessThan(firstChunk(short.chunks));
});

test("J14 the budget is measured in UTF-8 bytes, not string length", () => {
	const ascii = packChunks(taskText("m", undefined), itemsOf(15, "a".repeat(600)));
	const cjk = packChunks(taskText("m", undefined), itemsOf(15, "漢".repeat(600)));

	expect(ascii.chunks).toHaveLength(1);
	expect(cjk.chunks.length).toBeGreaterThan(1);
	for (const chunk of cjk.chunks) expect(bytes(chunk)).toBeLessThanOrEqual(30_000);
});

test("J15 an item that cannot fit beside the task text sends one unchunked request carrying every item", () => {
	const task = taskText("a".repeat(28_650), undefined);
	const [first, second, third, fourth, fifth] = [
		item("aaaaaaaa", { excerpt: "" }),
		item("bbbbbbbb", { excerpt: "" }),
		item("cccccccc", { excerpt: "a".repeat(600) }),
		item("dddddddd", { excerpt: "" }),
		item("eeeeeeee", { excerpt: "" }),
	];
	const items = [first, second, third, fourth, fifth];

	// The preconditions first: only the third item crosses the budget alone beside the task text.
	for (const alone of [first, second, fourth, fifth]) expect(packChunks(task, [alone]).unchunked).toBe(false);
	expect(packChunks(task, [third]).unchunked).toBe(true);

	const whole = packChunks(task, items);

	expect(whole.unchunked).toBe(true);
	expect(whole.chunks).toHaveLength(1);
	expect(Object.keys(whole.chunks[0].state.toolCalls)).toEqual(items.map(({ id }) => id));
});

test("J16 no eligible item means no request", () => {
	expect(packChunks(taskText("m", undefined), [])).toEqual({ chunks: [], unchunked: false });
});
