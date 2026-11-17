import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import type { InstrumentsHolder } from "../../use-cases/instruments-publisher.js";
import { readSettled } from "../adapters/pi-instrument-readings.js";

/** Total context and the archive, at `agent_settled`, after the boundary's drafts committed. */
export function registerInstrumentsSettledHandler(pi: ExtensionAPI, holder: InstrumentsHolder): void {
	pi.on("agent_settled", (_event, ctx) => {
		holder.current().settled(() => readSettled(ctx));
	});
}
