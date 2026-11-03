import { type Locator } from '@playwright/test';

export class LoginPage {
    readonly txtUsername: Locator;
    readonly txtPassword: Locator;
    readonly btnSubmit: Locator;

    constructor(readonly root: Locator) {
        this.txtUsername = root.locator('#username');
        this.txtPassword = root.locator('#password');
        this.btnSubmit = root.locator('button[type=submit]');
    }

    async login(user: { username: string; password: string }): Promise<void> {
        await this.txtUsername.fill(user.username);
        await this.txtPassword.fill(user.password);
        await this.btnSubmit.click();
    }
}
