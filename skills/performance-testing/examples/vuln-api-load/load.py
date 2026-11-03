#!/usr/bin/env python3
"""load - a closed-model load generator in Python stdlib, for the method, not for capacity numbers.

    python load.py --base http://127.0.0.1:8765 --vus 8 --duration 10 --p95-ms 50 --error-rate 0.01

N virtual users (closed model: each VU sends the next request only after the previous response) run a mixed
workload against the vuln-api example (security-testing/examples/vuln-api): 60 % GET /orders/{id}, 25 % GET /orders,
15 % POST /orders. Every request records latency and outcome; the run ends with p50/p95/p99, throughput, error
rate, and a verdict against the thresholds given on the command line - the same shape a k6 `thresholds` block or a
JMeter assertion gives, so the report template in references/analysis-and-reporting.md can be filled from it.

Exit 0 when every threshold holds, 1 when one fails, 2 when the target is unreachable or the host is not a test
host (a guard: this script never points at production).

What it does NOT do: it is not a performance tool. Python threads and an in-process stdlib server share one
machine, so absolute numbers mean nothing about the product; the example exists to show workload model, warm-up,
steady-state window, percentiles, thresholds and the verdict rule. Use k6/Gatling/JMeter/Locust for real runs.
"""

from __future__ import annotations

import argparse
import fnmatch
import json
import random
import statistics
import sys
import threading
import time
import urllib.error
import urllib.request
from urllib.parse import urlparse

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

TEST_HOSTS = ["127.0.0.1", "localhost", "*.localhost", "*.test"]


def call(base: str, method: str, path: str, token: str | None = None, body: dict | None = None) -> tuple[int, float, dict | list | None]:
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(base + path, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    t0 = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            raw = r.read()
            return r.status, (time.perf_counter() - t0) * 1000, json.loads(raw) if raw else None
    except urllib.error.HTTPError as e:
        e.read()
        return e.code, (time.perf_counter() - t0) * 1000, None


class Sample:
    __slots__ = ("op", "status", "ms", "at")

    def __init__(self, op: str, status: int, ms: float, at: float) -> None:
        self.op, self.status, self.ms, self.at = op, status, ms, at


def vu(base: str, token: str, order_ids: list[int], stop_at: float, out: list[Sample], lock: threading.Lock, seed: int) -> None:
    rnd = random.Random(seed)
    local: list[Sample] = []
    while time.perf_counter() < stop_at:
        roll = rnd.random()
        if roll < 0.60:
            oid = rnd.choice(order_ids)
            status, ms, _ = call(base, "GET", f"/orders/{oid}", token)
            local.append(Sample("GET /orders/{id}", status, ms, time.perf_counter()))
        elif roll < 0.85:
            status, ms, _ = call(base, "GET", "/orders", token)
            local.append(Sample("GET /orders", status, ms, time.perf_counter()))
        else:
            status, ms, created = call(base, "POST", "/orders", token, {"note": f"load {seed}"})
            local.append(Sample("POST /orders", status, ms, time.perf_counter()))
            if status == 201 and isinstance(created, dict):
                with lock:
                    order_ids.append(created["id"])
    with lock:
        out.extend(local)


def pct(values: list[float], p: float) -> float:
    if not values:
        return 0.0
    s = sorted(values)
    k = max(0, min(len(s) - 1, round(p / 100 * len(s) + 0.5) - 1))
    return s[k]


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--base", default="http://127.0.0.1:8765")
    ap.add_argument("--vus", type=int, default=8)
    ap.add_argument("--duration", type=float, default=10.0, help="seconds of steady state (after warm-up)")
    ap.add_argument("--warmup", type=float, default=2.0, help="seconds discarded at the start")
    ap.add_argument("--p95-ms", type=float, default=50.0)
    ap.add_argument("--error-rate", type=float, default=0.01)
    ap.add_argument("--json", type=str, help="write the raw summary here")
    args = ap.parse_args(argv)

    host = urlparse(args.base).hostname or ""
    if not any(fnmatch.fnmatch(host, p) for p in TEST_HOSTS):
        print(f"REFUSED: {host!r} is not a test host {TEST_HOSTS}")
        return 2
    try:
        status, _, body = call(args.base, "POST", "/auth/login", None, {"username": "alice", "password": "example-password"})
    except (urllib.error.URLError, OSError) as e:
        print(f"UNREACHABLE: {args.base} ({e})")
        return 2
    if status != 200:
        print(f"UNREACHABLE: login answered {status}")
        return 2
    token = body["token"]
    order_ids: list[int] = []
    for i in range(20):                                   # seed data so reads have targets
        s, _, created = call(args.base, "POST", "/orders", token, {"note": f"seed {i}"})
        order_ids.append(created["id"])

    samples: list[Sample] = []
    lock = threading.Lock()
    start = time.perf_counter()
    stop_at = start + args.warmup + args.duration
    threads = [threading.Thread(target=vu, args=(args.base, token, order_ids, stop_at, samples, lock, i)) for i in range(args.vus)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    steady = [s for s in samples if s.at >= start + args.warmup]
    if not steady:
        print("INCONCLUSIVE: no samples in the steady-state window")
        return 2

    lat = [s.ms for s in steady]
    errors = [s for s in steady if s.status >= 500 or s.status == 0]
    summary = {
        "model": "closed", "vus": args.vus, "warmup_s": args.warmup, "steady_s": args.duration,
        "requests": len(steady), "throughput_rps": len(steady) / args.duration,
        "p50_ms": round(pct(lat, 50), 2), "p95_ms": round(pct(lat, 95), 2), "p99_ms": round(pct(lat, 99), 2),
        "max_ms": round(max(lat), 2), "mean_ms": round(statistics.fmean(lat), 2),
        "error_rate": len(errors) / len(steady),
        "by_op": {},
        "thresholds": {"p95_ms": args.p95_ms, "error_rate": args.error_rate},
    }
    for op in sorted({s.op for s in steady}):
        ops = [s.ms for s in steady if s.op == op]
        summary["by_op"][op] = {"n": len(ops), "p95_ms": round(pct(ops, 95), 2), "share": round(len(ops) / len(steady), 2)}

    print(f"closed model | vus={args.vus} | warm-up {args.warmup}s discarded | steady {args.duration}s | "
          f"requests={summary['requests']} | {summary['throughput_rps']:.1f} rps")
    print(f"latency ms: p50 {summary['p50_ms']} | p95 {summary['p95_ms']} | p99 {summary['p99_ms']} | max {summary['max_ms']}")
    for op, v in summary["by_op"].items():
        print(f"  {op:18s} n={v['n']:5d} share={v['share']:.2f} p95={v['p95_ms']}")
    print(f"errors (5xx/transport): {len(errors)} ({summary['error_rate']:.2%})")
    verdict = []
    if summary["p95_ms"] > args.p95_ms:
        verdict.append(f"p95 {summary['p95_ms']} ms > {args.p95_ms} ms")
    if summary["error_rate"] > args.error_rate:
        verdict.append(f"error rate {summary['error_rate']:.2%} > {args.error_rate:.2%}")
    if args.json:
        with open(args.json, "w", encoding="utf-8") as f:
            json.dump(summary, f, indent=1)
    if verdict:
        print("FAIL: " + "; ".join(verdict))
        return 1
    print(f"PASS: p95 <= {args.p95_ms} ms and error rate <= {args.error_rate:.0%} over the steady-state window")
    return 0


if __name__ == "__main__":
    sys.exit(main())
