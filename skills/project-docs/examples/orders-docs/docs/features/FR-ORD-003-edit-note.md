# FR-ORD-003 — Edit an order's note

Snapshot: 2026-11-03. Source: S1 sentence 6; S2 `order` (PATCH); ASSUMPTION for the length behaviour (OQ-002),
editing in terminal states (OQ-005) and manager editing (OQ-006).

## Purpose
Let the owner correct the note on an order without being able to touch anything else.

## Actors
customer-own; manager-same-tenant (OQ-006).

## Preconditions
Valid token; the order is in the caller's scope.

## Main Flow
1. Caller sends `PATCH /orders/{id}` with `{"note": "..."}`.
2. Server checks scope (404 if hidden), then the field allow-list (BR-ORD-004, BR-SEC-003), then the length
   (BR-ORD-003).
3. Server replaces `note`; answers 200 with the whole order.

## Alternative Flows
- A. Body names `status`, `tenant`, `owner`, `id` or an unknown field: 400 `unknown or read-only fields` with
  `fields` listing them sorted; nothing changes (BR-SEC-003). `status` is read-only on PATCH (AC-ORD-021).
- B. Note longer than 200 characters: 400, nothing changes (BR-ORD-003, assumption).
- C. Empty body `{}`: 200, nothing changes (MODEL RECOMMENDATION, consistent with S2).
- D. Order hidden from the caller: 404, the owner's re-read shows the original note.

## States
Any status (working assumption OQ-005: the note stays editable after `shipped`/`cancelled`).

## Business Rules
BR-ORD-003, BR-ORD-004, BR-SEC-001, BR-SEC-003

## Fields
| Field | Type | Required | Notes |
|---|---|:---:|---|
| note | string 0–200 chars | no | the only accepted field |

## Permissions
`order.edit_note` — AZ-008, AZ-009, AZ-010, AZ-022, AZ-050, AZ-051.

## API
`PATCH /orders/{id}` — `../api/API_SPECIFICATION.md`.

## Validation
- keys(body) ⊆ {`note`}, else 400 naming the rest.
- length(note) ≤ 200, else 400 (OQ-002).

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
| hidden order | 404 |
| read-only or unknown field | 400 + `fields` |
| note > 200 chars | 400 (assumption) |

## UI Behavior
N/A

## Acceptance Criteria
AC-ORD-020, AC-ORD-021, AC-ORD-022, AC-ORD-023, AC-ORD-024

## Dependencies
FR-ORD-001.

## Open Questions
OQ-002, OQ-005, OQ-006
