import { type Locator } from '@playwright/test';

export class ConfirmDialogContainer {
    readonly btnOk: Locator;

    constructor(readonly root: Locator) {
        this.btnOk = root.locator('button.ok');
    }

    async accept(): Promise<void> {
        await this.root.waitFor({ state: 'visible' }); // the fade-in is what the legacy force click skipped
        await this.btnOk.click();
    }
}
