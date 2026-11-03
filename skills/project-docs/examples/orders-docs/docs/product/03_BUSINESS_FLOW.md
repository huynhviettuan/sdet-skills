# 03 — Business Flow

Snapshot: 2026-11-03. Fixed workflow (implemented in code, ADR-003); the values that may change are in
`../business/CONFIGURATION_RULES.md`.

## End-to-end: an order's life

```text
Customer logs in ──► creates order (new) ──► pays (paid) ──► Manager ships (shipped)
                            │                   │
                            └──── cancels ──────┘──► (cancelled)   [paid: within the cancellation window]
Manager may delete at any status; Admin reads everything and the audit log.
```

## Flow 1 — Login (FR-AUTH-001)

1. Anonymous user sends username and password to `POST /auth/login`.
2. If the account has reached the failed-attempt limit in the last minute, the API answers 429 with `Retry-After`
   (BR-AUTH-002) and stops.
3. If the credentials match, the API answers 200 with a signed token valid for 60 minutes (BR-AUTH-003).
4. Otherwise the API records a failed attempt for that username and answers 401 with the one generic message
   (BR-AUTH-001).

## Flow 2 — Create and follow an order (FR-ORD-001, FR-ORD-002, FR-ORD-003)

1. Customer (`alice`) sends `POST /orders` with a note. The API assigns the next id, sets `owner` = `alice`,
   `tenant` = `tenant-a`, `status` = `new` (BR-ORD-001).
2. The customer lists `GET /orders` and sees only her own orders; manager `carol` sees all of `tenant-a`; `root`
   sees both tenants (BR-ORD-002).
3. The customer changes the note with `PATCH /orders/{id}`; a body naming `status` or `tenant` is refused and
   nothing changes (BR-ORD-004, BR-SEC-003).

## Flow 3 — Pay, ship, cancel (FR-ORD-004)

1. The owner pays: `POST /orders/{id}/pay` moves `new` → `paid` and stamps `paid_at`.
2. A manager of the tenant ships: `POST /orders/{id}/ship` moves `paid` → `shipped`. Shipped is terminal.
3. The owner or a tenant manager cancels: `POST /orders/{id}/cancel` moves `new` → `cancelled`, or `paid` →
   `cancelled` while the cancellation window is open (BR-ORD-006, assumption).
4. Any other transition answers 409 and the order is unchanged (BR-ORD-005).

## Flow 4 — Delete (FR-ORD-005)

A manager of the tenant, or the admin, sends `DELETE /orders/{id}`; a customer's attempt answers 403.

## Flow 5 — A denied request (BR-SEC-001, BR-SEC-002, BR-AUD-001)

1. Someone asks for an order outside their scope (`bob` reads `alice`'s order).
2. The API answers 404 with the same body it uses for an id that never existed.
3. An audit entry `{actor: bob, action: "GET /orders/1", outcome: denied}` is written; only the admin can read it.

## Flow 6 — Admin oversight (FR-ADM-001)

`root` lists users (`GET /admin/users`) and reads the audit log (`GET /_audit`); any other role answers 403.
