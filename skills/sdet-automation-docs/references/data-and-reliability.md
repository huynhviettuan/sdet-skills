# Test Data and Reliability

Content for `docs/data/` and `docs/reliability/`.

Contents:

- [TEST_DATA_STRATEGY.md](#test_data_strategymd)
- [ACCOUNT_STRATEGY.md](#account_strategymd)
- [DATA_CLEANUP.md](#data_cleanupmd)
- [DATABASE_TESTING.md](#database_testingmd)
- [TEST_ISOLATION.md](#test_isolationmd)
- [PARALLEL_EXECUTION.md](#parallel_executionmd)
- [FLAKY_TEST_POLICY.md](#flaky_test_policymd)
- [RETRY_POLICY.md](#retry_policymd)
- [FAILURE_ANALYSIS.md](#failure_analysismd)

---

## TEST_DATA_STRATEGY.md

Lifecycle, owned by one fixture end to end:

```text
fixture creates or reserves data
 → test executes
 → test asserts
 → same fixture tears it down (idempotent, runs even if the test failed)
```

Anti-pattern — tests chained through shared data:

```text
Test A creates customer → Test B uses customer → Test C deletes customer
```

Document: data factories, API setup, DB setup, seed (read-only) data, unique naming, cleanup, which data is shared
read-only, and how sensitive data is handled (never real PII in test data).

---

## ACCOUNT_STRATEGY.md

For parallel execution, give each worker its own account rather than letting workers collide on one:

```text
Worker 0 → Account 0
Worker 1 → Account 1
Worker N → Account N
```

Document: account pool, worker mapping, reservation/locking, where credentials come from (secret store, never in the
repo), environment mapping, cleanup, expiration. Authenticate once per worker via API and reuse the session state
rather than logging in through the UI in every test.

---

## DATA_CLEANUP.md

- Cleanup is deterministic and belongs to the fixture that created the data.
- Clean up by the **identifiers the test created**, never by broad text matching.
- Tag created data so orphans from crashed runs can be found safely:

```text
AUTOMATION_<runId>_<worker>_<timestamp>
```

- A scheduled sweeper may delete orphaned `AUTOMATION_*` data older than N hours as a safety net — not as the
  primary cleanup.
- Never delete broad production-like data based on weak matching.
- Document which environments allow destructive cleanup.

---

## DATABASE_TESTING.md

Use direct DB access only when justified:

- verify async processing or a side effect with no API/UI surface
- prepare isolated data that has no API
- cleanup
- cross-check report calculations

Avoid DB assertions when user/API-level verification is sufficient. Never couple UI tests to the schema without a
recorded reason.

---

## TEST_ISOLATION.md

Test A must never change Test B's assumptions. Isolation dimensions to document: data, account, browser context,
session, feature flags, environment, time/timezone, external dependencies. Tests never depend on execution order.

---

## PARALLEL_EXECUTION.md

Document: number of workers, which resources are shared, how accounts are assigned, which tests cannot run in
parallel and why. Serial mode is allowed only with a recorded technical reason — never to hide shared-state
problems.

---

## FLAKY_TEST_POLICY.md

Statuses: `PASS`, `FAIL`, `FLAKY`, `QUARANTINED`.

```text
First attempt failed, retry passed → FLAKY (not PASS)
```

Never count a flaky result as a healthy pass. Track per flaky test: flaky rate, root cause, owner, fix ETA.
Quarantine has an owner and an expiry date — a quarantined test that is never fixed is deleted, not kept forever.

Common causes: bad waits, shared data, unstable locator, environment instability, network dependency, race
condition, animation, timezone, parallel collision, test pollution.

---

## RETRY_POLICY.md

| Context | Retries |
|---|---|
| Local | 0 |
| PR | 0 or 1, per policy |
| Nightly | 1, for diagnostics |

Every retry must produce evidence (trace/screenshot of the failed attempt). Never raise the retry count instead of
fixing the root cause.

---

## FAILURE_ANALYSIS.md

Every CI failure captures enough evidence to debug without reproducing locally:

```text
screenshot, video, trace
console logs, network logs, API responses
test data IDs created
environment, commit SHA, browser, worker, retry number
```

Example layout:

```text
artifacts/
└── TC-CONTRACT-015/
    ├── screenshot.png
    ├── trace.zip
    ├── video.webm
    ├── console.log
    ├── network.json
    └── metadata.json
```
