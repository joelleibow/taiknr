import { lstatSync, readFileSync } from "node:fs";

export interface TaiknrConfig {
	decisionThreshold: number;
	defaultDecisionModel: string;
	defaultDecisionModelProvider: string;
	minCharsToArchive: number;
	classifierTimeoutMs: number;
	enabled: boolean;
	jeffersonInstruments: boolean;
}

/** The config file's name in both the agent directory and the project config directory. */
export const CONFIG_FILE_NAME = "pi-taiknr.json";

export const DEFAULT_TAIKNR_CONFIG: TaiknrConfig = {
	decisionThreshold: 0.5,
	defaultDecisionModel: "~typesafe/jev-latest",
	defaultDecisionModelProvider: "openrouter",
	minCharsToArchive: 600,
	classifierTimeoutMs: 5000,
	enabled: true,
	jeffersonInstruments: true,
};

export interface ConfigPaths {
	agentConfigPath: string;
	/** `undefined` means the caller has no project layer to offer, so nothing at that path is read. */
	projectConfigPath: string | undefined;
}

/** A config file taiknr will not run on: which file, which field where one applies, and why. */
export class TaiknrConfigError extends Error {
	readonly filePath: string;
	readonly field: string | undefined;
	readonly reason: string;

	constructor(filePath: string, field: string | undefined, reason: string) {
		super(field === undefined ? `${filePath}: ${reason}` : `${filePath}: ${field}: ${reason}`);
		this.filePath = filePath;
		this.field = field;
		this.reason = reason;
	}
}

type ParsedDocument = Record<string, unknown>;

/**
 * One rule per config field, next to the defaults (design D4): each returns the reason the value is
 * rejected, or `undefined` when it is accepted.
 */
const FIELD_RULES: { readonly [K in keyof TaiknrConfig]: (value: unknown) => string | undefined } = {
	decisionThreshold: (value) => {
		if (typeof value !== "number" || !Number.isFinite(value)) return "must be a number";
		if (value < 0) return "must be >= 0";
		if (value > 1) return "must be <= 1";
		return undefined;
	},
	minCharsToArchive: (value) =>
		typeof value === "number" && Number.isInteger(value) && value >= 0 ? undefined : "must be an integer >= 0",
	// A larger value makes Node warn and fire after 1 ms, which turns the setting into "always fail".
	classifierTimeoutMs: (value) =>
		typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 2147483647
			? undefined
			: "must be an integer from 1 to 2147483647",
	defaultDecisionModel: (value) => (isNonEmptyString(value) ? undefined : "must be a non-empty string"),
	defaultDecisionModelProvider: (value) => (isNonEmptyString(value) ? undefined : "must be a non-empty string"),
	enabled: (value) => (typeof value === "boolean" ? undefined : "must be a boolean"),
	jeffersonInstruments: (value) => (typeof value === "boolean" ? undefined : "must be a boolean"),
};

/** Resolve agent-level and project-level config overrides over DEFAULT_TAIKNR_CONFIG. */
export function loadTaiknrConfig(paths: ConfigPaths): TaiknrConfig {
	// The agent file is read and validated before the project path is touched (design D4).
	const documents: ParsedDocument[] = [];
	const agentDocument = readDocument(paths.agentConfigPath, "agent");
	if (agentDocument !== undefined) documents.push(agentDocument);
	if (paths.projectConfigPath !== undefined) {
		const projectDocument = readDocument(paths.projectConfigPath, "project");
		if (projectDocument !== undefined) documents.push(projectDocument);
	}

	return {
		decisionThreshold: layered("decisionThreshold", documents),
		defaultDecisionModel: layered("defaultDecisionModel", documents),
		defaultDecisionModelProvider: layered("defaultDecisionModelProvider", documents),
		minCharsToArchive: layered("minCharsToArchive", documents),
		classifierTimeoutMs: layered("classifierTimeoutMs", documents),
		enabled: layered("enabled", documents),
		jeffersonInstruments: layered("jeffersonInstruments", documents),
	};
}

/** A field's value from the last document that sets it, else its default (design D4's order). */
function layered<K extends keyof TaiknrConfig>(field: K, documents: readonly ParsedDocument[]): TaiknrConfig[K] {
	let value = DEFAULT_TAIKNR_CONFIG[field];
	for (const document of documents) {
		if (Object.hasOwn(document, field)) value = document[field] as TaiknrConfig[K];
	}
	return value;
}

type ConfigLayer = "agent" | "project";

/** Read, parse and validate one config file; `undefined` means the path holds no file (design D6). */
function readDocument(filePath: string, layer: ConfigLayer): ParsedDocument | undefined {
	let text: string;
	try {
		text = readFileSync(filePath, "utf8");
	} catch (error) {
		const errno = errnoCode(error);
		// A project directory that is a regular file means taiknr was never configured there.
		if (layer === "project" && errno === "ENOTDIR") return undefined;
		// A read `ENOENT` is an absence only when no directory entry exists: a dangling symlink is not.
		if (errno === "ENOENT" && !entryExists(filePath)) return undefined;
		throw new TaiknrConfigError(filePath, undefined, `cannot be read: ${errno}`);
	}
	return validateDocument(filePath, stripByteOrderMark(text));
}

/** Whether a directory entry exists; a `lstat` failure other than `ENOENT` is a rejection too. */
function entryExists(filePath: string): boolean {
	try {
		lstatSync(filePath);
		return true;
	} catch (error) {
		const errno = errnoCode(error);
		if (errno === "ENOENT") return false;
		throw new TaiknrConfigError(filePath, undefined, `cannot be read: ${errno}`);
	}
}

function errnoCode(error: unknown): string {
	return error instanceof Error && "code" in error ? String(error.code) : "unknown";
}

/** Reject anything but a JSON object whose every key is known and holds a valid value (design D4). */
function validateDocument(filePath: string, text: string): ParsedDocument {
	let parsed: unknown;
	try {
		parsed = JSON.parse(text);
	} catch (error) {
		throw new TaiknrConfigError(filePath, undefined, `cannot be parsed: ${parserMessage(error)}`);
	}
	if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
		throw new TaiknrConfigError(filePath, undefined, "root must be an object");
	}

	const document = parsed as ParsedDocument;
	for (const field of Object.keys(document)) {
		// `Object.hasOwn`, so a prototype member such as `toString` is an unknown field like any other.
		if (!Object.hasOwn(FIELD_RULES, field)) throw new TaiknrConfigError(filePath, field, "unknown field");
		const reason = FIELD_RULES[field as keyof TaiknrConfig](document[field]);
		if (reason !== undefined) throw new TaiknrConfigError(filePath, field, reason);
	}
	return document;
}

function parserMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

function isNonEmptyString(value: unknown): boolean {
	return typeof value === "string" && value.trim().length > 0;
}

/** A leading U+FEFF is not part of the JSON, and Pi strips it from every config read it performs (design D7). */
function stripByteOrderMark(text: string): string {
	return text.startsWith("\uFEFF") ? text.slice(1) : text;
}
