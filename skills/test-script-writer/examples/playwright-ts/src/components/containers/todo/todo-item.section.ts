import { Button } from '@elements/common/button';
import { CheckBox } from '@elements/common/checkbox';
import { Label } from '@elements/common/label';
import { type Locator } from '@playwright/test';

/** One row of the todo list. Created per row by TodoMainContainer — never a singleton. */
export class TodoItemSection {
    readonly chkToggle: CheckBox;
    readonly lblTitle: Label;
    /** Visible on hover only. */
    readonly btnDelete: Button;

    constructor(private readonly container: Locator) {
        this.chkToggle = new CheckBox({ locator: this.container.getByRole('checkbox', { name: 'Toggle Todo' }) });
        this.lblTitle = new Label({ locator: this.container.getByTestId('todo-title') });
        this.btnDelete = new Button({ locator: this.container.getByRole('button', { name: 'Delete' }) });
    }

    /** Idempotent: Playwright's check() waits until the box reports checked. */
    async complete(): Promise<void> {
        await this.chkToggle.element.check();
    }

    async reopen(): Promise<void> {
        await this.chkToggle.element.uncheck();
    }

    /** Hover reveals the button; returns once the row is gone, so the next read sees the new list. */
    async delete(): Promise<void> {
        await this.container.hover();
        await this.btnDelete.click();
        await this.container.waitFor({ state: 'detached' });
    }
}
