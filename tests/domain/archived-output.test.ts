import { expect, test } from "vitest";
import {
	buildStub,
	cutToUnits,
	excerptOf,
	shouldArchive,
	summarizeArguments,
	summarizeSingleLine,
	type ToolOutputCandidate,
	tailStartOf,
} from "../../src/domain/archived-output.js";
import { formatRecalledContext } from "../../src/domain/recall.js";

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

test("buildStub carries the same 40/…/79 argument summary the boundary and the recall header render", () => {
	const stub = buildStub(candidate({ rawText: "text", argsSummary: "x".repeat(121) }));
	expect(stub).toContain(`(${"x".repeat(40)}…${"x".repeat(79)})`);

	const argument = Array.from({ length: 200 }, (_, index) => String.fromCharCode(97 + (index % 26))).join("");
	const summary = summarizeArguments(argument);
	expect(buildStub(candidate({ rawText: "text", argsSummary: summary }))).toContain(`(${summary})`);
	expect(
		formatRecalledContext([{ id: "a1b2c3d4", toolName: "bash", argsSummary: summary, rawText: "text" }]),
	).toContain(`args ${summary}]`);
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

test("a cut whose boundary falls inside a surrogate pair ends before the pair", () => {
	expect(cutToUnits(`${"a".repeat(179)}🚀c`, 180)).toBe("a".repeat(179));
});

test("a cut at or past the end leaves the text whole", () => {
	expect(cutToUnits("abc", 3)).toBe("abc");
	expect(cutToUnits("abc", 10)).toBe("abc");
});

test("a tail start on a pair's low half moves one unit earlier", () => {
	expect(tailStartOf("a😀b", 2)).toBe(1);
});

test("a tail start at zero or at the end is unchanged", () => {
	expect(tailStartOf("a😀b", 0)).toBe(0);
	expect(tailStartOf("a😀b", "a😀b".length)).toBe("a😀b".length);
});

test("an argument summary of 120 units or fewer stays whole with no ellipsis", () => {
	expect(summarizeArguments("a".repeat(120))).toBe("a".repeat(120));
	expect(summarizeArguments("short")).toBe("short");
});

test("a longer argument is its first 40 units, an ellipsis and its last 79", () => {
	const argument = `${"h".repeat(40)}${"m".repeat(60)}${"t".repeat(79)}`;

	const summary = summarizeArguments(argument);

	expect(summary).toBe(`${"h".repeat(40)}…${"t".repeat(79)}`);
	expect(summary.length).toBe(120);
});

test("line separators become spaces before the argument is cut", () => {
	expect(summarizeArguments("a\r\nb\rc\nd\u2028e\u2029f\u0085g")).toBe("a b c d e f g");
});

test("a 40-unit head never ends inside a surrogate pair", () => {
	const summary = summarizeArguments(`${"a".repeat(39)}🚀${"b".repeat(200)}`);

	expect(summary.startsWith(`${"a".repeat(39)}…`)).toBe(true);
	expect(summary.isWellFormed()).toBe(true);
});

test("a 79-unit tail never starts inside a surrogate pair, and the summary never exceeds 120 units", () => {
	const summary = summarizeArguments(`${"a".repeat(200)}🚀${"b".repeat(78)}`);

	expect(summary.endsWith(`…🚀${"b".repeat(78)}`)).toBe(true);
	expect(summary.length).toBeLessThanOrEqual(120);
	expect(summary.isWellFormed()).toBe(true);
});

test("a 40,000-unit output's excerpt is its first 600 units", () => {
	expect(excerptOf("z".repeat(40_000))).toBe("z".repeat(600));
});

test("the multi-line wrapper is stripped before the excerpt's 600 units", () => {
	const raw = `Script completed\nWall time 1.2s\nOutput:\n${"z".repeat(1000)}`;

	expect(excerptOf(raw)).toBe("z".repeat(600));
});

test("the wrapper's whitespace run goes with it", () => {
	const raw = "Script completed\nWall time 1.2s\nOutput:\n\n\n  keep me";

	expect(excerptOf(raw)).toBe("keep me");
});

test("a pair at unit 600 ends the excerpt before it", () => {
	const raw = `${"a".repeat(599)}🚀tail`;

	const excerpt = excerptOf(raw);

	expect(excerpt).toBe("a".repeat(599));
	expect(excerpt.isWellFormed()).toBe(true);
});

test("no raw text makes an empty excerpt", () => {
	expect(excerptOf("")).toBe("");
});

test("a 40-unit output is its own excerpt", () => {
	expect(excerptOf("a".repeat(40))).toBe("a".repeat(40));
});

test("a raw text that is only the wrapper makes an empty excerpt", () => {
	expect(excerptOf("Script completed\nWall time 1.2s\nOutput:\n")).toBe("");
});

test("an incomplete wrapper is left alone", () => {
	const raw = "Script completed\nWall time 1.2s\nno output line";

	expect(excerptOf(raw)).toBe(raw);
});

test("the pipe form of the wrapper is never stripped", () => {
	const raw = "Script completed | Wall time 1.2s | Output: keep me";

	expect(excerptOf(raw)).toBe(raw);
});
