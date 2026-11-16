import type { ExtensionAPI, ExtensionContext, SessionEntry } from "@earendil-works/pi-coding-agent";

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
export function createFakePi(options: { settings?: ReturnType<ExtensionAPI["getSettings"]> } = {}): FakePi {
	const registered: RegisteredHandler[] = [];
	const marker = {};
	const onReturn = () => {};
	const pi = {
		on(event: string, handler: (...args: unknown[]) => unknown) {
			registered.push({ event, handler });
			return onReturn;
		},
		getSettings: () => options.settings ?? {},
		marker,
	} as unknown as ExtensionAPI;
	return { pi, registered, onReturn, marker };
}

/** A context stub carrying the members the archive handlers read, with an empty branch by default. */
export function createContextStub(options: {
	cwd: string;
	trusted: boolean;
	branch?: SessionEntry[];
	/** Omitted means the host reports no usage at all, as it does with no model. */
	contextWindow?: number;
	model?: { provider: string; id: string };
	signal?: AbortSignal;
	/** Either a stub or a real `ModelRegistry`, passed through as given. */
	modelRegistry?: unknown;
	notify?: (message: string, type?: string) => void;
}): ExtensionContext {
	const { contextWindow } = options;
	return {
		cwd: options.cwd,
		isProjectTrusted: () => options.trusted,
		sessionManager: { getBranch: () => options.branch ?? [] },
		getContextUsage: () => (contextWindow === undefined ? undefined : { tokens: null, contextWindow, percent: null }),
		model: options.model,
		signal: options.signal,
		modelRegistry: options.modelRegistry,
		ui: { notify: options.notify ?? (() => {}) },
	} as unknown as ExtensionContext;
}
