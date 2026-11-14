import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import type { TaiknrConfig } from "../../config/taiknr-config.js";
import type { RelevanceScore } from "../../domain/recall.js";
import type { RelevanceScorer } from "../../use-cases/ports.js";

/** Translate stubbed archive state into a Pi classifier request via ModelRegistry. */
export function createPiJevScorerAdapter(
	_ctx: ExtensionContext,
	_config: TaiknrConfig,
): RelevanceScorer {
	return {
		async score(
			_promptText: string,
			_archivedStubs: Record<string, string>,
			_signal?: AbortSignal,
		): Promise<RelevanceScore[] | undefined> {
			throw new Error("Not implemented: PiJevScorerAdapter.score");
		},
	};
}
