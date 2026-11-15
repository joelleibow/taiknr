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
import { afterEach, beforeEach, expect, test } from "vitest";
import taiknr from "../../../src/app/extension/taiknr.js";
import { CONFIG_FILE_NAME } from "../../../src/config/taiknr-config.js";
import type { ArchivedToolOutput } from "../../../src/domain/archived-output.js";
import { TAIKNR_SIDE_STORE_TYPE } from "../../../src/infra/adapters/pi-archive-adapter.js";

const BIG_TEXT = "x".repeat(700);
const IMAGE = { type: "image" as const, data: "iVBORw0KGgo=", mimeType: "image/png" };
const STUB = `[archived {id}] big_out({}) status=ok (700 chars, 1 lines) preview: ${"x".repeat(180)}`;

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
});

afterEach(() => {
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
