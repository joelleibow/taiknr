import {
	type CompactionSettings,
	DEFAULT_COMPACTION_SETTINGS,
	type ExtensionAPI,
	type ExtensionContext,
	estimateTokens,
} from "@earendil-works/pi-coding-agent";
import type { SessionConfig } from "../../config/session-config.js";
import { formatRecalledContext } from "../../domain/recall.js";
import { tokenEstimate } from "../../domain/token-estimate.js";
import type { InstrumentsHolder } from "../../use-cases/instruments-publisher.js";
import type { ArchiveStore } from "../../use-cases/ports.js";
import type { RecallCache } from "../../use-cases/recall-relevant-context.js";
import { recallRelevantContext } from "../../use-cases/recall-relevant-context.js";
import { readEligibleArchivedIds } from "../adapters/pi-archive-adapter.js";
import { appendRecalledContextToMessages, extractLatestUserPrompt } from "../adapters/pi-context-adapter.js";
import { createPiJevScorerAdapter } from "../adapters/pi-jev-scorer-adapter.js";
import { createOncePerSessionNotifier } from "../adapters/pi-notifier-adapter.js";

/** The reserve pi's own threshold uses: the model's override, then the setting, then pi's default. */
function resolveReserveTokens(
	compaction: CompactionSettings | undefined,
	model: { provider: string; id: string } | undefined,
): number {
	// shortcut: pi exposes no resolved reserve accessor, so this repeats the chain settings-manager.js
	// L654-683 applies; it drifts if pi adds a step. Upgrade when pi exposes the resolved value.
	const override = model === undefined ? undefined : compaction?.modelOverrides?.[`${model.provider}/${model.id}`];
	return override?.reserveTokens ?? compaction?.reserveTokens ?? DEFAULT_COMPACTION_SETTINGS.reserveTokens;
}

/**
 * Recall's request bridge: score the archive against the latest user prompt and append what is
 * recalled to that message (design decision 2). Registering on `context_with_system` keeps every
 * system message, the mid-conversation ones included, where the host put it (design decision 1).
 */
export function registerContextHandler(
	pi: ExtensionAPI,
	deps: {
		config: SessionConfig;
		store: ArchiveStore;
		recallCache: RecallCache;
		holder: InstrumentsHolder;
	},
): void {
	// One cell and one notifier per registration, which is one per factory call, so one per session.
	let current: ExtensionContext;
	const notifier = createOncePerSessionNotifier(() => current);

	pi.on("context_with_system", async (event, ctx) => {
		// The cell carries this event's ctx, so a notice reaches the request that failed.
		current = ctx;

		const state = deps.config.state;
		// The gate at the composition root is the whole inertness mechanism for this handler (D3).
		if (state.status !== "ready") return;

		const prompt = extractLatestUserPrompt(event.messages);
		if (prompt === undefined) return;

		// Pi's own window for the routed model, which is the window its limits use (ruling 4).
		const window = ctx.getContextUsage()?.contextWindow;
		if (window === undefined) return;

		const reserve = resolveReserveTokens(pi.getSettings().compaction, ctx.model);
		const estimate = event.messages.reduce((total, message) => total + estimateTokens(message), 0);
		// Pi's own chars/4 rule inverted, so nothing here holds a second tokenizer (ruling 4).
		const budgetCharacters = 4 * (window - reserve - estimate);
		if (budgetCharacters <= 0) return;

		// Every value this request needs is built before the request changes.
		const eligibleIds = readEligibleArchivedIds(ctx.sessionManager.getBranch());
		// The publisher installed for this session observes the call, and is a no-op while the instruments are off.
		const scorer = createPiJevScorerAdapter(ctx, state.config, deps.holder.current());
		const outputs = await recallRelevantContext(
			{
				promptKey: prompt.promptKey,
				promptText: prompt.promptText,
				decisionThreshold: state.config.decisionThreshold,
				signal: ctx.signal,
				budgetCharacters,
				eligibleIds,
			},
			{ store: deps.store, scorer, notifier, cache: deps.recallCache },
		);
		if (outputs.length === 0) return;

		// Measured here, after recall's messages exist, and evaluated by the publisher at the request that follows.
		deps.holder.current().reportRecalled(() => ({ estimate: tokenEstimate(formatRecalledContext(outputs)) }));
		return { messages: appendRecalledContextToMessages(event.messages, prompt.messageIndex, outputs) };
	});
}
