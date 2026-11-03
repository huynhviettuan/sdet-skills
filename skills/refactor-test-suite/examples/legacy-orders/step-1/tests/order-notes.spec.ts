import { env } from '../config/env';
import { expect, test } from '../fixtures/fixtures';
import { uniqueNote } from '../utils/helpers';

let orderId: string;

test.beforeEach(async ({ request }) => {
    const res = await request.post(`${env.apiUrl}/orders`, { data: { item: 'Gadget', qty: 1, customer: env.users.customer.username } });
    orderId = (await res.json()).id;
});

test('customer adds a note to an order', async ({ request, loginAs, ordersPage }) => {
    await loginAs('customer');
    await ordersPage.open('/orders');
    await ordersPage.openNotes(orderId);
    const note = uniqueNote();
    await ordersPage.addNote(note);
    expect(await ordersPage.lastNote()).toContain(note);
    await request.delete(`${env.apiUrl}/orders/${orderId}`);
});

test('manager sees the customer note', async ({ page, request, loginAs, ordersPage }) => {
    const note = uniqueNote('customer');
    await request.post(`${env.apiUrl}/orders/${orderId}/notes`, { data: { text: note } });
    await loginAs('manager');
    await ordersPage.open('/orders');
    await ordersPage.openNotes(orderId);
    expect(await page.locator('.note-list li').nth(0).innerText()).toContain(note);
    await request.delete(`${env.apiUrl}/orders/${orderId}`);
});

test('customer opens the note editor', async ({ page, loginAs, ordersPage }) => {
    await loginAs('customer');
    await ordersPage.open('/orders');
    await ordersPage.openNotes(orderId);
    await page.locator('#note-text').click();
});
