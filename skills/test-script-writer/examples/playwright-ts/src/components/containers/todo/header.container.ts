import { $ } from '@common/element.function';
import { Input } from '@elements/common/input';
import { Label } from '@elements/common/label';
import { type Locator } from '@playwright/test';

export class TodoHeaderContainer {
    private readonly container: Locator;
    readonly lblTitle: Label;
    readonly txtNewTodo: Input;

    constructor() {
        this.container = $('header.header');
        this.lblTitle = new Label({ locator: this.container.getByRole('heading', { level: 1 }) });
        this.txtNewTodo = new Input({ locator: this.container.getByPlaceholder('What needs to be done?') });
    }
}
