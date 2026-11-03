import { test as base } from '@playwright/test';
import { env, type Role } from '../config/env';
import { OrdersPage } from '../pages/OrdersPage';
import { sleep } from '../utils/helpers';

type Fixtures = {
    ordersPage: OrdersPage;
    loginAs: (role: Role) => Promise<void>;
};

// The composition root: tests receive pages and sessions from here and build nothing themselves.
export const test = base.extend<Fixtures>({
    ordersPage: async ({ page }, use) => {
        await use(new OrdersPage(page));
    },
    loginAs: async ({ page }, use) => {
        await use(async (role) => {
            const user = env.users[role];
            await page.goto('/login');
            await page.fill('#username', user.username);
            await page.fill('#password', user.password);
            await page.click('button[type=submit]');
            await sleep(1000); // the redirect to /orders takes a moment
        });
    }
});

export { expect } from '@playwright/test';
