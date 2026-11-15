import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import type { ArchivedToolOutput } from "../../domain/archived-output.js";
import { commitArchivedBatch } from "../../use-cases/commit-archived-batch.js";
import type { ArchiveStore } from "../../use-cases/ports.js";
import { toSettlementDrafts } from "../adapters/pi-archive-adapter.js";

export function registerAgentBeforeSettleHandler(
	pi: ExtensionAPI,
	deps: {
		store: ArchiveStore;
		pendingOutputs: ArchivedToolOutput[];
		originalContentByEntryId: Map<string, unknown[]>;
	},
): void {
	pi.on("agent_before_settle", (event, ctx) => {
		// 1. Read both sources once, and partition without mutating anything.
		const branch = ctx.sessionManager.getBranch();
		const branchToolResultIds = new Set(
			branch.flatMap((entry) => (entry.type === "message" && entry.message.role === "toolResult" ? [entry.id] : [])),
		);
		const editedTargetIds = new Set(
			[...branch, ...event.entries].flatMap((entry) => (entry.type === "context_edit" ? [entry.targetId] : [])),
		);
		const isCommittable = (item: ArchivedToolOutput) =>
			branchToolResultIds.has(item.id) && !editedTargetIds.has(item.id);
		const committable = deps.pendingOutputs.filter(isCommittable);
		const dropped = deps.pendingOutputs.filter((item) => !isCommittable(item));

		const releaseDropped = () => {
			for (const item of dropped) {
				const index = deps.pendingOutputs.indexOf(item);
				if (index !== -1) deps.pendingOutputs.splice(index, 1);
				deps.originalContentByEntryId.delete(item.id);
			}
		};

		// 2. Nothing to commit: drop what the branch no longer admits and propose nothing.
		if (committable.length === 0) {
			releaseDropped();
			return;
		}

		// 3. Every draft is built before the store or either map changes, so a throw changes nothing.
		const drafts = toSettlementDrafts(committable, deps.originalContentByEntryId);

		// 4. Drain what is left into the store, then release the committed ids' content.
		releaseDropped();
		for (const item of commitArchivedBatch(deps.pendingOutputs, deps.store)) {
			deps.originalContentByEntryId.delete(item.id);
		}

		// 5. Another extension's proposals keep their place; taiknr's follow them.
		return { entries: [...event.entries, ...drafts] };
	});
}
