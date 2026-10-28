import re
from typing import Literal

from playwright.sync_api import Page

from qa.ui.elements import Button, Label, Link

TodoFilter = Literal["All", "Active", "Completed"]

_ITEMS_LEFT = re.compile(r"^(\d+) items? left$")


class TodoFooterContainer:
    """Counter, filters and clear-completed; rendered only when at least one todo exists."""

    def __init__(self, page: Page) -> None:
        self._root = page.locator("footer.footer")
        self.lbl_count = Label(self._root.get_by_test_id("todo-count"))
        self.btn_clear_completed = Button(self._root.get_by_role("button", name="Clear completed"))

    def filter_link(self, name: TodoFilter) -> Link:
        """One link per filter, built per call."""
        return Link(self._root.get_by_role("link", name=name, exact=True))

    def wait_until_selected(self, name: TodoFilter) -> None:
        """Wait for the app's own signal that the filter is applied: the link gets the ``selected`` class."""
        self.filter_link(name).locator.and_(self._root.locator("a.selected")).wait_for()

    def items_left(self) -> int:
        """The number the counter shows ("2 items left" -> 2); a snapshot, read it after a sync point."""
        text = self.lbl_count.text()
        match = _ITEMS_LEFT.match(text)
        if match is None:
            raise ValueError(f"todo counter has an unexpected format: {text!r}")
        return int(match.group(1))
