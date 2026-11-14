import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import type { ArchiveStore } from "../../use-cases/ports.js";

export function registerSessionStartHandler(_pi: ExtensionAPI, _store: ArchiveStore): void {
	_pi.on("session_start", () => {});
}
