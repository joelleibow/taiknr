import type { InstrumentPublisher, InstrumentsHolder } from "../../use-cases/instruments-publisher.js";

/**
 * What a session holds until the instruments switch installs a real publisher: it evaluates no
 * reading and posts nothing, which is what makes the switch cost no host read at all (design D1).
 */
const noOpPublisher: InstrumentPublisher = {
	sessionStarted() {},
	requestBuilt() {},
	responseReceived() {},
	settled() {},
	compacted() {},
	treeJumped() {},
	reportRecalled() {},
	started() {},
	finished() {},
	summarized() {},
};

/** One cell per extension factory call, so no two sessions share a publisher. */
export function createInstrumentsHolder(): InstrumentsHolder {
	let publisher = noOpPublisher;
	return {
		current: () => publisher,
		install(next) {
			publisher = next;
		},
	};
}
