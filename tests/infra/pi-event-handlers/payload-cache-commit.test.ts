import { expect, test } from "vitest";
import { createGatedPi } from "../../../src/app/extension/handler-gate.js";
import { createSessionConfig } from "../../../src/config/session-config.js";
import { DEFAULT_TAIKNR_CONFIG } from "../../../src/config/taiknr-config.js";
import type { RouteModel } from "../../../src/infra/adapters/anthropic-cache-payload.js";
import { registerBeforeProviderRequestHandler } from "../../../src/infra/pi-event-handlers/before-provider-request.js";
import { registerPayloadCacheCommitHandler } from "../../../src/infra/pi-event-handlers/payload-cache-commit.js";
import type { CarrierRecord, PayloadCacheState } from "../../../src/use-cases/payload-cache.js";
import { createContextStub, createFakePi } from "../../support/fake-pi.js";

const PI = { type: "ephemeral", ttl: "1h" };

const COVERED: RouteModel = {
	provider: "anthropic",
	api: "anthropic-messages",
	id: "claude-haiku-4-5",
	baseUrl: "https://api.anthropic.com",
};

const USAGE = {
	input: 70,
	output: 5,
	cacheRead: 0,
	cacheWrite: 0,
	totalTokens: 75,
	cost: { input: 0.00105, output: 0.000075, cacheRead: 0, cacheWrite: 0, total: 0.001125 },
};

type Block = Record<string, unknown>;

function text(value: string, mark?: Block): Block {
	return mark === undefined ? { type: "text", text: value } : { type: "text", text: value, cache_control: { ...mark } };
}

/** A handoff request: the recorded carrier lost recall's block, and a new prompt follows it. */
const HANDOFF = {
	model: "claude-haiku-4-5",
	max_tokens: 32_000,
	system: [text("identity", PI), text("rules")],
	tools: [{ name: "bash", description: "bash tool", input_schema: { type: "object" } }],
	messages: [
		{ role: "user", content: [text("first")] },
		{ role: "assistant", content: [text("reply")] },
		{ role: "user", content: [text("next prompt", PI)] },
	],
};

const RECORD: CarrierRecord = { index: 0, fingerprint: "first", block: "previous" };

const assistant = (overrides: Record<string, unknown> = {}) =>
	({
		role: "assistant",
		content: [{ type: "text", text: "reply" }],
		api: "anthropic-messages",
		provider: "anthropic",
		model: "claude-haiku-4-5",
		usage: USAGE,
		stopReason: "stop",
		timestamp: 2,
		...overrides,
	}) as unknown;

const user = () => ({ role: "user", content: "why?", timestamp: 1 }) as unknown;

/** The commit handler's tests also need the payload handler's record, so both register as composed. */
function harness(options: { state?: PayloadCacheState } = {}) {
	const fake = createFakePi();
	const session = createSessionConfig();
	const state = options.state ?? { recallBlock: null, carrier: RECORD, nextCarrier: null, applied: null };
	const gated = createGatedPi(fake.pi, session);
	registerPayloadCacheCommitHandler(gated, state);
	registerBeforeProviderRequestHandler(gated, state);
	session.assign({ status: "ready", config: DEFAULT_TAIKNR_CONFIG });

	const context = () => createContextStub({ cwd: "/work", trusted: false, model: COVERED });
	/** Fire the section's one handler by its event, as pi's runner does. */
	const fire = (event: "before_provider_request" | "message_end", payload: unknown) => {
		const registered = fake.registered.find((entry) => entry.event === event);
		if (registered === undefined) throw new Error(`nothing registered for ${event}`);
		return registered.handler(
			event === "message_end"
				? { type: event, message: payload }
				: { type: event, payload: payload as Record<string, unknown> },
			context(),
		);
	};

	return { fake, state, fire };
}

test("the commit handler registers message_end and nothing else", () => {
	const { fake } = harness();

	expect(fake.registered.map(({ event }) => event)).toEqual(["message_end", "before_provider_request"]);
});

test("two handoff calls with no message_end between them carry the carry both times", () => {
	const { state, fire } = harness();

	const first = fire("before_provider_request", HANDOFF) as Block;
	const second = fire("before_provider_request", HANDOFF) as Block;

	for (const output of [first, second]) {
		const messages = output.messages as Block[];
		const carried = (messages[0] as Block).content as Block[];
		expect(carried[0]?.cache_control).toEqual(PI);
	}
	expect(state.carrier).toEqual(RECORD);
});

/** A recalling request: recall's block is the last block of the newest user message, after its own text. */
const RECALLING = { ...HANDOFF, messages: [{ role: "user", content: [text("own"), text("block", PI)] }] };

test("a valid assistant response commits the record the payload call computed", () => {
	const { state, fire } = harness({
		state: { recallBlock: "block", carrier: null, nextCarrier: null, applied: null },
	});
	const computed: CarrierRecord = { index: 0, fingerprint: "own", block: "block" };

	fire("before_provider_request", RECALLING);
	expect(state.nextCarrier).toEqual(computed);
	expect(state.carrier).toBeNull();

	fire("message_end", assistant());
	expect(state.carrier).toEqual(computed);

	// A handoff carries no block, so the record it computes and commits is empty.
	state.recallBlock = null;
	fire("before_provider_request", HANDOFF);
	fire("message_end", assistant());
	expect(state.carrier).toBeNull();
});

test.each(["error", "aborted"])("a response whose stop reason is %s commits nothing", (stopReason) => {
	const { state, fire } = harness();
	fire("before_provider_request", HANDOFF);

	fire("message_end", assistant({ stopReason }));

	expect(state.carrier).toEqual(RECORD);
});

test("an assistant response with an invalid usage commits nothing", () => {
	const { state, fire } = harness();
	fire("before_provider_request", HANDOFF);

	fire("message_end", assistant({ usage: { ...USAGE, input: 0, cacheRead: 0, cacheWrite: 0 } }));

	expect(state.carrier).toEqual(RECORD);
});

test("a payload call with no message_end after it commits nothing", () => {
	const { state, fire } = harness();

	fire("before_provider_request", HANDOFF);

	expect(state.carrier).toEqual(RECORD);
});

test("a user message and a tool result commit nothing", () => {
	const { state, fire } = harness();
	fire("before_provider_request", HANDOFF);

	fire("message_end", user());
	fire("message_end", { role: "toolResult", toolCallId: "t1", toolName: "bash", content: [], isError: false });

	expect(state.carrier).toEqual(RECORD);
});

test("a commit with no payload call before it invents no record, so the next handoff carries nothing", () => {
	const { state, fire } = harness({
		state: { recallBlock: null, carrier: null, nextCarrier: null, applied: null },
	});

	fire("message_end", assistant());

	expect(state.carrier).toBeNull();
	expect(fire("before_provider_request", HANDOFF)).toBeUndefined();
});

test("two valid commits in a row promote the record each payload call computed", () => {
	const { state, fire } = harness({
		state: { recallBlock: "block", carrier: null, nextCarrier: null, applied: null },
	});
	const later = { ...RECALLING, messages: [{ role: "user", content: [text("later"), text("block", PI)] }] };

	fire("before_provider_request", RECALLING);
	fire("message_end", assistant());
	expect(state.carrier).toEqual({ index: 0, fingerprint: "own", block: "block" });

	fire("before_provider_request", later);
	fire("message_end", assistant());
	expect(state.carrier).toEqual({ index: 0, fingerprint: "later", block: "block" });
});
