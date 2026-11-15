import { expect, test } from "vitest";
import type { ArchivedToolOutput } from "../../src/domain/archived-output.js";
import { hydrateArchiveStore } from "../../src/use-cases/hydrate-archive-store.js";
import type { ArchiveStore } from "../../src/use-cases/ports.js";

/** An item with just the id and stub this file asserts on. */
function item(id: string): ArchivedToolOutput {
	return { id, toolName: "bash", argsSummary: "", isError: false, stub: `[archived ${id}]`, rawText: "x" };
}

/**
 * A store that records every method called and every batch handed to it, and keeps its items like
 * the real one, so a case can assert both the call and the resulting contents.
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

test("every batch's items reach one whole replacement in branch order", () => {
	const { store, calls, received } = recordingStore();
	const batches = [[item("a"), item("b")], [item("c")], [item("d")]];

	hydrateArchiveStore(batches, store);

	expect(calls).toEqual(["replaceAll"]);
	expect(received).toHaveLength(1);
	expect(received[0].map((entry) => entry.id)).toEqual(["a", "b", "c", "d"]);
});

test("no batches replace the contents with nothing", () => {
	const { store, calls, received, items } = recordingStore();
	items.set("stale", item("stale"));

	hydrateArchiveStore([], store);

	expect(calls).toEqual(["replaceAll"]);
	expect(received).toEqual([[]]);
	expect(store.getAll()).toEqual([]);
});

test("an empty batch beside a full one contributes nothing", () => {
	const { store, received } = recordingStore();

	hydrateArchiveStore([[item("a")], []], store);

	expect(received[0].map((entry) => entry.id)).toEqual(["a"]);
});

test("hydrating twice over the same batches leaves the same contents", () => {
	const { store } = recordingStore();
	const batches = [[item("a")], [item("b"), item("c")]];

	hydrateArchiveStore(batches, store);
	const once = store.getAll();
	hydrateArchiveStore(batches, store);

	expect(store.getAll()).toEqual(once);
});

test("an item the branch does not carry is dropped by the whole replacement", () => {
	const { store } = recordingStore();
	store.addBatch([item("stale")]);

	hydrateArchiveStore([[item("a")]], store);

	expect(store.getAll().map((entry) => entry.id)).toEqual(["a"]);
});

test("a repeated id keeps the occurrence carried by the later batch", () => {
	const { store } = recordingStore();
	const later = { ...item("a"), stub: "[archived a] later" };

	hydrateArchiveStore([[item("a")], [later]], store);

	expect(store.getAll()).toEqual([later]);
});

test("one item reaches the store", () => {
	const { store } = recordingStore();

	hydrateArchiveStore([[item("a")]], store);

	expect(store.getAll().map((entry) => entry.id)).toEqual(["a"]);
});
