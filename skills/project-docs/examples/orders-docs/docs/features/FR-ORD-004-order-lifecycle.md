# FR-ORD-004 — Order lifecycle: pay, ship, cancel

Snapshot: 2026-11-03. Source: S1 sentence 5; ADR-003 (endpoint shape); ASSUMPTION for the cancellation window
(OQ-001) and the admin rows (OQ-004). Not in the reference implementation (S2).

## Purpose
Move an order through `new → paid → shipped`, or to `cancelled`, with the right actor at each step and no way to
skip or repeat a step.

## Actors
customer-own (pay, cancel); manager-same-tenant (ship, cancel); admin is refused (OQ-004).

## Preconditions
Valid token; the order is in the caller's scope; the order's status has a row for the action in
`../business/STATE_MACHINES.md`.

## Main Flow
1. Caller sends `POST /orders/{id}/pay`, `/ship` or `/cancel` with no body.
2. Server checks token → scope (404) → function (403) → state (409), inside the store lock.
3. Server applies the transition; `pay` also sets `paid_at`; answers 200 with the updated order.

## Alternative Flows
- A. No row for (status, action): 409 `invalid transition`, order unchanged (BR-ORD-005). Includes repeating an
  action already applied.
- B. `cancel` on `paid` at or after 24 h since `paid_at`: 409 `cancellation window closed`, order stays `paid`
  (BR-ORD-006, assumption).
- C. Wrong role for the action (customer ships, manager pays, admin anything): 403, order unchanged.
- D. Hidden order: 404.

## States
The whole Order state machine (`../business/STATE_MACHINES.md`), including the cancel decision table.

## Business Rules
BR-ORD-002, BR-ORD-005, BR-ORD-006, BR-SEC-001, BR-SEC-002

## Fields
No request fields. Response: the Order, with `paid_at` set after `pay`.

## Permissions
`order.pay` AZ-024..AZ-030; `order.ship` AZ-031..AZ-036; `order.cancel` AZ-037..AZ-043.

## API
`POST /orders/{id}/pay`, `POST /orders/{id}/ship`, `POST /orders/{id}/cancel` — `../api/API_SPECIFICATION.md`.

## Validation
A request body, if any, is ignored (MODEL RECOMMENDATION: reject a non-empty body with 400 so a future body
cannot be silently dropped).

## Calculations
`cancellable(order, now)` (`../architecture/DATA_MODEL.md`): `status = new`, or `status = paid and
now - paid_at < order.cancel_window_hours`. Boundary: 23 h 59 min 59 s succeeds; 24 h 00 min 00 s is refused.

## Audit Events
Denials only (401/403/404). A 409 is not a denial and is not audited.

## Notifications
N/A

## Error Cases
| Case | Answer |
|---|---|
| no token | 401 |
| hidden order | 404 |
| wrong role | 403 |
| no such transition / already applied | 409 `invalid transition` |
| paid cancel after window | 409 `cancellation window closed` |

## UI Behavior
N/A

## Acceptance Criteria
AC-ORD-030, AC-ORD-031, AC-ORD-032, AC-ORD-033, AC-ORD-034, AC-ORD-035, AC-ORD-036

## Dependencies
FR-ORD-001; `paid_at` in the data model; a controllable clock in tests (the 24 h boundary cannot be waited for).

## Open Questions
OQ-001, OQ-004
