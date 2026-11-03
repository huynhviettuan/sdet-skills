# Scope and Coverage — Orders

Snapshot: 2026-11-03. Coverage by risk and capability, never one percentage. "Reference suite" is what runs today:
`skills/security-testing/examples/vuln-api/test_security.py` against the reference server, `35 passed, 1 xfailed`
(ran 2026-11-03; CI's `skill-scripts` job re-runs it through `skills/security-testing/scripts/selftest.py`). "Product
suite" is what this package plans; no product test file exists yet.

## By feature

| Feature | Risk | AC IDs | Matrix rows | Layer | Reference suite today | Product suite | CI stage |
|---|:---:|---|---|---|---|---|---|
| FR-AUTH-001 Login | P0 | AC-AUTH-001..007 | — | API | AC-AUTH-003, 007 full; 004 partial (body not asserted); 006 partial (status via matrix, body not) | TC-AUTH-001..008 | PR, blocking |
| FR-ORD-001 Create | P1 (P0 for AC-ORD-002) | AC-ORD-001..007 | AZ-019..021, 049 | API | AC-ORD-002 partial (AZ-019 status only) | TC-ORD-001..007 | PR, blocking; 004/006/007 assumption group |
| FR-ORD-002 Read | P0 | AC-ORD-010..015 | AZ-001..007, 044, 045 | API | AC-ORD-013, 014 partial (AZ-002..007 assert the status, not the returned order or the 404 body) | TC-ORD-010..015 | PR, blocking |
| FR-ORD-003 Edit note | P0/P1 | AC-ORD-020..024 | AZ-008..010, 022, 050, 051 | API | AC-ORD-023 full; 021 partial (test sends `status` and `tenant` together) | TC-ORD-020..024 | PR, blocking; 024 assumption group |
| FR-ORD-004 Lifecycle | P0 | AC-ORD-030..036 | AZ-024..043 | API | none: the reference server has no pay/ship/cancel | TC-ORD-030..037 | PR, blocking; 034/036 assumption group; 034 blocked (OQ-A-002) |
| FR-ORD-005 Delete | P0 | AC-ORD-040..042 | AZ-011..014, 023 | API | AC-ORD-040, 041, 042 partial (status only, no re-read) | TC-ORD-040..042 | PR, blocking |
| FR-ADM-001 Admin reads | P0/P1 | AC-ADM-001, 002, AC-AUD-001, 002 | AZ-015..018, 046..048 | API | AC-ADM-002 full (AZ-015..018); AC-AUD-001 full | TC-ADM-001, 002, TC-AUD-001, 002 | PR, blocking |
| Cross-cutting security | P1 (AC-SEC-005 P0) | AC-SEC-001..005 | — | API | 001 partial (one 200 response only); 002 partial (`Vary` not asserted); 003 full; 004 partial (ref format not asserted, via `/_boom`); 005 partial (status only) | TC-SEC-001..005 | PR, blocking |
| Permission matrix | P0 | — | AZ-001..051 | API, data-driven | 23 of 51 cells | TC-SEC-AUTHZ-001, 51 cases | PR, blocking (`verify`) |
| UI | — | — | — | — | — | none (no UI) | — |

## The matrix gap, measured

```bash
python skills/security-testing/scripts/authz_matrix.py verify skills/project-docs/examples/orders-docs/docs/business/ROLES_PERMISSIONS.md <junit of the reference suite>
```

Ran once on 2026-11-03 from the repository root, with the JUnit written by
`python -m pytest skills/security-testing/examples/vuln-api -q -p no:cacheprovider --junitxml=<file>`:

```text
total: 51 cells, 23 verified, 28 findings
```

The 28 findings are AZ-024..051: no test ran for them, because the reference matrix has only AZ-001..023 and the
reference server has no lifecycle endpoints. That line is the coverage baseline; the PR gate requires
`51 cells, 51 verified, 0 findings` once the product suite exists.

## Counts that are tracked (not vanity counts)

| Metric | Today | Target | Source |
|---|---|---|---|
| P0 AC with a full case | 4 of 30 (AC-AUTH-003, AC-AUTH-007, AC-ORD-023, AC-ADM-002) | 30 of 30 | the table above; P0 rows of [04_RISK_BASED_TESTING.md](04_RISK_BASED_TESTING.md) |
| Matrix cells verified | 23 / 51 | 51 / 51 | `authz_matrix.py verify` |
| AC with no case | listed by `check_cases.py --catalogue` once cases exist | 0 | [TRACEABILITY_MATRIX.md](../quality/TRACEABILITY_MATRIX.md) |
| Flaky rate | not measured (no repeated runs of a product suite) | < 2 % over 14 nightly runs (Assumption (example)) | [FLAKY_TEST_POLICY.md](../reliability/FLAKY_TEST_POLICY.md) |
| PR stage duration | not measured | < 10 min (OQ-A-009) | CI job timing |

"Full" means every assertion the AC states is made; "partial" names what is missing. A partial reference test is a
seed for the product case, not coverage of the AC.
