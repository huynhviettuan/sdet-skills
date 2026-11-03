# Review — orders screen, `before/` — 2026-11-03

The review that `/review-tests before/` produces for this example, in the format of
[`review-workflow.md`](../../references/review-workflow.md) § 5, after the checklist in
[`review-checklist.md`](../../references/review-checklist.md). The oracle for "does the test assert the right
thing" is the case list in [`README.md`](README.md).

**Checks:** tsc --noEmit 0 errors (strict, in a scratch project; see README) | eslint - not run (no config) |
audit `node skills/refactor-test-suite/scripts/audit-suite.mjs before` 2026-11-03: 4 files scanned, 7 findings
(block 4: R-NO-SLEEP 1, R-TEARDOWN 3; warn 3: R-SCOPE 1, R-POSITION 1, R-WEAK-ASSERT 1) | tests - not run
(no app)
**Verdict:** Request changes (6 block, 2 warn)

Findings 1, 2, 4, 5 and 6 are the audit's; the review adds the consequence and the fix and does not re-derive
them. Findings 3, 7 and 8 need a reader with the case in hand: a pattern matcher cannot see them. Each finding is one
cause; a cause repeated in several places is one finding with several locations. Findings 5, 6 and 7 carry a `warn`
rule but are **raised to block** by consequence ([`review-workflow.md`](../../references/review-workflow.md) § 4):
each can make a test pass while the product is broken, the one blocking class in `SKILL.md`. Numbers follow the
answer key, so the Block list is not in numeric order.

### Block

1. `src/pages/orders/orders.page.ts:44` — `await this.page.waitForTimeout(500)` after Save: on a slow run the row
   has not re-rendered after 500 ms and the next read sees the old note (flaky), on a fast run every test pays
   500 ms for nothing. **R-NO-SLEEP / S-WAIT-SIGNAL** (block). *Found by audit-suite.* Fix: wait on the signal the
   Save produces — the editor closes: `await txtNote.waitFor({ state: 'hidden' })`; the test then asserts the note
   web-first (`toHaveText`), which retries on its own.

2. `tests/orders.spec.ts:18`, `:30`, `:49` — `await ordersService.deleteOrder(order.id)` is the last line of each
   test body, so it runs only when every assertion before it passed: a failing test leaves its order behind, and
   the next run's `filter({ hasText })` on the same number finds two rows. The same cause puts the create +
   precondition block in all three tests (`:10-12`, `:24-26`, `:41-43`): the data lifecycle is owned by nobody.
   **R-TEARDOWN** (block), **S-DRY-SETUP** for the three copies. *Found by audit-suite (3 locations).* Fix: a
   `createOrder` fixture that records what it created and deletes it after `use`, whatever the verdict
   (`after/src/fixtures/fixtures.ts:19-28`); the tests call `createOrder('new')` and never delete.

3. `tests/orders.spec.ts:47-48` — the test is titled from TC-ORD-003 ("customer cannot cancel a shipped order")
   but asserts `toHaveText(StatusLabel.cancelled)`: it passes while the app is wrong and will fail the day the
   defect (ticket 4471) is fixed. A test whose expectation was changed to match the product is a changed
   expectation without a changed case. **Checklist [§ 8](../../references/review-checklist.md#8-documentation-and-traceability)
   "A changed expectation has its case / AC changed too"** (block), with **S-KISS-ASSERT** for the value. *Needs a
   reviewer:* the audit sees a well-formed web-first assertion; only the case says the value is the wrong one.
   Fix: assert what the case states — the Cancel control is disabled and the status stays Shipped
   (`after/tests/orders.spec.ts:40-41`) — and let the test be red until 4471 closes; the suite is then reporting
   the defect. If the team wants the run green meanwhile, `test.fixme('[TC-ORD-003] ... (blocked by ticket
   4471)', ...)` keeps the case visible in the report (S-TS-TAGS); a passing assertion of the bug does not.

5. `src/pages/orders/orders.page.ts:21` — `.first()` on `filter({ hasText: number })`: `hasText` is a substring
   match, so for order `ORD-10` the rows `ORD-10` and `ORD-100` both match and `.first()` returns whichever the
   DOM lists first; the test then edits or reads the wrong order and passes. **R-POSITION** (rule: warn; raised to
   block: wrong verdict). *Found by audit-suite.* Fix: match the
   business key exactly — `filter({ has: numberCell })` with `getByText(number, { exact: true })` on the
   `order-number` cell (`after/src/pages/orders/orders.page.ts:16-20`); an ambiguous match then fails strict
   mode instead of picking one.

6. `tests/orders.spec.ts:17` — `expect(await lblNote.textContent()).toBeTruthy()` passes for any non-empty note,
   including the previous one, and reads the text once instead of retrying. **R-WEAK-ASSERT / S-KISS-ASSERT**
   (rule: warn; raised to block: checklist § 2 "no assertion that passes vacuously"), **S-TS-POLL** for the
   snapshot read. *Found by audit-suite.* Fix:
   `await expect(ordersPage.lblNote(order.number)).toHaveText('Leave at reception')`
   (`after/tests/orders.spec.ts:15`).

7. `tests/orders.spec.ts:21` — the title says "manager ships an order and the row shows Shipped"; the body
   (`:29`) asserts that the status control is enabled and never ships. A reader of the report believes TC-ORD-002
   is covered; a regression in shipping passes. **S-KISS-NAME** (warn), and the case's expected result has no
   assertion (checklist [§ 2](../../references/review-checklist.md#2-correctness-can-this-test-lie), S-KISS-ASSERT,
   block: the wrong verdict decides the severity, not the naming rule).
   *Needs a reviewer:* the assertion is well-formed and the title is well-formed; only reading both against the
   case shows they do not match. Fix: perform the case's Act (`setStatus(order.number, 'shipped')`) and assert
   its expected result (`lblStatus` has text `Shipped`) — `after/tests/orders.spec.ts:23-25`; or, if the enabled
   control is what the author meant to prove, retitle it and write TC-ORD-002 as its own test.

### Warn

4. `src/pages/orders/orders.page.ts:19` — `this.page.locator('[data-testid="order-row"]')` resolves rows against
   the whole document, so any other list that reuses the `order-row` test id (a sidebar of recent orders, a
   modal) is matched too, and the page object cannot be reused inside a dialog. **R-SCOPE** (warn). *Found by
   audit-suite.* Fix: the page takes its root from the fixture (`new OrdersPage(page.getByTestId('orders-table'))`)
   and resolves every element from `this.root` (`after/src/pages/orders/orders.page.ts:9`, `:19`).

8. `src/pages/orders/orders.page.ts:7`, `:13-15` — `open(options: OpenOptions = {})` builds a `?status=` query
   from `options.filter`, which no test passes; the only caller is `open()`. The page carries a query-string
   builder for a case that does not exist, and the next reader looks for the test that filters.
   **S-YAGNI-ONE-CALLER** (warn). *Needs a reviewer:* no tool knows how many callers an option has. Fix: delete
   the type and the parameter (`after/src/pages/orders/orders.page.ts:11-13`); it comes back with the first test
   that filters.

### Nit

None kept. `// let the row re-render` (`orders.page.ts:44`) restates the sleep it sits on (S-KISS-COMMENT) and
disappears with finding 1.

### Good

- The service sends and parses and leaves "success" to the caller (S-KISS-SERVICE); the precondition is
  asserted with a message (`'precondition: createOrder'`, S-KISS-ASSERT).
- Routes, endpoints and status labels are `as const` objects (S-DRY-ROUTES, S-DRY-COPY, S-TS-CONST); the role
  is set once per `describe` with `test.use` (S-TS-USE); every test carries its case id, tag and requirement
  annotation (S-TS-TAGS).
- Tests take `ordersPage` and `ordersService` from the fixtures module; no `@playwright/test` import in the spec
  (S-TS-FIXTURES).

### Not flagged on purpose

- `StatusLabel` and `Routes` live in the page file, not a `constants/` file: one screen, one consumer, one
  source of truth already; a constants file arrives with the second screen that needs them (S-YAGNI-RULE3).
- Three tests that each create an order and open the page look alike; the sequence is left readable
  (S-DRY-NOT-SENTENCES). The repeated *create + precondition* block is finding 2, because its cause is
  ownership, not wording.
- `expect` is re-exported from `@playwright/test` in the fixtures module: that is where the rule allows it.

## Checklist result (consolidated)

| Section | Result |
|---|---|
| 0 Scope and intent | pass; every test names a case (TC-ORD-001..003) |
| 1 Deterministic checks | tsc 0 errors; audit run (7 findings, 4 block); eslint and the test run not possible without a config and an app |
| 2 Correctness | fail: findings 1 (sleep), 2 (teardown), 3 (asserts the defect), 6 (weak), 7 (expected result never asserted) |
| 3 Architecture | fixtures only, no raw UI/HTTP in tests: pass; finding 4 (scope) and 5 (position) |
| 4 DRY | finding 2 (setup copied three times, same cause as teardown); copy, routes, locators in one place: pass |
| 5 KISS | finding 7 (name); AAA visible in every test, page methods are user verbs: pass |
| 5b YAGNI | finding 8 (option with no caller); no dead code, no skips |
| 6 Page objects | finding 4 (root), 5 (business key), 1 (fixed wait inside a page method) |
| 7 Services | pass (one method per operation, `@operationId`, no asserting) |
| 8 Documentation and traceability | finding 3 (expectation changed, case not) |

## Verdict

Request changes. Six findings can produce a wrong verdict today: the sleep (1) makes TC-ORD-001 flaky in both
directions, the body teardown (2) leaks an order on every failure and makes the next run ambiguous, TC-ORD-003 (3)
is green because it asserts the defect it was written to catch, the `.first()` (5) silently picks between `ORD-10`
and `ORD-100`, the `toBeTruthy()` (6) is satisfied by any note including the old one, and the shipping test (7)
never ships. Two more cost the next reader or the next test: a page-global row lookup (4) and an `open()` option
nobody passes (8). The audit found findings 1, 2, 4, 5 and 6 mechanically (7 locations, 5 rules); 3, 7 and 8 were only
visible with the test cases open beside the code, which is the half of a review a script cannot do.
