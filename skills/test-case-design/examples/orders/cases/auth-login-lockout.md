# Test cases — Login and lockout (FR-AUTH-001)

Feature: [FR-AUTH-001](../../../../project-docs/examples/orders-docs/docs/features/FR-AUTH-001-login.md).
Covers: AC-AUTH-001..005; BR-AUTH-001, BR-AUTH-002, BR-AUTH-003.
Techniques: equivalence partitioning (known vs unknown username, right vs wrong password), boundary value analysis
on the failed-attempt count (4 / 5 / 6, limit 5), state transition on the login-attempt counter (open / locked).
Design tables: [design-tables.md](../design-tables.md#login-and-lockout). Designed 2026-11-03; no case has run.

Users are the package's example users (`specs/seed-data.json`); the shared example password lives in the reference
server and is not repeated here. "probe-<run id>" is a username generated per run and never seeded.

| Item | Covered by |
|---|---|
| Partitions: known user + right password / known + wrong / unknown | TC-AUTH-001, TC-AUTH-002, TC-AUTH-003 |
| Failed-attempt count 4 / 5 / 6 | TC-AUTH-004 |
| Counter state locked x correct password | TC-AUTH-006 |
| Counter is per username | TC-AUTH-005 |
| Window 59 / 60 / 61 s | not designed: needs a controllable clock, proposed OQ-009 (coverage.md) |

---

## TC-AUTH-001 — A seeded user with the correct password gets a token that authorizes GET /orders

Verifies:   AC-AUTH-001, BR-AUTH-003, FR-AUTH-001
Basis:      specified
Technique:  Equivalence partitioning, partition "known username + correct password"
Priority:   P0
Smoke:      yes
Type:       Functional, positive
Level:      api

Preconditions:
- alice is seeded and has no failed login in the last 60 s

Test data:
- username: alice — the "known username" partition
- password: the shared example password — the "correct password" partition

Steps:
1. Post alice's username and correct password to POST /auth/login.
2. Call GET /orders with the returned token.

Expected results:
1. The login answers 200 and the body carries a non-empty `token`.
   Evidence: “A seeded user who posts the correct password to POST /auth/login receives 200 and a token” — AC-AUTH-001
2. GET /orders with that token answers 200 with a JSON array (the token is accepted).
   Evidence: “a token that authorizes GET /orders for the next 60 minutes” — AC-AUTH-001

---

## TC-AUTH-002 — A known username with a wrong password gets the generic 401 and no token

Verifies:   AC-AUTH-002, BR-AUTH-001
Basis:      specified
Technique:  Equivalence partitioning, partition "known username + wrong password"
Priority:   P1
Type:       Functional, negative
Level:      api

Preconditions:
- alice is seeded and has no failed login in the last 60 s

Test data:
- username: alice — "known username"
- password: "wrong-password-example" — "wrong password" partition (example value)

Steps:
1. Post alice's username and the wrong password to POST /auth/login.

Expected results:
1. The answer is 401 and the body is exactly {"error": "invalid credentials"}, with no `token` field.
   Evidence: “A known username with a wrong password answers 401 with the body {"error": "invalid credentials"}.” — AC-AUTH-002

---

## TC-AUTH-003 — An unknown username gets the same status and body as a wrong password

Verifies:   AC-AUTH-003, BR-AUTH-001
Basis:      specified
Technique:  Equivalence partitioning, partition "unknown username"
Priority:   P1
Type:       Security, negative (account enumeration)
Level:      api

Preconditions:
- "probe-<run id>" is not a seeded user

Test data:
- username: probe-<run id> — "unknown username"
- reference answer: the status and body of TC-AUTH-002's step, taken in this case's own setup for alice

Steps:
1. Post a wrong password for alice to POST /auth/login and keep status and body (reference).
2. Post any password for probe-<run id> to POST /auth/login.

Expected results:
1. Step 2 answers 401 and its body is byte-for-byte equal to the reference body {"error": "invalid credentials"}.
   Evidence: “An unknown username answers 401 with exactly the same status and body as a wrong password.” — AC-AUTH-003
2. No field, status or header value in step 2 differs from the reference except `Date`.
   Evidence: “nothing in status, body, headers or timing distinguishes them” — BR-AUTH-001

---

## TC-AUTH-004 — The fifth failed login answers 401 and the sixth answers 429 with Retry-After: 60

Verifies:   AC-AUTH-004, BR-AUTH-002
Basis:      specified
Technique:  Boundary value analysis on the failed-attempt count, values 4 / 5 / 6 around the limit 5; state transition open -> locked
Priority:   P0
Type:       Security, negative
Level:      api  (the username is unique per run, so the lockout touches no shared user and the case runs in parallel)

Preconditions:
- probe-<run id> has no failed login in the last 60 s (true by construction: the name is new)

Test data:
- username: probe-<run id> — failures count per submitted username, known or not (BR-AUTH-001 Audit line)
- attempt 4 — just below the limit; attempt 5 — on the limit; attempt 6 — just above it

Steps:
1. Post a wrong password for probe-<run id> six times within 60 s, keeping each answer.

Expected results:
1. Attempts 1 to 5 each answer 401 with the body {"error": "invalid credentials"}; attempt 4 and attempt 5 are checked explicitly.
   Evidence: “The fifth failed login for one username within 60 seconds answers 401” — AC-AUTH-004
2. Attempt 6 answers 429 with the header Retry-After: 60 and the body exactly {"error": "too many attempts"}.
   Evidence: “the sixth answers 429 with the header Retry-After: 60 and the body {"error": "too many attempts"}.” — AC-AUTH-004

---

## TC-AUTH-005 — A locked username does not lock another username, which still logs in with 200

Verifies:   AC-AUTH-005, BR-AUTH-002
Basis:      specified
Technique:  Equivalence partitioning, partition "another username" while one username is locked
Priority:   P1
Type:       Functional, negative isolation
Level:      api

Preconditions:
- probe-<run id> has 5 failed logins in the last 60 s (locked), created in this case's setup
- erin is seeded and has no failed login in the last 60 s

Test data:
- locked username: probe-<run id>; other username: erin with the correct password

Steps:
1. Post erin's username and correct password to POST /auth/login.

Expected results:
1. The answer is 200 with a non-empty `token`, and GET /orders with it answers 200.
   Evidence: “Five failed logins for one username do not lock another username, which still logs in with 200.” — AC-AUTH-005

---

## TC-AUTH-006 — A locked seeded user is refused with 429 even with the correct password

Verifies:   AC-AUTH-004, BR-AUTH-002
Basis:      specified
Technique:  State transition, counter state "locked" x event "correct password"
Priority:   P0
Type:       Security, negative
Level:      api
Exclusive:  yes — locks the seeded user bob for 60 s; any case logging in as bob in that minute would fail

Preconditions:
- bob is seeded and has 5 failed logins in the last 60 s (locked), created in this case's setup
- Teardown (hook): wait until a login for bob stops answering 429, polling no faster than the Retry-After value

Test data:
- username: bob; password: the shared example password — the "correct password" partition

Steps:
1. Post bob's username and correct password to POST /auth/login.

Expected results:
1. The answer is 429 with the header Retry-After: 60 and the body exactly {"error": "too many attempts"}; the body carries no `token`.
   Evidence: “before the password is checked” — BR-AUTH-002
