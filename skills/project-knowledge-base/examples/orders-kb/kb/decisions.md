# Decisions and assumptions

All decisions come from one sync, 2026-10-28 [S02 L2]; the notes are "Not reviewed by attendees" [S02 L4]. The
PRD they change was still unchanged when the notes were written [S02 L31; S02 L51].

## Decided

| ID | Date | Decision | Changes | Source |
|---|---|---|---|---|
| D-01 | 2026-10-28 | A customer may cancel a paid order only within 24 hours after the payment was confirmed; after 24 hours the cancel request answers 409 `cancellation window closed`, even if the order is still `paid` | supersedes the `paid` part of BR-ORD-03 [S01 L37] | [S02 L25-L26] |
| D-02 | 2026-10-28 | A `new` (unpaid) order is not cancelled by the customer; it expires; expiry time TBD (support wants 48 hours, product 7 days) | supersedes the `new` part of BR-ORD-03 [S01 L37]; number missing | [S02 L28-L29] |
| D-03 | 2026-10-28 | Manager note editing stays out of v1; customers edit the note, nobody else | closes the PRD TODO [S01 L50-L51] and OQ-02 [S01 L76]; agrees with the matrix [S04 L36] | [S02 L40-L41] |
| D-04 | 2026-10-28 | Admin stays read-only on orders: read all, never create, never edit the note; delete by admin stays as in the roles sheet | confirms BR-ORD-08 [S01 L46] and the matrix [S04 L33; S04 L38] | [S02 L43-L44] |

## Proposed, deferred

| ID | Date | Proposal | Blocked by | Source |
|---|---|---|---|---|
| D-05 | 2026-10-28 | A manager may mark an order `paid` through the internal tool until the payment provider exists; product wants this logged | "Decision deferred to the next sync" (2026-11-04) | [S02 L46-L47; S02 L56] |

## Still open

| ID | Question | Owner (as the sources say) | Source |
|---|---|---|---|
| OQ-01 | Which payment provider? | nobody owns section 7 yet | [S01 L75; S02 L16] |
| D-02 expiry time | 48 hours or 7 days? | backend to propose | [S02 L29; S02 L53] |

## Assumptions stated by the sources

- The roles sheet declares its own basis: "Basis: assumption (an example product)" [S04 L4].
- The PRD's acceptance section is marked draft [S01 L66].
