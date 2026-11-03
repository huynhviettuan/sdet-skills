# Worked investigations — debug-failed-tests

Three failures, each planted on purpose in a throwaway copy of a working suite. Each one was run for real and then
investigated with this skill's workflow: evidence → classify → reproduce → root cause → fix → prove → route. The
logs are real output from 2026-11-03, trimmed. The only edit is that the local path of the copy reads `<repo>`.
Every count in a case README is in that case's `evidence.txt`.

These are **ran once on 2026-11-03**, not verified: no CI job re-runs them. They depend on two public demo apps
(TodoMVC on demo.playwright.dev and the Swagger Petstore), whose behaviour can change.

| Case | Planted defect | Category | Reproduced at | Measured | After the fix |
|---|---|---|---|---|---|
| [01-race-condition](01-race-condition/README.md) | `filterBy` no longer waits for the selected filter; a snapshot read follows the click | Timing / race (test) | Rung 2 and 3 | 19/20 at rung 2, 20/20 at rung 3; a 50 ms sleep goes 10/10 green (rejected) | 10 + 30 at rung 2, 10 at rung 3, neighbours 6/6 |
| [02-data-pollution](02-data-pollution/README.md) | Page fixture widened to worker scope: one browser context (and its localStorage) per worker | Data / isolation → framework (fixture) | Rung 4 (neighbours); rung 2 cannot see it | Serial file 2 of 4 failed, serial folder 3 of 6, folder ×4 2 of 6, suite 2 of 14 | File 4/4, folder 6/6 serial and ×4, suite 14/14 |
| [03-environment-ci-only](03-environment-ci-only/README.md) | `.env.ci` (selected by `TEST_ENV=ci`) points `API_DOMAIN` at a Petstore root that answers 404 | Environment (config drift) | Rung 6, one dimension changed | `TEST_ENV=ci`: 7 failed, 7 passed (every API test, one signature); unset: 14 passed | `TEST_ENV=ci`: 14 passed; unset: 14 passed |

Each case folder holds `README.md` (the investigation), `evidence.txt` (the trimmed real output, with the command
above every run), `defect.diff` (the change that planted the defect) and `fix.diff`. Cases 01 and 02 also include
the anti-fixes that were run, as diffs.

## The base and the commands

The copy is what [`run-examples.sh`](../../test-script-writer/examples/playwright-ts/run-examples.sh) builds: the
`init-playwright-framework` template plus the `test-script-writer` Playwright/TypeScript example suite (sources at
commit aa20c82, unchanged since 286442c), with the same `.env`. The repo itself was never edited. The defects went
into the copy only.

```bash
# in the copy (Windows 11, Git Bash, Node 22.15.0, Playwright 1.61.0, bundled Chromium)
npm install --no-audit --no-fund
npx playwright install chromium
export PLAYWRIGHT_FORCE_ASYNC_LOADER=1   # Node 22.15 + Playwright 1.61: see the example suite's README
unset CI
npx playwright test --config=playwright.examples.config.ts --workers=4 --retries=0
```

Baseline on 2026-11-03, before any defect: **14 passed** (13 tests plus the `@sentinel`, which is expected to fail
and did, on its known-false value). Every reproduction and proof run uses `--retries=0`. The exact command of each
run is in the evidence files.

## What these cases teach beyond the references

- **A sleep can go green** (case 01: 10/10 with `waitForTimeout(50)`). The reason to reject it is the cause, not a
  red run: the render window was 0.1 to 16.2 ms on one idle machine, and nothing ties 50 ms to it.
- **`--repeat-each` gives every repeat its own worker** (case 02: worker indices 0 to 9 for 10 repeats under
  `--workers=1`). Rung 2 can't show pollution that lives inside a worker. Use the neighbour rungs, serially.
- **A strict, scoped locator turns pollution into a clear error** (case 02: "resolved to 2 elements" on the
  victim's own title), where "take the first match" would have acted on another test's row.
- **Cluster before reading** (case 03: seven failures, one signature, one setup call, so one environment ticket
  instead of seven test investigations).
