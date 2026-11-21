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
import type { PayloadCacheState } from "../../use-cases/payload-cache.js";
import type { ArchiveStore, ConversationSummaryState } from "../../use-cases/ports.js";
import type { RecallCache } from "../../use-cases/recall-relevant-context.js";
import { recallRelevantContext } from "../../use-cases/recall-relevant-context.js";
import { readEligibleArchivedIds } from "../adapters/pi-archive-adapter.js";
import {
	appendRecalledContextToMessages,
	extractLatestUserPrompt,
	newestAssistantEntryId,
} from "../adapters/pi-context-adapter.js";
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
		payloadCache: PayloadCacheState;
		summary: ConversationSummaryState;
	},
): void {
	// One cell and one notifier per registration, which is one per factory call, so one per session.
	let current: ExtensionContext;
	const notifier = createOncePerSessionNotifier(() => current);

	pi.on("context_with_system", async (event, ctx) => {
		// Cell (a) is this request's block and never an earlier request's, so it clears before every
		// return below rather than after the work (D4).
		deps.payloadCache.recallBlock = null;
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
		const branch = ctx.sessionManager.getBranch();
		const eligibleIds = readEligibleArchivedIds(branch);
		// The summary covers the conversation before this request's message, so its key is the newest
		// assistant entry before the last user message. An undefined key on either side never matches.
		const lastUser = branch.findLastIndex((entry) => entry.type === "message" && entry.message.role === "user");
		const key = lastUser === -1 ? undefined : newestAssistantEntryId(branch.slice(0, lastUser));
		const stored = deps.summary.current();
		const summary = key !== undefined && stored?.key === key ? stored.text : undefined;
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
				summary,
			},
			{ store: deps.store, scorer, notifier, cache: deps.recallCache },
		);
		if (outputs.length === 0) return;

		// The exact text recall appends, written where the payload handler reads it: one request's block.
		const block = formatRecalledContext(outputs);
		deps.payloadCache.recallBlock = block;
		// Measured here, after recall's messages exist, and evaluated by the publisher at the request that follows.
		deps.holder.current().reportRecalled(() => ({ estimate: tokenEstimate(block) }));
		return { messages: appendRecalledContextToMessages(event.messages, prompt.messageIndex, outputs) };
	});
}
