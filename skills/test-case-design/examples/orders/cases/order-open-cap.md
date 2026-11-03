# Test cases — Open-order cap (FR-ORD-001, BR-ORD-007)

Feature: [FR-ORD-001](../../../../project-docs/examples/orders-docs/docs/features/FR-ORD-001-create-order.md).
Covers: AC-ORD-006, AC-ORD-007; BR-ORD-007 (assumption, OQ-003).
Techniques: boundary value analysis on the count of the customer's orders in `new` (4 -> 5 accepted, 5 -> 6
refused); equivalence partitioning of the actions that free a slot (pay, cancel). Design tables:
[design-tables.md](../design-tables.md#open-order-cap). Designed 2026-11-03; no case has run.

Both cases count alice's orders in `new`, so both are Exclusive: any case running beside them that creates, pays or
cancels an order of alice changes the count. Orders a case creates are deleted by carol in a teardown hook.

| Item | Covered by |
|---|---|
| Count 4 -> create accepted (reaches 5) | TC-ORD-010 step 1 |
| Count 5 -> create refused, count stays 5 | TC-ORD-010 step 2 |
| Pay frees a slot / cancel frees a slot | TC-ORD-011 rows A / B |
| Cap value other than the default 5 | not designed: the default is the configured value the cases assume (CONFIGURATION_RULES.md) |

---

## TC-ORD-010 — The sixth open order is refused with 409 and the customer still owns exactly 5 new orders

Verifies:   AC-ORD-006, BR-ORD-007
Basis:      assumption
Assumptions: the cap of 5 orders in new and the 409 refusal (results 1 to 3) are option B of OQ-003; nothing in S1 limits open orders
Open questions: OQ-003
Technique:  Boundary value analysis on the open-order count, 4 -> 5 (on the cap) and 5 -> 6 (just above)
Priority:   P1
Type:       Functional, negative boundary
Level:      api
Exclusive:  yes — asserts alice's exact count of orders in new

Preconditions:
- alice owns exactly 4 orders in status new (setup creates or cancels orders of alice to reach 4)
- order.open_cap has its default value 5

Test data:
- count before step 1: 4 — just below the cap; count before step 2: 5 — on the cap

Steps:
1. As alice, POST /orders with {"note": "fifth"}.
2. As alice, POST /orders with {"note": "sixth"}.
3. As alice, GET /orders and count the orders in status new.

Expected results:
1. Step 1 answers 201 with `status` "new" (the fifth open order is allowed).
   Evidence: “A customer may have at most 5 orders in status” — BR-ORD-007
2. Step 2 answers 409 with the body exactly {"error": "too many open orders"} and no `id`.
   Evidence: “A customer who already owns 5 orders in status "new" answers 409 with the body {"error": "too many open orders"} on the next POST /orders” — AC-ORD-006
3. Step 3 counts exactly 5 orders in status new, and no order has the note "sixth".
   Evidence: “and still owns exactly 5 new orders.” — AC-ORD-006

---

## TC-ORD-011 — Paying or cancelling one of 5 new orders frees a slot for the next create

Verifies:   AC-ORD-007, BR-ORD-007
Basis:      assumption
Assumptions: that a slot exists to free (results 1 and 2) follows from option B of OQ-003
Open questions: OQ-003
Technique:  Equivalence partitioning of "leaves new": row A pay, row B cancel
Priority:   P2
Type:       Functional, positive
Level:      api
Exclusive:  yes — asserts alice's exact count of orders in new

Preconditions:
- alice owns exactly 5 orders in status new (setup creates or cancels orders of alice to reach 5)
- order.open_cap has its default value 5

Test data:
- row A: alice pays one of the 5 (new -> paid)
- row B: alice cancels one of the 5 (new -> cancelled)

Steps:
1. As alice, apply the row's action to one of her 5 new orders.
2. As alice, POST /orders with {"note": "after slot freed"}.
3. As alice, GET /orders and count the orders in status new.

Expected results:
1. Step 2 answers 201 with `status` "new".
   Evidence: “After the customer pays or cancels one of 5 new orders, the next POST /orders answers 201.” — AC-ORD-007
2. Step 3 counts exactly 5 orders in status new (4 left + the new one).
   Evidence: “paying or cancelling a `new` order frees a slot” — BR-ORD-007
