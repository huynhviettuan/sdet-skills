import { type Locator } from '@playwright/test';
import { OrderRowSection } from './order-row.section';

export class OrderListContainer {
    constructor(readonly root: Locator) {}

    /** Row identified by its business key, the order id; never by position. */
    row(orderId: string): OrderRowSection {
        return new OrderRowSection(this.root.locator(`tbody tr[data-order-id="${orderId}"]`));
    }
}
