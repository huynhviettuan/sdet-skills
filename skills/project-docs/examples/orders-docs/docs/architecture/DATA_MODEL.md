# Data Model

Snapshot: 2026-11-03. Entities start from the business concepts (`../product/00_PROJECT_OVERVIEW.md`), not from
screens. Source: S2 `Store`, `USERS`, `create_order`; `paid_at` and the audit timestamp are additions marked below.

## ERD

```text
 Tenant 1 ──── * User            (admin: tenant "*", belongs to every tenant)
 Tenant 1 ──── * Order
 User   1 ──── * Order           (owner)
 User   1 ──── * AuditEntry      (actor; "anonymous" when no token)
 User   1 ──── * LoginAttempt    (per submitted username, even unknown ones)
```

## Tenant

### Purpose
The isolation boundary. Every order and every non-admin user has exactly one.

### Key Fields
| Field | Type | Required | Derived | Description |
|---|---|:---:|:---:|---|
| id | string | yes | no | `tenant-a`, `tenant-b` (example values) |

### Constraints
Seeded (`../../specs/seed-data.json`); no API creates or changes tenants (`01_SCOPE.md`).

### Source of Truth
Seed data.

## User

### Key Fields
| Field | Type | Required | Derived | Description |
|---|---|:---:|:---:|---|
| username | string | yes | no | unique; the value of `owner` and of `actor` |
| tenant | Tenant.id or `*` | yes | no | `*` only for role `admin` (S2) |
| role | enum `customer`, `manager`, `admin` | yes | no | |
| password | secret | yes | no | never returned by any endpoint; example value in S2 |

### Constraints
`role = admin` ⇔ `tenant = *`. Seeded; no registration (`01_SCOPE.md`).

### Source of Truth
Seed data.

## Order

### Purpose
The thing customers create and managers ship.

### Key Fields
| Field | Type | Required | Derived | Description |
|---|---|:---:|:---:|---|
| id | integer ≥ 1 | yes | no | server-assigned, increasing, never reused (BR-ORD-001) |
| owner | User.username | yes | no | the creator; immutable |
| tenant | Tenant.id | yes | no | the creator's tenant; immutable (BR-ORD-001) |
| note | string, 0–200 chars | yes (may be empty) | no | the only client-editable field (BR-ORD-003/004) |
| status | enum `new`, `paid`, `shipped`, `cancelled` | yes | no | changes only through `../business/STATE_MACHINES.md` |
| paid_at | timestamp (UTC, ISO-8601) or null | no | no | set once on `new → paid`; needed by BR-ORD-006 — **addition**, not in S2 (ASSUMPTION, OQ-001) |

### Relationships
`owner` → User; `tenant` → Tenant; `owner`'s tenant always equals `tenant`.

### Constraints
- `note` length ≤ `order.note_max_chars` (BR-ORD-003).
- A customer owns at most `order.open_cap` orders with `status = new` (BR-ORD-007, assumption).
- `paid_at` is null ⇔ status is `new`, or `cancelled` from `new`.

### Derived values
`open_order_count(owner) = count(orders where owner = owner and status = new)` — computed, never stored
(BR-ORD-007). `cancellable(order, now) = status = new or (status = paid and now - paid_at < cancel_window)`.

### Source of Truth
The store; the API response is a projection of it (every field above except `password` is returned as-is).

## AuditEntry

### Key Fields
| Field | Type | Required | Derived | Description |
|---|---|:---:|:---:|---|
| actor | User.username or `anonymous` | yes | no | who was refused |
| action | string `"<METHOD> <path>"` | yes | no | e.g. `GET /orders/1` |
| outcome | enum `denied` | yes | no | S2 only writes denials (BR-AUD-001) |
| at | timestamp | no | no | MODEL RECOMMENDATION, not in S2 |

### Constraints
Append-only; never deleted by the API; read by admin only.

## LoginAttempt

### Key Fields
| Field | Type | Required | Derived | Description |
|---|---|:---:|:---:|---|
| username | string | yes | no | the submitted username, known or not (BR-AUTH-002) |
| at | timestamp | yes | no | failure time |

### Derived values
`locked(username, now) = count(attempts where username = username and now - at < 60 s) ≥ 5`.

### Constraints
Attempts older than the window are discarded; never returned by any endpoint.
