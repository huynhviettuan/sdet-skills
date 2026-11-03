# AI Agent Instructions — Orders

Project: **Orders**, a small multi-tenant orders API (see `docs/product/00_PROJECT_OVERVIEW.md`). This file is
tool-neutral; `CLAUDE.md` imports it with `@AGENTS.md`.

## Mandatory First Step

Before modifying code:
1. Read this file.
2. Read the relevant feature documentation (`docs/features/FR-*.md`).
3. Read applicable business rules (`docs/business/BUSINESS_RULES.md`, BR-*).
4. Read related architecture decisions (`docs/architecture/ADR/`, ADR-*).
5. Check `docs/product/OPEN_QUESTIONS.md`.

Do not begin implementation if a critical requirement is unresolved. As of 2026-11-03, OQ-001, OQ-002, OQ-003,
OQ-004, OQ-005 and OQ-006 are OPEN; the rules they block are marked `Source: ASSUMPTION` in BUSINESS_RULES.md.

## Source of Truth

When documents conflict, the higher item wins:
1. Latest approved stakeholder decision (resolved OQ / ADR / CHANGELOG entry)
2. Business rules (`docs/business/BUSINESS_RULES.md`)
3. Acceptance criteria (`docs/quality/ACCEPTANCE_CRITERIA.md`)
4. Feature specification (`docs/features/`)
5. API contract (`docs/api/API_SPECIFICATION.md`, `specs/openapi.yaml`)
6. Architecture decisions (`docs/architecture/ADR/`)
7. Backlog (`docs/delivery/IMPLEMENTATION_PLAN.md`)
8. Existing implementation (the reference server, see 00_PROJECT_OVERVIEW.md "Sources")

If two items at the same level conflict, STOP and report (see Conflict Rule).

## Architecture Rules

- Follow the approved architecture (`docs/architecture/SYSTEM_ARCHITECTURE.md`): one HTTP service, in-memory
  store behind a `Store` interface, no framework beyond the language's standard library unless an ADR says so.
- Do not introduce new frameworks or infrastructure without approval (a new ADR).
- Keep module boundaries intact: routing, authentication, authorization, order domain, audit.
- Frontend must not bypass backend/domain rules. There is no frontend in scope; every rule is enforced by the API.
- Database access must follow the approved data-access pattern (`Store` methods only; no handler touches the
  dictionaries directly).

## Business Rules

Do not:
- invent rules
- simplify rules without approval
- silently change state transitions (`docs/business/STATE_MACHINES.md` is the only transition table)
- duplicate critical calculations in multiple layers (the cancellation window, the open-order count and the login
  counter are computed in one domain function each)

## Coding Rules

- Keep controllers / route handlers thin.
- Put business logic in services/domain modules.
- Validate external input (`docs/features/*` "Validation"; unknown or read-only fields are rejected, BR-SEC-003).
- Add audit events for sensitive operations (every denied request, BR-AUD-001).
- Use transactions (the store lock) for multi-step critical operations: id allocation, status transitions, the
  open-order count.
- Make critical mutations idempotent where required: a repeated `pay`, `ship` or `cancel` on an order that already
  moved answers 409 and changes nothing (BR-ORD-005).

## Testing Rules

A task is not complete until:
- lint/typecheck passes
- unit tests pass
- API/integration tests pass
- relevant E2E tests pass (none in scope: API only)
- acceptance criteria are satisfied (`docs/quality/ACCEPTANCE_CRITERIA.md`, one AC per expected result)
- every row of the matrix in `docs/business/ROLES_PERMISSIONS.md` has a passing test
  (`authz_matrix.py verify`)

## Conflict Rule

If documentation conflicts: STOP.

Report:
- conflicting documents
- conflicting rules
- implementation impact
- recommended options

Do not guess.

## Scope Rule

Do not implement functionality explicitly marked out of scope (`docs/product/01_SCOPE.md`).

## Definition of Done

See `docs/quality/DEFINITION_OF_DONE.md`.
