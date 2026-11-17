import { expect, test } from "vitest";
import type { UsageCounts } from "../../src/domain/calibration.js";
import { type CostCounts, netDollars, type PricedRequest, responseRates } from "../../src/domain/savings-dollars.js";

const MICRO = 1e-6;

/** A response's cost components at the design's default read $1.50/M and write $18.75/M. */
function dollarsAtDefaultRates(usage: UsageCounts): CostCounts {
	return {
		input: usage.input * 15 * MICRO,
		cacheRead: usage.cacheRead * 1.5 * MICRO,
		cacheWrite: usage.cacheWrite * 18.75 * MICRO,
	};
}

const WARM: UsageCounts = { input: 0, cacheRead: 150_000, cacheWrite: 10_000 };

/** A request with nothing pending, priced for no classifier spend. */
function request(overrides: Partial<PricedRequest> = {}): PricedRequest {
	return {
		k: 1,
		stubSaving: 0,
		recalled: 0,
		blockInNewTail: false,
		suffixEstimate: 0,
		classifierSpend: 0,
		...overrides,
	};
}

interface Row {
	readonly case: string;
	readonly usage: UsageCounts;
	readonly cost: CostCounts;
	readonly priced: PricedRequest;
	readonly expected: number;
}

const rows: Row[] = [
	{
		case: "a warm request with a settlement's rewrite pending",
		usage: WARM,
		cost: dollarsAtDefaultRates(WARM),
		priced: request({ stubSaving: 4960, suffixEstimate: 600, classifierSpend: 0.0002 }),
		expected: -0.00311,
	},
	{
		case: "a new user turn whose old block goes out without it and whose new block is a write",
		usage: WARM,
		cost: dollarsAtDefaultRates(WARM),
		priced: request({ recalled: 800, blockInNewTail: true, suffixEstimate: 400 }),
		expected: -0.0219,
	},
	{
		case: "a cold request after an idle gap, priced at the write rate with no rewrite charge",
		usage: { input: 0, cacheRead: 0, cacheWrite: 210_000 },
		cost: { input: 0, cacheRead: 0, cacheWrite: 210_000 * 18.75 * MICRO },
		priced: request({ stubSaving: 4960 }),
		expected: 0.093,
	},
	{
		case: "a cold request that also has a settlement pending",
		usage: { input: 0, cacheRead: 0, cacheWrite: 210_000 },
		cost: { input: 0, cacheRead: 0, cacheWrite: 210_000 * 18.75 * MICRO },
		priced: request({ stubSaving: 4960, suffixEstimate: 600 }),
		expected: 0.093,
	},
	{
		case: "a warm request with nothing pending",
		usage: WARM,
		cost: dollarsAtDefaultRates(WARM),
		priced: request({ stubSaving: 2000 }),
		expected: 0.003,
	},
	{
		case: "a provider that reports no cache components, so both cache rates fall back to input",
		usage: { input: 30_000, cacheRead: 0, cacheWrite: 0 },
		cost: { input: 0.45, cacheRead: 0, cacheWrite: 0 },
		priced: request({ stubSaving: 1000 }),
		expected: 0.015,
	},
	{
		case: "a cache read whose token count is zero while its cost is not",
		usage: { input: 0, cacheRead: 0, cacheWrite: 210_000 },
		cost: { input: 0, cacheRead: 0.02, cacheWrite: 210_000 * 18.75 * MICRO },
		priced: request({ stubSaving: 4960 }),
		expected: 0.093,
	},
	{
		case: "mixed short and one-hour cache writes, so the write rate is blended",
		usage: WARM,
		cost: { input: 0, cacheRead: 150_000 * 1.5 * MICRO, cacheWrite: 0.215625 },
		priced: request({ stubSaving: 500, suffixEstimate: 1000 }),
		expected: -0.01931,
	},
	{
		case: "a counterfactual that would have crossed a cost tier is priced at the actual read rate",
		usage: { input: 0, cacheRead: 190_000, cacheWrite: 0 },
		cost: { input: 0, cacheRead: 190_000 * 1.5 * MICRO, cacheWrite: 0 },
		priced: request({ stubSaving: 1000 }),
		expected: 0.0015,
	},
	{
		case: "a write rate below the read rate makes no rewrite a credit",
		usage: { input: 0, cacheRead: 190_000, cacheWrite: 10_000 },
		cost: { input: 0, cacheRead: 190_000 * 18.75 * MICRO, cacheWrite: 10_000 * 1.5 * MICRO },
		priced: request({ stubSaving: 4960, suffixEstimate: 600 }),
		expected: 0.093,
	},
	{
		case: "a request that read part of its prefix from cache is priced warm",
		usage: { input: 0, cacheRead: 40_000, cacheWrite: 0 },
		cost: { input: 0, cacheRead: 40_000 * 1.5 * MICRO, cacheWrite: 0 },
		priced: request({ stubSaving: 3000 }),
		expected: 0.0045,
	},
	{
		case: "a new block on a new user message with nothing pending is a write",
		usage: WARM,
		cost: dollarsAtDefaultRates(WARM),
		priced: request({ recalled: 3000, blockInNewTail: true }),
		expected: -0.05625,
	},
	{
		case: "the same block again on the carried user message is a read",
		usage: WARM,
		cost: dollarsAtDefaultRates(WARM),
		priced: request({ recalled: 3000 }),
		expected: -0.0045,
	},
	{
		case: "a shrunk block on a carried message, with a suffix behind it",
		usage: WARM,
		cost: dollarsAtDefaultRates(WARM),
		priced: request({ recalled: 2000, suffixEstimate: 2400 }),
		expected: -0.0444,
	},
];

test.each(rows)("$case", ({ usage, cost, priced, expected }) => {
	const net = netDollars(responseRates(usage, cost), priced);

	expect(net).toBeCloseTo(expected, 5);
	expect(Number.isFinite(net)).toBe(true);
});

test("k scales both the saving and the block", () => {
	const rates = responseRates(WARM, dollarsAtDefaultRates(WARM));

	expect(netDollars(rates, request({ k: 0.5, stubSaving: 4960 }))).toBeCloseTo(0.00372, 5);
	expect(netDollars(rates, request({ k: 0.5, recalled: 800, blockInNewTail: true }))).toBeCloseTo(-0.0075, 5);
});

test("the read rate comes from cacheRead and the write rate from cacheWrite when both carry tokens", () => {
	const rates = responseRates(
		{ input: 0, cacheRead: 1000, cacheWrite: 1000 },
		{ input: 0, cacheRead: 0.001, cacheWrite: 0.02 },
	);

	expect(rates).toEqual({ warm: true, inputRate: 0, readRate: 1e-6, writeRate: 2e-5 });
});

test("a cost that is non-finite or negative falls back instead of pricing the request", () => {
	const rates = responseRates(
		{ input: 1000, cacheRead: 1000, cacheWrite: 1000 },
		{ input: 0.01, cacheRead: Number.NaN, cacheWrite: -1 },
	);

	expect(rates).toEqual({ warm: true, inputRate: 1e-5, readRate: 1e-5, writeRate: 1e-5 });
});

test("a response with no cached tokens is cold, and an input rate of zero divides by nothing", () => {
	expect(responseRates({ input: 0, cacheRead: 0, cacheWrite: 0 }, { input: 0, cacheRead: 0, cacheWrite: 0 })).toEqual({
		warm: false,
		inputRate: 0,
		readRate: 0,
		writeRate: 0,
	});
	expect(
		netDollars(
			responseRates({ input: 0, cacheRead: 0, cacheWrite: 0 }, { input: 0, cacheRead: 0, cacheWrite: 0 }),
			request({ stubSaving: 4960 }),
		),
	).toBe(0);
});
