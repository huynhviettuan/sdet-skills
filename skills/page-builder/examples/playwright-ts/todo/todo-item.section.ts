import { Clickable } from '@elements/base/clickable';
import { Button } from '@elements/common/button';
import { Label } from '@elements/common/label';
import { type Locator } from '@playwright/test';

/**
 * One row of the todo list (`li[data-testid="todo-item"]`). Created per row by `TodoMainContainer.getItem(title)`
 * — never a singleton. Explored live on 2026-11-02: every element below is unique inside its row in the populated,
 * one-completed, Active and Completed states.
 */
export class TodoItemSection {
    /**
     * Native `<input type="checkbox" aria-label="Toggle Todo">`. Typed as `Clickable` on purpose: the scaffold's
     * `CheckBox.check()` / `uncheck()` assume a `.checkbox` wrapper with an `is-checked` class, which this DOM does
     * not have (a `NativeCheckBox` element class is requested in the registry report). Use `complete()` /
     * `reopen()` on this section, or `isChecked()` to read it — live: all populated states.
     */
    readonly chkToggle: Clickable;
    /** `label[data-testid="todo-title"]` — live: all populated states. */
    readonly lblTitle: Label;
    /**
     * `button[aria-label="Delete"]`; `display: none` until the row is hovered (CSS `li:hover .destroy`), so call
     * `delete()` rather than clicking it directly — live: visible only while the row is hovered.
     */
    readonly btnDelete: Button;

    constructor(private readonly container: Locator) {
        this.chkToggle = new Clickable(this.container.getByRole('checkbox', { name: 'Toggle Todo' }));
        this.lblTitle = new Label({ locator: this.container.getByTestId('todo-title') });
        this.btnDelete = new Button({ locator: this.container.getByRole('button', { name: 'Delete' }) });
    }

    /** Snapshot of the row's completed state, read from the native checkbox — poll it in tests. */
    async isCompleted(): Promise<boolean> {
        return await this.chkToggle.isChecked();
    }

    /** Marks the todo completed; a no-op when it already is (the native toggle flips on every click). */
    async complete(): Promise<void> {
        if (!(await this.isCompleted())) await this.chkToggle.click();
    }

    /** Reopens a completed todo; a no-op when it is already active. */
    async reopen(): Promise<void> {
        if (await this.isCompleted()) await this.chkToggle.click();
    }

    /** Hovers the row so the Delete button renders, then clicks it. */
    async delete(): Promise<void> {
        await this.container.hover();
        await this.btnDelete.click();
    }
}
