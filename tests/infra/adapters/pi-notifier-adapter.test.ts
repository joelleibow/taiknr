import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import { expect, test } from "vitest";
import { createOncePerSessionNotifier } from "../../../src/infra/adapters/pi-notifier-adapter.js";

/** A context whose only member the notifier reads is a recording `ui.notify`. */
function context(notify: (message: string, type?: string) => void): ExtensionContext {
	return { ui: { notify } } as unknown as ExtensionContext;
}

/** A context whose `ui` getter throws, as the runner's does once it is no longer active. */
const STALE = {
	get ui(): never {
		throw new Error("extension context is not active");
	},
} as unknown as ExtensionContext;

test("the first notice reaches ui.notify once, as a warning", () => {
	const calls: string[] = [];
	const notifier = createOncePerSessionNotifier(() => context((message, type) => calls.push(`${message}|${type}`)));

	notifier.notifyOnce("taiknr: recall did not score this prompt");

	expect(calls).toEqual(["taiknr: recall did not score this prompt|warning"]);
});

test("a second notice in the same factory call is silent", () => {
	const calls: string[] = [];
	const notifier = createOncePerSessionNotifier(() => context((message) => calls.push(message)));

	notifier.notifyOnce("first");
	notifier.notifyOnce("second");

	expect(calls).toEqual(["first"]);
});

test("a stale ctx leaves the notice unspent, so a later call with a live ctx still notifies", () => {
	const calls: string[] = [];
	let current = STALE;
	const notifier = createOncePerSessionNotifier(() => current);

	expect(() => notifier.notifyOnce("first")).toThrow("extension context is not active");

	current = context((message) => calls.push(message));
	notifier.notifyOnce("first");

	expect(calls).toEqual(["first"]);
});

test("a second factory call has its own flag", () => {
	const calls: string[] = [];
	const first = createOncePerSessionNotifier(() => context((message) => calls.push(message)));
	const second = createOncePerSessionNotifier(() => context((message) => calls.push(message)));

	first.notifyOnce("from the first");
	second.notifyOnce("from the second");

	expect(calls).toEqual(["from the first", "from the second"]);
});

test("a notify that throws propagates and leaves the notice unspent", () => {
	const calls: string[] = [];
	let attempts = 0;
	const notifier = createOncePerSessionNotifier(() =>
		context((message) => {
			attempts += 1;
			if (attempts === 1) throw new Error("notify failed");
			calls.push(message);
		}),
	);

	expect(() => notifier.notifyOnce("first")).toThrow("notify failed");

	notifier.notifyOnce("first");

	expect(calls).toEqual(["first"]);
});
