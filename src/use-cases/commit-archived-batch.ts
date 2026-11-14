import type { ArchivedToolOutput } from "../domain/archived-output.js";
import type { ArchiveStore } from "./ports.js";

/** Drain pending archived outputs into the ArchiveStore and return the committed batch. */
export function commitArchivedBatch(_pending: ArchivedToolOutput[], _store: ArchiveStore): ArchivedToolOutput[] {
	throw new Error("Not implemented: commitArchivedBatch");
}
