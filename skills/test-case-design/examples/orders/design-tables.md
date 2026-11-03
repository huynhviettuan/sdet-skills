# Design tables — Orders slice

The coverage model behind the cases in [`cases/`](cases/), derived on 2026-11-03 from the Orders package
(`skills/project-docs/examples/orders-docs/`, read-only). Every table names its source; a cell with no source is
marked *inferred* and says from what. The requirement analysis (`analysis.md`) is not in this folder: writing it
was refused on 2026-11-03 (see [README.md](README.md#not-done)).

Contents:

- [Note length](#note-length)
- [Login and lockout](#login-and-lockout)
- [Open-order cap](#open-order-cap)
- [Order lifecycle state table](#order-lifecycle-state-table)
- [Decision table: lifecycle actions](#decision-table-lifecycle-actions)
- [Actor x action matrix](#actor-x-action-matrix)
- [Pairwise: note validation](#pairwise-note-validation)

---

## Note length

Source: BR-ORD-003 ("a string of 0 to 200 characters (characters, not bytes)"); the rejection above 200 is option A
of OQ-002. Applies to `POST /orders` and `PATCH /orders/{id}` (BR-ORD-003 Enforcement).

Equivalence partitions:

| Partition | Values | Expected | Basis | Case |
|---|---|---|---|---|
| V1 absent note (empty body, `{}`) | — | 201, note "" | specified (AC-ORD-005) | TC-ORD-003 |
| V2 length 0..200 | "", "a" x 199, "a" x 200 | stored whole | specified (AC-ORD-003, AC-ORD-020) | TC-ORD-001, TC-ORD-004, TC-ORD-006 |
| V3 length 0..200 in multi-byte characters | "ệ" x 200 (600 bytes) | stored whole | specified ("characters, not bytes") | TC-ORD-006 rows 1, 8, 13 |
| I1 length >= 201 | "a" x 201 | 400 naming `note`, nothing changed | assumption (OQ-002) | TC-ORD-002, TC-ORD-005, TC-ORD-006 |
| I2 note not a string (null, 123, []) | — | not stated | — | no case: proposed OQ-008 |

Boundary values (3-value BVA at the upper limit, the lower limit is the empty string):

| Boundary | Value | Partition | Create | Edit |
|---|---|---|---|---|
| lower | 0 | V2 | TC-ORD-003, TC-ORD-006 row 12 | TC-ORD-006 rows 2, 7, 10, 11 |
| upper - 1 | 199 | V2 | TC-ORD-001 row B | — (same partition and edge as 200; not repeated) |
| upper | 200 | V2 | TC-ORD-001 row A | TC-ORD-004 |
| upper + 1 | 201 | I1 | TC-ORD-002 | TC-ORD-005 |

No case tests a longer limit (e.g. 2000): the configurable range of `order.note_max_chars` (1-2000) is a
deployment setting, not a rule the API states; the cases assume the default 200.

---

## Login and lockout

Source: BR-AUTH-001, BR-AUTH-002, the login-attempt counter in `STATE_MACHINES.md`, AC-AUTH-001..005.

Partitions of a login attempt:

| Username | Password | Counter state | Expected | Case |
|---|---|---|---|---|
| known | correct | open | 200 + token | TC-AUTH-001 |
| known | wrong | open | 401 `invalid credentials`, counter + 1 | TC-AUTH-002 |
| unknown | any | open | 401, same body as wrong password, counter + 1 | TC-AUTH-003 |
| any | wrong | locked | 429, `Retry-After: 60` | TC-AUTH-004 attempt 6 |
| known | correct | locked | 429, `Retry-After: 60` (password not checked) | TC-AUTH-006 |
| another username | correct | first username locked | 200 | TC-AUTH-005 |

Boundary on the failed-attempt count (limit 5, `login.failed_attempt_limit` default):

| Attempt | Failures counted before it | Expected | Case |
|---|---|---|---|
| 4 | 3 | 401 | TC-AUTH-004 |
| 5 | 4 | 401 (the fifth failure is still answered 401) | TC-AUTH-004 |
| 6 | 5 | 429 | TC-AUTH-004 |

Counter state table (from `STATE_MACHINES.md`, verbatim outcomes):

| State | correct password | wrong password |
|---|---|---|
| open | 200 token; counter unchanged | 401 `invalid credentials`; counter +1 |
| locked | 429 `Retry-After: 60` | 429 `Retry-After: 60` |

The way back (locked -> open, "oldest failure older than 60 s") needs a controllable clock and its exact second is
not stated (proposed OQ-009); it is a recorded gap, not a case.

---

## Open-order cap

Source: BR-ORD-007 and AC-ORD-006/007, all option B of OQ-003. Default cap 5 (`order.open_cap`).

| Partition / boundary | Customer's orders in `new` before the create | Expected | Case |
|---|---|---|---|
| below the cap | 0..3 | 201 | (every create case; not asserted on its own) |
| just below | 4 | 201, count becomes 5 | TC-ORD-010 step 1 |
| on the cap | 5 | 409 `too many open orders`, count stays 5 | TC-ORD-010 step 2 |
| slot freed by pay | 5 -> 4 | 201 | TC-ORD-011 row A |
| slot freed by cancel | 5 -> 4 | 201 | TC-ORD-011 row B |
| orders in paid / shipped / cancelled | any number | do not count | covered by TC-ORD-011 (a paid or cancelled order stays and the create succeeds) |

---

## Order lifecycle state table

Source: `STATE_MACHINES.md` (Allowed and Forbidden transitions; the only transition table, BR-ORD-005) and
BR-ORD-006 for the time guard. "OK" = allowed, "409" = refused with `invalid transition`, order unchanged.

| State \ Action | pay | ship | cancel |
|---|:---:|:---:|:---:|
| new | OK -> paid (TC-ORD-020) | 409 (TC-ORD-024 row 2) | OK -> cancelled (TC-ORD-022, TC-ORD-023) |
| paid | 409 (TC-ORD-024 row 1) | OK -> shipped (TC-ORD-021) | OK while `now - paid_at < 24 h` (TC-ORD-025); else 409 `cancellation window closed` (TC-ORD-026) |
| shipped | 409 (row 3) | 409 (row 4) | 409 (row 5) |
| cancelled | 409 (row 6) | 409 (row 7) | 409 (row 8) |

Coverage: all 4 valid transitions (0-switch), all 8 invalid cells, and the guard on paid -> cancelled at
23:59:59 / 24:00:00 / 24:00:01. 1-switch sequences are covered as setup only (new -> paid -> shipped reaches the
shipped rows); no sequence has its own rule.

Side effect asserted: `paid_at` set on new -> paid and never changed (TC-ORD-020, TC-ORD-021, TC-ORD-024,
TC-ORD-026). The open-order count side effect is TC-ORD-011.

---

## Decision table: lifecycle actions

Who may do which lifecycle action on which status. Derived from the Permission Model and Actors of
`ROLES_PERMISSIONS.md`, the check order "token -> object scope (404) -> function (403)" stated there, and the cancel
decision table of `STATE_MACHINES.md`, generalised to pay and ship. Conditions are evaluated top to bottom; the
first column that matches answers.

| Condition | R1 | R2 | R3 | R4 | R5 | R6 | R7 |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Token valid | N | Y | Y | Y | Y | Y | Y |
| Caller sees the order (OWN / TENANT / ALL) | – | N | Y | Y | Y | Y | Y |
| Role holds the action (order.pay / .ship / .cancel) | – | – | N | Y | Y | Y | Y |
| (status, action) has an Allowed row | – | – | – | N | Y (paid, cancel) | Y (paid, cancel) | Y (other rows) |
| Hours since `paid_at` < 24 | – | – | – | – | N | Y | – |
| **Answer** | 401 | 404 `not found` | 403 `forbidden` | 409 `invalid transition` | 409 `cancellation window closed` | 200 `cancelled` | 200, new status |
| Case | gap (matrix AZ-024/031/037) | TC-ORD-030 | TC-ORD-027, -028, -029 | TC-ORD-024 | TC-ORD-026 | TC-ORD-025 | TC-ORD-020..023 |

Where the source is thinner than the table:

- R3 before R4 for pay and ship is *inferred*: the 403-before-409 order is stated for cancel (`STATE_MACHINES.md`
  rows 3-7) and as "token -> scope (404) -> function (403) -> state (409)" in FR-ORD-004 Main Flow, not in a BR.
- R7 is the "other" column: the plain allowed path. It is four cases because each allowed row has its own actor.

---

## Actor x action matrix

The decision table's R1-R3 expanded per actor, with the matrix row behind each cell (`ROLES_PERMISSIONS.md`,
precondition statuses as stated there: pay on `new`, ship on `paid`, cancel on `new`).

| Actor | pay | ship | cancel |
|---|---|---|---|
| anonymous | 401 AZ-024 (gap) | 401 AZ-031 (gap) | 401 AZ-037 (gap) |
| customer-own (alice) | 200 AZ-025 — TC-ORD-020 | 403 AZ-032 — TC-ORD-027 | 200 AZ-038 — TC-ORD-022 |
| customer-same-tenant (erin) | 404 AZ-026 — TC-ORD-030 | 404 *no matrix row*; from BR-SEC-001 — TC-ORD-030 | 404 AZ-039 — TC-ORD-030 |
| customer-other-tenant (bob) | 404 AZ-027 — TC-ORD-030 | 404 AZ-033 — TC-ORD-030 | 404 AZ-040 — TC-ORD-030 |
| manager-same-tenant (carol) | 403 AZ-028 — TC-ORD-028 | 200 AZ-034 — TC-ORD-021 | 200 AZ-041 — TC-ORD-023 |
| manager-other-tenant (dave) | 404 AZ-029 — TC-ORD-030 | 404 AZ-035 — TC-ORD-030 | 404 AZ-042 — TC-ORD-030 |
| admin (root) | 403 AZ-030, OQ-004 — TC-ORD-029 | 403 AZ-036, OQ-004 — TC-ORD-029 | 403 AZ-043, OQ-004 — TC-ORD-029 |

21 cells: 18 with a case, 3 anonymous cells left to the matrix suite (ADR-001: the matrix is the single source of
authorization tests; these cells add nothing a body or re-read would show beyond AZ-024/031/037).

---

## Pairwise: note validation

**Why pairwise here and not on role x status x action x tenant relation.** Pairwise is valid only when every rule
involved depends on at most two of the factors. The lifecycle outcome depends on four at once (role, relation to the
order, status, action — see the decision table), so a pairwise table over them would leave rule combinations
untested; that rule is covered exhaustively by the decision table and the actor x action matrix above instead.

The note-length rule is different: its outcome depends on the length alone; the character set interacts with the
length (characters vs bytes, 2 factors); the caller and the order's status should not matter at all (OQ-006 and
OQ-005, working assumptions). Every rule involves at most two factors, so all pairs are enough to catch an
interaction such as "the limit is checked in bytes" or "a manager's edit skips validation".

Forbidden: a create can only produce status `new`; an empty note has no character set. Required: 200 multi-byte
characters on a customer's create (the byte-count trap, highest risk). Factors file: [factors.json](factors.json);
rows: [pairwise-rows.csv](pairwise-rows.csv); the rows are the data of TC-ORD-006.

Command and output, 2026-11-03 (verbatim):

```text
$ python skills/test-case-design/scripts/pairwise.py generate skills/test-case-design/examples/orders/factors.json --csv skills/test-case-design/examples/orders/pairwise-rows.csv
Factors (value: why it was chosen):
- length: 0 (lower edge: empty note, AC-ORD-005), 200 (upper edge: stored whole, AC-ORD-003), 201 (first invalid length: rejected, AC-ORD-004/024 (OQ-002))
- charset: ascii (one byte per character), vietnamese (multi-byte characters: the limit counts characters, not bytes (BR-ORD-003))
- operation: create (POST /orders), edit (PATCH /orders/{id})
- caller: customer-own (alice, the owner), manager-same-tenant (carol; create and edit are OQ-006 option A)
- status: new (the only status a create can produce), paid (edit after payment (OQ-005 option A)), shipped (terminal (OQ-005 option A)), cancelled (terminal (OQ-005 option A))

13 rows cover the pairs of 96 combinations.

| # | length | charset | operation | caller | status |
|---|---|---|---|---|---|
| 1 | 200 | vietnamese | create | customer-own | new |
| 2 | 0 | ascii | edit | manager-same-tenant | new |
| 3 | 201 | vietnamese | edit | manager-same-tenant | cancelled |
| 4 | 201 | ascii | edit | customer-own | paid |
| 5 | 200 | ascii | edit | manager-same-tenant | shipped |
| 6 | 201 | ascii | create | manager-same-tenant | new |
| 7 | 0 | ascii | edit | customer-own | cancelled |
| 8 | 200 | vietnamese | edit | manager-same-tenant | paid |
| 9 | 201 | vietnamese | edit | customer-own | shipped |
| 10 | 0 | ascii | edit | customer-own | paid |
| 11 | 0 | ascii | edit | customer-own | shipped |
| 12 | 0 | ascii | create | customer-own | new |
| 13 | 200 | vietnamese | edit | customer-own | cancelled |

Verified: every allowed pair is covered.
```

Exit code 0.

```text
$ python skills/test-case-design/scripts/pairwise.py verify skills/test-case-design/examples/orders/factors.json skills/test-case-design/examples/orders/pairwise-rows.csv
Factors (value: why it was chosen):
- length: 0 (lower edge: empty note, AC-ORD-005), 200 (upper edge: stored whole, AC-ORD-003), 201 (first invalid length: rejected, AC-ORD-004/024 (OQ-002))
- charset: ascii (one byte per character), vietnamese (multi-byte characters: the limit counts characters, not bytes (BR-ORD-003))
- operation: create (POST /orders), edit (PATCH /orders/{id})
- caller: customer-own (alice, the owner), manager-same-tenant (carol; create and edit are OQ-006 option A)
- status: new (the only status a create can produce), paid (edit after payment (OQ-005 option A)), shipped (terminal (OQ-005 option A)), cancelled (terminal (OQ-005 option A))

13 rows cover the pairs of 96 combinations.

| # | length | charset | operation | caller | status |
|---|---|---|---|---|---|
| 1 | 200 | vietnamese | create | customer-own | new |
| 2 | 0 | ascii | edit | manager-same-tenant | new |
| 3 | 201 | vietnamese | edit | manager-same-tenant | cancelled |
| 4 | 201 | ascii | edit | customer-own | paid |
| 5 | 200 | ascii | edit | manager-same-tenant | shipped |
| 6 | 201 | ascii | create | manager-same-tenant | new |
| 7 | 0 | ascii | edit | customer-own | cancelled |
| 8 | 200 | vietnamese | edit | manager-same-tenant | paid |
| 9 | 201 | vietnamese | edit | customer-own | shipped |
| 10 | 0 | ascii | edit | customer-own | paid |
| 11 | 0 | ascii | edit | customer-own | shipped |
| 12 | 0 | ascii | create | customer-own | new |
| 13 | 200 | vietnamese | edit | customer-own | cancelled |

Verified: every allowed pair is covered.
```

Exit code 0. The verify reads the CSV the generate wrote and prints the same report, so the table above is the
one the cases use.
