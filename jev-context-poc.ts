import type { ExtensionAPI, SessionBoundaryDraft } from "@earendil-works/pi-coding-agent";

interface ArchivedToolOutput {
	id: string;
	entryId: string;
	toolName: string;
	argsSummary: string;
	stub: string;
	rawText: string;
}

const MIN_CHARS_TO_ARCHIVE = 600;
const JEV_THRESHOLD = 0.5;

function extractText(content: unknown): string {
	if (typeof content === "string") return content;
	if (!Array.isArray(content)) return "";
	return content
		.filter((b): b is { type: "text"; text: string } => b?.type === "text" && typeof b.text === "string")
		.map((b) => b.text)
		.join("\n");
}

function buildStub(id: string, toolName: string, argsSummary: string, rawText: string, isError: boolean): string {
	const lines = rawText.split("\n");
	const preview = lines.slice(0, 3).join(" | ").slice(0, 180);
	return `[archived ${id}] ${toolName}(${argsSummary}) status=${isError ? "error" : "ok"} (${rawText.length} chars, ${lines.length} lines) preview: ${preview}`;
}

export default function jevContextPoc(pi: ExtensionAPI) {
	const sideStore = new Map<string, ArchivedToolOutput>();
	const pendingThisRun: ArchivedToolOutput[] = [];
	const toolArgsByCallId = new Map<string, string>();
	let lastScoredUserPrompt = "";
	let lastRecalledIds: string[] = [];

	pi.on("session_start", (_event, ctx) => {
		sideStore.clear();
		for (const entry of ctx.sessionManager.getBranch()) {
			if (entry.type === "custom" && entry.customType === "jev-side-store" && Array.isArray(entry.data)) {
				for (const item of entry.data as ArchivedToolOutput[]) {
					sideStore.set(item.id, item);
				}
			}
		}
	});

	pi.on("tool_call", (event) => {
		toolArgsByCallId.set(event.toolCallId, JSON.stringify(event.input).slice(0, 120));
	});

	pi.on("turn_end", (event) => {
		event.toolResults.forEach((tr, i) => {
			const entryId = event.toolResultEntryIds[i];
			const rawText = extractText(tr.content);
			if (!entryId || rawText.length < MIN_CHARS_TO_ARCHIVE) return;

			const id = `tc_${sideStore.size + pendingThisRun.length + 1}`;
			const argsSummary = toolArgsByCallId.get(tr.toolCallId) ?? "";
			const stub = buildStub(id, tr.toolName, argsSummary, rawText, tr.isError);
			pendingThisRun.push({ id, entryId, toolName: tr.toolName, argsSummary, stub, rawText });
		});
	});

	pi.on("agent_before_settle", (event) => {
		if (pendingThisRun.length === 0) return;
		const batch = pendingThisRun.splice(0, pendingThisRun.length);
		for (const item of batch) sideStore.set(item.id, item);

		const edits: SessionBoundaryDraft[] = batch.map((item) => ({
			type: "context_edit",
			targetId: item.entryId,
			replacement: { content: [{ type: "text", text: item.stub }] },
		}));

		return {
			entries: [
				...event.entries,
				...edits,
				{ type: "custom", customType: "jev-side-store", data: batch },
			],
		};
	});

	pi.on("context", async (event, ctx) => {
		if (sideStore.size === 0) return;

		const lastUserIdx = event.messages.findLastIndex((m) => m.role === "user");
		if (lastUserIdx === -1) return;
		const lastUser = event.messages[lastUserIdx];
		if (lastUser.role !== "user") return;
		const promptText = extractText(lastUser.content);

		if (promptText !== lastScoredUserPrompt) {
			lastScoredUserPrompt = promptText;
			lastRecalledIds = [];

			const jev =
				ctx.modelRegistry.findOfType("classifier", "openrouter", "~typesafe/jev-latest") ??
				ctx.modelRegistry.findOfType("classifier", "openrouter", "typesafe/jev-1.14");

			if (jev) {
				const archiveSummary: Record<string, string> = {};
				const questions: Record<string, { type: "bool"; instructions: string; criteria: { true: string; false: string } }> = {};

				for (const [id, item] of sideStore.entries()) {
					archiveSummary[id] = item.stub;
					questions[id] = {
						type: "bool",
						instructions: `Is the full raw output of ${id} needed to accurately answer the current userPrompt?`,
						criteria: {
							true: "The userPrompt asks about details, errors, or code from this tool output",
							false: "The summary stub is sufficient or this tool output is unrelated",
						},
					};
				}

				const res = await ctx.modelRegistry.classify(
					jev,
					{ state: { userPrompt: promptText, archivedToolOutputs: archiveSummary }, questions },
					{ signal: ctx.signal },
				);

				if (res.stopReason === "stop") {
					lastRecalledIds = Object.entries(res.answers)
						.filter(([, ans]) => ans.type === "bool" && ans.probability >= JEV_THRESHOLD)
						.map(([id]) => id);
				}
			}
		}

		if (lastRecalledIds.length === 0) return;

		const recalledBlocks = lastRecalledIds
			.map((id) => sideStore.get(id))
			.filter((item): item is ArchivedToolOutput => Boolean(item))
			.map((item) => `[Recalled full output for ${item.id} (${item.toolName} ${item.argsSummary})]:\n${item.rawText}`)
			.join("\n\n");

		const updatedMessages = [...event.messages];
		updatedMessages[lastUserIdx] = {
			...lastUser,
			content: `${promptText}\n\n<recalled_context>\n${recalledBlocks}\n</recalled_context>`,
		};
		return { messages: updatedMessages };
	});
}
