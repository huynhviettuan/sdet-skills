import { expect, test } from '@playwright/test';
import { OrdersPage } from '../pages/OrdersPage';
import { CUSTOMER, MANAGER, login } from '../utils/helpers';

let orderId: string;

test.describe.serial('Orders - customer places, manager approves and cancels', () => {
    test('customer places an order', async ({ page }) => {
        await login(page, CUSTOMER);
        const orders = new OrdersPage(page);
        await orders.open('/orders');
        await orders.placeOrder('Widget', 2);
        expect(await page.locator('.toast').first().innerText()).toContain('Order placed');
        orderId = await orders.lastOrderId();
        expect(orderId).toBeTruthy();
    });

    test('manager approves the order', async ({ page }) => {
        await login(page, MANAGER);
        const orders = new OrdersPage(page);
        await orders.open('/orders');
        await orders.approve(orderId);
        expect(await orders.statusOf(orderId)).toBe('Approved');
    });

    test('manager cancels the order', async ({ page }) => {
        await login(page, MANAGER);
        const orders = new OrdersPage(page);
        await orders.open('/orders');
        await orders.cancel(orderId);
        await page.waitForTimeout(1000);
        expect(await orders.statusOf(orderId)).toBe('Cancelled');
        await orders.deleteOrder(orderId); // tidy up so the staging list does not grow
    });
});
