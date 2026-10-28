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

    def uncomplete_todo(self, title: str) -> None:
        self.main.item(title).chk_toggle.uncheck()

    def delete_todo(self, title: str) -> None:
        row = self.main.item(title)
        row.hover()
        row.btn_delete.click()

    def filter_by(self, name: TodoFilter) -> None:
        self.footer.filter_link(name).click()

    def count_under(self, name: TodoFilter) -> int:
        """Show filter ``name``, wait until the app marks it selected, and count the rows it shows."""
        self.filter_by(name)
        self.footer.wait_until_selected(name)
        return self.main.count()
