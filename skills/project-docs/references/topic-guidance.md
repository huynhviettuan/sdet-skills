# Topic Guidance

What each non-template document must capture, plus guidance for planning, working with AI coding agents, and
propagating requirement changes. Load the section you need.

Contents:

- [Inputs to analyze](#inputs-to-analyze)
- [Requirement analysis workflow](#requirement-analysis-workflow)
- [Fixed workflow vs configurable values](#fixed-workflow-vs-configurable-values)
- [Test strategy (product level)](#test-strategy-product-level)
- [Security](#security)
- [Deployment and environments](#deployment-and-environments)
- [Data migration](#data-migration)
- [Implementation planning](#implementation-planning)
- [Working with AI coding agents](#working-with-ai-coding-agents)
- [Requirement changes](#requirement-changes)

---

## Inputs to analyze

Inspect every available source before writing anything: stakeholder brief, meeting notes, Word/PDF documents,
spreadsheets, screenshots, the current application, competitor references, legacy exports, API docs, database
schema, existing code, emails/messages, diagrams.

Preserve source terminology and decisions. Tag every statement you write with one of:

```text
SOURCE REQUIREMENT     — traceable to a named input
MODEL RECOMMENDATION   — your suggestion; needs approval before it becomes a rule
ASSUMPTION             — believed true, not confirmed; list it so it can be confirmed
OPEN QUESTION          — unknown; goes to OPEN_QUESTIONS.md
```

Do not silently replace source requirements with generic best practices.

---

## Requirement analysis workflow

Understand the business flow before touching the data model — do not jump from a brief straight to tables.

```text
Raw sources
 → Extract requirements
 → Normalize terminology (→ GLOSSARY)
 → Identify actors
 → Identify business entities
 → Identify end-to-end flows
 → Extract business rules
 → Identify state machines
 → Identify permissions
 → Identify configurable values
 → Identify integrations
 → Identify reports
 → Identify contradictions and open questions
 → Define scope (in and out)
 → Define architecture
 → Create implementation plan
 → Map acceptance criteria and tests
```

---

## Fixed workflow vs configurable values

**Fixed workflow** is implemented in code, e.g.:

```text
Lead → Appointment → Customer → Contract → Booking → Session
```

**Configurable values** belong in database/configuration UI when the business expects them to change, e.g. reminder
delay, price tier, session color, cancellation threshold, approval threshold, email template.

Record each configurable value in `CONFIGURATION_RULES.md` with: default, allowed range, who may change it, and
whether a change applies retroactively.

---

## Test strategy (product level)

`TEST_STRATEGY.md` states *what confidence the product needs*; the detailed automation design (framework, locators,
data, CI segmentation, flaky policy) belongs to the `sdet-automation-docs` skill.

Document at least: unit, integration, API, E2E, security/permission, and migration validation.

Mandatory negative testing for critical features:

```text
unauthorized action
invalid state transition
duplicate request (idempotency)
concurrency
deleted record
expired entity
invalid financial operation
```

Recommended CI gate order: lint → typecheck → unit → integration/API → critical E2E smoke.

---

## Security

Capture at least: authentication, authorization, sensitive fields, encryption, audit, rate limiting, secrets
handling, backup, restore, PII, data retention, export permissions, deletion policy.

For regulated or sensitive data, record legal/compliance requirements explicitly as SOURCE REQUIREMENT or OPEN
QUESTION — never guess them.

---

## Deployment and environments

Document each environment (Local, Development, Staging, Production):

```md
URL:
Database:
Secrets: (where they live — never the values)
Deployment:
Backup:
Monitoring:
Access:
```

Also document rollback, migrations, backup-restore verification, deployment ownership, and incident handling.

---

## Data migration

When replacing a legacy system:

```md
# Data Migration

## Sources
- legacy database / CSV / Excel

## Mapping
| Old Field | New Field | Transformation |
|---|---|---|

## Validation (compare before cutover)
- record counts
- financial totals
- balances
- active contracts
- remaining quantities

## Process
1. staging import
2. validation
3. correction
4. production dry run
5. final import
6. reconciliation
7. sign-off
```

Never migrate financial data without reconciliation.

---

## Implementation planning

Build in vertical slices; each phase must produce a usable staging increment.

```text
Phase 0 — Foundation
Phase 1 — Authentication / Authorization
Phase 2 — Core Entity A
Phase 3 — Core Entity B
Phase 4 — Operational Flow
Phase 5 — Finance
Phase 6 — Reporting
Phase 7 — Integrations
Phase 8 — Hardening / Migration / UAT
```

---

## Working with AI coding agents

Cycle: requirement → agent reads docs → agent summarizes task → agent identifies ambiguity → implementation plan →
code → tests → human review → merge.

Size tasks so they are reviewable. Avoid "Build the whole CRM." Prefer:

```text
Implement Contract Approval (FR-CONTRACT-004).

Rules: BR-CONTRACT-001, BR-CONTRACT-002
API:   POST /contracts/:id/approve

Expected:
- validate permission
- validate state
- persist approver
- write audit event
- notify creator

Acceptance: AC-CONTRACT-010..013
  - success
  - unauthorized
  - wrong state
  - duplicate approval
```

A task prompt for an agent should ask it, before coding, to: summarize the requirement, list affected modules, list
BR IDs involved, identify unresolved ambiguity, propose implementation steps and tests. After coding: run
lint/typecheck, unit, API/integration and relevant E2E tests, verify AC, summarize changed files, update docs.

---

## Requirement changes

A change usually touches several layers — never update only one document.

```text
New stakeholder requirement
 → compare against existing docs
 → identify conflicts (raise OQ if needed)
 → update business rules
 → update feature spec
 → update architecture (new ADR) if necessary
 → update API / data model
 → update acceptance criteria
 → update traceability
 → update AGENTS.md if an agent rule changed
 → add CHANGELOG entry
```

Example — "NO_SHOW does not consume a session" changes to "NO_SHOW consumes one session". Potentially affected:
BUSINESS_RULES, STATE_MACHINES, the session feature spec, API spec, ACCEPTANCE_CRITERIA, test cases,
TRACEABILITY_MATRIX, AGENTS.md, CHANGELOG.
