import { expect, test } from "vitest";
import { createConversationSummaryState } from "../../../src/app/extension/conversation-summary-state.js";

/** A producer that resolves when the case says, so a write can be held open. */
function held() {
	let resolve: (text: string | undefined) => void = () => {};
	const promise = new Promise<string | undefined>((done) => {
		resolve = done;
	});
	return { promise, resolve };
}

test("T1: a new state holds no summary", () => {
	expect(createConversationSummaryState().current()).toBeUndefined();
});

test("T2: a completed write stores its text under its key by the time write resolves", async () => {
	const state = createConversationSummaryState();

	await state.write("e2", async () => "Goal: g");

	expect(state.current()).toEqual({ key: "e2", text: "Goal: g" });
});

test("T3: a write with no text leaves no summary", async () => {
	const state = createConversationSummaryState();

	await state.write("e2", async () => undefined);

	expect(state.current()).toBeUndefined();
});

test("T4: a newer write aborts the older write's signal", async () => {
	const state = createConversationSummaryState();
	const first = held();
	let firstSignal: AbortSignal | undefined;

	const older = state.write("e2", (signal) => {
		firstSignal = signal;
		return first.promise;
	});
	await state.write("e3", async () => "Goal: newer");

	expect(firstSignal?.aborted).toBe(true);
	first.resolve("Goal: older");
	await older;
	expect(state.current()).toEqual({ key: "e3", text: "Goal: newer" });
});

test("T5: an older completion never replaces a newer one", async () => {
	const state = createConversationSummaryState();
	const first = held();
	const second = held();

	const older = state.write("e2", () => first.promise);
	const newer = state.write("e3", () => second.promise);

	second.resolve("Goal: newer");
	await newer;
	first.resolve("Goal: older");
	await older;

	expect(state.current()).toEqual({ key: "e3", text: "Goal: newer" });
});

test("T6: shutdown aborts the write in flight and its completion stores nothing", async () => {
	const state = createConversationSummaryState();
	const write = held();
	let signal: AbortSignal | undefined;

	const pending = state.write("e2", (written) => {
		signal = written;
		return write.promise;
	});
	state.shutdown();
	write.resolve("Goal: g");
	await pending;

	expect(signal?.aborted).toBe(true);
	expect(state.current()).toBeUndefined();
});

test("T7: a rejecting producer leaves no summary and does not reject", async () => {
	const state = createConversationSummaryState();

	await expect(
		state.write("e2", async () => {
			throw new Error("provider failed");
		}),
	).resolves.toBeUndefined();

	expect(state.current()).toBeUndefined();
});

test("a third write while a second is in flight leaves the third's summary", async () => {
	const state = createConversationSummaryState();
	const second = held();
	const third = held();

	const first = state.write("e2", async () => "Goal: first");
	const secondWrite = state.write("e3", () => second.promise);
	const thirdWrite = state.write("e4", () => third.promise);

	await first;
	third.resolve("Goal: third");
	await thirdWrite;
	second.resolve("Goal: second");
	await secondWrite;

	expect(state.current()).toEqual({ key: "e4", text: "Goal: third" });
});
