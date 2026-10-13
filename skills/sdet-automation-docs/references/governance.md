# Governance

Traceability, readiness/done criteria, open questions, ADRs, AI-agent tasks, reviewing an existing suite,
anti-patterns, and keeping docs current.

Formats for OQ, ADR, and the base traceability matrix come from `project-docs` (`references/templates.md` in that
skill); this file adds only the automation-specific parts.

Contents:

- [TRACEABILITY_MATRIX.md](#traceability_matrixmd)
- [DEFINITION_OF_READY.md](#definition_of_readymd)
- [DEFINITION_OF_DONE.md](#definition_of_donemd)
- [OPEN_QUESTIONS.md](#open_questionsmd)
- [Automation ADRs](#automation-adrs)
- [AI agent task template](#ai-agent-task-template)
- [Reviewing an existing automation suite](#reviewing-an-existing-automation-suite)
- [Common anti-patterns](#common-anti-patterns)
- [Reliability review checklist](#reliability-review-checklist)
- [Health indicators](#health-indicators)
- [Documentation update rule](#documentation-update-rule)

---

## TRACEABILITY_MATRIX.md

Extends the product matrix with automation columns:

```text
FR → BR → AC → Risk → TC → Layer → Automation file → CI stage
```

| AC | Risk | TC | Layer | Automation | CI |
|---|:---:|---|---|---|---|
| AC-AUTH-001 | P0 | TC-AUTH-001 | UI | login.spec.ts | PR |
| AC-CONTRACT-010 | P0 | TC-CONTRACT-021 | API | contract-approval.api.spec.ts | PR |
| AC-PAYMENT-003 | P0 | TC-PAYMENT-010 | API + UI | payment.spec.ts | PR |

Rows with an AC but no TC are coverage gaps; TCs with no AC are candidates for deletion.

---

## DEFINITION_OF_READY.md

A case is ready for automation only if:

```text
[ ] Requirement is stable enough
[ ] Expected behavior is clear (AC exists)
[ ] Risk is known
[ ] Correct test layer is known
[ ] Environment is available
[ ] Test data strategy is known
[ ] Required API / test hooks exist
[ ] Locators / test ids are available
[ ] No blocking OQ remains open
```

Otherwise automation is premature — record what's missing.

---

## DEFINITION_OF_DONE.md

```text
[ ] AC verified
[ ] Appropriate test layer selected
[ ] Test is independent and deterministic
[ ] Test is parallel-safe
[ ] No unjustified fixed waits
[ ] Locators scoped and stable
[ ] Assertions verify real behavior
[ ] Test data created and torn down by a fixture
[ ] Failure artifacts available
[ ] Passes locally, repeatedly (e.g. N consecutive runs), and in CI
[ ] Code review complete
[ ] Traceability updated
[ ] Documentation updated
```

Passing once locally is not DONE.

---

## OPEN_QUESTIONS.md

Same format as `project-docs`. Typical automation questions:

```md
## OQ-001 — Shared Test Account

Status: OPEN
Owner: QA Lead

Question:
Can multiple browser sessions use the same account concurrently?

Impact:
- parallel execution
- account pool
- session isolation

AI Agent Instruction:
Do not finalize worker/account strategy until resolved.
```

When automation lives in the product repo, add these to the product's `OPEN_QUESTIONS.md`, not a separate file.

---

## Automation ADRs

Use the `project-docs` ADR template. Typical decisions:

```text
ADR-001 Automation tool selection
ADR-002 Page/screen object + component model
ADR-003 API setup strategy
ADR-004 Account pool strategy
ADR-005 Parallel execution model
ADR-006 Reporting
ADR-007 Test data lifecycle
ADR-008 CI test segmentation
```

---

## AI agent task template

Bounded tasks only. Avoid "Automate the whole contracts module."

```md
# Task: Automate Contract Approval

## Acceptance Criteria
AC-CONTRACT-010..013

## Risk
P0

## Layer
API for all scenarios + one UI smoke

## Read First
- AGENTS.md
- docs/strategy/01_AUTOMATION_STRATEGY.md
- docs/testing/API_TESTING.md
- docs/data/TEST_DATA_STRATEGY.md

## Scenarios
1. TC-CONTRACT-021 — manager approves pending contract
2. TC-CONTRACT-022 — unauthorized user receives 403
3. TC-CONTRACT-023 — approved contract cannot be approved again
4. TC-CONTRACT-024 — audit record is created

## Constraints
- no UI setup; contract created by an API fixture that also deletes it
- no hard waits
- parallel-safe

## Done When
- passes locally, repeatedly, and in CI with 0 retries
- traceability updated
```

---

## Reviewing an existing automation suite

```text
Inspect framework → inspect tests → inspect CI → inspect failure history
 → classify problems → propose target architecture → create incremental migration plan
```

Review categories: architecture, duplicated code, page object size, locator quality, wait quality, test isolation,
test data, parallel execution, retries, flaky tests, execution time, failure artifacts, CI design, coverage gaps.

For architecture findings, use the Block/Warn checklist in `sdet-framework-architect`. Never rewrite the framework
blindly — migrate in small, independently shippable steps.

---

## Common anti-patterns

| Anti-pattern | Instead |
|---|---|
| UI setup for everything (login UI, create user UI… then test one field) | API setup via fixture → UI only for the behavior under test |
| Hard waits | Wait on the observable signal |
| Giant page objects (thousands of lines) | Region containers + reusable components |
| Page-global locators | Scope through the owning container/component |
| Shared mutable data ("all tests use customer Test User") | Per-test data owned by a fixture |
| Retry as a fix (`retries = 5`) | Fix root cause; retries are diagnostics |
| Assertion-free tests (click, click, end) | Every test proves a behavior |
| Serial mode because of poor isolation | Fix isolation; serial only with recorded reason |
| Testing implementation details (internal component state) | Assert user/API-observable outcomes |
| Asserting a mock was called | Assert what the consumer sees change |

---

## Reliability review checklist

Before production adoption of a suite:

```text
[ ] Critical tests deterministic
[ ] Parallel execution stable
[ ] Account pool proven under full worker count
[ ] No broad shared mutable data
[ ] Cleanup safe and owned by fixtures
[ ] Timezone handled
[ ] Download / upload reliable
[ ] Browser differences understood
[ ] Network waits deterministic
[ ] Retry policy documented
[ ] Flaky tests tracked with owners
[ ] CI artifacts sufficient to debug
```

---

## Health indicators

Healthy: fast enough to be used, reliable enough to be trusted, readable enough to maintain, isolated enough to
parallelize, traceable enough to explain coverage, observable enough to debug.

Unhealthy: high pass rate only because of retries; tests run only locally; hours-long suite with no segmentation;
shared account collisions; random sleeps; unknown failure reasons; UI tests for every scenario.

---

## Documentation update rule

When product behavior changes:

```text
Requirement / AC change
 → risk review
 → update automation strategy if needed
 → update test scenarios (TC)
 → update test data
 → update traceability
 → update CI classification if needed
 → CHANGELOG entry
```

Never change only the test code while leaving documentation outdated.
