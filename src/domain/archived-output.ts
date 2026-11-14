export interface ToolOutputCandidate {
	entryId: string;
	toolCallId: string;
	toolName: string;
	argsSummary: string;
	rawText: string;
	isError: boolean;
}

export interface ArchivedToolOutput {
	id: string;
	toolName: string;
	argsSummary: string;
	isError: boolean;
	stub: string;
	rawText: string;
}

export function shouldArchive(rawTextLength: number, minCharsToArchive: number): boolean {
	return rawTextLength >= minCharsToArchive;
}

/** Deterministically build a 1-line stub from a candidate tool output. */
export function buildStub(_candidate: ToolOutputCandidate): string {
	throw new Error("Not implemented: buildStub");
}
