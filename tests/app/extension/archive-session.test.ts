import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
// shortcut: `@earendil-works/pi-ai` is not a declared dependency; it is hoisted through
// `@earendil-works/pi-coding-agent` in the committed lockfile (package-lock.json:667), tests only (M10).
import {
	type FauxProviderHandle,
	fauxAssistantMessage,
	fauxProvider,
	fauxText,
	fauxToolCall,
	type TranscriptContext,
} from "@earendil-works/pi-ai";
import {
	type AgentSession,
	type AgentSettledEvent,
	CONFIG_DIR_NAME,
	createAgentSession,
	DefaultResourceLoader,
	type ExtensionAPI,
	ModelRuntime,
	SessionManager,
	SettingsManager,
} from "@earendil-works/pi-coding-agent";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import taiknr from "../../../src/app/extension/taiknr.js";
import { CONFIG_FILE_NAME } from "../../../src/config/taiknr-config.js";
import type { ArchivedToolOutput } from "../../../src/domain/archived-output.js";
import { TAIKNR_SIDE_STORE_TYPE } from "../../../src/infra/adapters/pi-archive-adapter.js";
import {
	type ClassifierGuard,
	classifierProviderExtension,
	installClassifierGuard,
	writeClassifierAgentConfig,
} from "../../support/classifier-guard.js";

const BIG_TEXT = "x".repeat(700);
const IMAGE = { type: "image" as const, data: "iVBORw0KGgo=", mimeType: "image/png" };
const STUB = `[archived {id}] big_out({}) status=ok (700 chars, 1 lines) preview: ${"x".repeat(180)}`;

let guard: ClassifierGuard;
let originalAgentDir: string | undefined;
let originalCwd: string;
let workDirectory: string;
let agentDirectory: string;

beforeEach(() => {
	originalAgentDir = process.env.PI_CODING_AGENT_DIR;
	originalCwd = process.cwd();
	workDirectory = mkdtempSync(join(tmpdir(), "taiknr-archive-session-"));
	agentDirectory = mkdtempSync(join(tmpdir(), "taiknr-archive-session-agent-"));
	process.env.PI_CODING_AGENT_DIR = agentDirectory;
	// The suite never reaches the live classifier: a recording stub answers, and the config names it.
	guard = installClassifierGuard();
	writeClassifierAgentConfig(agentDirectory);
});

afterEach(() => {
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
	process.chdir(originalCwd);
	if (originalAgentDir === undefined) delete process.env.PI_CODING_AGENT_DIR;
	else process.env.PI_CODING_AGENT_DIR = originalAgentDir;
	rmSync(workDirectory, { recursive: true, force: true });
	rmSync(agentDirectory, { recursive: true, force: true });
});

type InlineExtension = (pi: ExtensionAPI) => void;

/** The tool whose output is large enough to archive, carrying the image block that must survive. */
function helperExtension(state: { session?: AgentSession; abortInTool: boolean }): InlineExtension {
	return (pi) => {
		pi.registerTool({
			name: "big_out",
			label: "Big Out",
			description: "Returns big output",
			parameters: { type: "object", properties: {} } as never,
			execute: async () => {
				// Un-awaited on purpose: `abort()` waits for idle, which from inside the tool is this run.
				if (state.abortInTool) void state.session?.abort();
				return { content: [{ type: "text", text: BIG_TEXT }, IMAGE], details: undefined };
			},
		});
	};
}

/** Another extension that redacts the latest tool result at the settlement boundary. */
function competitorExtension(): InlineExtension {
	return (pi) => {
		pi.on("agent_before_settle", (event, ctx) => {
			const target = ctx.sessionManager
				.getBranch()
				.findLast((entry) => entry.type === "message" && entry.message.role === "toolResult");
			if (target === undefined || target.type !== "message") return;
			return {
				entries: [
					...event.entries,
					{
						type: "context_edit" as const,
						targetId: target.id,
						replacement: { content: [{ type: "text" as const, text: "redacted" }] },
					},
				],
			};
		});
	};
}

type Harness = {
	errors: unknown[];
	faux: FauxProviderHandle;
	session: AgentSession;
	state: { session?: AgentSession; abortInTool: boolean };
};

/** A real session over an in-memory branch and a faux model, with no network and no real agent dir. */
async function sessionHarness(
	options: {
		abortInTool?: boolean;
		beforeTaiknr?: InlineExtension[];
		afterTaiknr?: InlineExtension[];
		settings?: Parameters<typeof SettingsManager.inMemory>[0];
		projectTrusted?: boolean;
	} = {},
): Promise<Harness> {
	const state: { session?: AgentSession; abortInTool: boolean } = { abortInTool: options.abortInTool ?? false };
	const faux = fauxProvider();
	const modelRuntime = await ModelRuntime.create({
		authPath: join(agentDirectory, "auth.json"),
		modelsPath: null,
		allowModelNetwork: false,
		refreshOnCreate: false,
	});
	modelRuntime.registerNativeProvider(faux.provider);
	const settingsManager = SettingsManager.inMemory(options.settings, {
		projectTrusted: options.projectTrusted ?? false,
	});
	const resourceLoader = new DefaultResourceLoader({
		cwd: workDirectory,
		agentDir: agentDirectory,
		settingsManager,
		extensionFactories: [
			classifierProviderExtension,
			...(options.beforeTaiknr ?? []),
			taiknr,
			...(options.afterTaiknr ?? []),
			helperExtension(state),
		],
		noExtensions: true,
		noSkills: true,
		noPromptTemplates: true,
		noThemes: true,
		noContextFiles: true,
	});
	await resourceLoader.reload();
	const errors: unknown[] = [];
	const { session } = await createAgentSession({
		cwd: workDirectory,
		agentDir: agentDirectory,
		modelRuntime,
		model: faux.getModel(),
		settingsManager,
		resourceLoader,
		sessionManager: SessionManager.inMemory(workDirectory),
	});
	state.session = session;
	// This is what fires `session_start` and what collects extension and boundary errors.
	await session.bindExtensions({ onError: (error) => errors.push(error) });

	return { errors, faux, session, state };
}

/** The side-store batches the branch carries, in branch order. */
function sideStoreBatches(session: AgentSession): ArchivedToolOutput[][] {
	return session.sessionManager
		.getBranch()
		.flatMap((entry) =>
			entry.type === "custom" && entry.customType === TAIKNR_SIDE_STORE_TYPE
				? [entry.data as ArchivedToolOutput[]]
				: [],
		);
}

/** The context edits the branch carries, in branch order. */
function contextEdits(session: AgentSession) {
	return session.sessionManager.getBranch().flatMap((entry) => (entry.type === "context_edit" ? [entry] : []));
}

/** The tool result as the model would see it, after the branch's edits. */
function projectedToolResult(session: AgentSession) {
	const message = session.sessionManager.buildSessionProjection().messages.find(({ role }) => role === "toolResult");
	return message?.role === "toolResult" ? message : undefined;
}

/** The id Pi gave the branch's latest tool result. */
function latestToolResultEntryId(session: AgentSession): string {
	const entry = session.sessionManager
		.getBranch()
		.findLast((branchEntry) => branchEntry.type === "message" && branchEntry.message.role === "toolResult");
	if (entry === undefined) throw new Error("expected a persisted tool result on the branch");
	return entry.id;
}

/** Queue the two responses a settled tool run needs: the call, then the turn that settles it. */
function queueToolRun(faux: FauxProviderHandle): void {
	faux.setResponses([
		fauxAssistantMessage([fauxToolCall("big_out", {}, { id: "call-1" })], { stopReason: "toolUse" }),
		fauxAssistantMessage([fauxText("done")], { stopReason: "stop" }),
	]);
}

test("a settled run stubs its large output, keeps the image and records the item", async () => {
	const { errors, faux, session } = await sessionHarness();
	queueToolRun(faux);

	await session.prompt("run it");

	expect(errors).toEqual([]);
	const id = latestToolResultEntryId(session);
	const batches = sideStoreBatches(session);
	expect(batches).toHaveLength(1);
	expect(batches[0]).toHaveLength(1);
	expect(batches[0][0]).toEqual({
		id,
		toolName: "big_out",
		argsSummary: "{}",
		isError: false,
		stub: STUB.replace("{id}", id),
		rawText: BIG_TEXT,
	});
	expect(contextEdits(session)).toHaveLength(1);
	expect(contextEdits(session)[0]).toMatchObject({
		targetId: id,
		replacement: { content: [{ type: "text", text: STUB.replace("{id}", id) }, IMAGE] },
	});
	expect(projectedToolResult(session)?.content).toEqual([{ type: "text", text: STUB.replace("{id}", id) }, IMAGE]);
});

test("a /tree onto a branch before the settlement projects the whole original output again", async () => {
	const { errors, faux, session } = await sessionHarness();
	queueToolRun(faux);

	await session.prompt("run it");

	const id = latestToolResultEntryId(session);
	expect(errors).toEqual([]);
	expect(contextEdits(session)).toHaveLength(1);
	expect(projectedToolResult(session)?.content).toEqual([{ type: "text", text: STUB.replace("{id}", id) }, IMAGE]);

	// The target is the persisted tool result, not the user entry the Validate finding names: a user
	// entry sends `navigateTree` to its parent, dropping the result off the branch altogether.
	await session.navigateTree(id, { summarize: false });

	expect(errors).toEqual([]);
	expect(projectedToolResult(session)?.content).toEqual([{ type: "text", text: BIG_TEXT }, IMAGE]);
});

test("the recorded item costs the request after the settlement no context", async () => {
	const { errors, faux, session } = await sessionHarness();
	queueToolRun(faux);
	await session.prompt("run it");
	let transcript: TranscriptContext | undefined;
	faux.setResponses([
		(context) => {
			transcript = context;
			return fauxAssistantMessage([fauxText("done 2")], { stopReason: "stop" });
		},
	]);

	await session.prompt("what did you see?");

	expect(errors).toEqual([]);
	expect(sideStoreBatches(session)).toHaveLength(1);
	expect(JSON.stringify(transcript)).not.toContain(TAIKNR_SIDE_STORE_TYPE);
	expect(JSON.stringify(transcript)).not.toContain(BIG_TEXT);
	expect(JSON.stringify(transcript)).toContain(STUB.replace("{id}", latestToolResultEntryId(session)));
});

test("an aborted run stages but settles nothing, and the next settled run commits the carried item", async () => {
	const { errors, faux, session } = await sessionHarness({ abortInTool: true });
	const settled: AgentSettledEvent[] = [];
	session.subscribe((event) => {
		if (event.type === "agent_settled") settled.push(event);
	});
	faux.setResponses([fauxAssistantMessage([fauxToolCall("big_out", {}, { id: "call-1" })], { stopReason: "toolUse" })]);

	await session.prompt("run it");

	expect(errors).toEqual([]);
	expect(settled.map(({ aborted }) => aborted)).toEqual([true]);
	expect(contextEdits(session)).toEqual([]);
	expect(sideStoreBatches(session)).toEqual([]);

	faux.setResponses([fauxAssistantMessage([fauxText("done 2")], { stopReason: "stop" })]);
	await session.prompt("carry on");

	expect(errors).toEqual([]);
	expect(sideStoreBatches(session).map((batch) => batch.map(({ id }) => id))).toEqual([
		[latestToolResultEntryId(session)],
	]);
});

test("a /tree after an abort drops the off-branch item instead of failing the boundary", async () => {
	const { errors, faux, session } = await sessionHarness({ abortInTool: true });
	faux.setResponses([fauxAssistantMessage([fauxToolCall("big_out", {}, { id: "call-1" })], { stopReason: "toolUse" })]);
	await session.prompt("run it");
	const userEntryId = session.sessionManager
		.getBranch()
		.findLast((entry) => entry.type === "message" && entry.message.role === "user")?.id;

	await session.navigateTree(String(userEntryId), { summarize: false });
	faux.setResponses([fauxAssistantMessage([fauxText("done 2")], { stopReason: "stop" })]);
	await session.prompt("carry on");

	expect(errors).toEqual([]);
	expect(contextEdits(session)).toEqual([]);
	expect(sideStoreBatches(session)).toEqual([]);
});

test("a competitor registered before taiknr redacts the result and taiknr drops its item", async () => {
	const { errors, faux, session } = await sessionHarness({ beforeTaiknr: [competitorExtension()] });
	queueToolRun(faux);

	await session.prompt("run it");

	expect(errors).toEqual([]);
	expect(sideStoreBatches(session)).toEqual([]);
	expect(contextEdits(session).map(({ replacement }) => replacement)).toEqual([
		{ content: [{ type: "text", text: "redacted" }] },
	]);
});

test("a competitor registered after taiknr keeps taiknr's record and its own draft", async () => {
	const { errors, faux, session } = await sessionHarness({ afterTaiknr: [competitorExtension()] });
	queueToolRun(faux);

	await session.prompt("run it");

	expect(errors).toEqual([]);
	expect(sideStoreBatches(session)).toHaveLength(1);
	expect(contextEdits(session).map(({ replacement }) => replacement)).toEqual([
		{ content: [{ type: "text", text: STUB.replace("{id}", latestToolResultEntryId(session)) }, IMAGE] },
		{ content: [{ type: "text", text: "redacted" }] },
	]);
});

test("a compaction keeps the side-store entry it carried before the kept range", async () => {
	const { errors, faux, session } = await sessionHarness({
		settings: { compaction: { enabled: false, keepRecentTokens: 0 } },
	});
	queueToolRun(faux);
	await session.prompt("run it");
	faux.setResponses([fauxAssistantMessage([fauxText("done 2")], { stopReason: "stop" })]);
	await session.prompt("one more");

	faux.setResponses([
		fauxAssistantMessage([fauxText("history summary")], { stopReason: "stop" }),
		fauxAssistantMessage([fauxText("turn prefix summary")], { stopReason: "stop" }),
	]);
	await session.compact();

	expect(errors).toEqual([]);
	const branch = session.sessionManager.getBranch();
	const sideStoreIndex = branch.findIndex(
		(entry) => entry.type === "custom" && entry.customType === TAIKNR_SIDE_STORE_TYPE,
	);
	const compaction = branch.findLast(({ type }) => type === "compaction");
	const firstKeptEntryId = compaction?.type === "compaction" ? compaction.firstKeptEntryId : "";
	const firstKeptIndex = branch.findIndex(({ id }) => id === firstKeptEntryId);
	expect(sideStoreIndex).toBeGreaterThanOrEqual(0);
	expect(sideStoreIndex).toBeLessThan(firstKeptIndex);
	expect(sideStoreBatches(session)).toHaveLength(1);
});

test("a trusted project file that turns taiknr off leaves the output raw", async () => {
	mkdirSync(join(workDirectory, CONFIG_DIR_NAME), { recursive: true });
	writeFileSync(join(workDirectory, CONFIG_DIR_NAME, CONFIG_FILE_NAME), '{"enabled":false}');
	const { errors, faux, session } = await sessionHarness({ projectTrusted: true });
	queueToolRun(faux);

	await session.prompt("run it");

	expect(errors).toEqual([]);
	expect(sideStoreBatches(session)).toEqual([]);
	expect(contextEdits(session)).toEqual([]);
	expect(projectedToolResult(session)?.content).toEqual([{ type: "text", text: BIG_TEXT }, IMAGE]);
	expect(guard.requests).toEqual([]);
});

test("a trusted project file that leaves taiknr on stubs the output", async () => {
	mkdirSync(join(workDirectory, CONFIG_DIR_NAME), { recursive: true });
	writeFileSync(join(workDirectory, CONFIG_DIR_NAME, CONFIG_FILE_NAME), '{"enabled":true}');
	const { errors, faux, session } = await sessionHarness({ projectTrusted: true });
	queueToolRun(faux);

	await session.prompt("run it");

	expect(errors).toEqual([]);
	expect(sideStoreBatches(session)).toHaveLength(1);
	expect(contextEdits(session)).toHaveLength(1);
});

/** What a recall probe recorded, and the host API the test drives the tool set with. */
type RecallProbe = { before: string[]; after: string[]; api?: ExtensionAPI };

/** A probe loaded before taiknr: it owns both tools and snapshots what the event carried. */
function beforeProbe(state: RecallProbe): InlineExtension {
	return (pi) => {
		state.api = pi;
		pi.registerTool({
			name: "noop",
			label: "No Op",
			description: "Does nothing at all",
			parameters: { type: "object", properties: {} } as never,
			execute: async () => ({ content: [{ type: "text", text: "nothing" }], details: undefined }),
		});
		pi.on("context_with_system", (event) => {
			state.before.push(JSON.stringify(event.messages));
		});
	};
}

/** A probe loaded after taiknr: it snapshots the list the host is about to send. */
function afterProbe(state: RecallProbe): InlineExtension {
	return (pi) => {
		pi.on("context_with_system", (event) => {
			state.after.push(JSON.stringify(event.messages));
		});
	};
}

/** One message as a snapshot holds it: JSON, so an in-place mutation cannot pass vacuously. */
type SnapshotMessage = { role: string; content: string | { type: string; text?: string }[] };

const snapshot = (text: string): SnapshotMessage[] => JSON.parse(text) as SnapshotMessage[];

/** A message's blocks, with a string content read as one text block. */
function blocksOf(message: SnapshotMessage): { type: string; text?: string }[] {
	return typeof message.content === "string" ? [{ type: "text", text: message.content }] : message.content;
}

/**
 * Assert one request's recall: every message untouched but the latest user message, which gains
 * exactly one trailing text block. Returns that block's text.
 */
function recallBlockOf(before: SnapshotMessage[], after: SnapshotMessage[]): string {
	expect(after).toHaveLength(before.length);
	const userIndex = before.findLastIndex(({ role }) => role === "user");
	expect(userIndex).toBeGreaterThanOrEqual(0);
	before.forEach((message, index) => {
		if (index !== userIndex) expect(after[index]).toEqual(message);
	});

	const beforeBlocks = blocksOf(before[userIndex]);
	const afterBlocks = blocksOf(after[userIndex]);
	expect(afterBlocks.slice(0, beforeBlocks.length)).toEqual(beforeBlocks);
	expect(afterBlocks).toHaveLength(beforeBlocks.length + 1);
	return afterBlocks[afterBlocks.length - 1].text ?? "";
}

/** Queue the turn whose reply calls `noop` and then stops, so the turn makes two requests. */
function queueNoopRun(faux: FauxProviderHandle): void {
	faux.setResponses([
		fauxAssistantMessage([fauxToolCall("noop", {}, { id: "call-2" })], { stopReason: "toolUse" }),
		fauxAssistantMessage([fauxText("done 2")], { stopReason: "stop" }),
	]);
}

/** A session whose archive holds one stubbed item, with a probe on each side of taiknr. */
async function recallSession(): Promise<{ probe: RecallProbe; harness: Harness }> {
	const probe: RecallProbe = { before: [], after: [] };
	const harness = await sessionHarness({ beforeTaiknr: [beforeProbe(probe)], afterTaiknr: [afterProbe(probe)] });
	// The tool set starts narrow, so the `noop` the turn calls can join it mid-conversation.
	probe.api?.setActiveTools(["big_out"]);
	queueToolRun(harness.faux);
	await harness.session.prompt("run it");
	// Prompt 1's own requests are not the turn under test; only what the next prompt builds is compared.
	probe.before.length = 0;
	probe.after.length = 0;
	return { probe, harness };
}

test("recall reaches the request, and every system message stays where the host put it", async () => {
	const { probe, harness } = await recallSession();
	probe.api?.setActiveTools(["big_out", "noop"]);
	guard.answer((ids) => Object.fromEntries(ids.map((id) => [id, 0.9])));
	queueNoopRun(harness.faux);

	await harness.session.prompt("what did you see?");

	expect(harness.errors).toEqual([]);
	expect(probe.before).toHaveLength(2);
	expect(probe.after).toHaveLength(2);
	const requests = probe.before.map((before, index) => ({
		before: snapshot(before),
		after: snapshot(probe.after[index]),
	}));
	const blocks = requests.map(({ before, after }) => recallBlockOf(before, after));

	expect(requests[0].before.some(({ role }, index) => index > 0 && role === "system")).toBe(true);
	expect(blocks[0].startsWith("<recalled_context>")).toBe(true);
	expect(blocks[0]).toContain(BIG_TEXT);
	expect(blocks[1]).toBe(blocks[0]);
});

test("a recall request writes nothing, and one turn under one key makes one classifier call", async () => {
	const { probe, harness } = await recallSession();
	probe.api?.setActiveTools(["big_out", "noop"]);
	guard.answer((ids) => Object.fromEntries(ids.map((id) => [id, 0.9])));
	const batches = sideStoreBatches(harness.session);
	const edits = contextEdits(harness.session);
	const calls = guard.requests.length;
	queueNoopRun(harness.faux);

	await harness.session.prompt("what did you see?");

	expect(harness.errors).toEqual([]);
	expect(sideStoreBatches(harness.session)).toEqual(batches);
	expect(contextEdits(harness.session)).toEqual(edits);
	expect(guard.requests).toHaveLength(calls + 1);
});

test("a classifier that never answers fails open, and stubbing carries on", async () => {
	writeClassifierAgentConfig(agentDirectory, { classifierTimeoutMs: 50 });
	guard.answer("hang");
	const { errors, faux, session } = await sessionHarness();
	queueToolRun(faux);
	await session.prompt("run it");
	let transcript: TranscriptContext | undefined;
	faux.setResponses([
		(context) => {
			transcript = context;
			return fauxAssistantMessage([fauxText("done 2")], { stopReason: "stop" });
		},
	]);
	const calls = guard.requests.length;

	await session.prompt("what did you see?");

	expect(errors).toEqual([]);
	expect(JSON.stringify(transcript)).not.toContain("<recalled_context>");
	expect(guard.requests).toHaveLength(calls + 1);

	queueToolRun(faux);
	await session.prompt("run it again");

	expect(errors).toEqual([]);
	expect(sideStoreBatches(session)).toHaveLength(2);
});

/** One field report as it crossed the Jefferson bus. */
type BusUpdate = { extension: string; field: string; value: unknown };

/** What crossed the Jefferson bus, in the order it arrived. */
type BusRecord = { registrations: unknown[]; updates: BusUpdate[]; order: string[] };

/** An extension loaded after taiknr that records the bus from its factory body. */
function busListener(state: BusRecord): InlineExtension {
	return (pi) => {
		// Subscribed in the factory body: an afterTaiknr extension's session_start runs after taiknr's,
		// so a subscription made there would miss the registration and the opening updates.
		pi.events.on("jefferson:registration", (data) => {
			state.registrations.push(data);
			state.order.push("registration");
		});
		pi.events.on("jefferson:update", (data) => {
			state.updates.push(data as BusUpdate);
			state.order.push("update");
		});
	};
}

/** The last value posted for one field, or `undefined` when nothing ever was. */
function lastField(state: BusRecord, field: string): unknown {
	return state.updates.filter((update) => update.field === field).at(-1)?.value;
}

/** An extension that proposes a boundary entry pi cannot apply, so pi discards the whole boundary. */
function discardingCompetitor(): InlineExtension {
	return (pi) => {
		pi.on("agent_before_settle", (event) => ({
			entries: [
				...event.entries,
				{ type: "context_edit" as const, targetId: "no-such-entry", replacement: { content: [] } },
			],
		}));
	};
}

/** The one bus session a case watches: its recorder, and the harness that ran it. */
function busSession(
	options: { afterTaiknr?: InlineExtension[]; settings?: Parameters<typeof SettingsManager.inMemory>[0] } = {},
) {
	const bus: BusRecord = { registrations: [], updates: [], order: [] };
	return {
		bus,
		session: sessionHarness({ ...options, afterTaiknr: [...(options.afterTaiknr ?? []), busListener(bus)] }),
	};
}

/** One settled tool run and one more prompt: the two prompts 14.1(b)'s compaction case needs. */
async function runTwoPrompts(harness: Harness): Promise<void> {
	queueToolRun(harness.faux);
	await harness.session.prompt("run it");
	harness.faux.setResponses([fauxAssistantMessage([fauxText("done 2")], { stopReason: "stop" })]);
	await harness.session.prompt("one more");
}

test("a tree jump re-posts the archive's item count after the branch drops the item", async () => {
	const { bus, session } = busSession();
	const { errors, faux, session: agent } = await session;
	queueToolRun(faux);

	await agent.prompt("run it");

	expect(errors).toEqual([]);
	expect(bus.order[0]).toBe("registration");
	expect(bus.registrations).toHaveLength(1);
	expect(lastField(bus, "archiveItems")).toBe(1);
	expect(Number(lastField(bus, "archiveWithheld"))).toBeGreaterThan(0);

	await agent.navigateTree(latestToolResultEntryId(agent), { summarize: false });

	expect(errors).toEqual([]);
	expect(lastField(bus, "archiveItems")).toBe(0);
});

test("a compaction after a discarded boundary re-posts the archive as the branch now carries it", async () => {
	const { bus, session } = busSession({
		afterTaiknr: [discardingCompetitor()],
		settings: { compaction: { enabled: false, keepRecentTokens: 0 } },
	});
	const harness = await session;

	await runTwoPrompts(harness);

	// The discarded boundary is the evidence: one report per settled run, and none from the compaction.
	expect(harness.errors).toHaveLength(2);
	for (const entry of harness.errors as { event: string; error: string }[]) {
		expect(entry.event).toBe("agent_before_settle");
		expect(entry.error.startsWith("Invalid boundary entries")).toBe(true);
	}
	expect(lastField(bus, "archiveItems")).toBe(1);

	harness.faux.setResponses([
		fauxAssistantMessage([fauxText("history summary")], { stopReason: "stop" }),
		fauxAssistantMessage([fauxText("turn prefix summary")], { stopReason: "stop" }),
	]);
	await harness.session.compact();

	expect(harness.errors).toHaveLength(2);
	expect(lastField(bus, "archiveItems")).toBe(0);
});

test("a recall turn publishes its block above zero, more than once", async () => {
	const bus: BusRecord = { registrations: [], updates: [], order: [] };
	const probe: RecallProbe = { before: [], after: [] };
	const { errors, faux, session } = await sessionHarness({
		beforeTaiknr: [beforeProbe(probe)],
		afterTaiknr: [afterProbe(probe), busListener(bus)],
	});
	probe.api?.setActiveTools(["big_out"]);
	queueToolRun(faux);
	await session.prompt("run it");
	probe.api?.setActiveTools(["big_out", "noop"]);
	guard.answer((ids) => Object.fromEntries(ids.map((id) => [id, 0.9])));
	const posted = bus.updates.length;
	queueNoopRun(faux);

	await session.prompt("what did you see?");

	const recalled = bus.updates.slice(posted).filter(({ field }) => field === "recalled");
	expect(errors).toEqual([]);
	expect(recalled.length).toBeGreaterThanOrEqual(2);
	for (const update of recalled) expect(Number(update.value)).toBeGreaterThan(0);
});

test("with the instruments switch off nothing crosses the bus, and recall still runs", async () => {
	writeClassifierAgentConfig(agentDirectory, { jeffersonInstruments: false });
	const bus: BusRecord = { registrations: [], updates: [], order: [] };
	const probe: RecallProbe = { before: [], after: [] };
	const { errors, faux, session } = await sessionHarness({
		beforeTaiknr: [beforeProbe(probe)],
		afterTaiknr: [afterProbe(probe), busListener(bus)],
	});
	probe.api?.setActiveTools(["big_out"]);
	queueToolRun(faux);
	await session.prompt("run it");
	probe.api?.setActiveTools(["big_out", "noop"]);
	guard.answer((ids) => Object.fromEntries(ids.map((id) => [id, 0.9])));
	const calls = guard.requests.length;
	queueNoopRun(faux);

	await session.prompt("what did you see?");

	expect(errors).toEqual([]);
	expect(guard.requests.length).toBeGreaterThan(calls);
	expect(bus.registrations).toEqual([]);
	expect(bus.updates).toEqual([]);
});

test("the same flow with the switch on publishes the registration and a block", async () => {
	writeClassifierAgentConfig(agentDirectory, { jeffersonInstruments: true });
	const bus: BusRecord = { registrations: [], updates: [], order: [] };
	const probe: RecallProbe = { before: [], after: [] };
	const { errors, faux, session } = await sessionHarness({
		beforeTaiknr: [beforeProbe(probe)],
		afterTaiknr: [afterProbe(probe), busListener(bus)],
	});
	probe.api?.setActiveTools(["big_out"]);
	queueToolRun(faux);
	await session.prompt("run it");
	probe.api?.setActiveTools(["big_out", "noop"]);
	guard.answer((ids) => Object.fromEntries(ids.map((id) => [id, 0.9])));
	const calls = guard.requests.length;
	queueNoopRun(faux);

	await session.prompt("what did you see?");

	expect(errors).toEqual([]);
	expect(guard.requests.length).toBeGreaterThan(calls);
	expect(bus.registrations).toHaveLength(1);
	expect(bus.updates.some(({ field, value }) => field === "recalled" && Number(value) > 0)).toBe(true);
});
