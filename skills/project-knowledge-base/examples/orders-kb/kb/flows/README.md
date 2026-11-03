# Flows

One page per business flow found in the sources. Steps the sources do not state are marked inferred on the page.

| # | Flow | Trigger | Actors | Outcome | Stated vs gaps | Sources |
|---|---|---|---|---|---|---|
| 01 | [Place and ship an order](01-place-and-ship-an-order.md) | a customer wants to order | customer, payment provider (future), manager | a `shipped` order | happy path stated; payment step open (OQ-01); who marks shipped disputed (C-2) | [S01 L9; S01 L29-L36; S01 L63-L64] |
| 02 | [Cancel an order](02-cancel-an-order.md) | a customer no longer wants the order | customer | a `cancelled` order, or 409 | the rule itself is disputed (C-1); money side not stated | [S01 L37; S02 L25-L29; S03 L23-L27] |
| 03 | [Sign in, with lockout](03-sign-in-with-lockout.md) | a user wants a token | user | a token valid 60 minutes, or 401 / 429 | stated; FAQ wording stale | [S01 L55-L59; S03 L41-L45] |

Editing the note and deleting an order are single actions governed by the [permission matrix](../actors-and-permissions.md#permission-matrix)
rather than flows [S01 L44-L45; S04 L36; S04 L38].
