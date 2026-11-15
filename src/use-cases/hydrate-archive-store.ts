import type { ArchivedToolOutput } from "../domain/archived-output.js";
import type { ArchiveStore } from "./ports.js";

/** Replace the in-memory ArchiveStore contents from active branch entries. */
export function hydrateArchiveStore(batches: ArchivedToolOutput[][], store: ArchiveStore): void {
	store.replaceAll(batches.flat());
}
