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
