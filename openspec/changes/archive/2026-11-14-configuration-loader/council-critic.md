{
  "mode": "council",
  "lens": "council-critic",
  "paraphrase_proposes": "",
  "paraphrase_existing": "",
  "recommendation": "Go to design, with six major contract fixes and no blocking findings. Cost is not a concern: each session start does two small synchronous reads, and `enabled: false` removes classifier spend. The real risks are in the state machine and the edges. (1) The per-session holder needs three states: unresolved, rejected and resolved. With only `enabled`, a broken file and a deliberate off look the same, so a later `/taiknr on` would run on the defaults Joel ruled out. (2) The trust gate must stop the loader before it reads the project file, and `ConfigPaths` cannot say 'no project file' today. (3) The MODIFIED extension-packaging text contradicts itself on the turn-end and context registrars. (4) Rejecting a BOM differs from every JSON read Pi itself does. (5) A dangling symlink, which is likely with Joel's dotfiles setup, would quietly fall back to defaults. (6) The command seam must state how long it lasts and what re-enabling does to the store, not just be a boolean. For O1, use a small holder or getter, created in the factory, that starts inert. For O2, use hand-written guards in one per-field rule table. For O3, use a single throw from session_start after the holder is set to rejected; this reaches every mode (checked in the Pi source). For O6, use one shared predicate called first in each handler. For O7, stay silent when off and announce only a rejection.",
  "findings": [
    {
      "id": "CR-1",
      "severity": "major",
      "location": "proposal.md Open Questions O1/S13; specs/configuration/spec.md 'A present but malformed or invalid file stops taiknr for the session' and 'A clean seam is left for the deferred /taiknr command'",
      "finding": "If the session holder carries only a `TaiknrConfig` with `enabled`, it cannot tell 'rejected' or 'not yet resolved' apart from 'turned off'. The proposed seam (the Status card sets `enabled`) would then let a later command bring back the defaults after a rejection.",
      "rationale": "Joel's Q1(b) says nothing survives a rejection and there is no fallback to defaults. If rejection is stored as `enabled: false`, or as a config object that was never filled in, then `holder.enabled = true` from `/taiknr on` turns taiknr on with `DEFAULT_TAIKNR_CONFIG`. That is exactly the fallback Q1(b) forbids. The orientation's 'in-place fill' option (O1) has the same problem: it needs some initial value, and `{...DEFAULT_TAIKNR_CONFIG}` is the obvious one.",
      "concrete_case": "The agent file holds `{\"decisionThreshold\": 2}`. At session_start it is rejected, and the holder keeps its initial value or is set to `enabled: false`. The user runs `/taiknr on` (Status card), which does `holder.enabled = true`. The turn-end and context handlers then run with threshold 0.5 and the openrouter defaults, although the user's file is still broken.",
      "recommendation": "Have the design model the holder as three states: `unresolved` (from factory time until session_start), `rejected` (keeps the rejection message) and `resolved(config)`. Handlers act only on `resolved` with `config.enabled === true`. The seam the command uses refuses to turn on from `rejected` or `unresolved`, and its error names the file. The initial state is inert. That is free to do, and it covers factories that run 'in invocations that never start a session' (docs/extensions.md L254)."
    },
    {
      "id": "CR-2",
      "severity": "major",
      "location": "src/config/taiknr-config.ts ConfigPaths (projectConfigPath: string, required); specs/configuration/spec.md 'The project file is honoured only in a trusted project'; michael-orientation D9 ('ConfigPaths … remain as at HEAD')",
      "finding": "The loader receives no trust information, and `ConfigPaths.projectConfigPath` is a required string. So the caller cannot say 'there is no trusted project file' without changing the type or passing a fake path. If the loader reads and validates the project file before trust is applied, an untrusted repository can make taiknr inert.",
      "rationale": "Joel's Q1(b) applies to any present-but-invalid file. If the untrusted project file is parsed at all, its rejection becomes a session-wide stop. The spec says untrusted project files are ignored, and Pi's docs say to call `isProjectTrusted()` *before reading* project-local config (research-chidi Q1). D9 keeps `ConfigPaths` as it is at HEAD. Those two constraints conflict, and the proposal does not resolve it.",
      "concrete_case": "A user clones an untrusted repo containing `.pi/pi-taiknr.json` = `{\"enabled\": \"nope\"}`. The composition root passes both paths, as `ConfigPaths` requires, and the loader validates both before the caller discards the project layer. The session is rejected, so taiknr is off and an error is shown about a file the spec says is ignored.",
      "recommendation": "The design should state the change explicitly. The smallest option is `projectConfigPath?: string`, which the composition root fills only when `ctx.isProjectTrusted()` is true. Another is an ordered list of layer paths, which also leaves room for the deferred env-var layer. Either way, name it as a revision of D9. Add a scenario: 'an untrusted project file that is malformed is never read and causes no rejection.'"
    },
    {
      "id": "CR-3",
      "severity": "major",
      "location": "specs/extension-packaging/spec.md MODIFIED 'Handler signatures and the import boundary are preserved' (requirement text and scenario 'Signatures unchanged')",
      "finding": "The requirement lets the 'config-carrying dependency types' change. But the same block says 'No other registrar's exported name, parameter order or types MAY change', and its scenario says the six registrars other than session-start keep their types. Turn-end and context are among those six, and their dependency type is the config-carrying one.",
      "rationale": "`registerTurnEndHandler(_pi, _deps: { config: TaiknrConfig; … })` and `registerContextHandler` (src/infra/pi-event-handlers/turn-end.ts, context.ts) carry the config. Under the holder/getter option for O1, the type of their second parameter changes. The scenario as written would then fail a gate that the requirement text claims to allow.",
      "concrete_case": "The design picks `getConfig: () => TaiknrConfig | undefined` in the turn-end deps. The reviewer compares turn-end.ts with HEAD: the parameter type changed, so the scenario 'six registrars … keep … types' is red, even though the change is the one the spec permits.",
      "recommendation": "List the exceptions by name: the session-start registrar's parameters, and the `config` member of the turn-end and context deps objects. State that `createPiJevScorerAdapter(ctx, config: TaiknrConfig)` stays the same, with the caller passing the resolved value. Then the scenario checks exactly those differences."
    },
    {
      "id": "CR-4",
      "severity": "major",
      "location": "specs/configuration/spec.md 'A present but malformed or invalid file…' scenario 'An unparsable file' (BOM-prefixed object) and 'Each rejection class has its own case'",
      "finding": "The spec treats a BOM-prefixed object as unparsable, which stops taiknr for the session. Pi itself strips the BOM before every JSON config read it does.",
      "rationale": "Trap 7 recorded that raw `JSON.parse` throws on a BOM. That is a fact about Node, not a ruling on the contract. Pi applies `stripBom` before `JSON.parse` in settings-manager.js:269 (settings.json), keybindings.js:289, model-config.js:139 (models.json), trust-manager.js:83, auth-storage.js:176 and extensions/mcp/config.js:48. Under the standing 'reflect the community' ruling (D2), the host's own convention is the closest precedent. Rejecting a BOM makes taiknr stricter than Pi on the same kind of file, with no gain in safety.",
      "concrete_case": "A user edits `<agent dir>/pi-taiknr.json` in an editor that saves UTF-8 with a BOM, for example Windows Notepad. Pi reads their settings.json from the same editor fine. taiknr reports 'unparsable' and is inert for the session, although the JSON is valid.",
      "recommendation": "Strip a leading U+FEFF before parsing. This is one line (`text.replace(/^\\uFEFF/, \"\")`) and needs no Pi import in src/config/. Keep `\"\"` and `\" \"` as rejections. Change the BOM test row so that a BOM-prefixed `{}` is accepted."
    },
    {
      "id": "CR-5",
      "severity": "major",
      "location": "proposal.md 'Missing files are silent'; specs/configuration/spec.md 'Neither file exists' scenario; S2",
      "finding": "'Missing' is not defined in terms of read errors. A plain `readFileSync`/`existsSync` treats a dangling symlink as absent and falls back to defaults without a word. Other errors (EACCES, EISDIR) are not classified at all.",
      "rationale": "Q1(b) is meant to keep the user from running on values they did not choose without knowing it. Joel manages `~/.pi/agent` files as symlinks from his dotfiles (owner-rulings 'Request'). Node follows the link, and a missing target gives ENOENT, the same as a missing file. Other errno values could either be swallowed or crash, depending on the code written.",
      "concrete_case": "`~/.pi/agent/pi-taiknr.json` is a symlink to `~/dotfiles/pi/pi-taiknr.json`, and the dotfile is renamed. At the next session start, ENOENT is treated as missing, taiknr runs on the defaults (threshold 0.5) and says nothing, while the user believes their 0.9 still applies. Likewise, a directory named `pi-taiknr.json` gives EISDIR, and the result is undefined in the proposal.",
      "recommendation": "The design should classify the cases as follows. ENOENT is 'absent' only when no directory entry exists: check with `lstatSync` or by catching ENOENT, then `lstat`. ENOTDIR (for example, `<cwd>/.pi` is a file) counts as absent. A dangling symlink, EACCES, EISDIR and any other read error are rejections that name the file. Read and catch the error rather than calling `existsSync` and then `readFileSync`. Add one test row each for a dangling symlink and a directory at that path."
    },
    {
      "id": "CR-6",
      "severity": "major",
      "location": "proposal.md 'Deliberately not in this change' (/taiknr command; enabled check); michael-orientation S13 ('a command assigns holder.enabled'), O6; specs/configuration/spec.md 'A clean seam…'",
      "finding": "The seam is described as a single assignable boolean. That leaves out two facts the Status card will run into. The holder lives only as long as one extension runtime. And turning taiknr back on mid-session finds the side state stale, because 'fully inert' skips hydration and settlement.",
      "rationale": "Pi loads a new extension runtime, which re-runs the factory, before every session_start: /new, /resume, /fork and /reload (docs/extensions.md L380-388). So an in-memory flip is lost at the next session replacement, and the file value comes back. Q3(a) says no hydration while off, so session_tree and session_compact handlers that do nothing leave the `InMemoryArchiveStore` on the old branch. `pendingOutputs` and `originalContentByEntryId` that were staged before the flip also stay behind.",
      "concrete_case": "Case 1: taiknr is on and a turn stages outputs into `pendingOutputs`. The user runs `/taiknr off`, navigates `/tree` to another branch (session_tree is skipped), then runs `/taiknr on`. At the next agent_before_settle, the stale pending outputs are committed against entries on the abandoned branch. At context, recall searches a store hydrated for the old branch. Case 2: `/taiknr off`, then `/new`. taiknr is back on, because the file says `enabled: true`.",
      "recommendation": "Name the seam as one operation in one module, for example `session.setEnabled(on, ctx)`, rather than a writable field. Its contract: turning on re-hydrates the store from `ctx.sessionManager` and clears transient staging; it refuses from `rejected`; its effect lasts until the next session_start, which re-reads the files. Make the O6 rule one exported predicate, for example `activeConfig(holder): TaiknrConfig | undefined`, that every handler body calls first, and session_start is exempt. I did not choose a facade that wraps `pi.on` at registration: it has to special-case session_start, and its typing against Pi's overloaded `on` is unverified."
    },
    {
      "id": "CR-7",
      "severity": "minor",
      "location": "proposal.md O3; specs/configuration/spec.md 'The report reaches a mode with no UI'",
      "finding": "O3 can be settled from source. A throw from the session_start handler reaches an error channel in every built-in mode. The design still has to fix the order of operations and the scope of the message.",
      "rationale": "`bindExtensions` stores `onError` and applies it to the runner before it awaits `emit(session_start)` (agent-session.js L2772-2776; same for reload, L3124-3130). Print and JSON modes write `Extension error (<path>): <msg>` to stderr (print-mode.js L86, where JSON mode shares runPrintMode). RPC sends `extension_error` (rpc-mode.js L267). Interactive mode calls `showExtensionError` (interactive-mode.js L1649). `ctx.ui.notify` is a no-op in JSON mode (docs L3266). If validation stops at the first error, fixing several mistakes takes one /reload per mistake.",
      "concrete_case": "The agent file has both `decisionTreshold` (a typo) and `minCharsToArchive: -1`, and the project file is malformed. A loader that stops at the first error needs three edit-and-/reload cycles. A handler that throws before it sets the holder to `rejected` leaves the holder `unresolved`. That is inert as well, but the seam can no longer report why.",
      "recommendation": "In session_start: resolve paths, set the holder to `rejected` with the message, then throw one `Error` whose message starts with `pi-taiknr:` and lists every failing file and field across both files. Do not also call notify. Hydration runs only after a successful resolve."
    },
    {
      "id": "CR-8",
      "severity": "minor",
      "location": "proposal.md O2; specs/configuration/spec.md 'Every field is validated…'",
      "finding": "typebox does not pay for itself here, and hand-written guards have two concrete edge cases the spec should pin down.",
      "rationale": "There are five flat scalar fields. With typebox, a formatter is still needed: the unknown-key error comes as root `additionalProperties` plus a redundant `schema is false` entry at `/x` (research-chidi Q4). It also adds a `peerDependencies` entry, and any future cli/ or mcp/ composition root would need typebox as a real dependency, which cuts against the 'host-free loader' requirement. Chidi's ecosystem sample is mixed (hand-written, zod and typebox all appear), so the community ruling (D2) does not settle it either way. With hand-written guards, an unknown-key check that uses `key in KNOWN` lets inherited names through, and `JSON.parse` turns `1e999` into `Infinity`.",
      "concrete_case": "`{\"toString\": 1}` passes a `key in DEFAULTS` unknown-key check because `toString` is inherited, so it is not rejected. `{\"decisionThreshold\": 1e999}` parses to `Infinity`. A naive `typeof === \"number\"` check followed by `<= 1` does reject it, but `minCharsToArchive: 1e999` passes a `>= 0` check unless `Number.isInteger` is used.",
      "recommendation": "Write the guards by hand as one per-field rule table in `src/config/`, which then holds the defaults, the validators and the field list. Check unknown keys with `Object.hasOwn` or a `Set` of known keys. Validate integers with `Number.isInteger`, and anything else in [0,1] with `Number.isFinite`. Add test rows for `toString`/`__proto__` keys and for `1e999`. No package.json change is needed."
    },
    {
      "id": "CR-9",
      "severity": "minor",
      "location": "proposal.md O5; feature-spec-standard §4 (operator observability)",
      "finding": "Pi gives extensions no logging channel. The design has to say where diagnostics go, or say plainly that the success path logs nothing, rather than assuming a log exists.",
      "rationale": "docs/extensions.md has no logger API. The options are `console.*`, which in TUI mode may draw over the screen (not checked), and `pi.appendEntry`, which writes an entry into the session file on every start and reload. The only signal guaranteed to show is the rejection throw (CR-7). One case is product-visible: a trusted-looking project file that is ignored because the project is untrusted produces no message at all.",
      "concrete_case": "A user puts `{\"enabled\": false}` in `.pi/pi-taiknr.json` in a repo they never trusted. taiknr stays on. No message, log line or readout explains why, so the user cannot tell whether the file was found.",
      "recommendation": "Record in the design that this change logs nothing on success. Rejection messages include the absolute resolved path. The readout of 'which files were present or trusted, and the outcome' moves to the Status card, which has a UI. Give the holder's state enough detail (the paths and whether the project file was ignored) for that card to read without re-resolving."
    },
    {
      "id": "CR-10",
      "severity": "minor",
      "location": "specs/configuration/spec.md 'The enabled switch turns taiknr fully off' scenarios 'A project file turns taiknr off for one project' and 'Stubs made before the switch stay stubbed'",
      "finding": "The behavioural 'off' scenarios cannot be tested in this change, because all seven handlers do nothing (Trap 12). The spec gives no indication of which card verifies them.",
      "rationale": "Every scenario in the spec should map to a test in tests/config (S7, S14). 'Stays stubbed and not recalled' needs the recall card's context handler. Without a deferral marker, this change either ships a SHALL with no test or tempts someone to write a test against an invented handler body.",
      "concrete_case": "A test for 'Stubs made before the switch stay stubbed' has nothing to check: no stub is ever created and the context handler returns nothing whatever `enabled` is. Either the test passes trivially, or the scenario has no test.",
      "recommendation": "In the design, mark these two scenarios as verified by the archive and recall cards through the CR-6 predicate. In this change, test only that the resolved holder state reflects `enabled`, and that the predicate returns undefined for `enabled: false`, `rejected` and `unresolved`."
    }
  ],
  "assumptions": [
    {
      "assumption": "Pi binds the extension error listener before it awaits the session_start emit, so a throw from session_start reaches stderr in print/JSON mode, extension_error in RPC mode, and the chat in TUI mode (agent-session.js L2772-2776, L3124-3130; print-mode.js L86; rpc-mode.js L267; interactive-mode.js L1649).",
      "status": "verified"
    },
    {
      "assumption": "Every session_start follows loading a new extension runtime, so the factory closure, and any holder in it, lasts exactly one session (docs/extensions.md L380-388).",
      "status": "verified"
    },
    {
      "assumption": "Project trust is resolved before session_start, and project_trust handlers run before project resources load (docs/extensions.md L377-378, L431), so `ctx.isProjectTrusted()` at session_start is final for that runtime.",
      "status": "verified"
    },
    {
      "assumption": "Pi strips a UTF-8 BOM before every JSON config read it does (settings-manager.js:269, keybindings.js:289, model-config.js:139, trust-manager.js:83, mcp/config.js:48).",
      "status": "verified"
    },
    {
      "assumption": "The entry test's Proxy fake throws on any `ExtensionAPI` member other than `on` at factory time (tests/app/extension/taiknr.test.ts). A holder built in the factory, plus `getAgentDir`/`CONFIG_DIR_NAME` used only inside session_start, keeps that test green.",
      "status": "verified"
    },
    {
      "assumption": "Node's `readFileSync` on a dangling symlink throws ENOENT, the same as a missing file.",
      "status": "unverified"
    },
    {
      "assumption": "`console.error` from an extension in TUI mode draws over the screen.",
      "status": "unverified"
    },
    {
      "assumption": "In RPC mode no other event (context, tool_call) can arrive before session_start finishes. If it can, the inert `unresolved` initial state from CR-1 makes it harmless.",
      "status": "unverified"
    },
    {
      "assumption": "A facade that wraps `pi.on` at registration would need awkward typing against Pi's overloaded `on` signatures.",
      "status": "unverified"
    }
  ],
  "owner_questions": [
    {
      "question": "When `enabled` is false, should taiknr say so at session start, or stay silent?",
      "options": [
        "Silent: off is a deliberate choice; the Status card's readout shows it later",
        "One notice per session start in UI modes (TUI/RPC), silent in print/JSON",
        "Always announce, including a stderr line in print/JSON"
      ],
      "recommended_option": "Silent: off is a deliberate choice; the Status card's readout shows it later",
      "why": "None of Joel's rulings covers this, and the user will see the result. Q3 says 'everything stops' but not whether it stops quietly. A notice at every /new, /resume and /reload would be repeated noise for someone who turned taiknr off on purpose. A broken file is still announced, because Q1(b) requires it. The cost of staying silent is that a forgotten project-level `enabled: false` gives no clue until the Status card ships its readout."
    }
  ],
  "not_checked": [
    "Did not run Pi or any test. Every error-surfacing claim comes from reading dist/ source.",
    "Did not measure typebox import or resolution under tsc/vitest with a peer entry.",
    "Did not check how JSON mode treats stdout writes from extensions beyond the output-guard redirect seen in output-guard.js.",
    "Did not check whether SDK embedders that never call bindExtensions with onError lose the rejection message.",
    "Did not check the dangling-symlink errno in a live Node run, or whether `pi -p` exits non-zero when taiknr's session_start throws.",
    "Did not survey ecosystem validation practice beyond Chidi's sample."
  ]
}