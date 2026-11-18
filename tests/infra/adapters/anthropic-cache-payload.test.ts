import { expect, test } from "vitest";
import { coversRoute, editPayload, type RouteModel } from "../../../src/infra/adapters/anthropic-cache-payload.js";
import type { CarrierRecord } from "../../../src/use-cases/payload-cache.js";

const ANTHROPIC_API: RouteModel = {
	provider: "anthropic",
	api: "anthropic-messages",
	id: "claude-haiku-4-5",
	baseUrl: "https://api.anthropic.com",
};

const OPENROUTER: RouteModel = {
	provider: "openrouter",
	api: "anthropic-messages",
	id: "anthropic/claude-haiku-4.5",
	baseUrl: "https://openrouter.ai/api",
};

/** One row per route D1 names, covered or not, with the reason the row answers as it does. */
const routes: Array<[string, RouteModel | undefined, boolean]> = [
	["Anthropic direct over a URL with no path", ANTHROPIC_API, true],
	["Anthropic through OpenRouter on the Anthropic api", OPENROUTER, true],
	[
		"Anthropic behind a proxy that ends in the real host",
		{ ...ANTHROPIC_API, baseUrl: "https://api.anthropic.com.corp-proxy.internal" },
		false,
	],
	[
		"Anthropic behind a proxy whose path names the real host",
		{ ...ANTHROPIC_API, baseUrl: "https://gw.corp/api.anthropic.com/" },
		false,
	],
	["Anthropic with no baseUrl at all", { ...ANTHROPIC_API, baseUrl: undefined }, false],
	["Anthropic with a baseUrl no URL can parse", { ...ANTHROPIC_API, baseUrl: "not a url" }, false],
	["OpenRouter on the OpenAI-shaped api", { ...OPENROUTER, api: "openai-completions" }, false],
	["Gemini through OpenRouter's Anthropic api", { ...OPENROUTER, id: "google/gemini-2.5-pro" }, false],
	["a request carrying no model", undefined, false],
	["bedrock", { provider: "bedrock", api: "anthropic-messages", id: "anthropic.claude-haiku-4-5" }, false],
	["minimax", { provider: "minimax", api: "anthropic-messages", id: "anthropic/claude-haiku-4.5" }, false],
	["opencode", { provider: "opencode", api: "anthropic-messages", id: "anthropic/claude-haiku-4.5" }, false],
	[
		"cloudflare-ai-gateway",
		{ provider: "cloudflare-ai-gateway", api: "anthropic-messages", id: "anthropic/claude-haiku-4.5" },
		false,
	],
	[
		"vercel-ai-gateway",
		{ provider: "vercel-ai-gateway", api: "anthropic-messages", id: "anthropic/claude-haiku-4.5" },
		false,
	],
	["fireworks", { provider: "fireworks", api: "anthropic-messages", id: "anthropic/claude-haiku-4.5" }, false],
	[
		"github-copilot",
		{ provider: "github-copilot", api: "anthropic-messages", id: "anthropic/claude-haiku-4.5" },
		false,
	],
];

test.each(routes)("the route table: %s answers %s", (_name, model, covered) => {
	expect(coversRoute(model)).toBe(covered);
});

type Block = Record<string, unknown>;
type Message = { role: string; content: unknown };

/** pi's own message marker, `ttl` and all: every point taiknr places is a copy of this object (D2). */
const PI: Block = { type: "ephemeral", ttl: "1h" };

function text(value: string, mark?: Block): Block {
	return mark === undefined ? { type: "text", text: value } : { type: "text", text: value, cache_control: { ...mark } };
}

function image(mark?: Block): Block {
	const block: Block = { type: "image", source: { type: "base64", media_type: "image/png", data: "AAAA" } };
	return mark === undefined ? block : { ...block, cache_control: { ...mark } };
}

function tool(name: string, mark?: Block): Block {
	const definition: Block = { name, description: `${name} tool`, input_schema: { type: "object", properties: {} } };
	return mark === undefined ? definition : { ...definition, cache_control: { ...mark } };
}

function user(...content: Block[]): Message {
	return { role: "user", content };
}

function assistant(...content: Block[]): Message {
	return { role: "assistant", content };
}

function toolUse(command: string): Block {
	return { type: "tool_use", id: "t1", name: "bash", input: { command } };
}

function toolResult(...content: Block[]): Message {
	return { role: "user", content: [{ type: "tool_result", tool_use_id: "t1", content }] };
}

/** An API-key request: pi marks the first system block and the last tool, so three points in all. */
function payload(messages: Message[], overrides: Block = {}): Block {
	return {
		model: "claude-haiku-4-5",
		max_tokens: 32_000,
		system: [text("identity", PI), text("rules")],
		tools: [tool("bash"), tool("read", PI)],
		messages,
		...overrides,
	};
}

/** pi's own OAuth shape: the first two system blocks both marked (D3). */
function oauthPayload(messages: Message[], overrides: Block = {}): Block {
	return payload(messages, { system: [text("identity", PI), text("rules", PI), text("tools")], ...overrides });
}

/** Every `cache_control` at every depth, removed: the payload a provider would compare on text alone. */
function withoutMarkers(value: unknown): unknown {
	return JSON.parse(JSON.stringify(value, (key, inner) => (key === "cache_control" ? undefined : inner)));
}

const ALIAS: Record<string, string> = { messages: "m" };

/** Every ephemeral marker in a payload, named by its path and in payload order. */
function markerPaths(value: unknown): string[] {
	const paths: string[] = [];
	const walk = (node: unknown, label: string): void => {
		if (Array.isArray(node)) {
			node.forEach((item, index) => {
				walk(item, `${label}[${index}]`);
			});
			return;
		}
		if (node === null || typeof node !== "object") return;
		const record = node as Block;
		const mark = record.cache_control;
		if (typeof mark === "object" && mark !== null && (mark as Block).type === "ephemeral") {
			paths.push(label === "" ? "top" : label);
		}
		for (const [key, child] of Object.entries(record)) {
			if (key === "cache_control") continue;
			walk(child, `${label === "" ? "" : `${label}.`}${ALIAS[key] ?? key}`);
		}
	};
	walk(value, "");
	return paths;
}

/** The whole adapter result, with the output as a payload a test can read. */
function edit(input: Block, recallBlock: string | null, carrier: CarrierRecord | null, model = ANTHROPIC_API) {
	const result = editPayload(input, model, recallBlock, carrier);
	return { ...result, output: result.output as Block | undefined };
}

/** The whole result of an edit that must have changed the payload, with its output a payload. */
function changed(input: Block, recallBlock: string | null, carrier: CarrierRecord | null) {
	const result = edit(input, recallBlock, carrier);
	expect(result.output).toBeDefined();
	return { ...result, output: result.output as Block };
}

const UNTOUCHED = { output: undefined, nextCarrier: null, applied: null };

test.each(routes.filter(([, , covered]) => !covered))(
	"an uncovered route (%s) leaves the payload alone",
	(_name, model) => {
		const input = oauthPayload([user(text("own"), text("block", PI))]);

		expect(editPayload(input, model, "block", { index: 0, fingerprint: "own", block: "block" })).toEqual({
			output: undefined,
			nextCarrier: { index: 0, fingerprint: "own", block: "block" },
			applied: null,
		});
	},
);

test("a payload that is not an object, and one with no messages, are left alone", () => {
	expect(editPayload(undefined, ANTHROPIC_API, "block", null)).toEqual(UNTOUCHED);
	expect(editPayload("a string", ANTHROPIC_API, "block", null)).toEqual(UNTOUCHED);
	expect(editPayload({ model: "claude-haiku-4-5", system: [] }, ANTHROPIC_API, "block", null)).toEqual(UNTOUCHED);
});

test("a covered payload with an empty messages array is normalized, so it is not one of the untouched cases", () => {
	const { output, applied } = changed(oauthPayload([]), "block", null);

	expect(markerPaths(output)).toEqual(["system[1]", "tools[1]"]);
	expect(applied).toBeNull();
});

test("pi's OAuth shape with no block and no handoff differs from its input only by system[0]'s marker", () => {
	const input = oauthPayload([user(text("own")), assistant(text("reply", PI))]);

	const { output } = changed(input, null, null);

	expect(markerPaths(input)).toEqual(["system[0]", "system[1]", "tools[1]", "m[1].content[0]"]);
	expect(output).toBeDefined();
	expect(markerPaths(output)).toEqual(["system[1]", "tools[1]", "m[1].content[0]"]);
	expect(withoutMarkers(output)).toEqual(withoutMarkers(input));
});

test("a payload pi marked nowhere loses only system[0]'s marker", () => {
	const input = oauthPayload([user(text("own")), assistant(text("reply"))]);

	const { output, applied, nextCarrier } = changed(input, null, null);

	expect(markerPaths(output)).toEqual(["system[1]", "tools[1]"]);
	expect(applied).toBeNull();
	expect(nextCarrier).toBeNull();
});

test("pi's OAuth shape: a handoff that also recalls places both points and yields pi's marker", () => {
	const input = oauthPayload([
		user(text("first")),
		assistant(text("reply")),
		user(text("more")),
		assistant(text("reply again")),
		user(text("own"), text("block", PI)),
	]);

	const { output, nextCarrier, applied } = changed(input, "block", {
		index: 0,
		fingerprint: "first",
		block: "previous",
	});

	expect(markerPaths(output)).toEqual(["system[1]", "tools[1]", "m[0].content[0]", "m[4].content[0]"]);
	expect(withoutMarkers(output)).toEqual(withoutMarkers(input));
	expect(nextCarrier).toEqual({ index: 4, fingerprint: "own", block: "block" });
	expect(applied).toEqual({ carrierRead: "previous", block: "uncached" });
});

test("pi's OAuth shape with a top-level marker has no room, so neither point is placed", () => {
	const input = oauthPayload(
		[
			user(text("first")),
			assistant(text("reply")),
			user(text("more")),
			assistant(text("reply again")),
			user(text("own"), text("block", PI)),
		],
		{ cache_control: { ...PI } },
	);

	const { output, nextCarrier, applied } = changed(input, "block", {
		index: 0,
		fingerprint: "first",
		block: "previous",
	});

	expect(markerPaths(output)).toEqual(["top", "system[1]", "tools[1]", "m[4].content[1]"]);
	expect(nextCarrier).toBeNull();
	expect(applied).toEqual({ carrierRead: null, block: "cached" });
});

test("a foreign message marker beside pi's stops every message-level edit", () => {
	const record: CarrierRecord = { index: 0, fingerprint: "first", block: "previous" };
	const input = payload([user(text("own", PI), text("block", PI))]);

	const { output, nextCarrier, applied } = edit(input, "block", record);

	expect(output).toBeUndefined();
	expect(nextCarrier).toEqual(record);
	expect(applied).toBeNull();
});

test("a marker inside a tool_result's content counts, so nothing is edited", () => {
	const input = payload([user(text("own"), text("block", PI)), toolResult(text("inner", PI))]);

	expect(edit(input, "block", null)).toEqual({
		output: undefined,
		nextCarrier: null,
		applied: null,
	});
});

test("a cache_control property inside a tool's input_schema is data, so both points are placed", () => {
	const input = payload(
		[
			user(text("first")),
			assistant(text("reply")),
			user(text("more")),
			assistant(text("reply again")),
			user(text("own"), text("block", PI)),
		],
		{
			tools: [
				{
					name: "bash",
					description: "bash tool",
					input_schema: { type: "object", properties: { cache_control: { ...PI } } },
				},
				tool("read", PI),
			],
		},
	);

	const { output } = changed(input, "block", { index: 0, fingerprint: "first", block: "previous" });

	expect(markerPaths(output)).toContain("m[0].content[0]");
	expect(markerPaths(output)).toContain("m[4].content[0]");
	expect(markerPaths(output)).not.toContain("m[4].content[1]");
	expect(output.tools).toEqual(input.tools);
});

test("a cache_control key inside a tool_use input is data, so the edit is still made", () => {
	const input = payload([
		user(text("own"), text("block", PI)),
		assistant({ type: "tool_use", id: "t1", name: "bash", input: { command: "ls", cache_control: { ...PI } } }),
	]);

	const { applied } = edit(input, "block", null);
	const { output } = changed(input, "block", null);

	expect(markerPaths(output)).toContain("m[0].content[0]");
	expect(markerPaths(output)).toContain("m[0].content[1]");
	expect((output.messages as Message[])[1]).toEqual((input.messages as Message[])[1]);
	expect(applied).toEqual({ carrierRead: null, block: "cached" });
});

test("pi's marker followed by an empty role:system effort message is still recognised", () => {
	const input = payload([user(text("own"), text("block", PI)), { role: "system", content: "" }]);

	const { output, applied } = changed(input, "block", null);

	expect(markerPaths(output)).toEqual(["system[0]", "tools[1]", "m[0].content[0]", "m[0].content[1]"]);
	expect(applied).toEqual({ carrierRead: null, block: "cached" });
});

test("over an API key with no record the before point lands, and pi's marker on the block stays", () => {
	const input = payload([user(text("earlier")), assistant(text("reply")), user(text("own"), text("block", PI))]);

	const { output, nextCarrier, applied } = changed(input, "block", null);

	expect(markerPaths(input)).toEqual(["system[0]", "tools[1]", "m[2].content[1]"]);
	expect(markerPaths(output)).toEqual(["system[0]", "tools[1]", "m[2].content[0]", "m[2].content[1]"]);
	expect(output).toBeDefined();
	expect(withoutMarkers(output)).toEqual(withoutMarkers(input));
	expect(output.messages).toHaveLength(3);
	expect(nextCarrier).toEqual({ index: 2, fingerprint: "own", block: "block" });
	expect(applied).toEqual({ carrierRead: null, block: "cached" });
});

test("a top-level marker leaves room for the before point and yields pi's marker, with the block cached", () => {
	const input = payload([user(text("own"), text("block", PI))], { cache_control: { ...PI } });

	const { output, applied } = changed(input, "block", null);

	expect(markerPaths(output)).toEqual(["top", "system[0]", "tools[1]", "m[0].content[0]"]);
	expect(applied).toEqual({ carrierRead: null, block: "cached" });
});

test("a second tools marker instead yields pi's marker and leaves the block uncached", () => {
	const input = payload([user(text("own"), text("block", PI))], {
		tools: [tool("bash"), tool("read", PI), tool("edit", PI)],
	});

	const { output, applied } = changed(input, "block", null);

	expect(markerPaths(output)).toEqual(["system[0]", "tools[1]", "tools[2]", "m[0].content[0]"]);
	expect(applied).toEqual({ carrierRead: null, block: "uncached" });
});

test("a block the payload does not carry places no point and prices nothing", () => {
	const input = payload([user(text("own"), text("something else", PI))]);

	expect(edit(input, "block", null)).toEqual({
		output: undefined,
		nextCarrier: null,
		applied: { carrierRead: null, block: null },
	});
});

test("a string-content message, a pasted block and a block first in its message each skip the before point", () => {
	const asString = payload([{ role: "user", content: "block" }, assistant(text("reply", PI))]);
	expect(edit(asString, "block", null)).toEqual({
		output: undefined,
		nextCarrier: null,
		applied: { carrierRead: null, block: null },
	});

	const pasted = payload([user(text("own"), text("<recalled_context>block</recalled_context>", PI))]);
	expect(edit(pasted, "block", null)).toEqual({
		output: undefined,
		nextCarrier: null,
		applied: { carrierRead: null, block: null },
	});

	const first = payload([assistant(text("reply")), user(text("block", PI))]);
	expect(edit(first, "block", null)).toEqual({
		output: undefined,
		nextCarrier: null,
		applied: { carrierRead: null, block: "cached" },
	});
});

test("a lone surrogate inside the block still matches pi's sanitized text", () => {
	const input = payload([user(text("own"), text("block", PI))]);

	const { output, nextCarrier } = changed(input, "block\uD800", null);

	expect(markerPaths(output)).toEqual(["system[0]", "tools[1]", "m[0].content[0]", "m[0].content[1]"]);
	expect(nextCarrier).toEqual({ index: 0, fingerprint: "own", block: "block\uD800" });
});

test("the handoff places the carry on the recorded block, ttl copied", () => {
	const input = payload([user(text("first")), assistant(text("reply")), user(text("next prompt", PI))]);

	const { output, nextCarrier, applied } = changed(input, null, { index: 0, fingerprint: "first", block: "previous" });

	expect(markerPaths(output)).toEqual(["system[0]", "tools[1]", "m[0].content[0]", "m[2].content[0]"]);
	const carried = (output.messages as Message[])[0]?.content as Block[];
	expect(carried[0]?.cache_control).toEqual({ ttl: "1h", type: "ephemeral" });
	expect(nextCarrier).toBeNull();
	expect(applied).toEqual({ carrierRead: "previous", block: null });
});

/** The record a recalling request leaves on `[image, R]`, used by the two-request cases below. */
function imageRecord(): CarrierRecord | null {
	return edit(payload([user(image(), text("block", PI))]), "block", null).nextCarrier;
}

test("a carrier [image, R] recorded and then [image] carrying pi's marker: the carry is already in place", () => {
	const record = imageRecord();
	const replay = payload([user(image(PI))]);

	const { output, applied } = edit(replay, null, record);

	expect(record).not.toBeNull();
	expect(output).toBeUndefined();
	expect(applied).toEqual({ carrierRead: "block", block: null });
});

test("a carrier [image, R] recorded and then [image] unmarked: the carry is placed", () => {
	const record = imageRecord();
	const replay = payload([user(image()), user(text("next", PI))]);

	const { output } = changed(replay, null, record);

	const carried = (output.messages as Message[])[0]?.content as Block[];
	expect(carried[0]?.cache_control).toEqual(PI);
});

test("a different last block at the recorded index places no carry", () => {
	const record = imageRecord();
	const next = payload([user(text("other", PI))]);

	expect(edit(next, null, record)).toEqual({
		output: undefined,
		nextCarrier: null,
		applied: { carrierRead: null, block: null },
	});
});

test("a carrier still ending with recall's block places only the before point", () => {
	const record: CarrierRecord = { index: 0, fingerprint: "earlier", block: "block" };
	const input = payload([user(text("earlier"), text("block", PI))]);

	const { output, nextCarrier, applied } = changed(input, "block", record);

	expect(markerPaths(output)).toEqual(["system[0]", "tools[1]", "m[0].content[0]", "m[0].content[1]"]);
	expect(nextCarrier).toEqual(record);
	expect(applied).toEqual({ carrierRead: "block", block: "cached" });
});

test("a coincident carry, where the fingerprint block already carries pi's marker, changes nothing", () => {
	const input = payload([user(text("first", PI))]);

	const { output, applied } = edit(input, null, { index: 0, fingerprint: "first", block: "previous" });

	expect(output).toBeUndefined();
	expect(applied).toEqual({ carrierRead: "previous", block: null });
});

test("two messages end with the block's exact text: the higher index is recorded", () => {
	const input = payload([user(text("block")), assistant(text("reply")), user(text("second"), text("block", PI))]);

	const { nextCarrier } = edit(input, "block", null);

	expect(nextCarrier).toEqual({ index: 2, fingerprint: "second", block: "block" });
});

test("a two-marker request leaves the record as it is, so the next handoff still carries", () => {
	const record: CarrierRecord = { index: 0, fingerprint: "earlier", block: "block" };
	const twoMarkers = payload([user(text("earlier", PI), text("block", PI))]);

	const between = edit(twoMarkers, "block", record);
	expect(between).toEqual({ output: undefined, nextCarrier: record, applied: null });

	const { output } = changed(payload([user(text("earlier")), user(text("next", PI))]), null, record);
	const carried = (output.messages as Message[])[0]?.content as Block[];
	expect(carried[0]?.cache_control).toEqual(PI);
});

test("a no-fit handoff that also recalls records nothing, so the next handoff reads nothing", () => {
	const record: CarrierRecord = { index: 0, fingerprint: "first", block: "previous" };
	const noFit = oauthPayload([user(text("first")), assistant(text("reply")), user(text("own"), text("block", PI))], {
		cache_control: { ...PI },
	});

	const { nextCarrier } = edit(noFit, "block", record);
	expect(nextCarrier).toBeNull();

	const handoff = edit(payload([user(text("first")), user(text("next", PI))]), null, null);
	expect(handoff.output).toBeUndefined();
	expect(handoff.applied).toEqual({ carrierRead: null, block: null });
});

test("a stale carrier, an index out of range and a message that is not a user's all place no carry", () => {
	const base = payload([user(text("other", PI)), assistant(text("reply"))]);
	const stale: CarrierRecord = { index: 0, fingerprint: "gone", block: "block" };
	const outOfRange: CarrierRecord = { index: 9, fingerprint: "other", block: "block" };
	const notAUser: CarrierRecord = { index: 1, fingerprint: "reply", block: "block" };

	for (const carrier of [stale, outOfRange, notAUser]) {
		expect(edit(base, null, carrier)).toEqual({
			output: undefined,
			nextCarrier: null,
			applied: { carrierRead: null, block: null },
		});
	}
});

test("a replay before the commit edits the same way, and one after it places no carry", () => {
	const record: CarrierRecord = { index: 0, fingerprint: "first", block: "previous" };
	const handoff = payload([user(text("first")), assistant(text("reply")), user(text("next", PI))]);

	const before = edit(handoff, null, record);
	expect(edit(handoff, null, record)).toEqual(before);
	expect(before.nextCarrier).toBeNull();

	const after = edit(handoff, null, before.nextCarrier);
	expect(after.output).toBeUndefined();
});

test("an in-turn request marks the block before the one recall appended to the same message", () => {
	const input = payload([
		user(text("U1")),
		assistant(text("A")),
		user(text("own"), text("B")),
		assistant(toolUse("ls")),
		toolResult(text("out", PI)),
	]);
	const record: CarrierRecord = { index: 2, fingerprint: "own", block: "B" };

	const { output, nextCarrier, applied } = changed(input, "B", record);

	expect(markerPaths(output)).toEqual(["system[0]", "tools[1]", "m[2].content[0]", "m[4].content[0].content[0]"]);
	expect(nextCarrier).toEqual(record);
	expect(applied).toEqual({ carrierRead: "B", block: "cached" });
});

test("a covered payload holding a value structuredClone cannot copy throws, and an uncovered one does not", () => {
	const covered = { messages: [], leftover: () => 1 };

	expect(() => editPayload(covered, ANTHROPIC_API, null, null)).toThrow();
	expect(
		editPayload(covered, { ...ANTHROPIC_API, baseUrl: "https://api.anthropic.com.corp-proxy.internal" }, null, null),
	).toEqual(UNTOUCHED);
	expect(editPayload(42, ANTHROPIC_API, null, null)).toEqual(UNTOUCHED);
});

test("a covered payload carrying pi's three markers and nothing to do changes nothing and prices nothing", () => {
	const input = payload([user(text("own")), assistant(text("reply", PI))]);

	expect(edit(input, null, null)).toEqual({
		output: undefined,
		nextCarrier: null,
		applied: { carrierRead: null, block: null },
	});
});

test("a cache_control that is not an object, or whose type is not ephemeral, is data", () => {
	const input = payload([
		{
			role: "user",
			content: [
				{ type: "text", text: "own", cache_control: "opaque" },
				{ type: "text", text: "block", cache_control: { type: "persistent" } },
			],
		},
	]);

	expect(edit(input, "block", null)).toEqual({
		output: undefined,
		nextCarrier: null,
		applied: null,
	});
});

test("three system blocks with the first two marked lose the first one's marker and nothing else", () => {
	const input = payload([user(text("own")), assistant(text("reply", PI))], {
		system: [text("identity", PI), text("rules", PI), text("tools")],
	});

	const { output } = changed(input, null, null);

	expect(markerPaths(output)).toEqual(["system[1]", "tools[1]", "m[1].content[0]"]);
	expect(withoutMarkers(output)).toEqual(withoutMarkers(input));
});

test("the payload the edit is given is never mutated", () => {
	const input = payload([user(text("own"), text("block", PI))]);
	const before = JSON.stringify(input);

	edit(input, "block", { index: 0, fingerprint: "own", block: "block" });

	expect(JSON.stringify(input)).toBe(before);
});

test("an earlier exact copy of the block is never the carrier, so it gets no point", () => {
	const input = payload([
		user(text("own"), text("block")),
		assistant(text("reply")),
		user(text("other"), text("block", PI)),
	]);

	const { output, nextCarrier } = changed(input, "block", null);

	expect(markerPaths(output)).toEqual(["system[0]", "tools[1]", "m[2].content[0]", "m[2].content[1]"]);
	expect(nextCarrier).toEqual({ index: 2, fingerprint: "other", block: "block" });
});
