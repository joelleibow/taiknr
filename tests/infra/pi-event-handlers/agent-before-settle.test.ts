import { type SessionBoundaryDraft, SessionManager } from "@earendil-works/pi-coding-agent";
import { expect, test } from "vitest";
import { createGatedPi } from "../../../src/app/extension/handler-gate.js";
import { createSessionConfig } from "../../../src/config/session-config.js";
import { DEFAULT_TAIKNR_CONFIG } from "../../../src/config/taiknr-config.js";
import type { ArchivedToolOutput } from "../../../src/domain/archived-output.js";
import { InMemoryArchiveStore, TAIKNR_SIDE_STORE_TYPE } from "../../../src/infra/adapters/pi-archive-adapter.js";
import { registerAgentBeforeSettleHandler } from "../../../src/infra/pi-event-handlers/agent-before-settle.js";
import { createContextStub, createFakePi } from "../../support/fake-pi.js";

type ToolResultMessage = import("@earendil-works/pi-coding-agent").TurnEndEvent["toolResults"][number];

/** An archived item whose stub this file knows. */
function item(id: string, stub = `[archived ${id}]`): ArchivedToolOutput {
	return { id, toolName: "bash", argsSummary: "", isError: false, stub, rawText: "x".repeat(600) };
}

/** A tool result carrying 600 characters of text. */
function toolResult(overrides: Partial<ToolResultMessage> = {}): ToolResultMessage {
	return {
		role: "toolResult",
		toolCallId: "call-1",
		toolName: "bash",
		content: [{ type: "text", text: "x".repeat(600) }],
		isError: false,
		timestamp: 0,
		...overrides,
	};
}

/**
 * The handler wired as the composition root wires it: a real store, a real branch, the test's own
 * config holder, and the gate (M10; Decision 12).
 */
function harness() {
	const fake = createFakePi();
	const session = createSessionConfig();
	session.assign({ status: "ready", config: DEFAULT_TAIKNR_CONFIG });
	const manager = SessionManager.inMemory();
	const store = new InMemoryArchiveStore();
	const deps = {
		store,
		pendingOutputs: [] as ArchivedToolOutput[],
		originalContentByEntryId: new Map<string, unknown[]>(),
	};
	registerAgentBeforeSettleHandler(createGatedPi(fake.pi, session), deps);

	function settle(entries: SessionBoundaryDraft[] = []) {
		// The branch is read at event time, as Pi's own context would carry it.
		const ctx = createContextStub({ cwd: "/tmp", trusted: false, branch: manager.getBranch() });
		return fake.registered[0].handler({ type: "agent_before_settle", entries, continue: false, context: {} }, ctx);
	}

	/** Persist a tool result on the branch, stage it as pending, and return its entry id. */
	function stage(overrides: Partial<ToolResultMessage> = {}): string {
		const result = toolResult(overrides);
		const id = manager.appendMessage(result);
		deps.pendingOutputs.push(item(id));
		deps.originalContentByEntryId.set(id, result.content);
		return id;
	}

	return { deps, manager, session, store, settle, stage };
}

test("eligible items settle as side-store first, then their replacements, after another extension's draft", () => {
	const test_ = harness();
	const firstId = test_.stage();
	const secondId = test_.stage({ toolCallId: "call-2" });
	const other = { type: "custom" as const, customType: "another-extension", data: { note: true } };

	const result = test_.settle([other]);

	expect(result).toEqual({
		entries: [
			other,
			{ type: "custom", customType: TAIKNR_SIDE_STORE_TYPE, data: [item(firstId), item(secondId)] },
			{
				type: "context_edit",
				targetId: firstId,
				replacement: { content: [{ type: "text", text: `[archived ${firstId}]` }] },
			},
			{
				type: "context_edit",
				targetId: secondId,
				replacement: { content: [{ type: "text", text: `[archived ${secondId}]` }] },
			},
		],
	});
	expect(test_.store.getAll().map(({ id }) => id)).toEqual([firstId, secondId]);
	expect(test_.deps.pendingOutputs).toEqual([]);
	expect(test_.deps.originalContentByEntryId.size).toBe(0);
});

test("an item the branch no longer holds is dropped without a draft or a throw", () => {
	const test_ = harness();
	const anchorId = test_.manager.appendMessage({ role: "user", content: "go", timestamp: 0 });
	const goneId = test_.stage();
	test_.manager.branch(anchorId);

	expect(() => test_.settle()).not.toThrow();

	expect(test_.settle()).toBeUndefined();
	expect(test_.deps.pendingOutputs).toEqual([]);
	expect(test_.deps.originalContentByEntryId.has(goneId)).toBe(false);
	expect(test_.store.getAll()).toEqual([]);
});

test("an item whose target already carries a replacement edit is dropped, and the edit stands", () => {
	const test_ = harness();
	const id = test_.stage();
	test_.manager.appendContextEdit(id, { content: [{ type: "text", text: "redacted" }] });

	const result = test_.settle();

	expect(result).toBeUndefined();
	expect(test_.deps.pendingOutputs).toEqual([]);
	expect(test_.store.getAll()).toEqual([]);
});

test("an item whose target carries a null replacement is dropped, so Pi's omission stands", () => {
	const test_ = harness();
	const id = test_.stage();
	test_.manager.appendContextEdit(id, null);

	expect(test_.settle()).toBeUndefined();

	expect(test_.deps.pendingOutputs).toEqual([]);
	expect(test_.store.getAll()).toEqual([]);
});

test("an item another extension edits at this boundary is dropped, and that draft survives", () => {
	const test_ = harness();
	const id = test_.stage();
	const other = {
		type: "context_edit" as const,
		targetId: id,
		replacement: { content: [{ type: "text" as const, text: "from another extension" }] },
	};

	const result = test_.settle([other]);

	expect(result).toBeUndefined();
	expect(test_.deps.pendingOutputs).toEqual([]);
	expect(test_.store.getAll()).toEqual([]);
});

test("a settlement with nothing to commit drains nothing and keeps the store as it was", () => {
	const test_ = harness();
	const earlier = item("aaaa1111");
	test_.store.addBatch([earlier]);
	const anchorId = test_.manager.appendMessage({ role: "user", content: "go", timestamp: 0 });
	const id = test_.stage();
	test_.manager.branch(anchorId);

	const result = test_.settle();

	expect(result).toBeUndefined();
	expect(test_.deps.pendingOutputs).toEqual([]);
	expect(test_.store.getAll()).toEqual([earlier]);
	expect(test_.deps.originalContentByEntryId.has(id)).toBe(false);
});

test("a mixed drop-and-commit settlement releases every recorded content", () => {
	const test_ = harness();
	const keptId = test_.stage();
	const droppedId = test_.stage({ toolCallId: "call-2" });
	test_.manager.appendContextEdit(droppedId, { content: [{ type: "text", text: "replaced" }] });
	expect(test_.deps.originalContentByEntryId.size).toBe(2);

	test_.settle();

	expect(test_.deps.originalContentByEntryId.size).toBe(0);
	expect(test_.store.getAll().map(({ id }) => id)).toEqual([keptId]);
});

test("two items staged across two turns both commit at one settlement", () => {
	const test_ = harness();
	const firstId = test_.stage();
	const secondId = test_.stage({ toolCallId: "call-2" });

	const result = test_.settle();

	const record = (result as { entries: SessionBoundaryDraft[] }).entries[0] as { data: ArchivedToolOutput[] };
	expect(record.data.map(({ id }) => id)).toEqual([firstId, secondId]);
	expect(test_.store.getAll().map(({ id }) => id)).toEqual([firstId, secondId]);
});

test("a committed item settled again produces no second replacement and no repeated record", () => {
	const test_ = harness();
	const id = test_.stage();
	test_.settle();

	const again = test_.settle();

	expect(again).toBeUndefined();
	expect(test_.store.getAll().map((each) => each.id)).toEqual([id]);
});

test("a session that ends with items pending commits nothing", () => {
	const test_ = harness();
	test_.stage();

	expect(test_.store.size()).toBe(0);
	expect(test_.deps.pendingOutputs).toHaveLength(1);
});

test("nothing settles while taiknr is off, and settlement resumes when it is on", () => {
	const test_ = harness();
	const firstId = test_.stage();
	test_.settle();
	expect(test_.store.getAll().map(({ id }) => id)).toEqual([firstId]);

	test_.session.setEnabled(false);
	const secondId = test_.stage({ toolCallId: "call-2" });

	expect(test_.settle()).toBeUndefined();
	expect(test_.deps.pendingOutputs.map(({ id }) => id)).toEqual([secondId]);
	expect(test_.store.size()).toBe(1);

	test_.session.setEnabled(true);
	test_.settle();

	expect(test_.store.getAll().map(({ id }) => id)).toEqual([firstId, secondId]);
});
