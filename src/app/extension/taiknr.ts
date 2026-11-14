import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { DEFAULT_TAIKNR_CONFIG } from "../../config/taiknr-config.js";
import type { ArchivedToolOutput } from "../../domain/archived-output.js";
import { InMemoryArchiveStore } from "../../infra/adapters/pi-archive-adapter.js";
import { registerAgentBeforeSettleHandler } from "../../infra/pi-event-handlers/agent-before-settle.js";
import { registerContextHandler } from "../../infra/pi-event-handlers/context.js";
import { registerSessionCompactHandler } from "../../infra/pi-event-handlers/session-compact.js";
import { registerSessionStartHandler } from "../../infra/pi-event-handlers/session-start.js";
import { registerSessionTreeHandler } from "../../infra/pi-event-handlers/session-tree.js";
import { registerToolCallHandler } from "../../infra/pi-event-handlers/tool-call.js";
import { registerTurnEndHandler } from "../../infra/pi-event-handlers/turn-end.js";
import type { RecallCache } from "../../use-cases/recall-relevant-context.js";

/**
 * Taiknr Pi extension entry point.
 * Wires config, session state, adapters, use cases, and Pi lifecycle handlers.
 */
export default function taiknr(pi: ExtensionAPI): void {
	const config = DEFAULT_TAIKNR_CONFIG;
	const store = new InMemoryArchiveStore();
	const argsByCallId = new Map<string, string>();
	const pendingOutputs: ArchivedToolOutput[] = [];
	const originalContentByEntryId = new Map<string, unknown[]>();
	const recallCache: RecallCache = { lastPromptKey: "", lastRecalledIds: [] };

	// Handlers stay thin Pi event bridges; adapters translate Pi DTOs to domain contracts.
	registerSessionStartHandler(pi, store);
	registerSessionTreeHandler(pi, store);
	registerSessionCompactHandler(pi, store);
	registerToolCallHandler(pi, argsByCallId);
	registerTurnEndHandler(pi, {
		config,
		argsByCallId,
		pendingOutputs,
		originalContentByEntryId,
	});
	registerAgentBeforeSettleHandler(pi, {
		store,
		pendingOutputs,
		originalContentByEntryId,
	});
	registerContextHandler(pi, {
		config,
		store,
		notifier: {
			notifyOnce: () => {
				// Bound per-session via createOncePerSessionNotifier(getCtx) inside context handler.
			},
		},
		recallCache,
	});
}
