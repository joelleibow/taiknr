import { SessionManager, type TurnEndEvent } from "@earendil-works/pi-coding-agent";
import { expect, test } from "vitest";
import { createGatedPi } from "../../../src/app/extension/handler-gate.js";
import { createSessionConfig } from "../../../src/config/session-config.js";
import { DEFAULT_TAIKNR_CONFIG } from "../../../src/config/taiknr-config.js";
import type { ArchivedToolOutput } from "../../../src/domain/archived-output.js";
import { InMemoryArchiveStore } from "../../../src/infra/adapters/pi-archive-adapter.js";
import { registerTurnEndHandler } from "../../../src/infra/pi-event-handlers/turn-end.js";
import { createContextStub, createFakePi } from "../../support/fake-pi.js";

type ToolResultMessage = TurnEndEvent["toolResults"][number];

/** One text block of `length` characters. */
function text(length: number): ToolResultMessage["content"] {
	return [{ type: "text", text: "x".repeat(length) }];
}

/** A tool result carrying the given content blocks. */
function toolResult(overrides: Partial<ToolResultMessage> = {}): ToolResultMessage {
	return {
		role: "toolResult",
		toolCallId: "call-1",
		toolName: "bash",
		content: text(600),
		isError: false,
		timestamp: 0,
		...overrides,
	};
}

/** The text of the first tool result the manager's projection carries. */
function projectedToolResultText(manager: SessionManager): string | undefined {
	const message = manager.buildSessionProjection().messages.find(({ role }) => role === "toolResult");
	if (message === undefined || message.role !== "toolResult") return undefined;
	const [block] = message.content;
	return block?.type === "text" ? block.text : undefined;
}

/**
 * The handler wired as the composition root wires it: a real store, a real branch, the test's own
 * config holder, and the gate the six non-start handlers pass through (M10; Decision 12).
 */
function harness(options: { minCharsToArchive?: number; ready?: boolean } = {}) {
	const fake = createFakePi();
	const session = createSessionConfig();
	const manager = SessionManager.inMemory();
	const store = new InMemoryArchiveStore();
	const deps = {
		config: session,
		argsByCallId: new Map<string, string>(),
		pendingOutputs: [] as ArchivedToolOutput[],
		originalContentByEntryId: new Map<string, unknown[]>(),
	};
	registerTurnEndHandler(createGatedPi(fake.pi, session), deps);
	if (options.ready ?? true) {
		session.assign({
			status: "ready",
			config: { ...DEFAULT_TAIKNR_CONFIG, minCharsToArchive: options.minCharsToArchive ?? 600 },
		});
	}
	const ctx = createContextStub({ cwd: "/tmp", trusted: false });

	/** Persist a tool result on the branch and return the entry id Pi gave it. */
	function persist(result: ToolResultMessage): string {
		return manager.appendMessage(result);
	}

	/** The projected entries the boundary preview would carry for the branch as it stands. */
	function contextEntries() {
		return manager
			.getBranch()
			.flatMap((entry) =>
				entry.type === "message" && entry.message.role === "toolResult"
					? [{ sourceEntry: entry, messages: [entry.message] }]
					: [],
			);
	}

	function turnEnd(toolResults: ToolResultMessage[], outcome = "completed") {
		return fake.registered[0].handler(
			{
				type: "turn_end",
				toolResults,
				toolResultEntryIds: toolResults.map(() => ""),
				outcome,
				entries: [],
				context: { contextEntries: contextEntries() },
			},
			ctx,
		);
	}

	return { deps, manager, persist, session, store, turnEnd };
}

test("a result at the threshold stages one item under the persisted entry id", () => {
	const test_ = harness();
	const result = toolResult();
	const entryId = test_.persist(result);

	test_.turnEnd([result]);

	expect(test_.deps.pendingOutputs).toHaveLength(1);
	expect(test_.deps.pendingOutputs[0].id).toBe(entryId);
	expect(test_.deps.pendingOutputs[0].rawText).toBe("x".repeat(600));
});

test("a result one character below the threshold stages nothing and records no content", () => {
	const test_ = harness();
	const result = toolResult({ content: text(599) });
	test_.persist(result);

	test_.turnEnd([result]);

	expect(test_.deps.pendingOutputs).toEqual([]);
	expect(test_.deps.originalContentByEntryId.size).toBe(0);
});

test("a completed turn stages what it persisted", () => {
	const test_ = harness();
	const result = toolResult();
	test_.persist(result);

	test_.turnEnd([result], "completed");

	expect(test_.deps.pendingOutputs).toHaveLength(1);
});

test("an aborted turn stages what it persisted", () => {
	const test_ = harness();
	const result = toolResult();
	test_.persist(result);

	test_.turnEnd([result], "aborted");

	expect(test_.deps.pendingOutputs).toHaveLength(1);
});

test("a failed turn stages what it persisted", () => {
	const test_ = harness();
	const result = toolResult();
	test_.persist(result);

	test_.turnEnd([result], "error");

	expect(test_.deps.pendingOutputs).toHaveLength(1);
});

test("an image-only result stages nothing at a zero threshold", () => {
	const test_ = harness({ minCharsToArchive: 0 });
	const result = toolResult({ content: [{ type: "image", data: "AAAA", mimeType: "image/png" }] });
	test_.persist(result);

	test_.turnEnd([result]);

	expect(test_.deps.pendingOutputs).toEqual([]);
});

test("the recorded content is the last result carrying that call id", () => {
	const test_ = harness();
	const small = toolResult({ content: [{ type: "image", data: "FIRST", mimeType: "image/png" }] });
	const big = toolResult({ content: text(600) });
	test_.persist(small);
	const bigId = test_.manager.appendMessage(big);

	test_.turnEnd([small, big]);

	expect(test_.deps.pendingOutputs.map(({ id }) => id)).toEqual([bigId]);
	expect(test_.deps.originalContentByEntryId.get(bigId)).toEqual(text(600));
});

test("only the result reaching the threshold records its content", () => {
	const test_ = harness();
	const small = toolResult({ toolCallId: "call-1", content: text(10) });
	const big = toolResult({ toolCallId: "call-2", content: text(700) });
	const smallId = test_.persist(small);
	const bigId = test_.persist(big);

	test_.turnEnd([small, big]);

	expect([...test_.deps.originalContentByEntryId.keys()]).toEqual([bigId]);
	expect(test_.deps.originalContentByEntryId.has(smallId)).toBe(false);
});

test("a settled turn proposes no draft", () => {
	const test_ = harness();
	const result = toolResult();
	test_.persist(result);

	expect(test_.turnEnd([result])).toBeUndefined();
});

test("an unresolved config holder stages nothing", () => {
	const test_ = harness({ ready: false });
	const result = toolResult();
	test_.persist(result);

	expect(test_.turnEnd([result])).toBeUndefined();

	expect(test_.deps.pendingOutputs).toEqual([]);
	expect(test_.deps.originalContentByEntryId.size).toBe(0);
});

test("nothing stages while taiknr is off, earlier stubs stay stubbed, and staging resumes when it is on", () => {
	const test_ = harness();
	const first = toolResult({ toolCallId: "call-1" });
	const firstId = test_.persist(first);
	test_.turnEnd([first]);
	expect(test_.deps.pendingOutputs).toHaveLength(1);

	test_.manager.appendContextEdit(firstId, { content: [{ type: "text", text: "stubbed" }] });
	test_.session.setEnabled(false);
	const second = toolResult({ toolCallId: "call-2" });
	test_.persist(second);

	test_.turnEnd([second]);

	expect(test_.deps.pendingOutputs).toHaveLength(1);
	expect(projectedToolResultText(test_.manager)).toBe("stubbed");

	test_.session.setEnabled(true);
	test_.turnEnd([second]);

	expect(test_.deps.pendingOutputs).toHaveLength(2);
});
