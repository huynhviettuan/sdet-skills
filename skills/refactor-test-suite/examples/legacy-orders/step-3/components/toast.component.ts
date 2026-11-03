import { type Locator } from '@playwright/test';

/** The notification region; several toasts can be open at once, so a toast is found by its text, not by position. */
export class ToastComponent {
    constructor(readonly root: Locator) {}

    withText(text: string): Locator {
        return this.root.filter({ hasText: text });
    }

    async close(text: string): Promise<void> {
        await this.withText(text).locator('.close').click();
    }
}
