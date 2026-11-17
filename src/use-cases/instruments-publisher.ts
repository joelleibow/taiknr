import type { Pair, PairRatio, RatioTable, UsageCounts } from "../domain/calibration.js";
import { ratioFor, reseedTable, sampleRatio, seedTable, withLiveSample } from "../domain/calibration.js";
import type { RequestEstimates, StubMatch, ToolResultText } from "../domain/context-figures.js";
import { archiveEstimates, matchStubs, posted, requestEstimates } from "../domain/context-figures.js";
import type { CostCounts } from "../domain/savings-dollars.js";
import { netDollars, responseRates } from "../domain/savings-dollars.js";
import type { ArchiveStore } from "./ports.js";

/**
 * Every field taiknr declares to Jefferson, typed as D5's table does and in its row order. The
 * opening publication is typed `FigureValues`, so a field left out is a compile error.
 */
export interface FigureValues {
	contextInTurn: number;
	historyBefore: number;
	withheld: number;
	stubbed: number;
	recalled: number;
	totalContext: number;
	archiveItems: number;
	archiveWithheld: number;
	archiveStubbed: number;
	savedTokensRequest: number;
	savedTokensSinceStart: number;
	savedDollarsRequest: number;
	savedDollarsSinceStart: number;
	deciding: boolean;
	decidingItems: number;
	contextWindow: number;
	uncalibrated: boolean;
}

export type FigureKey = keyof FigureValues;

/** One update: only the fields this event writes, so every other field keeps its held value. */
export type Publication = Partial<FigureValues>;

/** Where a publication goes: Jefferson's declaration, and the bus it is posted on. */
export interface InstrumentSink {
	register(): void;
	post(publication: Publication): void;
}

/** Recall's classifier call, as the instruments see it. */
export interface ClassifierObserver {
	started(itemCount: number): void;
	finished(spend: { costTotal: number } | undefined): void;
}

/** What every event that publishes context and the archive reads from the host. */
export interface CompactedReadings {
	pair: Pair | undefined;
	projectionEstimate: number;
	contextWindow: number;
}

export type SettledReadings = CompactedReadings;
/** At a response the projection already counts the reply that has not landed on the branch yet (D7). */
export type ResponseReadings = CompactedReadings;

/** A branch event, which reseeds every ratio the run has not measured live (D7). */
export interface TreeJumpedReadings extends CompactedReadings {
	seeds: readonly PairRatio[];
}

export type SessionStartedReadings = TreeJumpedReadings;

/** One request, as the figures need it: the messages as sent, their tool results and the latest user message. */
export interface RequestReading {
	pair: Pair | undefined;
	messageEstimates: readonly number[];
	toolResults: readonly ToolResultText[];
	latestUser: { index: number; timestamp: number; tailText: string } | undefined;
}

/** What an assistant `message_end` carries eagerly, because the event itself holds it (D3). */
export interface ResponseMessage {
	pair: Pair;
	stopReason: string;
	usage: UsageCounts;
	cost: CostCounts;
}

/** One method per publishing event, plus the three recall's path calls. */
export interface InstrumentPublisher extends ClassifierObserver {
	sessionStarted(read: () => SessionStartedReadings): void;
	requestBuilt(read: () => RequestReading): void;
	responseReceived(response: ResponseMessage, read: () => ResponseReadings): void;
	settled(read: () => SettledReadings): void;
	compacted(read: () => CompactedReadings): void;
	treeJumped(read: () => TreeJumpedReadings): void;
	reportRecalled(read: () => { estimate: number }): void;
}

/** The per-session cell every handler reaches the publisher through, so nothing tests the switch. */
export interface InstrumentsHolder {
	current(): InstrumentPublisher;
	install(publisher: InstrumentPublisher): void;
}

export interface InstrumentsPublisherDeps {
	sink: InstrumentSink;
	store: ArchiveStore;
}

/** The recall block a request carried: the latest user message recall appended it to (D8). */
interface Block {
	index: number;
	timestamp: number;
	text: string;
}

/** What one request would charge if its response prices it (D8). */
interface RequestCandidate {
	stubs: ReadonlySet<string>;
	block: Block | undefined;
	length: number;
	stubSuffixStart: number | undefined;
}

interface PendingRequest {
	figures: RequestEstimates;
	messageEstimates: readonly number[];
	latestUser: RequestReading["latestUser"];
	candidate: RequestCandidate;
}

/** The smallest index among the stubs the baseline did not carry: a rewrite suffix start (D8). */
function newStubStart(matches: readonly StubMatch[], baseline: RequestCandidate | undefined): number | undefined {
	const carried = baseline?.stubs;
	const fresh = matches.filter((match) => carried === undefined || !carried.has(match.stub));
	return fresh.length === 0 ? undefined : Math.min(...fresh.map(({ index }) => index));
}

/**
 * The per-session publisher: one writer per event, one deferred reading each, and every figure a
 * plain number before it is posted (design D3). It names no pi type and no Jefferson type.
 */
export function createInstrumentsPublisher(deps: InstrumentsPublisherDeps): InstrumentPublisher {
	let table: RatioTable = seedTable([]);
	let pending: PendingRequest | undefined;
	let baseline: RequestCandidate | undefined;
	let reportedRecall: (() => { estimate: number }) | undefined;
	let unchargedSpend = 0;
	let savedTokensSinceStart = 0;
	let savedDollarsSinceStart = 0;

	/** The store's two sizes, scaled: the only figures the archive contributes. */
	const archiveSizes = (k: number) => {
		const archive = archiveEstimates(deps.store.getAll());
		return { archiveStubbed: posted(archive.stubbed, k), archiveWithheld: posted(archive.withheld, k) };
	};

	/** The fields a context reading writes, under that event's own pair. */
	const contextFigures = (readings: CompactedReadings) => {
		const { k, uncalibrated } = ratioFor(table, readings.pair);
		return {
			...archiveSizes(k),
			contextWindow: readings.contextWindow,
			totalContext: posted(readings.projectionEstimate, k),
			uncalibrated,
		};
	};

	/** A branch event also re-posts the item count; an unpriced response leaves it alone (D5). */
	const postContextAndArchive = (readings: CompactedReadings) => {
		deps.sink.post({ archiveItems: deps.store.size(), ...contextFigures(readings) });
	};

	/** The rewrite suffix's size, and whether the block rides a message the baseline never carried. */
	const rewriteOf = (request: PendingRequest) => {
		const previousLength = baseline?.length ?? 0;
		const starts: number[] = [];
		if (request.candidate.stubSuffixStart !== undefined) starts.push(request.candidate.stubSuffixStart);
		const carried = baseline?.block;
		const latestUser = request.latestUser;
		const blockChanged =
			carried !== undefined &&
			(latestUser === undefined || latestUser.timestamp !== carried.timestamp || latestUser.tailText !== carried.text);
		if (blockChanged) starts.push(carried.index);
		const suffixEstimate =
			starts.length === 0
				? 0
				: request.messageEstimates
						.slice(Math.min(...starts), previousLength)
						.reduce((total, estimate) => total + estimate, 0);
		const block = request.candidate.block;
		return { suffixEstimate, blockInNewTail: block !== undefined && block.index >= previousLength };
	};

	return {
		sessionStarted(read) {
			const readings = read();
			table = seedTable(readings.seeds);
			const { k, uncalibrated } = ratioFor(table, readings.pair);
			const totalContext = posted(readings.projectionEstimate, k);
			const opening: FigureValues = {
				contextInTurn: totalContext,
				historyBefore: totalContext,
				withheld: 0,
				stubbed: 0,
				recalled: 0,
				totalContext,
				archiveItems: deps.store.size(),
				...archiveSizes(k),
				savedTokensRequest: 0,
				savedTokensSinceStart,
				savedDollarsRequest: 0,
				savedDollarsSinceStart,
				deciding: false,
				decidingItems: 0,
				contextWindow: readings.contextWindow,
				uncalibrated,
			};
			deps.sink.register();
			deps.sink.post(opening);
		},

		requestBuilt(read) {
			// Taken and cleared before either reading is evaluated, so a throw leaves nothing stored (OD6(a)).
			const recallReading = reportedRecall;
			reportedRecall = undefined;
			const readings = read();
			const recallEstimate = recallReading === undefined ? 0 : recallReading().estimate;
			const { k, uncalibrated } = ratioFor(table, readings.pair);
			const matches = matchStubs(readings.toolResults, deps.store.getAll());
			const figures = requestEstimates(readings.messageEstimates, matches, recallEstimate);
			const latestUser = readings.latestUser;
			pending = {
				figures,
				messageEstimates: readings.messageEstimates,
				latestUser,
				candidate: {
					stubs: new Set(matches.map(({ stub }) => stub)),
					block:
						recallEstimate > 0 && latestUser !== undefined
							? { index: latestUser.index, timestamp: latestUser.timestamp, text: latestUser.tailText }
							: undefined,
					length: readings.messageEstimates.length,
					stubSuffixStart: newStubStart(matches, baseline),
				},
			};
			deps.sink.post({
				contextInTurn: posted(figures.contextInTurn, k),
				historyBefore: posted(figures.historyBefore, k),
				recalled: posted(figures.recalled, k),
				stubbed: posted(figures.stubbed, k),
				uncalibrated,
				withheld: posted(figures.withheld, k),
			});
		},

		responseReceived(response, read) {
			const readings = read();
			const request = pending;
			pending = undefined;
			const k = sampleRatio(response.stopReason, response.usage, request?.figures.contextInTurn ?? 0);
			if (request === undefined || k === undefined) {
				deps.sink.post(contextFigures(readings));
				return;
			}

			table = withLiveSample(table, { pair: response.pair, k });
			const { figures } = request;
			const { suffixEstimate, blockInNewTail } = rewriteOf(request);
			const net = netDollars(responseRates(response.usage, response.cost), {
				k,
				stubSaving: figures.withheld - figures.stubbed,
				recalled: figures.recalled,
				blockInNewTail,
				suffixEstimate,
				classifierSpend: unchargedSpend,
			});
			const savedTokensRequest = posted(figures.saving, k);
			savedTokensSinceStart += savedTokensRequest;
			savedDollarsSinceStart += net;
			unchargedSpend = 0;
			baseline = request.candidate;

			const { usage } = response;
			deps.sink.post({
				contextInTurn: usage.input + usage.cacheRead + usage.cacheWrite,
				historyBefore: posted(figures.historyBefore, k),
				recalled: posted(figures.recalled, k),
				stubbed: posted(figures.stubbed, k),
				withheld: posted(figures.withheld, k),
				savedTokensRequest,
				savedTokensSinceStart,
				savedDollarsRequest: net,
				savedDollarsSinceStart,
				totalContext: posted(readings.projectionEstimate, k),
				...archiveSizes(k),
				contextWindow: readings.contextWindow,
				uncalibrated: ratioFor(table, response.pair).uncalibrated,
			});
		},

		settled(read) {
			postContextAndArchive(read());
		},

		compacted(read) {
			const readings = read();
			pending = undefined;
			baseline = undefined;
			postContextAndArchive(readings);
		},

		treeJumped(read) {
			const readings = read();
			table = reseedTable(table, readings.seeds);
			pending = undefined;
			baseline = undefined;
			postContextAndArchive(readings);
		},

		reportRecalled(read) {
			reportedRecall = read;
		},

		started(itemCount) {
			deps.sink.post({ deciding: true, decidingItems: itemCount });
		},

		finished(spend) {
			// An absent, non-finite or negative cost is no spend; the money is subtracted at the next priced response.
			if (spend !== undefined && Number.isFinite(spend.costTotal) && spend.costTotal > 0) {
				unchargedSpend += spend.costTotal;
			}
			deps.sink.post({ deciding: false });
		},
	};
}
