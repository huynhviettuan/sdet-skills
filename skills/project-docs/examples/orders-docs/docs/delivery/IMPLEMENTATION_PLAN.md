# Implementation Plan

Snapshot: 2026-11-03. Vertical slices; each phase leaves a runnable server whose tests pass. Phases 0–3 and 5
are fully specified; phase 4 carries the assumptions and is built behind their OQs. Backlog order is this table
(level 7 of the hierarchy).

| Phase | Slice | Specs | Rules | Acceptance | Blocked by |
|---|---|---|---|---|---|
| 0 | Foundation: routing, response function with headers and CORS, error shape, store with lock, seed loading | SYSTEM_ARCHITECTURE.md | BR-SEC-004, BR-SEC-005, BR-SEC-006 | AC-SEC-001..004 | — |
| 1 | Authentication: login, lockout counter, token issue/verify, 401 path, audit of anonymous denials | FR-AUTH-001 | BR-AUTH-001..003, BR-AUD-001 | AC-AUTH-001..007, AC-AUD-001 | — |
| 2 | Orders core: create (main flow), list, read; scope checks and 404; audit of denials | FR-ORD-001 (main flow), FR-ORD-002 | BR-ORD-001, BR-ORD-002, BR-SEC-001, BR-SEC-002 | AC-ORD-001, 002, 003, 005, 010..015, AC-SEC-005 | — |
| 3 | Edit note and delete; PATCH allow-list; admin reads | FR-ORD-003, FR-ORD-005, FR-ADM-001 | BR-ORD-004, BR-SEC-003 | AC-ORD-020..023, 040..042, AC-ADM-001..002, AC-AUD-002 | OQ-005/006 only affect rows, not the slice |
| 4 | Lifecycle: pay / ship / cancel, `paid_at`, 409s; then the assumptions once decided: note-length rejection, open-order cap, cancellation window, admin rows | FR-ORD-004, FR-ORD-001 alt. flows | BR-ORD-005; then BR-ORD-003 (reject), BR-ORD-006, BR-ORD-007 | AC-ORD-030..033, 035; then 004, 006, 007, 024, 034, 036 | OQ-001, OQ-002, OQ-003, OQ-004 |
| 5 | Hardening: matrix verify in CI, sentinel, concurrency case for double `pay`, remove test hooks from the product build | TEST_STRATEGY.md, SECURITY.md | — | authz_matrix.py verify clean | — |

Each phase's task prompt follows the pattern in the skill's guidance: summarize the requirement, list affected
modules and BR IDs, name unresolved OQs, propose steps and tests before coding; after coding run the gate order
in TEST_STRATEGY.md, verify the ACs, update docs and the catalogue.

## Sizing

One phase is one reviewable task; phase 4 is two (transitions first, assumptions after their decisions). No task
spans two phases.
