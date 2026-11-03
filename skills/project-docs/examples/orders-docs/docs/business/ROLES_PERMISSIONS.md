# Roles and Permissions — Orders (snapshot 2026-11-03)

The documented permission model and the single source of authorization tests: `authz_matrix.py generate` reads
the matrix below, the suite runs one test per row, and nothing in the tests decides what is allowed — this table
does. Rows AZ-001..AZ-023 are verbatim from the reference matrix (S3); rows AZ-024 onward add the lifecycle
actions (ADR-003), list scoping and the audit log. Rows marked with an OQ are working assumptions.

## Permission Model

Format: `module.action`

| Permission | customer | manager | admin |
|---|:---:|:---:|:---:|
| order.create | yes | yes (OQ-006) | no |
| order.read | OWN | TENANT | ALL |
| order.edit_note | OWN | TENANT (OQ-006) | no |
| order.pay | OWN | no | no (OQ-004) |
| order.ship | no | TENANT | no (OQ-004) |
| order.cancel | OWN | TENANT | no (OQ-004) |
| order.delete | no | TENANT | ALL |
| admin.users | no | no | yes |
| audit.read | no | no | yes |

## Data Scope

- ALL — every tenant (admin only)
- TENANT — every order whose `tenant` equals the caller's
- OWN — every order whose `owner` equals the caller's username

## Sensitive Fields

| Field | admin | manager | customer |
|---|:---:|:---:|:---:|
| password (any user) | never returned | never returned | never returned |
| audit log | yes | no | no |
| other tenants' orders | yes | no | no |

## Approval Authority

N/A — no operation needs a second actor's approval.

## Server Enforcement

UI visibility is not authorization (there is no UI). All permissions are enforced server-side, in the order:
token (401, BR-AUTH-003) → object scope (404, BR-SEC-001) → function (403, BR-SEC-002). Every refusal is audited
(BR-AUD-001).

## Actors

Actors are relative to the order under test, which is owned by `alice` of `tenant-a` (example values, S2):

| Actor | User | Why |
|---|---|---|
| anonymous | — | no token |
| customer-own | alice | the owner |
| customer-same-tenant | erin | same tenant, not the owner |
| customer-other-tenant | bob | another tenant |
| manager-same-tenant | carol | manager of tenant-a |
| manager-other-tenant | dave | manager of tenant-b |
| admin | root | platform admin |

Precondition per operation: `POST /orders/{id}/pay` — the order is `new`; `POST /orders/{id}/ship` — the order is
`paid`; `POST /orders/{id}/cancel` — the order is `new`. Every other row uses an order in `new`.

## Matrix

| ID | Operation | Actor | Expected |
|---|---|---|---|
| AZ-001 | GET /orders/{id} | anonymous | 401 |
| AZ-002 | GET /orders/{id} | customer-own | 200 |
| AZ-003 | GET /orders/{id} | customer-same-tenant | 404 |
| AZ-004 | GET /orders/{id} | customer-other-tenant | 404 |
| AZ-005 | GET /orders/{id} | manager-same-tenant | 200 |
| AZ-006 | GET /orders/{id} | manager-other-tenant | 404 |
| AZ-007 | GET /orders/{id} | admin | 200 |
| AZ-008 | PATCH /orders/{id} | customer-own | 200 |
| AZ-009 | PATCH /orders/{id} | customer-other-tenant | 404 |
| AZ-010 | PATCH /orders/{id} | manager-other-tenant | 404 |
| AZ-011 | DELETE /orders/{id} | customer-own | 403 |
| AZ-012 | DELETE /orders/{id} | manager-same-tenant | 204 |
| AZ-013 | DELETE /orders/{id} | manager-other-tenant | 404 |
| AZ-014 | DELETE /orders/{id} | admin | 204 |
| AZ-015 | GET /admin/users | customer-own | 403 |
| AZ-016 | GET /admin/users | manager-same-tenant | 403 |
| AZ-017 | GET /admin/users | admin | 200 |
| AZ-018 | GET /admin/users | anonymous | 401 |
| AZ-019 | POST /orders | admin | 403 |
| AZ-020 | POST /orders | customer-own | 201 |
| AZ-021 | POST /orders | anonymous | 401 |
| AZ-022 | PATCH /orders/{id} | anonymous | 401 |
| AZ-023 | DELETE /orders/{id} | anonymous | 401 |
| AZ-024 | POST /orders/{id}/pay | anonymous | 401 |
| AZ-025 | POST /orders/{id}/pay | customer-own | 200 |
| AZ-026 | POST /orders/{id}/pay | customer-same-tenant | 404 |
| AZ-027 | POST /orders/{id}/pay | customer-other-tenant | 404 |
| AZ-028 | POST /orders/{id}/pay | manager-same-tenant | 403 |
| AZ-029 | POST /orders/{id}/pay | manager-other-tenant | 404 |
| AZ-030 | POST /orders/{id}/pay | admin | 403 |
| AZ-031 | POST /orders/{id}/ship | anonymous | 401 |
| AZ-032 | POST /orders/{id}/ship | customer-own | 403 |
| AZ-033 | POST /orders/{id}/ship | customer-other-tenant | 404 |
| AZ-034 | POST /orders/{id}/ship | manager-same-tenant | 200 |
| AZ-035 | POST /orders/{id}/ship | manager-other-tenant | 404 |
| AZ-036 | POST /orders/{id}/ship | admin | 403 |
| AZ-037 | POST /orders/{id}/cancel | anonymous | 401 |
| AZ-038 | POST /orders/{id}/cancel | customer-own | 200 |
| AZ-039 | POST /orders/{id}/cancel | customer-same-tenant | 404 |
| AZ-040 | POST /orders/{id}/cancel | customer-other-tenant | 404 |
| AZ-041 | POST /orders/{id}/cancel | manager-same-tenant | 200 |
| AZ-042 | POST /orders/{id}/cancel | manager-other-tenant | 404 |
| AZ-043 | POST /orders/{id}/cancel | admin | 403 |
| AZ-044 | GET /orders | anonymous | 401 |
| AZ-045 | GET /orders | customer-own | 200 |
| AZ-046 | GET /_audit | anonymous | 401 |
| AZ-047 | GET /_audit | customer-own | 403 |
| AZ-048 | GET /_audit | admin | 200 |
| AZ-049 | POST /orders | manager-same-tenant | 201 |
| AZ-050 | PATCH /orders/{id} | customer-same-tenant | 404 |
| AZ-051 | PATCH /orders/{id} | manager-same-tenant | 200 |

Assumption rows (OQ-004): AZ-030, AZ-036, AZ-043. Assumption rows (OQ-006): AZ-049, AZ-051.

Not in the matrix (the matrix checks status per actor; these need a body assertion): `GET /orders` content per
actor — AC-ORD-010/011/012; `POST /auth/login` — not an authorization cell, FR-AUTH-001. `GET /_audit` by a
manager (403, same path as AZ-047) and `POST /_reset` / `GET /_boom` (out of scope, `01_SCOPE.md`) are omitted.

## Rules this table enforces

BR-ORD-002 (scopes), BR-SEC-001 (404), BR-SEC-002 (403/401), BR-AUD-001 (every denial audited).
