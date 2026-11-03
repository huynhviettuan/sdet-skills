# Requirements

From the PRD draft v0.3 [S01 L2-L4]; rules with BR-/D- IDs are in [business rules](business-rules.md). The PRD is
"not approved" [S01 L4]; decisions of 2026-10-28 that change it are marked.

## Functional — the order

| ID | Requirement | Source |
|---|---|---|
| FR-ORD-01 | An order has an id, an owner (the username that created it), a tenant (the owner's tenant), a note and a status | [S01 L22-L23] |
| FR-ORD-02 | The note is free text of at most 200 characters; longer input is cut to 200 characters, not rejected | [S01 L25] |
| FR-ORD-03 | The id is assigned by the service, starts at 1 and increases by 1 per order | [S01 L27] |
| FR-ORD-04 | An order is created with status `new` | [S01 L29] |

## Functional — lifecycle and permissions

Stated as business rules BR-ORD-01..BR-ORD-09 [S01 L35-L48]; see [business rules](business-rules.md). The
cancellation rule is changed by D-01 and D-02 [S02 L25-L29] and the manager-note TODO is closed by D-03
[S02 L40-L41].

## Non-functional

| ID | Requirement | Source |
|---|---|---|
| NFR-SEC-01 | Sign-in fails with 401 and `invalid credentials`; wrong username and wrong password are not distinguishable | [S01 L55-L56] |
| NFR-SEC-02 | 5 failed sign-ins for the same username within one minute, then 429 with `Retry-After: 60` until the minute has passed | [S01 L57-L58] |
| NFR-SEC-03 | A token is valid for 60 minutes from issue | [S01 L59] |

## Acceptance (draft, no IDs)

The PRD lists four acceptance statements without IDs [S01 L66-L71]:

| # | Statement | Follows from | Source |
|---|---|---|---|
| 1 | A customer of `tenant-a` cannot read an order of `tenant-b` (404) | BR-ORD-06, BR-ORD-09 | [S01 L68] |
| 2 | A customer cannot delete their own order (403) | matrix row "delete an order" | [S01 L69; S04 L38] |
| 3 | A manager of `tenant-a` cannot read an order of `tenant-b` (404) | BR-ORD-07, BR-ORD-09 | [S01 L70] |
| 4 | A note of 201 characters is stored as its first 200 characters | FR-ORD-02 | [S01 L71] |

## Out of scope for v1

Pricing, stock, invoices, refunds, notifications — "separate services" [S01 L12]; manager note editing
[S02 L40-L41].

## Open in the sources

| ID | Question | Status | Source |
|---|---|---|---|
| OQ-01 | Which payment provider? Blocks section 7 | open; "Nobody owns section 7 (payment) yet" | [S01 L75; S02 L16] |
| OQ-02 | Manager note editing (section 5 TODO) | closed by D-03 on 2026-10-28, PRD not yet updated | [S01 L76; S02 L40-L41; S02 L51] |
