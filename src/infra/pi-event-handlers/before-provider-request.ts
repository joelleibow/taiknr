import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import type { PayloadCacheState } from "../../use-cases/payload-cache.js";
import { editPayload } from "../adapters/anthropic-cache-payload.js";

/**
 * The payload edit's request bridge (design §5.1): hand the adapter this request's route, cell (a)
 * and record (b), then commit only what it computed. No rules live here.
 */
export function registerBeforeProviderRequestHandler(pi: ExtensionAPI, state: PayloadCacheState): void {
	pi.on("before_provider_request", (event, ctx) => {
		const { output, nextCarrier, applied } = editPayload(event.payload, ctx.model, state.recallBlock, state.carrier);
		state.nextCarrier = nextCarrier;
		state.applied = applied;
		return output;
	});
}
