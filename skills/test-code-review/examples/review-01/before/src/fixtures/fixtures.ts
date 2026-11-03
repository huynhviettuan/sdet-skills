import { test as base } from '@playwright/test';
import { OrdersPage } from '../pages/orders/orders.page';
import { OrdersService } from '../services/orders.service';

type Fixtures = {
    ordersPage: OrdersPage;
    ordersService: OrdersService;
};

export const test = base.extend<Fixtures>({
    ordersPage: async ({ page }, use) => {
        await use(new OrdersPage(page));
    },
    ordersService: async ({ request }, use) => {
        await use(new OrdersService(request));
    }
});

export { expect } from '@playwright/test';
