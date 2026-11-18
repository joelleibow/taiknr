import {
	buildSessionProjection,
	type ContextWithSystemEvent,
	type ExtensionContext,
	estimateTokens,
	type MessageEndEvent,
	type SessionEntry,
} from "@earendil-works/pi-coding-agent";
import type { Pair, PairRatio, UsageCounts } from "../../domain/calibration.js";
import { sampleRatio, validUsage } from "../../domain/calibration.js";
import type {
	CompactedReadings,
	RequestReading,
	SessionStartedReadings,
	SettledReadings,
	TreeJumpedReadings,
} from "../../use-cases/instruments-publisher.js";

type Message = ContextWithSystemEvent["messages"][number];
type ContentMessage = Extract<Message, { content: unknown }>;
type MessageContent = Extract<ContentMessage["content"], readonly { type: string }[]>[number];
type AssistantEntry = SessionEntry & { type: "message"; message: Extract<Message, { role: "assistant" }> };

/** The trickle a response reports, in the three counts a sample needs; output is never one of them. */
function usageOf(message: Extract<Message, { role: "assistant" }>): UsageCounts {
	return { input: message.usage.input, cacheRead: message.usage.cacheRead, cacheWrite: message.usage.cacheWrite };
}

function assistantEntries(branch: readonly SessionEntry[]): AssistantEntry[] {
	const entries: AssistantEntry[] = [];
	for (const entry of branch) {
		// pi's own rule: a message carrying no usage is no sample (compaction.js getAssistantUsage).
		if (entry.type === "message" && entry.message.role === "assistant" && entry.message.usage !== undefined) {
			entries.push(entry as AssistantEntry);
		}
	}
	return entries;
}

function samePair(left: Pair, right: Pair): boolean {
	return left.provider === right.provider && left.model === right.model;
}

function estimateOf(projection: { messages: readonly Message[] }): number {
	return projection.messages.reduce((total, message) => total + estimateTokens(message), 0);
}

/**
 * The pair an update is posted under (design D7 step 1): the context's own model, unless a virtual
 * selection routes requests elsewhere, in which case it is the newest valid reply's own pair.
 */
function readPair(ctx: ExtensionContext): Pair | undefined {
	const model = ctx.model;
	if (model === undefined) return undefined;
	// shortcut: pi exports no isVirtualModel, so the api string is compared directly; it drifts if pi renames it.
	if (model.api === "pi-virtual") {
		const newest = assistantEntries(ctx.sessionManager.getBranch()).findLast(({ message }) =>
			validUsage(message.stopReason, usageOf(message)),
		);
		return newest === undefined ? undefined : { provider: newest.message.provider, model: newest.message.model };
	}
	return { provider: model.provider, model: model.id };
}

/**
 * One seed per pair on the branch: its newest valid reply, divided into the estimate of the
 * projection that produced it — the request it answered, less this run's recall block (D7 step 4).
 */
function seedsFrom(branch: readonly SessionEntry[]): PairRatio[] {
	const seeds: PairRatio[] = [];
	for (const entry of assistantEntries(branch).reverse()) {
		const { message } = entry;
		const usage = usageOf(message);
		if (!validUsage(message.stopReason, usage)) continue;
		const pair = { provider: message.provider, model: message.model };
		if (seeds.some((seed) => samePair(seed.pair, pair))) continue;
		const k = sampleRatio(message.stopReason, usage, estimateOf(buildSessionProjection([...branch], entry.parentId)));
		if (k !== undefined) seeds.push({ pair, k });
	}
	return seeds;
}

function readContext(ctx: ExtensionContext): CompactedReadings {
	return {
		pair: readPair(ctx),
		projectionEstimate: estimateOf(ctx.sessionManager.buildSessionProjection()),
		contextWindow: ctx.getContextUsage()?.contextWindow ?? 0,
	};
}

/** A message's content, which a persisted bash execution has none of. */
function contentOf(message: Message): string | readonly MessageContent[] | undefined {
	return "content" in message ? message.content : undefined;
}

/** The first content block's text, and `""` when that block is not text. */
function firstTextOf(message: Message): string {
	const content = contentOf(message);
	if (!Array.isArray(content)) return "";
	const [first] = content;
	return first?.type === "text" ? first.text : "";
}

/** The newest user message's index, its timestamp and its last content block's text (design D7). */
function latestUserOf(messages: readonly Message[]): RequestReading["latestUser"] {
	const index = messages.findLastIndex((message) => message.role === "user");
	const message = messages[index];
	if (message === undefined || message.role !== "user") return undefined;
	const content = contentOf(message);
	const tail = typeof content === "string" ? content : lastTextOf(content ?? []);
	return { index, timestamp: message.timestamp, tailText: tail };
}

/** The last content block's text — the block recall appends — and `""` when that block is not text. */
function lastTextOf(content: readonly MessageContent[]): string {
	const [last] = content.slice(-1);
	return last?.type === "text" && last.text !== undefined ? last.text : "";
}

/** Everything the start of a session seeds: the same reading a tree jump takes (design D2). */
export function readSessionStarted(ctx: ExtensionContext): SessionStartedReadings {
	return readTreeJumped(ctx);
}

export function readTreeJumped(ctx: ExtensionContext): TreeJumpedReadings {
	return { ...readContext(ctx), seeds: seedsFrom(ctx.sessionManager.getBranch()) };
}

export function readSettled(ctx: ExtensionContext): SettledReadings {
	return readContext(ctx);
}

export function readCompacted(ctx: ExtensionContext): CompactedReadings {
	return readContext(ctx);
}

/**
 * The request as recall's handler returned it: its pair, every message's estimate, each tool
 * result's first text, and the latest user message the block rides. It reads nothing else of the
 * host, which is what keeps a request with the switch off free of host reads (design D7).
 */
export function readRequest(event: ContextWithSystemEvent, ctx: ExtensionContext): RequestReading {
	return {
		pair: readPair(ctx),
		messageEstimates: event.messages.map((message) => estimateTokens(message)),
		toolResults: event.messages.flatMap((message, index) =>
			message.role === "toolResult" ? [{ index, firstText: firstTextOf(message) }] : [],
		),
		latestUser: latestUserOf(event.messages),
	};
}

/** At a response the reply is not on the branch yet, so it is added to what pi has persisted (D7). */
export function readResponse(event: MessageEndEvent, ctx: ExtensionContext): CompactedReadings {
	const readings = readContext(ctx);
	// One projection per reading: the count the design's cost accounting assumes.
	return { ...readings, projectionEstimate: readings.projectionEstimate + estimateTokens(event.message) };
}
