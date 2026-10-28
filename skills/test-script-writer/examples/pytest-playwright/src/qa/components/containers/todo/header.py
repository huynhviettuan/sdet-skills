from playwright.sync_api import Page

from qa.ui.elements import Input, Label


class TodoHeaderContainer:
    """The header region: title and the new-todo input."""

    def __init__(self, page: Page) -> None:
        self._root = page.locator("header.header")
        self.lbl_title = Label(self._root.get_by_role("heading", level=1))
        self.txt_new_todo = Input(self._root.get_by_placeholder("What needs to be done?"))
