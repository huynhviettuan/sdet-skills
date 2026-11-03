import { $ } from '@common/element.function';
import { Input } from '@elements/common/input';
import { Label } from '@elements/common/label';
import { type Locator } from '@playwright/test';

/**
 * The header region of the todo list (`header.header`): the app title and the new-todo input.
 * Present in every state (empty and populated). Explored live on 2026-11-02 against
 * https://demo.playwright.dev/todomvc.
 */
export class TodoHeaderContainer {
    private readonly container: Locator;

    /** `<h1>todos</h1>` — live: all states. */
    readonly lblTitle: Label;
    /** The only textbox in the header; Enter submits, a blank or spaces-only value adds nothing — live: all states. */
    readonly txtNewTodo: Input;

    constructor() {
        this.container = $('header.header');
        this.lblTitle = new Label({ locator: this.container.getByRole('heading', { level: 1 }) });
        this.txtNewTodo = new Input({ locator: this.container.getByPlaceholder('What needs to be done?') });
    }
}
