# Coverage — Orders slice

Traceability, gaps, assumption cases, run order and regression scope for the 25 cases in [`cases/`](cases/).
Designed 2026-11-03; every count below is from the case files (re-checked with `check_cases.py`, README.md).

## AC to TC

| AC | Basis | Covered by |
|---|---|---|
| AC-AUTH-001 | specified | TC-AUTH-001 |
| AC-AUTH-002 | specified | TC-AUTH-002 |
| AC-AUTH-003 | specified | TC-AUTH-003 |
| AC-AUTH-004 | specified | TC-AUTH-004, TC-AUTH-006 |
| AC-AUTH-005 | specified | TC-AUTH-005 |
| AC-ORD-003 | specified | TC-ORD-001, TC-ORD-006 |
| AC-ORD-004 | assumption (OQ-002) | TC-ORD-002, TC-ORD-006 |
| AC-ORD-005 | specified | TC-ORD-003 |
| AC-ORD-006 | assumption (OQ-003) | TC-ORD-010 |
| AC-ORD-007 | assumption (OQ-003) | TC-ORD-011 |
| AC-ORD-020 | specified | TC-ORD-004, TC-ORD-006 |
| AC-ORD-024 | assumption (OQ-002) | TC-ORD-005, TC-ORD-006 |
| AC-ORD-030 | specified | TC-ORD-020 |
| AC-ORD-031 | specified | TC-ORD-021 |
| AC-ORD-032 | specified | TC-ORD-022, TC-ORD-023 |
| AC-ORD-033 | specified | TC-ORD-024 |
| AC-ORD-034 | assumption (OQ-001) | TC-ORD-025, TC-ORD-026 |
| AC-ORD-035 | specified | TC-ORD-027, TC-ORD-028 |
| AC-ORD-036 | assumption (OQ-004) | TC-ORD-029 |

19 of 19 slice ACs covered.

## Rules and features to TC

| ID | Covered by |
|---|---|
| FR-AUTH-001 | TC-AUTH-001 (and every TC-AUTH case through its ACs) |
| FR-ORD-001 | TC-ORD-001 (and TC-ORD-002, -003, -010, -011 through their ACs) |
| FR-ORD-003 | TC-ORD-004 (and TC-ORD-005, -006) |
| FR-ORD-004 | TC-ORD-030 (and TC-ORD-020..029 through their ACs) |
| BR-ORD-001 | TC-ORD-003 |
| BR-ORD-002 | TC-ORD-027, -028, -029, -030 |
| BR-ORD-003 | TC-ORD-001..006 |
| BR-ORD-004 | TC-ORD-006 |
| BR-ORD-005 | TC-ORD-020..024 |
| BR-ORD-006 | TC-ORD-025, TC-ORD-026 |
| BR-ORD-007 | TC-ORD-010, TC-ORD-011 |
| BR-AUTH-001 | TC-AUTH-002, TC-AUTH-003 |
| BR-AUTH-002 | TC-AUTH-004, -005, -006 |
| BR-AUTH-003 | TC-AUTH-001 |
| BR-SEC-001 | TC-ORD-030 |
| BR-SEC-002 | TC-ORD-027, -028, -029 |

The same mapping as CSV: `check_cases.py --trace` (README.md).

## Gaps in the slice

Deliberate, each with its risk and the reason it has no case.

| Gap | IDs | Risk | Why no case / what would close it |
|---|---|---|---|
| Lifecycle actions without a token (decision table R1) | BR-AUTH-003, AZ-024, AZ-031, AZ-037 | P1 | status-only cells; the authorization matrix suite owns them (ADR-001) |
| Two concurrent `pay` calls on one order | BR-ORD-005 ("two concurrent `pay` calls cannot both succeed") | P1 | needs a concurrency harness; a race test must wait on the real responses, not a sleep. Candidate for the automation suite |
| Lockout ends when the oldest failure is older than 60 s | BR-AUTH-002 | P2 | needs a controllable clock; the exact second is proposed OQ-009 |
| Token stops authorizing after 60 minutes | AC-AUTH-001 ("for the next 60 minutes"), AC-AUTH-007 | P1 | TC-AUTH-001 checks the token works now; expiry is AC-AUTH-007, out of the slice |
| Non-string `note` | BR-ORD-003 | P2 | unstated: proposed OQ-008 |
| Decomposed (NFD) multi-byte note | BR-ORD-003 | P3 | unstated: proposed OQ-007 |
| Note edit on terminal orders as its own rule | BR-ORD-004, OQ-005 | P3 | no rule beyond "no check"; touched only by TC-ORD-006 pairwise rows |
| Status naming on PATCH (`status` read-only) | AC-ORD-021, BR-SEC-003 | P1 | out of the slice (PATCH field allow-list) |

## Out of slice

25 ACs are not in the slice and have no case here; `check_cases.py` against the full package catalogue reports each
of them as an error (README.md). Grouped, with the risk a full design would give them:

| Group | ACs | Risk |
|---|---|---|
| Token checks | AC-AUTH-006, AC-AUTH-007 | P0 |
| Create by role and owner fields | AC-ORD-001, AC-ORD-002 | P0 |
| Read scope | AC-ORD-010, 011, 012, 013, 014, 015 | P0 |
| PATCH field allow-list and hidden edit | AC-ORD-021, 022, 023 | P0 / P1 |
| Delete | AC-ORD-040, 041, 042 | P0 |
| Security headers, CORS, 500 body, 403 body | AC-SEC-001, 002, 003, 004, 005 | P1 |
| Audit | AC-AUD-001, AC-AUD-002 | P1 |
| Admin user list | AC-ADM-001, AC-ADM-002 | P0 |

## Assumption cases

8 of 25 cases are `Basis: assumption`. Each names its OQ and which result is assumed; when the OQ is answered the
answer goes into the package first, then the case switches to `specified` with a quote.

| Case | OQ | Assumed result |
|---|---|---|
| TC-ORD-002 | OQ-002 | 201 characters on create answer 400 naming `note`, nothing created |
| TC-ORD-005 | OQ-002 | 201 characters on PATCH answer 400, note unchanged |
| TC-ORD-006 | OQ-002, OQ-005, OQ-006 | 201-length rows rejected; edits in paid/shipped/cancelled accepted; manager create/edit accepted |
| TC-ORD-010 | OQ-003 | the sixth order in `new` answers 409 `too many open orders` |
| TC-ORD-011 | OQ-003 | a slot exists to be freed by pay or cancel |
| TC-ORD-025 | OQ-001 | the window is still open at 23:59:59 (also passes with no window) |
| TC-ORD-026 | OQ-001 | cancel at 24:00:00 and later answers 409 `cancellation window closed` |
| TC-ORD-029 | OQ-004 | the admin's pay, ship and cancel answer 403 |

Against the package's reference server, TC-ORD-002 and TC-ORD-005 are expected to fail (it shortens the note,
OQ-002) and the lifecycle and cap cases cannot run (no pay/ship/cancel, no cap: package README, Honest notes).
Those are open-question disagreements, not defects; no case carries a `Known bug` line.

## Risk-based order and smoke set

Run P0 first and stop to report on a P0 failure.

| Priority | Cases | Count |
|---|---|---|
| P0 | TC-AUTH-001, TC-AUTH-004, TC-AUTH-006, TC-ORD-020, TC-ORD-021, TC-ORD-024, TC-ORD-027, TC-ORD-028, TC-ORD-030 | 9 |
| P1 | TC-AUTH-002, TC-AUTH-003, TC-AUTH-005, TC-ORD-001, TC-ORD-002, TC-ORD-005, TC-ORD-010, TC-ORD-022, TC-ORD-023, TC-ORD-025, TC-ORD-026, TC-ORD-029 | 12 |
| P2 | TC-ORD-003, TC-ORD-004, TC-ORD-006, TC-ORD-011 | 4 |

Smoke (every deploy): TC-AUTH-001 (login works), TC-ORD-020 (pay), TC-ORD-021 (ship) — the core flow, specified,
no Exclusive case.

## Execution constraints

- **Exclusive** (never in parallel with other cases): TC-AUTH-006 (locks the seeded user bob for 60 s),
  TC-ORD-010 and TC-ORD-011 (assert alice's exact count of orders in `new`).
- **Shared budget**: BR-ORD-007 (if OQ-003 is answered B) caps alice at 5 orders in `new`. Each non-exclusive
  case holds at most 2 of alice's `new` orders and deletes what it creates in a teardown hook (carol, AZ-012), so a
  runner keeps at most 2 such cases in parallel per customer, or spreads them over alice and erin.
- **Clock**: TC-ORD-025 and TC-ORD-026 need the server clock set by the test (FR-ORD-004 Dependencies); without
  it they are blocked, never waited for.
- **Lockout without a shared user**: TC-AUTH-004 and TC-AUTH-005 lock a per-run username (failures count per
  submitted username, BR-AUTH-001 Audit line), so they run in parallel.

## Regression scope

By area changed:

| Area | Cases |
|---|---|
| Login, lockout counter | TC-AUTH-001..006 |
| Note validation (create or PATCH) | TC-ORD-001..006 |
| Create flow, open-order counting | TC-ORD-010, TC-ORD-011 (+ TC-ORD-001..003) |
| Lifecycle actions, `paid_at`, cancellation window | TC-ORD-020..026 |
| Authorization on lifecycle actions | TC-ORD-027..030 |

By requirement: a change to an ID selects the cases in [Rules and features to TC](#rules-and-features-to-tc).
Always add every P0 case. When OQ-001..006 is answered, re-read every case that names it (table above) in the same
change that updates the package.
