# FR-ORD-005 — Delete an order

Snapshot: 2026-11-03. Source: S1 sentence 7; S2 `order` (DELETE).

## Purpose
Let a tenant manager, or the admin, remove an order entirely.

## Actors
manager-same-tenant, admin. Customers, including the owner, are refused.

## Preconditions
Valid token; the order is in the caller's scope.

## Main Flow
1. Caller sends `DELETE /orders/{id}`.
2. Server checks token → scope (404) → function (403).
3. Server removes the order; answers 204 with no body.

## Alternative Flows
- A. Customer (owner or not, same tenant): 403 `forbidden`, order unchanged.
- B. Manager of another tenant: 404 (hidden object).
- C. Repeated delete of the same id: 404 — the order no longer exists, same body as hidden (BR-SEC-001).

## States
Any status may be deleted (S2; no rule restricts it). Deleting is not a transition.

## Business Rules
BR-ORD-002, BR-SEC-001, BR-SEC-002

## Fields
N/A

## Permissions
`order.delete` — AZ-011, AZ-012, AZ-013, AZ-014, AZ-023.

## API
`DELETE /orders/{id}` — `../api/API_SPECIFICATION.md`.

## Validation
`{id}` positive integer.

## Calculations
N/A

## Audit Events
Denials only. MODEL RECOMMENDATION: audit successful deletes too (who removed what); S2 does not.

## Notifications
N/A

## Error Cases
| Case | Answer |
|---|---|
| no token | 401 |
| customer | 403 |
| hidden / already deleted | 404 |

## UI Behavior
N/A

## Acceptance Criteria
AC-ORD-040, AC-ORD-041, AC-ORD-042

## Dependencies
FR-ORD-001.

## Open Questions
None.
