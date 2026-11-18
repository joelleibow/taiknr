import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { validUsage } from "../../domain/calibration.js";
import type { PayloadCacheState } from "../../use-cases/payload-cache.js";

/**
 * The other half of the payload edit (design §5.1): the next record becomes the committed one only
 * at a valid assistant response, so an errored, aborted or replayed attempt never commits. It reads
 * nothing the instruments registrar writes, which keeps the two `message_end` handlers independent.
 */
export function registerPayloadCacheCommitHandler(pi: ExtensionAPI, state: PayloadCacheState): void {
	pi.on("message_end", (event) => {
		const { message } = event;
		if (message.role !== "assistant") return;
		const { input, cacheRead, cacheWrite } = message.usage;
		if (!validUsage(message.stopReason, { input, cacheRead, cacheWrite })) return;
		state.carrier = state.nextCarrier;
	});
}
