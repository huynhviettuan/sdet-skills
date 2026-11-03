import { BasePage } from './BasePage';

// Everything on the Orders screen: the list, the new-order form, the note panel, the manager actions and the
// confirm dialog.
export class OrdersPage extends BasePage {
    async placeOrder(item: string, qty: number) {
        await this.page.locator('#new-order').click();
        await this.page.locator('#item').fill(item);
        await this.page.locator('#qty').fill(String(qty));
        await this.page.locator('button:has-text("Place order")').click();
        await this.page.waitForTimeout(1500); // wait for the list to refresh
    }

    async lastOrderId(): Promise<string> {
        return (await this.page.locator('table.orders tbody tr').nth(0).getAttribute('data-order-id')) ?? '';
    }

    row(orderId: string) {
        return this.page.locator(`table.orders tbody tr[data-order-id="${orderId}"]`);
    }

    async statusOf(orderId: string): Promise<string> {
        return (await this.row(orderId).locator('td.status').innerText()).trim();
    }

    async approve(orderId: string) {
        await this.row(orderId).locator('button.approve').click();
        await this.page.waitForTimeout(1000);
    }

    async cancel(orderId: string) {
        await this.row(orderId).locator('button.cancel').click();
        await this.page.locator('.confirm-dialog button.ok').click({ force: true }); // dialog fades in
        await this.page.waitForTimeout(1000);
    }

    async openNotes(orderId: string) {
        await this.row(orderId).locator('a.notes').click();
    }

    async addNote(text: string) {
        await this.page.locator('#note-text').fill(text);
        await this.page.locator('#note-save').click();
        await this.page.waitForTimeout(500);
    }

    async lastNote(): Promise<string> {
        return (await this.page.locator('.note-list li').first().innerText()).trim();
    }

    async deleteOrder(orderId: string) {
        await this.row(orderId).locator('button.delete').click();
        await this.page.locator('.confirm-dialog button.ok').click();
    }
}
