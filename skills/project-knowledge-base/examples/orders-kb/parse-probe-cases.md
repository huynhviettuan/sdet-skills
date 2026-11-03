# Parsing probe — two cases against the Orders KB

Not a test design. These two cases exist so that `test-case-design/scripts/check_cases.py --kb kb` has something
to parse while it reads the KB's "Testable rules" and "Not testable yet" tables: one specified case whose evidence
quote is checked against a source line, and one assumption case on the disputed cancellation rule (C-1) that
names its question, as the checker requires. Citations point at `kb/_sources/text/`.

## TC-ORD-001 — A note of 201 characters is stored as its first 200 characters

Verifies:   FR-ORD-02
Basis:      specified
Technique:  Boundary value analysis, the 201 boundary of the note length
Priority:   P1
Type:       Functional, negative
Level:      api
Refs:       C-3 (wording only; the PRD's exact number is used)

Preconditions:
- Signed in as a customer of tenant-a

Test data:
- note: 201 characters — the "over the limit" boundary (200 itself is a separate case)

Steps:
1. Create an order with the 201-character note.

Expected results:
1. The order is created and its note is the first 200 characters of the input.
   Evidence: "Longer input is cut to 200 characters, not rejected" — FR-ORD-02 [S01 L25]

## TC-ORD-002 — A customer cancelling a paid order after 24 hours is refused with 409

Verifies:   BR-ORD-03, D-01
Basis:      assumption
Assumptions: The cancellation rule is disputed in C-1 (KQ-1): the PRD allows cancel until shipped, the sync of
2026-10-28 decided a 24-hour window. This case follows D-01, the newer decided side; it stays an assumption until
the PRD is updated.
Open questions: KQ-1
Technique:  Boundary value analysis, the 24-hour edge of the cancellation window
Priority:   P1
Type:       Functional, negative
Level:      api

Preconditions:
- An order in status `paid`, payment confirmed 24 hours and 1 minute ago, owned by the signed-in customer

Steps:
1. Request cancellation of the order.

Expected results:
1. The request answers 409 and the order stays `paid`.
   Evidence: "the cancel request answers 409 `cancellation window closed`, even if the order is still `paid`" — D-01 [S02 L25-L26]
