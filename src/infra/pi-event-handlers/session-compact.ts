import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { hydrateArchiveStore } from "../../use-cases/hydrate-archive-store.js";
import type { ArchiveStore } from "../../use-cases/ports.js";
import { readArchiveBatchesFromBranch } from "../adapters/pi-archive-adapter.js";

export function registerSessionCompactHandler(pi: ExtensionAPI, store: ArchiveStore): void {
	pi.on("session_compact", (_event, ctx) => {
		// A compaction reads the whole branch, so every pre-compaction batch stays in the archive.
		hydrateArchiveStore(readArchiveBatchesFromBranch(ctx.sessionManager.getBranch()), store);
	});
}
