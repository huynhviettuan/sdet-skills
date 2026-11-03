import { type Page } from '@playwright/test';

export class BasePage {
    constructor(protected readonly page: Page) {}

    async open(path: string) {
        await this.page.goto(path); // resolved against baseURL from the config; subclasses wait for their screen
    }

    toast() {
        return this.page.locator('.toast').first();
    }

    async closeToast() {
        // Playwright waits for the button to be visible, stable and enabled; the fade-in needs no force.
        await this.page.locator('.toast .close').first().click();
    }
}
