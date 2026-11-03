# Business Rules

Snapshot: 2026-11-03. Level 2 of the source-of-truth hierarchy: when a feature spec, an API description or the
reference implementation disagrees with a rule here, the rule wins. `Source: S1` is the brief (`02_PRD.md`
sentence number), `S2` the reference implementation, `ASSUMPTION` a working assumption blocked by the named OQ,
`MODEL RECOMMENDATION` a suggestion that needs approval before it is a rule.

Areas: `ORD` orders, `AUTH` login and tokens, `SEC` authorization answers and transport, `AUD` audit.

---

## BR-ORD-001 — An order belongs to its creator and the creator's tenant

Source: S1 sentences 4, 6; S2 `create_order`

### Rule
On creation the server sets `owner` to the caller's username, `tenant` to the caller's tenant and `status` to
`new`; the client cannot supply any of the three. `id` is assigned by the server, unique and never reused.

### Enforcement
Backend ignores or rejects `owner`, `tenant`, `status`, `id` in a create body (reject: BR-SEC-003 applies to PATCH;
for POST the three fields are server-set and a body naming them is rejected the same way — MODEL RECOMMENDATION,
the reference server ignores them).

### Audit
None on success.

### Verified By
AC-ORD-001, AC-ORD-005

---

## BR-ORD-002 — Data scope and function scope per role

Source: S1 sentences 6, 7, 8; S2 `list_orders`, `can_see`, `create_order`, `order`; ASSUMPTION for the admin
lifecycle rows (OQ-004) and the manager write rows (OQ-006)

### Rule
| Role | Sees | May create | May edit note | May pay | May ship | May cancel | May delete |
|---|---|---|---|---|---|---|---|
| customer | own orders (OWN) | yes | own | own | no | own | no |
| manager | every order of the tenant (TENANT) | yes (OQ-006) | tenant (OQ-006) | no | tenant | tenant | tenant |
| admin | every order (ALL) | no | no | no (OQ-004) | no (OQ-004) | no (OQ-004) | yes |

"Sees" is the precondition of every per-order operation: an order outside the caller's data scope is a hidden
object (BR-SEC-001). The full per-operation matrix with IDs is [`ROLES_PERMISSIONS.md`](ROLES_PERMISSIONS.md); this
table and that one must agree, and the matrix is the one tests read.

### Enforcement
Server-side on every request; there is no client.

### Audit
Every refusal (BR-AUD-001).

### Verified By
AC-ORD-002, AC-ORD-010, AC-ORD-011, AC-ORD-012, AC-ORD-013, AC-ORD-014, AC-ORD-035, AC-ORD-036, AC-ORD-040,
AC-ORD-041, AC-ORD-042, and every row of the matrix

---

## BR-ORD-003 — A note is at most 200 characters

Source: S1 sentence 4 (the limit); ASSUMPTION for what happens above it (OQ-002)

### Rule
`note` is a string of 0 to 200 characters (characters, not bytes). A note of 200 characters is stored whole. A
note of 201 or more characters is rejected with 400 and an error naming `note`; nothing is stored or changed.

### Enforcement
Backend validation on `POST /orders` and `PATCH /orders/{id}`. The reference implementation (S2) instead keeps the
first 200 characters — that is the existing implementation (level 8) and does not override this rule; it is why
OQ-002 is open.

### Audit
None.

### Verified By
AC-ORD-003, AC-ORD-004, AC-ORD-024

---

## BR-ORD-004 — Only `note` is editable through PATCH

Source: S1 sentence 6; S2 PATCH branch (`allowed = {"note"}`)

### Rule
The only field a client may change on an existing order is `note`. `status` moves only through the lifecycle
actions (BR-ORD-005, ADR-003); `owner`, `tenant` and `id` never change. A PATCH body naming any other field, known
or unknown, is rejected under BR-SEC-003. The note stays editable in every status (working assumption, OQ-005).

### Enforcement
Backend allow-list on PATCH.

### Audit
None on success.

### Verified By
AC-ORD-020, AC-ORD-021, AC-ORD-022

---

## BR-ORD-005 — The status lifecycle is fixed and every other transition is refused

Source: S1 sentence 5; ADR-003 for the endpoint shape

### Rule
Legal transitions are exactly: `new` → `paid` (pay), `paid` → `shipped` (ship), `new` → `cancelled` (cancel),
`paid` → `cancelled` (cancel, subject to BR-ORD-006). `shipped` and `cancelled` are terminal. Any action on an order
whose status has no row for that action in [`STATE_MACHINES.md`](STATE_MACHINES.md) answers 409 with error
`invalid transition` and changes nothing — including a repeated `pay`, `ship` or `cancel`, which makes each
action idempotent in effect: the second call changes nothing.

### Enforcement
Backend, inside the store lock so two concurrent `pay` calls cannot both succeed. `paid_at` is set on `new` →
`paid` and never changed.

### Audit
None on success; a refused transition is not an authorization denial and is not audited (MODEL RECOMMENDATION:
log it at info level).

### Verified By
AC-ORD-030, AC-ORD-031, AC-ORD-032, AC-ORD-033

---

## BR-ORD-006 — A paid order may be cancelled only within 24 hours of payment

Source: ASSUMPTION (OQ-001)

### Rule
`paid` → `cancelled` is allowed while `now - paid_at < 24 hours`. At exactly 24 hours or later the cancel answers
409 with error `cancellation window closed` and the order stays `paid`. The window is a configurable value
(`CONFIGURATION_RULES.md`, default 24 h).

### Enforcement
Backend, computed in one domain function from the stored `paid_at`; never duplicated in a client.

### Audit
None.

### Verified By
AC-ORD-034

---

## BR-ORD-007 — A customer may have at most 5 orders in status `new`

Source: ASSUMPTION (OQ-003)

### Rule
A `POST /orders` by a user who already owns 5 orders in status `new` answers 409 with error `too many open
orders` and creates nothing. Orders in `paid`, `shipped` or `cancelled` do not count; paying or cancelling a `new`
order frees a slot. The cap is a configurable value (default 5).

### Enforcement
Backend, counted inside the store lock together with the id allocation.

### Audit
None.

### Verified By
AC-ORD-006, AC-ORD-007

---

## BR-AUTH-001 — Login failure is one generic answer

Source: S1 sentence 11; S2 `login`

### Rule
A failed login — unknown username or wrong password — answers 401 with the body `{"error": "invalid credentials"}`
in both cases; nothing in status, body, headers or timing distinguishes them.

### Enforcement
Backend; the existence check and the password check share one failure path.

### Audit
Each failure counts toward BR-AUTH-002 for the submitted username.

### Verified By
AC-AUTH-002, AC-AUTH-003

---

## BR-AUTH-002 — Lockout after 5 failed attempts per account per minute

Source: S1 sentence 10; S2 `LOGIN_LIMIT`

### Rule
Failed attempts are counted per submitted username over a sliding window of 60 seconds. While the count is 5 or
more, `POST /auth/login` for that username answers 429 with the header `Retry-After: 60` and the body
`{"error": "too many attempts"}`, before the password is checked. Attempts against one username never affect
another. The limit (5) and the window (60 s) are configurable values.

### Enforcement
Backend, server-side counter.

### Audit
None beyond the counter (MODEL RECOMMENDATION: audit the first lockout per username).

### Verified By
AC-AUTH-004, AC-AUTH-005

---

## BR-AUTH-003 — A request is authenticated only by a valid signed token

Source: S1 sentence 9 (401); S2 `issue_token`, `verify_token`; ADR-004

### Rule
A token is issued at login, carries `sub`, `tenant`, `role` and `exp` (60 minutes), and is signed. A request whose
`Authorization: Bearer` token is missing, malformed, unsigned (`alg` `none`), carries a signature that does not
verify, or is past `exp` answers 401 with `{"error": "unauthorized"}` and is audited as anonymous.

### Enforcement
Backend, before routing to any protected operation.

### Audit
BR-AUD-001.

### Verified By
AC-AUTH-001, AC-AUTH-006, AC-AUTH-007

---

## BR-SEC-001 — Denied object access answers 404 and does not confirm existence

Source: S1 sentence 9; S2 `deny`; ADR-002

### Rule
When an authenticated caller addresses an order outside their data scope, the answer is 404 with
`{"error": "not found"}` — the same status and body as for an id that does not exist — on every per-order
operation (read, edit, pay, ship, cancel, delete).

### Enforcement
Backend: the scope check runs before the function check, so a hidden object never answers 403.

### Audit
BR-AUD-001.

### Verified By
AC-ORD-014, AC-ORD-015, AC-ORD-023, AC-ORD-042

---

## BR-SEC-002 — Denied function access answers 403; no token answers 401

Source: S1 sentence 9; S2 `deny`

### Rule
A caller who may see the object (or who calls an operation without an object) but whose role may not perform the
operation answers 403 with `{"error": "forbidden"}`. A request without a valid token answers 401 (BR-AUTH-003)
before any other check.

### Enforcement
Backend, order of checks: token → object scope → function.

### Audit
BR-AUD-001.

### Verified By
AC-SEC-005, AC-ORD-002, AC-ORD-035, AC-ORD-036, AC-ORD-041, AC-ADM-002

---

## BR-SEC-003 — Unknown or read-only fields are rejected with 400 naming them; a rejected request changes nothing

Source: S2 PATCH branch; S1 sentence 6

### Rule
A PATCH body that names any field other than `note` is rejected as a whole with 400 and the body
`{"error": "unknown or read-only fields", "fields": [...]}` listing the offending field names sorted. Unknown or
read-only fields are rejected with 400 naming them, never silently ignored; a rejected request changes nothing.

### Enforcement
Backend allow-list; the check runs before any write.

### Audit
None.

### Verified By
AC-ORD-021, AC-ORD-022

---

## BR-SEC-004 — Every response carries the security headers

Source: S1 sentence 12; S2 `SECURITY_HEADERS`

### Rule
Every response, including errors and 204, carries exactly:

| Header | Value |
|---|---|
| X-Content-Type-Options | `nosniff` |
| X-Frame-Options | `DENY` |
| Content-Security-Policy | `default-src 'none'; frame-ancestors 'none'` |
| Strict-Transport-Security | `max-age=31536000; includeSubDomains` |
| Cache-Control | `no-store` |
| Referrer-Policy | `no-referrer` |

### Enforcement
One response-writing function; no handler writes headers itself.

### Verified By
AC-SEC-001

---

## BR-SEC-005 — Cross-origin access is allow-listed and never credentialed by reflection

Source: S2 `ALLOWED_ORIGINS`, `send`

### Rule
A request with an `Origin` in the allow-list (`https://app.example.test`, example value) receives
`Access-Control-Allow-Origin` equal to that origin and `Vary: Origin`. Any other origin receives no
`Access-Control-Allow-Origin` header. `Access-Control-Allow-Credentials` is never sent. The allow-list is a
configurable value.

### Verified By
AC-SEC-002, AC-SEC-003

---

## BR-SEC-006 — An internal error answers 500 with a reference and nothing else

Source: S2 `route` exception branch

### Rule
An unhandled error answers 500 with `{"error": "internal error", "ref": "<8 hex characters>"}`. The body never
contains an exception message, a stack trace, a file path or an internal identifier; the reference is what an
operator searches the server log for.

### Verified By
AC-SEC-004

---

## BR-AUD-001 — Every denied request writes an audit entry; only the admin reads the log

Source: S1 sentence 13; S2 `deny`, `audit`

### Rule
Every response of 401, 403 or 404 produced by an authorization check appends one audit entry
`{"actor": <username or "anonymous">, "action": "<METHOD> <path>", "outcome": "denied"}`. `GET /_audit` returns the
entries to the admin and answers 403 to every other role. MODEL RECOMMENDATION: add a timestamp and the tenant to
each entry; the reference implementation (S2) stores the three fields above.

### Enforcement
The single deny function writes the entry; no handler can deny without it.

### Verified By
AC-AUD-001, AC-AUD-002
