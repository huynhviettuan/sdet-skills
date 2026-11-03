import { type Locator, type Page } from '@playwright/test';

export const Routes = { orders: '/orders' } as const;
export const StatusLabel = { new: 'New', shipped: 'Shipped', cancelled: 'Cancelled' } as const;
export type StatusKey = keyof typeof StatusLabel;

type OpenOptions = { filter?: StatusKey };

/** The Orders screen: one row per order, found by its order number. */
export class OrdersPage {
    constructor(private readonly page: Page) {}

    async open(options: OpenOptions = {}): Promise<void> {
        const query = options.filter ? `?status=${options.filter}` : '';
        await this.page.goto(Routes.orders + query);
    }

    private row(number: string): Locator {
        return this.page.locator('[data-testid="order-row"]')
            .filter({ hasText: number })
            .first();
    }

    lblStatus(number: string): Locator {
        return this.row(number).getByTestId('status');
    }

    lblNote(number: string): Locator {
        return this.row(number).getByTestId('note');
    }

    drpStatus(number: string): Locator {
        return this.row(number).getByRole('combobox', { name: 'Status' });
    }

    btnCancel(number: string): Locator {
        return this.row(number).getByRole('button', { name: 'Cancel order' });
    }

    async setNote(number: string, note: string): Promise<void> {
        const row = this.row(number);
        await row.getByRole('textbox', { name: 'Note' }).fill(note);
        await row.getByRole('button', { name: 'Save' }).click();
        await this.page.waitForTimeout(500); // let the row re-render
    }

    async setStatus(number: string, status: StatusKey): Promise<void> {
        await this.drpStatus(number).selectOption(status);
    }

    async cancelOrder(number: string): Promise<void> {
        await this.btnCancel(number).click();
    }
}
