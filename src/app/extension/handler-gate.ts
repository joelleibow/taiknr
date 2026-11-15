import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import type { SessionConfig } from "../../config/session-config.js";

// Module-local, not exported: the loose signature Pi's overloaded `on` is cast to.
type LooseOn = (event: string, handler: (eventArg: unknown, ctx: unknown) => unknown) => () => void;

/**
 * The `pi` the six non-session-start registrars receive: a handler runs only while the session is
 * active, and every other member is the host's own (design D3).
 */
export function createGatedPi(pi: ExtensionAPI, session: SessionConfig): ExtensionAPI {
	return new Proxy(pi, {
		get(target, property, receiver) {
			if (property !== "on") return Reflect.get(target, property, receiver);
			return (event: string, handler: (eventArg: unknown, ctx: unknown) => unknown) => {
				const wrapper = (eventArg: unknown, ctx: unknown) => (session.isActive() ? handler(eventArg, ctx) : undefined);
				return (target.on as unknown as LooseOn)(event, wrapper);
			};
		},
	});
}
