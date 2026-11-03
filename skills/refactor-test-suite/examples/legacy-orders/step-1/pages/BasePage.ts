import { type Page } from '@playwright/test';

export class BasePage {
    constructor(protected readonly page: Page) {}

    async open(path: string) {
        await this.page.goto(path); // resolved against baseURL from the config
        await this.page.waitForTimeout(800); // let the SPA render
    }

    toast() {
        return this.page.locator('.toast').first();
    }

    async closeToast() {
        await this.page.locator('.toast .close').first().click({ force: true });
    }
}
