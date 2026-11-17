import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import type { InstrumentsHolder } from "../../use-cases/instruments-publisher.js";
import { readCompacted } from "../adapters/pi-instrument-readings.js";

/** Total context and the archive, at `session_compact`, after re-hydration; the ratio table stays. */
export function registerInstrumentsCompactHandler(pi: ExtensionAPI, holder: InstrumentsHolder): void {
	pi.on("session_compact", (_event, ctx) => {
		holder.current().compacted(() => readCompacted(ctx));
	});
}
