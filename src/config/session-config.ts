import type { TaiknrConfig, TaiknrConfigError } from "./taiknr-config.js";

export type ResolvedSessionConfig =
	| { readonly status: "ready"; readonly config: TaiknrConfig }
	| { readonly status: "rejected"; readonly error: TaiknrConfigError };

export type SessionConfigState = { readonly status: "unresolved" } | ResolvedSessionConfig;

export interface SessionConfig {
	readonly state: SessionConfigState;
	assign(next: ResolvedSessionConfig): void;
	isActive(): boolean;
	setEnabled(enabled: boolean): boolean;
}

/** One session's config state, created per extension factory call so no two sessions share it. */
export function createSessionConfig(): SessionConfig {
	let state: SessionConfigState = { status: "unresolved" };

	return {
		get state() {
			return state;
		},
		assign(next) {
			state = next;
		},
		isActive() {
			return state.status === "ready" && state.config.enabled;
		},
		setEnabled(enabled) {
			if (state.status !== "ready") return false;
			state = { status: "ready", config: { ...state.config, enabled } };
			return true;
		},
	};
}
