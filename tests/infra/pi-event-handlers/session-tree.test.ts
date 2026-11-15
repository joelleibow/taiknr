import { SessionManager } from "@earendil-works/pi-coding-agent";
import { expect, test, vi } from "vitest";
import { createGatedPi } from "../../../src/app/extension/handler-gate.js";
import { createSessionConfig } from "../../../src/config/session-config.js";
import { DEFAULT_TAIKNR_CONFIG, TaiknrConfigError } from "../../../src/config/taiknr-config.js";
import type { ArchivedToolOutput } from "../../../src/domain/archived-output.js";
import { InMemoryArchiveStore, TAIKNR_SIDE_STORE_TYPE } from "../../../src/infra/adapters/pi-archive-adapter.js";
import { registerSessionTreeHandler } from "../../../src/infra/pi-event-handlers/session-tree.js";
import { createContextStub, createFakePi } from "../../support/fake-pi.js";

/** An archived item carrying just the id this file asserts on. */
function item(id: string): ArchivedToolOutput {
	return { id, toolName: "bash", argsSummary: "", isError: false, stub: `[archived ${id}]`, rawText: "x" };
}

/** The handler wired as the composition root wires it: a real store, a real branch, the gate. */
function harness(hook: (session: ReturnType<typeof createSessionConfig>) => void = ready) {
	const fake = createFakePi();
	const session = createSessionConfig();
	const manager = SessionManager.inMemory();
	const store = new InMemoryArchiveStore();
	hook(session);
	registerSessionTreeHandler(createGatedPi(fake.pi, session), store);

	/** Fire the recorded `session_tree` handler against the branch as it stands. */
	function tree() {
		const ctx = createContextStub({ cwd: "/tmp", trusted: false, branch: manager.getBranch() });
		return fake.registered[0].handler({ type: "session_tree", newLeafId: manager.getLeafId(), oldLeafId: null }, ctx);
	}

	/** Persist a side-store entry carrying `batch` and return its entry id. */
	function archive(batch: ArchivedToolOutput[]): string {
		return manager.appendCustomEntry(TAIKNR_SIDE_STORE_TYPE, batch);
	}

	return { manager, session, store, tree, archive };
}

function ready(session: ReturnType<typeof createSessionConfig>): void {
	session.assign({ status: "ready", config: DEFAULT_TAIKNR_CONFIG });
}

test("navigating onto a branch holding side-store entries hydrates their items", () => {
	const test_ = harness();
	test_.archive([item("aaaa1111")]);
	test_.archive([item("bbbb2222")]);

	test_.tree();

	expect(test_.store.getAll().map(({ id }) => id)).toEqual(["aaaa1111", "bbbb2222"]);
});

test("navigating to a branch that diverges before them empties the archive", () => {
	const test_ = harness();
	const anchorId = test_.manager.appendMessage({ role: "user", content: "go", timestamp: 0 });
	test_.archive([item("aaaa1111")]);
	test_.archive([item("bbbb2222")]);
	test_.tree();
	expect(test_.store.size()).toBe(2);

	test_.manager.branch(anchorId);
	test_.tree();

	expect(test_.store.getAll()).toEqual([]);
});

test("navigating back restores the items", () => {
	const test_ = harness();
	const anchorId = test_.manager.appendMessage({ role: "user", content: "go", timestamp: 0 });
	test_.archive([item("aaaa1111")]);
	const leafId = test_.archive([item("bbbb2222")]);
	test_.manager.branch(anchorId);
	test_.tree();
	test_.manager.branch(leafId);

	test_.tree();

	expect(test_.store.getAll().map(({ id }) => id)).toEqual(["aaaa1111", "bbbb2222"]);
});

test("a second hydration over one branch changes nothing", () => {
	const test_ = harness();
	test_.archive([item("aaaa1111")]);
	test_.tree();
	const once = test_.store.getAll();

	test_.tree();

	expect(test_.store.getAll()).toEqual(once);
});

test("a branch carrying no archive leaves the store empty and prints nothing", () => {
	const test_ = harness();
	const spies = [
		vi.spyOn(console, "log"),
		vi.spyOn(console, "info"),
		vi.spyOn(console, "warn"),
		vi.spyOn(console, "error"),
	];

	test_.tree();

	expect(test_.store.getAll()).toEqual([]);
	for (const spy of spies) expect(spy).not.toHaveBeenCalled();
	vi.restoreAllMocks();
});

test("hydration appends no session entry", () => {
	const test_ = harness();
	test_.archive([item("aaaa1111")]);
	const entriesBefore = test_.manager.getEntries().length;

	test_.tree();

	expect(test_.manager.getEntries().length).toBe(entriesBefore);
});

test("an unresolved holder never reaches the handler", () => {
	const test_ = harness(() => {});
	const stale = item("stale");
	test_.store.addBatch([stale]);
	test_.archive([item("aaaa1111")]);

	expect(test_.tree()).toBeUndefined();

	expect(test_.store.getAll()).toEqual([stale]);
});

test("a rejected holder never reaches the handler", () => {
	const test_ = harness((session) =>
		session.assign({
			status: "rejected",
			error: new TaiknrConfigError("/tmp/pi-taiknr.json", undefined, "unreadable"),
		}),
	);
	const stale = item("stale");
	test_.store.addBatch([stale]);
	test_.archive([item("aaaa1111")]);

	expect(test_.tree()).toBeUndefined();

	expect(test_.store.getAll()).toEqual([stale]);
});

test("a session configured off never reaches the handler", () => {
	const test_ = harness((session) =>
		session.assign({ status: "ready", config: { ...DEFAULT_TAIKNR_CONFIG, enabled: false } }),
	);
	const stale = item("stale");
	test_.store.addBatch([stale]);
	test_.archive([item("aaaa1111")]);

	expect(test_.tree()).toBeUndefined();

	expect(test_.store.getAll()).toEqual([stale]);
});

test("the first navigation after taiknr is turned on hydrates", () => {
	const test_ = harness((session) =>
		session.assign({ status: "ready", config: { ...DEFAULT_TAIKNR_CONFIG, enabled: false } }),
	);
	test_.archive([item("aaaa1111")]);
	test_.tree();
	expect(test_.store.getAll()).toEqual([]);

	test_.session.setEnabled(true);
	test_.tree();

	expect(test_.store.getAll().map(({ id }) => id)).toEqual(["aaaa1111"]);
});
