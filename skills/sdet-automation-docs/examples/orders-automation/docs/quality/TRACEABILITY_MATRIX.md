# Traceability Matrix — Orders automation

Snapshot: 2026-11-03. Extends the product
[TRACEABILITY_MATRIX.md](../../../../../project-docs/examples/orders-docs/docs/quality/TRACEABILITY_MATRIX.md)
(FR -> BR -> AC -> API) with the automation columns, as `governance.md` prescribes:
`FR -> BR -> AC -> Risk -> TC -> Layer -> Automation file -> CI stage`. The product matrix leaves its `Test`
column as `—` "filled by them"; this file is what fills it.

Contents:

- [How the matrix is produced](#how-the-matrix-is-produced)
- [Acceptance criteria to cases](#acceptance-criteria-to-cases)
- [Permission matrix](#permission-matrix)
- [Cases with no AC](#cases-with-no-ac)
- [Assumption-based cases](#assumption-based-cases)

## How the matrix is produced

Two halves, both generated, never typed by hand once the suite exists:

1. **Requirement -> case.** Cases are written by `test-case-design` as `## TC-<AREA>-NNN — Title` sections with
   `Verifies:` and `Basis:` lines, in `docs/test-cases/`. Then:

   ```bash
   python skills/test-case-design/scripts/check_cases.py docs/test-cases --catalogue skills/project-docs/examples/orders-docs/REQUIREMENTS_CATALOGUE.md --trace traceability.csv
   ```

   It exits 1 on a case citing an ID not in the catalogue and on an AC no case verifies, and writes
   requirement ID -> case IDs as CSV. Not run for this package: no case files exist yet.
2. **Case -> test file -> result.** Each test carries `@pytest.mark.case("TC-…")` and
   `@pytest.mark.requirement("AC-…")` (markers registered in the pytest template); the CSV gains the file and CI
   stage columns from them. For the 51 permission cells the result half is
   `authz_matrix.py verify <ROLES_PERMISSIONS.md> <junit.xml>`, which matches each `AZ-NNN` in the test ids:

   ```text
   total: 51 cells, 23 verified, 28 findings
   ```

   (ran once on 2026-11-03 against the reference suite's JUnit; see
   [02_SCOPE_AND_COVERAGE.md](../strategy/02_SCOPE_AND_COVERAGE.md)).

A row with an AC and no TC is a coverage gap; a TC with no AC is a candidate for deletion unless it is listed under
"Cases with no AC".

## Acceptance criteria to cases

TC numbers mirror AC numbers so a reviewer can check the mapping at a glance. Every TC is **planned**: no product
test file exists. "Reference" names the test in `skills/security-testing/examples/vuln-api/test_security.py` that
covers part or all of the AC today. Layer is API throughout; CI stage is PR unless marked.

| AC | FR | BR | Risk | TC | Basis | Planned file | Reference today | CI |
|---|---|---|:---:|---|---|---|---|---|
| AC-AUTH-001 | FR-AUTH-001 | BR-AUTH-003 | P0 | TC-AUTH-001 | specified | tests/api/test_auth.py | — | PR |
| AC-AUTH-002 | FR-AUTH-001 | BR-AUTH-001 | P0 | TC-AUTH-002 | specified | tests/api/test_auth.py | — | PR (`auth-serial`) |
| AC-AUTH-003 | FR-AUTH-001 | BR-AUTH-001 | P0 | TC-AUTH-003 | specified | tests/api/test_auth.py | `test_login_does_not_reveal_usernames` (full) | PR (`auth-serial`) |
| AC-AUTH-004 | FR-AUTH-001 | BR-AUTH-002 | P0 | TC-AUTH-004 | specified | tests/api/test_auth.py | `test_login_rate_limited` (partial: body) | PR |
| AC-AUTH-005 | FR-AUTH-001 | BR-AUTH-002 | P0 | TC-AUTH-005 | specified | tests/api/test_auth.py | — | PR |
| AC-AUTH-006 | FR-AUTH-001 | BR-AUTH-003 | P0 | TC-AUTH-006 | specified | tests/api/test_auth.py | matrix 401 rows (partial: body) | PR |
| AC-AUTH-007 | FR-AUTH-001 | BR-AUTH-003 | P0 | TC-AUTH-007 | specified | tests/api/test_security.py | `test_unsigned_token_rejected`, `test_tampered_token_rejected`, `test_expired_token_rejected` (full) | PR (Local; Staging OQ-A-010) |
| AC-ORD-001 | FR-ORD-001 | BR-ORD-001 | P1 | TC-ORD-001 | specified | tests/api/test_orders_create.py | — | PR |
| AC-ORD-002 | FR-ORD-001 | BR-SEC-002 | P0 | TC-ORD-002 | specified | tests/api/test_orders_create.py | matrix AZ-019 (partial: body, no order created) | PR |
| AC-ORD-003 | FR-ORD-001 | BR-ORD-003 | P1 | TC-ORD-003 | specified | tests/api/test_orders_create.py | — | PR |
| AC-ORD-004 | FR-ORD-001 | BR-ORD-003 | P1 | TC-ORD-004 | assumption (OQ-002) | tests/api/test_orders_create.py | — | assumption group |
| AC-ORD-005 | FR-ORD-001 | BR-ORD-001 | P1 | TC-ORD-005 | specified | tests/api/test_orders_create.py | — | PR |
| AC-ORD-006 | FR-ORD-001 | BR-ORD-007 | P1 | TC-ORD-006 | assumption (OQ-003) | tests/api/test_orders_create.py | — | assumption group (`cap-serial`) |
| AC-ORD-007 | FR-ORD-001 | BR-ORD-007 | P1 | TC-ORD-007 | assumption (OQ-003) | tests/api/test_orders_create.py | — | assumption group (`cap-serial`) |
| AC-ORD-010 | FR-ORD-002 | BR-ORD-002 | P0 | TC-ORD-010 | specified | tests/api/test_orders_read.py | — | PR |
| AC-ORD-011 | FR-ORD-002 | BR-ORD-002 | P0 | TC-ORD-011 | specified | tests/api/test_orders_read.py | — | PR |
| AC-ORD-012 | FR-ORD-002 | BR-ORD-002 | P0 | TC-ORD-012 | specified | tests/api/test_orders_read.py | — | PR |
| AC-ORD-013 | FR-ORD-002 | BR-ORD-002 | P0 | TC-ORD-013 | specified | tests/api/test_orders_read.py | matrix AZ-002/005/007 (partial: status only) | PR |
| AC-ORD-014 | FR-ORD-002 | BR-SEC-001 | P0 | TC-ORD-014 | specified | tests/api/test_orders_read.py | matrix AZ-003/004/006 (partial: body) | PR |
| AC-ORD-015 | FR-ORD-002 | BR-SEC-001 | P0 | TC-ORD-015 | specified | tests/api/test_orders_read.py | — | PR |
| AC-ORD-020 | FR-ORD-003 | BR-ORD-004 | P1 | TC-ORD-020 | specified | tests/api/test_orders_edit.py | — | PR |
| AC-ORD-021 | FR-ORD-003 | BR-SEC-003 | P0 | TC-ORD-021 | specified | tests/api/test_orders_edit.py | `test_mass_assignment_rejected` (partial: sends `status` with `tenant`) | PR |
| AC-ORD-022 | FR-ORD-003 | BR-SEC-003 | P0 | TC-ORD-022 | specified | tests/api/test_orders_edit.py | — | PR |
| AC-ORD-023 | FR-ORD-003 | BR-SEC-001 | P0 | TC-ORD-023 | specified | tests/api/test_orders_edit.py | `test_bola_attacker_cannot_change_another_tenants_order` (full) | PR |
| AC-ORD-024 | FR-ORD-003 | BR-ORD-003 | P1 | TC-ORD-024 | assumption (OQ-002) | tests/api/test_orders_edit.py | — | assumption group |
| AC-ORD-030 | FR-ORD-004 | BR-ORD-005 | P0 | TC-ORD-030 | specified | tests/api/test_orders_lifecycle.py | — | PR |
| AC-ORD-031 | FR-ORD-004 | BR-ORD-005 | P0 | TC-ORD-031 | specified | tests/api/test_orders_lifecycle.py | — | PR |
| AC-ORD-032 | FR-ORD-004 | BR-ORD-005 | P0 | TC-ORD-032 | specified | tests/api/test_orders_lifecycle.py | — | PR |
| AC-ORD-033 | FR-ORD-004 | BR-ORD-005 | P0 | TC-ORD-033 | specified | tests/api/test_orders_lifecycle.py | — | PR |
| AC-ORD-034 | FR-ORD-004 | BR-ORD-006 | P0 | TC-ORD-034 | assumption (OQ-001) | tests/api/test_orders_lifecycle.py | — | BLOCKED (OQ-A-002) |
| AC-ORD-035 | FR-ORD-004 | BR-ORD-002 | P0 | TC-ORD-035 | specified | tests/api/test_orders_lifecycle.py | — | PR |
| AC-ORD-036 | FR-ORD-004 | BR-ORD-002 | P0 | TC-ORD-036 | assumption (OQ-004) | tests/api/test_orders_lifecycle.py | — | assumption group |
| AC-ORD-040 | FR-ORD-005 | BR-ORD-002 | P0 | TC-ORD-040 | specified | tests/api/test_orders_delete.py | matrix AZ-012/014 (partial: no re-read) | PR |
| AC-ORD-041 | FR-ORD-005 | BR-SEC-002 | P0 | TC-ORD-041 | specified | tests/api/test_orders_delete.py | matrix AZ-011 (partial: no re-read) | PR |
| AC-ORD-042 | FR-ORD-005 | BR-SEC-001 | P0 | TC-ORD-042 | specified | tests/api/test_orders_delete.py | matrix AZ-013 (partial: no re-read) | PR |
| AC-SEC-001 | (cross-cutting) | BR-SEC-004 | P1 | TC-SEC-001 | specified | tests/api/test_security.py | `test_security_headers_present` (partial: one 200 response) | PR |
| AC-SEC-002 | (cross-cutting) | BR-SEC-005 | P1 | TC-SEC-002 | specified | tests/api/test_security.py | `test_cors_allows_listed_origin` (partial: `Vary`) | PR |
| AC-SEC-003 | (cross-cutting) | BR-SEC-005 | P1 | TC-SEC-003 | specified | tests/api/test_security.py | `test_cors_rejects_unknown_origin` (full) | PR |
| AC-SEC-004 | (cross-cutting) | BR-SEC-006 | P1 | TC-SEC-004 | specified | tests/api/test_security.py | `test_error_response_does_not_leak` (partial: `ref` format; uses `/_boom`) | PR (Local; elsewhere OQ-A-011) |
| AC-SEC-005 | (cross-cutting) | BR-SEC-002 | P0 | TC-SEC-005 | specified | tests/api/test_security.py | matrix 403 rows (partial: body) | PR |
| AC-AUD-001 | FR-ADM-001 | BR-AUD-001 | P1 | TC-AUD-001 | specified | tests/api/test_admin_audit.py | `test_denied_request_is_audited` (full) | PR |
| AC-AUD-002 | FR-ADM-001 | BR-AUD-001 | P1 | TC-AUD-002 | specified | tests/api/test_admin_audit.py | — | PR |
| AC-ADM-001 | FR-ADM-001 | BR-ORD-002 | P0 | TC-ADM-001 | specified | tests/api/test_admin_audit.py | — | PR |
| AC-ADM-002 | FR-ADM-001 | BR-SEC-002 | P0 | TC-ADM-002 | specified | tests/api/test_admin_audit.py | matrix AZ-015..018 (full) | PR |

44 AC, 44 TC; 4 P0 AC fully covered today, the rest planned. The BR column names the primary rule; the product
matrix's "Rule -> criteria" table has the full mapping.

## Permission matrix

| Rows | TC | File | Reference today | CI |
|---|---|---|---|---|
| AZ-001..023 | TC-SEC-AUTHZ-001 | tests/api/test_authz_matrix.py | `test_access_control_matrix` over the reference matrix (23 rows, verified) | PR, verify gate |
| AZ-024..048, 050 (minus the assumption rows below) | TC-SEC-AUTHZ-001 | tests/api/test_authz_matrix.py | none (no lifecycle endpoints in the reference server; AZ-044..048, 050 not in the reference matrix) | PR, verify gate |
| AZ-030, 036, 043 | TC-SEC-AUTHZ-001 | tests/api/test_authz_matrix.py | none | PR, verify gate; assumption (OQ-004) |
| AZ-049, 051 | TC-SEC-AUTHZ-001 | tests/api/test_authz_matrix.py | none | PR, verify gate; assumption (OQ-006) |

One parametrized test, one case per row; the test id contains `AZ-NNN` so `verify` can match it. Expected values
are read from ROLES_PERMISSIONS.md at collection time (`authz_matrix.load_matrix`); no expected status is written in
test code. The five assumption rows stay inside the verify gate, unlike the assumption AC group (OQ-A-004): the
matrix is the product's current statement of who may do what (ADR-001). If a build implements the other option,
`verify` reports those rows and the product OQ has to be answered before the merge; the table is never trimmed to
make `verify` pass.

## Cases with no AC

| TC | Verifies | Basis | Why no AC | CI |
|---|---|---|---|---|
| TC-ORD-037 | BR-ORD-005 (store lock) | specified: TEST_STRATEGY.md "exactly one 200 and one 409" | product "Known gaps": "a case to write, not yet an AC" | PR |
| TC-AUTH-008 | BR-AUTH-002 (window edge at 60 s, TEST_STRATEGY.md boundaries) | specified | the AC states the count, not the edge | BLOCKED (OQ-A-002) |
| sentinel | none | — | proves the suite can go red; excluded from coverage | PR |

## Assumption-based cases

| Product OQ | Cases | Matrix rows |
|---|---|---|
| OQ-001 | TC-ORD-034 | — |
| OQ-002 | TC-ORD-004, TC-ORD-024 | — |
| OQ-003 | TC-ORD-006, TC-ORD-007 | — |
| OQ-004 | TC-ORD-036 | AZ-030, AZ-036, AZ-043 |
| OQ-005 | none (no rule; manual exploration) | — |
| OQ-006 | none | AZ-049, AZ-051 |

When a product OQ is answered: the case is re-read against the new AC text, `Basis` becomes `specified`, it leaves
the assumption group and starts blocking. The test is changed only after the case (repo `.claude/CLAUDE.md`, rule 2).
