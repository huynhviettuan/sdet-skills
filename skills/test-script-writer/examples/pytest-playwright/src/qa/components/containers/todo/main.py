from playwright.sync_api import Locator, Page

from qa.ui.elements import Button, CheckBox, Label


class TodoItemSection:
    """One row of the list, created per row by TodoMainContainer — never a singleton."""

    def __init__(self, root: Locator) -> None:
        self._root = root
        self.chk_toggle = CheckBox(root.get_by_role("checkbox", name="Toggle Todo"))
        self.lbl_title = Label(root.get_by_test_id("todo-title"))
        self.btn_delete = Button(root.get_by_role("button", name="Delete"))  # visible on hover only

    def hover(self) -> None:
        """Reveal the row's hover-only controls (the delete button)."""
        self._root.hover()

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

    def count(self) -> int:
        """Snapshot of how many rows the list shows; read it after a sync point (a filter's ``selected`` signal)."""
        return self._items.count()
