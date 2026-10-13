# Automated Security Tests

Security checks written as ordinary tests in the existing automation suite (mostly API level), so they run on every
build and never regress. Scanners find generic flaws; these tests verify **your** rules — who may do what to which
data — which no scanner knows.

Examples are Playwright API tests in TypeScript (labeled); the patterns apply to any API test tool. Fixtures follow
`sdet-framework-architect`: data and accounts come from fixtures that own their teardown.

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

*Playwright example:*

```ts
const matrix = [
  { method: 'DELETE', path: (o) => `/orders/${o.id}`, expect: { anonymous: 401, customer: 403, staff: 403, admin: 204 } },
  { method: 'GET',    path: () => '/admin/users',      expect: { anonymous: 401, customer: 403, staff: 403, admin: 200 } },
] as const;

for (const row of matrix) {
  for (const [role, status] of Object.entries(row.expect)) {
    test(`[TC-SEC-ACL] ${role} ${row.method} ${row.path({ id: ':id' })} → ${status}`,
      async ({ apiAs, orderFactory }) => {
        const order = await orderFactory.create();              // fixture-owned, torn down after
        const res = await apiAs(role).fetch(row.path(order), { method: row.method });
        expect(res.status()).toBe(status);
      });
  }
}
```

Every new endpoint adds a row; a missing row is a review blocker. Default expectation for anything not listed:
deny.

---

## Object-level authorization (BOLA / IDOR)

The most common serious API flaw: the endpoint checks *that* you're logged in, not *whether this object is yours*.

For every endpoint that takes an object id (path, query, body, header):

```text
Arrange: owner A creates object X; attacker B is a valid user (same role, different owner/tenant)
Act:     B reads / updates / deletes X by id
Assert:  denied (404 preferred, so existence isn't confirmed) AND X is unchanged (re-read as A)
```

*Playwright example:*

```ts
test('[TC-SEC-ORDER-003] customer cannot read another customer’s order', async ({ customerA, customerB, orderFactory }) => {
  const order = await orderFactory.create({ owner: customerA });
  const res = await customerB.get(`/orders/${order.id}`);
  expect(res.status()).toBe(404);
  expect(await res.text()).not.toContain(order.id);
});
```

Also cover: ids inside bulk/list filters (`?customerId=`), nested resources (`/orders/:id/invoice`), exports, and
GraphQL node lookups. Unguessable ids (UUIDs) reduce exposure but are not access control.

---

## Property-level authorization and mass assignment

- **Excessive data exposure**: responses must not include fields the caller may not see (password hashes, internal
  flags, other users' PII). Assert the response schema has no extra fields for each role.
- **Mass assignment**: send fields the caller must not set and assert they're ignored or rejected:

```text
PATCH /users/me  { "displayName": "x", "role": "admin", "isVerified": true, "tenantId": "<other>" }
→ 200 or 400, and re-reading the user shows role/isVerified/tenantId unchanged
```

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

---

## Errors and information leakage

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
