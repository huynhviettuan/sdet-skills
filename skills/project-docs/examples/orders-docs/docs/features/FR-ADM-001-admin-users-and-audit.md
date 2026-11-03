# FR-ADM-001 — Admin reads the user list and the audit log

Snapshot: 2026-11-03. Source: S1 sentences 8, 13; S2 `admin_users`, `audit`.

## Purpose
Give the platform admin the two read-only views that oversight needs: who exists, and who was refused what.

## Actors
admin. Every other role is refused.

## Preconditions
Valid admin token.

## Main Flow
1. `GET /admin/users` → 200 with `[{"username", "tenant", "role"}, ...]` for every seeded user; never a password.
2. `GET /_audit` → 200 with the audit entries in insertion order (`../security/AUDIT_LOGGING.md`).

## Alternative Flows
- A. Customer or manager: 403 `forbidden`, audited (which makes the audit log grow by its own refusal).
- B. Anonymous: 401.

## States
N/A

## Business Rules
BR-ORD-002 (admin scope), BR-SEC-002, BR-AUD-001

## Fields
User: `username`, `tenant`, `role`. AuditEntry: `actor`, `action`, `outcome`.

## Permissions
`admin.users` — AZ-015..AZ-018; `audit.read` — AZ-046..AZ-048.

## API
`GET /admin/users`, `GET /_audit` — `../api/API_SPECIFICATION.md`. The `_audit` path is the reference
implementation's; a product build may rename it to `/admin/audit` (MODEL RECOMMENDATION) — the matrix row text
changes with it.

## Validation
N/A

## Calculations
N/A

## Audit Events
Denials only.

## Notifications
N/A

## Error Cases
| Case | Answer |
|---|---|
| no token | 401 |
| non-admin | 403 |

## UI Behavior
N/A

## Acceptance Criteria
AC-ADM-001, AC-ADM-002, AC-AUD-001, AC-AUD-002

## Dependencies
FR-AUTH-001; BR-AUD-001.

## Open Questions
None.
