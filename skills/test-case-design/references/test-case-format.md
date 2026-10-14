# Test Case Format

How to write a test case so that anyone (or any agent) can execute it, automate it, and trace it — in Markdown in
the repo or exported to a test management tool.

Contents:

- [Template](#template)
- [Gherkin variant](#gherkin-variant)
- [Writing rules](#writing-rules)
- [Good vs bad](#good-vs-bad)
- [File organization](#file-organization)
- [Test management tool mapping](#test-management-tool-mapping)

---

## Template

```md
## TC-CONTRACT-021 — Manager approves a pending contract within approval limit

Verifies:   AC-CONTRACT-010 (BR-CONTRACT-005)
Technique:  Decision table, rule R5
Priority:   P0
Type:       Functional, positive
Layer:      API  (+ covered in UI journey TC-CONTRACT-001)
Automation: Automated — tests/api/contract-approval.api.spec.ts
Status:     Ready | Draft | Blocked by OQ-012 | Obsolete

Preconditions:
- Contract in PENDING_APPROVAL, amount 5 000, created by another user
- Logged in as a manager with approval limit 10 000

Test data:
- amount: 5 000 (inside limit; see TC-CONTRACT-023 for the limit boundary)

Steps:
1. Approve the contract.

Expected results:
1. Contract state is APPROVED.
2. Approver and approval time are recorded.
3. An audit event `contract.approved` exists for the contract.
4. The creator receives an approval notification.
```

Required fields: ID, title, Verifies, Priority, Preconditions, Steps, Expected results. Others when useful.

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
