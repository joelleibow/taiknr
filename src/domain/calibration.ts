/** The model a ratio belongs to: the provider and the model id, never one of the two alone. */
export interface Pair {
	provider: string;
	model: string;
}

/** The three prompt-side counts a response reports; output is never part of a sample. */
export interface UsageCounts {
	input: number;
	cacheRead: number;
	cacheWrite: number;
}

/** One pair's ratio and the sample it came from. */
export interface PairRatio {
	pair: Pair;
	k: number;
}

/** One pair's entry in the ratio table: its k, and whether a live sample set it this run. */
export interface RatioEntry {
	k: number;
	live: boolean;
}

/** Keyed by `pairKey`, which is private to this module, so a table is only read through the functions below. */
export type RatioTable = ReadonlyMap<string, RatioEntry>;

/** One key per pair, with a separator no provider or model id carries. */
function pairKey(pair: Pair): string {
	return `${pair.provider}\u0000${pair.model}`;
}

function promptTokens(usage: UsageCounts): number {
	return usage.input + usage.cacheRead + usage.cacheWrite;
}

function isCount(value: number): boolean {
	return Number.isFinite(value) && value >= 0;
}

/** Pi's own rule for a valid sample: not aborted, not an error, and a positive, finite prompt (D7). */
export function validUsage(stopReason: string, usage: UsageCounts): boolean {
	if (stopReason === "aborted" || stopReason === "error") return false;
	if (!isCount(usage.input) || !isCount(usage.cacheRead) || !isCount(usage.cacheWrite)) return false;
	return promptTokens(usage) > 0;
}

/** k = prompt ÷ the request's estimate, or nothing when either side cannot carry a ratio. */
export function sampleRatio(stopReason: string, usage: UsageCounts, estimate: number): number | undefined {
	if (!validUsage(stopReason, usage) || !(estimate > 0)) return undefined;
	return promptTokens(usage) / estimate;
}

/**
 * A session start's table: every pair the branch carries, each a seed and none of them live,
 * because a seed divides by a reconstruction of the request (D7).
 */
export function seedTable(seeds: readonly PairRatio[]): RatioTable {
	const table = new Map<string, RatioEntry>();
	for (const { pair, k } of seeds) {
		const key = pairKey(pair);
		if (!table.has(key)) table.set(key, { k, live: false });
	}
	return table;
}

/** A `/tree` jump's table: every live entry survives, and every other pair takes the new branch's seed. */
export function reseedTable(table: RatioTable, seeds: readonly PairRatio[]): RatioTable {
	const reseeded = new Map<string, RatioEntry>();
	for (const [key, entry] of table) {
		if (entry.live) reseeded.set(key, entry);
	}
	for (const { pair, k } of seeds) {
		const key = pairKey(pair);
		if (!reseeded.has(key)) reseeded.set(key, { k, live: false });
	}
	return reseeded;
}

/** A live sample replaces its own pair's entry, which is the only thing that turns the flag off. */
export function withLiveSample(table: RatioTable, sample: PairRatio): RatioTable {
	const tableWithSample = new Map(table);
	tableWithSample.set(pairKey(sample.pair), { k: sample.k, live: true });
	return tableWithSample;
}

/** The k an update is posted under, and whether that pair has no live sample in this run. */
export function ratioFor(table: RatioTable, pair: Pair | undefined): { k: number; uncalibrated: boolean } {
	const entry = pair === undefined ? undefined : table.get(pairKey(pair));
	if (entry === undefined) return { k: 1, uncalibrated: true };
	return { k: entry.k, uncalibrated: !entry.live };
}
