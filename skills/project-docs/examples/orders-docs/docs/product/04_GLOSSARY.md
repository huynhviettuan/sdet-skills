# 04 — Glossary

Terms are the stakeholder's (S1) unless a mapping is noted. Example values are marked.

| Term | Meaning | Notes |
|---|---|---|
| Tenant | An isolated customer organisation; every order and every non-admin user belongs to exactly one | example values `tenant-a`, `tenant-b` |
| Customer | A user who creates and follows their own orders inside one tenant | role value `customer` |
| Manager | A user who oversees every order of their tenant | role value `manager` |
| Admin | The platform operator; sees every tenant, never takes part in an order | role value `admin`; tenant recorded as `*` (S2) |
| Anonymous | A request without a valid bearer token | actor name used in the permission matrix |
| Owner | The username that created the order | field `owner` |
| Note | Free text attached to an order, at most 200 characters | field `note` |
| Status | The order's lifecycle state: `new`, `paid`, `shipped`, `cancelled` | field `status`; transitions in STATE_MACHINES.md |
| Terminal state | A state with no outgoing transition | `shipped`, `cancelled` |
| Cancellation window | The time after payment during which a paid order may still be cancelled | assumed 24 h, OQ-001 |
| Open order | An order in status `new` | used by the open-order cap, OQ-003 |
| Denied request | A request answered 401, 403 or 404 for authorization reasons | always audited (BR-AUD-001) |
| Hidden object | An object the caller must not learn exists; answered 404 | BR-SEC-001 |
| Lockout | The state of a username that failed to log in 5 times within a minute | BR-AUTH-002 |
| Data scope | Which records a role may see: OWN, TENANT or ALL | ROLES_PERMISSIONS.md |
| Actor (matrix) | A role relative to the order under test, e.g. `customer-other-tenant` | ROLES_PERMISSIONS.md |
