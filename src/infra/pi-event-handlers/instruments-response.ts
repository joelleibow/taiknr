import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import type { InstrumentsHolder } from "../../use-cases/instruments-publisher.js";
import { readResponse } from "../adapters/pi-instrument-readings.js";

/**
 * The savings pair, the since-start totals and every re-posted figure, at `message_end`. Assistant
 * messages only, and it returns nothing: a returned message would replace pi's own.
 */
export function registerInstrumentsResponseHandler(pi: ExtensionAPI, holder: InstrumentsHolder): void {
	pi.on("message_end", (event, ctx) => {
		const { message } = event;
		if (message.role !== "assistant") return;
		holder.current().responseReceived(
			{
				pair: { provider: message.provider, model: message.model },
				stopReason: message.stopReason,
				usage: {
					input: message.usage.input,
					cacheRead: message.usage.cacheRead,
					cacheWrite: message.usage.cacheWrite,
				},
				cost: {
					input: message.usage.cost.input,
					cacheRead: message.usage.cost.cacheRead,
					cacheWrite: message.usage.cost.cacheWrite,
				},
			},
			() => readResponse(event, ctx),
		);
	});
}
