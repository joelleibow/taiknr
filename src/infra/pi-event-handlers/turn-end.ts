import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import type { SessionConfig } from "../../config/session-config.js";
import type { ArchivedToolOutput } from "../../domain/archived-output.js";

export function registerTurnEndHandler(
	_pi: ExtensionAPI,
	_deps: {
		config: SessionConfig;
		argsByCallId: ReadonlyMap<string, string>;
		pendingOutputs: ArchivedToolOutput[];
		originalContentByEntryId: Map<string, unknown[]>;
	},
): void {
	_pi.on("turn_end", () => {});
}
