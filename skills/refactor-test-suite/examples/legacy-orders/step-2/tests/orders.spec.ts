import { expect, test } from '../fixtures/fixtures';

test.describe('Orders - customer places, manager approves and cancels', () => {
    test('customer places an order', async ({ page, loginAs, ordersPage, orderFactory }) => {
        await loginAs('customer');
        await ordersPage.open('/orders');
        await ordersPage.placeOrder('Widget', 2);
        await expect(page.locator('.toast').first()).toContainText('Order placed');
        const orderId = await ordersPage.lastOrderId();
        orderFactory.track(orderId); // created through the UI, so the factory is told what to delete
        expect(orderId).toBeTruthy();
    });

    test('manager approves the order', async ({ loginAs, ordersPage, orderFactory }) => {
        const order = await orderFactory.create({ item: 'Widget', qty: 2 });
        await loginAs('manager');
        await ordersPage.open('/orders');
        await ordersPage.approve(order.id);
        await expect.poll(() => ordersPage.statusOf(order.id)).toBe('Approved');
    });

    test('manager cancels the order', async ({ loginAs, ordersPage, orderFactory }) => {
        const order = await orderFactory.create({ item: 'Widget', qty: 2 });
        await loginAs('manager');
        await ordersPage.open('/orders');
        await ordersPage.approve(order.id); // the legacy chain cancelled an approved order; same precondition
        await expect.poll(() => ordersPage.statusOf(order.id)).toBe('Approved');
        await ordersPage.cancel(order.id);
        await expect.poll(() => ordersPage.statusOf(order.id)).toBe('Cancelled');
    });
});
