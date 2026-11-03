<!-- S02: 02_meeting_notes_2026-10-28.md — extracted 2026-11-03; cite as [S02 L<line>] -->
# Orders sync — meeting notes, 2026-10-28

Attendees: product, backend, support, QA (names omitted). Notes taken by product. Not reviewed by attendees.

Agenda:
1. v0.3 PRD review
2. Cancellation complaints from support
3. Lockout numbers
4. What goes into v1

## 1. PRD review

Backend has read v0.3. The lifecycle in section 4 is fine except cancellation, see item 2.
QA asked where the permission matrix lives: answer, the roles sheet (04_roles_sheet), the PRD only links it.
Nobody owns section 7 (payment) yet.

## 2. Cancellation

Support reports customers cancelling paid orders days later, after the warehouse has already picked them but
before the status was set to shipped. Warehouse marks shipped late, sometimes the next day.

Discussion: backend proposed a cancellation window instead of "until shipped".

D-01 DECIDED: a customer may cancel a paid order only within 24 hours after the payment was confirmed. After
24 hours the cancel request answers 409 `cancellation window closed`, even if the order is still `paid`.

D-02 DECIDED: a `new` (unpaid) order is not cancelled by the customer; it expires. The expiry time is TBD
(backend to propose; support wants 48 hours, product wants 7 days).

Product to update PRD section 4 (BR-ORD-03) — not done at the time of these notes.

## 3. Lockout

Support confirmed the numbers in the PRD: 5 failures per minute per username, then 429 with Retry-After 60.
The FAQ text says something else; support will fix the FAQ. No decision needed.

## 4. Scope of v1

D-03 DECIDED: manager note editing stays out of v1. Customers edit the note, nobody else. PRD TODO in section 5
to be closed with "no".

D-04 DECIDED: admin stays read-only on orders: read all, never create, never edit the note. Delete by admin
stays as in the roles sheet.

D-05 PROPOSED (not decided): a manager may mark an order `paid` through the internal tool until the payment
provider exists. Product wants this logged. Decision deferred to the next sync.

## Actions

- Product: update PRD section 4 and section 5 (D-01, D-02, D-03).
- Support: fix the FAQ lockout text.
- Backend: propose the expiry time for `new` orders (D-02).
- QA: cancellation cases wait for the PRD update.

Next sync: 2026-11-04.
