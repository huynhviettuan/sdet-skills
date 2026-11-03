import { expect, test } from '../fixtures/fixtures';
import { uniqueNote } from '../utils/helpers';

test('[ORD-3] customer adds a note to an order', async ({ loginAs, ordersPage, orderFactory }) => {
    const order = await orderFactory.create({ item: 'Gadget', qty: 1 });
    await loginAs('customer');
    await ordersPage.open();
    await ordersPage.openNotes(order.id);
    const note = uniqueNote();
    await ordersPage.addNote(note);
    await expect(ordersPage.notes.item(note)).toBeVisible();
});

test('[ORD-3] manager sees the customer note', async ({ loginAs, ordersPage, orderFactory, ordersService }) => {
    const order = await orderFactory.create({ item: 'Gadget', qty: 1 });
    const note = uniqueNote('customer');
    await ordersService.addNote(order.id, note);
    await loginAs('manager');
    await ordersPage.open();
    await ordersPage.openNotes(order.id);
    await expect(ordersPage.notes.item(note)).toBeVisible();
});

test('[ORD-4] customer opens the note editor', async ({ loginAs, ordersPage, orderFactory }) => {
    const order = await orderFactory.create({ item: 'Gadget', qty: 1 });
    await loginAs('customer');
    await ordersPage.open();
    await ordersPage.openNotes(order.id);
    await ordersPage.focusNoteEditor();
    await expect(ordersPage.notes.txtNote).toBeFocused(); // ORD-4: the test used to end here with no assertion
    await expect(ordersPage.notes.txtNote).toBeEmpty();
});
