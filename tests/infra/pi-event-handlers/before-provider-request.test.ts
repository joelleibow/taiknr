import { expect, test } from "vitest";
import { createGatedPi } from "../../../src/app/extension/handler-gate.js";
import { createSessionConfig } from "../../../src/config/session-config.js";
import { DEFAULT_TAIKNR_CONFIG, TaiknrConfigError } from "../../../src/config/taiknr-config.js";
import type { RouteModel } from "../../../src/infra/adapters/anthropic-cache-payload.js";
import { registerBeforeProviderRequestHandler } from "../../../src/infra/pi-event-handlers/before-provider-request.js";
import type { CarrierRecord, PayloadCacheState } from "../../../src/use-cases/payload-cache.js";
import { createContextStub, createFakePi } from "../../support/fake-pi.js";

const PI = { type: "ephemeral", ttl: "1h" };

const COVERED: RouteModel = {
	provider: "anthropic",
	api: "anthropic-messages",
	id: "claude-haiku-4-5",
	baseUrl: "https://api.anthropic.com",
};

const UNCOVERED: RouteModel = {
	provider: "anthropic",
	api: "anthropic-messages",
	id: "claude-haiku-4-5",
	baseUrl: "https://api.anthropic.com.corp-proxy.internal",
};

type Block = Record<string, unknown>;

function text(value: string, mark?: Block): Block {
	return mark === undefined ? { type: "text", text: value } : { type: "text", text: value, cache_control: { ...mark } };
}

/** An API-key request with pi's three markers and recall's block on a user message's last block. */
function payload(messages: Block[]): Block {
	return {
		model: "claude-haiku-4-5",
		max_tokens: 32_000,
		system: [text("identity", PI), text("rules")],
		tools: [{ name: "bash", description: "bash tool", input_schema: { type: "object" } }],
		messages,
	};
}

const RECALLING = payload([{ role: "user", content: [text("own"), text("block", PI)] }]);

/** The state one session's three writers share, as the composition root builds it. */
function emptyState(): PayloadCacheState {
	return { recallBlock: null, carrier: null, nextCarrier: null, applied: null };
}

function harness(options: { enabled?: boolean; rejected?: boolean; state?: PayloadCacheState } = {}) {
	const fake = createFakePi();
	const session = createSessionConfig();
	const state = options.state ?? emptyState();
	registerBeforeProviderRequestHandler(createGatedPi(fake.pi, session), state);

	if (options.rejected === true) {
		session.assign({
			status: "rejected",
			error: new TaiknrConfigError("/work/pi-taiknr.json", undefined, "unreadable"),
		});
	} else {
		session.assign({ status: "ready", config: { ...DEFAULT_TAIKNR_CONFIG, enabled: options.enabled ?? true } });
	}

	/** Fire the registered handler once, as pi's runner does before the provider call. */
	const fire = (given: unknown, model: RouteModel | undefined) =>
		fake.registered[0].handler(
			{ type: "before_provider_request", payload: given },
			createContextStub({ cwd: "/work", trusted: false, model }),
		);

	return { fake, session, state, fire };
}

test("the handler registers before_provider_request and nothing else", () => {
	const { fake } = harness();

	expect(fake.registered.map(({ event }) => event)).toEqual(["before_provider_request"]);
});

test("a covered request edits the payload and stores the placement it computed", () => {
	const { state, fire } = harness();
	state.recallBlock = "block";

	const output = fire(RECALLING, COVERED) as Block;

	expect(output).toBeDefined();
	expect(state.applied).toEqual({ carrierRead: null, block: "cached" });
	expect(state.nextCarrier).toEqual({ index: 0, fingerprint: "own", block: "block" });
	const messages = output.messages as Block[];
	const [content] = (messages[0] as Block).content as Block[];
	expect(content).toEqual({ type: "text", text: "own", cache_control: { type: "ephemeral", ttl: "1h" } });
});

test("an uncovered model and a request carrying no model leave the payload exactly as earlier handlers left it", () => {
	const { state, fire } = harness();
	state.recallBlock = "block";
	const carrier: CarrierRecord = { index: 0, fingerprint: "own", block: "block" };
	state.carrier = carrier;

	for (const model of [UNCOVERED, undefined]) {
		expect(fire(RECALLING, model)).toBeUndefined();
		expect(state.applied).toBeNull();
		expect(state.nextCarrier).toEqual(carrier);
	}
});

test("the route is re-read per request, so a switch to an uncovered model stops the edit", () => {
	const { state, fire } = harness();
	state.recallBlock = "block";

	expect(fire(RECALLING, COVERED)).toBeDefined();
	expect(fire(RECALLING, UNCOVERED)).toBeUndefined();
	expect(state.applied).toBeNull();
});

test("publishing off still edits the payload, because only the gate decides inertness", () => {
	const { state, fire } = harness();
	state.recallBlock = "block";

	expect(fire(RECALLING, COVERED)).toBeDefined();
	expect(state.applied).toEqual({ carrierRead: null, block: "cached" });
});

test.each([
	["a project file that turns taiknr off", { enabled: false }],
	["a rejected config file", { rejected: true }],
])("%s leaves the payload unedited and the state untouched", (_case, options) => {
	const { state, fire } = harness(options);
	state.recallBlock = "block";

	expect(fire(RECALLING, COVERED)).toBeUndefined();
	expect(state.applied).toBeNull();
	expect(state.nextCarrier).toBeNull();
});
