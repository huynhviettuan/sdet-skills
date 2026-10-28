# Rule Catalogue

The rules a test suite is audited and refactored against, with stable IDs. `scripts/audit-suite.mjs` detects them
heuristically in TypeScript/JavaScript, Java and Python suites; the "Manual" column lists what only a reviewer can judge.
The architecture behind each rule is in `sdet-framework-architect`.

Severity: **block** — fix before new work builds on it (correctness, isolation, security); **warn** — fix as part
of the refactor; don't add more.

Contents:

- [Block rules](#block-rules)
- [Warn rules](#warn-rules)
- [What the script can't see](#what-the-script-cant-see)
- [Suppressing a finding](#suppressing-a-finding)
- [File roles](#file-roles)

---

## Block rules

| ID | Rule | Why | Detected (TS / Java) | Fix recipe |
|---|---|---|---|---|
| `R-NO-SLEEP` | No fixed sleeps; no implicit waits | Sleeps are too short on slow runs and waste time on fast ones; implicit waits stretch every lookup and hide timing problems | `waitForTimeout`, promise-wrapped `setTimeout` / `Thread.sleep`, non-zero `implicitlyWait` | [Sleeps → real signals](recipes.md#sleeps--real-signals) |
| `R-RAW-UI-IN-TEST` | Tests reach the UI only through page objects | Locators duplicated across tests break together; tests describe mechanics instead of behavior | `page.locator/getBy*/click/fill…` in tests / `findElement(s)`, `By.*`, `WebElement` in tests | [Raw UI → page objects](recipes.md#raw-ui-calls--page-objects) |
| `R-RAW-HTTP-IN-TEST` | Tests reach APIs only through services | URLs, auth, and parsing duplicated per test; no contract checks | `request.get/post…`, `fetch('http…')` / `given()`, `RestAssured.get…` in tests | [Raw HTTP → services](recipes.md#raw-http--services) |
| `R-COMPOSITION` | Tests get dependencies from the composition root | Ad hoc construction bypasses credentials, teardown, and per-test isolation | `new XxxPage/Service(` in tests; `@playwright/test` imported in tests when a fixtures module exists / `new ChromeDriver(` etc. | [Ad hoc construction → composition root](recipes.md#ad-hoc-construction--composition-root) |
| `R-SHARED-STATE` | No state shared between tests; no order dependence | Breaks parallel runs and makes failures depend on what ran before | module/describe-level `let`, `describe.serial` / static `WebDriver`, instance fields in test classes, `@Test(priority=…/dependsOnMethods=…)` | [Shared state → isolated tests](recipes.md#shared-state--isolated-tests) |
| `R-TEARDOWN` | Cleanup is owned by whoever created the data, in teardown | Cleanup in the test body is skipped when an assertion fails, leaking data into later runs | `delete*/remove*/cleanup*` calls in a test body (not in hooks / `onTeardown`) | [Cleanup in body → factories](recipes.md#cleanup-in-the-body--factories-with-teardown) |
| `R-SECRETS` | No credentials or tokens in code | Leaks secrets through the repo; ties tests to one environment | `password/secret/api_key/token = '…'`, `Bearer …` literals | [Secrets and URLs → config](recipes.md#secrets-and-urls--configuration) |
| `R-FOCUS` | No focused tests committed | `test.only` silently skips the rest of the suite | `test.only`, `describe.only` | delete `.only` |

## Warn rules

| ID | Rule | Detected | Fix recipe |
|---|---|---|---|
| `R-SCOPE` | Page objects resolve elements through their container, not the whole page | page-global helpers / `driver.findElement` inside page objects | [Raw UI → page objects](recipes.md#raw-ui-calls--page-objects) |
| `R-POSITION` | Elements identified by business key, not position | `.nth(`, `.first()`, `:nth-child`, `findElements(…).get(0)` in tests/pages (generic table/list components exempt) | [Positions → business keys](recipes.md#positions--business-keys) |
| `R-XPATH-ABS` | No absolute or long XPath | `/html/…`, `//a/b/c/d…`, `xpath=//…` | [Raw UI → page objects](recipes.md#raw-ui-calls--page-objects) |
| `R-FORCE` | No forced / scripted actions bypassing interactability | `force: true`, `executeScript(… click …)` | [Sleeps → real signals](recipes.md#sleeps--real-signals) (wait for the overlay/state instead) |
| `R-WEAK-ASSERT` | Assertions prove the expected value | `toBeTruthy()`, `toBeDefined()` / `assertNotNull(`, `isNotNull();` | [Weak assertions → exact expectations](recipes.md#weak-assertions--exact-expectations) |
| `R-HARDCODED-URL` | Environment URLs come from configuration | `'https://…'` in tests/pages | [Secrets and URLs → config](recipes.md#secrets-and-urls--configuration) |
| `R-RETRY-MASK` | Retries don't hide flakiness | `retries: ≥2`, `retryAnalyzer`, `rerunFailingTestsCount ≥2`, `--reruns ≥2` | [migration-plan.md → retries](migration-plan.md#retries-and-flaky-tests) |
| `R-INHERIT` | Pages, containers, tests and services compose; only the framework's thin bases are extended | a page/container/section class that extends anything; a test class extending anything but the lifecycle base (`BaseTest`/`BaseUiTest`); a service extending anything but `BaseService` | [Deep inheritance → composition](recipes.md#deep-inheritance--composition); `sdet-framework-architect` → `stack-contract.md` |

---

## What the script can't see

Check these by reading code and record them in the "Manual findings" section of the audit report
([`migration-plan.md`](migration-plan.md#audit-report-template)):

| Concern | Look for |
|---|---|
| Missing composition root | No fixtures module / test context at all — everything is wired in tests or base classes |
| Giant page objects | One class covering several regions or screens (hundreds of lines) |
| Deep inheritance | `BaseTest → BaseUiTest → LoggedInTest → AdminTest…`, pages inheriting from pages |
| Duplicated cross-cutting concerns | Every page re-implements toasts, spinners, pagination, tables |
| Tests without assertions on the expected result | Steps only; `expect-expect` lint helps for TS |
| Assertions on implementation details | Internal state, CSS classes as behavior, mock call counts |
| Unclear test intent | Titles like `test1`, no link to a test case / requirement |
| Hand-written API clients drifting from the spec | Endpoints not in the OpenAPI spec, missing operations |

---

## Editor and build-time enforcement

The scaffolds enforce the rules a compiler or linter can see, with messages that start with the rule ID:

| Rule | Playwright template (`eslint.config.mjs`) | Java template (`ArchitectureRulesTest`, ArchUnit) | Python template (ruff `banned-api`, mypy) |
|---|---|---|---|
| `R-NO-SLEEP` | `waitForTimeout`, `setTimeout` in tests; `waitForTimeout` in `src/` | `Thread.sleep` outside `ui.wait` | `time.sleep` banned in tests (audit covers `src/` outside `wait.py`) |
| `R-RAW-UI-IN-TEST` | `page.locator/getBy*/click/fill…` in tests | tests depending on `org.openqa.selenium` | `playwright` imports banned in tests |
| `R-RAW-HTTP-IN-TEST` | `request.get/post…` in tests | tests depending on `io.restassured` | `httpx` / `requests` banned in tests |
| `R-COMPOSITION` | `@playwright/test` imported in tests; `new …Page/Service/Container/Section(` in tests | tests constructing pages, elements, services, drivers | (audit: `= XxxPage(` in tests) |
| `R-SHARED-STATE` | `test.describe.serial` | static `WebDriver` fields; non-final fields in test classes | (audit: module-level mutable state, `global`, ordering marks) |
| `R-FOCUS` | `playwright/no-focused-test` | — | — |
| `R-INHERIT` | `class … extends` in `src/pages`, `src/components`; a service extending anything but `BaseService` | pages/containers extend nothing; tests extend only the lifecycle base; services only `BaseService` | (audit) |

The audit stays the CI gate: it also sees teardown in test bodies, secrets, locator style and retries.

## Suppressing a finding

Some matches are correct code: a bounded poll interval inside a retry helper, a delete that *is* the test's
precondition. Mark them on the line (or the line above) with the rule and the reason:

```ts
// audit-ignore R-TEARDOWN: deleting is the precondition; cleanup stays with the factory
```

Suppressions are code-reviewed like any other change; a suppression without a reason is a finding.

---

## File roles

The script classifies files by path, and rules apply per role:

| Role | Paths |
|---|---|
| test | `*.spec.ts`, `*.test.ts`, `tests/**`, `src/test/java/**`, `test_*.py`, `*_test.py` |
| page | `pages/`, `containers/`, `components/`, `screens/`, `sections/` (files directly under `components/` count as generic widgets for `R-POSITION`) |
| composition | `fixtures/`, `context/`, `testbase/`, `conftest.py` |
| framework (tooling) | `architecture/` — architecture-rule tests such as the Java template's ArchUnit rules |
| framework | everything else (config, elements, services, helpers) |

Repos with other layouts still get most findings; adjust the paths in `roleOf()` if a role is misclassified.
