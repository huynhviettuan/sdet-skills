# Code Templates — Playwright / TypeScript

The implementation of [`sample-test-cases.md`](sample-test-cases.md) for the init-playwright-framework scaffold, plus a
sentinel and metamorphic tests. Every block below is copied from the runnable suite in
[`../examples/playwright-ts/`](../examples/playwright-ts/README.md), which `run-examples.sh` re-verifies against the
live TodoMVC demo and Petstore API (last run: 2026-10-28, green — see [Run and verify](#run-and-verify)).
Prerequisites (TodoPage, PetService, types, schemas) come from `page-builder` and `service-builder`; the examples
folder has them too.

Contents:

- [Data factory fixture](#data-factory-fixture)
- [Sessions per role](#sessions-per-role)
- [UI spec](#ui-spec)
- [API spec](#api-spec)
- [Blocked and known-bug cases](#blocked-and-known-bug-cases)
- [Sentinel](#sentinel)
- [Metamorphic relations and derived values](#metamorphic-relations-and-derived-values)
- [Run and verify](#run-and-verify)

---

## Data factory fixture

`src/fixtures/data-fixtures.ts` — builds on the service fixtures, tracks what each test creates, and deletes it in
teardown (which runs even when the test fails). The todo factory only makes unique titles: TodoMVC keeps its state in
the test's own browser context, which Playwright discards.

```ts
import { randomInt, randomUUID } from 'node:crypto';

import { test as serviceFixtures } from '@fixtures/service-fixtures';
import { type Pet, type PetStatus } from '@models/pet/pet.interface';

type PetSeed = {
    status: PetStatus;
    /** Tag names; use `uniqueTag()` so a search on the shared server can only find this run's pets. */
    tags?: string[];
};

type PetFactory = {
    /** A new pet with a unique id and name; deleted after the test even if it fails. */
    create(seed: PetSeed): Promise<Pet>;
    /** A tag name no other test or user of the shared server has. */
    uniqueTag(): string;
};

type TodoFactory = {
    /** `count` unique titles. Todos live in the test's own browser context, which is discarded after the test. */
    titles(count: number): string[];
};

type DataFixtures = {
    petFactory: PetFactory;
    todoFactory: TodoFactory;
};

const OK = 200;
const NOT_FOUND = 404;

export const test = serviceFixtures.extend<DataFixtures>({
    petFactory: async ({ petService }, use) => {
        const created: number[] = [];
        await use({
            async create({ status, tags = [] }) {
                const id = 1_000_000_000 + randomInt(8_000_000_000);
                const { statusCode, data } = await petService.addPet({
                    id,
                    name: `autotest-pet-${id}`,
                    photoUrls: [],
                    tags: tags.map((name, index) => ({ id: index + 1, name })),
                    status
                });
                if (statusCode !== OK) throw new Error(`Precondition failed: addPet returned ${statusCode}`);
                created.push(id);
                return data;
            },
            uniqueTag: () => `autotest-tag-${randomUUID()}`
        });
        // Teardown: runs even when the test failed. Idempotent — a pet the test already deleted answers 200 or 404.
        const leaked: string[] = [];
        for (const id of created) {
            const { statusCode } = await petService.deletePet(id);
            if (statusCode !== OK && statusCode !== NOT_FOUND) leaked.push(`${id} (${statusCode})`);
        }
        if (leaked.length) throw new Error(`Teardown could not delete pets: ${leaked.join(', ')}`);
    },
    todoFactory: async ({}, use) => {
        await use({
            titles: (count) => Array.from({ length: count }, (_, i) => `todo ${i + 1} ${randomUUID().slice(0, 8)}`)
        });
    }
});
```

Register it once in `src/fixtures/fixtures.ts`:

```ts
import { test as dataFixtures } from '@fixtures/data-fixtures';

export const test = mergeTests(
    serviceFixtures,
    dataFixtures,
    pageFixtures,
    // ...the other fixtures
);
```

---

## Sessions per role

When cases run as several roles, or sign-in is rate limited, sign each role in **once** and reuse the session — a
UI sign-in per test multiplies run time and trips the limit. Verified on the Gym CRM pilot (6 roles, 60-row
permission matrix: 6 API sign-ins per run instead of 64 UI sign-ins).

`playwright.config.ts` — a setup project the UI project depends on:

```ts
{ name: 'setup', testDir: './tests/setup/.', testMatch: /.*\.setup\.ts/ },
{ name: 'e2e', testDir: './tests/e2e/.', dependencies: ['setup'], use: { /* … */ } },
```

`tests/setup/auth.setup.ts` — one saved session per role (`.auth/` is gitignored):

```ts
import { authFile, Staff, type StaffRole } from '@constants/roles.constant';
import { expect, test } from '@fixtures/fixtures';
import { saveRoleSession } from '@helpers/services/session.helper';

for (const role of Object.keys(Staff) as StaffRole[]) {
    test(`session for ${role}`, async () => {
        expect(await saveRoleSession(role)).toBe(authFile(role));
    });
}
```

`saveRoleSession` signs in through the API (the auth service) and writes a storageState file holding the session
cookie for the app's host. Tests pick the role per `describe`:

```ts
test.describe('Permission matrix — manager', () => {
    test.use({ storageState: authFile('manager') });
    // …one test per matrix row
});
```

Tests about signing in itself start signed out: `test.use({ storageState: { cookies: [], origins: [] } })`.
Tests that deliberately hit a rate limit go in their own project with `dependencies: ['e2e']`, so they run last.

When a case needs an account **in a specific state** (disabled, outside its allowed hours, a permission switched
off), create it through the API in a factory fixture and put it into that state in the test's Arrange step — the
pilot automated four cases the executable-step format had left manual this way. If the API cannot delete what the
factory created, the teardown neutralises it instead (disable, archive) and every record gets a unique key.

---

## UI spec

`tests/e2e/todo.spec.ts` — implements `docs/test-cases/todo.md`.

```ts
import { Endpoints } from '@constants/endpoints.constant';
import { expect, test } from '@fixtures/fixtures';

/** Implements docs/test-cases/todo.md (TC-TODO-001..003). */
test.describe('Todo list', () => {
    test.beforeEach(async ({ goto }) => {
        await goto(Endpoints.todo.list);
    });

    test(
        '[TC-TODO-001] added todo appears in the list and the counter',
        { tag: ['@P0', '@smoke'], annotation: { type: 'AC', description: 'AC-TODO-001' } },
        async ({ todoPage }) => {
            // Act
            await todoPage.addTodo('buy milk');

            // Assert
            await expect.poll(() => todoPage.main.getTitles()).toEqual(['buy milk']);
            await expect.poll(() => todoPage.footer.lblCount.getInnerText()).toBe('1 item left');
        }
    );

    test(
        '[TC-TODO-002] completed todo is listed under Completed and hidden under Active',
        { tag: ['@P1'], annotation: { type: 'AC', description: 'AC-TODO-002' } },
        async ({ todoPage }) => {
            // Arrange: precondition is two todos (the app has no API, so through the page object)
            await todoPage.addTodo('buy milk');
            await todoPage.addTodo('walk dog');

            // Act + Assert, step by step as in the test case
            await todoPage.completeTodo('buy milk');
            await expect.poll(() => todoPage.footer.lblCount.getInnerText()).toBe('1 item left');

            await todoPage.filterBy('Completed');
            await expect.poll(() => todoPage.main.getTitles()).toEqual(['buy milk']);

            await todoPage.filterBy('Active');
            await expect.poll(() => todoPage.main.getTitles()).toEqual(['walk dog']);
        }
    );

    const blankTitles = [
        { partition: 'empty', title: '' },
        { partition: 'spaces only', title: '   ' }
    ];

    for (const { partition, title } of blankTitles) {
        test(
            `[TC-TODO-003] blank titles are not added (${partition})`,
            { tag: ['@P2'], annotation: { type: 'AC', description: 'AC-TODO-003' } },
            async ({ todoPage }) => {
                // Act
                await todoPage.addTodo(title);
                // Sync point for a negative check: a valid todo added afterwards proves the blank one was processed
                await todoPage.addTodo('sync point');

                // Assert
                await expect.poll(() => todoPage.main.getTitles()).toEqual(['sync point']);
            }
        );
    }
});
```

Notes:

- `expect.poll(...)` retries the read until it matches — the waiting assertion for page state.
- TC-TODO-002 asserts after each step that has its own expected result.
- TC-TODO-003 generates one test per data row; the `sync point` todo added afterwards is what makes the absence
  check meaningful (named so it isn't confused with the [sentinel](#sentinel) test).

---

## API spec

`tests/api/pet.spec.ts` — implements `docs/test-cases/pet.md`.

```ts
import { expect, test } from '@fixtures/fixtures';
import { validateJsonSchema } from '@helpers/services/validate-schema.helper';
import { type PetStatus } from '@models/pet/pet.interface';
import { StatusCodes } from 'http-status-codes';

/** Implements docs/test-cases/pet.md (TC-PET-001..003). */
test.describe('Pet API', () => {
    test(
        '[TC-PET-001] created pet can be retrieved by id',
        { tag: ['@P0', '@smoke'], annotation: { type: 'AC', description: 'AC-PET-001' } },
        async ({ petFactory, petService }) => {
            // Arrange
            const pet = await petFactory.create({ status: 'available' });

            // Act
            const { statusCode, data } = await petService.getPetById(pet.id);

            // Assert
            expect(statusCode).toBe(StatusCodes.OK);
            await validateJsonSchema('getPetById_200', 'pet', data);
            expect(data).toMatchObject({ id: pet.id, name: pet.name, status: 'available' });
        }
    );

    test(
        '[TC-PET-002] unknown pet id returns 404',
        { tag: ['@P1'], annotation: { type: 'AC', description: 'AC-PET-002' } },
        async ({ petFactory, petService }) => {
            // Arrange: an id that certainly does not exist (created, then deleted)
            const pet = await petFactory.create({ status: 'available' });
            // audit-ignore R-TEARDOWN: deleting is the precondition; cleanup stays with the factory
            const deleted = await petService.deletePet(pet.id);
            expect(deleted.statusCode).toBe(StatusCodes.OK);

            // Act
            const { statusCode } = await petService.getPetById(pet.id);

            // Assert
            expect(statusCode).toBe(StatusCodes.NOT_FOUND);
        }
    );

    const statuses: PetStatus[] = ['available', 'pending', 'sold'];

    for (const status of statuses) {
        test(
            `[TC-PET-003] search by status returns only pets with that status (${status})`,
            { tag: ['@P1'], annotation: { type: 'AC', description: 'AC-PET-003' } },
            async ({ petFactory, petService }) => {
                // Arrange: our own pet with this status, so the result can't be empty on a shared server
                const pet = await petFactory.create({ status });

                // Act
                const { statusCode, data } = await petService.findPetsByStatus({ query: { status } });

                // Assert
                expect(statusCode).toBe(StatusCodes.OK);
                await validateJsonSchema('findPetsByStatus_200', 'pet', data);
                expect(data.map(({ id }) => id)).toContain(pet.id);
                expect(data.filter((found) => found.status !== status)).toEqual([]);
            }
        );
    }
});
```

Notes:

- Preconditions come from `petFactory`; no test deletes its own data except where deleting *is* the precondition
  (TC-PET-002), and the fixture's teardown tolerates the already-deleted pet.
- TC-PET-002 checks its precondition with a plain `expect(deleted.statusCode)` — an assertion message string on that
  line would be the literal `can-fail.mjs` mutates, and a changed message never fails the test.
- TC-PET-003 creates its own pet with the status first: on a shared server the search may otherwise return `[]`, and
  "every returned pet has status X" holds vacuously on an empty list. The pet being listed proves the search ran.
- `validateJsonSchema` uses the spec-extracted schema `src/data/schemas/pet/<operationId>_<status>_schema.json`.

---

## Blocked and known-bug cases

```ts
// Blocked by an open question: visible in the report as "fixme", never silently missing
test.fixme('[TC-PET-004] pet name longer than 255 characters is rejected (blocked by OQ-012)', async () => {});

// Known product bug: the correct expectation stays; the test is expected to fail until the defect is fixed
test(
    '[TC-PET-005] updating a deleted pet returns 404',
    { tag: ['@P2'], annotation: [{ type: 'AC', description: 'AC-PET-005' }, { type: 'issue', description: 'DEF-231' }] },
    async ({ petFactory, petService }) => {
        test.fail(); // remove when DEF-231 is fixed
        // ...
    }
);
```

---

## Sentinel

A test whose expectation is **known to be false**, written through the same fixtures, page objects and assertion
helpers as the real tests, and marked so the run is red if it ever passes (after `manual-qa-agent` ADR-0023). Green
tests prove something only if the assertion path can fail on this build: a broken `expect` wrapper, a poll that
resolves on any value, or a page object reading the wrong element makes every test pass vacuously — and makes the
sentinel pass too, which Playwright reports as an unexpected pass.

Use one per suite (or one per layer the suite drives: UI, API) when the suite runs unattended — nightly, or as a
release gate — and route it through the most shared path (the custom `expect`, `expect.poll`, a container read).

`tests/sentinel.spec.ts`:

```ts
import { Endpoints } from '@constants/endpoints.constant';
import { expect, test } from '@fixtures/fixtures';

const KNOWN_FALSE_COUNTER = '2 items left';

test(
    '[SENTINEL] a known-false counter expectation fails',
    { tag: ['@sentinel'], annotation: { type: 'sentinel', description: KNOWN_FALSE_COUNTER } },
    async ({ goto, todoPage, todoFactory }) => {
        test.fail();
        await goto(Endpoints.todo.list);
        const [title] = todoFactory.titles(1);
        await todoPage.addTodo(title);
        await expect.poll(() => todoPage.main.getTitles()).toEqual([title]);

        // Known false: one todo was added, so the counter says "1 item left".
        await expect.poll(() => todoPage.footer.lblCount.getInnerText()).toBe(KNOWN_FALSE_COUNTER);
    }
);
```

How it is checked:

- `test.fail()` inverts the verdict: the sentinel failing is the expected outcome (the list reporter prints it with
  `x` and counts it as passed). If it passes, Playwright reports it as failed and exits non-zero — the run is red.
- `test.fail()` accepts **any** failure, so everything before the false assertion is asserted normally, and the
  runner checks the reason: in the JSON report every repeat must have `expectedStatus: "failed"`, `status:
  "failed"` and an error message containing `Expected: "<the sentinel annotation's value>"` (strip the ANSI colour
  codes first). The examples' `run-examples.sh` does this. A broken setup fails the real tests too, so it can't hide
  behind the sentinel.
- Leave it out of `can-fail.mjs`: it is already a mutant that must die.
- A sentinel that starts passing is a finding — the assertion path broke, or the product changed so the expectation
  is no longer false. Someone decides which; the sentinel is never deleted to get green.

---

## Metamorphic relations and derived values

When the right expected value can't be stated up front (shared data, generated content, counts that depend on
history), or a value is derived from others (a counter, a total, a broader search), assert a **relation between two
independent reads of the same state** instead of a hand-computed number: Active and Completed partition All, the
counter equals |Active|, an operation followed by its inverse restores the state, a broader search returns a
superset.

Rules:

- Read each side through a different path (another filter, another endpoint, the counter vs the list).
- Make the relation non-vacuous first: assert that the history happened (the deleted item is gone, the one-tag search
  lists its pet) — otherwise 0 + 0 = 0 passes on an empty page.
- Expected values come from the relation or from the test's own data, never from a count typed in by hand.
- Put a literal on each relation's line — a difference against `0` (`toBe(0)`, `toHaveLength(0)`), a delta (`-1`),
  or a value from the test's data (`toEqual(['sold'])`) — so `can-fail.mjs` has a constant to mutate. A line like
  `toBe(active.length)` has no literal, is never mutated, and nothing proves it can fail.
- On a shared server, create the entities the relation is about with unique keys (factory + teardown) and assert only
  about them.

`tests/e2e/todo.metamorphic.spec.ts` — page methods: `getTitlesUnder(filter)` clicks the filter, waits until it is
selected (the list renders in the same update) and reads the titles; `footer.getItemsLeft()` reads the number inside
the counter.

```ts
import { Endpoints } from '@constants/endpoints.constant';
import { expect, test } from '@fixtures/fixtures';

/**
 * Metamorphic / derived-value checks — implements docs/test-cases/todo.md (TC-TODO-004, TC-TODO-005).
 * No expected list or count is computed by hand: each assertion is a relation between two independent reads of the
 * same state. Relations are written as a difference against a literal 0 (or -1), so can-fail.mjs has a constant to
 * mutate and proves each relation can fail.
 */
test.describe('Todo list — relations', () => {
    test.beforeEach(async ({ goto }) => {
        await goto(Endpoints.todo.list);
    });

    test(
        '[TC-TODO-004] Active and Completed partition All and the counter equals the Active count',
        { tag: ['@P2', '@metamorphic'], annotation: { type: 'AC', description: 'AC-TODO-002' } },
        async ({ todoPage, todoFactory }) => {
            // Arrange: a mixed history — add five, complete two, delete one (no API, so through the page object)
            const titles = todoFactory.titles(5);
            for (const title of titles) await todoPage.addTodo(title);
            await expect.poll(() => todoPage.main.getTitles()).toEqual(titles);
            const [first, deleted, third] = titles;
            await todoPage.completeTodo(first);
            await todoPage.completeTodo(third);
            // audit-ignore R-TEARDOWN: deleting a todo is a step of the sequence under test, not cleanup
            await todoPage.deleteTodo(deleted);

            // Act: read the same state through three filters and the counter
            const all = await todoPage.getTitlesUnder('All');
            const active = await todoPage.getTitlesUnder('Active');
            const completed = await todoPage.getTitlesUnder('Completed');
            const itemsLeft = await todoPage.footer.getItemsLeft();

            // Assert: the sequence happened (otherwise every relation below holds trivially) ...
            expect(all).not.toContain(deleted);
            expect(completed).toContain(first);
            // ... no todo is both Active and Completed ...
            expect(active.filter((title) => completed.includes(title))).toHaveLength(0);
            // ... every todo under All is Active or Completed ...
            expect(all.filter((title) => !active.includes(title) && !completed.includes(title))).toHaveLength(0);
            // ... |Active| + |Completed| == |All| ...
            expect(active.length + completed.length - all.length).toBe(0);
            // ... and the counter (a derived value) equals |Active|.
            expect(itemsLeft - active.length).toBe(0);
        }
    );

    test(
        '[TC-TODO-005] completing then reopening a todo restores the counter',
        { tag: ['@P2', '@metamorphic'], annotation: { type: 'AC', description: 'AC-TODO-002' } },
        async ({ todoPage, todoFactory }) => {
            // Arrange
            const titles = todoFactory.titles(3);
            for (const title of titles) await todoPage.addTodo(title);
            await expect.poll(() => todoPage.main.getTitles()).toEqual(titles);
            const before = await todoPage.footer.getItemsLeft();
            const change = async (): Promise<number> => (await todoPage.footer.getItemsLeft()) - before;
            const [target] = titles;

            // Act + Assert: completing one todo lowers the counter by one ...
            await todoPage.completeTodo(target);
            await expect.poll(change).toBe(-1);

            // ... and the inverse operation restores it.
            await todoPage.reopenTodo(target);
            await expect.poll(change).toBe(0);
        }
    );
});
```

`tests/api/pet.metamorphic.spec.ts` — the pets are the test's own (`petFactory`: unique id, name and tags; deleted in
teardown):

```ts
import { expect, test } from '@fixtures/fixtures';
import { type PetStatus } from '@models/pet/pet.interface';
import { type PetService } from '@services/pet.service';
import { StatusCodes } from 'http-status-codes';

const STATUSES: PetStatus[] = ['available', 'pending', 'sold'];

/** The statuses whose findPetsByStatus result lists the pet — exactly one, its own, if the searches are consistent. */
async function statusesListing(petService: PetService, petId: number): Promise<PetStatus[]> {
    const listing: PetStatus[] = [];
    for (const status of STATUSES) {
        const { statusCode, data } = await petService.findPetsByStatus({ query: { status } });
        expect(statusCode).toBe(StatusCodes.OK);
        if (data.some(({ id }) => id === petId)) listing.push(status);
    }
    return listing;
}

async function idsTagged(petService: PetService, tags: string[]): Promise<number[]> {
    const { statusCode, data } = await petService.findPetsByTags({ query: { tags } });
    expect(statusCode).toBe(StatusCodes.OK);
    return data.map(({ id }) => id);
}

/**
 * Metamorphic checks — implements docs/test-cases/pet.md (TC-PET-006, TC-PET-007). The pets are this test's own
 * (unique ids, names and tags) and the factory deletes them, so nothing depends on the shared server's other data.
 */
test.describe('Pet API — relations', () => {
    test(
        '[TC-PET-006] a pet is listed under its own status only, and moves when its status changes',
        { tag: ['@P2', '@metamorphic'], annotation: { type: 'AC', description: 'AC-PET-003' } },
        async ({ petFactory, petService }) => {
            // Arrange
            const pet = await petFactory.create({ status: 'available' });
            expect(await statusesListing(petService, pet.id)).toEqual(['available']);

            // Act
            const { statusCode } = await petService.updatePet({ ...pet, status: 'sold' });
            expect(statusCode).toBe(StatusCodes.OK);

            // Assert: it left "available" and is listed under "sold" — and nowhere else (the inverse view)
            expect(await statusesListing(petService, pet.id)).toEqual(['sold']);
        }
    );

    test(
        '[TC-PET-007] searching by two tags returns a superset of searching by one of them',
        { tag: ['@P2', '@metamorphic'], annotation: { type: 'AC', description: 'AC-PET-003' } },
        async ({ petFactory, petService }) => {
            // Arrange: one pet per tag
            const [tagA, tagB] = [petFactory.uniqueTag(), petFactory.uniqueTag()];
            const petA = await petFactory.create({ status: 'available', tags: [tagA] });
            const petB = await petFactory.create({ status: 'available', tags: [tagB] });

            // Act
            const oneTag = await idsTagged(petService, [tagA]);
            const twoTags = await idsTagged(petService, [tagA, tagB]);

            // Assert: the one-tag result is not empty (else "superset" holds trivially) ...
            expect(oneTag).toContain(petA.id);
            // ... adding a tag loses nothing ...
            expect(oneTag.filter((id) => !twoTags.includes(id))).toHaveLength(0);
            // ... and adds exactly the pet that has only the second tag.
            expect(twoTags.filter((id) => !oneTag.includes(id))).toEqual([petB.id]);
        }
    );
});
```

`findPetsByTags` takes `tags` with `explode: true` (`?tags=a&tags=b`). `BaseService` joins a plain array with commas,
which this server reads as one tag (checked with curl: `?tags=a,b` → `[]`, `?tags=a&tags=b` → both pets), so
`PetService.findPetsByTags` passes a `URLSearchParams` with one pair per tag. With the comma-joined query, the
two-tag search comes back empty and the superset relation fails — the relation catches the encoding bug.

How it is checked: each relation line carries a literal, and `can-fail.mjs` mutated every one of them and saw the
test fail (see [Run and verify](#run-and-verify)).

---

## Run and verify

In a project:

```bash
npx tsc --noEmit && npx eslint . && node scripts/audit-suite.mjs . --fail-on block
npx playwright test --project=e2e --project=api --repeat-each=3 --workers=4 --retries=0
npx playwright test --project=chrome --grep @sentinel   # tests/sentinel.spec.ts sits outside tests/e2e and tests/api
npx playwright test --grep @smoke
node scripts/can-fail.mjs --run "npx playwright test {file} --retries=0" tests/e2e/todo.spec.ts tests/api/pet.spec.ts
```

"Can it fail?" is `can-fail.mjs`: it changes the literal on each assertion line in turn (`'1 item left'` →
`'1 item left__mutant__'`, `0` → `1`), runs the file, and restores it; a mutant the run doesn't notice is an
assertion that cannot fail. Keep assertion messages off assertion lines — the message would be the literal it
mutates.

The whole page, end to end (scaffold → copy the examples → install → gates), is one command:

```bash
bash skills/test-script-writer/examples/playwright-ts/run-examples.sh
```

Run 2026-10-28 (Windows 11 / Git Bash, Node 22.15, Playwright 1.61, bundled Chromium): tsc, ESLint and the audit
clean; 14 tests × `--repeat-each=3` on 4 workers, no retries → 42 expected, 0 unexpected, 0 flaky; the sentinel
failed on its known-false value in all 3 repeats; `can-fail` on the 4 non-sentinel specs → 16 killed, 0 survived.
