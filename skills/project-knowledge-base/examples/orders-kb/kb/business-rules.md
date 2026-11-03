# Business rules

The documents' own IDs are kept. "Status" says whether a later source changed the rule; details in
[analysis](analysis.md). Decisions from the sync of 2026-10-28 are in [decisions](decisions.md).

## The order

| ID | Rule | Applies to | Status | Source |
|---|---|---|---|---|
| FR-ORD-02 | The note is free text of at most 200 characters; longer input is cut to 200 characters, not rejected | Order.note | current | [S01 L25] |
| FR-ORD-03 | The id is assigned by the service, starts at 1 and increases by 1 per order | Order.id | current | [S01 L27] |
| FR-ORD-04 | An order is created with status `new` | Order.status | current | [S01 L29] |

## Lifecycle

| ID | Rule | Applies to | Status | Source |
|---|---|---|---|---|
| BR-ORD-01 | `new` becomes `paid` when the payment provider confirms payment | Order | current; provider not chosen (OQ-01) | [S01 L35; S01 L63] |
| BR-ORD-02 | `paid` becomes `shipped` when a manager of the tenant marks it shipped | Order, manager | current in the PRD; the matrix denies status changes to every role (C-2) | [S01 L36; S04 L37] |
| BR-ORD-03 | A customer may cancel an order while it is `new` or `paid`; a `shipped` order cannot be cancelled | Order, customer | **superseded in part** by D-01 and D-02 (2026-10-28); PRD update pending (C-1) | [S01 L37; S02 L25-L29; S02 L31] |
| D-01 | A customer may cancel a paid order only within 24 hours after the payment was confirmed; after that the cancel request answers 409 `cancellation window closed`, even if still `paid` | Order, customer | decided 2026-10-28, not yet in the PRD | [S02 L25-L26] |
| D-02 | A `new` (unpaid) order is not cancelled by the customer; it expires. Expiry time TBD | Order | decided 2026-10-28; number missing (G-1) | [S02 L28-L29] |
| BR-ORD-04 | `shipped` and `cancelled` are final; no status change leaves them | Order | current | [S01 L38] |
| BR-ORD-05 | Only the service changes the status; a client that sends `status` in an update request gets 400 with the rejected field names | API clients | current | [S01 L39-L40] |

## Permissions

| ID | Rule | Applies to | Status | Source |
|---|---|---|---|---|
| BR-ORD-06 | A customer sees and edits only the orders they own; the note is the only field a customer can edit | customer | current | [S01 L44; S04 L34-L36] |
| BR-ORD-07 | A manager sees every order of their own tenant and may delete any of them | manager | current | [S01 L45; S04 L34; S04 L38] |
| BR-ORD-08 | An admin reads every order of every tenant but cannot create an order (403) | admin | current, confirmed by D-04 | [S01 L46; S02 L43-L44; S04 L33] |
| D-03 | Manager note editing stays out of v1; customers edit the note, nobody else | manager, admin | decided 2026-10-28; closes the PRD TODO and OQ-02 | [S02 L40-L41; S01 L50-L51] |
| D-04 | Admin stays read-only on orders: read all, never create, never edit the note; delete by admin stays as in the roles sheet | admin | decided 2026-10-28 | [S02 L43-L44; S04 L38] |
| BR-ORD-09 | An order the caller must not know about answers 404, never 403, so that ids of other tenants cannot be enumerated | every role | current | [S01 L47-L48] |
| BR-SEC-001 | Do not confirm existence: 404 for an object the caller must not know about | every role | current, same rule as BR-ORD-09 | [S04 L23] |

## Sign-in

| ID | Rule | Applies to | Status | Source |
|---|---|---|---|---|
| NFR-SEC-01 | Sign-in fails with 401 and the message `invalid credentials` for a wrong username or a wrong password; the two cases are not distinguishable from the response | sign-in | current; FAQ agrees | [S01 L55-L56; S03 L41-L42] |
| NFR-SEC-02 | After 5 failed sign-ins for the same username within one minute, further attempts for that username answer 429 with `Retry-After: 60` until the minute has passed | sign-in | current, confirmed 2026-10-28; the FAQ's "15 minutes" is stale | [S01 L57-L58; S02 L35; S03 L41] |
| NFR-SEC-03 | A token is valid for 60 minutes from issue | token | current; FAQ says "About an hour" | [S01 L59; S03 L45] |

## Proposed, not a rule yet

| ID | Proposal | Status | Source |
|---|---|---|---|
| D-05 | A manager may mark an order `paid` through the internal tool until the payment provider exists; product wants this logged | proposed 2026-10-28, deferred to the next sync | [S02 L46-L47] |
