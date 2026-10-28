import { TodoPage } from '@pages/todo';
import { test as base } from '@playwright/test';

type PageObjects = {
    todoPage: TodoPage;
};

export const test = base.extend<PageObjects>({
    todoPage: async ({}, use) => {
        await use(new TodoPage());
    }
});
