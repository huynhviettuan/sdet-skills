# S03 — Help centre FAQ
`03_support_faq.md` · md · 367 words · kind: customer-facing reference · stated date: none, "Last published:
unknown" [S03 L5] · authority: lowest — customer wording, not a spec; S02 says support will fix part of it ·
read: all sections

## Summary
Customer-facing questions and answers on placing, changing and cancelling an order, who sees which orders, and
sign-in lockout. Restates the PRD in plain words; its cancellation and lockout answers are older than the decisions
in S02.

## Sections
| Section | Lines | What it covers |
|---|---|---|
| Placing an order | L7-L18 | note "about 200 characters", only the note can change, what "new" means |
| Cancelling | L20-L27 | cancel until shipped; cancellation cannot be undone |
| Seeing other orders | L29-L36 | managers see their company's orders and may delete; "not found" for others' orders |
| Signing in | L38-L45 | lockout "15 minutes", same message for wrong username or password, sign-in lasts "about an hour" |
| Still stuck? | L47-L49 | contact form; never send a password |

## Facts
- Note: "about 200 characters"; longer notes keep the beginning and drop the rest [S03 L10-L11].
- Only the note can be changed, "at any time" [S03 L14-L15].
- `new` = payment not yet received; `paid` after confirmation [S03 L18].
- Cancel "as long as it has not shipped"; `shipped` cannot be cancelled [S03 L23-L24]; a cancelled order stays
  cancelled [S03 L27].
- Managers see every order of their company and can delete orders [S03 L32]; an order is visible to its placer and
  the managers of the same company, otherwise "not found" [S03 L35-L36].
- Lockout: "After several wrong attempts" the username is blocked for 15 minutes; the message does not say which
  of username or password was wrong [S03 L41-L42]. Sign-in lasts "About an hour" [S03 L45].
- Support is reached through the "Contact support" form; never send a password [S03 L49].

## Terms
- *company* — the FAQ's word for tenant [S03 L32; S03 L35].
- *New order* — the UI action that creates an order [S03 L10].

## Noticed
- "15 minutes" [S03 L41] disagrees with the PRD's Retry-After 60 [S01 L58]; S02 L35-L36 says the FAQ is wrong and
  support will fix it.
- The cancellation answer [S03 L23-L24] matches PRD BR-ORD-03, not the newer D-01/D-02 in S02.
- Vague numbers: "about 200 characters" [S03 L10], "several wrong attempts" [S03 L41], "About an hour" [S03 L45].
- No date on the page [S03 L5], so its order against the other sources is inferred from content only.
