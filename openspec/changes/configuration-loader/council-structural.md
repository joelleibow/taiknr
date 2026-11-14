{
  "mode": "council",
  "lens": "council-structural",
  "paraphrase_proposes": "",
  "paraphrase_existing": "",
  "recommendation": "Proceed to design, but the design must settle three structural gaps first: (1) state concretely how the trust gate reaches the path-taking loader and that trust is checked before the project file is ever read; (2) resolve O1 toward an explicit per-session holder with defined pre-start, resolved, user-off, and rejected states — not in-place mutation of a shared plain object, whose stale-state behavior across session replacement is a concrete failure; (3) name one inertness predicate at one seam that later cards reuse, backed by distinct states so a rejected file cannot be un-inerted by the deferred /taiknr on. Otherwise the spec set is structurally sound: scope exclusions are explicit and measurable, the loader stays host-free with one home, and the packaging delta bounds its own exception.",
  "findings": [
    {
      "id": "STR-1",
      "severity": "major",
      "location": "openspec/changes/configuration-loader/specs/configuration/spec.md — 'The project file is honoured only in a trusted project' vs 'Every field is validated…' and '…the loader is synchronous, host-free and takes its paths from its caller'",
      "finding": "The trust gate's mechanics and ordering are unspecified. The loader SHALL receive both paths from its caller and stay signature-fixed (D9), yet the trust requirement says the project file's values apply only when trusted. Nothing states how trust information reaches the merge: if the caller passes both paths unconditionally, the loader layers the project file and violates the trust requirement; and nothing states that the trust check precedes reading the file at all.",
      "rationale": "Pi trust exists precisely so an untrusted project's files cannot affect the extension; a loader that reads or validates a file before the trust decision lets an untrusted repository influence taiknr — up to bricking it for the session under Joel's loud-and-closed Q1(b) ruling.",
      "concrete_case": "cd into an untrusted clone whose <cwd>/<CONFIG_DIR_NAME>/pi-taiknr.json holds garbage JSON. If the loader validates before the trust gate, taiknr rejects the session and goes fully inert because of a file it had no business reading. Conversely, a valid untrusted project file with {enabled:false} silently turns taiknr off if the caller passes both paths and the loader has no trust input.",
      "recommendation": "The design states one mechanism: either the caller omits/nulls the project path when ctx.isProjectTrusted() is false (and the trust gate is documented as preceding the existence check and read), or the loader's signature gains a projectTrusted input — in which case that revision of D9 must be named alongside O1's. Add a spec scenario: 'untrusted project file is malformed → ignored, not rejected.'"
    },
    {
      "id": "STR-2",
      "severity": "major",
      "location": "openspec/changes/configuration-loader/proposal.md — Open Questions O1; specs/configuration/spec.md — 'Config is re-read at every session start'; michael-orientation.md Trap 2, Trap 8, O1 tightened",
      "finding": "O1's in-place-fill option creates an undefined stale-state transition across session replacement. If the shared TaiknrConfig object is filled at session_start and a session_start throws before the fill (the all-modes rejection path under O3, or any early throw), the object keeps the previous session's values, and there is no stated reset on session_shutdown or session_start.",
      "rationale": "Session replacement (/new, /resume, /fork, /reload) re-runs session_start with a possibly different cwd and trust state (Trap 8). A silently retained previous-session config is the classic brittle state transition: the failure mode is wrong behavior with no error, and handlers hold data typed as plain immutable values that is actually mutable shared state — which also blocks the deferred /taiknr command's clean assignment (O1 tightened).",
      "concrete_case": "Session A runs in a trusted project whose project file sets enabled:false. The user runs /resume into a different directory whose session_start throws during config resolution before the fill. Every subsequent turn_end/context call in session B reads session A's enabled:false (and its thresholds) — inert or misconfigured for the wrong reason, with nothing reported.",
      "recommendation": "Resolve O1 toward the holder/getter: one explicit per-session config holder created at factory time with a defined initial state (defaults or 'not yet resolved'), assigned exactly once per session_start, with its rejected state set by the catch path before hydration proceeds. The design names the holder's states and the assignment point as the single revision of D6's signature clause."
    },
    {
      "id": "STR-3",
      "severity": "major",
      "location": "openspec/changes/configuration-loader/proposal.md — 'What Changes' (broken file / enabled) and O6; specs/configuration/spec.md — 'A present but malformed or invalid file stops taiknr for the session' and 'The enabled switch turns taiknr fully off'",
      "finding": "Two distinct causes of 'taiknr does nothing this session' — a rejected file and enabled:false — are specified as separate behaviors with no single named predicate. O6 leaves where the enabled check lives open, and nothing says the two inertness causes share one seam. Three later cards (archive, recall, status) each risk inventing their own combination of checks.",
      "rationale": "One home for each fact: 'may taiknr act this turn' is a single business rule with two inputs. If it is implemented per handler or per card, the checks drift — e.g., one card checks only enabled and keeps acting after a rejected file. Keeping the states distinct also protects Joel's ruling that a rejected file holds until fixed: conflating rejection with enabled:false would let the deferred /taiknr on flip a broken-file session back on, violating Q1(b).",
      "concrete_case": "The archive card ships a handler that checks holder.enabled but not the rejection state; a session with a rejected agent file archives output because the user's last valid config had enabled:true. Or: the command card implements /taiknr on as holder.enabled = true, which un-inerts a rejected-file session the ruling says must stay closed.",
      "recommendation": "The design names one seam (the O1 holder) exposing one predicate — e.g., 'active' ANDs enabled with resolution-succeeded — and states that later cards check only that predicate. The underlying states stay distinct so the command can flip enabled but never resolution-failed. Record the seam in one sentence the Status card can cite (S13)."
    },
    {
      "id": "STR-4",
      "severity": "minor",
      "location": "openspec/changes/configuration-loader/specs/extension-packaging/spec.md — MODIFIED 'Handler signatures and the import boundary are preserved', scenario 'Signatures unchanged'",
      "finding": "The modified scenario's acceptance is circular: the session-start and dependency-contract changes are 'exactly the ones the design names', but the design does not exist yet, so the gate cannot compare against HEAD mechanically and the exception clause stays open-ended until then.",
      "rationale": "An unmeasurable scenario invites drift: any signature change can be post-hoc 'named by the design'. The structural invariant being protected — six registrars untouched, one bounded exception — deserves a fixed list.",
      "concrete_case": "A reviewer diffing the seven handler files against HEAD after implementation has no pre-committed list of permitted diffs and must reverse-engineer the design's intent from prose.",
      "recommendation": "Require the design to enumerate the concrete before/after signatures for the session-start registration and the config-carrying dependency types, and have the gate compare the diff against that enumerated list, not against 'what the design names'."
    },
    {
      "id": "STR-5",
      "severity": "minor",
      "location": "openspec/changes/configuration-loader/specs/configuration/spec.md — 'Config loading is tested without a Pi session'",
      "finding": "The configuration spec restates test conventions already owned by the living development-checks spec: explicit vitest expect/test imports, .js specifiers, tests mirroring src/, and collection by tests/**/*.test.ts. Two homes for the same rules.",
      "rationale": "Duplicated conventions drift: if development-checks changes its runner or import rules, the configuration requirement silently contradicts it, and the first-change precedent kept conventions in development-checks while capability specs held only behavior.",
      "concrete_case": "development-checks later permits test.describe blocks or changes the check chain; tests/config/ tests written to this requirement's letter still pass the configuration spec's scenarios while failing the living spec — or vice versa.",
      "recommendation": "Keep in the configuration requirement only the config-specific coverage list (defaults, layering, each rejection class, trust gate, enabled, re-read at session_start, no Pi runtime) and cite development-checks for the conventions instead of restating them."
    },
    {
      "id": "STR-6",
      "severity": "minor",
      "location": "openspec/changes/configuration-loader/proposal.md — 'What Changes' (resolution at session_start) and 'Impact'; michael-orientation.md §2 (seven-registration invariant), Trap 6, O3, O5",
      "finding": "Because the seven-registration invariant funnels every session-time concern through the single session-start handler, that handler is on track to inline path resolution calls, the trust read, file reading, rejection reporting (with the O3 all-modes mechanism), the ordering against store hydration, observability (O5), and the holder write — a god handler forming under the packaging constraint.",
      "rationale": "One responsibility per module: the handler should stay a thin Pi event bridge (the composition root's own comment says so). Config resolution is one orchestration with a result value; burying it inline makes the later cards' reuse (the command card re-validating before writing, per Trap 14(iii)) require reaching into handler internals.",
      "concrete_case": "The Status card later needs to re-run validation before persisting enabled; with resolution logic inlined in the session-start handler's body it must either duplicate the guards (second home for the validation rules) or import and fake an event context to re-run them.",
      "recommendation": "The design's Module & File Placement names one function — e.g., resolveSessionConfig(cwd, trusted) → {config} | {rejection} in src/config/ or a thin infra seam — that owns paths-into-loader, trust input, rejection classification, and the observability record, with the session-start handler reduced to: resolve, report on rejection, assign the holder, then hydrate. The design also states the resolve-before-hydrate order O3 requires."
    }
  ],
  "assumptions": [
    {
      "assumption": "src/config/taiknr-config.ts at HEAD has the four-field TaiknrConfig, DEFAULT_TAIKNR_CONFIG, ConfigPaths, and a loadTaiknrConfig that throws Not implemented.",
      "status": "verified"
    },
    {
      "assumption": "src/app/extension/taiknr.ts at HEAD passes DEFAULT_TAIKNR_CONFIG by value into the turn-end and context handler dependencies and registers exactly seven events.",
      "status": "verified"
    },
    {
      "assumption": "session_start always precedes the other six events within a session, so a config resolved there is available to every handler that needs it (claimed from Pi docs by Chidi and the orientation; Pi dist not read at source by this lens).",
      "status": "unverified"
    },
    {
      "assumption": "A throw from the session-start handler is caught per handler by runner.emit, is visible in every mode, and skips the rest of that handler (cited from Pi 1.5.2 runner.js by Chidi/Michael; not re-read by this lens).",
      "status": "unverified"
    },
    {
      "assumption": "Session replacement loads a fresh extension runtime, so a factory-created holder is per-session-instance and the stale-state risk in STR-2 is specifically a same-runtime throw path (e.g., rejection before fill, or a session_start in a runtime that is not replaced).",
      "status": "unverified"
    }
  ],
  "owner_questions": [
    {
      "question": "When a project is NOT trusted, should taiknr ignore its pi-taiknr.json entirely — never reading or validating it, even if the file is malformed — or should any present-but-broken file still reject the session as under Q1(b)?",
      "options": [
        "Ignore untrusted project files completely: never read, never validate; only the agent file and defaults apply, and a garbage file in an untrusted clone changes nothing",
        "Validate every present file regardless of trust: a malformed untrusted project file rejects the session and taiknr does nothing until it is fixed"
      ],
      "recommended_option": "Ignore untrusted project files completely",
      "why": "S4 says the project file's values 'are ignored otherwise', and Pi's trust boundary exists so untrusted project content cannot affect the extension; reading and rejecting would let a repository you merely cd into brick taiknr for the session. But Joel's Q1(b) ruling ('a present-but-malformed file… taiknr does nothing') was answered about files taiknr legitimately reads, and its letter does not distinguish the untrusted case — one sentence from Joel closes the gap the spec currently leaves open (STR-1)."
    }
  ],
  "not_checked": [
    "Pi 1.5.2 dist sources (runner.js, loader.js, types.d.ts, config.js) — relied on Chidi's and the orientation's citations, not re-read at source",
    "pi-jefferson and pi-omlx sources — relied on research-eleanor",
    "ARCHITECTURE.md, AGENTS.md, and ADR 0001–0003 — relied on the orientation's and Eleanor's quotations; the docs-pass items (S9, S15) were assumed as stated",
    "The living development-checks spec at full length — its test conventions were taken from Eleanor §4 and the orientation D7",
    "Any live Pi run or measurement — this lens performed no measurements beyond reading repository files at HEAD"
  ]
}