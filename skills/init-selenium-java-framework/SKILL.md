---
name: init-selenium-java-framework
description: >
  Scaffold a brand-new Java test-automation repository for UI (Selenium 4) and API (RestAssured) testing on TestNG
  with Maven, AssertJ, Allure, Jackson, and Lombok — layered per sdet-framework-architect: lazy strict parent-scoped
  locators, element classes, containers and pages, a RestAssured BaseService for OpenAPI-generated services,
  per-thread WebDriver and test context for parallel TestNG methods, teardown registry, retrying assertions, and
  failure evidence in Allure. Use this skill whenever the user wants to start a new Selenium, RestAssured, or Java
  test framework, bootstrap a QA automation project in Java, or set up a TestNG/Maven test repo. Trigger on phrases
  like "new selenium framework", "java test automation project", "rest assured framework", "testng maven project",
  "scaffold java qa repo". For Playwright/TypeScript use init-playwright-framework instead.
---

# Init Selenium Java Framework

Scaffolds a new repo from the bundled [`template/`](template/): Maven + TestNG (parallel methods) + Selenium 4 +
RestAssured + AssertJ + Allure + Jackson + Lombok, Java 17. It compiles out of the box and ships the framework layers
with no example feature — the first page objects and services come from `page-builder` and `service-builder`.

**What's in the template** (`src/main/java/com/example/qa/`):

| Layer | Classes |
|---|---|
| Config | `Config` — `-D` → env var → `config/<TEST_ENV>.properties`; secrets only from env / `-D` |
| Driver holder | `DriverFactory` — one WebDriver per thread (ThreadLocal), Selenium Manager, optional `GRID_URL`, zero implicit wait |
| Locators | `Locator` (lazy, parent-scoped, strict — fails on several matches), `Bys` (strategies in priority order), `StrictLocatorException` |
| Elements | `BaseControl` → `Clickable` / `Editable` → `Button`, `Link`, `Label`, `Input`, `CheckBox`, `Dropdown` |
| Waiting | `Waits.until` (real signals), `Eventually.verify` (retrying AssertJ assertions) |
| API | `BaseService` (RestAssured, verbatim spec paths, auth chain, Allure filter), `ApiRequest`, `ApiResponse<T>`, `JsonMapper`, `SchemaValidator` (draft-07) |
| Composition root | `TestContext` (ThreadLocal; `pages()`, `services()`, `data()`, teardown stack), `Pages`, `Services`, `TestData` registries |
| Test bases | `BaseTest` (context lifecycle), `BaseUiTest` (browser per test, screenshot + page source + URL on failure) |

Plus `CLAUDE.md`, `.claude/rules/` (composition root, parent scoping, no sleeps, verify), `docs/` (registry, test
cases, user stories, ADRs, inert GitHub Actions workflow), `specs/`, and `scripts/openapi-tool.mjs` (the
`service-builder` tool; needs Node ≥ 18 at development time only).

## Steps

1. **Get the basics.** If not provided, ask for:
   - Project name (kebab-case) — Maven `artifactId` and doc titles.
   - Target directory — must be new or empty. Confirm before writing into a non-empty directory.
   - Base package — default `com.example.qa`. Only ask if the user mentions an organization package.

2. **Copy the scaffold.** Copy the entire `template/` tree, including dotfiles/dotdirs (`.claude/`, `.gitignore`).
   On Windows, verify `.claude/` and `.gitignore` actually landed.

3. **Fill in the project name.** Replace `__PROJECT_NAME__` in `pom.xml`, `README.md`, and `CLAUDE.md`.

4. **Rename the base package (only if requested).** Move `src/main/java/com/example/qa` and
   `src/test/java/com/example/qa` to the new package path, then replace `com.example.qa` in every `.java` file,
   `pom.xml` (`groupId`), `CLAUDE.md`, `.claude/rules/`, `docs/`, and the `--services` paths in `README.md` and
   `docs/ci/github.yml`.

5. **Report and hand off.** Tell the user what was created, then the follow-ups:
   - Set `BASE_URL` / `API_DOMAIN` in `src/main/resources/config/dev.properties` (add `staging.properties` etc. per
     environment); export secrets as environment variables.
   - `mvn test-compile` to download dependencies and compile.
   - Store the API's OpenAPI spec in `specs/` and run `service-builder`; explore the first screen with `page-builder`.
   - Copy `docs/ci/github.yml` to `.github/workflows/` when ready for CI.

6. **Only with explicit confirmation**, run `mvn test-compile` and/or `git init` in the new directory — never `git
   add`/`commit`/`push` without being asked.

## Conventions the template enforces

- Tests reach pages/services only via `pages()` / `services()`; test classes have no instance fields (TestNG runs
  methods of one instance in parallel threads).
- Container roots are the only page-level lookups; elements are `root.find(...)`; several matches fail fast.
- No `Thread.sleep`, no implicit waits; element actions retry until WebDriver accepts them; UI assertions use
  `Eventually.verify`.
- Cleanup is registered by whoever creates the data (`context().onTeardown(...)`) and runs even after failures.

## Related skills

- **`page-builder`** / **`service-builder`** — build the first page objects and OpenAPI services (Selenium/Java and
  RestAssured templates in their references).
- **`test-script-writer`** — implement documented test cases as TestNG tests, with data factories in `data()`.
- **`sdet-framework-architect`** — the architecture this template implements (thread-local holder for thread-based
  runners).
- **`debug-failed-tests`** — investigating failures, with Selenium/TestNG specifics.
- **`sdet-automation-docs`**, **`test-case-design`** — strategy docs and test cases around the framework.
- **`refactor-test-suite`** — its audit script ships in `scripts/`; the template audits clean.
- **`init-playwright-framework`** — the Playwright/TypeScript counterpart.
