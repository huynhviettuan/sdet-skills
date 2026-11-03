# System Architecture

Snapshot: 2026-11-03. Approved shape: one stateless HTTP service with an in-memory store (ADR-001..004). Source:
S2 for the existing shape; MODEL RECOMMENDATION where the reference server has no boundary yet.

## Context

```text
 client (any HTTP client; no UI in scope)
     │  JSON over HTTP, Authorization: Bearer <token>
     ▼
 ┌─────────────────────────── Orders API ───────────────────────────┐
 │ routing ─► authn (token) ─► authz (scope, function) ─► domain    │
 │                                   │                      │       │
 │                                   ▼                      ▼       │
 │                               audit log            Store (lock)  │
 └──────────────────────────────────────────────────────────────────┘
```

No database, queue, cache or external service. Tenancy is a column (`tenant`) checked on every per-order
operation, not a separate deployment.

## Modules and boundaries

| Module | Responsibility | Must not |
|---|---|---|
| routing | map `(method, path)` to a handler; drain the body before any early refusal | contain any rule |
| authn | verify the bearer token (BR-AUTH-003); login and the lockout counter (BR-AUTH-001/002) | know about orders |
| authz | data scope and function checks in the fixed order token → object → function (BR-SEC-001/002); the single `deny` function that also audits | be bypassed by any handler |
| orders domain | create, read, edit note, pay/ship/cancel, delete; validation (BR-ORD-003/004), transitions (BR-ORD-005/006), the open-order cap (BR-ORD-007) | write headers or read the request |
| audit | append-only list of denials; admin read (BR-AUD-001) | be written by anything but `deny` |
| store | the dictionaries and the lock; id allocation; `reset` for tests only | be touched directly by handlers |
| response | one function that writes status, JSON body, security headers (BR-SEC-004) and CORS (BR-SEC-005) | be duplicated |

## Cross-cutting decisions

- Every rule is enforced server-side; there is no client to trust (`ROLES_PERMISSIONS.md` "Server Enforcement").
- Every multi-step mutation (id allocation + open-order count, status transition + `paid_at`) runs inside the
  store lock so concurrent requests cannot both succeed (BR-ORD-005, BR-ORD-007).
- Errors: one error-body shape `{"error": "<message>"}` plus optional `fields` / `ref` (`../api/ERROR_CODES.md`);
  unhandled exceptions become BR-SEC-006 responses.
- Configuration is read in domain functions only (`../business/CONFIGURATION_RULES.md`).

## Non-goals of the architecture

Persistence across restarts, horizontal scaling (the lockout counter and the audit log are per process), and
observability beyond the server log. A product deployment would replace the store behind the same interface
(`DATA_MODEL.md` "Source of truth").
