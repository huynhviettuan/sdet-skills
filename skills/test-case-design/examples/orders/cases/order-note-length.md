# Test cases — Note length (FR-ORD-001, FR-ORD-003)

Features: [FR-ORD-001](../../../../project-docs/examples/orders-docs/docs/features/FR-ORD-001-create-order.md),
[FR-ORD-003](../../../../project-docs/examples/orders-docs/docs/features/FR-ORD-003-edit-note.md).
Covers: AC-ORD-003, AC-ORD-004, AC-ORD-005, AC-ORD-020, AC-ORD-024; BR-ORD-003.
Techniques: equivalence partitioning and 3-value boundary value analysis on the note length (0 / 199 / 200 / 201),
syntax testing (multi-byte characters: the limit counts characters, not bytes), verified pairwise over length x
character set x operation x caller x status. Design tables: [design-tables.md](../design-tables.md#note-length).
Designed 2026-11-03; no case has run.

Every case that creates an order deletes it in a teardown hook as carol (manager of tenant-a, AZ-012), whatever the
assertions did. Each case holds at most 2 of alice's orders in `new` at a time (BR-ORD-007 budget, coverage.md).

| Item | Covered by |
|---|---|
| Length 0 (empty body, explicit "") | TC-ORD-003 (create), TC-ORD-006 rows 2, 7, 10, 11, 12 |
| Length 199 / 200 on create | TC-ORD-001 |
| Length 200 on edit | TC-ORD-004 |
| Length 201 on create / edit (OQ-002) | TC-ORD-002, TC-ORD-005 |
| 200 multi-byte characters | TC-ORD-006 rows 1, 8, 13 |
| Caller, status, character set do not change the outcome | TC-ORD-006 (pairwise, 13 rows) |

---

## TC-ORD-001 — A note of 199 or 200 characters is stored whole on create

Verifies:   AC-ORD-003, BR-ORD-003, FR-ORD-001
Basis:      specified
Technique:  Boundary value analysis, upper edge of the valid partition (199 just inside, 200 on the limit)
Priority:   P1
Type:       Functional, positive boundary
Level:      api

Preconditions:
- alice owns fewer than 4 orders in status new

Test data:
- row A: note = "a" x 200 — on the boundary
- row B: note = "a" x 199 — just inside

Steps:
1. As alice, POST /orders with {"note": <row value>}.
2. As alice, GET /orders/{id} for the returned id.

Expected results:
1. Step 1 answers 201 and the returned `note` equals the sent string, 200 (row A) or 199 (row B) characters long.
   Evidence: “A note of exactly 200 characters is accepted and returned unchanged by the create and by a later read.” — AC-ORD-003
2. Step 2 answers 200 and its `note` equals the sent string character for character.
   Evidence: “A note of 200 characters is stored whole.” — BR-ORD-003

---

## TC-ORD-002 — A 201-character note on create is rejected with 400 naming note and no order is created

Verifies:   AC-ORD-004, BR-ORD-003
Basis:      assumption
Assumptions: the 400 rejection (results 1 and 2) is option A of OQ-002; the 200-character limit itself is specified (S1 sentence 4)
Open questions: OQ-002
Technique:  Boundary value analysis, first value of the invalid partition (201)
Priority:   P1
Type:       Functional, negative boundary
Level:      api

Preconditions:
- alice owns fewer than 5 orders in status new; the ids of her orders are listed in setup

Test data:
- note = "a" x 201 — first invalid length

Observed, not a requirement (OQ-002 text): the reference server keeps the first 200 characters and answers 201.
This case is expected to fail against that server until OQ-002 is decided; that is a disagreement under an open
question, not a filed defect, so no Known bug is bound here.

Steps:
1. As alice, POST /orders with {"note": <201 characters>}.
2. As alice, GET /orders.

Expected results:
1. Step 1 answers 400 and the error body names `note`; no `id` is returned.
   Evidence: “A note of 201 characters on POST /orders answers 400 with an error naming note and no order is created.” — AC-ORD-004
2. Step 2 lists exactly the ids listed in setup (no order was created).
   Evidence: “nothing is stored or changed” — BR-ORD-003

---

## TC-ORD-003 — An empty create body makes an order whose note is "" and status is new

Verifies:   AC-ORD-005, BR-ORD-001, BR-ORD-003
Basis:      specified
Technique:  Boundary value analysis, lower edge (length 0); equivalence partitioning of "no note" (`{}`, no body)
Priority:   P2
Type:       Functional, positive boundary
Level:      api

Preconditions:
- alice owns fewer than 4 orders in status new

Test data:
- row A: body {} — note absent
- row B: no body at all

Steps:
1. As alice, POST /orders with the row's body.

Expected results:
1. The answer is 201 with `note` equal to "" (length 0), `status` equal to "new" and `owner` equal to "alice".
   Evidence: “POST /orders with an empty body creates an order whose note is "" and whose status is "new".” — AC-ORD-005

---

## TC-ORD-004 — The owner's edit to a 200-character note is stored whole

Verifies:   AC-ORD-020, BR-ORD-003, FR-ORD-003
Basis:      specified
Technique:  Boundary value analysis, upper edge on PATCH
Priority:   P2
Type:       Functional, positive boundary
Level:      api

Preconditions:
- alice owns an order in status new with note "first"

Test data:
- note = "b" x 200 — on the boundary

Steps:
1. As alice, PATCH /orders/{id} with {"note": <200 characters>}.
2. As alice, GET /orders/{id}.

Expected results:
1. Step 1 answers 200 and the returned `note` equals the 200-character string.
   Evidence: “PATCH /orders/{id} with {"note": "<new>"} by the owner answers 200 and the returned and re-read note equal the new value.” — AC-ORD-020
2. Step 2 shows the same 200-character note, and `status` is still "new".
   Evidence: “A note of 200 characters is stored whole.” — BR-ORD-003

---

## TC-ORD-005 — A 201-character note edit is rejected with 400 and the note is unchanged

Verifies:   AC-ORD-024, BR-ORD-003
Basis:      assumption
Assumptions: the 400 rejection and the unchanged note (results 1 and 2) are option A of OQ-002; the reference server stores the first 200 characters instead (observed, not a requirement)
Open questions: OQ-002
Technique:  Boundary value analysis, first invalid length on PATCH
Priority:   P1
Type:       Functional, negative boundary
Level:      api

Preconditions:
- alice owns an order in status new with note "first"

Test data:
- note = "c" x 201 — first invalid length

Steps:
1. As alice, PATCH /orders/{id} with {"note": <201 characters>}.
2. As alice, GET /orders/{id}.

Expected results:
1. Step 1 answers 400 and the error body names `note`.
   Evidence: “PATCH /orders/{id} with a note of 201 characters answers 400 and the note is unchanged.” — AC-ORD-024
2. Step 2 shows `note` equal to "first".
   Evidence: “nothing is stored or changed” — BR-ORD-003

---

## TC-ORD-006 — The note-length outcome is the same for every caller, status and character set

Verifies:   BR-ORD-003, BR-ORD-004, AC-ORD-003, AC-ORD-004, AC-ORD-020, AC-ORD-024
Basis:      assumption
Assumptions: rows with caller manager-same-tenant assume OQ-006 option A (a manager may create and edit notes); rows with status paid, shipped or cancelled assume OQ-005 option A (the note is editable in every status); rows with length 201 assume OQ-002 option A (rejected). Rows 1 and 12 depend on no question.
Open questions: OQ-002, OQ-005, OQ-006
Technique:  Pairwise (13 rows, verified by pairwise.py; design-tables.md#pairwise-note-validation) + syntax testing on multi-byte characters
Priority:   P2
Type:       Functional, data-driven
Level:      api

Preconditions:
- per row: for "edit", an order of alice in the row's status with note "first"; for "create", no order
- alice owns fewer than 4 orders in status new

Test data (one data row per pairwise row; the table and the reason for each value are in design-tables.md):
- ascii text: "a" repeated to the row's length
- vietnamese text: "ệ" (U+1EC7, precomposed, 3 bytes in UTF-8) repeated to the row's length; 200 of them are 600 bytes
- length 0 on edit is {"note": ""}; length 0 on create is an empty body

Steps:
1. As the row's caller, send the row's operation (POST /orders, or PATCH /orders/{id}) with the row's note.
2. As alice, GET /orders/{id} (edit rows) or GET /orders (create rows).

Expected results:
1. Rows with length 0 or 200 answer 201 (create) or 200 (edit), and the returned and re-read note equal the sent string character for character, so 200 vietnamese characters (600 bytes) are accepted.
   Evidence: “`note` is a string of 0 to 200 characters (characters, not bytes).” — BR-ORD-003
2. Rows with length 201 answer 400 with an error naming `note`; an edited order still shows "first" and a create adds no order.
   Evidence: “PATCH /orders/{id} with a note of 201 characters answers 400 and the note is unchanged.” — AC-ORD-024
