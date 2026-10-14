# __PROJECT_NAME__

UI and API test automation: **Selenium 4** (UI), **RestAssured** (API), **TestNG** (runner, parallel methods),
**AssertJ** (assertions), **Allure** (reporting), **Jackson + Lombok** (models), Maven, Java 17.

## Quick start

```bash
mvn test-compile
mvn test -DBASE_URL=https://app.example.test -DAPI_DOMAIN=https://api.example.test/v1
```

Configuration comes from `-DKEY=value`, environment variables, or `src/main/resources/config/<TEST_ENV>.properties`
(in that order). Secrets (`API_KEY`, `API_TOKEN`, passwords) come only from environment variables or `-D`.

| Command | Purpose |
| --- | --- |
| `mvn test` | Everything, 4 parallel threads |
| `mvn test -Dgroups=smoke` | One TestNG group |
| `mvn test -Dtest=TodoSmokeTest` | One class (`-Dtest=Class#method` for one method) |
| `mvn test -Dthreads=8` | More parallel threads |
| `mvn test -DTEST_ENV=staging` | Use `config/staging.properties` |
| `mvn test -DBROWSER=firefox -DHEADLESS=false` | Other browser, visible |
| `mvn test -DGRID_URL=http://grid:4444` | Run on a Selenium Grid |
| `allure serve target/allure-results` | Report (needs the Allure CLI) |

Browser drivers are resolved automatically by Selenium Manager.

## Layout

```text
src/main/java/com/example/qa/
├── config/          Config — -D / env / properties lookup
├── driver/          DriverFactory — one WebDriver per thread (ThreadLocal)
├── ui/
│   ├── locator/     Locator (lazy, parent-scoped, strict), Bys (locator strategies), StrictLocatorException
│   ├── elements/    BaseControl → Clickable / Editable → Button, Link, Label, Input, CheckBox, Dropdown
│   ├── wait/        Waits (real signals), Eventually (retrying assertions)
│   └── containers/  <page>/ containers and sections — empty, add your first one
├── pages/           <page>/ page objects composing containers — empty
├── api/             BaseService, ApiRequest, ApiResponse, JsonMapper, SchemaValidator
│   ├── services/    one service per OpenAPI tag — empty
│   └── models/      <tag>/ request/response models (Lombok) — empty
├── context/         TestContext (per-test, ThreadLocal), Pages, Services, and TestData registries
├── data/            test-data factories (create via services, register their own cleanup) — empty
└── testbase/        BaseTest, BaseUiTest
src/test/java/com/example/qa/tests/{ui,api}/   tests
src/test/resources/schemas/                    response JSON Schemas extracted from the OpenAPI spec
scripts/openapi-tool.mjs                       OpenAPI inventory / schemas / coverage (needs Node ≥ 18)
scripts/audit-suite.mjs                        rule audit: node scripts/audit-suite.mjs . --fail-on block
docs/                                          registry, test cases, user stories, decisions, CI
```

## Rules that keep the suite parallel-safe

- Tests get pages, services, and test data only through `pages()` / `services()` / `data()` — never
  `new SomePage()` in a test.
- Test classes hold **no instance fields**: TestNG runs methods of one instance in parallel threads.
- Every element is built from its container's root (`root.find(...)`); `Locator.root(...)` is only for container
  roots. Locators are strict: several matches fail.
- Whoever creates data registers its cleanup with `context().onTeardown(...)`; it runs even when the test fails.
- No `Thread.sleep` and no implicit waits — `Waits` / `Eventually` wait on the real state.

See [`CLAUDE.md`](CLAUDE.md) for the full conventions and [`docs/README.md`](docs/README.md) for the documentation map.
