import type { ContextWithSystemEvent } from "@earendil-works/pi-coding-agent";
import { expect, test } from "vitest";
import { createGatedPi } from "../../../src/app/extension/handler-gate.js";
import { createInstrumentsHolder } from "../../../src/app/extension/instruments-holder.js";
import { createSessionConfig } from "../../../src/config/session-config.js";
import { DEFAULT_TAIKNR_CONFIG } from "../../../src/config/taiknr-config.js";
import type { ArchivedToolOutput } from "../../../src/domain/archived-output.js";
import { InMemoryArchiveStore } from "../../../src/infra/adapters/pi-archive-adapter.js";
import { registerInstrumentsSettledHandler } from "../../../src/infra/pi-event-handlers/instruments-settled.js";
import { createInstrumentsPublisher, type Publication } from "../../../src/use-cases/instruments-publisher.js";
import { createContextStub, createFakePi } from "../../support/fake-pi.js";

type Message = ContextWithSystemEvent["messages"][number];

const CONTEXT_KEYS = [
	"archiveItems",
	"archiveStubbed",
	"archiveWithheld",
	"contextWindow",
	"totalContext",
	"uncalibrated",
];

function archived(id: string, rawChars: number): ArchivedToolOutput {
	return {
		id,
		toolName: "bash",
		argsSummary: "",
		isError: false,
		stub: `[archived ${id}]`,
		rawText: "x".repeat(rawChars),
	};
}

const message = (chars: number): Message =>
	({ role: "user", content: "x".repeat(chars), timestamp: 1 }) as unknown as Message;

function harness(items: ArchivedToolOutput[] = []) {
	const fake = createFakePi();
	const session = createSessionConfig();
	session.assign({ status: "ready", config: DEFAULT_TAIKNR_CONFIG });
	const store = new InMemoryArchiveStore();
	store.addBatch(items);
	const posts: Publication[] = [];
	const holder = createInstrumentsHolder();
	holder.install(
		createInstrumentsPublisher({
			sink: {
				register() {},
				post(publication) {
					posts.push(publication);
				},
			},
			store,
		}),
	);
	registerInstrumentsSettledHandler(createGatedPi(fake.pi, session), holder);

	const fire = (options: { projectionMessages?: Message[]; contextWindow?: number }) =>
		fake.registered[0].handler(
			{ type: "agent_settled" },
			createContextStub({ cwd: "/work", trusted: false, model: { provider: "anthropic", id: "m" }, ...options }),
		);

	return { fake, holder, posts, fire, last: () => posts[posts.length - 1] };
}

test("a settlement posts total context from the reading and the archive from the store", () => {
	const { fire, last } = harness([archived("one", 400)]);

	fire({ projectionMessages: [message(400)], contextWindow: 200_000 });

	expect(Object.keys(last()).sort()).toEqual(CONTEXT_KEYS);
	expect(last()).toEqual({
		archiveItems: 1,
		archiveStubbed: 4,
		archiveWithheld: 100,
		contextWindow: 200_000,
		totalContext: 100,
		uncalibrated: true,
	});
});

test("a settlement that leaves an empty store posts zero items and zero sizes", () => {
	const { fire, last } = harness();

	fire({ projectionMessages: [], contextWindow: 0 });

	expect(last()).toEqual({
		archiveItems: 0,
		archiveStubbed: 0,
		archiveWithheld: 0,
		contextWindow: 0,
		totalContext: 0,
		uncalibrated: true,
	});
});

test("a store that ran ahead of the branch still reports its own items", () => {
	const { fire, last } = harness([archived("one", 400), archived("two", 400)]);

	fire({ projectionMessages: [], contextWindow: 1000 });

	expect(last()).toMatchObject({ archiveItems: 2, archiveWithheld: 200 });
});

test("with the switch off nothing is posted and no host read happens", () => {
	const fake = createFakePi();
	const session = createSessionConfig();
	session.assign({ status: "ready", config: { ...DEFAULT_TAIKNR_CONFIG, jeffersonInstruments: false } });
	const holder = createInstrumentsHolder();
	registerInstrumentsSettledHandler(createGatedPi(fake.pi, session), holder);

	expect(() =>
		fake.registered[0].handler(
			{ type: "agent_settled" },
			createContextStub({ cwd: "/work", trusted: false, hostReadsThrow: true }),
		),
	).not.toThrow();
	expect(fake.emitted).toEqual([]);
});

test("the same settlement with a real publisher on that context throws, so the silence can fail", () => {
	const fake = createFakePi();
	const session = createSessionConfig();
	session.assign({ status: "ready", config: DEFAULT_TAIKNR_CONFIG });
	const holder = createInstrumentsHolder();
	const posts: Publication[] = [];
	holder.install(
		createInstrumentsPublisher({
			sink: {
				register() {},
				post(publication) {
					posts.push(publication);
				},
			},
			store: new InMemoryArchiveStore(),
		}),
	);
	registerInstrumentsSettledHandler(createGatedPi(fake.pi, session), holder);

	expect(() =>
		fake.registered[0].handler(
			{ type: "agent_settled" },
			createContextStub({ cwd: "/work", trusted: false, hostReadsThrow: true }),
		),
	).toThrow();
	expect(posts).toEqual([]);
});
