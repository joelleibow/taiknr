import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import type { SessionConfig } from "../../config/session-config.js";
import type { InstrumentsHolder } from "../../use-cases/instruments-publisher.js";
import type { ConversationSummaryState } from "../../use-cases/ports.js";
import { newestAssistantEntryId } from "../adapters/pi-context-adapter.js";
import { createOncePerSessionNotifier } from "../adapters/pi-notifier-adapter.js";
import { createPiSummarizerAdapter } from "../adapters/pi-summarizer-adapter.js";

/**
 * Writes the session's summary when a run settles. The write is started and not awaited, because pi
 * awaits every `agent_settled` handler and the summary must not hold the settle open. One notifier is
 * created per registration, so one warning per session.
 */
export function registerConversationSummarySettledHandler(
	pi: ExtensionAPI,
	deps: { config: SessionConfig; summary: ConversationSummaryState; holder: InstrumentsHolder },
): void {
	let current: ExtensionContext;
	const notifier = createOncePerSessionNotifier(() => current);

	pi.on("agent_settled", (_event, ctx) => {
		current = ctx;
		const state = deps.config.state;
		if (state.status !== "ready" || !state.config.conversationSummaryEnabled) return;
		const entries = ctx.sessionManager.getBranch();
		const key = newestAssistantEntryId(entries);
		if (key === undefined) return;
		// The holder is read inside the event: `install` replaces the no-op after the factory has run.
		const summarizer = createPiSummarizerAdapter(ctx, state.config, notifier, deps.holder.current());
		void deps.summary.write(key, (signal) => summarizer.summarize(entries, signal)).catch(() => undefined);
	});
}
