import { BasePage } from './BasePage';

// Everything on the Orders screen: the list, the new-order form, the note panel, the manager actions and the
// confirm dialog.
export class OrdersPage extends BasePage {
    private get table() {
        return this.page.locator('table.orders');
    }

    private get confirmDialog() {
        return this.page.locator('.confirm-dialog');
    }

    async open(path = '/orders') {
        await super.open(path);
        await this.table.waitFor(); // the screen has rendered when its list is attached
    }

    async placeOrder(item: string, qty: number) {
        await this.page.locator('#new-order').click();
        await this.page.locator('#item').fill(item);
        await this.page.locator('#qty').fill(String(qty));
        const created = this.page.waitForResponse((r) => r.url().endsWith('/orders') && r.request().method() === 'POST');
        await this.page.locator('button:has-text("Place order")').click();
        const { id } = (await (await created).json()) as { id: string };
        await this.row(id).waitFor(); // the list has refreshed when the new order is in it
    }

    async lastOrderId(): Promise<string> {
        return (await this.table.locator('tbody tr').nth(0).getAttribute('data-order-id')) ?? '';
    }

    row(orderId: string) {
        return this.table.locator(`tbody tr[data-order-id="${orderId}"]`);
    }

    async statusOf(orderId: string): Promise<string> {
        return (await this.row(orderId).locator('td.status').innerText()).trim();
    }

    async approve(orderId: string) {
        await this.row(orderId).locator('button.approve').click();
    }

    async cancel(orderId: string) {
        await this.row(orderId).locator('button.cancel').click();
        await this.confirmDialog.waitFor({ state: 'visible' }); // the fade-in was what the force click skipped
        await this.confirmDialog.locator('button.ok').click();
    }

    async openNotes(orderId: string) {
        await this.row(orderId).locator('a.notes').click();
    }

    async addNote(text: string) {
        await this.page.locator('#note-text').fill(text);
        const saved = this.page.waitForResponse((r) => r.url().endsWith('/notes') && r.request().method() === 'POST');
        await this.page.locator('#note-save').click();
        await saved;
    }

    async lastNote(): Promise<string> {
        return (await this.page.locator('.note-list li').first().innerText()).trim();
    }
}
