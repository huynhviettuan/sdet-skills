# S01 — Orders PRD, draft v0.3
`01_orders_prd_draft_v0.3.md` · md · 580 words · kind: requirements · stated version/date: v0.3, last edited
2026-10-20, replaces v0.2 of 2026-10-06 [S01 L4-L5] · authority: draft, "not approved" [S01 L4] · read: all sections

## Summary
Defines the order (fields, note limit, id), its four statuses and transitions, who may do what per role, the
sign-in rules with the lockout numbers, and leaves payment and manager note-editing open. Links the permission
matrix to the roles sheet instead of restating it.

## Sections
| Section | Lines | What it covers |
|---|---|---|
| 1. Purpose | L7-L12 | what the service does, scope out for v1 |
| 2. Tenants and users | L14-L18 | one tenant per user, admin has none, three roles |
| 3. The order | L20-L29 | FR-ORD-01..04: fields, note 200 chars, id sequence, initial status |
| 4. Status lifecycle | L31-L40 | BR-ORD-01..05: transitions, final states, status not client-settable |
| 5. Who may do what | L42-L51 | BR-ORD-06..09 and the manager-note TODO |
| 6. Sign-in | L53-L59 | NFR-SEC-01..03: message, lockout, token lifetime |
| 7. Payment (TODO) | L61-L64 | provider not chosen; manager sets paid via internal tool meanwhile |
| 8. Acceptance (draft) | L66-L71 | four un-numbered acceptance statements |
| 9. Open points | L73-L76 | OQ-01 provider, OQ-02 manager note editing |

## Facts
- Actors/roles: customer, manager, admin [S01 L18]; a user belongs to exactly one tenant, the admin to none [S01 L16].
- Entities: order = id, owner, tenant, note, status [S01 L22-L23]; note at most 200 characters, longer input cut, not
  rejected [S01 L25]; id from 1, +1 per order [S01 L27]; created as `new` [S01 L29].
- States: `new`, `paid`, `shipped`, `cancelled` [S01 L33]; new→paid on payment confirmation [S01 L35]; paid→shipped
  by a manager [S01 L36]; customer cancels while new or paid, not shipped [S01 L37]; shipped and cancelled final
  [S01 L38]; client-sent `status` → 400 with the rejected field names [S01 L39-L40].
- Permissions: customer sees/edits own orders, note only [S01 L44]; manager sees own tenant, may delete [S01 L45];
  admin reads all, cannot create (403) [S01 L46]; object the caller must not know → 404 never 403 [S01 L47-L48].
- Sign-in: 401 `invalid credentials`, username/password not distinguishable [S01 L55-L56]; 5 failures per username
  per minute → 429 `Retry-After: 60` [S01 L57-L58]; token valid 60 minutes [S01 L59].
- Payment: callback from a provider not yet chosen; until then a manager sets `paid` through an internal tool
  [S01 L63-L64].
- Acceptance (no IDs): cross-tenant read 404 [S01 L68; S01 L70]; own delete 403 [S01 L69]; 201-char note stored
  as first 200 [S01 L71].
- Open: OQ-01 payment provider [S01 L75]; OQ-02 manager note editing [S01 L76].

## Terms
- *tenant* — the company a user and their orders belong to [S01 L16-L17].
- *internal tool* — unnamed tool through which a manager sets `paid` until a provider exists [S01 L64].

## Noticed
- TODO on manager note editing: "v0.2 said yes; support asked to remove it. Not decided" [S01 L50-L51].
- Refers to v0.2 (2026-10-06) [S01 L5] and to "the roles sheet (04_roles_sheet)" [S01 L18] — v0.2 is not in the
  sources; the roles sheet is S04.
- Section 7 says a manager sets `paid` [S01 L64] while BR-ORD-05 says only the service changes the status
  [S01 L39]: the two statements sit in the same document.
- Cancellation rule BR-ORD-03 [S01 L37] is changed by the meeting of 2026-10-28 (S02 D-01, D-02).
