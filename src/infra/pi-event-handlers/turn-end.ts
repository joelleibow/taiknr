import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import type { TaiknrConfig } from "../../config/taiknr-config.js";
import type { ArchivedToolOutput } from "../../domain/archived-output.js";

export function registerTurnEndHandler(
	_pi: ExtensionAPI,
	_deps: {
		config: TaiknrConfig;
		argsByCallId: ReadonlyMap<string, string>;
		pendingOutputs: ArchivedToolOutput[];
		originalContentByEntryId: Map<string, unknown[]>;
	},
): void {
	throw new Error("Not implemented: registerTurnEndHandler");
}
