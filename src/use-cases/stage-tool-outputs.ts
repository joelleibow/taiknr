import {
	type ArchivedToolOutput,
	buildStub,
	shouldArchive,
	type ToolOutputCandidate,
} from "../domain/archived-output.js";

export interface StageToolOutputsInput {
	candidates: ToolOutputCandidate[];
	minCharsToArchive: number;
}

/** Filter candidates by size threshold and build deterministic archived records. */
export function stageToolOutputs(input: StageToolOutputsInput): ArchivedToolOutput[] {
	return input.candidates
		.filter(
			(candidate) => candidate.rawText.length > 0 && shouldArchive(candidate.rawText.length, input.minCharsToArchive),
		)
		.map((candidate) => ({
			id: candidate.entryId,
			toolName: candidate.toolName,
			argsSummary: candidate.argsSummary,
			isError: candidate.isError,
			stub: buildStub(candidate),
			rawText: candidate.rawText,
		}));
}
