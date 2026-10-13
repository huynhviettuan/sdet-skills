# Script Design

How to structure performance-test code so it stays maintainable and produces trustworthy numbers. Examples are k6
(JavaScript) where code is shown; the [tool mapping](#tool-mapping) translates the concepts to JMeter, Gatling, and
Locust.

Contents:

- [Project structure](#project-structure)
- [Layering](#layering)
- [Checks vs thresholds](#checks-vs-thresholds)
- [Authentication](#authentication)
- [Correlation of dynamic values](#correlation-of-dynamic-values)
- [Test data](#test-data)
- [Naming and tagging](#naming-and-tagging)
- [Error handling](#error-handling)
- [Load generator sizing](#load-generator-sizing)
- [Example](#example)
- [Tool mapping](#tool-mapping)
- [Script review checklist](#script-review-checklist)

---

## Project structure

```text
perf/
├── README.md                  # how to run each test type, required env vars
├── config/
│   ├── environments.<ext>     # base URLs per env — no secrets
│   └── profiles.<ext>         # smoke / load / stress / spike / soak shapes
├── scenarios/                 # one file per test entry point (what to run)
│   ├── checkout-load.<ext>
│   └── api-breakpoint.<ext>
├── journeys/                  # business flows composed from clients (what a user does)
│   ├── browse.<ext>
│   └── checkout.<ext>
├── clients/                   # one per API resource: endpoints, request building, checks
│   ├── auth-client.<ext>
│   └── orders-client.<ext>
├── data/                      # feeders / generators; large files gitignored or generated
└── results/                   # gitignored
```

Same principle as functional automation (see `sdet-framework-architect`): one place per concern, compose rather
than copy. The load profile (how much) is separate from the journey (what) so the same journey runs as smoke, load,
stress, or soak by switching profile only.

---

## Layering

| Layer | Responsibility | Must not |
|---|---|---|
| Scenario | Pick profile + journeys + thresholds for one run | Contain request code |
| Journey | Sequence of business steps, think time, journey-level tags | Build URLs/headers |
| Client | One method per endpoint; URL, headers, body, per-request checks | Know about load profile |
| Data | Supply unique/realistic inputs per VU/iteration | Share mutable state across VUs |
| Config | Environments, profiles, SLO thresholds | Hold secrets |

---

## Checks vs thresholds

- **Check** = per-response assertion (status 200, body has `orderId`). A failing check is counted, it does not stop
  the test.
- **Threshold** = pass/fail criterion on an aggregate metric (p95 < 400 ms, error rate < 0.1 %). Thresholds encode
  the SLOs and decide the run's exit code — they are the CI gate.

Every request needs a check that proves it did the real work: HTTP 200 with an error page or an empty result is
the classic "fast because it failed" trap. Check status **and** a business field.

---

## Authentication

- Authenticate **once per VU** (or use a pre-generated token pool) and reuse the token, unless login itself is the
  journey under test or real users log in on every visit.
- Logging in on every iteration turns a checkout test into an auth-service stress test.
- Refresh tokens before expiry in long soak tests — an expiry mid-run shows up as a sudden error cliff.
- Credentials come from env vars / secret store, never committed.

---

## Correlation of dynamic values

Capture server-generated values (IDs, CSRF tokens, session keys, pagination cursors) from responses and pass them
to later requests. Never hard-code a value recorded once — it either fails or hits one cached record forever.

Recorded scripts (HAR/proxy recordings) are a starting point only: strip static assets the test isn't about,
correlate dynamic values, parameterize data, then rewrite into the client/journey layers.

---

## Test data

- Unique data per VU/iteration where the system enforces uniqueness (emails, order refs):
  `perf_<runId>_<vu>_<iter>`.
- Pre-provision large pools (accounts, products) **before** the run, not inside the measured window.
- Distribute reads across realistic keys (see `workload-modeling.md` → Data volume).
- Tag everything created with the run id so it can be cleaned up after the run in a separate teardown step —
  cleanup traffic must not pollute the measured window.
- Never use real customer PII.

---

## Naming and tagging

Name transactions by business meaning, and group URLs with dynamic segments so results aggregate correctly:

```text
GET /orders/8f3a…  →  name: "GET /orders/:id"     tags: journey=checkout, step=view-order
```

Without grouping, every order id becomes its own metric series and results are unreadable (and some backends run
out of memory).

---

## Error handling

- Don't abort the iteration on the first failed check unless later steps genuinely can't run; record and continue.
- If a step can't continue (no `orderId`), end that iteration cleanly — don't send requests with `undefined` that
  generate misleading 4xx noise.
- Distinguish expected business errors (sold out) from failures in checks, so they don't inflate the error rate.

---

## Load generator sizing

The load generator must never be the bottleneck. Monitor its CPU, memory, and network during every run; above
~70–80 % CPU, results describe the generator, not the system. Scale out to distributed/cloud execution rather than
adding VUs to one saturated machine. Run generators close to (but not on) the system under test, in a region that
matches the user base when network latency is part of the question.

---

## Example

*k6 — client, journey, and scenario layers in one view (split into files per the structure above):*

```js
// clients/orders-client.js
import http from 'k6/http';
import { check } from 'k6';

export class OrdersClient {
  constructor(baseUrl, token) { this.baseUrl = baseUrl; this.token = token; }

  create(cart) {
    const res = http.post(`${this.baseUrl}/orders`, JSON.stringify(cart), {
      headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
      tags: { name: 'POST /orders' },
    });
    check(res, {
      'create order: 201': (r) => r.status === 201,
      'create order: has id': (r) => !!r.json('id'),
    });
    return res.status === 201 ? res.json('id') : null;
  }
}
```

```js
// scenarios/checkout-load.js
import { sleep } from 'k6';
import { profiles } from '../config/profiles.js';
import { login } from '../clients/auth-client.js';
import { checkoutJourney } from '../journeys/checkout.js';

export const options = {
  scenarios: { checkout: { ...profiles.load, exec: 'checkout' } },   // ramping-arrival-rate (open model)
  thresholds: {
    'http_req_duration{name:POST /orders}': ['p(95)<400', 'p(99)<1000'],
    http_req_failed: ['rate<0.001'],
    checks: ['rate>0.999'],
  },
};

export function setup() {
  // token pool built before the measured window (e.g. log in each pre-provisioned account once)
  return { tokens: loginAll(accounts) };
}

export function checkout(data) {
  const token = data.tokens[__VU % data.tokens.length];
  checkoutJourney(token);
  sleep(1 + Math.random());                           // randomized think time
}
```

---

## Tool mapping

| Concept | k6 | JMeter | Gatling | Locust |
|---|---|---|---|---|
| Open model | `*-arrival-rate` executors | Open Model Thread Group / Arrivals TG | `injectOpen(...)` | `constant_throughput` wait / custom shape |
| Closed model | `*-vus` executors | Thread Group | `injectClosed(...)` | Users + `wait_time` |
| Per-request assertion | `check()` | Assertions | `.check(...)` | `response.failure()` / `catch_response` |
| SLO pass/fail | `thresholds` | Plugins / post-processing (e.g. APDEX, CI script) | `assertions(...)` | `--exit-code-on-error`, custom event hook |
| Correlation | `res.json()` / regex → variable | Extractors (JSON/Regex) | `.saveAs(...)` | Python vars |
| Data feeder | `SharedArray` | CSV Data Set Config | `feed(csv(...))` | Python iterators / queue |
| Grouping dynamic URLs | `tags: { name }` | Sampler name | `.name(...)` / request name | `name=` argument |
| Profile shapes | `stages` / scenarios | Thread group schedule / plugins | injection steps | `LoadTestShape` |

Pick the tool the team can maintain (language fit, CI, distributed execution, reporting) and record the choice as an
ADR.

---

## Script review checklist

```text
[ ] Workload model documented and matched by the scenario (open/closed, rates, mix)
[ ] Profile separate from journey; same journey reusable across test types
[ ] Every request checks status AND a business field
[ ] SLOs encoded as thresholds; thresholds evaluate steady state
[ ] Auth once per VU / token pool, unless login is the subject
[ ] Dynamic values correlated; no hard-coded recorded IDs
[ ] Unique / well-distributed data; no hot single key unless intended
[ ] Data pre-provisioned outside the measured window; cleanup by run id afterwards
[ ] Dynamic URL segments grouped under one transaction name
[ ] Randomized think time (or none, deliberately, for API arrival-rate tests)
[ ] No secrets in code
[ ] Smoke run passes before any heavier run
```
