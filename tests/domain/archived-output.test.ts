import { expect, test } from "vitest";
import { shouldArchive } from "../../src/domain/archived-output.js";

test("one below the threshold is not archived", () => {
	expect(shouldArchive(9, 10)).toBe(false);
});

test("exactly at the threshold is archived", () => {
	expect(shouldArchive(10, 10)).toBe(true);
});

test("one above the threshold is archived", () => {
	expect(shouldArchive(11, 10)).toBe(true);
});
