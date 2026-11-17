import type { ReadingsView, Registration, Report } from "pi-jefferson/instruments";
import type { FigureKey, FigureValues, Publication } from "../../use-cases/instruments-publisher.js";

/**
 * D5's table as the field map Jefferson checks every report against: each key is its own field
 * name, so this is the total map, and a field left out is a compile error (design D5).
 */
export const TAIKNR_FIELDS = {
	contextInTurn: "number",
	historyBefore: "number",
	withheld: "number",
	stubbed: "number",
	recalled: "number",
	totalContext: "number",
	archiveItems: "number",
	archiveWithheld: "number",
	archiveStubbed: "number",
	savedTokensRequest: "number",
	savedTokensSinceStart: "number",
	savedDollarsRequest: "number",
	savedDollarsSinceStart: "number",
	deciding: "boolean",
	decidingItems: "number",
	contextWindow: "number",
	uncalibrated: "boolean",
} as const satisfies { readonly [K in FigureKey]: FigureValues[K] extends boolean ? "boolean" : "number" };

/** A token, count or window field as the posted integer, and nothing while it holds no value. */
function count(readings: ReadingsView, field: FigureKey): string | undefined {
	const value = readings[field];
	return typeof value === "number" ? String(value) : undefined;
}

/** A dollars field as the bare signed number to four decimals, so a negative net keeps its sign. */
function dollars(readings: ReadingsView, field: FigureKey): string | undefined {
	const value = readings[field];
	return typeof value === "number" ? value.toFixed(4) : undefined;
}

/** The estimate flag, which rides beside every figure rather than inside it (J11). */
function approx(readings: ReadingsView): string {
	return readings.uncalibrated === true ? "~" : "";
}

/** The decision indicator's own sentence, so the count alone stays available as its own variable. */
function deciding(readings: ReadingsView): string {
	if (readings.deciding !== true) return "idle";
	return `deciding ${count(readings, "decidingItems") ?? "0"}`;
}

/** The request's share of the model's window, and `null` below one, which draws an unfilled track (S2). */
function bar(readings: ReadingsView): number | null {
	const request = readings.contextInTurn;
	const window = readings.contextWindow;
	if (typeof request !== "number" || typeof window !== "number" || window <= 0) return null;
	return (request / window) * 100;
}

/**
 * What taiknr declares to Jefferson: one module constant, four instruments, each naming only the
 * variables it reads. This is the only file where the contract's types appear (design D5).
 */
export const TAIKNR_REGISTRATION: Registration<"taiknr"> = {
	extension: "taiknr",
	fields: TAIKNR_FIELDS,
	instruments: [
		{
			name: "context",
			variables: {
				contextInTurn: (readings) => count(readings, "contextInTurn"),
				historyBefore: (readings) => count(readings, "historyBefore"),
				totalContext: (readings) => count(readings, "totalContext"),
				contextWindow: (readings) => count(readings, "contextWindow"),
				approx,
			},
			defaultFormat: "$contextInTurn/$contextWindow $approx $bar",
			defaultLabel: "taiknr ctx",
			bar,
		},
		{
			name: "archive",
			variables: {
				archiveItems: (readings) => count(readings, "archiveItems"),
				archiveWithheld: (readings) => count(readings, "archiveWithheld"),
				archiveStubbed: (readings) => count(readings, "archiveStubbed"),
				withheld: (readings) => count(readings, "withheld"),
				stubbed: (readings) => count(readings, "stubbed"),
				approx,
			},
			defaultFormat: "$archiveItems $archiveWithheld to $archiveStubbed $approx",
			defaultLabel: "taiknr arc",
		},
		{
			name: "savings",
			variables: {
				savedTokensRequest: (readings) => count(readings, "savedTokensRequest"),
				savedTokensSinceStart: (readings) => count(readings, "savedTokensSinceStart"),
				savedDollarsRequest: (readings) => dollars(readings, "savedDollarsRequest"),
				savedDollarsSinceStart: (readings) => dollars(readings, "savedDollarsSinceStart"),
				withheld: (readings) => count(readings, "withheld"),
				stubbed: (readings) => count(readings, "stubbed"),
				recalled: (readings) => count(readings, "recalled"),
				approx,
			},
			defaultFormat:
				"$savedTokensRequest tok $savedDollarsRequest usd, $savedTokensSinceStart tokens not sent since start, $savedDollarsSinceStart usd net since start $approx",
			defaultLabel: "taiknr save",
		},
		{
			name: "recall",
			variables: {
				recalled: (readings) => count(readings, "recalled"),
				deciding,
				decidingItems: (readings) => count(readings, "decidingItems"),
				approx,
			},
			defaultFormat: "$recalled tok $deciding $approx",
			defaultLabel: "taiknr recall",
		},
	],
};

/** One report per field this update carries, in the declaration's own field order. */
export function buildFieldReports(publication: Publication): Report[] {
	const reports: Report[] = [];
	for (const field of Object.keys(TAIKNR_FIELDS) as FigureKey[]) {
		if (!Object.hasOwn(publication, field)) continue;
		const value = publication[field];
		if (value !== undefined) reports.push({ extension: TAIKNR_REGISTRATION.extension, field, value });
	}
	return reports;
}
