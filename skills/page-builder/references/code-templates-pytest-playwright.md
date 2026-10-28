# Code Templates — pytest + Playwright (Python)

Page objects for the `init-pytest-playwright-framework` scaffold, for TodoMVC (`https://demo.playwright.dev/todomvc`).
Verified on 2026-10-28 against the live TodoMVC demo and Swagger Petstore: 9/9 tests green with retries off, 27/27 on `--count=3`, 9/9 with `-n 4`, ruff + mypy strict clean, audit 0 findings; breaking an expected value fails with the actual value (`Actual value: 1 item left`).

Contents:

- [How the scaffold differs](#how-the-scaffold-differs)
- [Containers](#containers)
- [Section and factory](#section-and-factory)
- [Page](#page)
- [Registration](#registration)
- [Review checklist](#review-checklist)

---

## How the scaffold differs

| Concern | TypeScript scaffold | Python scaffold |
|---|---|---|
| Page access | `BrowserInstance` singleton per worker | the test's `page` fixture, **injected** into the page object's constructor |
| Element | `new Button({ locator })` | `Button(locator)` — holds the Locator (composition), one base class |
| Names | `btnSave`, `txtEmail` | `btn_save`, `txt_email` (same prefixes, snake_case) |
| Waiting assertions | `expect.poll` | `eventually(lambda: ...)` from `qa.assertions`; `expect(element)` for locator state |
| Registration | `page-fixtures.ts` | a fixture in `src/qa/fixtures/pages.py` |

Composition throughout: the page **has** containers, a container **has** elements built from its own root, a row is
a section created per row. Nothing here inherits from anything but `Element`.

---

## Containers

`src/qa/components/containers/todo/header.py`

```python
from playwright.sync_api import Page

from qa.ui.elements import Input, Label


class TodoHeaderContainer:
    """The header region: title and the new-todo input."""

    def __init__(self, page: Page) -> None:
        self._root = page.locator("header.header")
        self.lbl_title = Label(self._root.get_by_role("heading", level=1))
        self.txt_new_todo = Input(self._root.get_by_placeholder("What needs to be done?"))
```

`src/qa/components/containers/todo/footer.py`

```python
from typing import Literal

from playwright.sync_api import Page

from qa.ui.elements import Button, Label, Link

TodoFilter = Literal["All", "Active", "Completed"]


class TodoFooterContainer:
    """Counter, filters and clear-completed; rendered only when at least one todo exists."""

    def __init__(self, page: Page) -> None:
        self._root = page.locator("footer.footer")
        self.lbl_count = Label(self._root.get_by_test_id("todo-count"))
        self.btn_clear_completed = Button(self._root.get_by_role("button", name="Clear completed"))

    def filter_link(self, name: TodoFilter) -> Link:
        """One link per filter, built per call."""
        return Link(self._root.get_by_role("link", name=name, exact=True))
```

---

## Section and factory

`src/qa/components/containers/todo/main.py`

```python
from playwright.sync_api import Locator, Page

from qa.ui.elements import Button, CheckBox, Label


class TodoItemSection:
    """One row of the list, created per row by TodoMainContainer — never a singleton."""

    def __init__(self, root: Locator) -> None:
        self._root = root
        self.chk_toggle = CheckBox(root.get_by_role("checkbox", name="Toggle Todo"))
        self.lbl_title = Label(root.get_by_test_id("todo-title"))
        self.btn_delete = Button(root.get_by_role("button", name="Delete"))  # visible on hover only

    def is_completed(self) -> bool:
        return "completed" in (self._root.get_attribute("class") or "")


class TodoMainContainer:
    """The list region; rendered only when at least one todo exists."""

    def __init__(self, page: Page) -> None:
        self._root = page.locator("section.main")
        self._items = self._root.get_by_test_id("todo-item")
        self.chk_toggle_all = CheckBox(self._root.get_by_label("Mark all as complete"))

    def item(self, title: str) -> TodoItemSection:
        """The row whose title is ``title`` (business key, not position)."""
        title_locator = self._root.page.get_by_test_id("todo-title").get_by_text(title, exact=True)
        return TodoItemSection(self._items.filter(has=title_locator))

    def titles(self) -> list[str]:
        """Snapshot of the visible titles; assert it inside ``eventually``."""
        return [t.strip() for t in self._items.get_by_test_id("todo-title").all_inner_texts()]
```

`filter(has=...)`: the inner locator is evaluated relative to each row, so it is created from `root.page` — the one
place a page-level locator is correct (the audit's R-SCOPE allows `.page.get_by_*` reached through a root).

---

## Page

`src/qa/pages/todo.py`

```python
from playwright.sync_api import Page

from qa.components.containers.todo.footer import TodoFilter, TodoFooterContainer
from qa.components.containers.todo.header import TodoHeaderContainer
from qa.components.containers.todo.main import TodoMainContainer


class TodoPage:
    """The todo list screen: composes its three regions; methods express user intent and delegate."""

    PATH = "/todomvc/#/"

    def __init__(self, page: Page) -> None:
        self._page = page
        self.header = TodoHeaderContainer(page)
        self.main = TodoMainContainer(page)
        self.footer = TodoFooterContainer(page)

    def open(self) -> None:
        self._page.goto(self.PATH)

    def add_todo(self, title: str) -> None:
        self.header.txt_new_todo.submit(title)

    def complete_todo(self, title: str) -> None:
        self.main.item(title).chk_toggle.check()

    def filter_by(self, name: TodoFilter) -> None:
        self.footer.filter_link(name).click()
```

---

## Registration

`src/qa/fixtures/pages.py`

```python
"""Page-object fixtures: one per page, constructed with the test's ``page``. Register new pages here."""

from __future__ import annotations

import pytest
from playwright.sync_api import Page

from qa.pages.todo import TodoPage


@pytest.fixture
def todo_page(page: Page) -> TodoPage:
    return TodoPage(page)
```

Add a row to `docs/registry/README.md` (page, module, containers, key actions).

---

## Review checklist

```text
[ ] Scope matches the test cases; nothing modeled "just in case"
[ ] Each container builds every element from its own root; page.locator(...) only for roots
[ ] Rows are sections behind a method keyed by a business value
[ ] No assertions, navigation decisions or sleeps in page objects; open() is the only navigation
[ ] No inheritance between pages, containers or sections (R-INHERIT)
[ ] ruff + mypy strict clean; fixture registered; registry row added
```
