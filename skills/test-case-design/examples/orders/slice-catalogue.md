# Slice catalogue — Orders example (snapshot 2026-11-03)

The requirement IDs of the slice this example designs, copied row by row from the package catalogue
[`REQUIREMENTS_CATALOGUE.md`](../../../project-docs/examples/orders-docs/REQUIREMENTS_CATALOGUE.md) (snapshot
2026-11-03), text unchanged (the FR table leaves out the package's Document column). It is a selection, not a second catalogue: no ID here is missing from the package, and
the package stays the owner. `check_cases.py --catalogue` reads every ID in this file, so it holds the slice's IDs
and nothing else; the run against the full package catalogue is in [README.md](README.md#verification) beside it.

Why a selection file: `check_cases.py` reports every catalogue AC without a case as an **error**, so a run against
the full 44-AC catalogue fails by design for the 25 ACs this slice leaves out. This file lets the check prove what
matters for a slice: every AC *in it* has a case.

## Functional requirements

| ID | Text |
|---|---|
| FR-AUTH-001 | Login: exchange username and password for a 60-minute bearer token, with lockout and one generic failure |
| FR-ORD-001 | Create an order with a note in the caller's tenant |
| FR-ORD-003 | Edit an order's note and nothing else |
| FR-ORD-004 | Order lifecycle: pay, ship, cancel as action endpoints |

## Business rules

| ID | Text | Basis |
|---|---|---|
| BR-ORD-001 | An order belongs to its creator and the creator's tenant; owner, tenant, status and id are server-set | specified |
| BR-ORD-002 | Data scope and function scope per role: customer OWN, manager TENANT, admin ALL and read-only except delete | specified; admin lifecycle rows assumption (OQ-004), manager write rows assumption (OQ-006) |
| BR-ORD-003 | A note is at most 200 characters; 200 is stored whole, 201 is rejected with 400 | limit specified; rejection assumption (OQ-002) |
| BR-ORD-004 | Only `note` is editable through PATCH; status moves only through lifecycle actions | specified |
| BR-ORD-005 | The status lifecycle is fixed (new→paid→shipped, new/paid→cancelled, terminals) and every other transition answers 409 and changes nothing | specified |
| BR-ORD-006 | A paid order may be cancelled only within 24 hours of payment | assumption (OQ-001) |
| BR-ORD-007 | A customer may have at most 5 orders in status `new` | assumption (OQ-003) |
| BR-AUTH-001 | Login failure is one generic answer: 401 `invalid credentials` for unknown user and wrong password alike | specified |
| BR-AUTH-002 | Lockout after 5 failed attempts per username per 60 s: 429 with `Retry-After: 60` | specified |
| BR-AUTH-003 | A request is authenticated only by a valid signed, unexpired token; otherwise 401 | specified |
| BR-SEC-001 | Denied object access answers 404 and does not confirm existence | specified |
| BR-SEC-002 | Denied function access answers 403; no token answers 401 | specified |

## Acceptance criteria

| ID | Text | Basis |
|---|---|---|
| AC-AUTH-001 | A seeded user who posts the correct password to POST /auth/login receives 200 and a token that authorizes GET /orders for the next 60 minutes. | specified |
| AC-AUTH-002 | A known username with a wrong password answers 401 with the body {"error": "invalid credentials"}. | specified |
| AC-AUTH-003 | An unknown username answers 401 with exactly the same status and body as a wrong password. | specified |
| AC-AUTH-004 | The fifth failed login for one username within 60 seconds answers 401 and the sixth answers 429 with the header Retry-After: 60 and the body {"error": "too many attempts"}. | specified |
| AC-AUTH-005 | Five failed logins for one username do not lock another username, which still logs in with 200. | specified |
| AC-ORD-003 | A note of exactly 200 characters is accepted and returned unchanged by the create and by a later read. | specified |
| AC-ORD-004 | A note of 201 characters on POST /orders answers 400 with an error naming note and no order is created. | assumption (OQ-002) |
| AC-ORD-005 | POST /orders with an empty body creates an order whose note is "" and whose status is "new". | specified |
| AC-ORD-006 | A customer who already owns 5 orders in status "new" answers 409 with the body {"error": "too many open orders"} on the next POST /orders and still owns exactly 5 new orders. | assumption (OQ-003) |
| AC-ORD-007 | After the customer pays or cancels one of 5 new orders, the next POST /orders answers 201. | assumption (OQ-003) |
| AC-ORD-020 | PATCH /orders/{id} with {"note": "<new>"} by the owner answers 200 and the returned and re-read note equal the new value. | specified |
| AC-ORD-024 | PATCH /orders/{id} with a note of 201 characters answers 400 and the note is unchanged. | assumption (OQ-002) |
| AC-ORD-030 | POST /orders/{id}/pay on a "new" order by its owner answers 200 with status "paid" and a non-null paid_at. | specified |
| AC-ORD-031 | POST /orders/{id}/ship on a "paid" order by a manager of the order's tenant answers 200 with status "shipped". | specified |
| AC-ORD-032 | POST /orders/{id}/cancel on a "new" order by its owner, or by a manager of its tenant, answers 200 with status "cancelled". | specified |
| AC-ORD-033 | pay on a paid order, ship on a new order, and any action on a shipped or cancelled order each answer 409 with the body {"error": "invalid transition"} and the status is unchanged. | specified |
| AC-ORD-034 | cancel on a paid order 23 h 59 min 59 s after paid_at answers 200 with status "cancelled", and at 24 h 00 min 00 s or later answers 409 with the body {"error": "cancellation window closed"} and status stays "paid". | assumption (OQ-001) |
| AC-ORD-035 | A customer calling ship, or a manager calling pay, answers 403 and the status is unchanged. | specified |
| AC-ORD-036 | The admin calling pay, ship or cancel answers 403 and the status is unchanged. | assumption (OQ-004) |

Counts: 4 FR, 12 BR, 19 AC (of the package's 7 FR, 17 BR, 44 AC).
