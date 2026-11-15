import { resolve } from "node:path";
import { CONFIG_DIR_NAME, type ExtensionAPI, getAgentDir } from "@earendil-works/pi-coding-agent";
import type { SessionConfig } from "../../config/session-config.js";
import { CONFIG_FILE_NAME, loadTaiknrConfig, TaiknrConfigError } from "../../config/taiknr-config.js";
import type { ArchiveStore } from "../../use-cases/ports.js";

/**
 * Resolve this session's config at `session_start` (design D5): build both paths from the event's
 * context and the host's helpers, load, record the outcome on the holder, and report a rejection by
 * throwing after the holder carries it.
 */
export function registerSessionStartHandler(pi: ExtensionAPI, _store: ArchiveStore, session: SessionConfig): void {
	pi.on("session_start", (_event, ctx) => {
		const agentConfigPath = resolve(getAgentDir(), CONFIG_FILE_NAME);
		const projectConfigPath = ctx.isProjectTrusted() ? resolve(ctx.cwd, CONFIG_DIR_NAME, CONFIG_FILE_NAME) : undefined;

		try {
			const config = loadTaiknrConfig({ agentConfigPath, projectConfigPath });
			session.assign({ status: "ready", config });
		} catch (error) {
			// The loader converts every read and parse failure, so anything else is a defect and escapes.
			if (!(error instanceof TaiknrConfigError)) throw error;
			session.assign({ status: "rejected", error });
			throw new Error(`${error.message}; fix the file, then run /reload or start a new session`, { cause: error });
		}
	});
}
