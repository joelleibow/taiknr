#!/usr/bin/env node
// Live verification for recall, run by hand (design decision 13; ruling 13).
//
// It loads taiknr through pi's own loader, drives a real session against the real classifier and
// the real main model, and reads the request a provider was actually sent. It is outside the test
// include, the lint allowlist and the type program on purpose: drop nothing here into `tests/`.
//
//   node test-recall-live.mjs               one passing run is what ticks the verification task
//   node test-recall-live.mjs --break-model the same run with a mistyped classifier model
//
// Exit codes: 0 both pass conditions hold; 1 a pass condition failed; 2 the run proved nothing.
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	createAgentSession,
	DefaultResourceLoader,
	ModelRuntime,
	SessionManager,
	SettingsManager,
} from "@earendil-works/pi-coding-agent";

const REPO_ROOT = import.meta.dirname;

const CLASSIFIER = { provider: "openrouter", model: "~typesafe/jev-latest" };
const MAIN = { provider: "openrouter", model: "openai/gpt-4.1-nano" };
// The mistyped model `--break-model` writes, so the run shows the script catching a mistake.
const BREAK_MODEL = "~typesafe/jev-does-not-exist";

const SIDE_STORE = "taiknr-side-store";
const RECALL_OPENING = "<recalled_context>";

const TOOL_PROMPT = "Call the emit_marker tool once, then reply with the single word: done.";
const UNRELATED_PROMPT = "Reply with the word ok.";
const RECALL_PROMPT = "Quote the marker string that appeared in the emit_marker output.";

const SETUP = 2;
const RECALL_FAILED = 1;

/** Stop the run with the code and the line that says which check ended it. */
class CheckFailure extends Error {
	constructor(code, message) {
		super(message);
		this.code = code;
	}
}

const fail = (code, message) => {
	throw new CheckFailure(code, message);
};

/** A fresh marker, placed past the stub's three-line 180-unit preview so only recall can carry it. */
function markerOutput(marker) {
	const line = (text) => text.padEnd(80, "a");
	return [
		line("line one of the archived output, long enough that the preview stops before the marker"),
		line("line two of the archived output, long enough that the preview stops before the marker"),
		line("line three of the archived output, long enough that the preview stops before the marker"),
		`the marker is ${marker}`,
		"tail line, kept well beyond the preview",
		"z".repeat(600),
	].join("\n");
}

/** The probe module loaded before taiknr: it owns the two tools and records what each event carries. */
function preProbeSource(marker) {
	return `// Written by test-recall-live.mjs; loaded before taiknr so it snapshots the request first.
const state = (globalThis.__taiknrLive ??= { markerCalls: 0, before: [], after: [], payloads: [] });

export default function preProbe(pi) {
	pi.registerTool({
		name: "emit_marker",
		label: "Emit Marker",
		description: "Returns a long text carrying a marker string",
		parameters: { type: "object", properties: {} },
		execute: async () => {
			state.markerCalls += 1;
			return { content: [{ type: "text", text: ${JSON.stringify(markerOutput(marker))} }], details: undefined };
		},
	});
	pi.registerTool({
		name: "ping",
		label: "Ping",
		description: "Does nothing",
		parameters: { type: "object", properties: {} },
		execute: async () => ({ content: [{ type: "text", text: "pong" }], details: undefined }),
	});
	pi.on("context_with_system", (event) => {
		state.before.push(JSON.stringify(event.messages));
	});
}
`;
}

/** The probe loaded after taiknr: it records the list pi sends and the payload the provider gets. */
function afterProbe(pi) {
	const state = (globalThis.__taiknrLive ??= { markerCalls: 0, before: [], after: [], payloads: [] });
	pi.on("context_with_system", (event) => {
		state.after.push(JSON.stringify(event.messages));
	});
	pi.on("before_provider_request", (event) => {
		state.payloads.push(JSON.stringify(event.payload));
	});
}

/** The blocks of a snapshotted message, with a string content read as one text block. */
function blocksOf(message) {
	return typeof message.content === "string" ? [{ type: "text", text: message.content }] : message.content;
}

/** A snapshot's messages, parsed. */
const messagesOf = (snapshot) => JSON.parse(snapshot);

/** The text of the last block of a snapshot's latest user message, or `""` when it has none. */
function lastBlockText(snapshot) {
	const messages = messagesOf(snapshot);
	const message = messages.findLast(({ role }) => role === "user");
	const [block] = message === undefined ? [] : blocksOf(message).slice(-1);
	return typeof block?.text === "string" ? block.text : "";
}

/** Every way one request's recall differs from what the host had before taiknr appended it. */
function recallProblems(beforeSnapshot, afterSnapshot, marker) {
	const before = messagesOf(beforeSnapshot);
	const after = messagesOf(afterSnapshot);
	const problems = [];
	if (after.length !== before.length) {
		problems.push(`the request carries ${after.length} messages where the host had ${before.length}`);
		return problems;
	}
	const userIndex = before.findLastIndex(({ role }) => role === "user");
	if (userIndex === -1) {
		problems.push("the request carries no user message");
		return problems;
	}
	before.forEach((message, index) => {
		if (index !== userIndex && JSON.stringify(message) !== JSON.stringify(after[index])) {
			problems.push(`message ${index} changed, and only the latest user message may`);
		}
	});
	const beforeBlocks = blocksOf(before[userIndex]);
	const afterBlocks = blocksOf(after[userIndex]);
	if (JSON.stringify(afterBlocks.slice(0, beforeBlocks.length)) !== JSON.stringify(beforeBlocks)) {
		problems.push("the latest user message's own blocks changed");
	}
	if (afterBlocks.length !== beforeBlocks.length + 1) {
		problems.push(
			`the latest user message gained ${afterBlocks.length - beforeBlocks.length} block(s) rather than exactly one`,
		);
		return problems;
	}
	const block = afterBlocks[afterBlocks.length - 1];
	if (block.type !== "text" || !String(block.text ?? "").startsWith(RECALL_OPENING)) {
		problems.push(`the appended block does not start with ${RECALL_OPENING}`);
	} else if (!String(block.text).includes(marker)) {
		problems.push("the appended block does not carry the marker");
	}
	return problems;
}

/** Whether the two lists are element-identical. */
const sameList = (left, right) => JSON.stringify(left) === JSON.stringify(right);

/** How many times `needle` appears in `text`. */
const occurrences = (text, needle) => text.split(needle).length - 1;

async function run() {
	const apiKey = process.env.OPENROUTER_API_KEY;
	if (apiKey === undefined || apiKey.trim().length === 0) {
		fail(SETUP, "OPENROUTER_API_KEY is not set, and this script takes its credential from nowhere else");
	}

	const breakModel = process.argv.includes("--break-model");
	const agentDirectory = mkdtempSync(join(tmpdir(), "taiknr-recall-live-agent-"));
	const workDirectory = mkdtempSync(join(tmpdir(), "taiknr-recall-live-work-"));

	try {
		process.env.PI_CODING_AGENT_DIR = agentDirectory;
		writeFileSync(
			join(agentDirectory, "pi-taiknr.json"),
			JSON.stringify({
				defaultDecisionModelProvider: CLASSIFIER.provider,
				defaultDecisionModel: breakModel ? BREAK_MODEL : CLASSIFIER.model,
			}),
		);

		const marker = `MARKER-${randomUUID()}`;
		const classifierModel = breakModel ? BREAK_MODEL : CLASSIFIER.model;
		console.log(`classifier: ${CLASSIFIER.provider} / ${classifierModel}`);
		console.log(`main model: ${MAIN.provider} / ${MAIN.model}`);
		console.log("This run makes real paid model and classifier calls.");

		const preProbePath = join(workDirectory, "pre-probe.mjs");
		writeFileSync(preProbePath, preProbeSource(marker));

		const modelRuntime = await ModelRuntime.create({
			authPath: join(agentDirectory, "auth.json"),
			modelsPath: null,
			allowModelNetwork: false,
			refreshOnCreate: false,
		});
		const model = modelRuntime.getModel(MAIN.provider, MAIN.model);
		if (model === undefined) fail(SETUP, `pi's catalog holds no ${MAIN.provider} / ${MAIN.model}`);

		const settingsManager = SettingsManager.inMemory({}, { projectTrusted: false });
		const resourceLoader = new DefaultResourceLoader({
			cwd: workDirectory,
			agentDir: agentDirectory,
			settingsManager,
			additionalExtensionPaths: [preProbePath, REPO_ROOT],
			extensionFactories: [afterProbe],
			noExtensions: true,
			noSkills: true,
			noPromptTemplates: true,
			noThemes: true,
			noContextFiles: true,
		});
		await resourceLoader.reload();

		const errors = [];
		const { session } = await createAgentSession({
			cwd: workDirectory,
			agentDir: agentDirectory,
			modelRuntime,
			model,
			settingsManager,
			resourceLoader,
			sessionManager: SessionManager.inMemory(workDirectory),
		});
		await session.bindExtensions({ onError: (error) => errors.push(error) });
		if (errors.length > 0) fail(SETUP, `an extension reported an error: ${errors.map(String).join("; ")}`);

		const state = (globalThis.__taiknrLive ??= { markerCalls: 0, before: [], after: [], payloads: [] });

		// Prompt 1 asks for the marker tool; the tool set starts narrow so the second tool can join it.
		session.setActiveToolsByName(["emit_marker"]);
		await session.prompt(TOOL_PROMPT);
		const afterToolPrompt = state.before.length;
		const payloadsAfterToolPrompt = state.payloads.length;
		if (state.markerCalls < 1) fail(SETUP, "emit_marker was never called, so nothing was archived");
		const branch = session.sessionManager.getBranch();
		if (!branch.some((entry) => entry.type === "custom" && entry.customType === SIDE_STORE)) {
			fail(SETUP, `no ${SIDE_STORE} entry is on the branch after prompt 1`);
		}

		// Adding a tool mid-conversation is what makes pi place a system message above index 0.
		session.setActiveToolsByName(["emit_marker", "ping"]);
		await session.prompt(UNRELATED_PROMPT);
		const afterUnrelatedPrompt = state.before.length;
		const payloadsAfterUnrelatedPrompt = state.payloads.length;

		await session.prompt(RECALL_PROMPT);
		if (state.before.length <= afterUnrelatedPrompt) fail(SETUP, "prompt 3 made no provider request");

		const recallIndex = afterUnrelatedPrompt;
		const unrelatedSnapshots = state.before.slice(afterToolPrompt, afterUnrelatedPrompt);
		if (unrelatedSnapshots.some((snapshot) => snapshot.includes(marker))) {
			fail(SETUP, "the marker is still in context before recall, so the setup proves nothing");
		}
		if (state.before[recallIndex].includes(marker)) {
			fail(SETUP, "the marker is already in context before recall, so the setup proves nothing");
		}
		if (!messagesOf(state.before[recallIndex]).some(({ role }, index) => index > 0 && role === "system")) {
			fail(SETUP, "prompt 3's list carries no system message above index 0");
		}
		if (state.payloads.length <= payloadsAfterUnrelatedPrompt) fail(SETUP, "no provider payload carries prompt 3");

		const problems = [];
		const recallProblemsFound = recallProblems(state.before[recallIndex], state.after[recallIndex], marker);
		if (recallProblemsFound.length > 0) {
			problems.push(`prompt 3's first request has no recall block: ${recallProblemsFound.join("; ")}`);
		}
		const recallPayload = state.payloads[payloadsAfterUnrelatedPrompt] ?? "";
		// The model may call emit_marker more than once, so the payload must carry the marker exactly
		// as often as the recall block does; setup checks prove the history carries none.
		const inBlock = recallProblemsFound.length > 0 ? 0 : occurrences(lastBlockText(state.after[recallIndex]), marker);
		if (occurrences(recallPayload, marker) !== inBlock) {
			problems.push(
				`prompt 3's payload carries the marker ${occurrences(recallPayload, marker)} times, but its recall block carries it ${inBlock} times (emit_marker ran ${state.markerCalls} times)`,
			);
		}

		for (let index = afterToolPrompt; index < afterUnrelatedPrompt; index += 1) {
			if (!sameList(messagesOf(state.before[index]), messagesOf(state.after[index]))) {
				problems.push(`prompt 2's request ${index} changed, and it carries no recall`);
			}
		}
		// Prompt 2's payloads are the ones between the two boundaries. A substring filter was wrong:
		// prompt 3's payload carries prompt 2's text in its history, next to prompt 3's recall block.
		for (const payload of state.payloads.slice(payloadsAfterToolPrompt, payloadsAfterUnrelatedPrompt)) {
			if (payload.includes(RECALL_OPENING)) problems.push("prompt 2's payload carries a recall block");
		}

		if (problems.length > 0) fail(RECALL_FAILED, problems.join("\n  "));
		console.log(`PASS: prompt 3's request carries one recall block with ${marker}, and prompt 2's carries none.`);
	} finally {
		rmSync(agentDirectory, { recursive: true, force: true });
		rmSync(workDirectory, { recursive: true, force: true });
	}
}

try {
	await run();
} catch (error) {
	if (error instanceof CheckFailure) {
		console.error(`exit ${error.code}: ${error.message}`);
		process.exit(error.code);
	}
	console.error(`exit ${SETUP}: the run did not finish: ${error?.stack ?? error}`);
	process.exit(SETUP);
}
