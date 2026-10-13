# Execution and Environment

Running a performance test so the result is valid, repeatable, and comparable — and wiring it into CI.

Contents:

- [Environment](#environment)
- [External dependencies](#external-dependencies)
- [Monitoring during the run](#monitoring-during-the-run)
- [Run procedure](#run-procedure)
- [Repeatability and baselines](#repeatability-and-baselines)
- [CI integration](#ci-integration)
- [Safety](#safety)

---

## Environment

Results transfer to production only to the degree the environment resembles production. Document the differences
explicitly in every report.

| Dimension | Match production? |
|---|---|
| Instance types / CPU / memory | Same type; count may be scaled down with a stated ratio |
| Autoscaling rules | Same rules, or disabled with the reason stated |
| Database engine, version, config, data volume | Same |
| Caches (CDN, app, DB) | Same config; decide warm vs cold deliberately |
| Network topology (LB, gateways, service mesh) | Same |
| Feature flags | Same as the release being tested |
| Logging / tracing level | Same (debug logging distorts results) |

A scaled-down environment can find **relative** regressions and bottlenecks; it cannot certify absolute production
capacity. Say which one a given test claims.

Isolation: no other load test, batch job, or deployment running on shared components during the measured window.
Book the environment.

---

## External dependencies

Mock only at the external boundary (payment provider, SMS, third-party APIs you don't own), with a stub that
returns realistic latency (a distribution, not 0 ms) and realistic error rates. Never load-test a third party's
production without their written agreement. Internal services you own stay real — stubbing them hides the
bottlenecks you're looking for.

---

## Monitoring during the run

Collect server-side metrics alongside client-side results, on the same clock, at ≤10 s resolution:

- **RED** per service: Rate, Errors, Duration (percentiles).
- **USE** per resource: Utilization, Saturation, Errors — CPU, memory, disk I/O, network, and pools (DB
  connections, thread pools, queue depth, file handles).
- Runtime internals: GC pauses/frequency, heap, event-loop lag.
- Database: slow queries, lock waits, connection count, cache hit ratio, replication lag.
- Autoscaling events and pod/instance restarts.
- Load generator CPU/memory/network.

Client-side numbers say *that* it's slow; server-side numbers say *why*. A report without them can only describe
symptoms.

---

## Run procedure

```text
1. Confirm environment state: version deployed, flags, data volume, nothing else running
2. Pre-provision test data / token pools
3. Smoke run (1–5 VUs) — scripts work, checks pass, monitoring receives data
4. Optional warm-up (if the question is warm-system performance)
5. Measured run per profile
6. Capture: client results, dashboards/screenshots for the window, logs of errors, environment manifest
7. Cleanup test data by run id (outside the measured window)
8. Record the run in the run log (id, commit, env, profile, outcome)
```

Abort criteria, decided before starting: error rate above X %, a dependency alarm firing, load generator
saturated, or impact on a shared environment.

---

## Repeatability and baselines

- Run each important configuration **at least 3 times**; report the median run and the spread. A single run can't
  distinguish a regression from noise.
- Keep a **baseline** per test (last accepted result on the main branch / last release) and compare like with like:
  same profile, environment, data volume.
- Treat a change as a regression only when it exceeds the observed run-to-run variance (e.g. p95 +10 % beyond noise
  band), not on any increase.
- Store raw results (not just summaries) so later questions can be answered without re-running.

---

## CI integration

| Stage | Test | Gate |
|---|---|---|
| Pull request | Perf smoke on changed critical endpoints (1–2 min, low load) | Script works; thresholds generous; catches gross regressions (N+1 query, missing index) |
| Main / nightly | Load test at target on the perf environment | SLO thresholds + regression vs baseline |
| Weekly / pre-release | Stress, spike, soak, breakpoint | Report reviewed by a human; capacity numbers recorded |

- Threshold failure → non-zero exit code → pipeline fails. Thresholds come from the SLO file, not hard-coded per
  pipeline.
- Publish results to a time-series store or dashboard so trends across builds are visible; a single run's
  pass/fail hides slow drift.
- Never run full load tests against shared environments from every PR.

---

## Safety

- Never point a load test at production without explicit approval, a time window, an owner on call, and abort
  criteria. Prefer a production-like environment.
- Rate-limit and WAF rules may block or skew traffic; agree on an allowlist rather than disabling protection.
- Cloud load generators cost money per VU-hour — set a maximum duration on every run.
- Tell the teams owning shared dependencies before stress/spike tests.
