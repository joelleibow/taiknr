import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

export interface RegisteredHandler {
	event: string;
	handler: (...args: unknown[]) => unknown;
}

export interface FakePi {
	pi: ExtensionAPI;
	registered: RegisteredHandler[];
	onReturn: () => void;
	marker: object;
}

/**
 * The host is an external boundary, so tests fake it: `on` records each event/handler pair in call
 * order and returns `onReturn`, a sentinel a test can compare by identity.
 */
export function createFakePi(): FakePi {
	const registered: RegisteredHandler[] = [];
	const marker = {};
	const onReturn = () => {};
	const pi = {
		on(event: string, handler: (...args: unknown[]) => unknown) {
			registered.push({ event, handler });
			return onReturn;
		},
		marker,
	} as unknown as ExtensionAPI;
	return { pi, registered, onReturn, marker };
}

/** A context stub carrying only the two members the session-start bridge reads. */
export function createContextStub(options: { cwd: string; trusted: boolean }): ExtensionContext {
	return { cwd: options.cwd, isProjectTrusted: () => options.trusted } as unknown as ExtensionContext;
}
