import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join } from "node:path";
import { CONFIG_DIR_NAME, type ExtensionContext } from "@earendil-works/pi-coding-agent";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
	createSessionConfig,
	type SessionConfig,
	type SessionConfigState,
} from "../../../src/config/session-config.js";
import {
	CONFIG_FILE_NAME,
	DEFAULT_TAIKNR_CONFIG,
	type TaiknrConfig,
	TaiknrConfigError,
} from "../../../src/config/taiknr-config.js";
import { registerSessionStartHandler } from "../../../src/infra/pi-event-handlers/session-start.js";
import type { ArchiveStore } from "../../../src/use-cases/ports.js";
import { createContextStub, createFakePi } from "../../support/fake-pi.js";

let originalAgentDir: string | undefined;
let originalCwd: string;
let workDirectory: string;
let agentDirectory: string;

beforeEach(() => {
	originalAgentDir = process.env.PI_CODING_AGENT_DIR;
	originalCwd = process.cwd();
	workDirectory = mkdtempSync(join(tmpdir(), "taiknr-session-start-"));
	// Every case points the agent directory at its own throwaway directory, so none reads the real one.
	agentDirectory = mkdtempSync(join(tmpdir(), "taiknr-session-start-agent-"));
	process.env.PI_CODING_AGENT_DIR = agentDirectory;
});

afterEach(() => {
	process.chdir(originalCwd);
	if (originalAgentDir === undefined) delete process.env.PI_CODING_AGENT_DIR;
	else process.env.PI_CODING_AGENT_DIR = originalAgentDir;
	rmSync(workDirectory, { recursive: true, force: true });
	rmSync(agentDirectory, { recursive: true, force: true });
	vi.restoreAllMocks();
});

/** Write the agent config file and return its path. */
function agentConfigFile(text: string): string {
	const path = join(agentDirectory, CONFIG_FILE_NAME);
	writeFileSync(path, text);
	return path;
}

/** Write a project config file under `<cwd>/<CONFIG_DIR_NAME>/` and return its path. */
function projectConfigFile(cwd: string, text: string): string {
	const directory = join(cwd, CONFIG_DIR_NAME);
	mkdirSync(directory, { recursive: true });
	const path = join(directory, CONFIG_FILE_NAME);
	writeFileSync(path, text);
	return path;
}

/** Register the bridge on a fresh fake `pi`. */
function register(session: SessionConfig) {
	const fake = createFakePi();
	registerSessionStartHandler(fake.pi, {} as ArchiveStore, session);
	return fake;
}

/** Fire the recorded `session_start` handler with a context stub. */
function startSession(fake: ReturnType<typeof createFakePi>, ctx: ExtensionContext): void {
	fake.registered[0].handler({ type: "session_start", reason: "startup" }, ctx);
}

function readyConfig(state: SessionConfigState): TaiknrConfig {
	if (state.status !== "ready") throw new Error(`expected a ready state, got ${state.status}`);
	return state.config;
}

function rejectedError(state: SessionConfigState): TaiknrConfigError {
	if (state.status !== "rejected") throw new Error(`expected a rejected state, got ${state.status}`);
	return state.error;
}

/** Install a spy on each console method, so a case can prove nothing was printed. */
function spyOnConsole() {
	return [vi.spyOn(console, "log"), vi.spyOn(console, "info"), vi.spyOn(console, "warn"), vi.spyOn(console, "error")];
}

test("an agent file under the agent directory reaches the holder", () => {
	agentConfigFile('{"decisionThreshold":0.9}');
	const session = createSessionConfig();
	const fake = register(session);

	startSession(fake, createContextStub({ cwd: workDirectory, trusted: false }));

	expect(fake.registered.map(({ event }) => event)).toEqual(["session_start"]);
	expect(readyConfig(session.state)).toEqual({ ...DEFAULT_TAIKNR_CONFIG, decisionThreshold: 0.9 });
});

test("an untrusted project file is never read", () => {
	agentConfigFile('{"decisionThreshold":0.9}');
	projectConfigFile(workDirectory, '{"minCharsToArchive":');
	const session = createSessionConfig();
	const fake = register(session);

	expect(() => startSession(fake, createContextStub({ cwd: workDirectory, trusted: false }))).not.toThrow();

	expect(readyConfig(session.state)).toEqual({ ...DEFAULT_TAIKNR_CONFIG, decisionThreshold: 0.9 });
});

test("a trusted project file wins over the agent file", () => {
	agentConfigFile('{"enabled":true}');
	projectConfigFile(workDirectory, '{"enabled":false}');
	const session = createSessionConfig();
	const fake = register(session);

	startSession(fake, createContextStub({ cwd: workDirectory, trusted: true }));

	expect(readyConfig(session.state).enabled).toBe(false);
});

test("no parent directory is searched for a project file", () => {
	writeFileSync(join(workDirectory, CONFIG_FILE_NAME), '{"decisionThreshold":');
	projectConfigFile(workDirectory, '{"minCharsToArchive":');
	const childDirectory = join(workDirectory, "child");
	mkdirSync(childDirectory);
	const session = createSessionConfig();
	const fake = register(session);

	expect(() => startSession(fake, createContextStub({ cwd: childDirectory, trusted: true }))).not.toThrow();

	expect(readyConfig(session.state)).toEqual(DEFAULT_TAIKNR_CONFIG);
});

test("a rejected file leaves the holder rejected and throws the report", () => {
	agentConfigFile('{"decisionThreshold":2}');
	const session = createSessionConfig();
	const fake = register(session);

	let thrown: unknown;
	try {
		startSession(fake, createContextStub({ cwd: workDirectory, trusted: false }));
	} catch (error) {
		thrown = error;
	}

	const error = rejectedError(session.state);
	expect(error).toBeInstanceOf(TaiknrConfigError);
	expect(error.field).toBe("decisionThreshold");
	expect(thrown).toBeInstanceOf(Error);
	expect((thrown as Error).message.startsWith(error.filePath)).toBe(true);
	expect((thrown as Error).message.endsWith("; fix the file, then run /reload or start a new session")).toBe(true);
	expect((thrown as Error).cause).toBe(error);
});

test("a second session start re-reads, so an in-memory flip ends", () => {
	agentConfigFile('{"decisionThreshold":0.9,"enabled":true}');
	projectConfigFile(workDirectory, '{"minCharsToArchive":100}');
	const secondDirectory = join(workDirectory, "second");
	projectConfigFile(secondDirectory, '{"minCharsToArchive":10}');
	const session = createSessionConfig();
	const fake = register(session);

	startSession(fake, createContextStub({ cwd: workDirectory, trusted: true }));
	expect(readyConfig(session.state)).toEqual({
		...DEFAULT_TAIKNR_CONFIG,
		decisionThreshold: 0.9,
		minCharsToArchive: 100,
	});

	session.setEnabled(false);
	expect(readyConfig(session.state).enabled).toBe(false);

	startSession(fake, createContextStub({ cwd: secondDirectory, trusted: true }));
	expect(readyConfig(session.state)).toEqual({
		...DEFAULT_TAIKNR_CONFIG,
		decisionThreshold: 0.9,
		minCharsToArchive: 10,
	});
});

test("a relative agent directory still yields an absolute agent path", () => {
	process.chdir(workDirectory);
	process.env.PI_CODING_AGENT_DIR = "agent";
	mkdirSync(join(workDirectory, "agent"));
	writeFileSync(join(workDirectory, "agent", CONFIG_FILE_NAME), "");
	const session = createSessionConfig();
	const fake = register(session);

	let thrown: unknown;
	try {
		startSession(fake, createContextStub({ cwd: workDirectory, trusted: false }));
	} catch (error) {
		thrown = error;
	}

	const error = rejectedError(session.state);
	expect(error.reason.startsWith("cannot be parsed: ")).toBe(true);
	expect(isAbsolute(error.filePath)).toBe(true);
	expect((thrown as Error).message.startsWith(error.filePath)).toBe(true);
});

test("a fixed file clears a prior rejection", () => {
	const path = agentConfigFile("[]");
	const session = createSessionConfig();
	const fake = register(session);

	expect(() => startSession(fake, createContextStub({ cwd: workDirectory, trusted: false }))).toThrow();
	expect(session.state.status).toBe("rejected");

	writeFileSync(path, '{"decisionThreshold":0.9}');
	startSession(fake, createContextStub({ cwd: workDirectory, trusted: false }));

	expect(readyConfig(session.state).decisionThreshold).toBe(0.9);
});

test("a valid off is silent", () => {
	agentConfigFile('{"enabled":false}');
	const spies = spyOnConsole();
	const session = createSessionConfig();
	const fake = register(session);

	startSession(fake, createContextStub({ cwd: workDirectory, trusted: false }));

	expect(readyConfig(session.state).enabled).toBe(false);
	for (const spy of spies) expect(spy).not.toHaveBeenCalled();
});

test("no config file anywhere resolves to the defaults, loudly and silently", () => {
	const spies = spyOnConsole();
	const session = createSessionConfig();
	const fake = register(session);

	expect(() => startSession(fake, createContextStub({ cwd: workDirectory, trusted: true }))).not.toThrow();

	expect(readyConfig(session.state)).toEqual(DEFAULT_TAIKNR_CONFIG);
	for (const spy of spies) expect(spy).not.toHaveBeenCalled();
});
