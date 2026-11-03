<!-- S04: 04_roles_sheet.md — extracted 2026-11-03; cite as [S04 L<line>] -->
# Roles and permissions — Orders (snapshot 2026-10-15)

One page. The service enforces this table; the PRD links to it. Basis: assumption (an example product).

Example users (synthetic, documented as examples; the password of every example user is `example-password`):

| User | Tenant | Role |
|---|---|---|
| alice | tenant-a | customer |
| erin | tenant-a | customer |
| bob | tenant-b | customer |
| carol | tenant-a | manager |
| dave | tenant-b | manager |
| root | (none) | admin |

## Response codes

| Situation | Code | Rule |
|---|---|---|
| no token, or an invalid or expired token | 401 | — |
| the function is not for this role | 403 | — |
| the object exists but the caller must not know about it | 404 | BR-SEC-001: do not confirm existence |
| the object does not exist | 404 | — |

## Matrix

Scope column: own = orders the user created; tenant = every order of the user's tenant; all = every tenant.

| Capability | customer | manager | admin |
|---|---|---|---|
| sign in | yes | yes | yes |
| create an order | yes | yes | no (403) |
| read an order | own | tenant | all |
| list orders | own | tenant | all |
| edit the note | own | no (403) | no (403) |
| change the status | no | no | no |
| delete an order | no (403) | tenant | all |
| list users (admin page) | no (403) | no (403) | yes |
| read the audit log | no (403) | no (403) | yes |

## Worked examples

The order under test is owned by alice (tenant-a).

| ID | Operation | Actor | Expected |
|---|---|---|---|
| AZ-002 | read the order | alice (owner) | 200 |
| AZ-003 | read the order | erin (same tenant, not owner) | 404 |
| AZ-004 | read the order | bob (other tenant) | 404 |
| AZ-005 | read the order | carol (manager, same tenant) | 200 |
| AZ-006 | read the order | dave (manager, other tenant) | 404 |
| AZ-007 | read the order | root (admin) | 200 |
| AZ-011 | delete the order | alice (owner) | 403 |
| AZ-012 | delete the order | carol (manager, same tenant) | 204 |
| AZ-014 | delete the order | root (admin) | 204 |
| AZ-019 | create an order | root (admin) | 403 |

Not covered by the examples: list scoping per actor; edit by a manager of the same tenant (same code path as read,
then 403).
