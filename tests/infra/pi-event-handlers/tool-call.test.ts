import { expect, test } from "vitest";
import { registerToolCallHandler } from "../../../src/infra/pi-event-handlers/tool-call.js";
import { createFakePi } from "../../support/fake-pi.js";

/** Register the bridge on a fresh fake `pi` and return its `tool_call` callback with the map. */
function register() {
	const fake = createFakePi();
	const argsByCallId = new Map<string, string>();
	registerToolCallHandler(fake.pi, argsByCallId);
	const [registration] = fake.registered;
	const call = (input: unknown, overrides: Record<string, unknown> = {}) =>
		registration.handler({ type: "tool_call", toolCallId: "call-1", toolName: "bash", input, ...overrides });
	return { argsByCallId, call, registered: fake.registered };
}

test("a top-level call records its input as a single-line summary", () => {
	const { argsByCallId, call } = register();

	call({ command: "npm test" });

	expect(argsByCallId.get("call-1")).toBe('{"command":"npm test"}');
});

test("a second call records a second key without disturbing the first", () => {
	const { argsByCallId, call } = register();

	call({ command: "npm test" });
	call({ command: "npm run lint" }, { toolCallId: "call-2" });

	expect(argsByCallId.get("call-1")).toBe('{"command":"npm test"}');
	expect(argsByCallId.get("call-2")).toBe('{"command":"npm run lint"}');
});

test("a nested call records nothing", () => {
	const { argsByCallId, call } = register();

	call({ command: "npm test" }, { parentToolCallId: "parent/1" });

	expect(argsByCallId.size).toBe(0);
});

test("undefined input records an empty summary without throwing", () => {
	const { argsByCallId, call } = register();

	expect(() => call(undefined)).not.toThrow();

	expect(argsByCallId.get("call-1")).toBe("");
});

test("an input carrying a BigInt records an empty summary without throwing", () => {
	const { argsByCallId, call } = register();

	expect(() => call({ big: 1n })).not.toThrow();

	expect(argsByCallId.get("call-1")).toBe("");
});

test("a circular input records an empty summary without throwing", () => {
	const circular: Record<string, unknown> = {};
	circular.self = circular;
	const { argsByCallId, call } = register();

	expect(() => call(circular)).not.toThrow();

	expect(argsByCallId.get("call-1")).toBe("");
});

test("an input whose toJSON throws records an empty summary without throwing", () => {
	const { argsByCallId, call } = register();

	expect(() =>
		call({
			toJSON: () => {
				throw new Error("no");
			},
		}),
	).not.toThrow();

	expect(argsByCallId.get("call-1")).toBe("");
});

test("an empty object records empty braces", () => {
	const { argsByCallId, call } = register();

	call({});

	expect(argsByCallId.get("call-1")).toBe("{}");
});

test("the separators JSON leaves unescaped become spaces", () => {
	const { argsByCallId, call } = register();

	call({ command: "a\nb\r\nc\u2028d\u2029e\u0085f" });

	const summary = argsByCallId.get("call-1") ?? "";
	expect(summary).toBe('{"command":"a\\nb\\r\\nc d e f"}');
	for (const separator of ["\n", "\r", "\u2028", "\u2029", "\u0085"]) expect(summary).not.toContain(separator);
});

test("a summary longer than 120 characters keeps its first 40 units and its last 79", () => {
	const { argsByCallId, call } = register();

	call({ command: "x".repeat(200) });

	expect(argsByCallId.get("call-1")).toBe(`{"command":"${"x".repeat(28)}…${"x".repeat(77)}"}`);
	expect(argsByCallId.get("call-1")).toHaveLength(120);
});

test("the summary is recorded into the map the registrar was given", () => {
	const argsByCallId = new Map<string, string>();
	const fake = createFakePi();
	registerToolCallHandler(fake.pi, argsByCallId);

	fake.registered[0].handler({ type: "tool_call", toolCallId: "call-1", toolName: "bash", input: { a: 1 } });

	expect(argsByCallId.get("call-1")).toBe('{"a":1}');
});
