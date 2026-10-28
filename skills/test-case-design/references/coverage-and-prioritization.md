# Coverage and Prioritization

Deciding how much to test, in what order, and how to keep the suite lean as it grows.

Contents:

- [Requirement catalogue](#requirement-catalogue)
- [Coverage targets by risk](#coverage-targets-by-risk)
- [Priority](#priority)
- [Suite selection](#suite-selection)
- [Regression scope](#regression-scope)
- [Layer assignment](#layer-assignment)
- [Coverage summary per feature](#coverage-summary-per-feature)
- [One set of records, several views](#one-set-of-records-several-views)
- [Maintaining the suite](#maintaining-the-suite)
- [Review checklist](#review-checklist)

---

## Requirement catalogue

A **dated snapshot** of the product's requirement IDs, by kind, with the documents and the date or commit it was
taken from (`docs/test-cases/catalogue.md`):

| Kind | Example IDs |
|---|---|
| Functional requirements | FR-CUS-001 |
| Business rules | BR-CONTRACT-005, BR-404 |
| Acceptance criteria | AC-CONTRACT-010 |
| Decisions and assumptions the product documents | D-082, A-377 |
| Non-functional and API contract | NFR-SEC-001, API-ERR-001 |

- A case citing an ID that is not in the catalogue is **wrong, not the catalogue** — it catches typos and stale
  references. Refresh the snapshot deliberately (new date, reviewed diff), never by adding IDs to make cases pass.
- Coverage is measured **per ID**: the IDs no case names, by kind. The target for acceptance criteria is zero; every
  other uncovered ID is listed as a gap with its risk, never silently dropped.
- **An ID is a dated snapshot of its text.** When the text behind an ID changes, the cases written before the change
  are **stale** until someone re-reads them against the new text — mark them, don't assume they still hold.

```bash
python <skill-dir>/scripts/check_cases.py docs/test-cases --catalogue docs/test-cases/catalogue.md --trace traceability.csv
```

When the project has a knowledge base (`project-knowledge-base`), pass it instead of, or as well as, a catalogue file:

```bash
python <skill-dir>/scripts/check_cases.py docs/test-cases --kb ../gym-kb --trace traceability.csv
```

Every requirement ID the KB's sources mention is then in the catalogue, a `[S06 L29]` citation in a case must name a
live source and an existing line, and an evidence quote with a citation is verified against that line — the quote
stops being something a reviewer takes on trust. Two more things come with it:

- **Coverage by risk, not by AC.** The KB's testing view lists every rule with a number, limit, state or role; the
  report says "N of M testable rules have a case" and names the rest, and lists the *not testable yet* rows with
  the question each waits for. In the Gym CRM pilot the documents had 30 ACs but 52 testable rules and 27 blocked
  ones — AC coverage alone hid most of the risk.
- **No guessing on disputed rules.** A case marked `Basis: specified` that verifies a requirement disputed in a
  High or Medium conflict of the KB's analysis is an error: picking the "likely current" side and calling it
  specified encodes a guess as a requirement. Write it as an assumption that names the conflict (`C-6`) or its
  question (`KQ-05`); it becomes specified when the owner answers.

On a trial against the Gym CRM KB the checker refused a case asserting the disputed 30-day "expiring soon" window
as specified, and a quote that was the KB's paraphrase ("60 working minutes") rather than the source's words
("`reclaimMinutes` (60; 0 is off) working minutes").

checks IDs, required fields, basis, catalogue references and AC coverage (errors), and lists uncovered IDs, missing
evidence quotes, vague and status-only expected results (advisory). The lexical checks are hints: a check like
"is this result observable" flagged 16 % of a team's real expected results, almost all falsely, when measured on a
held-out set — so they never fail the run, and a tool tuned on the cases it is scored on proves nothing about its
accuracy.

This checker was measured the same way, on a catalogue it had never seen (Flow Fitness: 376 cases, 983 expected
results, designed and run by a team; 2026-10-28):

| Check | Result on the held-out set | Kept as |
|---|---|---|
| Errors (IDs, fields, basis, catalogue) | 0 errors on 376 cases; the 2 uncovered catalogue IDs are the 2 the team's own design document lists | error |
| "Vague" phrases | 0 flags — no false flags, but nothing to measure recall on | advisory |
| Status only, judged per result line (first version) | 98 of 983 lines (10 %), mostly false: the case checked the state on another line, and a case-insensitive pattern counted `201 with group FOREIGN` | replaced |
| Status only, judged per case (every result a bare code) | 11 cases (3 %); about half genuinely weak (`400 / 400 / 400 / 201`, no error code, nothing proving no change), half fine (anonymous `401`, read-only `200`) | advisory |

The per-case rule was chosen after seeing this set, so its 3 % is no longer a held-out figure; the next new catalogue
is where to measure it again. Read the advice as a reviewer's prompt, never as a verdict.

---

## Coverage targets by risk

Depth follows risk (P0–P3, see `sdet-automation-docs` → risk-based testing):

| Risk | Techniques expected | Negative coverage |
|---|---|---|
| P0 (money, security, core flow) | EP + 3-value BVA on every constrained input, full decision table, all valid **and** invalid state transitions, CRUD × role matrix, main + alternative + exception scenarios | Every rejection path |
| P1 | EP + 2-value BVA, decision table for rules with ≥ 3 conditions, all valid transitions + risky invalid ones, main + key alternative scenarios | Main rejection paths |
| P2 | EP, main scenario, key error cases | Representative |
| P3 | Main scenario or exploratory only | Optional |

Record any deliberate deviation ("invalid transitions for SUSPENDED skipped — state not reachable in v1") in the
feature file so the gap is visible, not accidental.

---

## Priority

Test-case priority = how bad it is if this specific behavior breaks, not how important the feature is overall:

```text
P0  breaks money, security, data integrity, or blocks the core flow for everyone
P1  breaks a significant flow or many users; workaround painful
P2  limited impact or easy workaround
P3  cosmetic / rare edge
```

A P0 feature has P2 test cases (a rarely used optional field) and a P2 feature can have a P0 case (an
authorization check). Typical P0s: money computed wrong, something consumed twice, an authorization bypass, silent
data loss.

Case priority (the order to **run** in) is a different scale from a defect's priority (the order to **fix** in) and
from severity (impact); those belong to the bug report (`qa-reporting`). Run P0 first and stop to report on a P0
failure.

---

## Suite selection

| Suite | Contains | Runs |
|---|---|---|
| Smoke | Is the build alive? Login, one P0 journey, health of key APIs | Every deploy, minutes |
| Sanity | P0 cases for the changed area | Every PR touching the area |
| Regression | All Ready automated cases, grouped by priority | Merge / nightly |
| Release | P0 + P1 automated + manual P0 cases not automated + exploratory charters for changed areas | Before release |

Tag cases (`@smoke`, `@P0`, `@area`) so suites are selections, not copies.

---

## Regression scope

Written with the cases, generated from them, two ways:

- **By area changed** — a table of area → case IDs ("Contracts: pricing, approval, lifecycle → TC-CON-001 …
  TC-CON-040").
- **By requirement** — each automated test is tagged with the IDs it verifies (`@req:BR-CONTRACT-005`), so a change
  to one requirement selects exactly its cases.

Either way, **always add** every P0 case and every case guarding a defect (a fixed bug's regression case, or a case
with an open known bug).

**Known bugs are bound to steps.** A case whose expected result is blocked by an open defect names the defect and
the step(s) it breaks. In a run, a failure at those steps is an *expected failure* (the case stays red-but-known
until the fix, then must pass); a failure at any other step is a **real failure**, and a pass means "retest the bug
— it may be fixed". The label sits beside the verdict and never replaces it.

---

## Layer assignment

Assign every case a layer when it's designed, following "lowest reliable layer":

```text
Rule / calculation / validation / permission / invalid transition → API (or unit if pure logic)
Cross-service effect (event published, record synced)               → Integration
User journey, UI-only behavior (focus, messages, layout)             → UI E2E
Visual appearance                                                    → Visual
Judgement / usability / first look at a new area                     → Manual / exploratory
```

A decision table with 12 columns is 12 API tests and one UI journey, not 12 UI tests.

---

## Coverage summary per feature

At the top of each feature's test-case file:

```md
## Coverage — Contract approval (FR-CONTRACT-004)

| Source | Item | Covered by |
|---|---|---|
| AC | AC-CONTRACT-010 | TC-CONTRACT-021 |
| AC | AC-CONTRACT-011 | TC-CONTRACT-022, -024 |
| BR-CONTRACT-005 | Decision table R1–R5 | TC-CONTRACT-020..025 |
| Boundaries | approval limit 9 999 / 10 000 / 10 001 | TC-CONTRACT-023 (data-driven) |
| State machine | PENDING_APPROVAL → APPROVED; approve from other 4 states | TC-CONTRACT-021, -026 |
| Gaps | Self-approval rule unspecified | OQ-012 |
```

Every AC has at least one TC; a TC with no AC is either missing a requirement (raise it) or unnecessary.

---

## One set of records, several views

When cases are read by people **and** run by an automated suite, keep one machine-readable set of case records
(the Markdown files in this format, or data files) and generate everything else from it, so the views never drift:

| View | Contents |
|---|---|
| Test design document | requirement analysis and the OQ register, techniques and why, the coverage model (design tables), the cases, traceability, gaps and assumption cases, risk-based order with the smoke set, regression scope |
| Test case list / CSV | every case; execution columns from the last real run, or "Not Run" ([column order](test-case-format.md#test-management-tool-mapping)) |
| Traceability CSV | requirement ID → case IDs (`check_cases.py --trace`) |

The generator also checks the views agree: every `api`/`ui` case has a test, every `manual` case has none, no test
names an unknown case. Every figure in the design document is a count from the records; nobody types a number.

---

## Maintaining the suite

- **Requirement change** → find TCs by the changed BR/AC ID, mark them stale, re-read them against the new text,
  update or obsolete them in the same change; refresh the catalogue snapshot.
- **OQ answered** → the answer goes into the requirement; the dependent cases switch to `specified` with a quote.
- **Escaped defect** → add the missing case (and ask which technique would have found it).
- **Duplicates** → two cases with the same preconditions, action, and expected result: merge.
- **Never-failing, low-risk cases** at an expensive layer → move down a layer or retire.
- **Obsolete** cases are marked, then removed after the next release; IDs are never reused.

---

## Review checklist

```text
[ ] Every AC of the feature has ≥ 1 TC; every TC names catalogue IDs only (check_cases.py clean)
[ ] Every case has a Basis; assumption cases say which result is assumed and link the OQ
[ ] Specified expected results carry a verbatim Evidence quote; product terms spelled as the product spells them
[ ] Clear clauses of unclear criteria designed; only the unclear clause went to an OQ
[ ] Techniques chosen per risk level, with why; coverage summary filled
[ ] Boundaries on every stated limit (P0/P1), including beyond the range; no case for an unstated limit
[ ] Decision tables for multi-condition rules, including the "other" column; gaps raised as OQs
[ ] Valid and invalid state transitions for entities with a lifecycle
[ ] Permissions: privilege boundary per action, signed-out, in-module actions, the API; data scope
[ ] Pairwise tables verified by program, with the reason pairwise is enough
[ ] Negative cases assert rejection AND no state change; no status-only or fragment-only checks
[ ] One behavior per case; cases independent; dates relative to the run
[ ] Priority, level (manual with reason) and smoke set assigned; regression scope written
[ ] Known bugs bound to the steps they break; no execution results in design files
[ ] No secrets or real personal data in test data
```
