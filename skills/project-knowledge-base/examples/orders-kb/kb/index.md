# Index

## A–Z

- 401 / 403 / 404 → [actors-and-permissions.md#denial-codes](actors-and-permissions.md#denial-codes), [business-rules.md#permissions](business-rules.md#permissions)
- 409 cancellation window closed → [flows/02-cancel-an-order.md](flows/02-cancel-an-order.md), [decisions.md#decided](decisions.md#decided)
- 429 / Retry-After → [flows/03-sign-in-with-lockout.md](flows/03-sign-in-with-lockout.md), [business-rules.md#sign-in](business-rules.md#sign-in)
- admin → [actors-and-permissions.md#roles](actors-and-permissions.md#roles), [glossary.md](glossary.md)
- audit log → [actors-and-permissions.md#permission-matrix](actors-and-permissions.md#permission-matrix)
- cancellation, cancellation window → [flows/02-cancel-an-order.md](flows/02-cancel-an-order.md), [analysis.md#conflicts](analysis.md#conflicts) (C-1)
- customer → [actors-and-permissions.md#roles](actors-and-permissions.md#roles)
- decisions D-01..D-05 → [decisions.md](decisions.md)
- example users (alice, erin, bob, carol, dave, root) → [actors-and-permissions.md#example-users](actors-and-permissions.md#example-users)
- expiry of a `new` order → [domain-model.md#order-lifecycle](domain-model.md#order-lifecycle), [analysis.md#gaps](analysis.md#gaps) (G-1)
- final states → [domain-model.md#order-lifecycle](domain-model.md#order-lifecycle)
- id of an order → [domain-model.md#order-attributes](domain-model.md#order-attributes)
- internal tool → [glossary.md](glossary.md), [analysis.md#conflicts](analysis.md#conflicts) (C-2)
- lifecycle → [domain-model.md#order-lifecycle](domain-model.md#order-lifecycle)
- lockout → [flows/03-sign-in-with-lockout.md](flows/03-sign-in-with-lockout.md)
- manager → [actors-and-permissions.md#roles](actors-and-permissions.md#roles)
- note (200 characters) → [business-rules.md#the-order](business-rules.md#the-order), [testing-view.md#testable-rules](testing-view.md#testable-rules)
- open questions (KQ-, OQ-) → [analysis.md#open-questions](analysis.md#open-questions)
- payment, payment provider → [flows/01-place-and-ship-an-order.md](flows/01-place-and-ship-an-order.md), [requirements.md#open-in-the-sources](requirements.md#open-in-the-sources)
- permission matrix → [actors-and-permissions.md#permission-matrix](actors-and-permissions.md#permission-matrix)
- scope (own / tenant / all) → [actors-and-permissions.md#permission-matrix](actors-and-permissions.md#permission-matrix)
- shipped → [flows/01-place-and-ship-an-order.md](flows/01-place-and-ship-an-order.md)
- status (client cannot set) → [business-rules.md#lifecycle](business-rules.md#lifecycle)
- tenant → [glossary.md](glossary.md), [domain-model.md#relationships](domain-model.md#relationships)
- token → [flows/03-sign-in-with-lockout.md](flows/03-sign-in-with-lockout.md)

## Where do I find…

| Question | Go to |
|---|---|
| Can a customer cancel a paid order? | [flows/02-cancel-an-order.md](flows/02-cancel-an-order.md) — disputed, see C-1 |
| Who may delete an order? | [actors-and-permissions.md#permission-matrix](actors-and-permissions.md#permission-matrix) |
| Why does another tenant's order answer 404 and not 403? | [business-rules.md#permissions](business-rules.md#permissions) (BR-ORD-09, BR-SEC-001) |
| How many failed sign-ins before lockout, and for how long? | [business-rules.md#sign-in](business-rules.md#sign-in) |
| What changed on 2026-10-28? | [decisions.md](decisions.md) |
| What can I test today, and what waits for an answer? | [testing-view.md#testable-rules](testing-view.md#testable-rules), [testing-view.md#not-testable-yet](testing-view.md#not-testable-yet) |
| Which documents disagree? | [analysis.md#conflicts](analysis.md#conflicts) |
| Where is the original wording of a citation? | [_sources/inventory.md](_sources/inventory.md) |
