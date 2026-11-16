import { writeFileSync } from "node:fs";
import { join } from "node:path";
// shortcut: `@earendil-works/pi-ai` is not a declared dependency; it is hoisted through
// `@earendil-works/pi-coding-agent` in the committed lockfile (package-lock.json:667), tests only (M10).
import { classify } from "@earendil-works/pi-ai/api/typesafe-system-one";
import type { ExtensionAPI, ProviderConfig } from "@earendil-works/pi-coding-agent";
import { vi } from "vitest";
import { CONFIG_FILE_NAME } from "../../src/config/taiknr-config.js";

/** The provider the suite registers its own classifier under; never a second `openrouter`. */
export const TEST_CLASSIFIER_PROVIDER = "taiknr-test";

/** The classifier model that provider offers. */
export const TEST_CLASSIFIER_MODEL = "jev-test";

/**
 * That provider: pi-ai's own System One transport under a local base URL, a literal key, and the one
 * classifier model the suite asks about.
 */
export const TEST_CLASSIFIER_PROVIDER_CONFIG: ProviderConfig = {
	apiKey: "taiknr-test-key",
	baseUrl: "http://127.0.0.1:9/v1",
	models: [
		{
			type: "classifier",
			id: TEST_CLASSIFIER_MODEL,
			name: "Jev Test",
			api: "typesafe-system-one",
			input: ["text"],
			cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
			contextWindow: 262144,
		},
	],
	classifiers: { "typesafe-system-one": { classify } },
};

/** How the stubbed wire answers: a probability per asked id, or a call that hangs until aborted. */
export type ClassifierAnswers = "hang" | ((ids: string[]) => Record<string, number>);

/** One request the stub answered, as the provider would have received it. */
export interface RecordedClassifierRequest {
	url: string;
	body: { model: string; state: Record<string, unknown>; questions: Record<string, { type: string }> };
}

export interface ClassifierGuard {
	requests: RecordedClassifierRequest[];
	/** Script the answers the next call gets; the default answers `0`, the scripted "no". */
	answer(next: ClassifierAnswers): void;
}

/** The scripted "no": every asked id answers probability 0. */
const NO: ClassifierAnswers = (ids) => Object.fromEntries(ids.map((id) => [id, 0]));

/** The System One answer body for `ids`: the wire type is `noul`, and an omitted id gets no answer. */
function answerBody(answers: Exclude<ClassifierAnswers, "hang">, ids: string[]): string {
	const wire = Object.fromEntries(
		Object.entries(answers(ids)).map(([id, probability]) => [id, { type: "noul", noul: probability }]),
	);
	return JSON.stringify({ answers: wire });
}

/** A call that never answers, rejecting only once the caller's own signal aborts. */
function hangUntilAborted(signal: AbortSignal | null | undefined): Promise<Response> {
	return new Promise((_resolve, reject) => {
		signal?.addEventListener("abort", () => reject(new Error("the classifier call was aborted")), { once: true });
	});
}

/**
 * Keep the suite off the live classifier: record every request, answer it from the script, and hold
 * nothing but the literal key that provider carries (ruling 14). The caller restores with
 * `vi.unstubAllEnvs()` and `vi.unstubAllGlobals()` in its `afterEach`.
 */
export function installClassifierGuard(initial: ClassifierAnswers = NO): ClassifierGuard {
	const requests: RecordedClassifierRequest[] = [];
	let answers: ClassifierAnswers = initial;

	vi.stubEnv("OPENROUTER_API_KEY", "");
	vi.stubEnv("TYPESAFE_API_KEY", "");
	vi.stubGlobal("fetch", async (url: unknown, init?: RequestInit): Promise<Response> => {
		const body = JSON.parse(String(init?.body)) as RecordedClassifierRequest["body"];
		requests.push({ url: String(url), body });
		if (answers === "hang") return hangUntilAborted(init?.signal);
		return new Response(answerBody(answers, Object.keys(body.questions)));
	});

	return {
		requests,
		answer(next) {
			answers = next;
		},
	};
}

/** Register the test classifier provider with the host, from an inline extension or a test registry. */
export function classifierProviderExtension(pi: ExtensionAPI): void {
	pi.registerProvider(TEST_CLASSIFIER_PROVIDER, TEST_CLASSIFIER_PROVIDER_CONFIG);
}

/** Write the agent config that points this session's recall at the test provider and model. */
export function writeClassifierAgentConfig(agentDirectory: string, fields: Record<string, unknown> = {}): void {
	const config = {
		defaultDecisionModelProvider: TEST_CLASSIFIER_PROVIDER,
		defaultDecisionModel: TEST_CLASSIFIER_MODEL,
		...fields,
	};
	writeFileSync(join(agentDirectory, CONFIG_FILE_NAME), JSON.stringify(config));
}
