#!/usr/bin/env node
/**
 * The live check of design §8.3: three prompts, one route, and the billing inequalities read off
 * the wire. It sits at the root and outside `biome.json`'s allowlist, `tsconfig.json`'s program and
 * vitest's include, because it spends a model call and a classifier call.
 *
 *   direnv exec . node test-cache-point-live.mjs <route>
 *
 * Routes: anthropic-key, openrouter, anthropic-oauth, attribution. A run needs the route's key and
 * OPENROUTER_API_KEY for recall's classifier, or it exits 2. It also needs a checkout whose
 * `src/app/extension/taiknr.ts` exists, or it exits 3. Preconditions that would make an assertion
 * meaningless exit 3 too; a failed assertion exits 1.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROUTES = {
	"anthropic-key": { model: "claude-haiku-4-5", keys: ["ANTHROPIC_API_KEY", "OPENROUTER_API_KEY"], oauth: false },
	openrouter: { model: "openrouter/anthropic/claude-haiku-4.5", keys: ["OPENROUTER_API_KEY"], oauth: false },
	"anthropic-oauth": { model: "claude-haiku-4-5", keys: ["OPENROUTER_API_KEY"], oauth: true },
	attribution: {
		model: "claude-haiku-4-5",
		keys: ["OPENROUTER_API_KEY"],
		oauth: true,
		extension: join(homedir(), ".pi/agent/extensions/anthropic-attribution.ts"),
	},
};

/** The config every route runs with: threshold 0 selects every scored item, publishing off. */
const CONFIG = { decisionThreshold: 0, jeffersonInstruments: false };

/** The one host D1 covers, and the model id OpenRouter must start with (design D1). */
const covered = (model) => {
	if (model === undefined || model === null) return false;
	if (model.api !== "anthropic-messages") return false;
	if (model.provider === "anthropic") {
		try {
			return new URL(model.baseUrl).hostname === "api.anthropic.com";
		} catch {
			return false;
		}
	}
	return model.provider === "openrouter" && String(model.id).startsWith("anthropic/");
};

/** The three prompts: a table big enough to clear Haiku 4.5's minimum, then a recalling turn. */
function prompts(nonce) {
	const table = (tag) =>
		`${tag} ${nonce} ` +
		Array.from({ length: 800 }, (_, i) => `ref${i}:${(i * 104729 + nonce) % 99991}`).join(" ");
	const calls =
		"Now run `echo s1` with the bash tool. After each result, run the next one with the bash tool, " +
		"one call per response: `echo s2`, then `echo s3`, and so on up to `echo s12`. Then tell me you are done.";
	return [
		`Here is a lookup table I will need later in this session: ${table("first")}. Now use the bash tool to run ` +
			"`seq 1 3000`, then reply only: done",
		`Thanks. Here is the second table: ${table("second")}. What was the last number the first command printed? ${calls}`,
		"Thanks. Now please run `echo three` with the bash tool and tell me the output.",
	];
}

/** The observer, written into the run's temporary cwd: it logs the wire and edits nothing. */
const OBSERVER = `
import { appendFileSync } from "node:fs";
const LOG = process.env.TAIKNR_LIVE_LOG;
const log = (o) => appendFileSync(LOG, JSON.stringify(o) + "\\n");
const nameOf = (block) => (block?.type === "text" ? "text" : block?.type === "tool_result" ? "tool_result" : String(block?.type));
export default function (pi) {
  let reported = false;
  let carryFrom = -1;
  let n = 0;
  pi.on("before_provider_request", (event, ctx) => {
    const payload = event.payload;
    if (payload === null || typeof payload !== "object" || !Array.isArray(payload.messages)) return;
    n += 1;
    const messages = payload.messages;
    const marks = [];
    if (payload.cache_control) marks.push("top");
    (Array.isArray(payload.system) ? payload.system : []).forEach((block, i) => block?.cache_control && marks.push("system[" + i + "]"));
    (Array.isArray(payload.tools) ? payload.tools : []).forEach((block, i) => block?.cache_control && marks.push("tools[" + i + "]"));
    messages.forEach((message, i) => Array.isArray(message.content) && message.content.forEach((block, j) => block?.cache_control && marks.push("m[" + i + "][" + j + "]:" + nameOf(block))));
    const last = messages[messages.length - 1];
    const lastBlocks = Array.isArray(last?.content) ? last.content : [];
    // A turn opens when the last message is not a tool result: with recall on, its tail is the block.
    const turnStart = lastBlocks.length > 0 && nameOf(lastBlocks[lastBlocks.length - 1]) === "text";
    // The block sits at the tail of the user message recall appended it to, which is not the last
    // message once the turn has tool results: find it, and remember it as the next request's carrier.
    let carrier = -1;
    messages.forEach((message, i) => {
      const blocks = Array.isArray(message?.content) ? message.content : [];
      const tail = blocks[blocks.length - 1];
      if (tail?.type === "text" && String(tail.text).startsWith("<recalled_context")) carrier = i;
    });
    const carryBlocks = Array.isArray(messages[carryFrom]?.content) ? messages[carryFrom].content : [];
    const carryMarked =
      carryFrom >= 0 && marks.some((mark) => mark.startsWith("m[" + carryFrom + "][" + (carryBlocks.length - 1) + "]"));
    if (carrier >= 0) carryFrom = carrier;
    const blockOwner = carrier >= 0 ? messages[carrier] : messages.filter((m) => m?.role === "user").at(-1);
    const ownerBlocks = Array.isArray(blockOwner?.content) ? blockOwner.content : [];
    const block = carrier >= 0 ? ownerBlocks[ownerBlocks.length - 1] : undefined;
    log({
      kind: "request",
      n,
      nMsgs: messages.length,
      markers: marks,
      blockChars: block === undefined ? 0 : String(block.text).length,
      turnTextChars: ownerBlocks.map((b) => (b?.type === "text" && !String(b.text).startsWith("<recalled_context") ? String(b.text).length : 0)).reduce((a, b) => a + b, 0),
      blocksInLastUser: carrier >= 0 ? ownerBlocks.length : lastBlocks.length,
      carryMessage: carryFrom,
      carryMarked,
      turnStart,
      model: reported ? undefined : (ctx.model ? { provider: ctx.model.provider, api: ctx.model.api, id: ctx.model.id, baseUrl: ctx.model.baseUrl } : null),
    });
    reported = true;
  });
  pi.on("message_end", (event) => {
    const m = event.message;
    if (m?.role !== "assistant") return;
    log({ kind: "usage", stop: m.stopReason, input: m.usage?.input, read: m.usage?.cacheRead, write: m.usage?.cacheWrite, output: m.usage?.output });
  });
}
`;

/** The requests of one run, with each request's turn number and the usage its response reported. */
function group(records) {
	const requests = [];
	let turn = 0;
	for (const record of records) {
		if (record.kind === "usage") {
			if (requests.length > 0 && requests.at(-1).usage === undefined) requests.at(-1).usage = record;
			continue;
		}
		if (record.kind !== "request") continue;
		if (record.turnStart) turn += 1;
		requests.push({ ...record, turn: Math.max(turn, 1), usage: undefined });
	}
	for (const request of requests) request.usage ??= { input: 0, read: 0, write: 0, output: 0 };
	return requests;
}

const ceilDivide = (value, by) => Math.ceil(value / by);
const sum = (values) => values.reduce((total, value) => total + value, 0);
const messageMarkers = (request) => request.markers.filter((mark) => mark.startsWith("m["));

/** One assertion, with both sides printed whether it passed or not. */
const check = (name, ok, detail) => ({ name, ok, detail });

/**
 * Every precondition and every assertion of design §8.3, from the requests one run logged. A
 * precondition that fails makes the assertions meaningless, so the caller exits 3 on those.
 */
export function evaluate(requests) {
	const model = requests.find((request) => request.model !== undefined)?.model ?? null;
	const turns = [...new Set(requests.map((request) => request.turn))].sort((a, b) => a - b);
	const [first, second, third] = turns;
	const inTurn = (turn) => requests.filter((request) => request.turn === turn);
	const turn1 = inTurn(first);
	const turn2 = inTurn(second);
	const turn3 = inTurn(third);
	const H = turn3[0];
	const R1 = turn2[0];

	const preconditions = [
		check("D1 covers the route ctx.model reports", covered(model), `${model?.provider}/${model?.api}/${model?.baseUrl}`),
		check("turn 1's second request reads more than 0", (turn1[1]?.usage.read ?? 0) > 0, `read ${turn1[1]?.usage.read ?? 0}`),
		check(
			"no request of turn 1 carries a recall block",
			turn1.every((request) => request.blockChars === 0),
			`block chars ${turn1.map((request) => request.blockChars).join(",")}`,
		),
		check(
			"every request of turns 2 and 3 carries a recall block",
			[...turn2, ...turn3].every((request) => request.blockChars > 0),
			`block chars ${[...turn2, ...turn3].map((request) => request.blockChars).join(",")}`,
		),
		check("turn 2 made at least 12 requests", turn2.length >= 12, `${turn2.length} requests`),
		check("there is a turn after turn 2", H !== undefined, `${turns.length} turns`),
	];

	if (H === undefined) return { preconditions, assertions: [], requests };

	const assertions = [
		check("R1 carries at most 4 markers", R1.markers.length <= 4, `${R1.markers.length}: ${R1.markers.join(" ")}`),
		check(
			"R1 marks recall's block",
			messageMarkers(R1).some((mark) => mark.startsWith(`m[${R1.nMsgs - 1}][${R1.blocksInLastUser - 1}]`)),
			`${R1.markers.join(" ")} vs m[${R1.nMsgs - 1}][${R1.blocksInLastUser - 1}]`,
		),
		check(
			"R1 marks the block before recall's block",
			messageMarkers(R1).some((mark) => mark.startsWith(`m[${R1.nMsgs - 1}][${R1.blocksInLastUser - 2}]`)),
			`${R1.markers.join(" ")} vs m[${R1.nMsgs - 1}][${R1.blocksInLastUser - 2}]`,
		),
		check(
			"R1's input is below a tenth of the block",
			R1.usage.input < ceilDivide(R1.blockChars, 8),
			`${R1.usage.input} < ${ceilDivide(R1.blockChars, 8)}`,
		),
		check("H carries at most 4 markers", H.markers.length <= 4, `${H.markers.length}: ${H.markers.join(" ")}`),
		check(
			"H marks the last block of turn 2's user message",
			H.carryMarked === true,
			`carry message ${H.carryMessage}: ${H.carryMarked === true ? "marked" : "unmarked"}`,
		),
		check(
			"H marks the block before recall's block",
			H.blockChars === 0 ||
				messageMarkers(H).some((mark) => mark.startsWith(`m[${H.nMsgs - 1}][${H.blocksInLastUser - 2}]`)),
			`${H.markers.join(" ")} vs m[${H.nMsgs - 1}][${H.blocksInLastUser - 2}]`,
		),
		check(
			"H marks nothing on recall's block or after it",
			H.blockChars === 0 || !messageMarkers(H).some((mark) => mark.startsWith(`m[${H.nMsgs - 1}][${H.blocksInLastUser - 1}]`)),
			`${H.markers.join(" ")}`,
		),
		check(
			"H reads turn 2's prefix plus its own text",
			H.usage.read >= R1.usage.read + ceilDivide(R1.turnTextChars, 8),
			`${H.usage.read} >= ${R1.usage.read} + ${ceilDivide(R1.turnTextChars, 8)}`,
		),
		check(
			"H writes no more than turn 2's tail",
			H.usage.write <=
				sum(turn2.slice(1).map((request) => request.usage.write)) +
					turn2.at(-1).usage.output +
					ceilDivide(H.turnTextChars, 2) +
					256,
			`${H.usage.write} <= ${sum(turn2.slice(1).map((request) => request.usage.write))} + ${turn2.at(-1).usage.output} + ${ceilDivide(H.turnTextChars, 2)} + 256`,
		),
		check(
			"H bills the block as input",
			H.usage.input >= ceilDivide(H.blockChars, 8),
			`${H.usage.input} >= ${ceilDivide(H.blockChars, 8)}`,
		),
	];

	return { preconditions, assertions, requests };
}

/** The run's one table: a row per request, then each assertion with both sides. */
export function report(route, { preconditions, assertions, requests }) {
	const lines = [`route ${route}`];
	lines.push(["turn", "req", "markers", "block", "input", "read", "write", "output"].join("\t"));
	let seen = new Map();
	for (const request of requests) {
		const index = (seen.get(request.turn) ?? 0) + 1;
		seen.set(request.turn, index);
		lines.push(
			[
				request.turn,
				index,
				request.markers.join(" ") || "-",
				request.blockChars,
				request.usage.input,
				request.usage.read,
				request.usage.write,
				request.usage.output,
			].join("\t"),
		);
	}
	for (const item of [...preconditions, ...assertions]) {
		lines.push(`${item.ok ? "pass" : "FAIL"}  ${item.name}: ${item.detail}`);
	}
	return lines.join("\n");
}

/** The observer's log, line by line. */
export function parseObserverLog(text) {
	return text
		.split("\n")
		.filter((line) => line.trim() !== "")
		.flatMap((line) => {
			try {
				return [JSON.parse(line)];
			} catch {
				return [];
			}
		});
}

function main(argv) {
	const route = argv[0];
	const spec = ROUTES[route];
	if (spec === undefined) {
		console.error(`unknown route: ${route}. One of ${Object.keys(ROUTES).join(", ")}`);
		return 2;
	}
	const missing = spec.keys.filter((key) => (process.env[key] ?? "") === "");
	if (missing.length > 0) {
		console.error(`missing key: ${missing.join(", ")}`);
		return 2;
	}

	const extension = resolve(process.cwd(), "src/app/extension/taiknr.ts");
	if (!existsSync(extension)) {
		console.error(`extension not found: ${extension}`);
		return 3;
	}

	const cwd = mkdtempSync(join(tmpdir(), "taiknr-live-cwd-"));
	const agent = mkdtempSync(join(tmpdir(), "taiknr-live-agent-"));
	const log = join(cwd, "live.jsonl");
	const observer = join(cwd, "live-observer.mjs");
	const cleanups = () => {
		rmSync(cwd, { recursive: true, force: true });
		rmSync(agent, { recursive: true, force: true });
	};
	process.on("exit", cleanups);

	writeFileSync(observer, OBSERVER);
	writeFileSync(join(agent, "pi-taiknr.json"), JSON.stringify(CONFIG));
	if (spec.oauth) symlinkSync(join(homedir(), ".pi/agent/auth.json"), join(agent, "auth.json"));
	if (spec.oauth) {
		const status = execFileSync("pi", ["auth", "check", "--provider", "anthropic", "--no-refresh"], {
			cwd,
			env: { ...process.env, PI_CODING_AGENT_DIR: agent },
			encoding: "utf8",
		});
		if (!status.includes("ready")) {
			console.error("no OAuth credential reachable through the symlink");
			return 3;
		}
	}

	const args = ["-p", "--no-session", "-ne", "-e", extension, "-e", observer, "--model", spec.model, "--thinking", "off"];
	if (spec.extension !== undefined) args.push("-e", spec.extension);
	args.push(...prompts(Date.now()));
	try {
		execFileSync("pi", args, {
			cwd,
			env: { ...process.env, PI_CODING_AGENT_DIR: agent, TAIKNR_LIVE_LOG: log },
			encoding: "utf8",
		});
	} catch (error) {
		// A prompt that ran but ended non-zero still leaves a log; the assertions decide.
		if (!existsSync(log)) {
			console.error(`pi did not run: ${error instanceof Error ? error.message : String(error)}`);
			return 3;
		}
	}

	const { preconditions, assertions, requests } = evaluate(group(parseObserverLog(readFileSync(log, "utf8"))));
	console.log(report(route, { preconditions, assertions, requests }));
	const failed = preconditions.filter((item) => !item.ok);
	if (failed.length > 0) {
		console.error(`precondition failed: ${failed[0].name} (${failed[0].detail})`);
		return 3;
	}
	return assertions.every((item) => item.ok) ? 0 : 1;
}

const self = realpathSync(fileURLToPath(import.meta.url));
if (process.argv[1] !== undefined && realpathSync(resolve(process.argv[1])) === self) {
	process.exitCode = main(process.argv.slice(2));
}
