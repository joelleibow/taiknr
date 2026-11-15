import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import type { SessionConfig } from "../../config/session-config.js";
import type { ArchivedToolOutput } from "../../domain/archived-output.js";
import { stageToolOutputs } from "../../use-cases/stage-tool-outputs.js";
import { toToolOutputCandidates } from "../adapters/pi-archive-adapter.js";

export function registerTurnEndHandler(
	pi: ExtensionAPI,
	deps: {
		config: SessionConfig;
		argsByCallId: ReadonlyMap<string, string>;
		pendingOutputs: ArchivedToolOutput[];
		originalContentByEntryId: Map<string, unknown[]>;
	},
): void {
	pi.on("turn_end", (event) => {
		const state = deps.config.state;
		// The gate at the composition root is the whole inertness mechanism for this handler (D4).
		if (state.status !== "ready") return;

		const candidates = toToolOutputCandidates(event, deps.argsByCallId);
		const staged = stageToolOutputs({ candidates, minCharsToArchive: state.config.minCharsToArchive });

		// Every read and every built value is finished before the first mutation below.
		for (const item of staged) {
			const candidate = candidates.findLast(({ entryId }) => entryId === item.id);
			const content = event.toolResults.findLast(({ toolCallId }) => toolCallId === candidate?.toolCallId)?.content;
			deps.originalContentByEntryId.set(item.id, content ?? []);
			deps.pendingOutputs.push(item);
		}
	});
}
