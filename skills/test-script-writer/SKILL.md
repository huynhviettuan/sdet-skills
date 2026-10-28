---
name: test-script-writer
description: >
  Implement automated test scripts from documented test cases (docs/test-cases/<feature>.md, TC-<AREA>-NNN with
  preconditions, steps, expected results, test data): check that page objects, services, and data factories exist,
  then write one test per case (one per data row) — preconditions through data factories with automatic teardown,
  steps through page objects/services, every expected result asserted, negative cases with a sync point, TC/AC
  traceability in titles and tags — and verify each test passes, passes repeatedly and in parallel, and fails when
  its expectation is broken. Use this skill whenever the user wants to automate test cases, write test scripts or
  specs from test cases, convert manual tests to automation, or implement TC-XXX. Trigger on phrases like "automate
  these test cases", "write tests for TC-", "implement the test scripts", "generate specs from test cases",
  "convert manual cases". Playwright/TypeScript, Selenium+RestAssured/Java/TestNG, or Manual QA Agent executable
  specs (JSON).
---

# Test Script Writer

Turn each documented test case into an automated test that proves exactly what the case says — no more, no less —
and that a reader can trace back to the case and its acceptance criterion.

**How to use this skill:** follow the workflow. Load a reference when you reach its step:

- [`references/mapping-test-cases.md`](references/mapping-test-cases.md) — which cases to automate, the
  prerequisite check, the mapping from preconditions / steps / expected results / test data to code, assertion
  patterns (UI, API, negative), naming and traceability, blocked cases, and the review checklist.
- Code templates per stack, generated from the sample cases in the mapping reference and verified against live apps
  (TodoMVC UI, Petstore API):
  - [`references/code-templates-playwright-ts.md`](references/code-templates-playwright-ts.md) — Playwright /
    TypeScript (`init-playwright-framework`)
  - [`references/code-templates-selenium-java.md`](references/code-templates-selenium-java.md) — Selenium +
    RestAssured / Java / TestNG (`init-selenium-java-framework`)
  - [`references/code-templates-pytest.md`](references/code-templates-pytest.md) — pytest + Playwright + httpx /
    Python (`init-pytest-playwright-framework`)
- [`references/executable-spec.md`](references/executable-spec.md) — the Manual QA Agent target: map an approved
  case to its constrained JSON step format, locators, assertions, secrets and cleanup, what it can't express, a
  worked example verified on the agent's demo app, and the pre-proposal check.

**Detect the target first:** `package.json` with `@playwright/test` → TypeScript; `pom.xml` with TestNG → Java;
`pyproject.toml` with `pytest` → Python (full table: `sdet-framework-architect` → `references/stack-contract.md`); the
case lives in the Manual QA Agent (a `case_…` id, or the user asks to run it there) → executable spec. For the
executable-spec target, steps 2–5 below follow `executable-spec.md` instead: prerequisites are the live page's
locators and the environment's data hooks, and verification is the bundled check plus a run through
`manual-qa-agent`.

## Workflow

1. **Read the test-case file** and select cases with `Status: Ready` and an automatable layer. Cases that are
   `Blocked by OQ-…`, `Manual`, or `Obsolete` are listed in the report, not implemented.
2. **Check prerequisites** for every step and precondition: page object methods/elements, service operations,
   data factories, routes. Missing page parts → `page-builder`; missing operations → `service-builder`; missing
   factory → write it (it creates through a service and owns its cleanup). Never work around a gap with raw locators
   or raw HTTP in a test.
3. **Map each case** (mapping reference): preconditions → Arrange (API factories, not UI, unless the app has no
   API); steps → Act through page objects/services; each expected result → at least one assertion; test-data table
   → one test per row named after the partition.
4. **Write the tests** in the stack's file layout — one spec / test class per test-case file, one test per case
   (per row), title `[TC-…] <behavior>`, priority and smoke tags, AC link.
5. **Verify** each new test:
   - compiles and passes (`tsc` + ESLint / `mvn test-compile`);
   - passes **repeatedly** (`--repeat-each=3` / temporary `invocationCount = 3`) and alongside its neighbors in
     parallel;
   - **can fail**: break one expected value temporarily and confirm the test fails with a meaningful message, then
     restore it.
6. **Update traceability**: set each case's `Automation:` field to `Automated — <file>` and refresh the coverage
   summary; report implemented, skipped (with reason), and prerequisites created.

## Non-negotiable rules

- **The test case is the spec.** Assert what its expected results say. If the app disagrees, that's a finding
  (product bug or stale case) — report it; never change the expectation to match the app.
- **One test per case, one behavior per test**; data rows become separate tests, not a loop inside one test.
- **Every expected result is asserted.** A test with steps but no assertion for an expected result is incomplete.
- **Preconditions via factories with automatic teardown**, through the API where one exists; tests never clean up
  in their body.
- **Tests speak only through the composition root**: pages, services, and factories from fixtures /
  `pages()` · `services()` · `data()`; no raw locators, raw HTTP, or `new Page()` in tests.
- **Negative checks need a sync point** — something that proves the app processed the action — plus a check that
  nothing changed. An absence assertion that passes instantly proves nothing.
- **No fixed waits.** UI assertions retry (`expect.poll` / `Eventually.verify`); actions wait inside page objects.
- **Independent and parallel-safe**: unique data per test, no reliance on other tests or execution order.

## Related skills

- **`test-case-design`** — produces the cases this skill implements (format, IDs, techniques, data tables, basis
  and evidence quotes, known bugs bound to steps, `@req:` IDs).
- **`page-builder`** / **`service-builder`** — build missing page objects and services found in step 2.
- **`debug-failed-tests`** — when a new test fails and the cause isn't obvious.
- **`sdet-framework-architect`** — composition root, fixture-owned teardown, and scoping rules the tests follow.
- **`init-playwright-framework`** / **`init-selenium-java-framework`** — the scaffolds the templates target.
- **`manual-qa-agent`** — propose, get approved, and run executable specs in the agent; route cases it can't run.
