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

test("the project file wins when both layers set the same field", () => {
	const config = loadTaiknrConfig({
		agentConfigPath: configFile(tempDirectory(), '{"decisionThreshold":0.9}'),
		projectConfigPath: configFile(tempDirectory(), '{"decisionThreshold":0.2}'),
	});

	expect(config.decisionThreshold).toBe(0.2);
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

test("the classifier timeout defaults to 5000 when neither file sets it", () => {
	const config = loadTaiknrConfig({
		agentConfigPath: configFile(tempDirectory(), "{}"),
		projectConfigPath: configFile(tempDirectory(), "{}"),
	});

	expect(config.classifierTimeoutMs).toBe(5000);
});

test("an agent file's classifier timeout is carried", () => {
	const config = loadTaiknrConfig({
		agentConfigPath: configFile(tempDirectory(), '{"classifierTimeoutMs":8000}'),
		projectConfigPath: undefined,
	});

	expect(config).toEqual({ ...DEFAULT_TAIKNR_CONFIG, classifierTimeoutMs: 8000 });
});

test("a project file's classifier timeout wins over the agent file's", () => {
	const config = loadTaiknrConfig({
		agentConfigPath: configFile(tempDirectory(), '{"classifierTimeoutMs":8000}'),
		projectConfigPath: configFile(tempDirectory(), '{"classifierTimeoutMs":12000}'),
	});

	expect(config.classifierTimeoutMs).toBe(12000);
});

test.each([1, 2147483647])("a classifier timeout of %i is accepted", (value) => {
	expect(accepted(`{"classifierTimeoutMs":${value}}`).classifierTimeoutMs).toBe(value);
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
	['{"classifierTimeoutMs":0}', "classifierTimeoutMs", "must be an integer from 1 to 2147483647"],
	['{"classifierTimeoutMs":-1}', "classifierTimeoutMs", "must be an integer from 1 to 2147483647"],
	['{"classifierTimeoutMs":1.5}', "classifierTimeoutMs", "must be an integer from 1 to 2147483647"],
	['{"classifierTimeoutMs":1e999}', "classifierTimeoutMs", "must be an integer from 1 to 2147483647"],
	['{"classifierTimeoutMs":2147483648}', "classifierTimeoutMs", "must be an integer from 1 to 2147483647"],
	['{"classifierTimeoutMs":"8000"}', "classifierTimeoutMs", "must be an integer from 1 to 2147483647"],
	['{"jeffersonInstruments":"false"}', "jeffersonInstruments", "must be a boolean"],
	['{"jeffersonInstruments":0}', "jeffersonInstruments", "must be a boolean"],
	['{"jeffersonInstruments":null}', "jeffersonInstruments", "must be a boolean"],
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
		'{"decisionThreshold":0.5,"minCharsToArchive":600,"defaultDecisionModel":"m","defaultDecisionModelProvider":"p","classifierTimeoutMs":8000,"enabled":true,"jeffersonInstruments":true}',
	);

	expect(config).toEqual({
		decisionThreshold: 0.5,
		defaultDecisionModel: "m",
		defaultDecisionModelProvider: "p",
		minCharsToArchive: 600,
		classifierTimeoutMs: 8000,
		enabled: true,
		jeffersonInstruments: true,
		conversationSummaryEnabled: false,
		conversationSummaryProvider: undefined,
		conversationSummaryModel: undefined,
		conversationSummaryThinkingLevel: "high",
	});
});

test("the default decision threshold is 0.55, not the 0.50 the code shipped", () => {
	expect(DEFAULT_TAIKNR_CONFIG.decisionThreshold).toBe(0.55);
});

test("the default decision model is the pinned typesafe/jev-1.14", () => {
	expect(DEFAULT_TAIKNR_CONFIG.defaultDecisionModel).toBe("typesafe/jev-1.14");
});

test("the summary defaults to off, with no pair and the high thinking level", () => {
	const config = accepted("{}");

	expect(config.conversationSummaryEnabled).toBe(false);
	expect(config.conversationSummaryProvider).toBeUndefined();
	expect(config.conversationSummaryModel).toBeUndefined();
	expect(config.conversationSummaryThinkingLevel).toBe("high");
});

test("a summary enabled with both its provider and model resolves", () => {
	const config = accepted(
		'{"conversationSummaryEnabled":true,"conversationSummaryProvider":"openrouter","conversationSummaryModel":"m"}',
	);

	expect(config.conversationSummaryEnabled).toBe(true);
	expect(config.conversationSummaryProvider).toBe("openrouter");
	expect(config.conversationSummaryModel).toBe("m");
});

test("a summary's pair in one file and its switch in another resolve", () => {
	const config = loadTaiknrConfig({
		agentConfigPath: configFile(
			tempDirectory(),
			'{"conversationSummaryProvider":"openrouter","conversationSummaryModel":"m"}',
		),
		projectConfigPath: configFile(tempDirectory(), '{"conversationSummaryEnabled":true}'),
	});

	expect(config.conversationSummaryEnabled).toBe(true);
	expect(config.conversationSummaryModel).toBe("m");
});

test("a later layer that turns the summary off needs no pair", () => {
	const config = loadTaiknrConfig({
		agentConfigPath: configFile(tempDirectory(), '{"conversationSummaryEnabled":true}'),
		projectConfigPath: configFile(tempDirectory(), '{"conversationSummaryEnabled":false}'),
	});

	expect(config.conversationSummaryEnabled).toBe(false);
});

test.each([
	['{"conversationSummaryEnabled":true}', "conversationSummaryProvider"],
	['{"conversationSummaryEnabled":true,"conversationSummaryProvider":"openrouter"}', "conversationSummaryModel"],
])("enabling the summary without its pair is rejected naming %s", (text, field) => {
	const error = rejection(text);

	expect(error.field).toBe(field);
	expect(error.reason).toBe("required when conversationSummaryEnabled is true");
});

test("the rejection names the file that enabled the summary, not the last one read", () => {
	const agentConfigPath = configFile(tempDirectory(), '{"conversationSummaryEnabled":true}');
	const projectConfigPath = configFile(tempDirectory(), '{"decisionThreshold":0.6}');

	let caught: unknown;
	try {
		loadTaiknrConfig({ agentConfigPath, projectConfigPath });
	} catch (error) {
		caught = error;
	}

	expect(caught).toBeInstanceOf(TaiknrConfigError);
	expect((caught as TaiknrConfigError).filePath).toBe(agentConfigPath);
	expect((caught as TaiknrConfigError).field).toBe("conversationSummaryProvider");
});

test.each(["off", "minimal", "low", "medium", "high", "xhigh", "max"])(
	"the thinking level %s is accepted, with the summary on or off",
	(level) => {
		expect(accepted(`{"conversationSummaryThinkingLevel":"${level}"}`).conversationSummaryThinkingLevel).toBe(level);
		expect(
			accepted(
				`{"conversationSummaryThinkingLevel":"${level}","conversationSummaryEnabled":true,"conversationSummaryProvider":"p","conversationSummaryModel":"m"}`,
			).conversationSummaryThinkingLevel,
		).toBe(level);
	},
);

test.each(["none", "HIGH", "", "none "])("the thinking level %j is rejected with the seven-level sentence", (level) => {
	const error = rejection(`{"conversationSummaryThinkingLevel":${JSON.stringify(level)}}`);

	expect(error.field).toBe("conversationSummaryThinkingLevel");
	expect(error.reason).toBe("must be one of off, minimal, low, medium, high, xhigh, max");
});

test.each(["conversationSummaryProvider", "conversationSummaryModel"])(
	"an empty %s is rejected as any empty string is",
	(field) => {
		const error = rejection(`{"${field}":""}`);

		expect(error.field).toBe(field);
		expect(error.reason).toBe("must be a non-empty string");
	},
);

test("the thinking level layers like every other field", () => {
	const config = loadTaiknrConfig({
		agentConfigPath: configFile(tempDirectory(), '{"conversationSummaryThinkingLevel":"low"}'),
		projectConfigPath: configFile(tempDirectory(), '{"conversationSummaryThinkingLevel":"max"}'),
	});

	expect(config.conversationSummaryThinkingLevel).toBe("max");
});

test("a user who names the alias instead of the pin still loads", () => {
	expect(accepted('{"defaultDecisionModel":"~typesafe/jev-latest"}').defaultDecisionModel).toBe("~typesafe/jev-latest");
});

test("the instruments switch defaults to on", () => {
	const config = loadTaiknrConfig({
		agentConfigPath: join(tempDirectory(), CONFIG_FILE_NAME),
		projectConfigPath: undefined,
	});

	expect(config.jeffersonInstruments).toBe(true);
});

test("the instruments switch layers like every other field, in either order", () => {
	const projectOn = loadTaiknrConfig({
		agentConfigPath: configFile(tempDirectory(), '{"jeffersonInstruments":false}'),
		projectConfigPath: configFile(tempDirectory(), '{"jeffersonInstruments":true}'),
	});
	const projectOff = loadTaiknrConfig({
		agentConfigPath: configFile(tempDirectory(), '{"jeffersonInstruments":true}'),
		projectConfigPath: configFile(tempDirectory(), '{"jeffersonInstruments":false}'),
	});

	expect(projectOn.jeffersonInstruments).toBe(true);
	expect(projectOff.jeffersonInstruments).toBe(false);
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
