# Acceptance Criteria

Snapshot: 2026-11-03. Level 3 of the source-of-truth hierarchy. Each criterion is one quotable sentence
(`Statement`) — a test case cites it verbatim as `Evidence:` — followed by its rule and Given / When / Then.
`Basis` is `specified` unless the rule behind it is an assumption; then the OQ is named and tests inherit
`Basis: assumption`. Example users are those of `../business/ROLES_PERMISSIONS.md` (alice owns the order,
tenant-a).

---

## AUTH — FR-AUTH-001

### AC-AUTH-001 — Correct credentials yield a token

Rule: BR-AUTH-003
Statement: A seeded user who posts the correct password to POST /auth/login receives 200 and a token that authorizes GET /orders for the next 60 minutes.
Given: alice is seeded and not locked. When: she posts her username and correct password. Then: 200, body has
`token`; `GET /orders` with it answers 200.

### AC-AUTH-002 — Wrong password is one generic failure

Rule: BR-AUTH-001
Statement: A known username with a wrong password answers 401 with the body {"error": "invalid credentials"}.
Given: alice is seeded. When: she posts a wrong password. Then: 401 and exactly that body.

### AC-AUTH-003 — Unknown user is indistinguishable from a wrong password

Rule: BR-AUTH-001
Statement: An unknown username answers 401 with exactly the same status and body as a wrong password.
Given: `nobody` is not seeded. When: login is posted for `nobody`. Then: status and body equal those of
AC-AUTH-002.

### AC-AUTH-004 — Lockout on the sixth attempt

Rule: BR-AUTH-002
Statement: The fifth failed login for one username within 60 seconds answers 401 and the sixth answers 429 with the header Retry-After: 60 and the body {"error": "too many attempts"}.
Given: no failures for alice. When: six wrong passwords are posted within 60 s. Then: attempts 1–5 answer 401;
attempt 6 answers 429 with `Retry-After: 60`, even with the correct password.

### AC-AUTH-005 — Lockout is per username

Rule: BR-AUTH-002
Statement: Five failed logins for one username do not lock another username, which still logs in with 200.
Given: alice is locked. When: erin posts her correct password. Then: 200.

### AC-AUTH-006 — No token answers 401

Rule: BR-AUTH-003
Statement: A protected request with no Authorization header answers 401 with the body {"error": "unauthorized"}.
Given: nothing. When: `GET /orders` without a header. Then: 401 and that body.

### AC-AUTH-007 — Unsigned, tampered or expired tokens answer 401

Rule: BR-AUTH-003
Statement: A token with alg "none", a token whose signature does not verify, and a token whose exp is in the past each answer 401 on a protected request.
Given: three such tokens built from alice's claims. When: each is used on `GET /orders`. Then: 401 each time.

---

## ORD — create (FR-ORD-001)

### AC-ORD-001 — A customer creates an order in their own tenant

Rule: BR-ORD-001
Statement: A customer who posts {"note": "..."} to POST /orders receives 201 with id, owner equal to the caller's username, tenant equal to the caller's tenant and status "new".
Given: alice (tenant-a). When: `POST /orders {"note": "first"}`. Then: 201; `owner` = alice, `tenant` =
tenant-a, `status` = new, `note` = first, `id` ≥ 1.

### AC-ORD-002 — The admin cannot create

Rule: BR-SEC-002, BR-ORD-002
Statement: The admin posting to POST /orders answers 403 with the body {"error": "forbidden"} and no order is created.
Given: root. When: `POST /orders`. Then: 403, that body; `GET /orders` as root shows no new order.

### AC-ORD-003 — A 200-character note is stored whole

Rule: BR-ORD-003
Statement: A note of exactly 200 characters is accepted and returned unchanged by the create and by a later read.
Given: a 200-character string. When: posted as `note`. Then: 201; `note` equals the string; re-read equals it.

### AC-ORD-004 — A 201-character note is rejected (assumption, OQ-002)

Rule: BR-ORD-003
Statement: A note of 201 characters on POST /orders answers 400 with an error naming note and no order is created.
Given: a 201-character string. When: posted. Then: 400, body error mentions `note`; the list is unchanged.

### AC-ORD-005 — Empty body creates an empty note

Rule: BR-ORD-001
Statement: POST /orders with an empty body creates an order whose note is "" and whose status is "new".
Given: alice. When: `POST /orders` with `{}` or no body. Then: 201, `note` = "", `status` = new.

### AC-ORD-006 — The sixth open order is refused (assumption, OQ-003)

Rule: BR-ORD-007
Statement: A customer who already owns 5 orders in status "new" answers 409 with the body {"error": "too many open orders"} on the next POST /orders and still owns exactly 5 new orders.
Given: alice owns 5 `new` orders. When: a sixth `POST /orders`. Then: 409, that body; her `new` count is 5.

### AC-ORD-007 — Paying or cancelling frees a slot (assumption, OQ-003)

Rule: BR-ORD-007
Statement: After the customer pays or cancels one of 5 new orders, the next POST /orders answers 201.
Given: alice owns 5 `new` orders. When: she pays one, then posts a new order. Then: 201.

---

## ORD — read (FR-ORD-002)

### AC-ORD-010 — A customer lists only their own orders

Rule: BR-ORD-002
Statement: GET /orders for a customer returns only orders whose owner equals the caller's username, and none of another customer or tenant.
Given: orders by alice, erin and bob exist. When: alice lists. Then: every row has `owner` = alice; erin's and
bob's ids are absent.

### AC-ORD-011 — A manager lists the whole tenant

Rule: BR-ORD-002
Statement: GET /orders for a manager returns every order whose tenant equals the manager's tenant and no order of another tenant.
Given: the same orders. When: carol lists. Then: alice's and erin's ids present; bob's absent.

### AC-ORD-012 — The admin lists every tenant

Rule: BR-ORD-002
Statement: GET /orders for the admin returns the orders of every tenant.
Given: the same orders. When: root lists. Then: all three ids present.

### AC-ORD-013 — In-scope read answers 200

Rule: BR-ORD-002
Statement: GET /orders/{id} by the owner, by a manager of the order's tenant, or by the admin answers 200 with the order.
Given: alice's order. When: alice, carol and root each read it. Then: 200 with the same order each time.

### AC-ORD-014 — Out-of-scope read answers 404

Rule: BR-SEC-001
Statement: GET /orders/{id} by another customer of the same tenant, or by any customer or manager of another tenant, answers 404 with the body {"error": "not found"}.
Given: alice's order. When: erin, bob and dave each read it. Then: 404 and that body each time.

### AC-ORD-015 — Missing and hidden are identical

Rule: BR-SEC-001
Statement: GET /orders/{id} for an id that was never created answers 404 with a body identical to a denied read.
Given: id 999999 was never created. When: alice reads it; bob reads alice's order. Then: both 404 with equal
bodies.

---

## ORD — edit note (FR-ORD-003)

### AC-ORD-020 — The owner edits the note

Rule: BR-ORD-004
Statement: PATCH /orders/{id} with {"note": "<new>"} by the owner answers 200 and the returned and re-read note equal the new value.
Given: alice's order, note "first". When: `PATCH {"note": "second"}`. Then: 200, `note` = second; `GET` shows
second.

### AC-ORD-021 — `status` is read-only on PATCH

Rule: BR-SEC-003, BR-ORD-004
Statement: status is read-only on PATCH: a body naming status answers 400 with fields equal to ["status"] and the order's status is unchanged.
Given: alice's `new` order. When: `PATCH {"note": "ok", "status": "paid"}`. Then: 400, `fields` = ["status"];
re-read shows `status` new and `note` unchanged.

### AC-ORD-022 — Unknown fields are named, sorted

Rule: BR-SEC-003
Statement: A PATCH body with an unknown field answers 400 with the body {"error": "unknown or read-only fields", "fields": [<the names, sorted>]} and the note is unchanged.
Given: alice's order. When: `PATCH {"tenant": "tenant-b", "colour": "red"}`. Then: 400, `fields` =
["colour", "tenant"]; re-read unchanged.

### AC-ORD-023 — A hidden order cannot be edited

Rule: BR-SEC-001
Statement: PATCH /orders/{id} by a user who cannot read the order answers 404 and the owner's re-read shows the original note.
Given: alice's order, note "first". When: bob patches `{"note": "hacked"}`. Then: 404; alice's read shows first.

### AC-ORD-024 — A 201-character note is rejected on PATCH (assumption, OQ-002)

Rule: BR-ORD-003
Statement: PATCH /orders/{id} with a note of 201 characters answers 400 and the note is unchanged.
Given: alice's order. When: a 201-character note is patched. Then: 400; re-read unchanged.

---

## ORD — lifecycle (FR-ORD-004)

### AC-ORD-030 — The owner pays a new order

Rule: BR-ORD-005
Statement: POST /orders/{id}/pay on a "new" order by its owner answers 200 with status "paid" and a non-null paid_at.
Given: alice's `new` order. When: alice posts `pay`. Then: 200, `status` = paid, `paid_at` set.

### AC-ORD-031 — A tenant manager ships a paid order

Rule: BR-ORD-005
Statement: POST /orders/{id}/ship on a "paid" order by a manager of the order's tenant answers 200 with status "shipped".
Given: alice's `paid` order. When: carol posts `ship`. Then: 200, `status` = shipped.

### AC-ORD-032 — Owner or tenant manager cancels a new order

Rule: BR-ORD-005
Statement: POST /orders/{id}/cancel on a "new" order by its owner, or by a manager of its tenant, answers 200 with status "cancelled".
Given: two `new` orders of alice. When: alice cancels one, carol the other. Then: 200 and `cancelled` for both.

### AC-ORD-033 — Every other transition is refused and changes nothing

Rule: BR-ORD-005
Statement: pay on a paid order, ship on a new order, and any action on a shipped or cancelled order each answer 409 with the body {"error": "invalid transition"} and the status is unchanged.
Given: orders in each status. When: each forbidden row of `STATE_MACHINES.md` is tried by an allowed actor.
Then: 409, that body; re-read shows the status before the call.

### AC-ORD-034 — The cancellation window boundary (assumption, OQ-001)

Rule: BR-ORD-006
Statement: cancel on a paid order 23 h 59 min 59 s after paid_at answers 200 with status "cancelled", and at 24 h 00 min 00 s or later answers 409 with the body {"error": "cancellation window closed"} and status stays "paid".
Given: a `paid` order and a controllable clock. When: cancel at `paid_at` + 23:59:59, and on another order at
`paid_at` + 24:00:00. Then: 200 cancelled; 409 with that body and `status` paid.

### AC-ORD-035 — Wrong role for the action answers 403

Rule: BR-SEC-002, BR-ORD-002
Statement: A customer calling ship, or a manager calling pay, answers 403 and the status is unchanged.
Given: alice's `paid` order and a `new` order. When: alice posts `ship`; carol posts `pay`. Then: 403 each;
statuses unchanged.

### AC-ORD-036 — The admin cannot move an order (assumption, OQ-004)

Rule: BR-SEC-002, BR-ORD-002
Statement: The admin calling pay, ship or cancel answers 403 and the status is unchanged.
Given: orders in `new` and `paid`. When: root posts each action. Then: 403 each; statuses unchanged.

---

## ORD — delete (FR-ORD-005)

### AC-ORD-040 — Tenant manager or admin deletes

Rule: BR-ORD-002
Statement: DELETE /orders/{id} by a manager of the order's tenant or by the admin answers 204 and a later GET /orders/{id} by the owner answers 404.
Given: two orders of alice. When: carol deletes one, root the other. Then: 204 each; alice's reads answer 404.

### AC-ORD-041 — A customer cannot delete

Rule: BR-SEC-002
Statement: DELETE /orders/{id} by a customer, including the owner, answers 403 and the owner's re-read returns the order unchanged.
Given: alice's order. When: alice deletes it. Then: 403; her read answers 200 with the order.

### AC-ORD-042 — Another tenant's manager sees nothing to delete

Rule: BR-SEC-001
Statement: DELETE /orders/{id} by a manager of another tenant answers 404 and the order still exists for its owner.
Given: alice's order. When: dave deletes it. Then: 404; alice's read answers 200.

---

## SEC

### AC-SEC-001 — Security headers on every response

Rule: BR-SEC-004
Statement: Every response, including 401, 404 and 204, carries X-Content-Type-Options: nosniff, X-Frame-Options: DENY, Content-Security-Policy: default-src 'none'; frame-ancestors 'none', Strict-Transport-Security: max-age=31536000; includeSubDomains, Cache-Control: no-store and Referrer-Policy: no-referrer.
Given: any request. When: a 200, a 401, a 404 and a 204 are provoked. Then: each carries exactly those six
header values.

### AC-SEC-002 — Allow-listed origin is granted

Rule: BR-SEC-005
Statement: A request with Origin https://app.example.test receives Access-Control-Allow-Origin: https://app.example.test and Vary: Origin.
Given: the default allow-list. When: `GET /orders` with that Origin. Then: both headers present with those values.

### AC-SEC-003 — Unknown origin is not granted, credentials never

Rule: BR-SEC-005
Statement: A request with any Origin not in the allow-list receives no Access-Control-Allow-Origin header, and no response ever carries Access-Control-Allow-Credentials.
Given: Origin `https://evil.example.test`. When: `GET /orders`. Then: neither header present.

### AC-SEC-004 — Internal errors leak nothing

Rule: BR-SEC-006
Statement: A 500 response has the body {"error": "internal error", "ref": "<8 hex characters>"} and contains no exception text, stack trace or file path.
Given: a fault path (the reference server's `GET /_boom`, test builds only). When: it is hit. Then: 500; body
has exactly `error` and an 8-hex `ref`; the raw body contains no "Traceback", ".py" or the fault's message.

### AC-SEC-005 — Denied function answers 403

Rule: BR-SEC-002
Statement: A denied function call answers 403 with the body {"error": "forbidden"}.
Given: alice. When: `GET /admin/users`. Then: 403 and that body.

---

## AUD

### AC-AUD-001 — Every denial is audited

Rule: BR-AUD-001
Statement: After a denied request, GET /_audit as the admin contains an entry whose actor is the caller's username or "anonymous", whose action is "<METHOD> <path>" of the request and whose outcome is "denied".
Given: an empty audit log. When: bob reads alice's order (404), then an anonymous `GET /orders` (401). Then: the
log has `{bob, "GET /orders/<id>", denied}` and `{anonymous, "GET /orders", denied}`.

### AC-AUD-002 — Only the admin reads the audit log

Rule: BR-AUD-001
Statement: GET /_audit by a customer or manager answers 403, and by the admin 200 with a JSON array.
Given: alice, carol, root. When: each calls `GET /_audit`. Then: 403, 403, 200 with an array.

---

## ADM

### AC-ADM-001 — The user list carries no secret

Rule: BR-ORD-002
Statement: GET /admin/users by the admin answers 200 with one object per seeded user containing username, tenant and role and no password field.
Given: root. When: `GET /admin/users`. Then: 200; six objects; keys exactly `username`, `tenant`, `role`.

### AC-ADM-002 — The user list is admin-only

Rule: BR-SEC-002
Statement: GET /admin/users by a customer or manager answers 403 and by anonymous 401.
Given: alice, carol, no token. When: each calls `GET /admin/users`. Then: 403, 403, 401.
