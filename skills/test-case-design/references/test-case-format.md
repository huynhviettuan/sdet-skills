# Test Case Format

How to write a test case so that anyone (or any agent) can execute it, automate it, and trace it — in Markdown in
the repo or exported to a test management tool.

Contents:

- [Template](#template)
- [Fields](#fields)
- [Gherkin variant](#gherkin-variant)
- [Writing rules](#writing-rules)
- [Assumption cases and open questions](#assumption-cases-and-open-questions)
- [Good vs bad](#good-vs-bad)
- [File organization](#file-organization)
- [Test management tool mapping](#test-management-tool-mapping)

---

## Template

```md
## TC-CONTRACT-021 — Manager approves a pending contract within approval limit

Verifies:   AC-CONTRACT-010, BR-CONTRACT-005
Basis:      specified
Technique:  Decision table, column R5
Priority:   P0
Smoke:      yes
Type:       Functional, positive
Level:      api  (+ covered in UI journey TC-CONTRACT-001)
Automation: Automated — tests/api/contract-approval.api.spec.ts
Status:     Ready

Preconditions:
- Contract in PENDING_APPROVAL, amount 5 000, created by another user
- Logged in as a manager with approval limit 10 000

Test data:
- amount: 5 000 — the "within limit" partition (the 10 000 boundary is TC-CONTRACT-023)

Steps:
1. Approve the contract.

Expected results:
1. Contract state is APPROVED.
   Evidence: "A manager may approve a pending contract whose amount is within their approval limit" — BR-CONTRACT-005
2. Approver and approval time are recorded on the contract.
   Evidence: "Approval records who approved and when" — AC-CONTRACT-010
3. An audit event `contract.approved` exists for the contract.
   Evidence: "Every approval is written to the audit log as contract.approved" — BR-AUDIT-002
```

`scripts/check_cases.py` reads this format: every field is `Name: value` at the start of a line, expected results
are numbered, and evidence is an indented `Evidence:` line under the result it supports.

---

## Fields

| Field | Required | Contents |
|---|---|---|
| ID, title | yes | `TC-<AREA>-NNN — <expected behavior>`; IDs are never reused |
| Verifies | yes | the requirement IDs (`AC-`, `BR-`, `FR-`, decisions) the expected results follow from; each must be in the [requirement catalogue](coverage-and-prioritization.md#requirement-catalogue) |
| Basis | yes | `specified` (every expected result follows from the cited requirements) or `assumption` |
| Assumptions | with `assumption` | exactly which expected result the documents don't support, e.g. "No body size limit is documented; the case only requires a 4xx, never a 5xx" |
| Open questions | when any | the `OQ-` entries the case depends on |
| Technique | yes | the technique and the element it covers: partition, boundary, column, transition, matrix cell |
| Priority | yes | P0–P3 ([priority](coverage-and-prioritization.md#priority)); `Smoke: yes` for the per-PR set |
| Level | yes | `api`, `ui`, or `manual — <why it can't be automated>` |
| Test data | for boundaries and classes | each value with the partition or boundary it represents; dates relative to the run ("today + 30 days"), never a fixed calendar date that expires |
| Preconditions, Steps | yes | state, not how to reach it; actions |
| Expected results | yes | numbered, observable, each with an `Evidence:` quote when Basis is `specified`; when the requirements live in a `project-knowledge-base`, end the quote with its citation (`— BR-CON-005 [S06 L29]`) and `check_cases.py --kb` verifies the quote against that line |
| Known bug | when one is open | the defect ID **and the step(s) it breaks**: an automated test fails expectedly only at those steps; a failure anywhere else is a real failure |
| Exclusive | when needed | the case needs the environment to itself (changes global settings, clears a queue); runners never run it in parallel |
| Refs | optional | user stories, the customer's trial scripts or feedback, past defects, the product's own test IDs |
| Automation, Status | when useful | `Draft`, `Ready`, `Blocked by OQ-012`, `Obsolete — <reason>` |

**Execution fields** (actual result, Pass/Fail/Blocked, defect, environment, build) are never written at design
time; they come from a real run, and a case that never ran reads "Not Run".

---

## Gherkin variant

Use when stakeholders read scenarios or the team runs BDD (see `sdet-framework-architect` for when full Gherkin is
worth it):

```gherkin
@TC-CONTRACT-021 @AC-CONTRACT-010 @P0
Scenario: Manager approves a pending contract within approval limit
  Given a contract of 5000 pending approval, created by another user
  And I am a manager with an approval limit of 10000
  When I approve the contract
  Then the contract state is APPROVED
  And an audit event "contract.approved" is recorded
  And the creator is notified
```

Write Gherkin declaratively (business intent: "I approve the contract"), never imperatively ("I click the button
with id approve-btn").

---

## Writing rules

- **One behavior per test case.** A title with "and" usually hides two tests.
- **Title = expected behavior**, not steps: "Customer cannot view another customer's order", not "Open order page
  with other id".
- **Preconditions state the setup, not how to do it** ("Contract in PENDING_APPROVAL"), so automation can create it
  via API while a manual tester uses the UI.
- **Steps are actions; expected results are observable outcomes.** Every step that matters has a result; results
  name concrete values ("total is 95.00"), never "works correctly" / "is displayed properly".
- **Expected results come from the requirement**, never from current behavior of the application. If the
  requirement is silent → OPEN QUESTION, not a guess.
- **Quote while you write.** Each expected result carries the verbatim sentence it follows from; a reviewer checks
  the quote, not your prose, and a result you cannot quote is an assumption, however confident it reads. Quotes do
  not retrofit: when an agent's 105 finished steps were matched back to their sources afterwards, 4 found a quote,
  because the results had been written in the author's words (manual-qa-agent ADR-0025).
- **Use the product's words.** Statuses, codes, labels and messages exactly as the requirement or the UI's own
  option lists spell them (`PARTIAL`, `VALIDATION_FAILED`, "Đã thanh toán").
- **No weak checks.** An API expected result that names only a status code, a text check on a fragment shorter than
  about 8 characters, or steps after the last expected result all prove less than they appear to; say what changed,
  what didn't, and what the caller sees.
- **Negative tests assert two things**: the rejection (status/message) and that nothing changed.
- **Independent**: no test case depends on another having run first.
- **Concrete test data** for anything boundary-sensitive; reference partitions/boundaries by technique.
- **Layer-neutral where possible**: describe behavior so the same case can be automated at API or UI level; put
  UI-only checks (layout, focus, messages) in UI-specific cases.
- **No secrets or real personal data** in test data.

---

## Good vs bad

| Bad | Problem | Good |
|---|---|---|
| "Test login" | No behavior, no expected result | "Locked account cannot sign in and sees the lockout message" |
| "Verify the page works properly" | Unobservable result | "Order list shows 20 rows and a link to page 2" |
| Steps 1–15 covering create, edit, approve, delete | Several behaviors; a step-3 failure blocks the rest | Four test cases, each with API setup |
| "Enter an invalid quantity" | Which one? | "Enter quantity 501 (max 500 + 1)" |
| Expected result copied from what the app currently does | Encodes bugs as requirements | Expected result from BR/AC; mismatch = bug or OQ |
| "Click #btn-approve" | Bound to the implementation | "Approve the contract" |
| "Returns 400" | Passes when the request fails for any reason; nothing proves no change | "400 `VALIDATION_FAILED` with a field error on `sessions`; the customer's contract list is unchanged" |
| A criterion with one unclear clause, sent back whole as a question | The clear clauses go undesigned | Design the clear clauses now, quoted; one OQ for the unclear clause |
| Expiry date "2026-12-31" | Fails the day it passes | "today + 30 days", computed when the run starts |

---

## Assumption cases and open questions

When a requirement leaves a material point open (a limit, a message, a role, a rounding rule, precedence):

1. Raise one precise `OQ-` for the requirement's owner, and record the product's **current behaviour, labelled
   observed, not a requirement**, so the owner has something concrete to accept or reject.
2. Cases that depend on it are `Basis: assumption`, with the Assumptions line, and list the OQ.
3. Write the expected result so it is **safe either way** when you can: "any 4xx in the error contract; never a
   5xx" instead of a guessed exact code.
4. **Don't test a boundary the documents don't state** (a name length nobody specified): record the question, not a
   case asserting today's limit.
5. When the answer arrives it goes into the requirement first; then the case switches to `specified`, gets its
   quote, and the label goes.

An automated test of an assumption case records what it saw (`observed: freezing a frozen contract answered 200`),
so the register's "current behaviour" comes from the latest run, not from memory.

---

## File organization

In the repo, one file per feature, mirroring the product's feature specs:

```text
docs/test-cases/
├── README.md                     # format, ID scheme, how to add cases
├── contract-approval.md          # TC-CONTRACT-0xx, header lists covered ACs
├── order-checkout.md
└── security/
    └── access-control.md         # TC-SEC-…
```

Each file starts with: feature, FR/AC IDs covered, techniques used, and the coverage summary (which partitions,
boundaries, rule columns, transitions are covered and by which TC).

IDs are never reused or renumbered; obsolete cases are marked `Status: Obsolete` with a reason, then removed after
the next release.

---

## Test management tool mapping

When cases are exported to a TCMS (Kiwi TCMS, TestRail, Xray, Zephyr, Azure Test Plans…), map fields once and keep
the Markdown (or the tool) as the single source — never edit both.

| This format | Typical TCMS field |
|---|---|
| ID (`TC-…`) | Custom field / external id / summary prefix |
| Title | Summary / title |
| Verifies (AC/BR) | Requirement link / tag / custom field |
| Priority | Priority |
| Type, Layer, Technique | Tags / category |
| Automation | Automation status + script path |
| Preconditions | Preconditions / setup |
| Steps / Expected results | Step table (action / expected) |
| Status | Case status (Draft / Ready / Obsolete) |
| Basis, Assumptions, Open questions | Custom fields or notes |
| Evidence | Expected-result column (quote after the result) |

For spreadsheets and CSV imports, one row per case in this column order: Test Case ID, Requirement ID(s), Title,
Feature/Module, Technique(s), Test Type, Priority, Preconditions, Test Data, Steps, Expected Results, Basis,
Assumptions, Open Questions, Actual Result, Status, Defect ID, Environment, Notes, Automation Candidate. Join list
fields with line breaks inside the quoted cell, write UTF-8 **with BOM** so spreadsheet programs keep accented text,
and fill the execution columns only from the last real run ("Not Run" otherwise).
