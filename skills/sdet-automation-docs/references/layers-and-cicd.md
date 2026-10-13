# Test Layers and CI/CD

Content for `docs/testing/` and `docs/cicd/`, plus quality gates.

Contents:

- [API_TESTING.md](#api_testingmd)
- [CONTRACT_TESTING.md](#contract_testingmd)
- [UI_TESTING.md](#ui_testingmd)
- [VISUAL_TESTING.md](#visual_testingmd)
- [PERFORMANCE_TESTING.md](#performance_testingmd)
- [CI_CD_STRATEGY.md — execution stages](#ci_cd_strategymd--execution-stages)
- [PIPELINE_DESIGN.md](#pipeline_designmd)
- [ENVIRONMENT_STRATEGY.md](#environment_strategymd)
- [REPORTING.md](#reportingmd)
- [ARTIFACTS_AND_DEBUGGING.md](#artifacts_and_debuggingmd)
- [QUALITY_GATES.md](#quality_gatesmd)

---

## API_TESTING.md

Validate: status code, response schema, business rules, authorization, validation, error codes, state transitions,
idempotency, concurrency where relevant.

Categories per endpoint: happy path, invalid request, unauthorized (401), forbidden (403), not found, conflict,
duplicate request, boundary values, concurrent update.

---

## CONTRACT_TESTING.md

Use when frontend/backend or services depend on stable interfaces. Validate request shape, response shape, required
and nullable fields, enum values, error format, version compatibility. Prefer validating against the product's
OpenAPI (or equivalent) schema rather than hand-written shape checks.

---

## UI_TESTING.md

UI E2E covers critical user journeys only: authentication, critical creation/approval flows, payment/checkout,
high-risk operational workflows. Never use the UI for large input combinations.

```text
API creates test data (fixture)
 → UI verifies the user journey under test
```

---

## VISUAL_TESTING.md

Useful for layout, component rendering, critical screens, charts, responsive breakpoints. Document: baseline
generation, browser, viewport, threshold, review process, accepted-difference workflow. Mask or freeze dynamic data
(dates, counters, avatars) — visual tests must not depend on it.

---

## PERFORMANCE_TESTING.md

Document per scenario: load profile, duration, concurrency, throughput target, latency target (percentiles, not
averages), error-rate target, environment, test data.

Scenario types: normal load, peak, stress, spike, soak. Interpret throughput and response time together. Keep
performance runs out of the fast PR stage unless intentionally lightweight.

For the content of this document — SLOs, workload model, script standards, environment, CI gates, analysis, and
the report template — use the **`performance-testing`** skill. This document links its workload model and latest
report rather than restating them.

---

## CI_CD_STRATEGY.md — execution stages

| Stage | Goal | Suites |
|---|---|---|
| Pull request | Fast confidence | lint, typecheck, unit, critical API (P0), UI smoke |
| Merge / main | Broader regression | API regression, integration, UI regression |
| Nightly | Expensive validation | full E2E, cross-browser, visual, long-running, data-heavy, performance subset |
| Release | Release confidence | critical journeys, critical APIs, deployment smoke |

Do not run every expensive suite on every commit without a reason.

---

## PIPELINE_DESIGN.md

For each pipeline record: trigger, stage, suite, environment, workers, timeout, retries, artifacts, failure policy.

| Trigger | Suite | Environment |
|---|---|---|
| PR | Smoke | Test |
| Merge | Regression | Test |
| Nightly | Full | Staging |
| Release | Critical | Production-like |

---

## ENVIRONMENT_STRATEGY.md

For each environment (Local, Dev, Test, Staging, Production-like): base URL, API URL, database, accounts, feature
flags, where secrets live, data reset policy, external integration behavior (real / sandbox / mocked at the
boundary). State explicitly which environments allow destructive operations.

---

## REPORTING.md

Reports must answer: what failed, why, which requirement (AC/TC id) is affected, product defect or test defect, is
it flaky, which commit introduced it.

Useful metrics: pass/fail rate, flaky rate, duration, critical flow status, coverage by risk, top failing tests, top
flaky tests. Pass rate alone is not a quality metric.

---

## ARTIFACTS_AND_DEBUGGING.md

Store useful artifacts only:

| Suite | Retain |
|---|---|
| PR smoke | failure artifacts |
| Nightly | failure artifacts + report |
| Release | full report + key evidence |

Avoid storing videos of every passing test unless there's a stated need. Record retention periods.

---

## QUALITY_GATES.md

Gates reflect risk. Example blocking gates — a PR cannot merge if lint, typecheck, P0 API tests, or critical UI
smoke fail.

Possible non-blocking signals: P3 visual difference, a known quarantined test (with owner + expiry), non-critical
nightly failure.
