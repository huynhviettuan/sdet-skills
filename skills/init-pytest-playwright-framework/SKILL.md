---
name: init-pytest-playwright-framework
description: >
  Scaffold a new Python UI + API test-automation repo — pytest, Playwright for Python, httpx, pydantic, jsonschema,
  pytest-xdist, uv — built on composition: pytest fixtures as the composition root (pages, services and data
  factories injected, never constructed in tests), page objects composed of container regions and thin elements
  that hold a Playwright locator, services that receive a shared httpx client, factories with yield teardown,
  web-first expect plus a bounded eventually(), pinned locale, ruff with banned-api rules for the audit IDs,
  mypy strict, and the audit and OpenAPI scripts. Use when starting a Python test-automation project, or when the
  user asks for pytest, Playwright for Python, Python API tests with httpx, or a Python version of the collection's
  framework. Trigger on "python test framework", "pytest playwright", "scaffold python automation", "new pytest repo".
---

# Init pytest + Playwright Framework

Scaffold the Python stack of the collection: same layers, same rules, same verification bar as the Playwright/TS
and Selenium/Java scaffolds (see `sdet-framework-architect` → `references/stack-contract.md`).

## Steps

1. **Get the basics.** Project name (snake or kebab case) and target directory — new or empty; confirm before
   writing into a non-empty one.
2. **Copy the scaffold.** Copy the whole [`template/`](template/) tree, including dotfiles (`.gitignore`,
   `.env.example`, `.claude/`). On Windows, check that the dotfiles arrived.
3. **Fill in the project name.** Replace `__PROJECT_NAME__` in `pyproject.toml`, `README.md` and `CLAUDE.md`.
4. **Install and verify** (only with the user's go-ahead, like any install):
   ```bash
   uv sync
   uv run playwright install chromium
   uv run ruff check . && uv run ruff format --check . && uv run mypy
   node scripts/audit-suite.mjs . --fail-on block
   ```
   All four must be clean before the first page object is written.
5. **Report and hand off.** Copy `.env.example` → `.env` and fill it; build pages with `page-builder`, services
   with `service-builder`, tests with `test-script-writer` (each has Python templates); review with
   `test-code-review`. Never `git add`/`commit`/`push` without being asked.

## What the scaffold gives you

| Layer | Where | Composition |
|---|---|---|
| Composition root | `conftest.py` → `src/qa/fixtures/{browser,pages,services,data}.py` | Tests take `todo_page`, `pet_service`, `pet_factory` as fixtures |
| Elements | `src/qa/ui/elements.py` | Each element *holds* a Playwright `Locator`; one base, one level |
| Pages / containers / sections | `src/qa/pages/`, `src/qa/components/containers/<page>/` | A page composes its regions; a container builds elements from its own root; rows are sections behind a factory method |
| Services | `src/qa/api/base_service.py`, `src/qa/api/services/` | A service receives the worker's `httpx.Client` (base URL + credentials) |
| Models and schemas | `src/qa/models/`, `src/qa/schemas/` | pydantic models from the spec; JSON Schemas extracted by `openapi-tool` |
| Data factories | `src/qa/data/`, registered in `fixtures/data.py` | Create through a service; `yield`, then clean up — runs when the test fails |
| Waiting and assertions | `src/qa/assertions.py`, `src/qa/ui/wait.py` | `expect` (web-first, accepts elements) and a bounded `eventually` |
| Configuration | `src/qa/config.py`, `.env*` | Base URL, API domain, credentials, locale; secrets only from the environment |

No driver holder: pytest-playwright gives each test its own context and page, and xdist workers are processes.

## Non-negotiable rules

- Tests import only `qa.*` and `pytest`; ruff bans `playwright`, `httpx`, `requests` and `time.sleep` in tests.
- Pages, containers, sections, tests and factories never inherit from each other; only `Element`, `BaseService`
  and pydantic's `BaseModel` are extended (`R-INHERIT`).
- No sleeps outside `qa/ui/wait.py`; UI state through `expect`, values through `eventually`.
- Every created record is cleaned up in its factory fixture's teardown.

## Related skills

- **`sdet-framework-architect`** — the stack contract and the principles; **`page-builder`**, **`service-builder`**,
  **`test-script-writer`** — Python templates; **`test-code-review`**, **`refactor-test-suite`** — the standards
  and the audit; **`debug-failed-tests`** — when tests go red.
