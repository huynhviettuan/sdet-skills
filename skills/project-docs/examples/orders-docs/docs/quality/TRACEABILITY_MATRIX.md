# Traceability Matrix

Snapshot: 2026-11-03. Requirement → rule → acceptance criteria → API. `UI` is N/A throughout (API only). The
`Test` column is owned by the test-design and automation docs; it is left as `—` here and filled by them.

| Requirement | Business Rule | Acceptance Criteria | API | UI | Test |
|---|---|---|---|---|---|
| FR-AUTH-001 | BR-AUTH-001, BR-AUTH-002, BR-AUTH-003 | AC-AUTH-001..007 | POST /auth/login | N/A | — |
| FR-ORD-001 | BR-ORD-001, BR-ORD-003, BR-ORD-007, BR-SEC-002 | AC-ORD-001..007 | POST /orders | N/A | — |
| FR-ORD-002 | BR-ORD-002, BR-SEC-001 | AC-ORD-010..015 | GET /orders, GET /orders/{id} | N/A | — |
| FR-ORD-003 | BR-ORD-003, BR-ORD-004, BR-SEC-001, BR-SEC-003 | AC-ORD-020..024 | PATCH /orders/{id} | N/A | — |
| FR-ORD-004 | BR-ORD-002, BR-ORD-005, BR-ORD-006, BR-SEC-001, BR-SEC-002 | AC-ORD-030..036 | POST /orders/{id}/pay, /ship, /cancel | N/A | — |
| FR-ORD-005 | BR-ORD-002, BR-SEC-001, BR-SEC-002 | AC-ORD-040..042 | DELETE /orders/{id} | N/A | — |
| FR-ADM-001 | BR-ORD-002, BR-SEC-002, BR-AUD-001 | AC-ADM-001, AC-ADM-002, AC-AUD-001, AC-AUD-002 | GET /admin/users, GET /_audit | N/A | — |
| (cross-cutting) | BR-SEC-004, BR-SEC-005, BR-SEC-006 | AC-SEC-001..004 | every response | N/A | — |
| (cross-cutting) | BR-SEC-002 | AC-SEC-005 | every function denial | N/A | — |

## Rule → criteria (every BR is verified by at least one AC)

| Rule | Verified by |
|---|---|
| BR-ORD-001 | AC-ORD-001, AC-ORD-005 |
| BR-ORD-002 | AC-ORD-002, 010, 011, 012, 013, 035, 036, 040; matrix AZ-001..051 |
| BR-ORD-003 | AC-ORD-003, 004, 024 |
| BR-ORD-004 | AC-ORD-020, 021 |
| BR-ORD-005 | AC-ORD-030, 031, 032, 033 |
| BR-ORD-006 | AC-ORD-034 |
| BR-ORD-007 | AC-ORD-006, 007 |
| BR-AUTH-001 | AC-AUTH-002, 003 |
| BR-AUTH-002 | AC-AUTH-004, 005 |
| BR-AUTH-003 | AC-AUTH-001, 006, 007 |
| BR-SEC-001 | AC-ORD-014, 015, 023, 042 |
| BR-SEC-002 | AC-SEC-005, AC-ORD-002, 035, 036, 041, AC-ADM-002 |
| BR-SEC-003 | AC-ORD-021, 022 |
| BR-SEC-004 | AC-SEC-001 |
| BR-SEC-005 | AC-SEC-002, 003 |
| BR-SEC-006 | AC-SEC-004 |
| BR-AUD-001 | AC-AUD-001, 002 |

## Assumption-based criteria (re-read when the OQ is answered)

| OQ | Criteria | Matrix rows |
|---|---|---|
| OQ-001 | AC-ORD-034 | — |
| OQ-002 | AC-ORD-004, AC-ORD-024 | — |
| OQ-003 | AC-ORD-006, AC-ORD-007 | — |
| OQ-004 | AC-ORD-036 | AZ-030, AZ-036, AZ-043 |
| OQ-005 | none (no rule yet) | — |
| OQ-006 | none (matrix only) | AZ-049, AZ-051 |

## Known gaps (not yet an AC)

- Concurrency: two simultaneous `pay` calls (TEST_STRATEGY.md) — Medium risk, needs a case.
- Audit of successful deletes — MODEL RECOMMENDATION in FR-ORD-005, no rule.
