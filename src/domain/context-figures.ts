import type { ArchivedToolOutput } from "./archived-output.js";
import { tokenEstimate } from "./token-estimate.js";

/** One tool result in a request: its position in the returned list and its first block's text. */
export interface ToolResultText {
	index: number;
	firstText: string;
}

/** A tool result whose text is an archived item's stub, with the raw text that stub stands for. */
export interface StubMatch {
	index: number;
	stub: string;
	rawText: string;
}

/** One request's six figures, unscaled: k is applied by the publisher (design D7). */
export interface RequestEstimates {
	contextInTurn: number;
	withheld: number;
	stubbed: number;
	recalled: number;
	historyBefore: number;
	saving: number;
}

/**
 * Match each tool result's first text against the store's stubs, which are unique because each
 * begins with its own entry id (design D8), so one lookup per result is enough.
 */
export function matchStubs(toolResults: readonly ToolResultText[], items: readonly ArchivedToolOutput[]): StubMatch[] {
	const byStub = new Map(items.map((item) => [item.stub, item]));
	const matches: StubMatch[] = [];
	for (const result of toolResults) {
		const item = byStub.get(result.firstText);
		if (item !== undefined) matches.push({ index: result.index, stub: item.stub, rawText: item.rawText });
	}
	return matches;
}

/**
 * The request's figures as plain estimates. History before is defined as the arithmetic rather
 * than rebuilt, which is what makes `historyBefore − contextInTurn = saving` exact (design D7).
 */
export function requestEstimates(
	messageEstimates: readonly number[],
	matches: readonly StubMatch[],
	recalled: number,
): RequestEstimates {
	const contextInTurn = messageEstimates.reduce((total, estimate) => total + estimate, 0);
	const withheld = matches.reduce((total, match) => total + tokenEstimate(match.rawText), 0);
	const stubbed = matches.reduce((total, match) => total + tokenEstimate(match.stub), 0);
	const saving = withheld - stubbed - recalled;
	return { contextInTurn, withheld, stubbed, recalled, historyBefore: contextInTurn + saving, saving };
}

/** The archive's two sizes: every item's raw text and the stub that stands in for it. */
export function archiveEstimates(items: readonly ArchivedToolOutput[]): { withheld: number; stubbed: number } {
	return {
		withheld: items.reduce((total, item) => total + tokenEstimate(item.rawText), 0),
		stubbed: items.reduce((total, item) => total + tokenEstimate(item.stub), 0),
	};
}

/** A published token figure: the estimate times k, rounded, so a repeated value repaints nothing. */
export function posted(estimate: number, k: number): number {
	return Math.round(k * estimate);
}
