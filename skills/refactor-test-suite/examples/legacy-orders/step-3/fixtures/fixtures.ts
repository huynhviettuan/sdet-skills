import { test as base } from '@playwright/test';
import { ToastComponent } from '../components/toast.component';
import { env, type Role } from '../config/env';
import { LoginPage } from '../pages/login/login.page';
import { OrdersPage } from '../pages/orders/orders.page';
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

// The composition root. It owns the only page-global lookups (each screen's root and the notification region);
// pages and containers build everything else from the root they are given.
export const test = base.extend<Fixtures>({
    ordersPage: async ({ page }, use) => {
        await use(new OrdersPage(page.locator('main.orders-screen'), new ToastComponent(page.locator('.toast'))));
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
        const loginPage = new LoginPage(page.locator('form.login'));
        await use(async (role) => {
            await page.goto('/login');
            await loginPage.login(env.users[role]);
            await page.waitForURL('**/orders'); // the redirect is the signal the session is in place
        });
    }
});

export { expect } from '@playwright/test';
