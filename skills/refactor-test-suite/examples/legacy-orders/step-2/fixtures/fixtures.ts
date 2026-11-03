import { test as base } from '@playwright/test';
import { env, type Role } from '../config/env';
import { OrdersPage } from '../pages/OrdersPage';
import { type NewOrder, type Order, OrdersService } from '../services/orders.service';

export type OrderFactory = {
    /** Creates an order through the API for the customer account and owns its deletion. */
    create(order: Partial<NewOrder> & Pick<NewOrder, 'item' | 'qty'>): Promise<Order>;
    /** Registers an order created elsewhere (for example through the UI) so teardown deletes it too. */
    track(orderId: string): void;
};

type Fixtures = {
    ordersPage: OrdersPage;
    ordersService: OrdersService;
    orderFactory: OrderFactory;
    loginAs: (role: Role) => Promise<void>;
};

// The composition root: tests receive pages, services, data and sessions from here and build nothing themselves.
export const test = base.extend<Fixtures>({
    ordersPage: async ({ page }, use) => {
        await use(new OrdersPage(page));
    },
    ordersService: async ({ request }, use) => {
        await use(new OrdersService(request, env.apiUrl));
    },
    orderFactory: async ({ ordersService }, use) => {
        const created: string[] = [];
        await use({
            async create(order) {
                const created_ = await ordersService.create({ customer: env.users.customer.username, ...order });
                created.push(created_.id);
                return created_;
            },
            track(orderId) {
                created.push(orderId);
            }
        });
        // Teardown runs even when the test failed; delete is idempotent.
        for (const id of created) await ordersService.delete(id);
    },
    loginAs: async ({ page }, use) => {
        await use(async (role) => {
            const user = env.users[role];
            await page.goto('/login');
            await page.fill('#username', user.username);
            await page.fill('#password', user.password);
            await page.click('button[type=submit]');
            await page.waitForURL('**/orders'); // the redirect is the signal the session is in place
        });
    }
});

export { expect } from '@playwright/test';
