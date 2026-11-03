# Actors and permissions

Three roles, one tenant per user except the admin [S01 L16; S01 L18]. The roles sheet (S04) is the matrix the
service enforces [S04 L4]; the PRD and the meeting notes point to it rather than restating it [S01 L18; S02 L15].
There are no system actors in the sources besides the future payment-provider callback [S01 L63].

## Roles

| Role | Purpose | Typical tasks | Data scope | Sources |
|---|---|---|---|---|
| customer | places and follows orders for their tenant | create an order, edit its note, cancel it, read and list own orders | own | [S01 L9; S01 L44; S04 L33-L36] |
| manager | oversees the tenant's orders | read and list the tenant's orders, delete any of them, mark shipped (PRD; see C-2) | tenant | [S01 L10; S01 L45; S01 L36; S04 L34-L38] |
| admin | platform support | read and list every order, delete any order, list users, read the audit log; never create or edit | all | [S01 L46; S02 L43-L44; S04 L33-L40] |

## Example users

Synthetic users the roles sheet uses in its worked examples [S04 L6]. The sheet also lists an example password;
it is documented there as an example and is not copied here.

| User | Tenant | Role | Source |
|---|---|---|---|
| alice | tenant-a | customer | [S04 L10] |
| erin | tenant-a | customer | [S04 L11] |
| bob | tenant-b | customer | [S04 L12] |
| carol | tenant-a | manager | [S04 L13] |
| dave | tenant-b | manager | [S04 L14] |
| root | (none) | admin | [S04 L15] |

## Permission matrix

As the roles sheet gives it; scope: own = orders the user created, tenant = every order of the user's tenant,
all = every tenant [S04 L28].

| Capability | customer | manager | admin | Source |
|---|---|---|---|---|
| sign in | yes | yes | yes | [S04 L32] |
| create an order | yes | yes | no (403) | [S04 L33; S01 L46] |
| read an order | own | tenant | all | [S04 L34] |
| list orders | own | tenant | all | [S04 L35] |
| edit the note | own | no (403) | no (403) | [S04 L36; S02 L40-L41] |
| change the status | no | no | no | [S04 L37] — conflicts with [S01 L36; S01 L64], see C-2 |
| delete an order | no (403) | tenant | all | [S04 L38; S01 L45] |
| list users (admin page) | no (403) | no (403) | yes | [S04 L39] |
| read the audit log | no (403) | no (403) | yes | [S04 L40] |
| cancel an order | **Not stated** in the matrix; the PRD and S02 give it to the customer only | | | [S01 L37; S02 L25] — gap G-4 |

## Denial codes

| Situation | Code | Source |
|---|---|---|
| no token, or an invalid or expired token | 401 | [S04 L21] |
| the function is not for this role | 403 | [S04 L22] |
| the object exists but the caller must not know about it (BR-SEC-001: do not confirm existence) | 404 | [S04 L23; S01 L47-L48] |
| the object does not exist | 404 | [S04 L24] |

## Worked examples (the roles sheet's own)

The order under test is owned by alice of tenant-a [S04 L44].

| ID | Operation | Actor | Expected | Source |
|---|---|---|---|---|
| AZ-002 | read the order | alice (owner) | 200 | [S04 L48] |
| AZ-003 | read the order | erin (same tenant, not owner) | 404 | [S04 L49] |
| AZ-004 | read the order | bob (other tenant) | 404 | [S04 L50] |
| AZ-005 | read the order | carol (manager, same tenant) | 200 | [S04 L51] |
| AZ-006 | read the order | dave (manager, other tenant) | 404 | [S04 L52] |
| AZ-007 | read the order | root (admin) | 200 | [S04 L53] |
| AZ-011 | delete the order | alice (owner) | 403 | [S04 L54] |
| AZ-012 | delete the order | carol (manager, same tenant) | 204 | [S04 L55] |
| AZ-014 | delete the order | root (admin) | 204 | [S04 L56] |
| AZ-019 | create an order | root (admin) | 403 | [S04 L57] |

The sheet names what its examples do not cover: list scoping per actor, and an edit by a manager of the same
tenant [S04 L59-L60].

## Approvals

No approval step appears in any source. The only gated transition is `paid` → `shipped`, done by a manager
[S01 L36]; nothing says a second person confirms it. *(inferred from [S01 L31-L40], [S04 L30-L40])*
