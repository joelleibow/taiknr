import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import type { PayloadCacheState } from "../../use-cases/payload-cache.js";
import { editPayload } from "../adapters/anthropic-cache-payload.js";

/**
 * The payload edit's request bridge (design §5.1): hand the adapter this request's route, cell (a)
 * and record (b), commit only what it computed, and fail open. No rules live here.
 */
export function registerBeforeProviderRequestHandler(pi: ExtensionAPI, state: PayloadCacheState): void {
	pi.on("before_provider_request", (event, ctx) => {
		try {
			const { output, nextCarrier, applied } = editPayload(event.payload, ctx.model, state.recallBlock, state.carrier);
			state.nextCarrier = nextCarrier;
			state.applied = applied;
			return output;
		} catch {
			// A payload holding a value structuredClone cannot copy reaches pi's runner as it arrived;
			// resetting the two computed facts keeps the previous request's placement off this one (§5.1).
			state.applied = null;
			state.nextCarrier = state.carrier;
			return undefined;
		}
	});
}
