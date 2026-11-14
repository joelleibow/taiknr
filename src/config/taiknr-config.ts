export interface TaiknrConfig {
	decisionThreshold: number;
	defaultDecisionModel: string;
	defaultDecisionModelProvider: string;
	minCharsToArchive: number;
}

export const DEFAULT_TAIKNR_CONFIG: TaiknrConfig = {
	decisionThreshold: 0.5,
	defaultDecisionModel: "~typesafe/jev-latest",
	defaultDecisionModelProvider: "openrouter",
	minCharsToArchive: 600,
};

export interface ConfigPaths {
	agentConfigPath: string;
	projectConfigPath: string;
}

/** Resolve agent-level and project-level config overrides over DEFAULT_TAIKNR_CONFIG. */
export function loadTaiknrConfig(_paths: ConfigPaths): TaiknrConfig {
	throw new Error("Not implemented: loadTaiknrConfig");
}
