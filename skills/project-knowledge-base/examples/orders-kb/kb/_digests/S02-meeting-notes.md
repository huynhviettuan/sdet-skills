# S02 — Orders sync, meeting notes 2026-10-28
`02_meeting_notes_2026-10-28.md` · md · 371 words · kind: meeting notes / decision log · stated date: 2026-10-28
[S02 L2] · authority: decisions marked DECIDED bind, PROPOSED does not; "Not reviewed by attendees" [S02 L4] ·
read: all sections

## Summary
Reviews PRD v0.3, replaces the cancellation rule with a 24-hour window after payment (D-01) and expiry for unpaid
orders (D-02), confirms the lockout numbers, closes manager note editing with "no" (D-03), keeps the admin
read-only (D-04) and defers the manager-sets-paid proposal (D-05). Lists actions; the PRD update was still pending.

## Sections
| Section | Lines | What it covers |
|---|---|---|
| Agenda | L6-L10 | four items |
| 1. PRD review | L12-L16 | lifecycle accepted except cancellation; matrix lives in the roles sheet; payment unowned |
| 2. Cancellation | L18-L31 | the complaint, D-01, D-02, PRD update pending |
| 3. Lockout | L33-L36 | PRD numbers confirmed; FAQ wrong, support to fix |
| 4. Scope of v1 | L38-L47 | D-03, D-04, D-05 (proposed) |
| Actions | L49-L54 | owners of the follow-ups |

## Facts
- Decisions: D-01 cancel a paid order only within 24 hours after payment confirmation; after that 409
  `cancellation window closed` even while still `paid` [S02 L25-L26]. D-02 a `new` order is not cancelled, it
  expires; expiry time TBD (48 hours vs 7 days) [S02 L28-L29]. D-03 manager note editing out of v1; customers edit
  the note, nobody else [S02 L40-L41]. D-04 admin read-only on orders: read all, never create, never edit the note;
  admin delete stays as in the roles sheet [S02 L43-L44].
- Proposed, not decided: D-05 manager marks an order `paid` through the internal tool until a provider exists;
  product wants it logged [S02 L46-L47].
- Numbers: lockout 5 failures per minute per username, 429, Retry-After 60 — confirmed [S02 L35].
- Flows: warehouse picks paid orders before the status is set to shipped, sometimes the next day [S02 L20-L21].
- Document map: permission matrix = the roles sheet (04_roles_sheet) [S02 L15]; PRD section 4 (BR-ORD-03) to be
  updated, "not done at the time of these notes" [S02 L31]; FAQ to be fixed by support [S02 L36; S02 L52].
- Actions: product updates PRD sections 4 and 5; support fixes FAQ; backend proposes expiry; QA waits for the PRD
  update before writing cancellation cases [S02 L51-L54]. Next sync 2026-11-04 [S02 L56].

## Terms
- *cancellation window* — the 24 hours after payment confirmation in which a customer may cancel [S02 L25-L26].
- *expires* — what happens to an unpaid order instead of cancellation [S02 L28].

## Noticed
- The notes are "Not reviewed by attendees" [S02 L4]: decisions here are the newest statement but not a signed-off
  one.
- D-01 and D-02 contradict BR-ORD-03 in the PRD and the FAQ's cancellation answer (conflict for the analysis).
- D-05 would let a manager change a status, which the roles sheet's matrix forbids for every role.
- "days later" [S02 L20] and "the next day" [S02 L21] describe the problem but give no number for the cancel-vs-ship
  race.
