import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { expect, test } from "vitest";
import taiknr from "../../../src/app/extension/taiknr.js";

test("registers the seventeen lifecycle registrations, duplicates kept, and touches nothing else", () => {
	const events: string[] = [];
	const fake = new Proxy({} as ExtensionAPI, {
		get(_target, prop) {
			if (prop === "on") return (event: string) => events.push(event);
			throw new Error(`unexpected ExtensionAPI member: ${String(prop)}`);
		},
	});
	taiknr(fake);
	expect(events.sort()).toEqual([
		"agent_before_settle",
		"agent_settled",
		"agent_settled",
		"before_provider_request",
		"context_with_system",
		"context_with_system",
		"message_end",
		"message_end",
		"session_compact",
		"session_compact",
		"session_shutdown",
		"session_start",
		"session_start",
		"session_tree",
		"session_tree",
		"tool_call",
		"turn_end",
	]);
});
