import { expect, test } from "vitest";
import { createJeffersonBusAdapter } from "../../../src/infra/adapters/jefferson-bus-adapter.js";
import { TAIKNR_REGISTRATION } from "../../../src/infra/adapters/jefferson-instruments-declaration.js";
import { createFakePi } from "../../support/fake-pi.js";

test("the registration goes out on its own channel, as the declaration", () => {
	const fake = createFakePi();

	createJeffersonBusAdapter(fake.pi).register();

	expect(fake.emitted).toEqual([{ channel: "jefferson:registration", data: TAIKNR_REGISTRATION }]);
});

test("a post emits one report per field present, in the declaration's field order", () => {
	const fake = createFakePi();

	createJeffersonBusAdapter(fake.pi).post({ withheld: 40, contextInTurn: 100, deciding: true });

	expect(fake.emitted.map(({ channel }) => channel)).toEqual([
		"jefferson:update",
		"jefferson:update",
		"jefferson:update",
	]);
	expect(fake.emitted.map(({ data }) => data)).toEqual([
		{ extension: "taiknr", field: "contextInTurn", value: 100 },
		{ extension: "taiknr", field: "withheld", value: 40 },
		{ extension: "taiknr", field: "deciding", value: true },
	]);
});

test("a throwing emit leaves its caller intact and skips no later report", () => {
	const fake = createFakePi({ emitThrows: true });

	expect(() => createJeffersonBusAdapter(fake.pi).post({ deciding: true, decidingItems: 2 })).not.toThrow();

	expect(fake.emitted.map(({ channel }) => channel)).toEqual(["jefferson:update", "jefferson:update"]);
	expect(fake.emitted.map(({ data }) => data)).toEqual([
		{ extension: "taiknr", field: "deciding", value: true },
		{ extension: "taiknr", field: "decidingItems", value: 2 },
	]);
});

test("a registration on a stale bus is silenced the same way", () => {
	const fake = createFakePi({ emitThrows: true });

	expect(() => createJeffersonBusAdapter(fake.pi).register()).not.toThrow();

	expect(fake.emitted).toHaveLength(1);
});
