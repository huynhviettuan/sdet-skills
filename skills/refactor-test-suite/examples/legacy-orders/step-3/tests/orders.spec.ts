import { expect, test } from '../fixtures/fixtures';

test.describe('Orders - customer places, manager approves and cancels', () => {
    test('[ORD-1] customer places an order', async ({ loginAs, ordersPage, orderFactory }) => {
        await loginAs('customer');
        await ordersPage.open();
        const orderId = await ordersPage.placeOrder('Widget', 2);
        orderFactory.track(orderId); // created through the UI, so the factory is told what to delete
        await expect(ordersPage.toast.withText('Order placed')).toBeVisible();
        await expect(ordersPage.list.row(orderId).status).toHaveText('New'); // ORD-1: the expected value, not "some id"
    });

    test('[ORD-2] manager approves the order', async ({ loginAs, ordersPage, orderFactory }) => {
        const order = await orderFactory.create({ item: 'Widget', qty: 2 });
        await loginAs('manager');
        await ordersPage.open();
        await ordersPage.approve(order.id);
        await expect(ordersPage.list.row(order.id).status).toHaveText('Approved');
    });

    test('[ORD-2] manager cancels the order', async ({ loginAs, ordersPage, orderFactory }) => {
        const order = await orderFactory.create({ item: 'Widget', qty: 2 });
        await loginAs('manager');
        await ordersPage.open();
        await ordersPage.approve(order.id); // the legacy chain cancelled an approved order; same precondition
        await expect(ordersPage.list.row(order.id).status).toHaveText('Approved');
        await ordersPage.cancel(order.id);
        await expect(ordersPage.list.row(order.id).status).toHaveText('Cancelled');
    });
});
