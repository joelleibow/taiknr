# 0010. Widen the Disclosure Split for Output Excerpts and the Opt-In Summary

## Status

Accepted

## Context

ADR 0007 split disclosure by destination and fixed the classifier's share at the stub alone: "no item's raw text and no image". Two measurements changed what that share costs and what it buys.

Sending each candidate's first 600 units of output beside its stub moved relevance enough to ship. On 151 labelled requests the shipped default recalls 9.4 items per request, of which 2.4 are irrelevant, against 9.2 with 3.0 irrelevant before; on top-level messages it recalls 1.9 at a precision of 0.86 against 3.2 at 0.55. A conversation summary written after each response, then carried in the scoring request, beat no summary on how well it ranks top-level results — about 0.85 to 0.88 against 0.70 — while costing $0.0017 and a median 3,087 ms per response.

Joel ruled on 2026-11-19 that excerpts and the summary are part of what ships, that the summary is opt-in through configuration, and that an accepted record is never edited: "If raw-output excerpts ship, a new ADR supersedes or narrows ADR 0007." This record does the narrowing. ADR 0007 stays Accepted and unchanged, and still governs everything this record does not reach: recall on `context_with_system`, the size bound and the exposure it accepts, and the stub as the classifier's ordinary share.

Two alternatives were weighed. No excerpts at all: measured worse than the request that carries them, so the change would have shipped less than it measured. Excerpts and the summary both on by default: the summary spends money on every response and sends a second stream of text off the machine, so it waits for a user to ask for it.

## Decision

**The classifier's provider receives three things, and each is bounded.** The newest user message's text; each eligible archived item's stub; and that item's first 600 UTF-16 units of raw text, with one leading codemode wrapper removed and no surrogate pair cut. When the summary is enabled it also receives the session's current summary. It never receives an image, and it never receives more of an output than those 600 units.

**The excerpt is part of the default request.** There is no setting that removes it while recall is on, because it was measured as part of the set that ships at all.

**The summarizer's provider is a third destination, and it is reached only when a user enables the summary.** One call per settled run carries the conversation read from the session's root-to-leaf branch: the text of each user and assistant message, and after each assistant message one line per tool call giving the tool's name and its arguments as JSON cut to 200 units. Tool results, shell executions, custom messages and compaction summaries contribute nothing. Above 60,000 units the input is the first user part whole, then a marker, then the last 55,000 units.

**The main model's provider keeps the share ADR 0007 gave it:** the full raw text of every output recall appends, inside the request that carries the block.

**Disclosure is still split by destination, not by a filter.** No request-time redaction covers any of the three paths, and taiknr adds none. An output that must not leave the machine has to be excluded before it is archived, or by a persisted edit another extension makes.

**The summary is state and not a record.** It lives for one session, the next settled run's summary replaces it, and a request uses it only when that request's newest assistant message is the one the summary was written for. Nothing about it is persisted, so ADR 0007's "a resumed session, a `/tree` jump and a compaction carry no recall state to reconcile" stays true in substance: a resumed session carries no summary, and a jump to another branch has its summary refused by the match rule rather than reconciled.

## Consequences

**Easier:**

- The classifier judges an output on its first 600 units instead of on a one-line description, which is what the measured gain in relevance rests on.
- The body of an output past its opening still never reaches the classifier, so the most sensitive part of a long result stays local.
- A user who wants no conversation text to leave the machine gets that by leaving the summary off, and pays only for recall.

**More difficult:**

- Every user's classifier provider receives output text from the first scored message after the upgrade, with no opt-in and no way to turn the excerpt off short of turning recall off.
- An opted-in user discloses the conversation itself, and each tool call's arguments, to a provider they configured: a second relationship to secure and a second bill, on top of the classifier's.
- One output's arguments can now leave twice — cut to 120 units in the stub, and cut to 200 units in the summary's tool-call line.
- A redactor that rewrites requests never sees the excerpt or the summary's text, because both are built inside taiknr's own scoring path.
- The summary's session lifetime means a resumed session scores its first message as if no summary existed. That is the price of keeping the match rule exact, and it is paid silently.
