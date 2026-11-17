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

/**
 * Keyed by `pairKey`, which is private to this module, so a table is only read through the functions
 * below. `latest` is the pair whose ratio the table took most recently, held as a pair and never as a
 * copied k, so a pair's ratio has one home (design D7).
 */
export type RatioTable = {
	readonly entries: ReadonlyMap<string, RatioEntry>;
	readonly latest: Pair | undefined;
};

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
	const entries = new Map<string, RatioEntry>();
	for (const { pair, k } of seeds) {
		const key = pairKey(pair);
		if (!entries.has(key)) entries.set(key, { k, live: false });
	}
	return { entries, latest: seeds[0]?.pair };
}

/** A `/tree` jump's table: every live entry survives, and every other pair takes the new branch's seed. */
export function reseedTable(table: RatioTable, seeds: readonly PairRatio[]): RatioTable {
	const entries = new Map<string, RatioEntry>();
	for (const [key, entry] of table.entries) {
		if (entry.live) entries.set(key, entry);
	}
	for (const { pair, k } of seeds) {
		const key = pairKey(pair);
		if (!entries.has(key)) entries.set(key, { k, live: false });
	}
	return { entries, latest: seeds[0]?.pair ?? table.latest };
}

/** A live sample replaces its own pair's entry, which is the only thing that turns the flag off. */
export function withLiveSample(table: RatioTable, sample: PairRatio): RatioTable {
	const entries = new Map(table.entries);
	entries.set(pairKey(sample.pair), { k: sample.k, live: true });
	return { entries, latest: sample.pair };
}

/**
 * The k an update is posted under, and whether that pair has no live sample in this run. A pair with
 * no ratio of its own borrows the one measured most recently, which keeps a model switch from pricing
 * at the raw estimate (owner-rulings.md 2026-11-17).
 */
export function ratioFor(table: RatioTable, pair: Pair | undefined): { k: number; uncalibrated: boolean } {
	if (pair === undefined) return { k: 1, uncalibrated: true };
	const entry = table.entries.get(pairKey(pair));
	if (entry !== undefined) return { k: entry.k, uncalibrated: !entry.live };
	const borrowed = table.latest === undefined ? undefined : table.entries.get(pairKey(table.latest));
	return { k: borrowed?.k ?? 1, uncalibrated: true };
}
