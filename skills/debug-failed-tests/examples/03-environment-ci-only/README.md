# 03 — Environment, CI only: a stale API root in the CI environment file

Every API test fails on the CI job and passes on a laptop. Every number below comes from
[`evidence.txt`](evidence.txt) (real runs on 2026-11-03 against the live Petstore and TodoMVC demo).
[`defect.diff`](defect.diff) introduced the bug and [`fix.diff`](fix.diff) removes it.

**The defect.** The framework loads `.env.${TEST_ENV ?? 'dev'}` with override, then `.env` without override
(`src/constants/config.constant.ts`). The CI job sets `TEST_ENV=ci`. The defect adds a `.env.ci` whose `API_DOMAIN`
points at an `/api/v2` root of the public Petstore that answers 404 (measured below). The spec's server is
`/api/v3`. Locally `TEST_ENV` is unset, `.env.dev` does not
exist, and `.env` (with `/api/v3`) is used. The test code is identical on both sides.

Contents:

- [1. Evidence](#1-evidence)
- [2. Classify](#2-classify)
- [3. Reproduce](#3-reproduce)
- [4. Root cause](#4-root-cause)
- [5. Fix](#5-fix)
- [6. Prove the fix](#6-prove-the-fix)
- [7. Route: the environment ticket](#7-route-the-environment-ticket)

## 1. Evidence

From the CI-like run, `TEST_ENV=ci … --workers=4` (`ci-suite-w4.txt`), before any re-run:

| Item | What it says |
|---|---|
| Counts | 7 failed, 7 passed |
| Which failed | All 7 API tests: TC-PET-001, TC-PET-002, the three TC-PET-003 rows, TC-PET-006, TC-PET-007 |
| Which passed | All 6 UI tests and the sentinel (expected to fail, and failed on its known-false value) |
| Signature | One message for all 7: `Error: Precondition failed: addPet returned 404`, at `src/fixtures/data-fixtures.ts:45` |
| Top frame | `petFactory.create`, the setup call, before any test step ran |
| Same suite, `TEST_ENV` unset | 14 passed (`local-suite-w4.txt`) |

Cluster first ([`triage-and-evidence.md` § Many failures at once](../../references/triage-and-evidence.md#many-failures-at-once)):
seven failures, one normalized signature, one area (`tests/api`), one setup call. They are **one cause, not seven**.
The factory's precondition guard (fail with the status, instead of continuing with an undefined pet) is why the
signature is readable at all.

## 2. Classify

The signals ([`triage-and-evidence.md` § Signals per category](../../references/triage-and-evidence.md#signals-per-category))
are *only in CI* and *failures begin with 4xx/5xx on setup calls*. Both point at **environment**.

```text
Observation: every API test fails in setup with addPet 404, only when TEST_ENV=ci; UI tests unaffected
H1: product bug (POST /pet broken)          -> refuted: the same suite passes 14/14 with TEST_ENV unset, minutes apart
H2: test or framework bug                   -> refuted: identical code on both sides; only the environment selection differs
H3: environment difference (config drift)   -> supported: TEST_ENV=ci selects .env.ci, whose API_DOMAIN differs from .env
```

Category: **environment (config drift)**. The owner is whoever owns the CI environment file, not the test author.

## 3. Reproduce

Rung 6 of [the ladder](../../references/reproduction.md#the-ladder), changing **one** dimension at a time
([`reproduction.md` § CI-only failures](../../references/reproduction.md#ci-only-failures)):

| Run | Dimension changed | Result |
|---|---|---|
| Full suite, `TEST_ENV` unset | none (local) | 14 passed |
| Full suite, `TEST_ENV=ci` | environment file | **7 failed, 7 passed** |
| TC-PET-001, `TEST_ENV` unset | none | 1 passed |
| TC-PET-001, `TEST_ENV=ci` | environment file | **1 failed** (`addPet returned 404`) |
| TC-PET-001, `TZ=UTC LOCALE=vi-VN`, `TEST_ENV` unset | timezone and locale | 1 passed |

Changing the environment file alone reproduces it, deterministically, at rung 1 (one test). Timezone and locale
were ruled out with one run. The ticket below needs the failing call outside the test runner too, so the same GET
was sent to both API roots (`probe-curl.txt`):

```text
GET /api/v2/pet/findByStatus?status=available -> 404 application/json
GET /api/v3/pet/findByStatus?status=available -> 200 application/json
```

## 4. Root cause

> On the CI job, `TEST_ENV=ci` loads `.env.ci`, and its `API_DOMAIN` points at the Petstore's `/api/v2` root, which
> answers 404. Every API test fails in `petFactory.create` before its first step, while the UI tests, which do not
> use `API_DOMAIN`, pass. Locally the variable is unset, `.env` with `/api/v3` is used, and everything passes.

This explains every observation: only API tests, one signature, setup-time failure, CI only, deterministic.

## 5. Fix

**Pin the right value in the environment that is wrong** ([`fix.diff`](fix.diff)): `API_DOMAIN` in `.env.ci` points
at `https://petstore3.swagger.io/api/v3`, the root the service spec (`specs/petstore.json`, Petstore 1.0.28) and
`.env` use. No test changes. The expectations are right, and editing tests to route around an environment is what
[`outcomes.md` § Environment or data ticket](../../references/outcomes.md#environment-or-data-ticket) forbids.

What would have caught it earlier, recommended but **not implemented or run here**: a health check in global setup
that calls one cheap endpoint on `API_DOMAIN` and fails the run with a clear message ("API_DOMAIN … answered 404")
before any test starts. That is the Environment row of [`root-causes-and-fixes.md` § Environment](../../references/root-causes-and-fixes.md#environment).
It turns seven test failures into one environment failure.

Rejected alternatives: hard-coding `/api/v3` in `PetService` (it hides which environment is wrong and breaks the
next environment that really does differ), and marking the API tests skipped on CI (green arranged, not earned).

## 6. Prove the fix

| Run | Result |
|---|---|
| TC-PET-001, `TEST_ENV=ci` (the reproducing rung) | 1 passed |
| Full suite, `TEST_ENV=ci` | 14 passed |
| Full suite, `TEST_ENV` unset (no regression locally) | 14 passed |

Causal by construction: the defect and the fix differ in one line of `.env.ci`, and that line flips the CI-like
suite from 7 failed to 0.

## 7. Route: the environment ticket

Filled in from the template in [`outcomes.md` § Environment or data ticket](../../references/outcomes.md#environment-or-data-ticket).
This is an **example ticket for the planted defect**, not a report about a real environment:

```md
## CI (TEST_ENV=ci): Petstore setup calls return 404, breaking 7 tests

Since: 2026-11-03 (first CI-like run with .env.ci)      Affected: all of tests/api (TC-PET-001, -002, -003 x3, -006, -007)
Signature: Error: Precondition failed: addPet returned 404 (src/fixtures/data-fixtures.ts:45)
Evidence: TEST_ENV=ci suite 7 failed / 7 passed; same commit with TEST_ENV unset 14 passed;
          GET https://petstore3.swagger.io/api/v2/pet/findByStatus?status=available -> 404,
          same path under /api/v3 -> 200; .env.ci has API_DOMAIN=https://petstore3.swagger.io/api/v2
Impact: every API test on the CI job is red; UI tests unaffected
Ask: set API_DOMAIN in the CI environment file to https://petstore3.swagger.io/api/v3 (the root .env and the spec use);
     re-run the CI job; add an API_DOMAIN health check to global setup
```

When the owner confirms the change, re-run the affected cluster once (above: `TEST_ENV=ci` suite, 14 passed).
