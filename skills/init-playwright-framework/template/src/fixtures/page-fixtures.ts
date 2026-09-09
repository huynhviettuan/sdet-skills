import { test as base } from '@playwright/test';

type PageObjects = {
    // Register page objects here as they're created, e.g.:
    // signInPage: SignInPage;
};

export const test = base.extend<PageObjects>({
    // signInPage: async ({}, use) => {
    //     await use(new SignInPage());
    // }
});
