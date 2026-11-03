# Open Questions — Orders automation

Snapshot: 2026-11-03. Automation-side questions only, prefixed `OQ-A-NNN` so they never collide with the product's
`OQ-001..006` ([product OPEN_QUESTIONS.md](../../../../../project-docs/examples/orders-docs/docs/product/OPEN_QUESTIONS.md)).
Format as `project-docs` prescribes. Every decision in this package marked `Assumption (example)` has a row here.
When the automation moves into the product repo, these entries are appended to the product's file instead of
living here (`document-package.md`, "Full structure").

Product questions that change what the suite asserts (OQ-001..006) stay in the product file; their effect on the
suite is in [TRACEABILITY_MATRIX.md](TRACEABILITY_MATRIX.md) ("Assumption-based cases").

## Summary

| ID | Question | Status | Priority | Blocks |
|---|---|---|---|---|
| OQ-A-001 | Which automation stack: pytest + httpx (assumed) or the Playwright/TypeScript `api` project? | OPEN | Medium | FRAMEWORK_ARCHITECTURE.md |
| OQ-A-002 | How does a test control the clock for the 24 h window and the 60 s lockout window? | OPEN | High | TC-ORD-034, TC-AUTH-008 |
| OQ-A-003 | Can the suite get one customer account per worker? | OPEN | High | parallel run of TC-ORD-006/007 |
| OQ-A-004 | Do assumption-based cases block a merge before their OQ is answered? | OPEN | Medium | CI_CD_STRATEGY.md gates |
| OQ-A-005 | Team size and ownership of the suite | OPEN | Low | 00_AUTOMATION_OVERVIEW.md |
| OQ-A-006 | Release cadence and the Staging host name | OPEN | Medium | release stage |
| OQ-A-007 | Quarantine limits (14 days, 7 for P0) | OPEN | Low | FLAKY_TEST_POLICY.md |
| OQ-A-008 | The brief asked for one UI smoke; the product scope excludes any UI | OPEN | Medium | none while the scope holds |
| OQ-A-009 | PR time budget and worker count (10 min, 4 workers) | OPEN | Low | CI_CD_STRATEGY.md |
| OQ-A-010 | Where do forged/expired token tests get the signing key outside Local? | OPEN | Medium | TC-AUTH-007 on Staging |
| OQ-A-011 | How does a product build provoke a 500 for AC-SEC-004 without `GET /_boom`? | OPEN | Medium | TC-SEC-004 outside Local |

## OQ-A-001 — Automation stack

Status: OPEN
Owner: SDET lead
Priority: Medium
Raised: 2026-11-03
Basis: assumption
Blocks: FRAMEWORK_ARCHITECTURE.md

Question:
Orders is API-only (`01_SCOPE.md`, "Out of scope": any user interface). Which scaffold does the product suite use?

Options:
A. pytest + httpx from `init-pytest-playwright-framework` (working assumption): the only suite that runs today,
   `skills/security-testing/examples/vuln-api/test_security.py`, is pytest; the matrix loader
   `authz_matrix.load_matrix` is Python; the template already registers `P0`, `P1`, `case(id)`,
   `requirement(id)` and `sentinel` markers.
B. Playwright/TypeScript from `init-playwright-framework`, its `api` project (`playwright.config.ts`), with the
   matrix read from `authz_matrix.py generate` JSON.

Impact:
File names in TRACEABILITY_MATRIX.md, the commands in CI_CD_STRATEGY.md. The shared scripts (`audit-suite.mjs`,
`can-fail.mjs`, `guard-hooks.mjs`) are the same file in both templates, so the gates do not change.

Decision:
(pending)

AI Agent Instruction:
Write tests against option A. Do not add a second language to the suite.

## OQ-A-002 — Controllable clock

Status: OPEN
Owner: Developers (Orders API)
Priority: High
Raised: 2026-11-03
Basis: assumption
Blocks: TC-ORD-034 (AC-ORD-034), TC-AUTH-008 (the 60 s window edge of BR-AUTH-002)

Question:
TEST_STRATEGY.md requires "a controllable clock, never by waiting" and FR-ORD-004 lists it as a dependency, but no
document says how a test sets the time. The reference server reads `time.time()` directly (`app.py`). Which
mechanism does the product provide?

Options:
A. An injectable clock in the domain functions `cancellable(order, now)` and `locked(username, now)`, unit-tested
   by developers, plus a Local-only clock offset the product build excludes (like `POST /_reset`, DEPLOYMENT.md).
B. Unit level only: the boundary is proven on the pure functions; the API cases check one value well inside and one
   well outside the window, without the exact edge.

Impact:
Without a mechanism TC-ORD-034 and TC-AUTH-008 are BLOCKED (reported as blocked, never skipped as green).

Decision:
(pending)

AI Agent Instruction:
Do not write `sleep` or wait 24 hours or 60 seconds. Report the cases as blocked.

## OQ-A-003 — One customer account per worker

Status: OPEN
Owner: QA lead
Priority: High
Raised: 2026-11-03
Basis: assumption
Blocks: parallel execution of TC-ORD-006, TC-ORD-007 (open-order cap, BR-ORD-007, per customer)

Question:
The seed has six fixed users (`specs/seed-data.json`) and tenant administration is out of scope, so the suite
cannot create users. The open-order cap counts a customer's `new` orders: two workers creating orders as `alice`
change each other's count. Can the seed grow to one customer per worker per tenant (example names), or does the
product get a test-only provisioning path?

Options:
A. Extend the seed with example customers per worker (for example `alice-w0..w3` in `tenant-a`).
B. Keep six users; the cap cases run in one serial group with the reason recorded (working assumption).

Impact:
PARALLEL execution of the cap cases; lockout cases that send a wrong password for a known user.

Decision:
(pending)

AI Agent Instruction:
Until answered, mark the cap cases `serial` with this OQ as the reason; never create users.

## OQ-A-004 — Gating of assumption-based cases

Status: OPEN
Owner: QA lead + Product Owner
Priority: Medium
Raised: 2026-11-03
Basis: assumption
Blocks: QUALITY gates in CI_CD_STRATEGY.md

Question:
Cases against OQ-001..004 (`Basis: assumption`) fail on the reference server by design (orders-docs README,
"Honest notes"). Should they block a merge?

Options:
A. Run on every PR, report FAILED with `Basis: assumption` in their own group, route to the OQ owner, and block
   only once the OQ is decided (working assumption).
B. Block from day one.

Impact:
Option B blocks every merge until the product answers four questions.

Decision:
(pending)

AI Agent Instruction:
Never skip or `xfail` an assumption case to turn the run green; it runs and its result is reported.

## OQ-A-005 — Team size and ownership

Status: OPEN
Owner: Engineering manager
Priority: Low
Raised: 2026-11-03
Basis: assumption
Blocks: 00_AUTOMATION_OVERVIEW.md "Ownership"

Question:
Assumption (example): one SDET owns the framework and the flaky queue; two developers own testability and unit
tests; the Product Owner owns OQ answers. Is that the team?

Decision:
(pending)

## OQ-A-006 — Release cadence and Staging

Status: OPEN
Owner: Engineering manager
Priority: Medium
Raised: 2026-11-03
Basis: assumption
Blocks: the release stage in CI_CD_STRATEGY.md

Question:
Only Local exists (ENVIRONMENTS.md). Assumption (example): releases every two weeks; the release stage runs the P0
set against a Staging host whose name marks it as a test environment. Which host, and which cadence?

Decision:
(pending)

## OQ-A-007 — Quarantine limits

Status: OPEN
Owner: SDET lead
Priority: Low
Raised: 2026-11-03
Basis: assumption
Blocks: FLAKY_TEST_POLICY.md

Question:
Assumption (example): a quarantined test expires after 14 days, a P0 test after 7. Are those the limits?

Decision:
(pending)

## OQ-A-008 — UI smoke

Status: OPEN
Owner: Product Owner
Priority: Medium
Raised: 2026-11-03
Basis: assumption
Blocks: nothing while the scope holds

Question:
The automation brief for this example asked for "one UI smoke"; `01_SCOPE.md` excludes any user interface and
TEST_STRATEGY.md lists E2E as "none". The package follows the product: zero UI tests. If a UI is added, is the one
smoke "log in, create an order, see it listed" through the scaffold's UI layer, with setup through the API?

Decision:
(pending)

## OQ-A-009 — PR time budget

Status: OPEN
Owner: SDET lead
Priority: Low
Raised: 2026-11-03
Basis: assumption
Blocks: CI_CD_STRATEGY.md

Question:
Assumption (example): the PR stage finishes in under 10 minutes with 4 workers (`pytest -n 4`). Agreed?

Decision:
(pending)

## OQ-A-010 — Signing key for token tests outside Local

Status: OPEN
Owner: Developers + platform
Priority: Medium
Raised: 2026-11-03
Basis: assumption
Blocks: TC-AUTH-007 (expired token) on Staging

Question:
An expired-but-validly-signed token needs the environment's signing key (`ORDERS_SIGNING_KEY`, ENVIRONMENTS.md);
the reference test reads `app.SIGNING_KEY`. Does the Staging pipeline get Staging's key from the secret store, or
does TC-AUTH-007's expired variant run on Local only?

Decision:
(pending)

## OQ-A-011 — Provoking a 500 in a product build

Status: OPEN
Owner: Developers
Priority: Medium
Raised: 2026-11-03
Basis: assumption
Blocks: TC-SEC-004 (AC-SEC-004) outside the reference server

Question:
The reference test calls `GET /_boom`, which a product build must not expose (SECURITY.md, "Test hooks"). Which
real fault path can the suite trigger, or is AC-SEC-004 verified at unit level on the error handler?

Decision:
(pending)
