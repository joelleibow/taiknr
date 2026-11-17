import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import type { InstrumentsHolder } from "../../use-cases/instruments-publisher.js";
import { readTreeJumped } from "../adapters/pi-instrument-readings.js";

/** Total context and the archive at `session_tree`, and the ratio reseed the new branch carries. */
export function registerInstrumentsTreeHandler(pi: ExtensionAPI, holder: InstrumentsHolder): void {
	pi.on("session_tree", (_event, ctx) => {
		holder.current().treeJumped(() => readTreeJumped(ctx));
	});
}
