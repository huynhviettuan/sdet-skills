import { test as base } from '@playwright/test';

type ServiceObjects = {
    // Register API services here as they're created, e.g.:
    // usersService: UsersService;
};

export const test = base.extend<ServiceObjects>({
    // usersService: async ({}, use) => {
    //     await use(new UsersService());
    // }
});
