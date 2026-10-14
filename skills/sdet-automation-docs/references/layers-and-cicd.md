# Test Layers and CI/CD

Content for `docs/testing/` and `docs/cicd/`, plus quality gates.

Contents:

- [API_TESTING.md](#api_testingmd)
- [CONTRACT_TESTING.md](#contract_testingmd)
- [INTEGRATION_TESTING.md](#integration_testingmd)
- [UI_TESTING.md](#ui_testingmd)
- [VISUAL_TESTING.md](#visual_testingmd)
- [ACCESSIBILITY_TESTING.md](#accessibility_testingmd)
- [MOBILE_TESTING.md](#mobile_testingmd)
- [PERFORMANCE_TESTING.md](#performance_testingmd)
- [SECURITY_TESTING.md](#security_testingmd)
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

## INTEGRATION_TESTING.md

Integration tests verify that your components work with their real collaborators — database, message broker,
cache, another of your own services — below the UI and above unit level.

Document:

- **What is real and what is replaced**: real for everything you own; replace only external third parties
  (payment, email/SMS, partner APIs) at the network boundary with a stub/simulator that returns realistic responses
  and errors.
- **How dependencies start**: ephemeral containers per run (e.g. Testcontainers / docker compose) are preferred over
  a long-lived shared environment, so data and versions are known.
- **Asynchronous flows**: for queues/events, assert on the observable outcome (record persisted, event published,
  status changed) by polling with a timeout — never a fixed sleep. Document the maximum expected processing time.
- **Failure paths**: dependency down, timeout, malformed message, duplicate message (idempotency), out-of-order
  events.
- **Data**: each test creates its own records with unique ids and removes them in fixture teardown; schema
  migrations run as part of setup so tests exercise the real schema.

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

## ACCESSIBILITY_TESTING.md

State the **target standard** (usually WCAG 2.2 level AA) and where it comes from (legal requirement, contract,
product policy). Then combine three layers — automated rules engines catch only a portion of WCAG issues, so the
doc must say who covers the rest:

| Layer | Covers | When |
|---|---|---|
| Automated rules scan (e.g. axe-core in the UI suite, Lighthouse/pa11y in CI) | Missing labels/alt text, contrast, ARIA misuse, duplicate ids, landmark structure | Every critical page/state in the PR or nightly suite |
| Scripted keyboard checks in E2E | Tab order, focus visible, focus trapped in modals and returned on close, no keyboard traps, skip link | Critical journeys |
| Manual review | Screen reader flow (NVDA/JAWS/VoiceOver), meaningful alt text, reading order, zoom 200 %/reflow at 320 px, motion/animation | Before release of new or redesigned screens |

Document:

- Pages **and states** scanned (open modal, error state, expanded menu) — a scan of the initial page misses most
  dynamic UI.
- Gating policy: e.g. new critical/serious violations block merge; existing ones tracked with owners (baseline,
  not ignore).
- Rule exclusions with reason, owner, expiry — never disable a rule globally.
- Accessible names are also the preferred locator strategy (role + name), so a11y and test stability reinforce each
  other.

---

## MOBILE_TESTING.md

Document:

- **App type**: native (iOS/Android), hybrid/webview, or mobile web — this decides the tooling (Appium,
  XCUITest/Espresso, Detox, Maestro, Playwright device emulation for mobile web).
- **Device matrix**: OS versions and devices from real usage analytics (top N covering ~90 % of users), split into
  emulators/simulators (fast, every PR) and real devices or a device cloud (nightly/release).
- **Locators**: accessibility identifiers (`accessibilityIdentifier` / `resource-id` / `testID`) agreed with
  developers as a testability contract; avoid XPath on mobile — it's slow and brittle.
- **Mobile-specific behavior**: permissions dialogs, backgrounding/resume, rotation, interrupted network
  (offline, flaky, slow), push notifications, deep links, app upgrade from the previous store version, low storage.
- **Builds**: which build variant tests run against, how it's installed, and how test hooks (e.g. a debug menu to
  set state or bypass onboarding) are excluded from production builds.
- **Parallelism**: one device per worker; device reservation follows the account-strategy pattern.
- **Setup via API**: same rule as web — create state through the backend, use the app only for the behavior under
  test.

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

## SECURITY_TESTING.md

Use the **`security-testing`** skill for content: threat model, ASVS level, automated authorization/BOLA/session/
header tests (`TC-SEC-…`), pipeline scanners and gating policy, finding triage. This document records the chosen
level, links the threat model and test plan, and lists which security suites run at which CI stage.

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
