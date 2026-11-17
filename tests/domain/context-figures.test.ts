import { expect, test } from "vitest";
import type { ArchivedToolOutput } from "../../src/domain/archived-output.js";
import {
	archiveEstimates,
	matchStubs,
	posted,
	requestEstimates,
	type StubMatch,
	type ToolResultText,
} from "../../src/domain/context-figures.js";

/** An archived item: its stub is 14 characters (4 tokens) and its raw text is the case's own. */
function item(stub: string, rawText: string): ArchivedToolOutput {
	return { id: stub, toolName: "bash", argsSummary: "", isError: false, stub, rawText };
}

const RAW = item("[archived one]", "x".repeat(400));
const OTHER = item("[archived two]", "y".repeat(1200));

const match = (index: number, archived: ArchivedToolOutput): StubMatch => ({
	index,
	stub: archived.stub,
	rawText: archived.rawText,
});

const result = (index: number, firstText: string): ToolResultText => ({ index, firstText });

test("withheld and stubbed are their texts' estimates and recalled is the block's", () => {
	const estimates = requestEstimates([100], [match(1, RAW)], 3);

	expect(estimates.withheld).toBe(100);
	expect(estimates.stubbed).toBe(4);
	expect(estimates.recalled).toBe(3);
});

test("context in turn is the sum of the request's message estimates", () => {
	expect(requestEstimates([100, 250, 7], [], 0).contextInTurn).toBe(357);
});

test("history before adds the withheld text and takes back the stubs and the block", () => {
	const estimates = requestEstimates([100], [match(1, RAW)], 4);

	expect(estimates.historyBefore).toBe(100 + 100 - 4 - 4);
});

test("the saving is one number in both of its forms", () => {
	const estimates = requestEstimates([100, 50], [match(1, RAW), match(2, OTHER)], 12);

	expect(estimates.saving).toBe(estimates.withheld - estimates.stubbed - estimates.recalled);
	expect(estimates.saving).toBe(estimates.historyBefore - estimates.contextInTurn);
	expect(estimates.saving).toBe(400 - 8 - 12);
});

test("a block larger than the saving publishes a negative saving", () => {
	const estimates = requestEstimates([100], [match(1, RAW)], 120);

	expect(estimates.saving).toBe(100 - 4 - 120);
	expect(estimates.historyBefore).toBe(76);
});

test("a request with no stubs and no block has three zeros and saves nothing", () => {
	const estimates = requestEstimates([100, 20], [], 0);

	expect(estimates.withheld).toBe(0);
	expect(estimates.stubbed).toBe(0);
	expect(estimates.recalled).toBe(0);
	expect(estimates.saving).toBe(0);
	expect(estimates.historyBefore).toBe(120);
});

test("an empty message list estimates nothing", () => {
	const estimates = requestEstimates([], [], 0);

	expect(estimates.contextInTurn).toBe(0);
	expect(estimates.historyBefore).toBe(0);
	expect(estimates.saving).toBe(0);
});

test("a tool result whose first text is a stub matches that item", () => {
	expect(matchStubs([result(2, RAW.stub), result(3, "plain text")], [RAW, OTHER])).toEqual([match(2, RAW)]);
});

test("a first text equal to no stub matches nothing", () => {
	expect(matchStubs([result(1, "nothing archived")], [RAW])).toEqual([]);
});

test("an empty first text matches nothing, and an empty store matches nothing", () => {
	expect(matchStubs([result(1, "")], [RAW])).toEqual([]);
	expect(matchStubs([result(1, RAW.stub)], [])).toEqual([]);
});

test("two items with different stubs each match their own tool result", () => {
	const matches = matchStubs([result(1, RAW.stub), result(2, OTHER.stub)], [RAW, OTHER]);

	expect(matches).toEqual([match(1, RAW), match(2, OTHER)]);
});

test("the archive's totals sum the raw text and the stub text of every item, carried or not", () => {
	expect(archiveEstimates([RAW, OTHER])).toEqual({ withheld: 400, stubbed: 8 });
	expect(archiveEstimates([])).toEqual({ withheld: 0, stubbed: 0 });
});

test("a posted figure is the scaled estimate rounded to a whole token", () => {
	expect(posted(1000, 0.7)).toBe(700);
	expect(posted(3, 0.5)).toBe(2);
	expect(posted(-3, 0.1)).toBe(-0);
	expect(posted(0, 2)).toBe(0);
});
