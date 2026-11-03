import { expect, test } from '../fixtures/fixtures';
import { uniqueNote } from '../utils/helpers';

test('customer adds a note to an order', async ({ loginAs, ordersPage, orderFactory }) => {
    const order = await orderFactory.create({ item: 'Gadget', qty: 1 });
    await loginAs('customer');
    await ordersPage.open('/orders');
    await ordersPage.openNotes(order.id);
    const note = uniqueNote();
    await ordersPage.addNote(note);
    await expect.poll(() => ordersPage.lastNote()).toContain(note);
});

test('manager sees the customer note', async ({ page, loginAs, ordersPage, orderFactory, ordersService }) => {
    const order = await orderFactory.create({ item: 'Gadget', qty: 1 });
    const note = uniqueNote('customer');
    await ordersService.addNote(order.id, note);
    await loginAs('manager');
    await ordersPage.open('/orders');
    await ordersPage.openNotes(order.id);
    await expect(page.locator('.note-list li').nth(0)).toContainText(note);
});

test('customer opens the note editor', async ({ page, loginAs, ordersPage, orderFactory }) => {
    const order = await orderFactory.create({ item: 'Gadget', qty: 1 });
    await loginAs('customer');
    await ordersPage.open('/orders');
    await ordersPage.openNotes(order.id);
    await page.locator('#note-text').click();
});
