import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import type { FailureNotifier } from "../../use-cases/ports.js";

/** Emit at most one warning notification per session when classification fails. */
export function createOncePerSessionNotifier(getCtx: () => ExtensionContext): FailureNotifier {
	let warned = false;
	return {
		notifyOnce(message: string): void {
			if (warned) return;
			getCtx().ui.notify(message, "warning");
			// Set only once the notice is out, so a throw (a stale ctx) leaves the session's one notice unspent.
			warned = true;
		},
	};
}
