import type {
	ContextWithSystemEvent,
	ExtensionAPI,
	ExtensionContext,
	SessionEntry,
} from "@earendil-works/pi-coding-agent";

export interface RegisteredHandler {
	event: string;
	handler: (...args: unknown[]) => unknown;
}

/** One thing that crossed pi's bus, in call order. */
export interface Emitted {
	channel: string;
	data: unknown;
}

export interface FakePi {
	pi: ExtensionAPI;
	registered: RegisteredHandler[];
	onReturn: () => void;
	marker: object;
	emitted: Emitted[];
}

/**
 * The host is an external boundary, so tests fake it: `on` records each event/handler pair in call
 * order and returns `onReturn`, a sentinel a test can compare by identity; `events.emit` records
 * what crossed the bus, and records before it throws when a case says the bus is stale.
 */
export function createFakePi(
	options: { settings?: ReturnType<ExtensionAPI["getSettings"]>; emitThrows?: boolean } = {},
): FakePi {
	const registered: RegisteredHandler[] = [];
	const emitted: Emitted[] = [];
	const marker = {};
	const onReturn = () => {};
	const pi = {
		on(event: string, handler: (...args: unknown[]) => unknown) {
			registered.push({ event, handler });
			return onReturn;
		},
		events: {
			emit(channel: string, data: unknown) {
				emitted.push({ channel, data });
				if (options.emitThrows === true) throw new Error(`the extension context is stale: ${channel}`);
			},
		},
		getSettings: () => options.settings ?? {},
		marker,
	} as unknown as ExtensionAPI;
	return { pi, registered, onReturn, marker, emitted };
}

/** What pi's `sessionManager` offers the handlers and the readings, with an empty branch by default. */
export function createContextStub(options: {
	cwd: string;
	trusted: boolean;
	branch?: SessionEntry[];
	/** Omitted means the host reports no usage at all, as it does with no model. */
	contextWindow?: number;
	model?: { provider: string; id: string; api?: string; baseUrl?: string };
	signal?: AbortSignal;
	/** Either a stub or a real `ModelRegistry`, passed through as given. */
	modelRegistry?: unknown;
	notify?: (message: string, type?: string) => void;
	/** What the persisted projection projects to; omitted means it projects to nothing. */
	projectionMessages?: ContextWithSystemEvent["messages"];
	/**
	 * Every host read an instrument reading makes throws: `model` as a getter, `getContextUsage`,
	 * `buildSessionProjection` and `getBranch`. The one home of the switch-off fixture (AGENTS.md).
	 */
	hostReadsThrow?: true;
}): ExtensionContext {
	const { contextWindow, hostReadsThrow } = options;
	const unavailable = (): never => {
		throw new Error("an instrument read the host while it was off");
	};
	return {
		cwd: options.cwd,
		isProjectTrusted: () => options.trusted,
		sessionManager: {
			getBranch: () => (hostReadsThrow === true ? unavailable() : (options.branch ?? [])),
			buildSessionProjection: () =>
				hostReadsThrow === true ? unavailable() : { messages: options.projectionMessages ?? [] },
		},
		getContextUsage: () =>
			hostReadsThrow === true
				? unavailable()
				: contextWindow === undefined
					? undefined
					: { tokens: null, contextWindow, percent: null },
		get model() {
			return hostReadsThrow === true ? unavailable() : options.model;
		},
		signal: options.signal,
		modelRegistry: options.modelRegistry,
		ui: { notify: options.notify ?? (() => {}) },
	} as unknown as ExtensionContext;
}
