{
  "mode": "council",
  "lens": "council-comprehension",
  "paraphrase_proposes": "",
  "paraphrase_existing": "",
  "recommendation": "Resolve cross-extension edit conflicts and make archive limitations explicit to users; specify deterministic extraction and recovery behavior before design.",
  "findings": [
    {
      "id": "C1",
      "severity": "major",
      "location": "specs/archive-stubbing/spec.md — Settlement commits only items the active branch still holds; Settlement replaces the tool result's content",
      "finding": "The contract preserves earlier extensions' drafts but does not say what happens when an earlier draft replaces the same tool result with non-null content. Taiknr's later edit can override that replacement, while its stub and side-store record are derived from the original result.",
      "rationale": "An extension author cannot tell whether their content edit will survive, and a redaction extension's intended protection can be defeated in the model-visible stub preview. Preserving a draft is not the same as preserving its effect under latest-edit-wins.",
      "concrete_case": "An earlier boundary handler replaces a tool result with redacted text; taiknr then appends a stub containing the first lines of the unredacted original and stores that original in its custom entry.",
      "recommendation": "Define a same-target non-null edit conflict policy, including which content may appear in the stub and archive, and test it with a prior extension's redaction draft. Skipping conflicting candidates is one option that preserves the settled draft-order rule."
    },
    {
      "id": "C2",
      "severity": "major",
      "location": "specs/archive-stubbing/spec.md — A committed batch is recorded once as a side-store entry; research-chidi.md §2",
      "finding": "The proposed observable meaning of 'committed' is unclear when another boundary handler replaces the returned draft list or a later append fails. The research says handlers can replace earlier proposals and persistence is not transactional, but the spec describes replacement and side-store recording as one committed batch.",
      "rationale": "A user or integrator needs to know whether a visible stub is guaranteed to have a recoverable archive record; an in-memory batch can otherwise disagree with the session after a failed or superseded boundary.",
      "concrete_case": "Taiknr proposes multiple edits followed by a side-store entry, but persistence fails after an edit was appended and before the custom entry, or a later extension replaces the boundary's entries.",
      "recommendation": "Specify the achievable success and failure contract, including reconciliation of in-memory state with persisted entries, and exercise the supported failure or competing-handler path in a session-level test. If the host cannot guarantee atomicity, state the limitation rather than promising an unconditional batch commit."
    },
    {
      "id": "C3",
      "severity": "major",
      "location": "proposal.md — What Changes; specs/archive-stubbing/spec.md — Settlement replaces the tool result's content; research-chidi.md §3–4",
      "finding": "The user-facing effect can be mistaken for deletion or redaction: context edits leave the original tool result in the session, and the archive also records its raw text in a custom entry. Pi's researched behavior also says these edits do not modify the UI or exports.",
      "rationale": "Users handling secrets or large outputs need to know both the persistence/privacy implications and why they may still see the original output outside model context.",
      "concrete_case": "A tool prints an API token; after the result is stubbed, the original text remains in the session history and in the taiknr side-store record, even though the next model context uses a stub.",
      "recommendation": "Include a concise user-facing explanation in the planned docs pass: stubbing reduces model context, is not redaction or deletion, raw session data remains, and UI/export behavior differs from model projection."
    },
    {
      "id": "C4",
      "severity": "major",
      "location": "specs/archive-stubbing/spec.md — A tool result carrying no text is never staged; proposal.md — Open Questions O2",
      "finding": "The empty-text rule and the unspecified multi-block join leave an edge case ambiguous: a separator can make wholly empty text blocks look non-empty.",
      "rationale": "At the valid zero threshold an image-only or empty result must not acquire a stub; a naive newline join can violate that promise and change threshold decisions and preview counts.",
      "concrete_case": "A result contains two text blocks whose text is empty plus an image. Joining the text blocks with a newline yields a one-character string and can cause it to be staged at minCharsToArchive 0.",
      "recommendation": "Require at least one non-empty text block before joining; specify the separator and whether it contributes to threshold and raw-length counts, and add tests for all-empty and mixed empty/non-empty blocks."
    },
    {
      "id": "C5",
      "severity": "minor",
      "location": "specs/branch-hydration/spec.md — A foreign or malformed side-store entry is skipped",
      "finding": "The duplicate-id scenario promises one retained item but does not identify which item wins when their data differs.",
      "rationale": "The same persisted branch could produce different recalled text depending on adapter or map implementation, making corruption and recovery behavior hard to explain or test.",
      "concrete_case": "Two valid side-store entries on the active branch contain the same id but different rawText and stub values.",
      "recommendation": "Specify a deterministic winner, such as the last well-formed item in root-to-leaf order, and test differing duplicate values."
    },
    {
      "id": "C6",
      "severity": "minor",
      "location": "specs/archive-stubbing/spec.md — A staged item waits until a settled run can commit it; research-chidi.md §5",
      "finding": "Pending results are retained only in the current runtime, but the spec names only a session ending as the silent loss case. Pi reload, resume, new, and fork replace the extension runtime, so users may not recognize that carry-forward can stop before a later settlement.",
      "rationale": "After an aborted run, 'waits until a settled run' can sound durable across reloads or session changes, even though pending outputs have not been recorded as an archive batch.",
      "concrete_case": "A user aborts after a large result is staged, runs /reload before the next settled run, and later expects that result to be stubbed and recallable.",
      "recommendation": "Explicitly bound carry-forward to the current extension runtime, document that reload or other runtime replacement can leave pending outputs raw and unarchived, and test at least reload or restart."
    },
    {
      "id": "C7",
      "severity": "minor",
      "location": "specs/branch-hydration/spec.md — Hydration runs only while taiknr is on and the session is active; proposal.md — Open Questions O6",
      "finding": "Re-enabling after starting disabled does not hydrate until a tree navigation or compaction, and malformed side-store entries are skipped without a user-facing signal. Neither operational limitation is clearly explained to a user inspecting missing archive contents.",
      "rationale": "An empty or incomplete archive can be mistaken for successful recovery, while the status command and logging are intentionally out of scope.",
      "concrete_case": "A session starts disabled on an archived branch, is later enabled, and the user expects old items to be available immediately; alternatively, a corrupt batch is silently skipped on resume.",
      "recommendation": "Document the re-enable hydration trigger and silent-skip behavior, plus how an operator can inspect persisted session entries and what remains recoverable. Keep the settled no-console and no-status-command scope."
    }
  ],
  "assumptions": [
    {
      "assumption": "A same-boundary non-null context edit by another extension can target a tool-result entry also staged by taiknr.",
      "status": "verified"
    },
    {
      "assumption": "Pending candidates exist only in extension runtime memory and are not persisted until a successful settlement batch.",
      "status": "verified"
    },
    {
      "assumption": "Archived tool text is retained on the active branch across compaction without an archive-size cap in this change.",
      "status": "verified"
    }
  ],
  "owner_questions": [],
  "not_checked": [
    "Repository source and live Pi behavior were not independently checked; platform and code claims rely on the supplied research and orientation.",
    "No live model, provider, TUI, or network call was run."
  ]
}