# Answer key — the 8 planted violations

Line numbers are in `before/`; "fix (after)" names where the corrected code is in `after/`. "Found by" states
what actually happened on 2026-11-03 (`audit-suite.mjs before` → 7 findings, 5 rules; `after` → 0), not what was
intended: a violation the tool did not report is listed under *reviewer*.

| # | file:line (before) | rule | found by | fix (after) |
|---|---|---|---|---|
| 1 | `src/pages/orders/orders.page.ts:44` — `waitForTimeout(500)` after Save | R-NO-SLEEP (block) / S-WAIT-SIGNAL | audit-suite (`R-NO-SLEEP` 1) | `orders.page.ts:42` waits for the note editor to be hidden; the test asserts `toHaveText` web-first |
| 2 | `tests/orders.spec.ts:18`, `:30`, `:49` — `deleteOrder` as the last line of each test body (and the create + precondition copied at `:10-12`, `:24-26`, `:41-43`) | R-TEARDOWN (block) / S-DRY-SETUP | audit-suite (`R-TEARDOWN` 3) | `src/fixtures/fixtures.ts:19-28` — `createOrder` fixture records what it created and deletes after `use`; specs never delete |
| 3 | `tests/orders.spec.ts:47-48` — TC-ORD-003 asserts `Cancelled`, the app's current wrong behaviour | checklist § 8 "changed expectation, case unchanged" (block) / S-KISS-ASSERT | reviewer | `tests/orders.spec.ts:40-41` — asserts the case: Cancel disabled, status stays `Shipped`; red until the defect closes |
| 4 | `src/pages/orders/orders.page.ts:19` — `this.page.locator('[data-testid="order-row"]')` page-global inside the page object | R-SCOPE (warn) | audit-suite (`R-SCOPE` 1) | `orders.page.ts:9`, `:19` — root comes from the fixture (`page.getByTestId('orders-table')`), rows resolve from `this.root` |
| 5 | `src/pages/orders/orders.page.ts:21` — `.first()` on a `hasText` substring filter (`ORD-10` also matches `ORD-100`) | R-POSITION (warn; review: block, wrong verdict) | audit-suite (`R-POSITION` 1) | `orders.page.ts:16-20` — `filter({ has: numberCell })` with `getByText(number, { exact: true })`; no `.first()` |
| 6 | `tests/orders.spec.ts:17` — `expect(await ...textContent()).toBeTruthy()` | R-WEAK-ASSERT (warn; review: block, checklist § 2 vacuous) / S-KISS-ASSERT, S-TS-POLL | audit-suite (`R-WEAK-ASSERT` 1) | `tests/orders.spec.ts:15` — `await expect(lblNote).toHaveText('Leave at reception')` |
| 7 | `tests/orders.spec.ts:21` (title) vs `:29` (body) — "manager ships an order and the row shows Shipped" asserts only that the status control is enabled | S-KISS-NAME (warn) / checklist § 2 (expected result not asserted, block) | reviewer | `tests/orders.spec.ts:23-25` — `setStatus(..., 'shipped')` then `lblStatus` has text `Shipped` |
| 8 | `src/pages/orders/orders.page.ts:7`, `:13-15` — `open(options: OpenOptions = {})` with a `filter` option no test passes | S-YAGNI-ONE-CALLER (warn) | reviewer | `orders.page.ts:11-13` — `open()` with no options; the type is deleted |

Mechanically found: 5 of 8 (rows 1, 2, 4, 5, 6) — 7 findings because row 2 has three locations. Reviewer only:
3 of 8 (rows 3, 7, 8). Severity in the review: 6 block (1, 2, 3, 5, 6, 7), 2 warn (4, 8). The tool's severity is the
rule's; rows 5, 6 and 7 are raised to block by consequence (`review-workflow.md` § 4), which is a reviewer's call a
script cannot make.

Not planted, and why: an assertion-free test and a duplicated helper were considered as "mechanical" plants and
rejected — `audit-suite.mjs` has no rule for either (it counts the patterns listed in its `RULES` table and
nothing else), so they would have been reviewer findings, and the brief for this example wanted three of those.
Row 7 is the nearest thing to an assertion-free test the tool cannot see: the assertion exists, it just proves
something other than the case.
