import { test as base } from '@playwright/test';

// Register page objects here as they're created, e.g. `signInPage: SignInPage`.
// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- empty until the first page is registered
type PageObjects = {};

export const test = base.extend<PageObjects>({
    // signInPage: async ({}, use) => {
    //     await use(new SignInPage());
    // }
});
