import type { ToolCallEventResult } from "@earendil-works/pi-coding-agent";
import { expect, test, vi } from "vitest";
import { createGatedPi } from "../../../src/app/extension/handler-gate.js";
import { createSessionConfig, type SessionConfig } from "../../../src/config/session-config.js";
import { type TaiknrConfig, TaiknrConfigError } from "../../../src/config/taiknr-config.js";
import { createFakePi } from "../../support/fake-pi.js";

const config: TaiknrConfig = {
	decisionThreshold: 0.5,
	defaultDecisionModel: "m",
	defaultDecisionModelProvider: "p",
	minCharsToArchive: 600,
	classifierTimeoutMs: 5000,
	enabled: true,
	jeffersonInstruments: true,
};

const result: ToolCallEventResult = { block: false };

function setup(session: SessionConfig) {
	const fake = createFakePi();
	return { fake, gated: createGatedPi(fake.pi, session) };
}

test("an unresolved holder leaves the registered handler uncalled", () => {
	const session = createSessionConfig();
	const { fake, gated } = setup(session);
	const handler = vi.fn(() => result);
	gated.on("tool_call", handler);

	expect(fake.registered[0].handler("event", "ctx")).toBeUndefined();
	expect(handler).not.toHaveBeenCalled();
});

test("a holder that becomes ready calls the handler once and returns its result", () => {
	const session = createSessionConfig();
	const { fake, gated } = setup(session);
	const handler = vi.fn(() => result);
	gated.on("tool_call", handler);

	session.assign({ status: "ready", config });

	expect(fake.registered[0].handler("event", "ctx")).toBe(result);
	expect(handler).toHaveBeenCalledTimes(1);
	expect(handler).toHaveBeenCalledWith("event", "ctx");
});

test("a ready holder with enabled false leaves the handler uncalled", () => {
	const session = createSessionConfig();
	const { fake, gated } = setup(session);
	const handler = vi.fn(() => result);
	gated.on("tool_call", handler);

	session.assign({ status: "ready", config: { ...config, enabled: false } });

	expect(fake.registered[0].handler("event", "ctx")).toBeUndefined();
	expect(handler).not.toHaveBeenCalled();
});

test("a rejected holder leaves the handler uncalled", () => {
	const session = createSessionConfig();
	const { fake, gated } = setup(session);
	const handler = vi.fn(() => result);
	gated.on("tool_call", handler);

	session.assign({
		status: "rejected",
		error: new TaiknrConfigError("/tmp/pi-taiknr.json", "enabled", "must be a boolean"),
	});

	expect(fake.registered[0].handler("event", "ctx")).toBeUndefined();
	expect(handler).not.toHaveBeenCalled();
});

test("gated.on returns what the fake's own on returned", () => {
	const { fake, gated } = setup(createSessionConfig());

	expect(
		gated.on(
			"tool_call",
			vi.fn(() => result),
		),
	).toBe(fake.onReturn);
});

test("a member other than on is forwarded by identity", () => {
	const { fake, gated } = setup(createSessionConfig());

	expect(Reflect.get(gated, "marker")).toBe(fake.marker);
});

test("two handlers on different events are gated independently", () => {
	const session = createSessionConfig();
	const { fake, gated } = setup(session);
	const turnEnd = vi.fn();
	const context = vi.fn();
	gated.on("turn_end", turnEnd);
	gated.on("context", context);

	fake.registered[0].handler("turn_end event", "ctx");
	fake.registered[1].handler("context event", "ctx");
	expect(turnEnd).not.toHaveBeenCalled();
	expect(context).not.toHaveBeenCalled();

	session.assign({ status: "ready", config });

	fake.registered[0].handler("turn_end event", "ctx");
	fake.registered[1].handler("context event", "ctx");
	expect(turnEnd).toHaveBeenCalledTimes(1);
	expect(turnEnd).toHaveBeenCalledWith("turn_end event", "ctx");
	expect(context).toHaveBeenCalledTimes(1);
	expect(context).toHaveBeenCalledWith("context event", "ctx");
});
