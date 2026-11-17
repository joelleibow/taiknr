import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import type { InstrumentsHolder } from "../../use-cases/instruments-publisher.js";
import { readRequest } from "../adapters/pi-instrument-readings.js";

/**
 * The request's figures and the pending request, at `context_with_system` after recall: the list
 * this sees already carries recall's block, which is what makes its figures this request's own.
 */
export function registerInstrumentsRequestHandler(pi: ExtensionAPI, holder: InstrumentsHolder): void {
	pi.on("context_with_system", (event, ctx) => {
		holder.current().requestBuilt(() => readRequest(event, ctx));
	});
}
