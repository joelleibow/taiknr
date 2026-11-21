import type { AssistantMessage } from "@earendil-works/pi-ai";

/** The one provider and model the fake's `find` resolves; any other pair resolves `undefined`. */
export const SUMMARIZER_TEST_PROVIDER = "taiknr-summarizer-test";
export const SUMMARIZER_TEST_MODEL = "summarizer-test-model";

/** What the fake answers a call with: a clean text, a 500-shaped error, or a hang until aborted. */
export type SummarizerAnswer = { text: string; costTotal?: number } | "error" | "hang";

export interface SummarizerCall {
	context: unknown;
	options: { signal?: AbortSignal } & Record<string, unknown>;
}

export interface SummarizerFake {
	modelRegistry: { find: unknown; streamSimple: unknown };
	calls: SummarizerCall[];
	answer(next: SummarizerAnswer): void;
}

/** The assistant message a clean answer resolves. */
function cleanMessage(text: string, costTotal: number): AssistantMessage {
	return {
		role: "assistant",
		content: [{ type: "text", text }],
		api: "openai-completions",
		provider: SUMMARIZER_TEST_PROVIDER,
		model: SUMMARIZER_TEST_MODEL,
		usage: {
			input: 0,
			output: 0,
			cacheRead: 0,
			cacheWrite: 0,
			totalTokens: 0,
			cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: costTotal },
		},
		stopReason: "stop",
		timestamp: 0,
	};
}

/** The assistant message an error answer resolves. */
function errorMessage(): AssistantMessage {
	return { ...cleanMessage("", 0), content: [], stopReason: "error", errorMessage: "the summarizer is unavailable" };
}

/**
 * A fake at the `streamSimple` boundary. It records each call's context and options and answers from
 * its script, so a summary-path test never reaches pi's registry or a provider.
 */
export function createSummarizerFake(): SummarizerFake {
	const calls: SummarizerCall[] = [];
	let script: SummarizerAnswer = { text: "Goal: nothing scripted" };

	const modelRegistry = {
		find: (provider: string, model: string) =>
			provider === SUMMARIZER_TEST_PROVIDER && model === SUMMARIZER_TEST_MODEL
				? { provider, id: model, api: "openai-completions" }
				: undefined,
		streamSimple: (_model: unknown, context: unknown, options: SummarizerCall["options"]) => {
			calls.push({ context, options });
			const answered = script;
			const result = (): Promise<AssistantMessage> => {
				if (answered === "hang") {
					return new Promise((resolve) => {
						options.signal?.addEventListener("abort", () => resolve(errorMessage()), { once: true });
					});
				}
				if (answered === "error") return Promise.resolve(errorMessage());
				return Promise.resolve(cleanMessage(answered.text, answered.costTotal ?? 0));
			};
			return { result };
		},
	};

	return {
		modelRegistry,
		calls,
		answer(next) {
			script = next;
		},
	};
}
