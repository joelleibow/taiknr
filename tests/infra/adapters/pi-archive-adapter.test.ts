import {
	type ContextEditEntry,
	type ProjectedSessionEntry,
	type SessionEntry,
	SessionManager,
	type TurnEndEvent,
} from "@earendil-works/pi-coding-agent";
import { expect, test } from "vitest";
import type { ArchivedToolOutput } from "../../../src/domain/archived-output.js";
import {
	readArchiveBatchesFromBranch,
	readEligibleArchivedIds,
	TAIKNR_SIDE_STORE_TYPE,
	toSettlementDrafts,
	toToolOutputCandidates,
} from "../../../src/infra/adapters/pi-archive-adapter.js";

type ToolResult = TurnEndEvent["toolResults"][number];

/** A tool result carrying one text block unless a case says otherwise. */
function toolResult(overrides: Partial<ToolResult> = {}): ToolResult {
	return {
		role: "toolResult",
		toolCallId: "call-1",
		toolName: "bash",
		content: [{ type: "text", text: "out" }],
		isError: false,
		timestamp: 0,
		...overrides,
	};
}

/** A projected entry whose source is a persisted tool-result message with `toolCallId`. */
function projected(entryId: string, toolCallId: string): ProjectedSessionEntry {
	const message = toolResult({ toolCallId });
	return {
		sourceEntry: { type: "message", id: entryId, parentId: null, timestamp: "", message },
		messages: [message],
	};
}

/**
 * A `turn_end` event carrying only what the adapter reads. Omitting `contextEntries` leaves
 * `context` without the member, which is the shape Pi gives a boundary with no projection.
 */
function turnEnd(options: {
	toolResults: ToolResult[];
	toolResultEntryIds?: string[];
	contextEntries?: ProjectedSessionEntry[];
}): TurnEndEvent {
	const context = options.contextEntries === undefined ? {} : { contextEntries: options.contextEntries };
	return {
		type: "turn_end",
		toolResults: options.toolResults,
		toolResultEntryIds: options.toolResultEntryIds ?? options.toolResults.map(() => ""),
		context,
	} as unknown as TurnEndEvent;
}

/** An archived item carrying just the fields this file asserts on. */
function item(id: string, rawText = "x"): ArchivedToolOutput {
	return { id, toolName: "bash", argsSummary: "", isError: false, stub: `[archived ${id}]`, rawText };
}

/** The text of every text block in a draft's replacement content, in order. */
function replacementContent(draft: unknown): unknown[] {
	const { replacement } = draft as { replacement: { content: unknown[] } };
	return replacement.content;
}

test("results pair with the projected entries carrying their call id", () => {
	const event = turnEnd({
		toolResults: [toolResult({ toolCallId: "call-1" }), toolResult({ toolCallId: "call-2" })],
		contextEntries: [projected("aaaa1111", "call-1"), projected("bbbb2222", "call-2")],
	});

	const candidates = toToolOutputCandidates(event, new Map());

	expect(candidates.map(({ entryId }) => entryId)).toEqual(["aaaa1111", "bbbb2222"]);
	expect(candidates.map(({ toolCallId }) => toolCallId)).toEqual(["call-1", "call-2"]);
});

test("a repeated call id in one turn pairs with the last projected match", () => {
	const event = turnEnd({
		toolResults: [toolResult({ toolCallId: "call-1" })],
		contextEntries: [projected("aaaa1111", "call-1"), projected("bbbb2222", "call-1")],
	});

	const candidates = toToolOutputCandidates(event, new Map());

	expect(candidates.map(({ entryId }) => entryId)).toEqual(["bbbb2222"]);
});

test("an absent projection falls back to position when the lengths agree", () => {
	const event = turnEnd({
		toolResults: [toolResult({ toolCallId: "call-1" }), toolResult({ toolCallId: "call-2" })],
		toolResultEntryIds: ["aaaa1111", "bbbb2222"],
	});

	const candidates = toToolOutputCandidates(event, new Map());

	expect(candidates.map(({ entryId }) => entryId)).toEqual(["aaaa1111", "bbbb2222"]);
});

test("an absent projection with unequal lengths skips every result instead of throwing", () => {
	const event = turnEnd({
		toolResults: [toolResult({ toolCallId: "call-1" }), toolResult({ toolCallId: "call-2" })],
		toolResultEntryIds: ["aaaa1111"],
	});

	expect(toToolOutputCandidates(event, new Map())).toEqual([]);
});

test("a result with no projected match and no usable fallback is skipped", () => {
	const event = turnEnd({
		toolResults: [toolResult({ toolCallId: "call-9" })],
		toolResultEntryIds: ["aaaa1111"],
		contextEntries: [projected("bbbb2222", "call-2")],
	});

	expect(toToolOutputCandidates(event, new Map())).toEqual([]);
});

test("a call whose arguments were recorded carries its summary, and a miss carries none", () => {
	const event = turnEnd({
		toolResults: [toolResult({ toolCallId: "call-1" }), toolResult({ toolCallId: "call-2" })],
		contextEntries: [projected("aaaa1111", "call-1"), projected("bbbb2222", "call-2")],
	});

	const candidates = toToolOutputCandidates(event, new Map([["call-2", '{"command":"ls"}']]));

	expect(candidates.map(({ argsSummary }) => argsSummary)).toEqual(["", '{"command":"ls"}']);
});

test("one text block is the raw text verbatim", () => {
	const event = turnEnd({
		toolResults: [toolResult({ content: [{ type: "text", text: "a\nb" }] })],
		contextEntries: [projected("aaaa1111", "call-1")],
	});

	expect(toToolOutputCandidates(event, new Map())[0].rawText).toBe("a\nb");
});

test("two text blocks join with one newline", () => {
	const event = turnEnd({
		toolResults: [
			toolResult({
				content: [
					{ type: "text", text: "a" },
					{ type: "text", text: "b" },
				],
			}),
		],
		contextEntries: [projected("aaaa1111", "call-1")],
	});

	expect(toToolOutputCandidates(event, new Map())[0].rawText).toBe("a\nb");
});

test("an image-only result carries no raw text", () => {
	const event = turnEnd({
		toolResults: [toolResult({ content: [{ type: "image", data: "AAAA", mimeType: "image/png" }] })],
		contextEntries: [projected("aaaa1111", "call-1")],
	});

	expect(toToolOutputCandidates(event, new Map())[0].rawText).toBe("");
});

test("one empty text block carries no raw text", () => {
	const event = turnEnd({
		toolResults: [toolResult({ content: [{ type: "text", text: "" }] })],
		contextEntries: [projected("aaaa1111", "call-1")],
	});

	expect(toToolOutputCandidates(event, new Map())[0].rawText).toBe("");
});

test("two empty text blocks carry no raw text rather than a lone newline", () => {
	const event = turnEnd({
		toolResults: [
			toolResult({
				content: [
					{ type: "text", text: "" },
					{ type: "text", text: "" },
				],
			}),
		],
		contextEntries: [projected("aaaa1111", "call-1")],
	});

	expect(toToolOutputCandidates(event, new Map())[0].rawText).toBe("");
});

test("whitespace-only text is kept as text", () => {
	const event = turnEnd({
		toolResults: [toolResult({ content: [{ type: "text", text: "   " }] })],
		contextEntries: [projected("aaaa1111", "call-1")],
	});

	expect(toToolOutputCandidates(event, new Map())[0].rawText).toBe("   ");
});

test("the tool name and error state carry through", () => {
	const event = turnEnd({
		toolResults: [toolResult({ toolName: "grep", isError: true })],
		contextEntries: [projected("aaaa1111", "call-1")],
	});

	const [candidate] = toToolOutputCandidates(event, new Map());

	expect(candidate.toolName).toBe("grep");
	expect(candidate.isError).toBe(true);
});

test("a 36-character entry id comes back whole", () => {
	const id = "01234567-89ab-cdef-0123-456789abcdef";
	const event = turnEnd({
		toolResults: [toolResult()],
		contextEntries: [projected(id, "call-1")],
	});

	expect(toToolOutputCandidates(event, new Map())[0].entryId).toBe(id);
});

test("the results' order is preserved", () => {
	const event = turnEnd({
		toolResults: [
			toolResult({ toolCallId: "call-2", toolName: "second" }),
			toolResult({ toolCallId: "call-1", toolName: "first" }),
		],
		contextEntries: [projected("aaaa1111", "call-1"), projected("bbbb2222", "call-2")],
	});

	const candidates = toToolOutputCandidates(event, new Map());

	expect(candidates.map(({ toolName }) => toolName)).toEqual(["second", "first"]);
	expect(candidates.map(({ entryId }) => entryId)).toEqual(["bbbb2222", "aaaa1111"]);
});

test("one item settles as a side-store record followed by its replacement", () => {
	const batch = [item("aaaa1111")];

	const drafts = toSettlementDrafts(batch, new Map());

	expect(drafts).toEqual([
		{ type: "custom", customType: TAIKNR_SIDE_STORE_TYPE, data: batch },
		{
			type: "context_edit",
			targetId: "aaaa1111",
			replacement: { content: [{ type: "text", text: "[archived aaaa1111]" }] },
		},
	]);
});

test("the side-store record carries the whole batch, unchanged and in order", () => {
	const batch = [item("aaaa1111"), item("bbbb2222")];

	const drafts = toSettlementDrafts(batch, new Map());
	const record = drafts[0] as { data: ArchivedToolOutput[] };

	expect(record.data).toBe(batch);
	expect(record.data).toEqual([item("aaaa1111"), item("bbbb2222")]);
});

test("a text block and an image block become the stub followed by the image", () => {
	const image = { type: "image", data: "AAAA", mimeType: "image/png" };

	const drafts = toSettlementDrafts(
		[item("aaaa1111")],
		new Map([["aaaa1111", [{ type: "text", text: "raw" }, image]]]),
	);

	expect(replacementContent(drafts[1])).toEqual([{ type: "text", text: "[archived aaaa1111]" }, image]);
});

test("text blocks around an image are all dropped, leaving the stub and the image", () => {
	const image = { type: "image", data: "AAAA", mimeType: "image/png" };

	const drafts = toSettlementDrafts(
		[item("aaaa1111")],
		new Map([["aaaa1111", [{ type: "text", text: "before" }, image, { type: "text", text: "after" }]]]),
	);

	expect(replacementContent(drafts[1])).toEqual([{ type: "text", text: "[archived aaaa1111]" }, image]);
});

test("the preserved blocks keep their original relative order", () => {
	const first = { type: "image", data: "AAAA", mimeType: "image/png" };
	const second = { type: "image", data: "BBBB", mimeType: "image/png" };

	const drafts = toSettlementDrafts(
		[item("aaaa1111")],
		new Map([["aaaa1111", [first, { type: "text", text: "between" }, second]]]),
	);

	expect(replacementContent(drafts[1])).toEqual([{ type: "text", text: "[archived aaaa1111]" }, first, second]);
});

test("an item with no recorded content settles as the stub alone", () => {
	const drafts = toSettlementDrafts([item("aaaa1111")], new Map());

	expect(replacementContent(drafts[1])).toEqual([{ type: "text", text: "[archived aaaa1111]" }]);
});

test("three items produce one record and three replacements in item order", () => {
	const batch = [item("aaaa1111"), item("bbbb2222"), item("cccc3333")];

	const drafts = toSettlementDrafts(batch, new Map());

	expect(drafts).toHaveLength(4);
	expect(drafts[0]).toMatchObject({ type: "custom", customType: TAIKNR_SIDE_STORE_TYPE });
	expect(drafts.slice(1).map((draft) => (draft as { targetId: string }).targetId)).toEqual([
		"aaaa1111",
		"bbbb2222",
		"cccc3333",
	]);
});

test("an empty batch produces no drafts", () => {
	expect(toSettlementDrafts([], new Map())).toEqual([]);
});

test("two side-store entries on a branch yield two batches in branch order", () => {
	const manager = SessionManager.inMemory();
	manager.appendCustomEntry(TAIKNR_SIDE_STORE_TYPE, [item("aaaa1111")]);
	manager.appendCustomEntry(TAIKNR_SIDE_STORE_TYPE, [item("bbbb2222"), item("cccc3333")]);

	const batches = readArchiveBatchesFromBranch(manager.getBranch());

	expect(batches.map((batch) => batch.map(({ id }) => id))).toEqual([["aaaa1111"], ["bbbb2222", "cccc3333"]]);
});

test("a branch with no side-store entry yields no batches", () => {
	const manager = SessionManager.inMemory();

	expect(readArchiveBatchesFromBranch(manager.getBranch())).toEqual([]);
});

test("entries of another type contribute nothing", () => {
	const manager = SessionManager.inMemory();
	const messageId = manager.appendMessage(toolResult());
	manager.appendContextEdit(messageId, { content: [{ type: "text", text: "redacted" }] });
	manager.appendCustomEntry("some-other-extension", [item("aaaa1111")]);
	manager.appendCompaction("summary", null, 100);

	expect(readArchiveBatchesFromBranch(manager.getBranch())).toEqual([]);
});

test("data that is a string is skipped whole", () => {
	const manager = SessionManager.inMemory();
	manager.appendCustomEntry(TAIKNR_SIDE_STORE_TYPE, "not a batch");

	expect(readArchiveBatchesFromBranch(manager.getBranch())).toEqual([]);
});

test("empty data is skipped whole", () => {
	const manager = SessionManager.inMemory();
	manager.appendCustomEntry(TAIKNR_SIDE_STORE_TYPE, []);

	expect(readArchiveBatchesFromBranch(manager.getBranch())).toEqual([]);
});

test("absent data is skipped whole", () => {
	const manager = SessionManager.inMemory();
	manager.appendCustomEntry(TAIKNR_SIDE_STORE_TYPE);

	expect(readArchiveBatchesFromBranch(manager.getBranch())).toEqual([]);
});

test("one bad item skips its whole batch, well-formed neighbours included", () => {
	const manager = SessionManager.inMemory();
	const missingErrorState = { id: "bbbb2222", toolName: "bash", argsSummary: "", stub: "s", rawText: "r" };
	manager.appendCustomEntry(TAIKNR_SIDE_STORE_TYPE, [item("aaaa1111"), missingErrorState, item("cccc3333")]);

	expect(readArchiveBatchesFromBranch(manager.getBranch())).toEqual([]);
});

test("a malformed entry beside a well-formed one keeps only the well-formed batch", () => {
	const manager = SessionManager.inMemory();
	manager.appendCustomEntry(TAIKNR_SIDE_STORE_TYPE, ["not an item"]);
	manager.appendCustomEntry(TAIKNR_SIDE_STORE_TYPE, [item("aaaa1111")]);

	expect(readArchiveBatchesFromBranch(manager.getBranch())).toEqual([[item("aaaa1111")]]);
});

test("an item carrying a property the shape does not name is still read", () => {
	const manager = SessionManager.inMemory();
	const withTimestamp = { ...item("aaaa1111"), archivedAt: "2026-11-14T00:00:00.000Z" };
	manager.appendCustomEntry(TAIKNR_SIDE_STORE_TYPE, [withTimestamp]);

	expect(readArchiveBatchesFromBranch(manager.getBranch())).toEqual([[withTimestamp]]);
});

test("an empty id fails the guard", () => {
	const manager = SessionManager.inMemory();
	manager.appendCustomEntry(TAIKNR_SIDE_STORE_TYPE, [{ ...item("aaaa1111"), id: "" }]);

	expect(readArchiveBatchesFromBranch(manager.getBranch())).toEqual([]);
});

test("a missing tool name fails the guard", () => {
	const manager = SessionManager.inMemory();
	const { toolName: _dropped, ...withoutToolName } = item("aaaa1111");
	manager.appendCustomEntry(TAIKNR_SIDE_STORE_TYPE, [withoutToolName]);

	expect(readArchiveBatchesFromBranch(manager.getBranch())).toEqual([]);
});

test("a non-string stub fails the guard", () => {
	const manager = SessionManager.inMemory();
	manager.appendCustomEntry(TAIKNR_SIDE_STORE_TYPE, [{ ...item("aaaa1111"), stub: 42 }]);

	expect(readArchiveBatchesFromBranch(manager.getBranch())).toEqual([]);
});

test("a non-boolean error state fails the guard", () => {
	const manager = SessionManager.inMemory();
	manager.appendCustomEntry(TAIKNR_SIDE_STORE_TYPE, [{ ...item("aaaa1111"), isError: "false" }]);

	expect(readArchiveBatchesFromBranch(manager.getBranch())).toEqual([]);
});

test("two entries carrying one id both survive, the later one last", () => {
	const manager = SessionManager.inMemory();
	manager.appendCustomEntry(TAIKNR_SIDE_STORE_TYPE, [item("aaaa1111", "root")]);
	manager.appendCustomEntry(TAIKNR_SIDE_STORE_TYPE, [item("aaaa1111", "leaf")]);

	const batches = readArchiveBatchesFromBranch(manager.getBranch());

	expect(batches.map(([only]) => only.rawText)).toEqual(["root", "leaf"]);
});

/** The blocks a `context_edit` replacement may carry. */
type EditableBlock = TurnEndEvent["toolResults"][number]["content"][number];

/** The replacement content a settlement writes for `id`: the stub's text block, then the original's. */
function stubContent(id: string, ...rest: EditableBlock[]) {
	return { content: [{ type: "text" as const, text: `[archived ${id}]` }, ...rest] };
}

/** A context_edit entry targeting `targetId`, built rather than appended so it can sit off a branch. */
function edit(targetId: string, replacement: ContextEditEntry["replacement"]): SessionEntry {
	return { type: "context_edit", id: `edit-of-${targetId}`, parentId: null, timestamp: "", targetId, replacement };
}

/** A side-store entry carrying `data`, built rather than appended. */
function sideStore(data: unknown): SessionEntry {
	return {
		type: "custom",
		id: "custom-entry",
		parentId: null,
		timestamp: "",
		customType: TAIKNR_SIDE_STORE_TYPE,
		data,
	};
}

test("an item whose latest edit is taiknr's stub is eligible", () => {
	const manager = SessionManager.inMemory();
	const id = manager.appendMessage(toolResult());
	manager.appendCustomEntry(TAIKNR_SIDE_STORE_TYPE, [item(id)]);
	manager.appendContextEdit(id, stubContent(id));

	expect(readEligibleArchivedIds(manager.getBranch())).toEqual(new Set([id]));
});

test("an item whose latest edit carries foreign content is ineligible", () => {
	const manager = SessionManager.inMemory();
	const id = manager.appendMessage(toolResult());
	manager.appendCustomEntry(TAIKNR_SIDE_STORE_TYPE, [item(id)]);
	manager.appendContextEdit(id, { content: [{ type: "text", text: "redacted" }] });

	expect(readEligibleArchivedIds(manager.getBranch())).toEqual(new Set());
});

test("an item whose entry is off the active branch is ineligible", () => {
	const entries = [sideStore([item("aaaa1111")]), edit("aaaa1111", stubContent("aaaa1111"))];

	expect(readEligibleArchivedIds(entries)).toEqual(new Set());
});

test("an item with no context_edit is ineligible", () => {
	const manager = SessionManager.inMemory();
	const id = manager.appendMessage(toolResult());
	manager.appendCustomEntry(TAIKNR_SIDE_STORE_TYPE, [item(id)]);

	expect(readEligibleArchivedIds(manager.getBranch())).toEqual(new Set());
});

test("a stub followed by the image the output carried leaves the item eligible", () => {
	const manager = SessionManager.inMemory();
	const id = manager.appendMessage(toolResult());
	const image = { type: "image" as const, data: "AAAA", mimeType: "image/png" };
	manager.appendCustomEntry(TAIKNR_SIDE_STORE_TYPE, [item(id)]);
	manager.appendContextEdit(id, stubContent(id, image));

	expect(readEligibleArchivedIds(manager.getBranch())).toEqual(new Set([id]));
});

test("empty entries yield an empty set", () => {
	expect(readEligibleArchivedIds([])).toEqual(new Set());
});

test("a null replacement makes the item ineligible", () => {
	const manager = SessionManager.inMemory();
	const id = manager.appendMessage(toolResult());
	manager.appendCustomEntry(TAIKNR_SIDE_STORE_TYPE, [item(id)]);
	manager.appendContextEdit(id, null);

	expect(readEligibleArchivedIds(manager.getBranch())).toEqual(new Set());
});

test("the latest of several edits decides, and a stub landing last makes the item eligible", () => {
	const manager = SessionManager.inMemory();
	const id = manager.appendMessage(toolResult());
	manager.appendCustomEntry(TAIKNR_SIDE_STORE_TYPE, [item(id)]);
	manager.appendContextEdit(id, stubContent(id));
	manager.appendContextEdit(id, { content: [{ type: "text", text: "redacted" }] });

	expect(readEligibleArchivedIds(manager.getBranch())).toEqual(new Set());

	manager.appendContextEdit(id, stubContent(id));

	expect(readEligibleArchivedIds(manager.getBranch())).toEqual(new Set([id]));
});

test("a malformed batch contributes no item, so its edit makes nothing eligible", () => {
	const manager = SessionManager.inMemory();
	const id = manager.appendMessage(toolResult());
	manager.appendCustomEntry(TAIKNR_SIDE_STORE_TYPE, ["not an item"]);
	manager.appendContextEdit(id, stubContent(id));

	expect(readEligibleArchivedIds(manager.getBranch())).toEqual(new Set());
});
