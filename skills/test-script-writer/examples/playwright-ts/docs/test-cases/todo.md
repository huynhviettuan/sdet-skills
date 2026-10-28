# Todo list — Test Cases

Feature: Todo list (FR-TODO-001) · Page: `/todomvc/#/` · Techniques: scenario, equivalence partitioning, metamorphic relations

## Coverage — Todo list

| Source | Item | Covered by |
|---|---|---|
| AC | AC-TODO-001 add | TC-TODO-001 |
| AC | AC-TODO-002 complete + filter | TC-TODO-002 |
| AC | AC-TODO-003 blank titles rejected | TC-TODO-003 (EP: empty, spaces only) |
| AC | AC-TODO-002 filters and counter stay consistent | TC-TODO-004, TC-TODO-005 (metamorphic) |

### TC-TODO-001 — Added todo appears in the list and the counter

Verifies:   AC-TODO-001
Priority:   P0
Type:       Functional, positive
Layer:      UI
Automation: Automated — tests/e2e/todo.spec.ts
Status:     Ready

Preconditions:
- Todo list is empty

Steps:
1. Add a todo "buy milk".

Expected results:
1. The list shows exactly "buy milk".
2. The counter shows "1 item left".

### TC-TODO-002 — Completed todo is listed under Completed and hidden under Active

Verifies:   AC-TODO-002
Priority:   P1
Type:       Functional, positive
Layer:      UI
Automation: Automated — tests/e2e/todo.spec.ts
Status:     Ready

Preconditions:
- Todos "buy milk" and "walk dog" exist

Steps:
1. Complete "buy milk".
2. Show the Completed filter.
3. Show the Active filter.

Expected results:
1. The counter shows "1 item left".
2. Completed shows only "buy milk".
3. Active shows only "walk dog".

### TC-TODO-003 — Blank titles are not added

Verifies:   AC-TODO-003
Technique:  Equivalence partitioning (invalid partitions)
Priority:   P2
Type:       Functional, negative
Layer:      UI
Automation: Automated — tests/e2e/todo.spec.ts
Status:     Ready

Preconditions:
- Todo list is empty

Test data:
| Case        | title  |
|-------------|--------|
| empty       | ""     |
| spaces only | "   "  |

Steps:
1. Add a todo with <title>.

Expected results:
1. No todo is added.

### TC-TODO-004 — Active and Completed partition All, and the counter equals the Active count

Verifies:   AC-TODO-002
Technique:  Metamorphic relation (partition) + derived value
Priority:   P2
Type:       Functional, positive
Layer:      UI
Automation: Automated — tests/e2e/todo.metamorphic.spec.ts
Status:     Ready

Preconditions:
- Todo list is empty

Steps:
1. Add five todos with unique titles.
2. Complete the first and the third.
3. Delete the second.
4. Read the titles under All, Active and Completed, and the "items left" counter.

Expected results:
1. All no longer shows the deleted todo; Completed shows the first.
2. No title is under both Active and Completed; every title under All is under one of them.
3. |Active| + |Completed| = |All|.
4. The counter equals |Active|.

### TC-TODO-005 — Completing then reopening a todo restores the counter

Verifies:   AC-TODO-002
Technique:  Metamorphic relation (inverse operation)
Priority:   P2
Type:       Functional, positive
Layer:      UI
Automation: Automated — tests/e2e/todo.metamorphic.spec.ts
Status:     Ready

Preconditions:
- Three active todos exist

Steps:
1. Note the counter value.
2. Complete one todo.
3. Reopen the same todo.

Expected results:
1. After step 2 the counter is one lower than the noted value.
2. After step 3 the counter equals the noted value.
