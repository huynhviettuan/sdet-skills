import { expect, test } from '../src/fixtures/fixtures';
import { StatusLabel } from '../src/pages/orders/orders.page';

test.describe('as manager', () => {
    test.use({ extraHTTPHeaders: { 'x-role': 'manager' } });

    test('[TC-ORD-001] manager saves a note on an order',
        { tag: ['@P1'], annotation: { type: 'requirement', description: 'AC-ORD-001' } },
        async ({ ordersPage, createOrder }) => {
            const order = await createOrder('new');
            await ordersPage.open();

            await ordersPage.setNote(order.number, 'Leave at reception');

            await expect(ordersPage.lblNote(order.number)).toHaveText('Leave at reception');
        });

    test('[TC-ORD-002] manager ships an order and the row shows Shipped',
        { tag: ['@P1'], annotation: { type: 'requirement', description: 'AC-ORD-002' } },
        async ({ ordersPage, createOrder }) => {
            const order = await createOrder('new');
            await ordersPage.open();

            await ordersPage.setStatus(order.number, 'shipped');

            await expect(ordersPage.lblStatus(order.number)).toHaveText(StatusLabel.shipped);
        });
});

test.describe('as customer', () => {
    test.use({ extraHTTPHeaders: { 'x-role': 'customer' } });

    // Red while bug ticket 4471 is open: the suite reports the defect; the expectation stays the case's.
    test('[TC-ORD-003] customer cannot cancel a shipped order',
        { tag: ['@P1'], annotation: { type: 'requirement', description: 'AC-ORD-003' } },
        async ({ ordersPage, createOrder }) => {
            const order = await createOrder('shipped');
            await ordersPage.open();

            await expect(ordersPage.btnCancel(order.number)).toBeDisabled();
            await expect(ordersPage.lblStatus(order.number)).toHaveText(StatusLabel.shipped);
        });
});
