import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import type { InstrumentSink } from "../../use-cases/instruments-publisher.js";
import { buildFieldReports, TAIKNR_REGISTRATION } from "./jefferson-instruments-declaration.js";

const REGISTRATION_CHANNEL = "jefferson:registration";
const UPDATE_CHANNEL = "jefferson:update";

/** Each emit in its own catch: loader.js's assertActive throws on a stale instance, and nobody is left to tell. */
function emit(pi: ExtensionAPI, channel: string, data: unknown): void {
	try {
		pi.events.emit(channel, data);
	} catch {
		// Silent on purpose: a notice's ctx.ui is stale in the same case, so there is no one to notify (D9).
	}
}

/** The sink every publication reaches Jefferson through, reading `pi.events` only when it emits. */
export function createJeffersonBusAdapter(pi: ExtensionAPI): InstrumentSink {
	return {
		register() {
			emit(pi, REGISTRATION_CHANNEL, TAIKNR_REGISTRATION);
		},
		post(publication) {
			// Every report is built before the first emit, so a throw can never lose the rest of the update.
			for (const report of buildFieldReports(publication)) emit(pi, UPDATE_CHANNEL, report);
		},
	};
}
