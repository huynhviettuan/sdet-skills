---
name: debug-failed-tests
description: >
  Investigate failing or flaky automated tests systematically — read the failure evidence (error, trace, page
  snapshot, screenshot, console/network logs, created test data, CI metadata), classify the cause (product bug, test
  bug, framework bug, environment/data, timing/race), reproduce with an escalating ladder (single run, repeated,
  with neighbors, CI-like, bisected), fix the root cause, prove the fix the same way, and route anything that isn't a
  test bug (defect report, environment ticket, quarantine with owner and expiry). Use this skill whenever a test
  fails in CI or locally, a suite turns red, a test is flaky or passes only on retry, failures appear only in
  parallel or only in CI, or many tests fail at once. Trigger on phrases like "this test is failing", "debug this
  failure", "why is CI red", "flaky test", "passes locally fails in CI", "investigate test failures", "triage the
  failed run". Tool-agnostic, with Playwright and Selenium / TestNG / Maven examples.
---

# Debug Failed Tests

A failing test is a signal; the job is to find out **what it is signaling** before changing anything. Most bad
fixes — a longer timeout, an extra retry, a loosened assertion — come from skipping that step.

> **Never make a test pass without knowing why it failed.**

**How to use this skill:** follow the workflow. Load a reference when you reach its step:

- [`references/triage-and-evidence.md`](references/triage-and-evidence.md) — the evidence checklist, how to read
  Playwright artifacts, signals for each cause category, and clustering many failures at once.
- [`references/reproduction.md`](references/reproduction.md) — the reproduction ladder, measuring a flake rate,
  finding order dependence and pollution, CI-only failures, and `git bisect` for regressions.
- [`references/root-causes-and-fixes.md`](references/root-causes-and-fixes.md) — cause → evidence → confirm → fix →
  anti-fix table for the common causes, including framework bugs that hide the real error.
- [`references/outcomes.md`](references/outcomes.md) — proving a fix, defect report template, environment/data
  tickets, quarantine entries, and the post-fix checklist.

## Workflow

1. **Collect the evidence before re-running anything.** Error message and stack, the failing line, trace,
   page snapshot / screenshot, console and network logs, test data IDs, environment, commit SHA, browser, worker,
   retry number. A re-run can destroy the only evidence of an intermittent failure.
2. **Many failures?** Cluster them by error signature, area, and start time before looking at any single test —
   twenty failures are often one cause.
3. **Classify** the failure into one of the five categories below using the evidence. Write down the hypothesis and
   what would confirm or refute it.
4. **Reproduce** with the smallest rung of the ladder that shows the failure: single run → repeated → with its
   neighbors → full suite → CI-like conditions. Measure how often it fails.
5. **Find the root cause.** Narrow until you can state it in one sentence that explains *every* observation
   (including why it sometimes passes).
6. **Fix at the right owner** — test, framework, product, environment, or data (table below). Fix the cause, not the
   symptom.
7. **Prove it** with the same rung that reproduced it (a flake that failed 3/50 needs a clean 50+, not one green
   run). Add the missing assertion or regression test where one would have caught it earlier.
8. **Close the loop:** defect report, environment ticket, or quarantine entry with owner and expiry; record the cause
   in the flaky-test log.

## Cause categories

| Category | Typical signal | Owner of the fix |
|---|---|---|
| **Product bug** | App behaves differently from the requirement (AC/BR); reproducible by hand; started with an app change | Developers — test stays red or is marked expected-to-fail with the defect ID |
| **Test bug** | Wrong expectation, wrong locator, missing wait on a real signal, data assumption, order dependence | Test author |
| **Framework bug** | Many unrelated tests fail the same way; error comes from a fixture/helper/matcher; misleading error text | Framework owner (one fix, many tests) |
| **Environment / data** | Failures cluster by environment, time, or worker; 5xx, timeouts on setup calls; shared data altered | Environment owner / test-data owner |
| **Timing / race** | Intermittent; passes on retry; differs between fast and slow machines or parallel vs serial | Test author (or developers, if the app has the race) |

When the expected result and the app disagree, check the requirement first — the test may be right and the app
wrong, or the requirement may have changed (then update the AC and the test together).

## Non-negotiable rules

- **Evidence first, re-run second.** Save artifacts of the original failure before any re-run.
- **No fix without a stated root cause** that explains every observation.
- **Never fix with time:** no added sleeps, no raised timeouts, no extra retries to make a red test green. Wait on the
  real signal; a raised timeout is acceptable only when the operation is genuinely slower and the new value is
  justified.
- **Never weaken the assertion to pass** (`toBeTruthy` instead of the real value, removing a check). If the
  expectation is wrong, prove it against the requirement.
- **A flaky test is a failing test.** Passed-on-retry is reported as FLAKY, not as a pass.
- **Fix the shared cause once.** If a fixture, helper, or matcher is the cause, fix it there, not in each test.
- **Prove the fix at the rung that reproduced it**, and run the neighbors / full suite for regressions.
- **Quarantine is a decision with an owner and an expiry**, never a way to make the board green.

## Related skills

- **`sdet-automation-docs`** — flaky / retry / quarantine policy and failure-artifact standards this skill applies.
- **`sdet-framework-architect`** — the patterns most fixes land on (scoping, fixture-owned teardown, waiting on real
  signals, no shared state).
- **`test-case-design`** — check whether the failing expectation actually comes from an AC/BR.
- **`page-builder`** / **`service-builder`** — rebuild a page object or service when the cause is a stale locator
  model or spec drift.
- **`refactor-test-suite`** — when the same structural cause (sleeps, shared state, raw locators) recurs across many
  tests, fix it suite-wide.
- **`performance-testing`** — when the "timeout" is real slowness under load, not a test problem.
- **`manual-qa-agent`** — runs that failed in the Manual QA Agent: its triage and reproduction are the starting
  evidence; its verdict and the human-confirmed cause stay with the agent.
