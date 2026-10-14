# Migration Plan

How to take an existing suite from its audit to the target architecture in small, safe steps — and keep it there.

Contents:

- [Baseline](#baseline)
- [Audit report template](#audit-report-template)
- [Ordering the work](#ordering-the-work)
- [Adopting the target structure in an existing repo](#adopting-the-target-structure-in-an-existing-repo)
- [Step size and pull requests](#step-size-and-pull-requests)
- [Verifying each step](#verifying-each-step)
- [Retries and flaky tests](#retries-and-flaky-tests)
- [Locking it in: the ratchet](#locking-it-in-the-ratchet)
- [When a rewrite is justified](#when-a-rewrite-is-justified)
- [Done criteria](#done-criteria)

---

## Baseline

Before changing anything, record how the suite behaves today — a refactor must not make it worse:

| Measure | How |
|---|---|
| Pass / fail / skipped per test | Full run with **retries off**, same environment as CI |
| Flaky tests | Run the suite 3–5 times (or `--repeat-each` / `invocationCount` on a sample); a test that both passed and failed is flaky |
| Duration | Total and the 10 slowest tests |
| Audit counts | `node audit-suite.mjs <repo> --json audit-baseline.json` — commit this file |
| Coverage map | Which features/AC the suite covers (even roughly) — the refactor must not lose coverage |

Tests that fail in the baseline are triaged first (`debug-failed-tests`): fix, quarantine with an owner, or delete.
Never refactor a red test — you can't tell whether you broke it.

---

## Audit report template

```md
# Test Suite Audit — <repo> — <date>

## Summary
<2–3 sentences: overall health, biggest risk, recommended first step>

## Baseline
Tests: <n> (pass <n>, fail <n>, flaky <n>) · Duration: <m> · Parallel: <yes/no, workers>

## Automated findings (audit-suite.mjs)
| Rule | Severity | Count | Hot spots |
|---|---|---:|---|
| R-RAW-UI-IN-TEST | block | 214 | tests/checkout/*, tests/admin/* |

## Manual findings
| Concern | Evidence | Impact |
|---|---|---|
| No composition root | every test builds its own pages and drivers | can't add auth/teardown centrally |

## Plan
| Step | Scope | Rules | Exit criterion |
|---|---|---|---|
| 1 | Introduce composition root + driver holder | R-COMPOSITION, R-SHARED-STATE | all tests run through fixtures; parallel run green |

## Risks / open questions
- …
```

---

## Ordering the work

Order by "what everything else depends on", then by risk and payoff:

1. **Safety and security first** — `R-SECRETS` (rotate leaked credentials), `R-FOCUS`.
2. **Foundations** — composition root (fixtures / `TestContext`), per-thread driver holder, configuration for URLs.
   Later steps plug into these; doing them first avoids touching every test twice.
3. **Isolation** — `R-SHARED-STATE`, `R-TEARDOWN`: data factories with teardown. Unlocks parallel runs, which shorten
   every later verification run.
4. **Synchronization** — `R-NO-SLEEP`, `R-FORCE`: the biggest flakiness and duration wins.
5. **Structure** — `R-RAW-UI-IN-TEST`, `R-RAW-HTTP-IN-TEST`, `R-SCOPE`, `R-XPATH-ABS`, `R-POSITION`: page objects
   via `page-builder`, services via `service-builder`, screen by screen, starting with the screens with the most
   failures or the most tests.
6. **Assertion quality** — `R-WEAK-ASSERT`, missing assertions, traceability to test cases.

Within a step, start with the hot spots the audit lists (most findings per file) or the areas with the most failures
in the last month.

---

## Adopting the target structure in an existing repo

Don't copy a scaffold over an existing repo. Grow the target structure inside it (strangler pattern):

1. Add the scaffold's framework layers next to the legacy code (`src/fixtures`, `pages/`, `services/`… or the Java
   packages), using the scaffold (`init-playwright-framework` / `init-selenium-java-framework`) as the source to
   copy from, and the scaffold's lint/rules config.
2. New tests are written only in the new structure (`test-script-writer`).
3. Legacy tests migrate screen by screen; each migrated test is deleted from the legacy folder in the same change.
4. Legacy helpers are deleted when their last caller is gone.
5. When the legacy folder is empty, remove its base classes and config.

Both structures run in the same CI job during the migration, so coverage never drops.

---

## Step size and pull requests

- One rule in one area per pull request (e.g. "R-NO-SLEEP in checkout tests"), or one screen's page object plus the
  tests that use it.
- Pure refactors only: no new test cases, no assertion changes in the same PR — reviewers must be able to see that
  behavior didn't change. (Strengthening weak assertions is its own PR, because it *does* change what tests prove.)
- The PR description lists the audit counts before/after for its rules and the verification runs.

---

## Verifying each step

```text
[ ] Same tests exist (count before/after for the touched area; none silently removed)
[ ] All touched tests pass with retries off
[ ] Touched tests pass repeatedly (--repeat-each=5 / invocationCount = 5) and in parallel
[ ] Duration of the touched tests not worse than baseline
[ ] Audit counts for the targeted rules went down; no rule went up (--baseline)
[ ] For assertion changes only: each changed test fails when its expectation is broken
```

---

## Retries and flaky tests

`R-RETRY-MASK`: retries of 2 or more hide flakiness the refactor needs to see.

1. Run the baseline with retries off to learn the real flaky set.
2. Keep at most 1 retry in CI during the migration, reporting passed-on-retry as **flaky**, not passed.
3. Fix flaky tests with `debug-failed-tests`; quarantine (owner + expiry) only what can't be fixed now.
4. End state: retries 0 locally, 0–1 in CI, flaky rate tracked.

---

## Locking it in: the ratchet

Make sure counts only go down, while the migration is still in progress:

```bash
node scripts/audit-suite.mjs . --baseline audit-baseline.json
```

- Fails when any rule's count **increases** compared with the committed baseline; passes when counts stay or drop.
- After a refactor PR lowers counts, regenerate and commit the baseline (`--json audit-baseline.json`) in the same PR.
- When a rule reaches zero, switch CI to `--fail-on block` (and later `--fail-on warn`) and add the equivalent lint
  rule (ESLint `no-restricted-syntax` / ArchUnit) so editors flag it before CI does.

CI step (GitHub Actions):

```yaml
- name: Test-suite audit (ratchet)
  run: node scripts/audit-suite.mjs . --baseline audit-baseline.json
```

---

## When a rewrite is justified

Rarely. Consider it only if all hold:

- the suite is small (rewrite cost < a few weeks) **or** mostly red/disabled already;
- its tests have no documented cases or traceability worth preserving;
- the legacy framework blocks the target stack (e.g. tool change) rather than just being messy.

Even then: write the new tests from test cases (`test-case-design` → `test-script-writer`), run both suites in
parallel until the new one covers the same features, then delete the old one.

---

## Done criteria

```text
[ ] Audit: 0 block findings; warn findings 0 or each suppressed with a reason
[ ] Manual findings resolved (composition root, no deep inheritance, shared components)
[ ] Suite runs in parallel with retries off; flaky rate at or below the target
[ ] Duration at or below baseline
[ ] Coverage at or above baseline; tests traceable to test cases / AC where the team uses them
[ ] Ratchet / fail-on in CI and lint rules prevent regressions
```
