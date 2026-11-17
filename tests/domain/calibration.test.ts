import { expect, test } from "vitest";
import {
	type Pair,
	type PairRatio,
	ratioFor,
	reseedTable,
	sampleRatio,
	seedTable,
	type UsageCounts,
	validUsage,
	withLiveSample,
} from "../../src/domain/calibration.js";

const A: Pair = { provider: "anthropic", model: "claude-opus-5-5" };
const B: Pair = { provider: "openrouter", model: "deepseek/deepseek-v4.1-flash" };

const usage = (input: number, cacheRead = 0, cacheWrite = 0): UsageCounts => ({ input, cacheRead, cacheWrite });

const seed = (pair: Pair, k: number): PairRatio => ({ pair, k });

test("a response the provider completed with any prompt tokens is a valid sample", () => {
	expect(validUsage("stop", usage(0, 100, 0))).toBe(true);
	expect(validUsage("toolUse", usage(1))).toBe(true);
});

test("an aborted response and an errored response are not samples", () => {
	expect(validUsage("aborted", usage(1000))).toBe(false);
	expect(validUsage("error", usage(1000))).toBe(false);
});

test("a zero, non-finite or negative usage is not a sample", () => {
	expect(validUsage("stop", usage(0, 0, 0))).toBe(false);
	expect(validUsage("stop", usage(Number.NaN, 10))).toBe(false);
	expect(validUsage("stop", usage(Number.POSITIVE_INFINITY, 10))).toBe(false);
	expect(validUsage("stop", usage(-1, 10))).toBe(false);
	expect(validUsage("stop", usage(10, -1))).toBe(false);
	expect(validUsage("stop", usage(10, 0, -1))).toBe(false);
});

test("k is the prompt divided by the estimate, with the response's output left out", () => {
	expect(sampleRatio("stop", usage(200, 300, 500), 400)).toBe(2.5);
	expect(sampleRatio("stop", usage(100), 1000)).toBe(0.1);
});

test("an invalid response and a zero or negative estimate have no k", () => {
	expect(sampleRatio("aborted", usage(1000), 400)).toBeUndefined();
	expect(sampleRatio("error", usage(1000), 400)).toBeUndefined();
	expect(sampleRatio("stop", usage(0), 400)).toBeUndefined();
	expect(sampleRatio("stop", usage(1000), 0)).toBeUndefined();
	expect(sampleRatio("stop", usage(1000), -5)).toBeUndefined();
});

test("a seed with no live sample is used at its k with the flag on", () => {
	const table = seedTable([seed(A, 1.7)]);

	expect(ratioFor(table, A)).toEqual({ k: 1.7, uncalibrated: true });
});

test("a branch's two pairs seed both, and each pair reads its own k", () => {
	const table = seedTable([seed(A, 1.7), seed(B, 0.93)]);

	expect(ratioFor(table, A)).toEqual({ k: 1.7, uncalibrated: true });
	expect(ratioFor(table, B)).toEqual({ k: 0.93, uncalibrated: true });
});

test("the first seed for a pair wins, so a second one cannot overwrite it", () => {
	const table = seedTable([seed(A, 1.7), seed(A, 0.5)]);

	expect(ratioFor(table, A).k).toBe(1.7);
});

test("a session start replaces the whole table, so no entry from before it is live", () => {
	const live = withLiveSample(seedTable([]), seed(A, 1.7));

	expect(ratioFor(live, A)).toEqual({ k: 1.7, uncalibrated: false });
	expect(ratioFor(seedTable([seed(A, 1.7)]), A)).toEqual({ k: 1.7, uncalibrated: true });
});

test("a tree jump keeps the live entries and reseeds the rest from the new branch", () => {
	const live = withLiveSample(seedTable([seed(A, 1.7), seed(B, 0.93)]), seed(A, 1.6));
	const reseeded = reseedTable(live, [seed(B, 0.9), seed(A, 3)]);

	expect(ratioFor(reseeded, A)).toEqual({ k: 1.6, uncalibrated: false });
	expect(ratioFor(reseeded, B)).toEqual({ k: 0.9, uncalibrated: true });
});

test("a pair present only in the old branch has no entry after a tree jump", () => {
	const live = withLiveSample(seedTable([seed(A, 1.7), seed(B, 0.93)]), seed(A, 1.6));
	const reseeded = reseedTable(live, []);

	expect(ratioFor(reseeded, A)).toEqual({ k: 1.6, uncalibrated: false });
	expect(ratioFor(reseeded, B)).toEqual({ k: 1, uncalibrated: true });
});

test("a pair with neither a live entry nor a seed reads k 1 with the flag on", () => {
	expect(ratioFor(seedTable([seed(A, 1.7)]), B)).toEqual({ k: 1, uncalibrated: true });
	expect(ratioFor(seedTable([]), A)).toEqual({ k: 1, uncalibrated: true });
});

test("no pair at all reads k 1 with the flag on", () => {
	expect(ratioFor(seedTable([seed(A, 1.7)]), undefined)).toEqual({ k: 1, uncalibrated: true });
});

test("a live sample makes its own pair live and leaves every other pair as it was", () => {
	const table = withLiveSample(seedTable([seed(A, 1.7), seed(B, 0.93)]), seed(B, 0.95));

	expect(ratioFor(table, B)).toEqual({ k: 0.95, uncalibrated: false });
	expect(ratioFor(table, A)).toEqual({ k: 1.7, uncalibrated: true });
});

test("the flag turns off at the first live sample for the pair the update is posted under", () => {
	let table = seedTable([seed(A, 1.7)]);
	expect(ratioFor(table, A).uncalibrated).toBe(true);

	table = withLiveSample(table, seed(A, 1.62));
	expect(ratioFor(table, A)).toEqual({ k: 1.62, uncalibrated: false });
});

test("the flag turns back on at a pair with no live sample and off again on returning to the live one", () => {
	let table = withLiveSample(seedTable([seed(A, 1.7), seed(B, 0.93)]), seed(A, 1.62));

	expect(ratioFor(table, B).uncalibrated).toBe(true);

	table = withLiveSample(table, seed(B, 0.95));

	expect(ratioFor(table, A).uncalibrated).toBe(false);
	expect(ratioFor(table, B).uncalibrated).toBe(false);
});

test("a compaction keeps the table, so a pair live before it is still live after it", () => {
	const table = withLiveSample(seedTable([seed(A, 1.7)]), seed(A, 1.62));

	expect(ratioFor(table, A)).toEqual({ k: 1.62, uncalibrated: false });
});

test("a measurement sets no flag unless it is recorded as a live sample", () => {
	const table = seedTable([seed(A, 1.7)]);
	const measured = sampleRatio("stop", usage(1500), 1000);

	expect(measured).toBe(1.5);
	expect(ratioFor(table, A)).toEqual({ k: 1.7, uncalibrated: true });
});
