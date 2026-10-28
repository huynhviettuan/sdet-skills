# __PROJECT_NAME__

UI and API test automation with pytest, Playwright for Python and httpx.

## Setup

```bash
uv sync
uv run playwright install chromium
cp .env.example .env      # fill in BASE_URL, API_DOMAIN and credentials
```

## Run

```bash
uv run pytest                      # everything
uv run pytest tests/e2e -m smoke   # a subset by marker
uv run pytest -n 4                 # in parallel (pytest-xdist, one process per worker)
uv run pytest --count=3            # repeat to catch flakiness (pytest-repeat)
```

## Check

```bash
uv run ruff check . && uv run ruff format --check . && uv run mypy
node scripts/audit-suite.mjs . --fail-on block
```

## Layout

```text
conftest.py                    composition root: loads src/qa/fixtures/*
src/qa/config.py               configuration from the environment
src/qa/ui/                     elements (hold a Playwright Locator), wait.eventually
src/qa/assertions.py           expect (web-first, accepts elements) and eventually — what tests import
src/qa/pages/                  page objects (compose containers)
src/qa/components/containers/  regions of each page, rows as sections
src/qa/api/                    BaseService, ApiResponse, schema validation; services/ generated from the spec
src/qa/models/                 pydantic models from the spec
src/qa/schemas/                JSON Schemas extracted from the spec
src/qa/data/                   data factories (registered in fixtures/data.py with teardown)
tests/e2e, tests/api           tests, one module per test-case document
specs/                         OpenAPI specs
scripts/                       audit-suite.mjs, openapi-tool.mjs (Node >= 18)
docs/                          test cases, registry, CI example
```
