import { chmodSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, test } from "vitest";
import {
	CONFIG_FILE_NAME,
	DEFAULT_TAIKNR_CONFIG,
	loadTaiknrConfig,
	type TaiknrConfig,
	TaiknrConfigError,
} from "../../src/config/taiknr-config.js";

const directories: string[] = [];
const lockedDirectories: string[] = [];

/** A fixture directory removed in `afterEach`. */
function tempDirectory(): string {
	const directory = mkdtempSync(join(tmpdir(), "taiknr-config-"));
	directories.push(directory);
	return directory;
}

/** A config file written as literal text, so fixtures JSON.stringify cannot express stay expressible. */
function configFile(directory: string, text: string): string {
	const path = join(directory, CONFIG_FILE_NAME);
	writeFileSync(path, text);
	return path;
}

afterEach(() => {
	for (const directory of lockedDirectories.splice(0)) chmodSync(directory, 0o700);
	for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

/** Make a directory unreadable, restoring its mode in `afterEach` so the fixture can be removed. */
function lockDirectory(directory: string): void {
	chmodSync(directory, 0o000);
	lockedDirectories.push(directory);
}

/** The config a lone agent file resolves to. */
function accepted(text: string): TaiknrConfig {
	return loadTaiknrConfig({
		agentConfigPath: configFile(tempDirectory(), text),
		projectConfigPath: undefined,
	});
}

/** The rejection an explicit agent path produces, asserted to be a `TaiknrConfigError`. */
function rejectionAt(agentConfigPath: string): TaiknrConfigError {
	let caught: unknown;
	try {
		loadTaiknrConfig({ agentConfigPath, projectConfigPath: undefined });
	} catch (error) {
		caught = error;
	}
	expect(caught).toBeInstanceOf(TaiknrConfigError);
	return caught as TaiknrConfigError;
}

/** The rejection a lone agent file produces, asserted to be a `TaiknrConfigError`. */
function rejection(text: string): TaiknrConfigError {
	return rejectionAt(configFile(tempDirectory(), text));
}

test("a missing agent file and no project path resolve to the defaults, enabled", () => {
	const config = loadTaiknrConfig({
		agentConfigPath: join(tempDirectory(), CONFIG_FILE_NAME),
		projectConfigPath: undefined,
	});

	expect(config).toEqual(DEFAULT_TAIKNR_CONFIG);
	expect(config.enabled).toBe(true);
});

test("the agent file alone overrides the defaults", () => {
	const config = loadTaiknrConfig({
		agentConfigPath: configFile(tempDirectory(), '{"defaultDecisionModel":"~typesafe/other"}'),
		projectConfigPath: undefined,
	});

	expect(config).toEqual({ ...DEFAULT_TAIKNR_CONFIG, defaultDecisionModel: "~typesafe/other" });
});

test("each field layers default, then agent file, then project file", () => {
	const config = loadTaiknrConfig({
		agentConfigPath: configFile(tempDirectory(), '{"decisionThreshold":0.9}'),
		projectConfigPath: configFile(tempDirectory(), '{"minCharsToArchive":100}'),
	});

	expect(config).toEqual({ ...DEFAULT_TAIKNR_CONFIG, decisionThreshold: 0.9, minCharsToArchive: 100 });
});

test("a project file stating one field keeps the agent file's other values", () => {
	const config = loadTaiknrConfig({
		agentConfigPath: configFile(tempDirectory(), '{"decisionThreshold":0.9}'),
		projectConfigPath: configFile(tempDirectory(), '{"enabled":false}'),
	});

	expect(config).toEqual({ ...DEFAULT_TAIKNR_CONFIG, decisionThreshold: 0.9, enabled: false });
});

test("an empty object in each layer resolves to the defaults", () => {
	const config = loadTaiknrConfig({
		agentConfigPath: configFile(tempDirectory(), "{}"),
		projectConfigPath: configFile(tempDirectory(), "{}"),
	});

	expect(config).toEqual(DEFAULT_TAIKNR_CONFIG);
});

test("a file at the would-be project path is not a layer when the caller passes no project path", () => {
	const projectDirectory = tempDirectory();
	configFile(projectDirectory, '{"decisionThreshold":0.9}');

	const config = loadTaiknrConfig({
		agentConfigPath: join(tempDirectory(), CONFIG_FILE_NAME),
		projectConfigPath: undefined,
	});

	expect(config).toEqual(DEFAULT_TAIKNR_CONFIG);
});

const rejectedInputs: Array<[string, string | undefined, string]> = [
	['{"decisionThreshold":2}', "decisionThreshold", "must be <= 1"],
	['{"decisionThreshold":-0.1}', "decisionThreshold", "must be >= 0"],
	['{"decisionThreshold":"0.5"}', "decisionThreshold", "must be a number"],
	['{"decisionThreshold":1e999}', "decisionThreshold", "must be a number"],
	['{"minCharsToArchive":-1}', "minCharsToArchive", "must be an integer >= 0"],
	['{"minCharsToArchive":1.5}', "minCharsToArchive", "must be an integer >= 0"],
	['{"minCharsToArchive":"600"}', "minCharsToArchive", "must be an integer >= 0"],
	['{"minCharsToArchive":1e999}', "minCharsToArchive", "must be an integer >= 0"],
	['{"defaultDecisionModel":""}', "defaultDecisionModel", "must be a non-empty string"],
	['{"defaultDecisionModel":" "}', "defaultDecisionModel", "must be a non-empty string"],
	['{"defaultDecisionModel":5}', "defaultDecisionModel", "must be a non-empty string"],
	['{"defaultDecisionModelProvider":""}', "defaultDecisionModelProvider", "must be a non-empty string"],
	['{"defaultDecisionModelProvider":" "}', "defaultDecisionModelProvider", "must be a non-empty string"],
	['{"defaultDecisionModelProvider":null}', "defaultDecisionModelProvider", "must be a non-empty string"],
	['{"enabled":"false"}', "enabled", "must be a boolean"],
	['{"enabled":0}', "enabled", "must be a boolean"],
	['{"enabled":null}', "enabled", "must be a boolean"],
	["[]", undefined, "root must be an object"],
	["null", undefined, "root must be an object"],
	["5", undefined, "root must be an object"],
	['"x"', undefined, "root must be an object"],
	["true", undefined, "root must be an object"],
	['{"decisionTreshold":0.9}', "decisionTreshold", "unknown field"],
	['{"toString":1}', "toString", "unknown field"],
	['{"__proto__":1}', "__proto__", "unknown field"],
	['{"decisionTreshold":0.9,"1":1}', "1", "unknown field"],
	['{"decisionTreshold":0.9,"enabled":"no"}', "decisionTreshold", "unknown field"],
];

test.each(rejectedInputs)("%s is rejected naming %s with %s", (text, field, reason) => {
	const error = rejection(text);

	expect(error.field).toBe(field);
	expect(error.reason).toBe(reason);
	expect(error.message.startsWith(error.filePath)).toBe(true);
});

test.each([[""], [" "]])("%j cannot be parsed", (text) => {
	const error = rejection(text);

	expect(error.field).toBeUndefined();
	expect(error.reason.startsWith("cannot be parsed: ")).toBe(true);
	expect(error.message.startsWith(error.filePath)).toBe(true);
});

test("a rejection's message reads <path>: <field>: <reason>", () => {
	const error = rejection('{"decisionThreshold":2}');

	expect(error.message).toBe(`${error.filePath}: decisionThreshold: must be <= 1`);
});

test("a rejection with no field reads <path>: <reason>", () => {
	const error = rejection("[]");

	expect(error.message).toBe(`${error.filePath}: root must be an object`);
});

test("the known fields accept their valid values", () => {
	const config = accepted(
		'{"decisionThreshold":0.5,"minCharsToArchive":600,"defaultDecisionModel":"m","defaultDecisionModelProvider":"p","enabled":true}',
	);

	expect(config).toEqual({
		decisionThreshold: 0.5,
		defaultDecisionModel: "m",
		defaultDecisionModelProvider: "p",
		minCharsToArchive: 600,
		enabled: true,
	});
});

test("a negative zero threshold is accepted and stays negative zero", () => {
	expect(Object.is(accepted('{"decisionThreshold":-0}').decisionThreshold, -0)).toBe(true);
});

test("a zero minimum length is accepted", () => {
	expect(accepted('{"minCharsToArchive":0}').minCharsToArchive).toBe(0);
});

test("an object behind a UTF-8 BOM is accepted", () => {
	expect(accepted("\uFEFF{}")).toEqual(DEFAULT_TAIKNR_CONFIG);
});

test("the agent file is rejected before the project path is read", () => {
	const agentConfigPath = configFile(tempDirectory(), '{"decisionThreshold":2}');
	const projectConfigPath = tempDirectory();
	mkdirSync(join(projectConfigPath, "a-directory-at-the-project-path"));

	let caught: unknown;
	try {
		loadTaiknrConfig({ agentConfigPath, projectConfigPath });
	} catch (error) {
		caught = error;
	}

	expect(caught).toBeInstanceOf(TaiknrConfigError);
	expect((caught as TaiknrConfigError).filePath).toBe(agentConfigPath);
	expect((caught as TaiknrConfigError).field).toBe("decisionThreshold");
});

test("a dangling symlink at the agent path is a rejection, not an absence", () => {
	const directory = tempDirectory();
	const agentConfigPath = join(directory, CONFIG_FILE_NAME);
	symlinkSync(join(directory, "gone.json"), agentConfigPath);

	const error = rejectionAt(agentConfigPath);

	expect(error.field).toBeUndefined();
	expect(error.reason).toBe("cannot be read: ENOENT");
	expect(error.message.startsWith(agentConfigPath)).toBe(true);
});

test("a directory at the agent path is a rejection", () => {
	const agentConfigPath = join(tempDirectory(), CONFIG_FILE_NAME);
	mkdirSync(agentConfigPath);

	const error = rejectionAt(agentConfigPath);

	expect(error.field).toBeUndefined();
	expect(error.reason).toBe("cannot be read: EISDIR");
	expect(error.message.startsWith(agentConfigPath)).toBe(true);
});

// A root process reads a 000 directory, so this case cannot be driven as root.
test.skipIf(process.getuid?.() === 0)("an unreadable agent file is a rejection", () => {
	const directory = tempDirectory();
	const agentConfigPath = configFile(directory, '{"enabled":true}');
	lockDirectory(directory);

	const error = rejectionAt(agentConfigPath);

	expect(error.field).toBeUndefined();
	expect(error.reason).toBe("cannot be read: EACCES");
	expect(error.message.startsWith(agentConfigPath)).toBe(true);
});

test("a project path through a regular file is an absent project layer", () => {
	const directory = tempDirectory();
	const regularFile = join(directory, "not-a-directory");
	writeFileSync(regularFile, "");

	const config = loadTaiknrConfig({
		agentConfigPath: join(tempDirectory(), CONFIG_FILE_NAME),
		projectConfigPath: join(regularFile, CONFIG_FILE_NAME),
	});

	expect(config).toEqual(DEFAULT_TAIKNR_CONFIG);
});

test("an agent path through a regular file is a rejection", () => {
	const directory = tempDirectory();
	const regularFile = join(directory, "not-a-directory");
	writeFileSync(regularFile, "");
	const agentConfigPath = join(regularFile, CONFIG_FILE_NAME);

	const error = rejectionAt(agentConfigPath);

	expect(error.field).toBeUndefined();
	expect(error.reason).toBe("cannot be read: ENOTDIR");
	expect(error.message.startsWith(agentConfigPath)).toBe(true);
});
