# ADR-001 — The permission matrix is the single source of authorization tests

Status: Accepted
Date: 2026-11-03
Deciders: Product Owner, QA lead (example roles)

## Context

Authorization in a multi-tenant API is where silent regressions hurt most: a test that hard-codes "bob gets 404"
in its own body cannot be reviewed against the product's intent, and a role that nobody wrote a test for is
unprotected. S3 (the reference matrix) already drives its suite from a Markdown table.

## Decision

`docs/business/ROLES_PERMISSIONS.md` holds one table `ID | Operation | Actor | Expected` (`AZ-NNN`). It is the
only place that states what each actor gets on each operation. Automated authorization tests are generated or
parameterised from it (`authz_matrix.py generate`), one test per row carrying the row ID in its name, and
`authz_matrix.py verify` proves every row ran and passed. Every operation has an anonymous row and at least one
deny row; the generator warns otherwise.

## Alternatives

- Expectations written in each test — rejected: unreviewable, drifts from the docs.
- A permission table in code (enum/decorator) exported to docs — rejected for now: the docs are the contract the
  stakeholder reviews; the code is level 8.

## Why

One owner per table; a changed row is a visible diff a stakeholder can approve; coverage is countable.

## Consequences

Positive:
- A new endpoint without matrix rows is a review finding, not a surprise.
- The BR-ORD-002 summary table and the matrix must agree; the matrix wins for tests.

Negative:
- Rows that are assumptions (OQ-004, OQ-006) are tested as if decided; they are marked in the file.

## Revisit When

Roles become configurable per tenant, or permissions depend on fields other than role, tenant and owner.
