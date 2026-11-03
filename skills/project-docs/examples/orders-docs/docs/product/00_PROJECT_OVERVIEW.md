# 00 — Project Overview: Orders

Snapshot: 2026-11-03. Documentation level: **2 (production application)** — the API is small, but it is
multi-tenant with authorization, a state machine and a lockout, which is exactly what Level 1 leaves unenforced.

## Goal

Orders is a multi-tenant HTTP API in which customers of a tenant create and follow their own orders, managers of
the tenant oversee and ship them, and a platform admin audits everything without taking part in any order. The
product's value is the isolation: no tenant, and no customer within a tenant, can learn anything about another's
orders, and every refusal leaves a trace.

## Why

The package exists as the shared example domain of the sdet-skills plugin: the test-design, security, automation
and documentation skills all exercise the same Orders rules. It is therefore deliberately small and completely
specified, with its open points listed rather than guessed.

## Sources

| Id | Source | Role in the hierarchy |
|---|---|---|
| S1 | Stakeholder brief, 2026-11-03, restated in [`02_PRD.md`](02_PRD.md) | the requirements (SOURCE REQUIREMENT) |
| S2 | Reference implementation `skills/security-testing/examples/vuln-api/app.py` (secure configuration, no flaw enabled) | existing implementation (level 8) |
| S3 | Reference permission matrix `skills/security-testing/examples/vuln-api/ROLES_PERMISSIONS.md` | existing implementation; its rows AZ-001..023 are kept verbatim in [`../business/ROLES_PERMISSIONS.md`](../business/ROLES_PERMISSIONS.md) |

Every statement in this package carries `Source: S1`, `Source: S2`, `MODEL RECOMMENDATION` or `ASSUMPTION`.
Where S1 and S2 disagree the disagreement is an OQ ([`OPEN_QUESTIONS.md`](OPEN_QUESTIONS.md)), never a silent choice.

## Actors

| Actor | Tenant scope | Summary |
|---|---|---|
| Customer | own tenant, own orders | creates orders, edits their note, pays and cancels them |
| Manager | own tenant, every order | reads, ships, cancels and deletes the tenant's orders |
| Admin | every tenant | reads everything, lists users, reads the audit log, deletes; never creates or moves an order |
| Anonymous | none | may only log in |

Example users (S2, example values): `alice`, `erin` (customers, `tenant-a`), `bob` (customer, `tenant-b`), `carol`
(manager, `tenant-a`), `dave` (manager, `tenant-b`), `root` (admin, every tenant).

## Business entities

Tenant, User, Order, Audit entry, Login attempt — defined in [`../architecture/DATA_MODEL.md`](../architecture/DATA_MODEL.md).

## Where to read next

- What is in and out: [`01_SCOPE.md`](01_SCOPE.md)
- The flows: [`03_BUSINESS_FLOW.md`](03_BUSINESS_FLOW.md)
- The rules: [`../business/BUSINESS_RULES.md`](../business/BUSINESS_RULES.md), [`../business/STATE_MACHINES.md`](../business/STATE_MACHINES.md), [`../business/ROLES_PERMISSIONS.md`](../business/ROLES_PERMISSIONS.md)
- What "done" means: [`../quality/DEFINITION_OF_DONE.md`](../quality/DEFINITION_OF_DONE.md)
- What is undecided: [`OPEN_QUESTIONS.md`](OPEN_QUESTIONS.md)
