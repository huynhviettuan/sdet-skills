# Test Strategy (product level)

Snapshot: 2026-11-03. What confidence the product needs; the automation design (framework, data, CI layout)
belongs to the automation docs, and the cases themselves to the test-design skill, which reads
`../../REQUIREMENTS_CATALOGUE.md`.

## Levels

| Level | What it must prove | Oracle |
|---|---|---|
| Unit | the four pure decisions: `locked(username, now)`, `cancellable(order, now)`, `open_order_count`, token verification | the formulas in `../architecture/DATA_MODEL.md` |
| Integration / API | every AC in `ACCEPTANCE_CRITERIA.md`, one case per expected result quoting it as `Evidence:` | the AC statement |
| Security / permission | every row of the matrix in `../business/ROLES_PERMISSIONS.md`, one test per row, verified with `authz_matrix.py verify`; the security families (BOLA with re-read, mass assignment, headers, CORS, error leakage, lockout, enumeration, token forgery, audit) | the matrix; BR-SEC-*/BR-AUTH-*/BR-AUD-* |
| E2E | none — there is no UI | — |
| Migration validation | none — no legacy data (`../product/01_SCOPE.md`) | — |

## Mandatory negative testing for the critical flows (lifecycle, delete, login)

| Negative case | Where |
|---|---|
| unauthorized action | matrix deny rows; AC-ORD-035, AC-ORD-036, AC-ORD-041 |
| invalid state transition | AC-ORD-033 |
| duplicate request (idempotency) | AC-ORD-033 (second `pay`), FR-ORD-005 repeated delete |
| concurrency | two `pay` calls at once on one `new` order: exactly one 200 and one 409 (BR-ORD-005 lock) — a case to write, not yet an AC |
| deleted record | AC-ORD-040 (read after delete), FR-ORD-005 flow C |
| expired entity | AC-AUTH-007 (expired token) |
| invalid financial operation | AC-ORD-034 (cancel after the window) |

## Boundaries and tables the cases must exercise

- Note length 0 / 200 / 201 (BR-ORD-003); open-order count 4 / 5 / 6 (BR-ORD-007); failed logins 5 / 6 within 60 s
  and the window edge at 60 s (BR-AUTH-002); cancellation at 23:59:59 / 24:00:00 after `paid_at` (BR-ORD-006).
- The cancel decision table in `../business/STATE_MACHINES.md`, every row.
- The state transition table: every allowed and every forbidden row.

## Rules for every suite

- A test states which AC or matrix row it verifies; an expected result not quotable from the package is a gap
  in the package, not a reason to assert whatever the server does.
- Assumption-based cases (OQ-001..006) carry `Basis: assumption`; when the OQ is answered they are re-read.
- A suite that writes data runs only against Local or an allow-listed test host (`../delivery/ENVIRONMENTS.md`).
- The 24 h boundary is tested with a controllable clock, never by waiting.
- A sentinel (a known-false expectation, strict expected-fail) stays in the security suite so a green run is
  known to be able to go red.

## CI gate order

lint → typecheck → unit → API/integration (including the matrix) → security families. No E2E stage.
