import { expect, test } from "vitest";
import { buildStub, type ToolOutputCandidate } from "../../src/domain/archived-output.js";
import { stageToolOutputs } from "../../src/use-cases/stage-tool-outputs.js";

/** A candidate carrying `length` characters of text, whose other fields a case rarely cares about. */
function candidate(length: number, overrides: Partial<ToolOutputCandidate> = {}): ToolOutputCandidate {
	return {
		entryId: "a1b2c3d4",
		toolCallId: "call-1",
		toolName: "bash",
		argsSummary: '{"command":"npm test"}',
		rawText: "x".repeat(length),
		isError: false,
		...overrides,
	};
}

test("a candidate exactly at the threshold is staged", () => {
	const staged = stageToolOutputs({ candidates: [candidate(600)], minCharsToArchive: 600 });

	expect(staged.map(({ id }) => id)).toEqual(["a1b2c3d4"]);
});

test("a candidate one character below the threshold is not staged", () => {
	const staged = stageToolOutputs({ candidates: [candidate(599)], minCharsToArchive: 600 });

	expect(staged).toEqual([]);
});

test("a zero threshold stages one character of text and not an empty result", () => {
	const staged = stageToolOutputs({
		candidates: [candidate(1, { entryId: "one" }), candidate(0, { entryId: "empty" })],
		minCharsToArchive: 0,
	});

	expect(staged.map(({ id }) => id)).toEqual(["one"]);
});

test("whitespace-only text is staged because text is measured and never trimmed", () => {
	const staged = stageToolOutputs({ candidates: [candidate(0, { rawText: "   " })], minCharsToArchive: 3 });

	expect(staged.map(({ rawText }) => rawText)).toEqual(["   "]);
});

test("no candidates stage to nothing", () => {
	expect(stageToolOutputs({ candidates: [], minCharsToArchive: 0 })).toEqual([]);
});

test("a staged item carries the candidate's fields verbatim, its own id included", () => {
	const staged = [
		candidate(700, { entryId: "0123456789abcdef0123456789abcdef0123", isError: true, argsSummary: '{"a":1}' }),
	];

	const [item] = stageToolOutputs({ candidates: staged, minCharsToArchive: 600 });

	expect(item).toEqual({
		id: "0123456789abcdef0123456789abcdef0123",
		toolName: "bash",
		argsSummary: '{"a":1}',
		isError: true,
		stub: buildStub(staged[0]),
		rawText: "x".repeat(700),
	});
});

test("a 36-character entry id is carried whole", () => {
	const id = "01234567-89ab-cdef-0123-456789abcdef";

	const [item] = stageToolOutputs({ candidates: [candidate(1, { entryId: id })], minCharsToArchive: 0 });

	expect(item.id).toBe(id);
});

test("the input array is neither mutated nor shortened", () => {
	const candidates = [candidate(700, { entryId: "kept" }), candidate(1, { entryId: "dropped" })];

	stageToolOutputs({ candidates, minCharsToArchive: 600 });

	expect(candidates).toHaveLength(2);
	expect(candidates.map(({ entryId }) => entryId)).toEqual(["kept", "dropped"]);
});

test("a staged and an unstaged candidate yield only the staged one, in input order", () => {
	const candidates = [
		candidate(700, { entryId: "first" }),
		candidate(10, { entryId: "skipped" }),
		candidate(800, { entryId: "second" }),
	];

	const staged = stageToolOutputs({ candidates, minCharsToArchive: 600 });

	expect(staged.map(({ id }) => id)).toEqual(["first", "second"]);
});
