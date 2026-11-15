import { expect, test } from "vitest";
import type { ArchivedToolOutput } from "../../src/domain/archived-output.js";
import { commitArchivedBatch } from "../../src/use-cases/commit-archived-batch.js";
import type { ArchiveStore } from "../../src/use-cases/ports.js";

/** An item with just the id this file asserts on. */
function item(id: string): ArchivedToolOutput {
	return { id, toolName: "bash", argsSummary: "", isError: false, stub: `[archived ${id}]`, rawText: "x" };
}

/**
 * A store that records every method called and every batch handed to it, and keeps its items like
 * the real one, so a case can assert both the calls and the contents.
 */
function recordingStore() {
	const calls: string[] = [];
	const received: ArchivedToolOutput[][] = [];
	const items = new Map<string, ArchivedToolOutput>();
	const store: ArchiveStore = {
		size: () => {
			calls.push("size");
			return items.size;
		},
		get: (id) => {
			calls.push("get");
			return items.get(id);
		},
		getAll: () => {
			calls.push("getAll");
			return [...items.values()];
		},
		addBatch: (batch) => {
			calls.push("addBatch");
			received.push([...batch]);
			for (const entry of batch) items.set(entry.id, entry);
		},
		replaceAll: (batch) => {
			calls.push("replaceAll");
			received.push([...batch]);
			items.clear();
			for (const entry of batch) items.set(entry.id, entry);
		},
		clear: () => {
			calls.push("clear");
			items.clear();
		},
	};
	return { store, calls, received, items };
}

test("a settled batch lands in the store once, in order", () => {
	const { store, calls, received } = recordingStore();
	const pending = [item("a"), item("b")];

	const committed = commitArchivedBatch(pending, store);

	expect(calls).toEqual(["addBatch"]);
	expect(received).toHaveLength(1);
	expect(received[0].map((entry) => entry.id)).toEqual(["a", "b"]);
	expect(committed.map((entry) => entry.id)).toEqual(["a", "b"]);
});

test("the pending array is drained in place", () => {
	const { store } = recordingStore();
	const pending = [item("a"), item("b")];
	const reference = pending;

	commitArchivedBatch(pending, store);

	expect(reference).toEqual([]);
});

test("nothing pending commits nothing and never touches the store", () => {
	const { store, calls } = recordingStore();

	const committed = commitArchivedBatch([], store);

	expect(committed).toEqual([]);
	expect(calls).toEqual([]);
});

test("committing one item calls nothing but addBatch", () => {
	const { store, calls } = recordingStore();

	commitArchivedBatch([item("a")], store);

	expect(calls).toEqual(["addBatch"]);
});

test("several items commit as one batch", () => {
	const { store, received } = recordingStore();

	commitArchivedBatch([item("a"), item("b"), item("c")], store);

	expect(received).toHaveLength(1);
	expect(received[0]).toHaveLength(3);
});
