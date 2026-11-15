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

// Every line separator a model provider or a terminal treats as a break (Trap 8).
const LINE_SEPARATOR = /\r\n|\r|\n|\u2028|\u2029|\u0085/;
const LINE_SEPARATOR_ALL = /\r\n|\r|\n|\u2028|\u2029|\u0085/g;

function isHighSurrogate(unit: number): boolean {
	return unit >= 0xd800 && unit <= 0xdbff;
}

function isLowSurrogate(unit: number): boolean {
	return unit >= 0xdc00 && unit <= 0xdfff;
}

/**
 * One line of `text` at most `maxUnits` UTF-16 code units long: separators become spaces and a cut
 * never lands inside a surrogate pair (M9).
 */
export function summarizeSingleLine(text: string, maxUnits: number): string {
	const single = text.replace(LINE_SEPARATOR_ALL, " ");
	if (single.length <= maxUnits) return single.toWellFormed();
	const splitsPair = isHighSurrogate(single.charCodeAt(maxUnits - 1)) && isLowSurrogate(single.charCodeAt(maxUnits));
	return single.slice(0, splitsPair ? maxUnits - 1 : maxUnits).toWellFormed();
}

/** Deterministically build a 1-line stub from a candidate tool output. */
export function buildStub(candidate: ToolOutputCandidate): string {
	const lines = candidate.rawText.split(LINE_SEPARATOR);
	const preview = summarizeSingleLine(lines.slice(0, 3).join(" | "), 180);
	const toolName = summarizeSingleLine(candidate.toolName, 120);
	const argsSummary = summarizeSingleLine(candidate.argsSummary, 120);
	const status = candidate.isError ? "error" : "ok";
	return `[archived ${candidate.entryId}] ${toolName}(${argsSummary}) status=${status} (${candidate.rawText.length} chars, ${lines.length} lines) preview: ${preview}`;
}
