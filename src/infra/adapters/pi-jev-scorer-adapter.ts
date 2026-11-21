import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import type { TaiknrConfig } from "../../config/taiknr-config.js";
import type { RelevanceScore } from "../../domain/recall.js";
import type { ClassifierObserver } from "../../use-cases/instruments-publisher.js";
import type { RelevanceScorer } from "../../use-cases/ports.js";
import { type JevScoringChunk, packChunks, taskText } from "./jev-scoring-request.js";

const NO_MODEL = "the classifier model is not in pi's model catalog";
const NO_MESSAGE = "the classifier call failed with no error message";
const DEADLINE = "the scoring's deadline passed before every chunk was sent";

/** At most this many chunk calls in flight at once (decision 6). */
const CAP = 8;

/** The finished notice the adapter builds, exactly as decision 7 templates it. */
function notice(config: TaiknrConfig, reason: string, field: string): string {
	return `taiknr: recall did not score this prompt — ${reason}. provider=${config.defaultDecisionModelProvider} model=${config.defaultDecisionModel} field=${field}. Fix that field in pi-taiknr.json, then run /reload.`;
}

/** The reason a chunk's answer cannot be used, or `undefined` when it can. */
function answerProblem(answer: unknown, id: string): string | undefined {
	if (answer === undefined) return `the classifier returned no answer for ${id}`;
	const { type, probability } = answer as { type?: unknown; probability?: unknown };
	if (type !== "bool") return `the classifier's answer for ${id} is not a bool`;
	if (typeof probability !== "number" || !Number.isFinite(probability) || probability < 0 || probability > 1) {
		return `the classifier's probability for ${id} is not a number from 0 to 1`;
	}
	return undefined;
}

/**
 * Translate a plain-data scoring request into Pi classifier calls: one chunk per request under the
 * byte budget, at most eight in flight, one deadline, and the answers merged by id. The observer
 * hears one start and one end per scoring.
 */
export function createPiJevScorerAdapter(
	ctx: ExtensionContext,
	config: TaiknrConfig,
	observer?: ClassifierObserver,
): RelevanceScorer {
	return {
		async score(request, _signal?: AbortSignal): Promise<RelevanceScore[] | undefined> {
			// The catalog lookup is the one place the configured pair is resolved: no other model is asked.
			const model = ctx.modelRegistry.findOfType(
				"classifier",
				config.defaultDecisionModelProvider,
				config.defaultDecisionModel,
			);
			if (model === undefined) {
				throw new Error(notice(config, NO_MODEL, "defaultDecisionModelProvider/defaultDecisionModel"));
			}

			const { chunks } = packChunks(taskText(request.promptText, request.summary), request.items);
			if (chunks.length === 0) return [];

			const ids = request.items.map(({ id }) => id);
			const started = Date.now();
			const controller = new AbortController();
			const signal = ctx.signal === undefined ? controller.signal : AbortSignal.any([ctx.signal, controller.signal]);
			const cancelled = () => ctx.signal?.aborted === true;
			const probabilities = new Map<string, number>();
			let spend = 0;
			let sawSpend = false;
			let failure: string | undefined;

			observer?.started(ids.length);

			const runChunk = async (chunk: JevScoringChunk): Promise<void> => {
				const remaining = config.classifierTimeoutMs - (Date.now() - started);
				if (remaining <= 0) {
					failure ??= notice(config, DEADLINE, "classifierTimeoutMs");
					return;
				}
				const result = await ctx.modelRegistry.classify(model, chunk, {
					signal,
					timeoutMs: remaining,
					maxRetries: 0,
				});
				if (result.usage !== undefined) {
					spend += result.usage.cost.total;
					sawSpend = true;
				}
				// A caller's cancel and the adapter's own abort both arrive as an aborted result; the
				// caller's cancel is read from `ctx.signal` after every started call settles.
				if (result.stopReason === "aborted") return;
				if (result.stopReason !== "stop") {
					const reason =
						result.errorMessage === undefined || result.errorMessage.length === 0 ? NO_MESSAGE : result.errorMessage;
					const elapsed = Date.now() - started;
					const field =
						elapsed >= config.classifierTimeoutMs - 1 ? "classifierTimeoutMs" : "defaultDecisionModelProvider";
					failure ??= notice(config, reason, field);
					controller.abort();
					return;
				}
				const asked = Object.keys(chunk.questions);
				for (const id of asked) {
					const problem = answerProblem(result.answers[id], id);
					if (problem !== undefined) {
						failure ??= notice(config, problem, "defaultDecisionModel");
						controller.abort();
						return;
					}
				}
				for (const id of asked) {
					probabilities.set(id, (result.answers[id] as { probability: number }).probability);
				}
			};

			let next = 0;
			const worker = async (): Promise<void> => {
				while (failure === undefined && !cancelled() && next < chunks.length) {
					const chunk = chunks[next];
					next += 1;
					await runChunk(chunk);
				}
			};
			await Promise.all(Array.from({ length: Math.min(CAP, chunks.length) }, worker));

			// Immediately after every started call settles and before every exit: one point covers all of them.
			observer?.finished(sawSpend ? { costTotal: spend } : undefined);

			// A caller's cancel wins: nothing recalled, no notice, and no partial merge.
			if (cancelled()) return undefined;
			if (failure !== undefined) throw new Error(failure);

			return ids.flatMap((id) => {
				const probability = probabilities.get(id);
				return probability === undefined ? [] : [{ id, probability }];
			});
		},
	};
}
