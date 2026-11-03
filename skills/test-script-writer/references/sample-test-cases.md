# Sample Test Cases

The worked example for this skill: two test-case files in the `test-case-design` format, as they would sit in
`docs/test-cases/`. Both code-template references implement exactly these cases, and the result was run against the
live TodoMVC demo (`https://demo.playwright.dev/todomvc`) and Swagger Petstore (`https://petstore3.swagger.io/api/v3`).

Contents:

- [docs/test-cases/todo.md](#docstest-casestodomd)
- [docs/test-cases/pet.md](#docstest-casespetmd)

---

## docs/test-cases/todo.md

````md
# Todo list — Test Cases

Feature: Todo list (FR-TODO-001) · Page: `/todomvc/#/` · Techniques: scenario, equivalence partitioning

## Coverage — Todo list

| Source | Item | Covered by |
|---|---|---|
| AC | AC-TODO-001 add | TC-TODO-001 |
| AC | AC-TODO-002 complete + filter | TC-TODO-002 |
| AC | AC-TODO-003 blank titles rejected | TC-TODO-003 (EP: empty, spaces only) |

### TC-TODO-001 — Added todo appears in the list and the counter

Verifies:   AC-TODO-001
Priority:   P0
Type:       Functional, positive
Layer:      UI
Automation: Candidate
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
Automation: Candidate
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
Automation: Candidate
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
````

---

## docs/test-cases/pet.md

````md
# Pet API — Test Cases

Feature: Pet store inventory (FR-PET-001) · Spec: `specs/petstore.json` (tag `pet`) · Techniques: CRUD, EP

### TC-PET-001 — Created pet can be retrieved by id

Verifies:   AC-PET-001
Priority:   P0
Type:       Functional, positive
Layer:      API
Automation: Candidate
Status:     Ready

Preconditions:
- A pet with status "available" exists

Steps:
1. Get the pet by its id.

Expected results:
1. Status 200; body matches the getPetById response schema.
2. Body has the same id, name, and status "available".

### TC-PET-002 — Unknown pet id returns 404

Verifies:   AC-PET-002
Priority:   P1
Type:       Functional, negative
Layer:      API
Automation: Candidate
Status:     Ready

Preconditions:
- A pet id that does not exist (created, then deleted)

Steps:
1. Get the pet by that id.

Expected results:
1. Status 404.

### TC-PET-003 — Search by status returns only pets with that status

Verifies:   AC-PET-003
Technique:  Equivalence partitioning (each valid status)
Priority:   P1
Type:       Functional, positive
Layer:      API
Automation: Candidate
Status:     Ready

Preconditions:
- A pet with <status> exists, created by this test (so the result can't be empty, and so there is a record whose
  shape this test owns)

Test data:
| status    |
|-----------|
| available |
| pending   |
| sold      |

Steps:
1. Find pets by <status>.

Expected results:
1. Status 200.
2. Every returned pet has status <status>.
3. The pet this test created is in the result and matches the Pet schema (`getPetById_200`).

Scope note (2026-11-02): the whole-body schema check that used to be expected result 1 is out of scope on a shared
server — other users' records can violate the spec (the public Petstore served three pets without the required
`name`), and that is a finding about the server's input validation, not about the API contract this test relies on.
The case asserts the contract on the record it owns; a dedicated case against a server you control can assert the
whole body.
````
