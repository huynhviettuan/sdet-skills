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
- [Permission matrix](#permission-matrix)
- [Account journeys](#account-journeys)
- [Syntax testing](#syntax-testing)
- [Metamorphic relations](#metamorphic-relations)
- [Defect-based design](#defect-based-design)
- [Error guessing and data-type heuristics](#error-guessing-and-data-type-heuristics)
- [Exploratory charters](#exploratory-charters)
- [Where designs are thin](#where-designs-are-thin)

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

Apply it to non-numeric limits too: string length (0, 1, max-1, max, max+1, whitespace only), list size, file size,
date ranges (day before / on / after; month end; leap day; DST change; the timezone day boundary when the rule
depends on "today"), time windows (expiry exactly at the second). Dates in test data are relative to the run
("today + 14"), computed once when the run starts so every step sees the same date.

Go **past the stated range** as well: 0 and negative counts, non-numeric and empty input, one character over a
length limit. These are the boundaries an author skips most often — in a pilot comparing an agent's drafts with a
team's, they were the largest single difference. But only test a limit the documents state; an unstated limit is an
OQ, not a case (see [assumption cases](test-case-format.md#assumption-cases-and-open-questions)).

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

**Coverage:** every rule column once — including the "other" column: the plain path that needs no special handling
(no discount, no note, no approval) is a column too, and it is the one most often left out. For complex logic
(many causes feeding several effects) draw a cause–effect graph first, then derive the table from it.

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
defects involve two factors), with constraints for impossible combinations (Safari × Windows). Then **verify it by
program** — a hand-edited or generated table that misses a pair is common, and "pairwise" is a claim:

```bash
python <skill-dir>/scripts/pairwise.py generate factors.json --csv rows.csv   # build + verify
python <skill-dir>/scripts/pairwise.py verify factors.json rows.csv           # check a table from PICT or by hand
```

`factors.json` gives each value **with the reason it was chosen** ("sessions: 1 lower tier edge, 17 any count, 1000
upper tier edge"), forbidden partial combinations, and required high-risk rows; the output prints the reasons with
the table, so the design shows why every value is there.

*Example:* 2 × 3 × 3 × 3 × 2 = 108 combinations covered by about 12 rows.

Write down **why pairwise keeps the intended coverage**: every rule involved depends on at most two of the factors.
A rule that depends on three factors is covered exhaustively for those three (or 3-wise), not pairwise.

**Coverage:** all value pairs, verified. Not a substitute for decision tables when parameters are *dependent*.

---

## Scenario / use-case testing

**Use when** testing end-to-end business flows across multiple steps/actors.

**How:** from the business flow (`BUSINESS_FLOW.md`) or the feature's main/alternative flows, write one test per:

- main success scenario
- each alternative flow (different path, same goal)
- each exception flow (goal not reached: cancellation, timeout, rejection)

These become the UI E2E journeys; keep them few and make each one count. Rule details inside each step are covered
by the techniques above at API level.

For cross-module business flows, start from the customer's own scripts when they exist (trial scripts, acceptance
walkthroughs: lead → consultation → contract → first payment → booking → session → payout): one case per script
item, named after it, plus the **negative branch at each hand-over** (the contract is rejected, the payment is
partial, the booking clashes).

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

## Permission matrix

**Use when** roles grant or refuse actions. Role × action, from the documented matrix.

**How:**

- For each action, test the **privilege boundary**: the lowest role that is allowed and the highest role that is
  not.
- Check every **layer** the action is reachable from: the menu or screen, the action inside a module (the button on
  a record, not just the page), a direct URL, and the API. Include the **signed-out** caller. A hidden button with an
  open endpoint is the classic miss.
- Beyond grants: **data scope** (own / branch / all), field masks (a role sees a record but not its price), who may
  approve, role changes taking effect, per-user overrides.
- Keep the expected matrix as a **dated snapshot** of the documented one, reviewed by hand when it changes. A
  difference from the product shows up as a failing case to review, never as a silently updated expectation.
- Change roles only on a role or user the test creates, never on seeded ones.

**Exhaustive sweep (automated, API):** call every operation of the API contract as every role, with a random id and
an empty body, so no call can change anything. A role holding the operation's permission must get past
authorization (any answer but 401/403); every other role gets 403. This finds the one endpoint nobody listed.

---

## Account journeys

**Use when** the product has several kinds of user. One case per account type (each seeded role, and each job title
built on one): the person's **real daily work, end to end, with realistic data**, then the actions that role must
be refused.

Journeys find what a permission matrix misses: a step that needs a permission nobody in that job holds, or data the
person can't see at the moment they need it. They are slow; keep one per role and let the matrix carry the cells.

---

## Syntax testing

**Use when** an input has a structure: email, phone, date, postal code, identifiers, codes with a checksum, file
names, query languages.

**How:** write the structure as rules (prefix, length, allowed characters, separators, checksum). For each rule,
one valid form and **one violation of that rule only**, so a rejection names its cause. Add the equivalent forms the
product must treat as the same value (a phone written `+84 90…`, `090…`, `090.xxx`, with spaces or brackets, all
matching one person).

---

## Metamorphic relations

**Use when** the exact output is hard to know in advance (totals, reports, search, recommendations, anything
computed over a lot of data), but how two outputs relate is known.

**How:** run twice with a controlled change and assert the relation:

| Relation | Example |
|---|---|
| Split equals whole | paying a contract in two receipts leaves the same debt as one receipt of the sum |
| Sum of parts | a report over a month equals the sum of its weeks |
| Narrowing never grows | adding a filter never returns more rows |
| Order doesn't matter | reordering input lines doesn't change a total |
| Equivalent inputs | searching with and without diacritics finds the same record when search is accent-insensitive |
| Inverse | creating then cancelling a booking restores the session balance |

Each relation is one case; it finds wrong arithmetic without anyone computing the expected number by hand.

---

## Defect-based design

For every defect found (in testing or production), ask which technique would have caught it, then **sweep the same
pattern elsewhere**: one field accepted a `null` → send `null` to every field of every operation; one list ignored
the branch filter → check every list. The defect gets a regression case; the pattern gets a sweep.

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
| Identifiers | non-existent, deleted, belonging to another user, malformed in every path parameter (expect 400 or 404, never 500) |
| Request bodies | a missing, `null` or wrongly typed field (expect a field error code, never the validator's raw sentence); unknown fields; an empty body |
| Search | wildcard characters (`%`, `_`, `*`), diacritics, leading/trailing spaces, case |
| Concurrency | double submit, two users editing the same record, action during state change, **two requests that each pass a check only one should pass** (double booking, consuming the last session twice) |
| Sessions | back button after submit, session expiring mid-flow, two tabs |
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

Findings that should be checked every release become scripted test cases. Use a charter, not an automated case,
where an automated check would be risky on a shared environment (an administrator removing their own rights).

---

## Where designs are thin

From comparing an agent's drafts with a team's 376 cases for the same product, condition by condition
(manual-qa-agent ADR-0022–0024). Name these in every design, because they are what gets skipped:

| Skipped | Instead |
|---|---|
| Boundaries beyond the stated range | 0, negative, non-numeric, empty, max + 1 characters — [boundary value analysis](#boundary-value-analysis) |
| The other column of a decision table | the plain path that needs no special handling is a column — [decision tables](#decision-tables) |
| Adjacent permission layers | signed-out access, actions inside a module, the API behind the screen — [permission matrix](#permission-matrix) |
| Clear clauses of an unclear criterion | design every clause that is clear, quoted; ask about the one that isn't |
| The negative branch at each hand-over | [scenario testing](#scenario--use-case-testing) |
