import {
	SessionManager,
	createAgentSessionServices,
} from "/Users/joelleibow/.local/share/fnm/node-versions/v26.8.1/installation/lib/node_modules/@earendil-works/pi-coding-agent/dist/index.js";

const services = await createAgentSessionServices({ cwd: "/tmp" });
const { modelRuntime } = services;

// Pick Jev classifier and local oMLX chat model
const jev =
	modelRuntime.getModelOfType("classifier", "openrouter", "~typesafe/jev-latest") ??
	modelRuntime.getModelOfType("classifier", "openrouter", "typesafe/jev-1.14");
const chatModel =
	modelRuntime.getModel("omlx", "ThinkingCap-Qwen3.8-27B-MLX-4bit-DWQ") ??
	modelRuntime.getModel("omlx", "mlx-community--Qwen3-0.6B-4bit");

if (!jev || !chatModel) {
	throw new Error(`Missing model: jev=${Boolean(jev)} chat=${Boolean(chatModel)}`);
}

// 4 realistic large tool outputs (~3,500 chars each = ~14,000 chars total)
const rawOutputs = [
	{
		id: "tc_1",
		toolName: "read",
		args: "path=README.md",
		isError: false,
		text: [
			"# Octane Service Platform",
			"Architecture overview and local development guide.",
			...Array.from({ length: 65 }, (_, i) => `Section ${i + 1}: Standard service bootstrap configuration and environment variables for worker node ${i + 1}.`),
		].join("\n"),
	},
	{
		id: "tc_2",
		toolName: "bash",
		args: "command=npm run build",
		isError: true,
		text: [
			"> octane@2.4.0 build",
			"> tsc --noEmit && vite build",
			...Array.from({ length: 45 }, (_, i) => `[info] Compiling module ${i + 1}/60: src/modules/mod_${i + 1}.ts (OK)`),
			"src/auth/token-validator.ts:148:23 - error TS2339: Property 'rotationEpochMs' does not exist on type 'JwtHeaderClaims'.",
			...Array.from({ length: 20 }, (_, i) => `[warn] Unused import in src/legacy/helper_${i + 1}.ts`),
			"Found 1 error in src/auth/token-validator.ts:148",
		].join("\n"),
	},
	{
		id: "tc_3",
		toolName: "bash",
		args: "command=git log -n 40 --oneline",
		isError: false,
		text: Array.from(
			{ length: 70 },
			(_, i) => `a9f${1000 + i} chore(deps): bump internal telemetry package to 1.4.${i} across workspace packages`,
		).join("\n"),
	},
	{
		id: "tc_4",
		toolName: "read",
		args: "path=package-lock.json",
		isError: false,
		text: Array.from(
			{ length: 70 },
			(_, i) => `node_modules/@internal/pkg-${i}: version 4.2.${i}, integrity sha512-xyz${i}000000000000000000000000000000`,
		).join("\n"),
	},
];

function buildStub(item) {
	const lines = item.text.split("\n");
	const preview = lines.slice(0, 2).join(" | ").slice(0, 140);
	return `[archived ${item.id}] ${item.toolName}(${item.args}) status=${item.isError ? "error" : "ok"} (${item.text.length} chars, ${lines.length} lines) preview: ${preview}`;
}

// Build a session with 4 turns of tool calls
const session = SessionManager.inMemory("/tmp");
const entryIdsByTc = new Map();

for (let i = 0; i < rawOutputs.length; i++) {
	const item = rawOutputs[i];
	session.appendMessage({
		role: "user",
		content: `Run step ${i + 1} (${item.toolName} ${item.args})`,
		timestamp: Date.now() + i * 10,
	});
	session.appendMessage({
		role: "assistant",
		content: [{ type: "toolCall", id: item.id, name: item.toolName, arguments: {} }],
		api: chatModel.api,
		provider: chatModel.provider,
		model: chatModel.id,
		usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } },
		stopReason: "toolUse",
		timestamp: Date.now() + i * 10 + 1,
	});
	const trEntryId = session.appendMessage({
		role: "toolResult",
		toolCallId: item.id,
		toolName: item.toolName,
		content: [{ type: "text", text: item.text }],
		isError: item.isError,
		timestamp: Date.now() + i * 10 + 2,
	});
	entryIdsByTc.set(item.id, trEntryId);
	session.appendMessage({
		role: "assistant",
		content: [{ type: "text", text: `Completed step ${i + 1}.` }],
		api: chatModel.api,
		provider: chatModel.provider,
		model: chatModel.id,
		usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } },
		stopReason: "stop",
		timestamp: Date.now() + i * 10 + 3,
	});
}

const turn5Question =
	"In the failed build from earlier, what was the exact TypeScript error code, file path with line:column, and the missing property name? Reply in one short sentence.";
session.appendMessage({
	role: "user",
	content: turn5Question,
	timestamp: Date.now() + 500,
});

// 1. Baseline context (before context_edit)
const baselineMessages = session.buildSessionContext().messages;

// 2. Apply context_edit stubs for all 4 tool outputs (what agent_before_settle does)
for (const item of rawOutputs) {
	session.appendContextEdit(entryIdsByTc.get(item.id), {
		content: [{ type: "text", text: buildStub(item) }],
	});
}
const stubOnlyMessages = session.buildSessionContext().messages;

// 3. Run Jev classifier against the stubs for Turn 5
const archiveSummary = {};
const questions = {};
for (const item of rawOutputs) {
	archiveSummary[item.id] = buildStub(item);
	questions[item.id] = {
		type: "bool",
		instructions: `Is the full raw output of ${item.id} needed to answer userPrompt?`,
		criteria: {
			true: "userPrompt asks for details, errors, or code from this tool output",
			false: "Unrelated or the 2-line stub preview is enough",
		},
	};
}

const tJev0 = Date.now();
const jevRes = await modelRuntime.classify(jev, {
	state: { userPrompt: turn5Question, archivedToolOutputs: archiveSummary },
	questions,
});
const jevMs = Date.now() - tJev0;

const recalledIds = Object.entries(jevRes.answers)
	.filter(([, a]) => a.type === "bool" && a.probability >= 0.5)
	.map(([id]) => id);

const recalledText = rawOutputs
	.filter((x) => recalledIds.includes(x.id))
	.map((x) => `[Recalled full output for ${x.id}]:\n${x.text}`)
	.join("\n\n");

const jevMessages = stubOnlyMessages.map((m, idx) =>
	idx === stubOnlyMessages.length - 1
		? { ...m, content: `${turn5Question}\n\n<recalled_context>\n${recalledText}\n</recalled_context>` }
		: m,
);

async function askModel(label, messages) {
	const res = await modelRuntime.completeSimple(
		chatModel,
		{ systemPrompt: "You are a concise coding assistant. Answer using only the conversation history.", messages },
		{ reasoning: "off" },
	);
	const text = res.content
		.filter((b) => b.type === "text")
		.map((b) => b.text)
		.join(" ")
		.trim();
	return {
		label,
		stopReason: res.stopReason,
		errorMessage: res.errorMessage,
		inputTokens: res.usage.input,
		cacheRead: res.usage.cacheRead,
		totalInput: res.usage.input + res.usage.cacheRead,
		outputTokens: res.usage.output,
		text,
	};
}

const rBaseline = await askModel("1. Turn 5 — Baseline (all 4 raw outputs kept)", baselineMessages);
const rStubOnly = await askModel("2. Turn 5 — Pruned stubs only (no Jev recall)", stubOnlyMessages);
const rJevRecall = await askModel("3. Turn 5 — Pruned stubs + Jev tail recall", jevMessages);

// Turn 6: Follow-up that only needs the answer from Turn 5, not any raw log
const turn6Question = "Write the one-line TypeScript type fix to add that property as an optional number on JwtHeaderClaims.";
const jevRes6 = await modelRuntime.classify(jev, {
	state: { userPrompt: turn6Question, archivedToolOutputs: archiveSummary },
	questions,
});
const recalledIds6 = Object.entries(jevRes6.answers)
	.filter(([, a]) => a.type === "bool" && a.probability >= 0.5)
	.map(([id]) => id);
const turn6Messages = [
	...stubOnlyMessages,
	{ role: "assistant", content: [{ type: "text", text: rJevRecall.text }], api: chatModel.api, provider: chatModel.provider, model: chatModel.id, usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } }, stopReason: "stop", timestamp: Date.now() + 600 },
	{ role: "user", content: turn6Question, timestamp: Date.now() + 610 },
];
const rTurn6 = await askModel("4. Turn 6 — Follow-up after tail recall drops off", turn6Messages);

console.log("=== JEV CLASSIFIER DECISION (Turn 5) ===");
for (const [id, ans] of Object.entries(jevRes.answers)) {
	console.log(`  ${id}: prob=${ans.probability.toFixed(3)} -> ${ans.probability >= 0.5 ? "RECALL" : "skip"}`);
}
console.log(`  Jev latency: ${jevMs}ms | Jev tokens: ${jevRes.usage?.input ?? 0} in | Jev cost: $${(jevRes.usage?.cost?.total ?? 0).toFixed(6)}`);
console.log("");
console.log("=== JEV CLASSIFIER DECISION (Turn 6) ===");
for (const [id, ans] of Object.entries(jevRes6.answers)) {
	console.log(`  ${id}: prob=${ans.probability.toFixed(3)} -> ${ans.probability >= 0.5 ? "RECALL" : "skip"}`);
}
console.log("");
for (const r of [rBaseline, rStubOnly, rJevRecall, rTurn6]) {
	console.log(`=== ${r.label} ===`);
	console.log(`  Stop: ${r.stopReason} ${r.errorMessage ? `| Error: ${r.errorMessage}` : ""}`);
	console.log(`  Prompt tokens: ${r.totalInput} total (uncached=${r.inputTokens}, cacheRead=${r.cacheRead})`);
	console.log(`  Model answer: ${r.text}`);
	console.log("");
}
