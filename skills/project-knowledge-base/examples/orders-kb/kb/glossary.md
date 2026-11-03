# Glossary

Alphabetical. "Defined in" is where the term is first given its meaning.

| Term | Meaning | Also called | Defined in |
|---|---|---|---|
| admin | platform role with no tenant; reads every order of every tenant, cannot create one | platform admin | [S01 L16; S01 L46] |
| audit log | a log the admin may read; its contents are not described in any source | — | [S04 L40] |
| cancellation window | the 24 hours after payment confirmation in which a customer may cancel a paid order (decided 2026-10-28, PRD not yet updated) | — | [S02 L25-L26] |
| `cancelled` | final status of an order a customer cancelled; nothing leaves it | — | [S01 L33; S01 L38] |
| customer | role that places orders and sees and edits only its own | — | [S01 L18; S01 L44] |
| expiry | what happens to a `new` (unpaid) order instead of cancellation; the time is TBD | expires | [S02 L28-L29] |
| internal tool | an unnamed tool through which a manager sets `paid` until a payment provider exists | — | [S01 L64] |
| lockout | after 5 failed sign-ins for a username within one minute, further attempts answer 429 with `Retry-After: 60` | blocked | [S01 L57-L58] |
| manager | role that sees every order of its own tenant and may delete any of them | — | [S01 L18; S01 L45] |
| `new` | status of a freshly created order; payment not yet received | — | [S01 L29; S03 L18] |
| note | free text on an order, at most 200 characters; the only field a customer edits | delivery instructions (FAQ example) | [S01 L25; S01 L44; S03 L10] |
| order | id, owner, tenant, note, status | — | [S01 L22-L23] |
| owner | the username that created the order | the person who placed it | [S01 L22; S03 L35] |
| `paid` | status after the payment provider confirms payment | — | [S01 L35] |
| scope | own / tenant / all — which orders a role's read, list, edit or delete reaches | — | [S04 L28] |
| `shipped` | final status set when a manager of the tenant marks the order shipped | — | [S01 L36; S01 L38] |
| tenant | the company a user and their orders belong to; every user has exactly one, the admin none | company (FAQ) | [S01 L16-L17; S03 L32] |
| token | the sign-in credential, valid 60 minutes from issue; missing, invalid or expired answers 401 | sign-in | [S01 L59; S04 L21] |
