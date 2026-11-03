# Test cases — Order lifecycle (FR-ORD-004)

Feature: [FR-ORD-004](../../../../project-docs/examples/orders-docs/docs/features/FR-ORD-004-order-lifecycle.md).
Covers: AC-ORD-030..036; BR-ORD-005, BR-ORD-006, BR-ORD-002, BR-SEC-001, BR-SEC-002.
Techniques: state transition (4 valid transitions, the 8 forbidden cells, the time-guarded paid -> cancelled),
boundary value analysis on the cancellation window (23:59:59 / 24:00:00 / 24:00:01), decision table "who may do
which action on which status" derived from `ROLES_PERMISSIONS.md` and the cancel table of `STATE_MACHINES.md`.
Design tables: [design-tables.md](../design-tables.md#order-lifecycle-state-table) and
[the decision table](../design-tables.md#decision-table-lifecycle-actions). Designed 2026-11-03; no case has run.

Every order is alice's (tenant-a) unless a row says otherwise; carol deletes it in a teardown hook. The status-only
authorization rows (AZ-024..043) stay in the matrix suite (ADR-001); the cases here add the body and the
"nothing changed" re-read the matrix does not assert.

| Item | Covered by |
|---|---|
| new -pay-> paid | TC-ORD-020 |
| paid -ship-> shipped | TC-ORD-021 |
| new -cancel-> cancelled (owner / tenant manager) | TC-ORD-022 / TC-ORD-023 |
| paid -cancel-> cancelled inside the window | TC-ORD-025 |
| paid -cancel-> refused at and after 24 h | TC-ORD-026 |
| 8 forbidden cells | TC-ORD-024 rows 1-8 |
| Decision table R1 no token | gap: matrix rows AZ-024, AZ-031, AZ-037 (coverage.md) |
| Decision table R2 hidden order | TC-ORD-030 |
| Decision table R3 wrong role | TC-ORD-027, TC-ORD-028, TC-ORD-029 |

---

## TC-ORD-020 — The owner pays a new order and it becomes paid with paid_at set

Verifies:   AC-ORD-030, BR-ORD-005
Basis:      specified
Technique:  State transition, valid transition new -pay-> paid; decision table column R7
Priority:   P0
Smoke:      yes
Type:       Functional, positive
Level:      api

Preconditions:
- alice owns an order in status new with `paid_at` null

Steps:
1. As alice, POST /orders/{id}/pay.
2. As alice, GET /orders/{id}.

Expected results:
1. Step 1 answers 200 with `status` "paid" and a non-null `paid_at`.
   Evidence: “POST /orders/{id}/pay on a "new" order by its owner answers 200 with status "paid" and a non-null paid_at.” — AC-ORD-030
2. Step 2 shows `status` "paid" and the same `paid_at` value as step 1.
   Evidence: “`paid_at` is set on `new` → `paid` and never changed.” — BR-ORD-005

---

## TC-ORD-021 — The tenant manager ships a paid order and it becomes shipped

Verifies:   AC-ORD-031, BR-ORD-005
Basis:      specified
Technique:  State transition, valid transition paid -ship-> shipped; decision table column R7
Priority:   P0
Smoke:      yes
Type:       Functional, positive
Level:      api

Preconditions:
- alice owns an order in status paid

Steps:
1. As carol (manager of tenant-a), POST /orders/{id}/ship.
2. As alice, GET /orders/{id}.

Expected results:
1. Step 1 answers 200 with `status` "shipped".
   Evidence: “POST /orders/{id}/ship on a "paid" order by a manager of the order's tenant answers 200 with status "shipped".” — AC-ORD-031
2. Step 2 shows `status` "shipped" and the `paid_at` set before the ship, unchanged.
   Evidence: “`paid_at` is set on `new` → `paid` and never changed.” — BR-ORD-005

---

## TC-ORD-022 — The owner cancels a new order and it becomes cancelled

Verifies:   AC-ORD-032, BR-ORD-005
Basis:      specified
Technique:  State transition, valid transition new -cancel-> cancelled; decision table column R7, actor customer-own
Priority:   P1
Type:       Functional, positive
Level:      api

Preconditions:
- alice owns an order in status new

Steps:
1. As alice, POST /orders/{id}/cancel.
2. As alice, GET /orders/{id}.

Expected results:
1. Step 1 answers 200 with `status` "cancelled", and step 2 shows "cancelled".
   Evidence: “POST /orders/{id}/cancel on a "new" order by its owner, or by a manager of its tenant, answers 200 with status "cancelled".” — AC-ORD-032

---

## TC-ORD-023 — The tenant manager cancels a new order and it becomes cancelled

Verifies:   AC-ORD-032, BR-ORD-005
Basis:      specified
Technique:  State transition, valid transition new -cancel-> cancelled; decision table column R7, actor manager-same-tenant
Priority:   P1
Type:       Functional, positive
Level:      api

Preconditions:
- alice owns an order in status new

Steps:
1. As carol, POST /orders/{id}/cancel.
2. As alice, GET /orders/{id}.

Expected results:
1. Step 1 answers 200 with `status` "cancelled", and alice's re-read in step 2 shows "cancelled".
   Evidence: “POST /orders/{id}/cancel on a "new" order by its owner, or by a manager of its tenant, answers 200 with status "cancelled".” — AC-ORD-032

---

## TC-ORD-024 — Every forbidden transition answers 409 invalid transition and leaves the order unchanged

Verifies:   AC-ORD-033, BR-ORD-005
Basis:      specified
Technique:  State transition, all 8 invalid cells of the state x action table; decision table column R4
Priority:   P0
Type:       Functional, negative
Level:      api

Preconditions:
- per row, an order of alice in the row's status (shipped and cancelled reached through the lifecycle actions)

Test data (status, action, actor allowed that action by the matrix):
- row 1: paid, pay, alice — repeated pay
- row 2: new, ship, carol — not paid yet
- row 3: shipped, pay, alice — terminal
- row 4: shipped, ship, carol — terminal, repeated ship
- row 5: shipped, cancel, alice — terminal
- row 6: cancelled, pay, alice — terminal
- row 7: cancelled, ship, carol — terminal
- row 8: cancelled, cancel, carol — terminal, repeated cancel

Steps:
1. As the row's actor, POST /orders/{id}/<action>.
2. As alice, GET /orders/{id}.

Expected results:
1. Step 1 answers 409 with the body exactly {"error": "invalid transition"}.
   Evidence: “pay on a paid order, ship on a new order, and any action on a shipped or cancelled order each answer 409 with the body {"error": "invalid transition"}” — AC-ORD-033
2. Step 2 shows the status the order had before step 1, and `paid_at` unchanged (null for row 2).
   Evidence: “and the status is unchanged.” — AC-ORD-033

---

## TC-ORD-025 — The owner cancels a paid order 23 h 59 min 59 s after paid_at

Verifies:   AC-ORD-034, BR-ORD-006
Basis:      assumption
Assumptions: the 24-hour window (result 1 depends on the window still being open at 23:59:59) is option B of OQ-001; S1 allows paid -> cancelled with no limit, under which this case also passes
Open questions: OQ-001
Technique:  Boundary value analysis on hours since paid_at, last second inside the window; decision table column R6
Priority:   P1
Type:       Functional, positive boundary
Level:      api  (needs the server clock controlled by the test: "a controllable clock in tests", FR-ORD-004 Dependencies)

Preconditions:
- alice owns an order in status paid; the server clock reads `paid_at` + 23:59:59
- order.cancel_window_hours has its default value 24

Test data:
- now - paid_at = 23 h 59 min 59 s — just inside the window

Steps:
1. As alice, POST /orders/{id}/cancel.
2. As alice, GET /orders/{id}.

Expected results:
1. Step 1 answers 200 with `status` "cancelled", and step 2 shows "cancelled".
   Evidence: “cancel on a paid order 23 h 59 min 59 s after paid_at answers 200 with status "cancelled"” — AC-ORD-034

---

## TC-ORD-026 — Cancelling a paid order at 24 h 00 min 00 s or later is refused and the order stays paid

Verifies:   AC-ORD-034, BR-ORD-006
Basis:      assumption
Assumptions: the refusal, its body and the unchanged status (results 1 and 2) are option B of OQ-001; under option A (no window) the cancel would succeed
Open questions: OQ-001
Technique:  Boundary value analysis on hours since paid_at, on the boundary (24:00:00) and just past it (24:00:01); decision table column R5
Priority:   P1
Type:       Functional, negative boundary
Level:      api  (needs the server clock controlled by the test, as TC-ORD-025)

Preconditions:
- per row, an order of alice in status paid; the server clock reads `paid_at` + the row's offset
- order.cancel_window_hours has its default value 24

Test data:
- row A: now - paid_at = 24 h 00 min 00 s — on the boundary
- row B: now - paid_at = 24 h 00 min 01 s — just past it

Steps:
1. As alice, POST /orders/{id}/cancel.
2. As alice, GET /orders/{id}.

Expected results:
1. Step 1 answers 409 with the body exactly {"error": "cancellation window closed"}.
   Evidence: “at 24 h 00 min 00 s or later answers 409 with the body {"error": "cancellation window closed"}” — AC-ORD-034
2. Step 2 shows `status` "paid" and the original `paid_at`.
   Evidence: “and status stays "paid".” — AC-ORD-034

---

## TC-ORD-027 — The owner calling ship is refused with 403 and the order stays paid

Verifies:   AC-ORD-035, BR-SEC-002, BR-ORD-002
Basis:      specified
Technique:  Decision table column R3 (sees the order, role lacks order.ship); matrix cell AZ-032
Priority:   P0
Type:       Security, negative (privilege boundary)
Level:      api

Preconditions:
- alice owns an order in status paid

Steps:
1. As alice, POST /orders/{id}/ship.
2. As alice, GET /orders/{id}.

Expected results:
1. Step 1 answers 403 with the body exactly {"error": "forbidden"}.
   Evidence: “answers 403 with `{"error": "forbidden"}`” — BR-SEC-002
2. Step 2 shows `status` "paid".
   Evidence: “A customer calling ship, or a manager calling pay, answers 403 and the status is unchanged.” — AC-ORD-035

---

## TC-ORD-028 — The tenant manager calling pay is refused with 403 and the order stays new

Verifies:   AC-ORD-035, BR-SEC-002, BR-ORD-002
Basis:      specified
Technique:  Decision table column R3 (sees the order, role lacks order.pay); matrix cell AZ-028
Priority:   P0
Type:       Security, negative (privilege boundary)
Level:      api

Preconditions:
- alice owns an order in status new

Steps:
1. As carol, POST /orders/{id}/pay.
2. As alice, GET /orders/{id}.

Expected results:
1. Step 1 answers 403 with the body exactly {"error": "forbidden"}.
   Evidence: “answers 403 with `{"error": "forbidden"}`” — BR-SEC-002
2. Step 2 shows `status` "new" and `paid_at` null.
   Evidence: “A customer calling ship, or a manager calling pay, answers 403 and the status is unchanged.” — AC-ORD-035

---

## TC-ORD-029 — The admin calling pay, ship or cancel is refused with 403 and the status is unchanged

Verifies:   AC-ORD-036, BR-SEC-002, BR-ORD-002
Basis:      assumption
Assumptions: that the admin may not transition orders (results 1 and 2) is option A of OQ-004; under option B the admin rows would answer 200
Open questions: OQ-004
Technique:  Decision table column R3 for the admin; matrix cells AZ-030, AZ-036, AZ-043 (+ cancel on paid)
Priority:   P1
Type:       Security, negative (privilege boundary)
Level:      api

Preconditions:
- per row, an order of alice in the row's status

Test data:
- row A: pay on new (AZ-030)
- row B: ship on paid (AZ-036)
- row C: cancel on new (AZ-043)
- row D: cancel on paid, inside the window — the paid branch of the cancel decision table

Steps:
1. As root (admin), POST /orders/{id}/<action>.
2. As alice, GET /orders/{id}.

Expected results:
1. Step 1 answers 403 with the body exactly {"error": "forbidden"}.
   Evidence: “The admin calling pay, ship or cancel answers 403 and the status is unchanged.” — AC-ORD-036
2. Step 2 shows the status the order had before step 1.
   Evidence: “The admin calling pay, ship or cancel answers 403 and the status is unchanged.” — AC-ORD-036

---

## TC-ORD-030 — A caller who cannot see the order gets 404 not found on pay, ship and cancel, and nothing changes

Verifies:   BR-SEC-001, BR-ORD-002, FR-ORD-004
Basis:      specified
Technique:  Decision table column R2 (caller does not see the order); matrix cells AZ-026, 027, 029, 033, 035, 039, 040, 042 + the ship row the matrix omits
Priority:   P0
Type:       Security, negative (object scope)
Level:      api

Preconditions:
- per row, an order of alice in the status the action needs (pay: new, ship: paid, cancel: new)
- the body of GET /orders/999999 as alice (an id never created) is taken in setup as the reference not-found body

Test data (actor, action):
- erin (customer, same tenant): pay, ship, cancel — ship has no matrix row; its 404 follows from BR-SEC-001 ("every per-order operation")
- bob (customer, other tenant): pay, ship, cancel
- dave (manager, other tenant): pay, ship, cancel

Steps:
1. As the row's actor, POST /orders/{id}/<action>.
2. As alice, GET /orders/{id}.

Expected results:
1. Step 1 answers 404 with a body equal to the reference not-found body {"error": "not found"}.
   Evidence: “the answer is 404 with `{"error": "not found"}` — the same status and body as for an id that does not exist — on every per-order operation (read, edit, pay, ship, cancel, delete)” — BR-SEC-001
2. Step 2 shows the status the order had before step 1 (the scope check refuses before any transition is applied).
   Evidence: “Server checks token → scope (404) → function (403) → state (409), inside the store lock.” — FR-ORD-004
