# Step 2 - isolation and synchronization (step-1 -> step-2)

Rules retired: `R-SHARED-STATE` 3 -> 0, `R-TEARDOWN` 3 -> 0, `R-RAW-HTTP-IN-TEST` 4 -> 0, `R-NO-SLEEP` 7 -> 0,
`R-FORCE` 2 -> 0. Incidentally `R-SCOPE` 13 -> 11. Audit total 43 -> 22; the ratchet prints
`OK: no rule count increased`.

## Isolation

- `services/orders.service.ts` (new) - `create`, `addNote`, `delete`; the API URL and status handling live here.
  `delete` treats 404 as success so teardown is idempotent. Recipe: Raw HTTP -> services.
- `fixtures/fixtures.ts` - `ordersService` and `orderFactory`. The factory records every id it creates and deletes
  them after `use()`, which runs when the test failed too. `track(id)` lets the one test that creates its order
  through the UI hand the id to the same owner. Recipe: Cleanup in the body -> factories with teardown.
- `tests/orders.spec.ts` - `describe.serial` and the module-level `orderId` are gone; each test creates the order
  it needs through the factory. The cancel test used to run on the order the approve test had approved; it now
  approves its own order first, so the precondition is the same and visible. The UI-created order is tracked;
  `orders.deleteOrder(orderId)` at the end of the body is removed, so is the page method (no caller left).
- `tests/order-notes.spec.ts` - the `beforeEach` seed and the two body deletes become `orderFactory.create` per
  test; the note seed goes through `ordersService.addNote`.
- `playwright.config.ts` - `workers: 1` replaced by `fullyParallel: true`: nothing is shared any more.

## Synchronization (every sleep named what it waited for; that is what it now waits on)

| Was | Waited for | Now |
|---|---|---|
| `loginAs`: `sleep(1000)` | the redirect after login | `page.waitForURL('**/orders')` |
| `BasePage.open`: `waitForTimeout(800)` "let the SPA render" | the screen's list to be attached | `OrdersPage.open` overrides and waits on `table.orders` |
| `placeOrder`: `waitForTimeout(1500)` "list to refresh" | the create request and the new row | `waitForResponse` registered before the click, then `row(id).waitFor()` |
| `approve` / `cancel`: `waitForTimeout(1000)` | the status cell to change | the tests poll it: `expect.poll(() => statusOf(id)).toBe(...)`, same expected value |
| `addNote`: `waitForTimeout(500)` | the save request | `waitForResponse` on `POST .../notes` |
| `orders.spec.ts`: `waitForTimeout(1000)` after cancel | the status cell | the same `expect.poll` |
| `utils/helpers.ts`: `sleep` | - | deleted, no caller left |

`force: true` on the confirm dialog's OK skipped a fade-in; the dialog is now awaited visible and clicked normally.
The toast close button needed no force either: Playwright's actionability checks wait for it.

`table` and `confirmDialog` became private getters so the row and dialog lookups have one definition; that is why
`R-SCOPE` fell by two without being targeted. The remaining `page.locator` calls in the pages are step 3.

## Assertions

Same six expectations. Three `expect(await ...).toBe/toContain(...)` reads became `expect.poll(...)` or a web-first
`toContainText` on the same locator with the same value, because the sleep that made the one-shot read safe is gone.

## Verification a real step adds

`--repeat-each=10` and parallel workers on the touched tests: removing sleeps is where hidden races surface. Not
earned here.
