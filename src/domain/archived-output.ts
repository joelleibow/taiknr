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

// Every line separator a model provider or a terminal treats as a break.
const LINE_SEPARATOR = /\r\n|\r|\n|\u2028|\u2029|\u0085/g;

function isHighSurrogate(unit: number): boolean {
	return unit >= 0xd800 && unit <= 0xdbff;
}

function isLowSurrogate(unit: number): boolean {
	return unit >= 0xdc00 && unit <= 0xdfff;
}

/** The first `limit` UTF-16 code units of `text`, ending one unit early rather than inside a pair. */
export function cutToUnits(text: string, limit: number): string {
	if (text.length <= limit) return text;
	const splitsPair = isHighSurrogate(text.charCodeAt(limit - 1)) && isLowSurrogate(text.charCodeAt(limit));
	return text.slice(0, splitsPair ? limit - 1 : limit);
}

/** The index a cut starting at `start` must use: one unit earlier when `start` is a pair's low half. */
export function tailStartOf(text: string, start: number): number {
	if (start <= 0) return 0;
	return isLowSurrogate(text.charCodeAt(start)) ? start - 1 : start;
}

/**
 * One line of `text` at most `maxUnits` UTF-16 code units long: separators become spaces and a cut
 * never lands inside a surrogate pair (M9).
 */
export function summarizeSingleLine(text: string, maxUnits: number): string {
	return cutToUnits(text.replace(LINE_SEPARATOR, " "), maxUnits).toWellFormed();
}

/** The argument summary's total length, and its tail's length either side of the ellipsis. */
const ARGUMENT_UNITS = 120;
const ARGUMENT_TAIL_UNITS = 79;

/**
 * One line of an argument summary, at most 120 units: a short argument whole, a longer one its first
 * 40 units, an ellipsis and its last 79, so a long path's file name stays visible (design decision 5).
 * A pair at the tail's start makes the tail one unit longer, so the head gives up the unit instead.
 */
export function summarizeArguments(text: string): string {
	const single = text.replace(LINE_SEPARATOR, " ");
	if (single.length <= ARGUMENT_UNITS) return single.toWellFormed();
	const tail = single.slice(tailStartOf(single, single.length - ARGUMENT_TAIL_UNITS));
	const head = cutToUnits(single, ARGUMENT_UNITS - 1 - tail.length);
	return `${head}…${tail}`.toWellFormed();
}

/** The excerpt's length in UTF-16 code units, and the codemode wrapper all 382 measured raw texts share. */
const EXCERPT_UNITS = 600;
const OUTPUT_WRAPPER = /^Script completed\nWall time [^\n]*\nOutput:\s*/;

/** The first 600 units of a raw output, its codemode wrapper stripped and no pair split (design decision 3). */
export function excerptOf(rawText: string): string {
	return cutToUnits(rawText.replace(OUTPUT_WRAPPER, ""), EXCERPT_UNITS).toWellFormed();
}

/** Deterministically build a 1-line stub from a candidate tool output. */
export function buildStub(candidate: ToolOutputCandidate): string {
	const lines = candidate.rawText.split(LINE_SEPARATOR);
	const preview = summarizeSingleLine(lines.slice(0, 3).join(" | "), 180);
	const toolName = summarizeSingleLine(candidate.toolName, 120);
	const argsSummary = summarizeArguments(candidate.argsSummary);
	const status = candidate.isError ? "error" : "ok";
	return `[archived ${candidate.entryId}] ${toolName}(${argsSummary}) status=${status} (${candidate.rawText.length} chars, ${lines.length} lines) preview: ${preview}`;
}
