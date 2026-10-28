# Todo list — Test Cases

Feature: Todo list (FR-TODO-001) · Page: `/todomvc/#/` · Techniques: scenario, equivalence partitioning, metamorphic

TC-TODO-001..003 are the cases from `test-script-writer/references/sample-test-cases.md`; MR-TODO-001..002 are
metamorphic relations added with the verified examples.

## Coverage — Todo list

| Source | Item | Covered by |
|---|---|---|
| AC | AC-TODO-001 add | TC-TODO-001 |
| AC | AC-TODO-002 complete + filter | TC-TODO-002, MR-TODO-001 |
| AC | AC-TODO-003 blank titles rejected | TC-TODO-003 (EP: empty, spaces only) |
| Relation | filters partition the list; counter = Active | MR-TODO-001 |
| Relation | complete ∘ un-complete = identity | MR-TODO-002 |

### TC-TODO-001 — Added todo appears in the list and the counter

Verifies: AC-TODO-001 · Priority: P0 · Layer: UI · Status: Ready · Automation: Automated — `tests/ui/TodoTest.java`

Preconditions: todo list is empty. Steps: 1. Add a todo "buy milk".
Expected results: 1. The list shows exactly "buy milk". 2. The counter shows "1 item left".

### TC-TODO-002 — Completed todo is listed under Completed and hidden under Active

Verifies: AC-TODO-002 · Priority: P1 · Layer: UI · Status: Ready · Automation: Automated — `tests/ui/TodoTest.java`

Preconditions: todos "buy milk" and "walk dog" exist.
Steps: 1. Complete "buy milk". 2. Show the Completed filter. 3. Show the Active filter.
Expected results: 1. The counter shows "1 item left". 2. Completed shows only "buy milk". 3. Active shows only
"walk dog".

### TC-TODO-003 — Blank titles are not added

Verifies: AC-TODO-003 · Technique: EP (invalid partitions) · Priority: P2 · Layer: UI · Status: Ready ·
Automation: Automated — `tests/ui/TodoTest.java`

Test data: `empty` = "", `spaces only` = "   ". Steps: 1. Add a todo with <title>.
Expected results: 1. No todo is added.

### MR-TODO-001 — Active and Completed partition All, and the counter equals |Active|

Technique: metamorphic relation + derived values · Priority: P1 · Layer: UI · Status: Ready ·
Automation: Automated — `tests/ui/TodoMetamorphicTest.java`

Steps: 1. Add 5 todos. 2. Complete the first 2. 3. Delete the 5th (active).
Expected results: 1. Active ∩ Completed = ∅ and |Active| + |Completed| = |All|; Active ∪ Completed = All.
2. "N items left" = |Active| (two independent paths). 3. Derived from the sequence: |All| = 4, Completed = the 2
completed todos, |Active| = 2, the deleted todo is nowhere.

### MR-TODO-002 — Completing then un-completing a todo restores the state

Technique: metamorphic relation (inverse) · Priority: P1 · Layer: UI · Status: Ready ·
Automation: Automated — `tests/ui/TodoMetamorphicTest.java`

Steps: 1. Add 3 todos. 2. Complete the 2nd. 3. Un-complete it.
Expected results: 1. After step 2 the counter is one lower. 2. After step 3 the counter, the todo's state and the
Active list (order included) equal the state after step 1.
