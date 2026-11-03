# SDET AI Agent Instructions — Orders automation

Tool-neutral; `CLAUDE.md` imports this file with `@AGENTS.md`. Product behaviour comes from the Orders package
([orders-docs](../../../project-docs/examples/orders-docs/README.md)); this file says how tests for it are written.

## Before Writing Code

Read:
1. [docs/strategy/01_AUTOMATION_STRATEGY.md](docs/strategy/01_AUTOMATION_STRATEGY.md)
2. [docs/architecture/FRAMEWORK_ARCHITECTURE.md](docs/architecture/FRAMEWORK_ARCHITECTURE.md)
3. [docs/standards/LOCATOR_STRATEGY.md](docs/standards/LOCATOR_STRATEGY.md) and [WAIT_STRATEGY.md](docs/standards/WAIT_STRATEGY.md)
4. [docs/data/TEST_DATA_STRATEGY.md](docs/data/TEST_DATA_STRATEGY.md)
5. the AC in [ACCEPTANCE_CRITERIA.md](../../../project-docs/examples/orders-docs/docs/quality/ACCEPTANCE_CRITERIA.md)
   and the rows of [ROLES_PERMISSIONS.md](../../../project-docs/examples/orders-docs/docs/business/ROLES_PERMISSIONS.md)
   the task names
6. [docs/quality/OPEN_QUESTIONS.md](docs/quality/OPEN_QUESTIONS.md) and the product's OQ-001..006

Inspect existing services and fixtures (`order_factory`, `actor_tokens`) before creating new ones.

## Test Design Rules

- Verify observable behaviour; never reproduce product logic (the cancellation window, the lockout counter) in test
  code. Expected values come from the AC sentence or the matrix row.
- API is the layer for every AC; there is no UI. Do not add UI tests (OQ-A-008).
- Tests are independent and never depend on order or on another test's orders.
- Tests get services, tokens and data only through fixtures; never import httpx in a test.

## Locator Rules

- Find records by the ids the test created; assert scope properties over whole lists; an ambiguous lookup is
  INCONCLUSIVE, never "take the first".

## Wait Rules

- No fixed sleeps. Time windows (24 h, 60 s) need the controllable clock; until OQ-A-002 closes, the case is
  BLOCKED, not waited for and not skipped silently.

## Assertion Rules

- A write is asserted by its response and a re-read; a denial by its status and the owner's unchanged re-read.
- The matrix test never contains an expected status; it reads ROLES_PERMISSIONS.md.

## Test Data Rules

- Users are seeded and read-only; never create, change or lock a seed user (lock a generated unknown username).
- `order_factory` creates and tears down; teardown is confirmed by the record.
- Never use `POST /_reset`; never target a host outside the allow-list.

## Retry / Parallel Rules

- Retries are 0. A test that passes only on a repeat is FLAKY.
- Parallel by default; the only serial groups are `auth-serial` and `cap-serial`, with their reasons.

## Conflict Rule

If product behaviour or documentation is ambiguous: STOP, record an OQ (product question: the product file; automation
question: `OQ-A-NNN` here), do not invent expected behaviour. Never edit an existing assertion to match the server;
the case changes first.

## Definition of Done

See [docs/quality/DEFINITION_OF_DONE.md](docs/quality/DEFINITION_OF_DONE.md). Passing once locally is not done.
