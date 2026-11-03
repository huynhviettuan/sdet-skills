import { type Locator } from '@playwright/test';

export const Routes = { orders: '/orders' } as const;
export const StatusLabel = { new: 'New', shipped: 'Shipped', cancelled: 'Cancelled' } as const;
export type StatusKey = keyof typeof StatusLabel;

/** The Orders screen: one row per order, found by its order number. `root` is the orders table, from the fixture. */
export class OrdersPage {
    constructor(private readonly root: Locator) {}

    async open(): Promise<void> {
        await this.root.page().goto(Routes.orders);
    }

    /** Exact match on the number cell: "ORD-10" must not resolve to "ORD-100". */
    private row(number: string): Locator {
        // Playwright evaluates the `has` locator inside each candidate row, so it is written from the page.
        const numberCell = this.root.page().getByTestId('order-number').and(this.root.page().getByText(number, { exact: true }));
        return this.root.getByTestId('order-row').filter({ has: numberCell });
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

    /** Saves the note and returns once the editor has closed (the row re-renders in the same update). */
    async setNote(number: string, note: string): Promise<void> {
        const txtNote = this.row(number).getByRole('textbox', { name: 'Note' });
        await txtNote.fill(note);
        await this.row(number).getByRole('button', { name: 'Save' }).click();
        await txtNote.waitFor({ state: 'hidden' });
    }

    async setStatus(number: string, status: StatusKey): Promise<void> {
        await this.drpStatus(number).selectOption(status);
    }

    async cancelOrder(number: string): Promise<void> {
        await this.btnCancel(number).click();
    }
}
