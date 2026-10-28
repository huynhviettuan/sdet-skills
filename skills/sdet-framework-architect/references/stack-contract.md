# Stack Contract

What any language or framework must provide to be a supported stack in this collection, so that every skill
(`page-builder`, `service-builder`, `test-script-writer`, `test-code-review`, `refactor-test-suite`,
`automation-pipeline`) works the same way on it. The rest of this skill says *why*; this page says *what, per stack*.

Contents:

- [Composition is the design](#composition-is-the-design)
- [The contract](#the-contract)
- [Supported stacks](#supported-stacks)
- [Planned stacks](#planned-stacks)
- [Adding a stack](#adding-a-stack)

---

## Composition is the design

Every stack builds every layer by **composition**: objects receive or hold the things they use; they don't inherit
them.

| Layer | Composes | Never |
|---|---|---|
| Test | receives pages, services and factories from the composition root | constructs them; extends another test class |
| Page | **has** containers (one per screen region) | extends another page or a "BasePage" of locators |
| Container | **has** elements built from its own root; creates sections per repeated row | looks anything up page-globally; extends another container |
| Section | **has** elements built from its row root | is a singleton; is found by index |
| Element | **holds** a locator; exposes the actions its control supports | knows about pages, services or tests |
| Service | **receives** an HTTP client that carries base URL and credentials | holds configuration; asserts; extends another service |
| Data factory | **receives** a service; registers cleanup with the teardown owner | is a base class for other factories |
| Shared widget (table, toast, modal) | is composed into the containers that show it | is inherited to share it |

**Inheritance is allowed only for the framework's thin bases**, each one level (two at most for the element
family): the element base and its capability classes (`BaseControl → Clickable → Button`), `BaseService`, one
lifecycle test base where the runner needs it (Java `BaseTest → BaseUiTest`), and library bases (pydantic
`BaseModel`). `R-INHERIT` in the audit, ESLint in the TS scaffold and `ArchitectureRulesTest` in the Java scaffold
flag everything else.

Why: an inheritance chain makes a reader open four classes to understand one test, couples unrelated pages through
a shared parent, and turns "add a screen" into "edit the base class". Composition keeps each object replaceable and
each test readable top to bottom (`test-code-review` → S-KISS-COMPOSE).

---

## The contract

A stack is supported when its scaffold provides each row, its builders have templates for it, and the verification
row has been run for real.

| # | Capability | Requirement |
|---|---|---|
| 1 | Scaffold | `init-<stack>-framework` skill with a template that installs, compiles/type-checks, lints and audits clean on a fresh copy |
| 2 | Composition root | One place that provides pages, services and factories to tests (fixtures, a test context, DI) |
| 3 | Driver/session holder | Matches the runner's concurrency: none or a module singleton for process-parallel runners; thread-local for thread-parallel runners |
| 4 | Elements | Hold a strict, lazy, parent-scoped locator; ambiguous matches fail; capability split (a label can't be filled) |
| 5 | Containers / sections / pages | Root-scoped containers, row sections behind a factory keyed by business value, pages composing containers |
| 6 | API layer | `BaseService` with verbatim spec paths (`pathOf`), typed responses parsed lazily, schema validation from spec-extracted JSON Schemas |
| 7 | Models | Generated from `components.schemas`, typed (no `any`/raw maps) |
| 8 | Data factories | Create through services; cleanup registered with the teardown owner at creation time, idempotent |
| 9 | Waiting | Retrying assertions on real signals with bounded timeouts; no sleeps outside one poll helper |
| 10 | Configuration | Environment-driven config; secrets only from the environment; locale pinned |
| 11 | Traceability | Test-case id and requirement on every test through the runner's own metadata (tags, annotations, markers) |
| 12 | Enforcement | Audit rules for the language in `audit-suite.mjs`; editor/build enforcement (lint or architecture tests) for the block rules; `openapi-tool coverage` reads its doc comments |
| 13 | Builder templates | `page-builder`, `service-builder` and `test-script-writer` each have a `code-templates-<stack>.md` generated from verified code |
| 14 | Verification | The sample cases (TodoMVC UI, Petstore API) green with retries off, repeated ×3, in parallel, each new test shown to fail when its expectation is broken; audit clean; a CI job compiling, linting and auditing the scaffold |

---

## Supported stacks

| Stack | Scaffold | Runner model | Composition root | Templates | Enforcement | Verified |
|---|---|---|---|---|---|---|
| **Playwright / TypeScript** | `init-playwright-framework` | process-parallel workers | Playwright fixtures (`@fixtures/fixtures`) | `code-templates-playwright-ts.md` | ESLint `no-restricted-*` + audit | TodoMVC, Petstore, Gym CRM pilot |
| **Selenium + RestAssured / Java (TestNG, Maven)** | `init-selenium-java-framework` | thread-parallel methods | `TestContext` (`pages()`, `services()`, `data()`) | `code-templates-selenium-java.md`, `code-templates-restassured-java.md` | `ArchitectureRulesTest` (ArchUnit) + audit | TodoMVC, Petstore |
| **pytest + Playwright + httpx / Python** | `init-pytest-playwright-framework` | process-parallel (pytest-xdist) | pytest fixtures (`conftest.py` → `qa.fixtures.*`) | `code-templates-pytest-playwright.md`, `code-templates-python.md`, `code-templates-pytest.md` | ruff banned-api + mypy strict + audit | TodoMVC, Petstore |

Detecting the stack in a repo:

| Signal | Stack |
|---|---|
| `package.json` with `@playwright/test` | Playwright / TypeScript |
| `pom.xml` with `selenium-java` / `rest-assured` / `testng` | Selenium + RestAssured / Java |
| `pyproject.toml` (or `requirements*.txt`) with `pytest` and `playwright` / `httpx` | pytest / Python |
| none of the above | ask; offer a supported scaffold rather than improvising a framework |

---

## Planned stacks

Listed so nobody mistakes a mention for support. Each becomes supported only when every contract row is met.

| Stack | Status | What differs from a supported stack |
|---|---|---|
| C# / .NET (NUnit + Playwright for .NET + HttpClient) | planned — no .NET SDK on the verifying machine yet | Driver holder like TS (process per worker via `--workers`), fixtures as NUnit setup + a context object, Roslyn analyzers for enforcement |
| Cypress / TypeScript | planned | Commands chain asynchronously (no `await`); composition root = custom commands + `cy.session`; same page/container design |
| WebdriverIO / TypeScript | planned | Driver holder is the WDIO global `browser` per worker; same element/container design as the TS scaffold |
| Appium (mobile) | extension of an existing stack | Element layer uses accessibility ids; session holder per device; containers per screen region |
| Robot Framework | not planned | Keyword libraries can follow the layers, but the contract's typing and enforcement rows don't map |

---

## Adding a stack

1. Write the scaffold to the contract (rows 1–11), composition at every layer.
2. Add the language's rules to `audit-suite.mjs` (file roles, each `R-…` pattern, `R-INHERIT`) and prove them on a
   deliberately bad sample; extend `openapi-tool` doc-comment parsing if the language's comments differ.
3. Add editor/build enforcement for the block rules.
4. Implement the sample cases (TodoMVC, Petstore) with the builders; run the verification row; generate the three
   `code-templates-<stack>.md` files **from the verified files**.
5. Add a CI job for the scaffold, a row to the tables above, a line to `CHANGELOG.md`, and the detection signal to
   the builders' SKILL.md.
