# Analysis and Reporting

Reading results correctly, finding the bottleneck, and reporting so a decision can be made.

Contents:

- [Metrics that matter](#metrics-that-matter)
- [Coordinated omission](#coordinated-omission)
- [Reading the curves](#reading-the-curves)
- [Bottleneck triage](#bottleneck-triage)
- [Common symptoms](#common-symptoms)
- [Report template](#report-template)
- [Anti-patterns](#anti-patterns)

---

## Metrics that matter

| Metric | Use | Watch out |
|---|---|---|
| Latency percentiles (p50, p95, p99, max) | SLO evaluation, tail behavior | Never average percentiles across runs/instances — merge histograms or report per source |
| Throughput (req/s, transactions/s) | Did we actually deliver the target load? | Achieved vs target: if achieved < target, the test didn't test the target |
| Error rate (by type and status) | Correctness under load | Include failed checks, not only transport/HTTP errors |
| Saturation (CPU, pools, queues) | Explains latency | Utilization near 100 % isn't the failure — queuing is |
| Apdex (optional) | Single stakeholder-friendly score | Hides tails; never the only metric |

Read latency and throughput **together**: latency that stays flat while throughput plateaus below target means
the system or generator stopped accepting more work.

Evaluate the steady-state window only (exclude ramp-up/down), per transaction (tagged name), not one global
number.

---

## Coordinated omission

In a closed model, when the system stalls, virtual users wait instead of sending — so the slowest period produces
the *fewest* samples and the percentiles look better than reality. Defences:

- Use an open (arrival-rate) model for systems whose users don't wait for each other.
- Check that achieved arrival rate matched the target; a drop during a stall is the signature.
- Tools that record intended vs actual send time (HDR histogram with correction) can correct for it.

---

## Reading the curves

```text
latency
  │                              ╱  ← past the knee: queues grow, latency climbs steeply
  │                           ╱
  │                       _╱   ← knee: practical capacity
  │  ___________________╱
  │                              
  └──────────────────────────────── throughput / load
```

- **Practical capacity** is the load at the knee, not the load where errors start. Plan operating load below it
  with headroom (e.g. 60–70 % of the knee).
- **Stress recovery**: after load drops, latency and error rate must return to baseline. If not, something is
  stuck (leaked connections, poisoned cache, circuit breaker that never closes).
- **Soak**: a steadily rising memory/handle/latency line under constant load means a leak, even if every SLO
  passed in the first hour.

---

## Bottleneck triage

Work top-down from the first resource to saturate, correlating timestamps:

```text
1. Was the load generator healthy?                 → if not, result invalid; re-run
2. Did achieved load match target?                 → if not, find what limited it
3. When did latency/errors start rising?           → mark that timestamp
4. Which resource saturated first at that time?    → CPU, memory/GC, pool, DB, network, dependency
5. Which transactions degraded first?              → their shared dependency is the suspect
6. Trace a slow request end to end (APM/tracing)   → where is the time spent?
7. Form a hypothesis, change one thing, re-run     → never change two things in one run
```

Fix the first bottleneck and re-test — the next one is only visible once the first is gone.

---

## Common symptoms

| Symptom | Likely causes |
|---|---|
| Latency rises with load, CPU low | Lock contention, connection/thread pool exhausted, slow dependency, synchronous I/O |
| CPU pegged at modest load | Inefficient code path, serialization, regex, missing cache, excessive logging |
| Periodic latency spikes | GC pauses, cron/batch job, cache expiry stampede, autoscaling events |
| Errors start abruptly at a load level | Pool/limit hit (DB connections, file handles, rate limiter), timeouts |
| Gradual degradation over hours | Memory/connection leak, unbounded cache/queue, log/disk growth |
| Good p95, terrible p99/max | Retries, cold paths, noisy neighbor, GC, one slow shard/key |
| Fine on first run, worse on repeats | Data growth between runs, no cleanup, fragmented indexes |
| Suspiciously fast | Errors returned quickly, cache serving one key, wrong environment — check the checks |

---

## Report template

Lead with the decision; put detail after it.

```md
# Performance Test Report — <system> <release> — <date>

## Verdict
PASS / FAIL / PASS WITH RISKS — one paragraph a non-engineer can act on.

## Objectives vs Results (steady state)
| Transaction | Target p95 | Actual p95 | Target p99 | Actual p99 | Error rate | Throughput (target / achieved) | Status |
|---|---|---|---|---|---|---|---|

## Comparison to Baseline
| Transaction | Baseline p95 | This run p95 | Δ | Beyond noise? |
|---|---|---|---|---|

## Capacity (if stress/breakpoint)
Knee at: <rate>. Errors from: <rate>. Recommended max operating load: <rate>.

## Bottlenecks Found
1. <resource> saturated at <time/load> — evidence — impact — recommendation — owner

## Test Setup
Workload model: <link>   Test type/profile: <...>   Runs: <n, spread>
Environment: <name, version, commit>   Differences from production: <list>
Data volume: <...>   Stubs: <which dependencies, latency used>

## Risks and Limitations
- what this test does NOT prove

## Raw Data
<links to results, dashboards for the exact time window, run ids>
```

---

## Anti-patterns

| Anti-pattern | Instead |
|---|---|
| Reporting averages | Percentiles per transaction |
| "1 000 users" with no rate or think time | Arrival rate or users + time-in-system (Little's Law) |
| Closed model for a public site | Open model; record why if closed |
| One run, one number | ≥3 runs, median + spread, compare to baseline beyond noise |
| Status-code-only checks | Check a business field too |
| Login every iteration | Auth once per VU / token pool |
| All VUs hit the same record | Realistic key distribution |
| Tiny test database | Production-like data volume |
| Ignoring load generator health | Monitor it; invalidate saturated runs |
| Client metrics only | Correlate with server RED/USE metrics |
| Stubbing your own services | Stub only third parties at the boundary |
| Tuning several things between runs | One change per run |
| Testing production unannounced | Approved window, owner on call, abort criteria |
| Pass/fail only in CI | Trend dashboard across builds |
