# Open Questions

Snapshot: 2026-11-03. Every entry is OPEN. A rule that depends on an open entry is marked `Source: ASSUMPTION`
in BUSINESS_RULES.md and `Basis: assumption` here; test cases written against it carry the same basis. When an
entry is answered: record the decision here, propagate it to the BR / FR / AC / matrix / catalogue, and add a
CHANGELOG entry.

## OQ-001 — How long after payment may a paid order still be cancelled?

Status: OPEN
Owner: Product Owner
Priority: High
Raised: 2026-11-03
Basis: assumption
Blocks: BR-ORD-006, FR-ORD-004, AC-ORD-034

Question:
S1 sentence 5 allows `paid` → `cancelled` without a time limit. A paid order that is cancelled after the manager
has started shipping it is a refund problem. Is there a window, and how long is it?

Options:
A. No window: a paid order may be cancelled until it is shipped.
B. 24 hours after `paid_at`; later cancellation answers 409 (working assumption).
C. A configurable window per tenant.

Impact:
Decides whether `paid_at` must be stored (DATA_MODEL.md), whether the window is a configurable value
(CONFIGURATION_RULES.md), and the boundary cases in AC-ORD-034.

Decision:
(pending)

AI Agent Instruction:
DO NOT IMPLEMENT this behavior until the decision is resolved. The working assumption (B) exists only so tests
can be designed; mark them `Basis: assumption`.

## OQ-002 — Is a note longer than 200 characters rejected or shortened?

Status: OPEN
Owner: Product Owner
Priority: Medium
Raised: 2026-11-03
Basis: assumption
Blocks: BR-ORD-003, FR-ORD-001, FR-ORD-003, AC-ORD-004, AC-ORD-024

Question:
S1 sentence 4 says "at most 200 characters". The reference implementation (S2, `create_order` and the PATCH
branch) silently keeps the first 200 characters and answers 201/200. Which is wanted?

Options:
A. Reject with 400 and an error naming the field; nothing is stored (working assumption — a silent cut loses data
   the customer typed).
B. Keep the reference behaviour: store the first 200 characters, answer success.

Impact:
AC-ORD-003/004/024 and the syntax-testing cases depend on it; the reference server currently fails option A.

Decision:
(pending)

AI Agent Instruction:
DO NOT IMPLEMENT until resolved; tests written against option A carry `Basis: assumption`.

## OQ-003 — Is there a cap on a customer's open orders?

Status: OPEN
Owner: Product Owner
Priority: Medium
Raised: 2026-11-03
Basis: assumption
Blocks: BR-ORD-007, FR-ORD-001, AC-ORD-006, AC-ORD-007

Question:
Nothing in S1 limits how many orders a customer may leave in `new`. Without a limit a single account can fill the
store. Is a cap wanted, and what counts as "open"?

Options:
A. No cap.
B. At most 5 orders in status `new` per customer; the next creation answers 409 (working assumption).
C. A cap on `new` + `paid` together.

Impact:
Create flow validation, a configurable value, and a counting rule that must be computed in one place.

Decision:
(pending)

AI Agent Instruction:
DO NOT IMPLEMENT until resolved; tests carry `Basis: assumption`.

## OQ-004 — May the admin pay, ship or cancel an order?

Status: OPEN
Owner: Product Owner
Priority: Medium
Raised: 2026-11-03
Basis: assumption
Blocks: BR-ORD-002, FR-ORD-004, AC-ORD-036, matrix rows AZ-030, AZ-036, AZ-043

Question:
S1 sentence 8 says the admin "sees all but may not create", and S2 lets the admin delete (AZ-014). The lifecycle
actions are new (ADR-003). Working assumption: the admin is an operator, not a party to any order, so pay, ship and
cancel answer 403 for the admin, as create does.

Options:
A. Admin may not transition orders (working assumption, 403).
B. Admin may perform every transition a tenant manager may.

Impact:
Three matrix rows and AC-ORD-036.

Decision:
(pending)

AI Agent Instruction:
DO NOT IMPLEMENT until resolved; the matrix rows stand as the testable assumption.

## OQ-005 — May the note be edited once the order is shipped or cancelled?

Status: OPEN
Owner: Product Owner
Priority: Low
Raised: 2026-11-03
Basis: assumption
Blocks: BR-ORD-004, FR-ORD-003

Question:
S1 sentence 6 allows editing `note` with no state condition; S2 allows PATCH in every status. Working assumption:
the note stays editable in every status (no rule, no AC); if the business wants terminal orders frozen this becomes
a BR with a 409 case.

Options:
A. Editable in every status (working assumption).
B. Read-only once terminal (`shipped`, `cancelled`), answering 409.

Impact:
One additional rule and AC in FR-ORD-003 if B.

Decision:
(pending)

AI Agent Instruction:
Implement A only as "no check"; add nothing for B until resolved.

## OQ-006 — May a manager create orders and edit notes?

Status: OPEN
Owner: Product Owner
Priority: Medium
Raised: 2026-11-03
Basis: assumption
Blocks: BR-ORD-002, FR-ORD-001, FR-ORD-003, matrix rows AZ-049, AZ-051

Question:
S1 sentence 6 names customers as the ones who create and edit; sentence 7 gives managers "see every order ... and
may delete" and is silent on create/edit. S2 lets a manager create (any non-admin may) and edit the note of any
order it can see. Working assumption: keep S2 (manager may create for themselves and edit notes in their tenant),
because the brief does not forbid it and the reference tests assume it.

Options:
A. Manager may create and edit notes within the tenant (working assumption, matches S2).
B. Manager is read/ship/cancel/delete only: create and PATCH answer 403.

Impact:
Matrix rows AZ-049 and AZ-051 flip from 201/200 to 403 under B.

Decision:
(pending)

AI Agent Instruction:
DO NOT change the two rows until resolved; tests on them carry `Basis: assumption`.
