# Test Design Techniques

Systematic ways to derive test cases from a requirement so coverage is deliberate, not a list of whatever came to
mind. Each technique has: when to use it, how, a worked example, and what coverage it gives.

Contents:

- [Equivalence partitioning](#equivalence-partitioning)
- [Boundary value analysis](#boundary-value-analysis)
- [Decision tables](#decision-tables)
- [State transition testing](#state-transition-testing)
- [Pairwise / combinatorial testing](#pairwise--combinatorial-testing)
- [Scenario / use-case testing](#scenario--use-case-testing)
- [CRUD and lifecycle matrix](#crud-and-lifecycle-matrix)
- [Error guessing and data-type heuristics](#error-guessing-and-data-type-heuristics)
- [Exploratory charters](#exploratory-charters)

---

## Equivalence partitioning

**Use when** an input or output has ranges or classes that the system should treat the same way.

**How:** split each input into partitions (valid and invalid) where every value in a partition should behave
identically; test one representative per partition.

*Example — discount by order quantity (BR-ORDER-007: 1–9 no discount, 10–49 5 %, 50–500 10 %, max 500):*

| Partition | Representative | Expected |
|---|---|---|
| Invalid: ≤ 0 | 0 | Rejected |
| Valid: 1–9 | 5 | 0 % |
| Valid: 10–49 | 25 | 5 % |
| Valid: 50–500 | 200 | 10 % |
| Invalid: > 500 | 600 | Rejected |
| Invalid: non-integer | 2.5, "abc" | Rejected |

**Coverage:** every partition exercised once. Combine invalid partitions one at a time — two invalid values in
one test hide which one triggered the error.

---

## Boundary value analysis

**Use when** partitions are ordered (numbers, dates, lengths, counts). Defects cluster at edges (`<` vs `<=`).

**How:** for each boundary test the value on it and the values just either side (3-value BVA), or just the edges
(2-value BVA) for lower-risk fields.

*Example — same rule, 3-value BVA at each boundary:*

```text
Boundary 1|0:    0, 1, 2
Boundary 9|10:   9, 10, 11
Boundary 49|50:  49, 50, 51
Boundary 500|501: 499, 500, 501
```

Apply it to non-numeric limits too: string length (0, 1, max-1, max, max+1), list size, file size, date ranges
(day before / on / after; month end; leap day; DST change), time windows (expiry exactly at the second).

**Coverage:** each boundary and its neighbors. Run as one data-driven test with a row per value.

---

## Decision tables

**Use when** the outcome depends on a **combination** of conditions (business rules with "if A and B but not C").

**How:** list conditions and actions; enumerate combinations; collapse rows where a condition doesn't matter (`–`);
each remaining column is a test case. Missing or contradictory columns are requirement gaps → OPEN QUESTION.

*Example — BR-CONTRACT-005: contract approval:*

| Conditions | R1 | R2 | R3 | R4 | R5 |
|---|:---:|:---:|:---:|:---:|:---:|
| User has `contract.approve` | N | Y | Y | Y | Y |
| Contract state = PENDING_APPROVAL | – | N | Y | Y | Y |
| Amount ≤ user's approval limit | – | – | N | Y | Y |
| User is the contract creator | – | – | – | Y | N |
| **Action** | 403 | 409 wrong state | 403 over limit | 403 self-approval | Approved |

Five tests instead of 16 blind combinations, and R4 surfaced the self-approval rule — if the BR doesn't say,
that's an OQ.

**Coverage:** every rule column once.

---

## State transition testing

**Use when** an entity has a lifecycle (orders, contracts, tickets, sessions, subscriptions). Use the state
machine from the product docs (`STATE_MACHINES.md`).

**How:**

1. **Valid transitions** — one test per allowed transition (0-switch coverage).
2. **Invalid transitions** — for each state, attempt the actions that are *not* allowed; expect rejection and no
   state change.
3. **Transition sequences** — for critical flows, pairs of consecutive transitions (1-switch coverage), e.g.
   suspend → reactivate → suspend.
4. **Side effects** per transition (audit, notification, counters).

*Example — state × action table (✓ allowed, ✗ must be rejected):*

| State \ Action | submit | approve | activate | suspend | cancel |
|---|:---:|:---:|:---:|:---:|:---:|
| DRAFT | ✓ | ✗ | ✗ | ✗ | ✓ |
| PENDING_APPROVAL | ✗ | ✓ | ✗ | ✗ | ✓ |
| APPROVED | ✗ | ✗ | ✓ | ✗ | ✓ |
| ACTIVE | ✗ | ✗ | ✗ | ✓ | ✓ |
| CANCELLED | ✗ | ✗ | ✗ | ✗ | ✗ |

Every ✗ cell is a negative test — usually the cheapest high-value tests in the suite, and best run at API level.

**Coverage:** all valid transitions + all invalid cells (or a risk-chosen subset of invalid cells, recorded).

---

## Pairwise / combinatorial testing

**Use when** several independent parameters each have several values and testing every combination is
impractical (browser × OS × role × locale × plan…).

**How:** generate a set where every **pair** of parameter values appears in at least one test (most interaction
defects involve two factors). Use a tool (PICT, AllPairs, pairwise generators in test libraries) and add
constraints for impossible combinations (Safari × Windows).

*Example:* 4 parameters × 3 values = 81 combinations → about 9–10 pairwise tests.

Add specific high-risk combinations explicitly on top of the generated set. Escalate to 3-wise only for areas
with a history of three-factor defects.

**Coverage:** all value pairs. Not a substitute for decision tables when parameters are *dependent*.

---

## Scenario / use-case testing

**Use when** testing end-to-end business flows across multiple steps/actors.

**How:** from the business flow (`BUSINESS_FLOW.md`) or the feature's main/alternative flows, write one test per:

- main success scenario
- each alternative flow (different path, same goal)
- each exception flow (goal not reached: cancellation, timeout, rejection)

These become the UI E2E journeys; keep them few and make each one count. Rule details inside each step are covered
by the techniques above at API level.

---

## CRUD and lifecycle matrix

**Use when** a feature manages records. For each entity, check every operation × role × relevant state:

| Entity | Create | Read (own) | Read (other's) | Update | Delete | List/filter | Export |
|---|---|---|---|---|---|---|---|
| Order (customer) | ✓ | ✓ | ✗ 404 | ✓ until PAID | ✗ | own only | own only |
| Order (admin) | ✓ | ✓ | ✓ | ✓ | ✓ soft | all | all |

Plus: create → read back matches input; update persists only allowed fields; delete then read/list; duplicate
create (idempotency / uniqueness).

---

## Error guessing and data-type heuristics

Experience-based extras, applied after the systematic techniques. Checklist by data type:

| Type | Try |
|---|---|
| Text | empty, whitespace only, leading/trailing spaces, max length, Unicode/emoji, RTL text, very long words, HTML/script-looking text (expect it displayed literally) |
| Number | 0, negative, decimal where integer expected, very large, scientific notation, locale separators (1,000 vs 1.000) |
| Date/time | today, past/future limits, month end, leap day, DST transition, time zones of user vs server, invalid dates (31 Apr) |
| Email/phone | valid edge formats, plus addressing, uppercase, international formats |
| Money | rounding (0.005), currency precision, totals of many small amounts |
| Lists | empty, one item, max items, duplicates, sort/pagination edges (last page, exactly page size) |
| Identifiers | non-existent, deleted, belonging to another user, malformed |
| Concurrency | double submit, two users editing the same record, action during state change |
| Network | slow response, timeout, retry after failure, offline (mobile) |

---

## Exploratory charters

Not everything should be scripted. For new or high-risk areas, add time-boxed exploratory sessions:

```text
Charter:  Explore <area> with <resources/data> to discover <risk/information>
Example:  Explore contract approval with users at different approval limits
          to discover rule gaps not covered by BR-CONTRACT-005.
Time box: 60 min
Output:   notes, bugs, new OQs, new test case candidates
```

Findings that should be checked every release become scripted test cases.
