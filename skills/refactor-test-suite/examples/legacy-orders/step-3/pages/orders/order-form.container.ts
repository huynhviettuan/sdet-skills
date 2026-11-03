import { type Locator } from '@playwright/test';

/** The "New order" section: the toggle button and the form it reveals. */
export class OrderFormContainer {
    readonly btnNewOrder: Locator;
    readonly txtItem: Locator;
    readonly txtQty: Locator;
    readonly btnPlace: Locator;

    constructor(readonly root: Locator) {
        this.btnNewOrder = root.locator('#new-order');
        this.txtItem = root.locator('#item');
        this.txtQty = root.locator('#qty');
        this.btnPlace = root.getByRole('button', { name: 'Place order' });
    }
}
