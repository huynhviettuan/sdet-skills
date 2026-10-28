import { $ } from '@common/element.function';
import { TodoItemSection } from '@components/containers/todo/todo-item.section';
import { CheckBox } from '@elements/common/checkbox';
import { type Locator } from '@playwright/test';

/** Rendered only when at least one todo exists. */
export class TodoMainContainer {
    private readonly container: Locator;
    private readonly items: Locator;
    readonly chkToggleAll: CheckBox;

    constructor() {
        this.container = $('section.main');
        this.items = this.container.getByTestId('todo-item');
        this.chkToggleAll = new CheckBox({ locator: this.container.getByLabel('Mark all as complete') });
    }

    /** Row identified by its title (business key), not by position. */
    getItem(title: string): TodoItemSection {
        // A `has` locator is evaluated relative to each row, so this matches only the row whose title is `title`.
        const titleLocator = this.container.page().getByTestId('todo-title').getByText(title, { exact: true });
        return new TodoItemSection(this.items.filter({ has: titleLocator }));
    }

    /** Snapshot of the visible titles — poll it in tests. */
    async getTitles(): Promise<string[]> {
        return await this.items.getByTestId('todo-title').allInnerTexts();
    }
}
