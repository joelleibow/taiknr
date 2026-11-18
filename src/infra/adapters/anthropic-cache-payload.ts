import type { AppliedPlacement, CarrierRecord } from "../../use-cases/payload-cache.js";

/** The four fields D1 reads off `ctx.model`; `baseUrl` is optional because pi's `Model` makes it so. */
export interface RouteModel {
	provider: string;
	api: string;
	id: string;
	baseUrl?: string;
}

/** What one `editPayload` call produced: the clone to send, and the two facts it committed nowhere. */
export interface PayloadEdit {
	output: unknown;
	nextCarrier: CarrierRecord | null;
	applied: AppliedPlacement | null;
}

const ANTHROPIC_HOST = "api.anthropic.com";
const ANTHROPIC_API = "anthropic-messages";
const OPENROUTER_MODEL_PREFIX = "anthropic/";

/** A request may carry four points; a fifth is a 400, not a silent drop (D2). */
const BUDGET = 4;

/** Keys whose contents a provider sends as written, so a marker under one is data and not a position. */
const DATA_KEYS = new Set(["input_schema", "input"]);

/** pi's own lone-surrogate rule, kept here because pi-ai does not export it; a drift only means no match (D5). */
const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;

type PayloadObject = Record<string, unknown>;

/** One marked node in a payload, and where it sat. */
interface Marker extends Position {
	node: PayloadObject;
	value: PayloadObject;
}

/** The message recall appended its block to: the carrier the before point is placed in. */
interface CarrierMessage {
	index: number;
	content: unknown[];
}

function isObject(value: unknown): value is PayloadObject {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** A marker is an ephemeral `cache_control`; any other value under that key is data (design §5.3 (4)). */
function isMarker(value: unknown): boolean {
	return isObject(value) && value.type === "ephemeral";
}

function withoutLoneSurrogates(text: string): string {
	return text.replace(LONE_SURROGATE, "");
}

/** The host a baseUrl names, or undefined when it names none or no URL can parse it (D1). */
function hostOf(baseUrl: string | undefined): string | undefined {
	if (baseUrl === undefined) return undefined;
	try {
		return new URL(baseUrl).hostname;
	} catch {
		return undefined;
	}
}

/** A block's identity with every `cache_control` ignored: a text block by its text, any other by its JSON (D5). */
function fingerprintOf(block: unknown): string {
	if (isObject(block) && block.type === "text" && typeof block.text === "string") return block.text;
	return canonicalJson(block);
}

function canonicalJson(value: unknown): string {
	if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
	if (isObject(value)) {
		const entries = Object.entries(value)
			.filter(([key]) => key !== "cache_control")
			.sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
			.map(([key, inner]) => `${JSON.stringify(key)}:${canonicalJson(inner)}`);
		return `{${entries.join(",")}}`;
	}
	return JSON.stringify(value) ?? "null";
}

/** Where a marked node sits: the message it belongs to, and the content block inside that message. */
interface Position {
	message: number;
	block: number;
}

/**
 * Every marked node under `root`, in payload order, by the walk §5.3 (4) describes: it descends into
 * a `tool_result`'s content and not into a tool's `input_schema` or a `tool_use`'s `input`.
 */
function markersUnder(root: unknown, at: Position = { message: -1, block: -1 }): Marker[] {
	const found: Marker[] = [];
	const visit = (value: unknown, where: Position): void => {
		if (Array.isArray(value)) {
			for (const item of value) visit(item, where);
			return;
		}
		if (!isObject(value)) return;
		if (isMarker(value.cache_control)) {
			found.push({ ...where, node: value, value: value.cache_control as PayloadObject });
		}
		for (const [key, child] of Object.entries(value)) {
			if (key === "cache_control" || DATA_KEYS.has(key)) continue;
			if (key === "content" && Array.isArray(child)) {
				child.forEach((item, index) => {
					visit(item, { ...where, block: index });
				});
				continue;
			}
			visit(child, where);
		}
	};
	visit(root, at);
	return found;
}

/** Every marker under the messages, each knowing which message and block it sits in. */
function messageMarkers(messages: readonly unknown[]): Marker[] {
	return messages.flatMap((message, index) => markersUnder(message, { message: index, block: -1 }));
}

/** D3's one carve-out: where system carries two marked blocks, the first system block's marker goes. */
function unmarkFirstSystemBlock(clone: PayloadObject): boolean {
	const { system } = clone;
	if (!Array.isArray(system)) return false;
	const marked = system.filter((block) => isObject(block) && isMarker(block.cache_control)).length;
	const [first] = system;
	if (marked < 2 || !isObject(first) || !isMarker(first.cache_control)) return false;
	delete first.cache_control;
	return true;
}

/**
 * The highest-index user message whose last block is recall's block, after pi's lone-surrogate rule.
 * It is recall's carrier: recall only ever appends to the newest user message (design §5.3 (4)).
 */
function carrierIn(messages: readonly unknown[], recallBlock: string | null): CarrierMessage | undefined {
	if (recallBlock === null) return undefined;
	const wanted = withoutLoneSurrogates(recallBlock);
	let found: CarrierMessage | undefined;
	messages.forEach((message, index) => {
		if (!isObject(message) || message.role !== "user" || !Array.isArray(message.content)) return;
		const last = message.content[message.content.length - 1];
		if (!isObject(last) || last.type !== "text" || typeof last.text !== "string") return;
		if (withoutLoneSurrogates(last.text) === wanted) found = { index, content: message.content };
	});
	return found;
}

/** The block at the record's index that the record fingerprints, when it is a user message's own block. */
function fingerprintedBlock(messages: readonly unknown[], record: CarrierRecord | null): PayloadObject | undefined {
	if (record === null) return undefined;
	const message = messages[record.index];
	if (!isObject(message) || message.role !== "user" || !Array.isArray(message.content)) return undefined;
	const [last] = message.content.slice(-1);
	return isObject(last) && fingerprintOf(last) === record.fingerprint ? last : undefined;
}

/** Whether the message at the record's index carries a marker on the block the record fingerprints (D7). */
function carrierRead(messages: readonly unknown[], record: CarrierRecord | null): string | null {
	if (record === null) return null;
	const message = messages[record.index];
	if (!isObject(message) || message.role !== "user" || !Array.isArray(message.content)) return null;
	const marked = message.content.some(
		(block) => isObject(block) && fingerprintOf(block) === record.fingerprint && isMarker(block.cache_control),
	);
	return marked ? record.block : null;
}

/** D8's block state on the finished clone: a marker at or after the block, or a top-level one, caches it. */
function blockState(
	clone: PayloadObject,
	messages: readonly unknown[],
	carrier: CarrierMessage | undefined,
): AppliedPlacement["block"] {
	if (carrier === undefined) return null;
	if (isMarker(clone.cache_control)) return "cached";
	const last = carrier.content.length - 1;
	const marked = messageMarkers(messages).some(
		(marker) => marker.message > carrier.index || (marker.message === carrier.index && marker.block >= last),
	);
	return marked ? "cached" : "uncached";
}

/** D1's route half: the routes this change was measured on, and no others. */
export function coversRoute(model: RouteModel | undefined): boolean {
	if (model === undefined || model.api !== ANTHROPIC_API) return false;
	if (model.provider === "anthropic") return hostOf(model.baseUrl) === ANTHROPIC_HOST;
	if (model.provider === "openrouter") return model.id.startsWith(OPENROUTER_MODEL_PREFIX);
	return false;
}

/**
 * The whole payload edit (design §5.3): normalize pi's OAuth shape, place the before point and the
 * carry inside the four-point budget, and report what the finished clone does with recall's block.
 * Nothing it is given is mutated; a value it cannot copy throws, and the handler is the fail-open path.
 */
export function editPayload(
	payload: unknown,
	model: RouteModel | undefined,
	recallBlock: string | null,
	carrier: CarrierRecord | null,
): PayloadEdit {
	if (!coversRoute(model) || !isObject(payload) || !Array.isArray(payload.messages)) {
		return { output: undefined, nextCarrier: carrier, applied: null };
	}

	const clone = structuredClone(payload);
	const messages = clone.messages as unknown[];
	const changedByCarveOut = unmarkFirstSystemBlock(clone);
	const normalized = markersUnder(clone);
	const marked = messageMarkers(messages);
	if (marked.length !== 1) {
		return { output: changedByCarveOut ? clone : undefined, nextCarrier: carrier, applied: null };
	}

	const [piMarker] = marked;
	const carrierMessage = carrierIn(messages, recallBlock);
	const beforeTarget =
		carrierMessage !== undefined && carrierMessage.content.length >= 2 ? carrierMessage.content.at(-2) : undefined;
	const wanted = [beforeTarget, fingerprintedBlock(messages, carrier)]
		.filter((target): target is PayloadObject => isObject(target))
		.filter((target, index, targets) => target !== piMarker.node && targets.indexOf(target) === index);

	const budget = BUDGET - (normalized.length - 1);
	let changed = changedByCarveOut;
	if (wanted.length <= budget) {
		for (const target of wanted) {
			target.cache_control = structuredClone(piMarker.value);
			changed = true;
		}
		if (wanted.length + 1 > budget) {
			delete piMarker.node.cache_control;
			changed = true;
		}
	}

	// The next record is this payload's carrier, and only when the finished clone marks its own block (D6).
	const nextCarrier: CarrierRecord | null =
		carrierMessage !== undefined &&
		recallBlock !== null &&
		isObject(beforeTarget) &&
		isMarker(beforeTarget.cache_control)
			? { index: carrierMessage.index, fingerprint: fingerprintOf(beforeTarget), block: recallBlock }
			: null;

	return {
		output: changed ? clone : undefined,
		nextCarrier,
		applied: { carrierRead: carrierRead(messages, carrier), block: blockState(clone, messages, carrierMessage) },
	};
}
