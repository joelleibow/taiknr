import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import type { ConversationSummaryState } from "../../use-cases/ports.js";

/**
 * Aborts a summary still in flight when the session shuts down, so print mode and subagent runs are
 * not held open by a provider call nobody will read.
 */
export function registerConversationSummaryShutdownHandler(pi: ExtensionAPI, summary: ConversationSummaryState): void {
	pi.on("session_shutdown", () => {
		summary.shutdown();
	});
}
