# 02 — PRD: the stakeholder brief (S1), restated

Snapshot: 2026-11-03. This file restates the stakeholder brief of 2026-11-03 sentence by sentence so the rest of
the package can cite it as `S1`. Nothing here is interpreted; interpretation lives in the BR/FR/AC documents.

## Brief, as received

1. Two tenants exist, `tenant-a` and `tenant-b`.
2. Three roles exist: customer, manager, admin.
3. Users (example values): alice, bob, erin, carol, dave, root.
4. An order has the fields `id`, `owner`, `tenant`, `note` (at most 200 characters) and `status`.
5. Status lifecycle: `new` → `paid` → `shipped`; `new` or `paid` → `cancelled`; `shipped` is terminal.
6. Customers create and read their own orders and may edit `note` only.
7. Managers see every order of their tenant and may delete.
8. Admin sees all but may not create.
9. Denied object access answers 404 (do not confirm existence); denied function access answers 403; no token
   answers 401.
10. Login lockout after 5 failed attempts per account per minute, with `Retry-After: 60`.
11. The error for an unknown user is identical to the error for a wrong password.
12. The security headers listed in the reference implementation are sent on every response.
13. An audit entry is written for every denied request.

## What the brief does not say (each is an OQ)

- Who may pay, ship or cancel (sentences 5–8 name the transitions but not the actor) — decided by ADR-003 for the
  endpoint shape; the actor rows are in `ROLES_PERMISSIONS.md` with the assumptions marked (OQ-004, OQ-006).
- Whether a note longer than 200 characters is rejected or shortened (OQ-002).
- Whether a paid order can be cancelled at any time (OQ-001).
- Whether there is any cap on a customer's open orders (OQ-003).
- Whether the note may still be edited once the order is shipped or cancelled (OQ-005).
- Whether a manager may create orders or edit notes (sentence 6 names customers; sentence 7 does not forbid
  managers) (OQ-006).

## Success criteria

- Every sentence above maps to at least one BR and one AC (`../../REQUIREMENTS_CATALOGUE.md`).
- Every row of the permission matrix has a passing test.
- No test exists whose expected result is not quotable from an AC.
