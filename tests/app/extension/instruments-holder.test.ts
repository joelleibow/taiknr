import { expect, test } from "vitest";
import { createInstrumentsHolder } from "../../../src/app/extension/instruments-holder.js";
import { InMemoryArchiveStore } from "../../../src/infra/adapters/pi-archive-adapter.js";
import { createInstrumentsPublisher, type Publication } from "../../../src/use-cases/instruments-publisher.js";

/** A reading that fails the case if anything evaluates it: the no-op reads nothing (design D1). */
function throwingReading(): never {
	throw new Error("the no-op evaluated a reading");
}

const RESPONSE = {
	pair: { provider: "anthropic", model: "claude-opus-5-5" },
	stopReason: "stop",
	usage: { input: 10, cacheRead: 0, cacheWrite: 0 },
	cost: { input: 0, cacheRead: 0, cacheWrite: 0 },
};

test("the holder starts with a no-op that evaluates no reading and posts nothing", () => {
	const publisher = createInstrumentsHolder().current();

	expect(() => {
		publisher.sessionStarted(throwingReading);
		publisher.requestBuilt(throwingReading);
		publisher.responseReceived(RESPONSE, throwingReading);
		publisher.settled(throwingReading);
		publisher.compacted(throwingReading);
		publisher.treeJumped(throwingReading);
		publisher.reportRecalled(throwingReading);
		publisher.started(2);
		publisher.finished({ costTotal: 0.001 });
		publisher.finished(undefined);
		publisher.summarized({ costTotal: 0.001 });
		publisher.summarized(undefined);
	}).not.toThrow();
});

/** A real publisher over a recording sink, so a post is observable. */
function publisherOver(posts: Publication[]) {
	return createInstrumentsPublisher({
		sink: {
			register() {},
			post(publication) {
				posts.push(publication);
			},
		},
		store: new InMemoryArchiveStore(),
	});
}

test("after install, current is that publisher and its posts reach its own sink", () => {
	const holder = createInstrumentsHolder();
	const posts: Publication[] = [];
	const installed = publisherOver(posts);

	holder.install(installed);

	expect(holder.current()).toBe(installed);
	holder.current().started(3);
	expect(posts).toEqual([{ deciding: true, decidingItems: 3 }]);
});

test("the last install wins", () => {
	const holder = createInstrumentsHolder();
	const first = publisherOver([]);
	const second = publisherOver([]);

	holder.install(first);
	holder.install(second);

	expect(holder.current()).toBe(second);
});

test("two holders do not share a publisher", () => {
	const first = createInstrumentsHolder();
	const second = createInstrumentsHolder();
	const installed = publisherOver([]);

	first.install(installed);

	expect(second.current()).not.toBe(installed);
});
