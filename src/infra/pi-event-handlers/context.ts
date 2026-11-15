import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import type { SessionConfig } from "../../config/session-config.js";
import type { ArchiveStore, FailureNotifier } from "../../use-cases/ports.js";
import type { RecallCache } from "../../use-cases/recall-relevant-context.js";

export function registerContextHandler(
	_pi: ExtensionAPI,
	_deps: {
		config: SessionConfig;
		store: ArchiveStore;
		notifier: FailureNotifier;
		recallCache: RecallCache;
	},
): void {
	_pi.on("context", () => {});
}
