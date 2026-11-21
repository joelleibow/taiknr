import type { SessionEntry } from "@earendil-works/pi-coding-agent";
import { expect, test } from "vitest";
import { DEFAULT_TAIKNR_CONFIG, type TaiknrConfig } from "../../../src/config/taiknr-config.js";
import { createPiSummarizerAdapter } from "../../../src/infra/adapters/pi-summarizer-adapter.js";
import type { InstrumentPublisher } from "../../../src/use-cases/instruments-publisher.js";
import { createContextStub } from "../../support/fake-pi.js";
import {
	createSummarizerFake,
	SUMMARIZER_TEST_MODEL,
	SUMMARIZER_TEST_PROVIDER,
	type SummarizerFake,
} from "../../support/summarizer-fake.js";

const CONFIG: TaiknrConfig = {
	...DEFAULT_TAIKNR_CONFIG,
	conversationSummaryEnabled: true,
	conversationSummaryProvider: SUMMARIZER_TEST_PROVIDER,
	conversationSummaryModel: SUMMARIZER_TEST_MODEL,
};

/** The system prompt the `conversation-summary` delta quotes, byte for byte. */
const SYSTEM_PROMPT =
	"Summarize this conversation between a user and an AI assistant for a classifier that will judge which earlier tool results are needed for the user's next message. Start with one line `Goal:` stating what the user is trying to accomplish overall. Then `Now:` stating what is being worked on at the end of the conversation. Then up to 5 short bullets of key facts, decisions, files or names in play. At most 120 words. No preamble.";

/** One branch entry, carrying just the fields the adapter reads. */
function entry(id: string, message: unknown): SessionEntry {
	return {
		type: "message",
		id,
		parentId: null,
		timestamp: "2026-11-20T00:00:00.000Z",
		message,
	} as unknown as SessionEntry;
}

const ENTRIES: SessionEntry[] = [
	entry("e1", { role: "user", content: "hi", timestamp: 1 }),
	entry("e2", { role: "assistant", content: [{ type: "text", text: "hello" }], timestamp: 2 }),
];

/** A notifier recording each warning. */
function fakeNotifier() {
	const calls: string[] = [];
	return { calls, notifier: { notifyOnce: (message: string) => calls.push(message) } };
}

/** A spend recorder standing in for the publisher's `summarized`. */
function fakeSpend() {
	const calls: ({ costTotal: number } | undefined)[] = [];
	return {
		calls,
		spend: { summarized: (spend: { costTotal: number } | undefined) => calls.push(spend) } as Pick<
			InstrumentPublisher,
			"summarized"
		>,
	};
}

/** An adapter over the fake's registry, plus everything the case asserts on. */
function adapter(config: TaiknrConfig = CONFIG) {
	const fake = createSummarizerFake();
	const ctx = createContextStub({ cwd: "/tmp", trusted: true, modelRegistry: fake.modelRegistry });
	const { calls: warnings, notifier } = fakeNotifier();
	const { calls: spends, spend } = fakeSpend();
	return { fake, warnings, spends, summarizer: createPiSummarizerAdapter(ctx, config, notifier, spend) };
}

/** The one user message the fake's first call carried. */
function messageOf(fake: SummarizerFake): { content: string; role: string } {
	const context = fake.calls[0].context as { messages: { content: string; role: string }[] };
	return context.messages[0];
}

test("U1: one call, the rendered conversation, the quoted system prompt and the default options", async () => {
	const { fake, summarizer } = adapter();
	fake.answer({ text: "Goal: g" });
	const signal = new AbortController().signal;

	const summary = await summarizer.summarize(ENTRIES, signal);

	expect(summary).toBe("Goal: g");
	expect(fake.calls).toHaveLength(1);
	expect(fake.calls[0].context).toEqual({
		systemPrompt: SYSTEM_PROMPT,
		messages: [{ role: "user", content: "user: hi\n\nassistant: hello", timestamp: expect.any(Number) }],
	});
	expect(fake.calls[0].options).toEqual({ temperature: 0, reasoning: "high", signal });
});

test("U2: at off the options are temperature and signal and nothing else", async () => {
	const { fake, summarizer } = adapter({ ...CONFIG, conversationSummaryThinkingLevel: "off" });
	fake.answer({ text: "Goal: g" });

	await summarizer.summarize(ENTRIES, new AbortController().signal);

	expect(fake.calls[0].options).toEqual({ temperature: 0, signal: expect.any(AbortSignal) });
});

test("U3: a configured level is passed unchanged", async () => {
	const { fake, summarizer } = adapter({ ...CONFIG, conversationSummaryThinkingLevel: "medium" });
	fake.answer({ text: "Goal: g" });

	await summarizer.summarize(ENTRIES, new AbortController().signal);

	expect(fake.calls[0].options).toMatchObject({ reasoning: "medium" });
});

test("U4: taiknr's own abort yields no summary and no warning, reports its spend, and a later error still warns once", async () => {
	const { fake, summarizer, warnings, spends } = adapter();
	fake.answer("hang");
	const controller = new AbortController();

	const aborted = summarizer.summarize(ENTRIES, controller.signal);
	controller.abort();

	expect(await aborted).toBeUndefined();
	expect(warnings).toEqual([]);
	expect(spends).toEqual([{ costTotal: 0 }]);

	fake.answer("error");
	expect(await summarizer.summarize(ENTRIES, new AbortController().signal)).toBeUndefined();
	expect(warnings).toHaveLength(1);
});

test("U5: an error with an unaborted signal shows one warning naming both settings", async () => {
	const { fake, summarizer, warnings } = adapter();
	fake.answer("error");

	expect(await summarizer.summarize(ENTRIES, new AbortController().signal)).toBeUndefined();
	expect(warnings).toHaveLength(1);
	expect(warnings[0]).toContain("conversationSummaryProvider");
	expect(warnings[0]).toContain("conversationSummaryModel");
});

test("U6: a summary outside the format is dropped with no warning", async () => {
	const { fake, summarizer, warnings } = adapter();
	fake.answer({ text: "no goal line here" });

	expect(await summarizer.summarize(ENTRIES, new AbortController().signal)).toBeUndefined();
	expect(warnings).toEqual([]);
});

test("U7: a model that does not resolve warns once and makes no call", async () => {
	const { fake, summarizer, warnings } = adapter({
		...CONFIG,
		conversationSummaryProvider: "not-a-provider",
		conversationSummaryModel: "not-a-model",
	});

	expect(await summarizer.summarize(ENTRIES, new AbortController().signal)).toBeUndefined();
	expect(warnings).toHaveLength(1);
	expect(fake.calls).toEqual([]);
});

test("U8: the branch renders as the user's and assistant's text and each tool call's arguments", async () => {
	const { fake, summarizer } = adapter();
	fake.answer({ text: "Goal: g" });
	const branch: SessionEntry[] = [
		entry("e1", { role: "user", content: "read a.ts", timestamp: 1 }),
		entry("e2", {
			role: "assistant",
			content: [
				{ type: "thinking", thinking: "hmm" },
				{ type: "text", text: "Reading" },
				{ type: "text", text: "it now" },
				{ type: "toolCall", id: "c1", name: "read", arguments: { path: "a.ts" } },
			],
			timestamp: 2,
		}),
		entry("e3", {
			role: "toolResult",
			toolCallId: "c1",
			toolName: "read",
			content: [{ type: "text", text: "file" }],
			timestamp: 3,
		}),
		{
			type: "bashExecution",
			id: "e4",
			parentId: "e3",
			timestamp: "2026-11-20T00:00:00.000Z",
		} as unknown as SessionEntry,
		{
			type: "custom_message",
			id: "e5",
			parentId: "e4",
			timestamp: "2026-11-20T00:00:00.000Z",
			customType: "x",
			content: "y",
		} as unknown as SessionEntry,
		{
			type: "compaction",
			id: "e6",
			parentId: "e5",
			timestamp: "2026-11-20T00:00:00.000Z",
			summary: "s",
			firstKeptEntryId: "e1",
			tokensBefore: 1,
		} as unknown as SessionEntry,
		{
			type: "branch_summary",
			id: "e7",
			parentId: "e6",
			timestamp: "2026-11-20T00:00:00.000Z",
			fromId: "e1",
			summary: "s",
		} as unknown as SessionEntry,
		entry("e8", {
			role: "assistant",
			content: [{ type: "toolCall", id: "c2", name: "bash", arguments: undefined }],
			timestamp: 8,
		}),
		entry("e9", { role: "assistant", content: [{ type: "text", text: "   " }], timestamp: 9 }),
	];

	await summarizer.summarize(branch, new AbortController().signal);

	expect(messageOf(fake).content).toBe(
		'user: read a.ts\n\nassistant: Reading\nit now\n\ntool call read({"path":"a.ts"})\n\ntool call bash({})',
	);
});
