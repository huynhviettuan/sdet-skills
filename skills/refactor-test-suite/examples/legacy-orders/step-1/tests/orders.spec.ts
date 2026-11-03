import { expect, test } from '../fixtures/fixtures';

let orderId: string;

test.describe.serial('Orders - customer places, manager approves and cancels', () => {
    test('customer places an order', async ({ page, loginAs, ordersPage }) => {
        await loginAs('customer');
        await ordersPage.open('/orders');
        await ordersPage.placeOrder('Widget', 2);
        expect(await page.locator('.toast').first().innerText()).toContain('Order placed');
        orderId = await ordersPage.lastOrderId();
        expect(orderId).toBeTruthy();
    });

    test('manager approves the order', async ({ loginAs, ordersPage }) => {
        await loginAs('manager');
        await ordersPage.open('/orders');
        await ordersPage.approve(orderId);
        expect(await ordersPage.statusOf(orderId)).toBe('Approved');
    });

    test('manager cancels the order', async ({ page, loginAs, ordersPage }) => {
        await loginAs('manager');
        await ordersPage.open('/orders');
        await ordersPage.cancel(orderId);
        await page.waitForTimeout(1000);
        expect(await ordersPage.statusOf(orderId)).toBe('Cancelled');
        await ordersPage.deleteOrder(orderId); // tidy up so the staging list does not grow
    });
});
