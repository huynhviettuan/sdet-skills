# Risk-Based Testing — Orders

Snapshot: 2026-11-03. Classifies every requirement area of Orders P0-P3 and sets the automation order. Requirement
IDs come from the [requirement catalogue](../../../../../project-docs/examples/orders-docs/REQUIREMENTS_CATALOGUE.md);
nothing here adds product behaviour. Method: `strategy.md` ("RISK_BASED_TESTING.md") of the skill.

## Risk dimensions used

Security impact (cross-tenant read or write), money-path impact (a `pay`/`cancel` that should not happen — no
payment provider exists, but OQ-001 names cancellation after payment "a refund problem"), data sensitivity
(passwords, other tenants' orders, the audit log), and how often the area is likely to change (the six open OQs
mark the areas that will).

## Classification

| Risk | Area | Requirements | Why this level | Automation priority |
|---|---|---|---|---|
| P0 | Authorization and BOLA | BR-ORD-002, BR-SEC-001, BR-SEC-002; AZ-001..051; AC-ORD-002, 010..015, 023, 041, 042; AC-SEC-005; AC-ADM-002 | One wrong cell is a cross-tenant read or write; ADR-001 makes the matrix the test source | First: one test per AZ row, `authz_matrix.py verify` clean |
| P0 | Authentication, lockout, enumeration, tokens | BR-AUTH-001..003; AC-AUTH-001..007 | Account takeover by guessing, username enumeration, forged or expired tokens | First |
| P0 | Lifecycle money paths | BR-ORD-005, BR-ORD-006; AC-ORD-030..036 | An illegal `pay`, `ship` or `cancel` changes what the business owes; every forbidden transition must answer 409 and change nothing | First (AC-ORD-034 blocked by OQ-A-002; AC-ORD-034/036 assumption, OQ-001/004) |
| P0 | Mass assignment of status and tenant | BR-SEC-003, BR-ORD-004; AC-ORD-021, 022 | Writing `status` skips the lifecycle; writing `tenant` moves an order across tenants | First |
| P0 | Delete | AC-ORD-040..042 | Irreversible; wrong actor or tenant loses data | First |
| P0 | Sensitive data in the user list | AC-ADM-001 (no password field) | A password in a response is a breach | First |
| P1 | Create and validate | BR-ORD-001, BR-ORD-003, BR-ORD-007; AC-ORD-001, 003..007 | Wrong owner/tenant is caught by P0; length and cap are data-quality rules, three of them assumptions (OQ-002, OQ-003) | After P0 |
| P1 | Edit note | AC-ORD-020, AC-ORD-024 | Only `note` is editable; the security half is P0 above | After P0 |
| P1 | Security headers, CORS, error leakage | BR-SEC-004..006; AC-SEC-001..004 | Defence in depth; a leak in a 500 body helps an attacker | After P0 |
| P1 | Audit | BR-AUD-001; AC-AUD-001, AC-AUD-002 | Detection of attacks; not itself an access path | After P0 |
| P1 | Concurrency on `pay` | BR-ORD-005 (store lock); TEST_STRATEGY.md "two pay calls at once ... exactly one 200 and one 409" | A race that pays twice; not yet an AC (product TRACEABILITY_MATRIX "Known gaps") | After P0, as TC-ORD-037 |
| P2 | Note editable after a terminal status | OQ-005 (no rule yet) | No expected result is quotable; nothing to automate until answered | Manual exploration only |
| P2 | Performance | none (no SLO in the package) | The load example has thresholds "chosen for the example, not from an SLO" | Informational nightly run, never a gate |
| P3 | Cosmetic / UI | none | There is no UI (`01_SCOPE.md`) | Not applicable |

P3 is empty on purpose: recording "none" is a decision, an empty row would be a gap.

## What the classification changes

- **CI stage**: every P0 row runs on every pull request and blocks the merge; P1 rows run on every PR and block it
  too (the whole API suite fits the PR budget, OQ-A-009); P2 never blocks. See
  [CI_CD_STRATEGY.md](../cicd/CI_CD_STRATEGY.md).
- **Quarantine**: a P0 test may be quarantined only with the shorter expiry in
  [FLAKY_TEST_POLICY.md](../reliability/FLAKY_TEST_POLICY.md).
- **Proof that a test can fail**: P0 security families carry a flaw they were seen red for (the reference suite's
  `scripts/selftest.py`); every new or changed test passes `can-fail`.

## Review trigger

Re-classify when an OQ is answered (it changes an assumption row into a specified one), when a new operation adds
matrix rows, or when an escaped defect lands in an area classified below P0.
