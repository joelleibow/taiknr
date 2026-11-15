import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { summarizeSingleLine } from "../../domain/archived-output.js";

export function registerToolCallHandler(pi: ExtensionAPI, argsByCallId: Map<string, string>): void {
	pi.on("tool_call", (event) => {
		// A nested call never appears in the transcript as a tool result, so no stub can join its id.
		if (event.parentToolCallId !== undefined) return;
		let serialized = "";
		try {
			// `event.input` is mutable by earlier handlers, and a throw here would block the user's call.
			serialized = JSON.stringify(event.input) ?? "";
		} catch {
			serialized = "";
		}
		// shortcut: one ≤120-character summary per top-level call lives for the session's lifetime
		// because no locked signature offers a release point; upgrade when one does (M6).
		argsByCallId.set(event.toolCallId, summarizeSingleLine(serialized, 120));
	});
}
