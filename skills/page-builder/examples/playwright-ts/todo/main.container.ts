import { $ } from '@common/element.function';
import { TodoItemSection } from '@components/containers/todo/todo-item.section';
import { type Locator } from '@playwright/test';

/**
 * The list region (`section.main`). Rendered only while at least one todo exists; in the empty state the root
 * matches nothing, so `getTitles()` returns `[]`. Explored live on 2026-11-02 in the populated, one-completed,
 * Active and Completed states.
 */
export class TodoMainContainer {
    private readonly container: Locator;
    /** All visible rows (`li[data-testid="todo-item"]`) under the current filter. */
    private readonly items: Locator;

    constructor() {
        this.container = $('section.main');
        this.items = this.container.getByTestId('todo-item');
    }

    /**
     * The row whose title is exactly `title` (business key, never position). Two todos with the same title make
     * the row ambiguous and every action on it fails strict mode — that is an inconclusive step, not a `.first()`.
     */
    getItem(title: string): TodoItemSection {
        // `filter({ has })` evaluates the inner locator relative to each row, so building it from the page is the
        // one place a page-level locator is correct here; the anchored RegExp makes the match exact.
        const exactTitle = new RegExp(`^${TodoMainContainer.escapeRegExp(title)}$`);
        const titleLocator = this.container.page().getByTestId('todo-title').filter({ hasText: exactTitle });
        return new TodoItemSection(this.items.filter({ has: titleLocator }));
    }

    /** Snapshot of the visible titles under the current filter — poll it in tests. */
    async getTitles(): Promise<string[]> {
        return await this.items.getByTestId('todo-title').allInnerTexts();
    }

    private static escapeRegExp(text: string): string {
        return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}
