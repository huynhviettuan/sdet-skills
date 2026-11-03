# Wait Strategy — Orders

Snapshot: 2026-11-03. No fixed sleep anywhere in the suite. Orders is synchronous: every rule takes effect in the
response to the request that triggers it (the store runs transitions, id allocation and the open-order count under
one lock, DEFINITION_OF_DONE.md of the product), so most tests need no wait at all.

## Signals, by situation

| Situation | Wait on | Never |
|---|---|---|
| Server ready at session start | `GET /orders` answering 401 without a token (a known, cheap response) polled with a deadline | a startup sleep |
| Effect of a write | the write's own response, then a re-read (AC-ORD-020 "returned and re-read note") | a sleep "to let it persist" |
| Audit entry after a denial | read `GET /_audit` once after the denied request; BR-AUD-001 writes it in the same request | polling as if it were asynchronous; if a future build makes audit asynchronous, poll with a deadline and record the maximum delay here |
| Concurrent `pay` (TC-ORD-037) | both responses (a barrier releases the two requests together; the test joins both) | sleeping between them |
| Lockout window, 60 s (BR-AUTH-002) | a controllable clock (OQ-A-002) | `time.sleep(60)` |
| Cancellation window, 24 h (AC-ORD-034) | a controllable clock (OQ-A-002) | waiting; until the clock exists the case is BLOCKED |
| Token expiry, 60 min (AC-AUTH-007) | a token built with `exp` in the past (reference test `test_expired_token_rejected`) | waiting for a real token to expire |

## Enforcement

- `audit-suite.mjs --fail-on block` fails `R-NO-SLEEP` (`time.sleep`, `wait_for_timeout`, `from time import
  sleep`) in tests, fixtures and framework code; it allows the bounded poll interval only inside a `wait.py` module
  (the template's `src/qa/ui/wait.py`).
- `guard-hooks.mjs pre-edit` blocks an edit that adds `time.sleep` or `asyncio.sleep`.
- A remaining fixed wait needs an inline comment with the technical reason and an OQ-A or issue id to remove it.
  There is none today.

## Timeouts

Each HTTP call has a client timeout (the reference client uses 5 s); a timeout is reported as an error with the
request named, never retried silently. Values are Assumption (example) until the PR budget is measured (OQ-A-009).
