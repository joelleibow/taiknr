import type { UsageCounts } from "./calibration.js";

/** What a response's four cost components came to, in dollars. */
export interface CostCounts {
	input: number;
	cacheRead: number;
	cacheWrite: number;
}

/** The rates one response implies, and whether its prefix was read from cache. */
export interface Rates {
	warm: boolean;
	inputRate: number;
	readRate: number;
	writeRate: number;
}

/** One request, as the dollar rule prices it, with every saving still unscaled. */
export interface PricedRequest {
	k: number;
	stubSaving: number;
	recalled: number;
	blockInNewTail: boolean;
	suffixEstimate: number;
	classifierSpend: number;
}

/** A rate is only readable from a component that was billed: tokens above 0 and a usable cost. */
function rate(tokens: number, cost: number): number | undefined {
	if (!(tokens > 0)) return undefined;
	if (!Number.isFinite(cost) || cost < 0) return undefined;
	return cost / tokens;
}

/**
 * The rates a response reports, each from its own component, with both cache rates falling back to
 * the input rate so a provider that reports no cache components is still priced (design D8).
 */
export function responseRates(usage: UsageCounts, cost: CostCounts): Rates {
	const inputRate = rate(usage.input, cost.input) ?? 0;
	return {
		warm: usage.cacheRead > 0,
		inputRate,
		readRate: rate(usage.cacheRead, cost.cacheRead) ?? inputRate,
		writeRate: rate(usage.cacheWrite, cost.cacheWrite) ?? inputRate,
	};
}

/**
 * What a request saved in dollars, net of the cache rewrite taiknr caused and of recall's
 * classifier spend. A negative saving is priced at the same rate and keeps its sign (design D8).
 */
export function netDollars(rates: Rates, request: PricedRequest): number {
	const stubRate = rates.warm ? rates.readRate : rates.writeRate;
	// The block is the last content of the latest user message, where pi's cache breakpoint falls:
	// a block on a message the last priced request carried is a read, one in the new tail a write.
	const blockRate = rates.warm && !request.blockInNewTail ? rates.readRate : rates.writeRate;
	const gross = request.k * request.stubSaving * stubRate - request.k * request.recalled * blockRate;
	const rewrite = rates.warm ? request.k * request.suffixEstimate * Math.max(0, rates.writeRate - rates.readRate) : 0;
	return gross - rewrite - request.classifierSpend;
}
