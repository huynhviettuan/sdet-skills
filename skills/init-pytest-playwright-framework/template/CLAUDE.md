# __PROJECT_NAME__ — Project Context for Claude

pytest + Playwright for Python (UI) + httpx (API), pydantic models, jsonschema contracts, pytest-xdist, uv. Built on
composition: fixtures are the composition root; pages compose containers; containers build elements from their own
root; services receive the shared httpx client; factories own cleanup.

## Workflows

| Task | How |
| --- | --- |
| Build page objects for a screen | `page-builder` skill (sdet-skills) — Python templates |
| Generate API services from OpenAPI | `service-builder` — 1:1, method = snake_case(operationId), `@operationId` in the docstring |
| Derive test cases | `test-case-design` → `docs/test-cases/<feature>.md` |
| Implement test cases as tests | `test-script-writer` — one test per case, `parametrize` per data row |
| Review a change | `test-code-review` (`/review-tests`) |
| Debug a failing / flaky test | `debug-failed-tests` |

## Non-negotiable conventions

- **Composition root.** Tests receive pages, services and factories as fixtures registered in `src/qa/fixtures/`;
  they never construct them and never import `playwright`, `httpx` or `requests` (ruff bans it).
- **Composition over inheritance.** Pages, containers, sections, tests and factories don't extend each other.
  Only `Element`, `BaseService` and pydantic `BaseModel` are base classes.
- **Parent scoping.** A container's root (`page.locator("section.main")`) is the only page-level lookup; every
  element is built from that root. Rows are sections created by a factory method keyed by a business value.
- **Locator priority:** `get_by_test_id` → `get_by_role(name=)` → `get_by_label` → `get_by_placeholder` →
  `get_by_text` → stable CSS. Locators are strict: two matches fail the action.
- **Waiting:** no `time.sleep` outside `qa/ui/wait.py`. Locator state through `expect(...)` from `qa.assertions`;
  values read from the page or API through `eventually(lambda: ...)`.
- **Teardown:** factories create through services and clean up after `yield`; tests never clean up in their body.
- **Services** are generated 1:1 from the spec; they send and parse, never assert.
- **Traceability:** `@pytest.mark.case("TC-…")`, `@pytest.mark.requirement("AC-…")`, priority marker, docstring
  `[TC-…] behavior`.
- **Config/secrets:** `qa.config.CONFIG`, values from `.env` / environment only.

## Verify after changes

```bash
uv run ruff check . && uv run ruff format --check . && uv run mypy
uv run pytest tests/<changed> -q
uv run pytest tests/<changed> -q --count=3 && uv run pytest -q -n 4
node scripts/audit-suite.mjs . --fail-on block
node scripts/openapi-tool.mjs coverage specs/<api>.json --services src/qa/api/services --tags <tag>
```
