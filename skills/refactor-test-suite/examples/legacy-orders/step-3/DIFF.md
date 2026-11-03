# Step 3 - structure (3a) and assertion quality (3b) (step-2 -> step-3)

3a retires `R-RAW-UI-IN-TEST` 3 -> 0, `R-SCOPE` 11 -> 0, `R-POSITION` 6 -> 0, `R-INHERIT` 1 -> 0 (22 -> 1).
3b retires `R-WEAK-ASSERT` 1 -> 0 and the manual finding "test without an assertion" (1 -> 0). The 3a count was
measured on a scratch copy of this folder with 3b's two assertion changes reverted (2026-11-03).

## 3a - pure refactor

- `pages/orders/orders.page.ts` - `OrdersPage` no longer extends anything. It is built from a screen root and a
  `ToastComponent`, and composes four containers, each constructed from `screen.locator(...)`: `OrderListContainer`
  (rows by order id -> `OrderRowSection` with `status`, `btnApprove`, `btnCancel`, `lnkNotes`),
  `OrderFormContainer`, `NotePanelContainer` (notes by text), `ConfirmDialogContainer`. No `page.locator` in any
  page file: the composition root passes the roots in.
- `components/toast.component.ts` (new) - the notification region; a toast is found by its text (`withText`),
  not `.first()`. Shared by any screen through composition, which is what `BasePage` inheritance was for.
- `pages/login/login.page.ts` (new) - the login form that `loginAs` used to drive with raw `page.fill` calls.
- `fixtures/fixtures.ts` - owns the only page-global lookups: `main.orders-screen`, `.toast`, `form.login`.
- `placeOrder` returns the id from the create response (it already waited on that response in step 2) and
  `lastOrderId()` (row 0) is deleted. "The order I just placed" is the one the server said it created; with
  parallel workers row 0 can be someone else's.
- `statusOf()` is deleted; tests assert `expect(row.status).toHaveText(...)`, a web-first assertion on the same cell
  with the same values.
- `lastNote()` (`.first()`) is replaced by `notes.item(text)`: the legacy read asserted that the newest note was
  listed first; the requirement (ORD-3) says the note is listed, not where. If a team's requirement includes the
  order, keep a `.first()` with an `audit-ignore R-POSITION: <reason>` instead.
- Tests: no `page` fixture, no `page.locator`; titles gain the requirement ID (`[ORD-n]`), no test removed.
- `pages/BasePage.ts`, `pages/OrdersPage.ts` deleted (replaced).

## 3b - changes what two tests prove (separate review)

| Test | Was | Now | Source |
|---|---|---|---|
| `[ORD-1] customer places an order` | `expect(orderId).toBeTruthy()` | `expect(row(orderId).status).toHaveText('New')` | ORD-1 in [README.md](../README.md) |
| `[ORD-4] customer opens the note editor` | no assertion (ended on a click) | `txtNote` is focused and empty | ORD-4 |

Each must fail when its expectation is broken (`can-fail`, from the `test-script-writer` scripts). That needs the
application and is not earned in this example.

## Verification a real step adds

The full step-2 checklist, plus the two can-fail runs for 3b. Not earned here.
