import { expect, test } from "vitest";
import { createGatedPi } from "../../../src/app/extension/handler-gate.js";
import { createInstrumentsHolder } from "../../../src/app/extension/instruments-holder.js";
import { createSessionConfig } from "../../../src/config/session-config.js";
import { DEFAULT_TAIKNR_CONFIG, type TaiknrConfig, TaiknrConfigError } from "../../../src/config/taiknr-config.js";
import { InMemoryArchiveStore } from "../../../src/infra/adapters/pi-archive-adapter.js";
import { registerInstrumentsSessionStartHandler } from "../../../src/infra/pi-event-handlers/instruments-session-start.js";
import { createContextStub, createFakePi, type FakePi } from "../../support/fake-pi.js";

/** A report as it crossed the bus: the field's name and the value posted for it. */
interface Report {
	extension: string;
	field: string;
	value: unknown;
}

function harness(options: { config?: Partial<TaiknrConfig>; rejected?: boolean } = {}) {
	const bus = createFakePi();
	const session = createSessionConfig();
	const store = new InMemoryArchiveStore();
	const holder = createInstrumentsHolder();
	registerInstrumentsSessionStartHandler(createGatedPi(bus.pi, session), { config: session, store, holder });
	if (options.rejected === true) {
		session.assign({
			status: "rejected",
			error: new TaiknrConfigError("/tmp/pi-taiknr.json", "enabled", "must be a boolean"),
		});
	} else {
		session.assign({ status: "ready", config: { ...DEFAULT_TAIKNR_CONFIG, ...options.config } });
	}
	return { bus, holder };
}

/** The context a session starts on: nothing persisted, a 200k window, an empty branch. */
const openContext = () =>
	createContextStub({
		cwd: "/work",
		trusted: false,
		contextWindow: 200_000,
		projectionMessages: [],
		branch: [],
	});

const noHostReads = () => createContextStub({ cwd: "/work", trusted: false, hostReadsThrow: true });

const fire = (bus: FakePi, ctx: ReturnType<typeof openContext>) =>
	bus.registered[0].handler({ type: "session_start" }, ctx);

const reports = (bus: FakePi) => bus.emitted.slice(1).map(({ data }) => data as Report);

const fieldValues = (bus: FakePi) => new Map(reports(bus).map(({ field, value }) => [field, value]));

/** A reading that fails the case if the no-op ever evaluates it. */
function throwingReading(): never {
	throw new Error("the holder's publisher evaluated a reading");
}

test("the registration is the first emit, and every field follows before the handler returns", () => {
	const { bus } = harness();

	fire(bus, openContext());

	expect(bus.emitted[0].channel).toBe("jefferson:registration");
	expect(reports(bus)).toHaveLength(17);
	expect(new Set(reports(bus).map(({ extension }) => extension))).toEqual(new Set(["taiknr"]));
});

test("the publisher it built is installed, so its later posts reach the same bus", () => {
	const { bus, holder } = harness();
	fire(bus, openContext());

	holder.current().started(2);

	expect(bus.emitted.slice(-2).map(({ data }) => data)).toEqual([
		{ extension: "taiknr", field: "deciding", value: true },
		{ extension: "taiknr", field: "decidingItems", value: 2 },
	]);
});

test("an empty store on a branch with no sample opens at k 1 with the flag on", () => {
	const { bus } = harness();

	fire(bus, openContext());

	expect(fieldValues(bus).get("archiveItems")).toBe(0);
	expect(fieldValues(bus).get("totalContext")).toBe(0);
	expect(fieldValues(bus).get("uncalibrated")).toBe(true);
});

test("with the switch off nothing is emitted, no reading is evaluated and the no-op stays", () => {
	const { bus, holder } = harness({ config: { jeffersonInstruments: false } });

	expect(() => fire(bus, noHostReads())).not.toThrow();

	expect(bus.emitted).toEqual([]);
	expect(() => holder.current().sessionStarted(throwingReading)).not.toThrow();
});

test("a rejected config never reaches the reader", () => {
	const { bus } = harness({ rejected: true });

	expect(() => fire(bus, noHostReads())).not.toThrow();

	expect(bus.emitted).toEqual([]);
});

test("with the switch on, an opening reading that throws registers nothing and leaves the no-op", () => {
	const { bus, holder } = harness();

	expect(() => fire(bus, noHostReads())).toThrow();

	expect(bus.emitted).toEqual([]);
	expect(() => holder.current().sessionStarted(throwingReading)).not.toThrow();
});
