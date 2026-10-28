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
