import { type Locator } from '@playwright/test';

/** One row of the orders table, found by its order id. */
export class OrderRowSection {
    readonly status: Locator;
    readonly btnApprove: Locator;
    readonly btnCancel: Locator;
    readonly lnkNotes: Locator;

    constructor(readonly root: Locator) {
        this.status = root.locator('td.status');
        this.btnApprove = root.locator('button.approve');
        this.btnCancel = root.locator('button.cancel');
        this.lnkNotes = root.locator('a.notes');
    }
}
