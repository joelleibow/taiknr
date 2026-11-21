import type { ConversationSummaryState } from "../../use-cases/ports.js";

/**
 * One session's summary: `{ key, text }` where the key is the entry id the summary was written for.
 * A newer write aborts the older one and replaces it, an older completion never replaces a newer one,
 * and shutdown aborts the write in flight. The state is per factory call, so nothing is persisted.
 */
export function createConversationSummaryState(): ConversationSummaryState {
	let stored: { key: string; text: string } | undefined;
	let inFlight: AbortController | undefined;
	let closed = false;
	// Every write takes a ticket; only the newest ticket's completion may store.
	let newest = 0;

	return {
		current: () => stored,

		async write(key, produce) {
			inFlight?.abort();
			const controller = new AbortController();
			inFlight = controller;
			const ticket = ++newest;
			let text: string | undefined;
			try {
				text = await produce(controller.signal);
			} catch {
				// A rejecting producer leaves no summary and never rejects this write.
				text = undefined;
			}
			if (closed || ticket !== newest || text === undefined) return;
			stored = { key, text };
		},

		shutdown() {
			closed = true;
			inFlight?.abort();
		},
	};
}
