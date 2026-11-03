# Roles and permissions — vuln-api (snapshot 2026-11-03)

The documented permission model. `scripts/authz_matrix.py` reads this table; `test_security.py` runs one test per
row; nothing in the tests decides what is allowed — this table does. Basis: assumption (an example product).

Actors are relative to the order under test, which is owned by `alice` of `tenant-a`:

| Actor | User | Why |
|---|---|---|
| anonymous | — | no token |
| customer-own | alice | the owner |
| customer-same-tenant | erin | same tenant, not the owner |
| customer-other-tenant | bob | another tenant |
| manager-same-tenant | carol | manager of tenant-a |
| manager-other-tenant | dave | manager of tenant-b |
| admin | root | platform admin |

Denied access to an object the actor must not know about answers `404` (BR-SEC-001: do not confirm existence);
denied access to a function answers `403`; a missing or invalid token answers `401`.

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

Not in the matrix (gaps, with risk): `GET /orders` list scoping per actor — Medium, covered by a separate
list-scoping case in a real suite; `PATCH` by `customer-same-tenant` and `manager-same-tenant` — Low, same code
path as the GET rows.
