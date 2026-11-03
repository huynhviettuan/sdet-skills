# Test Suite Audit - legacy-orders/step-0 - 2026-11-03

## Summary

A six-file Playwright/TypeScript suite for the Orders screen (6 tests, 2 roles) that passes on a shared staging
environment only because it runs serially with 3 retries. Every block rule but `R-FOCUS` fires. The biggest risk is
isolation: the three order tests are one chain through a module-level `orderId`, the note tests delete their order in
the test body, and credentials for both accounts are in `utils/helpers.ts`. Recommended first step: rotate the two
accounts, move URLs and credentials to configuration, and add a fixtures module so later steps have a composition root
to plug into.

## Baseline

Tests: 6 (pass: not run here, see below) | Duration: not measured | Parallel: no (`workers: 1`, `describe.serial`)

This example has no application behind it, so the baseline run the skill requires (retries off, 3-5 repeats) was not
performed. Only the audit column of the baseline is earned; a real refactor records the run first and never refactors
a red test.

## Automated findings (audit-suite.mjs)

`node ../../scripts/audit-suite.mjs step-0 --json audit-baseline.json` - 6 files scanned, 53 findings.

| Rule | Severity | Count | Hot spots |
|---|---|---:|---|
| R-NO-SLEEP | block | 7 | `pages/OrdersPage.ts` (4), `pages/BasePage.ts`, `tests/orders.spec.ts`, `utils/helpers.ts` (`sleep`) |
| R-RAW-UI-IN-TEST | block | 3 | `tests/order-notes.spec.ts` (2), `tests/orders.spec.ts` |
| R-RAW-HTTP-IN-TEST | block | 4 | `tests/order-notes.spec.ts` (seed in `beforeEach`, note seed, two deletes) |
| R-COMPOSITION | block | 6 | `new OrdersPage(page)` in every test |
| R-SHARED-STATE | block | 3 | module-level `let orderId` in both specs; `describe.serial` in `orders.spec.ts` |
| R-TEARDOWN | block | 3 | `request.delete` x2 and `orders.deleteOrder` as the last line of a test |
| R-SECRETS | block | 2 | `utils/helpers.ts` (`CUSTOMER`, `MANAGER` passwords) |
| R-FOCUS | block | 0 | - |
| R-SCOPE | warn | 13 | `pages/OrdersPage.ts` (11), `pages/BasePage.ts` (2) - every element is `this.page.locator(...)` |
| R-POSITION | warn | 6 | `.first()` on toasts and notes, `.nth(0)` for "the order just placed" |
| R-XPATH-ABS | warn | 0 | - |
| R-FORCE | warn | 2 | `click({ force: true })` on the toast close and the confirm dialog |
| R-WEAK-ASSERT | warn | 1 | `expect(orderId).toBeTruthy()` |
| R-HARDCODED-URL | warn | 1 | `pages/BasePage.ts` (`API_URL`/`BASE_URL` in `utils/` are not flagged: framework role) |
| R-RETRY-MASK | warn | 1 | `playwright.config.ts` `retries: 3` |
| R-INHERIT | warn | 1 | `OrdersPage extends BasePage` |

Findings per file: `pages/OrdersPage.ts` 19, `tests/order-notes.spec.ts` 13, `tests/orders.spec.ts` 10,
`pages/BasePage.ts` 7, `utils/helpers.ts` 3, `playwright.config.ts` 1.

Findings read, not only counted:

- `let orderId` + `beforeEach` in `order-notes.spec.ts` is per-test in practice (Playwright runs `beforeEach` before
  each test in the worker), so the hazard is smaller than in `orders.spec.ts`, where the value is the chain. The fix
  is the same (a factory fixture), so it is not suppressed.
- The two `R-HARDCODED-URL` constants in `utils/helpers.ts` are not counted (framework role) but are the same
  problem; step 1 moves them with the one that is counted.

## Manual findings

| Concern | Evidence | Impact |
|---|---|---|
| No composition root | every test calls `login(page, ...)` and `new OrdersPage(page)` | credentials, teardown and roles cannot be added centrally |
| Giant page object | `OrdersPage` covers the list, the new-order form, the note panel, manager actions and the confirm dialog | every screen change touches one file; no element is scoped |
| Inheritance for sharing | `OrdersPage extends BasePage` for `open()` and toast helpers | toast behaviour cannot be reused by a second screen without inheriting the rest |
| Duplicated locators | `.toast` in `BasePage` and `orders.spec.ts`; `.note-list li` in `OrdersPage` and `order-notes.spec.ts`; `.confirm-dialog button.ok` twice in `OrdersPage`; login fields in `utils/helpers.ts` | one UI change breaks several places, each discovered by a separate failure |
| Test without an assertion | `customer opens the note editor` ends on a click | a passing test that proves nothing |
| Chained tests | `orders.spec.ts` runs place -> approve -> cancel on one order | a failure in test 1 fails all three; cannot run in parallel |
| Cleanup depends on the assertion passing | deletes are the last line of each test | a failed run leaks orders into the shared list and the next run reads the wrong "first row" |
| Position stands in for identity | `lastOrderId()` reads row 0 | a parallel worker's order becomes "mine" |
| No link to test cases | titles only; no ID | coverage cannot be traced |

## Plan

See [PLAN.md](PLAN.md).

## Risks / open questions

- The expected values for the two assertions that change in step 3b (`New` after placing; empty, focused editor)
  come from the example's requirement table in [README.md](README.md). In a real suite they come from the test
  case or the acceptance criteria; if none exist, the gap is raised, not invented.
- `lastNote()` assumes newest-first ordering. Nothing in the requirements says so; step 3 finds the note by its text
  and records the assumption dropped.
