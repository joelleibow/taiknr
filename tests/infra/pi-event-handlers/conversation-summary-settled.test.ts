import type { SessionEntry } from "@earendil-works/pi-coding-agent";
import { expect, test, vi } from "vitest";
import { createConversationSummaryState } from "../../../src/app/extension/conversation-summary-state.js";
import { createGatedPi } from "../../../src/app/extension/handler-gate.js";
import { createInstrumentsHolder } from "../../../src/app/extension/instruments-holder.js";
import { createSessionConfig } from "../../../src/config/session-config.js";
import { DEFAULT_TAIKNR_CONFIG } from "../../../src/config/taiknr-config.js";
import { registerConversationSummarySettledHandler } from "../../../src/infra/pi-event-handlers/conversation-summary-settled.js";
import type { InstrumentPublisher } from "../../../src/use-cases/instruments-publisher.js";
import { createContextStub, createFakePi } from "../../support/fake-pi.js";
import {
	createSummarizerFake,
	SUMMARIZER_TEST_MODEL,
	SUMMARIZER_TEST_PROVIDER,
	type SummarizerAnswer,
} from "../../support/summarizer-fake.js";

/** One branch entry, carrying the type, id and message the key derivation and the rendering read. */
function branchEntry(id: string, type: string, role?: string): SessionEntry {
	const content = role === "user" ? "hi" : [{ type: "text", text: "hello" }];
	return {
		type,
		id,
		parentId: null,
		timestamp: "2026-11-20T00:00:00.000Z",
		message: { role, content },
	} as unknown as SessionEntry;
}

const BRANCH: SessionEntry[] = [branchEntry("e1", "message", "user"), branchEntry("e2", "message", "assistant")];

const CONFIG = {
	...DEFAULT_TAIKNR_CONFIG,
	conversationSummaryEnabled: true,
	conversationSummaryProvider: SUMMARIZER_TEST_PROVIDER,
	conversationSummaryModel: SUMMARIZER_TEST_MODEL,
};

function harness(
	options: { enabled?: boolean; summaryOn?: boolean; branch?: SessionEntry[]; answer?: SummarizerAnswer } = {},
) {
	const fake = createFakePi();
	const session = createSessionConfig();
	session.assign({ status: "ready", config: { ...CONFIG, conversationSummaryEnabled: options.summaryOn ?? true } });
	if (options.enabled === false) session.setEnabled(false);
	const holder = createInstrumentsHolder();
	const summary = createConversationSummaryState();
	const summarizer = createSummarizerFake();
	summarizer.answer(options.answer ?? { text: "Goal: g" });
	const notified: string[] = [];
	const spends: ({ costTotal: number } | undefined)[] = [];

	registerConversationSummarySettledHandler(createGatedPi(fake.pi, session), { config: session, summary, holder });

	const fire = () =>
		fake.registered[0].handler(
			{ type: "agent_settled", aborted: false },
			createContextStub({
				cwd: "/work",
				trusted: false,
				branch: options.branch ?? BRANCH,
				modelRegistry: summarizer.modelRegistry,
				notify: (message: string) => notified.push(message),
			}),
		);

	return { fake, session, holder, summary, summarizer, notified, spends, fire };
}

test("H1: the handler returns before the summarizer answers, having started one call", async () => {
	const { fire, summary, summarizer } = harness({ answer: "hang" });

	expect(fire()).toBeUndefined();

	expect(summarizer.calls).toHaveLength(1);
	expect(summary.current()).toBeUndefined();
});

test.each([
	["an inactive session", { enabled: false }],
	["the summary switched off", { summaryOn: false }],
	["a branch with no assistant message", { branch: [branchEntry("e1", "message", "user")] }],
])("H2-H4: %s makes no call and stores no summary", async (_case, options) => {
	const { fire, summary, summarizer, notified } = harness(options);

	fire();
	await Promise.resolve();

	expect(summarizer.calls).toEqual([]);
	expect(summary.current()).toBeUndefined();
	expect(notified).toEqual([]);
});

test("H5: the summary is stored under the newest assistant entry's id from the branch it rendered", async () => {
	const { fire, summary, summarizer } = harness();

	fire();
	await vi.waitFor(() => expect(summary.current()).toBeDefined());

	expect(summary.current()).toEqual({ key: "e2", text: "Goal: g" });
	const context = summarizer.calls[0].context as { messages: { content: string }[] };
	expect(context.messages[0].content).toContain("user: ");
	expect(context.messages[0].content).toContain("assistant: ");
});

test("H7: the spend reaches the publisher the holder carries at event time", async () => {
	const { fire, holder, summary } = harness({ answer: { text: "Goal: g", costTotal: 0.002 } });
	const spends: ({ costTotal: number } | undefined)[] = [];
	const recorder = {
		sessionStarted() {},
		requestBuilt() {},
		responseReceived() {},
		settled() {},
		compacted() {},
		treeJumped() {},
		reportRecalled() {},
		started() {},
		finished() {},
		summarized(spend: { costTotal: number } | undefined) {
			spends.push(spend);
		},
	} as unknown as InstrumentPublisher;
	holder.install(recorder);

	fire();
	await vi.waitFor(() => expect(summary.current()).toBeDefined());

	expect(spends).toEqual([{ costTotal: 0.002 }]);
});

test("H8: two settled runs whose summarizer errors show one warning in all", async () => {
	const { fire, notified } = harness({ answer: "error" });

	fire();
	await vi.waitFor(() => expect(notified).toHaveLength(1));
	fire();
	await Promise.resolve();
	await Promise.resolve();

	expect(notified).toHaveLength(1);
});
