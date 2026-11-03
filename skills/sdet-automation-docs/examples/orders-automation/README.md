# Orders automation — a worked `sdet-automation-docs` package (example)

How automation for **Orders**, the plugin's shared example product (a multi-tenant orders API), is organized, run
and governed, written the way [`sdet-automation-docs`](../../SKILL.md) prescribes. It is the automation half of the
product package in [`project-docs/examples/orders-docs`](../../../project-docs/examples/orders-docs/README.md): it
reads that package's FR/BR/AC IDs and its 51-cell permission matrix and adds nothing to product behaviour.

## Objective

Protect against the risks that matter for Orders: a caller reading or changing another tenant's or customer's order
(BOLA), lockout and token checks failing, and an order moving outside its lifecycle. Order of work:
[04_RISK_BASED_TESTING.md](docs/strategy/04_RISK_BASED_TESTING.md).

## Application under test

| | |
|---|---|
| Name | Orders (API only; no UI, `01_SCOPE.md`) |
| Environments | Local `http://127.0.0.1:8765`; Staging described, no host (OQ-A-006); Production never |
| Users | six example users in two tenants (`specs/seed-data.json`) |
| Running system today | the reference server `skills/security-testing/examples/vuln-api/app.py` (secure mode), which implements auth, read/edit/delete, admin, audit, headers, CORS; not pay/ship/cancel |

## Technology

pytest + httpx from `init-pytest-playwright-framework` (Assumption (example), OQ-A-001); gates from the shared
scripts `audit-suite.mjs`, `can-fail.mjs`, `guard-hooks.mjs`; matrix verification with
`skills/security-testing/scripts/authz_matrix.py`; traceability with `skills/test-case-design/scripts/check_cases.py`.

## Files

The skill's minimum set before writing automation code (`references/document-package.md`), plus the four documents
the Orders risks call for (risk classification, flaky policy, traceability, Definition of Ready).

| Minimum set | File |
|---|---|
| README.md | this file |
| AGENTS.md + CLAUDE.md | [AGENTS.md](AGENTS.md), [CLAUDE.md](CLAUDE.md) (one line, `@AGENTS.md`) |
| AUTOMATION_OVERVIEW.md | [docs/strategy/00_AUTOMATION_OVERVIEW.md](docs/strategy/00_AUTOMATION_OVERVIEW.md) |
| AUTOMATION_STRATEGY.md | [docs/strategy/01_AUTOMATION_STRATEGY.md](docs/strategy/01_AUTOMATION_STRATEGY.md) (layer selection, pyramid, decision matrix, reconciliation with the product TEST_STRATEGY) |
| SCOPE_AND_COVERAGE.md | [docs/strategy/02_SCOPE_AND_COVERAGE.md](docs/strategy/02_SCOPE_AND_COVERAGE.md) |
| FRAMEWORK_ARCHITECTURE.md | [docs/architecture/FRAMEWORK_ARCHITECTURE.md](docs/architecture/FRAMEWORK_ARCHITECTURE.md) |
| LOCATOR_STRATEGY.md | [docs/standards/LOCATOR_STRATEGY.md](docs/standards/LOCATOR_STRATEGY.md) |
| WAIT_STRATEGY.md | [docs/standards/WAIT_STRATEGY.md](docs/standards/WAIT_STRATEGY.md) |
| TEST_DATA_STRATEGY.md | [docs/data/TEST_DATA_STRATEGY.md](docs/data/TEST_DATA_STRATEGY.md) (accounts, factories, isolation, parallelism merged in) |
| CI_CD_STRATEGY.md | [docs/cicd/CI_CD_STRATEGY.md](docs/cicd/CI_CD_STRATEGY.md) (stages and quality gates) |
| DEFINITION_OF_DONE.md | [docs/quality/DEFINITION_OF_DONE.md](docs/quality/DEFINITION_OF_DONE.md) |
| OPEN_QUESTIONS.md | [docs/quality/OPEN_QUESTIONS.md](docs/quality/OPEN_QUESTIONS.md) (`OQ-A-001..011`) |

| Added for Orders | File |
|---|---|
| RISK_BASED_TESTING.md | [docs/strategy/04_RISK_BASED_TESTING.md](docs/strategy/04_RISK_BASED_TESTING.md) |
| FLAKY_TEST_POLICY.md (+ retry policy) | [docs/reliability/FLAKY_TEST_POLICY.md](docs/reliability/FLAKY_TEST_POLICY.md) |
| TRACEABILITY_MATRIX.md | [docs/quality/TRACEABILITY_MATRIX.md](docs/quality/TRACEABILITY_MATRIX.md) |
| DEFINITION_OF_READY.md | [docs/quality/DEFINITION_OF_READY.md](docs/quality/DEFINITION_OF_READY.md) |

In the product repo these would sit under `docs/automation/`, and the OQ-A rows and matrix columns would be appended
to the product's own `OPEN_QUESTIONS.md` and `TRACEABILITY_MATRIX.md` (`document-package.md`, "Full structure"). As
a separate example they live here, prefixed `OQ-A-` so they cannot collide with the product's `OQ-001..006`.

## What the example shows

- A risk table naming real IDs: P0 = authorization/BOLA (AZ-001..051), authentication and lockout (AC-AUTH-001..007),
  lifecycle money paths (AC-ORD-030..036), mass assignment, delete, the password-free user list.
- Layer per requirement kind: unit for the four pure formulas, API for every AC, the 51 cells as one data-driven
  test checked by `authz_matrix.py verify`, a controllable clock for the 24 h and 60 s windows (blocked until the
  product provides one), no UI because there is none.
- Data that cannot collide: seeded read-only users, a factory that owns create and teardown, tenant pairs, a
  generated username for lockout so no seed user is ever locked, two serial groups with written reasons.
- Verdicts kept apart (passed, failed, flaky, inconclusive, blocked, quarantined), zero retries, a sentinel, and
  quarantine with an owner and an expiry.
- CI stages and merge gates modelled on this repository's real workflows, with the differences stated.
- A measured coverage baseline: the 51-cell matrix verified against today's suite gives 23 verified, 28 findings.

## Grounded vs assumed

| Statement | Grounded in |
|---|---|
| IDs, counts (7 FR, 17 BR, 44 AC, 51 AZ), basis of each AC | `skills/project-docs/examples/orders-docs/REQUIREMENTS_CATALOGUE.md` |
| Actors and expected statuses per cell | `.../orders-docs/docs/business/ROLES_PERMISSIONS.md` |
| Levels, mandatory negatives, boundaries, sentinel, controllable clock, CI order | `.../orders-docs/docs/quality/TEST_STRATEGY.md` |
| No UI, no tenant administration, test hooks out of scope | `.../orders-docs/docs/product/01_SCOPE.md` |
| Environments and the "never Production" rule | `.../orders-docs/docs/delivery/ENVIRONMENTS.md` |
| Lockout counts unknown usernames; the window formulas | `.../orders-docs/docs/architecture/DATA_MODEL.md` |
| What the reference suite covers, test names, the `/_reset` hook, the sentinel | `skills/security-testing/examples/vuln-api/test_security.py`, `conftest.py`, `README.md` |
| Each security test red for its flaw; 23 cells verified | `skills/security-testing/scripts/selftest.py` (CI `skill-scripts`) |
| Fixture/teardown rules, layers, process-parallel holder | `skills/sdet-framework-architect/SKILL.md` |
| Markers, `R-RAW-HTTP-IN-TEST`, factory teardown after `yield` | `skills/init-pytest-playwright-framework/template/pyproject.toml`, `src/qa/fixtures/data.py` |
| Guard hooks, `audit-suite --fail-on block`, `can-fail` exit codes, the `retries: CI ? 1 : 0` default | `skills/init-playwright-framework/template/.claude/guard.json`, `.claude/settings.json`, `scripts/`, `playwright.config.ts` |
| Repeat x3, 4 workers, 0 retries, sentinel must fail | `.github/workflows/nightly-examples.yml`, `skills/test-script-writer/examples/playwright-ts/run-examples.sh` |
| Load run is informational, Local-only host guard | `skills/performance-testing/examples/vuln-api-load/README.md` |

Assumption (example), each with an OQ-A row: the stack (001), the clock mechanism (002), accounts per worker (003),
gating of assumption cases (004), team (005), release cadence and Staging (006), quarantine limits (007), UI smoke
(008), PR budget and workers (009), signing key outside Local (010), provoking a 500 in a product build (011).
Also assumed without a separate OQ, and labelled where they appear: triage within one working day, token re-login
after 50 minutes, timeouts, artifact retention, the flaky-rate target.

No product test file exists: every `TC-` in the traceability matrix is planned. Statements about coverage today
refer to the reference suite only.

## Checks run

From the repository root, 2026-11-03:

```bash
python -m pytest skills/security-testing/examples/vuln-api -q -p no:cacheprovider --junitxml=<scratch>/secure.xml
python skills/security-testing/scripts/authz_matrix.py verify skills/security-testing/examples/vuln-api/ROLES_PERMISSIONS.md <scratch>/secure.xml
python skills/security-testing/scripts/authz_matrix.py verify skills/project-docs/examples/orders-docs/docs/business/ROLES_PERMISSIONS.md <scratch>/secure.xml
node scripts/check-repo.mjs
```

```text
35 passed, 1 xfailed in 1.23s
total: 23 cells, 23 verified, 0 findings
total: 51 cells, 23 verified, 28 findings
```

Ran once on 2026-11-03. The first two are re-earned by CI's `skill-scripts` job (security self-test); the third is
this package's coverage baseline and nothing re-runs it. `check-repo.mjs` (fences, links, anchors) reported no
problem under `skills/sdet-automation-docs/examples/orders-automation/`; CI's `Repo consistency` job re-runs it.

## Honest notes

- The automation brief for this example asked for one UI smoke; the product has no UI, so there is none (OQ-A-008).
- Choosing pytest over the Playwright/TypeScript scaffold is an assumption; the gates are identical either way.
- `skills/project-knowledge-base/examples/orders-kb/parse-probe-cases.md` uses `TC-ORD-001` and `TC-ORD-002` for
  two probe cases against a different set of sources and IDs (`FR-ORD-02`); they are not these cases.
- Example values only: tenants, usernames and the `example.test` origin are synthetic; no password or key appears
  here.
