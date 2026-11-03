# State Machines

Snapshot: 2026-11-03. Source: S1 sentence 5; endpoint shape ADR-003; the time condition is an assumption (OQ-001).
This is the only transition table; a transition not listed under Allowed is forbidden (BR-ORD-005).

## Order

```text
new
 ├── pay ────► paid
 │              ├── ship ────► shipped        (terminal)
 │              └── cancel ──► cancelled      (terminal; only while the cancellation window is open)
 └── cancel ──► cancelled                     (terminal)
```

### Allowed Transitions

| From | Action | To | Endpoint | Permission (actor relative to the order) | Rule |
|---|---|---|---|---|---|
| new | pay | paid | `POST /orders/{id}/pay` | customer-own | BR-ORD-005 |
| paid | ship | shipped | `POST /orders/{id}/ship` | manager-same-tenant | BR-ORD-005 |
| new | cancel | cancelled | `POST /orders/{id}/cancel` | customer-own, manager-same-tenant | BR-ORD-005 |
| paid | cancel | cancelled | `POST /orders/{id}/cancel` | customer-own, manager-same-tenant | BR-ORD-005, BR-ORD-006 (`now - paid_at < 24 h`) |

The permission column summarises `ROLES_PERMISSIONS.md`; the matrix there is authoritative.

### Forbidden Transitions (each answers 409 `invalid transition`, order unchanged)

| From | Action | Why |
|---|---|---|
| paid | pay | already paid |
| shipped | pay, ship, cancel | terminal |
| cancelled | pay, ship, cancel | terminal |
| new | ship | not paid |
| paid | cancel, at or after 24 h since `paid_at` | window closed — answers 409 `cancellation window closed` (BR-ORD-006) |

There is no transition out of `shipped` or `cancelled`; a delete (FR-ORD-005) removes the order and is not a
transition.

### Decision table — `POST /orders/{id}/cancel`

Conditions are evaluated in this order; the first matching row answers.

| # | Token valid | Caller sees the order | Caller is owner or tenant manager | Status | Hours since `paid_at` | Answer |
|---|---|---|---|---|---|---|
| 1 | no | – | – | – | – | 401 |
| 2 | yes | no | – | – | – | 404 (BR-SEC-001) |
| 3 | yes | yes | no | – | – | 403 (BR-SEC-002; e.g. admin, OQ-004) |
| 4 | yes | yes | yes | new | – | 200, `cancelled` |
| 5 | yes | yes | yes | paid | < 24 | 200, `cancelled` |
| 6 | yes | yes | yes | paid | ≥ 24 | 409 `cancellation window closed` |
| 7 | yes | yes | yes | shipped or cancelled | – | 409 `invalid transition` |

### Side Effects

When `new → paid`:
- set `paid_at` to the server time (never changed later)
- the order stops counting toward the open-order cap (BR-ORD-007)

When `new → cancelled`:
- the order stops counting toward the open-order cap

When `paid → shipped`, `paid → cancelled`: none beyond the status change.

No transition sends a notification (out of scope) or writes an audit entry (BR-AUD-001 covers denials only).

## Login attempt counter (per username)

```text
open ──(failed attempt #5 within 60 s)──► locked ──(oldest failure older than 60 s)──► open
```

| State | `POST /auth/login` with correct password | with wrong password |
|---|---|---|
| open | 200 token; counter unchanged | 401 `invalid credentials`; counter +1 |
| locked | 429 `Retry-After: 60` (password not checked) | 429 `Retry-After: 60` |

Rule: BR-AUTH-002. A success does not reset the counter (S2 behaviour; MODEL RECOMMENDATION: it should).
