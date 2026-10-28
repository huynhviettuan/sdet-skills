# Pet API — Test Cases

Feature: Pet store inventory (FR-PET-001) · Spec: `specs/petstore.json` (tag `pet`) · Techniques: CRUD, EP, metamorphic

TC-PET-001..003 are the cases from `test-script-writer/references/sample-test-cases.md`; MR-PET-001..002 are
metamorphic relations added with the verified examples. The Petstore is a shared public server: every case creates
its own pets with unique names and tags, and the factory deletes them after the test.

### TC-PET-001 — Created pet can be retrieved by id

Verifies: AC-PET-001 · Priority: P0 · Layer: API · Status: Ready · Automation: Automated — `tests/api/PetTest.java`

Preconditions: a pet with status "available" exists. Steps: 1. Get the pet by its id.
Expected results: 1. Status 200; body matches the getPetById response schema. 2. Body has the same id, name, and
status "available".

### TC-PET-002 — Unknown pet id returns 404

Verifies: AC-PET-002 · Priority: P1 · Layer: API · Status: Ready · Automation: Automated — `tests/api/PetTest.java`

Preconditions: a pet id that does not exist (created, then deleted). Steps: 1. Get the pet by that id.
Expected results: 1. Status 404.

### TC-PET-003 — Search by status returns only pets with that status

Verifies: AC-PET-003 · Technique: EP (each valid status) · Priority: P1 · Layer: API · Status: Ready ·
Automation: Automated — `tests/api/PetTest.java`

Test data: available, pending, sold. Steps: 1. Find pets by <status>.
Expected results: 1. Status 200; body matches the findPetsByStatus response schema. 2. Every returned pet has
status <status>.

### MR-PET-001 — A pet is found under exactly its own status, before and after a status change

Technique: metamorphic relation · Priority: P1 · Layer: API · Status: Ready ·
Automation: Automated — `tests/api/PetMetamorphicTest.java`

Preconditions: a new pet with status "available". Steps: 1. Find by available and by sold. 2. Update the pet to
sold. 3. Find by sold and by available.
Expected results: 1. Listed under available, not under sold. 2. Status 200. 3. Listed under sold, not under
available.

### MR-PET-002 — Searching by two tags returns a superset of searching by one

Technique: metamorphic relation · Priority: P2 · Layer: API · Status: Ready ·
Automation: Automated — `tests/api/PetMetamorphicTest.java`

Preconditions: pet A with unique tag a, pet B with unique tag b. Steps: 1. Find by tags [a]. 2. Find by tags [a, b].
Expected results: 1. findByTags([a, b]) ⊇ findByTags([a]). 2. Derived: [a] → exactly A; [a, b] → exactly A and B
(ids as a set: the server returns a pet once per matching tag).
