import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export function registerToolCallHandler(_pi: ExtensionAPI, _argsByCallId: Map<string, string>): void {
	_pi.on("tool_call", () => {});
}
