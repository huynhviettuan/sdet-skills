# FR-ORD-001 — Create an order

Snapshot: 2026-11-03. Source: S1 sentences 4, 6, 8; S2 `create_order`; ASSUMPTION for the note limit behaviour
(OQ-002), the open-order cap (OQ-003) and manager creation (OQ-006).

## Purpose
Let a customer open an order in their tenant with a free-text note.

## Actors
customer (creates for themselves); manager (OQ-006, same behaviour); admin is refused.

## Preconditions
Valid token (BR-AUTH-003); the caller owns fewer than 5 orders in status `new` (BR-ORD-007, assumption).

## Main Flow
1. Caller sends `POST /orders` with `{"note": "..."}` (note optional).
2. Server validates the note length (BR-ORD-003) and the open-order cap (BR-ORD-007) inside the store lock.
3. Server allocates the next id and stores `{id, owner: caller, tenant: caller's tenant, note, status: "new"}`
   (BR-ORD-001).
4. Answer 201 with the stored order.

## Alternative Flows
- A. Admin caller: 403 `forbidden`, nothing created, audited (BR-SEC-002, BR-AUD-001).
- B. Note longer than 200 characters: 400, nothing created (BR-ORD-003, assumption).
- C. Caller already has 5 `new` orders: 409 `too many open orders`, nothing created (BR-ORD-007, assumption).
- D. Body names `owner`, `tenant`, `status` or `id`: rejected like BR-SEC-003 (MODEL RECOMMENDATION; S2 ignores
  them).

## States
The new order is in `new`.

## Business Rules
BR-ORD-001, BR-ORD-003, BR-ORD-007, BR-SEC-002

## Fields
| Field | Type | Required | Notes |
|---|---|:---:|---|
| note | string 0–200 chars | no (default `""`) | the only client-supplied field |

## Permissions
`order.create` — customer-own 201 (AZ-020), manager-same-tenant 201 (AZ-049, OQ-006), admin 403 (AZ-019),
anonymous 401 (AZ-021).

## API
`POST /orders` — `../api/API_SPECIFICATION.md`.

## Validation
- `note` is a string; absent → `""`.
- length(note) ≤ 200 characters, else 400 (OQ-002).
- open-order count < 5, else 409 (OQ-003).

## Calculations
`open_order_count(owner)` (`../architecture/DATA_MODEL.md`).

## Audit Events
Denials only (BR-AUD-001).

## Notifications
N/A

## Error Cases
| Case | Answer |
|---|---|
| no token | 401 |
| admin | 403 |
| note > 200 chars | 400 (assumption) |
| 6th open order | 409 `too many open orders` (assumption) |

## UI Behavior
N/A

## Acceptance Criteria
AC-ORD-001, AC-ORD-002, AC-ORD-003, AC-ORD-004, AC-ORD-005, AC-ORD-006, AC-ORD-007

## Dependencies
FR-AUTH-001.

## Open Questions
OQ-002, OQ-003, OQ-006
