# Automated Security Tests

Security checks written as ordinary tests in the existing automation suite (mostly API level), so they run on every
build and never regress. Scanners find generic flaws; these tests verify **your** rules — who may do what to which
data — which no scanner knows.

Code blocks are copied from the runnable example `examples/vuln-api/` (pytest + stdlib against a switchable-flaw
API; 35 passed + 1 xfailed sentinel on 2026-11-03, and `scripts/selftest.py` proves each test turns red for its
flaw). The patterns apply to any API test tool; fixtures follow `sdet-framework-architect`: data and accounts come
from fixtures that own their teardown.

Contents:

- [Fixtures you need](#fixtures-you-need)
- [Access-control matrix](#access-control-matrix)
- [Object-level authorization (BOLA / IDOR)](#object-level-authorization-bola--idor)
- [Property-level authorization and mass assignment](#property-level-authorization-and-mass-assignment)
- [Authentication and session](#authentication-and-session)
- [Input handling](#input-handling)
- [Transport, headers, cookies, CORS](#transport-headers-cookies-cors)
- [Errors and information leakage](#errors-and-information-leakage)
- [Resource limits](#resource-limits)
- [File upload](#file-upload)
- [Business-logic abuse](#business-logic-abuse)
- [Audit logging](#audit-logging)
- [Rules for security tests](#rules-for-security-tests)

---

## Fixtures you need

- **One API client per role** (anonymous, customer, staff, manager, admin…), each authenticated once per worker.
- **Two tenants / two owners** — every isolation test needs a victim and an attacker who are both legitimate users.
- **Data factories** that create an object owned by a given user/tenant and delete it in teardown.

---

## Access-control matrix

Drive function-level authorization (BFLA) from one table instead of hand-writing a test per combination. The
matrix is the documented permission model (`ROLES_PERMISSIONS.md`) made executable.

```text
| Endpoint                     | anonymous | customer | staff | admin |
|------------------------------|-----------|----------|-------|-------|
| GET    /orders/:id (own)     | 401       | 200      | 200   | 200   |
| DELETE /orders/:id           | 401       | 403      | 403   | 204   |
| GET    /admin/users          | 401       | 403      | 403   | 200   |
| POST   /contracts/:id/approve| 401       | 403      | 403   | 200   |
```

The executable form is one row per cell, `ID | Operation | Actor | Expected`, read by `scripts/authz_matrix.py`
(`examples/vuln-api/ROLES_PERMISSIONS.md`); the suite parametrizes one test per row and never decides an expected
result itself:

```python
MATRIX = load_matrix(Path(__file__).parent / "ROLES_PERMISSIONS.md")


# TC-SEC-AUTHZ-001 - one test per matrix row; the table is the only source of expected results.
@pytest.mark.parametrize("cell", MATRIX, ids=[c.id for c in MATRIX])
def test_access_control_matrix(api: Api, tokens: dict[str, str | None], alice_order: dict, cell) -> None:
    method, _, template = cell.operation.partition(" ")
    path = template.replace("{id}", str(alice_order["id"]))
    body = {"note": "edited"} if method in {"PATCH", "POST"} else None

    r = api.request(method, path, token=tokens[cell.actor], json_body=body)

    assert r.status == cell.expected, f"{cell.id} {cell.operation} as {cell.actor}: {r.status} {r.body}"
```

After a run, `python scripts/authz_matrix.py verify ROLES_PERMISSIONS.md junit.xml` proves every cell had a test
and it passed (a cell with no test is an error, not a gap note). `generate` warns when an operation has no deny row
or no anonymous row — a matrix of allows proves nothing.

Every new endpoint adds a row; a missing row is a review blocker. Default expectation for anything not listed:
deny. Actors are relative to the object under test (owner, same tenant, other tenant, manager of each, admin), not
just roles — most BOLA bugs live between two users of the *same* role.

---

## Object-level authorization (BOLA / IDOR)

The most common serious API flaw: the endpoint checks *that* you're logged in, not *whether this object is yours*.

For every endpoint that takes an object id (path, query, body, header):

```text
Arrange: owner A creates object X; attacker B is a valid user (same role, different owner/tenant)
Act:     B reads / updates / deletes X by id
Assert:  denied (404 preferred, so existence isn't confirmed) AND X is unchanged (re-read as A)
```

```python
# TC-SEC-BOLA-001 - the attacker is denied AND the object is unchanged (flaw: bola)
def test_bola_attacker_cannot_change_another_tenants_order(api: Api, tokens, alice_order: dict) -> None:
    attack = api.request("PATCH", f"/orders/{alice_order['id']}", token=tokens["customer-other-tenant"],
                         json_body={"note": "owned"})
    after = api.request("GET", f"/orders/{alice_order['id']}", token=tokens["customer-own"])

    assert attack.status == 404
    assert after.body["note"] == "original"
```

The second assertion is the one that matters: an endpoint that answers 404 and still applies the change is the
worse bug. The suite's **sentinel** is the same read from the other tenant asserted as `200` under
`xfail(strict=True)` — if object-level authorization disappears, the sentinel passes and the run goes red.

Also cover: ids inside bulk/list filters (`?customerId=`), nested resources (`/orders/:id/invoice`), exports, and
GraphQL node lookups. Unguessable ids (UUIDs) reduce exposure but are not access control.

---

## Property-level authorization and mass assignment

- **Excessive data exposure**: responses must not include fields the caller may not see (password hashes, internal
  flags, other users' PII). Assert the response schema has no extra fields for each role.
- **Mass assignment**: send fields the caller must not set and assert they're ignored or rejected:

```python
# TC-SEC-MASS-001 - read-only fields are rejected, not silently ignored (flaw: mass)
def test_mass_assignment_rejected(api: Api, tokens, alice_order: dict) -> None:
    r = api.request("PATCH", f"/orders/{alice_order['id']}", token=tokens["customer-own"],
                    json_body={"note": "ok", "status": "paid", "tenant": "tenant-b"})
    after = api.request("GET", f"/orders/{alice_order['id']}", token=tokens["customer-own"])

    assert r.status == 400
    assert r.body["fields"] == ["status", "tenant"]
    assert (after.body["status"], after.body["tenant"]) == ("new", "tenant-a")
```

  Rejecting (400 naming the fields) beats ignoring: a silently dropped field hides a client bug and makes the
  test weaker (only the re-read proves anything). The candidates come from the schema's `readOnly` fields —
  see `schema-driven-negative-tests.md`.

---

## Authentication and session

| Test | Expectation |
|---|---|
| No token / malformed token | 401 |
| Expired token | 401 |
| Token with tampered payload or signature, `alg: none` | 401 |
| Token from another environment / issuer | 401 |
| Logout, then reuse old token/session | 401 (server-side invalidation) |
| Password change / role change | Existing sessions invalidated or re-scoped, per policy |
| Login failures | Generic message (no "user not found" vs "wrong password" difference); lockout or throttling per policy |
| Password reset token | Single use, expires, bound to the account |
| Session cookie after login | New session id issued (no fixation) |

Never put real credentials in tests; use per-role test accounts from the secret store.

Lockout and enumeration from the example (the error body is compared whole, not matched for wording):

```python
# TC-SEC-AUTHN-001 - failed logins are rate-limited per account (flaw: ratelimit)
def test_login_rate_limited(api: Api) -> None:
    for _ in range(app.LOGIN_LIMIT):
        assert api.login("nobody-rl", "wrong").status == 401

    r = api.login("nobody-rl", "wrong")

    assert r.status == 429
    assert r.headers.get("Retry-After") == "60"


# TC-SEC-AUTHN-002 - the login error is identical for unknown users and wrong passwords (flaw: enum)
def test_login_does_not_reveal_usernames(api: Api) -> None:
    known = api.login("alice", "wrong")
    unknown = api.login("zed", "wrong")

    assert (known.status, known.body) == (unknown.status, unknown.body)
```

Token tests (`alg=none`, tampered, expired, and the rest of the JWT/OAuth list) are in `api-security.md`.

---

## Input handling

For each input *class* (free text, identifiers, numbers, dates, URLs, file names, rich text/HTML, JSON bodies,
headers), assert the application treats hostile-looking input as data:

- Validation rejects out-of-range/oversized/wrong-type values with 400 and a clean error (no 500).
- Values containing quotes, angle brackets, template syntax, or path separators are stored and **returned encoded**
  (or rejected), never interpreted. Use harmless marker strings (e.g. `sec-marker-<uuid>'"<>{{7*7}}../`) and assert
  on the echoed output — the goal is to verify handling, not to exploit.
- URL-accepting fields (webhooks, avatars, imports) reject internal/loopback/metadata addresses if the server
  fetches them (SSRF control), per the documented allowlist.

Deep injection discovery belongs to SAST/DAST (see `pipeline-scanning.md`); these tests pin the expected behavior so
a fix never regresses.

---

## Transport, headers, cookies, CORS

Assert on a representative set of responses (HTML page, API JSON, error, file download):

```text
Strict-Transport-Security   present, max-age ≥ policy
Content-Security-Policy     present on HTML, no 'unsafe-inline' unless documented
X-Content-Type-Options      nosniff
Frame protection            CSP frame-ancestors or X-Frame-Options
Referrer-Policy             set
Cache-Control               no-store on authenticated/sensitive responses
Server / X-Powered-By       no version disclosure

Session cookie              Secure; HttpOnly; SameSite=Lax|Strict; scoped Path/Domain

CORS                        Origin: https://evil.example → no Access-Control-Allow-Origin echo;
                            never "*" together with credentials
```

In the suite, assert exact values against the documented policy (the example's `SECURITY_HEADERS` dict is the
policy):

```python
# TC-SEC-HDR-001 - every documented security header, exact value (flaw: headers)
def test_security_headers_present(api: Api, tokens) -> None:
    r = api.request("GET", "/orders", token=tokens["customer-own"])

    missing = {k: v for k, v in app.SECURITY_HEADERS.items() if r.headers.get(k) != v}
    assert missing == {}, f"missing or wrong: {missing}"


# TC-SEC-CORS-001 - an unknown origin gets no CORS grant (flaw: cors)
def test_cors_rejects_unknown_origin(api: Api, tokens) -> None:
    r = api.request("GET", "/orders", token=tokens["customer-own"],
                    headers={"Origin": "https://evil.example.test"})

    assert "Access-Control-Allow-Origin" not in r.headers
    assert "Access-Control-Allow-Credentials" not in r.headers
```

Keep the positive path too (`test_cors_allows_listed_origin`): a CORS policy that grants nobody also passes the
negative test. Outside the suite — a deployed test environment, a release check — `scripts/headers_check.py <url>`
runs the same policy from a JSON file with `HDR-`/`CKE-`/`CORS-` findings, and refuses any host not listed in
its `test_hosts`.

---

## Errors and information leakage

```python
# TC-SEC-ERR-001 - a 500 carries a reference, never a trace or a file path (flaw: errors)
def test_error_response_does_not_leak(api: Api) -> None:
    r = api.request("GET", "/_boom")

    assert r.status == 500
    text = json.dumps(r.body)
    assert "Traceback" not in text and "app.py" not in text and "pricing" not in text
    assert "ref" in r.body
```

The example provokes the fault through a test hook; a real suite uses a real fault path (a dependency stub that
throws) and keeps the "reference present" assertion — a bare 500 with no correlation id is a support problem.

Force errors (invalid JSON, unknown route, wrong method, oversized body, invalid id format) and assert: correct
4xx, a generic error body in the documented error format, no stack traces, SQL fragments, internal hostnames, file
paths, or framework versions.

---

## Resource limits

Verify documented limits are enforced (functional checks, not load tests — use `performance-testing` for load):

- Rate limit: N+1 requests in the window → 429 with `Retry-After`.
- Maximum page size: `?limit=100000` capped or rejected.
- Request body size, array length, nesting depth, upload size → rejected with 413/400.
- Expensive operations (exports, searches) require auth and are throttled.

---

## File upload

- Content type validated by content, not only extension/`Content-Type` header.
- Size limit enforced.
- Stored file name is server-generated; the original name never becomes a path.
- Uploaded HTML/SVG is not served inline from the app's origin.
- Download of another user's file is denied (BOLA again).

---

## Business-logic abuse

Turn each abuse case from the threat model into a test:

- Negative/zero/huge quantities and prices; currency mismatch.
- Reusing a single-use coupon/token; applying it twice in parallel requests (race).
- Skipping or reordering workflow steps (confirm before pay; approve own request).
- Changing a price/total/role on the client and submitting.
- Acting on an object in a state that forbids it (edit after approval).

These map directly to the state machines and business rules in the product docs.

---

## Audit logging

```python
# TC-SEC-AUDIT-001 - a denied request leaves an audit entry naming actor and action (flaw: audit)
def test_denied_request_is_audited(api: Api, tokens) -> None:
    assert api.request("GET", "/admin/users", token=tokens["customer-own"]).status == 403

    audit = api.request("GET", "/_audit", token=tokens["admin"])

    assert {"actor": "alice", "action": "GET /admin/users", "outcome": "denied"} in audit.body
```

Sensitive actions (login, failed login, permission change, approval, export, deletion) produce an audit event with
actor, timestamp, action, target — and the event contains **no secrets or full PII**. Assert via the audit API or
log sink the system exposes.

---

## Rules for security tests

- Name with the shared ID scheme: `TC-SEC-<AREA>-NNN`, linked to the AC / BR it verifies.
- Assert both the denial **and** that state didn't change (re-read as the owner).
- Use only test accounts and synthetic data; never point these tests at systems outside the authorized scope.
- Payloads are benign markers; nothing destructive, nothing that targets other users of a shared environment.
- Security tests are regular tests: in the PR suite when fast (access matrix, headers, authn), never quarantined
  silently — a failing security test blocks merge until fixed or formally risk-accepted.
