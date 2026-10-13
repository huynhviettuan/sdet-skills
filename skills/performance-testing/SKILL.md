---
name: performance-testing
description: >
  Plan, script, run, analyze, and report performance tests (load, stress, spike, soak, breakpoint/capacity,
  scalability) for web apps and APIs, in any tool — k6, JMeter, Gatling, Locust, Artillery, NeoLoad, etc. Use this
  skill whenever the user wants to define performance SLOs, build a workload model from production traffic, write
  or review a load-test script, choose open vs closed load models, set up perf tests in CI, interpret results
  (percentiles, throughput, saturation), find a bottleneck, or write a performance test report. Trigger on phrases
  like "load test", "performance test", "stress test", "soak test", "how many users can we handle", "capacity
  planning", "k6 script", "JMeter plan", "p95 latency", "why is it slow under load", "perf regression in CI".
  Examples use k6 with a mapping to other tools; every rule is stated tool-agnostically.
---

# Performance Testing

Answer a specific question about speed, capacity, or stability under load — with numbers that hold up. A
performance test is only as valid as its **objective**, its **workload model**, its **environment**, and the
**evidence** behind its conclusion; the script is the easy part.

**How to use this skill:** follow the workflow below. Load a `references/*.md` file only when you need it:

- [`references/workload-modeling.md`](references/workload-modeling.md) — writing SLOs, choosing the test type,
  deriving load from production data, Little's Law, open vs closed models, think time, journey mix, profile
  shapes, data volume, workload model template.
- [`references/script-design.md`](references/script-design.md) — project structure and layering, checks vs
  thresholds, auth, correlation, test data, naming/tagging, load-generator sizing, a k6 example, a k6/JMeter/
  Gatling/Locust mapping table, and the script review checklist.
- [`references/execution-and-environment.md`](references/execution-and-environment.md) — environment parity,
  stubbing external dependencies, server-side monitoring (RED/USE), run procedure, repeatability and baselines, CI
  stages and gates, safety.
- [`references/analysis-and-reporting.md`](references/analysis-and-reporting.md) — which metrics matter,
  coordinated omission, reading latency/throughput curves, bottleneck triage, symptom → cause table, report
  template, anti-patterns.

## Workflow

### New performance test

1. **Pin the question and the objective.** What decision will this result support (release go/no-go, capacity for
   a launch, regression check)? Write SLOs as percentile + load + error budget. If none exist, measure a baseline
   and raise an open question for the target owner — never invent a target.
2. **Choose the test type** (smoke, load, stress, spike, soak, breakpoint, scalability) from the question.
3. **Build the workload model** from production data: rates per journey, mix, think time, open vs closed, growth
   factor, data volume. Get it approved before scripting.
4. **Write the scripts** in layers (scenario → journey → client → data), SLOs as thresholds, checks on business
   fields, unique/well-distributed data. Review against the script checklist.
5. **Prepare the environment and monitoring**; document differences from production.
6. **Smoke → measured runs** (≥3 for anything decision-making), with server-side metrics on the same clock.
7. **Analyze** steady state per transaction, compare to baseline beyond noise, triage the first bottleneck.
8. **Report** using the template: verdict first, objectives vs results, bottlenecks with evidence, limitations.

### Reviewing an existing perf suite or result

Check the workload model (open/closed, rates, mix, data), the script checklist, environment parity, run count and
variance, and whether conclusions follow from the evidence. Flag any result that relied on averages, a single run, a
saturated generator, or status-only checks as not decision-grade.

## Non-negotiable rules

- **Objectives are percentiles at a stated load with an error budget** — never averages, never "fast".
- **Model the real arrival pattern.** Default to an open (arrival-rate) model for internet-facing systems; a closed
  model hides slowdowns. Record the reason whenever closed is chosen.
- **Every request checks a business outcome**, not just the status code — "fast because it failed" is the most
  common false pass.
- **The load generator must never be the bottleneck.** Monitor it; a run with a saturated generator is invalid.
- **Client results without server-side metrics are symptoms, not diagnosis.** Collect RED/USE on the same clock.
- **Mock only external third parties, with realistic latency.** Keep services you own real.
- **One run is not a result.** Repeat, report spread, call a regression only beyond run-to-run noise.
- **Change one variable per run** when tuning.
- **Never load-test production or a third party without explicit approval**, a window, an owner on call, and
  abort criteria.

## Decision framework

| Question | Rule of thumb |
|---|---|
| Open or closed model? | Open for public web/APIs and service-to-service traffic. Closed only for a genuinely fixed population (internal tool with N operators, fixed worker pool). |
| Users or requests/s? | Specify throughput. Convert "N concurrent users" with Little's Law: N = rate × time-in-system. A user count without think time is meaningless. |
| Think time? | UI journeys: from analytics, randomized. API/arrival-rate tests: none — the rate controls load. |
| Warm or cold system? | Decide from the question: cold for post-deploy/scale-out behavior, warm for steady-state SLOs. State it in the report. |
| Scaled-down environment acceptable? | For relative comparison and bottleneck hunting, yes (state the ratio). For certifying absolute capacity, no. |
| What runs in CI? | PR: short low-load smoke on critical endpoints. Nightly/main: load at target with SLO thresholds + baseline comparison. Stress/soak/spike: scheduled, human-reviewed. |
| Which tool? | The one the team can maintain: language fit, CI integration, distributed execution, reporting. Record as an ADR. |

## Related skills

- **`sdet-automation-docs`** — the automation documentation package; its `PERFORMANCE_TESTING.md` section points
  here for content. Use its ID scheme (`TC-PERF-NNN`) and traceability when perf tests verify acceptance criteria.
- **`sdet-framework-architect`** — the same layering/composition principles apply to perf-test code structure.
