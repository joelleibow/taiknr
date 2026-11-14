import type { ArchivedToolOutput, ToolOutputCandidate } from "../domain/archived-output.js";

export interface StageToolOutputsInput {
	candidates: ToolOutputCandidate[];
	minCharsToArchive: number;
}

/** Filter candidates by size threshold and build deterministic archived records. */
export function stageToolOutputs(_input: StageToolOutputsInput): ArchivedToolOutput[] {
	throw new Error("Not implemented: stageToolOutputs");
}
