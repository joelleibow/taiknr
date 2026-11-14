import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import type { TaiknrConfig } from "../../config/taiknr-config.js";
import type { ArchiveStore, FailureNotifier } from "../../use-cases/ports.js";
import type { RecallCache } from "../../use-cases/recall-relevant-context.js";

export function registerContextHandler(
	_pi: ExtensionAPI,
	_deps: {
		config: TaiknrConfig;
		store: ArchiveStore;
		notifier: FailureNotifier;
		recallCache: RecallCache;
	},
): void {
	throw new Error("Not implemented: registerContextHandler");
}
