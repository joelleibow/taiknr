import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import type { ArchivedToolOutput } from "../../domain/archived-output.js";
import type { ArchiveStore } from "../../use-cases/ports.js";

export function registerAgentBeforeSettleHandler(
	_pi: ExtensionAPI,
	_deps: {
		store: ArchiveStore;
		pendingOutputs: ArchivedToolOutput[];
		originalContentByEntryId: Map<string, unknown[]>;
	},
): void {
	_pi.on("agent_before_settle", () => {});
}
