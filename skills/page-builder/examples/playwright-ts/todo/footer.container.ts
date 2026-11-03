import { $ } from '@common/element.function';
import { Label } from '@elements/common/label';
import { Link } from '@elements/common/link';
import { type Locator } from '@playwright/test';

export type TodoFilter = 'All' | 'Active' | 'Completed';

/**
 * The list footer (`footer.footer`): the items-left counter and the filter links. Rendered only while at least one
 * todo exists. The page has a second `footer.info` (credits) outside the app, so the root is the class, not the
 * landmark. Explored live on 2026-11-02 in the populated, one-completed, Active and Completed states.
 */
export class TodoFooterContainer {
    private readonly container: Locator;

    /** `span[data-testid="todo-count"]`, e.g. "1 item left" / "2 items left" / "0 items left" — live: populated. */
    readonly lblCount: Label;

    constructor() {
        this.container = $('footer.footer');
        this.lblCount = new Label({ locator: this.container.getByTestId('todo-count') });
    }

    /** One link per filter, built per call (`a[href="#/"]`, `#/active`, `#/completed`) — live: populated. */
    getFilter(name: TodoFilter): Link {
        return new Link({ locator: this.container.getByRole('link', { name, exact: true }) });
    }

    /** The number inside the counter (`<strong>N</strong> items left`), as a snapshot — poll it in tests. */
    async getItemsLeft(): Promise<number> {
        return Number(await this.lblCount.locator('strong').innerText());
    }
}
