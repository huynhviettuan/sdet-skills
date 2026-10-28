import { $ } from '@common/element.function';
import { Button } from '@elements/common/button';
import { Label } from '@elements/common/label';
import { Link } from '@elements/common/link';
import { type Locator } from '@playwright/test';

export type TodoFilter = 'All' | 'Active' | 'Completed';

/** Rendered only when at least one todo exists. */
export class TodoFooterContainer {
    private readonly container: Locator;
    /** Full counter text, e.g. "1 item left". */
    readonly lblCount: Label;
    /** The number inside the counter, without the pluralised words. */
    readonly lblCountValue: Label;
    readonly btnClearCompleted: Button;

    constructor() {
        this.container = $('footer.footer');
        this.lblCount = new Label({ locator: this.container.getByTestId('todo-count') });
        this.lblCountValue = new Label({ locator: this.container.getByTestId('todo-count').locator('strong') });
        this.btnClearCompleted = new Button({
            locator: this.container.getByRole('button', { name: 'Clear completed' })
        });
    }

    getFilter(name: TodoFilter): Link {
        return new Link({ locator: this.container.getByRole('link', { name, exact: true }) });
    }

    /** The filter link once it carries the `selected` class — the app renders the filtered list in the same update. */
    getSelectedFilter(name: TodoFilter): Link {
        return new Link({
            locator: this.container.getByRole('link', { name, exact: true }).and(this.container.locator('a.selected'))
        });
    }

    /** "N items left" as a number — a derived value tests compare with the lists. */
    async getItemsLeft(): Promise<number> {
        return Number(await this.lblCountValue.getInnerText());
    }
}
