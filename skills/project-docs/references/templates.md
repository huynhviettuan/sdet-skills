# Document Templates

Copy-ready templates for the documents in the package. IDs follow the shared scheme in
[`../SKILL.md`](../SKILL.md#id-scheme) — the same IDs are reused by the `sdet-automation-docs` skill, so keep them
stable once published.

Contents:

- [AGENTS.md + CLAUDE.md](#agentsmd--claudemd)
- [Open question (OQ)](#open-question-oq)
- [Business rule (BR)](#business-rule-br)
- [State machine](#state-machine)
- [Feature specification](#feature-specification)
- [Architecture Decision Record (ADR)](#architecture-decision-record-adr)
- [Data model entity](#data-model-entity)
- [API endpoint](#api-endpoint)
- [Roles and permissions](#roles-and-permissions)
- [Acceptance criteria (AC)](#acceptance-criteria-ac)
- [Traceability matrix](#traceability-matrix)
- [Definition of Ready](#definition-of-ready)
- [Definition of Done](#definition-of-done)

---

## AGENTS.md + CLAUDE.md

`AGENTS.md` is the tool-neutral agent instruction file (read by Codex, Cursor, Copilot and others). Claude Code reads
`CLAUDE.md`, so always also generate a `CLAUDE.md` that imports it instead of duplicating it:

```md
# CLAUDE.md

@AGENTS.md
```

Add Claude-specific notes below the import only if they genuinely don't apply to other agents.

```md
# AI Agent Instructions

## Mandatory First Step

Before modifying code:
1. Read this file.
2. Read the relevant feature documentation.
3. Read applicable business rules (BR-*).
4. Read related architecture decisions (ADR-*).
5. Check OPEN_QUESTIONS.md.

Do not begin implementation if a critical requirement is unresolved.

## Source of Truth

When documents conflict, the higher item wins:
1. Latest approved stakeholder decision (resolved OQ / ADR / CHANGELOG entry)
2. Business rules
3. Acceptance criteria
4. Feature specification
5. API contract
6. Architecture decisions
7. Backlog
8. Existing implementation

If two items at the same level conflict, STOP and report (see Conflict Rule).

## Architecture Rules

- Follow the approved architecture.
- Do not introduce new frameworks or infrastructure without approval.
- Keep module boundaries intact.
- Frontend must not bypass backend/domain rules.
- Database access must follow the approved data-access pattern.

## Business Rules

Do not:
- invent rules
- simplify rules without approval
- silently change state transitions
- duplicate critical calculations in multiple layers

## Coding Rules

- Keep controllers / route handlers thin.
- Put business logic in services/domain modules.
- Validate external input.
- Add audit events for sensitive operations.
- Use transactions for multi-step critical operations.
- Make critical mutations idempotent where required.

## Testing Rules

A task is not complete until:
- lint/typecheck passes
- unit tests pass
- API/integration tests pass
- relevant E2E tests pass
- acceptance criteria are satisfied

## Conflict Rule

If documentation conflicts: STOP.

Report:
- conflicting documents
- conflicting rules
- implementation impact
- recommended options

Do not guess.

## Scope Rule

Do not implement functionality explicitly marked out of scope.

## Definition of Done

See docs/quality/DEFINITION_OF_DONE.md (or the DoD section of the PRD for Level 1 projects).
```

---

## Open question (OQ)

```md
## OQ-001 — <Question>

Status: OPEN            <!-- OPEN | ANSWERED | WONTFIX -->
Owner: Product Owner
Priority: High
Raised: YYYY-MM-DD
Blocks: FR-CONTRACT-003, BR-CONTRACT-002

Question:
...

Options:
A. ...
B. ...
C. ...

Impact:
...

Decision:               <!-- fill when ANSWERED, with date and decider -->
...

AI Agent Instruction:
DO NOT IMPLEMENT this behavior until the decision is resolved.
```

When an OQ is answered, propagate the decision into the affected BR/feature/AC documents and add a CHANGELOG
entry — the OQ file records *that* it was decided, the rule documents record *what* was decided.

---

## Business rule (BR)

```md
## BR-CONTRACT-001 — Approved Contract Is Immutable

Source: <stakeholder doc / meeting / OQ-xxx>     <!-- or "MODEL RECOMMENDATION — pending approval" -->

### Rule
After a contract reaches APPROVED state, it cannot be edited directly.

### Allowed Alternatives
- renewal
- upgrade
- cancellation
- correction workflow

### Enforcement
Backend must reject direct update attempts.

### Audit
Record user, timestamp, operation, previous value, new value.

### Verified By
- AC-CONTRACT-001
- AC-CONTRACT-002
```

---

## State machine

Do not rely only on prose for complex states — always include the transition table.

````md
# State Machines

## Contract

```text
DRAFT
  ↓
PENDING_APPROVAL
  ↓
APPROVED
  ↓
ACTIVE
  ├── SUSPENDED
  ├── EXPIRED
  └── CANCELLED
```

### Allowed Transitions

| From | Action | To | Permission | Rule |
|---|---|---|---|---|
| DRAFT | submit | PENDING_APPROVAL | contract.submit | BR-CONTRACT-004 |
| PENDING_APPROVAL | approve | APPROVED | contract.approve | BR-CONTRACT-005 |

### Forbidden Transitions

- EXPIRED → DRAFT
- CANCELLED → ACTIVE

Any transition not listed under Allowed is forbidden.

### Side Effects

When `PENDING_APPROVAL → APPROVED`:
- write audit log
- store approval metadata
- trigger notification
````

---

## Feature specification

Use the same section order for every feature. Leave a section with "N/A" rather than deleting it, so a reader can
tell "not applicable" from "forgotten".

```md
# FR-<AREA>-NNN — <Feature Name>

## Purpose
## Actors
## Preconditions
## Main Flow
## Alternative Flows
## States
## Business Rules          <!-- list BR IDs, don't restate the rules -->
## Fields
## Permissions
## API                     <!-- link to API spec section -->
## Validation
## Calculations
## Audit Events
## Notifications
## Error Cases
## UI Behavior
## Acceptance Criteria     <!-- list AC IDs -->
## Dependencies
## Open Questions          <!-- list OQ IDs -->
```

---

## Architecture Decision Record (ADR)

Store under `docs/architecture/ADR/ADR-NNN-<slug>.md`. Never edit an accepted ADR's decision — supersede it with a
new ADR and set the old one's status to `Superseded by ADR-NNN`.

```md
# ADR-001 — <Decision>

Status: Proposed | Accepted | Superseded by ADR-NNN
Date: YYYY-MM-DD
Deciders: ...

## Context
...

## Decision
...

## Alternatives
- ...

## Why
...

## Consequences

Positive:
- ...

Negative:
- ...

## Revisit When
...
```

Typical ADR topics: frontend framework, backend framework, database, monorepo vs multi-repo, modular monolith vs
microservices, authentication, deployment platform, queue, storage, API style.

---

## Data model entity

Start from business entities, not UI screens.

```md
## Customer

### Purpose
...

### Key Fields
| Field | Type | Required | Derived | Description |
|---|---|:---:|:---:|---|

### Relationships
...

### Constraints
...

### Source of Truth
...
```

Mark derived values explicitly and give their formula, e.g. `remaining_sessions = total_sessions - consumed_sessions`.
Avoid independently editable duplicate totals when the value can be reliably derived.

---

## API endpoint

Prefer an OpenAPI file (`specs/openapi.yaml`) as the machine-readable contract when the project exposes an API; the
Markdown spec then explains business intent and links rule IDs.

````md
# API Specification

## Conventions
Base URL:
Authentication:
Content Type:
Versioning:
Error format:

## POST /contracts

Permission: `contract.create`

Request:
```json
{}
```

Response:
```json
{}
```

Validation:
- ...

Business Rules:
- BR-CONTRACT-001

Errors:
| Code | HTTP | Meaning |
|---|---|---|
| CONTRACT_INVALID | 422 | ... |

Audit:
...

Idempotency:
...
````

---

## Roles and permissions

Separate four concerns: functional permission, data scope, field visibility, approval authority.

```md
# Roles and Permissions

## Permission Model

Format: module.action

Examples:
- customer.read
- customer.create
- contract.approve
- session.complete
- report.export

## Data Scope

- ALL
- BRANCH
- TEAM
- OWN

## Sensitive Fields

| Field | Admin | Manager | Staff |
|---|:---:|:---:|:---:|
| Phone | Yes | Yes | No |

## Approval Authority

| Action | Role | Limit |
|---|---|---|

## Server Enforcement

UI visibility is not authorization.
All permissions must be enforced server-side.
```

---

## Acceptance criteria (AC)

Prefer Given / When / Then. Every critical flow also gets negative criteria.

```md
## AC-SESSION-001 — Completing a booked session deducts one session

Rule: BR-SESSION-003

Given:
- Contract has 10 remaining sessions
- Booking status is BOOKED

When:
- Authorized user marks session COMPLETED

Then:
- session status becomes COMPLETED
- remaining sessions becomes 9
- audit event is created
- trainer credit is updated

## AC-SESSION-002 — Repeated completion is idempotent

Rule: BR-SESSION-004

Given:
- Session is already COMPLETED

When:
- completion endpoint is called again

Then:
- session count is not deducted again
- API returns a deterministic result
```

---

## Traceability matrix

Use for business-critical projects to expose missing implementation or test coverage. The `TC` column is owned and
filled by the automation docs (`sdet-automation-docs`), which extend this same matrix with layer/file/CI columns.

```md
# Traceability Matrix

| Requirement | Business Rule | Acceptance Criteria | API | UI | Test |
|---|---|---|---|---|---|
| FR-CONTRACT-001 | BR-CONTRACT-001 | AC-CONTRACT-001 | POST /contracts/:id/approve | Contract detail | TC-CONTRACT-001 |
```

---

## Definition of Ready

A development task is READY only when:

```text
[ ] Purpose is clear
[ ] Actor is identified
[ ] Business rules are documented (BR IDs)
[ ] Permissions are known
[ ] Fields and validation are known
[ ] Relevant states are defined
[ ] Acceptance criteria exist (AC IDs)
[ ] No blocking OQ remains open
```

Otherwise keep the task blocked.

---

## Definition of Done

A feature is DONE only when:

```text
[ ] Implementation matches approved requirements
[ ] Server-side authorization exists
[ ] Validation exists
[ ] State transitions are enforced
[ ] Transactions are used where required
[ ] Audit events exist where required
[ ] Notifications exist where required
[ ] Error states are handled
[ ] Unit / integration / API tests pass
[ ] Relevant E2E tests pass
[ ] Acceptance criteria pass
[ ] Traceability updated
[ ] Documentation updated
[ ] No blocking OQ remains open
```
