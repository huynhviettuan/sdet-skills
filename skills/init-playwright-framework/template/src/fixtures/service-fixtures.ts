import { test as base } from '@playwright/test';

// Register API services here as they're created, e.g. `usersService: UsersService`.
// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- empty until the first service is registered
type ServiceObjects = {};

export const test = base.extend<ServiceObjects>({
    // usersService: async ({}, use) => {
    //     await use(new UsersService());
    // }
});
