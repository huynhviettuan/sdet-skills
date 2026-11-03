# Requirement Catalogue — Orders (snapshot 2026-11-03)

A dated snapshot of every requirement ID in this package, by kind, with its one-line text and the document that
owns it. The test-design skill reads this file (`check_cases.py --catalogue`): a case citing an ID that is not
here is wrong, not the catalogue. Refresh deliberately (new date, reviewed diff); never add an ID to make a case
pass. `Basis` is `specified` unless marked `assumption (OQ-nnn)`.

Counts: 7 FR, 17 BR, 44 AC, 4 ADR, 6 OQ, 51 matrix rows (AZ-001..051, in `docs/business/ROLES_PERMISSIONS.md`).

## Functional requirements (docs/features/)

| ID | Text | Document |
|---|---|---|
| FR-AUTH-001 | Login: exchange username and password for a 60-minute bearer token, with lockout and one generic failure | FR-AUTH-001-login.md |
| FR-ORD-001 | Create an order with a note in the caller's tenant | FR-ORD-001-create-order.md |
| FR-ORD-002 | List and read orders within the caller's data scope | FR-ORD-002-read-orders.md |
| FR-ORD-003 | Edit an order's note and nothing else | FR-ORD-003-edit-note.md |
| FR-ORD-004 | Order lifecycle: pay, ship, cancel as action endpoints | FR-ORD-004-order-lifecycle.md |
| FR-ORD-005 | Delete an order (tenant manager or admin) | FR-ORD-005-delete-order.md |
| FR-ADM-001 | Admin reads the user list and the audit log | FR-ADM-001-admin-users-and-audit.md |

## Business rules (docs/business/BUSINESS_RULES.md)

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
| BR-SEC-003 | Unknown or read-only fields are rejected with 400 naming them; a rejected request changes nothing | specified |
| BR-SEC-004 | Every response carries the six security headers | specified |
| BR-SEC-005 | Cross-origin access is allow-listed and never credentialed by reflection | specified |
| BR-SEC-006 | An internal error answers 500 with a reference and nothing else | specified |
| BR-AUD-001 | Every denied request writes an audit entry; only the admin reads the log | specified |

## Acceptance criteria (docs/quality/ACCEPTANCE_CRITERIA.md)

| ID | Text | Basis |
|---|---|---|
| AC-AUTH-001 | A seeded user who posts the correct password to POST /auth/login receives 200 and a token that authorizes GET /orders for the next 60 minutes. | specified |
| AC-AUTH-002 | A known username with a wrong password answers 401 with the body {"error": "invalid credentials"}. | specified |
| AC-AUTH-003 | An unknown username answers 401 with exactly the same status and body as a wrong password. | specified |
| AC-AUTH-004 | The fifth failed login for one username within 60 seconds answers 401 and the sixth answers 429 with the header Retry-After: 60 and the body {"error": "too many attempts"}. | specified |
| AC-AUTH-005 | Five failed logins for one username do not lock another username, which still logs in with 200. | specified |
| AC-AUTH-006 | A protected request with no Authorization header answers 401 with the body {"error": "unauthorized"}. | specified |
| AC-AUTH-007 | A token with alg "none", a token whose signature does not verify, and a token whose exp is in the past each answer 401 on a protected request. | specified |
| AC-ORD-001 | A customer who posts {"note": "..."} to POST /orders receives 201 with id, owner equal to the caller's username, tenant equal to the caller's tenant and status "new". | specified |
| AC-ORD-002 | The admin posting to POST /orders answers 403 with the body {"error": "forbidden"} and no order is created. | specified |
| AC-ORD-003 | A note of exactly 200 characters is accepted and returned unchanged by the create and by a later read. | specified |
| AC-ORD-004 | A note of 201 characters on POST /orders answers 400 with an error naming note and no order is created. | assumption (OQ-002) |
| AC-ORD-005 | POST /orders with an empty body creates an order whose note is "" and whose status is "new". | specified |
| AC-ORD-006 | A customer who already owns 5 orders in status "new" answers 409 with the body {"error": "too many open orders"} on the next POST /orders and still owns exactly 5 new orders. | assumption (OQ-003) |
| AC-ORD-007 | After the customer pays or cancels one of 5 new orders, the next POST /orders answers 201. | assumption (OQ-003) |
| AC-ORD-010 | GET /orders for a customer returns only orders whose owner equals the caller's username, and none of another customer or tenant. | specified |
| AC-ORD-011 | GET /orders for a manager returns every order whose tenant equals the manager's tenant and no order of another tenant. | specified |
| AC-ORD-012 | GET /orders for the admin returns the orders of every tenant. | specified |
| AC-ORD-013 | GET /orders/{id} by the owner, by a manager of the order's tenant, or by the admin answers 200 with the order. | specified |
| AC-ORD-014 | GET /orders/{id} by another customer of the same tenant, or by any customer or manager of another tenant, answers 404 with the body {"error": "not found"}. | specified |
| AC-ORD-015 | GET /orders/{id} for an id that was never created answers 404 with a body identical to a denied read. | specified |
| AC-ORD-020 | PATCH /orders/{id} with {"note": "<new>"} by the owner answers 200 and the returned and re-read note equal the new value. | specified |
| AC-ORD-021 | status is read-only on PATCH: a body naming status answers 400 with fields equal to ["status"] and the order's status is unchanged. | specified |
| AC-ORD-022 | A PATCH body with an unknown field answers 400 with the body {"error": "unknown or read-only fields", "fields": [<the names, sorted>]} and the note is unchanged. | specified |
| AC-ORD-023 | PATCH /orders/{id} by a user who cannot read the order answers 404 and the owner's re-read shows the original note. | specified |
| AC-ORD-024 | PATCH /orders/{id} with a note of 201 characters answers 400 and the note is unchanged. | assumption (OQ-002) |
| AC-ORD-030 | POST /orders/{id}/pay on a "new" order by its owner answers 200 with status "paid" and a non-null paid_at. | specified |
| AC-ORD-031 | POST /orders/{id}/ship on a "paid" order by a manager of the order's tenant answers 200 with status "shipped". | specified |
| AC-ORD-032 | POST /orders/{id}/cancel on a "new" order by its owner, or by a manager of its tenant, answers 200 with status "cancelled". | specified |
| AC-ORD-033 | pay on a paid order, ship on a new order, and any action on a shipped or cancelled order each answer 409 with the body {"error": "invalid transition"} and the status is unchanged. | specified |
| AC-ORD-034 | cancel on a paid order 23 h 59 min 59 s after paid_at answers 200 with status "cancelled", and at 24 h 00 min 00 s or later answers 409 with the body {"error": "cancellation window closed"} and status stays "paid". | assumption (OQ-001) |
| AC-ORD-035 | A customer calling ship, or a manager calling pay, answers 403 and the status is unchanged. | specified |
| AC-ORD-036 | The admin calling pay, ship or cancel answers 403 and the status is unchanged. | assumption (OQ-004) |
| AC-ORD-040 | DELETE /orders/{id} by a manager of the order's tenant or by the admin answers 204 and a later GET /orders/{id} by the owner answers 404. | specified |
| AC-ORD-041 | DELETE /orders/{id} by a customer, including the owner, answers 403 and the owner's re-read returns the order unchanged. | specified |
| AC-ORD-042 | DELETE /orders/{id} by a manager of another tenant answers 404 and the order still exists for its owner. | specified |
| AC-SEC-001 | Every response, including 401, 404 and 204, carries X-Content-Type-Options: nosniff, X-Frame-Options: DENY, Content-Security-Policy: default-src 'none'; frame-ancestors 'none', Strict-Transport-Security: max-age=31536000; includeSubDomains, Cache-Control: no-store and Referrer-Policy: no-referrer. | specified |
| AC-SEC-002 | A request with Origin https://app.example.test receives Access-Control-Allow-Origin: https://app.example.test and Vary: Origin. | specified |
| AC-SEC-003 | A request with any Origin not in the allow-list receives no Access-Control-Allow-Origin header, and no response ever carries Access-Control-Allow-Credentials. | specified |
| AC-SEC-004 | A 500 response has the body {"error": "internal error", "ref": "<8 hex characters>"} and contains no exception text, stack trace or file path. | specified |
| AC-SEC-005 | A denied function call answers 403 with the body {"error": "forbidden"}. | specified |
| AC-AUD-001 | After a denied request, GET /_audit as the admin contains an entry whose actor is the caller's username or "anonymous", whose action is "<METHOD> <path>" of the request and whose outcome is "denied". | specified |
| AC-AUD-002 | GET /_audit by a customer or manager answers 403, and by the admin 200 with a JSON array. | specified |
| AC-ADM-001 | GET /admin/users by the admin answers 200 with one object per seeded user containing username, tenant and role and no password field. | specified |
| AC-ADM-002 | GET /admin/users by a customer or manager answers 403 and by anonymous 401. | specified |

## Architecture decisions (docs/architecture/ADR/)

| ID | Decision | Status |
|---|---|---|
| ADR-001 | The permission matrix is the single source of authorization tests | Accepted 2026-11-03 |
| ADR-002 | Denied object access answers 404, not 403 | Accepted 2026-11-03 |
| ADR-003 | Lifecycle transitions are action endpoints, not a writable `status` | Accepted 2026-11-03 |
| ADR-004 | Stateless HMAC-signed bearer tokens with a 60-minute expiry | Accepted 2026-11-03 |

## Open questions (docs/product/OPEN_QUESTIONS.md)

| ID | Question | Status | Blocks |
|---|---|---|---|
| OQ-001 | How long after payment may a paid order still be cancelled? (assumed 24 h) | OPEN | BR-ORD-006, AC-ORD-034 |
| OQ-002 | Is a note over 200 characters rejected or shortened? (assumed rejected; reference server shortens) | OPEN | BR-ORD-003, AC-ORD-004, AC-ORD-024 |
| OQ-003 | Is there a cap on a customer's open orders? (assumed 5 in `new`) | OPEN | BR-ORD-007, AC-ORD-006, AC-ORD-007 |
| OQ-004 | May the admin pay, ship or cancel? (assumed no, 403) | OPEN | AC-ORD-036, AZ-030/036/043 |
| OQ-005 | May the note be edited once shipped or cancelled? (assumed yes) | OPEN | BR-ORD-004 |
| OQ-006 | May a manager create orders and edit notes? (assumed yes, as the reference server) | OPEN | AZ-049, AZ-051 |

## Snapshot provenance

Taken 2026-11-03 from the documents named above at their initial version (`CHANGELOG.md`). The ID text is a
snapshot: when a document's text behind an ID changes, cases written before the change are stale until re-read.
