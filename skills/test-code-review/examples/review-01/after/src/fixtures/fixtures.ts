import { expect, test as base } from '@playwright/test';
import { OrdersPage } from '../pages/orders/orders.page';
import { type Order, OrdersService, type OrderStatus } from '../services/orders.service';

type Fixtures = {
    ordersPage: OrdersPage;
    ordersService: OrdersService;
    /** Creates an order the test owns; every order created through it is deleted after the test, whatever the verdict. */
    createOrder: (status: OrderStatus) => Promise<Order>;
};

export const test = base.extend<Fixtures>({
    ordersPage: async ({ page }, use) => {
        await use(new OrdersPage(page.getByTestId('orders-table')));
    },
    ordersService: async ({ request }, use) => {
        await use(new OrdersService(request));
    },
    createOrder: async ({ ordersService }, use) => {
        const created: Order[] = [];
        await use(async (status) => {
            const response = await ordersService.createOrder({ status });
            expect(response.status, 'precondition: createOrder').toBe(201);
            created.push(response.body);
            return response.body;
        });
        for (const order of created) await ordersService.deleteOrder(order.id); // 404 when already gone: fine
    }
});

export { expect };
