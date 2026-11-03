# Step 1 - safety and foundations (step-0 -> step-1)

Rules retired: `R-SECRETS` 2 -> 0, `R-HARDCODED-URL` 1 -> 0, `R-RETRY-MASK` 1 -> 0, `R-COMPOSITION` 6 -> 0.
Audit total 53 -> 43; `--baseline ../audit-baseline.json` prints `OK: no rule count increased`.

## What changed and why

- `config/env.ts` (new) - `BASE_URL`, `API_URL` and both accounts are read from environment variables through one
  `required()` helper that throws on a missing variable, so a misconfigured CI job fails at startup instead of
  logging in as nobody. Recipe: Secrets and URLs -> configuration. The two staging accounts whose passwords were
  in `utils/helpers.ts` are rotated as part of this step; removing them from the code does not remove them from
  history.
- `fixtures/fixtures.ts` (new) - the composition root. `ordersPage` builds the (still monolithic) `OrdersPage`;
  `loginAs(role)` is the old `login()` helper moved here, now taking a role and reading the account from `env`.
  The sleep inside it is kept on purpose: this step is about who builds what, step 2 is about waiting. `expect`
  is re-exported so a spec imports nothing from `@playwright/test`.
- `playwright.config.ts` - `retries: 3` becomes `process.env.CI ? 1 : 0` (at most one retry during the migration,
  passed-on-retry reported as flaky); `baseURL` comes from `env`. `workers: 1` stays until the shared state goes.
- `utils/helpers.ts` - credentials, URLs and `login()` removed (their last callers are gone); `sleep` and
  `uniqueNote` stay.
- `pages/BasePage.ts` - `open(path)` resolves against `baseURL` instead of concatenating the literal.
- `tests/orders.spec.ts`, `tests/order-notes.spec.ts` - import `test`/`expect` from `../fixtures/fixtures`; the
  three `new OrdersPage(page)` per file become the `ordersPage` fixture; `login(page, CUSTOMER)` becomes
  `loginAs('customer')`; the API seed uses `env.apiUrl` (still raw HTTP: that is step 2). Every step, every
  assertion and every expected value is unchanged.

## What did not change

Sleeps, the serial chain, the module-level `orderId`, deletes in test bodies, raw `page.locator` in tests, the
god page object. Their counts are identical to the baseline, which is what the ratchet checks.

## Verification a real step adds

Same 6 tests, green with retries off, repeated and in parallel (still `workers: 1` here), duration not worse. Not
earned in this example: no application.
