import { expect, test } from "vitest";
import {
	buildStub,
	shouldArchive,
	summarizeSingleLine,
	type ToolOutputCandidate,
} from "../../src/domain/archived-output.js";

test("one below the threshold is not archived", () => {
	expect(shouldArchive(9, 10)).toBe(false);
});

test("exactly at the threshold is archived", () => {
	expect(shouldArchive(10, 10)).toBe(true);
});

test("one above the threshold is archived", () => {
	expect(shouldArchive(11, 10)).toBe(true);
});

/** A candidate whose fields a case overrides only where it cares. */
function candidate(overrides: Partial<ToolOutputCandidate> = {}): ToolOutputCandidate {
	return {
		entryId: "a1b2c3d4",
		toolCallId: "call-1",
		toolName: "bash",
		argsSummary: '{"command":"npm test"}',
		rawText: "",
		isError: false,
		...overrides,
	};
}

/** Raw text of `chars` characters over `lines` lines, whose first three lines this fixture fixes. */
function rawTextOf(chars: number, lines: number): string {
	const head = ["first line", "second line", "third line"];
	const middle = Array.from({ length: lines - head.length - 1 }, () => "x");
	const joined = [...head, ...middle].join("\n");
	return `${joined}\n${"z".repeat(chars - joined.length - 1)}`;
}

test("a stub is one line naming the output and previewing its first three lines", () => {
	const rawText = rawTextOf(4200, 118);

	const stub = buildStub(candidate({ rawText }));

	expect(rawText.length).toBe(4200);
	expect(stub.split("\n").length).toBe(1);
	expect(stub).toBe(
		'[archived a1b2c3d4] bash({"command":"npm test"}) status=ok (4200 chars, 118 lines) preview: first line | second line | third line',
	);
});

test("a failing output renders status=error", () => {
	const stub = buildStub(candidate({ rawText: rawTextOf(4200, 118), isError: true }));

	expect(stub).toBe(
		'[archived a1b2c3d4] bash({"command":"npm test"}) status=error (4200 chars, 118 lines) preview: first line | second line | third line',
	);
});

test("the line count splits on every line separator", () => {
	const stub = buildStub(candidate({ rawText: "a\r\nb\rc\nd\u2028e\u2029f\u0085g" }));

	expect(stub).toBe(
		'[archived a1b2c3d4] bash({"command":"npm test"}) status=ok (14 chars, 7 lines) preview: a | b | c',
	);
});

test("the preview joins the first three lines and cuts to 180 characters", () => {
	const lines = ["a".repeat(100), "b".repeat(100), "c".repeat(100), "d"];

	const stub = buildStub(candidate({ rawText: lines.join("\n") }));

	const preview = lines.slice(0, 3).join(" | ").slice(0, 180);
	expect(preview.length).toBe(180);
	expect(stub.endsWith(`preview: ${preview}`)).toBe(true);
});

test("a preview cut never splits a surrogate pair", () => {
	const stub = buildStub(candidate({ rawText: `${"a".repeat(179)}🚀` }));

	const preview = stub.slice(stub.indexOf("preview: ") + "preview: ".length);
	expect(preview).toBe("a".repeat(179));
	expect(preview.length).toBe(179);
	expect(stub.isWellFormed()).toBe(true);
});

test("an argument summary longer than 120 characters is cut to 120", () => {
	const stub = buildStub(candidate({ rawText: "text", argsSummary: "x".repeat(121) }));

	expect(stub).toContain(`(${"x".repeat(120)})`);
});

test("an argument summary of exactly 120 characters is not cut", () => {
	const stub = buildStub(candidate({ rawText: "text", argsSummary: "x".repeat(120) }));

	expect(stub).toContain(`(${"x".repeat(120)})`);
});

test("an empty argument summary renders empty parentheses", () => {
	const stub = buildStub(candidate({ rawText: "text", argsSummary: "" }));

	expect(stub).toBe("[archived a1b2c3d4] bash() status=ok (4 chars, 1 lines) preview: text");
});

test("an empty raw text renders no characters and no preview", () => {
	const stub = buildStub(candidate({ rawText: "" }));

	expect(stub).toBe('[archived a1b2c3d4] bash({"command":"npm test"}) status=ok (0 chars, 1 lines) preview: ');
});

test("two candidates built in sequence each carry their own id, counts and preview", () => {
	const first = buildStub(candidate({ entryId: "00000001", toolName: "read", argsSummary: "{}", rawText: "a\nb" }));
	const second = buildStub(
		candidate({ entryId: "00000002", toolName: "grep", argsSummary: "{}", rawText: "c\nd\ne\nf", isError: true }),
	);

	expect(first).toBe("[archived 00000001] read({}) status=ok (3 chars, 2 lines) preview: a | b");
	expect(second).toBe("[archived 00000002] grep({}) status=error (7 chars, 4 lines) preview: c | d | e");
});

test("every line separator becomes one space", () => {
	for (const separator of ["\r\n", "\r", "\n", "\u2028", "\u2029", "\u0085"]) {
		expect(summarizeSingleLine(`a${separator}b`, 100)).toBe("a b");
	}
});

test("a separator sitting exactly at the cut boundary becomes a space inside the limit", () => {
	for (const separator of ["\r\n", "\r", "\n", "\u2028", "\u2029", "\u0085"]) {
		expect(summarizeSingleLine(`${"a".repeat(119)}${separator}b`, 120)).toBe(`${"a".repeat(119)} `);
	}
});

test("text already within the limit is returned unchanged", () => {
	expect(summarizeSingleLine("no breaks here", 14)).toBe("no breaks here");
});

test("text longer than the limit is cut at the limit", () => {
	expect(summarizeSingleLine("abcdef", 3)).toBe("abc");
});

test("a cut that would split a surrogate pair lands before it", () => {
	expect(summarizeSingleLine(`${"a".repeat(179)}🚀`, 180)).toBe("a".repeat(179));
});

test("a limit of zero returns an empty string", () => {
	expect(summarizeSingleLine("abc", 0)).toBe("");
});

test("a lone surrogate in the input is made well-formed", () => {
	expect(summarizeSingleLine("a\uD800b", 10)).toBe("a\uFFFDb");
});
