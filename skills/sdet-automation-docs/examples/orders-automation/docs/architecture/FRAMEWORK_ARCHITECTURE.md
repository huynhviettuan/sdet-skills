# Framework Architecture — Orders

Snapshot: 2026-11-03. The framework design is owned by
[`sdet-framework-architect`](../../../../../sdet-framework-architect/SKILL.md) (five-layer blueprint,
non-negotiable rules); this file records how Orders applies it and does not restate it.

## Stack

Assumption (example), OQ-A-001: **pytest + httpx** from the
[`init-pytest-playwright-framework`](../../../../../init-pytest-playwright-framework/template/README.md) scaffold,
API layers only. Reasons: the product is API-only; the only running suite
(`skills/security-testing/examples/vuln-api/`) is pytest; the matrix loader `authz_matrix.load_matrix` is Python;
the template's `pyproject.toml` already registers the `P0`, `P1`, `smoke`, `case(id)`, `requirement(id)` and
`sentinel` markers this package uses, and runs `--strict-markers`. The Playwright/TypeScript scaffold
([`playwright.config.ts`](../../../../../init-playwright-framework/template/playwright.config.ts), its `api` project)
is the recorded alternative. The gate scripts are the same file in both templates (`audit-suite.mjs`,
`can-fail.mjs`, `guard-hooks.mjs`; `check-repo.mjs` proves they match).

## Layers used

| Blueprint layer | Orders | Where |
|---|---|---|
| Element / container | not used (no UI) | — |
| Service / API | one service per resource: `AuthService` (`/auth/login`), `OrdersService` (`/orders`, `/orders/{id}`, the three action endpoints), `AdminService` (`/admin/users`, `/_audit`) | `src/qa/api/services/` on `base_service.py` |
| Composition root | pytest fixtures: config, environment guard, per-actor tokens, services, `order_factory` | `conftest.py`, `src/qa/fixtures/` |
| Driver / session holder | one httpx client per worker process (pytest-xdist is process-parallel, so a per-process holder is safe) | `src/qa/fixtures/services.py` |

Dependency direction: tests -> fixtures -> services -> httpx; never upward. A test never imports httpx (the
template's ruff rule `R-RAW-HTTP-IN-TEST` bans it in tests).

## Fixtures

| Fixture | Scope | Setup | Teardown |
|---|---|---|---|
| `target` | session | resolves `BASE_URL`; refuses a host outside the allow-list (exit before any request) | none |
| `actor_tokens` | worker (session per xdist process) | logs in the six example users once via `POST /auth/login`; maps them to the seven matrix actors (anonymous has none) like `USER_FOR_ACTOR` in the reference `conftest.py` | none: tokens are stateless and expire (ADR-004) |
| `orders_service`, `auth_service`, `admin_service` | test | built on the worker client | none |
| `order_factory` | test | creates orders through `POST /orders` as the owner, tags the note, records every id | deletes every id it created as `carol` (or `root` for tenant-b orders), then confirms with an admin read that each is gone; idempotent (a 404 on delete is fine, a record still readable is a teardown failure) |
| `transitioned_order` | test | an order from `order_factory`, moved to `paid` or `shipped` through the action endpoints | via `order_factory` |

Teardown lives after `yield` in the fixture, never in the test body (template `src/qa/fixtures/data.py` docstring;
skill rule "whoever creates test data owns its teardown"). Judging teardown by the record rather than the delete's
status follows the repo's Petstore fix (commit 126ca01, "Teardown judged by the record").

The reference suite's `api` fixture calls `POST /_reset` before each test. The product suite does not: the hook is
out of the product's scope (`01_SCOPE.md`) and absent from a product build (DEPLOYMENT.md). Isolation comes from
the factory and from assertions scoped to the test's own records.

## Guard rails for agents and people

| Guard | What it stops | Source |
|---|---|---|
| `.claude/guard.json` + `guard-hooks.mjs` (`pre-bash`, `pre-edit`, `post-edit`) | merge or push to `main`, a production host in a command, editing an existing assertion line, a fixed sleep; runs `audit-suite` after a write | template `.claude/settings.json`, `scripts/guard-hooks.mjs` |
| `guard.json` `productionHosts` | set to the product host once one exists (empty today: only Local exists) | template `.claude/guard.json` |
| Runtime environment guard | a writing run against any host not Local or allow-listed Staging | `target` fixture; pattern of `vuln-api-load/load.py` (refuses anything but `127.0.0.1`, `localhost`, `*.localhost`, `*.test`) |

## Changes the scaffold needs

- Register an `assumption` marker in `pyproject.toml` (the template does not have one; `--strict-markers` would fail
  on it).
- Keep the template's dependency list free of a rerun plugin; adding one needs an ADR
  ([FLAKY_TEST_POLICY.md](../reliability/FLAKY_TEST_POLICY.md)).
