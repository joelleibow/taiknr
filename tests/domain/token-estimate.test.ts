import { expect, test } from "vitest";
import { tokenEstimate } from "../../src/domain/token-estimate.js";

test("the empty string is zero tokens", () => {
	expect(tokenEstimate("")).toBe(0);
});

test("one character is one token and a full group of four is still one", () => {
	expect(tokenEstimate("a")).toBe(1);
	expect(tokenEstimate("abcd")).toBe(1);
});

test("a fifth character starts a second token", () => {
	expect(tokenEstimate("abcde")).toBe(2);
});

test("a length that is not a multiple of four rounds up", () => {
	expect(tokenEstimate("x".repeat(6))).toBe(2);
	expect(tokenEstimate("x".repeat(7))).toBe(2);
	expect(tokenEstimate("x".repeat(9))).toBe(3);
});

test("a surrogate pair counts both its code units and is neither cut nor replaced", () => {
	expect("🙂".length).toBe(2);
	expect(tokenEstimate("🙂")).toBe(1);
	expect(tokenEstimate("🙂🙂")).toBe(1);
	expect(tokenEstimate("🙂abc")).toBe(2);
});
