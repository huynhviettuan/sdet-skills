# Orders service — product requirements (DRAFT v0.3)

Status: draft, not approved. Last edited 2026-10-20. Owner: product.
This document replaces v0.2 (2026-10-06). Sections marked TODO are still open.

## 1. Purpose

The Orders service lets a customer of a tenant place an order with a short note, pay for it and follow it until
it ships. Managers of the tenant oversee the tenant's orders. A platform admin can read everything for support.

Out of scope for v1: pricing, stock, invoices, refunds, notifications. These are separate services.

## 2. Tenants and users

- Every user belongs to exactly one tenant, except the platform admin, who belongs to none.
- Example tenants used in this document: `tenant-a` and `tenant-b`.
- Roles are `customer`, `manager` and `admin`. The permission matrix lives in the roles sheet (04_roles_sheet).

## 3. The order

FR-ORD-01 An order has an id, an owner (the username that created it), a tenant (the owner's tenant), a note and
a status.

FR-ORD-02 The note is free text of at most 200 characters. Longer input is cut to 200 characters, not rejected.

FR-ORD-03 The id is assigned by the service, starts at 1 and increases by 1 per order.

FR-ORD-04 An order is created with status `new`.

## 4. Status lifecycle

The statuses are `new`, `paid`, `shipped` and `cancelled`.

BR-ORD-01 `new` becomes `paid` when the payment provider confirms payment (see section 7).
BR-ORD-02 `paid` becomes `shipped` when a manager of the tenant marks it shipped.
BR-ORD-03 A customer may cancel an order while it is `new` or `paid`; a `shipped` order cannot be cancelled.
BR-ORD-04 `shipped` and `cancelled` are final. No status change leaves them.
BR-ORD-05 Only the service changes the status. A client that sends `status` in an update request gets 400 with
the rejected field names.

## 5. Who may do what

BR-ORD-06 A customer sees and edits only the orders they own. The note is the only field a customer can edit.
BR-ORD-07 A manager sees every order of their own tenant and may delete any of them.
BR-ORD-08 An admin reads every order of every tenant but cannot create an order (403).
BR-ORD-09 An order that the caller must not know about answers 404, never 403, so that ids of other tenants cannot
be enumerated.

TODO: decide whether a manager can edit the note of an order in their tenant. v0.2 said yes; support asked to
remove it. Not decided as of v0.3.

## 6. Sign-in

NFR-SEC-01 Sign-in fails with 401 and the message `invalid credentials` for a wrong username or a wrong password;
the two cases are not distinguishable from the response.
NFR-SEC-02 After 5 failed sign-ins for the same username within one minute, further attempts for that username
answer 429 with `Retry-After: 60` until the minute has passed.
NFR-SEC-03 A token is valid for 60 minutes from issue.

## 7. Payment (TODO)

Payment confirmation will come from the payment provider through a callback. The provider is not chosen yet.
Until it is, the `paid` status can only be set by a manager through an internal tool.

## 8. Acceptance (draft)

- A customer of `tenant-a` cannot read an order of `tenant-b` (404).
- A customer cannot delete their own order (403).
- A manager of `tenant-a` cannot read an order of `tenant-b` (404).
- A note of 201 characters is stored as its first 200 characters.

## 9. Open points

- OQ-01 Which payment provider? Blocks section 7.
- OQ-02 Manager note editing (section 5 TODO).
