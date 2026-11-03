import { expect, test } from '@playwright/test';
import { OrdersPage } from '../pages/OrdersPage';
import { API_URL, CUSTOMER, MANAGER, login, uniqueNote } from '../utils/helpers';

let orderId: string;

test.beforeEach(async ({ request }) => {
    const res = await request.post(`${API_URL}/orders`, { data: { item: 'Gadget', qty: 1, customer: 'customer01' } });
    orderId = (await res.json()).id;
});

test('customer adds a note to an order', async ({ page, request }) => {
    await login(page, CUSTOMER);
    const orders = new OrdersPage(page);
    await orders.open('/orders');
    await orders.openNotes(orderId);
    const note = uniqueNote();
    await orders.addNote(note);
    expect(await orders.lastNote()).toContain(note);
    await request.delete(`${API_URL}/orders/${orderId}`);
});

test('manager sees the customer note', async ({ page, request }) => {
    const note = uniqueNote('customer');
    await request.post(`${API_URL}/orders/${orderId}/notes`, { data: { text: note } });
    await login(page, MANAGER);
    const orders = new OrdersPage(page);
    await orders.open('/orders');
    await orders.openNotes(orderId);
    expect(await page.locator('.note-list li').nth(0).innerText()).toContain(note);
    await request.delete(`${API_URL}/orders/${orderId}`);
});

test('customer opens the note editor', async ({ page }) => {
    await login(page, CUSTOMER);
    const orders = new OrdersPage(page);
    await orders.open('/orders');
    await orders.openNotes(orderId);
    await page.locator('#note-text').click();
});
