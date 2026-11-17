import { expect, test } from "vitest";
import {
	createSessionConfig,
	type ResolvedSessionConfig,
	type SessionConfigState,
} from "../../src/config/session-config.js";
import { type TaiknrConfig, TaiknrConfigError } from "../../src/config/taiknr-config.js";

const config: TaiknrConfig = {
	decisionThreshold: 0.9,
	defaultDecisionModel: "m",
	defaultDecisionModelProvider: "p",
	minCharsToArchive: 100,
	classifierTimeoutMs: 5000,
	enabled: true,
	jeffersonInstruments: true,
};

const ready: ResolvedSessionConfig = { status: "ready", config };
const rejected: ResolvedSessionConfig = {
	status: "rejected",
	error: new TaiknrConfigError("/tmp/pi-taiknr.json", "enabled", "must be a boolean"),
};

/** The config a ready state carries, failing the case when the state is not ready. */
function readyConfig(state: SessionConfigState): TaiknrConfig {
	if (state.status !== "ready") throw new Error(`expected a ready state, got ${state.status}`);
	return state.config;
}

test("a fresh holder is unresolved and inactive", () => {
	const session = createSessionConfig();

	expect(session.state).toEqual({ status: "unresolved" });
	expect(session.isActive()).toBe(false);
});

test("a rejected holder is inactive", () => {
	const session = createSessionConfig();
	session.assign(rejected);

	expect(session.isActive()).toBe(false);
});

test("a ready holder with enabled false is inactive", () => {
	const session = createSessionConfig();
	session.assign({ status: "ready", config: { ...config, enabled: false } });

	expect(session.isActive()).toBe(false);
});

test("a ready holder with enabled true is active", () => {
	const session = createSessionConfig();
	session.assign(ready);

	expect(session.isActive()).toBe(true);
});

test("assign replaces the state whole, so ready clears a rejection", () => {
	const session = createSessionConfig();
	session.assign(rejected);
	session.assign(ready);

	expect(session.state).toEqual(ready);
	expect(session.isActive()).toBe(true);
});

test("setEnabled from ready returns true and leaves the previous config untouched", () => {
	const session = createSessionConfig();
	session.assign(ready);
	const before = session.state;

	expect(session.setEnabled(false)).toBe(true);

	const after = readyConfig(session.state);
	expect(after).not.toBe(config);
	expect(after).toEqual({ ...config, enabled: false });
	expect(readyConfig(before)).toBe(config);
	expect(readyConfig(before).enabled).toBe(true);
});

test("setEnabled with the value already held returns true and still yields a new config", () => {
	const session = createSessionConfig();
	session.assign(ready);

	expect(session.setEnabled(true)).toBe(true);

	expect(readyConfig(session.state)).not.toBe(config);
	expect(readyConfig(session.state).enabled).toBe(true);
});

test("setEnabled from unresolved returns false and changes nothing", () => {
	const session = createSessionConfig();
	const before = session.state;

	expect(session.setEnabled(true)).toBe(false);
	expect(session.state).toBe(before);
});

test("setEnabled from rejected returns false and changes nothing", () => {
	const session = createSessionConfig();
	session.assign(rejected);
	const before = session.state;

	expect(session.setEnabled(true)).toBe(false);
	expect(session.state).toBe(before);
});

test("two holders do not share state", () => {
	const first = createSessionConfig();
	const second = createSessionConfig();

	first.assign(ready);

	expect(second.state).toEqual({ status: "unresolved" });
});
