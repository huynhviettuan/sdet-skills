# Pet API — Test Cases

Feature: Pet store inventory (FR-PET-001) · Spec: `specs/petstore.json` (tag `pet`) · Techniques: CRUD, EP, metamorphic relations

### TC-PET-001 — Created pet can be retrieved by id

Verifies:   AC-PET-001
Priority:   P0
Type:       Functional, positive
Layer:      API
Automation: Automated — tests/api/pet.spec.ts
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
Automation: Automated — tests/api/pet.spec.ts
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
Automation: Automated — tests/api/pet.spec.ts
Status:     Ready

Preconditions:
- A pet with <status> exists (created by the test, so the result can't be empty on a shared server)

Test data:
| status    |
|-----------|
| available |
| pending   |
| sold      |

Steps:
1. Find pets by <status>.

Expected results:
1. Status 200; body matches the findPetsByStatus response schema.
2. The result lists the pet from the precondition, and every returned pet has status <status>.

### TC-PET-006 — A pet is listed under its own status only, and moves when its status changes

Verifies:   AC-PET-003
Technique:  Metamorphic relation (partition across statuses, inverse view after an update)
Priority:   P2
Type:       Functional, positive
Layer:      API
Automation: Automated — tests/api/pet.metamorphic.spec.ts
Status:     Ready

Preconditions:
- A pet with status "available" exists

Steps:
1. Find pets by each status (available, pending, sold).
2. Update the pet to status "sold".
3. Find pets by each status again.

Expected results:
1. The pet is listed under "available" only.
2. Status 200.
3. The pet is listed under "sold" only.

### TC-PET-007 — Searching by two tags returns a superset of searching by one of them

Verifies:   AC-PET-003
Technique:  Metamorphic relation (adding a search term to an OR filter)
Priority:   P2
Type:       Functional, positive
Layer:      API
Automation: Automated — tests/api/pet.metamorphic.spec.ts
Status:     Ready

Preconditions:
- Pet A with unique tag A and pet B with unique tag B exist

Steps:
1. Find pets by tag A.
2. Find pets by tags A and B.

Expected results:
1. Step 1 lists pet A.
2. Every pet from step 1 is in step 2's result.
3. Step 2 adds exactly pet B.
