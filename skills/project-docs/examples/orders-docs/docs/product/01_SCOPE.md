# 01 — Scope

Snapshot: 2026-11-03. Source: S1 unless marked.

## In scope

| Area | Feature | Spec |
|---|---|---|
| AUTH | Login with username and password, signed bearer token, lockout after repeated failure | FR-AUTH-001 |
| ORD | Create an order with a note | FR-ORD-001 |
| ORD | List and read orders within the caller's data scope | FR-ORD-002 |
| ORD | Edit an order's note | FR-ORD-003 |
| ORD | Order lifecycle: pay, ship, cancel | FR-ORD-004 |
| ORD | Delete an order | FR-ORD-005 |
| ADM | Admin reads the user list and the audit log | FR-ADM-001 |
| SEC | Tenant isolation, 404 for hidden objects, 403 for forbidden functions, 401 without a token, security headers, CORS allow-list, safe error bodies | BR-SEC-* |
| AUD | Audit entry for every denied request | BR-AUD-001 |

## Out of scope (explicit)

- Any user interface. The product is API-only; "UI Behavior" in every feature spec is N/A.
- User registration, password change, password reset, multi-factor authentication, token refresh or revocation.
  A token simply expires after 60 minutes (ADR-004).
- Tenant administration: creating tenants, moving users between tenants, changing roles. Users and tenants are
  seeded (`specs/seed-data.json`).
- Payments: `pay` records that an order was paid; no payment provider, amount, currency or refund exists.
- Shipping logistics: `ship` records the transition only; no carrier, address or tracking.
- Order lines, prices, stock, invoices.
- Notifications of any kind (email, webhook). "Notifications" in every feature spec is N/A.
- Reporting and export.
- Data migration: there is no legacy system.
- The reference implementation's test hooks `POST /_reset` and `GET /_boom` (S2). They are not product features
  and must not exist in a deployed build (see `../security/SECURITY.md`).

## Boundaries that are decided elsewhere

- Who may do what: `../business/ROLES_PERMISSIONS.md` (the only permission table).
- Which transitions are legal: `../business/STATE_MACHINES.md` (the only transition table).
- Which values are configurable: `../business/CONFIGURATION_RULES.md`.
