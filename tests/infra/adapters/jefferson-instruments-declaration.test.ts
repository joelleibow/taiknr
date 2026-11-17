import { expect, test } from "vitest";
import {
	buildFieldReports,
	TAIKNR_FIELDS,
	TAIKNR_REGISTRATION,
} from "../../../src/infra/adapters/jefferson-instruments-declaration.js";
import type { FigureKey, FigureValues } from "../../../src/use-cases/instruments-publisher.js";

type Declaration = (typeof TAIKNR_REGISTRATION.instruments)[number];
type Readings = Parameters<NonNullable<Declaration["variables"][string]>>[0];

const FIELDS = Object.keys(TAIKNR_FIELDS) as FigureKey[];

/** The declaration of one instrument, by the full name Jefferson composes. */
function declaration(fullName: string): Declaration {
	const found = TAIKNR_REGISTRATION.instruments.find(
		(candidate) => `${TAIKNR_REGISTRATION.extension}.${candidate.name}` === fullName,
	);
	if (found === undefined) throw new Error(`no instrument named ${fullName}`);
	return found;
}

/** Every declared field at a value of its declared type. */
function everyField(): Record<string, number | boolean> {
	return Object.fromEntries(FIELDS.map((field) => [field, TAIKNR_FIELDS[field] === "boolean" ? true : 1]));
}

/** One variable's rendering of a set of readings. */
function render(fullName: string, variable: string, readings: Readings): string | undefined {
	return declaration(fullName).variables[variable](readings);
}

const DOLLARS = ["savedDollarsRequest", "savedDollarsSinceStart"];

test("the field table declares every one of the seventeen fields with its type", () => {
	expect(FIELDS).toHaveLength(17);
	expect(FIELDS).toEqual([
		"contextInTurn",
		"historyBefore",
		"withheld",
		"stubbed",
		"recalled",
		"totalContext",
		"archiveItems",
		"archiveWithheld",
		"archiveStubbed",
		"savedTokensRequest",
		"savedTokensSinceStart",
		"savedDollarsRequest",
		"savedDollarsSinceStart",
		"deciding",
		"decidingItems",
		"contextWindow",
		"uncalibrated",
	]);
	expect(FIELDS.filter((field) => TAIKNR_FIELDS[field] === "boolean")).toEqual(["deciding", "uncalibrated"]);
});

test("the four instruments are registered under the names Jefferson composes", () => {
	expect(TAIKNR_REGISTRATION.extension).toBe("taiknr");
	expect(TAIKNR_REGISTRATION.instruments.map(({ name }) => `taiknr.${name}`)).toEqual([
		"taiknr.context",
		"taiknr.archive",
		"taiknr.savings",
		"taiknr.recall",
	]);
	expect(TAIKNR_REGISTRATION.instruments.map(({ defaultLabel }) => defaultLabel)).toEqual([
		"taiknr ctx",
		"taiknr arc",
		"taiknr save",
		"taiknr recall",
	]);
	for (const { variables, defaultFormat } of TAIKNR_REGISTRATION.instruments) {
		expect(Object.keys(variables).length).toBeGreaterThan(0);
		expect(defaultFormat.length).toBeGreaterThan(0);
	}
});

test("every default format names only declared fields and the two derived variables", () => {
	const allowed = new Set<string>([...FIELDS, "approx", "bar"]);

	for (const { defaultFormat } of TAIKNR_REGISTRATION.instruments) {
		const named = [...defaultFormat.matchAll(/\$(\w+)/g)].map(([, name]) => name);
		expect(named.length).toBeGreaterThan(0);
		for (const name of named) expect(allowed.has(name), `${name} in ${defaultFormat}`).toBe(true);
	}
});

test("the savings format carries the since-start label in its own words", () => {
	expect(declaration("taiknr.savings").defaultFormat).toContain("$savedTokensSinceStart tokens not sent since start");
});

test("the bar is declared on the context instrument alone", () => {
	expect(declaration("taiknr.context").bar).toBeTypeOf("function");
	for (const name of ["taiknr.archive", "taiknr.savings", "taiknr.recall"]) {
		expect(declaration(name).bar).toBeUndefined();
	}
});

test("the bar is the used share of the window, and null when there is no window", () => {
	const bar = declaration("taiknr.context").bar;
	if (bar === undefined) throw new Error("the context instrument declares no bar");

	expect(bar({ ...everyField(), totalContext: 50_000, contextWindow: 200_000 })).toBe(25);
	expect(bar({ ...everyField(), totalContext: 0, contextWindow: 200_000 })).toBe(0);
	expect(bar({ ...everyField(), totalContext: 1000, contextWindow: 0 })).toBeNull();
	expect(bar({ ...everyField(), totalContext: 1000, contextWindow: -1 })).toBeNull();
	expect(bar({ ...everyField(), totalContext: undefined, contextWindow: 200_000 })).toBeNull();
});

test("the estimate flag renders a tilde while uncalibrated and nothing once calibrated", () => {
	for (const name of ["taiknr.context", "taiknr.archive", "taiknr.savings", "taiknr.recall"]) {
		expect(render(name, "approx", { ...everyField(), uncalibrated: true })).toBe("~");
		expect(render(name, "approx", { ...everyField(), uncalibrated: false })).toBe("");
	}
});

test("the dollars render as the bare signed number to four decimals", () => {
	for (const field of DOLLARS as FigureKey[]) {
		expect(render("taiknr.savings", field, { [field]: -0.00001 })).toBe("-0.0000");
		expect(render("taiknr.savings", field, { [field]: -0.013125 })).toBe("-0.0131");
		expect(render("taiknr.savings", field, { [field]: 0 })).toBe("0.0000");
		expect(render("taiknr.savings", field, { [field]: 1.5 })).toBe("1.5000");
	}
});

test("the decision indicator reads its sentence while running and idle otherwise", () => {
	expect(render("taiknr.recall", "deciding", { deciding: true, decidingItems: 12 })).toBe("deciding 12");
	expect(render("taiknr.recall", "deciding", { deciding: false, decidingItems: 12 })).toBe("idle");
	expect(render("taiknr.recall", "decidingItems", { decidingItems: 12 })).toBe("12");
	expect(render("taiknr.recall", "deciding", { deciding: true, decidingItems: 0 })).toBe("deciding 0");
});

test("a token, count or window variable renders the posted integer, and nothing without a value", () => {
	expect(render("taiknr.context", "totalContext", { totalContext: 123_456 })).toBe("123456");
	expect(render("taiknr.context", "totalContext", { totalContext: -42 })).toBe("-42");
	expect(render("taiknr.context", "totalContext", {})).toBeUndefined();
	expect(render("taiknr.context", "contextWindow", { contextWindow: 200_000 })).toBe("200000");
	expect(render("taiknr.archive", "archiveItems", { archiveItems: 3 })).toBe("3");
	expect(render("taiknr.archive", "withheld", { withheld: 4960 })).toBe("4960");
	expect(render("taiknr.savings", "savedTokensSinceStart", { savedTokensSinceStart: -699 })).toBe("-699");
	expect(render("taiknr.recall", "recalled", {})).toBeUndefined();
});

test("every declared field is built into one report of its declared type and a finite value", () => {
	const opening: FigureValues = {
		...everyField(),
		deciding: false,
		uncalibrated: true,
	} as FigureValues;

	const reports = buildFieldReports(opening);

	expect(reports).toHaveLength(17);
	expect(reports.map(({ field }) => field)).toEqual(FIELDS);
	for (const { extension, field, value } of reports) {
		expect(extension).toBe("taiknr");
		if (TAIKNR_FIELDS[field as FigureKey] === "boolean") expect(typeof value).toBe("boolean");
		else {
			expect(typeof value).toBe("number");
			expect(Number.isFinite(value)).toBe(true);
		}
	}
});

test("a report is built for each field present and none for an absent one", () => {
	expect(buildFieldReports({})).toEqual([]);
	expect(buildFieldReports({ deciding: true })).toEqual([{ extension: "taiknr", field: "deciding", value: true }]);
	expect(buildFieldReports({ archiveItems: 2, withheld: 40 })).toEqual([
		{ extension: "taiknr", field: "withheld", value: 40 },
		{ extension: "taiknr", field: "archiveItems", value: 2 },
	]);
});

test("the four instruments' variables and the bar read exactly the declared fields", () => {
	const reads = new Set<string>();
	const readings = new Proxy(everyField(), {
		get(target, property) {
			if (typeof property === "string") reads.add(property);
			return Reflect.get(target, property);
		},
	}) as Readings;

	for (const { variables, bar } of TAIKNR_REGISTRATION.instruments) {
		for (const variable of Object.values(variables)) variable(readings);
		bar?.(readings);
	}

	expect([...reads].sort()).toEqual([...FIELDS].sort());
});
