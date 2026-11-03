# Automation Strategy — Orders

Snapshot: 2026-11-03. Which layer tests each kind of requirement, what stays manual, and why. It refines the
product-level [TEST_STRATEGY.md](../../../../../project-docs/examples/orders-docs/docs/quality/TEST_STRATEGY.md)
and does not override it: where that document decides (levels, mandatory negatives, boundaries, the CI gate order),
this one says how the automation meets it.

Contents:

- [Layer selection per requirement kind](#layer-selection-per-requirement-kind)
- [Decision matrix for the hard cases](#decision-matrix-for-the-hard-cases)
- [Pyramid](#pyramid)
- [What stays manual](#what-stays-manual)
- [Assumption-based cases](#assumption-based-cases)
- [Reconciliation with the product TEST_STRATEGY](#reconciliation-with-the-product-test_strategy)

## Layer selection per requirement kind

The lowest reliable layer wins (skill `SKILL.md`, golden rules).

| Requirement kind | Orders examples | Layer | How |
|---|---|---|---|
| Pure decision formula | `locked(username, now)`, `cancellable(order, now)`, `open_order_count`, token verification (DATA_MODEL.md) | Unit, product repo | Developers; the boundary values of TEST_STRATEGY.md are unit cases first |
| Business rule with an AC | BR-ORD-001..007 via AC-ORD-*; BR-AUTH-* via AC-AUTH-* | API | One test per expected result, title `[TC-…] … (AC-…)`, assertion quotes the AC |
| Permission cell | AZ-001..051 (ROLES_PERMISSIONS.md) | API, data-driven | One parametrized test, one case per row, row ids in the test id; the table is the only oracle; `authz_matrix.py verify` proves every cell ran and passed |
| BOLA with side effect | AC-ORD-023, AC-ORD-042 | API | Attacker denied **and** the owner's re-read unchanged (pattern of `test_bola_attacker_cannot_change_another_tenants_order`) |
| Security family | headers, CORS, error body, lockout, enumeration, `alg=none`, tampered and expired tokens, audit (BR-SEC-*, BR-AUTH-*, BR-AUD-001) | API | Ported from `skills/security-testing/examples/vuln-api/test_security.py`, each seen red for its flaw |
| State transition | STATE_MACHINES.md, every allowed and forbidden row; AC-ORD-030..033 | API, data-driven | One case per row; a forbidden row asserts 409 **and** the re-read status unchanged |
| Time-window boundary | 24 h after `paid_at` (AC-ORD-034); 60 s lockout window edge (BR-AUTH-002) | Unit for the edge; API with a controllable clock | Never by waiting (TEST_STRATEGY.md). The API cases are BLOCKED until OQ-A-002 gives a clock |
| Count boundary | note 0/200/201 (BR-ORD-003); open orders 4/5/6 (BR-ORD-007); failed logins 5/6 (BR-AUTH-002) | API | Data-driven on the boundary values; the cap cases run serial until OQ-A-003 |
| Concurrency | two `pay` at once on one `new` order | API | Two requests released together; assert the multiset of statuses is {200, 409} and the order is `paid` once (TC-ORD-037) |
| Response contract | `specs/openapi.yaml` (8 paths, 3 schemas) | API | Schema check of 2xx bodies on records the test created (repo decision D-18); schemas generated with `openapi-tool.mjs schemas` |
| Critical UI journey | none | — | No UI exists; OQ-A-008 |
| Load | the three read/create operations | Load, informational | `vuln-api-load/load.py`, Local only, never a gate |

A critical flow is "rules at API level + one end-to-end journey" in the skill. For Orders the end-to-end journey is
also an API journey (create -> pay -> ship as alice and carol), because the product has no other surface.

## Decision matrix for the hard cases

| Scenario | Automate? | Layer | Reason |
|---|:---:|---|---|
| 51 permission cells | Yes | API | Large combination; table-driven (ADR-001) |
| Lockout after 5 failures | Yes | API | Deterministic within one test: 5 x 401 then 429 with `Retry-After: 60`; the locked username is generated per test |
| Lockout window reopening at 60 s | Yes, blocked | Unit + API with clock | Cannot be waited for (OQ-A-002) |
| Cancel at 23:59:59 vs 24:00:00 after `paid_at` | Yes, blocked | Unit + API with clock | Same; and `Basis: assumption` (OQ-001) |
| Note longer than 200 characters | Yes | API | `Basis: assumption` (OQ-002); reference server shortens, so the case fails there by design |
| Note editable after `shipped` | No | Manual exploration | OQ-005 has no rule; asserting whatever the server does would invent behaviour |
| 500 body without a leak | Yes | API on Local reference server; open elsewhere | `GET /_boom` is a reference-only hook (OQ-A-011) |
| Double `pay` race | Yes | API | TEST_STRATEGY.md states the expected result |

## Pyramid

Not a percentage target. The balance follows the product: four pure functions at unit level (developers), about
45 AC-level API cases plus 51 matrix cases plus the security families at API level, zero UI. The API layer is wide
because the API is the product; it stays fast because every case is one or two HTTP calls against an in-memory store
(the reference suite: 36 tests in 1.23 s on 2026-11-03).

## What stays manual

| Item | Why | Owner |
|---|---|---|
| Exploration of OQ-005 (edit after terminal status) | No expected result | QA |
| Review of audit entry content beyond AC-AUD-001 | Judgement on what an investigator needs | QA + security |
| Token handling review (key rotation, DEPLOYMENT.md) | Operational, one-off per rotation | Developers |

## Assumption-based cases

Cases verifying AC-ORD-004, 006, 007, 024, 034, 036 carry `Basis: assumption` and name their OQ. (The matrix
rows AZ-030, 036, 043, 049, 051 are assumption rows too but stay inside the matrix verify gate; see
[TRACEABILITY_MATRIX.md](../quality/TRACEABILITY_MATRIX.md), "Permission matrix".) They are automated (TEST_STRATEGY.md: "Assumption-based cases ... carry
`Basis: assumption`"), run on every PR, and report in their own group. Whether they block a merge is OQ-A-004;
until it is answered they do not block, and a failure is reported as FAILED, never skipped or turned into `xfail`.

## Reconciliation with the product TEST_STRATEGY

| TEST_STRATEGY.md says | This package | Conflict? |
|---|---|---|
| Unit: the four pure decisions | Owned by developers in the product repo | No |
| Integration/API: every AC, one case per expected result quoting it as `Evidence:` | Same; TC ids mirror AC numbers | No |
| Security: every matrix row, `authz_matrix.py verify` | Same, as a blocking PR gate | No |
| E2E: none | None (the automation brief's "one UI smoke" is OQ-A-008) | With the brief, not with the product |
| 24 h boundary with a controllable clock | Same; blocked until the clock exists (OQ-A-002) | No, but a testability gap |
| A sentinel stays in the security suite | Same, and a sentinel XPASS invalidates the run | No |
| CI gate order: lint -> typecheck -> unit -> API (with matrix) -> security families | Kept, plus `audit-suite`, `can-fail` and the trace check, which the product order does not name | Additive |
