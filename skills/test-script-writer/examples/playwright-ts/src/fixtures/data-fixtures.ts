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
        // Teardown: runs even when the test failed. Idempotent, and judged by the real signal — the pet is gone — not
        // by the delete's status: the shared Petstore answers a DELETE oddly at times (a 304 in the nightly run of
        // 2026-10-30). A status other than 200/404 is followed by a GET; only a pet still present after one retry leaks.
        const gone = async (id: number): Promise<boolean> => (await petService.getPetById(id)).statusCode === NOT_FOUND;
        const leaked: string[] = [];
        for (const id of created) {
            let { statusCode } = await petService.deletePet(id);
            if (statusCode !== OK && statusCode !== NOT_FOUND && !(await gone(id))) {
                ({ statusCode } = await petService.deletePet(id));
                if (!(await gone(id))) leaked.push(`${id} (still present, last status ${statusCode})`);
            }
        }
        if (leaked.length) throw new Error(`Teardown could not delete pets: ${leaked.join(', ')}`);
    },
    todoFactory: async ({}, use) => {
        await use({
            titles: (count) => Array.from({ length: count }, (_, i) => `todo ${i + 1} ${randomUUID().slice(0, 8)}`)
        });
    }
});
