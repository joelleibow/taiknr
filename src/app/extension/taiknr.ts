import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { createSessionConfig } from "../../config/session-config.js";
import type { ArchivedToolOutput } from "../../domain/archived-output.js";
import { InMemoryArchiveStore } from "../../infra/adapters/pi-archive-adapter.js";
import { registerAgentBeforeSettleHandler } from "../../infra/pi-event-handlers/agent-before-settle.js";
import { registerBeforeProviderRequestHandler } from "../../infra/pi-event-handlers/before-provider-request.js";
import { registerContextHandler } from "../../infra/pi-event-handlers/context.js";
import { registerConversationSummarySettledHandler } from "../../infra/pi-event-handlers/conversation-summary-settled.js";
import { registerConversationSummaryShutdownHandler } from "../../infra/pi-event-handlers/conversation-summary-shutdown.js";
import { registerInstrumentsCompactHandler } from "../../infra/pi-event-handlers/instruments-compact.js";
import { registerInstrumentsRequestHandler } from "../../infra/pi-event-handlers/instruments-request.js";
import { registerInstrumentsResponseHandler } from "../../infra/pi-event-handlers/instruments-response.js";
import { registerInstrumentsSessionStartHandler } from "../../infra/pi-event-handlers/instruments-session-start.js";
import { registerInstrumentsSettledHandler } from "../../infra/pi-event-handlers/instruments-settled.js";
import { registerInstrumentsTreeHandler } from "../../infra/pi-event-handlers/instruments-tree.js";
import { registerPayloadCacheCommitHandler } from "../../infra/pi-event-handlers/payload-cache-commit.js";
import { registerSessionCompactHandler } from "../../infra/pi-event-handlers/session-compact.js";
import { registerSessionStartHandler } from "../../infra/pi-event-handlers/session-start.js";
import { registerSessionTreeHandler } from "../../infra/pi-event-handlers/session-tree.js";
import { registerToolCallHandler } from "../../infra/pi-event-handlers/tool-call.js";
import { registerTurnEndHandler } from "../../infra/pi-event-handlers/turn-end.js";
import type { PayloadCacheState } from "../../use-cases/payload-cache.js";
import type { RecallCache } from "../../use-cases/recall-relevant-context.js";
import { createConversationSummaryState } from "./conversation-summary-state.js";
import { createGatedPi } from "./handler-gate.js";
import { createInstrumentsHolder } from "./instruments-holder.js";

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
	const summary = createConversationSummaryState();
	const payloadCache: PayloadCacheState = { recallBlock: null, carrier: null, nextCarrier: null, applied: null };
	const holder = createInstrumentsHolder();

	// Handlers stay thin Pi event bridges; adapters translate Pi DTOs to domain contracts. Each
	// publishing registrar follows the registrar whose outcome it reads, because pi runs one event's
	// handlers in registration order.
	registerSessionStartHandler(pi, store, session);
	registerInstrumentsSessionStartHandler(gatedPi, { config: session, store, holder });
	registerSessionTreeHandler(gatedPi, store);
	registerInstrumentsTreeHandler(gatedPi, holder);
	registerSessionCompactHandler(gatedPi, store);
	registerInstrumentsCompactHandler(gatedPi, holder);
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
	registerContextHandler(gatedPi, { config: session, store, recallCache, holder, payloadCache, summary });
	registerBeforeProviderRequestHandler(gatedPi, payloadCache);
	registerPayloadCacheCommitHandler(gatedPi, payloadCache);
	registerInstrumentsRequestHandler(gatedPi, holder);
	registerInstrumentsResponseHandler(gatedPi, holder, payloadCache);
	registerInstrumentsSettledHandler(gatedPi, holder);
	registerConversationSummarySettledHandler(gatedPi, { config: session, summary, holder });
	registerConversationSummaryShutdownHandler(gatedPi, summary);
}
