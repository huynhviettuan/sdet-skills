# __PROJECT_NAME__ — Project Context for Claude

Selenium 4 + RestAssured test automation on TestNG (parallel methods), Maven, Java 17, AssertJ, Allure, Jackson,
Lombok. Layered design: element → container/section → page; service → models; composition root = `TestContext`
(`pages()` / `services()`); per-thread WebDriver in `DriverFactory`.

## Workflows

| Task | How |
| --- | --- |
| Build page objects for a screen | `page-builder` skill (sdet-skills collection) — Selenium/Java templates; follow `.claude/rules/` |
| Generate API services from OpenAPI | `service-builder` skill — 1:1 mapping; `node scripts/openapi-tool.mjs inventory|schemas|coverage` |
| Derive test cases from a story | `test-case-design` skill → `docs/test-cases/<feature>.md` |
| Implement test cases as tests | `test-script-writer` skill — one test per TC (per data row), TC/AC traced |
| Debug a failing / flaky test | `debug-failed-tests` skill |

If a skill isn't installed, follow the conventions below and the code that already exists.

## Non-negotiable conventions

- **Composition root.** Tests extend `BaseTest` (API) or `BaseUiTest` (UI) and reach pages, services, and test data
  only via `pages().x()` / `services().x()` / `data().x()`. Register new pages in `context/Pages.java`, services in
  `context/Services.java`, data factories (`data/`) in `context/TestData.java`, and add a row to `docs/registry/`.
- **Tests from test cases:** one test per `TC-…` (one per data row via `@DataProvider`), `description =
  "[TC-…] …"`, priority in `groups`, `@Link(name = "AC-…")`; preconditions through `data()` factories.
- **No instance state in test classes** (TestNG reuses one instance across parallel threads). Per-test values are
  local variables or live in `TestContext`.
- **Parent scoping.** Containers own a root (`Locator.root(...)` — the only page-level lookup); every element is
  `root.find(...)`. Repeated items are sections created by a factory method keyed by a business value.
- **Locator priority:** `Bys.testId` → `Bys.ariaLabel` / `Bys.button` / `Bys.link` / `Bys.heading` → `Bys.label` →
  `Bys.placeholder` → `Bys.text` → stable CSS → relative XPath (`.//`). Absolute XPath (`//`) escapes the parent —
  never use it inside `find`.
- **Waiting:** no `Thread.sleep`, no implicit waits. Actions wait inside the element classes; assertions on UI state
  go through `Eventually.verify(() -> assertThat(...))`.
- **Teardown ownership:** whoever creates data, a session, or a mock calls `context().onTeardown("what", cleanup)`
  right after creating it; cleanup is idempotent.
- **Services** are generated 1:1 from the OpenAPI spec: one class per tag, one method per operation named after its
  `operationId`, spec path verbatim with `{param}` placeholders, Javadoc `@operationId <id>` + `METHOD /path`.
  Services never assert; tests assert on `ApiResponse`.
- **Models** are Lombok `@Data @Builder @NoArgsConstructor @AllArgsConstructor` classes; enums carry `@JsonValue`.
- **Assertions:** AssertJ only; response contracts via `SchemaValidator.assertMatches(response, folder, name)`.
- **Config/secrets:** `Config.get(...)`; secrets from env / `-D` only.

## Verify after changes

```bash
mvn -q test-compile
mvn test -Dtest=<ChangedTest>
node scripts/openapi-tool.mjs coverage specs/<api>.json --services src/main/java/com/example/qa/api/services
```

## Docs

Start at [`docs/README.md`](docs/README.md): registry of pages/services, test cases, user stories, ADRs, CI.
