# ADR-003 — Lifecycle transitions are action endpoints, not a writable `status`

Status: Accepted
Date: 2026-11-03
Deciders: Product Owner, tech lead (example roles)

## Context

S1 sentence 5 defines the lifecycle; sentence 6 says customers may edit `note` only. The reference implementation
(S2) rejects `status` on PATCH (BR-SEC-003) and offers no way to move an order at all. The product needs pay, ship
and cancel, each with its own actor (customer pays, manager ships) and its own precondition (the cancellation
window).

## Decision

Three action endpoints: `POST /orders/{id}/pay`, `POST /orders/{id}/ship`, `POST /orders/{id}/cancel`. Each
takes no body, checks token → scope → function → state in that order, and answers 200 with the updated order, 409
`invalid transition` when the state has no such row, or 409 `cancellation window closed` (BR-ORD-006). `status`
stays read-only on PATCH (AC-ORD-021). `new → paid` stamps `paid_at`.

## Alternatives

- `PATCH {"status": "paid"}` with a per-transition permission table — rejected: one endpoint with four different
  permission sets and preconditions is hard to document in the matrix and invites mass assignment.
- A single `POST /orders/{id}/transition {"action": ...}` — rejected: same reason, and the matrix would need a
  body column.

## Why

One row per (operation, actor) in the matrix; one precondition per endpoint; the read-only `status` rule of S2
stays true.

## Consequences

Positive:
- The matrix gains 20 rows (AZ-024..AZ-043) that each test one thing.
- Idempotency is natural: a second `pay` is an illegal transition and changes nothing.

Negative:
- `paid_at` is a new stored field the reference server does not have.

## Revisit When

A fourth transition appears, or transitions need a body (reason for cancellation, carrier for shipping).
