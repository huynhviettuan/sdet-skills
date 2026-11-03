# Analysis

16 findings: 3 conflicts (1 high, 1 medium, 1 low), 7 gaps, 4 ambiguities, 5 risks, plus 4 stale statements,
2 missing documents and 3 duplicates. Questions this KB raises are numbered KQ-n; where the sources already ask the
question, their own ID (OQ-01, OQ-02) is used instead.

Authority used: the roles sheet binds for permissions ("The service enforces this table" [S04 L4]); the sync's
DECIDED items bind over the PRD they postdate, although the notes are "Not reviewed by attendees" [S02 L4]; the PRD
is a draft, "not approved" [S01 L4]; the FAQ is customer wording with no date [S03 L5] and is known to be partly
wrong [S02 L36]. PROPOSED items (D-05) bind nothing [S02 L46].

## Summary

1. **Cancellation is two different rules** (C-1, KQ-1): the PRD and the FAQ let a customer cancel until shipped;
   the sync decided a 24-hour window after payment and expiry for unpaid orders, and the PRD was not updated.
   Cancellation cases cannot be written as specified until the owner confirms which rule ships.
2. **Nobody is allowed to change a status, yet two transitions need a manager** (C-2, KQ-2): the matrix gives
   "change the status" to no role, the PRD has a manager mark shipped and set paid, and the sync deferred the
   proposal. Who may act on `paid` → `shipped` decides what gets built and who the test signs in as.
3. **Money on cancellation is unowned** (R-2, KQ-4): a paid order can be cancelled, refunds are out of scope for
   v1, and no source says what happens to the payment.

## Conflicts

| # | Severity | Topic | Source A says | Source B says | Likely current | KQ / OQ |
|---|---|---|---|---|---|---|
| C-1 | High | Customer cancellation rule (BR-ORD-03 vs D-01, D-02) | "A customer may cancel an order while it is `new` or `paid`; a `shipped` order cannot be cancelled" [S01 L37] (draft, 2026-10-20); the FAQ agrees: "as long as it has not shipped" [S03 L23] (undated) | "a customer may cancel a paid order only within 24 hours after the payment was confirmed", then 409 `cancellation window closed` [S02 L25-L26]; a `new` order "is not cancelled by the customer; it expires" [S02 L28] (2026-10-28, DECIDED) | S02: newer and decided; the PRD update is a pending action [S02 L31; S02 L51] | KQ-1 |
| C-2 | Medium | Who may change a status (BR-ORD-02, D-05) | a manager marks the order shipped [S01 L36]; until a provider exists "the `paid` status can only be set by a manager through an internal tool" [S01 L64] (draft, 2026-10-20) | matrix row "change the status": no for customer, manager and admin [S04 L37] (snapshot 2026-10-15, enforced by the service [S04 L4]) | unclear: the PRD is newer but a draft; the sync deferred the manager-sets-paid proposal [S02 L46-L47] and did not mention shipped. Medium, not High: "internal tool" may sit outside the API the matrix describes, but a tester would still write the shipped transition against the wrong actor | KQ-2 |
| C-3 | Low | Note length wording (FR-ORD-02) | "at most 200 characters" [S01 L25] | "about 200 characters" [S03 L10] | S01: the exact number; the FAQ is customer wording | — |

## Gaps

| # | Severity | Where | What is missing | KQ / OQ |
|---|---|---|---|---|
| G-1 | High | D-02 [S02 L28-L29] | the expiry time of a `new` order ("TBD"; 48 hours and 7 days proposed) and the status an expired order ends in | KQ-3 |
| G-2 | High | PRD §7 [S01 L63-L64] | the payment provider, the call a customer makes to pay, and what happens when payment fails | OQ-01 |
| G-3 | Medium | PRD §4, flow 02 [S01 L37] | the response when a `shipped` order is cancelled, and when a `new` order is cancelled under D-02 [S02 L28] | KQ-6 |
| G-4 | Medium | roles sheet matrix [S04 L30-L40] | no "cancel an order" row; whether a manager or an admin may cancel is nowhere stated | KQ-5 |
| G-5 | Medium | roles sheet [S04 L59] | list scoping per actor has no worked example (the sheet says so itself) | — |
| G-6 | Medium | flow 02, PRD scope [S01 L12; S02 L25] | what a cancellation of a `paid` order does to the money; refunds are a separate service | KQ-4 |
| G-7 | Low | PRD §6 [S01 L57-L58] | whether a successful sign-in resets the failure count; whether the count is per username only | — |

## Ambiguities

| # | Severity | Phrase | Where | Why it matters | KQ / OQ |
|---|---|---|---|---|---|
| AM-1 | Low | "about 200 characters" | [S03 L10] | the PRD's limit is exact (200) [S01 L25]; a customer may read "about" as tolerance | — (C-3) |
| AM-2 | Low | "several wrong attempts", "15 minutes" | [S03 L41] | the PRD says 5 attempts and `Retry-After: 60` [S01 L57-L58]; support is to fix the FAQ [S02 L52] | — (stale) |
| AM-3 | Low | "About an hour" | [S03 L45] | the PRD says 60 minutes [S01 L59] | — |
| AM-4 | Medium | "days later", "sometimes the next day" | [S02 L20-L21] | the cancel-vs-ship race has no number; the 24-hour window (D-01) was chosen against it without one | KQ-1 |

## Stale or superseded

| # | Statement | Where | Superseded by |
|---|---|---|---|
| ST-1 | BR-ORD-03: cancel while `new` or `paid` | [S01 L37] | D-01 and D-02 [S02 L25-L29]; PRD update pending [S02 L31] |
| ST-2 | FAQ: cancel "as long as it has not shipped" | [S03 L23-L24] | D-01 and D-02 [S02 L25-L29]; no FAQ action recorded for this (only for lockout [S02 L52]) |
| ST-3 | FAQ: lockout for "15 minutes" after "several wrong attempts" | [S03 L41] | PRD numbers confirmed [S02 L35]; support to fix the FAQ [S02 L36; S02 L52] |
| ST-4 | PRD TODO and OQ-02: manager note editing undecided | [S01 L50-L51; S01 L76] | D-03: out of v1, "nobody else" edits the note [S02 L40-L41] |

## Missing or unreadable documents

| Reference / file | Referenced from | Status |
|---|---|---|
| PRD v0.2 (2026-10-06), which "said yes" to manager note editing | [S01 L5; S01 L50] | not in the sources |
| the "internal tool" through which a manager sets `paid` | [S01 L64; S02 L46] | no document; not named |

All four sources were readable; none needs OCR (see the [inventory](_sources/inventory.md)).

## Duplicates

| Topic | Places | Agree today? |
|---|---|---|
| who sees an order (own / tenant / all) | [S01 L44-L46], [S03 L32; S03 L35-L36], [S04 L34-L35] | yes |
| hidden object answers 404 | BR-ORD-09 [S01 L47-L48], BR-SEC-001 [S04 L23], FAQ "not found" [S03 L36] | yes |
| lockout numbers | [S01 L57-L58], [S02 L35], [S03 L41] | no — the FAQ differs (ST-3) |

## Risks

| # | Area | Risk | Sources |
|---|---|---|---|
| R-1 | permissions | tenant isolation rests on 404-not-403 and on scope per role; the matrix's own examples skip list scoping | [S01 L47-L48; S04 L23; S04 L59] |
| R-2 | money | a `paid` order can be cancelled (24 h window) while refunds are out of scope; no source says what the customer gets back | [S02 L25-L26; S01 L12] |
| R-3 | concurrency | the warehouse ships before the status is `shipped`; a cancel and a ship can cross | [S02 L20-L21] |
| R-4 | data | a note over 200 characters is cut silently, not rejected; the customer is told "we keep the beginning" | [S01 L25; S03 L11] |
| R-5 | process | the binding decisions live in notes "Not reviewed by attendees" and the PRD lags them | [S02 L4; S02 L31] |

## Open questions

| KQ / OQ | Question | For whom | Blocks | From finding |
|---|---|---|---|---|
| KQ-1 | Which cancellation rule ships in v1: until shipped (PRD) or 24 hours after payment plus expiry for unpaid orders (D-01, D-02)? When is the PRD updated? | product | cancellation cases; flow 02 | C-1, AM-4 |
| KQ-2 | May a manager change a status through the API (mark shipped; set paid until a provider exists), or only through the internal tool? What is the internal tool? | product, backend | `paid` → `shipped` tests; D-05 | C-2 |
| KQ-3 | What is the expiry time of a `new` order, and what status does an expired order end in? | backend (to propose), product | expiry tests | G-1 |
| KQ-4 | What happens to the payment when a `paid` order is cancelled within the window? | product | refund path, risk R-2 | G-6 |
| KQ-5 | May a manager or an admin cancel an order? | product | matrix completeness | G-4 |
| KQ-6 | What does a refused cancel answer: for a `shipped` order, and for a `new` order under D-02? | backend | negative cancellation cases | G-3 |
| OQ-01 | Which payment provider? | unowned ("Nobody owns section 7") | BR-ORD-01, payment flow | G-2 [S01 L75; S02 L16] |
| OQ-02 | Manager note editing | closed by D-03 [S02 L40-L41]; PRD text pending | — | ST-4 |
