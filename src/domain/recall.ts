export interface RelevanceScore {
	id: string;
	probability: number;
}

export interface RecalledOutput {
	id: string;
	toolName: string;
	argsSummary: string;
	rawText: string;
}

export function selectRecalledIds(scores: RelevanceScore[], decisionThreshold: number): string[] {
	return scores.filter((s) => s.probability >= decisionThreshold).map((s) => s.id);
}

/** Format recalled outputs into the tail <recalled_context> block. */
export function formatRecalledContext(_outputs: RecalledOutput[]): string {
	throw new Error("Not implemented: formatRecalledContext");
}
