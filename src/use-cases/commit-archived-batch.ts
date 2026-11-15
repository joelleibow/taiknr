import type { ArchivedToolOutput } from "../domain/archived-output.js";
import type { ArchiveStore } from "./ports.js";

/** Drain pending archived outputs into the ArchiveStore and return the committed batch. */
export function commitArchivedBatch(pending: ArchivedToolOutput[], store: ArchiveStore): ArchivedToolOutput[] {
	if (pending.length === 0) return [];
	const batch = [...pending];
	store.addBatch(batch);
	pending.length = 0;
	return batch;
}
