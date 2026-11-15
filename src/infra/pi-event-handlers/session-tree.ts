import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { hydrateArchiveStore } from "../../use-cases/hydrate-archive-store.js";
import type { ArchiveStore } from "../../use-cases/ports.js";
import { readArchiveBatchesFromBranch } from "../adapters/pi-archive-adapter.js";

export function registerSessionTreeHandler(pi: ExtensionAPI, store: ArchiveStore): void {
	pi.on("session_tree", (_event, ctx) => {
		// The whole active branch, read before `replaceAll` runs, so the branch left behind is dropped.
		hydrateArchiveStore(readArchiveBatchesFromBranch(ctx.sessionManager.getBranch()), store);
	});
}
