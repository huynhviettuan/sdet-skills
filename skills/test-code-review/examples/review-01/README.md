# review-01 — a worked review of an Orders spec

What `/review-tests` (the `test-code-review` skill) produces on a small Playwright/TypeScript change, and what
half of its findings a script can never produce. `before/` is a page object, a service, a fixtures module and a
spec for an "Orders" screen with **8 deliberate violations**; `review.md` is the review in the skill's format;
`after/` is the same four files with all 8 fixed; `VIOLATIONS.md` is the answer key.

The exercise: read `before/` with the cases below open, write your own review, then compare with `review.md` and
the key. Nothing in `before/` is marked.

```text
before/   src/services/orders.service.ts   src/pages/orders/orders.page.ts   src/fixtures/fixtures.ts   tests/orders.spec.ts
after/    the same four files, fixed
```

## The screen and the cases (the oracle)

An orders table (`data-testid="orders-table"`) with one row per order (`order-row`), each showing the order number
(`order-number`), its status (`status`) and note (`note`), a "Note" textbox with a "Save" button, a "Status"
combobox and a "Cancel order" button. The role comes from an `x-role` request header (`manager` or `customer`);
the API is `POST /api/orders` (201, the order) and `DELETE /api/orders/{id}`. Example values only; there is no
real app behind this folder.

| Case | Role | Act | Expected result |
|---|---|---|---|
| TC-ORD-001 | manager | save a note on an order | the row shows the saved note |
| TC-ORD-002 | manager | change the status to Shipped | the row shows `Shipped` |
| TC-ORD-003 | customer | try to cancel a shipped order | Cancel is disabled; the status stays `Shipped` |

Known defect (example ticket 4471, open): the app currently accepts a customer's cancel on a shipped order.

## What the example shows

- Which violations `audit-suite.mjs` finds mechanically (5 of 8: a sleep, cleanup in the test body, a page-global
  lookup, `.first()`, `toBeTruthy()`) and which need a reader with the test cases open (3 of 8: a test that
  asserts the defect, a title that promises what the body does not prove, an option nobody passes).
- A review that does not repeat the tool's output but adds the consequence and the fix per finding, cites the
  rule ID, states severity by consequence, and says what it did not flag and why.
- The `after/` shape: root from the fixture, business-key rows, teardown owned by the creating fixture, web-first
  assertions, and the known defect left red rather than asserted.

## Verify

From the repo root (`D:/sdet-skills`), ran once on 2026-11-03:

```bash
node skills/refactor-test-suite/scripts/audit-suite.mjs skills/test-code-review/examples/review-01/before --json <scratch>/before.json
# audit: 4 files scanned | 7 findings: R-NO-SLEEP 1 (block), R-TEARDOWN 3 (block), R-SCOPE 1, R-POSITION 1, R-WEAK-ASSERT 1 (warn)
#   src/pages/orders/orders.page.ts:44 R-NO-SLEEP | :19 R-SCOPE | :21 R-POSITION
#   tests/orders.spec.ts:17 R-WEAK-ASSERT | :18 :30 :49 R-TEARDOWN
node skills/refactor-test-suite/scripts/audit-suite.mjs skills/test-code-review/examples/review-01/after --json <scratch>/after.json
# audit: 4 files scanned | 0 findings
node scripts/check-repo.mjs
# 0 problems under skills/test-code-review/examples/review-01 (links, anchors, fences); the whole-repo result
# on 2026-11-03 was 5 problems, all broken links in other example folders still being written that day
```

The audit needs no `package.json`: it walks the folder and classifies files by path (`tests/` and `*.spec.ts` are
tests, `pages/` is a page object, `fixtures/` is composition). The 7 before-findings map to answer-key rows 1, 2
(three locations), 4, 5 and 6; rows 3, 7 and 8 are reviewer-only, as the key says.

Type-check, ran once on 2026-11-03 outside the repo (a scratch folder with `package.json`, a strict `tsconfig`
including `before/**/*.ts` and `after/**/*.ts`, `typescript@5.6.3`, `@playwright/test@1.48.2`,
`@types/node@20.17.6`): `npx tsc --noEmit` exit 0 for both folders, 0 errors. The example itself ships no
`package.json`, so from the repo it "compiles in principle" until someone repeats that step.

Not run: `eslint` (no config here) and the tests (no app). The audit counts (7 before, 0 after) are re-earned on
every push by CI's `Skill examples` job (`scripts/check-examples.sh`, which fails if either count changes); the
type-check above is "ran once on 2026-11-03".
