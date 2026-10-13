# Workload Modeling

How to turn business expectations and production data into objectives and a load model that a test can reproduce.
A test with the wrong workload model produces precise numbers about the wrong question.

Contents:

- [Performance objectives (SLOs)](#performance-objectives-slos)
- [Test types](#test-types)
- [Deriving load from production data](#deriving-load-from-production-data)
- [Open vs closed workload model](#open-vs-closed-workload-model)
- [Think time and pacing](#think-time-and-pacing)
- [Journey mix](#journey-mix)
- [Load profile shapes](#load-profile-shapes)
- [Data volume](#data-volume)
- [Workload model template](#workload-model-template)

---

## Performance objectives (SLOs)

Every objective is measurable and names a percentile, a load level, and an error budget. "The system should be
fast" is not an objective.

```text
POST /orders
  p95 latency  ≤ 400 ms
  p99 latency  ≤ 1 s
  error rate   < 0.1 %
  at           120 requests/s sustained for 30 min
  environment  perf (production-sized)
```

Sources, in priority order: contractual SLA → product SLO → production baseline (current p95 at current peak) →
industry heuristics (last resort, mark as ASSUMPTION). If no objective exists, the first deliverable is a baseline
measurement plus an OPEN QUESTION asking who owns the target — not an invented number.

Never use averages as objectives: one 30 s outlier and ninety-nine 50 ms requests average to ~350 ms, which
describes nobody's experience.

---

## Test types

| Type | Question it answers | Shape | Typical duration |
|---|---|---|---|
| Smoke | Does the script work and is the system up? | 1–5 VUs / a few req/s | 1–2 min |
| Load (average / peak) | Do we meet SLOs at expected load? | Ramp to target, hold | 15–60 min hold |
| Stress | How does it degrade beyond peak, and does it recover? | Step up past peak, then back down | 30–60 min |
| Spike | Does it survive a sudden burst (sale, push notification)? | Near-instant jump, short hold, drop | 10–20 min |
| Soak / endurance | Leaks, connection/handle exhaustion, log/disk growth over time? | Normal load, long hold | 2–12 h |
| Breakpoint / capacity | Where is the ceiling? | Slow continuous ramp until SLO breach or errors | Until break |
| Scalability | Does adding instances add proportional capacity? | Same load test at N, 2N instances | Per config |

Pick the type from the question being asked. Run a smoke test before every other type.

---

## Deriving load from production data

Use real traffic data (APM, access logs, analytics, gateway metrics), not guesses:

1. Find the **peak window** (e.g. the busiest 15 min of the busiest day in the last 1–3 months).
2. Measure **requests/s per endpoint** (or transactions/s per business journey) in that window.
3. Apply a **growth factor** agreed with the business (e.g. ×1.5 for next season, ×3 for a launch).
4. Record the factor and its source — it's a decision, not a fact.

**Little's Law** links concurrency, throughput, and time:

```text
concurrent users (N) = arrival rate (λ) × time each user spends in the system (W)

e.g. 10 journeys/s × 60 s per journey (incl. think time) = 600 concurrent users
```

Use it to sanity-check a requested "1000 concurrent users": without the time-in-system it says nothing about
throughput.

---

## Open vs closed workload model

| | Closed model | Open model |
|---|---|---|
| Driver | Fixed number of virtual users, each loops | Fixed arrival rate of new iterations/requests |
| When system slows down | Users wait → offered load **drops** (hides the problem) | Arrivals keep coming → queue builds (real behavior) |
| Matches | Internal tools, fixed worker pools, call centers | Public web/APIs — users don't wait for each other |
| k6 executor | `constant-vus`, `ramping-vus` | `constant-arrival-rate`, `ramping-arrival-rate` |

**Default to the open model for internet-facing systems.** A closed model under-reports latency during
slowdowns (coordinated omission, see `analysis-and-reporting.md`). Choose closed only when the real population is
genuinely fixed, and record why.

---

## Think time and pacing

- **Think time** = pause between steps inside a journey, modeling a human reading/typing. Take it from analytics
  (median time between page views) and randomize it (e.g. uniform ±30 %) so users don't synchronize.
- **Pacing** = target duration of one full iteration in a closed model, used to hit a throughput target.
- API-only / service-to-service load usually has **no** think time; model it as an arrival rate instead.
- Zero think time with a closed model turns 100 "users" into 100 tight loops — that's a stress test, not a user
  simulation. Be explicit about which one you're running.

---

## Journey mix

Real traffic is a mix. Model journeys at their production proportions:

| Journey | Share | Steps |
|---|---:|---|
| Browse catalog | 60 % | home → search → product |
| Add to cart | 25 % | product → add → cart |
| Checkout | 10 % | cart → address → pay → confirm |
| Account | 5 % | login → orders |

Run each journey as its own scenario with its own rate so the mix stays fixed regardless of response times. Tag
every request with its journey and step for per-transaction results.

---

## Load profile shapes

```text
Load:         ramp-up ──► hold at target ──► ramp-down
Stress:       step 50% → 100% → 150% → 200% (hold each), then step back down to check recovery
Spike:        baseline → jump to 5–10× in seconds → short hold → back to baseline
Soak:         ramp-up → long hold at normal load
Breakpoint:   slow linear ramp, no hold, stop on SLO breach/error threshold
```

- Ramp up gradually (minutes, not seconds) unless spike behavior is the subject; it lets autoscaling, caches, and
  connection pools behave realistically and makes the knee visible.
- Exclude warm-up/ramp from SLO evaluation — evaluate the steady-state hold window only.

---

## Data volume

Performance depends on data shape as much as on load:

- Database sized like production (row counts, index sizes, distribution of hot/cold keys). A 1 000-row table
  performs nothing like a 50 M-row one.
- Test data spread across realistic keys — 1 000 VUs all reading product #1 tests the cache, not the system.
- Payload sizes representative (file uploads, large carts, long search terms).

---

## Workload model template

```md
# Workload Model — <system / release>

## Objectives
| Transaction | p95 | p99 | Error rate | At load |
|---|---|---|---|---|

## Source Data
Window: <date range, peak period>
Source: <APM / logs / analytics>
Growth factor: ×<n> — decided by <who>, <date>

## Model
Type: open | closed (reason)
Journeys:
| Journey | Rate / share | Think time | Data |
|---|---|---|---|

## Profile
Ramp-up: <duration>
Hold: <duration> at <rate>
Ramp-down: <duration>

## Assumptions / Open Questions
- ...
```
