import { test as base } from '@playwright/test';
import { PetService } from '@services/pet.service';

type ServiceObjects = {
    petService: PetService;
};

export const test = base.extend<ServiceObjects>({
    // The public Petstore needs no credentials for the operations used here.
    petService: async ({}, use) => {
        await use(new PetService());
    }
});
