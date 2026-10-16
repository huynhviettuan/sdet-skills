# Code Templates — Playwright / TypeScript

The implementation of [`sample-test-cases.md`](sample-test-cases.md) for the init-playwright-framework scaffold. It
compiles (`tsc`, ESLint), and all 9 tests pass against the live TodoMVC demo and Petstore API; breaking an expected
value makes the test fail with `Expected: "2 items left" / Received: "1 item left"`. Prerequisites (TodoPage,
PetService, types, schemas) come from `page-builder` and `service-builder`.

Contents:

- [Data factory fixture](#data-factory-fixture)
- [Sessions per role](#sessions-per-role)
- [UI spec](#ui-spec)
- [API spec](#api-spec)
- [Blocked and known-bug cases](#blocked-and-known-bug-cases)
- [Run and verify](#run-and-verify)

---

## Data factory fixture

`src/fixtures/data-fixtures.ts` — builds on the service fixtures, tracks what each test creates, and deletes it in
teardown (which runs even when the test fails).

```ts
import { test as serviceFixtures } from '@fixtures/service-fixtures';
import { type Pet, type PetStatus } from '@models/pet/pet.interface';

type PetFactory = {
    /** A new pet with a unique id and name; deleted after the test even if it fails. */
    create(status: PetStatus): Promise<Pet>;
};

type DataFixtures = {
    petFactory: PetFactory;
};

export const test = serviceFixtures.extend<DataFixtures>({
    petFactory: async ({ petService }, use) => {
        const created: number[] = [];
        await use({
            async create(status) {
                const id = 1_000_000_000 + Math.floor(Math.random() * 8_000_000_000);
                const { statusCode, data } = await petService.addPet({
                    id,
                    name: `autotest-pet-${id}`,
                    photoUrls: [],
                    status
                });
                if (statusCode !== 200) throw new Error(`Precondition failed: addPet returned ${statusCode}`);
                created.push(id);
                return data;
            }
        });
        // Teardown: runs even when the test failed; a 404 means the test already deleted it
        for (const id of created) await petService.deletePet(id);
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

/** Implements docs/test-cases/todo.md. */
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
                await todoPage.addTodo('sentinel');

                // Assert
                await expect.poll(() => todoPage.main.getTitles()).toEqual(['sentinel']);
            }
        );
    }
});
```

Notes:

- `expect.poll(...)` retries the read until it matches — the waiting assertion for page state.
- TC-TODO-002 asserts after each step that has its own expected result.
- TC-TODO-003 generates one test per data row; the `sentinel` todo is the sync point that makes the absence check
  meaningful.

---

## API spec

`tests/api/pet.spec.ts` — implements `docs/test-cases/pet.md`.

```ts
import { expect, test } from '@fixtures/fixtures';
import { validateJsonSchema } from '@helpers/services/validate-schema.helper';
import { type PetStatus } from '@models/pet/pet.interface';
import { StatusCodes } from 'http-status-codes';

/** Implements docs/test-cases/pet.md. */
test.describe('Pet API', () => {
    test(
        '[TC-PET-001] created pet can be retrieved by id',
        { tag: ['@P0', '@smoke'], annotation: { type: 'AC', description: 'AC-PET-001' } },
        async ({ petFactory, petService }) => {
            // Arrange
            const pet = await petFactory.create('available');

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
            const pet = await petFactory.create('available');
            // audit-ignore R-TEARDOWN: deleting is the precondition; cleanup stays with the factory
            expect((await petService.deletePet(pet.id)).statusCode, 'precondition: delete').toBe(StatusCodes.OK);

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
            async ({ petService }) => {
                // Act
                const { statusCode, data } = await petService.findPetsByStatus({ query: { status } });

                // Assert
                expect(statusCode).toBe(StatusCodes.OK);
                await validateJsonSchema('findPetsByStatus_200', 'pet', data);
                expect(data.every((pet) => pet.status === status)).toBe(true);
            }
        );
    }
});
```

Notes:

- Preconditions come from `petFactory`; no test deletes its own data except where deleting *is* the precondition
  (TC-PET-002), and the fixture's teardown tolerates the already-deleted pet.
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

## Run and verify

```bash
npx tsc --noEmit && npx eslint tests/e2e/todo.spec.ts tests/api/pet.spec.ts
npx playwright test tests/e2e/todo.spec.ts tests/api/pet.spec.ts --project=e2e --project=api
npx playwright test tests/e2e/todo.spec.ts --repeat-each=3 --workers=4
npx playwright test --grep @smoke
```

"Can it fail?" check: change one expected value (e.g. `'1 item left'` → `'2 items left'`), run the test, confirm it
fails with that value in the message, then restore it.
