import type { AppliedPlacement, CarrierRecord } from "../../use-cases/payload-cache.js";

/** The four fields D1 reads off `ctx.model`; `baseUrl` is optional because pi's `Model` makes it so. */
export interface RouteModel {
	provider: string;
	api: string;
	id: string;
	baseUrl?: string;
}

/** What one `editPayload` call produced: the clone to send, and the two facts it committed nowhere. */
export interface PayloadEdit {
	output: unknown;
	nextCarrier: CarrierRecord | null;
	applied: AppliedPlacement | null;
}

const ANTHROPIC_HOST = "api.anthropic.com";
const ANTHROPIC_API = "anthropic-messages";

/** The host a baseUrl names, or undefined when it names none or no URL can parse it (D1). */
function hostOf(baseUrl: string | undefined): string | undefined {
	if (baseUrl === undefined) return undefined;
	try {
		return new URL(baseUrl).hostname;
	} catch {
		return undefined;
	}
}

/**
 * D1's route half: the routes this change was measured on and no others (design D1). Host equality
 * is exact, so a proxy whose host merely contains the real one stays uncovered.
 */
export function coversRoute(model: RouteModel | undefined): boolean {
	if (model === undefined || model.api !== ANTHROPIC_API) return false;
	if (model.provider === "anthropic") return hostOf(model.baseUrl) === ANTHROPIC_HOST;
	if (model.provider === "openrouter") return model.id.startsWith("anthropic/");
	return false;
}
