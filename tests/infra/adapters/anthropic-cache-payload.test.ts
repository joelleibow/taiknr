import { expect, test } from "vitest";
import { coversRoute, type RouteModel } from "../../../src/infra/adapters/anthropic-cache-payload.js";

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
