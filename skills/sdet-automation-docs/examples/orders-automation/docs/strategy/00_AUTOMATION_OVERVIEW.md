# Automation Overview — Orders

Snapshot: 2026-11-03.

## Objective

Fast, trustworthy feedback on the risks that matter for Orders, a multi-tenant orders API
([00_PROJECT_OVERVIEW.md](../../../../../project-docs/examples/orders-docs/docs/product/00_PROJECT_OVERVIEW.md)):
that no caller reads or changes another tenant's or another customer's order, that lockout and token checks hold,
and that an order moves only along its lifecycle. The risk order is in
[04_RISK_BASED_TESTING.md](04_RISK_BASED_TESTING.md).

## Goals

- Every P0 requirement and every one of the 51 permission cells verified on every pull request.
- A green run that is known to be able to go red: a sentinel in the security suite, `can-fail` on new tests.
- A CI failure diagnosable from its artifacts alone (JUnit, the request and response of the failing call, the ids
  the test created).
- The product's [TRACEABILITY_MATRIX.md](../../../../../project-docs/examples/orders-docs/docs/quality/TRACEABILITY_MATRIX.md)
  `Test` column filled from generated output, not by hand.

## Non-goals

- No UI automation: there is no UI (`01_SCOPE.md`). See OQ-A-008.
- No migration validation: no legacy data (TEST_STRATEGY.md).
- No performance gate: no SLO exists; the load example stays informational.
- Automation does not replace exploratory testing of the OQ-dependent areas (OQ-005 has no rule at all).

## Primary layers

| Layer | Owner | What |
|---|---|---|
| Unit | Developers (product repo) | The four pure decisions TEST_STRATEGY.md names: `locked`, `cancellable`, `open_order_count`, token verification |
| API | This suite | Every AC; the 51-cell matrix; the security families |
| Load | This suite, informational | The closed-model run from `skills/performance-testing/examples/vuln-api-load/` |

Layer per requirement kind: [01_AUTOMATION_STRATEGY.md](01_AUTOMATION_STRATEGY.md).

## Environments

Local only today (`http://127.0.0.1:8765`,
[ENVIRONMENTS.md](../../../../../project-docs/examples/orders-docs/docs/delivery/ENVIRONMENTS.md)). Staging is
described but has no host (OQ-A-006). Production is never a target: the suite refuses any host outside its
allow-list ([TEST_DATA_STRATEGY.md](../data/TEST_DATA_STRATEGY.md), "Environment guard").

## Ownership

Assumption (example), OQ-A-005:

| Who | Owns |
|---|---|
| SDET | Framework, this package, the flaky queue, CI stages |
| Developers | Testability (clock control OQ-A-002, seed accounts OQ-A-003), unit tests, the API contract |
| Product Owner | Expected behaviour; answers to OQ-001..006 |
| QA lead | Risk priority, quarantine approvals for P0 |

A red P0 test is triaged by the SDET within one working day (Assumption (example)) and labelled product defect,
test defect, environment, or flaky ([FLAKY_TEST_POLICY.md](../reliability/FLAKY_TEST_POLICY.md)).

## When suites run

Pull request, merge to `main`, nightly, release — the table is in
[CI_CD_STRATEGY.md](../cicd/CI_CD_STRATEGY.md).
