# Test Data Strategy — Orders

Snapshot: 2026-11-03. Covers test data, accounts, cleanup, isolation and parallel execution in one file (the skill
allows merging for a small suite; `document-package.md`). Example values only: the usernames and tenants below are
the synthetic seed of [`specs/seed-data.json`](../../../../../project-docs/examples/orders-docs/specs/seed-data.json);
the shared example password lives in the reference server and is not repeated here.

Contents:

- [Accounts](#accounts)
- [Orders: created per test by a factory](#orders-created-per-test-by-a-factory)
- [Tenant pairs for isolation](#tenant-pairs-for-isolation)
- [Lockout safety](#lockout-safety)
- [Parallel execution](#parallel-execution)
- [Environment guard](#environment-guard)
- [Cleanup](#cleanup)

## Accounts

Users are seeded and read-only to the suite: tenant administration is out of scope (`01_SCOPE.md`), so the suite
never creates, edits or deletes a user.

| Actor (ROLES_PERMISSIONS.md) | Example user | Tenant | Role | Used for |
|---|---|---|---|---|
| anonymous | — | — | — | 401 rows |
| customer-own | alice | tenant-a | customer | owner of every order under test |
| customer-same-tenant | erin | tenant-a | customer | same tenant, not owner (404 rows) |
| customer-other-tenant | bob | tenant-b | customer | cross-tenant attacker |
| manager-same-tenant | carol | tenant-a | manager | ship, cancel, delete; teardown of tenant-a orders |
| manager-other-tenant | dave | tenant-b | manager | cross-tenant manager (404 rows) |
| admin | root | `*` | admin | read-all, delete, audit; teardown confirmation |

- **Credentials**: the password comes from the environment (`PASSWORD` in the template's `config.py`, from `.env`
  or the CI secret store), never from the repo.
- **Sessions**: each worker logs every user in once through `POST /auth/login` and reuses the token
  (`actor_tokens`, worker scope). Tokens are stateless and valid 60 minutes with no refresh (ADR-004); the fixture
  logs in again when a token is older than 50 minutes (Assumption (example)). Sharing one token across tests in a
  worker is safe because a token carries no server-side session state.
- **Worker mapping**: all workers share the six users. That is safe for every case except the open-order cap
  (below) because each test works only on orders it created. One account per worker is OQ-A-003.

## Orders: created per test by a factory

```text
order_factory creates the order through POST /orders as alice (or bob for tenant-b)
 -> test acts and asserts
 -> order_factory teardown deletes every id it created (as the order's tenant manager, carol or dave, else root)
 -> teardown confirms with GET /orders/{id} as root that each id answers 404
```

- No test reads an order another test created; no order is shared between tests; no chain "test A creates, test B
  pays".
- States other than `new` are reached through the real action endpoints (`pay` as alice, `ship` as carol), never by
  writing `status` (BR-ORD-004 forbids it; ADR-003).
- **Tag**: the note starts with `AUTOMATION_<runId>_<worker>_` so an orphan from a crashed run can be found.
  The tag counts against the 200-character limit (BR-ORD-003): the boundary cases build the note as tag + padding
  to exactly 200 and 201 characters, and the empty-body case (AC-ORD-005) is the one order without a tag, deleted by
  id like every other.
- No real personal data in notes: generated text only.

## Tenant pairs for isolation

Every isolation case uses a pair: an order in `tenant-a` owned by alice, an actor from `tenant-b` (bob, dave), and
an actor from the same tenant without the right (erin). The matrix actors are exactly these pairs. A cross-tenant
case asserts both halves: the attacker's 404 **and** the owner's re-read unchanged (reference
`test_bola_attacker_cannot_change_another_tenants_order`).

## Lockout safety

BR-AUTH-002 locks a username after 5 failures in 60 s, and `DATA_MODEL.md` counts attempts "per submitted
username, even unknown ones". A locked seed user would break every other test for a minute, so:

- Lockout cases (TC-AUTH-004, 005) lock a **generated unknown username** per test (the reference test uses
  `nobody-rl`), and prove "another username still logs in" with a seed user that had no failures.
- Cases that need a wrong password for a **known** user (TC-AUTH-002, the enumeration case TC-AUTH-003) send one
  wrong attempt each, all for `erin`, and run in the `auth-serial` group so the total stays below 5 per 60 s.

## Parallel execution

| Item | Value |
|---|---|
| Runner | pytest-xdist, process per worker (`pytest -n 4`, the template README) |
| Workers | 4 on CI (Assumption (example), OQ-A-009) |
| Shared resources | the six seed users; the in-memory store |
| Serial groups | `auth-serial`: wrong-password cases for known users (reason above). `cap-serial`: TC-ORD-006/007, because the cap counts all of alice's `new` orders and other workers create some (reason: OQ-A-003) |
| Order dependence | none; the suite also runs in random order |

Serial mode is allowed only with the reason written next to the group. Neither group hides a shared-state bug: both
exist because the product has one counter per username and the seed has one customer per role and tenant.

## Environment guard

A writing run targets only Local (`127.0.0.1`, `localhost`) or a Staging host on an allow-list whose name marks it
as a test environment (ENVIRONMENTS.md, "Rule"). The `target` fixture checks `BASE_URL` before the first request and
stops the session otherwise; the same pattern as `vuln-api-load/load.py`, which exits 2 for any other host.

## Cleanup

- By the ids the factory created, never by text match.
- Local: the in-memory store disappears with the server process; no sweeper needed.
- Staging (when it exists): a nightly sweep deletes orders whose note starts with `AUTOMATION_` and that are older
  than 24 hours, as a safety net only. Destructive cleanup is allowed on Local and Staging, never elsewhere.
- `POST /_reset` is the reference server's hook; the product suite does not use it.
