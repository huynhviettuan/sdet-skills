# 02 — Data pollution: a page fixture widened to the worker

A "performance" change makes the page fixture shared by every test in a worker. Each test then sees the todos left
by the tests before it. Every number below comes from [`evidence.txt`](evidence.txt) (real runs on 2026-11-03
against the live TodoMVC demo and Petstore). [`defect.diff`](defect.diff) introduced the bug and
[`fix.diff`](fix.diff) removes it. The anti-fix that was tried is
[`anti-fix-clear-at-start.diff`](anti-fix-clear-at-start.diff).

**The defect.** `src/fixtures/page-fixtures.ts` gains a worker-scoped `sharedPage` (one browser context per worker,
"saves a context start per test") and overrides Playwright's test-scoped `page` to hand it out. The context, and
everything the app stores in it, now lives as long as the worker. Nothing tears it down between tests. It is the
same mistake as a data factory that lost its teardown: whoever creates the state no longer cleans it up.

Contents:

- [1. Evidence](#1-evidence)
- [2. Classify](#2-classify)
- [3. Reproduce](#3-reproduce)
- [4. Bisect and find the shared state](#4-bisect-and-find-the-shared-state)
- [5. Root cause](#5-root-cause)
- [6. Fix and the anti-fixes](#6-fix-and-the-anti-fixes)
- [7. Prove the fix](#7-prove-the-fix)
- [8. Route](#8-route)
- [Storage probe script](#storage-probe-script)

## 1. Evidence

From the first failing run, `tests/e2e/todo.spec.ts --workers=1` (`rung4-file-w1.txt`), before any re-run:

| Item | What it says |
|---|---|
| Failures | 2 failed, 2 passed. The first test, TC-TODO-001, passed. |
| TC-TODO-002 | `locator.check: strict mode violation … getByText('buy milk', { exact: true }) … resolved to 2 elements`, in `TodoItemSection.complete` (`todo-item.section.ts:21`). The test adds one "buy milk", yet two rows carry that title. |
| TC-TODO-003 (spaces only) | `expect.poll(getTitles).toEqual(['sync point'])` received `["sync point", "sync point"]` |
| Top frames | A page-object action and a test assertion, both doing what they say. The *data* under them is wrong. |
| What did not fail | Every API test, the first test of each run, and TC-TODO-001 run alone |

The strict locator turned a pollution bug into a clear error. A locator that "takes the first match" would have
checked *someone else's* "buy milk" and failed later, somewhere confusing (CLAUDE.md: run locators strict).

Signals ([`triage-and-evidence.md` § Signals per category](../../references/triage-and-evidence.md#signals-per-category)):
*unexpected counts* plus *passes alone, fails in the suite* point at **data / isolation**.

## 2. Classify

```text
Observation: duplicate titles and extra todos in tests that create exactly what they assert; the first test of a run passes
H1: product bug (todo added twice)        -> refuted: TC-TODO-001 alone adds one todo and sees one (rung 1)
H2: timing                                -> refuted: the extra todos carry other tests' titles (sync point, buy milk, todo N ...),
                                             so they were added by someone else, not late
H3: state left by earlier tests (order)   -> supported: fails only when another UI test ran before it in the same worker
```

Category: **environment / data, specifically leftover state and order dependence**. Section 4 shows that the
leftover state is not one test's doing but the fixture's, which also makes this a **framework bug**: one fix, many
tests.

## 3. Reproduce

| Rung | Command (abridged) | Result |
|---|---|---|
| 1. Single run | `todo.spec.ts -g "TC-TODO-001"` | 1 passed |
| 2. Repeated | same, `--repeat-each=10 --workers=1` | 10 passed |
| 4. With neighbours (file, serial) | `todo.spec.ts --workers=1` | 2 failed, 2 passed: TC-TODO-002, TC-TODO-003 (spaces only) |
| 4. With neighbours (folder, serial) | `tests/e2e --workers=1` | 3 failed, 3 passed: TC-TODO-005, TC-TODO-002, TC-TODO-003 (spaces only) |
| 3. Parallel | `tests/e2e --workers=4` | 2 failed, 4 passed: both TC-TODO-003 rows (one received an extra `"buy milk"`) |
| 5. Full suite | `--workers=4` | 2 failed, 12 passed: TC-TODO-003 (spaces only), TC-TODO-002 |

**Rung 2 cannot see this bug, and the reason is measured, not assumed.** The same rung-2 command, with the JSON
report read afterwards, gives `workerIndex:status per repeat -> 0:passed 1:passed … 9:passed`. Playwright puts
each `--repeat-each` index in its own worker, so every repeat got a fresh `sharedPage`. A clean rung 2 here proves
nothing about state shared inside a worker. The neighbour rungs are the ones that matter.

Two more patterns from the table:

- **The failing set moves with the worker layout.** Serial file: 002 and 003-spaces. Serial folder: 005, 002 and
  003-spaces. Four workers: both 003 rows. That is order dependence, not a broken test.
- **Every second test fails in a serial run.** In the folder run (order 004, 005, 001, 002, 003-empty, 003-spaces)
  the failures are 005, 002 and 003-spaces. After a failure Playwright replaces the worker. The next test gets a
  fresh page and passes, and the one after it sees that test's todos.

## 4. Bisect and find the shared state

Victim: TC-TODO-002. Run it alone, then with the tests that preceded it in the same worker
([`reproduction.md` § Order dependence and pollution](../../references/reproduction.md#order-dependence-and-pollution)):

| Run (`tests/e2e --workers=1 -g …`) | Result | Reading |
|---|---|---|
| `TC-TODO-002` | 1 passed | Passes alone |
| `TC-TODO-00[452]` | 1 failed, 2 passed: **005** failed (received 4 extra todos of 004); 002 passed | Inconclusive for 002: 005's failure replaced the worker, so 002 started clean |
| `TC-TODO-00[42]` | 002 failed at line 33: expected `"1 item left"`, received `"3 items left"` | 004 pollutes 002 |
| `TC-TODO-00[52]` | 002 failed at line 33 | 005 pollutes 002 too |
| `TC-TODO-00[12]` | 002 failed at line 21 (strict mode, two "buy milk") | 001 pollutes 002 too |

The bisect does not converge on one polluter: **every** UI test pollutes the next. When no single test is guilty,
the shared state belongs to something they all use. The next step of the ladder is to name that state. Candidates
from the reference are data, accounts, browser storage, globals and mocks.

The anti-fix in section 6 already showed that the todos survive `goto('about:blank')` plus `clearCookies()`. The
[storage probe](#storage-probe-script) adds one todo on the live app and prints the storage:
`localStorage["react-todos"] = [{"id":…,"title":"probe todo","completed":false}]`, empty sessionStorage. After
`about:blank` + `clearCookies` + `goto`, the titles are still `["probe todo"]`. The list lives in the browser
context's localStorage, and the worker-scoped fixture keeps that context alive across tests.

## 5. Root cause

> The page fixture was widened to worker scope, so all tests in a worker share one browser context. Its
> `localStorage["react-todos"]` keeps every todo the earlier tests added, because nothing closes that context
> between tests. A UI test passes only when it is the first in its worker: alone, in each `--repeat-each` repeat,
> or right after a failure has replaced the worker.

This explains every observation: the duplicates, the "every second test" pattern, the failing set moving with the
worker layout, the clean rung 2, and the untouched API tests (they use no page).

## 6. Fix and the anti-fixes

**Fix: the creator owns the teardown** ([`fix.diff`](fix.diff)). Drop `sharedPage` and the `page` override, and
use Playwright's built-in test-scoped `page`. Its context is created for each test and closed after it, also when
the test fails, in the fixture rather than the test body. One change in one fixture fixes all four affected tests.
The cost the defect tried to save (a context per test) is the price of isolation. Measured here it was negligible:
the serial folder run took 6.4 s after the fix vs. 36.0 s with the defect (most of that was 15 s poll timeouts).

| Anti-fix | Result (evidence) | Why it is rejected |
|---|---|---|
| Clear at start: `goto('about:blank')` + `clearCookies()` before each test ([`anti-fix-clear-at-start.diff`](anti-fix-clear-at-start.diff)) | Folder serial: 3 failed, 3 passed. Folder ×4: 2 failed, 4 passed. **No change.** | It guessed what "everything" is and guessed wrong: the state is in localStorage. Clearing localStorage too might go green today, but it is still the victim cleaning up for the polluter. The next kind of state (IndexedDB, a service worker, a granted permission, a route left by a test) leaks again. [`root-causes-and-fixes.md`](../../references/root-causes-and-fixes.md#test-data-and-isolation) lists "cleanup at the start of the test body" as the anti-fix. |
| Reorder the tests / serial mode | Not run as a separate change: the bisect already answers it | Every UI test pollutes the next, so no order makes more than the first test per worker pass. Serial is the *worst* layout measured: the serial folder run failed 3, the 4-worker run failed 2. |

## 7. Prove the fix

| Rung | Result |
|---|---|
| 4. `todo.spec.ts --workers=1` | 4 passed |
| 4. `tests/e2e --workers=1` | 6 passed |
| 3. `tests/e2e --workers=4` | 6 passed |
| 5. Full suite `--workers=4` | 14 passed (the sentinel counts as passed when it fails as expected) |
| `tests/e2e --workers=1 --repeat-each=3` | 18 passed |

The serial rungs are the meaningful proof: six UI tests in sequence in one worker, with no failure to replace the
worker in between. As section 3 measured, the `--repeat-each` run adds repetitions but puts each repeat in its own
worker, so on its own it would not prove isolation. The fix is causal: `fix.diff` is `defect.diff` reversed, and
the defect fails at every neighbour rung while the fix passes at all of them.

## 8. Route

A framework bug in a shared fixture, fixed once. Nothing to file against the app. Flaky log entry:

```text
2026-11-03 | TC-TODO-002/003/005 (any UI test not first in its worker) | serial file 2/4, serial folder 3/6, x4 folder 2/6, suite 2/14 | Environment/data -> framework (fixture) | worker-scoped page fixture shared one browser context, and its localStorage, across tests | test-scoped page restored (context closed per test) | file 4/4, folder 6/6 serial and x4, suite 14/14
```

What would have caught it earlier: any serial run of the folder. The nightly runs `--workers=4 --repeat-each=3`,
and those settings spread the tests out, so a pollution bug only shows when two UI tests share a worker. Two things
would catch it reliably: a review rule that a fixture overriding `page`/`context` must stay test-scoped, and one
serial pass of the UI folder.

## Storage probe script

Diagnostic only, run once from the throwaway copy (`node storage-probe.tmp.mjs` from the copy's folder). Output
is in the evidence under `storage-probe.txt`.

```js
// Diagnostic only (case 2): where does TodoMVC keep its list? Prints storage keys after adding one todo.
import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();
await page.goto('https://demo.playwright.dev/todomvc/#/');
await page.getByPlaceholder('What needs to be done?').fill('probe todo');
await page.keyboard.press('Enter');
const storage = await page.evaluate(() => ({
    localStorage: Object.fromEntries(Object.entries(localStorage)),
    sessionStorageKeys: Object.keys(sessionStorage)
}));
console.log(JSON.stringify(storage));
await page.goto('about:blank');
await context.clearCookies();
await page.goto('https://demo.playwright.dev/todomvc/#/');
console.log('titles after about:blank + clearCookies + goto:', JSON.stringify(await page.getByTestId('todo-title').allInnerTexts()));
await browser.close();
```
