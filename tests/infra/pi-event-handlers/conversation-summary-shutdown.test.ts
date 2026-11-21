import { expect, test } from "vitest";
import { createConversationSummaryState } from "../../../src/app/extension/conversation-summary-state.js";
import { registerConversationSummaryShutdownHandler } from "../../../src/infra/pi-event-handlers/conversation-summary-shutdown.js";
import { createFakePi } from "../../support/fake-pi.js";

test("H6: session_shutdown aborts the signal of the write in flight and its completion stores nothing", async () => {
	const fake = createFakePi();
	const summary = createConversationSummaryState();
	registerConversationSummaryShutdownHandler(fake.pi, summary);

	let signal: AbortSignal | undefined;
	const write = summary.write("e2", (written) => {
		signal = written;
		return new Promise((resolve) => {
			written.addEventListener("abort", () => resolve("Goal: too late"), { once: true });
		});
	});

	fake.registered[0].handler({ type: "session_shutdown" });
	await write;

	expect(signal?.aborted).toBe(true);
	expect(summary.current()).toBeUndefined();
});
