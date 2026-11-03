# FR-ORD-002 — List and read orders

Snapshot: 2026-11-03. Source: S1 sentences 6–9; S2 `list_orders`, `can_see`, `order` (GET).

## Purpose
Show each caller exactly the orders in their data scope: a customer their own, a manager their tenant's, the admin
everyone's — and nothing about any other.

## Actors
customer, manager, admin.

## Preconditions
Valid token.

## Main Flow
1. `GET /orders` → 200 with a JSON array of every order in the caller's scope (BR-ORD-002), possibly empty.
2. `GET /orders/{id}` → 200 with the order when it is in the caller's scope.

## Alternative Flows
- A. `GET /orders/{id}` outside the scope, or for an id that does not exist: 404 `not found`, same body in both
  cases (BR-SEC-001), audited.
- B. `GET /orders/{id}` with a non-numeric id: the route does not match → 404 (same body).

## States
Any; reading does not change state.

## Business Rules
BR-ORD-002, BR-SEC-001

## Fields
Every Order field (`../architecture/DATA_MODEL.md`); no field is hidden per role.

## Permissions
`order.read` — matrix rows AZ-001..AZ-007 (`GET /orders/{id}`), AZ-044, AZ-045 (`GET /orders`).

## API
`GET /orders`, `GET /orders/{id}` — `../api/API_SPECIFICATION.md`.

## Validation
`{id}` is a positive integer in the path; anything else is 404.

## Calculations
N/A

## Audit Events
Denials only.

## Notifications
N/A

## Error Cases
| Case | Answer |
|---|---|
| no token | 401 |
| not in scope / no such id | 404 `not found` |

## UI Behavior
N/A

## Acceptance Criteria
AC-ORD-010, AC-ORD-011, AC-ORD-012, AC-ORD-013, AC-ORD-014, AC-ORD-015

## Dependencies
FR-ORD-001 (something to read).

## Open Questions
None. (Pagination and filtering are out of scope; the list is the whole scope.)
