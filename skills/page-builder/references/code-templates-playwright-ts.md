# Code Templates — Playwright / TypeScript

Templates for the init-playwright-framework scaffold, shown with the TodoMVC demo
(`https://demo.playwright.dev/todomvc`). They compile against the scaffold's element classes and pass ESLint, and
the smoke spec passes against the live demo — reuse the shapes, replacing names and locators with what exploration
found.

Contents:

- [Container](#container)
- [Section and factory](#section-and-factory)
- [Container with a factory](#container-with-a-factory)
- [Page](#page)
- [Registration](#registration)
- [Smoke spec](#smoke-spec)
- [Review checklist](#review-checklist)

---

## Container

`src/components/containers/todo/header.container.ts`

```ts
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
```

---

## Section and factory

`src/components/containers/todo/todo-item.section.ts` — constructor takes its own root; no page-level lookups.

```ts
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

    async isCompleted(): Promise<boolean> {
        return (await this.container.getAttribute('class'))?.includes('completed') ?? false;
    }
}
```

---

## Container with a factory

`src/components/containers/todo/main.container.ts`

```ts
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
```

Element factories for a fixed set of variants (filters, tabs) return a new element per call:

```ts
export type TodoFilter = 'All' | 'Active' | 'Completed';

getFilter(name: TodoFilter): Link {
    return new Link({ locator: this.container.getByRole('link', { name, exact: true }) });
}
```

---

## Page

`src/pages/todo/index.ts` — composes containers; methods express intent and delegate.

```ts
import { type TodoFilter, TodoFooterContainer } from '@components/containers/todo/footer.container';
import { TodoHeaderContainer } from '@components/containers/todo/header.container';
import { TodoMainContainer } from '@components/containers/todo/main.container';

export class TodoPage {
    readonly header: TodoHeaderContainer;
    readonly main: TodoMainContainer;
    readonly footer: TodoFooterContainer;

    constructor() {
        this.header = new TodoHeaderContainer();
        this.main = new TodoMainContainer();
        this.footer = new TodoFooterContainer();
    }

    async addTodo(title: string): Promise<void> {
        await this.header.txtNewTodo.search(title); // fill + Enter
    }

    async completeTodo(title: string): Promise<void> {
        await this.main.getItem(title).chkToggle.check();
    }

    async filterBy(name: TodoFilter): Promise<void> {
        await this.footer.getFilter(name).click();
    }
}
```

---

## Registration

`src/fixtures/page-fixtures.ts` (already merged into `src/fixtures/fixtures.ts`):

```ts
import { TodoPage } from '@pages/todo';
import { test as base } from '@playwright/test';

type PageObjects = {
    todoPage: TodoPage;
};

export const test = base.extend<PageObjects>({
    todoPage: async ({}, use) => {
        await use(new TodoPage());
    }
});
```

`src/constants/endpoints.constant.ts` — the route, used by tests through `goto`:

```ts
export const Endpoints = {
    todo: { list: '/todomvc/#/' }
} as const;
```

`docs/registry/pages.md`:

```md
| Page | Class | Path | Containers | Key Actions |
|---|---|---|---|---|
| Todo list | `TodoPage` | `@pages/todo` | header, main (+ `TodoItemSection`), footer | `addTodo`, `completeTodo`, `filterBy` |
```

---

## Smoke spec

Walks the explored states through the page object so every locator is exercised against the real DOM.
`tests/e2e/<page>.smoke.spec.ts`:

```ts
import { Endpoints } from '@constants/endpoints.constant';
import { expect, test } from '@fixtures/fixtures';

test.describe('TodoPage — smoke', () => {
    test.beforeEach(async ({ goto }) => {
        await goto(Endpoints.todo.list);
    });

    test('elements resolve in empty, populated and filtered states', async ({ todoPage }) => {
        await expect.poll(() => todoPage.header.lblTitle.getInnerText()).toBe('todos');

        await todoPage.addTodo('buy milk');
        await todoPage.addTodo('walk dog');
        await todoPage.completeTodo('buy milk');

        await expect.poll(() => todoPage.main.getTitles()).toEqual(['buy milk', 'walk dog']);
        await expect.poll(() => todoPage.main.getItem('buy milk').isCompleted()).toBe(true);
        await expect.poll(() => todoPage.footer.lblCount.getInnerText()).toBe('1 item left');

        await todoPage.filterBy('Active');
        await expect.poll(() => todoPage.main.getTitles()).toEqual(['walk dog']);
        await expect.poll(() => todoPage.footer.btnClearCompleted.isVisible()).toBe(true);
    });
});
```

`expect.poll` retries until the value matches, so the smoke spec waits on the real state instead of sleeping. The
smoke spec checks wiring only; behavior tests come from the feature's test cases.

---

## Review checklist

```text
[ ] Scope matches the test cases; nothing modeled "just in case"
[ ] Registry checked; existing containers/components reused
[ ] Every element built from its container/section root; roots are the only page-level lookups
[ ] Locators follow the priority; exact names where prefixes collide; UNVERIFIED ones flagged
[ ] Repeated items are sections behind a factory keyed by business value
[ ] Toasts/errors via the notification fixture; no per-page copies
[ ] No assertions, no navigation, no fixed waits inside page objects
[ ] Element classes' behavior verified on the target DOM (new element class where it differs)
[ ] Path-alias imports; ESLint + tsc clean
[ ] Registered in page-fixtures.ts, Endpoints, docs/registry/pages.md
[ ] Smoke spec covering each explored state passes
```
