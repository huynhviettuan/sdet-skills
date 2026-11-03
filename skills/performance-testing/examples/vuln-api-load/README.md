# Load example — closed model against vuln-api, with a report

A runnable illustration of the skill's method (workload model, warm-up, steady-state window, percentiles,
thresholds, verdict, report) against the `security-testing/examples/vuln-api` server, in Python stdlib so it runs
anywhere. **It is not a performance tool and its numbers say nothing about any product**: the client and the
server share one machine and one interpreter. Real runs use k6, Gatling, JMeter or Locust
(`references/script-design.md`); the report structure is the same.

```bash
python skills/security-testing/examples/vuln-api/app.py 8771 &
python skills/performance-testing/examples/vuln-api-load/load.py --base http://127.0.0.1:8771 --vus 8 --duration 10 --p95-ms 50 --error-rate 0.01 --json run.json
```

`load.py` refuses any host outside `127.0.0.1`, `localhost`, `*.localhost`, `*.test` (exit 2) — the environment guard
every writing suite carries.

## Run on 2026-11-03 (Windows 11, Python 3.14, one laptop; see `run-2026-11-03.json`)

```text
closed model | vus=8 | warm-up 2.0s discarded | steady 10.0s | requests=14184 | 1418.4 rps
latency ms: p50 3.26 | p95 8.52 | p99 20.46 | max 2026.13
  GET /orders        n= 3495 share=0.25 p95=8.93
  GET /orders/{id}   n= 8560 share=0.60 p95=8.43
  POST /orders       n= 2129 share=0.15 p95=8.01
errors (5xx/transport): 0 (0.00%)
PASS: p95 <= 50.0 ms and error rate <= 1% over the steady-state window
```

## The report, filled from that run (template: `references/analysis-and-reporting.md`)

**Verdict**: PASS against the stated objectives (p95 ≤ 50 ms, error rate ≤ 1 %) in the steady-state window.

**Objectives vs results (steady state, 10 s, 8 VUs closed)**

| Objective | Result | Status |
|---|---|---|
| p95 ≤ 50 ms | 8.52 ms | pass |
| error rate ≤ 1 % | 0.00 % (0 / 14 184) | pass |
| workload mix 60/25/15 | 0.60 / 0.25 / 0.15 | as modelled |

**Reading the curves**: p50 3.3 ms, p95 8.5 ms, p99 20 ms, **max 2 026 ms**. A single ≈2 s outlier in 14 184
requests is not noise to average away — it is the one number in this run worth a question. On a single machine the
usual suspects are a TCP connection-establishment retry (the client opens a new connection per request; Windows
retransmits SYN after ~1–2 s when the listen backlog is momentarily full) or a GC pause in the server thread pool.
Which one it is, this run cannot say: no server-side metrics were collected. In a real report that is a
*Bottlenecks found* entry with "unknown — needs connection reuse in the client and server GC/backlog metrics", not a
pass by omission.

**Comparison to baseline**: none — first run. The JSON is the baseline for the next.

**Capacity**: not measured (no stress/breakpoint stage); 1 418 rps is what 8 closed-loop clients on one machine
produced, not a limit of anything.

**Test setup**: closed model, 8 VUs, think time 0, 2 s warm-up discarded, 10 s steady state, 20 seeded orders plus
the ones the run creates; server `vuln-api` secure mode in-process `ThreadingHTTPServer`; same machine as the client.

**Risks and limitations**: client and server share CPU; Python threads serialise on the GIL; no coordinated-omission
correction (closed model under-reports latency when the server stalls — `references/analysis-and-reporting.md`
§ Coordinated omission); one run, no repeat; thresholds chosen for the example, not from an SLO.

**Raw data**: `run-2026-11-03.json`.

## What to take from it

- The verdict comes from **thresholds stated before the run** and a **steady-state window**, never from eyeballing.
- Per-operation percentiles and the mix share show the workload model was honoured.
- The max is reported and questioned, not hidden behind the mean.
- "Ran once on 2026-11-03" is the strongest claim this example makes; nothing re-runs it in CI (a load run in CI
  would measure the runner, not the product).
