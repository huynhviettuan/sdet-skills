# Reproduction

Reproduce at the smallest scope that shows the failure, and know how often it fails before claiming any fix.
Commands are shown for Playwright and for TestNG + Maven; the ladder applies to any runner.

Contents:

- [The ladder](#the-ladder)
- [Measuring a flake rate](#measuring-a-flake-rate)
- [Order dependence and pollution](#order-dependence-and-pollution)
- [CI-only failures](#ci-only-failures)
- [Regressions: bisecting commits](#regressions-bisecting-commits)
- [Can't reproduce](#cant-reproduce)

---

## The ladder

Climb only as far as needed; each rung adds a variable.

| Rung | Command | Shows |
|---|---|---|
| 1. Single run | `npx playwright test path/to.spec.ts -g "title"` | Deterministic failure |
| 2. Repeated | `npx playwright test path/to.spec.ts -g "title" --repeat-each=30 --workers=1` | Intermittent failure in isolation (timing, app race) |
| 3. Repeated, parallel | same with `--workers=4` (or CI's count) | Contention: shared accounts/data, rate limits, resource starvation |
| 4. With neighbors | `npx playwright test path/to.spec.ts` (whole file), then the folder | Order dependence, leftover state from other tests |
| 5. Full suite | the CI command | Pollution from distant tests, global setup issues |
| 6. CI-like | headless, CI viewport, CI workers, `TZ`/locale, CI env file, `--retries=0` | Environment differences |
| 7. In CI | re-run the job with tracing on every attempt | Infra-only causes (resources, network, secrets) |

TestNG + Maven equivalents:

| Rung | Command |
|---|---|
| 1. Single run | `mvn test -Dtest=TodoSmokeTest#elementsResolveInExploredStates` |
| 2. Repeated | temporarily `@Test(invocationCount = 30)` on the method, then rung 1 — remove before committing |
| 3. Repeated, parallel | temporarily `@Test(invocationCount = 30, threadPoolSize = 4)` |
| 4. With neighbors | `mvn test -Dtest=TodoSmokeTest -Dthreads=1`, then the package (`-Dtest='com.example.qa.tests.ui.*'`) |
| 5. Full suite | `mvn test` (CI's `-Dthreads`, `-Dgroups`) |
| 6. CI-like | `-DHEADLESS=true -DBROWSER=<ci browser> -DTEST_ENV=<ci env>`, CI `-Dthreads`, `TZ`/locale, no rerun options |
| 7. In CI | re-run the job; keep Allure results (screenshots, page source, request/response) |

Always run with retries off while reproducing (`--retries=0`; no `surefire.rerunFailingTestsCount`, no TestNG
`IRetryAnalyzer`) — retries hide the failure you are looking for.

---

## Measuring a flake rate

```text
failures / runs at a given rung, e.g. 3/50 at rung 3
```

- Report the rate with the rung; "flaky" alone is not a measurement.
- To claim a fix, run at least enough repetitions that the old rate would almost certainly have shown a failure:
  for a failure rate *p*, about `3 / p` clean runs (3/50 = 6 % → ~50 clean runs; 1/100 → ~300).
- Very low rates (< 1 %) are often environment or infrastructure; consider rung 7 and history across many CI runs
  instead of local loops.

---

## Order dependence and pollution

A test that passes alone but fails with others depends on state someone else left behind (or removed).

1. Confirm: passes alone (rung 1–2), fails with the file or suite (rung 4–5).
2. Fix the order: `--workers=1` with the full file to make it deterministic.
3. **Bisect the preceding tests**: run the failing test together with the first half of the tests that ran before
   it in the same worker; keep the half that still fails; repeat until one polluting test remains.
4. Find the shared state: data both touch, an account, browser storage, a global/static variable, a mock not
   removed, a feature flag, server-side config, time.
5. Fix the **polluter's teardown** (whoever creates the state owns its teardown) and make the victim independent of
   it — not by ordering tests or switching to serial mode.

---

## CI-only failures

Diff the two environments explicitly:

| Dimension | Check |
|---|---|
| Headed vs headless | Rendering, focus, hover, animations |
| Viewport / device | Responsive layout hides or moves elements |
| CPU / memory | Slower machines widen race windows; check duration vs local |
| Workers | Parallelism and shared data/accounts |
| Timezone / locale | Dates, number formats, sorting (`TZ=UTC`, `LANG`) |
| Environment file / secrets | Different base URLs, missing variables, expired credentials |
| Data | CI env shared with other pipelines or people |
| Network | Proxies, blocked third parties, rate limits |
| Versions | Browser, runtime (Node), dependency lockfile honored? |

Reproduce by changing **one** dimension at a time locally until the failure appears.

---

## Regressions: bisecting commits

When a test that was stable starts failing every run:

```bash
git bisect start <bad-sha> <last-good-sha>
git bisect run npx playwright test path/to.spec.ts -g "title" --retries=0
# TestNG + Maven
git bisect run mvn -q test -Dtest=TodoSmokeTest#elementsResolveInExploredStates
```

Bisect the **test repo** when only tests changed; when the app deploys separately, line the first failure up with
app deploy history instead. If both changed, pin one and bisect the other.

---

## Can't reproduce

If no rung reproduces it:

- Keep the evidence from the original failure; enable full tracing on all attempts for that test in CI.
- Look at history across many runs: time of day, worker, environment, preceding tests.
- Check infrastructure events at the failure time (deploys, restarts, maintenance, rate limiting).
- Treat it as **open**, not fixed: record it in the flaky log with what was ruled out. Never close an unreproduced
  flake as "fixed by re-run".
