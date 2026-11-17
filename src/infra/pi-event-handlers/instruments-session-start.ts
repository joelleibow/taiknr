import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import type { SessionConfig } from "../../config/session-config.js";
import { createInstrumentsPublisher, type InstrumentsHolder } from "../../use-cases/instruments-publisher.js";
import type { ArchiveStore } from "../../use-cases/ports.js";
import { createJeffersonBusAdapter } from "../adapters/jefferson-bus-adapter.js";
import { readSessionStarted } from "../adapters/pi-instrument-readings.js";

/**
 * The instruments switch's only reader: on a true it builds the session's publisher, whose first
 * act is the registration, and installs it; with the switch off the holder keeps its no-op and no
 * host read happens at all.
 */
export function registerInstrumentsSessionStartHandler(
	pi: ExtensionAPI,
	deps: { config: SessionConfig; store: ArchiveStore; holder: InstrumentsHolder },
): void {
	pi.on("session_start", (_event, ctx) => {
		const state = deps.config.state;
		// The gate already guarantees a ready, enabled config; the status half is here so the type narrows.
		if (state.status !== "ready" || !state.config.jeffersonInstruments) return;

		// Built here, on a true switch, from this registrar's own `pi`: the factory never touches events.
		const publisher = createInstrumentsPublisher({ sink: createJeffersonBusAdapter(pi), store: deps.store });
		// Reading first: a throw registers nothing, posts nothing, and leaves the holder's no-op in place.
		publisher.sessionStarted(() => readSessionStarted(ctx));
		deps.holder.install(publisher);
	});
}
