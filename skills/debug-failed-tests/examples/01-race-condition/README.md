# 01 — Race condition: reading the list before the filter has rendered

A page-object method stops waiting for the real signal after a click, and a metamorphic test starts failing. Every
number below comes from [`evidence.txt`](evidence.txt) (real runs on 2026-11-03 against the live TodoMVC demo).
[`defect.diff`](defect.diff) introduced the bug and [`fix.diff`](fix.diff) removes it. The anti-fixes that were
tried are [`anti-fix-sleep.diff`](anti-fix-sleep.diff) and [`anti-fix-wrong-signal.diff`](anti-fix-wrong-signal.diff).

**The defect.** `TodoPage.filterBy` clicked the filter and then waited until that filter carried `a.selected`. The
app renders the filtered list in the same update. The defect removes that wait, so `filterBy` returns as soon as the
click resolves. `getTitlesUnder(name)` then reads the list with `allInnerTexts()`, which is a snapshot and does not
retry.

Contents:

- [1. Evidence](#1-evidence)
- [2. Classify](#2-classify)
- [3. Reproduce](#3-reproduce)
- [4. Root cause](#4-root-cause)
- [5. Fix and the anti-fixes](#5-fix-and-the-anti-fixes)
- [6. Prove the fix](#6-prove-the-fix)
- [7. Route](#7-route)
- [Probe script](#probe-script)

## 1. Evidence

Collected from the first failing run, before any re-run (`rung1.txt` in the evidence).

| Item | What it says |
|---|---|
| Failing test | `[TC-TODO-004] Active and Completed partition All and the counter equals the Active count`, `tests/e2e/todo.metamorphic.spec.ts` |
| Failing line | 39: `expect(active.filter((title) => completed.includes(title))).toHaveLength(0)` |
| Expected vs received | length 0, received 2: `["todo 1 …", "todo 3 …"]`. The two todos the test completed show up in the *Active* read. |
| Other signature | Line 37 `expect(completed).toContain(first)`: the *Completed* read returned `["todo 4 …", "todo 5 …"]`, which is the Active list (`rung3-repeat10-w4.txt`) |
| Page snapshot at failure | `error-context.md` (excerpt at the end of the evidence): the Completed filter is active and lists `todo 1` and `todo 3`, both checked; the counter says 2 items left. **The app is in the right state; the test's read disagrees with it.** |
| Top frame | Test code (the assertion), not a fixture or matcher |
| Environment | Windows 11, Node 22.15.0, Playwright 1.61.0, bundled Chromium headless, `--retries=0` |

Each read returns the list of the filter *before* the one just clicked. That pattern is the first clue.

## 2. Classify

Hypothesis log (from [`triage-and-evidence.md` § Hypothesis log](../../references/triage-and-evidence.md#hypothesis-log)):

```text
Observation: the Active read contains completed todos; the Completed read contains the Active list;
             the snapshot at failure shows the correct Completed list
H1: product bug (filter shows wrong items)  -> refuted: the snapshot shows the right list under Completed
H2: wrong locator                           -> refuted: the same getTitles() passes everywhere else, and the received
                                                titles are real todos of this test, just from the previous filter
H3: read before the re-render (timing)      -> supported: the received list is always the previous filter's list;
                                                filterBy returns when the click resolves, not when the list changes
```

Category: **timing / race, in the test**. The owner is the test author, and the fix goes in the page object. The
requirement (AC-TODO-002) is not in question: the app renders the right list a few milliseconds later.

## 3. Reproduce

The ladder from [`reproduction.md` § The ladder](../../references/reproduction.md#the-ladder), always with `--retries=0`:

| Rung | Command (abridged) | Result | Rate |
|---|---|---|---|
| 1. Single run | `-g "TC-TODO-004" --retries=0` | 1 failed | 1/1 |
| 2. Repeated | `--repeat-each=10 --workers=1` | 10 failed; second measurement 9 failed, 1 passed | **19/20** |
| 3. Repeated, parallel | `--repeat-each=10 --workers=4` | 10 failed; second measurement 10 failed | 20/20 |
| 4. With neighbours | `tests/e2e --workers=1` | 1 failed, 5 passed (twice); only TC-TODO-004 fails | 1/6 per run |

The brief expected an intermittent failure. Measured, it is **19/20 at rung 2**: nearly deterministic on this
machine, and it still passed once. That single pass matters, because the root cause has to explain it too. Which
assertion catches it varies: at rung 2 it was line 37 in 3 + 5 runs and line 39 in 7 + 4; at rung 3 it was line 37
all 20 times. That fits a read racing a render, not a fixed wrong value.

The other tests that call `filterBy` (TC-TODO-002) passed at rung 4 under the defect. Each of them follows the
click with `expect.poll(...)`, and the retrying assertion absorbs the missing wait. TC-TODO-004 reads through
`getTitlesUnder`, which does not retry.

**How long is the window?** The [probe script](#probe-script) clicks Completed/Active on the live app ten times and
measures, inside the page, the time from the click resolving until `a.selected` switches. Results: **0.1 ms to
16.2 ms**. A read issued right after the click usually lands inside that window. It lost the race once in 20 runs
(the 0.1 ms case shows the render can finish almost at once).

## 4. Root cause

> `filterBy` returns when the click resolves, and `getTitlesUnder` then reads the list with a non-retrying
> `allInnerTexts()` while the app is still rendering the new filter (0.1 to 16.2 ms later in the probe). The read
> returns the previous filter's titles. It passes on the rare run where the render finishes before the read.

This explains every observation: the "previous filter" pattern, both failing lines, the correct snapshot (taken
after the render), the single pass, and why the polling tests survive.

## 5. Fix and the anti-fixes

**Fix: wait on the real signal, once, in the page object** ([`fix.diff`](fix.diff)). After the click, wait until
that filter link carries `a.selected`. The app re-renders the list in the same update, so this is the event that
means "the list now shows this filter". The fix lives in `filterBy`, the one shared place, not in each test
(SKILL.md: fix the shared cause once).

Three anti-fixes were run for the record, each from the defective state:

| Anti-fix | Result (evidence) | Why it is rejected |
|---|---|---|
| `waitForTimeout(50)` after the click ([`anti-fix-sleep.diff`](anti-fix-sleep.diff)) | **10 passed** at rung 2 | It goes green, and that is the danger. 50 ms is about 3× the slowest render measured on one idle machine, and a loaded CI runner widens the window. It costs 50 ms on every filter click whether needed or not, and it encodes no cause. The skill forbids it outright ("never fix with time"). |
| `--retries=2` | 10 failed; all 30 attempts failed (27 at line 37, 3 at line 39) | At 19/20 a retry almost never rescues the test. At a lower rate it would, and the run would report FLAKY as a pass. Retries hide the failure that reproduction is looking for. |
| Wait on the URL hash (`waitForURL('**/#/completed')`) ([`anti-fix-wrong-signal.diff`](anti-fix-wrong-signal.diff)) | 10 failed, all at line 37 | Wrong signal: the hash changes first and the app renders afterwards. This is the "waiting on the wrong signal" row of [`root-causes-and-fixes.md` § Synchronization](../../references/root-causes-and-fixes.md#synchronization). |

Variants of the brief's suggestion did **not** reproduce in 10 repeats, so they were not used. One replaced the
`expect.poll` reads in TC-TODO-001/002 with immediate reads. The other removed the detach wait in
`TodoItemSection.delete` and read the counter immediately in TC-TODO-005. In this app, adding a todo and toggling
one finish before Playwright's action resolves; switching a filter does not. Their logs were not kept, so no counts
are claimed for them.

## 6. Prove the fix

Re-run at the rungs that reproduced the failure, with `--retries=0` ([`outcomes.md` § Proving a fix](../../references/outcomes.md#proving-a-fix)):

| Rung | Result |
|---|---|
| 2. `--repeat-each=10 --workers=1` | 10 passed |
| 2. `--repeat-each=30 --workers=1` | 30 passed |
| 3. `--repeat-each=10 --workers=4` | 10 passed |
| 4. `tests/e2e --workers=1` (neighbours) | 6 passed |

The old rate was p = 19/20, so `3 / p` asks for about 4 clean runs. The 40 clean rung-2 runs and 10 clean rung-3
runs go well beyond that. The fix is also causal: the defect is the fix reverted, and it fails 19/20 vs. 0/40 with
the fix.

## 7. Route

A test bug, fixed in the page object. Nothing to file against the product or the environment. Flaky log entry
(format from [`outcomes.md` § Flaky log entry](../../references/outcomes.md#flaky-log-entry)):

```text
2026-11-03 | TC-TODO-004 | 19/20 at rung 2, 20/20 at rung 3 | Timing / race (test) | filterBy returned on click and getTitlesUnder read the list before the filter re-rendered | filterBy waits for a.selected on the clicked filter | 10+30 at rung 2, 10 at rung 3, neighbours 6/6
```

What would have caught it earlier: the wait was the guard. `getTitlesUnder` is a snapshot read by design, so its
correctness depends on `filterBy` returning only after the list has changed. The method's doc comment now says so
(*returns once it is selected*).

## Probe script

Diagnostic only, run once from the throwaway copy (`node probe.mjs` from the copy's folder, so it resolves
`@playwright/test`). It is not part of any suite. Output is in the evidence under `probe-output.txt`.

```js
import { chromium } from '@playwright/test';
const b = await chromium.launch(); const p = await b.newPage();
await p.goto('https://demo.playwright.dev/todomvc/#/');
for (const t of ['a','b','c']) { await p.getByPlaceholder('What needs to be done?').fill(t); await p.keyboard.press('Enter'); }
await p.getByTestId('todo-item').first().getByRole('checkbox').check();
const out = [];
for (let i = 0; i < 10; i++) {
  const link = i % 2 ? 'Active' : 'Completed';
  const t0 = Date.now();
  await p.getByRole('link', { name: link, exact: true }).click();
  const t1 = Date.now();
  const ms = await p.evaluate(async (want) => { const s = performance.now(); while (!document.querySelector('a.selected')?.textContent.includes(want)) await new Promise(r => setTimeout(r, 0)); return performance.now() - s; }, link);
  out.push(`${link}: click ${t1 - t0}ms, render after click ${ms.toFixed(1)}ms`);
}
console.log(out.join('\n')); await b.close();
```

The probe reads `document.querySelector` globally and takes the first checkbox. That is acceptable for a one-off
diagnostic on a page with one list, and would not be acceptable in a test (CLAUDE.md: scope through the owning
parent).
