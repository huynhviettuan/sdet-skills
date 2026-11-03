# Overview

## What the Orders service is

The Orders service lets a customer of a tenant place an order with a short note, pay for it and follow it until it
ships; managers of the tenant oversee the tenant's orders and a platform admin can read everything for support
[S01 L9-L10]. A tenant is the company a user belongs to; the FAQ calls it "your company" [S03 L32] (see the
[glossary](glossary.md)).

## Status of the project

- The requirements are a draft: "Status: draft, not approved. Last edited 2026-10-20" [S01 L4], replacing v0.2 of
  2026-10-06 [S01 L5].
- A sync on 2026-10-28 changed the cancellation rule and closed two open points; the PRD update was "not done at
  the time of these notes" [S02 L31]. The next sync is 2026-11-04 [S02 L56].
- The permission matrix is a snapshot of 2026-10-15 that the service enforces [S04 L2; S04 L4].
- The customer FAQ has no publication date [S03 L5] and is known to be wrong on lockout [S02 L36].

## Scope

| In v1 | Out of v1 | Source |
|---|---|---|
| placing, paying for and following an order; manager oversight; admin read access | pricing, stock, invoices, refunds, notifications — "separate services" | [S01 L9-L12] |
| customers edit the note; nobody else | manager note editing | [S02 L40-L41] |
| admin reads all orders, never creates or edits | — | [S02 L43-L44] |

## Users

| Role | Who | Source |
|---|---|---|
| customer | places orders for their own tenant and follows them | [S01 L9; S04 L33-L34] |
| manager | oversees every order of their tenant, may delete | [S01 L10; S01 L45] |
| admin | platform support: reads every order of every tenant, cannot create | [S01 L10; S01 L46] |

Details and the matrix: [actors and permissions](actors-and-permissions.md).

## Key numbers

| Number | Value | Source |
|---|---|---|
| note length | at most 200 characters; longer input cut, not rejected | [S01 L25] |
| failed sign-ins before lockout | 5 per username within one minute | [S01 L57] |
| lockout answer | 429 with `Retry-After: 60` | [S01 L58] |
| token lifetime | 60 minutes from issue | [S01 L59] |
| cancellation window (decided, PRD not yet updated) | 24 hours after payment confirmation | [S02 L25-L26] |
| expiry of an unpaid order | TBD — 48 hours or 7 days proposed | [S02 L28-L29] |

## What is not settled

Three things change what gets built or tested; see [analysis](analysis.md): the cancellation rule (C-1), who may
change a status (C-2), and the payment provider (OQ-01 [S01 L75]).
