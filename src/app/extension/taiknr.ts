import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { createSessionConfig } from "../../config/session-config.js";
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
import { createGatedPi } from "./handler-gate.js";

/**
 * Taiknr Pi extension entry point.
 * Wires config, session state, adapters, use cases, and Pi lifecycle handlers.
 */
export default function taiknr(pi: ExtensionAPI): void {
	const session = createSessionConfig();
	const gatedPi = createGatedPi(pi, session);
	const store = new InMemoryArchiveStore();
	const argsByCallId = new Map<string, string>();
	const pendingOutputs: ArchivedToolOutput[] = [];
	const originalContentByEntryId = new Map<string, unknown[]>();
	const recallCache: RecallCache = { lastPromptKey: "", lastRecalledIds: [] };

	// Handlers stay thin Pi event bridges; adapters translate Pi DTOs to domain contracts.
	registerSessionStartHandler(pi, store, session);
	registerSessionTreeHandler(gatedPi, store);
	registerSessionCompactHandler(gatedPi, store);
	registerToolCallHandler(gatedPi, argsByCallId);
	registerTurnEndHandler(gatedPi, {
		config: session,
		argsByCallId,
		pendingOutputs,
		originalContentByEntryId,
	});
	registerAgentBeforeSettleHandler(gatedPi, {
		store,
		pendingOutputs,
		originalContentByEntryId,
	});
	registerContextHandler(gatedPi, {
		config: session,
		store,
		notifier: {
			notifyOnce: () => {
				// Bound per-session via createOncePerSessionNotifier(getCtx) inside context handler.
			},
		},
		recallCache,
	});
}
