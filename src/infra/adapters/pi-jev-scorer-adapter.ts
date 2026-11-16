import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import type { TaiknrConfig } from "../../config/taiknr-config.js";
import type { RelevanceScore } from "../../domain/recall.js";
import type { RelevanceScorer } from "../../use-cases/ports.js";

const NO_MODEL = "the classifier model is not in pi's model catalog";
const NO_MESSAGE = "the classifier call failed with no error message";

const CRITERIA = {
	true: "The archived output's content is something the latest message asks for, refers to, or is answered by.",
	false: "The archived output does not bear on the latest message.",
};

/** Decision 6's question, with the item's whole id interpolated verbatim (ADR 0006). */
function instructionsFor(id: string): string {
	return `The user's latest message is in \`userPrompt\`. \`archivedToolOutputs[${id}]\` is a one-line stub of a tool output from earlier in the same session whose full text was removed from the conversation. Would returning that output's full text help answer the user's latest message?`;
}

/** The finished notice the caller shows the user: the reason, what was asked for, and the field to fix. */
function notice(config: TaiknrConfig, reason: string, field: string): string {
	return `taiknr: recall did not score this prompt — ${reason}. provider=${config.defaultDecisionModelProvider} model=${config.defaultDecisionModel} field=${field}. Fix that field in pi-taiknr.json, then run /reload or start a new session.`;
}

/** Translate stubbed archive state into a Pi classifier request via ModelRegistry. */
export function createPiJevScorerAdapter(ctx: ExtensionContext, config: TaiknrConfig): RelevanceScorer {
	return {
		async score(
			promptText: string,
			archivedStubs: Record<string, string>,
			_signal?: AbortSignal,
		): Promise<RelevanceScore[] | undefined> {
			// The catalog lookup is the one place the configured pair is resolved: no other model is tried.
			const model = ctx.modelRegistry.findOfType(
				"classifier",
				config.defaultDecisionModelProvider,
				config.defaultDecisionModel,
			);
			if (model === undefined) {
				throw new Error(notice(config, NO_MODEL, "defaultDecisionModelProvider/defaultDecisionModel"));
			}

			const ids = Object.keys(archivedStubs);
			const questions = Object.fromEntries(
				ids.map((id) => [id, { type: "bool" as const, instructions: instructionsFor(id), criteria: CRITERIA }]),
			);

			const started = Date.now();
			const result = await ctx.modelRegistry.classify(
				model,
				{ state: { userPrompt: promptText, archivedToolOutputs: archivedStubs }, questions },
				{
					// The event's own signal, which is the only one that tells a user's cancel from a timeout.
					signal: ctx.signal,
					timeoutMs: config.classifierTimeoutMs,
					// Required: pi's default of two retries would run them all inside the same bound.
					maxRetries: 0,
				},
			);
			const elapsed = Date.now() - started;

			if (result.stopReason === "aborted") return undefined;
			if (result.stopReason !== "stop") {
				const reason =
					result.errorMessage === undefined || result.errorMessage.length === 0 ? NO_MESSAGE : result.errorMessage;
				// Each clock counts whole milliseconds, so a timeout may read one short of the bound.
				const field =
					elapsed >= config.classifierTimeoutMs - 1 ? "classifierTimeoutMs" : "defaultDecisionModelProvider";
				throw new Error(notice(config, reason, field));
			}

			const scores: RelevanceScore[] = [];
			for (const id of ids) {
				const answer = result.answers[id];
				if (answer === undefined)
					throw new Error(notice(config, `the classifier returned no answer for ${id}`, "defaultDecisionModel"));
				if (answer.type !== "bool")
					throw new Error(notice(config, `the classifier's answer for ${id} is not a bool`, "defaultDecisionModel"));
				const { probability } = answer;
				if (!Number.isFinite(probability) || probability < 0 || probability > 1) {
					throw new Error(
						notice(
							config,
							`the classifier's probability for ${id} is not a number from 0 to 1`,
							"defaultDecisionModel",
						),
					);
				}
				scores.push({ id, probability });
			}
			return scores;
		},
	};
}
