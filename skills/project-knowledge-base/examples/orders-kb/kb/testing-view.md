# Testing view

Where test design starts. The two tables "Testable rules" and "Not testable yet" are read by
`test-case-design/scripts/check_cases.py --kb`: keep their shape (first column names the rule and its requirement
IDs; the last column of "Not testable yet" names the finding and its question).

## Risk areas

| Area | Why | Findings | Sources |
|---|---|---|---|
| tenant isolation and role scope | 404-not-403 hides other tenants' ids; scope per role decides what a user sees | R-1, G-5 | [S01 L47-L48; S04 L23; S04 L34-L35] |
| cancellation | the rule is disputed; a paid order's money is unowned; cancel and ship can cross | C-1, R-2, R-3 | [S01 L37; S02 L20-L26] |
| status changes | no role may change a status by the matrix, yet a manager marks shipped | C-2 | [S04 L37; S01 L36] |
| sign-in lockout | a per-username counter with a one-minute window and `Retry-After` | G-7 | [S01 L57-L58] |

## Testable rules

| Rule (IDs) | Values and boundaries | Technique | Source |
|---|---|---|---|
| Note length (FR-ORD-02) | 0, 1, 199, 200, 201 characters; 201 is stored as the first 200, never rejected | boundary value analysis | [S01 L25; S01 L71] |
| Order id sequence (FR-ORD-03) | first order id 1; each next order +1 | state / sequence check | [S01 L27] |
| Initial status (FR-ORD-04) | a created order is `new` | state transition, entry | [S01 L29] |
| Final states (BR-ORD-04) | no transition leaves `shipped` or `cancelled` | state transition, forbidden edges | [S01 L38] |
| Client cannot set status (BR-ORD-05) | an update carrying `status` answers 400 and names the rejected field | negative / syntax | [S01 L39-L40] |
| Customer scope and note-only edit (BR-ORD-06) | owner reads 200; same-tenant customer 404; other-tenant 404; only `note` is editable | permission matrix, equivalence partitions on the actor | [S01 L44; S04 L48-L50; S04 L36] |
| Manager scope and delete (BR-ORD-07) | same-tenant manager reads 200 and deletes 204; other-tenant manager 404 | permission matrix | [S01 L45; S04 L51-L52; S04 L55] |
| Admin reads all, never creates (BR-ORD-08, D-04) | admin reads 200 on any tenant's order; create answers 403; delete 204 | permission matrix | [S01 L46; S04 L53; S04 L56-L57] |
| Hidden object is 404, not 403 (BR-ORD-09, BR-SEC-001) | every denied read, edit or delete of another tenant's order answers 404 | permission matrix, error guessing on enumeration | [S01 L47-L48; S04 L23] |
| Manager and admin cannot edit the note (D-03) | 403 for a same-tenant manager and for the admin | permission matrix | [S02 L40-L41; S04 L36] |
| Sign-in message (NFR-SEC-01) | wrong username and wrong password both answer 401 `invalid credentials` | equivalence partitions | [S01 L55-L56] |
| Lockout (NFR-SEC-02) | 4th, 5th and 6th failure for one username within 60 s; the 6th answers 429 with `Retry-After: 60`; another username is unaffected | boundary value analysis, time-based | [S01 L57-L58; S02 L35] |
| Token lifetime (NFR-SEC-03) | a token at 59 min works, at 61 min answers 401 | boundary value analysis | [S01 L59; S04 L21] |
| Denial codes (BR-SEC-001) | no token 401; wrong role 403; hidden object 404; missing object 404 | decision table | [S04 L21-L24] |

## Not testable yet

| Rule | Why | Finding, question |
|---|---|---|
| Customer cancellation window (BR-ORD-03, D-01) | PRD says until shipped; the sync decided 24 hours after payment with 409 after that; PRD not updated | [C-1](analysis.md#conflicts), KQ-1 |
| Expiry of a `new` order (D-02) | time is TBD; resulting status not named | [G-1](analysis.md#gaps), KQ-3 |
| Manager marks shipped / sets paid (BR-ORD-02, D-05) | the matrix lets no role change a status; D-05 deferred | [C-2](analysis.md#conflicts), KQ-2 |
| Payment confirmation (BR-ORD-01) | no provider, no call, no failure path | [G-2](analysis.md#gaps), OQ-01 |
| Refused cancel responses | code for a `shipped` order and for a `new` order under D-02 not stated | [G-3](analysis.md#gaps), KQ-6 |

## Flows to cover

| Flow | Happy path | Alternatives and errors | Stated vs gap |
|---|---|---|---|
| [01 Place and ship](flows/01-place-and-ship-an-order.md) | create → `new` → `paid` → `shipped` | admin create 403; 201-char note; client-sent status 400 | payment step is a gap (G-2); shipped actor disputed (C-2) |
| [02 Cancel](flows/02-cancel-an-order.md) | — | both rule versions, 409 after the window | the whole flow waits on KQ-1 |
| [03 Sign in](flows/03-sign-in-with-lockout.md) | token in 60 minutes | 401 same message; 429 after 5 failures | stated [S01 L55-L59] |

## Lifecycles

Allowed and forbidden transitions with their sources: [order lifecycle](domain-model.md#order-lifecycle). Forbidden
edges that are stated and testable now: out of `shipped`, out of `cancelled` [S01 L38]; any client-set `status`
[S01 L39-L40].

## Data to prepare

| Data | How the sources say to create it | Source |
|---|---|---|
| users alice, erin (tenant-a customers), bob (tenant-b customer), carol, dave (managers), root (admin) | listed as example users; creation not described | [S04 L10-L15] |
| an order owned by alice of tenant-a | the roles sheet's order under test; created by alice | [S04 L44; S04 L33] |
| a `paid` order | **Not stated** how a test gets one: provider absent, manager path disputed (C-2) | [S01 L63-L64] |
| 5 failed sign-ins within a minute for one username | send 5 wrong passwords for that username | [S01 L57] |
