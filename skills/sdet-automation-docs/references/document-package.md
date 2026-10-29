# Automation Documentation Package

Folder structure, minimum set before coding, and the README / AGENTS.md templates.

---

## Full structure

Do not create every file blindly — use only the files relevant to the project. Small suites can merge several
`standards/` or `reliability/` files into one.

```text
automation-project/
│
├── README.md
├── AGENTS.md
├── CLAUDE.md                     # one line: @AGENTS.md
├── CHANGELOG.md
│
├── docs/
│   ├── strategy/
│   │   ├── 00_AUTOMATION_OVERVIEW.md
│   │   ├── 01_AUTOMATION_STRATEGY.md
│   │   ├── 02_SCOPE_AND_COVERAGE.md
│   │   ├── 03_TEST_PYRAMID.md
│   │   ├── 04_RISK_BASED_TESTING.md
│   │   ├── 05_AUTOMATION_DECISION_MATRIX.md
│   │   └── 06_AUTOMATION_ROADMAP.md
│   │
│   ├── architecture/
│   │   ├── FRAMEWORK_ARCHITECTURE.md   # follows sdet-framework-architect
│   │   ├── PROJECT_STRUCTURE.md
│   │   ├── COMPONENT_DESIGN.md
│   │   ├── FIXTURE_DESIGN.md
│   │   ├── DATA_FLOW.md
│   │   └── ADR/
│   │
│   ├── standards/
│   │   ├── TEST_DESIGN_STANDARD.md
│   │   ├── LOCATOR_STRATEGY.md
│   │   ├── WAIT_STRATEGY.md
│   │   ├── ASSERTION_STRATEGY.md
│   │   ├── NAMING_CONVENTION.md
│   │   ├── LOGGING_STANDARD.md
│   │   └── CODE_REVIEW_CHECKLIST.md
│   │
│   ├── data/
│   │   ├── TEST_DATA_STRATEGY.md
│   │   ├── ACCOUNT_STRATEGY.md
│   │   ├── DATA_CLEANUP.md
│   │   ├── DATABASE_TESTING.md
│   │   └── FILE_TESTING.md
│   │
│   ├── testing/
│   │   ├── UI_TESTING.md
│   │   ├── API_TESTING.md
│   │   ├── CONTRACT_TESTING.md
│   │   ├── INTEGRATION_TESTING.md
│   │   ├── MOBILE_TESTING.md
│   │   ├── VISUAL_TESTING.md
│   │   ├── ACCESSIBILITY_TESTING.md
│   │   ├── PERFORMANCE_TESTING.md      # content from the performance-testing skill
│   │   └── SECURITY_TESTING.md         # content from the security-testing skill
│   │
│   ├── reliability/
│   │   ├── FLAKY_TEST_POLICY.md
│   │   ├── RETRY_POLICY.md
│   │   ├── PARALLEL_EXECUTION.md
│   │   ├── TEST_ISOLATION.md
│   │   └── FAILURE_ANALYSIS.md
│   │
│   ├── cicd/
│   │   ├── CI_CD_STRATEGY.md
│   │   ├── PIPELINE_DESIGN.md
│   │   ├── ENVIRONMENT_STRATEGY.md
│   │   ├── REPORTING.md
│   │   └── ARTIFACTS_AND_DEBUGGING.md
│   │
│   └── quality/
│       ├── QUALITY_GATES.md
│       ├── TRACEABILITY_MATRIX.md
│       ├── DEFINITION_OF_READY.md
│       ├── DEFINITION_OF_DONE.md
│       └── OPEN_QUESTIONS.md
│
└── <framework code>              # layout defined by FRAMEWORK_ARCHITECTURE.md, not by this doc
```

When the automation lives inside the product repo that already uses `project-docs`, put these under
`docs/automation/` and reuse the product's `OPEN_QUESTIONS.md`, `TRACEABILITY_MATRIX.md`, and `CHANGELOG.md`
instead of creating parallel copies.

---

## Minimum before writing automation code

```text
README.md
AGENTS.md + CLAUDE.md
AUTOMATION_OVERVIEW.md
AUTOMATION_STRATEGY.md
SCOPE_AND_COVERAGE.md
FRAMEWORK_ARCHITECTURE.md
LOCATOR_STRATEGY.md
WAIT_STRATEGY.md
TEST_DATA_STRATEGY.md
CI_CD_STRATEGY.md
DEFINITION_OF_DONE.md
OPEN_QUESTIONS.md
```

---

## README.md template

```md
# <Automation Project Name>

## Objective

What quality risks does this automation suite protect against?

## Application Under Test

Name:
Environments:
Primary users:

## Test Layers

- API
- Integration
- Contract
- UI E2E
- Visual
- Performance

## Technology

Language:
Automation framework:
API library:
Reporting:
CI/CD:
Database access:

## Commands

Install:
Run locally:
Run smoke:
Run regression:
Run API:
Run E2E:

## Documentation

See `/docs`. Start with `docs/strategy/01_AUTOMATION_STRATEGY.md`.

## Source of Truth

1. Product docs (business rules, acceptance criteria — see project-docs hierarchy)
2. Automation strategy
3. Test design standards
4. Automation ADRs
5. Framework / test code

## Quality Expectations

- Tests are isolated and deterministic
- Critical tests run in CI
- Failures produce useful artifacts
```

---

## AGENTS.md template

Mandatory when AI agents contribute to automation. `CLAUDE.md` imports it (`@AGENTS.md`) rather than duplicating
it — the mechanics and the product-side template are in `project-docs` → `references/templates.md` → "AGENTS.md +
CLAUDE.md"; this template adds only what is specific to a test-automation repo.

```md
# SDET AI Agent Instructions

## Before Writing Code

Read:
1. docs/strategy/01_AUTOMATION_STRATEGY.md
2. docs/architecture/FRAMEWORK_ARCHITECTURE.md
3. docs/standards/LOCATOR_STRATEGY.md
4. docs/standards/WAIT_STRATEGY.md
5. docs/data/TEST_DATA_STRATEGY.md
6. the relevant feature docs and AC-* IDs

Inspect existing components, fixtures, and services before creating new abstractions.

## Test Design Rules

- Verify observable product behavior; never reproduce application logic inside test code.
- Prefer the lowest reliable test layer.
- Prefer API setup over UI setup when setup is not the behavior under test.
- Tests are independently executable and never depend on execution order.
- Tests get pages, components, services, and data only through fixtures (the composition root) — never construct
  them inside a test body.

## Locator Rules

- Resolve every element through its owning container/component root, never a page-global lookup.
- Follow the priority order in LOCATOR_STRATEGY.md.
- Avoid nth-child, generated class names, deep CSS chains, and long XPath.

## Wait Rules

- No fixed sleeps. Wait on the real signal: element state, response, persisted state, expected count.
- A documented technical exception must cite the reason inline.

## Assertion Rules

- Assertions must prove behavior; prefer domain assertions over truthiness checks.
- Assert on what the user/consumer observes, never on a mock's call state.

## Test Data Rules

- No shared mutable data unless explicitly designed for it.
- Whoever creates data owns its idempotent teardown, in the fixture's teardown — never in the test body.

## Retry / Parallel Rules

- Retries are diagnostics, not fixes. A test that only passes on retry is FLAKY.
- Tests are parallel-safe by default; serial mode requires a documented reason.

## Conflict Rule

If product behavior or documentation is ambiguous: STOP, report the ambiguity as an OQ, do not invent expected
behavior.

## Definition of Done

See docs/quality/DEFINITION_OF_DONE.md. Passing once locally is not done.
```

---

## Final quality standard

A strong SDET documentation package lets a new engineer or AI agent answer, from the docs alone:

```text
What are the most important product risks?
What should be automated? What should remain manual?
Which layer should test each behavior?
How is test data created and cleaned up?
How are accounts assigned to parallel workers?
How are tests synchronized?
How are locators chosen?
How are failures debugged from CI?
How are tests parallelized?
How are flaky tests handled?
Which tests run on PR, merge, nightly, and release?
How is coverage measured?
When is an automation task DONE?
```

If these cannot be answered, the automation project is not ready for autonomous implementation.
