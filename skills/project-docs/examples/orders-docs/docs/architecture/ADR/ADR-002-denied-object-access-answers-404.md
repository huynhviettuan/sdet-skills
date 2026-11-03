# ADR-002 — Denied object access answers 404, not 403

Status: Accepted
Date: 2026-11-03
Deciders: Product Owner, security reviewer (example roles)

## Context

S1 sentence 9 requires that a denied object access "does not confirm existence". Order ids are small sequential
integers (BR-ORD-001), so a 403 on `GET /orders/7` would tell a customer of another tenant that order 7 exists,
and a scan would reveal the tenant's order volume.

## Decision

Every per-order operation answers 404 `{"error": "not found"}` when the caller's data scope does not include the
order — identical in status and body to an id that was never created. The scope check runs before the function
check, so a hidden object never answers 403 (BR-SEC-001, BR-SEC-002). The refusal is still audited as a denial
(BR-AUD-001), so the operator can tell the two apart; the caller cannot.

## Alternatives

- 403 for everything the caller may not do — rejected: confirms existence.
- Opaque random ids with 403 — rejected: still leaks on a known id, and ids are part of S1's field list.

## Why

The cheapest way to make enumeration useless; the convention in the OWASP API Security guidance the security
skill follows.

## Consequences

Positive:
- One error body for "not yours" and "not there"; tests assert equality of the two (AC-ORD-015).

Negative:
- A customer who typos an id of their own order cannot tell it from a permission problem; acceptable, there is
  no UI.

## Revisit When

Orders get shareable links or a support role that must distinguish "missing" from "forbidden".
